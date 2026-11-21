import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

export const maxDuration = 120;

/** POST {fresh?} → AI titles, captions and hashtags for each platform (Pro and Studio). Saved on the clip; fresh rewrites them. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; file: string }> }) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  if (r.s.plan === "starter") return NextResponse.json({ error: "AI titles and hashtags are on Pro and Studio." }, { status: 403 });
  const { id, file } = await params;
  if (!/^[a-f0-9]{12}$/.test(id) || !/^(clip_\d{2}|live_\d{3}_\d{2})\.mp4$/.test(file)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { fresh } = (await req.json().catch(() => ({}))) as { fresh?: boolean };
  try {
    const res = await worker(`/jobs/${id}/clips/${file}/text`, { method: "POST", body: JSON.stringify({ uid: r.s.uid, fresh: !!fresh }), signal: AbortSignal.timeout(110_000) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The AI writer didn't respond. Try again in a minute." }, { status: 503 });
  }
}
