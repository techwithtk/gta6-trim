"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Sparkles, RefreshCw, Check } from "lucide-react";
import { Modal } from "@/components/Modal";
import { VerticalClip } from "@/components/ui";
import { Segmented } from "@/components/forms";
import { EASE_OUT, SPRING, T } from "@/components/motion";
import { AI_SUGGESTIONS, CAPTION_STYLES, PLATFORM_LIMITS, SAMPLE_TRANSCRIPT } from "@/lib/captions";
import { usePlan } from "@/lib/account";

export type EditableClip = { id: string; title: string; captionWord: string; caption: string; styleId: string; scene: readonly [string, string, string]; image?: string };

/** Caption generator + AI title/hashtag writer for one clip. */
export function CaptionEditor({ clip, onClose, onSave }: { clip: EditableClip | null; onClose: () => void; onSave: (c: EditableClip) => void }) {
  return (
    <Modal open={!!clip} onClose={onClose} title="Captions & post text" width={920}>
      {clip ? <Editor key={clip.id} clip={clip} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function Editor({ clip, onClose, onSave }: { clip: EditableClip; onClose: () => void; onSave: (c: EditableClip) => void }) {
  const plan = usePlan();
  const aiTitles = plan.id !== "starter";
  const [tab, setTab] = useState("captions");
  const [styleId, setStyleId] = useState(clip.styleId);
  const [lines, setLines] = useState(SAMPLE_TRANSCRIPT);
  const [active, setActive] = useState(3);
  const [suggestion, setSuggestion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [text, setText] = useState(() => ({
    tiktok: `${clip.title} ${AI_SUGGESTIONS[0].tags}`,
    instagram: `${clip.title}\n\n${AI_SUGGESTIONS[0].tags}`,
    youtube: clip.title,
    facebook: clip.title,
  }));

  const preview = lines[active]?.text.toUpperCase().split(" ").slice(-3).join(" ") ?? clip.captionWord;

  const regenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const n = (suggestion + 1) % AI_SUGGESTIONS.length;
      const s = AI_SUGGESTIONS[n];
      setSuggestion(n);
      setText({ tiktok: `${s.title} ${s.tags}`, instagram: `${s.title}\n\n${s.tags}`, youtube: s.title, facebook: s.title });
      setGenerating(false);
    }, 900);
  };

  return (
    <div className="grid gap-6 p-5 md:grid-cols-[240px_minmax(0,1fr)]">
      {/* Live preview */}
      <div className="mx-auto w-full max-w-[240px]">
        <div className="overflow-hidden rounded-2xl border border-line-strong">
          <VerticalClip scene={clip.scene} hook={clip.title} caption={preview} styleId={styleId} animate={false} image={clip.image} />
        </div>
        <p className="mt-2 text-center text-xs text-subtle">Live preview · click a line to see it</p>
      </div>

      <div className="min-w-0">
        <Segmented id="cap-tab" value={tab} onChange={setTab} options={[["captions", "Captions"], ["post", "Title & hashtags"]]} />

        <AnimatePresence mode="wait" initial={false}>
          {tab === "captions" ? (
            <motion.div key="cap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: T.quick } }} transition={{ duration: T.base, ease: EASE_OUT }} className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium">Style</span>
                <span className="text-xs text-subtle">{plan.limits.captionStyles} of {CAPTION_STYLES.length} unlocked on {plan.name}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CAPTION_STYLES.map((c, i) => {
                  const locked = i >= plan.limits.captionStyles;
                  const on = styleId === c.id;
                  return (
                    <button key={c.id} disabled={locked} onClick={() => setStyleId(c.id)} aria-pressed={on} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors duration-150 ${on ? "border-pink/60 bg-pink/[0.06]" : "border-line bg-surface-2 hover:border-line-strong"} disabled:cursor-not-allowed disabled:opacity-40`}>
                      <span className={c.box}><span className={`text-[12px] ${c.text}`}>{c.id === "karaoke" ? <>ONE <em>JOB</em></> : "ONE JOB"}</span></span>
                      <span className="text-[10px] text-subtle">{c.name}</span>
                      {locked ? <Lock className="absolute right-1 top-1 size-3 text-subtle" /> : null}
                      {on ? <motion.span layoutId="ed-style-ring" className="absolute inset-0 rounded-lg ring-1 ring-pink" transition={SPRING} /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mb-2 mt-5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Transcript</span>
                <span className="text-xs text-subtle">Auto-generated · edit any line</span>
              </div>
              <ol className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {lines.map((l, i) => (
                  <li key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-150 ${active === i ? "border-pink/40 bg-pink/[0.04]" : "border-line bg-surface-2"}`}>
                    <button onClick={() => setActive(i)} className="num w-9 shrink-0 text-left text-xs text-subtle hover:text-text" aria-label={`Preview line at ${l.t}`}>{l.t}</button>
                    <input
                      value={l.text}
                      onFocus={() => setActive(i)}
                      onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))}
                      className="w-full bg-transparent text-sm outline-none"
                      aria-label={`Caption line ${i + 1}`}
                    />
                  </li>
                ))}
              </ol>
            </motion.div>
          ) : (
            <motion.div key="post" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: T.quick } }} transition={{ duration: T.base, ease: EASE_OUT }} className="mt-5 space-y-4">
              {aiTitles ? (
                <button onClick={regenerate} disabled={generating} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm transition-colors duration-150 hover:bg-white/[0.05] disabled:opacity-60">
                  {generating ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4 text-pink" />}
                  {generating ? "Writing…" : "Regenerate with AI"}
                </button>
              ) : (
                <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                  <Lock className="mr-1 inline size-3" /> AI titles & hashtags are on Pro and Studio. <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Upgrade</Link>
                </p>
              )}
              {(Object.keys(PLATFORM_LIMITS) as (keyof typeof PLATFORM_LIMITS)[]).map((k) => {
                const lim = PLATFORM_LIMITS[k];
                const len = text[k].length;
                const over = len > lim.max;
                return (
                  <div key={k}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <label htmlFor={`pt-${k}`} className="text-sm font-medium">{lim.label}</label>
                      <span className={`num text-xs ${over ? "text-red" : "text-subtle"}`}>{len} / {lim.max}</span>
                    </div>
                    <motion.textarea
                      key={`${k}-${suggestion}`}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: T.slow }}
                      id={`pt-${k}`}
                      rows={k === "instagram" ? 3 : 2}
                      value={text[k]}
                      onChange={(e) => setText((t) => ({ ...t, [k]: e.target.value }))}
                      className={`w-full resize-none rounded-lg border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-pink/60 ${over ? "border-red/60" : "border-line"}`}
                    />
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="h-9 rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors duration-150 hover:text-text">Cancel</button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSave({ ...clip, styleId, captionWord: preview, caption: text.tiktok, title: text.youtube || clip.title })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90"
          >
            <Check className="size-4" /> Save captions
          </motion.button>
        </div>
      </div>
    </div>
  );
}
