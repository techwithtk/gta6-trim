"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, X } from "lucide-react";
import { useAccount, usePlan } from "@/lib/account";
import { useJobs } from "@/lib/jobs";
import { useSocial } from "@/lib/social";
import { useDrive } from "@/lib/drive";

type Step = { id: string; title: string; done: boolean; href: string; cta: string };

const read = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* storage blocked: card just shows again */ } };

/**
 * "Get started" card on Make clips: 4 steps with live ticks so new (especially 1-day trial) customers reach their
 * first Short quickly. Dismissible; hides itself once everything is done. Not shown to team members.
 */
export function OnboardingChecklist() {
  const account = useAccount();
  const plan = usePlan();
  const studio = plan.limits.autopost;
  const { jobs, ready } = useJobs();
  const social = useSocial(studio);
  const drive = useDrive();
  const [brandDone, setBrandDone] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState<"loading" | "dismissed" | "done" | "show">("loading");
  const [now, setNow] = useState<number | null>(null);
  const key = account.user ? `gt-onboard:${account.user.email}` : null;

  useEffect(() => {
    if (!key) return;
    // Read storage after mount (not during render) so server and client HTML match.
    const t = setTimeout(() => {
      const v = read(key);
      setHidden(v === "dismissed" ? "dismissed" : v === "done" ? "done" : "show");
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(t);
  }, [key]);

  // Starter/Pro: step 3 is the brand kit; it counts as done once anything differs from the default.
  useEffect(() => {
    if (studio || !account.plan || account.team) return;
    fetch("/api/brand", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const b = d?.brand;
      setBrandDone(!!b && (b.style !== "classic" || !!b.handle || !!b.logo || !!b.accent || !!b.hookColor));
    }).catch(() => setBrandDone(false));
  }, [studio, account.plan, account.team]);

  const steps: Step[] = [
    { id: "clip", title: "Clip your first live stream or video", done: jobs.length > 0, href: "/dashboard/live", cta: "Pick a stream" },
    { id: "watch", title: "Watch or download your first Short", done: jobs.some((j) => j.clips?.length > 0), href: "/dashboard/clips", cta: "Open My clips" },
    studio
      ? { id: "connect", title: "Connect a social account", done: social.accounts.length > 0, href: "/dashboard/integrations", cta: "Connect" }
      : { id: "brand", title: "Set up your brand kit", done: !!brandDone, href: "/dashboard/brand", cta: "Open Brand kit" },
    studio
      ? { id: "post", title: "Post your first Short", done: social.posts.length > 0, href: "/dashboard/clips", cta: "Post a clip" }
      : { id: "drive", title: "Save a clip to Google Drive", done: drive.connected, href: "/dashboard/integrations", cta: "Connect Drive" },
  ];
  const count = steps.filter((s) => s.done).length;
  const all = count === steps.length;

  // Remember completion so the "All set" note shows once, then the card stays hidden.
  useEffect(() => {
    if (all && key && hidden === "show" && ready) write(key, "done");
  }, [all, key, hidden, ready]);

  if (!account.plan || account.team || !ready || hidden !== "show" || !key) return null;

  const dismiss = () => { write(key, "dismissed"); setHidden("dismissed"); };
  const trialLeft = account.trialEndsAt && now ? account.trialEndsAt - now : 0;
  const hours = Math.max(1, Math.ceil(trialLeft / 3_600_000));

  if (all) {
    return (
      <div role="status" className="mb-6 flex items-center gap-3 border border-green/40 bg-green/[0.07] px-4 py-3 text-sm">
        <Check className="size-4 text-green" />
        <span className="flex-1">All set 🎉 You&apos;ve made, watched and shared your first Shorts.</span>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-text"><X className="size-4" /></button>
      </div>
    );
  }

  return (
    <section aria-label="Get started" className="mb-7 border-2 border-white/85 bg-surface p-4 shadow-[6px_6px_0_var(--pink)] md:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-poster text-[24px] font-black uppercase leading-none">Get <span className="text-pink">started</span></h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-subtle">{count} of {steps.length} done</p>
        </div>
        <button onClick={dismiss} aria-label="Hide checklist" title="Hide" className="text-muted hover:text-text"><X className="size-4" /></button>
      </div>
      <div className="mt-3 h-1.5 w-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={count}>
        <div className="h-full bg-pink transition-[width] duration-500" style={{ width: `${(count / steps.length) * 100}%` }} />
      </div>
      {trialLeft > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5 text-pink" /> Your trial ends in {hours}h. Finish these to see what GTA6 Trim can do.
        </p>
      ) : null}
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-3 border px-3 py-2.5 ${s.done ? "border-line opacity-70" : "border-white/20"}`}>
            <span className={`grid size-6 shrink-0 place-items-center text-[11px] font-bold ${s.done ? "bg-green text-black" : "border border-white/30 text-muted"}`}>
              {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`min-w-0 flex-1 text-sm ${s.done ? "text-muted line-through" : ""}`}>{s.title}</span>
            {s.done ? null : (
              <Link href={s.href} className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-pink hover:underline">{s.cta}</Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
