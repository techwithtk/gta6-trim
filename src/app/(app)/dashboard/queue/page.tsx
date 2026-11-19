"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, Captions, Play, Clock } from "lucide-react";
import { QUEUE } from "@/lib/mock";
import { PageTitle, VerticalClip } from "@/components/ui";
import { CaptionEditor, type EditableClip } from "@/components/CaptionEditor";
import { EASE, EASE_OUT, SPRING, SPRING_EVENT, T } from "@/components/motion";

const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", shorts: "Shorts", reels: "Reels" };
type State = "pending" | "approved" | "rejected";

export default function QueuePage() {
  const [items, setItems] = useState(QUEUE.map((c) => ({ ...c, styleId: "pop", state: "pending" as State })));
  const [editing, setEditing] = useState<EditableClip | null>(null);
  const pending = items.filter((i) => i.state === "pending").length;
  const set = (id: string, state: State) => setItems((p) => p.map((i) => (i.id === id ? { ...i, state } : i)));

  // Cascade approvals 90ms apart — total stays under the 500ms stagger budget.
  const approveAll = () => items.filter((i) => i.state === "pending").forEach((i, n) => setTimeout(() => set(i.id, "approved"), n * 90));

  return (
    <>
      <PageTitle
        title="Clip Queue"
        art="neon"
        sub={pending ? `${pending} clips waiting for review · 8.5+ from owned channels auto-post` : "All caught up · new clips appear here as moments are detected"}
        right={
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ duration: T.quick }}
            onClick={approveAll}
            disabled={!pending}
            className="inline-flex h-9 items-center gap-2 rounded-lg accent-bg px-4 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(255,46,136,0.9)] transition-opacity duration-150 disabled:opacity-30 disabled:shadow-none"
          >
            <Check className="size-4" /> Approve all
            <span className="num rounded bg-black/20 px-1.5 text-xs">{pending}</span>
          </motion.button>
        }
      />

      <motion.div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
        <AnimatePresence mode="popLayout">
          {items.map((c, idx) =>
            c.state === "rejected" ? null : (
              <motion.article
                key={c.id}
                layout
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: T.slow, ease: EASE_OUT } } }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: T.quick, ease: [0.3, 0, 1, 1] } }}
                transition={{ layout: SPRING }}
                className={`panel group flex flex-col overflow-hidden transition-[border-color] duration-250 ${c.state === "approved" ? "!border-green/40" : "hover:!border-line-strong"}`}
              >
                <div className="relative">
                  <VerticalClip scene={c.scene} hook={c.title} caption={c.captionWord} seed={idx + 1} styleId={c.styleId} image={c.image} />
                  <button className="absolute inset-0 m-auto grid size-12 place-items-center rounded-full bg-black/45 ring-1 ring-white/20 backdrop-blur transition-transform duration-150 group-hover:scale-105 active:scale-95" aria-label={`Play preview of ${c.title}`}>
                    <Play className="ml-0.5 size-5 fill-white text-white" />
                  </button>
                  <span className="num absolute right-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur">★ {c.score}</span>
                  <span className="num absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] backdrop-blur"><Clock className="size-3" />0:{c.length}</span>

                  {/* Success state: overlay fades, check circle pops, check mark draws */}
                  <AnimatePresence>
                    {c.state === "approved" ? (
                      <motion.div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: T.base, ease: EASE }}>
                        <div className="flex flex-col items-center gap-3">
                          <motion.div className="grid size-16 place-items-center rounded-full bg-green shadow-[0_10px_40px_-8px_rgba(34,197,94,0.8)]" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={SPRING_EVENT}>
                            <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
                              <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.12 }} />
                            </svg>
                          </motion.div>
                          <motion.div className="text-center" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: T.base, ease: EASE_OUT, delay: 0.2 }}>
                            <div className="text-sm font-medium">Scheduled</div>
                            <div className="mt-0.5 text-xs text-muted">{c.platforms.map((p) => PLATFORM_LABEL[p]).join(" · ")}</div>
                          </motion.div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-subtle">{c.channel}</p>
                  <p className="mt-1 text-sm font-medium leading-snug">{c.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{c.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.platforms.map((p) => (
                      <span key={p} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-inset ring-white/[0.06]">{PLATFORM_LABEL[p]}</span>
                    ))}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    {c.state === "pending" ? (
                      <motion.div key="actions" exit={{ opacity: 0, transition: { duration: T.quick } }} className="mt-auto grid grid-cols-[1fr_auto_auto] gap-2 pt-4">
                        <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: T.quick }} onClick={() => set(c.id, "approved")} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90">
                          <Check className="size-4" /> Post
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditing(c)} className="grid size-9 place-items-center rounded-lg border border-line-strong text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-text" aria-label={`Edit captions for ${c.title}`} title="Captions & post text">
                          <Captions className="size-4" strokeWidth={1.75} />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => set(c.id, "rejected")} className="grid size-9 place-items-center rounded-lg border border-line-strong text-muted transition-colors duration-150 hover:border-red/40 hover:bg-red/10 hover:text-red" aria-label={`Reject ${c.title}`}>
                          <X className="size-4" strokeWidth={1.75} />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.button key="undo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: T.base, delay: 0.25 }} onClick={() => set(c.id, "pending")} className="mt-auto pt-4 text-left text-xs text-muted underline-offset-4 hover:text-text hover:underline">
                        Undo
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            ),
          )}
        </AnimatePresence>
      </motion.div>
      <CaptionEditor
        clip={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          setItems((p) => p.map((i) => (i.id === c.id ? { ...i, styleId: c.styleId, captionWord: c.captionWord, caption: c.caption, title: c.title } : i)));
          setEditing(null);
        }}
      />
    </>
  );
}
