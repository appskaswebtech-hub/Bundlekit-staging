import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Box,
  Banner,
  Button,
  Checkbox,
  Select,
  Icon,
  Badge,
  Tooltip,
} from "@shopify/polaris";
import {
  CashDollarIcon,
  OrderIcon,
  ChartVerticalIcon,
  LockIcon,
  ChartHistogramFullIcon,
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
  let activity: { label: string; count: number }[] = [];

  if (hasAnalyticsAccess && collectOrderData) {
    const events = await db.analyticsEvent.findMany({
      where: { shop },
      orderBy: { createdAt: "asc" },
    });

    totalConversions = events.length;
    totalRevenue = events.reduce((sum, event) => sum + event.orderTotal, 0);

    const buckets = new Map<string, number>();
    for (const event of events) {
      const key = event.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    activity = Array.from(buckets.entries())
      .slice(-30)
      .map(([date, count]) => ({
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      }));
  }

  const averageOrderValue = totalConversions ? totalRevenue / totalConversions : 0;

  return json({
    hasAnalyticsAccess,
    collectOrderData,
    storeCurrency,
    stats: { totalRevenue, averageOrderValue, totalConversions },
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

export default function Analytics() {
  const { hasAnalyticsAccess, collectOrderData, storeCurrency, stats, activity } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [collectChecked, setCollectChecked] = useState(collectOrderData);
  const [period, setPeriod] = useState("14");

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

  return (
    <Page
      title="Analytics"
      subtitle="Understand how your bundles are performing"
      primaryAction={
        <Button variant="primary" loading={isSaving} disabled={!dirty} onClick={handleSave}>
          Save
        </Button>
      }
    >
      <BlockStack gap="400">
        <Banner tone="info" title="About data collection">
          <p>
            When enabled, we record order totals and discount amounts for orders where one of
            your bundle discounts was applied. This data is used only to power the statistics
            shown on this page and is never shared with third parties.
          </p>
        </Banner>

        {!hasAnalyticsAccess && (
          <Banner tone="warning" title="Analytics is part of the Advanced plan">
            <p>Upgrade to the Advanced plan to unlock the full analytics dashboard.</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={OrderIcon} tone="subdued" />
              <Text as="h2" variant="headingMd">
                Order data
              </Text>
              {!hasAnalyticsAccess && (
                <Badge tone="info" icon={LockIcon}>
                  Advanced plan
                </Badge>
              )}
            </InlineStack>

            <Tooltip
              active={!hasAnalyticsAccess ? undefined : false}
              content="Available on the Advanced plan"
            >
              <Checkbox
                label="Collect order data for analytical purposes"
                helpText="We'll start recording revenue and conversions from orders that use your bundle discounts."
                checked={collectChecked}
                disabled={!hasAnalyticsAccess}
                onChange={(value) => setCollectChecked(value)}
              />
            </Tooltip>
          </BlockStack>
        </Card>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <Card>
            <BlockStack gap="300">
              <Box
                background="bg-fill-success-secondary"
                borderRadius="200"
                padding="200"
                minWidth="40px"
                maxWidth="40px"
              >
                <Icon source={CashDollarIcon} tone="success" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Total generated revenue
                </Text>
                <Text as="p" variant="heading2xl">
                  {formatCurrency(stats.totalRevenue, storeCurrency)}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  From orders using bundle discounts
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="300">
              <Box
                background="bg-fill-magic-secondary"
                borderRadius="200"
                padding="200"
                minWidth="40px"
                maxWidth="40px"
              >
                <Icon source={ChartVerticalIcon} tone="magic" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Average order value
                </Text>
                <Text as="p" variant="heading2xl">
                  {formatCurrency(stats.averageOrderValue, storeCurrency)}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Per order with a bundle discount
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="300">
              <Box
                background="bg-fill-caution-secondary"
                borderRadius="200"
                padding="200"
                minWidth="40px"
                maxWidth="40px"
              >
                <Icon source={ChartHistogramFullIcon} tone="caution" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Total conversions
                </Text>
                <Text as="p" variant="heading2xl">
                  {stats.totalConversions}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Orders with a bundle discount applied
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Recent activity
              </Text>
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
            <Text as="p" tone="subdued">
              Number of times bundle discounts were applied
            </Text>

            {!hasAnalyticsAccess || !collectOrderData ? (
              <Box paddingBlockStart="400" paddingBlockEnd="400">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued" alignment="center">
                    {hasAnalyticsAccess
                      ? "Turn on order data collection above to start building this chart."
                      : "Upgrade to the Advanced plan to see bundle discount activity over time."}
                  </Text>
                </BlockStack>
              </Box>
            ) : visibleActivity.length === 0 ? (
              <Box paddingBlockStart="400" paddingBlockEnd="400">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued" alignment="center">
                    No bundle discount activity recorded yet for this period.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <Box paddingBlockStart="200">
                <InlineStack gap="200" blockAlign="end" wrap={false}>
                  {visibleActivity.map((point) => (
                    <BlockStack key={point.label} gap="100" inlineAlign="center">
                      <Box minWidth="24px">
                        <div
                          style={{
                            height: `${Math.max(6, (point.count / maxCount) * 120)}px`,
                            width: "100%",
                            borderRadius: "4px",
                            background: "var(--p-color-bg-fill-magic)",
                          }}
                          title={`${point.label}: ${point.count}`}
                        />
                      </Box>
                      <Text as="span" variant="bodyXs" tone="subdued">
                        {point.label}
                      </Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
