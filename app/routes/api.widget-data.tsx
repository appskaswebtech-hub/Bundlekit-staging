import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import db from "../db.server";
import { getShopColors } from "../models/bundle.server"; // ✅ Import add kiya

function verifyProxySignature(query: URLSearchParams): boolean {
  const signature = query.get("signature");
  if (!signature) return false;

  const secret = process.env.SHOPIFY_API_SECRET || "";

  const params: string[] = [];
  query.forEach((value, key) => {
    if (key !== "signature") {
      params.push(`${key}=${value}`);
    }
  });
  params.sort();
  const message = params.join("");

  const computed = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return computed === signature;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // ✅ Pehle signature verify karo
  if (process.env.NODE_ENV === "production") {
    if (!verifyProxySignature(url.searchParams)) {
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ✅ Pehle shop define karo
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId");
  const widgetType = url.searchParams.get("widgetType") || " ";
  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // ✅ Ab getShopColors call karo — shop define hone ke baad
  const shopColors = await getShopColors(shop, widgetType);

  const bundles = await db.bundle.findMany({
    where: {
      shop,
      status: "ACTIVE",
      showWidget: true,
    },
    include: {
      quantityBreaks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { prioritySequence: "asc" },
  });

  const matchingBundles = bundles.filter((bundle) => {
    if (bundle.productSelectionType === "ALL_PRODUCTS") return true;
    if (!productId) return false;
    try {
      const ids = JSON.parse(bundle.selectedProductIds || "[]");
      return (
        ids.includes(productId) ||
        ids.includes(Number(productId)) ||
        ids.includes(String(productId))
      );
    } catch {
      return false;
    }
  });

  // ✅ Colors top level pe, bundle ke andar nahi
  const payload = {
    colors: shopColors,
    bundles: matchingBundles.map((b) => ({
      id: b.id,
      name: b.name,
      title: b.title,
      quantityBreaks: b.quantityBreaks.map((qb) => ({
        id: qb.id,
        type: qb.type,
        quantity: qb.quantity,
        maxQuantity: qb.maxQuantity,
        discountType: qb.discountType,
        discountValue: qb.discountValue,
        savingsText: qb.savingsText,
        description: qb.description,
        freeShipping: qb.freeShipping,
      })),
    })),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};