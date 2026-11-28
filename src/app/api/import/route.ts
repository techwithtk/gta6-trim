import { trialCapError } from "@/lib/trial-server";
import { isTemplate } from "@/lib/templates";
import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, brandCapsFor, requirePlan, worker } from "@/lib/worker";
import { track } from "@/lib/track-server";

type Job = { createdAt: number; status?: string; kind?: string };
/** Videos that count toward the monthly limit: started this month, not failed, not live sessions. */
const counted = (jobs: Job[], since: number) => jobs.filter((j) => j.createdAt >= since && j.status !== "error" && j.kind !== "live" && j.kind !== "drive").length;

/** Your recent imports, plus how many you've used this month. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  try {
    // Polled by every open dashboard: pass the worker's JSON straight through instead of parsing and re-encoding it.
    const res = await worker(`/jobs?uid=${encodeURIComponent(r.s.uid)}`);
    const text = await res.text();
    if (!res.ok) return new NextResponse(text, { status: res.status, headers: { "content-type": "application/json" } });
    return new NextResponse(`{"jobs":${text}}`, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}

/** Start clipping a YouTube video. Plan limits are enforced here and again by the worker. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { url?: string; upload?: string; title?: string; count?: number; rights?: boolean; template?: string };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have the rights to clip this video." }, { status: 400 });
  const limits = limitsFor(r.s.plan);
  const capped = await trialCapError(r.s.uid, r.s.trialEndsAt, "video");
  if (capped) return NextResponse.json({ error: capped }, { status: 429 });
  try {
    const list = (await (await worker(`/jobs?uid=${encodeURIComponent(r.s.uid)}`)).json()) as Job[];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000;
    if (counted(list, monthStart) >= limits.ytImports) {
      return NextResponse.json({ error: "You've used all YouTube imports for this month." }, { status: 429 });
    }
    const res = await worker("/jobs", {
      method: "POST",
      body: JSON.stringify({
        ...(body.upload ? { upload: body.upload, title: (body.title ?? "").slice(0, 140) } : { url: body.url ?? "" }),
        uid: r.s.uid,
        count: Math.min(20, Math.max(3, Number(body.count) || 6)),
        maxMinutes: limits.ytMaxMinutes,
        brandCaps: brandCapsFor(r.s.plan),
        template: isTemplate(body.template) ? body.template : "auto",
      }),
    });
    if (res.ok) await track("first_clip", { uid: r.s.uid, props: { kind: "video" } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
