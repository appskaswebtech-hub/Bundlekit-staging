import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Divider,
  Badge,
  Box,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ─────────────────────────────────────────
// GRAPHQL — Delete Shopify Product
// ─────────────────────────────────────────
const DELETE_PRODUCT_MUTATION = `
  mutation deleteProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

// ─────────────────────────────────────────
// LOADER — Load bundle info for confirmation screen
// ─────────────────────────────────────────
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  const bundle = await db.bundle.findFirst({
    where: { id, shop },
    include: {
      _count: { select: { orders: true, items: true } },
    },
  });

  if (!bundle) throw new Response("Not Found", { status: 404 });

  return json({ bundle });
};

// ─────────────────────────────────────────
// ACTION — Delete bundle from DB + Shopify
// ─────────────────────────────────────────
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "delete") {
    return redirect(`/app/bundles/${id}`);
  }

  const bundle = await db.bundle.findFirst({ where: { id, shop } });
  if (!bundle) throw new Response("Not Found", { status: 404 });

  // ── Delete Shopify product if it exists ──
  if (bundle.shopifyProductId) {
    try {
      await admin.graphql(DELETE_PRODUCT_MUTATION, {
        variables: { input: { id: bundle.shopifyProductId } },
      });
    } catch (err) {
      // Log but don't block — still delete from DB
      console.error("Failed to delete Shopify product:", err);
    }
  }

  // ── Delete from DB (cascade deletes items + orders) ──
  await db.bundle.delete({ where: { id, shop } });

  return redirect("/app/bundles?deleted=true");
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function BundleDestroy() {
  const { bundle } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const deleting = navigation.state === "submitting";

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("intent", "delete");
    submit(formData, { method: "POST" });
  };

  const statusTone: Record<string, "success" | "attention" | "critical"> = {
    ACTIVE: "success",
    DRAFT: "attention",
    ARCHIVED: "critical",
  };

  return (
    <Page
      backAction={{ content: "Back to bundle", url: `/app/bundles/${bundle.id}` }}
      title="Delete bundle"
    >
      <TitleBar title="Delete Bundle" />

      <BlockStack gap="500">
        {/* Warning Banner */}
        <Banner
          title="This action cannot be undone"
          tone="critical"
        >
          <Text as="p">
            Deleting this bundle will permanently remove it from your database
            and delete the associated Shopify product from your store.
          </Text>
        </Banner>

        {/* Bundle Info Card */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              You are about to delete:
            </Text>
            <Divider />

            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="200">
                <Text as="p" variant="headingLg" fontWeight="bold">
                  {bundle.title}
                </Text>
                {bundle.description && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {bundle.description}
                  </Text>
                )}
              </BlockStack>
              <Badge tone={statusTone[bundle.status]}>{bundle.status}</Badge>
            </InlineStack>

            <Divider />

            {/* Stats */}
            <InlineStack gap="600">
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Products</Text>
                <Text as="p" variant="headingMd" fontWeight="bold">
                  {bundle._count.items}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Orders</Text>
                <Text as="p" variant="headingMd" fontWeight="bold">
                  {bundle._count.orders}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Bundle price</Text>
                <Text as="p" variant="headingMd" fontWeight="bold">
                  {bundle.totalPrice ? `$${bundle.totalPrice.toFixed(2)}` : "—"}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Shopify Product</Text>
                <Text as="p" variant="headingMd" fontWeight="bold">
                  {bundle.shopifyProductId ? "Linked" : "None"}
                </Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* What will be deleted */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">What will be deleted:</Text>
            <Divider />
            <List type="bullet">
              <List.Item>
                <Text as="span" variant="bodyMd">
                  The bundle record and all its configuration
                </Text>
              </List.Item>
              <List.Item>
                <Text as="span" variant="bodyMd">
                  All {bundle._count.items} product item(s) linked to this bundle
                </Text>
              </List.Item>
              <List.Item>
                <Text as="span" variant="bodyMd">
                  Order history ({bundle._count.orders} order record
                  {bundle._count.orders !== 1 ? "s" : ""})
                </Text>
              </List.Item>
              {bundle.shopifyProductId && (
                <List.Item>
                  <Text as="span" variant="bodyMd" tone="critical">
                    The Shopify product will also be permanently deleted from your store
                  </Text>
                </List.Item>
              )}
            </List>
          </BlockStack>
        </Card>

        {/* Active bundle warning */}
        {bundle.status === "ACTIVE" && (
          <Banner tone="warning" title="This bundle is currently active">
            <Text as="p">
              Customers may still have this bundle in their cart. Deleting it
              now will remove it from your storefront immediately.
            </Text>
          </Banner>
        )}

        {/* Actions */}
        <Box paddingBlockEnd="600">
          <InlineStack gap="300">
            <Button
              tone="critical"
              variant="primary"
              loading={deleting}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Yes, delete bundle permanently"}
            </Button>
            <Button
              url={`/app/bundles/${bundle.id}`}
              disabled={deleting}
            >
              Cancel, keep bundle
            </Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
