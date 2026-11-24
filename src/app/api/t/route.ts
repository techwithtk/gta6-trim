import { NextResponse, type NextRequest } from "next/server";
import { ANON_COOKIE, sendEvents, sourceOf } from "@/lib/track-server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/**
 * POST /api/t {name: "visit"|"pricing_view", path, ref, utm} → 204.
 * The only browser-sent events. Sets a random first-party id cookie (no IP, no fingerprinting) and skips bots.
 */
const ALLOWED = new Set(["visit", "pricing_view"]);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|vercel/i;

export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return res;
  const b = (await req.json().catch(() => ({}))) as { name?: string; path?: string; ref?: string; utm?: string };
  if (!b.name || !ALLOWED.has(b.name)) return res;

  let anon = req.cookies.get(ANON_COOKIE)?.value;
  if (!anon || !/^[a-z0-9]{16,40}$/.test(anon)) {
    anon = crypto.randomUUID().replace(/-/g, "");
    res.cookies.set(ANON_COOKIE, anon, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 365 * 86400 });
  }
  const s = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  const path = String(b.path ?? "").replace(/[?#].*$/, "").slice(0, 120) || "/";
  await sendEvents([{ name: b.name as "visit", anon, uid: s?.uid ?? null, path, src: b.name === "visit" ? sourceOf(b.utm, b.ref, req.nextUrl.hostname) : null }]);
  return res;
}
