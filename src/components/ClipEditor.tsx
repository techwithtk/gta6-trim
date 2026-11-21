"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Scissors, Wand2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { refreshJobs } from "@/lib/jobs";

type Word = [number, number, string];
type Data = { file: string; video: string; dur: number; start: number; end: number; hook: string; title: string; words: Word[]; editing: boolean; editError?: string | null };

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
  const [t, setT] = useState(data.start);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(data.editError ?? null);

  const len = end - start;
  const bad = len < MIN ? `At least ${MIN} seconds.` : len > MAX ? `At most ${MAX} seconds.` : null;
  const text = (i: number) => (i in edits ? edits[i] : data.words[i][2]);
  const inCut = useMemo(() => data.words.map((w, i) => ({ w, i })).filter(({ w }) => w[0] >= start && w[0] < end - 0.05), [data.words, start, end]);
  const active = inCut.findIndex(({ w }, k) => t >= w[0] && (k + 1 >= inCut.length || t < inCut[k + 1].w[0]));
  const group = active >= 0 ? inCut.slice(Math.floor(active / 3) * 3, Math.floor(active / 3) * 3 + 3) : [];
  const changed = start !== data.start || end !== data.end || hook.trim().toUpperCase() !== data.hook || Object.keys(edits).length > 0;

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
  const reset = () => { setStart(data.start); setEnd(data.end); setHook(data.hook); setEdits({}); seek(data.start); };

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const words = Object.fromEntries(Object.entries(edits).filter(([i, v]) => v !== data.words[Number(i)][2]));
      const r = await fetch(`/api/clips/${jobId}/${data.file}/edit`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ start, end, hook, words }),
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
          <video ref={video} src={data.video} playsInline preload="auto" onTimeUpdate={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onLoadedMetadata={() => seek(data.start)} className="size-full object-cover" onClick={toggle} />
          {hook.trim() && t >= start && t < start + 2.6 ? (
            <span className="pointer-events-none absolute inset-x-3 top-[14%] text-center font-poster text-[22px] font-black uppercase leading-[1.05] text-white [text-shadow:0_2px_0_#000]">
              <span className="bg-pink box-decoration-clone px-1.5">{hook}</span>
            </span>
          ) : null}
          {group.length ? (
            <span className="pointer-events-none absolute inset-x-2 top-[52%] text-center font-poster text-[24px] font-black uppercase text-white [-webkit-text-stroke:1.5px_#000] [paint-order:stroke_fill]">
              {group.map(({ i }, k) => <span key={i} className={inCut[active]?.i === i ? "text-pink" : undefined}>{k ? " " : ""}{text(i)}</span>)}
            </span>
          ) : null}
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="absolute bottom-2 left-2 grid size-9 place-items-center rounded-full bg-black/70 text-white">
            {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
          </button>
          <span className="num absolute bottom-3 right-2 bg-black/70 px-1 text-[11px]">{fmt(Math.max(0, t - start))}</span>
        </div>
        <p className="mt-2 text-center text-[11px] text-subtle">Preview of your cut. The saved Short uses the same webcam + gameplay layout as before.</p>
      </div>

      <div className="min-w-0 space-y-5">
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
