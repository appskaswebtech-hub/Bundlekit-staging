import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useLocation, useNavigate } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { BlockStack, Text, Button } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { checkAppAccess } from "../utils/checkAccess.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);
  const { hasAccess } = await checkAppAccess(admin, billing);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", hasPlan: hasAccess };
};

export default function App() {
  const { apiKey, hasPlan } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();

  const isBillingPage = location.pathname.includes("/billing");
  const showPlanModal = !hasPlan && !isBillingPage;

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/bundles">Bundles</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/settings1">Settings</Link>
        <Link to="/app/billing">Upgrade to Plans</Link>
      </NavMenu>

      <Outlet />

      {showPlanModal && (
        <div
          style={{
            position:        "fixed",
            inset:           0,
            background:      "rgba(0, 0, 0, 0.65)",
            zIndex:          9999,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <div
            style={{
              background:   "#ffffff",
              borderRadius: "16px",
              padding:      "40px 48px",
              maxWidth:     "460px",
              width:        "90%",
              textAlign:    "center",
              boxShadow:    "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <BlockStack gap="400" inlineAlign="center">
              {/* Lock icon */}
              <div
                style={{
                  width:        "64px",
                  height:       "64px",
                  borderRadius: "50%",
                  background:   "#f3f0ff",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  fontSize:     "28px",
                  margin:       "0 auto",
                }}
              >
                🔒
              </div>

              <BlockStack gap="200" inlineAlign="center">
                <Text variant="headingLg" as="h2" fontWeight="bold">
                  Subscription Required
                </Text>
                <Text variant="bodyMd" tone="subdued" as="p">
                  Choose a plan to unlock full access to BUNDLE KIT features including bundles, discounts, and analytics.
                </Text>
              </BlockStack>

              <div style={{ paddingBlockStart: "8px" }}>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => navigate("/app/billing")}
                >
                  View Plans & Subscribe
                </Button>
              </div>

              <Text variant="bodySm" tone="subdued" as="p">
                Starting at $10.99/month · Cancel anytime
              </Text>
            </BlockStack>
          </div>
        </div>
      )}
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
