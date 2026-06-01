import { BlockStack, TextField, Select, Button, Card, InlineStack, Text, Icon } from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useState } from "react";

interface QuantityBreak {
  quantity: number;
  discountType: string;
  discountValue: number;
  description: string;
  savingsText: string;
  freeShipping: boolean;
}

interface QuantityBreakListProps {
  breaks: QuantityBreak[];
  onChange: (breaks: QuantityBreak[]) => void;
}

export function QuantityBreakList({ breaks, onChange }: QuantityBreakListProps) {
  const handleAddBreak = () => {
    const lastBreak = breaks[breaks.length - 1];
    onChange([
      ...breaks,
      {
        quantity: (lastBreak?.quantity || 0) + 1,
        discountType: "PERCENTAGE",
        discountValue: 0,
        description: `Buy ${(lastBreak?.quantity || 0) + 1} and get a discount!`,
        savingsText: "Save {{discount_value}}{{discount_unit}}",
        freeShipping: false,
      },
    ]);
  };

  const handleUpdateBreak = (index: number, field: string, value: any) => {
    const updated = [...breaks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemoveBreak = (index: number) => {
    if (breaks.length > 1) {
      onChange(breaks.filter((_, i) => i !== index));
    }
  };

  return (
    <BlockStack gap="400">
      {breaks.map((breakItem, index) => (
        <Card key={index}>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h3" variant="headingSm">
                QUANTITY BREAK #{index + 1}
              </Text>
              {breaks.length > 1 && (
                <Button
                  icon={DeleteIcon}
                  onClick={() => handleRemoveBreak(index)}
                  variant="plain"
                  tone="critical"
                />
              )}
            </InlineStack>

            <InlineStack gap="200">
              <div style={{ flex: 1 }}>
                <Select
                  label="Type"
                  options={[{ label: "Fixed quantity", value: "FIXED_QUANTITY" }]}
                  value="FIXED_QUANTITY"
                  onChange={() => {}}
                  disabled
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={breakItem.quantity.toString()}
                  onChange={(value) =>
                    handleUpdateBreak(index, "quantity", parseInt(value) || 1)
                  }
                  autoComplete="off"
                />
              </div>
            </InlineStack>

            <InlineStack gap="200">
              <div style={{ flex: 1 }}>
                <Select
                  label="Discount"
                  options={[
                    { label: "Percentage discount (%)", value: "PERCENTAGE" },
                    { label: "Fixed amount", value: "FIXED_AMOUNT" },
                    { label: "Fixed price", value: "FIXED_PRICE" },
                  ]}
                  value={breakItem.discountType}
                  onChange={(value) => handleUpdateBreak(index, "discountType", value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Adjustment value"
                  type="number"
                  value={breakItem.discountValue.toString()}
                  onChange={(value) =>
                    handleUpdateBreak(index, "discountValue", parseFloat(value) || 0)
                  }
                  suffix={breakItem.discountType === "PERCENTAGE" ? "%" : "$"}
                  autoComplete="off"
                />
              </div>
            </InlineStack>

            <TextField
              label="Savings text"
              value={breakItem.savingsText}
              onChange={(value) => handleUpdateBreak(index, "savingsText", value)}
              autoComplete="off"
              helpText="The {{discount_value}} and {{discount_unit}} placeholders will be automatically replaced with the correct value."
            />

            <TextField
              label="Description"
              value={breakItem.description}
              onChange={(value) => handleUpdateBreak(index, "description", value)}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}

      <Button onClick={handleAddBreak} fullWidth>
        Add quantity break
      </Button>
    </BlockStack>
  );
}
