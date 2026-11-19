"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";

/* ------------------------------------------------------------------
   "Watch it edit itself": a scroll-driven screen recording of the
   auto-editor. Scrolling is the playhead. The editor is drawn at a
   fixed 1000×600 design size and scaled to fit, so every keyframe is
   a plain pixel coordinate.
------------------------------------------------------------------ */

const W = 1000;
const H = 600;
const TRACK_X = 84; // where tracks start
const TRACK_W = 900;
const SRC = "/gta6/video-hero.jpg";

// The moment the editor picks: chat spike at 58% of the long video.
const SPIKES = [0.24, 0.58, 0.86];
const SEG_A = TRACK_X + 0.54 * TRACK_W; // 570
const SEG_B = TRACK_X + 0.64 * TRACK_W; // 660
const SEG_W = SEG_B - SEG_A;

// Scroll beats (section progress 0 → 1)
const BEATS = [
  { at: 0.04, n: "01", t: "Reads the chat", d: "Message floods, emote walls and audio peaks get scored every second of the stream." },
  { at: 0.24, n: "02", t: "Finds the cut", d: "The razor lands on both sides of the spike. Nobody scrubs through 4 hours." },
  { at: 0.4, n: "03", t: "Drops it on the timeline", d: "The moment is lifted out and placed on its own Short track." },
  { at: 0.55, n: "04", t: "Reframes to 9:16", d: "The crop follows the action, so the good part stays in frame." },
  { at: 0.7, n: "05", t: "Writes the captions", d: "Word-by-word captions and a hook title, timed to the voice." },
  { at: 0.85, n: "06", t: "Exports and posts", d: "Rendered 1080×1920 and sent to TikTok, Shorts, Reels and Facebook." },
];

const WORDS = ["HE", "DID NOT", "SEE THAT", "COP 💀"];
const WORD_AT = [0.72, 0.75, 0.78, 0.81];
const PLATFORMS = ["TikTok", "Shorts", "Reels", "FB"];
const CHECKS = [
  { label: "Find moment", done: 0.24 },
  { label: "Cut", done: 0.37 },
  { label: "Place on track", done: 0.53 },
  { label: "Reframe 9:16", done: 0.68 },
  { label: "Captions", done: 0.83 },
  { label: "Export + post", done: 0.97 },
];

// Chat activity bars: calm noise with spikes at each moment.
const BARS = Array.from({ length: 90 }, (_, i) => {
  const base = 16 + 7 * Math.abs(Math.sin(i * 0.7)) + 5 * Math.abs(Math.sin(i * 1.9));
  const spike = SPIKES.reduce((a, s) => a + 70 * Math.exp(-(((i / 89 - s) * 40) ** 2)), 0);
  return Math.min(100, Math.round(base + spike));
});

/** Hard on/off at a scroll position: a jump cut, not a fade. */
function useOn(p: MotionValue<number>, at: number, off = 1) {
  // Scroll-linked ranges must stay inside [0, 1] (they can run on the browser's scroll timeline).
  const input = [...(at > 0 ? [at - 0.004, at] : [0]), ...(off < 1 ? [off - 0.004, off] : [1])];
  const output = [...(at > 0 ? [0, 1] : [1]), ...(off < 1 ? [1, 0] : [1])];
  return useTransform(p, input, output);
}

function On({ p, at, off, className, style, children }: { p: MotionValue<number>; at: number; off?: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const o = useOn(p, at, off);
  const s = useTransform(p, [at - 0.004, at, at + 0.012], [0.6, 1.15, 1]);
  return <motion.div className={className} style={{ ...style, opacity: o, scale: s }}>{children}</motion.div>;
}

export function EditBay() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const [beat, setBeat] = useState(0);
  const [word, setWord] = useState(-1);
  useMotionValueEvent(p, "change", (v) => {
    let b = 0;
    BEATS.forEach((x, i) => v >= x.at && (b = i));
    setBeat(b);
    let w = -1;
    WORD_AT.forEach((x, i) => v >= x && (w = i));
    setWord(w);
  });

  return (
    <section ref={ref} id="auto-edit" aria-label="How the auto-editor works" className="relative z-[1] h-[560vh] border-y-2 border-[var(--ink)] bg-[var(--paper-2,#e9e2d3)]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:px-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center lg:gap-10">
          <Steps beat={beat} />
          <Stage p={p} word={word} />
        </div>
      </div>
    </section>
  );
}

