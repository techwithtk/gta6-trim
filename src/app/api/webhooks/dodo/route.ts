import { dodo } from "@/lib/dodo";

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
  return Response.json({ received: true });
}
