import Link from "next/link";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { GUIDES, SITE, guideBySlug, type Guide } from "@/lib/guides";

/** <title>, description, canonical and OpenGraph for one guide page. */
export function guideMetadata(slug: string): Metadata {
  const g = guideBySlug(slug)!;
  const url = `${SITE}/${g.slug}`;
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.description, url, siteName: "GTA6 Trim", type: "article" },
    twitter: { card: "summary", title: g.title, description: g.description },
  };
}

/** A public, server-rendered landing page for one search intent (see lib/guides.ts). */
export function GuidePage({ slug }: { slug: string }) {
  const g = guideBySlug(slug) as Guide;
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <SiteChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <article className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-2)]">{g.kicker}</p>
        <h1 className="mt-3 text-[clamp(42px,7vw,84px)] leading-[0.95]">{g.h1}</h1>
        <div className="mt-5 space-y-3 text-[16px] leading-relaxed text-muted">
          {g.intro.map((p) => <p key={p}>{p}</p>)}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/checkout?plan=pro" className="inline-flex h-12 items-center border-2 border-[var(--ink)] bg-[var(--fluo)] px-5 font-poster text-xl font-black uppercase shadow-[5px_5px_0_var(--ink)] transition-transform duration-150 hover:-translate-y-0.5">
            Try it free for 1 day
          </Link>
          <Link href="/#pricing" className="font-mono text-[12px] font-semibold uppercase tracking-wider underline underline-offset-4 hover:text-[var(--fluo)]">See plans</Link>
        </div>

        <section className="mt-14">
          <h2 className="font-poster text-[34px] font-black uppercase leading-none">How it works</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {g.steps.map((s, i) => (
              <li key={s.h} className="border-2 border-[var(--ink)] bg-[var(--surface)] p-4 shadow-[4px_4px_0_var(--ink)]">
                <span className="font-poster text-[28px] font-black leading-none text-[var(--fluo)] [-webkit-text-stroke:1px_var(--ink)]">{i + 1}</span>
                <h3 className="mt-2 text-[17px] font-semibold">{s.h}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{s.p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-poster text-[34px] font-black uppercase leading-none">What you get</h2>
          <ul className="mt-5 space-y-4">
            {g.features.map((f) => (
              <li key={f.h}>
                <h3 className="text-[17px] font-semibold">{f.h}</h3>
                <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{f.p}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-poster text-[34px] font-black uppercase leading-none">{g.why.h}</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
            {g.why.p.map((p) => <p key={p}>{p}</p>)}
          </div>
          <p className="mt-4 border-l-4 border-[var(--fluo)] pl-3 text-[15px] leading-relaxed text-text">
            Only clip and repost content you own or have permission to use, such as your own streams or a paid clipping campaign.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-poster text-[34px] font-black uppercase leading-none">Questions</h2>
          <dl className="mt-5 space-y-5">
            {g.faq.map((f) => (
              <div key={f.q}>
                <dt className="text-[17px] font-semibold">{f.q}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 border-2 border-[var(--ink)] bg-[var(--surface)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <h2 className="font-poster text-[30px] font-black uppercase leading-none">Start clipping today</h2>
          <p className="mt-2 text-[15px] text-muted">1-day free trial on every plan. Add a card to verify, pay nothing today, cancel anytime.</p>
          <Link href="/checkout?plan=pro" className="mt-4 inline-flex h-11 items-center border-2 border-[var(--ink)] bg-[var(--fluo)] px-4 font-poster text-lg font-black uppercase shadow-[4px_4px_0_var(--ink)]">
            Try GTA6 Trim free
          </Link>
        </section>

        <nav aria-label="More guides" className="mt-14">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">More guides</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/${o.slug}`} className="text-[15px] underline underline-offset-2 hover:text-[var(--fluo)]">{o.h1}</Link></li>
            ))}
            <li><Link href="/" className="text-[15px] underline underline-offset-2 hover:text-[var(--fluo)]">GTA6 Trim home</Link></li>
          </ul>
        </nav>

        <p className="mt-12 border-t-2 border-[var(--ink)] pt-5 text-[13px] leading-relaxed text-muted">
          GTA6 Trim is an independent tool, not affiliated with, endorsed or sponsored by Rockstar Games, Take-Two Interactive, Twitch, Kick, YouTube, TikTok or Meta. All trademarks belong to their owners.
        </p>
      </article>
    </SiteChrome>
  );
}
