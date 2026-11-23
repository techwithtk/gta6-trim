// Signed session cookie (HMAC-SHA256). Uses Web Crypto so it works in route handlers and in proxy.ts.
// Who you are comes from Clerk; what you paid for comes from Dodo. This cookie caches the plan between checks.
import type { PlanId } from "@/lib/plans";

export const SESSION_COOKIE = "gt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const RECHECK_MS = 6 * 60 * 60 * 1000; // re-ask Dodo about the subscription every 6 hours

/** Re-ask Dodo when the cached plan is old, or a free trial has just ended (it either converted or was cancelled). */
export const isStale = (s: { checkedAt: number; trialEndsAt?: number }) =>
  Date.now() - s.checkedAt > RECHECK_MS || (!!s.trialEndsAt && Date.now() > s.trialEndsAt && s.checkedAt < s.trialEndsAt);

export type Session = {
  uid: string; // Clerk user id — the cookie is only valid for this signed-in user
  email: string;
  name: string;
  picture?: string;
  plan: PlanId | null; // null = signed in but no active subscription
  cycle?: "monthly" | "yearly";
  sub?: string; // Dodo subscription id
  trialEndsAt?: number; // ms; set while the subscription is still in its free trial
  checkedAt: number; // when the plan was last confirmed with Dodo
  exp: number; // session expiry (ms)
};

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function encodeSession(s: Session) {
  const data = b64url(enc.encode(JSON.stringify(s)));
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

export async function decodeSession(value: string | undefined | null): Promise<Session | null> {
  if (!value || !process.env.SESSION_SECRET) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(data));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(data))) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function cookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE };
}

/** Only allow redirects back into our own site. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
