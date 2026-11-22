import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, brandCapsFor, requirePlan, worker } from "@/lib/worker";
import { listAccounts, socialConfigured } from "@/lib/bundle";

type AutopostIn = { accounts?: string[]; minScore?: number; gapMin?: number; consent?: boolean };

/** Start clipping a live Twitch or Kick stream. The plan's live-slot limit is enforced by the worker against your active sessions. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { login?: string; platform?: string; rights?: boolean; autopost?: AutopostIn };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have permission to clip this stream." }, { status: 400 });
  if (!body.login) return NextResponse.json({ error: "Pick a stream to clip." }, { status: 400 });
  const limits = limitsFor(r.s.plan);

  // Auto-post (Studio): only the customer's own connected accounts, TikTok only with the music-terms consent.
  let autopost: AutopostIn | undefined;
  if (body.autopost?.accounts?.length) {
    if (!limits.autopost) return NextResponse.json({ error: "Auto-post is on the Studio plan." }, { status: 403 });
    if (!socialConfigured()) return NextResponse.json({ error: "Social posting isn't switched on yet." }, { status: 503 });
    const ids = new Set(body.autopost.accounts);
    const mine = (await listAccounts(r.s.uid).catch(() => [])).filter((a) => a.slot <= limits.accountsPerPlatform && ids.has(a.id));
    if (mine.length !== ids.size) return NextResponse.json({ error: "One of those accounts isn't connected anymore. Refresh and try again." }, { status: 400 });
    if (mine.some((a) => a.platform === "tiktok") && !body.autopost.consent) return NextResponse.json({ error: "Confirm TikTok's music usage terms to auto-post to TikTok." }, { status: 400 });
    autopost = { accounts: mine.map((a) => a.id), minScore: Number(body.autopost.minScore) || 0.75, gapMin: Number(body.autopost.gapMin) || 60, consent: !!body.autopost.consent };
  }

  try {
    const res = await worker("/live", {
      method: "POST",
      body: JSON.stringify({ uid: r.s.uid, login: body.login, platform: body.platform === "kick" ? "kick" : "twitch", maxLive: limits.liveSessions, autopost, brandCaps: brandCapsFor(r.s.plan) }),
      signal: AbortSignal.timeout(120_000),
    });
    const d = await res.json();
    return NextResponse.json(d, { status: res.ok ? 201 : res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
