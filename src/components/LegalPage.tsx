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
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">Last updated {LEGAL.updated}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">{title}</h1>
        <div className="mt-4 text-[15px] leading-relaxed text-muted">{intro}</div>

        <nav aria-label="On this page" className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm">
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.h}>
                <a href={`#s${i + 1}`} className="text-muted hover:text-text">
                  {i + 1}. {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold">
                {i + 1}. {s.h}
              </h2>
              <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_ul]:space-y-1.5">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-line pt-6 text-sm text-subtle">
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
