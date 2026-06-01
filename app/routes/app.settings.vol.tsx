import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
} from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Divider,
  Button,
  TextField,
  Checkbox,
  Toast,
  Frame,
  Box,
  Badge,
  Banner,
  Popover,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface SettingsForm {
  primary_color: string;
  selected_bg: string;
  badge_bg: string;
  badge_text: string;

  text_color: string;
  border_color: string;
  original_price_color: string;

  margin_top: number;
  margin_bottom: number;

  brandingRemoved: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

   const url = new URL(request.url);
  
  // ✅ URL se widget type lo, default "volume"
  const widgetType = url.searchParams.get("widget") ?? " ";
 
  // ✅ widgetSettings nahi, Shop table use karo
  let shopRecord = await db.shop.findUnique({
    where: { shopDomain: session.shop },
    include: { settings: true },
  });

  // Agar Shop record hi nahi hai toh create karo
  if (!shopRecord) {
    shopRecord = await db.shop.create({
      data: {
        shopDomain: session.shop,
        planName: "free",
      },
      include: { settings: true },
    });
  }

 const settings = await db.shopSetting.findUnique({
  where: {
    shopId_widgetType: {
      shopId: shopRecord.id,
      widgetType,
    },
  },
});

return json({
   widgetType, 
  settings: settings ?? {   // ✅ null hone pe defaults
    primaryColor: "#3b82f6",
    secondaryColor: "#4a4a6a",
    accentColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    brandingRemoved: false,
  },
  shop: session.shop,
  planName: shopRecord.planName,
});
};

// ─── ACTION ───────────────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const widgetType = formData.get("widgetType") as string ?? " ";
  // ✅ Correct table — Shop (not widgetSettings)
  let shopRecord = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  // Agar shop record nahi hai toh pehle banao
  if (!shopRecord) {
    shopRecord = await db.shop.create({
      data: {
        shopDomain: session.shop,
        planName: "free",
      },
    });
  }

  // Ab ShopSetting upsert karo — ab foreign key error nahi aayega
  await db.shopSetting.upsert({
  where: {
    shopId_widgetType: {
      shopId: shopRecord.id,  // ✅ shop.id nahi, shopRecord.id
      widgetType,
    },
  },
 update: {
  primary_color: formData.get("primary_color") as string,
  selected_bg: formData.get("selected_bg") as string,
  badge_bg: formData.get("badge_bg") as string,
  badge_text: formData.get("badge_text") as string,
  text_color: formData.get("text_color") as string,
  border_color: formData.get("border_color") as string,
  original_price_color: formData.get("original_price_color") as string,

  margin_top: Number(formData.get("margin_top")),
  margin_bottom: Number(formData.get("margin_bottom")),

  brandingRemoved:
    formData.get("brandingRemoved") === "true",
},

create: {
  shopId: shopRecord.id,
  widgetType,

  primary_color: formData.get("primary_color") as string,
  selected_bg: formData.get("selected_bg") as string,
  badge_bg: formData.get("badge_bg") as string,
  badge_text: formData.get("badge_text") as string,
  text_color: formData.get("text_color") as string,
  border_color: formData.get("border_color") as string,
  original_price_color: formData.get("original_price_color") as string,

  margin_top: Number(formData.get("margin_top")),
  margin_bottom: Number(formData.get("margin_bottom")),

  brandingRemoved:
    formData.get("brandingRemoved") === "true",
},
});
  return json({ success: true });
};



// ─── COLOR INPUT ──────────────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [popover, setPopover] = useState(false);

  return (
    <BlockStack gap="200">
      <Text variant="bodySm" as="p" fontWeight="semibold">
        {label}
      </Text>
      <InlineStack gap="300" blockAlign="center">
        <Popover
          active={popover}
          onClose={() => setPopover(false)}
          activator={
            <div
              onClick={() => setPopover(!popover)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: value,
                border: "2px solid #e5e7eb",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
          }
        >
         
          <Box padding="400">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: "200px", height: "40px", cursor: "pointer" }}
            />
          </Box>
         
        </Popover>
        <TextField
          label=""
          labelHidden
          value={value}
          onChange={onChange}
          autoComplete="off"
          maxLength={7}
        />
      </InlineStack>
    </BlockStack>
  );
}

