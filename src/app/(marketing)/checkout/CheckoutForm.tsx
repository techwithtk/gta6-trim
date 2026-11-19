"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Lock, ShieldCheck } from "lucide-react";
import { Segmented } from "@/components/forms";
import { EASE_OUT, SPRING, T } from "@/components/motion";
import { PLANS, type PlanId } from "@/lib/plans";
import { SignOutButton } from "@clerk/nextjs";
import { useAccount } from "@/lib/account";

const ERRORS: Record<string, string> = {
  not_paid: "That payment didn't go through. You haven't been charged. Try again or use another card.",
  pending: "Your payment is still processing. Refresh in a minute, or check your email for the receipt.",
  lookup: "We couldn't confirm your payment yet. If you were charged, email hello@gta6trim.com and we'll sort it.",
  missing: "Checkout was closed before payment finished.",
  unknown_product: "We couldn't match that payment to a plan. Email hello@gta6trim.com.",
  other_account: "That payment belongs to a different email. Sign in with the Google account you paid with.",
  not_live: "Payments open very soon. Nothing was charged.",
};

/** The pay button only works once Dodo Payments is configured on the server (no fake checkout). */
export function CheckoutForm({ live }: { live: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialPlan = (PLANS.find((p) => p.id === params.get("plan"))?.id ?? "pro") as PlanId;
  const [planId, setPlanId] = useState<PlanId>(initialPlan);
  const [cycle, setCycle] = useState<"monthly" | "yearly">(params.get("cycle") === "yearly" ? "yearly" : "monthly");
  const account = useAccount();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => ERRORS[params.get("error") ?? ""] ?? null);

  const plan = PLANS.find((p) => p.id === planId)!;
  const perMonth = cycle === "yearly" ? plan.yearly : plan.monthly;
  const dueToday = cycle === "yearly" ? plan.yearly * 12 : plan.monthly;
  const signedIn = !!account.user;
  const ready = signedIn && agree;
  const signInHref = `/login?redirect_url=${encodeURIComponent(`/checkout?plan=${planId}&cycle=${cycle}`)}`;

  const pay = async () => {
    if (!ready || !live || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: planId, cycle }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error ?? "Couldn't start checkout.");
      window.location.href = j.url; // Dodo's hosted, secure checkout
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
      setBusy(false);
    }
  };

  const choose = (id: PlanId) => {
    setPlanId(id);
    router.replace(`/checkout?plan=${id}&cycle=${cycle}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
      <Link href="/#pricing" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text">
        <ArrowLeft className="size-4" /> Back to plans
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em]">Start your {plan.name} plan</h1>
      <p className="mt-1 text-muted">After payment your dashboard opens right away.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Plan summary */}
        <section className="panel p-5 md:p-6">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Plan">
            {PLANS.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={p.id === planId}
                onClick={() => choose(p.id)}
                className={`relative rounded-xl border px-3 py-3 text-left transition-colors duration-150 ${p.id === planId ? "border-pink/60 bg-pink/[0.05]" : "border-line hover:border-line-strong"}`}
              >
                {p.id === planId ? <motion.span layoutId="co-plan" className="absolute inset-0 rounded-xl ring-1 ring-pink" transition={SPRING} /> : null}
                <div className="text-sm font-medium">{p.name}</div>
                <div className="num mt-0.5 text-xs text-muted">${cycle === "yearly" ? p.yearly : p.monthly}/mo</div>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <Segmented id="co-cycle" value={cycle} onChange={(v) => setCycle(v as "monthly" | "yearly")} options={[["monthly", "Monthly"], ["yearly", "Yearly · save 20%"]]} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.ul key={planId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: T.quick } }} transition={{ duration: T.base, ease: EASE_OUT }} className="mt-6 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green" /> {f}</li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </section>

        {/* Account + pay */}
        <section className="panel h-fit p-5 md:p-6">
          <h2 className="font-display text-lg font-semibold">Your account</h2>
          {params.get("need") === "plan" && signedIn && !account.plan ? (
            <p className="mt-3 rounded-lg border border-pink/30 bg-pink/[0.06] px-3 py-2 text-xs text-text">Pick a plan to open your dashboard.</p>
          ) : null}
          {account.status === "loading" ? (
            <div className="mt-4 h-11 animate-pulse rounded-lg bg-surface-2" />
          ) : signedIn ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              {account.user!.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.user!.picture} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{account.user!.name}</p>
                <p className="truncate text-xs text-muted">{account.user!.email}</p>
              </div>
              <SignOutButton redirectUrl={`/login?redirect_url=${encodeURIComponent(`/checkout?plan=${planId}&cycle=${cycle}`)}`}>
                <button className="text-xs text-subtle underline underline-offset-2 hover:text-text">Switch</button>
              </SignOutButton>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted">Sign in or create a free account first (Google, Discord, Twitch or email). Your plan is saved to it, so you can log in from any device.</p>
              <Link href={signInHref} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-white text-[15px] font-medium text-black transition-colors duration-150 hover:bg-white/90">
                Sign in to continue
              </Link>
            </>
          )}
          {signedIn && account.plan ? (
            <p className="mt-3 text-xs text-muted">
              You already have the {PLANS.find((p) => p.id === account.plan)?.name} plan. To change it, use <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Plan & billing</Link>.
            </p>
          ) : null}

          <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <Row label={`${plan.name} · ${cycle}`} value={`$${perMonth}/mo`} />
            {cycle === "yearly" ? <Row label="Billed yearly" value={`$${plan.yearly * 12}`} /> : null}
            <Row label="Due today" value={`$${dueToday}`} strong />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs text-muted">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
            <span>
              I agree to the <Link href="/terms" className="text-text underline underline-offset-2">Terms</Link> and <Link href="/refunds" className="text-text underline underline-offset-2">Refund Policy</Link>, and I&apos;ll only clip content I own or have permission to use.
            </span>
          </label>

          <button
            onClick={pay}
            disabled={!ready || !live || busy || !!account.plan}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl accent-bg text-[15px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(255,46,136,0.9)] transition-opacity duration-150 disabled:opacity-35 disabled:shadow-none"
          >
            <Lock className="size-4" /> {busy ? "Opening secure checkout…" : "Continue to secure payment"}
          </button>
          {error ? (
            <p role="alert" className="mt-3 rounded-lg border border-red/30 bg-red/[0.06] px-3 py-2 text-xs text-red">{error}</p>
          ) : null}
          {!live ? (
            <p className="mt-3 rounded-lg border border-orange/30 bg-orange/[0.06] px-3 py-2 text-xs text-orange">
              Payments are being connected and open very soon. Nothing will be charged yet.
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle"><ShieldCheck className="size-3.5" /> Secure checkout by Dodo Payments · cancel anytime</p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "pt-1 font-medium text-text" : "text-muted"}`}>
      <span className="capitalize">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
