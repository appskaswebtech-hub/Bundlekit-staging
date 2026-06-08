import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// products/delete webhook
// When a product is deleted in Shopify, remove its ID from any bundle's
// selectedProductIds so stale product references are cleaned up.

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} for shop ${shop} — product ${payload?.id} deleted`);

    const deletedProductId = String(payload?.id);
    if (!deletedProductId) {
      return new Response("OK", { status: 200 });
    }

    // Find all bundles for this shop that have specific product selection
    const bundles = await prisma.bundle.findMany({
      where: {
        shop,
        productSelectionType: "SPECIFIC_PRODUCTS",
        selectedProductIds:   { not: null },
      },
      select: { id: true, selectedProductIds: true },
    });

    for (const bundle of bundles) {
      try {
        const ids: string[] = JSON.parse(bundle.selectedProductIds ?? "[]");
        if (!ids.includes(deletedProductId)) continue;

        // Remove the deleted product ID from the list
        const updatedIds = ids.filter((id) => id !== deletedProductId);

        await prisma.bundle.update({
          where: { id: bundle.id },
          data:  { selectedProductIds: JSON.stringify(updatedIds) },
        });

        console.log(`[Webhook] ✅ Removed product ${deletedProductId} from bundle ${bundle.id}`);
      } catch (err) {
        console.error(`[Webhook] Failed to update bundle ${bundle.id}:`, err);
      }
    }

    console.log(`[Webhook] products/delete complete for shop ${shop}`);
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[Webhook] products/delete error:", error instanceof Error ? error.message : error);
    return new Response("OK", { status: 200 });
  }
};
