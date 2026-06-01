import { Card, BlockStack, Text, Badge, InlineStack, Button, Box } from "@shopify/polaris";

interface BundleTypeCardProps {
  type: string;
  label: string;
  badge?: string;
  description: string;
  example: string;
  image: string;
  enabled: boolean;
  onSelect: () => void;
}

export function BundleTypeCard({
  label,
  badge,
  description,
  example,
  image,
  enabled,
  onSelect,
}: BundleTypeCardProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Box
          background={enabled ? "bg-surface" : "bg-surface-disabled"}
          borderRadius="200"
          padding="0"
        >
          <img
            src={image}
            alt={label}
            style={{
              width: "100%",
              height: "150px",
              objectFit: "cover",
              borderRadius: "8px",
              opacity: enabled ? 1 : 0.5,
            }}
          />
        </Box>

        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              {label}
            </Text>
            {badge && <Badge tone="info">{badge}</Badge>}
          </InlineStack>

          <Text as="p" variant="bodyMd" tone="subdued">
            {description}
          </Text>

          <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="200"
          >
            <Text as="p" variant="bodySm">
              {example}
            </Text>
          </Box>
        </BlockStack>

        <Button
          variant="primary"
          fullWidth
          onClick={onSelect}
          disabled={!enabled}
        >
          {enabled ? "Select" : "Coming Soon"}
        </Button>
      </BlockStack>
    </Card>
  );
}
