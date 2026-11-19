"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Link2, Check, Loader2, Lock, AlertCircle, Clock, Sparkles, ArrowRight } from "lucide-react";
import { PageTitle, SectionLabel } from "@/components/ui";
import { Segmented, Toggle } from "@/components/forms";
import { EASE, EASE_OUT, SPRING, SPRING_EVENT, T } from "@/components/motion";
import { CAPTION_STYLES } from "@/lib/captions";
import { usePlan } from "@/lib/account";

/* ---------- YouTube URL parsing ---------- */
function parseYouTubeId(raw: string): string | null {
  const s = raw.trim();
  const m =
    s.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/) ??
    s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}
// Mock metadata: deterministic from the id (real version: YouTube Data API videos.list → snippet + contentDetails).
function mockMeta(id: string) {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const minutes = 18 + (h % 170);
  const titles = ["GTA 6 — Full Story Walkthrough Part 1", "GTA 6 Online: 4 Hour Heist Marathon", "I Played GTA 6 For 24 Hours Straight", "GTA 6 Funniest Moments Compilation"];
  return { title: titles[h % titles.length], channel: "Your channel", minutes };
}
const fmtDur = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String((m * 7) % 60).padStart(2, "0")}`;

/* ---------- Pipeline ---------- */
const STEPS = ["Fetching video", "Transcribing audio", "Finding viral moments", "Cutting & reframing to 9:16", "Adding captions"];
type Job = { id: string; vid: string; title: string; minutes: number; step: number; clips: number; style: string; startedAt: number };

export default function ImportPage() {
  const plan = usePlan();
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [length, setLength] = useState("auto");
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState("pop");
  const [autopost, setAutopost] = useState(false);
  const [rights, setRights] = useState(false);
  const [used, setUsed] = useState(12);
  const [jobs, setJobs] = useState<Job[]>([
    { id: "j0", vid: "", title: "My GTA 6 Online heist marathon (VOD)", minutes: 241, step: STEPS.length, clips: 14, style: "pop", startedAt: 0 },
  ]);
  const counter = useRef(1);

  const vid = useMemo(() => parseYouTubeId(url), [url]);
  const meta = vid ? mockMeta(vid) : null;
  const tooLong = meta ? meta.minutes > plan.limits.ytMaxMinutes : false;
  const outOfImports = used >= plan.limits.ytImports;
  const canStart = !!vid && !tooLong && rights && !outOfImports;
  const error = touched && url && !vid ? "That doesn't look like a YouTube video link. Try youtube.com/watch?v=… or youtu.be/…" : null;

  // Advance processing jobs one step every ~1.6s.
  useEffect(() => {
    const t = setInterval(() => {
      setJobs((js) => js.map((j) => (j.step < STEPS.length ? { ...j, step: j.step + 1 } : j)));
    }, 1600);
    return () => clearInterval(t);
  }, []);

  const startJob = () => {
    if (!canStart || !vid || !meta) return;
    counter.current += 1;
    setJobs((js) => [{ id: `j${counter.current}`, vid, title: meta.title, minutes: meta.minutes, step: 0, clips: count, style, startedAt: Date.now() }, ...js]);
    setUsed((u) => u + 1);
    setUrl("");
    setTouched(false);
    setRights(false);
  };

  return (
    <>
      <PageTitle
        title="Add YouTube video"
        art="dusk"
        sub="Paste a long-form video and we'll cut it into captioned Shorts"
        right={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-subtle">{plan.name} plan</span>
            <span className="num">{used} / {plan.limits.ytImports}</span>
            <span className="hidden h-1 w-24 overflow-hidden rounded-full bg-white/[0.06] sm:block">
              <motion.span className="block h-full rounded-full bg-white/60" animate={{ width: `${(used / plan.limits.ytImports) * 100}%` }} transition={{ duration: T.slow, ease: EASE_OUT }} />
            </span>
            <span className="text-subtle">videos this month</span>
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: form */}
        <section className="panel min-w-0 p-5 md:p-6">
          <label htmlFor="yt" className="text-sm font-medium">YouTube link</label>
          <div className={`mt-2 flex h-12 items-center gap-3 rounded-xl border bg-surface-2 px-4 transition-colors duration-150 focus-within:border-pink/60 ${error ? "border-red/60" : "border-line-strong"}`}>
            <Link2 className="size-4 shrink-0 text-subtle" />
            <input
              id="yt"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-subtle"
              aria-invalid={!!error}
              aria-describedby="yt-help"
              inputMode="url"
              autoComplete="off"
            />
            <AnimatePresence>
              {vid ? (
                <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={SPRING_EVENT} className="grid size-6 place-items-center rounded-full bg-green">
                  <Check className="size-3.5 text-black" strokeWidth={3} />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <p id="yt-help" className={`mt-2 flex items-center gap-1.5 text-xs ${error ? "text-red" : "text-subtle"}`}>
            {error ? <AlertCircle className="size-3.5" /> : null}
            {error ?? `Videos up to ${plan.limits.ytMaxMinutes / 60}h on your plan. Live replays work too.`}
          </p>

          {/* Preview */}
          <AnimatePresence initial={false}>
            {meta && vid ? (
              <motion.div key={vid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, transition: { duration: T.quick } }} transition={{ duration: T.slow, ease: EASE_OUT }} className="overflow-hidden">
                <div className="mt-5 flex gap-4 rounded-xl border border-line bg-surface-2 p-3">
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" className="size-full object-cover" />
                    <span className="num absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px]">{fmtDur(meta.minutes)}</span>
                  </div>
                  <div className="min-w-0 py-1">
                    <div className="truncate text-sm font-medium">{meta.title}</div>
                    <div className="mt-1 text-xs text-subtle">youtu.be/{vid}</div>
                    {tooLong ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-orange"><AlertCircle className="size-3.5" />Longer than your {plan.limits.ytMaxMinutes / 60}h limit. <Link href="/dashboard/billing" className="underline underline-offset-2">Upgrade</Link></p>
                    ) : (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Sparkles className="size-3.5 text-pink" />About {Math.max(3, Math.round(meta.minutes / 12))} viral moments expected</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Options */}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Clip length">
              <Segmented value={length} onChange={setLength} options={[["auto", "Auto"], ["30", "< 30s"], ["60", "30–60s"], ["90", "60–90s"]]} id="len" />
            </Field>
            <Field label="Number of clips">
              <Segmented value={String(count)} onChange={(v) => setCount(Number(v))} options={[["5", "5"], ["10", "10"], ["15", "15"], ["20", "20"]]} id="cnt" />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Caption style" hint={`${plan.limits.captionStyles} of ${CAPTION_STYLES.length} unlocked`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CAPTION_STYLES.map((c, i) => {
                  const locked = i >= plan.limits.captionStyles;
                  const on = style === c.id;
                  return (
                    <button
                      key={c.id}
                      disabled={locked}
                      onClick={() => setStyle(c.id)}
                      aria-pressed={on}
                      className={`relative flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition-colors duration-150 ${on ? "border-pink/60 bg-pink/[0.06]" : "border-line bg-surface-2 hover:border-line-strong"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span className={c.box}><span className={`text-[13px] ${c.text}`}>{c.id === "karaoke" ? <>he had <em>ONE</em></> : "ONE JOB"}</span></span>
                      <span className="text-[11px] text-subtle">{c.name}</span>
                      {locked ? <Lock className="absolute right-1.5 top-1.5 size-3 text-subtle" /> : null}
                      {on ? <motion.span layoutId="style-ring" className="absolute inset-0 rounded-lg ring-1 ring-pink" transition={SPRING} /> : null}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Auto-post when ready</span>
              <span className="block text-xs text-subtle">Clips scoring 8.5+ post to your connected accounts. Others wait in the queue.</span>
            </span>
            <Toggle on={autopost} onChange={setAutopost} label="Auto-post when ready" />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-muted">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
            <span>I own this video or have the creator&apos;s permission to clip and repost it.</span>
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={{ duration: T.quick }}
              onClick={startJob}
              disabled={!canStart}
              className="inline-flex h-10 items-center gap-2 rounded-lg accent-bg px-5 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(255,46,136,0.9)] transition-opacity duration-150 disabled:opacity-30 disabled:shadow-none"
            >
              <Sparkles className="size-4" /> Start clipping
            </motion.button>
            <span className="text-xs text-subtle">
              {outOfImports ? "You've used all YouTube imports this month." : !vid ? "Paste a link to continue" : !rights ? "Confirm you have the rights to continue" : tooLong ? "Video is over your plan's length limit" : `Uses 1 of ${plan.limits.ytImports - used} imports left`}
            </span>
          </div>
        </section>

        {/* Right: jobs */}
        <aside>
          <SectionLabel>Recent videos</SectionLabel>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {jobs.map((j) => (
                <JobCard key={j.id} j={j} />
              ))}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </>
  );
}

