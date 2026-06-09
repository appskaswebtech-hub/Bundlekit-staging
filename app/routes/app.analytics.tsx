import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Box,
  Button,
  Checkbox,
  Select,
  Icon,
  Badge,
  Tooltip,
  Divider,
} from "@shopify/polaris";
import {
  CashDollarIcon,
  ChartVerticalIcon,
  LockIcon,
  ChartHistogramFullIcon,
  DiscountIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { checkAppAccess } from "../utils/checkAccess.server";

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const { activePlan } = await checkAppAccess(admin, billing);
  const hasAnalyticsAccess = activePlan === "advanced";

  let storeCurrency = "USD";
  try {
    const shopResponse = await admin.graphql(`{ shop { currencyCode } }`);
    const shopJson = await shopResponse.json();
    storeCurrency = shopJson?.data?.shop?.currencyCode ?? "USD";
  } catch (err) {
    console.error("[Analytics] Failed to load shop currency:", err);
  }

  const setting = await db.analyticsSetting.findUnique({ where: { shop } });
  const collectOrderData = setting?.collectOrderData ?? false;

  let totalRevenue = 0;
  let totalConversions = 0;
  let totalDiscount = 0;
  let activity: { label: string; count: number; revenue: number }[] = [];

  if (hasAnalyticsAccess && collectOrderData) {
    const events = await db.analyticsEvent.findMany({
      where: { shop },
      orderBy: { createdAt: "asc" },
    });

    totalConversions = events.length;
    totalRevenue = events.reduce((sum, e) => sum + e.orderTotal, 0);
    totalDiscount = events.reduce((sum, e) => sum + e.discountAmount, 0);

    const buckets = new Map<string, { count: number; revenue: number }>();
    for (const event of events) {
      const key = event.createdAt.toISOString().slice(0, 10);
      const prev = buckets.get(key) ?? { count: 0, revenue: 0 };
      buckets.set(key, { count: prev.count + 1, revenue: prev.revenue + event.orderTotal });
    }
    activity = Array.from(buckets.entries())
      .slice(-30)
      .map(([date, val]) => ({
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: val.count,
        revenue: val.revenue,
      }));
  }

  const averageOrderValue = totalConversions ? totalRevenue / totalConversions : 0;

  return json({
    hasAnalyticsAccess,
    collectOrderData,
    storeCurrency,
    stats: { totalRevenue, averageOrderValue, totalConversions, totalDiscount },
    activity,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const { activePlan } = await checkAppAccess(admin, billing);
  if (activePlan !== "advanced") {
    return json(
      { success: false, error: "Upgrade to the Advanced plan to use analytics." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const collectOrderData = formData.get("collectOrderData") === "true";

  await db.analyticsSetting.upsert({
    where: { shop },
    create: { shop, collectOrderData },
    update: { collectOrderData },
  });

  return json({ success: true, collectOrderData });
};

const formatCurrency = (value: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }
};

const STAT_CARDS = [
  {
    key: "totalRevenue",
    label: "Total Revenue",
    sub: "From bundle discount orders",
    icon: CashDollarIcon,
    color: "#22c55e",
    bg: "#f0fdf4",
    format: (v: number, c: string) => formatCurrency(v, c),
  },
  {
    key: "averageOrderValue",
    label: "Avg. Order Value",
    sub: "Per bundle discount order",
    icon: ChartVerticalIcon,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    format: (v: number, c: string) => formatCurrency(v, c),
  },
  {
    key: "totalConversions",
    label: "Conversions",
    sub: "Orders with bundle discount",
    icon: ChartHistogramFullIcon,
    color: "#f59e0b",
    bg: "#fffbeb",
    format: (v: number) => String(v),
  },
  {
    key: "totalDiscount",
    label: "Total Savings Given",
    sub: "Discount amount across all orders",
    icon: DiscountIcon,
    color: "#3b82f6",
    bg: "#eff6ff",
    format: (v: number, c: string) => formatCurrency(v, c),
  },
];

export default function Analytics() {
  const { hasAnalyticsAccess, collectOrderData, storeCurrency, stats, activity } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const [collectChecked, setCollectChecked] = useState(collectOrderData);
  const [period, setPeriod] = useState("14");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const isSaving = fetcher.state !== "idle";
  const dirty = collectChecked !== collectOrderData;

  useEffect(() => {
    if (fetcher.data?.success && "collectOrderData" in fetcher.data) {
      setCollectChecked(fetcher.data.collectOrderData);
    }
  }, [fetcher.data]);

  const handleSave = () => {
    fetcher.submit(
      { collectOrderData: collectChecked ? "true" : "false" },
      { method: "post" }
    );
  };

  const periodCount = parseInt(period, 10);
  const visibleActivity = activity.slice(-periodCount);
  const maxCount = Math.max(1, ...visibleActivity.map((a) => a.count));
  const statValues: Record<string, number> = {
    totalRevenue: stats.totalRevenue,
    averageOrderValue: stats.averageOrderValue,
    totalConversions: stats.totalConversions,
    totalDiscount: stats.totalDiscount,
  };

  return (
    <Page
      title="Analytics"
      subtitle="Track how your bundles are driving revenue"
      primaryAction={
        <Button variant="primary" loading={isSaving} disabled={!dirty} onClick={handleSave}>
          Save settings
        </Button>
      }
    >
      <BlockStack gap="500">

        {/* Upgrade banner */}
        {!hasAnalyticsAccess && (
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 12,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon source={LockIcon} tone="base" />
              </div>
              <div>
                <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  Analytics requires the Advanced plan
                </p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                  Unlock full revenue tracking, conversions, and activity charts.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/app/billing")}
              style={{
                background: "#fff", color: "#764ba2", border: "none", borderRadius: 8,
                padding: "9px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              Upgrade now
            </button>
          </div>
        )}

        {/* Data collection toggle */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingMd">Data collection</Text>
                  {!hasAnalyticsAccess && <Badge tone="info" icon={LockIcon}>Advanced plan</Badge>}
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  Enable to start recording order data from bundle discount purchases.
                </Text>
              </BlockStack>
              <Tooltip
                active={!hasAnalyticsAccess ? undefined : false}
                content="Available on the Advanced plan"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Checkbox
                    label="Collect order data"
                    labelHidden
                    checked={collectChecked}
                    disabled={!hasAnalyticsAccess}
                    onChange={(value) => setCollectChecked(value)}
                  />
                  <Text as="span" variant="bodySm" tone={collectChecked ? "success" : "subdued"}>
                    {collectChecked ? "Enabled" : "Disabled"}
                  </Text>
                </div>
              </Tooltip>
            </InlineStack>
            <Divider />
            <Text as="p" variant="bodySm" tone="subdued">
              We only record order totals and discount amounts for orders where a bundle discount was applied.
              Data is used solely to power this dashboard and is never shared with third parties.
            </Text>
          </BlockStack>
        </Card>

        {/* Stat cards */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Colored top accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: 3, background: card.color, borderRadius: "12px 12px 0 0",
              }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: card.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: card.color }}>
                    <Icon source={card.icon} />
                  </span>
                </div>
              </div>

              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                {card.label}
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                {hasAnalyticsAccess && collectOrderData
                  ? card.format(statValues[card.key], storeCurrency)
                  : "—"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{card.sub}</p>
            </div>
          ))}
        </InlineGrid>

        {/* Activity chart */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="0">
                <Text as="h2" variant="headingMd">Order activity</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Bundle discount orders over time
                </Text>
              </BlockStack>
              <Box minWidth="160px">
                <Select
                  label="Period"
                  labelHidden
                  options={PERIOD_OPTIONS}
                  value={period}
                  onChange={setPeriod}
                />
              </Box>
            </InlineStack>

            {!hasAnalyticsAccess || !collectOrderData ? (
              <div style={{
                height: 160, display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f9fafb", borderRadius: 8, border: "1px dashed #e5e7eb",
              }}>
                <BlockStack gap="100" inlineAlign="center">
                  <Icon source={ChartHistogramFullIcon} tone="subdued" />
                  <Text as="p" tone="subdued" alignment="center">
                    {hasAnalyticsAccess
                      ? "Enable data collection above to start tracking activity."
                      : "Upgrade to the Advanced plan to see activity charts."}
                  </Text>
                </BlockStack>
              </div>
            ) : visibleActivity.length === 0 ? (
              <div style={{
                height: 160, display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f9fafb", borderRadius: 8, border: "1px dashed #e5e7eb",
              }}>
                <Text as="p" tone="subdued" alignment="center">
                  No activity recorded yet for this period.
                </Text>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* Y-axis lines */}
                <div style={{ position: "relative", height: 160, paddingBottom: 28 }}>
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: "absolute",
                        left: 0, right: 0,
                        bottom: 28 + (pct / 100) * (160 - 28),
                        borderTop: "1px dashed #f0f0f0",
                        zIndex: 0,
                      }}
                    />
                  ))}

                  {/* Bars */}
                  <div style={{
                    position: "absolute", left: 0, right: 0, bottom: 28, top: 0,
                    display: "flex", alignItems: "flex-end", gap: 4, paddingInline: 2,
                  }}>
                    {visibleActivity.map((point, idx) => {
                      const barHeight = Math.max(4, (point.count / maxCount) * (160 - 28 - 4));
                      const isHovered = hoveredBar === idx;
                      return (
                        <div
                          key={point.label}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative" }}
                          onMouseEnter={() => setHoveredBar(idx)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Tooltip */}
                          {isHovered && (
                            <div style={{
                              position: "absolute",
                              bottom: barHeight + 8,
                              background: "#1f2937",
                              color: "#fff",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              zIndex: 10,
                              pointerEvents: "none",
                            }}>
                              {point.count} order{point.count !== 1 ? "s" : ""}
                              <br />
                              <span style={{ fontWeight: 400, opacity: 0.8 }}>{formatCurrency(point.revenue, storeCurrency)}</span>
                            </div>
                          )}
                          <div
                            style={{
                              width: "100%",
                              height: barHeight,
                              borderRadius: "4px 4px 0 0",
                              background: isHovered
                                ? "linear-gradient(180deg, #8b5cf6, #6d28d9)"
                                : "linear-gradient(180deg, #a78bfa, #8b5cf6)",
                              transition: "background 0.15s, height 0.2s",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    display: "flex", gap: 4, paddingInline: 2, height: 24,
                    alignItems: "center",
                  }}>
                    {visibleActivity.map((point, idx) => (
                      <div key={idx} style={{ flex: 1, textAlign: "center" }}>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>
                          {visibleActivity.length <= 14 ? point.label : (idx % 3 === 0 ? point.label : "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}
