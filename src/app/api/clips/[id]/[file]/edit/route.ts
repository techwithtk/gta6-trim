import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

type P = { params: Promise<{ id: string; file: string }> };
const valid = (id: string, file: string) => /^[a-f0-9]{12}$/.test(id) && /^(clip_\d{2}|live_\d{3}_\d{2})\.mp4$/.test(file);
const offline = () => NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });

/** GET → what the clip editor needs: a link to the uncut footage, word timings, the current cut and hook. */
export async function GET(req: NextRequest, { params }: P) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { id, file } = await params;
  if (!valid(id, file)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const res = await worker(`/jobs/${id}/clips/${file}/edit?uid=${encodeURIComponent(r.s.uid)}`);
    return NextResponse.json(await res.json(), { status: res.status, headers: { "cache-control": "no-store" } });
  } catch {
    return offline();
  }
}

/** POST {start, end, hook, words: {index: text}, stickers, layout} → re-render the clip with the new cut, captions, hook and camera/gameplay boxes. */
export async function POST(req: NextRequest, { params }: P) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { id, file } = await params;
  if (!valid(id, file)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { start?: number; end?: number; hook?: string; words?: Record<string, string>; stickers?: boolean; layout?: unknown };
  try {
    const res = await worker(`/jobs/${id}/clips/${file}/edit`, {
      method: "POST",
      body: JSON.stringify({ uid: r.s.uid, start: b.start, end: b.end, hook: String(b.hook ?? "").slice(0, 80), words: b.words ?? {}, stickers: b.stickers !== false, layout: b.layout ?? null }),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}
