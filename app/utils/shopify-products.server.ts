import { authenticate } from "../shopify.server";

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    url: string;
    altText?: string;
  };
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  status: string;
}

/**
 * Fetch products by IDs from Shopify
 */
export async function getProductsByIds(
  admin: any,
  productIds: string[]
): Promise<ShopifyProduct[]> {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  // Build query filter for multiple product IDs
  const query = productIds.map(id => `id:${id}`).join(" OR ");

  const response = await admin.graphql(
    `#graphql
      query getProducts($query: String!) {
        products(first: 250, query: $query) {
          edges {
            node {
              id
              title
              handle
              status
              featuredImage {
                url
                altText
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        query,
      },
    }
  );

  const data = await response.json();

  return data.data.products.edges.map((edge: any) => edge.node);
}

/**
 * Search products by query
 */
export async function searchProducts(
  admin: any,
  searchQuery: string = "",
  limit: number = 10
): Promise<ShopifyProduct[]> {
  const response = await admin.graphql(
    `#graphql
      query searchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              status
              featuredImage {
                url
                altText
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        query: searchQuery,
        first: limit,
      },
    }
  );

  const data = await response.json();

  return data.data.products.edges.map((edge: any) => edge.node);
}

/**
 * Format Shopify GID to numeric ID
 */
export function extractProductId(gid: string): string {
  // Extract numeric ID from "gid://shopify/Product/123456"
  return gid.split("/").pop() || gid;
}

/**
 * Convert numeric ID to Shopify GID
 */
export function formatProductGid(id: string): string {
  if (id.startsWith("gid://")) {
    return id;
  }
  return `gid://shopify/Product/${id}`;
}
