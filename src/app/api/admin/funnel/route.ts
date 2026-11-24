import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth-server";
import { isAdmin } from "@/lib/admin";
import { worker, workerConfigured } from "@/lib/worker";

/** GET /api/admin/funnel?days=30 → the conversion funnel. Site owners only (ADMIN_EMAILS). */
export async function GET(req: NextRequest) {
  const s = await readSession(req);
  if (!isAdmin(s)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!workerConfigured()) return NextResponse.json({ error: "Worker offline." }, { status: 503 });
  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  try {
    const r = await worker(`/funnel?days=${days}`, { signal: AbortSignal.timeout(30_000) });
    return NextResponse.json(await r.json(), { status: r.status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the worker." }, { status: 503 });
  }
}
