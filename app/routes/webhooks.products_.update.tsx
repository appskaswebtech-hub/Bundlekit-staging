import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// products/update webhook
// For a Quantity Breaks app, product updates don't require any bundle sync.
// Bundles reference products via selectedProductIds (JSON array of numeric IDs).
// The discount function reads live product data at checkout — no sync needed here.

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);
    console.log(`[Webhook] ${topic} for shop ${shop} — product ${payload?.id} updated (no action needed)`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Webhook] products/update error:", error);
    return new Response("OK", { status: 200 });
  }
};
