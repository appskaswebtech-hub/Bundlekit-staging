import {useState} from "react";
import {
  InlineGrid,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Icon,
  Page,
} from "@shopify/polaris";

import {
  SettingsIcon,
  ReceiptDollarIcon,
  ChartHistogramFullIcon,
  ProductIcon,
  AirplaneIcon,
  CollectionIcon,
  DiscountIcon,
} from "@shopify/polaris-icons";

import {useNavigate} from "@remix-run/react";

export default function Settings() {
  const navigate = useNavigate();
const [hovered, setHovered] = useState<number | null>(null);
const settingsCards = [
  {
    title: "General settings",
    description: "Branding & app embed",
    icon: SettingsIcon,
    path: "/app/settings/general",
    active: true,
  },

  {
    title: "Classic bundle colors",
    description: "Coming soon...",
    icon: ProductIcon,
    active: false,
  },

  {
    title: "Mix & Match bundle colors",
    description: "Coming soon...",
    icon: AirplaneIcon,
    active: false,
  },

  {
    title: "Sectioned mix & match bundle colors",
    description: "Coming soon...",
    icon: CollectionIcon,
    active: false,
  },

  {
    title: "Volume discount colors",
    description: "Colors used for volume discounts",
    icon: ReceiptDollarIcon,
    path: "/app/settings/vol?widget=volume-widget",
    active: true,
  },

  {
    title: "Discount popup colors",
    description: "Coming soon...",
    icon: DiscountIcon,
    active: false,
  },

  {
    title: "Quantity break colors",
    description: "Colors used for quantity breaks",
    icon: ChartHistogramFullIcon,
    path: "/app/settings/qty?widget=bundler-widget",
    active: true,
  },
];

  return (
    <Page
      title="Settings"
      subtitle="Manage your bundle kit configuration"
    >
   <Box paddingBlockStart="400">
  <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">

    {settingsCards.map((item, index) => (
      <div
  key={index}
  onClick={() => {
  if (item.active) {
    navigate(item.path);
  } else {
    alert("Coming soon...");
  }
}}
  style={{
    cursor: "pointer",
    transition: "all 0.25s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-4px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0px)";
  }}
>
  <Card roundedAbove="sm">
    
    <div
      style={{
        height: "80px",
        display: "flex",
        alignItems: "center",
        padding: "5px",
        backgroundColor: hovered === index ? "#f3f3f3" : "#ffffff",
        transition: "background-color 0.25s ease",
        borderRadius: "12px",
      }}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
    >

      {/* LEFT ICON */}
      <div
        style={{
          minWidth: "40px",
          width: "40px",
          height: "40px",
          borderRadius: "5px",
          background: "#f1f5ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "16px",
        }}
      >
        <Icon source={item.icon} tone="base" />
      </div>

      {/* RIGHT CONTENT */}
      <div>
        <Text as="h3" variant="headingMd" tone="success">
          {item.title}
        </Text>

        <div style={{ marginTop: "4px" }}>
          <Text as="p" tone="subdued">
            {item.description}
          </Text>
        </div>
      </div>

    </div>

  </Card>
</div>
    ))}

  </InlineGrid>
</Box>
    </Page>
  );
}