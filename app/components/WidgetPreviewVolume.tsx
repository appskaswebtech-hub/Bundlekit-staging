
// 14.05.2026
import { Card, BlockStack, Text, InlineStack, Badge, Box } from "@shopify/polaris";
import { calculateDiscountedPrice, formatPrice, formatSavingsText } from "../utils/price-calculator";
import { useState } from "react";

interface QuantityBreak {
  quantity: number;
  maxQuantity?: number;
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
}

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

export function WidgetPreviewVolume({
  title,
  breaks,
  basePrice = 29.99,
  currency = "USD",
}: WidgetPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sortedBreaks = [...breaks].sort((a, b) => a.quantity - b.quantity);

  return (
    <div style={{ position: "sticky", top: "20px" }}>
      <Card>
        <BlockStack gap="400">
          {/* Widget Container — matches bndlr-volume-discounts */}
            <BlockStack gap="300">

              {/* Title */}
              <Text as="p" variant="headingSm" alignment="center" fontWeight="bold">
                {title || "BUY IN BULK AND GET A DISCOUNT!"}
              </Text>

              {/* Each break — matches bndlr-volume-discount */}
              {sortedBreaks.map((breakItem, index) => {
                const calculation = calculateDiscountedPrice(
                  basePrice,
                  breakItem.quantity,
                  breakItem.discountType,
                  breakItem.discountValue
                );

                const isSelected = index === selectedIndex;
                const hasSavings = calculation.savings > 0;
                const resolvedDescription = resolveTemplate(breakItem.description, breakItem);
                const resolvedSavingsText = formatSavingsText(
                  breakItem.savingsText,
                  breakItem.discountType,
                  breakItem.discountValue,
                  calculation
                );
                return (
  <div
    key={index}
    onClick={() => setSelectedIndex(index)}
    style={{
      padding: "12px 16px",
      borderRadius: "8px",
      border: `2px solid ${isSelected ? "#5C6AC4" : "#e0e0e0"}`,
      background: isSelected ? "#f0f4ff" : "#ffffff",
      cursor: "pointer",
      transition: "all 0.15s ease",
    }}
  >
    {/* ── TOP ROW: Description + Old Price + New Price ── */}
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: hasSavings ? "8px" : "0",
    }}>
      {/* Description — "Buy 2 and get a discount!" */}
      <span style={{
        fontSize: "14px",
        fontWeight: "600",
        color: "#333",
        flex: 1,
      }}>
        {resolvedDescription}
      </span>

      {/* Old price strikethrough */}
      {hasSavings && (
        <span style={{
          fontSize: "13px",
          color: "#999",
          textDecoration: "line-through",
          whiteSpace: "nowrap",
        }}>
          {formatPrice(calculation.originalPrice, currency)}
        </span>
      )}

      {/* New price */}
      <span style={{
        fontSize: "14px",
        fontWeight: "700",
        color: "#333",
        whiteSpace: "nowrap",
      }}>
        {formatPrice(calculation.discountedPrice, currency)}
      </span>
    </div>

    {/* ── BOTTOM: Save button badge ── */}
    {hasSavings && resolvedSavingsText && (
      <div style={{
        display: "inline-block",
        padding: "6px 20px",
        borderRadius: "5px",
        background: "#5C6AC4",   // Blue button
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
      }}>
        {resolvedSavingsText}
      </div>
    )}
  </div>
);
              })}

            </BlockStack>
        </BlockStack>
      </Card>
    </div>
  );
}
