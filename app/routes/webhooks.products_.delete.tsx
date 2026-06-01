import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, admin, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for shop ${shop}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    if (!admin) {
      console.error("No admin API client available");
      return new Response("No admin client", { status: 500 });
    }

    // Convert numeric ID to GID format
    const deletedProductGID = `gid://shopify/Product/${payload.id}`;
    console.log("Looking for bundle with shopifyProductId:", deletedProductGID);

    // ─────────────────────────────────────────
    // SCHEMA FIELD NAMES (must match schema.prisma exactly):
    //   Bundle.shop             (NOT shopId)
    //   Bundle.items            (relation name, NOT bundleItems)
    //   Bundle.orders           (relation name, NOT bundleOrders)
    //   prisma.bundleItem       (model name — correct)
    //   prisma.bundleOrder      (model name — correct)
    // ─────────────────────────────────────────
    const affectedBundles = await prisma.bundle.findMany({
      where: {
        shop,                          // ✅ schema uses "shop" not "shopId"
        shopifyProductId: deletedProductGID,
      },
      include: {
        items: true,                   // ✅ schema relation is "items" not "bundleItems"
        orders: true,                  // ✅ schema relation is "orders" not "bundleOrders"
      },
    });

    console.log(`Found ${affectedBundles.length} bundle(s) to delete`);

    if (affectedBundles.length === 0) {
      console.log("No bundles affected by this product deletion");
      return new Response("OK", { status: 200 });
    }

    for (const bundle of affectedBundles) {
      console.log(`Processing bundle: "${bundle.title}" (ID: ${bundle.id})`);
      console.log(`  - Contains ${bundle.items.length} item(s)`);   // ✅ .items
      console.log(`  - Has ${bundle.orders.length} order(s)`);       // ✅ .orders
      console.log(`  - Shopify product: ${bundle.shopifyProductId || "none"}`);

      // ── Step 1: Delete the Shopify bundle product if it exists ──
      // Note: the webhook fires because the product was deleted from Shopify,
      // so this will typically return a "not found" error — that is fine.
      if (bundle.shopifyProductId) {
        try {
          console.log(`  - Attempting Shopify product delete: ${bundle.shopifyProductId}`);

          const deleteResponse = await admin.graphql(
            `#graphql
            mutation deleteProduct($input: ProductDeleteInput!) {
              productDelete(input: $input) {
                deletedProductId
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              variables: {
                input: { id: bundle.shopifyProductId },
              },
            }
          );

          const deleteResult = await deleteResponse.json();

          if (deleteResult.data?.productDelete?.userErrors?.length > 0) {
            // Not fatal — product may already be deleted (that's what triggered this webhook)
            console.warn(
              "  ⚠️ Shopify delete userErrors (may be expected):",
              deleteResult.data.productDelete.userErrors
            );
          } else {
            console.log(
              `  ✅ Shopify product deleted: ${deleteResult.data?.productDelete?.deletedProductId}`
            );
          }
        } catch (error) {
          // Not fatal — continue to DB cleanup regardless
          console.error(`  ⚠️ Failed to delete Shopify product (continuing):`, error);
        }
      } else {
        console.log("  - No Shopify product to delete");
      }

      // ── Step 2: Delete from DB in correct dependency order ──
      //
      // Order matters:
      //   1. BundleOrder — no onDelete: Cascade on this relation, must be deleted first
      //   2. BundleItem  — has onDelete: Cascade via bundleId, but explicit for safety
      //   3. Bundle      — parent, deleted last
      try {
        // 2a. Delete bundle orders (BundleOrder.bundle has no Cascade — manual delete required)
        const deletedOrders = await prisma.bundleOrder.deleteMany({
          where: { bundleId: bundle.id },
        });
        console.log(`  - Deleted ${deletedOrders.count} bundle order(s)`);

        // 2b. Delete bundle items (BundleItem.bundle has onDelete: Cascade, but explicit here)
        const deletedItems = await prisma.bundleItem.deleteMany({
          where: { bundleId: bundle.id },
        });
        console.log(`  - Deleted ${deletedItems.count} bundle item(s)`);

        // 2c. Delete the bundle itself
        await prisma.bundle.delete({
          where: { id: bundle.id },
        });
        console.log(`  ✅ Bundle deleted from database`);
      } catch (dbError) {
        console.error(`  ❌ Database deletion failed:`, dbError);
        throw dbError; // Re-throw so Shopify retries the webhook
      }

      console.log(`✅ Successfully processed bundle: "${bundle.title}"`);
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
