"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageTitle, SectionLabel } from "@/components/ui";

type Step = { name: string; count: number; rate: number | null };
type Source = { src: string; visit: number; signup: number; checkout_start: number; subscribed: number; paid: number };
type Day = { day: string; visit: number; signup: number; subscribed: number; paid: number };
type Funnel = { days: number; steps: Step[]; activation: Step[]; cancelled: number; sources: Source[]; daily: Day[] };

const LABEL: Record<string, string> = {
  visit: "Visited the site", pricing_view: "Saw pricing", signup: "Signed up", checkout_start: "Started checkout",
  subscribed: "Started trial or plan", paid: "Paid (real charge)", first_clip: "Made a clip", first_post: "Posted a Short",
};
const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 1000) / 10}%`);

/** Site owner's conversion funnel: where visitors drop off between landing and paying, and which sources convert. */
export default function FunnelPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Funnel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (d = days) => {
    setBusy(true); setErr(null);
    fetch(`/api/admin/funnel?days=${d}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(r.status === 404 ? "This page is for the site owner. Add your email to ADMIN_EMAILS in Vercel." : j.error ?? "Couldn't load."); setData(j); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Couldn't load."))
      .finally(() => setBusy(false));
  };
  useEffect(() => {
    const t = setTimeout(() => load(days), 0); // after paint, so the effect doesn't set state synchronously
    return () => clearTimeout(t);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const top = data?.steps[0]?.count || 0;
  // Biggest drop: the step (after the first) with the lowest conversion from the step before it.
  const worst = data?.steps.slice(1).filter((s) => s.rate !== null).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))[0];

  return (
    <>
      <PageTitle
        title="Conversion funnel"
        sub="Unique people at each step, from first visit to paying. Counted on our own servers: no third-party trackers."
        right={
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`h-9 rounded-lg px-3 text-sm ${d === days ? "bg-white text-black" : "border border-line-strong text-text hover:bg-white/[0.05]"}`}>{d} days</button>
            ))}
            <button onClick={() => load()} aria-label="Refresh" className="grid size-9 place-items-center rounded-lg border border-line-strong hover:bg-white/[0.05]">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </button>
          </div>
        }
      />

      {err ? <p className="mb-4 rounded-lg border border-red/30 bg-red/[0.06] px-3 py-2 text-sm text-red">{err}</p> : null}
      {!data && !err ? <Loader2 className="size-5 animate-spin text-subtle" /> : null}

      {data ? (
        <>
          {worst && top > 0 ? (
            <p className="mb-4 rounded-lg border border-orange/40 bg-orange/[0.06] px-3 py-2 text-sm">
              Biggest drop-off: <span className="font-medium">{LABEL[worst.name]}</span>. Only {pct(worst.rate)} of people from the step before get here. Fix this step first.
            </p>
          ) : null}

          <section className="panel mb-8 p-4">
            <ol className="space-y-2.5">
              {data.steps.map((s) => (
                <li key={s.name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_9rem]">
                  <span className="truncate text-muted">{LABEL[s.name] ?? s.name}</span>
                  <span className="h-6 overflow-hidden rounded bg-white/[0.04]">
                    <span className={`block h-full rounded ${s === worst ? "bg-orange" : "bg-pink"}`} style={{ width: `${top ? Math.max(1.5, (s.count / top) * 100) : 0}%` }} />
                  </span>
                  <span className="num text-right"><span className="font-semibold">{s.count.toLocaleString()}</span> <span className="text-xs text-subtle">{s.rate === null ? "" : `· ${pct(s.rate)}`}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-subtle">The % is the share of people from the step above. Cancelled in this period: <span className="num text-text">{data.cancelled}</span>.</p>
          </section>

          <SectionLabel>After they subscribe</SectionLabel>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {data.activation.map((a) => (
              <div key={a.name} className="panel p-4">
                <p className="text-sm text-muted">{LABEL[a.name]}</p>
                <p className="num mt-1 text-2xl font-semibold">{a.count} <span className="text-sm font-normal text-subtle">{a.rate === null ? "" : `${pct(a.rate)} of subscribers`}</span></p>
              </div>
            ))}
          </div>

          <SectionLabel>Where people come from (first visit)</SectionLabel>
          <div className="panel mb-8 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-subtle">
                <th className="px-4 py-2.5 font-medium">Source</th>{["Visits", "Signups", "Checkouts", "Subscribed", "Paid"].map((h) => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-line">
                {data.sources.length ? data.sources.map((s) => (
                  <tr key={s.src}>
                    <td className="px-4 py-2.5">{s.src}</td>
                    {[s.visit, s.signup, s.checkout_start, s.subscribed, s.paid].map((n, i) => <td key={i} className="num px-4 py-2.5 text-right">{n}</td>)}
                  </tr>
                )) : <tr><td colSpan={6} className="px-4 py-6 text-center text-subtle">No visits recorded yet. Data starts from when tracking went live.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mb-8 text-xs text-subtle">Tag your links to see each campaign separately, e.g. <code className="rounded bg-white/[0.06] px-1">gta6trim.com/?utm_source=tiktok_bio</code>.</p>

          <SectionLabel>By day</SectionLabel>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-subtle">
                <th className="px-4 py-2.5 font-medium">Day (UTC)</th>{["Visits", "Signups", "Subscribed", "Paid"].map((h) => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-line">
                {[...data.daily].reverse().map((d) => (
                  <tr key={d.day}><td className="px-4 py-2.5">{d.day}</td>{[d.visit, d.signup, d.subscribed, d.paid].map((n, i) => <td key={i} className="num px-4 py-2.5 text-right">{n}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
