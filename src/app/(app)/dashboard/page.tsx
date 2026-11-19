"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Eye, Flame, Scissors, Radio, Rows3, Smartphone, Loader2, CheckCircle2, Clock, Square, ExternalLink } from "lucide-react";
import { useLiveSim } from "@/lib/live";
import { ago, fmtViewers, type Moment, type Platform, type Stream } from "@/lib/mock";
import { usePlan } from "@/lib/account";
import { Modal } from "@/components/Modal";
import { SceneArt } from "@/components/SceneArt";
import { LiveThumb } from "@/components/LiveThumb";
import { Avatar, HypeBar, HypeGauge, LiveBadge, PageTitle, PermissionBadge, PlatformBadge, SectionLabel, Sparkline, Waveform } from "@/components/ui";
import { AnimatedNumber, EASE, EASE_OUT, MomentToasts, RadarSweep, SPRING, SPRING_EVENT, T } from "@/components/motion";

const byHype = (a: Stream, b: Stream) => b.hype - a.hype;
const byViewers = (a: Stream, b: Stream) => b.viewers - a.viewers;
const fmtInt = (v: number) => Math.round(v).toString();
const tintOf = (s: Stream) => s.scene[0];
const RERANK_MS = 6000;

type Filter = "all" | Platform;

export default function RadarPage() {
  const plan = usePlan();
  // Streams this customer is clipping right now (limited by plan.liveSessions).
  const [active, setActive] = useState<Set<string>>(() => new Set(["s1", "s2"]));
  const { streams, moments, now, source } = useLiveSim(active);
  const [view, setView] = useState<"table" | "feed">("table");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmFor, setConfirmFor] = useState<Stream | null>(null);
  const [rightsOk, setRightsOk] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  const start = (s: Stream, confirmed = false) => {
    if (active.has(s.id)) return;
    if (active.size >= plan.limits.liveSessions) return setLimitHit(true);
    if (s.permission === "discovery" && !confirmed) {
      setRightsOk(false);
      return setConfirmFor(s);
    }
    setActive((a) => new Set(a).add(s.id));
    setConfirmFor(null);
  };
  const stop = (s: Stream) =>
    setActive((a) => {
      const n = new Set(a);
      n.delete(s.id);
      return n;
    });
  const toggle = (s: Stream) => (active.has(s.id) ? stop(s) : start(s));

  // Re-rank on a slow cadence so rows glide occasionally instead of jittering every tick (1/3 rule).
  // Real Twitch data: rank by real viewers until the chat-based hype detector ships (hype is simulated for now).
  const streamsRef = useRef(streams);
  const rankRef = useRef(byHype);
  useEffect(() => {
    streamsRef.current = streams;
    rankRef.current = source.kind === "twitch" ? byViewers : byHype;
  });
  const [order, setOrder] = useState<string[]>(() => [...streams].sort(byHype).map((s) => s.id));
  useEffect(() => {
    const t = setInterval(() => setOrder([...streamsRef.current].sort(rankRef.current).map((s) => s.id)), RERANK_MS);
    return () => clearInterval(t);
  }, []);
  // Keep the slow-changing rank order, but show streams that arrived since the last re-rank immediately.
  const rankFn = source.kind === "twitch" ? byViewers : byHype;
  const ranked = [
    ...order.map((id) => streams.find((s) => s.id === id)!).filter(Boolean),
    ...streams.filter((s) => !order.includes(s.id)).sort(rankFn),
  ];
  const sorted = filter === "all" ? ranked : ranked.filter((s) => s.platform === filter);
  // Spotlight: first spiking stream in rank order (stable while it stays hot), else the top-ranked stream.
  const spotlight = source.kind === "twitch" ? sorted[0] : sorted.find((s) => s.hype >= 80) ?? sorted[0];
  const counts = { all: streams.length, twitch: 0, kick: 0, youtube: 0 } as Record<Filter, number>;
  streams.forEach((s) => counts[s.platform]++);
  const activeStreams = streams.filter((s) => active.has(s.id));

  // Toasts for moments detected after page load.
  const [toasts, setToasts] = useState<{ id: string; channel: string; title: string; score: number }[]>([]);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!moments.length) return;
    if (!seen.current) {
      seen.current = new Set(moments.map((m) => m.id));
      return;
    }
    const fresh = moments.filter((m) => !seen.current!.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => seen.current!.add(m.id));
    const add = fresh.map(({ id, channel, title, score }) => ({ id, channel, title, score }));
    const show = setTimeout(() => setToasts((t) => [...add, ...t].slice(0, 2)), 0);
    setTimeout(() => setToasts((t) => t.filter((x) => !add.some((a) => a.id === x.id))), 4000);
    return () => clearTimeout(show);
  }, [moments]);

  const totalViewers = streams.reduce((s, x) => s + x.viewers, 0);
  const spiking = streams.filter((s) => s.hype >= 80).length;
  const clips = streams.reduce((s, x) => s + x.clipsToday, 0);
  const avgHype = streams.reduce((s, x) => s + x.hype, 0) / streams.length;

  return (
    <>
      <PageTitle
        title="Live Radar"
        art="sunset"
        sub={source.kind === "twitch" ? `Grand Theft Auto VI · ${source.note} · ranked by viewers · hype is a preview until chat analysis ships` : "Grand Theft Auto VI · sample streams (connect Twitch to go live)"}
        icon={<RadarSweep />}
        right={
          <div className="flex h-9 items-center rounded-lg border border-line bg-surface p-0.5 text-xs" role="tablist" aria-label="View">
            {([["table", Rows3, "Table"], ["feed", Smartphone, "Feed"]] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`relative flex h-full items-center gap-1.5 rounded-md px-3 transition-colors duration-150 ${view === v ? "text-text" : "text-muted hover:text-text"}`}
              >
                {view === v ? <motion.span layoutId="view-pill" className="absolute inset-0 -z-10 rounded-md bg-white/[0.08]" /> : null}
                <Icon className="size-3.5" strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI strip */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: T.slow, ease: EASE_OUT }}
        className="panel mb-6 grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line lg:[&>*:nth-child(-n+2)]:border-b-0"
      >
        <Kpi icon={Radio} label="Live streams" value={streams.length} trend={[3, 4, 4, 5, 6, 6, 7, 8]} />
        <Kpi icon={Eye} label="Viewers watched" value={totalViewers} format={fmtViewers} trend={[40, 52, 61, 70, 88, 104, 121, 137]} />
        <Kpi icon={Flame} label="Spiking now" value={spiking} hot={spiking > 0} note={`avg hype ${Math.round(avgHype)}`} />
        <Kpi icon={Scissors} label="Clips today" value={clips} trend={[4, 7, 11, 15, 19, 26, 31, clips]} />
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {view === "table" ? (
              <motion.div key="table" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: T.quick } }} transition={{ duration: T.base, ease: EASE }}>
                <SessionBar active={activeStreams} max={plan.limits.liveSessions} planName={plan.name} onStop={stop} />
                {spotlight ? <Spotlight s={spotlight} clipping={active.has(spotlight.id)} onToggle={() => toggle(spotlight)} /> : null}
                <SectionLabel
                  right={
                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by platform">
                      {(["all", "twitch", "kick", "youtube"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          aria-pressed={filter === f}
                          className={`relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors duration-150 ${filter === f ? "text-text" : "text-muted hover:text-text"}`}
                        >
                          {filter === f ? <motion.span layoutId="filter-pill" className="absolute inset-0 -z-10 rounded-md bg-white/[0.08] ring-1 ring-inset ring-white/[0.08]" /> : null}
                          {f === "all" ? "All" : PLATFORM_NAME[f]}
                          <span className="num text-subtle">{counts[f]}</span>
                        </button>
                      ))}
                    </div>
                  }
                >
                  Live GTA 6 streams
                </SectionLabel>
                <StreamTable streams={sorted} active={active} onToggle={toggle} />
              </motion.div>
            ) : (
              <motion.div key="feed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: T.quick } }} transition={{ duration: T.slow, ease: EASE_OUT }}>
                <PhoneFeed streams={sorted} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <MomentsFeed moments={moments} now={now} />
      </div>

      <MomentToasts toasts={toasts} />

      {/* Rights check before clipping a stream the customer doesn't own */}
      <Modal open={!!confirmFor} onClose={() => setConfirmFor(null)} title="Start clipping this stream?">
        {confirmFor ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <Avatar name={confirmFor.channel} tint={tintOf(confirmFor)} size={36} live />
              <div className="min-w-0">
                <div className="text-sm font-medium">{confirmFor.channel}</div>
                <div className="truncate text-xs text-subtle">{PLATFORM_NAME[confirmFor.platform]} · {confirmFor.url}</div>
              </div>
            </div>
            <p className="text-sm text-muted">
              Reposting someone else&apos;s stream without permission can get your social accounts struck. Only clip streams you own, or ones whose streamer allows clipping (for example a paid clipping campaign).
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm">
              <input type="checkbox" checked={rightsOk} onChange={(e) => setRightsOk(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
              I have permission from this streamer to clip and repost their content.
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirmFor(null)} className="h-9 rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors duration-150 hover:text-text">Cancel</button>
              <button
                disabled={!rightsOk}
                onClick={() => start(confirmFor, true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg accent-bg px-4 text-sm font-medium text-white transition-opacity duration-150 disabled:opacity-30"
              >
                <Scissors className="size-4" /> Start clipping
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Plan limit */}
      <Modal open={limitHit} onClose={() => setLimitHit(false)} title="All live slots in use">
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted">
            Your <span className="text-text">{plan.name}</span> plan clips <span className="num text-text">{plan.limits.liveSessions}</span> live streams at the same time. Stop one of them, or upgrade to clip more at once.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setLimitHit(false)} className="h-9 rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors duration-150 hover:text-text">Got it</button>
            <Link href="/dashboard/billing" className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90">See plans</Link>
          </div>
        </div>
      </Modal>
    </>
  );
}

const PLATFORM_NAME: Record<Platform, string> = { twitch: "Twitch", kick: "Kick", youtube: "YouTube" };

/** Shows the customer's active live clipping sessions vs. their plan's slot count. */
function SessionBar({ active, max, planName, onStop }: { active: Stream[]; max: number; planName: string; onStop: (s: Stream) => void }) {
  return (
    <div className="panel mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="relative grid size-8 place-items-center rounded-lg bg-white/[0.05] ring-1 ring-inset ring-white/[0.06]">
          <Scissors className="size-4 text-muted" strokeWidth={1.75} />
          {active.length ? <span className="live-ping absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red" /> : null}
        </span>
        <div>
          <div className="text-sm font-medium">
            Clipping <span className="num">{active.length}</span> of <span className="num">{max}</span> live slots
          </div>
          <div className="text-xs text-subtle">{planName} plan · pick any stream below to start</div>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <motion.span key={i} className="h-1.5 w-7 rounded-full" animate={{ backgroundColor: i < active.length ? "rgba(255,46,136,1)" : "rgba(255,255,255,0.08)" }} transition={{ duration: T.base, ease: EASE }} />
        ))}
      </div>
      <div className="flex flex-1 flex-wrap justify-end gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {active.map((s) => (
            <motion.span
              key={s.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: T.quick } }}
              transition={SPRING}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface-2 pl-1.5 pr-1 text-xs"
            >
              <Avatar name={s.channel} tint={tintOf(s)} size={20} />
              {s.channel}
              <button onClick={() => onStop(s)} className="grid size-6 place-items-center rounded-md text-subtle transition-colors duration-150 hover:bg-white/[0.06] hover:text-text" aria-label={`Stop clipping ${s.channel}`}>
                <Square className="size-3" fill="currentColor" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Start / stop clipping button used in rows and the spotlight. */
