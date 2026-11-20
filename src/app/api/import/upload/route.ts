import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/** A signed link the browser uploads a video file to (straight to storage, never through this server). */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { ext } = (await req.json().catch(() => ({}))) as { ext?: string };
  try {
    const res = await worker("/uploads", { method: "POST", body: JSON.stringify({ uid: r.s.uid, ext: (ext ?? "mp4").toLowerCase() }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
