import Link from "next/link";
import { Ambient } from "@/components/motion";
import { SocialLinks } from "@/components/SocialLinks";
import { TrimMark } from "@/components/BrandMark";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="GTA6 Trim home">
      <span className="grid size-8 place-items-center rounded-[10px] accent-bg shadow-[0_6px_20px_-6px_rgba(255,46,136,0.7)]">
        <TrimMark className="size-4" color="white" />
      </span>
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">gta6 trim</span>
    </Link>
  );
}

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Dark header + footer used by checkout and legal pages. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Ambient />
      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-text">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors duration-150 hover:text-text sm:inline-flex">Log in</Link>
            <Link href="/#pricing" className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">Live GTA 6 clipping: find viral moments, add captions, auto-post Shorts.</p>
            <SocialLinks className="mt-4" />
          </div>
          <FooterCol title="Product" links={[["Features", "/#features"], ["Pricing", "/#pricing"], ["Dashboard", "/dashboard"]]} />
          <FooterCol title="Company" links={[["FAQ", "/#faq"], ["Contact", "mailto:hello@gta6trim.com"]]} />
          <FooterCol title="Legal" links={[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"]]} />
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle md:px-6">
            © {2026} GTA6 Trim. Not affiliated with, endorsed or sponsored by Rockstar Games, Take-Two Interactive, Twitch, Kick or YouTube. All trademarks belong to their owners.
          </p>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-muted transition-colors duration-150 hover:text-text">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
