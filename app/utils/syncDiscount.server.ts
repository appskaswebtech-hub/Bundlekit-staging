import prisma from "../db.server";

/**
 * Builds a JSON config object from all active bundles for a shop.
 * Also returns the effective combinesWith (union across all bundles).
 */
async function buildBundleConfig(shop: string) {
  const bundles = await prisma.bundle.findMany({
    where: { shop, status: "ACTIVE" },
    include: {
      quantityBreaks: { orderBy: { sortOrder: "asc" } },
      discountCombination: true,
    },
  });

  const config: Record<string, any> = { bundles: {} };

  // Union of all bundles' combination settings
  const combinesWith = {
    productDiscounts: false,
    orderDiscounts:   false,
    shippingDiscounts: false,
  };

  for (const bundle of bundles) {
    const breaks: Record<string, any> = {};
    for (const qb of bundle.quantityBreaks) {
      breaks[qb.id] = {
        discountType:  qb.discountType,
        discountValue: qb.discountValue,
        quantity:      qb.quantity,
        freeShipping:  qb.freeShipping,
      };
    }
    config.bundles[bundle.id] = {
      name:                 bundle.name,
      title:                bundle.title,
      productSelectionType: bundle.productSelectionType,
      selectedProductIds:   bundle.selectedProductIds,
      breaks,
    };

    // Accumulate combinesWith — if ANY bundle enables it, enable it
    if (bundle.discountCombination?.productDiscounts)  combinesWith.productDiscounts  = true;
    if (bundle.discountCombination?.orderDiscounts)    combinesWith.orderDiscounts    = true;
    if (bundle.discountCombination?.shippingDiscounts) combinesWith.shippingDiscounts = true;
  }

  return { config, combinesWith };
}

/**
 * Sync bundle config to the Shopify Function's automatic discount.
 *
 * - If no discount exists yet → finds the function → creates the discount with metafield
 * - If discount exists → updates the metafield with new config
 */
