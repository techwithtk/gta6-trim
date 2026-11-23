import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";
import { allowed, configured, isProvider, PROVIDERS } from "@/lib/storage-server";

/** GET /api/storage → {dropbox: {available, allowed, connected, account}, onedrive: {...}} for the signed-in person. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  let conn: Record<string, { connected?: boolean; account?: string | null }> = {};
  try {
    const res = await worker(`/storage?uid=${encodeURIComponent(r.s.self ?? r.s.uid)}`);
    if (res.ok) conn = await res.json();
  } catch { /* show as not connected */ }
  return NextResponse.json(Object.fromEntries(PROVIDERS.map((p) => [p, {
    available: configured(p), allowed: allowed(r.s.plan, p), connected: !!conn[p]?.connected, account: conn[p]?.account ?? null,
  }])));
}

/** DELETE /api/storage?provider= → forget this person's Dropbox / OneDrive tokens. */
export async function DELETE(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const p = req.nextUrl.searchParams.get("provider");
  if (!isProvider(p)) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  try {
    const res = await worker("/storage/disconnect", { method: "POST", body: JSON.stringify({ uid: r.s.self ?? r.s.uid, provider: p }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "Couldn't disconnect. Try again." }, { status: 503 });
  }
}
