import { BlockStack, InlineStack, Text, Button, Card, Box, Thumbnail, InlineGrid } from "@shopify/polaris";
import { DeleteIcon, ImageIcon } from "@shopify/polaris-icons";

interface Product {
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
}

interface SelectedProductsListProps {
  products: Product[];
  onRemove: (productId: string) => void;
}

export function SelectedProductsList({
  products,
  onRemove,
}: SelectedProductsListProps) {
  if (products.length === 0) {
    return (
      <Card>
        <Box padding="400">
          <InlineStack align="center" blockAlign="center" gap="200">
            <ImageIcon />
            <Text as="p" variant="bodyMd" tone="subdued">
              No products selected
            </Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  return (
    <BlockStack gap="300">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm" fontWeight="semibold">
          Selected products ({products.length})
        </Text>
      </InlineStack>

      <Card padding="0">
        <BlockStack gap="0">
          {products.map((product, index) => {
            const price = parseFloat(product.priceRangeV2.minVariantPrice.amount);
            const formattedPrice = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: product.priceRangeV2.minVariantPrice.currencyCode,
            }).format(price);

            return (
              <div key={product.id}>
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    {/* Product Info */}
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      {/* Product Image */}
                      <Thumbnail
                        source={product.featuredImage?.url || ""}
                        alt={product.featuredImage?.altText || product.title}
                        size="small"
                      />

                      {/* Product Details */}
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {formattedPrice}
                        </Text>
                      </BlockStack>
                    </InlineStack>

                    {/* Remove Button */}
                    <Button
                      icon={DeleteIcon}
                      onClick={() => onRemove(product.id)}
                      variant="plain"
                      tone="critical"
                      accessibilityLabel={`Remove ${product.title}`}
                    />
                  </InlineStack>
                </Box>

                {/* Divider between products */}
                {index < products.length - 1 && (
                  <div style={{ borderTop: "1px solid var(--p-color-border-secondary)" }} />
                )}
              </div>
            );
          })}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
