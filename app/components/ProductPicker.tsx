import { useState } from "react";
import { Button, InlineStack, Text } from "@shopify/polaris";
import { ProductIcon } from "@shopify/polaris-icons";

interface ProductPickerProps {
  selectedProducts: string[];
  onSelect: (productIds: string[]) => void;
  maxSelections?: number;
}

export function ProductPicker({
  selectedProducts,
  onSelect,
  maxSelections,
}: ProductPickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleOpenPicker = async () => {
    // Use Shopify App Bridge to open product picker
    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: maxSelections ? maxSelections > 1 : true,
      action: "select",
      filter: {
        variants: false, // Only select products, not variants
      },
    });

    if (selected && selected.length > 0) {
      // Extract product IDs
      const productIds = selected.map((product: any) => product.id);
      onSelect(productIds);
    }
  };

  return (
    <Button
      onClick={handleOpenPicker}
      icon={ProductIcon}
      variant="primary"
    >
      {selectedProducts.length > 0 ? "Change products" : "Select products"}
    </Button>
  );
}
