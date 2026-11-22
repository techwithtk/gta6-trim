import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, requirePlan, worker } from "@/lib/worker";
import { checkAutopost, type AutopostIn } from "@/lib/autopost-server";

const offline = () => NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });

/** GET /api/watch → channels this customer auto-starts. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  try {
    const res = await worker(`/watch?uid=${encodeURIComponent(r.s.uid)}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}

/** POST /api/watch {login, platform, rights, autopost?} → auto-start this channel whenever it goes live. Up to the plan's live slots. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { login?: string; platform?: string; rights?: boolean; autopost?: AutopostIn };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have permission to clip this channel." }, { status: 400 });
  if (!body.login) return NextResponse.json({ error: "Type a channel." }, { status: 400 });
  const limits = limitsFor(r.s.plan);
  const ap = await checkAutopost(r.s.uid, limits, body.autopost);
  if ("error" in ap) return NextResponse.json({ error: ap.error }, { status: ap.status });
  try {
    const res = await worker("/watch", { method: "POST", body: JSON.stringify({ uid: r.s.uid, login: body.login, platform: body.platform === "kick" ? "kick" : "twitch", autopost: ap.autopost, max: limits.liveSessions }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}

/** DELETE /api/watch?platform=&login= → stop auto-starting a channel. */
export async function DELETE(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const p = req.nextUrl.searchParams;
  try {
    const res = await worker("/watch/remove", { method: "POST", body: JSON.stringify({ uid: r.s.uid, platform: p.get("platform") ?? "", login: p.get("login") ?? "" }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}