// ─── LIVE PREVIEW ─────────────────────────────────────────────────────────────

function LivePreview({ form }: { form: SettingsForm }) {
  const [selected, setSelected] = useState(0);

  const rows = [
    { label: "Buy 2 and get a discount!", price: "$18.00", origPrice: "$20.00", badge: "Save 10%" },
    { label: "Buy 3 and get a discount!", price: "$25.50", origPrice: "$30.00", badge: "Save 15%" },
  ];

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
        background: form.backgroundColor,
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "12px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          color: form.primaryColor,
          background: "#f9fafb",
        }}
      >
        — BUY IN BULK AND GET A DISCOUNT! —
      </div>
      <div
  style={{
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  }}
>
{rows.map((row, i) => (
  <div
    key={i}
    onClick={() => setSelected(i)}
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",

      padding: "14px 16px",

      borderRadius: "10px",

      border: `1.5px solid ${
        i === selected
          ? form.primary_color
          : form.border_color
      }`,

      background:
        i === selected
          ? form.selected_bg
          : "#ffffff",

      cursor: "pointer",

      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}
  >
    {/* LEFT */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* RADIO */}
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",

          border: `2px solid ${
            i === selected
              ? form.primary_color
              : form.border_color
          }`,

          background:
            i === selected
              ? form.primary_color
              : "#ffffff",

          flexShrink: 0,
        }}
      />

      {/* LABEL */}
      <span
        style={{
          fontSize: "14px",
          color: form.text_color,
          fontWeight: 500,
        }}
      >
        {row.label}
      </span>
    </div>

    {/* RIGHT */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
      }}
    >
      {/* PRICE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {row.origPrice && (
          <span
            style={{
              fontSize: "12px",
              color: form.original_price_color,
              textDecoration: "line-through",
            }}
          >
            {row.origPrice}
          </span>
        )}

        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: form.text_color,
          }}
        >
          {row.price}
        </span>
      </div>

      {/* BADGE */}
      {row.badge && (
        <span
          style={{
            background: form.badge_bg,
            color: form.badge_text,

            fontSize: "12px",
            fontWeight: 600,

            padding: "6px 12px",

            borderRadius: "6px",

            minWidth: "90px",

            textAlign: "center",
          }}
        >
          {row.badge}
        </span>
      )}
    </div>
  </div>
))}
</div>
      {/* Branding */}
      {!form.brandingRemoved && (
        <div style={{ textAlign: "center", fontSize: "10px", color: "#d1d5db", padding: "6px 0 10px" }}>
          Powered by BundleKit
        </div>
      )}
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { settings, shop, planName, widgetType } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [form, setForm] = useState<SettingsForm>({
  primary_color: settings?.primary_color ?? "#1a1a2e",
  selected_bg: settings?.selected_bg ?? "#f0f4ff",
  badge_bg: settings?.badge_bg ?? "#1a1a2e",
  badge_text: settings?.badge_text ?? "#ffffff",
  text_color: settings?.text_color ?? "#333333",
  border_color: settings?.border_color ?? "#e0e0e0",
  original_price_color:
    settings?.original_price_color ?? "#999999",
  brandingRemoved: settings?.brandingRemoved ?? false,
});
  const [toastActive, setToastActive] = useState(false);

  const updateColor = (field: keyof SettingsForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleSave = () => {
  const fd = new FormData();

  fd.append("widgetType", widgetType);

  // COLORS
  fd.append("primary_color", form.primary_color);
  fd.append("selected_bg", form.selected_bg);
  fd.append("badge_bg", form.badge_bg);
  fd.append("badge_text", form.badge_text);
  fd.append("text_color", form.text_color);
  fd.append("border_color", form.border_color);
  fd.append("original_price_color", form.original_price_color);
  // BRANDING
  fd.append("brandingRemoved", String(form.brandingRemoved));

  console.log("FORM DATA:", Object.fromEntries(fd.entries()));

  submit(fd, { method: "post" });
  setToastActive(true);
};

const handleReset = () =>
  setForm({
    primary_color: "#1a1a2e",
    selected_bg: "#f0f4ff",
    badge_bg: "#1a1a2e",
    badge_text: "#ffffff",
    text_color: "#333333",
    border_color: "#e0e0e0",
    original_price_color: "#999999",

    margin_top: 16,
    margin_bottom: 16,

    brandingRemoved: false,
  });

  return (
    <Frame>
      {toastActive && actionData?.success && (
        <Toast
          content="Settings saved successfully!"
          onDismiss={() => setToastActive(false)}
        />
      )}

      <Page
        title="Volume discount colors"
             backAction={{
    content: "Settings",        // Hover pe dikhega
    url: "/app/settings1",       // Jahan navigate karna hai
  }}
        primaryAction={{
          content: "Save settings",
          loading: isSaving,
          onAction: handleSave,
        }}
        secondaryActions={[
          { content: "Reset to defaults", onAction: handleReset },
        ]}
      >
        <Layout>
          {/* ── LEFT ── */}
          <Layout.Section>
            <BlockStack gap="500">
<Card>
  <BlockStack gap="400">
    <Text variant="headingMd" as="h2">
      Widget Colors
    </Text>

    <Divider />

    <Text variant="bodySm" as="p" tone="subdued">
      Customize colors to match your store theme. Changes apply to all Volume discount widgets.
    </Text>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
      }}
    >
      <ColorInput
        label="Primary / Radio Color"
        value={form.primary_color}
        onChange={updateColor("primary_color")}
      />

      <ColorInput
        label="Selected Row Background"
        value={form.selected_bg}
        onChange={updateColor("selected_bg")}
      />

      <ColorInput
        label="Savings Badge Background"
        value={form.badge_bg}
        onChange={updateColor("badge_bg")}
      />

      <ColorInput
        label="Savings Badge Text"
        value={form.badge_text}
        onChange={updateColor("badge_text")}
      />

      <ColorInput
        label="Text Color"
        value={form.text_color}
        onChange={updateColor("text_color")}
      />

      <ColorInput
        label="Border Color"
        value={form.border_color}
        onChange={updateColor("border_color")}
      />

      <ColorInput
        label="Original Price Color"
        value={form.original_price_color}
        onChange={updateColor("original_price_color")}
      />
    </div>

    <Divider />
  </BlockStack>
