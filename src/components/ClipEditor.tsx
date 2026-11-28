"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutPanelTop, Loader2, Pause, Play, RotateCcw, Scissors, Wand2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { refreshJobs } from "@/lib/jobs";

type Word = [number, number, string];
type Sticker = { t: number; emoji: string; spot: string };
type Box = [number, number, number, number]; // x, y, w, h in source pixels
type Boxes = { facecam: Box | null; gameplay: Box; frame?: [number, number]; mode?: "blur" | "fit" };
type Layout = { mode: "split" | "full" | "blur"; cam: Box | null; game: Box };
type Data = { file: string; video: string; dur: number; start: number; end: number; hook: string; title: string; words: Word[]; editing: boolean; editError?: string | null; stickers?: Sticker[]; stickersOff?: boolean; boxes?: Boxes | null };

// The Short is 1080x1920: camera band 1080x768 on top, gameplay 1080x1152 below (or gameplay filling the whole frame).
const A_CAM = 1080 / 768, A_SPLIT = 1080 / 1152, A_FULL = 1080 / 1920;
const gameAspect = (m: Layout["mode"]) => (m === "split" ? A_SPLIT : A_FULL); // blur ignores the box: the whole frame is used
/** Same rule as the worker: keep the box's centre and height, force the panel's shape, keep it inside the frame. */
function fit(b: Box, fw: number, fh: number, aspect: number): Box {
  const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
  let h = Math.max(32, b[3]), w = h * aspect;
  if (w > fw) { w = fw; h = fw / aspect; }
  if (h > fh) { h = fh; w = fh * aspect; }
  const x = Math.min(Math.max(0, cx - w / 2), fw - w), y = Math.min(Math.max(0, cy - h / 2), fh - h);
  return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
}
const defaultCam = (fw: number, fh: number): Box => fit([fw * 0.02, fh * 0.03, fw * 0.3, (fw * 0.3) / A_CAM], fw, fh, A_CAM);
const defaultGame = (fw: number, fh: number, mode: Layout["mode"]): Box => fit([fw / 2 - 1, 0, 2, fh], fw, fh, gameAspect(mode));
const sameLayout = (a: Layout | null, b: Layout | null) => JSON.stringify(a) === JSON.stringify(b);

const MIN = 5, MAX = 90;
const PRIMARY =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-pink font-poster font-black uppercase text-black shadow-[3px_3px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none";
const LABEL = "mb-1.5 flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle";
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/** Trim a clip, fix its caption words and change its hook line, then re-render it in place. */
export function ClipEditor({ target, onClose }: { target: { jobId: string; file: string } | null; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose} title="Edit clip" width={980}>
      {target ? <Loader key={`${target.jobId}/${target.file}`} jobId={target.jobId} file={target.file} onClose={onClose} /> : null}
    </Modal>
  );
}

