import { NextResponse, type NextRequest } from "next/server";
import { activeSub, checkAutopost, fromWorker, type AutopostIn } from "@/lib/autopost-server";
import { trialCapError } from "@/lib/trial-server";
import { brandCapsFor, limitsFor, worker } from "@/lib/worker";
import { liveBudget } from "@/lib/live-budget";

export const maxDuration = 150;

/**
 * Called by the clipping worker (never the browser) when a channel a customer auto-starts goes live.
 * Re-checks the plan and the auto-post accounts, then starts the session the same way the Live page does.
 * If auto-post is no longer allowed or its accounts are gone, the session still starts, just without auto-post.
 */
export async function POST(req: NextRequest) {
  if (!fromWorker(req.headers.get("x-worker-secret"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { uid?: string; platform?: string; login?: string; autopost?: AutopostIn | null };
  if (!b.uid || !b.login) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const sub = await activeSub(b.uid);
    if (!sub) return NextResponse.json({ error: "No active plan, so auto-start is paused." }, { status: 403 });
    const plan = sub.plan;
    const capped = await trialCapError(b.uid, sub.trialEndsAt, "live");
    if (capped) return NextResponse.json({ error: capped }, { status: 429 });
    const limits = limitsFor(plan);
    const ap = await checkAutopost(b.uid, limits, b.autopost ?? undefined);
    const autopost = "autopost" in ap ? ap.autopost : undefined;
    const res = await worker("/live", {
      method: "POST",
      body: JSON.stringify({ uid: b.uid, login: b.login, platform: b.platform === "kick" ? "kick" : "twitch", maxLive: limits.liveSessions, autopost, brandCaps: brandCapsFor(plan), auto: true, budget: liveBudget(plan, sub.trialEndsAt) }),
      signal: AbortSignal.timeout(120_000),
    });
    return NextResponse.json(await res.json(), { status: res.ok ? 201 : res.status });
  } catch (e) {
    console.error("[autostart]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't start the session." }, { status: 502 });
  }
}
