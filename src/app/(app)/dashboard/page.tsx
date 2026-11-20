"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Link2, Check, Loader2, Lock, AlertCircle, Clock, Upload, FileVideo, Scissors, ChevronDown } from "lucide-react";
import { Segmented, Toggle } from "@/components/forms";
import { EASE, EASE_OUT, SPRING, SPRING_EVENT, T } from "@/components/motion";
import { usePlan } from "@/lib/account";
import { addJob, monthUsage, useJobs, type Job } from "@/lib/jobs";
import { ClipGrid, ClipPlayer } from "@/components/ClipGrid";

/* ---------- helpers ---------- */
function parseYouTubeId(raw: string): string | null {
  const s = raw.trim();
  const m =
    s.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/) ??
    s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}
const fmtDur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
const fmtWhen = (unix: number) => {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type Meta = { id: string; title: string; channel: string; duration: number; thumbnail: string; captions: boolean; isLive: boolean };

/** Brand primary button: fluo pink, ink border, hard white shadow (same language as the landing page). */
const PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 border-2 border-black bg-pink px-6 font-poster text-[20px] font-black uppercase tracking-[0.01em] text-black shadow-[4px_4px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none";

export default function MakeClipsPage() {
  const plan = usePlan();
  const { jobs, ready, offline } = useJobs();
  const usage = monthUsage(jobs);

  const [source, setSource] = useState<"youtube" | "upload">("youtube");
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [count, setCount] = useState(6);
  const [autopost, setAutopost] = useState(false);
  const [rights, setRights] = useState(false);
  const [lookup, setLookup] = useState<{ vid: string; meta?: Meta; error?: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ job: string; file: string } | null>(null);
  const [file, setFile] = useState<{ name: string; size: number; duration: number } | null>(null);
  const [upload, setUpload] = useState<{ state: "idle" | "uploading" | "done" | "error"; pct: number; key?: string; error?: string }>({ state: "idle", pct: 0 });

  const vid = useMemo(() => parseYouTubeId(url), [url]);
  const meta = vid && lookup?.vid === vid ? lookup.meta ?? null : null;
  const metaState: "idle" | "loading" | "error" = !vid ? "idle" : lookup?.vid !== vid ? "loading" : lookup.error ? "error" : "idle";
  const metaError = lookup?.vid === vid ? lookup.error ?? "" : "";
  const maxSec = plan.limits.ytMaxMinutes * 60;
  const tooLong = meta ? meta.duration > maxSec : false;
  const left = Math.max(0, plan.limits.ytImports - usage.videos);
  const outOfImports = ready && left <= 0;
  const fileTooLong = file ? file.duration > maxSec : false;
  const canStart = source === "upload"
    ? upload.state === "done" && !!upload.key && !fileTooLong && rights && !outOfImports && !starting
    : !!meta && meta.id === vid && !tooLong && meta.captions && !meta.isLive && rights && !outOfImports && !starting;
  const linkError = touched && url && !vid ? "That doesn't look like a YouTube video link. Try youtube.com/watch?v=… or youtu.be/…" : null;

  // Real video details for the pasted link.
  useEffect(() => {
    if (!vid) return;
    let live = true;
    fetch(`/api/import/meta?url=${encodeURIComponent(`https://youtu.be/${vid}`)}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => { if (live) setLookup(ok ? { vid, meta: d } : { vid, error: d.error ?? "Couldn't read that video." }); })
      .catch(() => { if (live) setLookup({ vid, error: "Couldn't reach the clipping engine." }); });
    return () => { live = false; };
  }, [vid]);

  const startJob = async () => {
    if (!canStart) return;
    setStarting(true); setStartError(null);
    try {
      const payload = source === "upload"
        ? { upload: upload.key, title: file?.name.replace(/\.[^.]+$/, ""), count, rights }
        : { url: `https://youtu.be/${vid}`, count, rights };
      const r = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't start.");
      addJob(d);
      setUrl(""); setTouched(false); setRights(false); setFile(null); setUpload({ state: "idle", pct: 0 });
      document.getElementById("processing")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Couldn't start.");
    } finally { setStarting(false); }
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    const ext = (f.name.split(".").pop() ?? "").toLowerCase();
    if (!["mp4", "mov", "mkv", "webm"].includes(ext)) { setUpload({ state: "error", pct: 0, error: "Upload an MP4, MOV, MKV or WEBM video." }); return; }
    if (f.size > 8 * 1024 ** 3) { setUpload({ state: "error", pct: 0, error: "That file is over 8 GB." }); return; }
    // Read the length in the browser so an over-limit video is stopped before uploading.
    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { resolve(isFinite(v.duration) ? v.duration : 0); URL.revokeObjectURL(v.src); };
      v.onerror = () => resolve(0);
      v.src = URL.createObjectURL(f);
    });
    setFile({ name: f.name, size: f.size, duration });
    if (duration > maxSec) { setUpload({ state: "error", pct: 0, error: `Longer than your ${plan.limits.ytMaxMinutes / 60}h limit.` }); return; }
    setUpload({ state: "uploading", pct: 0 });
    try {
      const r = await fetch("/api/import/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ext }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't start the upload.");
      await new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", d.url);
        x.upload.onprogress = (e) => e.lengthComputable && setUpload((u) => ({ ...u, pct: Math.round((e.loaded / e.total) * 100) }));
        x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error("Upload failed. Please try again.")));
        x.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
        x.send(f);
      });
      setUpload({ state: "done", pct: 100, key: d.key });
    } catch (e) {
      setUpload({ state: "error", pct: 0, error: e instanceof Error ? e.message : "Upload failed." });
    }
  };

  const hint = outOfImports ? `You've used all ${plan.limits.ytImports} videos for this month.`
    : source === "upload"
      ? (upload.state === "uploading" ? `Uploading… ${upload.pct}%` : upload.state !== "done" ? "Choose a video file to continue" : !rights ? "Tick the rights box to continue" : `Uses 1 of ${left} videos left this month`)
      : !vid ? "Paste a link to continue"
      : metaState === "loading" ? "Reading the video…"
      : metaState === "error" ? metaError
      : meta && !meta.captions ? "This video has no English captions yet. Upload the file instead."
      : meta?.isLive ? "This stream is still live. Paste it after it ends."
      : tooLong ? "Video is over your plan's length limit"
      : !rights ? "Tick the rights box to continue"
      : `Uses 1 of ${left} videos left this month`;

  const videos = jobs.filter((j) => j.kind !== "live"); // live sessions have their own page
  const processing = videos.filter((j) => j.status === "queued" || j.status === "running");
  // "Your clips" shows every Short in one place: finished videos plus live sessions that have produced clips.
  const finished = jobs.filter((j) => (j.kind === "live" ? j.clips.length > 0 : j.status === "done"));
  const failed = videos.filter((j) => j.status === "error");

  return (
    <>
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Clip studio</p>
          <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">
            Make <span className="text-pink">clips.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Paste a YouTube link or upload a video. We find the best moments and cut captioned 9:16 Shorts: facecam on top, gameplay below.</p>
        </div>
        <div className="flex gap-6 font-mono text-[11px] uppercase tracking-wider text-subtle">
          <span><span className="num block font-poster text-[28px] font-black not-italic leading-none text-text">{ready ? left : "–"}</span>videos left</span>
          <span><span className="num block font-poster text-[28px] font-black leading-none text-text">{ready ? usage.clips : "–"}</span>clips this month</span>
        </div>
      </div>

      {offline ? (
        <p role="status" className="mb-5 flex items-center gap-2 border border-orange/40 bg-orange/[0.07] px-4 py-3 text-sm text-orange">
          <AlertCircle className="size-4 shrink-0" /> {offline}
        </p>
      ) : null}

      {/* 1. Create */}
      <section className="mb-10 border-2 border-white/85 bg-surface shadow-[6px_6px_0_var(--pink)]" aria-label="New clips">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-6">
          <Segmented value={source} onChange={(v) => setSource(v as "youtube" | "upload")} options={[["youtube", "YouTube link"], ["upload", "Upload a file"]]} id="src" />
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">Up to {plan.limits.ytMaxMinutes / 60}h per video</span>
        </div>

        <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Source */}
          <div className="min-w-0">
            {source === "upload" ? (
              <div>
                <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-10 text-center transition-colors duration-150 ${upload.state === "error" ? "border-red/60" : "border-white/20 hover:border-pink"}`}>
                  <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm" className="sr-only" disabled={upload.state === "uploading"} onChange={(e) => pickFile(e.target.files?.[0])} />
                  {file ? <FileVideo className="size-7 text-pink" /> : <Upload className="size-7 text-subtle" />}
                  <span className="text-[15px] font-medium">{file ? file.name : "Choose a video file"}</span>
                  <span className="text-xs text-subtle">
                    {file ? `${(file.size / 1024 ** 3).toFixed(2)} GB${file.duration ? ` · ${fmtDur(file.duration)}` : ""}` : "MP4, MOV, MKV or WEBM · up to 8 GB"}
                  </span>
                </label>
                {upload.state === "uploading" || upload.state === "done" ? (
                  <div className="mt-3 h-2 overflow-hidden bg-white/[0.07]">
                    <motion.span className={`block h-full ${upload.state === "done" ? "bg-green" : "bg-pink"}`} animate={{ width: `${upload.pct}%` }} transition={{ duration: 0.3, ease: EASE }} />
                  </div>
                ) : null}
                <p className={`mt-2 flex items-center gap-1.5 text-xs ${upload.state === "error" ? "text-red" : "text-subtle"}`}>
                  {upload.state === "error" ? <><AlertCircle className="size-3.5" /> {upload.error}</>
                    : upload.state === "done" ? <><Check className="size-3.5 text-green" /> Uploaded. We&apos;ll transcribe the speech and find the moments.</>
                    : "Your file goes straight to secure storage and is deleted once your clips are made."}
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="yt" className="text-sm font-medium">YouTube link</label>
                <div className={`mt-2 flex h-14 items-center gap-3 border-2 bg-bg px-4 transition-colors duration-150 focus-within:border-pink ${linkError ? "border-red/70" : "border-white/20"}`}>
                  <Link2 className="size-5 shrink-0 text-subtle" />
                  <input
                    id="yt"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-subtle"
                    aria-invalid={!!linkError}
                    aria-describedby="yt-help"
                    inputMode="url"
                    autoComplete="off"
                  />
                  <AnimatePresence>
                    {metaState === "loading" ? <Loader2 className="size-4 animate-spin text-subtle" /> : meta ? (
                      <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={SPRING_EVENT} className="grid size-6 place-items-center rounded-full bg-green">
                        <Check className="size-3.5 text-black" strokeWidth={3} />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
                <p id="yt-help" className={`mt-2 flex items-center gap-1.5 text-xs ${linkError ? "text-red" : "text-subtle"}`}>
                  {linkError ? <AlertCircle className="size-3.5" /> : null}
                  {linkError ?? "Videos with English captions. Finished live replays work too. No captions? Upload the file instead."}
                </p>

                <AnimatePresence initial={false}>
                  {meta && vid ? (
                    <motion.div key={vid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, transition: { duration: T.quick } }} transition={{ duration: T.slow, ease: EASE_OUT }} className="overflow-hidden">
                      <div className="mt-4 flex gap-4 border border-line bg-surface-2 p-3">
                        <div className="relative aspect-video w-40 shrink-0 overflow-hidden bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={meta.thumbnail} alt="" className="size-full object-cover" />
                          <span className="num absolute bottom-1 right-1 bg-black/80 px-1 text-[10px]">{fmtDur(meta.duration)}</span>
                        </div>
                        <div className="min-w-0 py-1">
                          <div className="line-clamp-2 text-sm font-medium">{meta.title}</div>
                          <div className="mt-1 text-xs text-subtle">{meta.channel}</div>
                          {tooLong ? (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-orange"><AlertCircle className="size-3.5" />Longer than your {plan.limits.ytMaxMinutes / 60}h limit. <Link href="/dashboard/billing" className="underline underline-offset-2">Upgrade</Link></p>
                          ) : !meta.captions ? (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-orange"><AlertCircle className="size-3.5" />No English captions. Upload the file instead.</p>
                          ) : (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-green"><Check className="size-3.5" />Ready to clip</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Settings + start */}
          <div className="flex flex-col gap-4 lg:border-l lg:border-line lg:pl-6">
            <div>
              <span className="mb-2 block text-sm font-medium">How many clips</span>
              <Segmented value={String(count)} onChange={(v) => setCount(Number(v))} options={[["3", "3"], ["6", "6"], ["10", "10"], ["15", "15"]]} id="cnt" />
            </div>

            {plan.limits.autopost ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 border border-line bg-surface-2 px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">Auto-post when ready</span>
                  <span className="block text-[11px] text-subtle">Best clips post to your connected accounts</span>
                </span>
                <Toggle on={autopost} onChange={setAutopost} label="Auto-post when ready" />
              </label>
            ) : (
              <div className="flex items-center justify-between gap-3 border border-line bg-surface-2 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-muted"><Lock className="size-3.5" /> Auto-post</span>
                <Link href="/dashboard/billing" className="text-[11px] text-text underline underline-offset-2">Studio plan</Link>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-muted">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
              <span>I own this video or have the creator&apos;s permission to clip and repost it.</span>
            </label>

            <button onClick={startJob} disabled={!canStart} className={`${PRIMARY} mt-auto w-full`}>
              {starting ? <Loader2 className="size-5 animate-spin" /> : <Scissors className="size-5" strokeWidth={2.5} />} Start clipping
            </button>
            <p className={`-mt-1 text-center text-xs ${metaState === "error" || outOfImports ? "text-orange" : "text-subtle"}`}>{hint}</p>
            {startError ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{startError}</p> : null}
          </div>
        </div>
      </section>

      {/* 2. Processing now */}
      <AnimatePresence initial={false}>
        {processing.length ? (
          <motion.section id="processing" key="processing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: T.slow, ease: EASE_OUT }} className="mb-10 scroll-mt-20" aria-label="Processing now">
            <SectionHead title="Processing now" count={processing.length} live />
            <div className="space-y-3">
              {processing.map((j) => <ProcessingRow key={j.id} j={j} />)}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* 3. Ready clips */}
      <section aria-label="Your clips">
        <SectionHead title="Your clips" count={finished.reduce((n, j) => n + j.clips.length, 0)} />
        {!ready ? (
          <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse bg-surface" />)}</div>
        ) : finished.length === 0 && processing.length === 0 ? (
          <EmptyState />
        ) : finished.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-6 text-sm text-subtle">Your first clips will appear here in a few minutes.</p>
        ) : (
          <div className="space-y-6">
            {finished.map((j) => <FinishedVideo key={j.id} j={j} onPlay={(file) => setPlaying({ job: j.id, file })} />)}
          </div>
        )}
      </section>

      {/* 4. Failed */}
      {failed.length ? <FailedList jobs={failed} /> : null}

      <ClipPlayer playing={playing} onClose={() => setPlaying(null)} />
    </>
  );
}

function SectionHead({ title, count, live }: { title: string; count?: number; live?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {live ? <span className="live-ping size-2 rounded-full bg-pink" /> : null}
      <h2 className="font-poster text-[28px] font-black uppercase leading-none">{title}</h2>
      {count ? <span className="num border border-white/15 px-1.5 py-0.5 text-xs text-muted">{count}</span> : null}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Thumb({ j, className }: { j: Job; className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-black ${className}`}>
      {j.vid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://i.ytimg.com/vi/${j.vid}/mqdefault.jpg`} alt="" className="size-full object-cover opacity-85" />
      ) : (
        <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_30%,rgba(255,46,136,0.35),transparent_70%)]"><FileVideo className="size-5 text-subtle" /></div>
      )}
    </div>
  );
}