function Loader({ jobId, file, onClose }: { jobId: string; file: string; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/clips/${jobId}/${file}/edit`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!live) return; if (r.ok) setData(d); else setError(d.error ?? "Couldn't open the editor."); })
      .catch(() => live && setError("Couldn't open the editor."));
    return () => { live = false; };
  }, [jobId, file]);
  if (error) return <p role="alert" className="m-5 border border-red/40 bg-red/[0.07] px-3 py-2 text-sm text-red">{error}</p>;
  if (!data) return <div className="grid h-[420px] place-items-center"><Loader2 className="size-6 animate-spin text-subtle" /></div>;
  return <Editor jobId={jobId} data={data} onClose={onClose} />;
}

function Editor({ jobId, data, onClose }: { jobId: string; data: Data; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [start, setStart] = useState(data.start);
  const [end, setEnd] = useState(data.end);
  const [hook, setHook] = useState(data.hook);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const allStickers = data.stickers ?? [];
  const [stickersOn, setStickersOn] = useState(!data.stickersOff);
  const [t, setT] = useState(data.start);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(data.editError ?? null);
  // Camera / gameplay boxes, in source pixels. Known straight away for clips that saved them; otherwise once the video loads.
  const savedFrame = data.boxes?.frame ?? null;
  const initial: Layout | null = data.boxes?.gameplay && savedFrame
    ? { mode: data.boxes.mode === "blur" || data.boxes.mode === "fit" ? "blur" : data.boxes.facecam ? "split" : "full", cam: data.boxes.facecam ?? null,
        game: data.boxes.mode === "blur" || data.boxes.mode === "fit" ? defaultGame(savedFrame[0], savedFrame[1], "full") : data.boxes.gameplay } : null;
  const templated = data.boxes?.mode === "fit"; // Headline / Meme / Cinematic template: kept unless the layout is changed
  const [frame, setFrame] = useState<[number, number] | null>(savedFrame);
  const [layout, setLayout] = useState<Layout | null>(initial);
  const [base, setBase] = useState<Layout | null>(initial); // what the clip uses now, for Reset and "changed"

  const len = end - start;
  const bad = len < MIN ? `At least ${MIN} seconds.` : len > MAX ? `At most ${MAX} seconds.` : null;
  const text = (i: number) => (i in edits ? edits[i] : data.words[i][2]);
  const inCut = useMemo(() => data.words.map((w, i) => ({ w, i })).filter(({ w }) => w[0] >= start && w[0] < end - 0.05), [data.words, start, end]);
  const active = inCut.findIndex(({ w }, k) => t >= w[0] && (k + 1 >= inCut.length || t < inCut[k + 1].w[0]));
  const group = active >= 0 ? inCut.slice(Math.floor(active / 3) * 3, Math.floor(active / 3) * 3 + 3) : [];
  const changed = start !== data.start || end !== data.end || hook.trim().toUpperCase() !== data.hook || Object.keys(edits).length > 0 || stickersOn === !!data.stickersOff || !sameLayout(layout, base);
  const inCutStickers = allStickers.filter((s) => s.t >= start + 2.6 && s.t <= end - 0.8);
  const showing = stickersOn ? inCutStickers.find((s) => t >= s.t && t < s.t + 1.3) : undefined;

  const seek = (s: number) => { if (video.current) video.current.currentTime = s; setT(s); };
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { if (v.currentTime < start || v.currentTime >= end) v.currentTime = start; v.play().catch(() => {}); } else v.pause();
  };
  const onTime = () => {
    const v = video.current;
    if (!v) return;
    if (!v.paused && v.currentTime >= end) v.currentTime = start;   // loop the cut
    setT(v.currentTime);
  };
  const setStartTo = (s: number) => { const x = Math.max(0, Math.min(s, end - MIN)); setStart(Math.round(x * 10) / 10); seek(x); };
  const setEndTo = (s: number) => { const x = Math.min(data.dur, Math.max(s, start + MIN)); setEnd(Math.round(x * 10) / 10); };
  const reset = () => { setStart(data.start); setEnd(data.end); setHook(data.hook); setEdits({}); setStickersOn(!data.stickersOff); setLayout(base); seek(data.start); };
  const onMeta = () => {
    const v = video.current;
    seek(data.start);
    if (!v || !v.videoWidth || frame) return;
    const fw = v.videoWidth, fh = v.videoHeight, l: Layout = { mode: "full", cam: null, game: defaultGame(fw, fh, "full") };
    setFrame([fw, fh]); setLayout(l); setBase(l);
  };
  const setMode = (mode: Layout["mode"]) => {
    if (!frame || !layout || layout.mode === mode) return;
    const [fw, fh] = frame;
    setLayout({ mode, cam: mode === "split" ? (layout.cam ?? defaultCam(fw, fh)) : layout.cam, game: mode === "blur" ? layout.game : fit(layout.game, fw, fh, gameAspect(mode)) });
  };

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const words = Object.fromEntries(Object.entries(edits).filter(([i, v]) => v !== data.words[Number(i)][2]));
      const r = await fetch(`/api/clips/${jobId}/${data.file}/edit`, {
        method: "POST", headers: { "content-type": "application/json" },
        // Untouched boxes: send nothing. The worker reuses the clip's saved boxes (or auto-detects for older clips).
        body: JSON.stringify({ start, end, hook, words, stickers: stickersOn, layout: layout && !sameLayout(layout, base) ? (layout.mode === "blur" ? { mode: "blur" } : { ...layout, cam: layout.mode === "split" ? layout.cam : null }) : null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't save.");
      refreshJobs();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      setBusy(false);
    }
  };

  const pct = (s: number) => `${(s / data.dur) * 100}%`;

  return (
    <div className="grid max-h-[84vh] gap-6 overflow-y-auto p-5 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Preview: the uncut footage, looping the cut, with the hook and caption drawn on top (the final render reframes to 9:16). */}
      <div className="mx-auto w-full max-w-[260px]">
        <div className="relative aspect-[9/16] overflow-hidden border-2 border-white/85 bg-black">
          <Preview video={video} layout={layout} onClick={toggle} />
          {hook.trim() && t >= start && t < start + 2.6 ? (
            <span className={`pointer-events-none absolute inset-x-3 text-center font-poster text-[22px] font-black uppercase leading-[1.05] text-white [text-shadow:0_2px_0_#000] ${layout?.mode === "split" ? "top-[66%]" : "top-[14%]"}`}>
              <span className="bg-pink box-decoration-clone px-1.5">{hook}</span>
            </span>
          ) : null}
          {group.length ? (
            <span className={`pointer-events-none absolute inset-x-2 -translate-y-1/2 text-center font-poster text-[24px] font-black uppercase text-white [-webkit-text-stroke:1.5px_#000] [paint-order:stroke_fill] ${layout?.mode === "split" ? "top-[40%]" : layout?.mode === "blur" ? "top-[73%]" : "top-[66%]"}`}>
              {group.map(({ i }, k) => <span key={i} className={inCut[active]?.i === i ? "text-pink" : undefined}>{k ? " " : ""}{text(i)}</span>)}
            </span>
          ) : null}
          {showing ? (
            <span className={`pointer-events-none absolute text-[44px] leading-none ${showing.spot === "left" ? "left-[7%] top-[47%]" : showing.spot === "top" ? "right-[6%] top-[4%]" : "right-[7%] top-[47%]"}`}>{showing.emoji}</span>
          ) : null}
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="absolute bottom-2 left-2 grid size-9 place-items-center rounded-full bg-black/70 text-white">
            {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
          </button>
          <span className="num absolute bottom-3 right-2 bg-black/70 px-1 text-[11px]">{fmt(Math.max(0, t - start))}</span>
        </div>
        <p className="mt-2 text-center text-[11px] text-subtle">Live preview of the Short: your cut, layout, hook and captions.</p>
      </div>

      <div className="min-w-0 space-y-5">
        {/* Layout: drag the camera and gameplay boxes on the original footage */}
        <section>
          <div className={LABEL}>
            <span><LayoutPanelTop className="mr-1 inline size-3.5" />Layout</span>
            <span className="flex gap-1 normal-case">
              {(["split", "full", "blur"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} disabled={!layout} aria-pressed={layout?.mode === m}
                  className={`border px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider ${layout?.mode === m ? "border-pink bg-pink/10 text-text" : "border-white/20 hover:border-pink"}`}>
                  {m === "split" ? "Camera + gameplay" : m === "full" ? "Fill" : "Whole picture"}
                </button>
              ))}
            </span>
          </div>
          <Frame video={video} src={data.video} frame={frame} layout={layout} onChange={setLayout}
            onTime={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onMeta={onMeta} />
          {templated && sameLayout(layout, base) ? <p className="mt-1.5 text-[11px] text-muted">This clip uses a template (title bar and framing). Leave the layout as it is to keep the template; picking Split, Full or Blur replaces it.</p> : null}
          {!initial && sameLayout(layout, base) ? <p className="mt-1.5 text-[11px] text-muted">This clip was made before the layout editor, so it keeps its automatic layout unless you change the boxes. The preview shows a starting guess.</p> : null}
          <p className="mt-1.5 text-[11px] text-subtle">
            {layout?.mode === "blur"
              ? <>The whole picture fits the phone&apos;s width, over a blurred copy of itself. Nothing is cropped, so there are no boxes to place.</>
              : layout?.mode === "split"
              ? <><span className="text-pink">Pink</span> is the camera (top of the Short), <span className="text-green">green</span> is the gameplay (bottom). Drag a box to move it, drag its corner to resize.</>
              : <><span className="text-green">Green</span> is what fills the Short (the sides are cropped). Drag to move it, drag its corner to resize. Switch to Camera + gameplay to add the streamer&apos;s webcam on top.</>}
          </p>
        </section>

        {/* Trim */}
        <section>
          <div className={LABEL}><span><Scissors className="mr-1 inline size-3.5" />Trim</span><span className={`num normal-case ${bad ? "text-red" : "text-text"}`}>{len.toFixed(1)}s {bad ? `· ${bad}` : ""}</span></div>
          <div className="relative h-10 border border-white/20 bg-surface-3">
            <div className="absolute inset-y-0 bg-pink/25" style={{ left: pct(start), width: pct(len) }} />
            <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: pct(Math.min(t, data.dur)) }} />
            <input type="range" min={0} max={data.dur} step={0.1} value={start} onChange={(e) => setStartTo(Number(e.target.value))} aria-label="Start"
              className="trim-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent" />
            <input type="range" min={0} max={data.dur} step={0.1} value={end} onChange={(e) => setEndTo(Number(e.target.value))} aria-label="End"
              className="trim-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="num text-muted">Start {fmt(start)}</span>
            <button onClick={() => setStartTo(t)} className="border border-white/20 px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider hover:border-pink">Start here</button>
            <span className="num ml-2 text-muted">End {fmt(end)}</span>
            <button onClick={() => setEndTo(t)} className="border border-white/20 px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider hover:border-pink">End here</button>
            <span className="ml-auto text-subtle">Play, pause where you want, then press a button.</span>
          </div>
        </section>

        {/* Hook */}
        <section>
          <label className="block">
            <span className={LABEL}><span><Wand2 className="mr-1 inline size-3.5" />Hook · first 2.5 seconds</span><span className="num normal-case">{hook.length} / 60</span></span>
            <input value={hook} onChange={(e) => setHook(e.target.value.slice(0, 60))} placeholder="WAIT FOR THE ENDING"
              className="h-10 w-full border border-white/20 bg-bg px-3 text-sm uppercase outline-none placeholder:text-subtle focus:border-pink" />
          </label>
          <p className="mt-1 text-[11px] text-subtle">A short tease that makes people stay. Leave empty for no hook.</p>
        </section>

        {/* Emoji stickers */}
        {allStickers.length ? (
          <section>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={stickersOn} onChange={(e) => setStickersOn(e.target.checked)} className="size-4 accent-[var(--pink)]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">Emoji stickers</span>
              <span className="text-lg leading-none">{inCutStickers.map((s) => s.emoji).join(" ") || "—"}</span>
            </label>
            <p className="mt-1 text-[11px] text-subtle">Picked by AI from what&apos;s said. They pop in for about a second each.</p>
          </section>
        ) : null}

        {/* Caption words */}
        <section>
          <div className={LABEL}><span>Captions</span><span className="normal-case">Click a word to fix it · empty it to remove it</span></div>
          {inCut.length ? (
            <div className="flex max-h-56 flex-wrap gap-1 overflow-y-auto border border-white/15 bg-bg p-2">
              {inCut.map(({ w, i }) => {
                const v = text(i), on = inCut[active]?.i === i;
                return (
                  <input key={i} value={v} onChange={(e) => setEdits((s) => ({ ...s, [i]: e.target.value.slice(0, 40) }))} onFocus={() => seek(w[0])}
                    size={Math.max(2, v.length)} aria-label={`Word at ${fmt(w[0] - start)}`}
                    className={`h-7 border px-1 text-center font-mono text-[12px] uppercase outline-none focus:border-pink ${v.trim() ? "" : "border-dashed text-subtle line-through"} ${on ? "border-pink bg-pink/10" : i in edits ? "border-white/40 bg-white/[0.06]" : "border-transparent bg-white/[0.03]"}`} />
                );
              })}
            </div>
          ) : (
            <p className="border border-white/15 bg-bg px-3 py-4 text-xs text-subtle">No speech in this cut, so there are no captions to edit.</p>
          )}
        </section>

        {error ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button onClick={reset} disabled={!changed || busy} className="mr-auto inline-flex h-10 items-center gap-1.5 px-2 text-sm text-muted hover:text-text disabled:opacity-35"><RotateCcw className="size-3.5" /> Reset</button>
          <button onClick={onClose} className="h-10 border border-line-strong px-4 text-sm text-muted hover:text-text">Cancel</button>
          <button onClick={save} disabled={!changed || !!bad || busy} className={`${PRIMARY} h-10 px-4 text-[17px]`}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" strokeWidth={2.5} />} Save & re-render
          </button>
        </div>
        <p className="text-right text-[11px] text-subtle">Re-rendering takes about a minute. The clip updates in place.</p>
      </div>
    </div>
  );
}

