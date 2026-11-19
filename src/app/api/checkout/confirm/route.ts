import { NextResponse, type NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/auth-server";
import { dodo, paymentsConfigured, planForProduct } from "@/lib/dodo";

/**
 * Dodo sends the buyer here after checkout with ?subscription_id=…&status=….
 * The query string is never trusted: the subscription is fetched from Dodo, checked, and must belong to the signed-in account.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/checkout?error=${reason}`, url.origin));
  if (!paymentsConfigured()) return fail("not_live");

  const id = url.searchParams.get("subscription_id");
  if (!id) return fail("missing");
  const session = await readSession(req);
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin));

  try {
    const sub = await dodo().subscriptions.retrieve(id);
    const match = planForProduct(sub.product_id);
    if (!match) return fail("unknown_product");
    if (sub.customer.email.toLowerCase() !== session.email) return fail("other_account");
    if (sub.status !== "active") return fail(sub.status === "pending" ? "pending" : "not_paid");

    const res = NextResponse.redirect(new URL("/dashboard?welcome=1", url.origin));
    return setSession(res, req, { ...session, plan: match.plan, cycle: match.cycle, sub: sub.subscription_id, checkedAt: Date.now() });
  } catch (e) {
    console.error("[checkout] confirm failed", e instanceof Error ? e.message : e);
    return fail("lookup");
  }
}
