"use client";

import { useState } from "react";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { TrimMark } from "@/components/BrandMark";
import { SocialLinks } from "@/components/SocialLinks";

/** Header + footer in the landing page's "tabloid × editor" style. Shared by the landing, checkout, login and legal pages. */

const STEP = (n: number) => (t: number) => Math.round(t * n) / n; // jump-cut easing

export function PaperLogo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="GTA6 Trim home">
      <span className="grid size-9 place-items-center border-2 border-[var(--ink)] bg-[var(--fluo)] shadow-[3px_3px_0_var(--ink)]">
        <TrimMark className="size-5" color="var(--ink)" />
      </span>
      <span className="font-poster text-[26px] font-black uppercase leading-none">GTA6 Trim</span>
    </Link>
  );
}

const NAV_LINKS = [["/#how", "How it works"], ["/#features", "Features"], ["/#pricing", "Pricing"], ["/#faq", "Fine print"]] as const;

export function PaperNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 border-b-2 border-[var(--ink)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 md:px-8">
        <PaperLogo />
        <nav className="hidden gap-6 whitespace-nowrap font-mono text-[12px] font-semibold uppercase tracking-wider lg:flex" aria-label="Main">
          {NAV_LINKS.map(([h, l]) => (
            <Link key={h} href={h} className="underline-offset-[6px] transition-colors duration-150 hover:text-[var(--fluo)] hover:underline">{l}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <Link href="/login" className="hidden whitespace-nowrap font-mono text-[12px] font-semibold uppercase tracking-wider hover:text-[var(--fluo)] lg:block">Log in</Link>
          <Link href="/#pricing" className="inline-flex h-10 items-center gap-1 whitespace-nowrap border-2 border-[var(--ink)] bg-[var(--ink)] px-3 font-mono text-[12px] font-bold uppercase tracking-wider text-[var(--paper)] shadow-[4px_4px_0_var(--fluo)] transition-transform duration-150 hover:-translate-y-0.5 sm:px-4">
            <span className="sm:hidden">Get it</span>
            <span className="hidden sm:inline">Get GTA6 Trim</span> <ArrowUpRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center border-2 border-[var(--ink)] bg-[var(--paper)] lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.2, ease: STEP(4) }}
            className="absolute inset-x-0 top-full border-b-2 border-[var(--ink)] bg-[var(--paper)] lg:hidden"
          >
            <ul className="mx-auto max-w-7xl px-4 py-2 md:px-8">
              {[...NAV_LINKS, ["/login", "Log in"] as const].map(([h, l]) => (
                <li key={h} className="border-b border-[var(--ink)]/15 last:border-b-0">
                  <Link href={h} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between font-poster text-[26px] font-black uppercase leading-none hover:text-[var(--fluo)]">
                    {l} <ArrowUpRight className="size-5" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

export function PaperFooter() {
  return (
    <footer className="relative z-[1] bg-[var(--ink)] text-[var(--paper)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-14 md:grid-cols-5 md:px-8">
        {[
          ["Product", [["How it works", "/#how"], ["Features", "/#features"], ["Pricing", "/#pricing"], ["Dashboard", "/dashboard"]]],
          ["Help", [["Fine print", "/#faq"], ["Contact", "mailto:hello@gta6trim.com"]]],
          ["Legal", [["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"]]],
          ["Guides", GUIDES.map((g) => [g.short, `/${g.slug}`])],
        ].map(([title, links]) => (
          <div key={title as string}>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fluo)]">{title as string}</h3>
            <ul className="mt-3 space-y-2 text-[15px]">
              {(links as string[][]).map(([l, h]) => (
                <li key={l}><Link href={h} className="hover:text-[var(--acid)]">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fluo)]">Follow</h3>
          <SocialLinks tone="ink" className="mt-3" />
          <p className="mt-5 text-[13px] leading-relaxed text-white/55">Not affiliated with, endorsed or sponsored by Rockstar Games, Take-Two Interactive, Twitch, Kick or YouTube. All trademarks belong to their owners.</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl overflow-hidden px-4 md:px-8">
        <p aria-hidden className="mt-6 select-none whitespace-nowrap font-poster text-[clamp(56px,17vw,280px)] font-black uppercase leading-[0.78] tracking-[-0.02em] text-[var(--paper)]">GTA6 Trim</p>
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-6 pt-2 font-mono text-[11px] text-white/45 md:px-8">© 2026 GTA6 Trim · gta6trim.com</p>
    </footer>
  );
}
