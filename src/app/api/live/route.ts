import { trialCapError } from "@/lib/trial-server";
import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, brandCapsFor, requirePlan, worker } from "@/lib/worker";
import { checkAutopost, type AutopostIn } from "@/lib/autopost-server";
import { track } from "@/lib/track-server";

/** Start clipping a live Twitch or Kick stream. The plan's live-slot limit is enforced by the worker against your active sessions. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { login?: string; platform?: string; rights?: boolean; autopost?: AutopostIn };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have permission to clip this stream." }, { status: 400 });
  if (!body.login) return NextResponse.json({ error: "Pick a stream to clip." }, { status: 400 });
  const limits = limitsFor(r.s.plan);
  const capped = await trialCapError(r.s.uid, r.s.trialEndsAt, "live");
  if (capped) return NextResponse.json({ error: capped }, { status: 429 });

  const ap = await checkAutopost(r.s.uid, limits, body.autopost);
  if ("error" in ap) return NextResponse.json({ error: ap.error }, { status: ap.status });
  const autopost = ap.autopost;

  try {
    const res = await worker("/live", {
      method: "POST",
      body: JSON.stringify({ uid: r.s.uid, login: body.login, platform: body.platform === "kick" ? "kick" : "twitch", maxLive: limits.liveSessions, autopost, brandCaps: brandCapsFor(r.s.plan) }),
      signal: AbortSignal.timeout(120_000),
    });
    const d = await res.json();
    if (res.ok) await track("first_clip", { uid: r.s.uid, props: { kind: "live" } });
    return NextResponse.json(d, { status: res.ok ? 201 : res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
