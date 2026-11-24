import { clerkClient } from "@clerk/nextjs/server";
import { dodo } from "@/lib/dodo";
import { track } from "@/lib/track-server";

/** The Clerk account for a paying email, so payments and cancellations join the same person in the funnel. */
async function uidFor(email: string): Promise<string | null> {
  if (!email) return null;
  const list = await (await clerkClient()).users.getUserList({ emailAddress: [email.toLowerCase()], limit: 1 }).catch(() => null);
  return list?.data[0]?.id ?? null;
}

/**
 * Dodo Payments webhook (Standard Webhooks signature).
 * Verified events are logged for now; once accounts + a database exist, this is where
 * subscriptions get activated, renewed, paused and cancelled.
 */
export async function POST(req: Request) {
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) return new Response("Webhook key not set", { status: 503 });

  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  let event: { type: string; data?: Record<string, unknown> };
  try {
    event = dodo().webhooks.unwrap(body, { headers }) as unknown as typeof event;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const d = event.data ?? {};
  console.log("[dodo webhook]", event.type, d.subscription_id ?? d.payment_id ?? "", d.status ?? "");
  // Conversion tracking: a real charge (> $0, so trial mandates don't count) and cancellations.
  const email = String((d.customer as { email?: string } | undefined)?.email ?? "");
  if (event.type === "payment.succeeded" && Number(d.total_amount ?? 0) > 0) {
    const uid = await uidFor(email);
    if (uid) await track("paid", { uid, anon: null, props: { amount: Number(d.total_amount), currency: String(d.currency ?? "") } });
  } else if (event.type === "subscription.cancelled") {
    const uid = await uidFor(email);
    if (uid) await track("cancelled", { uid, anon: null });
  }
  return Response.json({ received: true });
}
