// app/routes/app.billing.tsx

import { json, redirect }                from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useActionData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { useState, useEffect }           from "react";
import {
  Page,
  Button,
  BlockStack,
  Text,
  Box,
  InlineStack,
  InlineGrid,
  Banner,
  Badge,
  List,
} from "@shopify/polaris";
import { authenticate }      from "../shopify.server";
import { PLANS, PLAN_KEYS }  from "../config/plans";
import {
  getShopPlanFromDB,
  updateShopPlan,
} from "../utils/planUtils";

// ─── Types ────────────────────────────────────────────────────
interface PlanUI {
  key:      string;
  color:    string;
  popular:  boolean;
  features: string[];
  label:    string;
  price:    number;
}

interface LoaderData {
  currentPlan: string | null;
}

interface ActionData {
  confirmationUrl?: string;
  error?: string;
}

interface UserError {
  field:   string;
  message: string;
}

interface AppSubscriptionCreateResponse {
  data?: {
    appSubscriptionCreate?: {
      confirmationUrl?: string;
      userErrors?:      UserError[];
      appSubscription?: {
        id: string;
      };
    };
  };
}

// ─── UI Plan definitions ───────────────────────────────────────
const PLANS_UI: PlanUI[] = [
  {
    key:      "pro",
    color:    "#f6f6f7",
    popular:  false,
    features: [
      "Real Store",
      "Up to 5 Bundles",
      "Smart discounts",
      "Priority support",
    ],
  },
  {
    key:      "advanced",
    color:    "#f3f0ff",
    popular:  true,
    features: [
      "Real Store",
      "Unlimited Bundles",
      "Smart discounts",
      "24/7 priority support",
      "Custom branding",
      "API access",
    ],
  },
].map((ui) => ({ ...ui, ...PLANS[ui.key as keyof typeof PLANS] }));

// ─── LOADER ───────────────────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const plan        = await getShopPlanFromDB(session.shop);
  const planKey = plan?.key ?? null;
  return json<LoaderData>({ currentPlan: planKey });
};

