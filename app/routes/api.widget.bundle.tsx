// import { json } from "@remix-run/node";
// import type { LoaderFunctionArgs } from "@remix-run/node";
// import prisma from "../db.server";

// // This is a PUBLIC endpoint — no auth needed
// // Called by the storefront JS widget

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const url = new URL(request.url);
//   const shop = url.searchParams.get("shop");
//   const productId = url.searchParams.get("productId"); // GID format

//   // CORS headers for storefront access
//   const headers = {
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Methods": "GET",
//     "Cache-Control": "public, max-age=60",
//     "Content-Type": "application/json",
//   };

//   if (!shop || !productId) {
//     return json({ bundle: null }, { headers });
//   }

//   try {
//     const shopRecord = await prisma.shop.findUnique({
//       where: { shopDomain: shop, isActive: true },
//     });

//     if (!shopRecord) {
//       return json({ bundle: null }, { headers });
//     }

//     // Find active bundle for this product
//     // Priority: SPECIFIC product match first, then ALL_PRODUCTS
//     let bundle = await prisma.bundle.findFirst({
//       where: {
//         shopId: shopRecord.id,
//         status: "ACTIVE",
//         showWidget: true,
//         bundleType: "QUANTITY_BREAK",
//         productSelectionType: "SPECIFIC",
//         bundleProducts: {
//           some: {
//             shopifyProductId: productId,
//           },
//         },
//       },
//       include: {
//         quantityBreaks: {
//           orderBy: { sortOrder: "asc" },
//         },
//       },
//       orderBy: { prioritySequence: "asc" },
//     });

//     // Fallback to ALL_PRODUCTS bundle
//     if (!bundle) {
//       bundle = await prisma.bundle.findFirst({
//         where: {
//           shopId: shopRecord.id,
//           status: "ACTIVE",
//           showWidget: true,
//           bundleType: "QUANTITY_BREAK",
//           productSelectionType: "ALL_PRODUCTS",
//         },
//         include: {
//           quantityBreaks: {
//             orderBy: { sortOrder: "asc" },
//           },
//         },
//         orderBy: { prioritySequence: "asc" },
//       });
//     }

//     if (!bundle || bundle.quantityBreaks.length === 0) {
//       return json({ bundle: null }, { headers });
//     }

//     return json(
//       {
//         bundle: {
//           id: bundle.id,
//           title: bundle.title,
//           quantityBreaks: bundle.quantityBreaks.map((qb) => ({
//             sortOrder: qb.sortOrder,
//             quantity: qb.quantity,
//             quantityType: qb.quantityType,
//             minQuantity: qb.minQuantity,
//             maxQuantity: qb.maxQuantity,
//             discountType: qb.discountType,
//             discountValue: qb.discountValue,
//             savingsText: qb.savingsText,
//             description: qb.description,
//           })),
//         },
//       },
//       { headers }
//     );
//   } catch (err) {
//     console.error("[BundleKit API] Error:", err);
//     return json({ bundle: null }, { headers });
//   }
// };

// // Handle CORS preflight
// export const action = async () => {
//   return new Response(null, {
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, OPTIONS",
//     },
//   });
// };
