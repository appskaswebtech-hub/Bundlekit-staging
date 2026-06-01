
import { PLANS } from "app/config/plans";

type PlanKey = keyof typeof PLANS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkAppAccess(admin: any, billing: any) {
  let storePlanName = "unknown";

  // STEP 1: Shop ka Shopify plan fetch karo
  try {
    const response = await admin.graphql(`
      { shop { plan { displayName } } }
    `);
    const data = await response.json();
    storePlanName = data?.data?.shop?.plan?.displayName ?? "unknown";
  } catch (err) {
    console.error("[checkAppAccess] GraphQL error:", err);
  }

  // All stores require an active subscription
  try {
    const billingCheck = await billing.require({
      plans:     Object.values(PLANS).map((p) => p.name),
      isTest:    process.env.NODE_ENV !== "production",
      onFailure: () => null,
    });

    const activeSubs = billingCheck?.appSubscriptions ?? [];

    const priorityOrder: PlanKey[] = ["advanced", "pro"];
    let activePlanKey: PlanKey | null = null;

    for (const planKey of priorityOrder) {
      const found = activeSubs.some(
        (sub: { name: string; status: string }) =>
          sub.name.toLowerCase() === PLANS[planKey].name.toLowerCase() &&
          sub.status === "ACTIVE"
      );
      if (found) { activePlanKey = planKey; break; }
    }

    const hasAccess = activePlanKey !== null;

    return {
      hasAccess,
      isDevStore:      false,
      activePlan:      activePlanKey,
      activePlanName:  activePlanKey ? PLANS[activePlanKey].name : null,
      storePlan:       storePlanName,
      requiresBilling: !hasAccess,
    };
  } catch (err) {
    console.error("[checkAppAccess] Billing error:", err);
    return {
      hasAccess:       false,
      isDevStore:      false,
      activePlan:      null,
      activePlanName:  null,
      storePlan:       storePlanName,
      requiresBilling: true,
    };
  }
}