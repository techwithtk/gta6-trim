import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth-server";
import { dodo } from "@/lib/dodo";

/** Opens Dodo's customer portal: update card, download invoices, cancel. */
export async function POST(req: NextRequest) {
  const s = await readSession(req);
  if (s?.ws) return Response.json({ error: "Billing is managed by your team owner." }, { status: 403 });
  if (!s?.sub) return Response.json({ error: "No active subscription on this account." }, { status: 400 });
  try {
    const sub = await dodo().subscriptions.retrieve(s.sub);
    if (sub.customer.email.toLowerCase() !== s.email) return Response.json({ error: "Subscription belongs to another account." }, { status: 403 });
    const portal = await dodo().customers.customerPortal.create(sub.customer.customer_id, { return_url: `${new URL(req.url).origin}/api/auth/refresh?next=/dashboard/billing` });
    return Response.json({ url: portal.link });
  } catch (e) {
    console.error("[billing] portal failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Couldn't open billing. Please try again." }, { status: 502 });
  }
}
