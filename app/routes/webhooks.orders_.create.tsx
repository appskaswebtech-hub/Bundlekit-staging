import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Titles our automatic app discount has used (current + legacy + casing variants).
// See DISCOUNT_TITLE in app/utils/syncDiscount.server.ts
const BUNDLE_DISCOUNT_TITLES = ["bundler quantity breaks", "quantity breaks"];

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  try {
    const order = payload as any;

    // Only record analytics when the merchant has opted in to data collection
    const setting = await db.analyticsSetting.findUnique({ where: { shop } });
    if (!setting?.collectOrderData) {
      return new Response("OK", { status: 200 });
    }

    const discountApplications: any[] = order.discount_applications ?? [];
    const bundleAppIndex = discountApplications.findIndex(
      (app) =>
        app?.type === "automatic" &&
        BUNDLE_DISCOUNT_TITLES.includes(String(app?.title ?? "").trim().toLowerCase())
    );

    console.log(
      `[Analytics] order ${order.name ?? order.id} for ${shop} — discount_applications:`,
      JSON.stringify(discountApplications.map((a) => ({ type: a?.type, title: a?.title })))
    );

    // No bundle discount applied on this order — nothing to record
    if (bundleAppIndex === -1) {
      console.log(`[Analytics] order ${order.name ?? order.id} — no matching bundle discount, skipping`);
      return new Response("OK", { status: 200 });
    }

    let discountAmount = 0;
    for (const lineItem of order.line_items ?? []) {
      for (const allocation of lineItem.discount_allocations ?? []) {
        if (allocation.discount_application_index === bundleAppIndex) {
          discountAmount += parseFloat(allocation.amount ?? "0");
        }
      }
    }

    const orderTotal = parseFloat(order.current_total_price ?? order.total_price ?? "0");
    const currency = order.currency ?? order.presentment_currency ?? "USD";

    await db.analyticsEvent.upsert({
      where: { shop_shopifyOrderId: { shop, shopifyOrderId: String(order.id) } },
      create: {
        shop,
        shopifyOrderId: String(order.id),
        orderName: order.name ?? null,
        orderTotal,
        discountAmount,
        currency,
      },
      update: {
        orderTotal,
        discountAmount,
        currency,
      },
    });

    console.log(
      `[Analytics] ${topic} — recorded order ${order.name ?? order.id} for ${shop} (total=${orderTotal}, discount=${discountAmount})`
    );

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Analytics] orders/create webhook failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
