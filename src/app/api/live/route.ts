import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, requirePlan, worker } from "@/lib/worker";

/** Start clipping a live Twitch or Kick stream. The plan's live-slot limit is enforced by the worker against your active sessions. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { login?: string; platform?: string; rights?: boolean };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have permission to clip this stream." }, { status: 400 });
  if (!body.login) return NextResponse.json({ error: "Pick a stream to clip." }, { status: 400 });
  try {
    const res = await worker("/live", {
      method: "POST",
      body: JSON.stringify({ uid: r.s.uid, login: body.login, platform: body.platform === "kick" ? "kick" : "twitch", maxLive: limitsFor(r.s.plan).liveSessions }),
      signal: AbortSignal.timeout(120_000),
    });
    const d = await res.json();
    return NextResponse.json(d, { status: res.ok ? 201 : res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
