import { NextResponse, type NextRequest } from "next/server";

import { requirePlan, worker } from "@/lib/worker";
import { driveToken } from "@/lib/drive-server";

export const maxDuration = 300;

/** POST /api/drive/save {jobId, files} → copies those clips into the "GTA6 Trim" folder in the user's Google Drive. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { jobId?: string; files?: string[] };
  if (!b.jobId || !/^[a-f0-9]{12}$/.test(b.jobId)) return NextResponse.json({ error: "Pick a clip." }, { status: 400 });
  const files = (b.files ?? []).filter((f) => typeof f === "string" && /^(clip_\d{2}|live_\d{3}_\d{2})\.mp4$/.test(f)).slice(0, 30);
  if (!files.length) return NextResponse.json({ error: "Pick a clip." }, { status: 400 });
  const token = await driveToken(r.s.self ?? r.s.uid);
  if (!token) return NextResponse.json({ error: "Connect Google Drive first (Integrations page)." }, { status: 409 });
  try {
    const res = await worker("/drive/save", {
      method: "POST",
      body: JSON.stringify({ uid: r.s.uid, jobId: b.jobId, files, token }),
      signal: AbortSignal.timeout(280_000),
    });
    const d = await res.json();
    return NextResponse.json(d, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Saving to Drive took too long. Try fewer clips at once." }, { status: 504 });
  }
}
