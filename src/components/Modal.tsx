"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { EASE_OUT, T } from "@/components/motion";

/** Dialog (heavy element: 300–400ms enter, faster exit, no overshoot). Esc + backdrop close. */
export function Modal({ open, onClose, title, children, width = 440 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: T.quick } }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="panel relative w-full overflow-hidden shadow-2xl shadow-black/70"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: T.quick } }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
              <button onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-text" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
