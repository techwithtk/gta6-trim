"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { PageTitle, SectionLabel } from "@/components/ui";
import { Segmented } from "@/components/forms";
import { EASE_OUT, T } from "@/components/motion";
import { COMPARISON, MAX_ACCOUNTS_PER_PLATFORM, PLANS, type PlanId } from "@/lib/plans";
import { useAccount } from "@/lib/account";
import { TeamSeats } from "@/components/TeamSeats";

export default function BillingPage() {
  const account = useAccount();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const yearly = cycle === "yearly";
  const myPlan = account.plan;

  const post = async (url: string, body?: object) => {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Something went wrong.");
    return j;
  };
  const change = async (plan: PlanId) => {
    const name = PLANS.find((p) => p.id === plan)!.name;
    if (!window.confirm(`Switch to ${name} (${cycle})? Dodo charges or credits the difference right away.`)) return;
    setBusy(plan);
    setMsg(null);
    try {
      await post("/api/billing/change", { plan, cycle });
      setMsg({ ok: true, text: `You're now on ${name}. Reloading…` });
      window.location.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't change plan." });
      setBusy(null);
    }
  };
  const portal = async () => {
    setBusy("portal");
    setMsg(null);
    try {
      const { url } = await post("/api/billing/portal");
      window.location.href = url;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't open billing." });
      setBusy(null);
    }
  };

  return (
    <>
      <PageTitle
        title="Plans & pricing"
        art="sunset"
        sub="Cancel anytime. Prices in USD."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={portal} disabled={busy !== null} className="h-9 rounded-lg border border-line-strong bg-bg/60 px-3 text-sm text-text backdrop-blur transition-colors duration-150 hover:bg-white/[0.06] disabled:opacity-50">
              {busy === "portal" ? "Opening…" : "Invoices, card & cancel"}
            </button>
            <div className="w-56">
              <Segmented id="cycle" value={cycle} onChange={(v) => setCycle(v as "monthly" | "yearly")} options={[["monthly", "Monthly"], ["yearly", "Yearly · save 20%"]]} />
            </div>
          </div>
        }
      />

      <TeamSeats />
      {msg ? <p role="status" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-green/30 bg-green/[0.06] text-green" : "border-red/30 bg-red/[0.06] text-red"}`}>{msg.text}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const current = p.id === myPlan && (account.cycle ?? "monthly") === cycle;
          const price = yearly ? p.yearly : p.monthly;
          const upgrade = PLANS.findIndex((x) => x.id === myPlan) < i;
          return (
            <motion.section
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: T.slow, ease: EASE_OUT }}
              whileHover={{ y: -3 }}
              className={`panel relative flex flex-col p-6 ${p.highlight ? "glow-border !border-transparent" : ""}`}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                {p.highlight ? <span className="whitespace-nowrap rounded-md accent-bg px-1.5 py-0.5 text-[11px] font-semibold text-white">Most popular</span> : null}
                {current ? <span className="ml-auto whitespace-nowrap rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-inset ring-white/10">Current plan</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted">{p.blurb}</p>

              <div className="mt-5 flex h-12 items-baseline">
                <span className="num text-4xl font-semibold">$</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={price}
                    className="num inline-block text-4xl font-semibold"
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0, transition: { duration: T.quick } }}
                    transition={{ duration: T.base, ease: EASE_OUT }}
                  >
                    {price}
                  </motion.span>
                </AnimatePresence>
                <span className="ml-1.5 text-sm text-muted">/ month</span>
              </div>
              <p className="h-4 text-xs text-subtle">{yearly ? `$${p.yearly * 12} billed yearly` : `or $${p.yearly}/mo billed yearly`}</p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {p.features.map((f, k) => (
                  <motion.li key={f} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 + k * 0.02, duration: T.base }} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-green" /> {f}
                  </motion.li>
                ))}
              </ul>

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={current || busy !== null || account.status !== "ready"}
                onClick={() => change(p.id)}
                className={`mt-6 h-10 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  current ? "border border-line-strong text-subtle" : upgrade ? "bg-white text-black hover:bg-white/90" : "border border-line-strong text-text hover:bg-white/[0.05]"
                }`}
              >
                {busy === p.id ? "Switching…" : current ? "Your plan" : p.id === myPlan ? `Switch to ${cycle}` : upgrade ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
              </motion.button>
            </motion.section>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <ShieldCheck className="size-3.5" />
        Every plan: no watermark, 1080p export, clip downloads and the live stream directory. Auto-posting (up to {MAX_ACCOUNTS_PER_PLATFORM} accounts per platform) is on Studio.
      </p>

      {/* Comparison */}
      <div className="mt-10">
        <SectionLabel>Compare plans</SectionLabel>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="sticky left-0 z-[1] bg-surface px-4 py-3 text-xs font-medium text-subtle">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={`px-4 py-3 text-center font-display font-semibold ${p.highlight ? "accent-text" : ""}`}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARISON.map((row) => (
                <tr key={row.label} className="transition-colors duration-150 hover:bg-white/[0.02]">
                  <td className="sticky left-0 z-[1] max-w-[150px] bg-surface px-4 py-3 text-muted">{row.label}</td>
                  {PLANS.map((p) => {
                    const v = row.values(p);
                    return (
                      <td key={p.id} className="px-4 py-3 text-center">
                        {v === true ? <Check className="mx-auto size-4 text-green" aria-label="Included" /> : v === false ? <Minus className="mx-auto size-4 text-subtle" aria-label="Not included" /> : <span className="num">{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
