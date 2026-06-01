/**
 * PHASE 3 UPDATE: app/routes/app.bundles.$id.tsx
 *
 * Add this import at the top of your existing file:
 */
// import { syncBundleConfigToDiscount } from "../utils/syncDiscount.server";

/**
 * Then update the ACTION function.
 * Replace your existing action with this one.
 * The only changes are:
 *   1. We get `admin` from authenticate.admin()
 *   2. We call syncBundleConfigToDiscount() after save and delete
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Divider,
  Banner,
  Button,
  TextField,
  Select,
  Checkbox,
  RadioButton,
  InlineGrid,
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon,ProductIcon,DeliveryIcon,OrderFulfilledIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { WidgetPreviewVolume } from "../components/WidgetPreviewVolume";
import { syncBundleConfigToDiscount } from "../utils/syncDiscount.server";




// ---------------------

import { useAppBridge } from "@shopify/app-bridge-react";
// ---------------------
// ──────────────────────────────────────────────
// LOADER (unchanged)
// ──────────────────────────────────────────────
// export const loader = async ({ params, request }: LoaderFunctionArgs) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;

//   const bundle = await db.bundle.findFirst({
//     where: { id: params.id, shop },
//     include: {
//       quantityBreaks: { orderBy: { sortOrder: "asc" } },
//       discountCombination: true,
//       widgetSettings: true,
//     },
//   });

//   if (!bundle) throw new Response("Bundle not found", { status: 404 });

//   return json({ bundle, shop });
// };

// ----------------------
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const bundle = await db.bundle.findFirst({
    where: { id: params.id, shop },
    include: {
      quantityBreaks: { orderBy: { sortOrder: "asc" } },
      discountCombination: true,
      widgetSettings: true,
    },
  });

  if (!bundle) throw new Response("Bundle not found", { status: 404 });

  // ── Agar specific products hain toh Shopify se fetch karo ──
  let selectedProductsData: any[] = [];

  if (
    bundle.productSelectionType === "SPECIFIC_PRODUCTS" &&
    bundle.selectedProductIds
  ) {
    const ids = JSON.parse(bundle.selectedProductIds);

    if (ids.length > 0) {
      // GID format mein convert karo
      const gids = ids.map((id: string) => `gid://shopify/Product/${id}`);

      // Shopify GraphQL se product data fetch karo
      const response = await admin.graphql(`
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              featuredImage {
                url
              }
            }
          }
        }
      `, {
        variables: { ids: gids },
      });

      const responseJson = await response.json();
      const nodes = responseJson.data?.nodes || [];

      // Clean format mein convert karo
      selectedProductsData = nodes
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id.split("/").pop(), // numeric ID
          title: p.title,
          image: p.featuredImage?.url || null,
        }));
    }
  }

  return json({ bundle, shop, selectedProductsData }); // ← yeh add karo
};
// ----------------------

// ──────────────────────────────────────────────
// ACTION — NOW SYNCS TO SHOPIFY FUNCTION
// ──────────────────────────────────────────────
export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // DELETE BUNDLE
  if (intent === "delete") {
    await db.bundle.delete({ where: { id: params.id } });
    // Sync config to discount function after delete
    try {
      await syncBundleConfigToDiscount(admin, shop);
    } catch (err) {
      console.error("[Bundler] Sync failed (function may not be deployed yet):", err);
    }
    return redirect("/app/bundles");
  }

  // SAVE BUNDLE
  if (intent === "save") {
    const data = JSON.parse(formData.get("data") as string);
    // Update bundle
    await db.bundle.update({
      where: { id: params.id },
      data: {
        name: data.name,
        title: data.title,
        status: data.status,
        showWidget: data.showWidget,
        prioritySequence: parseInt(data.prioritySequence) || 100,
        productSelectionType: data.productSelectionType,
        selectedProductIds: data.selectedProductIds || null,
        applyOnSubscriptions: data.applyOnSubscriptions,
        numberOfRenewals: data.numberOfRenewals,
      },
    });

    // Replace quantity breaks
    await db.quantityBreak.deleteMany({ where: { bundleId: params.id } });
    if (data.quantityBreaks?.length) {
      await db.quantityBreak.createMany({
        data: data.quantityBreaks.map((qb: any, idx: number) => ({
          shop,
          bundleId: params.id!,
          type: qb.type,
          quantity: parseInt(qb.quantity),
          maxQuantity: qb.maxQuantity ? parseInt(qb.maxQuantity) : null,
          discountType: qb.discountType,
          discountValue: parseFloat(qb.discountValue) || 0,
          savingsText: qb.savingsText || "",
          description: qb.description || "",
          freeShipping: qb.freeShipping || false,
          sortOrder: idx,
        })),
      });
    }

    // Upsert discount combination
    await db.discountCombination.upsert({
      where: { bundleId: params.id! },
      create: {
        shop,
        bundleId: params.id!,
        productDiscounts: data.discountCombination?.productDiscounts ?? true,
        orderDiscounts: data.discountCombination?.orderDiscounts ?? true,
        shippingDiscounts: data.discountCombination?.shippingDiscounts ?? true,
      },
      update: {
        productDiscounts: data.discountCombination?.productDiscounts ?? true,
        orderDiscounts: data.discountCombination?.orderDiscounts ?? true,
        shippingDiscounts: data.discountCombination?.shippingDiscounts ?? true,
      },
    });

    // Sync config to discount function after save
    try {
      await syncBundleConfigToDiscount(admin, shop);
    } catch (err) {
      console.error("[Bundler] Sync failed (function may not be deployed yet):", err);
    }

    return json({ success: true });
  }

  // ADD QUANTITY BREAK
  if (intent === "addBreak") {
    const count = await db.quantityBreak.count({ where: { bundleId: params.id } });
    await db.quantityBreak.create({
      data: {
        shop,
        bundleId: params.id!,
        type: "FIXED_QUANTITY",
        quantity: count + 1,
        discountType: "PERCENTAGE",
        discountValue: (count + 1) * 5,
        savingsText: "Save {{discount_value}}{{discount_unit}}",
        description: "Buy {{quantity}} and get a discount!",
        sortOrder: count,
      },
    });
    return json({ success: true });
  }

  // REMOVE QUANTITY BREAK
  if (intent === "removeBreak") {
    const breakId = formData.get("breakId") as string;
    await db.quantityBreak.delete({ where: { id: breakId } });
    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};



// ──────────────────────────────────────────────
// DEFAULT QUANTITY BREAK
// ──────────────────────────────────────────────
const defaultBreak = () => ({
  id: crypto.randomUUID(),
  type: "FIXED_QUANTITY",
  quantity: 1,
  maxQuantity: null as number | null,
  discountType: "PERCENTAGE",
  discountValue: 0,
  savingsText: "Save {{discount_value}}{{discount_unit}}",
  description: "Buy {{quantity}} and get a discount!",
  freeShipping: false,
});

// ──────────────────────────────────────────────
// COMPONENT (unchanged from Phase 1)
// ──────────────────────────────────────────────
export default function BundleEdit() {
  const { bundle, selectedProductsData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  
// ------------------------------------
const shopify = useAppBridge();

const [pickerOpen, setPickerOpen] = useState(false);
// Sirf IDs store karta hai (DB ke liye)
const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
  bundle.selectedProductIds ? JSON.parse(bundle.selectedProductIds) : []
);

// Full product objects store karta hai (UI display ke liye)
const [selectedProducts, setSelectedProducts] = useState<any[]>(
  selectedProductsData  // ← Shopify API se aaya hua data
);

// ---------------------------
const openProductPicker = async () => {
  try {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      // ✅ Pehle se selected products picker mein checked dikhenge
      selectionIds: selectedProductIds.map((id: string) => ({ 
        id: `gid://shopify/Product/${id}` // GID format mein bhejo
      })),
    });

    if (selected && selected.length > 0) {
      // Numeric IDs save karo DB ke liye
      const ids = selected.map((p: any) => p.id.split("/").pop());
      setSelectedProductIds(ids);

      // Full product objects save karo UI ke liye
      const products = selected.map((p: any) => ({
        id: p.id.split("/").pop(),
        title: p.title,
        image: p.images?.[0]?.originalSrc || null,
      }));
      setSelectedProducts(products);
    }
  } catch (err) {
    console.error("Picker error:", err);
  }
};

const removeProduct = (id: string) => {
  setSelectedProductIds((prev) => prev.filter((pid) => pid !== id));
  setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
};
// ---------------------------
// ------------------------------------
  // ─── Form State ───
  const [name, setName] = useState(bundle.name);
  const [title, setTitle] = useState(bundle.title);
  const [description, setDescription] = useState(bundle.description);
  const [status, setStatus] = useState(bundle.status);
  const [showWidget, setShowWidget] = useState(bundle.showWidget);
  const [prioritySequence, setPrioritySequence] = useState(String(bundle.prioritySequence));
  const [productSelectionType, setProductSelectionType] = useState(bundle.productSelectionType);
  const [applyOnSubscriptions, setApplyOnSubscriptions] = useState(bundle.applyOnSubscriptions);
  const [numberOfRenewals, setNumberOfRenewals] = useState(bundle.numberOfRenewals);

  const [quantityBreaks, setQuantityBreaks] = useState(
    bundle.quantityBreaks.map((qb: any) => ({
      id: qb.id,
      type: qb.type,
      quantity: qb.quantity,
      maxQuantity: qb.maxQuantity,
      discountType: qb.discountType,
      discountValue: qb.discountValue,
      savingsText: qb.savingsText,
      description: qb.description,
      freeShipping: qb.freeShipping,
    }))
  );

  const [productDiscounts, setProductDiscounts] = useState(
    bundle.discountCombination?.productDiscounts ?? true
  );
  const [orderDiscounts, setOrderDiscounts] = useState(
    bundle.discountCombination?.orderDiscounts ?? true
  );
  const [shippingDiscounts, setShippingDiscounts] = useState(
    bundle.discountCombination?.shippingDiscounts ?? true
  );

  const updateBreak = useCallback(
    (index: number, field: string, value: any) => {
      setQuantityBreaks((prev: any[]) =>
        prev.map((qb: any, i: number) => (i === index ? { ...qb, [field]: value } : qb))
      );
    },
    []
  );

  const addBreak = useCallback(() => {
    setQuantityBreaks((prev: any[]) => {
      const nextQty = prev.length > 0 ? Math.max(...prev.map((b: any) => b.quantity)) + 1 : 1;
      const nextDiscount = prev.length > 0 ? prev.length * 5 : 0;
      return [
        ...prev,
        { ...defaultBreak(), quantity: nextQty, discountValue: nextDiscount },
      ];
    });
  }, []);

  const removeBreak = useCallback((index: number) => {
    setQuantityBreaks((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  }, []);

  const handleSave = () => {
  
    const formData = new FormData();
    formData.set("intent", "save");
    formData.set(
      "data",
      JSON.stringify({
        name,
        title,
        status,
        showWidget,
        prioritySequence,
        productSelectionType,
        selectedProductIds: JSON.stringify(selectedProductIds),
        applyOnSubscriptions,
        numberOfRenewals,
        quantityBreaks,
        discountCombination: { productDiscounts, orderDiscounts, shippingDiscounts },
      })
    );
    submit(formData, { method: "post" });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;
    const formData = new FormData();
    formData.set("intent", "delete");
    submit(formData, { method: "post" });
  };

  const discountTypeOptions = [
    { label: "Percentage discount (%)", value: "PERCENTAGE" },
    { label: "Fixed amount ($)", value: "FIXED_AMOUNT" },
    { label: "Fixed price per item ($)", value: "FIXED_PRICE" },
  ];

  const breakTypeOptions = [
    { label: "Fixed quantity", value: "FIXED_QUANTITY" },
    { label: "Quantity range", value: "QUANTITY_RANGE" },
  ];

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Paused", value: "PAUSED" },
    { label: "Draft", value: "DRAFT" },
  ];

  const showWidgetOptions = [
    { label: "Show", value: "true" },
    { label: "Hide", value: "false" },
  ];

  const renewalOptions = [
    { label: "Unlimited", value: "Unlimited" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "5", value: "5" },
    { label: "10", value: "10" },
  ];

  return (
    <Page
      title="Bundle"
      backAction={{ content: "Bundles", onAction: () => navigate("/app/bundles") }}
      primaryAction={{
        content: "Save bundle",
        loading: isSaving,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Delete",
          destructive: true,
          onAction: handleDelete,
        },
      ]}
    >
     
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="info" onDismiss={() => {}}>
              <p>               
          Use volume discount if you can't use the standalone bundle, for example, to combine the discount with subscriptions.Volume discount widget will be displayed below the add to cart buttons on product pages.
           The discount will be automatically applied at checkout.
              </p>
            </Banner>

            {/* General Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  General information
                </Text>
                <TextField
                  label="Bundle name"
                  value={name}
                  onChange={setName}
                  helpText="Bundle name will be displayed in checkout."
                  autoComplete="off"
                  readOnly
                />
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  helpText="Title will be displayed in bundle widgets."
                  autoComplete="off"
                />
                <TextField
                  label="Description"
                  value="The more you buy, the more you save!"
                  onChange={setDescription}
                  helpText="Description will be displayed in bundle widgets under bundle title."
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Bundle Settings */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Bundle settings
                </Text>
                <TextField
                  label="Priority sequence"
                  type="number"
                  value={prioritySequence}
                  onChange={setPrioritySequence}
                  helpText="Bundler applies discount based on priority."
                  autoComplete="off"
                />
                <Divider />
                <InlineGrid columns={2} gap="400">
                  <Select
                    label="Bundle status"
                    options={statusOptions}
                    value={status}
                    onChange={setStatus}
                    helpText="Set the status to paused if you want to stop applying discounts and hide this bundle in your shop."
                  />
                  <Select
                    label="Show bundle widget for this bundle"
                    options={showWidgetOptions}
                    value={String(showWidget)}
                    onChange={(val) => setShowWidget(val === "true")}
                    helpText="Hide bundle widget on product pages. This setting won't prevent discounts from being applied."
                  />
                </InlineGrid>
                <Divider />
                <Checkbox
                  label="Apply on subscriptions and pre-orders"
                  checked={applyOnSubscriptions}
                  onChange={setApplyOnSubscriptions}
                  helpText="Turn this on if you want this bundle to work with subscriptions and pre-orders."
                />
                {applyOnSubscriptions && (
                  <Select
                    label="Number of renewals"
                    options={renewalOptions}
                    value={numberOfRenewals}
                    onChange={setNumberOfRenewals}
                    helpText="Set the number of subscription renewals your bundle discount should apply to."
                  />
                )}
              </BlockStack>
            </Card>

            {/* Discount Combinations */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Discount combinations
                </Text>
                <Checkbox
                  label={
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span">Product Discounts</Text>
                      <ProductIcon width="20" height="20" />
                    </InlineStack>
                  }
                  checked={productDiscounts}
                  onChange={setProductDiscounts}
                />
                <Checkbox
                  label={
                   <InlineStack gap="200" blockAlign="center">
                     <Text as="span">Order Discounts</Text>
                     <OrderFulfilledIcon width="20" height="20" />
                   </InlineStack>
                 }
                  checked={orderDiscounts}
                  onChange={setOrderDiscounts}
                  />
                <Checkbox
                  label={
                   <InlineStack gap="200" blockAlign="center">
                     <Text as="span">Shipping Discounts</Text>
                     <DeliveryIcon width="20" height="20" />
                   </InlineStack>
                 }
                  checked={shippingDiscounts}
                  onChange={setShippingDiscounts}
                />
              </BlockStack>
            </Card>

            {/* Quantity Breaks */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Volume discounts
                  </Text>
                  <Button icon={PlusIcon} onClick={addBreak}>
                    Add Volume discounts
                  </Button>
                </InlineStack>

                {quantityBreaks.map((qb: any, idx: number) => (
                  <Box key={qb.id || idx}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingSm">
                          VOLUME DISCOUNT #{idx + 1}
                        </Text>
                        {idx > 0 && (
                          <Button
                            variant="plain"
                            tone="critical"
                            icon={DeleteIcon}
                            onClick={() => removeBreak(idx)}
                          >
                            Remove
                          </Button>
                        )}
                      </InlineStack>

                      <InlineGrid columns={2} gap="400">
                        <Select
                          label="Type"
                          options={breakTypeOptions}
                          value={qb.type}
                          onChange={(val) => updateBreak(idx, "type", val)}
                          helpText={
                            idx === 0
                              ? "Select the type of volume discount you prefer."
                              : "Select the type of volume discount you prefer."
                          }
                        />
                        <TextField
                          label="Quantity"
                          type="number"
                          value={String(qb.quantity)}
                          onChange={(val) => updateBreak(idx, "quantity", parseInt(val) || 0)}
                          
                          autoComplete="off"
                          // disabled={idx === 0}
                        />
                      </InlineGrid>

                      {qb.type === "QUANTITY_RANGE" && (
                        <TextField
                          label="Max quantity"
                          type="number"
                          value={String(qb.maxQuantity || "")}
                          onChange={(val) =>
                            updateBreak(idx, "maxQuantity", val ? parseInt(val) : null)
                          }
                          autoComplete="off"
                        />
                      )}

                      <InlineGrid columns={2} gap="400">
                        <Select
                          label="Discount"
                          options={discountTypeOptions}
                          value={qb.discountType}
                          onChange={(val) => updateBreak(idx, "discountType", val)}
                        />
                        <TextField
                          label="Adjustment value"
                          type="number"
                          value={String(qb.discountValue)}
                          onChange={(val) =>
                            updateBreak(idx, "discountValue", parseFloat(val) || 0)
                          }
                          suffix={qb.discountType === "PERCENTAGE" ? "%" : "$"}
                          autoComplete="off"
                          // disabled={idx === 0}
                        />
                      </InlineGrid>

                      <InlineGrid columns={2} gap="400">
                        <TextField
                          label="Savings text"
                          value={qb.savingsText}
                          onChange={(val) => updateBreak(idx, "savingsText", val)}
                          helpText="The {{discount_value}} and {{discount_unit}} placeholders will be automatically replaced with the correct value."
                          autoComplete="off"
                        />
                        <TextField
                          label="Description"
                          value={qb.description}
                          onChange={(val) => updateBreak(idx, "description", val)}
                          helpText="The {{quantity}}, {{max_quantity}} and {{min_value}} placeholders will be automatically replaced with the correct value."
                          autoComplete="off"
                        />
                      </InlineGrid>

                      {idx < quantityBreaks.length - 1 && <Divider />}
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>

            {/* Product Selection */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Product selection type
                </Text>
                <RadioButton
                  label="Apply only to specific products (select them below)"
                  id="specific"
                  checked={productSelectionType === "SPECIFIC_PRODUCTS"}
                  onChange={() => setProductSelectionType("SPECIFIC_PRODUCTS")}
                />
                <RadioButton
                  label="Apply this discount to all products in the shop"
                  id="all"
                  checked={productSelectionType === "ALL_PRODUCTS"}
                  onChange={() => setProductSelectionType("ALL_PRODUCTS")}
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  Select if you want to apply to all products or only specific products in your shop.
                </Text>

                {/* {productSelectionType === "SPECIFIC_PRODUCTS" && (
                  <Banner tone="info">
                    <p>
                      Product picker integration will be available with Shopify resource picker.
                      For now, bundles apply to all products.
                    </p>
                  </Banner>
                )} */}

                {/* ------------------------ */}
           {productSelectionType === "SPECIFIC_PRODUCTS" && (
  <BlockStack gap="300">
    <Button onClick={openProductPicker}>
      Select products
    </Button>

    {/* Selected products list */}
    {selectedProductIds.length > 0 && (
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {selectedProductIds.length} product(s) selected:
        </Text>
        {selectedProducts.map((product: any) => (
          <InlineStack key={product.id} align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              {/* Product image */}
              {product.image && (
                <img
                  src={product.image}
                  alt={product.title}
                  style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
                />
              )}
              <Text as="p" variant="bodySm">{product.title}</Text>
            </InlineStack>
            {/* Remove button */}
            <Button
              variant="plain"
              tone="critical"
              icon={DeleteIcon}
              onClick={() => removeProduct(product.id)}
            />
          </InlineStack>
        ))}
      </BlockStack>
    )}
  </BlockStack>
)}
                {/* ------------------------ */}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Widget Preview */}
        <Layout.Section variant="oneThird">
          <Box position="sticky" insetBlockStart="500">
            <Card>
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Widget preview
                </Text>
                <WidgetPreviewVolume
                  title={title}
                  breaks={quantityBreaks.map((qb: any) => ({
                    quantity: qb.quantity,
                    discountType: qb.discountType,
                    discountValue: qb.discountValue,
                    description: qb.description,
                    savingsText: qb.savingsText,
                  }))}
                />
              </BlockStack>
            </Card>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
