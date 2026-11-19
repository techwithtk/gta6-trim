/** Official GTA6 Trim social profiles — shown in footers and legal pages, and listed as `sameAs` for search engines. */
export const SOCIALS = [
  { name: "Facebook", href: "https://www.facebook.com/share/1GjqN4Kegq/", handle: "GTA6 Trim on Facebook" },
  { name: "X", href: "https://x.com/iqtauhid", handle: "@iqtauhid" },
] as const;

function Icon({ name, className }: { name: (typeof SOCIALS)[number]["name"]; className?: string }) {
  if (name === "Facebook")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
    </svg>
  );
}

/** Row of round icon links. `tone` matches the surface it sits on. */
export function SocialLinks({ tone = "dark", className = "" }: { tone?: "dark" | "ink"; className?: string }) {
  const btn =
    tone === "ink"
      ? "border-2 border-[var(--paper)]/30 text-[var(--paper)] hover:border-[var(--acid)] hover:text-[var(--acid)]"
      : "border border-line-strong text-muted hover:border-white/40 hover:text-text";
  return (
    <ul className={`flex items-center gap-2 ${className}`} aria-label="GTA6 Trim on social media">
      {SOCIALS.map((s) => (
        <li key={s.name}>
          <a
            href={s.href}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={`${s.name}: ${s.handle}`}
            title={s.handle}
            className={`grid size-10 place-items-center rounded-full transition-colors duration-150 ${btn}`}
          >
            <Icon name={s.name} className="size-[18px]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
