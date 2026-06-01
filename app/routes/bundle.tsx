import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import crypto from "crypto";
import prisma from "../db.server";

// ─── CORS HEADERS ─────────────────────────────────────────────────────────────

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
};

// ─── VERIFY SIGNATURE ─────────────────────────────────────────────────────────

function verifySignature(query: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const signature = query.get("signature");
  if (!signature) return false;

  const params: string[] = [];
  query.forEach((value, key) => {
    if (key !== "signature") params.push(`${key}=${value}`);
  });
  params.sort();

  const digest = crypto
    .createHmac("sha256", secret)
    .update(params.join(""))
    .digest("hex");

  return digest === signature;
}

// ─── LOADER ───────────────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: HEADERS });
  }

  const url = new URL(request.url);
  const query = url.searchParams;

  // Skip signature check in dev mode
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && !verifySignature(query)) {
    console.warn("[BundleKit] Invalid proxy signature");
    return json(
      { bundle: null, error: "Unauthorized" },
      { status: 401, headers: HEADERS }
    );
  }

  const shop = query.get("shop");
  const productId = query.get("product_id");
  const variantId = query.get("variant_id");

  if (!shop || !productId) {
    return json(
      { bundle: null, error: "Missing shop or product_id" },
      { status: 400, headers: HEADERS }
    );
  }

  try {
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop, isActive: true },
      include: { settings: true },
    });

    if (!shopRecord) {
      return json({ bundle: null }, { headers: HEADERS });
    }

    const gid = `gid://shopify/Product/${productId}`;

    // 1. Try SPECIFIC product match first
    let bundle = await prisma.bundle.findFirst({
      where: {
        shopId: shopRecord.id,
        status: "ACTIVE",
        showWidget: true,
        bundleType: "QUANTITY_BREAK",
        productSelectionType: "SPECIFIC",
        bundleProducts: {
          some: { shopifyProductId: gid },
        },
      },
      include: {
        quantityBreaks: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { prioritySequence: "asc" },
    });

    // 2. Fallback to ALL_PRODUCTS
    if (!bundle) {
      bundle = await prisma.bundle.findFirst({
        where: {
          shopId: shopRecord.id,
          status: "ACTIVE",
          showWidget: true,
          bundleType: "QUANTITY_BREAK",
          productSelectionType: "ALL_PRODUCTS",
        },
        include: {
          quantityBreaks: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { prioritySequence: "asc" },
      });
    }

    if (!bundle || !bundle.quantityBreaks.length) {
      return json({ bundle: null }, { headers: HEADERS });
    }

    return json(
      {
        bundle: {
          id: bundle.id,
          title: bundle.title,
          quantityBreaks: bundle.quantityBreaks.map((qb) => ({
            sortOrder: qb.sortOrder,
            quantity: qb.quantity,
            quantityType: qb.quantityType,
            minQuantity: qb.minQuantity,
            maxQuantity: qb.maxQuantity,
            discountType: qb.discountType,
            discountValue: qb.discountValue,
            savingsText: qb.savingsText,
            description: qb.description,
          })),
        },
        colors: shopRecord.settings
          ? {
              primaryColor: shopRecord.settings.primaryColor,
              accentColor: shopRecord.settings.accentColor,
              backgroundColor: shopRecord.settings.backgroundColor,
            }
          : null,
        brandingRemoved: shopRecord.settings?.brandingRemoved ?? false,
      },
      { headers: HEADERS }
    );
  } catch (err) {
    console.error("[BundleKit Proxy] Error:", err);
    return json(
      { bundle: null, error: "Server error" },
      { status: 500, headers: HEADERS }
    );
  }
};

export const action = async () =>
  new Response(null, { status: 204, headers: HEADERS });
