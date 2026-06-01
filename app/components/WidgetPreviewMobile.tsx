import { Card, BlockStack, Text, Box, Button, InlineStack } from "@shopify/polaris";
import { MobileIcon, DesktopIcon } from "@shopify/polaris-icons";
import { WidgetPreview } from "./WidgetPreview";
import { useState } from "react";

interface QuantityBreak {
  quantity: number;
  discountType: string;
  discountValue: number;
  description: string;
  savingsText: string;
  freeShipping?: boolean;
}

interface WidgetPreviewMobileProps {
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

export function WidgetPreviewMobile(props: WidgetPreviewMobileProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div style={{ position: "sticky", top: "20px" }}>
      <BlockStack gap="300">
        {/* View Mode Toggle */}
        <Card>
          <InlineStack gap="200" align="center">
            <Button
              pressed={viewMode === "desktop"}
              onClick={() => setViewMode("desktop")}
              icon={DesktopIcon}
            >
              Desktop
            </Button>
            <Button
              pressed={viewMode === "mobile"}
              onClick={() => setViewMode("mobile")}
              icon={MobileIcon}
            >
              Mobile
            </Button>
          </InlineStack>
        </Card>

        {/* Preview Container */}
        <Box
          maxWidth={viewMode === "mobile" ? "375px" : "100%"}
          style={{
            margin: viewMode === "mobile" ? "0 auto" : "0",
            transition: "max-width 0.3s ease",
          }}
        >
          <WidgetPreview {...props} />
        </Box>
      </BlockStack>
    </div>
  );
}
