"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, Users, X } from "lucide-react";
import { useAccount, usePlan } from "@/lib/account";

type Seat = { email: string; createdAt: number };

/**
 * Team seats on Plan & billing. Owners on Studio invite people by email; members see whose team they're on.
 * Invited people get access when they sign in to GTA6 Trim with that exact email (no password sharing).
 */
export function TeamSeats() {
  const account = useAccount();
  const plan = usePlan();
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [max, setMax] = useState(0);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const owner = !account.team && plan.limits.seats > 1 && !!account.plan;

  const load = () => fetch("/api/team", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.seats) { setSeats(d.seats); setMax(d.max); } }).catch(() => {});
  useEffect(() => { if (owner) load(); }, [owner]);

  if (account.status !== "ready" || !account.plan) return null;

  if (account.team) {
    return (
      <section className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
        <Users className="mt-0.5 size-4 shrink-0 text-pink" />
        <p className="text-muted">You&apos;re on <span className="font-medium text-text">{account.team.owner}</span>&apos;s {plan.name} team. You share their clips, live sessions, connected accounts and brand kit. Billing is handled by the team owner.</p>
      </section>
    );
  }

  if (!owner) {
    return (
      <section className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
        <Users className="mt-0.5 size-4 shrink-0 text-subtle" />
        <p className="text-muted">Need teammates? Studio includes 3 seats: invite 2 people to share your clips, live sessions and accounts.</p>
      </section>
    );
  }

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't invite.");
      setEmail("");
      setMsg({ ok: true, text: `Invited ${d.email}. Ask them to sign in at gta6trim.com with that email.` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't invite." });
    } finally { setBusy(false); }
  };
  const remove = async (s: Seat) => {
    if (!window.confirm(`Remove ${s.email} from your team? They lose access within about 30 minutes.`)) return;
    setSeats((x) => x?.filter((y) => y.email !== s.email) ?? x);
    await fetch(`/api/team?email=${encodeURIComponent(s.email)}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  const used = (seats?.length ?? 0) + 1;
  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="size-4 text-pink" />
        <h2 className="font-display text-lg font-semibold">Your team</h2>
        <span className="num text-xs text-subtle">{used} of {max + 1} seats used</span>
      </div>
      <p className="mt-1 text-sm text-muted">Teammates share your clips, live sessions, connected accounts and brand kit. They can&apos;t change billing. They sign in with their own Google, Twitch or email account, so no passwords are shared.</p>

      <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
        <li className="flex items-center gap-3 py-2"><span className="flex-1 truncate">{account.user?.email}</span><span className="text-xs text-subtle">Owner (you)</span></li>
        {seats === null ? <li className="py-2"><Loader2 className="size-4 animate-spin text-subtle" /></li> : seats.map((s) => (
          <li key={s.email} className="flex items-center gap-3 py-2">
            <span className="flex-1 truncate">{s.email}</span>
            <span className="text-xs text-subtle">Member</span>
            <button onClick={() => remove(s)} aria-label={`Remove ${s.email}`} title="Remove" className="text-subtle hover:text-red"><X className="size-4" /></button>
          </li>
        ))}
      </ul>

      {seats && seats.length < max ? (
        <form onSubmit={invite} className="mt-3 flex flex-wrap gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" aria-label="Teammate's email"
            className="h-9 w-full rounded-lg border border-white/20 bg-bg px-3 text-sm outline-none placeholder:text-subtle focus:border-pink sm:w-72" />
          <button disabled={busy || !email.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-pink px-3 text-sm font-medium text-black disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Invite
          </button>
        </form>
      ) : seats ? <p className="mt-3 text-xs text-subtle">All seats are in use. Remove someone to invite another.</p> : null}
      {msg ? <p className={`mt-2 text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p> : null}
      <p className="mt-2 text-xs text-subtle">Need more seats? <Link href="mailto:hello@gta6trim.com" className="underline underline-offset-2">Contact us</Link>.</p>
    </section>
  );
}
