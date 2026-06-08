import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Text,
  Card,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Banner,
  Button,
  InlineGrid,
  Icon,
} from "@shopify/polaris";
import {
  PackageIcon,
  ChartVerticalIcon,
  PlusIcon,
  ClockIcon,
  ChevronRightIcon,
  PauseCircleIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Proceed with loading the normal data for the dashboard
  const totalBundles = await db.bundle.count({ where: { shop } });
  const activeBundles = await db.bundle.count({ where: { shop, status: "ACTIVE" } });
  const pausedBundles = await db.bundle.count({ where: { shop, status: "PAUSED" } });

  const recentBundles = await db.bundle.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { quantityBreaks: true },
  });

  return json({ totalBundles, activeBundles, pausedBundles, recentBundles });
};




export default function Index() {
const data = useLoaderData<typeof loader>();
const { totalBundles, activeBundles, pausedBundles, recentBundles } = data;
  const navigate = useNavigate();
  return (
    <Page>
      <BlockStack gap="600">
        <BlockStack gap="100">
          <Text as="h1" variant="headingLg">
            Dashboard
          </Text>
          <Text as="p" tone="subdued">
            Overview of your bundle performance and management
          </Text>
        </BlockStack>

        {/* Welcome Banner */}
        {totalBundles === 0 && (
          <Banner
            title="Get started with Bundler"
            tone="info"
            action={{ content: "Create bundle", onAction: () => navigate("/app/bundles/new") }}
          >
            <p>
              Create your first quantity breaks bundle to offer bulk discounts
              and increase your average order value.
            </p>
          </Banner>
        )}

        {/* Stats Cards */}
        <InlineGrid columns={3} gap="400">
          <Card>
            <BlockStack gap="300">
              <Box
                background="bg-fill-magic-secondary"
                borderRadius="200"
                padding="200"
                minWidth="40px"
                maxWidth="40px"
              >
                <Icon source={PackageIcon} tone="magic" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Total Bundles
                </Text>
                <Text as="p" variant="heading2xl">
                  {totalBundles}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  All time
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="300">
              <Box
                background="bg-fill-success-secondary"
                borderRadius="200"
                padding="200"
                minWidth="40px"
                maxWidth="40px"
              >
                <Icon source={ChartVerticalIcon} tone="success" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Active Bundles
                </Text>
                <Text as="p" variant="heading2xl">
                  {activeBundles}
                </Text>
                <InlineStack gap="100" blockAlign="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Currently active
                  </Text>
                  <Badge tone="success" size="small">
                    {totalBundles
                      ? `↗ ${Math.round((activeBundles / totalBundles) * 100)}%`
                      : "↗ 0%"}
                  </Badge>
                </InlineStack>
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
                <Icon source={PauseCircleIcon} tone="caution" />
              </Box>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Paused Bundles
                </Text>
                <Text as="p" variant="heading2xl">
                  {pausedBundles}
                </Text>
                <InlineStack gap="100" blockAlign="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Currently paused
                  </Text>
                  <Badge tone={pausedBundles ? "warning" : undefined} size="small">
                    {totalBundles
                      ? `↘ ${Math.round((pausedBundles / totalBundles) * 100)}%`
                      : "− 0%"}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Recent Bundles */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={ClockIcon} tone="subdued" />
                <Text as="h2" variant="headingMd">
                  Recent Bundles
                </Text>
              </InlineStack>
              <Button
                icon={PlusIcon}
                variant="primary"
                onClick={() => navigate("/app/bundles/new")}
              >
                Create bundle
              </Button>
            </InlineStack>

            {recentBundles.length === 0 ? (
              <Box paddingBlockStart="400" paddingBlockEnd="400">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued" alignment="center">
                    No bundles yet. Create your first bundle to get started.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <BlockStack gap="300">
                {recentBundles.map((bundle: any) => (
                  <Box
                    key={bundle.id}
                    padding="300"
                    borderWidth="025"
                    borderColor="border"
                    borderRadius="200"
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Box
                          background="bg-fill-secondary"
                          borderRadius="200"
                          padding="200"
                        >
                          <Icon source={ListBulletedIcon} tone="subdued" />
                        </Box>
                        <BlockStack gap="100">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {bundle.name}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {bundle.quantityBreaks.length} quantity break
                            {bundle.quantityBreaks.length !== 1 ? "s" : ""}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <InlineStack gap="300" blockAlign="center">
                        <Badge
                          tone={
                            bundle.status === "ACTIVE"
                              ? "success"
                              : bundle.status === "PAUSED"
                              ? "warning"
                              : "info"
                          }
                        >
                          {bundle.status}
                        </Badge>
                        <InlineStack gap="0" blockAlign="center" wrap={false}>
                          <Button
                            variant="plain"
                            onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                          >
                            Edit
                          </Button>
                          <Icon source={ChevronRightIcon} tone="subdued" />
                        </InlineStack>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
