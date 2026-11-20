"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Radio, Scissors, Square, AlertCircle, Check } from "lucide-react";
import { usePlan } from "@/lib/account";
import { addJob, refreshJobs, useJobs, type Job } from "@/lib/jobs";
import { Modal } from "@/components/Modal";
import { ClipGrid, ClipPlayer } from "@/components/ClipGrid";

type LiveStream = { id: string; login: string; name: string; title: string; viewers: number; startedAt: string; thumbnail: string; url: string };
type Platform = "twitch" | "kick";
type Result = { source: Platform; streams: LiveStream[] } | { source: "sample"; reason: string };
const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "twitch", label: "Twitch", color: "#9146ff" },
  { id: "kick", label: "Kick", color: "#53fc18" },
];

const fmtViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const since = (fromMs: number, toMs: number) => {
  const m = Math.max(0, Math.round((toMs - fromMs) / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

const PRIMARY =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-pink font-poster font-black uppercase text-black shadow-[3px_3px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none";

export default function LivePage() {
  const plan = usePlan();
  const { jobs, ready, offline } = useJobs();
  const [lists, setLists] = useState<Record<Platform, Result | null>>({ twitch: null, kick: null });
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [confirm, setConfirm] = useState<{ login: string; name: string; platform: Platform } | null>(null);
  const [rights, setRights] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [playing, setPlaying] = useState<{ job: string; file: string } | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const get = (p: Platform, url: string) => fetch(url).then((r) => r.json()).then((d: Result) => live && setLists((l) => ({ ...l, [p]: d }))).catch(() => {});
    const load = () => { get("twitch", "/api/streams"); get("kick", "/api/streams/kick"); };
    load();
    const t = setInterval(load, 60000);
    return () => { live = false; clearInterval(t); };
  }, []);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  const sessions = jobs.filter((j) => j.kind === "live");
  const active = sessions.filter((j) => j.status === "recording");
  const slots = plan.limits.liveSessions;
  const full = active.length >= slots;
  const clippingLogins = new Set(active.map((j) => `${j.platform ?? "twitch"}:${j.login}`));
  const data = lists[platform];
  const streams = data && data.source !== "sample" ? [...data.streams].sort((a, b) => b.viewers - a.viewers) : [];
  const pName = platform === "kick" ? "Kick" : "Twitch";

  const open = (login: string, name: string, p: Platform = platform) => {
    setError(null); setRights(false);
    setConfirm({ login, name, platform: /kick\.com\//i.test(login) ? "kick" : /twitch\.tv\//i.test(login) ? "twitch" : p });
  };
  const start = async () => {
    if (!confirm || !rights) return;
    setStarting(true); setError(null);
    try {
      const r = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login: confirm.login, platform: confirm.platform, rights }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't start.");
      addJob(d);
      setConfirm(null); setManual("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start.");
    } finally { setStarting(false); }
  };
  const stop = async (j: Job) => {
    await fetch(`/api/live/${j.id}/stop`, { method: "POST" }).catch(() => {});
    refreshJobs();
  };

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Clip while they stream</p>
          <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">
            Live <span className="text-pink">clipping.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Pick a live GTA 6 stream on Twitch or Kick. We record it in 10-minute chunks and cut the best moments into captioned Shorts while it&apos;s still live. New clips land about 10–15 minutes after they happen.</p>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-subtle">
          <span className="num block font-poster text-[28px] font-black leading-none text-text">{active.length}<span className="text-subtle"> / {slots}</span></span>
          live slots in use
          <div className="mt-1.5 flex gap-1">{Array.from({ length: slots }, (_, i) => <span key={i} className={`h-1.5 w-5 ${i < active.length ? "bg-pink" : "bg-white/10"}`} />)}</div>
        </div>
      </div>

      {offline ? (
        <p role="status" className="mb-5 flex items-center gap-2 border border-orange/40 bg-orange/[0.07] px-4 py-3 text-sm text-orange"><AlertCircle className="size-4 shrink-0" /> {offline}</p>
      ) : null}

      {/* Sessions */}
      <section className="mb-10" aria-label="Your live sessions">
        <SectionHead title="Your sessions" count={sessions.length} live={active.length > 0} />
        {!ready ? (
          <div className="h-32 animate-pulse bg-surface" />
        ) : sessions.length === 0 ? (
          <div className="border-2 border-white/85 bg-surface p-5 shadow-[6px_6px_0_var(--pink)] md:p-6">
            <div className="flex flex-wrap items-start gap-5">
              <span className="grid size-12 shrink-0 place-items-center border-2 border-black bg-pink"><Radio className="size-6 text-black" strokeWidth={2.5} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-poster text-[26px] font-black uppercase leading-none">No live sessions yet</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Pick a stream below and press <span className="text-text">Clip live</span>. Your {plan.name} plan clips up to {slots} stream{slots > 1 ? "s" : ""} at once.
                  Sessions stop by themselves when the stream ends, or after 8 hours.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">{sessions.map((j) => <Session key={j.id} j={j} now={now} onStop={() => stop(j)} onPlay={(file) => setPlaying({ job: j.id, file })} />)}</div>
        )}
      </section>

      {/* Pick a stream */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="live-ping size-2 rounded-full bg-red" />
        <h2 className="font-poster text-[28px] font-black uppercase leading-none">Live now</h2>
        <div role="tablist" aria-label="Platform" className="flex border border-white/20">
          {PLATFORMS.map((p) => {
            const n = lists[p.id]?.source === p.id ? (lists[p.id] as { streams: LiveStream[] }).streams.length : null;
            return (
              <button key={p.id} role="tab" aria-selected={platform === p.id} onClick={() => setPlatform(p.id)}
                className={`flex h-8 items-center gap-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-wider ${platform === p.id ? "bg-white text-black" : "text-muted hover:text-text"}`}>
                <span className="size-2" style={{ background: p.color }} /> {p.label}{n !== null ? <span className="num opacity-60">{n}</span> : null}
              </button>
            );
          })}
        </div>
        <span className="h-px flex-1 bg-line" />
        <form className="flex w-full gap-2 sm:w-auto" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) open(manual.trim(), manual.trim()); }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={`Or type a ${pName} channel or link`} className="h-9 w-full border border-white/20 bg-bg px-3 text-sm outline-none placeholder:text-subtle focus:border-pink sm:w-64" aria-label={`${pName} channel`} />
          <button type="submit" disabled={!manual.trim() || full} className={`${PRIMARY} h-9 px-3 text-[15px]`}>Clip</button>
        </form>
      </div>

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-video animate-pulse bg-surface" />)}</div>
      ) : data.source === "sample" ? (
        <p className="border border-line bg-surface px-4 py-6 text-sm text-subtle">The stream list is unavailable right now. You can still type a channel name above.</p>
      ) : streams.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-6 text-sm text-subtle">Nobody is streaming GTA 6 on {pName} right now. Check back soon.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.slice(0, 24).map((s) => {
            const on = clippingLogins.has(`${platform}:${s.login.toLowerCase()}`);
            return (
              <li key={s.id} className={`border bg-surface transition-colors duration-150 ${on ? "border-pink" : "border-line hover:border-white/30"}`}>
                <a href={s.url} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden bg-black">
                  {s.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumbnail.replace("{width}", "640").replace("{height}", "360")} alt="" className="size-full object-cover" loading="lazy" />
                  ) : null}
                  <span className="absolute left-2 top-2 bg-red px-1.5 font-mono text-[10px] font-bold uppercase text-white">Live</span>
                  <span className="num absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/75 px-1.5 text-[11px]"><Eye className="size-3" /> {fmtViewers(s.viewers)}</span>
                  {now ? <span className="num absolute bottom-2 right-2 bg-black/75 px-1.5 text-[11px]">{since(new Date(s.startedAt).getTime(), now)}</span> : null}
                </a>
                <div className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-subtle">{s.title}</p>
                  </div>
                  {on ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-pink"><span className="live-ping size-1.5 rounded-full bg-pink" /> Clipping</span>
                  ) : (
                    <button onClick={() => open(s.login, s.name, platform)} disabled={full} className={`${PRIMARY} h-9 shrink-0 px-3 text-[15px]`} title={full ? "All your live slots are in use" : undefined}>
                      <Scissors className="size-3.5" strokeWidth={2.5} /> Clip live
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {full ? <p className="mt-4 text-xs text-orange">All {slots} of your live slots are in use. Stop a session to start another{plan.id !== "studio" ? <>, or <Link href="/dashboard/billing" className="underline underline-offset-2">upgrade</Link> for more</> : null}.</p> : null}
      <p className="mt-4 text-xs text-subtle">Only clip streams you own or have the streamer&apos;s permission to repost.</p>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Clip this stream live?">
        {confirm ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">
              We&apos;ll record <span className="font-medium text-text">{confirm.name}</span> on {confirm.platform === "kick" ? "Kick" : "Twitch"} and cut its best moments into Shorts until the stream ends (max 8 hours). You can stop it anytime.
            </p>
            <p className="text-sm text-muted">Reposting someone else&apos;s stream without permission can get your accounts struck.</p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
              I own this channel or have the streamer&apos;s permission to clip and repost it.
            </label>
            {error ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirm(null)} className="h-10 border border-line-strong px-4 text-sm text-muted hover:text-text">Cancel</button>
              <button onClick={start} disabled={!rights || starting} className={`${PRIMARY} h-10 px-4 text-[17px]`}>
                {starting ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" strokeWidth={2.5} />} Start clipping
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

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

function Session({ j, now, onStop, onPlay }: { j: Job; now: number | null; onStop: () => void; onPlay: (file: string) => void }) {
  const recording = j.status === "recording";
  const chunks = j.chunks ?? 0, processed = j.processed ?? 0;
  const finishing = !recording && processed < chunks;
  const endMs = j.endedAt ? j.endedAt * 1000 : now ?? 0;
  const status = recording ? (j.stop ? "Stopping…" : "Recording") : finishing ? "Finishing last clips" : "Ended";
  const sub = recording
    ? chunks === 0 ? "Recording the first 10 minutes. First clips in about 12–15 min." : `${chunks} chunk${chunks > 1 ? "s" : ""} recorded · ${processed} clipped`
    : `${chunks} chunk${chunks === 1 ? "" : "s"} recorded · ${processed} clipped`;
  return (
    <article className={`border bg-surface p-4 ${recording ? "border-pink/60" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center border-2 border-black ${recording ? "bg-pink" : "bg-surface-3"}`}><Radio className={`size-5 ${recording ? "text-black" : "text-subtle"}`} strokeWidth={2.5} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium">{j.channel || j.login}</span>
            <span className="font-mono text-[10px] font-bold uppercase" style={{ color: j.platform === "kick" ? "#53fc18" : "#a970ff" }}>{j.platform === "kick" ? "Kick" : "Twitch"}</span>
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${recording ? "bg-pink text-black" : finishing ? "bg-white/10 text-text" : "bg-white/5 text-subtle"}`}>
              {recording ? <span className="size-1.5 animate-pulse rounded-full bg-black" /> : finishing ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} {status}
            </span>
            {now ? <span className="num text-xs text-subtle">{since(j.createdAt * 1000, endMs)}</span> : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-subtle">{j.title}</p>
          <p className="mt-1 text-xs text-muted">{sub}{j.clips.length ? ` · ${j.clips.length} clips` : ""}</p>
        </div>
        {recording && !j.stop ? (
          <button onClick={onStop} className="inline-flex h-9 items-center gap-2 border border-white/25 px-3 font-mono text-[11px] font-bold uppercase tracking-wider text-text hover:border-red hover:text-red">
            <Square className="size-3" fill="currentColor" /> Stop
          </button>
        ) : null}
      </div>
      {j.clips.length ? <div className="mt-4"><ClipGrid jobId={j.id} clips={[...j.clips].reverse()} onPlay={onPlay} /></div> : null}
    </article>
  );
}