function ClipButton({ clipping, onClick, size = "sm" }: { clipping: boolean; onClick: () => void; size?: "sm" | "md" }) {
  const h = size === "md" ? "h-9 px-3.5 text-sm" : "h-8 px-3 text-xs";
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: T.quick }}
      aria-pressed={clipping}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 ${h} ${
        clipping ? "bg-pink/15 text-pink ring-1 ring-inset ring-pink/30 hover:bg-pink/20" : "bg-white text-black hover:bg-white/90"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={clipping ? "on" : "off"} className="inline-flex items-center gap-1.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }} transition={{ duration: T.quick }}>
          {clipping ? (
            <>
              <span className="live-ping size-1.5 rounded-full bg-pink" /> Clipping
            </>
          ) : (
            <>
              <Scissors className="size-3.5" /> Start clipping
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */

function Kpi({ icon: Icon, label, value, format = fmtInt, trend, note, hot }: { icon: React.ElementType; label: string; value: number; format?: (v: number) => string; trend?: number[]; note?: string; hot?: boolean }) {
  const max = trend ? Math.max(...trend) : 1;
  return (
    <div className="relative p-5">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className={`size-3.5 ${hot ? "text-pink" : ""}`} strokeWidth={1.75} /> {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className={`num text-[28px] font-semibold leading-none ${hot ? "accent-text" : ""}`}>
          <AnimatedNumber value={value} format={format} />
        </div>
        {trend ? (
          <div className="flex h-7 items-end gap-[3px]" aria-hidden>
            {trend.map((v, i) => (
              <motion.span
                key={i}
                className={`w-1 rounded-full ${i === trend.length - 1 ? "bg-white/70" : "bg-white/15"}`}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(12, (v / max) * 100)}%` }}
                transition={{ duration: T.slow, ease: EASE_OUT, delay: 0.15 + i * 0.03 }}
              />
            ))}
          </div>
        ) : note ? (
          <span className="text-xs text-subtle">{note}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Spotlight({ s, clipping, onToggle }: { s: Stream; clipping: boolean; onToggle: () => void }) {
  const hot = s.hype >= 80;
  return (
    <section className={`panel relative mb-6 overflow-hidden ${hot ? "glow-border" : ""}`} aria-label="Hottest stream">
      {/* ambient tint follows the spotlight stream */}
      <motion.div
        className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full"
        animate={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${tintOf(s)} 22%, transparent), transparent)` }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: T.quick } }}
          transition={{ duration: T.slow, ease: EASE_OUT }}
          className="relative grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:p-6"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Spotlight</span>
              <LiveBadge viewers={fmtViewers(s.viewers)} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={s.channel} tint={tintOf(s)} size={44} live />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="font-display text-xl font-semibold tracking-[-0.01em]">{s.channel}</h2>
                  <PlatformBadge platform={s.platform} />
                  <PermissionBadge permission={s.permission} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{s.title}</p>
                <a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-subtle transition-colors duration-150 hover:text-text">
                  {s.url} <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            {s.thumbnail ? (
              <a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="group relative mt-5 block overflow-hidden rounded-xl border border-line" aria-label={`Watch ${s.channel} live on Twitch`}>
                <LiveThumb src={s.thumbnail} alt={`Live GTA 6 gameplay from ${s.channel}`} className="aspect-video w-full transition-transform duration-500 group-hover:scale-[1.02]" />
                <span className="absolute left-3 top-3"><LiveBadge viewers={fmtViewers(s.viewers)} /></span>
                <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white/85 backdrop-blur">Live preview · twitch.tv/{s.url.split("/")[1]}</span>
              </a>
            ) : null}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-subtle">
                <span>Chat activity · last 30s</span>
                <span className="num text-muted">{s.chatRate} msg/s</span>
              </div>
              <Waveform data={s.history} hot={hot} tint={tintOf(s)} className={s.thumbnail ? "h-14" : "h-24"} />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
              <Stat icon={Eye} label="Viewers" value={<AnimatedNumber value={s.viewers} format={fmtViewers} />} />
              <Stat icon={Clock} label="Uptime" value={s.uptime} />
              <Stat icon={Scissors} label="Clips today" value={s.clipsToday} />
            </dl>
          </div>

          <div className="flex flex-row items-center gap-5 md:flex-col md:justify-center md:border-l md:border-line md:pl-6">
            <HypeGauge value={s.hype} size={132}>
              <div className="text-center">
                <motion.div key={hot ? "h" : "c"} initial={{ scale: hot ? 1.25 : 1 }} animate={{ scale: 1 }} transition={SPRING_EVENT} className={`num text-[34px] font-semibold leading-none ${hot ? "accent-text" : ""}`}>
                  <AnimatedNumber value={s.hype} />
                </motion.div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-subtle">Hype</div>
              </div>
            </HypeGauge>
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={!clipping ? "off" : hot ? "clip" : "watch"}
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: T.quick } }}
                  transition={hot && clipping ? SPRING_EVENT : { duration: T.base, ease: EASE }}
                >
                  {clipping && hot ? (
                    <span className="inline-flex items-center gap-2 rounded-lg accent-bg px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,46,136,0.8)]">
                      <Loader2 className="size-3.5 animate-spin" /> Making a clip
                    </span>
                  ) : clipping ? (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-muted ring-1 ring-inset ring-white/[0.06]">
                      <span className="live-dot size-1.5 rounded-full bg-green" /> Watching for spikes
                    </span>
                  ) : (
                    <span className="text-xs text-subtle">{hot ? "Spiking — not being clipped" : "Not clipping this stream"}</span>
                  )}
                </motion.div>
              </AnimatePresence>
              <ClipButton clipping={clipping} onClick={onToggle} size="md" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-subtle"><Icon className="size-3.5" strokeWidth={1.75} />{label}</dt>
      <dd className="num mt-1 font-medium">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const COLS = "lg:grid-cols-[24px_minmax(180px,1.6fr)_60px_minmax(100px,1fr)_minmax(60px,0.6fr)_128px]";

function StreamTable({ streams, active, onToggle }: { streams: Stream[]; active: Set<string>; onToggle: (s: Stream) => void }) {
  return (
    <div className="panel overflow-hidden" role="table" aria-label="Live streams">
      <div role="row" className={`hidden ${COLS} items-center gap-3 border-b border-line px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-subtle lg:grid`}>
        <span role="columnheader">#</span>
        <span role="columnheader">Stream</span>
        <span role="columnheader" className="text-right">Viewers</span>
        <span role="columnheader">Hype</span>
        <span role="columnheader">Activity</span>
        <span role="columnheader" className="text-right">Action</span>
      </div>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } } }}>
        {streams.map((s, i) => (
          <Row key={s.id} s={s} rank={i + 1} clipping={active.has(s.id)} onToggle={() => onToggle(s)} />
        ))}
      </motion.div>
      {!streams.length ? <p className="px-4 py-10 text-center text-sm text-subtle">No live streams on this platform right now.</p> : null}
    </div>
  );
}

