"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Radio, Plug, CreditCard, Send, Film, Moon, Sun, Palette } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";
import { motion, MotionConfig } from "motion/react";
import { Ambient, EASE_OUT, SPRING } from "@/components/motion";
import { SignOutButton } from "@clerk/nextjs";
import { initials, useAccount, usePlan } from "@/lib/account";
import { monthUsage, useJobs } from "@/lib/jobs";
import { TrimMark } from "@/components/BrandMark";
import { TrialBanner } from "@/components/TrialBanner";

const NAV = [
  { href: "/dashboard", label: "Make clips", icon: Scissors, short: "Make", soon: false },
  { href: "/dashboard/live", label: "Live clipping", icon: Radio, short: "Live" },
  { href: "/dashboard/clips", label: "My clips", icon: Film, short: "Clips" },
  { href: "/dashboard/posted", label: "Posted", icon: Send, short: "Posted" },
  { href: "/dashboard/brand", label: "Brand kit", icon: Palette, short: "Brand" },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug, short: "Connect" },
  { href: "/dashboard/billing", label: "Plan & billing", icon: CreditCard, short: "Plan" },
];

/** Same mark as the landing page: fluo square, ink border, hard shadow, poster wordmark. */
function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="GTA6 Trim dashboard">
      <span className="grid size-8 place-items-center border-2 border-black bg-pink shadow-[3px_3px_0_#fafafa]">
        <TrimMark className="size-4" color="#0d0d0c" />
      </span>
      <span className="font-poster text-[24px] font-black uppercase leading-none tracking-[-0.01em]">GTA6 Trim</span>
    </Link>
  );
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, (used / Math.max(1, max)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-subtle">{label}</span>
        <span><span className="num font-semibold text-text">{used}</span><span className="text-subtle"> / {max.toLocaleString()}</span></span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden bg-white/[0.07]">
        <motion.div className="h-full bg-pink" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }} />
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const account = useAccount();
  const plan = usePlan();
  const { jobs, ready } = useJobs();
  const usage = monthUsage(jobs);
  const isActive = (href: string) => (href === "/dashboard" ? path === "/dashboard" || path === "/dashboard/import" : path.startsWith(href));

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <Ambient />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-bg/80 backdrop-blur-xl md:flex">
          <div className="px-5 pb-7 pt-5"><Logo /></div>
          <nav className="isolate flex flex-col gap-1 px-3" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon, soon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-10 items-center gap-3 px-3 text-[14px] font-medium transition-colors duration-150 ${active ? "text-text" : "text-muted hover:text-text"}`}
                >
                  {active ? (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 border border-white/10 bg-white/[0.06]">
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-pink" />
                    </motion.span>
                  ) : null}
                  <Icon className="size-4" strokeWidth={2} />
                  {label}
                  {soon ? <span className="ml-auto border border-white/15 px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider text-subtle">Soon</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="m-3 mt-auto border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-poster text-[17px] font-black uppercase leading-none">{account.plan ? `${plan.name} plan` : "…"}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">{account.cycle ?? ""}</span>
            </div>
            <div className="mt-4 space-y-3">
              <Meter label="Videos this month" used={ready ? usage.videos : 0} max={plan.limits.ytImports} />
              <Meter label="Clips this month" used={ready ? usage.clips : 0} max={plan.limits.clips} />
            </div>
            <Link href="/dashboard/billing" className="mt-4 block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-subtle underline-offset-4 hover:text-text hover:underline">
              Manage plan →
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl md:px-8">
            <div className="md:hidden"><Logo /></div>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <Link href="/dashboard/billing" className="hidden h-8 items-center border border-line-strong px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-text sm:inline-flex">
                {account.plan ? `${plan.name} plan` : "Plan"}
              </Link>
              <details className="relative">
                <summary className="grid size-8 cursor-pointer list-none place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-semibold ring-1 ring-line-strong [&::-webkit-details-marker]:hidden" aria-label="Account menu">
                  {account.user?.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                  ) : (
                    initials(account.user?.name)
                  )}
                </summary>
                <div className="absolute right-0 top-10 z-40 w-60 border border-line-strong bg-surface p-3 text-sm shadow-2xl">
                  <p className="truncate font-medium">{account.user?.name ?? "Signed in"}</p>
                  <p className="truncate text-xs text-subtle">{account.user?.email}</p>
                  <div className="mt-3 space-y-1 border-t border-line pt-3">
                    <Link href="/dashboard/billing" className="block px-2 py-1.5 text-muted hover:bg-white/[0.05] hover:text-text">Plan & billing</Link>
                    <SignOutButton redirectUrl="/api/auth/logout">
                      <button className="block w-full px-2 py-1.5 text-left text-muted hover:bg-white/[0.05] hover:text-text">Sign out</button>
                    </SignOutButton>
                  </div>
                </div>
              </details>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-7 md:px-8 md:pb-12"><TrialBanner />{children}</main>
        </div>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Main">
          {NAV.map(({ href, short, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-text" : "text-subtle"}`}>
                {active ? <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 bg-pink" /> : null}
                <Icon className="size-5" strokeWidth={1.75} />
                {short}
              </Link>
            );
          })}
        </nav>
      </div>
    </MotionConfig>
  );
}

/** Light / dark switch for the whole dashboard (remembered in this browser). */
function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className="inline-flex h-8 items-center gap-1.5 border border-line-strong px-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-text">
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      <span className="hidden sm:inline">{next === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
