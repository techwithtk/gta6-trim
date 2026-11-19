import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth-server";
import { dodo, paymentsConfigured, productId, type Cycle } from "@/lib/dodo";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * Creates a Dodo Payments checkout session for the signed-in user and returns the hosted checkout URL.
 * The email always comes from the Google sign-in, so the payment is tied to the account that will use it.
 */
export async function POST(req: NextRequest) {
  if (!paymentsConfigured()) return Response.json({ error: "Payments are not live yet." }, { status: 503 });
  const session = await readSession(req);
  if (!session) return Response.json({ error: "Sign in first so your plan is saved to your account." }, { status: 401 });

  let body: { plan?: string; cycle?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const plan = PLANS.find((p) => p.id === body.plan)?.id as PlanId | undefined;
  const cycle: Cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  if (!plan) return Response.json({ error: "Pick a plan." }, { status: 400 });

  const origin = new URL(req.url).origin;
  try {
    const checkout = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: productId(plan, cycle)!, quantity: 1 }],
      customer: { email: session.email, name: session.name },
      metadata: { plan, cycle, account: session.email },
      return_url: `${origin}/api/checkout/confirm`,
    });
    if (!checkout.checkout_url) throw new Error("No checkout URL returned");
    return Response.json({ url: checkout.checkout_url });
  } catch (e) {
    console.error("[checkout] create failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
