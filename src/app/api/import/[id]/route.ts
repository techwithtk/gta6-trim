import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/** One import's progress and finished clips. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const res = await worker(`/jobs/${id}?uid=${encodeURIComponent(r.s.uid)}`);
    return NextResponse.json(await res.json(), { status: res.status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
