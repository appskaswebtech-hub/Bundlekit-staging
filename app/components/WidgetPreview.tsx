import { Card, BlockStack, Text, InlineStack, Badge, Box, Icon } from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { calculateDiscountedPrice, formatPrice, formatSavingsText } from "../utils/price-calculator";
import { useState } from "react";
// ── Template resolver ──
function resolveTemplate(str: string, qb: QuantityBreak): string {
  if (!str) return '';
  const discountUnit = qb.discountType === 'PERCENTAGE' ? '%' : '$';
  return str
    .replace(/\{\{quantity\}\}/g,       String(qb.quantity))
    .replace(/\{\{max_quantity\}\}/g,   String(qb.maxQuantity || ''))
    .replace(/\{\{discount_value\}\}/g, String(qb.discountValue))
    .replace(/\{\{discount_unit\}\}/g,  discountUnit);
}

interface QuantityBreak {
  quantity: number;
  maxQuantity: number;
  discountType: string;
  discountValue: number;
  description: string;
  savingsText: string;
  freeShipping?: boolean;
}

interface WidgetPreviewProps {
  title: string;
  breaks: QuantityBreak[];
  basePrice?: number;
  currency?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export function WidgetPreview({
  title,
  breaks,
  basePrice = 29.99,
  currency = "USD",
  colors = {
    primary: "#5C6AC4",
    secondary: "#47C1BF",
    accent: "#00848E",
  },
}: WidgetPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort breaks by quantity
  const sortedBreaks = [...breaks].sort((a, b) => a.quantity - b.quantity);

  return (
    <div style={{ position: "sticky", top: "20px" }}>
      <Card>
        <BlockStack gap="400">
          {/* Preview Header */}
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd" fontWeight="semibold">
              Widget preview
            </Text>
            <Badge tone="info">Live Preview</Badge>
          </InlineStack>

          {/* Widget Container */}
          <Box
            background="bg-surface"
            padding="500"
            borderRadius="300"
            borderWidth="025"
            borderColor="border"
          >
            <BlockStack gap="400">
              {/* Title */}
              <Box
                padding="300"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <Text as="p" variant="headingMd" alignment="center" fontWeight="bold">
                  {title || "BUY IN BULK AND GET A DISCOUNT!"}
                </Text>
              </Box>

              {/* Quantity Breaks List */}
              <BlockStack gap="200">
                {sortedBreaks.map((breakItem, index) => {
                  const calculation = calculateDiscountedPrice(
                    basePrice,
                    breakItem.quantity,
                    breakItem.discountType,
                    breakItem.discountValue
                  );
                  const resolvedDescription = resolveTemplate(breakItem.description, breakItem);
                  const isSelected = index === selectedIndex;
                  const hasSavings = calculation.savings > 0;

                  return (
                    <Box
                      key={index}
                      padding="400"
                      background={isSelected ? "bg-fill-info-secondary" : "bg-surface"}
                      borderRadius="200"
                      borderWidth="025"
                      borderColor={isSelected ? "border-brand" : "border"}
                      onClick={() => setSelectedIndex(index)}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? `0 0 0 2px ${colors.primary}` : "none",
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="start" wrap={false}>
                        {/* Left Side: Radio + Description */}
                        <InlineStack gap="300" blockAlign="start" wrap={false}>
                          {/* Custom Radio Button */}
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              minWidth: "20px",
                              border: `2px solid ${isSelected ? colors.primary : "#8C9196"}`,
                              borderRadius: "50%",
                              backgroundColor: isSelected ? colors.primary : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginTop: "2px",
                            }}
                          >
                            {isSelected && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  backgroundColor: "white",
                                  borderRadius: "50%",
                                }}
                              />
                            )}
                          </div>

                          {/* Description */}
                          <BlockStack gap="100">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                              {/* {breakItem.description} */}
                              {resolvedDescription}
                            </Text>
                            {breakItem.freeShipping && (
                              <InlineStack gap="100" blockAlign="center">
                                <Icon source={CheckIcon} tone="success" />
                                <Text as="span" variant="bodySm" tone="success">
                                  Free shipping
                                </Text>
                              </InlineStack>
                            )}
                          </BlockStack>
                        </InlineStack>

                        {/* Right Side: Pricing */}
                        <BlockStack gap="100" align="end">
                          <Text as="span" variant="headingMd" fontWeight="bold">
                            {formatPrice(calculation.discountedPrice, currency)}
                          </Text>

                          {hasSavings && (
                            <InlineStack gap="200" blockAlign="center" align="end">
                              <Text as="span" variant="bodySm" tone="subdued">
                                <s>{formatPrice(calculation.originalPrice, currency)}</s>
                              </Text>
                              <Badge
                                tone="success"
                                size="small"
                                style={{
                                  backgroundColor: colors.secondary,
                                  color: "white",
                                }}
                              >
                                {breakItem.discountType === "PERCENTAGE"
                                  ? `Save ${Math.round(calculation.savingsPercentage)}%`
                                  : breakItem.discountType === "FIXED_AMOUNT"
                                  ? `Save $${calculation.savings.toFixed(2)}`
                                  : `Save ${Math.round(calculation.savingsPercentage)}%`}
                              </Badge>
                            </InlineStack>
                          )}
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  );
                })}
              </BlockStack>

              {/* Price Breakdown (Optional) */}
              {sortedBreaks[selectedIndex] && (
                <Box
                  background="bg-surface-tertiary"
                  padding="300"
                  borderRadius="200"
                >
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" tone="subdued">
                        Price per item:
                      </Text>
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {formatPrice(basePrice, currency)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" tone="subdued">
                        Quantity:
                      </Text>
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {sortedBreaks[selectedIndex].quantity}
                      </Text>
                    </InlineStack>
                    {sortedBreaks[selectedIndex].discountValue > 0 && (
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm" tone="success">
                          Discount:
                        </Text>
                        <Text as="span" variant="bodySm" fontWeight="medium" tone="success">
                          -{formatPrice(
                            calculateDiscountedPrice(
                              basePrice,
                              sortedBreaks[selectedIndex].quantity,
                              sortedBreaks[selectedIndex].discountType,
                              sortedBreaks[selectedIndex].discountValue
                            ).savings,
                            currency
                          )}
                        </Text>
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>
              )}

              {/* Help Text */}
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Select a quantity to see the discount applied
              </Text>
            </BlockStack>
          </Box>

          {/* Device Preview Toggle (Optional) */}
          <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="200"
          >
            <InlineStack gap="200" align="center" blockAlign="center">
              <Text as="span" variant="bodySm" tone="subdued">
                💡 Preview base price:
              </Text>
              <Text as="span" variant="bodySm" fontWeight="semibold">
                {formatPrice(basePrice, currency)}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                (Example only)
              </Text>
            </InlineStack>
          </Box>
        </BlockStack>
      </Card>
    </div>
  );
}
