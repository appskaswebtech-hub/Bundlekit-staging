import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { getShopColors } from "../models/bundle.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  const widgetType = url.searchParams.get("widgetType");
  if (!shopDomain) {
    return json({ error: "Shop param missing" }, { status: 400 });
  }

  try {
    const colors = await getShopColors(shopDomain, widgetType || " ");

    return json(colors, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("ShopSettings fetch error:", error);
    return json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}