export async function syncBundleConfigToDiscount(admin: any, shop: string) {
  const { config, combinesWith } = await buildBundleConfig(shop);
  const configJson = JSON.stringify(config);

  const DISCOUNT_TITLE = "Bundler Quantity Breaks";

  // ── Step 1: Check if our discount already exists (search both current and legacy title) ──
  async function findExistingDiscount(title: string) {
    const res = await admin.graphql(
      `#graphql
      query($query: String!) {
        discountNodes(first: 5, query: $query) {
          nodes {
            id
            discount {
              ... on DiscountAutomaticApp {
                title
                status
                appDiscountType { functionId }
              }
            }
            metafield(namespace: "bundler", key: "config") { id }
          }
        }
      }`,
      { variables: { query: `title:'${title}'` } }
    );
    const json = await res.json();
    return json?.data?.discountNodes?.nodes?.[0] ?? null;
  }

  // Search by current title first, then the old mismatched title as fallback
  const existingDiscount =
    (await findExistingDiscount(DISCOUNT_TITLE)) ??
    (await findExistingDiscount("Quantity Breaks"));

  // ── Step 2a: Discount exists → update metafield ──
  if (existingDiscount) {
    const existingTitle = (existingDiscount.discount as any)?.title ?? "unknown";
    console.log(`[Bundler] Found existing discount "${existingTitle}" (${existingDiscount.id}) → updating metafield`);

    const updateResponse = await admin.graphql(
      `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: existingDiscount.id,
              namespace: "bundler",
              key: "config",
              type: "json",
              value: configJson,
            },
          ],
        },
      }
    );
    const updateJson = await updateResponse.json();
    const errors = updateJson?.data?.metafieldsSet?.userErrors;
    if (errors?.length) {
      console.error("[Bundler] Metafield update errors:", errors);
    } else {
      console.log("[Bundler] Config metafield synced successfully");
    }

    // Also update combinesWith on the discount node itself
    // DiscountNode GID → DiscountAutomaticApp GID (same numeric ID, different type)
    const discountAppId = existingDiscount.id.replace("DiscountNode", "DiscountAutomaticApp");
    const combinesRes = await admin.graphql(
      `#graphql
      mutation discountAutomaticAppUpdate($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
          userErrors { field message }
        }
      }`,
      {
        variables: {
          id: discountAppId,
          automaticAppDiscount: { combinesWith },
        },
      }
    );
    const combinesJson = await combinesRes.json();
    const combinesErrors = combinesJson?.data?.discountAutomaticAppUpdate?.userErrors;
    if (combinesErrors?.length) {
      console.error("[Bundler] combinesWith update errors:", combinesErrors);
    } else {
      console.log("[Bundler] combinesWith synced:", combinesWith);
    }
    return;
  }

  // ── Step 2b: No discount exists → find function → create discount ──
  console.log("[Bundler] No existing discount found. Looking for function...");

  const functionsResponse = await admin.graphql(
    `#graphql
    query {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
          app {
            handle
          }
        }
      }
    }`
  );
  const functionsJson = await functionsResponse.json();
  const allFunctions = functionsJson?.data?.shopifyFunctions?.nodes || [];

  // Log for debugging
  console.log(
    "[Bundler] Available functions:",
    allFunctions.map((f: any) => `${f.title} (${f.apiType})`)
  );

  // Find our discount function — match flexibly by title
  const bundleFunction = allFunctions.find(
    (fn: any) =>
      fn.title?.toLowerCase().includes("bundle-kit-discount") ||
      fn.title?.toLowerCase().includes("bundle kit discount")
  );

  if (!bundleFunction) {
    console.error(
      "[Bundler] Discount function not found. Deploy extension first with 'shopify app deploy'."
    );
    return;
  }

  console.log("[Bundler] Found function:", bundleFunction.title, "→", bundleFunction.id);

  // Create automatic discount — follows Shopify docs pattern exactly
  const createResponse = await admin.graphql(
    `#graphql
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        userErrors {
          field
          message
        }
        automaticAppDiscount {
          discountId
          title
          status
          appDiscountType {
            appKey
            functionId
          }
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
        }
      }
    }`,
    {
      variables: {
        automaticAppDiscount: {
          title: DISCOUNT_TITLE,
          functionId: bundleFunction.id,
          startsAt: new Date().toISOString(),
          discountClasses: ["PRODUCT"],
          combinesWith,
          metafields: [
            {
              namespace: "bundler",
              key: "config",
              type: "json",
              value: configJson,
            },
          ],
        },
      },
    }
  );
  const createJson = await createResponse.json();
  const createErrors = createJson?.data?.discountAutomaticAppCreate?.userErrors;

  if (createErrors?.length) {
    console.error("[Bundler] Discount create errors:", createErrors);
  } else {
    console.log(
      "[Bundler] Discount created:",
      createJson?.data?.discountAutomaticAppCreate?.automaticAppDiscount?.title
    );
  }
}

/**
 * Deletes the Shopify automatic discount (both possible titles).
 * Call this when all bundles for a shop are deleted.
 */
export async function deleteShopifyDiscount(admin: any, shop: string) {
  const TITLES = ["Bundler Quantity Breaks", "Quantity Breaks"];

  for (const title of TITLES) {
    const searchRes = await admin.graphql(
      `#graphql
      query($query: String!) {
        discountNodes(first: 5, query: $query) {
          nodes { id discount { ... on DiscountAutomaticApp { title } } }
        }
      }`,
      { variables: { query: `title:'${title}'` } }
    );
    const searchJson = await searchRes.json();
    const nodes: any[] = searchJson?.data?.discountNodes?.nodes ?? [];

    for (const node of nodes) {
      const deleteRes = await admin.graphql(
        `#graphql
        mutation discountAutomaticDelete($id: ID!) {
          discountAutomaticDelete(id: $id) {
            deletedAutomaticDiscountId
            userErrors { field message }
          }
        }`,
        { variables: { id: node.id } }
      );
      const deleteJson = await deleteRes.json();
      const errors = deleteJson?.data?.discountAutomaticDelete?.userErrors;
      if (errors?.length) {
        console.error("[Bundler] Discount delete errors:", errors);
      } else {
        console.log(`[Bundler] Deleted discount "${title}" (${node.id})`);
      }
    }
  }
}