/** A job that is still running: big, readable, step-by-step progress. */
function ProcessingRow({ j }: { j: Job }) {
  const steps = j.steps?.length ? j.steps : ["Getting video", "Reading transcript", "Finding moments", "Cutting clips", "Finishing"];
  const label = j.status === "queued" ? "Waiting for a free worker…" : `${steps[j.step] ?? "Working"}…${j.step === 3 && j.clips.length ? ` ${j.clips.length} cut so far` : ""}`;
  return (
    <motion.article layout transition={{ layout: SPRING }} className="border border-pink/40 bg-surface p-4">
      <div className="flex gap-4">
        <Thumb j={j} className="aspect-video w-28 md:w-36" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-[15px] font-medium">{j.title}</div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-subtle">
            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {j.duration ? fmtDur(j.duration) : "checking length"}</span>
            <span>started {fmtWhen(j.createdAt)}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={j.status + j.step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }} transition={{ duration: T.base, ease: EASE }} className="mt-2 inline-flex items-center gap-1.5 text-sm text-pink">
              <Loader2 className="size-4 animate-spin" /> {label}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progress">
        {steps.map((s, i) => {
          const doneStep = i < j.step;
          const current = i === j.step && j.status === "running";
          return (
            <li key={s} className="min-w-0">
              <div className="h-1.5 overflow-hidden bg-white/[0.07]">
                <motion.span className={`block h-full ${current ? "bg-pink/60" : "bg-pink"}`} initial={false} animate={{ width: doneStep ? "100%" : current ? "55%" : "0%" }} transition={{ duration: 0.8, ease: EASE }} />
              </div>
              <span className={`mt-1 block truncate text-[10.5px] ${doneStep || current ? "text-muted" : "text-subtle/70"}`}>{s}</span>
            </li>
          );
        })}
      </ol>
    </motion.article>
  );
}

