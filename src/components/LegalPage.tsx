import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { SOCIALS } from "@/components/SocialLinks";

/** Business details used across the legal pages — edit here. */
export const LEGAL = {
  product: "GTA6 Trim",
  operator: "GTA6 Trim", // replace with your registered business / legal name
  site: "gta6trim.com",
  email: "hello@gta6trim.com",
  updated: "19 November 2026",
};

export type LegalSection = { h: string; body: React.ReactNode };

export function LegalPage({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return (
    <SiteChrome>
      <article className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-2)]">The fine print · updated {LEGAL.updated}</p>
        <h1 className="mt-3 text-[clamp(48px,8vw,96px)]">{title}</h1>
        <div className="mt-4 text-[15px] leading-relaxed text-muted">{intro}</div>

        <nav aria-label="On this page" className="mt-8 border-2 border-[var(--ink)] bg-[var(--surface)] p-4 text-sm shadow-[6px_6px_0_var(--ink)]">
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.h}>
                <a href={`#s${i + 1}`} className="font-mono text-[12px] font-semibold uppercase tracking-wider hover:text-[var(--fluo)]">
                  {i + 1}. {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
              <h2 className="font-poster text-[32px] font-black uppercase leading-none">
                {i + 1}. {s.h}
              </h2>
              <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_ul]:space-y-1.5">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t-2 border-[var(--ink)] pt-6 text-sm text-muted">
          Questions about this page? Email <a className="text-text underline underline-offset-2" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. See also{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms</Link>, <Link href="/privacy" className="underline underline-offset-2">Privacy</Link> and{" "}
          <Link href="/refunds" className="underline underline-offset-2">Refunds</Link>.
          <br />
          Official profiles:{" "}
          {SOCIALS.map((s, i) => (
            <span key={s.name}>
              {i ? " · " : ""}
              <a href={s.href} target="_blank" rel="me noopener noreferrer" className="text-text underline underline-offset-2">
                {s.name} ({s.handle})
              </a>
            </span>
          ))}
        </p>
      </article>
    </SiteChrome>
  );
}
