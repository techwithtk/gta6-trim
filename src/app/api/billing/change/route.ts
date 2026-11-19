import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/auth-server";
import { dodo, productId, type Cycle } from "@/lib/dodo";
import { PLANS, type PlanId } from "@/lib/plans";
import { NextResponse } from "next/server";

/** Upgrade or downgrade the current subscription. Dodo charges or credits the difference right away (prorated). */
export async function POST(req: NextRequest) {
  const s = await readSession(req);
  if (!s?.sub) return Response.json({ error: "No active subscription on this account." }, { status: 400 });

  let body: { plan?: string; cycle?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const plan = PLANS.find((p) => p.id === body.plan)?.id as PlanId | undefined;
  const cycle: Cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  if (!plan) return Response.json({ error: "Pick a plan." }, { status: 400 });
  if (plan === s.plan && cycle === s.cycle) return Response.json({ error: "That's already your plan." }, { status: 400 });

  try {
    const sub = await dodo().subscriptions.retrieve(s.sub);
    if (sub.customer.email.toLowerCase() !== s.email) return Response.json({ error: "Subscription belongs to another account." }, { status: 403 });
    await dodo().subscriptions.changePlan(s.sub, { product_id: productId(plan, cycle)!, quantity: 1, proration_billing_mode: "prorated_immediately", on_payment_failure: "prevent_change" });
    return setSession(NextResponse.json({ ok: true, plan, cycle }), req, { ...s, plan, cycle, checkedAt: Date.now() });
  } catch (e) {
    console.error("[billing] change failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't change your plan. Your card may have been declined; nothing was changed." }, { status: 502 });
  }
}