</Card>
              {/* Branding */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd" as="h2">Branding</Text>
                    <Badge tone={planName === "premium" ? "success" : "warning"}>
                      {planName === "premium" ? "Premium" : "Free Plan"}
                    </Badge>
                  </InlineStack>
                  <Divider />

                  {planName !== "premium" && (
                    <Banner tone="warning">
                      <Text as="p" variant="bodyMd">
                        Remove "Powered by BundleKit" branding by upgrading
                        to Premium or emailing{" "}
                        <strong>verify@bundler.app</strong>.
                      </Text>
                    </Banner>
                  )}

                  <div style={{ opacity: planName === "premium" ? 1 : 0.5 }}>
                    <Checkbox
                      label="Remove 'Powered by BundleKit' branding"
                      checked={planName === "premium" ? form.brandingRemoved : false}
                      disabled={planName !== "premium"}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, brandingRemoved: val }))
                      }
                      helpText="Hide the BundleKit branding text from your widget."
                    />
                  </div>

                  {planName !== "premium" && (
                    <Button variant="primary" tone="success" fullWidth>
                      Upgrade to Remove Branding
                    </Button>
                  )}
                </BlockStack>
              </Card>

              {/* App Embed */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">App Embed</Text>
                  <Divider />
                  <Text variant="bodyMd" as="p">
                    Enable the BundleKit block in your theme editor and place
                    it above the Add to Cart button on your product pages.
                  </Text>
                  <Button
                    url={`https://${shop}/admin/themes/current/editor?context=apps`}
                    external
                    variant="primary"
                  >
                    Open Theme Editor →
                  </Button>
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>

          {/* ── RIGHT: Live Preview ── */}
          <Layout.Section variant="oneThird">
            <div style={{ position: "sticky", top: "20px" }}>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Live Preview</Text>
                  <Divider />
                  <LivePreview form={form} />
                  <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                    Click rows to preview selection state
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}

