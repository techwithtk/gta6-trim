"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, Check, FolderOpen, Plus, Minus } from "lucide-react";
import { LiveThumb } from "@/components/LiveThumb";
import { ENTERPRISE, MAX_ACCOUNTS_PER_PLATFORM, PLANS } from "@/lib/plans";
import { fmtViewers } from "@/lib/mock";
import { EditBay } from "@/components/landing/EditBay";
import { PaperFooter, PaperNav } from "@/components/PaperChrome";

/* ------------------------------------------------------------------
   Art direction: "tabloid × video editor".
   Newsprint paper, ink, fluoro pink + cobalt spot colours (two-colour print).
   Motion vocabulary = editing: hard jump-cuts (stepped easing), playheads,
   cuts, tickers. No soft fade-ups.
------------------------------------------------------------------ */

const STEP = (n: number) => (t: number) => Math.round(t * n) / n; // jump-cut easing
const SNAP = [0.2, 0.9, 0.1, 1] as const;

type Live = { name: string; login: string; viewers: number; title: string; thumbnail?: string };

function useLive() {
  const [streams, setStreams] = useState<Live[]>([]);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await (await fetch("/api/streams")).json();
        if (!stop && r.source === "twitch") setStreams(r.streams);
      } catch {
        /* page works without live data */
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);
  return streams;
}

/** Text that appears in hard cuts, like a video edit. */
function Cut({ children, delay = 0, className = "", inView = false }: { children: React.ReactNode; delay?: number; className?: string; inView?: boolean }) {
  const variants = { hidden: { clipPath: "inset(0 100% 0 0)" }, shown: { clipPath: "inset(0 0% 0 0)", transition: { duration: 0.42, ease: STEP(6), delay } } };
  const inner = <motion.span className={`inline-block ${className}`} variants={variants}>{children}</motion.span>;
  if (!inView) return <motion.span className="inline-block" initial="hidden" animate="shown">{inner}</motion.span>;
  // Observe an unclipped wrapper: a fully clipped element counts as invisible and never triggers.
  return <motion.span className="inline-block" initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.3 }}>{inner}</motion.span>;
}

