import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ─── Delete the Shopify automatic discount using raw access token ───────────
async function deleteShopifyDiscountViaToken(shop: string, accessToken: string) {
  const TITLES = ["Bundler Quantity Breaks", "Quantity Breaks"];

  for (const title of TITLES) {
    try {
      // Step 1: Find discount by title
      const searchRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            query($query: String!) {
              discountNodes(first: 5, query: $query) {
                nodes { id }
              }
            }
          `,
          variables: { query: `title:'${title}'` },
        }),
      });

      const searchJson = await searchRes.json();
      const nodes: any[] = searchJson?.data?.discountNodes?.nodes ?? [];

      // Step 2: Delete each found discount
      for (const node of nodes) {
        const deleteRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
          method: "POST",
          headers: {
            "Content-Type":         "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: `
              mutation discountAutomaticDelete($id: ID!) {
                discountAutomaticDelete(id: $id) {
                  deletedAutomaticDiscountId
                  userErrors { field message }
                }
              }
            `,
            variables: { id: node.id },
          }),
        });

        const deleteJson = await deleteRes.json();
        const errors = deleteJson?.data?.discountAutomaticDelete?.userErrors;
        if (errors?.length) {
          console.error(`[Uninstall] Discount delete error for "${title}":`, errors);
        } else {
          console.log(`[Uninstall] ✅ Deleted Shopify discount: "${title}" (${node.id})`);
        }
      }
    } catch (err) {
      console.error(`[Uninstall] Failed to delete discount "${title}":`, err);
    }
  }
}

// ─── Main webhook handler ────────────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} received for shop: ${shop}`);

  // Get access token BEFORE deleting sessions (needed for Shopify API calls)
  const sessionRecord = await db.session.findFirst({ where: { shop } });
  const accessToken = sessionRecord?.accessToken;

  // ── Step 1: Delete Shopify automatic discount ──────────────────────────────
  if (accessToken) {
    console.log("[Uninstall] Deleting Shopify automatic discount...");
    await deleteShopifyDiscountViaToken(shop, accessToken);
  } else {
    console.warn("[Uninstall] No access token found — skipping discount deletion");
  }

  // ── Step 2: Delete all bundles (cascades to QuantityBreak, DiscountCombination, WidgetSettings) ──
  try {
    const bundleCount = await db.bundle.count({ where: { shop } });
    await db.bundle.deleteMany({ where: { shop } });
    console.log(`[Uninstall] ✅ Deleted ${bundleCount} bundle(s) and related data`);
  } catch (err) {
    console.error("[Uninstall] Bundle deletion error:", err);
  }

  // ── Step 3: Delete shop plan ───────────────────────────────────────────────
  try {
    await db.shopPlan.deleteMany({ where: { shop } });
    console.log("[Uninstall] ✅ Deleted ShopPlan");
  } catch (err) {
    console.error("[Uninstall] ShopPlan deletion error:", err);
  }

  // ── Step 4: Delete shop settings ──────────────────────────────────────────
  try {
    const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
    if (shopRecord) {
      await db.shopSetting.deleteMany({ where: { shopId: shopRecord.id } });
      await db.shop.delete({ where: { shopDomain: shop } });
      console.log("[Uninstall] ✅ Deleted Shop and ShopSettings");
    }
  } catch (err) {
    console.error("[Uninstall] Shop/Settings deletion error:", err);
  }

  // ── Step 5: Delete sessions (always last) ─────────────────────────────────
  try {
    await db.session.deleteMany({ where: { shop } });
    console.log("[Uninstall] ✅ Deleted all sessions");
  } catch (err) {
    console.error("[Uninstall] Session deletion error:", err);
  }

  console.log(`[Uninstall] ✅ Complete cleanup done for shop: ${shop}`);

  // Shopify requires a 200 response
  return new Response();
};
