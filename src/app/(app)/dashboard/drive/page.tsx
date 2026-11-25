"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, FolderOpen, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { PageTitle, SectionLabel } from "@/components/ui";
import { usePlan } from "@/lib/account";
import { useDrive } from "@/lib/drive";
import { addJob, refreshJobs, useJobs, type Clip, type Job } from "@/lib/jobs";
import { addPost, PLATFORM_META, useSocial, type SocialAccount } from "@/lib/social";
import type { SocialPlatform } from "@/lib/plans";

const ORDER: SocialPlatform[] = ["tiktok", "youtube", "instagram", "facebook"];
const PRIMARY =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-pink font-poster font-black uppercase text-black shadow-[3px_3px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none";
const VIDEO_MIMES = "video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-matroska,video/x-msvideo,video/3gpp";
const SPACING: [number, string][] = [[0, "All at once"], [30, "Every 30 min"], [60, "Every hour"], [120, "Every 2 hours"], [240, "Every 4 hours"], [720, "Every 12 hours"], [1440, "Once a day"]];
const MAX_SCHEDULE_DAYS = 6;
const nowMs = () => Date.now();

type Picked = { id: string; name: string };

/* ---------------------------------------------------------------- Google Picker (loaded on demand) */
type PickerDoc = { id: string; name: string; mimeType: string };
type PickerApi = {
  ViewId: Record<string, string>; Feature: Record<string, string>; Action: Record<string, string>; Response: Record<string, string>;
  DocsView: new (viewId?: string) => { setIncludeFolders(b: boolean): unknown; setMimeTypes(m: string): unknown; setSelectFolderEnabled(b: boolean): unknown; setParent?(p: string): unknown; setMode(m: string): unknown };
  DocsViewMode: Record<string, string>;
  PickerBuilder: new () => Record<string, (...a: unknown[]) => unknown> & { build(): { setVisible(b: boolean): void } };
};
declare global { interface Window { gapi?: { load(name: string, cb: () => void): void }; google?: { picker?: PickerApi } } }

let pickerReady: Promise<PickerApi> | null = null;
function loadPicker(): Promise<PickerApi> {
  if (pickerReady) return pickerReady;
  pickerReady = new Promise((resolve, reject) => {
    const done = () => window.gapi!.load("picker", () => (window.google?.picker ? resolve(window.google.picker) : reject(new Error("Google Picker didn't load."))));
    if (window.gapi) return done();
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.onload = done;
    s.onerror = () => { pickerReady = null; reject(new Error("Couldn't load Google's file picker. Check your connection or ad blocker.")); };
    document.head.appendChild(s);
  });
  return pickerReady;
}

async function openPicker(onPick: (docs: PickerDoc[]) => void) {
  const r = await fetch("/api/drive/picker", { cache: "no-store" });
  const cfg = await r.json();
  if (!r.ok) throw new Error(cfg.error ?? "Couldn't open Google Drive.");
  if (!cfg.connected) throw new Error("connect");
  const P = await loadPicker();
  const all = new P.DocsView(P.ViewId.DOCS);
  all.setIncludeFolders(true); all.setMimeTypes(VIDEO_MIMES); all.setSelectFolderEnabled(false); all.setMode(P.DocsViewMode.GRID);
  const videos = new P.DocsView(P.ViewId.DOCS_VIDEOS);
  videos.setMode(P.DocsViewMode.GRID);
  const b = new P.PickerBuilder();
  b.addView(all); b.addView(videos);
  b.enableFeature(P.Feature.MULTISELECT_ENABLED);
  b.enableFeature(P.Feature.SUPPORT_DRIVES);
  b.setOAuthToken(cfg.token); b.setDeveloperKey(cfg.apiKey); b.setAppId(cfg.appId);
  b.setTitle("Pick videos (open a folder, then select several)");
  b.setMaxItems(20);
  b.setCallback((data: Record<string, unknown>) => {
    if (data[P.Response.ACTION] !== P.Action.PICKED) return;
    const docs = (data[P.Response.DOCUMENTS] as Record<string, string>[]) ?? [];
    onPick(docs.map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType })));
  });
  b.build().setVisible(true);
}

