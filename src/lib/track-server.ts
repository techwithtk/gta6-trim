import "server-only";
import { after } from "next/server";
import { cookies } from "next/headers";

/**
 * First-party conversion tracking. Events go from this server to the worker's event log (never straight from browsers),
 * so the funnel can't be spammed and no third-party script runs on the site. No IPs or emails are stored:
 * `anon` is a random cookie id, `uid` the Clerk id once someone signs in.
 */
export const ANON_COOKIE = "gt_a";
export type EventName = "visit" | "pricing_view" | "signup" | "checkout_start" | "subscribed" | "first_clip" | "first_post" | "paid" | "cancelled";
export type TrackEvent = { name: EventName; uid?: string | null; anon?: string | null; src?: string | null; path?: string | null; props?: Record<string, string | number | boolean> };

async function readAnon(): Promise<string | null> {
  try {
    return (await cookies()).get(ANON_COOKIE)?.value ?? null;
  } catch {
    return null; // not inside a request (e.g. a webhook without cookies)
  }
}

export async function sendEvents(events: TrackEvent[]) {
  const url = (process.env.WORKER_URL ?? "").replace(/\/$/, "");
  if (!url || !process.env.WORKER_SECRET || !events.length) return;
  await fetch(`${url}/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-worker-secret": process.env.WORKER_SECRET },
    body: JSON.stringify({ events }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  }).catch(() => {});
}

/** Record an event after the response is sent, so tracking never slows down or breaks the real request. */
export async function track(name: EventName, e: Omit<TrackEvent, "name"> = {}) {
  const anon = e.anon !== undefined ? e.anon : await readAnon();
  try {
    after(() => sendEvents([{ ...e, name, anon }]));
  } catch {
    void sendEvents([{ ...e, name, anon }]); // outside a request scope
  }
}

/** Where a visitor came from: utm_source if present, else the referring site, else "direct". Own domain counts as direct. */
export function sourceOf(utm: string | null | undefined, referrer: string | null | undefined, ownHost: string): string {
  const u = (utm ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (u) return u;
  try {
    const h = new URL(referrer ?? "").hostname.replace(/^www\./, "").toLowerCase();
    if (!h || h === ownHost.replace(/^www\./, "")) return "direct";
    if (/(^|\.)google\./.test(h)) return "google";
    if (h === "t.co" || h.endsWith("twitter.com") || h === "x.com") return "x.com";
    if (h.endsWith("youtube.com") || h === "youtu.be") return "youtube.com";
    if (h.endsWith("facebook.com") || h === "l.facebook.com") return "facebook.com";
    if (h.endsWith("instagram.com")) return "instagram.com";
    if (h.endsWith("reddit.com")) return "reddit.com";
    return h.slice(0, 60);
  } catch {
    return "direct";
  }
}
