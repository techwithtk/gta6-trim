import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/** POST /api/brand/preview {brand} → a JPEG still of a Short with these settings (rendered by the worker, so it matches). */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const b = ((await req.json().catch(() => ({}))) as { brand?: unknown }).brand ?? {};
  try {
    const res = await worker("/brand/preview", { method: "POST", body: JSON.stringify({ uid: r.s.uid, brand: b }), signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return NextResponse.json({ error: "Preview failed." }, { status: res.status });
    return new NextResponse(await res.arrayBuffer(), { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Preview failed." }, { status: 503 });
  }
}
