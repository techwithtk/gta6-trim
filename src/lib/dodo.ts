import "server-only";
import DodoPayments from "dodopayments";
import type { PlanId } from "@/lib/plans";

export type Cycle = "monthly" | "yearly";

/** Product IDs live in env vars so test and live mode can use different products. */
const ENV_KEY: Record<PlanId, Record<Cycle, string>> = {
  starter: { monthly: "DODO_PRODUCT_STARTER_MONTHLY", yearly: "DODO_PRODUCT_STARTER_YEARLY" },
  pro: { monthly: "DODO_PRODUCT_PRO_MONTHLY", yearly: "DODO_PRODUCT_PRO_YEARLY" },
  studio: { monthly: "DODO_PRODUCT_STUDIO_MONTHLY", yearly: "DODO_PRODUCT_STUDIO_YEARLY" },
};

export function productId(plan: PlanId, cycle: Cycle) {
  return process.env[ENV_KEY[plan][cycle]] || null;
}

/** Find which plan/cycle a Dodo product belongs to. */
export function planForProduct(id: string): { plan: PlanId; cycle: Cycle } | null {
  for (const plan of Object.keys(ENV_KEY) as PlanId[]) {
    for (const cycle of ["monthly", "yearly"] as Cycle[]) {
      if (productId(plan, cycle) === id) return { plan, cycle };
    }
  }
  return null;
}

/** True once the API key and every plan's product IDs are set. */
export function paymentsConfigured() {
  if (!process.env.DODO_PAYMENTS_API_KEY || !process.env.SESSION_SECRET) return false;
  return (Object.keys(ENV_KEY) as PlanId[]).every((p) => productId(p, "monthly") && productId(p, "yearly"));
}

/**
 * Look up the paying subscription for an email in Dodo (the source of truth — no local database).
 * Returns the best active GTA6 Trim subscription, preferring the highest plan.
 */
/** When a subscription's free trial ends (ms), or undefined if it has no trial or the trial is over. */
export function trialEnd(s: { created_at: string; trial_period_days?: number | null }): number | undefined {
  const days = Number(s.trial_period_days) || 0;
  if (!days) return undefined;
  const end = Date.parse(s.created_at) + days * 86400_000;
  return end > Date.now() ? end : undefined;
}

/** A free trial is for accounts that have never had a GTA6 Trim subscription (in any state). */
export async function trialEligible(email: string): Promise<boolean> {
  const target = email.trim().toLowerCase();
  for await (const customer of dodo().customers.list({ email: target, page_size: 10 })) {
    if (customer.email?.toLowerCase() !== target) continue;
    for await (const s of dodo().subscriptions.list({ customer_id: customer.customer_id, page_size: 50 })) {
      if (planForProduct(s.product_id)) return false;
    }
  }
  return true;
}

export async function findActiveSubscription(email: string): Promise<{ sub: string; plan: PlanId; cycle: Cycle; trialEndsAt?: number } | null> {
  if (!process.env.DODO_PAYMENTS_API_KEY) return null;
  const rank: Record<PlanId, number> = { starter: 1, pro: 2, studio: 3 };
  let best: { sub: string; plan: PlanId; cycle: Cycle; trialEndsAt?: number } | null = null;
  const target = email.trim().toLowerCase();
  for await (const customer of dodo().customers.list({ email: target, page_size: 10 })) {
    if (customer.email?.toLowerCase() !== target) continue;
    for await (const s of dodo().subscriptions.list({ customer_id: customer.customer_id, status: "active", page_size: 50 })) {
      const m = planForProduct(s.product_id);
      if (m && (!best || rank[m.plan] > rank[best.plan])) best = { sub: s.subscription_id, ...m, trialEndsAt: trialEnd(s) };
    }
  }
  return best;
}

let client: DodoPayments | null = null;
export function dodo() {
  if (!client) {
    client = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    });
  }
  return client;
}
