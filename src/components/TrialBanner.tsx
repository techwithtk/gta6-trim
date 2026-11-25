"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { useAccount, usePlan } from "@/lib/account";
import { useJobs } from "@/lib/jobs";
import { TRIAL } from "@/lib/plans";

/** Free-trial countdown on every dashboard page: time left, what's used, what it costs after, and a way to cancel. */
export function TrialBanner() {
  const account = useAccount();
  const plan = usePlan();
  const { jobs } = useJobs();
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  const end = account.trialEndsAt ?? 0;
  if (!end || !now || now > end || account.team) return null;

  const left = end - now;
  const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000);
  const since = (end - TRIAL.days * 86400_000) / 1000 - 60;
  const mine = jobs.filter((j) => j.createdAt >= since && j.status !== "error");
  const live = mine.filter((j) => j.kind === "live").length;
  const videos = mine.filter((j) => j.kind !== "live" && j.kind !== "drive").length;
  const price = account.cycle === "yearly" ? `$${plan.yearly * 12}/year` : `$${plan.monthly}/month`;
  const soon = left < 6 * 3_600_000;

  const manage = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error ?? "Couldn't open billing.");
      window.location.href = d.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't open billing.");
      setBusy(false);
    }
  };

  return (
    <div role="status" className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-2 px-4 py-3 text-sm ${soon ? "border-orange bg-orange/[0.08]" : "border-pink/60 bg-pink/[0.06]"}`}>
      <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
        <Clock className={`size-4 ${soon ? "text-orange" : "text-pink"}`} /> Free trial · {h}h {m}m left
      </span>
      <span className="text-muted">
        Used <span className="num text-text">{Math.min(live, TRIAL.liveSessions)}/{TRIAL.liveSessions}</span> live sessions ·{" "}
        <span className="num text-text">{Math.min(videos, TRIAL.videos)}/{TRIAL.videos}</span> YouTube videos
      </span>
      <span className="text-muted">
        {soon ? "Ending soon: " : "Then "}your {plan.name} plan starts at <span className="text-text">{price}</span>. Cancel before it ends and you pay nothing.
      </span>
      <button onClick={manage} disabled={busy} className="ml-auto inline-flex h-8 items-center gap-1.5 border border-white/25 px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:border-pink disabled:opacity-50">
        {busy ? <Loader2 className="size-3 animate-spin" /> : null} Manage or cancel
      </button>
      {err ? <p className="basis-full text-xs text-red">{err}</p> : null}
    </div>
  );
}
