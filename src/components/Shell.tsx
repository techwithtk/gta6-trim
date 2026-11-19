"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, ListChecks, Send, Plug, Link2, CreditCard, Bell, Search } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { Ambient, EASE_OUT, SPRING } from "@/components/motion";
import { SignOutButton } from "@clerk/nextjs";
import { initials, useAccount, usePlan } from "@/lib/account";
import { TrimMark } from "@/components/BrandMark";

const USED_CLIPS = 142;

const NAV = [
  { href: "/dashboard", label: "Live Radar", icon: Radar, short: "Live" },
  { href: "/dashboard/import", label: "Add YouTube video", icon: Link2, short: "Add" },
  { href: "/dashboard/queue", label: "Clip Queue", icon: ListChecks, badge: 4, short: "Queue" },
  { href: "/dashboard/posted", label: "Posted", icon: Send, short: "Posted" },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug, short: "Connect" },
  { href: "/dashboard/billing", label: "Plans & pricing", icon: CreditCard, short: "Plans" },
];
const MOBILE_NAV = NAV.slice(0, 5); // bottom nav ≤ 5 items; Plans is in the header on mobile

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid size-8 place-items-center rounded-[10px] accent-bg shadow-[0_6px_20px_-6px_rgba(255,46,136,0.7)]">
        <TrimMark className="size-4" color="white" />
      </div>
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">gta6 trim</span>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const account = useAccount();
  const plan = usePlan();
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <Ambient />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-bg/70 backdrop-blur-xl md:flex">
          <div className="px-5 pb-6 pt-5"><Logo /></div>
          <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Workspace</p>
          <nav className="isolate flex flex-col gap-0.5 px-3" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon, badge }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors duration-150 ${active ? "text-text" : "text-muted hover:text-text"}`}
                >
                  {active ? (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-lg bg-white/[0.06] ring-1 ring-inset ring-white/[0.06]">
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full accent-bg" />
                    </motion.span>
                  ) : null}
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                  {badge ? <span className="num ml-auto rounded-md bg-white/[0.08] px-1.5 text-[11px] font-medium text-text">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="m-3 mt-auto rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{account.plan ? `${plan.name} plan` : "…"}</span>
              <span className="capitalize text-subtle">{account.cycle ?? ""}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="num text-lg font-semibold">{USED_CLIPS}</span>
              <span className="text-xs text-subtle">/ {plan.limits.clips.toLocaleString()} clips</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full accent-bg" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (USED_CLIPS / plan.limits.clips) * 100)}%` }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }} />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/75 px-4 backdrop-blur-xl md:px-8">
            <div className="md:hidden"><Logo /></div>
            <button className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-subtle transition-colors duration-150 hover:border-line-strong md:flex" aria-label="Search streams and clips">
              <Search className="size-4" strokeWidth={1.75} />
              Search streams, clips…
              <kbd className="ml-auto rounded border border-line-strong px-1.5 text-[10px] text-muted">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/dashboard/billing" className="inline-flex h-8 items-center rounded-lg border border-line-strong px-2.5 text-xs text-muted md:hidden">Plans</Link>
              <span className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs sm:inline-flex">
                <span className="live-ping size-1.5 rounded-full bg-green" />
                <span className="text-muted">Pipeline</span>
                <span className="font-medium">Healthy</span>
              </span>
              <button className="relative grid size-9 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-text" aria-label="Notifications">
                <Bell className="size-4" strokeWidth={1.75} />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-pink" />
              </button>
              <details className="relative">
                <summary className="grid size-8 cursor-pointer list-none place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-semibold ring-1 ring-line-strong [&::-webkit-details-marker]:hidden" aria-label="Account menu">
                  {account.user?.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                  ) : (
                    initials(account.user?.name)
                  )}
                </summary>
                <div className="absolute right-0 top-10 z-40 w-60 rounded-xl border border-line bg-surface p-3 text-sm shadow-2xl">
                  <p className="truncate font-medium">{account.user?.name ?? "Signed in"}</p>
                  <p className="truncate text-xs text-subtle">{account.user?.email}</p>
                  <div className="mt-3 space-y-1 border-t border-line pt-3">
                    <Link href="/dashboard/billing" className="block rounded-md px-2 py-1.5 text-muted hover:bg-white/[0.05] hover:text-text">Plan & billing</Link>
                    <SignOutButton redirectUrl="/api/auth/logout">
                      <button className="block w-full rounded-md px-2 py-1.5 text-left text-muted hover:bg-white/[0.05] hover:text-text">Sign out</button>
                    </SignOutButton>
                  </div>
                </div>
              </details>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-28 pt-7 md:px-8 md:pb-10">{children}</main>
        </div>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Main">
          {MOBILE_NAV.map(({ href, short, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-text" : "text-subtle"}`}>
                {active ? <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full accent-bg" /> : null}
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
