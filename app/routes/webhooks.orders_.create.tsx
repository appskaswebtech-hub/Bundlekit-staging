import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─────────────────────────────────────────
// HOW SHOPIFY NATIVE BUNDLE ORDERS WORK
// ─────────────────────────────────────────
// Shopify sends component products as individual line items.
// The bundle parent product ID never appears directly.
//
// BUT Shopify DOES group bundle components together via:
//   lineItem.sales_line_item_group_id  ← same value for all components in a bundle
//   order.line_item_groups             ← lists all group IDs in this order
//
// Real payload example:
//   line_items[0].product_id = 8400362569913  (Archived Snowboard)
//   line_items[0].sales_line_item_group_id = 2201321657
//   line_items[1].product_id = 8400362733753  (Collection Snowboard)
//   line_items[1].sales_line_item_group_id = 2201321657
//   line_item_groups = [{ id: 2201321657 }]
//
// MATCHING STRATEGY (uses sales_line_item_group_id):
//   1. Group all order line items by their sales_line_item_group_id
//   2. For each group, collect the product GIDs
//   3. Match each group against our bundles by comparing component GIDs
//   4. One group = one bundle purchase — no overlap possible
//
// This is far more reliable than the previous "all components present" check
// because it respects Shopify's own grouping — even if two bundles share
// a component product, they'll have different group IDs.
//
// FALLBACK: Line items with no sales_line_item_group_id are skipped
// (they're standalone products, not bundle components).
// ─────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`WEBHOOK: ${topic} | SHOP: ${shop}`);
    console.log(`${"=".repeat(60)}`);

    const order = payload as any;

    if (!order?.line_items || order.line_items.length === 0) {
      console.log("No line items — skipping");
      return new Response("OK", { status: 200 });
    }

    // ── Load all bundles for this shop ──
    const allBundles = await prisma.bundle.findMany({
      where: {
        shop,
        shopifyProductId: { not: null },
      },
      include: { items: true },
    });

    if (allBundles.length === 0) {
      console.log("No bundles for this shop — skipping");
      return new Response("OK", { status: 200 });
    }

    console.log(`Loaded ${allBundles.length} bundle(s):`);
    for (const b of allBundles) {
      console.log(
        `  "${b.title}" → [${b.items.map((i) => i.shopifyProductId).join(", ")}]`
      );
    }

    // ── Step 1: Group line items by sales_line_item_group_id ──
    // Each unique group ID represents one bundle purchase in this order.
    // Line items without a group ID are standalone products — skip them.
    const groupMap = new Map<number, any[]>();

    for (const lineItem of order.line_items) {
      const groupId = lineItem.sales_line_item_group_id;
      if (!groupId) {
        console.log(
          `  Skipping standalone line item: "${lineItem.title}" (no group ID)`
        );
        continue;
      }
      if (!groupMap.has(groupId)) groupMap.set(groupId, []);
      groupMap.get(groupId)!.push(lineItem);
    }

    if (groupMap.size === 0) {
      console.log("No bundle line item groups found in this order — skipping");
      return new Response("OK", { status: 200 });
    }

    console.log(`\nFound ${groupMap.size} line item group(s) in order ${order.name ?? order.id}:`);
    groupMap.forEach((items, groupId) => {
      console.log(`  Group ${groupId}: [${items.map((i) => i.title).join(", ")}]`);
    });

    // ── Step 2: For each group, find the matching bundle ──
    for (const [groupId, groupLineItems] of groupMap) {
      console.log(`\nProcessing group ${groupId}:`);

      // Build set of product GIDs in this group
      const groupProductGIDs = new Set(
        groupLineItems
          .filter((li) => li.product_id)
          .map((li) => `gid://shopify/Product/${li.product_id}`)
      );

      console.log(`  Products: [${[...groupProductGIDs].join(", ")}]`);

      // Find bundle whose component GIDs exactly match this group's product GIDs
      const matchedBundle = allBundles.find((bundle) => {
        if (bundle.items.length === 0) return false;
        const bundleComponentGIDs = new Set(
          bundle.items.map((item) => item.shopifyProductId)
        );

        // Every bundle component must be in the group AND
        // every group product must be a bundle component (exact match)
        const bundleMatchesGroup =
          bundle.items.every((item) => groupProductGIDs.has(item.shopifyProductId)) &&
          groupLineItems
            .filter((li) => li.product_id)
            .every((li) =>
              bundleComponentGIDs.has(`gid://shopify/Product/${li.product_id}`)
            );

        return bundleMatchesGroup;
      });

      if (!matchedBundle) {
        console.log(`  → No bundle found matching this group — skipping`);
        continue;
      }

      console.log(`  → Matched bundle: "${matchedBundle.title}" (${matchedBundle.id})`);

      // ── Deduplicate: one BundleOrder per (bundleId + orderId + groupId) ──
      const existing = await prisma.bundleOrder.findFirst({
        where: {
          bundleId:         matchedBundle.id,
          shopifyOrderId:   String(order.id),
          shopifyLineItemId: String(groupId),   // use groupId as canonical ref
        },
      });

      if (existing) {
        console.log("  → Already recorded — skipping duplicate");
        continue;
      }

      // ── Derive quantity from first line item in group ──
      // All components in a bundle have the same quantity
      const firstLI = groupLineItems[0];
      const bundleQty = firstLI?.quantity ?? 1;

      // ── Compute pricePaid = sum of all line item totals in group ──
      let pricePaid = 0;
      for (const li of groupLineItems) {
        pricePaid += parseFloat(li.price ?? "0") * (li.quantity ?? 1);
      }

      // ── Persist ──
      const bundleOrder = await prisma.bundleOrder.create({
        data: {
          bundleId:          matchedBundle.id,
          shop,
          shopifyOrderId:    String(order.id),
          shopifyLineItemId: String(groupId),   // sales_line_item_group_id as ref
          quantity:          bundleQty,
          pricePaid,
        },
      });

      console.log(
        `  ✅ BundleOrder CREATED: ${bundleOrder.id}\n` +
        `     order=${order.name ?? order.id} | group=${groupId} | qty=${bundleQty} | pricePaid=$${pricePaid.toFixed(2)}`
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("WEBHOOK COMPLETE");
    console.log(`${"=".repeat(60)}\n`);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error type   :", error?.constructor?.name);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "Stack        :",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return new Response("Internal Server Error", { status: 500 });
  }
};
