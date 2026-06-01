import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for shop ${shop}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Convert numeric ID to GID format
    const updatedProductGID = `gid://shopify/Product/${payload.id}`;
    console.log("Looking for bundle with shopifyProductId:", updatedProductGID);

    // ─────────────────────────────────────────
    // SCHEMA FIELD NAMES (must match schema.prisma exactly):
    //   Bundle.shop   (NOT shopId)
    //   Bundle.items  (relation name, NOT bundleItems)
    //
    // Fields that do NOT exist on Bundle in schema — removed:
    //   bundle.imageUrl  → use bundle.image instead
    //   bundle.handle    → not in schema, removed
    // ─────────────────────────────────────────
    const bundle = await prisma.bundle.findFirst({
      where: {
        shop,                          // ✅ "shop" not "shopId"
        shopifyProductId: updatedProductGID,
      },
      include: {
        items: true,                   // ✅ "items" not "bundleItems"
      },
    });

    if (!bundle) {
      console.log("No bundle found for this product — nothing to update");
      return new Response("OK", { status: 200 });
    }

    console.log(`Found bundle: "${bundle.title}" (ID: ${bundle.id})`);

    // ── Step 1: Build Bundle update payload from Shopify product payload ──

    // Map Shopify product status → our bundle status string
    const statusMap: Record<string, string> = {
      active:   "ACTIVE",
      draft:    "DRAFT",
      archived: "ARCHIVED",
    };
    const newStatus = statusMap[payload.status] ?? bundle.status;

    // Get the first variant's GID (native bundle = 1 variant)
    const firstVariant = payload.variants?.[0];
    const newVariantId = firstVariant
      ? `gid://shopify/ProductVariant/${firstVariant.id}`
      : bundle.shopifyVariantId;

    // Get the featured image URL
    // Schema field is "image" (String?) — NOT "imageUrl"
    const newImage: string | null =
      payload.image?.src ?? payload.images?.[0]?.src ?? bundle.image ?? null;

    // Build update — only fields that exist in schema.prisma Bundle model:
    //   title, status, shopifyVariantId, image
    // "handle" is NOT in the schema — do not include it
    const bundleUpdateData = {
      title:           payload.title   ?? bundle.title,
      status:          newStatus,
      shopifyVariantId: newVariantId,
      image:           newImage,       // ✅ schema field is "image" not "imageUrl"
    };

    console.log("Updating bundle with:", JSON.stringify(bundleUpdateData, null, 2));

    // ── Step 2: Update Bundle table ──
    await prisma.bundle.update({
      where: { id: bundle.id },
      data: bundleUpdateData,
    });
    console.log(`✅ Bundle updated successfully`);

    // ── Step 3: Sync BundleItems for any updated variants ──
    // Shopify sends all variants — sync price, sku, variantTitle, imageUrl
    // for each BundleItem whose shopifyVariantId matches
    if (payload.variants && payload.variants.length > 0) {
      for (const variant of payload.variants) {
        const variantGID = `gid://shopify/ProductVariant/${variant.id}`;

        // Check if any of our items reference this variant
        const matchingItems = bundle.items.filter(       // ✅ .items not .bundleItems
          (item) => item.shopifyVariantId === variantGID
        );

        if (matchingItems.length === 0) continue;

        // Resolve variant image (fall back to product image)
        const variantImage = variant.image_id
          ? payload.images?.find((img: any) => img.id === variant.image_id)?.src ?? null
          : null;
        const itemImageUrl: string | null = variantImage ?? newImage ?? null;

        // Build item update — only include defined values
        // (undefined entries are stripped so Prisma doesn't nullify fields)
        const itemUpdateData: Record<string, unknown> = {};

        if (payload.title !== undefined)
          itemUpdateData.productTitle = payload.title;

        if (variant.title !== undefined)
          itemUpdateData.variantTitle =
            variant.title === "Default Title" ? null : variant.title;

        if (variant.sku !== undefined)
          itemUpdateData.sku = variant.sku;

        if (variant.price !== undefined)
          itemUpdateData.price = parseFloat(variant.price);

        // compareAtPrice lives on BundleItem? — it's not in schema.prisma BundleItem
        // Keeping as a safe no-op; remove if Prisma complains
        // itemUpdateData.compareAtPrice = variant.compare_at_price
        //   ? parseFloat(variant.compare_at_price)
        //   : null;

        itemUpdateData.imageUrl = itemImageUrl;

        if (Object.keys(itemUpdateData).length === 0) {
          console.log(`  - No changes for variant ${variantGID}, skipping`);
          continue;
        }

        await prisma.bundleItem.updateMany({
          where: {
            bundleId: bundle.id,
            shopifyVariantId: variantGID,
          },
          data: itemUpdateData,
        });

        console.log(
          `  ✅ Updated ${matchingItems.length} bundle item(s) for variant: ${variantGID}`
        );
      }
    }

    console.log("=== Webhook processing complete ===");
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Return 500 so Shopify retries the webhook
    return new Response("Internal Server Error", { status: 500 });
  }
};
