import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/** Stop a live session. The chunk being recorded is finished and clipped; then the session ends. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const res = await worker(`/live/${id}/stop`, { method: "POST", body: JSON.stringify({ uid: r.s.uid }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