/** The 9:16 preview, drawn every frame from the source video using the layout boxes (same crop as the render). */
function Preview({ video, layout, onClick }: { video: React.RefObject<HTMLVideoElement | null>; layout: Layout | null; onClick: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = video.current, c = canvas.current, g = c?.getContext("2d");
      if (v && c && g && v.readyState >= 2) {
        const W = c.width, H = c.height;
        g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
        if (layout?.mode === "blur") {
          const fw = v.videoWidth || 16, fh = v.videoHeight || 9;
          const cover = Math.max(W / fw, H / fh), bw = fw * cover, bh = fh * cover;
          g.save(); g.filter = "blur(14px) brightness(0.85)";
          g.drawImage(v, (W - bw) / 2, (H - bh) / 2, bw, bh);
          g.restore();
          const fgH = Math.min(H, (W * fh) / fw);
          g.drawImage(v, 0, (H - fgH) / 2, W, fgH);
        } else if (layout) {
          const [gx, gy, gw, gh] = layout.game;
          if (layout.mode === "split" && layout.cam) {
            const top = Math.round(H * 0.4), [cx, cy, cw, ch] = layout.cam;
            g.drawImage(v, cx, cy, cw, ch, 0, 0, W, top);
            g.drawImage(v, gx, gy, gw, gh, 0, top, W, H - top);
          } else g.drawImage(v, gx, gy, gw, gh, 0, 0, W, H);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [video, layout]);
  return <canvas ref={canvas} width={540} height={960} onClick={onClick} className="size-full cursor-pointer" aria-label="Preview of the Short" />;
}

type Drag = { kind: "cam" | "game"; op: "move" | "size"; x0: number; y0: number; box: Box; scale: number };

/** The original (landscape) footage with the camera and gameplay boxes on top. Each box keeps its panel's shape. */
function Frame({ video, src, frame, layout, onChange, onTime, onPlay, onPause, onMeta }: {
  video: React.RefObject<HTMLVideoElement | null>; src: string; frame: [number, number] | null; layout: Layout | null; onChange: (l: Layout) => void;
  onTime: () => void; onPlay: () => void; onPause: () => void; onMeta: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [fw, fh] = frame ?? [16, 9];

  const down = (kind: Drag["kind"], op: Drag["op"]) => (e: React.PointerEvent) => {
    if (!layout || !wrap.current) return;
    const box = kind === "cam" ? layout.cam : layout.game;
    if (!box) return;
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, op, x0: e.clientX, y0: e.clientY, box, scale: fw / wrap.current.getBoundingClientRect().width };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !layout) return;
    const dx = (e.clientX - d.x0) * d.scale, dy = (e.clientY - d.y0) * d.scale;
    const aspect = d.kind === "cam" ? A_CAM : gameAspect(layout.mode);
    const [x, y, w, h] = d.box;
    let next: Box;
    if (d.op === "move") {
      next = [Math.round(Math.min(Math.max(0, x + dx), fw - w)), Math.round(Math.min(Math.max(0, y + dy), fh - h)), w, h];
    } else { // bottom-right corner: grow/shrink with the panel's shape, staying inside the frame
      let nw = Math.max(fh * 0.12 * aspect, w + Math.max(dx, dy * aspect));
      nw = Math.min(nw, fw - x, (fh - y) * aspect);
      next = [x, y, Math.round(nw), Math.round(nw / aspect)];
    }
    onChange(d.kind === "cam" ? { ...layout, cam: next } : { ...layout, game: next });
  };
  const up = () => { drag.current = null; };

  const pct = (b: Box) => ({ left: `${(b[0] / fw) * 100}%`, top: `${(b[1] / fh) * 100}%`, width: `${(b[2] / fw) * 100}%`, height: `${(b[3] / fh) * 100}%` });
  const boxEl = (kind: Drag["kind"], b: Box, color: string, label: string) => (
    <div key={kind} onPointerDown={down(kind, "move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className="absolute cursor-move touch-none border-2" style={{ ...pct(b), borderColor: color, background: `${color}14` }} aria-label={`${label} box`}>
      <span className="absolute -top-[18px] left-[-2px] px-1 font-mono text-[10px] font-bold uppercase text-black" style={{ background: color }}>{label}</span>
      <span onPointerDown={down(kind, "size")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize touch-none border-2 border-black" style={{ background: color }} aria-label={`Resize ${label}`} />
    </div>
  );

  return (
    <div ref={wrap} className="relative w-full select-none overflow-hidden border border-white/20 bg-black" style={{ aspectRatio: `${fw} / ${fh}` }}>
      <video ref={video} src={src} playsInline preload="auto" onTimeUpdate={onTime} onPlay={onPlay} onPause={onPause} onLoadedMetadata={onMeta}
        className="absolute inset-0 size-full object-fill" />
      {layout ? (
        <>
          {layout.mode !== "blur" ? boxEl("game", layout.game, "#4ade80", "Gameplay") : null}
          {layout.mode === "split" && layout.cam ? boxEl("cam", layout.cam, "#ff2e88", "Camera") : null}
        </>
      ) : <div className="absolute inset-0 grid place-items-center"><Loader2 className="size-5 animate-spin text-subtle" /></div>}
    </div>
  );
}
