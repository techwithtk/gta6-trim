"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper, X } from "lucide-react";

/** Shown once after a successful Dodo checkout (/dashboard?welcome=1). */
export function WelcomeBanner() {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("welcome") === "1");
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-5 flex items-start gap-3 rounded-xl border border-green/30 bg-green/[0.07] px-4 py-3 text-sm"
        >
          <PartyPopper className="mt-0.5 size-4 shrink-0 text-green" />
          <p className="flex-1">
            <span className="font-medium text-text">Payment confirmed. Welcome to GTA6 Trim.</span>{" "}
            <span className="text-muted">Your receipt is on its way by email. Pick a live stream below to start clipping.</span>
          </p>
          <button onClick={() => setOpen(false)} aria-label="Dismiss" className="text-muted hover:text-text">
            <X className="size-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
