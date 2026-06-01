
// ============================================================
// plans.js — Central Plans Config
// ============================================================

export const PLANS = {
  pro: {
    name:        "Pro Plan",
    key:         "pro",
    label:       "Pro",
    price:       10.99,
    bundleLimit: 5,
    trialDays:   0,
    interval:    "EVERY_30_DAYS",
    color:       "#f6f6f7",
    features: [
      "Unlimited bundles",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
  },
  advanced: {
    name:        "Advanced Plan",
    key:         "advanced",
    label:       "Advanced",
    price:       17.99,
    bundleLimit: Infinity,
    trialDays:   7,
    interval:    "EVERY_30_DAYS",
    color:       "#f3f0ff",
    features: [
      "Unlimited bundles",
      "Full analytics dashboard",
      "24/7 priority support",
      "Custom branding",
      "API access",
      "Multi-store support",
    ],
  },
};

export const DEFAULT_PLAN = PLANS.pro;

// ["pro", "advanced"]
export const PLAN_KEYS = Object.keys(PLANS);

export const billingConfig = Object.fromEntries(
  Object.values(PLANS).map((plan) => [
    plan.name,
    {
      amount:       plan.price,
      currencyCode: "USD",
      interval:     plan.interval,
      ...(plan.trialDays > 0 ? { trialDays: plan.trialDays } : {}),
    },
  ])
);

// ============================================================
// Utility Functions
// ============================================================

export function getPlan(key) {
  return PLANS[key] ?? null;
}

export function getPlanByShopifyName(shopifyName) {
  const entry = Object.entries(PLANS).find(
    ([_, plan]) => plan.name.toLowerCase() === shopifyName.toLowerCase()
  );
  return entry ? entry[0] : null;
}

export function canUpgradeTo(current, target) {
  const order = ["pro", "advanced"];
  return order.indexOf(target) > order.indexOf(current);
}

export function formatPrice(key) {
  const plan = PLANS[key];
  return plan ? `$${plan.price.toFixed(2)}/mo` : "—";
}