/* ---------------------------------------------------------------- page */
export default function DrivePostPage() {
  const plan = usePlan();
  const studio = plan.limits.autopost;
  const drive = useDrive();
  const { jobs } = useJobs();
  const driveJobs = useMemo(() => jobs.filter((j) => j.kind === "drive"), [jobs]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"pick" | "start" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const current = driveJobs.find((j) => j.id === openId) ?? driveJobs[0];

  if (!studio) {
    return (
      <>
        <PageTitle title="Post from Google Drive" sub="Pick videos from your Drive, let AI write the captions, and post them to your accounts." />
        <div className="border border-line bg-surface p-5 text-sm text-muted">
          Posting to social media is on the Studio plan. <Link href="/dashboard/billing" className="text-pink underline underline-offset-2">See plans</Link>
        </div>
      </>
    );
  }

  const pick = async () => {
    setBusy("pick"); setError(null);
    try {
      await openPicker((docs) => setPicked((prev) => {
        const m = new Map(prev.map((p) => [p.id, p]));
        for (const d of docs) if (d.mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(d.name)) m.set(d.id, { id: d.id, name: d.name });
        return [...m.values()].slice(0, 20);
      }));
    } catch (e) {
      setError(e instanceof Error && e.message === "connect" ? "connect" : e instanceof Error ? e.message : "Couldn't open Google Drive.");
    } finally { setBusy(null); }
  };

  const start = async () => {
    setBusy("start"); setError(null);
    try {
      const r = await fetch("/api/drive/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files: picked, notes }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't start the import.");
      addJob(d as Job);
      setOpenId(d.id);
      setPicked([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the import.");
    } finally { setBusy(null); }
  };

  return (
    <>
      <PageTitle title="Post from Google Drive" sub="Pick any videos from your Drive. AI watches each one and writes the captions. You review, choose accounts, and post." />

      <section className="mb-8 border border-line bg-surface p-5">
        <SectionLabel>1 · Pick videos</SectionLabel>
        {!drive.ready ? <div className="h-10 animate-pulse bg-surface-2" /> : !drive.connected || error === "connect" ? (
          <p className="text-sm text-muted">
            Connect Google Drive first. <Link href="/dashboard/integrations" className="text-pink underline underline-offset-2">Open Integrations</Link>
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={pick} disabled={busy !== null} className="inline-flex h-10 items-center gap-2 border border-white/25 px-4 text-sm transition-colors duration-150 hover:border-pink hover:text-pink disabled:opacity-40">
                {busy === "pick" ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />} {picked.length ? "Add more from Drive" : "Choose from Google Drive"}
              </button>
              <span className="text-xs text-subtle">Open any folder and select up to 20 videos (shift-click to select many). Up to 15 min and 2 GB each.</span>
            </div>

            {picked.length ? (
              <>
                <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
                  {picked.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <button onClick={() => setPicked((x) => x.filter((y) => y.id !== p.id))} aria-label={`Remove ${p.name}`} className="text-subtle hover:text-red"><X className="size-4" /></button>
                    </li>
                  ))}
                </ul>
                <label className="mt-4 block">
                  <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">About your account (optional)</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 400))} rows={2} placeholder="e.g. Fitness coach in Dubai, friendly tone, always add #dubaifitness"
                    className="w-full resize-y border border-white/20 bg-bg px-3 py-2 text-sm outline-none placeholder:text-subtle focus:border-pink" />
                </label>
                <button onClick={start} disabled={busy !== null} className={`${PRIMARY} mt-4 h-11 px-5 text-[18px]`}>
                  {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Write captions for {picked.length} video{picked.length === 1 ? "" : "s"}
                </button>
              </>
            ) : null}
          </>
        )}
        {error && error !== "connect" ? <p className="mt-3 flex items-center gap-1.5 text-sm text-red"><AlertCircle className="size-4" /> {error}</p> : null}
      </section>

      {driveJobs.length ? (
        <section>
          <SectionLabel right={driveJobs.length > 1 ? (
            <select value={current?.id} onChange={(e) => setOpenId(e.target.value)} className="h-8 border border-white/20 bg-bg px-2 text-xs">
              {driveJobs.map((j) => <option key={j.id} value={j.id}>{new Date(j.createdAt * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {j.title}</option>)}
            </select>
          ) : null}>2 · Review & post</SectionLabel>
          {current ? <Batch key={current.id} job={current} /> : null}
        </section>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- one import: progress, then the review list */
type Row = { on: boolean; caption: string; title: string; state?: "posting" | "done" | "error"; msg?: string };
const initRow = (c: Clip): Row => ({ on: true, caption: c.text?.instagram || `${c.title}`, title: (c.text?.youtube_title || c.title).slice(0, 100) });

function Batch({ job }: { job: Job }) {
  const social = useSocial(true);
  const accounts = social.accounts ?? [];
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [spacing, setSpacing] = useState(120);
  const [consent, setConsent] = useState(false);
  const [posting, setPosting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const chosenIds = picked ?? new Set(accounts.filter((a) => a.active).map((a) => a.id));
  const chosen = accounts.filter((a) => chosenIds.has(a.id));
  const hasTikTok = chosen.some((a) => a.platform === "tiktok");
  const toggleAcct = (id: string) => setPicked(() => { const n = new Set(chosenIds); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // rows only hold what the customer changed; everything else comes from the AI text on the clip
  const rowOf = (c: Clip): Row => rows[c.file] ?? initRow(c);
  const set = (c: Clip, patch: Partial<Row>) => setRows((r) => ({ ...r, [c.file]: { ...(r[c.file] ?? initRow(c)), ...patch } }));

  const running = job.status === "queued" || job.status === "running";
  const clips = job.clips ?? [];
  const selected = clips.filter((c) => rowOf(c).on && rowOf(c).state !== "done");
  const spanDays = spacing * Math.max(0, selected.length - 1) / 1440;
  // the first scheduled post goes out 5 min from now, so the last one lands at 5 min + spacing × (n − 1)
  const tooLong = spacing > 0 && 5 + spacing * Math.max(0, selected.length - 1) > MAX_SCHEDULE_DAYS * 1440 - 1;

  const postAll = async () => {
    setPosting(true); setSummary(null);
    let ok = 0, bad = 0;
    const base = nowMs() + 5 * 60_000;
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      const row = rowOf(c);
      set(c, { state: "posting", msg: undefined });
      const scheduledFor = spacing > 0 && i > 0 ? new Date(base + i * spacing * 60_000).toISOString() : undefined;
      try {
        const r = await fetch("/api/social/posts", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobId: job.id, file: c.file, caption: row.caption, title: row.title || c.title, accountIds: [...chosenIds], scheduledFor, consent }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Posting failed.");
        if (d.post) addPost(d.post);
        set(c, { state: "done", msg: scheduledFor ? `Scheduled for ${new Date(scheduledFor).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Sent" });
        ok++;
      } catch (e) {
        set(c, { state: "error", msg: e instanceof Error ? e.message : "Posting failed." }); bad++;
      }
    }
    setPosting(false);
    setSummary(`${ok} sent${bad ? `, ${bad} failed (see below)` : ""}. Track them on the Posted page.`);
  };

  if (job.status === "error" && !clips.length) {
    return <p className="flex items-center gap-1.5 border border-red/30 bg-red/[0.06] px-3 py-2 text-sm text-red"><AlertCircle className="size-4" /> {job.error ?? "This import failed."}</p>;
  }

  return (
    <div className="space-y-5">
      {running ? (
        <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3 text-sm">
          <Loader2 className="size-4 animate-spin text-pink" />
          <span>{job.steps?.[Math.min(job.step, (job.steps?.length ?? 1) - 1)] ?? "Working"}… {clips.length} of {(job as Job & { count?: number }).count ?? "?"} ready</span>
          <button onClick={() => refreshJobs()} className="ml-auto text-xs text-subtle underline">Refresh</button>
        </div>
      ) : null}
      {job.failed?.length ? (
        <div className="border border-orange/40 bg-orange/[0.06] px-3 py-2 text-sm">
          <p className="font-medium">Skipped {job.failed.length} file{job.failed.length === 1 ? "" : "s"}:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">{job.failed.map((f) => <li key={f.name}>{f.name}: {f.error}</li>)}</ul>
        </div>
      ) : null}

      {clips.length ? (
        <>
          <ul className="space-y-3">
            {clips.map((c) => {
              const row = rowOf(c);
              return (
                <li key={c.file} className={`grid gap-4 border p-3 sm:grid-cols-[120px_1fr] ${row.on ? "border-line bg-surface" : "border-line/50 opacity-60"}`}>
                  <div className="relative">
                    <video src={`/api/import/${job.id}/${c.file}`} poster={`/api/import/${job.id}/${c.thumb}`} controls preload="none" className="aspect-[9/16] w-full max-w-[160px] bg-black object-cover" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-start gap-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={row.on} disabled={row.state === "done"} onChange={(e) => set(c, { on: e.target.checked })} className="size-4 accent-[var(--pink)]" />
                        {c.title}
                      </label>
                      <span className="num ml-auto shrink-0 text-xs text-subtle">{c.length}s</span>
                    </div>
                    <p className="truncate text-xs text-subtle">{c.drive}</p>
                    <textarea value={row.caption} onChange={(e) => set(c, { caption: e.target.value.slice(0, 2200) })} rows={4} disabled={row.state === "done"}
                      className="w-full resize-y border border-white/20 bg-bg px-3 py-2 text-sm outline-none focus:border-pink" aria-label={`Caption for ${c.title}`} />
                    {chosen.some((a) => a.platform === "youtube") ? (
                      <input value={row.title} onChange={(e) => set(c, { title: e.target.value.slice(0, 100) })} disabled={row.state === "done"} placeholder="YouTube title"
                        className="h-9 w-full border border-white/20 bg-bg px-3 text-sm outline-none focus:border-pink" aria-label={`YouTube title for ${c.title}`} />
                    ) : null}
                    {row.state ? (
                      <p className={`flex items-center gap-1.5 text-xs ${row.state === "error" ? "text-red" : row.state === "done" ? "text-green" : "text-muted"}`}>
                        {row.state === "posting" ? <Loader2 className="size-3 animate-spin" /> : row.state === "done" ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
                        {row.state === "posting" ? "Sending…" : row.msg}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-4 border border-line bg-surface p-4">
            <fieldset>
              <legend className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">Post to</legend>
              {!social.ready ? <div className="h-9 animate-pulse bg-surface-2" /> : accounts.length ? (
                <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {ORDER.flatMap((p) => accounts.filter((a) => a.platform === p)).map((a: SocialAccount) => {
                    const m = PLATFORM_META[a.platform];
                    const on = chosenIds.has(a.id);
                    return (
                      <li key={a.id}>
                        <label className={`flex cursor-pointer items-center gap-2.5 border px-2.5 py-2 text-sm ${on ? "border-pink bg-pink/[0.06]" : "border-line hover:border-white/30"}`}>
                          <input type="checkbox" checked={on} onChange={() => toggleAcct(a.id)} className="size-4 accent-[var(--pink)]" />
                          <span className="grid size-6 shrink-0 place-items-center text-[11px] font-bold text-white" style={{ background: m.color }}>{m.letter}</span>
                          <span className="min-w-0 flex-1 truncate">{a.displayName || a.username}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted">No accounts connected yet. <Link href="/dashboard/integrations" className="text-pink underline underline-offset-2">Connect accounts</Link></p>}
            </fieldset>

            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">Timing</span>
              <select value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="h-9 border border-white/20 bg-bg px-2 text-sm">
                {SPACING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="text-xs text-subtle">{spacing ? "First video goes out now, the rest are scheduled. Spacing posts out looks natural to the platforms." : "Every video posts right away."}</span>
            </label>
            {tooLong ? <p className="text-xs text-red">That spreads {selected.length} videos over {Math.ceil(spanDays)} days. Posts can be scheduled up to {MAX_SCHEDULE_DAYS} days ahead: pick shorter spacing or fewer videos.</p> : null}

            {hasTikTok ? (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
                I agree to TikTok&apos;s Music Usage Confirmation and confirm I own the rights to these videos.
              </label>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={postAll} disabled={posting || running || !selected.length || !chosen.length || (hasTikTok && !consent) || tooLong || selected.some((c) => !rowOf(c).caption.trim())}
                className={`${PRIMARY} h-11 px-5 text-[18px]`}>
                {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Post {selected.length} video{selected.length === 1 ? "" : "s"} to {chosen.length} account{chosen.length === 1 ? "" : "s"}
              </button>
              {running ? <span className="text-xs text-subtle">Wait until every video is ready.</span> : null}
              {summary ? <span className="text-sm text-green">{summary}</span> : null}
            </div>
          </div>
        </>
      ) : null}
      {!running && clips.length ? (
        <p className="flex items-center gap-1.5 text-xs text-subtle"><Trash2 className="size-3" /> Untick a video to leave it out. Captions you edit here are used as written.</p>
      ) : null}
    </div>
  );
}
