import { NextResponse, type NextRequest } from "next/server";
import { limitsFor, requirePlan, worker } from "@/lib/worker";

type Job = { createdAt: number; status?: string; kind?: string };
/** Videos that count toward the monthly limit: started this month, not failed, not live sessions. */
const counted = (jobs: Job[], since: number) => jobs.filter((j) => j.createdAt >= since && j.status !== "error" && j.kind !== "live").length;

/** Your recent imports, plus how many you've used this month. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  try {
    const res = await worker(`/jobs?uid=${encodeURIComponent(r.s.uid)}`);
    const jobs = (await res.json()) as Job[];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000;
    return NextResponse.json({ jobs, used: counted(jobs, monthStart), limits: limitsFor(r.s.plan) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}

/** Start clipping a YouTube video. Plan limits are enforced here and again by the worker. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => ({}))) as { url?: string; upload?: string; title?: string; count?: number; rights?: boolean };
  if (!body.rights) return NextResponse.json({ error: "Confirm you have the rights to clip this video." }, { status: 400 });
  const limits = limitsFor(r.s.plan);
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
      }),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