/** One finished video and its clips. */
function FinishedVideo({ j, onPlay }: { j: Job; onPlay: (file: string) => void }) {
  return (
    <article className="border border-line bg-surface p-4">
      <div className="mb-4 flex items-center gap-3">
        <Thumb j={j} className="aspect-video w-20" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium">
            {j.kind === "live" ? <span className="mr-1.5 bg-pink px-1 font-mono text-[10px] font-bold uppercase text-black">Live · {j.platform === "kick" ? "Kick" : "Twitch"}</span> : null}
            {j.kind === "live" ? `${j.channel || j.login}: ` : ""}{j.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
            <span className="inline-flex items-center gap-1 text-green"><Check className="size-3.5" /> {j.clips.length} clips</span>
            <span>· {fmtWhen(j.createdAt)}</span>
          </div>
        </div>
      </div>
      <ClipGrid jobId={j.id} clips={j.clips} onPlay={onPlay} />
    </article>
  );
}

function FailedList({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-10" aria-label="Videos that didn't work">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm text-subtle hover:text-text" aria-expanded={open}>
        <ChevronDown className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        {jobs.length} video{jobs.length > 1 ? "s" : ""} didn&apos;t work · these don&apos;t count toward your limit
      </button>
      {open ? (
        <ul className="mt-3 space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-start gap-3 border border-line bg-surface px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red" />
              <div className="min-w-0">
                <div className="line-clamp-1 font-medium">{j.title}</div>
                <div className="text-xs text-subtle">{j.error ?? "Something went wrong."} · {fmtWhen(j.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function EmptyState() {
  const steps = [
    ["1", "Paste or upload", "A YouTube link with captions, or any video file up to 8 GB."],
    ["2", "We find the moments", "AI reads the whole video and picks the funniest and wildest bits."],
    ["3", "Download your Shorts", "Captioned 9:16 clips, facecam on top, ready to post."],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map(([n, t, d]) => (
        <div key={n} className="border border-line bg-surface p-5">
          <span className="font-poster text-[40px] font-black leading-none text-pink">{n}</span>
          <h3 className="mt-2 font-poster text-[22px] font-black uppercase leading-none">{t}</h3>
          <p className="mt-2 text-sm text-muted">{d}</p>
        </div>
      ))}
    </div>
  );
}