function JobCard({ j }: { j: Job }) {
  const done = j.step >= STEPS.length;
  return (
    <motion.article layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: T.slow, ease: EASE_OUT, layout: SPRING }} className="panel p-4">
      <div className="flex gap-3">
        <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-black">
          {j.vid ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://i.ytimg.com/vi/${j.vid}/mqdefault.jpg`} alt="" className="size-full object-cover opacity-80" />
          ) : (
            <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_30%,rgba(255,46,136,0.35),transparent_70%)]"><Link2 className="size-4 text-subtle" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{j.title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle"><Clock className="size-3" /> {fmtDur(j.minutes)}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={done ? "done" : "run"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }} transition={{ duration: T.base, ease: EASE }} className="mt-1.5 text-xs">
              {done ? (
                <span className="inline-flex items-center gap-1.5 text-green"><Check className="size-3.5" /> {j.clips} clips ready</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-cyan"><Loader2 className="size-3.5 animate-spin" /> {STEPS[j.step]}…</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="h-1 overflow-hidden rounded-full bg-white/[0.06]" title={s}>
            <motion.span className={`block h-full rounded-full ${done ? "bg-green" : "accent-bg"}`} initial={false} animate={{ width: i < j.step ? "100%" : "0%" }} transition={{ duration: 1.2, ease: EASE }} />
          </li>
        ))}
      </ol>
      {done ? (
        <Link href="/dashboard/queue" className="mt-3 inline-flex items-center gap-1 text-xs text-muted transition-colors duration-150 hover:text-text">
          Review in Clip Queue <ArrowRight className="size-3" />
        </Link>
      ) : null}
    </motion.article>
  );
}

/* ---------- small form primitives ---------- */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
