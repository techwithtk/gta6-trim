"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DAILY_VIEWS, POSTED } from "@/lib/mock";
import { PageTitle } from "@/components/ui";

const fmt = (n0: number) => {
  const n = Math.round(n0);
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;
};

export default function PostedPage() {
  const max = Math.max(...DAILY_VIEWS);
  const total = POSTED.reduce((s, p) => s + p.views, 0);
  return (
    <>
      <PageTitle title="Posted"
        art="night" sub="Every clip that went out, and how it's doing." />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] mb-6">
        <section className="panel p-5 flex flex-col">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm text-muted">Views, last 12 days</h2>
            <span className="ml-auto text-xs text-green">+51% vs previous</span>
          </div>
          <div className="mt-1 num text-3xl font-semibold"><AnimatedNumber value={DAILY_VIEWS.reduce((a, b) => a + b, 0) * 1000} format={fmt} /></div>
          <div className="mt-5 flex items-end gap-2 flex-1 min-h-40" role="img" aria-label="Daily views bar chart, rising from 42K to 790K">
            {DAILY_VIEWS.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <motion.div
                  className={`w-full origin-bottom rounded-t ${i === DAILY_VIEWS.length - 1 ? "accent-bg" : "bg-white/[0.12] hover:bg-white/25 transition-colors duration-150"}`}
                  style={{ height: `${(v / max) * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 140, damping: 18 }}
                  title={`${v}K views`}
                />
                <span className="text-[9px] text-muted">{i === DAILY_VIEWS.length - 1 ? "today" : `-${DAILY_VIEWS.length - 1 - i}d`}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          {[
            ["Clips posted (7d)", "86"],
            ["Avg views / clip", fmt(Math.round(total / POSTED.length))],
            ["Best platform", "TikTok"],
            ["Best hour to post", "9–11 PM"],
          ].map(([k, v], i) => (
            <motion.div key={k} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 240, damping: 24 }} className="panel p-4">
              <div className="text-xs text-muted">{k}</div>
              <div className="mt-1 font-display text-xl font-semibold tracking-[-0.01em]">{v}</div>
            </motion.div>
          ))}
        </section>
      </div>

      <section className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Clip</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium text-right">Views</th>
              <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Likes</th>
              <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {POSTED.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.06 }} className="hover:bg-surface-2/60">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted">{p.channel} · {p.posted}</div>
                </td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.platform}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold"><AnimatedNumber value={p.views} format={fmt} /></td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-muted sm:table-cell">{fmt(p.likes)}</td>
                <td className="hidden px-4 py-3 text-right sm:table-cell">
                  {p.trend === "up" ? <TrendingUp className="inline size-4 text-green" /> : p.trend === "down" ? <TrendingDown className="inline size-4 text-red" /> : <Minus className="inline size-4 text-muted" />}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
