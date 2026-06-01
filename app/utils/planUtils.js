// app/utils/planUtils.js

import prisma from "../db.server";
import { PLANS, PLAN_KEYS } from "../config/plans";

// ─────────────────────────────────────────────────────────────
// Get plan from DB
// ─────────────────────────────────────────────────────────────
export async function getShopPlanFromDB(shop) {
  try {
    const shopPlan = await prisma.shopPlan.findUnique({ where: { shop } });

    if (!shopPlan || shopPlan.status === "cancelled") {
      return { key: null, name: null, planStatus: shopPlan?.status ?? null };
    }

    const planData = PLANS[shopPlan.plan] ?? null;

    if (!planData) {
      return { key: null, name: null, planStatus: shopPlan.status };
    }

    return {
      ...planData,
      dbId:           shopPlan.id,
      subscriptionId: shopPlan.subscriptionId,
      planStatus:     shopPlan.status,
    };
  } catch (err) {
    console.error("[planUtils] getShopPlanFromDB error:", err);
    return { key: null, name: null, planStatus: null };
  }
}

// ─────────────────────────────────────────────────────────────
// Sync plan from Shopify Billing API → save to DB
// ─────────────────────────────────────────────────────────────
export async function syncPlanFromShopify(admin, shop) {
  try {
    const response = await admin.graphql(
      `#graphql
      query GetActiveSubscription {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
          }
        }
      }`
    );

    const responseData  = await response.json();
    const subscriptions =
      responseData.data?.currentAppInstallation?.activeSubscriptions ?? [];
    const active = subscriptions.find(
      (sub) =>
        sub.status === "ACTIVE" &&
        PLAN_KEYS.includes(sub.name.toLowerCase())
    );

    const planKey = active ? active.name.toLowerCase() : null;

    const saved = await prisma.shopPlan.upsert({
      where:  { shop },
      update: {
        planName:       planKey,
        subscriptionId: active?.id ?? null,
      },
      create: {
        shop,
        planName:       planKey,
        subscriptionId: active?.id ?? null,
      },
    });

    return {
      ...PLANS[planKey],
      subscriptionId: saved.subscriptionId,
    };
  } catch (err) {
    console.error("[planUtils] syncPlanFromShopify error:", err);
    return DEFAULT_PLAN;
  }
}

// ─────────────────────────────────────────────────────────────
// Save / update plan in DB after billing approval
// ─────────────────────────────────────────────────────────────
// export async function updateShopPlan(shop, planKey, subscriptionId = null) {
//   try {
//     if (!PLAN_KEYS.includes(planKey)) {
//       throw new Error(`Invalid plan key: ${planKey}`);
//     }

//     const saved = await prisma.shopPlan.upsert({
//       where:  { shop },
//       update: {
//         planName:       planKey,
//         subscriptionId: subscriptionId,
//       },
//       create: {
//         shop,
//         planName:       planKey,
//         subscriptionId: subscriptionId,
//       },
//     });

//     return {
//       ...PLANS[planKey],
//       subscriptionId: saved.subscriptionId,
//     };
//   } catch (err) {
//     console.error("[planUtils] updateShopPlan error:", err);
//     throw err;
//   }
// }

export async function updateShopPlan(
  shop,
  planKey,
  subscriptionId
) {
  const now = new Date();

  return prisma.shopPlan.upsert({
    where: { shop },

    update: {
      plan:            planKey,
      subscriptionId:  subscriptionId || null,
      status:          "active",
      billingStartedAt: now,
      trialEndsAt:     null,
    },

    create: {
      shop,
      plan:            planKey,
      subscriptionId:  subscriptionId || null,
      status:          "active",
      billingStartedAt: now,
      trialEndsAt:     null,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Cancel plan → downgrade to free
// ─────────────────────────────────────────────────────────────
export async function cancelShopPlan(shop) {
  try {
    await prisma.shopPlan.upsert({
      where:  { shop },
      update: {
        status:         "cancelled",
        subscriptionId: null,
      },
      create: {
        shop,
        plan:           "pro",
        status:         "cancelled",
        subscriptionId: null,
      },
    });
  } catch (err) {
    console.error("[planUtils] cancelShopPlan error:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Check if shop can add a new bundle
// ─────────────────────────────────────────────────────────────
export async function canAddBundle(shop) {
  try {
    const plan  = await getShopPlanFromDB(shop);
    const count = await prisma.bundle.count({ where: { shop } });
    const canAdd = plan.bundleLimit === Infinity || count < plan.bundleLimit;

    return {
      canAdd,
      current:   count,
      limit:     plan.bundleLimit,
      planName:  plan.name,
      planLabel: plan.label,
    };
  } catch (err) {
    console.error("[planUtils] canAddBundle error:", err);
    return {
      canAdd:    false,
      current:   0,
      limit:     0,
      planName:  null,
      planLabel: "No Plan",
    };
  }
}