function Steps({ beat }: { beat: number }) {
  const b = BEATS[beat];
  return (
    <div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--fluo)]">● Auto-edit · scroll to play</p>
      <h2 className="mt-2 font-poster text-[clamp(40px,5vw,68px)] font-black uppercase leading-[0.85]">Watch it edit itself.</h2>
      <div className="relative mt-5 h-[92px] overflow-hidden border-l-4 border-[var(--ink)] pl-4 lg:h-[120px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={b.n} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.18, ease: (t: number) => Math.round(t * 3) / 3 }}>
            <p className="font-poster text-[28px] font-black uppercase leading-none">
              <span className="text-[var(--cobalt)]">{b.n}</span> {b.t}
            </p>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-snug text-[var(--ink-2)]">{b.d}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <ol className="mt-4 hidden gap-1.5 lg:flex" aria-hidden>
        {BEATS.map((x, i) => (
          <li key={x.n} className={`h-2 flex-1 border-2 border-[var(--ink)] transition-colors duration-100 ${i <= beat ? "bg-[var(--fluo)]" : "bg-transparent"}`} />
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stage({ p, word }: { p: MotionValue<number>; word: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [view, setView] = useState(W); // visible design width: phones crop off the inspector panel
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const v = e.contentRect.width < 560 ? 836 : W;
      setView(v);
      setScale(e.contentRect.width / v);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="relative w-full overflow-hidden border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)]" style={{ aspectRatio: `${view} / ${H}` }}>
      <div className="absolute left-0 top-0 origin-top-left overflow-hidden bg-[#121212] text-white" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <TitleBar p={p} />
        <SourceMonitor p={p} />
        <ProgramMonitor p={p} word={word} />
        <Inspector p={p} />
        <Timeline p={p} />
        <Cursor p={p} />
      </div>
    </div>
  );
}

function TitleBar({ p }: { p: MotionValue<number> }) {
  const [tc, setTc] = useState("00:00:00");
  useMotionValueEvent(p, "change", (v) => {
    const s = Math.round(v * 14467); // 4h01m07s source
    setTc(`${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
  });
  return (
    <div className="absolute inset-x-0 top-0 flex h-8 items-center gap-2 border-b border-white/10 bg-[#1b1b1b] px-3 font-mono text-[11px] text-white/60">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 text-white/80">GTA6 Trim — Auto-edit</span>
      <span className="ml-3 rounded bg-white/10 px-1.5">gta6_heist_marathon_full.mp4</span>
      <span className="ml-auto flex items-center gap-1.5 text-[var(--fluo)]">
        <span className="live-dot size-1.5 rounded-full bg-[var(--fluo)]" /> AUTO
      </span>
      <span className="num w-[70px] text-right text-white/80">{tc}</span>
    </div>
  );
}

/* Source: the long 16:9 video, with the 9:16 crop box that tracks the action. */
const MON = { x: 16, y: 44, w: 600, h: 338 };
const CROP_W = Math.round((MON.h * 9) / 16); // 190
function useCropX(p: MotionValue<number>) {
  return useTransform(p, [0.55, 0.6, 0.64, 0.68, 1], [205, 140, 300, 250, 250]);
}

function SourceMonitor({ p }: { p: MotionValue<number> }) {
  const cropX = useCropX(p);
  const cropOn = useOn(p, 0.555);
  const leftShade = useTransform(cropX, (x) => x);
  const rightShade = useTransform(cropX, (x) => MON.w - x - CROP_W);
  const scanLabel = useOn(p, 0.04, 0.24);
  return (
    <div className="absolute overflow-hidden rounded-sm bg-black" style={{ left: MON.x, top: MON.y, width: MON.w, height: MON.h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">SOURCE · 16:9 · 4:01:07</div>
      <motion.div style={{ opacity: scanLabel }} className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/75 px-2 py-1 font-mono text-[11px] text-[var(--acid)]">
        <span className="live-dot size-1.5 rounded-full bg-[var(--acid)]" /> scanning chat · 2,841 msg/min
      </motion.div>
      {/* 9:16 crop */}
      <motion.div style={{ opacity: cropOn }} className="absolute inset-0">
        <motion.div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: leftShade }} />
        <motion.div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: rightShade }} />
        <motion.div className="absolute inset-y-0 border-2 border-[var(--acid)]" style={{ x: cropX, width: CROP_W }}>
          <span className="absolute -top-px left-0 bg-[var(--acid)] px-1 font-mono text-[10px] font-bold text-black">9:16 · tracking</span>
          <span className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 border border-dashed border-[var(--acid)]" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* Program: the vertical Short being built. */
const PHONE = { x: 640, y: 44, w: CROP_W, h: MON.h };
function ProgramMonitor({ p, word }: { p: MotionValue<number>; word: number }) {
  const cropX = useCropX(p);
  const bgX = useTransform(cropX, (x) => `-${x}px 0px`);
  const empty = useOn(p, 0, 0.525);
  const letterbox = useOn(p, 0.525, 0.555);
  const vertical = useOn(p, 0.555);
  const hook = useOn(p, 0.7);
  return (
    <div className="absolute overflow-hidden rounded-[14px] border-[3px] border-[#2a2a2a] bg-black" style={{ left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h }}>
      <motion.div style={{ opacity: empty }} className="absolute inset-0 grid place-items-center text-center font-mono text-[10px] leading-relaxed text-white/35">
        PROGRAM
        <br />
        no clip yet
      </motion.div>
      <motion.div style={{ opacity: letterbox }} className="absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SRC} alt="" className="w-full" />
      </motion.div>
      <motion.div style={{ opacity: vertical, backgroundImage: `url(${SRC})`, backgroundSize: `${MON.w}px ${MON.h}px`, backgroundPosition: bgX }} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
      </motion.div>
      <motion.div style={{ opacity: hook }} className="absolute inset-x-2 top-6 text-center">
        <span className="inline-block bg-white px-1.5 py-1 font-poster text-[15px] font-black uppercase leading-none text-black">He did NOT see that cop</span>
      </motion.div>
      <div className="absolute inset-x-0 bottom-[22%] text-center">
        <AnimatePresence mode="popLayout">
          {word >= 0 ? (
            <motion.span key={word} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="inline-block font-poster text-[30px] font-black uppercase leading-none text-[var(--acid)] [-webkit-text-stroke:1.5px_black] [text-shadow:2px_2px_0_black]">
              {WORDS[word]}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 top-1 text-center font-mono text-[9px] text-white/50">9:16 · 1080×1920</div>
    </div>
  );
}

function Inspector({ p }: { p: MotionValue<number> }) {
  const bar = useTransform(p, [0.86, 0.97], ["0%", "100%"]);
  const exportOn = useOn(p, 0.85);
  return (
    <div className="absolute rounded-sm border border-white/10 bg-[#1a1a1a] p-3" style={{ left: 846, top: 44, width: 138, height: MON.h }}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/45">Auto-edit</p>
      <ul className="mt-2 space-y-1.5">
        {CHECKS.map((c, i) => (
          <Check key={c.label} p={p} label={c.label} start={i === 0 ? 0.04 : CHECKS[i - 1].done} done={c.done} />
        ))}
      </ul>
      <motion.div style={{ opacity: exportOn }} className="absolute inset-x-3 bottom-3">
        <p className="mb-1 font-mono text-[10px] text-white/55">Rendering…</p>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-[var(--fluo)]" style={{ width: bar }} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {PLATFORMS.map((x, i) => (
            <On key={x} p={p} at={0.9 + i * 0.02} className="whitespace-nowrap border border-[var(--acid)] px-0.5 py-0.5 text-center font-mono text-[9px] font-bold text-[var(--acid)]">
              ✓ {x}
            </On>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function Check({ p, label, start, done }: { p: MotionValue<number>; label: string; start: number; done: number }) {
  const active = useOn(p, start, done);
  const finished = useOn(p, done);
  return (
    <li className="relative flex items-center gap-2 font-mono text-[11px] text-white/45">
      <span className="relative grid size-3.5 place-items-center">
        <span className="absolute inset-0 rounded-full border border-white/25" />
        <motion.span style={{ opacity: active }} className="live-dot absolute inset-[3px] rounded-full bg-[var(--fluo)]" />
        <motion.span style={{ opacity: finished }} className="absolute inset-0 grid place-items-center rounded-full bg-[var(--acid)] text-[9px] font-bold text-black">✓</motion.span>
      </span>
      <motion.span style={{ opacity: useTransform(p, [start - 0.004, start], [0.6, 1]) }} className="text-white/85">{label}</motion.span>
    </li>
  );
}

/* ------------------------------------------------------------------ */

const TL = { y: 398 };
const ROWS = { chat: 424, v1: 470, v2: 518, cc: 558 };

function Timeline({ p }: { p: MotionValue<number> }) {
  const scanX = useTransform(p, [0.04, 0.24], [TRACK_X, TRACK_X + TRACK_W], { clamp: true });
  const hidden = useTransform(scanX, (x) => TRACK_X + TRACK_W - x);
  const head = useTransform(p, [0, 0.04, 0.24, 0.25, 0.53, 0.56, 0.86, 1], [TRACK_X, TRACK_X, TRACK_X + TRACK_W, SEG_A + SEG_W / 2, SEG_A + SEG_W / 2, TRACK_X, TRACK_X + SEG_W, TRACK_X + SEG_W]);

  // dragged copy of the moment
  const gx = useTransform(p, [0.41, 0.52], [SEG_A, TRACK_X], { clamp: true });
  const gy = useTransform(p, [0.41, 0.52], [ROWS.v1, ROWS.v2], { clamp: true });
  const ghostOn = useOn(p, 0.41);
  const ghostLift = useTransform(p, [0.41, 0.42, 0.51, 0.52], [0, -6, -6, 0]);

  return (
    <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#161616]" style={{ top: TL.y }}>
      {/* ruler */}
      <div className="absolute inset-x-0 top-0 h-[20px] border-b border-white/10" style={{ left: TRACK_X }}>
        {Array.from({ length: 31 }, (_, i) => (
          <span key={i} className={`absolute bottom-0 w-px bg-white/25 ${i % 5 === 0 ? "h-3" : "h-1.5"}`} style={{ left: i * 30 }} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="absolute top-0.5 font-mono text-[9px] text-white/40" style={{ left: i * 150 + 3 }}>{`${Math.floor((i * 40) / 60)}:${String((i * 40) % 60).padStart(2, "0")}:00`}</span>
        ))}
      </div>

      {/* track labels */}
      {[
        ["CHAT", ROWS.chat, 40],
        ["V1", ROWS.v1, 40],
        ["SHORT", ROWS.v2, 32],
        ["CC", ROWS.cc, 28],
      ].map(([l, y, h]) => (
        <div key={l as string} className="absolute left-0 flex items-center border-r border-white/10 bg-[#1d1d1d] px-2 font-mono text-[10px] font-bold text-white/55" style={{ top: (y as number) - TL.y, height: h as number, width: TRACK_X - 8 }}>
          {l}
        </div>
      ))}

      {/* chat activity, revealed as the scan passes */}
      <div className="absolute flex items-end gap-[2px] overflow-hidden" style={{ left: TRACK_X, top: ROWS.chat - TL.y, width: TRACK_W, height: 40 }}>
        {BARS.map((h, i) => (
          <span key={i} className="flex-1" style={{ height: `${h}%`, background: h > 60 ? "var(--fluo)" : "rgba(255,255,255,0.3)" }} />
        ))}
        <motion.div className="absolute inset-y-0 right-0 bg-[#161616]" style={{ width: hidden }} />
      </div>
      {SPIKES.map((s, i) => (
        <On key={s} p={p} at={0.04 + s * 0.2} className="absolute -translate-x-1/2 font-mono text-[9px] font-bold text-[var(--fluo)]" style={{ left: TRACK_X + s * TRACK_W, top: ROWS.chat - TL.y - 14 }}>
          {i === 1 ? "▼ 9.4" : "▼"}
        </On>
      ))}

      {/* V1: the full long video as a filmstrip */}
      <div className="absolute overflow-hidden rounded-sm border border-white/15" style={{ left: TRACK_X, top: ROWS.v1 - TL.y, width: TRACK_W, height: 40, backgroundImage: `url(${SRC})`, backgroundSize: "72px 40px", backgroundRepeat: "repeat-x", filter: "saturate(0.7) brightness(0.8)" }} />
      {/* selected segment */}
      <On p={p} at={0.355} className="absolute border-2 border-[var(--fluo)] bg-[var(--fluo)]/20" style={{ left: SEG_A, top: ROWS.v1 - TL.y, width: SEG_W, height: 40 }} />
      {/* razor cuts */}
      {[
        [SEG_A, 0.295],
        [SEG_B, 0.355],
      ].map(([x, at]) => (
        <On key={x} p={p} at={at} className="absolute w-[2px] bg-[var(--fluo)]" style={{ left: x - 1, top: ROWS.chat - TL.y, height: ROWS.v1 + 40 - ROWS.chat }} />
      ))}

      {/* SHORT track */}
      <div className="absolute rounded-sm border border-dashed border-white/10" style={{ left: TRACK_X, top: ROWS.v2 - TL.y, width: TRACK_W, height: 32 }} />
      <motion.div
        className="absolute rounded-sm border-2 border-[var(--fluo)] shadow-[4px_4px_0_rgba(0,0,0,0.6)]"
        style={{ opacity: ghostOn, x: gx, y: useTransform([gy, ghostLift] as MotionValue<number>[], ([a, b]: number[]) => a - TL.y + b), left: 0, top: 0, width: SEG_W, height: 32, backgroundImage: `url(${SRC})`, backgroundSize: "auto 100%" }}
      >
        <span className="absolute left-1 top-0.5 bg-black/70 px-1 font-mono text-[9px] font-bold text-[var(--fluo)]">CLIP 0:38</span>
      </motion.div>

      {/* captions */}
      <div className="absolute rounded-sm border border-dashed border-white/10" style={{ left: TRACK_X, top: ROWS.cc - TL.y, width: TRACK_W, height: 28 }} />
      {WORDS.map((w, i) => (
        <On key={w} p={p} at={WORD_AT[i]} className="absolute grid place-items-center rounded-sm bg-[var(--acid)] font-mono text-[10px] font-bold text-black" style={{ left: TRACK_X + 4 + i * 23, top: ROWS.cc - TL.y + 3, width: 21, height: 22 }}>
          <span className="sr-only">{w}</span>T
        </On>
      ))}

      {/* playhead */}
      <motion.div className="pointer-events-none absolute top-0 bottom-0 w-0" style={{ x: head }}>
        <span className="absolute -left-[6px] top-0 size-3 rotate-45 bg-[var(--acid)]" />
        <span className="absolute -left-px top-2 bottom-0 w-[2px] bg-[var(--acid)]" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

// Cursor path: [progress, x, y]
const PATH: [number, number, number][] = [
  [0, 470, 250],
  [0.2, 470, 250],
  [0.27, SEG_A, ROWS.v1 + 20],
  [0.3, SEG_A, ROWS.v1 + 20],
  [0.34, SEG_B, ROWS.v1 + 20],
  [0.37, SEG_B, ROWS.v1 + 20],
  [0.4, SEG_A + SEG_W / 2, ROWS.v1 + 20],
  [0.41, SEG_A + SEG_W / 2, ROWS.v1 + 20],
  [0.52, TRACK_X + SEG_W / 2, ROWS.v2 + 16],
  [0.54, TRACK_X + SEG_W / 2, ROWS.v2 + 16],
  [0.6, MON.x + 300, MON.y + 170],
  [0.66, MON.x + 380, MON.y + 170],
  [0.7, TRACK_X + 40, ROWS.cc + 14],
  [0.82, TRACK_X + 90, ROWS.cc + 14],
  [0.86, 915, 300],
  [1, 915, 300],
];

function Cursor({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, PATH.map((k) => k[0]), PATH.map((k) => k[1]));
  const y = useTransform(p, PATH.map((k) => k[0]), PATH.map((k) => k[2]));
  const arrow = useTransform(p, (v) => (v < 0.26 || (v > 0.38 && v < 0.405) || v > 0.53 ? 1 : 0));
  const razor = useTransform(p, (v) => (v >= 0.26 && v <= 0.38 ? 1 : 0));
  const grab = useTransform(p, (v) => (v >= 0.405 && v <= 0.53 ? 1 : 0));
  const click = useTransform(p, [0.295, 0.3, 0.31, 0.355, 0.36, 0.37, 0.41, 0.415, 0.52, 0.525, 0.6, 0.605, 0.86, 0.865], [0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1]);
  return (
    <motion.div className="pointer-events-none absolute left-0 top-0 z-10" style={{ x, y }}>
      <motion.span style={{ opacity: click, scale: useTransform(click, [0, 1], [0.4, 1]) }} className="absolute -left-4 -top-4 size-8 rounded-full border-2 border-[var(--acid)]" />
      <motion.svg style={{ opacity: arrow }} viewBox="0 0 24 24" className="absolute -left-0.5 -top-0.5 size-7 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]" aria-hidden>
        <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
      </motion.svg>
      <motion.div style={{ opacity: razor }} className="absolute -left-3 -top-3 grid size-7 place-items-center rounded-full border-2 border-black bg-[var(--fluo)] text-[13px] shadow-[2px_2px_0_black]" aria-hidden>
        ✂
      </motion.div>
      <motion.div style={{ opacity: grab }} className="absolute -left-3 -top-3 grid size-7 place-items-center rounded-full border-2 border-black bg-white text-[14px] shadow-[2px_2px_0_black]" aria-hidden>
        ✊
      </motion.div>
    </motion.div>
  );
}
