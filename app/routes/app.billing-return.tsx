// app/routes/app.billing-return.tsx
//
// Shopify redirects here after the merchant approves (or cancels) billing.
// This is where we ACTUALLY update the ShopPlan table — only after confirmation.

import { json }                        from "@remix-run/node";
import type { LoaderFunctionArgs }     from "@remix-run/node";
import { useEffect }                   from "react";
import { useNavigate, useLoaderData }  from "@remix-run/react";
import { Page, Spinner, BlockStack, Text, Banner } from "@shopify/polaris";
import { authenticate }                from "../shopify.server";
import { PLANS, getPlanByShopifyName }  from "../config/plans";
import { updateShopPlan }              from "../utils/planUtils";

// ─── Types ────────────────────────────────────────────────────
interface ActiveSubscription {
  id:     string;
  name:   string;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "DECLINED" | "FROZEN" | "CANCELLED";
}

interface ActiveSubscriptionResponse {
  data?: {
    currentAppInstallation?: {
      activeSubscriptions?: ActiveSubscription[];
    };
  };
}

interface LoaderData {
  ok:   boolean;
  plan: { name: string; label: string } | null;
}

// ─── GraphQL ──────────────────────────────────────────────────
const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

// ─── LOADER ───────────────────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop               = session.shop;

  try {
    const response                           = await admin.graphql(ACTIVE_SUBSCRIPTION_QUERY);
    const data: ActiveSubscriptionResponse   = await response.json();

    const activeSubscriptions =
      data?.data?.currentAppInstallation?.activeSubscriptions ?? [];
  
    const activeSub = activeSubscriptions.find(
      (sub) => sub.status === "ACTIVE"
    
    );





    if (activeSub) {
      const planKey  = getPlanByShopifyName(activeSub.name);
      const planMeta = planKey ? PLANS[planKey as keyof typeof PLANS] : null;

      if (planKey) {
        await updateShopPlan(shop, planKey, activeSub.id);
      }

      console.log(`[billing-return] ✅ Plan updated → ${planKey} for ${shop}`);

      return json<LoaderData>({
        ok:   !!planKey,
        plan: planKey
          ? { name: planKey, label: planMeta?.label ?? planKey }
          : null,
      });
    }

    console.warn(
      `[billing-return] ⚠️ No ACTIVE subscription found for ${shop}.`
    );

    return json<LoaderData>({ ok: false, plan: null });

  } catch (err) {
    console.error("[billing-return] error:", err);
    return json<LoaderData>({ ok: false, plan: null });
  }
};

// ─── COMPONENT ────────────────────────────────────────────────
export default function BillingReturnPage() {
  const { ok, plan } = useLoaderData<typeof loader>();
  const navigate     = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate(ok ? "/app" : "/app/billing"), 3000);
    return () => clearTimeout(timer);
  }, [navigate, ok]);

  return (
    <Page>
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "60vh",
          gap:            "24px",
        }}
      >
        <BlockStack gap="400" inlineAlign="center">
          {ok && plan ? (
            <Banner tone="success" title="Plan activated successfully!">
              <Text as="p">
                You are now on the <strong>{plan.label ?? plan.name}</strong> plan.
                Redirecting you back to the app...
              </Text>
            </Banner>
          ) : (
            <Banner tone="warning" title="Could not confirm plan.">
              <Text as="p">
                Redirecting you back. Please check your plan status in the app.
              </Text>
            </Banner>
          )}
          <Spinner size="large" />
          <Text tone="subdued" variant="bodySm" as="p">
            Redirecting in 5 seconds...
          </Text>
        </BlockStack>
      </div>
    </Page>
  );
}