// ─── ACTION ───────────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop     = session.shop;
  const formData = await request.formData();
  const planKey  = formData.get("plan") as string;

  if (!PLAN_KEYS.includes(planKey)) {
    return json<ActionData>(
      { error: `Invalid plan: "${planKey}"` },
      { status: 400 }
    );
  }

  const selectedPlan = PLANS[planKey as keyof typeof PLANS];

  try {
    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCreate(
        $name:      String!,
        $lineItems: [AppSubscriptionLineItemInput!]!,
        $returnUrl: URL!,
        $trialDays: Int,
        $test:      Boolean
      ) {
        appSubscriptionCreate(
          name:      $name,
          returnUrl: $returnUrl,
          lineItems: $lineItems,
          trialDays: $trialDays,
          test:      $test
        ) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
          }
          confirmationUrl
        }
      }`,
      {
        variables: {
          name:      selectedPlan.name,
          returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing-return`,
          trialDays: selectedPlan.trialDays,
          test:      true, // ← set false in production
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount:       selectedPlan.price,
                    currencyCode: "USD",
                  },
                  interval: "EVERY_30_DAYS",
                },
              },
            },
          ],
        },
      }
    );

    const responseData: AppSubscriptionCreateResponse = await response.json();
    const { confirmationUrl, userErrors } =
      responseData.data?.appSubscriptionCreate ?? {};

    if (userErrors && userErrors.length > 0) {
      console.error("[app.billing] userErrors:", userErrors);
      return json<ActionData>(
        { error: userErrors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    if (!confirmationUrl) {
      return json<ActionData>(
        { error: "No confirmation URL returned from Shopify." },
        { status: 500 }
      );
    }

    // ✅ DO NOT update DB here — wait for billing-return confirmation
    return json<ActionData>({ confirmationUrl });

  } catch (err) {
    console.error("[app.billing] action error:", err);
    return json<ActionData>(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
};

// ─── COMPONENT ────────────────────────────────────────────────
export default function BillingPage() {
  const { currentPlan } = useLoaderData<typeof loader>();
  const actionData      = useActionData<typeof action>();
  const navigate        = useNavigate();
  const navigation      = useNavigation();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // Escape Shopify iframe → open billing confirmation page
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      open(actionData.confirmationUrl, "_top");
    }
  }, [actionData]);

  return (
    <Page
      title="Choose Your Plan"
      subtitle="Upgrade anytime to use your bundle app on a real store"
      backAction={{
        content: "Back",
        onAction: () => navigate("/app"),
      }}
    >
      <BlockStack gap="500">

        {/* Error Banner */}
        {actionData?.error && (
          <Banner title="Billing Error" tone="critical">
            <Text as="p">{actionData.error}</Text>
          </Banner>
        )}

        {/* Redirecting Banner */}
        {actionData?.confirmationUrl && (
          <Banner title="Redirecting to Shopify billing..." tone="info">
            <Text as="p">
              Please wait while we redirect you to confirm your subscription.
            </Text>
          </Banner>
        )}

        {/* Current Plan Banner */}
        <Banner
          title={
            currentPlan
              ? `You are currently on the ${currentPlan.toUpperCase()} plan`
              : "No active plan — choose a plan below to get started"
          }
          tone={currentPlan === "advanced" ? "success" : "info"}
        >
          <Text as="p">
            {currentPlan === "advanced"
              ? "Great news! All features are now unlocked on your live store."
              : currentPlan === "pro"
              ? "Upgrade to Advanced to unlock unlimited bundles and more."
              : "A plan is required to access app features on your live store."}
          </Text>
        </Banner>

        {/* Pricing Cards */}
        <InlineGrid columns={{ xs: 1, sm: 1, md: 2 }} gap="400">
          {PLANS_UI.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                style={{
                  borderRadius:  "12px",
                  border:        isCurrent
                    ? "2px solid #008060"
                    : plan.popular
                    ? "2px solid #005bd3"
                    : "1px solid #e1e3e5",
                  background:    "#ffffff",
                  boxShadow:     plan.popular
                    ? "0 4px 20px rgba(0,91,211,0.12)"
                    : "0 1px 4px rgba(0,0,0,0.06)",
                  display:       "flex",
                  flexDirection: "column",
                  overflow:      "hidden",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    background:   plan.color,
                    padding:      "20px 24px 16px",
                    borderBottom: "1px solid #e1e3e5",
                  }}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingLg" fontWeight="bold" as="h2">
                      {plan.label}
                    </Text>
                    <InlineStack gap="200">
                      {plan.popular && (
                        <Badge tone="info">Most Popular</Badge>
                      )}
                      {isCurrent && (
                        <Badge tone="success">Current</Badge>
                      )}
                    </InlineStack>
                  </InlineStack>

                  <Box paddingBlockStart="200">
                    <Text variant="heading2xl" fontWeight="bold" as="p">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </Text>
                    {plan.price > 0 && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        per month
                      </Text>
                    )}
                  </Box>
                </div>

                {/* Features */}
                <div style={{ padding: "20px 24px", flexGrow: 1 }}>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      What's included:
                    </Text>
                    <List type="bullet">
                      {plan.features.map((f, i) => (
                        <List.Item key={i}>{f}</List.Item>
                      ))}
                    </List>
                  </BlockStack>
                </div>

                {/* CTA */}
                <div
                  style={{
                    padding:   "16px 24px",
                    borderTop: "1px solid #e1e3e5",
                  }}
                >
                  {isCurrent ? (
                    <Button fullWidth disabled>
                      ✓ Current Plan
                    </Button>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="plan" value={plan.key} />
                      <Button
                        fullWidth
                        variant={plan.price > 0 ? "primary" : "secondary"}
                        submit
                        loading={
                          (isSubmitting && submittingPlan === plan.key) ||
                          !!actionData?.confirmationUrl
                        }
                      onClick={() => setSubmittingPlan(plan.key)}
                       
                      >
                        {plan.price === 0
                          ? "Use Free Plan"
                          : `Upgrade to ${plan.label}`}
                      </Button>
                    </Form>
                  )}
                </div>

              </div>
            );
          })}
        </InlineGrid>

        {/* Footer */}
        <Box paddingBlockEnd="400">
          <Text alignment="center" tone="subdued" variant="bodySm" as="p">
            Cancel anytime from your Shopify admin. Billed in USD.
          </Text>
        </Box>

      </BlockStack>
    </Page>
  );
}