export default function Landing() {
  const live = useLive();
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp paper-grain relative min-h-screen overflow-x-clip">
        <ScrollPlayhead />
        <Ticker live={live} />
        <PaperNav />
        <Hero live={live} />
        <EditBay />
        <FilmStrip />
        <Features live={live} />
        <Pricing />
        <FinePrint />
        <Finale />
        <PaperFooter />
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */

function ScrollPlayhead() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 260, damping: 40 });
  const [tc, setTc] = useState("00:00:00");
  useEffect(
    () =>
      scrollYProgress.on("change", (v) => {
        const s = Math.round(v * 180); // page = a 3-minute edit
        setTc(`00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
      }),
    [scrollYProgress],
  );
  return (
    <>
      <motion.div className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-[var(--fluo)]" style={{ scaleX: x }} />
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 hidden items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-1 font-mono text-[11px] font-semibold md:flex">
        <span className="live-dot size-2 rounded-full bg-[var(--fluo)]" /> REC {tc}
      </div>
    </>
  );
}

function Ticker({ live }: { live: Live[] }) {
  const items = live.length
    ? live.slice(0, 16).map((s) => `${s.name.toUpperCase()} · ${fmtViewers(s.viewers)} WATCHING`)
    : ["LIVE GTA 6 STREAMS", "TWITCH · KICK · YOUTUBE", "CLIPS IN SECONDS", "AUTO-POST EVERYWHERE"];
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-4 px-4 font-mono text-[12px] font-semibold tracking-wide">
          <span className="size-1.5 rotate-45 bg-[var(--fluo)]" />
          {t}
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative z-10 flex h-9 items-center overflow-hidden bg-[var(--ink)] text-[var(--paper)]">
      <div className="z-10 flex h-full shrink-0 items-center gap-2 bg-[var(--fluo)] px-3 font-mono text-[12px] font-bold text-[var(--ink)]">
        <span className="live-dot size-2 rounded-full bg-[var(--ink)]" /> ON AIR
      </div>
      <div className="marquee" aria-label="Live GTA 6 streams right now">
        {row}
        {row}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Hero({ live }: { live: Live[] }) {
  const viewers = live.reduce((a, s) => a + s.viewers, 0);
  return (
    <section className="relative z-[1] mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
      <div>
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-2)]">
          <Cut>No. 01 — The live clipping desk — GTA 6 edition</Cut>
        </p>
        <h1 className="mt-5 font-poster font-black uppercase leading-[0.82] tracking-[-0.02em]">
          <span className="block text-[clamp(72px,13vw,190px)]"><Cut delay={0.05}>Clip the</Cut></span>
          <span className="relative block text-[clamp(72px,13vw,190px)]">
            <Cut delay={0.18} className="text-[var(--fluo)] [-webkit-text-stroke:2px_var(--ink)] [text-shadow:0.045em_0.045em_0_var(--ink)]">Chaos.</Cut>
          </span>
        </h1>
        <p className="mt-3 font-serif-i text-[clamp(30px,4vw,48px)] leading-none">
          <Cut delay={0.32}>…while it&apos;s still live.</Cut>
        </p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.2 }} className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-[var(--ink-2)]">
          GTA6 Trim watches live GTA 6 streams and long YouTube videos, catches the second chat loses its mind, cuts it to 9:16 with captions, and hands you Shorts ready for TikTok, YouTube, Instagram and Facebook. On Studio it posts them for you. You just pick the stream.
        </motion.p>
        <VideoCard />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.2 }} className="mt-8 flex flex-wrap items-center gap-5">
          <a href="#pricing" className="group inline-flex h-14 items-center gap-3 border-2 border-[var(--ink)] bg-[var(--fluo)] px-6 font-poster text-2xl font-black uppercase shadow-[6px_6px_0_var(--ink)] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--ink)]">
            Start clipping <span className="font-mono text-sm font-bold">from ${PLANS[0].monthly}</span>
          </a>
          <a href="#auto-edit" className="font-mono text-[13px] font-semibold uppercase tracking-wider underline decoration-2 underline-offset-[6px] hover:text-[var(--cobalt)]">
            Watch it edit ↓
          </a>
        </motion.div>

        <dl className="mt-12 grid max-w-lg grid-cols-3 border-y-2 border-[var(--ink)]">
          <Fact k="Streams live" v={live.length ? String(live.length) : "—"} />
          <Fact k="Watching now" v={viewers ? fmtViewers(viewers) : "—"} border />
          <Fact k="Export" v="1080p" border />
        </dl>
      </div>

      <EditorDesk top={live[0]} />
    </section>
  );
}

function Fact({ k, v, border }: { k: string; v: string; border?: boolean }) {
  return (
    <div className={`py-3 ${border ? "border-l-2 border-[var(--ink)] pl-4" : ""}`}>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)]">{k}</dt>
      <dd className="font-poster text-4xl font-black leading-none">{v}</dd>
    </div>
  );
}

/* The hero centerpiece: a mini editing timeline. The playhead sweeps the live chat waveform;
   at each spike it cuts, and the finished Short pops onto the stack. */
const CUTS = [0.24, 0.58, 0.86];
const CLIP_HOOKS = ["Getaway driver had ONE job", "He did NOT see that cop", "Gator out of nowhere", "Clutch escape, 1 HP"];
const CLIP_WORDS = ["ONE JOB 😭", "NO WAY 💀", "RUN!! 🐊", "CLUTCH"];
const CLIP_IMAGES = ["/gta6/clip-1.jpg", "/gta6/clip-2.jpg", "/gta6/clip-3.jpg", "/gta6/clip-4.jpg"];

/** A finished 9:16 Short: full-bleed image, hook title on top, popping caption near the bottom. */
function ImageShort({ src, hook, caption }: { src: string; hook: string; caption: string }) {
  return (
    <div className="relative aspect-[9/16] overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      <div className="absolute inset-x-2 top-3 text-center">
        <span className="inline-block bg-white px-1.5 py-1 font-poster text-[13px] font-black uppercase leading-none text-black">{hook}</span>
      </div>
      <div className="absolute inset-x-0 bottom-[16%] text-center">
        <span className="caption-pop font-poster text-[26px] font-black uppercase text-[var(--acid)] [text-shadow:0_2px_0_#000,0_0_10px_rgba(0,0,0,.9)]">{caption}</span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 h-[3px] bg-white/30"><div className="h-full w-2/3 bg-white" /></div>
    </div>
  );
}

function EditorDesk({ top }: { top?: Live }) {
  const [ms, setMs] = useState(0);
  const [clips, setClips] = useState<number[]>([0]);
  const prevT = useRef(0);
  const n = useRef(1);
  useEffect(() => {
    const start = performance.now();
    const t = setInterval(() => setMs(performance.now() - start), 80);
    return () => clearInterval(t);
  }, []);
  const LOOP = 6500;
  const t = (ms % LOOP) / LOOP;
  useEffect(() => {
    const prev = prevT.current;
    prevT.current = t;
    const crossed = CUTS.some((c) => (prev < c && t >= c) || (prev > t && c <= t));
    if (crossed) {
      const id = n.current++;
      const add = setTimeout(() => setClips((c) => [...c.slice(-2), id]), 0);
      return () => clearTimeout(add);
    }
  }, [t]);

  const bars = Array.from({ length: 56 }, (_, i) => {
    const x = i / 55;
    const spike = CUTS.some((c) => Math.abs(x - c) < 0.03);
    return Math.round((spike ? 82 : 22) + Math.abs(Math.sin(i * 1.7) * (spike ? 18 : 26)));
  });
  const sec = Math.floor(ms / 1000);
  const frames = Math.floor((ms % 1000) / 41.6);
  const tc = `00:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;

  return (
    <div className="relative">
      {/* real live snapshot of the #1 stream right now (Twitch preview frame, linked to the stream) */}
      {top?.thumbnail ? (
        <motion.a
          href={`https://twitch.tv/${top.login}`}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, rotate: -14, y: -20 }}
          animate={{ opacity: 1, rotate: -5, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.4 }}
          whileHover={{ rotate: -2, scale: 1.03 }}
          className="absolute left-0 top-2 z-20 hidden w-[250px] border-2 border-[var(--ink)] bg-[var(--paper)] p-2 pb-3 shadow-[6px_6px_0_var(--ink)] sm:block"
          aria-label={`Watch ${top.name} live on Twitch`}
        >
          <span className="absolute -top-3 left-1/2 h-5 w-20 -translate-x-1/2 rotate-[-4deg] bg-[var(--acid)]/80" aria-hidden />
          <LiveThumb src={top.thumbnail} alt={`Live GTA 6 gameplay from ${top.name}`} className="aspect-video w-full" />
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase">
            <span className="live-dot size-2 rounded-full bg-[var(--fluo)]" /> Live now
            <span className="ml-auto truncate text-[var(--ink-2)]">twitch/{top.login}</span>
          </div>
        </motion.a>
      ) : null}

      {/* clip stack */}
      <div className="relative z-10 ml-auto h-[300px] w-[230px] sm:h-[330px]">
        <AnimatePresence initial={false}>
          {clips.map((id, i) => {
            const depth = clips.length - 1 - i;
            return (
              <motion.div
                key={id}
                className="absolute right-0 top-0 w-[170px] border-2 border-[var(--ink)] bg-black shadow-[6px_6px_0_var(--ink)]"
                initial={{ x: -240, y: 260, rotate: -12, scale: 0.35 }}
                animate={{ x: -depth * 26, y: depth * 10, rotate: [-6, 4, -2][depth] ?? 0, scale: 1 - depth * 0.06 }}
                exit={{ opacity: 0, x: -90, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                style={{ zIndex: 10 - depth }}
              >
                <ImageShort src={CLIP_IMAGES[id % CLIP_IMAGES.length]} hook={CLIP_HOOKS[id % 4]} caption={CLIP_WORDS[id % 4]} />
                <span className="absolute -left-2 -top-3 rotate-[-8deg] border-2 border-[var(--ink)] bg-[var(--acid)] px-1.5 font-mono text-[10px] font-bold">CLIP #{String(id + 1).padStart(3, "0")}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* timeline */}
      <div className="relative -mt-24 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] shadow-[8px_8px_0_var(--cobalt)]">
        <div className="flex items-center gap-3 border-b border-white/15 px-4 py-2.5 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-[var(--fluo)]"><span className="live-dot size-2 rounded-full bg-[var(--fluo)]" /> REC</span>
          <span className="num tabular-nums">{tc}</span>
          <span className="ml-auto truncate text-white/60">{top ? `twitch/${top.name.toLowerCase()} · ${fmtViewers(top.viewers)} live` : "twitch · live"}</span>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="mb-5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-white/50">
            <span>V1 · Gameplay</span>
            <span>A1 · Chat activity</span>
          </div>
          <div className="relative h-28">
            {/* cut regions */}
            {CUTS.map((c) => {
              const passed = t >= c;
              return (
                <div key={c} className="absolute inset-y-0 w-[7%] -translate-x-1/2" style={{ left: `${c * 100}%` }}>
                  <div className={`h-full border-x-2 transition-colors duration-150 ${passed ? "border-[var(--fluo)] bg-[var(--fluo)]/25" : "border-dashed border-white/30"}`} />
                  <span className={`absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full font-mono text-[9px] font-bold ${passed ? "text-[var(--fluo)]" : "text-white/40"}`}>{passed ? "CUT" : "SPIKE"}</span>
                </div>
              );
            })}
            {/* waveform */}
            <div className="absolute inset-0 flex items-end gap-[3px]">
              {bars.map((h, i) => (
                <span key={i} className="flex-1" style={{ height: `${h}%`, background: i / 55 <= t ? "var(--paper)" : "rgba(242,237,226,0.25)" }} />
              ))}
            </div>
            {/* playhead */}
            <div className="absolute inset-y-[-10px] w-[2px] bg-[var(--acid)]" style={{ left: `${t * 100}%` }}>
              <span className="absolute -left-[5px] -top-1 size-3 rotate-45 bg-[var(--acid)]" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-white/60">
            <span>Auto-caption · 9:16 · 1080p</span>
            <span className="text-[var(--acid)]">→ TikTok · Shorts · Reels · FB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** YouTube-player shaped 16:9 card: a long video with the moments GTA6 Trim cut marked on the timeline. */
const CHAPTERS = [0.18, 0.41, 0.63, 0.86];
function VideoCard() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setP((v) => (v >= 1 ? 0 : v + 0.004)), 50);
    return () => clearInterval(t);
  }, []);
  const total = 4 * 3600 + 67; // 4:01:07
  const cur = Math.floor(p * total);
  const fmt = (x: number) => `${Math.floor(x / 3600)}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  const made = CHAPTERS.filter((c) => p >= c).length;
  return (
    <motion.figure
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 -12px -12px 0)" }}
      transition={{ duration: 0.45, ease: STEP(6), delay: 0.45 }}
      className="mt-8 max-w-[34rem]"
    >
      <div className="border-2 border-[var(--ink)] bg-black shadow-[6px_6px_0_var(--ink)]">
        <div className="relative aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gta6/video-hero.jpg" alt="Long-form GTA 6 video being clipped" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          {/* top bar */}
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3">
            <span className="grid size-7 place-items-center rounded-full bg-[var(--fluo)] font-poster text-sm font-black text-black">G</span>
            <span className="truncate text-[13px] font-medium text-white">GTA 6 — 4 hour heist marathon (full VOD)</span>
          </div>
          {/* play button */}
          <span className="absolute left-1/2 top-1/2 grid h-12 w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-[#ff0033]">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-6 fill-white" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </span>
          {/* clips-found badge */}
          <span className="absolute right-3 top-12 border-2 border-[var(--ink)] bg-[var(--acid)] px-2 py-0.5 font-mono text-[11px] font-bold text-black">
            {made} {made === 1 ? "clip" : "clips"} cut
          </span>
          {/* timeline */}
          <div className="absolute inset-x-3 bottom-3">
            <div className="relative h-[5px] bg-white/30">
              <div className="h-full bg-[#ff0033]" style={{ width: `${p * 100}%` }} />
              {CHAPTERS.map((c) => (
                <span key={c} className={`absolute -top-[4px] h-[13px] w-[4px] -translate-x-1/2 ${p >= c ? "bg-[var(--acid)]" : "bg-white/70"}`} style={{ left: `${c * 100}%` }} />
              ))}
              <span className="absolute -top-[4px] size-[13px] -translate-x-1/2 rounded-full bg-[#ff0033]" style={{ left: `${p * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-white/90">
              <span>{fmt(cur)} / 4:01:07</span>
              <span className="text-[var(--acid)]">● GTA6 Trim scanning</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">Paste a long YouTube video → get the best moments back as Shorts</figcaption>
    </motion.figure>
  );
}

/* ------------------------------------------------------------------ */

const TAKES = [
  { t: "Pick the stream", d: "Every live GTA 6 stream on Twitch (Kick & YouTube next), sorted by who's popping off. Or paste a long YouTube link." },
  { t: "We watch chat", d: "Message floods, emote walls and audio peaks mark the exact second something viral happens." },
  { t: "Cut & caption", d: "Facecam on top, gameplay below, animated captions burned in. Ready for vertical feeds." },
  { t: "Download or post", d: "Download every Short or drop it into Drive, Dropbox or OneDrive. On Studio, auto-post to up to 3 accounts per platform." },
];

function FilmStrip() {
  return (
    <section id="how" className="relative z-[1] scroll-mt-10 border-y-2 border-[var(--ink)] bg-[var(--ink)] py-14 text-[var(--paper)]">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-poster text-[clamp(48px,7vw,96px)] font-black uppercase leading-[0.85]">
            <Cut inView>Four takes.</Cut> <Cut inView delay={0.12} className="font-serif-i font-normal normal-case text-[var(--fluo)]">One Short.</Cut>
          </h2>
          <p className="max-w-xs font-mono text-[12px] uppercase tracking-wider text-white/60">From live stream to posted clip while the stream is still going.</p>
        </div>
        <div className="mt-10">
          <motion.ol
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 gap-[2px] border-y-[14px] border-[var(--ink)] bg-[var(--ink)] [border-image:repeating-linear-gradient(90deg,var(--paper)_0_10px,transparent_10px_22px)_14] sm:grid-cols-2 lg:grid-cols-4"
          >
            {TAKES.map((s, i) => (
              <motion.li
                key={s.t}
                variants={{
                  hidden: { clipPath: "inset(0 0 100% 0)" },
                  shown: { clipPath: "inset(0 0 0% 0)", transition: { duration: 0.4, ease: STEP(5), delay: i * 0.12 } },
                }}
                className="relative bg-[var(--paper)] p-5 text-[var(--ink)]"
              >
                <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                  <span>Take</span>
                  <span className="text-[var(--ink-2)]">Scene {i + 1}/4</span>
                </div>
                <div className="font-poster text-[88px] font-black leading-[0.9] text-[var(--cobalt)]">0{i + 1}</div>
                <h3 className="mt-2 font-poster text-3xl font-black uppercase leading-none">{s.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">{s.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Features({ live }: { live: Live[] }) {
  return (
    <section id="features" className="relative z-[1] mx-auto max-w-7xl scroll-mt-10 px-4 py-24 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-poster text-[clamp(48px,7vw,104px)] font-black uppercase leading-[0.85]">
          <Cut inView>What&apos;s in</Cut>
          <br />
          <Cut inView delay={0.1}>the <span className="text-[var(--fluo)] [-webkit-text-stroke:2px_var(--ink)]">box</span></Cut>
        </h2>
        <p className="max-w-sm text-[17px] text-[var(--ink-2)]">Six tools that usually live in six different apps. Each card below is the real thing, running.</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-6">
        <Card className="md:col-span-3" label="01 · Live directory" title="Every live GTA 6 stream, one click to clip">
          <MiniDirectory live={live} />
        </Card>
        <Card className="md:col-span-3" label="02 · YouTube import" title="Paste a long video, get a stack of Shorts">
          <MiniImport />
        </Card>
        <Card className="md:col-span-2" label="03 · AI captions" title="8 caption styles that hit word-by-word">
          <MiniKaraoke />
        </Card>
        <Card className="md:col-span-2" label="04 · Cloud storage" title="Clips land in your Drive, Dropbox or OneDrive">
          <MiniStorage />
        </Card>
        <Card className="md:col-span-2" label="05 · Auto-post · Studio" title={`TikTok, Shorts, Reels, FB. ${MAX_ACCOUNTS_PER_PLATFORM} accounts each.`}>
          <MiniSlots />
        </Card>
        <Card className="md:col-span-6" label="06 · Rights-safe" title="We ask before you clip someone else's stream" wide>
          <p className="max-w-2xl text-[15px] text-[var(--ink-2)]">
            Clip your own streams, or streams whose creator allows it (like paid clipping campaigns). GTA6 Trim makes you confirm permission before clipping another creator, so your pages stay clear of strikes.
          </p>
          <motion.span
            initial={{ scale: 2.2, rotate: -20, opacity: 0 }}
            whileInView={{ scale: 1, rotate: -8, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.2 }}
            className="mt-4 inline-block border-[3px] border-[var(--cobalt)] px-3 py-1 font-poster text-3xl font-black uppercase text-[var(--cobalt)] md:absolute md:right-8 md:top-1/2 md:mt-0 md:-translate-y-1/2"
          >
            Permission ✓ checked
          </motion.span>
        </Card>
      </div>
    </section>
  );
}

function Card({ label, title, children, className = "", wide }: { label: string; title: string; children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    // The wrapper is what the viewport watches: a fully clipped element counts as invisible, so it would never trigger.
    <motion.div initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.2 }} className={`flex ${className}`}>
    <motion.article
      variants={{
        hidden: { clipPath: "inset(0 100% 0 0)" },
        shown: { clipPath: "inset(0 -20px -20px 0)", transition: { duration: 0.45, ease: STEP(6) } },
      }}
      className="sticker relative flex w-full flex-col p-6"
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--fluo)]">{label}</span>
      <h3 className={`mt-2 font-poster font-black uppercase leading-[0.95] ${wide ? "text-4xl" : "text-[32px]"}`}>{title}</h3>
      <div className="mt-5 flex-1">{children}</div>
    </motion.article>
    </motion.div>
  );
}

function MiniDirectory({ live }: { live: Live[] }) {
  const rows: Live[] = live.length ? live.slice(0, 4) : [{ name: "loading live streams…", login: "", viewers: 0, title: "" }];
  return (
    <ul className="divide-y-2 divide-[var(--ink)] border-2 border-[var(--ink)] bg-[var(--paper-2)]">
      {rows.map((s, i) => (
        <li key={s.name} className="flex items-center gap-3 px-3 py-2.5">
          {s.thumbnail ? (
            <LiveThumb src={s.thumbnail} alt={`${s.name} live`} className="h-9 w-16 shrink-0 border-2 border-[var(--ink)]" />
          ) : (
            <span className="live-dot size-2 rounded-full bg-[var(--fluo)]" style={{ animationDelay: `${i * 0.3}s` }} />
          )}
          <span className="truncate font-mono text-[13px] font-semibold">{s.name}</span>
          <span className="ml-auto font-mono text-[12px] text-[var(--ink-2)]">{s.viewers ? `${fmtViewers(s.viewers)} live` : ""}</span>
          {s.viewers ? <span className="border-2 border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--paper)]">CLIP</span> : null}
        </li>
      ))}
    </ul>
  );
}

function MiniImport() {
  const url = "youtube.com/watch?v=gta6-marathon-part-1";
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((n) => (n + 1) % (url.length + 34)), 70);
    return () => clearInterval(t);
  }, []);
  const typed = url.slice(0, Math.min(k, url.length));
  const prog = Math.max(0, Math.min(1, (k - url.length) / 26));
  const shorts = Math.floor(prog * 12);
  return (
    <div className="space-y-3">
      <div className="flex h-11 items-center border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 font-mono text-[13px]">
        {typed}
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[var(--ink)]" />
      </div>
      <div className="h-4 border-2 border-[var(--ink)]">
        <div className="h-full bg-[var(--cobalt)]" style={{ width: `${Math.round(prog * 8) * 12.5}%` }} />
      </div>
      <p className="font-mono text-[12px] font-semibold uppercase">{prog >= 1 ? `✓ ${shorts} Shorts ready` : prog > 0 ? `Finding moments… ${shorts} found` : "Paste a link"}</p>
    </div>
  );
}

function MiniKaraoke() {
  const words = ["HE", "HAD", "ONE", "JOB", "CHAT"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % (words.length + 2)), 420);
    return () => clearInterval(t);
  }, [words.length]);
  return (
    <div className="grid h-32 place-items-center border-2 border-[var(--ink)] bg-[var(--ink)]">
      <p className="font-poster text-[34px] font-black uppercase leading-none">
        {words.map((w, n) => (
          <span key={w} className={`mx-1 inline-block transition-transform duration-100 ${n === i ? "scale-110 text-[var(--acid)]" : n < i ? "text-[var(--paper)]" : "text-white/25"}`}>{w}</span>
        ))}
      </p>
    </div>
  );
}

