import { authenticate } from "../shopify.server";

export async function requireShop(request: Request) {
  const { session } = await authenticate.admin(request);
  if (!session?.shop) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session.shop;
}
