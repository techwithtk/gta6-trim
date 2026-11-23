"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Repeat2 } from "lucide-react";
import { PLATFORM_META, type SocialAccount } from "@/lib/social";

type Settings = { on: boolean; accounts: string[]; multiple: number; delayDays: number; consent: boolean; lastRunAt: number; count: number;
  last?: { at: number; ok: boolean; posted?: string | null; title?: string | null; message?: string } | null };

const MULTIPLES = [{ v: 2, label: "2× my usual views" }, { v: 3, label: "3× my usual views" }, { v: 5, label: "5× my usual views" }];
const DELAYS = [{ v: 2, label: "2 days" }, { v: 3, label: "3 days" }, { v: 5, label: "5 days" }, { v: 7, label: "7 days" }];

/** Studio: once a day, re-post the clip that beat the customer's usual views to the accounts it isn't on yet. */
export function RepostCard({ accounts, ready }: { accounts: SocialAccount[]; ready: boolean }) {
  const [s, setS] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const usable = accounts.filter((a) => a.active);

  useEffect(() => {
    fetch("/api/repost", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setS(d); setDraft(d); } }).catch(() => {});
  }, []);
  if (!draft || !s) return <div className="mb-8 h-28 animate-pulse bg-surface" />;

  const set = (p: Partial<Settings>) => { setDraft({ ...draft, ...p }); setMsg(null); };
  const tiktok = usable.some((a) => a.platform === "tiktok" && draft.accounts.includes(a.id));
  const dirty = JSON.stringify([draft.on, draft.accounts, draft.multiple, draft.delayDays, draft.consent]) !== JSON.stringify([s.on, s.accounts, s.multiple, s.delayDays, s.consent]);
  const blocked = draft.on && (!draft.accounts.length || (tiktok && !draft.consent));

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/repost", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: draft.on, accounts: draft.accounts, consent: draft.consent, multiple: draft.multiple, delayDays: draft.delayDays }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't save.");
      setS(d); setDraft(d);
      setMsg({ ok: true, text: d.on ? "Saved. We check once a day." : "Auto-repost is off." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally { setBusy(false); }
  };

  return (
    <section className={`mb-8 border p-4 ${draft.on ? "border-pink/60 bg-pink/[0.03]" : "border-line bg-surface"}`} aria-label="Auto-repost">
      <label className="flex cursor-pointer flex-wrap items-center gap-3">
        <input type="checkbox" checked={draft.on} onChange={(e) => set({ on: e.target.checked, accounts: e.target.checked && !draft.accounts.length ? usable.map((a) => a.id) : draft.accounts })} className="size-4 accent-[var(--pink)]" />
        <Repeat2 className="size-4 text-pink" />
        <span className="font-poster text-[22px] font-black uppercase leading-none">Auto-repost winners</span>
        <span className="text-xs text-subtle">once a day</span>
      </label>
      <p className="mt-2 max-w-2xl text-sm text-muted">When a clip gets far more views than your usual, we post it again to your other accounts a few days later, with fresh text. One repost a day at most, and never to an account that already has it.</p>

      {draft.on ? (
        !ready ? <p className="mt-3 text-xs text-subtle">Loading your accounts…</p>
        : !usable.length ? <p className="mt-3 text-xs text-muted">No accounts connected yet. <Link href="/dashboard/integrations" className="text-text underline underline-offset-2">Connect one</Link> first.</p>
        : (
          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-subtle">Repost to</p>
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {usable.map((a) => {
                  const on = draft.accounts.includes(a.id), m = PLATFORM_META[a.platform];
                  return (
                    <li key={a.id}>
                      <label className={`flex cursor-pointer items-center gap-2 border px-2 py-1.5 text-xs ${on ? "border-pink" : "border-line"}`}>
                        <input type="checkbox" checked={on} onChange={() => set({ accounts: on ? draft.accounts.filter((x) => x !== a.id) : [...draft.accounts, a.id] })} className="size-3.5 accent-[var(--pink)]" />
                        <span className="grid size-5 shrink-0 place-items-center text-[10px] font-bold text-white" style={{ background: m.color }}>{m.letter}</span>
                        <span className="truncate">{a.displayName || a.username}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:max-w-xl">
              <label className="text-xs text-subtle">A clip counts as a winner at
                <select value={draft.multiple} onChange={(e) => set({ multiple: Number(e.target.value) })} className="mt-1 h-9 w-full border border-white/20 bg-bg px-2 text-sm text-text outline-none focus:border-pink">
                  {MULTIPLES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-subtle">Wait after the first post
                <select value={draft.delayDays} onChange={(e) => set({ delayDays: Number(e.target.value) })} className="mt-1 h-9 w-full border border-white/20 bg-bg px-2 text-sm text-text outline-none focus:border-pink">
                  {DELAYS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
            </div>
            {tiktok ? (
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted">
                <input type="checkbox" checked={draft.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 size-3.5 accent-[var(--pink)]" />
                <span>I agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline underline-offset-2">Music Usage Confirmation</a> for these posts. They post publicly.</span>
              </label>
            ) : null}
          </div>
        )
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {dirty ? (
          <button onClick={save} disabled={busy || blocked} className="inline-flex h-9 items-center gap-2 border-2 border-black bg-pink px-4 font-poster text-[16px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa] disabled:opacity-40 disabled:shadow-none">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save
          </button>
        ) : null}
        {msg ? <p className={`text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p> : null}
        {!msg && s.last ? (
          <p className={`text-xs ${s.last.posted ? "text-green" : s.last.ok ? "text-subtle" : "text-red"}`}>
            Last check {new Date(s.last.at * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {s.last.posted ? `reposted “${s.last.title ?? "a clip"}”` : s.last.message || "nothing to repost"}
            {s.count ? ` · ${s.count} reposted so far` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