function MiniStorage() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % 6), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-32 border-2 border-[var(--ink)] bg-[var(--paper-2)]">
      <AnimatePresence>
        {n < 5 ? (
          <motion.span key={n} className="absolute left-1/2 top-2 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 font-mono text-[11px] font-bold" initial={{ y: -10, opacity: 0 }} animate={{ y: 52, opacity: [0, 1, 1, 0] }} transition={{ duration: 0.8, ease: "easeIn" }}>
            clip_{String(n + 41).padStart(3, "0")}.mp4
          </motion.span>
        ) : null}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 font-mono text-[12px] font-semibold">
        <FolderOpen className="size-5" /> My Drive / GTA6 Trim <span className="border-2 border-[var(--ink)] bg-[var(--acid)] px-1.5 font-bold">{40 + n}</span>
      </div>
    </div>
  );
}

function MiniSlots() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((n) => (n + 1) % 14), 380);
    return () => clearInterval(t);
  }, []);
  const plats = ["TikTok", "Shorts", "Reels", "Facebook"];
  return (
    <ul className="space-y-2">
      {plats.map((p, r) => (
        <li key={p} className="flex items-center gap-3">
          <span className="w-20 font-mono text-[12px] font-semibold">{p}</span>
          {Array.from({ length: MAX_ACCOUNTS_PER_PLATFORM }, (_, c) => {
            const on = r * MAX_ACCOUNTS_PER_PLATFORM + c < k;
            return <span key={c} className={`size-6 border-2 border-[var(--ink)] transition-colors duration-100 ${on ? "bg-[var(--fluo)]" : "bg-transparent"}`} />;
          })}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="relative z-[1] scroll-mt-10 border-t-2 border-[var(--ink)] bg-[var(--paper-2)] py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-poster text-[clamp(48px,7vw,104px)] font-black uppercase leading-[0.85]">
            <Cut inView>Grab a</Cut> <Cut inView delay={0.1} className="text-[var(--cobalt)]">ticket.</Cut>
          </h2>
          <button
            onClick={() => setYearly((v) => !v)}
            role="switch"
            aria-checked={yearly}
            className="flex items-center gap-3 border-2 border-[var(--ink)] bg-[var(--paper)] p-1 font-mono text-[12px] font-bold uppercase shadow-[4px_4px_0_var(--ink)]"
          >
            <span className={`px-3 py-1.5 ${!yearly ? "bg-[var(--ink)] text-[var(--paper)]" : ""}`}>Monthly</span>
            <span className={`px-3 py-1.5 ${yearly ? "bg-[var(--ink)] text-[var(--paper)]" : ""}`}>Yearly −20%</span>
          </button>
        </div>
        <p className="mt-4 max-w-xl text-[var(--ink-2)]">Every ticket: no watermark, 1080p, the live stream directory, cancel anytime.</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {PLANS.map((p, i) => (
            <Ticket
              key={p.id}
              i={i}
              name={p.name}
              blurb={p.blurb}
              price={`$${yearly ? p.yearly : p.monthly}`}
              per={yearly ? `/mo · $${p.yearly * 12} billed yearly` : "/month"}
              features={p.features}
              href={`/checkout?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`}
              cta={`Choose ${p.name}`}
              tone={p.highlight ? "fluo" : i === 0 ? "plain" : "paper"}
              stamp={p.highlight ? "Most clipped" : undefined}
              serial={`CW-${String(i + 1).padStart(2, "0")}`}
            />
          ))}
          <Ticket i={3} name={ENTERPRISE.name} blurb={ENTERPRISE.blurb} price="Custom" per="built around your volume" features={ENTERPRISE.features} href="mailto:hello@gta6trim.com?subject=GTA6%20Trim%20Enterprise" cta="Talk to us" tone="cobalt" serial="CW-EN" />
        </div>
      </div>
    </section>
  );
}

function Ticket({ i, name, blurb, price, per, features, href, cta, tone, stamp, serial }: { i: number; name: string; blurb: string; price: string; per: string; features: string[]; href: string; cta: string; tone: "plain" | "paper" | "fluo" | "cobalt"; stamp?: string; serial: string }) {
  const bg = { plain: "bg-[var(--paper)]", paper: "bg-[var(--paper)]", fluo: "bg-[var(--fluo)]", cobalt: "bg-[var(--cobalt)] text-[var(--paper)]" }[tone];
  const sub = tone === "cobalt" ? "text-white/80" : tone === "fluo" ? "text-[var(--ink)]" : "text-[var(--ink-2)]";
  return (
    <motion.div
      initial={{ y: 40, rotate: i % 2 ? 2 : -2, opacity: 0 }}
      whileInView={{ y: 0, rotate: i % 2 ? 0.6 : -0.6, opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: (i % 2) * 0.08 }}
      whileHover={{ rotate: 0, y: -4 }}
      className="relative drop-shadow-[8px_8px_0_var(--ink)]"
    >
      <div className={`ticket relative flex min-h-full border-2 border-[var(--ink)] ${bg}`}>
        <div className="flex-1 p-6 sm:p-7">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
            <span>Admit one clipper</span>
            <span className={sub}>{serial}</span>
          </div>
          <h3 className="mt-3 font-poster text-6xl font-black uppercase leading-[0.85]">{name}</h3>
          <p className={`mt-2 text-[15px] ${sub}`}>{blurb}</p>
          <div className="mt-5 flex items-baseline gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={price} className="font-poster text-[64px] font-black leading-none" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2, ease: STEP(4) }}>
                {price}
              </motion.span>
            </AnimatePresence>
            <span className={`font-mono text-[12px] font-semibold ${sub}`}>{per}</span>
          </div>
          <ul className="mt-5 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> {f}</li>
            ))}
          </ul>
          <a
            href={href}
            className={`mt-7 inline-flex h-12 items-center gap-2 border-2 border-[var(--ink)] px-5 font-mono text-[13px] font-bold uppercase tracking-wider transition-transform duration-150 hover:-translate-y-0.5 ${tone === "fluo" ? "bg-[var(--ink)] text-[var(--paper)]" : tone === "cobalt" ? "bg-[var(--paper)] text-[var(--ink)]" : "bg-[var(--fluo)]"}`}
          >
            {cta} <ArrowUpRight className="size-4" />
          </a>
        </div>
        {/* stub */}
        <div className="hidden w-[92px] shrink-0 flex-col items-center justify-between border-l-2 border-dashed border-[var(--ink)] py-6 sm:flex">
          <span className="font-mono text-[10px] font-bold [writing-mode:vertical-rl]">NO. {serial} · VALID MONTHLY</span>
          <span className="halftone size-10 rounded-full opacity-60" />
        </div>
      </div>
      {stamp ? (
        <motion.span
          initial={{ scale: 2.4, rotate: -25, opacity: 0 }}
          whileInView={{ scale: 1, rotate: -12, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 520, damping: 15, delay: 0.35 }}
          className="absolute -top-7 right-3 border-[3px] border-[var(--ink)] bg-[var(--acid)] px-2.5 py-0.5 font-poster text-xl font-black uppercase sm:-top-5 sm:right-24 sm:px-3 sm:py-1 sm:text-2xl"
        >
          {stamp}
        </motion.span>
      ) : null}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

const FAQS = [
  { q: "Do I need permission to clip other streamers?", a: "Yes. Clip your own streams, or streams whose creator allows clipping, like paid clipping campaigns. GTA6 Trim asks you to confirm before clipping someone else's stream or YouTube video." },
  { q: "Which platforms can I auto-post to?", a: `Auto-posting is on the Studio plan: TikTok, YouTube Shorts, Instagram Reels and Facebook Pages, up to ${MAX_ACCOUNTS_PER_PLATFORM} accounts each, with scheduling. On Starter and Pro you download your Shorts (or save them to your cloud storage) and post them yourself.` },
  { q: "Where do the live streams come from?", a: "Live GTA 6 streams from Twitch today, with Kick and YouTube Live coming next. You choose which ones to clip." },
  { q: "Can I clip long YouTube videos?", a: "Yes. Paste a YouTube link from your channel, or one you have rights to, and get back a batch of captioned Shorts." },
  { q: "Can I cancel anytime?", a: "Yes. Monthly or yearly, cancel from your dashboard whenever you want." },
  { q: "Are you affiliated with Rockstar Games?", a: "No. GTA6 Trim is an independent tool, not affiliated with or endorsed by Rockstar Games, Take-Two, Twitch, Kick or YouTube." },
];

function FinePrint() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative z-[1] mx-auto grid max-w-7xl scroll-mt-10 gap-10 px-4 py-24 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
      <h2 className="font-poster text-[clamp(48px,7vw,104px)] font-black uppercase leading-[0.85]">
        <Cut inView>The fine</Cut>
        <br />
        <Cut inView delay={0.1} className="font-serif-i font-normal normal-case">print.</Cut>
      </h2>
      <div className="border-t-2 border-[var(--ink)]">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b-2 border-[var(--ink)]">
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center gap-4 py-5 text-left">
                <span className="font-mono text-[12px] font-bold text-[var(--fluo)]">§{i + 1}</span>
                <span className="flex-1 font-poster text-[26px] font-extrabold uppercase leading-tight">{f.q}</span>
                <span className="grid size-8 shrink-0 place-items-center border-2 border-[var(--ink)]">{isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.25, ease: SNAP }} className="overflow-hidden">
                    <p className="max-w-2xl pb-6 pl-10 text-[16px] leading-relaxed text-[var(--ink-2)]">{f.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Finale() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-40%"]);
  return (
    <section ref={ref} className="relative z-[1] overflow-hidden border-y-2 border-[var(--ink)] bg-[var(--fluo)] py-16">
      <motion.div style={{ x }} className="whitespace-nowrap font-poster text-[clamp(90px,16vw,240px)] font-black uppercase leading-[0.8] [-webkit-text-stroke:3px_var(--ink)]">
        Stop scrolling. Start clipping. <span className="text-transparent">Stop scrolling. Start clipping.</span>
      </motion.div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center gap-6 px-4 md:px-8">
        <a href="#pricing" className="inline-flex h-14 items-center gap-3 border-2 border-[var(--ink)] bg-[var(--ink)] px-6 font-poster text-2xl font-black uppercase text-[var(--paper)] shadow-[6px_6px_0_var(--paper)] transition-transform duration-150 hover:-translate-y-0.5">
          Pick your ticket <ArrowUpRight className="size-6" />
        </a>
        <p className="max-w-sm font-mono text-[12px] font-semibold uppercase tracking-wider">Your dashboard is ready the minute you check out.</p>
      </div>
    </section>
  );
}

