import { NextResponse, type NextRequest } from "next/server";
import { requireStudio } from "@/lib/social-server";
import { driveToken } from "@/lib/drive-server";
import { worker } from "@/lib/worker";
import { track } from "@/lib/track-server";

const MAX_FILES = 20;
const TRIAL_MAX_FILES = 3;
const PER_DAY = 5; // batches per 24 h: each video is downloaded, converted and watched by the AI

type J = { kind?: string; status?: string; createdAt?: number };

/** POST /api/drive/import {files:[{id,name}], notes?} → a "drive" job that copies the videos and writes their captions. */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { files?: { id?: string; name?: string }[]; notes?: string };
  const files = (b.files ?? []).filter((f) => f?.id).map((f) => ({ id: String(f.id), name: String(f.name ?? "video").slice(0, 140) }));
  if (!files.length) return NextResponse.json({ error: "Pick at least one video." }, { status: 400 });

  const trial = !!r.s.trialEndsAt && Date.now() < r.s.trialEndsAt;
  const max = trial ? TRIAL_MAX_FILES : MAX_FILES;
  if (files.length > max) return NextResponse.json({ error: trial ? `During the free trial you can import up to ${TRIAL_MAX_FILES} videos at a time.` : `Pick up to ${MAX_FILES} videos at a time.` }, { status: 400 });

  const token = await driveToken(r.s.self ?? r.s.uid);
  if (!token) return NextResponse.json({ error: "Connect Google Drive first (Integrations page)." }, { status: 400 });

  try {
    const jobs = (await (await worker(`/jobs?uid=${encodeURIComponent(r.s.uid)}`)).json()) as J[];
    const day = Date.now() / 1000 - 86400;
    if (trial && r.s.trialEndsAt) { // the free trial includes 1 Drive import (up to 3 videos), separate from its YouTube allowance
      const since = (r.s.trialEndsAt - 86400_000) / 1000 - 60;
      if (jobs.some((j) => j.kind === "drive" && (j.createdAt ?? 0) >= since && j.status !== "error")) {
        return NextResponse.json({ error: "Your free trial includes 1 Google Drive import. Your plan starts automatically when the trial ends." }, { status: 429 });
      }
    }
    if (jobs.filter((j) => j.kind === "drive" && (j.createdAt ?? 0) >= day && j.status !== "error").length >= PER_DAY) {
      return NextResponse.json({ error: `You can start ${PER_DAY} Google Drive imports a day. Try again tomorrow.` }, { status: 429 });
    }
    const res = await worker("/drive/import", { method: "POST", body: JSON.stringify({ uid: r.s.uid, tokenUid: r.s.self ?? r.s.uid, files, notes: String(b.notes ?? "").slice(0, 400), token }) });
    const d = await res.json();
    if (res.ok) await track("first_clip", { uid: r.s.uid, props: { kind: "drive", files: files.length } });
    return NextResponse.json(d, { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
