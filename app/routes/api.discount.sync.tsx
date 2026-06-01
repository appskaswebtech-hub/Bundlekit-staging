import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: session.shop },
    include: {
      bundles: {
        where: { status: "ACTIVE", bundleType: "QUANTITY_BREAK" },
        include: {
          quantityBreaks: { orderBy: { sortOrder: "asc" } },
          bundleProducts: true,
        },
      },
    },
  });

  if (!shopRecord) {
    return json({ error: "Shop not found" }, { status: 404 });
  }

  // Build rules for Shopify Function
  const rules = shopRecord.bundles.map((bundle : any) => ({
    bundleId: bundle.id,
    priority: bundle.prioritySequence,
    productSelectionType: bundle.productSelectionType,
    productIds: bundle.bundleProducts.map((p:any) => p.shopifyProductId),
    quantityBreaks: bundle.quantityBreaks.map((qb :any) => ({
      quantity: qb.quantity,
      quantityType: qb.quantityType,
      minQuantity: qb.minQuantity,
      maxQuantity: qb.maxQuantity,
      discountType: qb.discountType,
      discountValue: qb.discountValue,
      savingsText: qb.savingsText,
      description: qb.description,
    })),
  }));

  const FUNCTION_ID = process.env.SHOPIFY_DISCOUNT_FUNCTION_ID;
  if (!FUNCTION_ID) {
    return json({ error: "SHOPIFY_DISCOUNT_FUNCTION_ID not set" }, { status: 500 });
  }

  try {
    // Check if discount already exists
    const existing = await admin.graphql(`
      query {
        automaticDiscountNodes(first: 20) {
          edges {
            node {
              id
              automaticDiscount {
                ... on DiscountAutomaticApp {
                  title
                  appDiscountType {
                    functionId
                  }
                }
              }
            }
          }
        }
      }
    `);

    const existingData = await existing.json();
    const edges = existingData.data?.automaticDiscountNodes?.edges ?? [];
    const found = edges.find(
      (e: any) =>
        e.node?.automaticDiscount?.appDiscountType?.functionId === FUNCTION_ID
    );

    const metafields = [
      {
        namespace: "bundlekit",
        key: "rules",
        type: "json",
        value: JSON.stringify(rules),
      },
    ];

    if (found) {
      // Update existing discount
      const updateRes = await admin.graphql(
        `mutation Update($id: ID!, $discount: DiscountAutomaticAppInput!) {
          discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
            userErrors { field message }
          }
        }`,
        { variables: { id: found.node.id, discount: { metafields } } }
      );
      const updateData = await updateRes.json();
      const errors = updateData.data?.discountAutomaticAppUpdate?.userErrors;
      if (errors?.length) {
        console.error("[BundleKit] Update errors:", errors);
        return json({ error: errors[0].message }, { status: 500 });
      }
    } else {
      // Create new discount
      const createRes = await admin.graphql(
        `mutation Create($discount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $discount) {
            automaticAppDiscount { discountId }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            discount: {
              title: "BundleKit Quantity Breaks",
              functionId: FUNCTION_ID,
              startsAt: new Date().toISOString(),
              combinesWith: {
                productDiscounts: true,
                orderDiscounts: true,
                shippingDiscounts: true,
              },
              metafields,
            },
          },
        }
      );
      const createData = await createRes.json();
      const errors = createData.data?.discountAutomaticAppCreate?.userErrors;
      if (errors?.length) {
        console.error("[BundleKit] Create errors:", errors);
        return json({ error: errors[0].message }, { status: 500 });
      }
    }

    return json({ success: true, rulesCount: rules.length });
  } catch (err) {
    console.error("[BundleKit] Sync error:", err);
    return json({ error: "Sync failed" }, { status: 500 });
  }
};
