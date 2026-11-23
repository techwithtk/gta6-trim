import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";
import { accessToken, allowed, configured, isProvider, LABEL } from "@/lib/storage-server";

export const maxDuration = 300;

/** POST /api/storage/save {provider, jobId, files} → copies clips into the "GTA6 Trim" folder in the person's Dropbox / OneDrive. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { provider?: string; jobId?: string; files?: string[] };
  const p = b.provider;
  if (!isProvider(p)) return NextResponse.json({ error: "Pick where to save." }, { status: 400 });
  if (!configured(p)) return NextResponse.json({ error: `${LABEL[p]} is coming soon.` }, { status: 503 });
  if (!allowed(r.s.plan, p)) return NextResponse.json({ error: `${LABEL[p]} is on Pro and Studio.` }, { status: 403 });
  if (!b.jobId || !/^[a-f0-9]{12}$/.test(b.jobId)) return NextResponse.json({ error: "Pick a clip." }, { status: 400 });
  const files = (b.files ?? []).filter((f) => typeof f === "string" && /^(clip_\d{2}|live_\d{3}_\d{2})\.mp4$/.test(f)).slice(0, 30);
  if (!files.length) return NextResponse.json({ error: "Pick a clip." }, { status: 400 });
  const me = r.s.self ?? r.s.uid;
  let token: string | null;
  try {
    token = await accessToken(me, p);
  } catch {
    return NextResponse.json({ error: `${LABEL[p]} access expired. Reconnect it on the Integrations page.` }, { status: 409 });
  }
  if (!token) return NextResponse.json({ error: `Connect ${LABEL[p]} first (Integrations page).` }, { status: 409 });
  try {
    const res = await worker("/storage/save", {
      method: "POST",
      body: JSON.stringify({ uid: me, owner: r.s.uid, provider: p, jobId: b.jobId, files, token }),
      signal: AbortSignal.timeout(280_000),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: `Saving to ${LABEL[p]} took too long. Try fewer clips at once.` }, { status: 504 });
  }
}
