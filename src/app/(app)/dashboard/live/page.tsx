"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Film, Loader2, Radio, Scissors, Send, Square, AlertCircle, Check, BellRing, X, Zap } from "lucide-react";
import { usePlan } from "@/lib/account";
import { addJob, refreshJobs, useJobs, type Job } from "@/lib/jobs";
import { Modal } from "@/components/Modal";
import { ClipPlayer } from "@/components/ClipGrid";
import { TrimStudio } from "@/components/TrimStudio";
import { PLATFORM_META, useSocial, type SocialAccount } from "@/lib/social";

// Live clips score lower than video clips (10-minute chunks have fewer standout moments), so the bar sits lower here.
const SCORES = [{ v: 0.7, label: "7+ · only standout moments" }, { v: 0.6, label: "6+ · recommended" }, { v: 0.5, label: "5+ · more posts" }];
const GAPS = [{ v: 30, label: "every 30 min" }, { v: 60, label: "every hour" }, { v: 120, label: "every 2 hours" }, { v: 180, label: "every 3 hours" }];
type AutoForm = { on: boolean; accounts: string[]; minScore: number; gapMin: number; consent: boolean };

type LiveStream = { id: string; login: string; name: string; title: string; viewers: number; startedAt: string; thumbnail: string; url: string };
type Platform = "twitch" | "kick";
type Watch = { platform: Platform; login: string; autopost?: { accounts: string[] } | null; createdAt: number; lastStartAt: number; lastJob: string; lastError: string };
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
  const [confirm, setConfirm] = useState<{ login: string; name: string; platform: Platform; mode: "start" | "watch" } | null>(null);
  const [alsoWatch, setAlsoWatch] = useState(false);
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [watchInput, setWatchInput] = useState("");
  const [watchPlatform, setWatchPlatform] = useState<Platform>("twitch");
  const [rights, setRights] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [playing, setPlaying] = useState<{ job: string; file: string } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const studio = plan.limits.autopost;
  const social = useSocial(studio);
  const [auto, setAuto] = useState<AutoForm>({ on: false, accounts: [], minScore: 0.6, gapMin: 60, consent: false });

  useEffect(() => {
    let live = true;
    const get = (p: Platform, url: string) => fetch(url).then((r) => r.json()).then((d: Result) => live && setLists((l) => ({ ...l, [p]: d }))).catch(() => {});
    const load = () => { get("twitch", "/api/streams"); get("kick", "/api/streams/kick"); };
    load();
    const t = setInterval(load, 60000);
    return () => { live = false; clearInterval(t); };
  }, []);
  const loadWatches = () => fetch("/api/watch", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setWatches(d.watches ?? [])).catch(() => {});
  useEffect(() => {
    loadWatches();
    const t = setInterval(loadWatches, 60000);
    return () => clearInterval(t);
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

  const open = (login: string, name: string, p: Platform = platform, mode: "start" | "watch" = "start") => {
    setError(null); setRights(false); setAlsoWatch(false);
    setAuto((a) => ({ ...a, on: false, consent: false, accounts: social.accounts.filter((x) => x.active).map((x) => x.id) }));
    setConfirm({ login, name, mode, platform: /kick\.com\//i.test(login) ? "kick" : /twitch\.tv\//i.test(login) ? "twitch" : p });
  };
  const autopostBody = () => (studio && auto.on && auto.accounts.length ? { accounts: auto.accounts, minScore: auto.minScore, gapMin: auto.gapMin, consent: auto.consent } : undefined);
  const saveWatch = async (c: { login: string; platform: Platform }) => {
    const r = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login: c.login, platform: c.platform, rights, autopost: autopostBody() }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Couldn't save auto-start.");
    await loadWatches();
  };
  const removeWatch = async (w: Watch) => {
    setWatches((ws) => ws?.filter((x) => !(x.platform === w.platform && x.login === w.login)) ?? ws);
    await fetch(`/api/watch?platform=${w.platform}&login=${encodeURIComponent(w.login)}`, { method: "DELETE" }).catch(() => {});
    loadWatches();
  };
  const start = async () => {
    if (!confirm || !rights) return;
    setStarting(true); setError(null);
    try {
      if (confirm.mode === "watch") {
        await saveWatch(confirm);
        setConfirm(null); setWatchInput("");
        return;
      }
      const r = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        login: confirm.login, platform: confirm.platform, rights,
        autopost: autopostBody(),
      }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't start.");
      addJob(d);
      if (alsoWatch) await saveWatch(confirm).catch(() => {});
      setConfirm(null); setManual("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start.");
    } finally { setStarting(false); }
  };
  const autoOff = async (j: Job) => {
    await fetch(`/api/live/${j.id}/autopost`, { method: "POST" }).catch(() => {});
    refreshJobs();
  };
  const tiktokPicked = social.accounts.some((a) => a.platform === "tiktok" && auto.accounts.includes(a.id));
  const autoBlocked = studio && auto.on && (!auto.accounts.length || (tiktokPicked && !auto.consent));
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
                  Sessions stop by themselves when the stream ends, or after 3 hours.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">{sessions.map((j) => <Session key={j.id} j={j} now={now} accounts={social.accounts} onAutoOff={() => autoOff(j)} onStop={() => stop(j)} onPlay={(file) => setPlaying({ job: j.id, file })} />)}</div>
        )}
      </section>

      {/* Auto-start */}
      <section className="mb-10" aria-label="Auto-start">
        <SectionHead title="Auto-start" count={watches?.length} />
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Save the streamers you clip. We check every 2 minutes, and the moment one goes live, clipping starts by itself, with auto-post if you set it. Each auto-started session uses one of your {slots} live slot{slots > 1 ? "s" : ""}.
        </p>
        {watches && watches.length ? (
          <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {watches.map((w) => {
              const on = clippingLogins.has(`${w.platform}:${w.login}`);
              return (
                <li key={`${w.platform}:${w.login}`} className={`flex items-start gap-3 border bg-surface p-3 ${on ? "border-pink/60" : "border-line"}`}>
                  <span className="mt-1.5 size-2 shrink-0" style={{ background: w.platform === "kick" ? "#53fc18" : "#a970ff" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="truncate text-sm font-medium">{w.login}</span>
                      <span className="font-mono text-[10px] uppercase text-subtle">{w.platform === "kick" ? "Kick" : "Twitch"}</span>
                      {w.autopost?.accounts?.length ? <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-pink"><Send className="size-2.5" /> Auto-post</span> : null}
                    </div>
                    <p className={`mt-0.5 text-xs ${on ? "text-pink" : w.lastError ? "text-red" : "text-subtle"}`}>
                      {on ? "Clipping now" : w.lastError ? w.lastError : w.lastStartAt ? `Last auto-started ${new Date(w.lastStartAt * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Waiting for them to go live"}
                    </p>
                  </div>
                  <button onClick={() => removeWatch(w)} aria-label={`Stop auto-starting ${w.login}`} title="Remove" className="text-subtle hover:text-red"><X className="size-4" /></button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {watches && watches.length >= slots ? (
          <p className="text-xs text-subtle">You&apos;re auto-starting {slots} channel{slots > 1 ? "s" : ""}, your plan&apos;s limit. Remove one to add another{plan.id !== "studio" ? <>, or <Link href="/dashboard/billing" className="underline underline-offset-2">upgrade</Link></> : null}.</p>
        ) : (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (watchInput.trim()) open(watchInput.trim(), watchInput.trim(), watchPlatform, "watch"); }}>
            <select value={watchPlatform} onChange={(e) => setWatchPlatform(e.target.value as Platform)} aria-label="Platform"
              className="h-9 border border-white/20 bg-bg px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-text outline-none focus:border-pink">
              <option value="twitch">Twitch</option>
              <option value="kick">Kick</option>
            </select>
            <input value={watchInput} onChange={(e) => setWatchInput(e.target.value)} placeholder="Channel name or link" aria-label="Channel to auto-start"
              className="h-9 w-full border border-white/20 bg-bg px-3 text-sm outline-none placeholder:text-subtle focus:border-pink sm:w-64" />
            <button type="submit" disabled={!watchInput.trim()} className={`${PRIMARY} h-9 px-3 text-[15px]`}><BellRing className="size-3.5" strokeWidth={2.5} /> Auto-start</button>
          </form>
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

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.mode === "watch" ? "Auto-start this channel?" : "Clip this stream live?"}>
        {confirm ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">
              {confirm.mode === "watch"
                ? <>Every time <span className="font-medium text-text">{confirm.name}</span> goes live on {confirm.platform === "kick" ? "Kick" : "Twitch"}, we&apos;ll start clipping within about 2 minutes, if you have a free live slot. Each session runs until the stream ends (max 3 hours).</>
                : <>We&apos;ll record <span className="font-medium text-text">{confirm.name}</span> on {confirm.platform === "kick" ? "Kick" : "Twitch"} and cut its best moments into Shorts until the stream ends (max 3 hours). You can stop it anytime.</>}
            </p>
            <p className="text-sm text-muted">Reposting someone else&apos;s stream without permission can get your accounts struck.</p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
              I own this channel or have the streamer&apos;s permission to clip and repost it.
            </label>
            {confirm.mode === "start" && !(watches ?? []).some((w) => w.platform === confirm.platform && w.login === confirm.login.toLowerCase()) && (watches?.length ?? 0) < slots ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={alsoWatch} onChange={(e) => setAlsoWatch(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
                <span><Zap className="mr-1 inline size-3.5 text-pink" />Also auto-start this channel every time it goes live</span>
              </label>
            ) : null}
            <AutoPostForm studio={studio} accounts={social.accounts} ready={social.ready} value={auto} onChange={setAuto} tiktok={tiktokPicked} />
            {error ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirm(null)} className="h-10 border border-line-strong px-4 text-sm text-muted hover:text-text">Cancel</button>
              <button onClick={start} disabled={!rights || starting || autoBlocked} className={`${PRIMARY} h-10 px-4 text-[17px]`}>
                {starting ? <Loader2 className="size-4 animate-spin" /> : confirm.mode === "watch" ? <BellRing className="size-4" strokeWidth={2.5} /> : <Scissors className="size-4" strokeWidth={2.5} />} {confirm.mode === "watch" ? "Save auto-start" : "Start clipping"}
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

function AutoPostForm({ studio, accounts, ready, value, onChange, tiktok }: { studio: boolean; accounts: SocialAccount[]; ready: boolean; value: AutoForm; onChange: (v: AutoForm) => void; tiktok: boolean }) {
  if (!studio) {
    return <p className="border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-muted"><Send className="mr-1 inline size-3" /> Want the best clips posted for you while the stream runs? <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Auto-post is on Studio.</Link></p>;
  }
  const set = (p: Partial<AutoForm>) => onChange({ ...value, ...p });
  const usable = accounts.filter((a) => a.active);
  return (
    <div className={`border px-3 py-3 ${value.on ? "border-pink/60 bg-pink/[0.04]" : "border-white/15"}`}>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={value.on} onChange={(e) => set({ on: e.target.checked })} className="size-4 accent-[var(--pink)]" />
        <span className="font-medium">Auto-post the best clips</span>
        <span className="text-xs text-subtle">while the stream runs</span>
      </label>
      {value.on ? (
        !ready ? <p className="mt-3 text-xs text-subtle">Loading your accounts…</p>
        : !usable.length ? <p className="mt-3 text-xs text-muted">No accounts connected yet. <Link href="/dashboard/integrations" className="text-text underline underline-offset-2">Connect one</Link> first.</p>
        : (
          <div className="mt-3 space-y-3">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {usable.map((a) => {
                const on = value.accounts.includes(a.id), m = PLATFORM_META[a.platform];
                return (
                  <li key={a.id}>
                    <label className={`flex cursor-pointer items-center gap-2 border px-2 py-1.5 text-xs ${on ? "border-pink" : "border-line"}`}>
                      <input type="checkbox" checked={on} onChange={() => set({ accounts: on ? value.accounts.filter((x) => x !== a.id) : [...value.accounts, a.id] })} className="size-3.5 accent-[var(--pink)]" />
                      <span className="grid size-5 shrink-0 place-items-center text-[10px] font-bold text-white" style={{ background: m.color }}>{m.letter}</span>
                      <span className="truncate">{a.displayName || a.username}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-subtle">Post clips scoring
                <select value={value.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} className="mt-1 h-9 w-full border border-white/20 bg-bg px-2 text-sm text-text outline-none focus:border-pink">
                  {SCORES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-subtle">At most
                <select value={value.gapMin} onChange={(e) => set({ gapMin: Number(e.target.value) })} className="mt-1 h-9 w-full border border-white/20 bg-bg px-2 text-sm text-text outline-none focus:border-pink">
                  {GAPS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
            </div>
            {tiktok ? (
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted">
                <input type="checkbox" checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 size-3.5 accent-[var(--pink)]" />
                <span>I agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline underline-offset-2">Music Usage Confirmation</a> for these posts. They post publicly.</span>
              </label>
            ) : null}
            <p className="text-[11px] text-subtle">Each post gets AI-written text and goes to every account you ticked. If no clip clears the bar for a while, we still post the best decent one so your pages don&apos;t go quiet. Posting less often keeps your accounts safe from spam limits.</p>
          </div>
        )
      ) : null}
    </div>
  );
}

function AutoPostLine({ j, accounts, onOff }: { j: Job; accounts: SocialAccount[]; onOff: () => void }) {
  const a = j.autopost;
  const last = j.autopostLast;
  if (!a && !last) return null;
  const names = a ? a.accounts.map((id) => accounts.find((x) => x.id === id)?.displayName).filter(Boolean) : [];
  const expired = a ? accounts.filter((x) => x.needsReconnect && a.accounts.includes(x.id)) : [];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs">
      <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider ${a ? "text-pink" : "text-subtle"}`}><Send className="size-3" /> Auto-post {a ? "on" : "off"}</span>
      {a ? <span className="text-muted">{names.length ? names.join(", ") : `${a.accounts.length} account${a.accounts.length > 1 ? "s" : ""}`} · score {(a.minScore * 10).toFixed(1)}+ · {GAPS.find((g) => g.v === a.gapMin)?.label ?? `every ${a.gapMin} min`}</span> : null}
      {last ? <span className={last.ok ? "text-green" : "text-red"}>{last.ok ? `Last sent: ${last.title}` : `Last post failed: ${last.error ?? "unknown error"}`}</span> : null}
      {a && expired.length ? (
        <span className="inline-flex items-center gap-2 text-orange">
          Your {expired.map((x) => PLATFORM_META[x.platform].name).join(" and ")} connection expired. Auto-post to it is paused.
          <Link href="/dashboard/integrations" className="font-semibold text-pink hover:underline">Reconnect it</Link>
        </span>
      ) : null}
      {a && j.status === "recording" ? <button onClick={onOff} className="ml-auto font-mono text-[10.5px] font-bold uppercase tracking-wider text-muted hover:text-red">Turn off</button> : null}
    </div>
  );
}

function Session({ j, now, accounts, onAutoOff, onStop, onPlay }: { j: Job; now: number | null; accounts: SocialAccount[]; onAutoOff: () => void; onStop: () => void; onPlay: (file: string) => void }) {
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
            {j.auto ? <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-subtle"><Zap className="size-3" /> Auto-started</span> : null}
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
      {recording && !j.clips.length ? (
        <div className="mt-4 hidden md:block">
          <TrimStudio live title={j.title || j.channel || j.login || "Live stream"} channel={j.channel || j.login}
            step={chunks === 0 ? "Recording the first 10 minutes" : "Finding moments"} stepIndex={chunks === 0 ? 0 : 2}
            steps={["Recording", "Transcribing", "Finding moments", "Rendering"]} moments={[]} total={0} />
        </div>
      ) : null}
      <AutoPostLine j={j} accounts={accounts} onOff={onAutoOff} />
      {j.clips.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <div className="flex gap-1.5">
            {[...j.clips].reverse().slice(0, 5).map((c) => (
              <button key={c.file} onClick={() => onPlay(c.file)} aria-label={`Play ${c.title}`} className="relative aspect-[9/16] w-11 overflow-hidden border border-line bg-black hover:border-pink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/import/${j.id}/${c.thumb}${c.v ? `?v=${c.v}` : ""}`} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
          <Link href={`/dashboard/clips?job=${j.id}`} className="inline-flex h-9 items-center gap-2 border-2 border-black bg-pink px-3 font-poster text-[15px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5">
            <Film className="size-4" strokeWidth={2.5} /> {j.clips.length} clip{j.clips.length === 1 ? "" : "s"} · post or save
          </Link>
        </div>
      ) : null}
    </article>
  );
}
