"use client";

import { useEffect, useRef } from "react";
import { animate, AnimatePresence, motion, type Transition } from "motion/react";
import { Flame } from "lucide-react";

/* Motion tokens — one signature curve, three durations, one event spring. */
export const EASE = [0.2, 0, 0, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const T = { quick: 0.15, base: 0.25, slow: 0.4 } as const;
export const SPRING: Transition = { type: "spring", stiffness: 380, damping: 32 };
export const SPRING_EVENT: Transition = { type: "spring", stiffness: 520, damping: 20 }; // viral moments only

/** Number that eases to its new value. */
export function AnimatedNumber({ value, format = (v) => Math.round(v).toString() }: { value: number; format?: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: 0.6,
      ease: EASE_OUT,
      onUpdate: (v) => {
        current.current = v;
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format]);
  return <span ref={ref}>{format(0)}</span>;
}

/** Single slow ambient layer. */
export function Ambient() {
  return <div aria-hidden className="ambient" />;
}

/** Radar mark for the page header. */
export function RadarSweep({ size = 40 }: { size?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-xl border border-line-strong bg-surface-2" style={{ width: size, height: size }} aria-hidden>
      <div className="absolute inset-[18%] rounded-full border border-white/10" />
      <div className="absolute inset-[38%] rounded-full border border-white/10" />
      <div className="radar-sweep absolute inset-0 rounded-full" />
      <span className="absolute size-1 rounded-full bg-pink" style={{ top: "30%", left: "64%" }} />
    </div>
  );
}

/** Toast stack for newly detected moments (enter 400ms spring, exit 150ms). */
export function MomentToasts({ toasts }: { toasts: { id: string; channel: string; title: string; score: number }[] }) {
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 flex w-80 flex-col gap-2 md:bottom-6 md:right-6" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, transition: { duration: T.quick, ease: [0.3, 0, 1, 1] } }}
            transition={SPRING_EVENT}
            className="panel relative overflow-hidden p-3.5 shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="grid size-5 place-items-center rounded-md accent-bg"><Flame className="size-3 text-white" /></span>
              <span className="font-medium">Viral moment</span>
              <span className="text-subtle">·</span>
              <span className="text-muted">{t.channel}</span>
              <span className="num ml-auto font-semibold accent-text">{t.score.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-sm leading-snug">{t.title}</p>
            <motion.div className="absolute bottom-0 left-0 h-px accent-bg" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 4, ease: "linear" }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
