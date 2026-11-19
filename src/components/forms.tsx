"use client";

import { motion } from "motion/react";
import { SPRING } from "@/components/motion";

export function Segmented({ value, onChange, options, id }: { value: string; onChange: (v: string) => void; options: [string, string][]; id: string }) {
  return (
    <div className="flex h-10 rounded-lg border border-line bg-surface-2 p-1" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`relative flex-1 rounded-md text-xs transition-colors duration-150 ${value === v ? "text-text" : "text-muted hover:text-text"}`}
        >
          {value === v ? <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-md bg-white/[0.09]" transition={SPRING} /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        onChange(!on);
      }}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-250 ${on ? "bg-pink" : "bg-white/15"}`}
    >
      <motion.span className="absolute top-0.5 size-5 rounded-full bg-white shadow" animate={{ left: on ? 18 : 2 }} transition={SPRING} />
    </button>
  );
}
