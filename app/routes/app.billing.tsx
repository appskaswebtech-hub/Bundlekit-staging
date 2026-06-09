import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useActionData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { useState, useEffect } from "react";
import { Page, BlockStack, Text, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { PLANS, PLAN_KEYS } from "../config/plans";
import { getShopPlanFromDB } from "../utils/planUtils";

interface PlanUI {
  key: string;
  color: string;
  popular: boolean;
  features: string[];
  label: string;
  price: number;
  trialDays: number;
}

interface LoaderData {
  currentPlan: string | null;
}

interface ActionData {
  confirmationUrl?: string;
  error?: string;
}

interface UserError {
  field: string;
  message: string;
}

interface AppSubscriptionCreateResponse {
  data?: {
    appSubscriptionCreate?: {
      confirmationUrl?: string;
      userErrors?: UserError[];
      appSubscription?: { id: string };
    };
  };
}

const PLANS_UI: PlanUI[] = [
  {
    key: "pro",
    color: "#f6f6f7",
    popular: false,
    features: [
      "Real Store",
      "Upto five bundles",
      "Smart discounts",
    ],
  },
  {
    key: "advanced",
    color: "#f3f0ff",
    popular: true,
    features: [
      "Real Store",
      "Unlimited Bundles",
      "Smart discounts",
      "Analytics",
    ],
  },
].map((ui) => ({ ...PLANS[ui.key as keyof typeof PLANS], ...ui }));

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const plan = await getShopPlanFromDB(session.shop);
  return json<LoaderData>({ currentPlan: plan?.key ?? null });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const planKey = formData.get("plan") as string;

  if (!PLAN_KEYS.includes(planKey)) {
    return json<ActionData>({ error: `Invalid plan: "${planKey}"` }, { status: 400 });
  }

  const selectedPlan = PLANS[planKey as keyof typeof PLANS];

  try {
    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCreate(
        $name: String!,
        $lineItems: [AppSubscriptionLineItemInput!]!,
        $returnUrl: URL!,
        $trialDays: Int,
        $test: Boolean
      ) {
        appSubscriptionCreate(
          name: $name,
          returnUrl: $returnUrl,
          lineItems: $lineItems,
          trialDays: $trialDays,
          test: $test
        ) {
          userErrors { field message }
          appSubscription { id }
          confirmationUrl
        }
      }`,
      {
        variables: {
          name: selectedPlan.name,
          returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing-return`,
          trialDays: selectedPlan.trialDays,
          test: true,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: selectedPlan.price, currencyCode: "USD" },
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
    return json<ActionData>({ confirmationUrl });
  } catch (err) {
    console.error("[app.billing] action error:", err);
    return json<ActionData>(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
};

export default function BillingPage() {
  const { currentPlan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.confirmationUrl) {
      open(actionData.confirmationUrl, "_top");
    }
  }, [actionData]);

  return (
    <Page
      backAction={{ content: "Back", onAction: () => navigate("/app") }}
    >
      <BlockStack gap="600">

        {/* Hero header */}
        <div style={{ textAlign: "center", paddingBlock: "16px 8px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 20, padding: "4px 14px", marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>
              ✦ Simple, transparent pricing
            </span>
          </div>
          <h1 style={{
            margin: "0 0 10px", fontSize: 32, fontWeight: 800,
            color: "#111827", letterSpacing: "-0.5px", lineHeight: 1.2,
          }}>
            Choose Your Plan
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "#6b7280", maxWidth: 420, marginInline: "auto" }}>
            Start with Pro or unlock everything with Advanced. Cancel anytime.
          </p>
        </div>

        {/* Error / redirect messages */}
        {actionData?.error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <Text as="p" variant="bodyMd" tone="critical">{actionData.error}</Text>
          </div>
        )}
        {actionData?.confirmationUrl && (
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>↗</span>
            <Text as="p" variant="bodyMd">Redirecting to Shopify billing… please wait.</Text>
          </div>
        )}

        {/* Current plan indicator */}
        {currentPlan && (
          <div style={{
            background: currentPlan === "advanced"
              ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
              : "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: `1px solid ${currentPlan === "advanced" ? "#86efac" : "#93c5fd"}`,
            borderRadius: 10, padding: "12px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 16 }}>
                {currentPlan === "advanced" ? "🎉" : "✅"}
              </span>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                {currentPlan === "advanced"
                  ? "You're on the Advanced plan — all features unlocked!"
                  : "You're on the Pro plan — upgrade to Advanced for unlimited bundles & analytics."}
              </Text>
            </InlineStack>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
              background: currentPlan === "advanced" ? "#16a34a" : "#2563eb",
              color: "#fff", borderRadius: 6, padding: "3px 10px",
            }}>
              {currentPlan.toUpperCase()}
            </span>
          </div>
        )}

        {/* Pricing cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}>
          {PLANS_UI.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isLoading =
              (isSubmitting && submittingPlan === plan.key) || !!actionData?.confirmationUrl;

            return (
              <div
                key={plan.key}
                style={{
                  borderRadius: 16,
                  border: isCurrent
                    ? "2px solid #16a34a"
                    : plan.popular
                    ? "2px solid #7c3aed"
                    : "1.5px solid #e5e7eb",
                  background: "#fff",
                  boxShadow: plan.popular
                    ? "0 8px 32px rgba(124,58,237,0.13)"
                    : "0 2px 8px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  position: "relative",
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Popular ribbon */}
                {plan.popular && !isCurrent && (
                  <div style={{
                    position: "absolute", top: 14, right: -28,
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                    padding: "4px 36px", transform: "rotate(45deg)",
                    letterSpacing: "0.5px", textTransform: "uppercase",
                    boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                  }}>
                    Popular
                  </div>
                )}

                {/* Header */}
                <div style={{
                  background: plan.popular
                    ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                    : "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
                  padding: "24px 24px 20px",
                }}>
                  <p style={{
                    margin: "0 0 2px", fontSize: 13, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "1px",
                    color: plan.popular ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.6)",
                  }}>
                    {plan.label} plan
                  </p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                      ${plan.price}
                    </span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>
                      / month
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div style={{ padding: "20px 24px 16px", flexGrow: 1 }}>
                  <p style={{
                    margin: "0 0 14px", fontSize: 12, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af",
                  }}>
                    What's included
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((feat, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, minWidth: 20, borderRadius: "50%",
                          background: plan.popular ? "#ede9fe" : "#f0f9ff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                          color: plan.popular ? "#7c3aed" : "#2563eb",
                        }}>
                          ✓
                        </div>
                        <span style={{ fontSize: 14, color: "#374151" }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div style={{
                  padding: "16px 24px 20px",
                  borderTop: "1px solid #f3f4f6",
                }}>
                  {isCurrent ? (
                    <div style={{
                      width: "100%", padding: "11px 0", borderRadius: 9,
                      background: "#f0fdf4", border: "1.5px solid #86efac",
                      textAlign: "center",
                      fontSize: 14, fontWeight: 700, color: "#15803d",
                      cursor: "default",
                    }}>
                      ✓ Current Plan
                    </div>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="plan" value={plan.key} />
                      <button
                        type="submit"
                        disabled={isLoading}
                        onClick={() => setSubmittingPlan(plan.key)}
                        style={{
                          width: "100%",
                          padding: "11px 0",
                          borderRadius: 9,
                          border: "none",
                          background: isLoading
                            ? "#e5e7eb"
                            : plan.popular
                            ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                            : "linear-gradient(135deg, #1f2937, #374151)",
                          color: isLoading ? "#9ca3af" : "#fff",
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: isLoading ? "not-allowed" : "pointer",
                          transition: "opacity 0.15s, transform 0.1s",
                          boxShadow: plan.popular && !isLoading
                            ? "0 4px 14px rgba(124,58,237,0.35)"
                            : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                        }}
                      >
                        {isLoading ? "Redirecting…" : `Upgrade to ${plan.label}`}
                      </button>
                    </Form>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Trust footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 24, flexWrap: "wrap", paddingBlock: "4px 16px",
        }}>
          {[
            { icon: "🔒", text: "Secure Shopify billing" },
            { icon: "↩", text: "Cancel anytime" },
            { icon: "💳", text: "Billed in USD" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
        </div>

      </BlockStack>
    </Page>
  );
}