function Row({ s, rank, clipping, onToggle }: { s: Stream; rank: number; clipping: boolean; onToggle: () => void }) {
  const hot = s.hype >= 80;
  return (
    <motion.div
      layout="position"
      role="row"
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: T.base, ease: EASE_OUT } } }}
      transition={{ layout: SPRING }}
      className={`relative grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 transition-colors duration-250 last:border-b-0 hover:bg-white/[0.025] ${COLS} ${clipping ? "bg-pink/[0.035]" : ""}`}
    >
      <AnimatePresence>
        {clipping ? (
          <motion.span
            className="absolute inset-y-2 left-0 w-[3px] origin-center rounded-r-full accent-bg"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0, transition: { duration: T.quick } }}
            transition={SPRING_EVENT}
          />
        ) : null}
      </AnimatePresence>
      <span role="cell" className="num text-sm text-subtle">{rank}</span>
      <div role="cell" className="flex min-w-0 items-center gap-3">
        {s.thumbnail ? (
          <LiveThumb src={s.thumbnail} alt={`${s.channel} live`} className="h-9 w-16 shrink-0 rounded-md ring-1 ring-white/10" />
        ) : (
          <Avatar name={s.channel} tint={tintOf(s)} size={32} />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium" title={s.channel}>{s.channel}</span>
            {hot ? (
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_EVENT} className="inline-flex items-center gap-1 rounded accent-bg px-1.5 py-px text-[10px] font-semibold text-white">
                <Flame className="size-2.5" /> SPIKE
              </motion.span>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs">
            <PlatformBadge platform={s.platform} />
            <a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="hidden truncate text-subtle transition-colors duration-150 hover:text-text sm:inline" title={s.url}>
              {s.url}
            </a>
          </div>
        </div>
      </div>
      <span role="cell" className="num hidden text-right text-sm lg:block"><AnimatedNumber value={s.viewers} format={fmtViewers} /></span>
      <div role="cell" className="flex items-center gap-3">
        <div className="hidden w-full lg:block"><HypeBar value={s.hype} /></div>
        <span className={`num w-7 text-right text-sm font-medium ${hot ? "text-pink" : ""}`}>{Math.round(s.hype)}</span>
      </div>
      <div role="cell" className="hidden lg:block">
        <Sparkline data={s.history} className="h-7 w-full" />
      </div>
      <div role="cell" className="col-span-3 flex justify-end lg:col-span-1">
        <ClipButton clipping={clipping} onClick={onToggle} />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

/** Vertical swipe feed — mirrors the Twitch mobile "Live" tab from the reference recording. */
function PhoneFeed({ streams }: { streams: Stream[] }) {
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-[2.4rem] border border-line-strong bg-black p-1.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="overflow-hidden rounded-[2rem] bg-[#0b0b0e]">
          <div className="flex items-center justify-center gap-6 pb-3 pt-4 text-[13px]">
            <span className="text-subtle">Following</span>
            <span className="relative font-medium">Live<span className="absolute -bottom-1.5 left-0 right-0 mx-auto h-0.5 w-5 rounded-full accent-bg" /></span>
            <span className="text-subtle">Clips</span>
          </div>
          <div className="h-[600px] snap-y snap-mandatory overflow-y-auto">
            {streams.map((s) => {
              const hot = s.hype >= 80;
              return (
                <div key={s.id} className="relative flex h-[600px] snap-start flex-col justify-end overflow-hidden p-5">
                  {s.thumbnail ? (
                    <LiveThumb src={s.thumbnail} alt={`${s.channel} live`} className="absolute inset-0 h-full w-full opacity-80" />
                  ) : (
                    <SceneArt variant={(["sunset", "dusk", "night", "neon"] as const)[Number(s.id.slice(1)) % 4]} seed={Number(s.id.slice(1)) * 7} className="absolute inset-0 h-full w-full opacity-60" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/90" />
                  <div className="absolute inset-x-6 top-[22%]">
                    <Waveform data={s.history} hot={hot} tint={tintOf(s)} className="h-40" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.channel} tint={tintOf(s)} size={40} live />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="font-medium">{s.channel}</span><PermissionBadge permission={s.permission} /></div>
                        <LiveBadge viewers={fmtViewers(s.viewers)} />
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted">{s.title}</p>
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-[11px] text-subtle"><span>Hype</span><span className="num">{Math.round(s.hype)}</span></div>
                      <HypeBar value={s.hype} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-subtle">Scroll inside the phone to swipe streams</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MomentsFeed({ moments, now }: { moments: Moment[]; now: number | null }) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: T.slow, ease: EASE_OUT, delay: 0.1 }}
      className="panel flex flex-col xl:sticky xl:top-20 xl:max-h-[calc(100vh-6.5rem)]"
      aria-label="Viral moments"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
        <h2 className="text-sm font-medium">Viral moments</h2>
        <span className="num rounded-md bg-white/[0.06] px-1.5 text-[11px] text-muted">{moments.length}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-subtle"><span className="live-ping size-1.5 rounded-full bg-red" />Live</span>
      </div>
      <ol className="relative overflow-y-auto overflow-x-hidden px-4 py-2" aria-live="polite">
        <span className="absolute bottom-4 left-[23px] top-4 w-px bg-line" aria-hidden />
        <AnimatePresence initial={false}>
          {moments.map((m) => (
            <motion.li
              key={m.id}
              layout="position"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: T.quick } }}
              transition={{ duration: T.slow, ease: EASE_OUT, layout: SPRING }}
              className="relative flex gap-3 py-3"
            >
              <StatusDot s={m.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-text">{m.channel}</span>
                  <span className="text-subtle">{ago(m.at, now)}</span>
                  <span className={`num ml-auto font-semibold ${m.score >= 9 ? "accent-text" : "text-muted"}`}>{m.score.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-[13.5px] leading-snug">{m.title}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-subtle">
                  <span className="truncate">{m.trigger}</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={m.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: T.quick } }} transition={{ duration: T.base, ease: EASE }}>
                      <StatusLabel s={m.status} />
                    </motion.span>
                  </AnimatePresence>
                </div>
                {m.status !== "ready" ? (
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full accent-bg"
                      initial={{ width: "0%" }}
                      animate={{ width: m.status === "detected" ? "35%" : "100%" }}
                      transition={{ duration: m.status === "detected" ? 2.5 : 4.5, ease: "linear" }}
                    />
                  </div>
                ) : null}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </motion.aside>
  );
}

function StatusDot({ s }: { s: Moment["status"] }) {
  const cls = s === "ready" ? "bg-green" : s === "clipping" ? "bg-cyan" : "accent-bg";
  return (
    <span className="relative z-10 mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-surface ring-4 ring-surface">
      <span className={`size-2 rounded-full ${cls} ${s !== "ready" ? "live-ping" : ""}`} />
    </span>
  );
}

function StatusLabel({ s }: { s: Moment["status"] }) {
  if (s === "detected") return <span className="flex items-center gap-1 text-orange"><Flame className="size-3" /> Detected</span>;
  if (s === "clipping") return <span className="flex items-center gap-1 text-cyan"><Loader2 className="size-3 animate-spin" /> Clipping</span>;
  return <span className="flex items-center gap-1 text-green"><CheckCircle2 className="size-3" /> In queue</span>;
}

