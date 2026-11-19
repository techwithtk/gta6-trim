import type { Permission, Platform } from "@/lib/mock";
import { styleById } from "@/lib/captions";
import { SceneArt, type SceneVariant } from "@/components/SceneArt";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function Avatar({ name, tint, size = 36, live = false }: { name: string; tint: string; size?: number; live?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="grid size-full place-items-center rounded-full font-display font-semibold text-white"
        style={{
          fontSize: size * 0.36,
          background: `radial-gradient(circle at 30% 25%, ${tint}, color-mix(in oklab, ${tint} 35%, #09090b))`,
          boxShadow: live ? `0 0 0 2px var(--bg), 0 0 0 3.5px var(--red)` : undefined,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live data visuals                                                   */
/* ------------------------------------------------------------------ */

/** Chat-activity waveform. Bars ease to new heights each tick — motion that *is* the data. */
export function Waveform({ data, hot = false, tint, className = "" }: { data: number[]; hot?: boolean; tint?: string; className?: string }) {
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden>
      {data.map((v, i) => {
        const recent = i >= data.length - 4;
        return (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${Math.max(6, v)}%`,
              transition: "height 400ms var(--ease), background-color 250ms var(--ease)",
              background: hot && recent ? "linear-gradient(180deg, var(--pink), var(--orange))" : tint ? `color-mix(in oklab, ${tint} ${recent ? 85 : 45}%, transparent)` : "rgba(255,255,255,0.18)",
            }}
          />
        );
      })}
    </div>
  );
}

/** Radial hype gauge. */
export function HypeGauge({ value, size = 96, children }: { value: number; size?: number; children?: React.ReactNode }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const hot = value >= 80;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--orange)" />
            <stop offset="1" stopColor="var(--pink)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={hot ? "url(#gauge)" : "rgba(255,255,255,0.55)"}
          strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 400ms var(--ease)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function HypeBar({ value }: { value: number }) {
  const hot = value >= 80;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label="Hype">
      <div
        className={`h-full rounded-full ${hot ? "accent-bg shimmer" : "bg-white/35"}`}
        style={{ width: `${value}%`, transition: "width 400ms var(--ease)" }}
      />
    </div>
  );
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const w = 120, h = 32;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const PLATFORM: Record<Platform, { label: string; dot: string }> = {
  twitch: { label: "Twitch", dot: "#a970ff" },
  kick: { label: "Kick", dot: "#53fc18" },
  youtube: { label: "YouTube", dot: "#ff3b3b" },
};
export function PlatformBadge({ platform }: { platform: Platform }) {
  const p = PLATFORM[platform];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="size-1.5 rounded-full" style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}

const PERM: Record<Permission, { label: string; cls: string }> = {
  owned: { label: "Owned", cls: "text-green bg-green/10 ring-green/20" },
  authorized: { label: "Authorized", cls: "text-cyan bg-cyan/10 ring-cyan/20" },
  discovery: { label: "Watch only", cls: "text-muted bg-white/[0.04] ring-white/10" },
};
export function PermissionBadge({ permission }: { permission: Permission }) {
  const p = PERM[permission];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${p.cls}`}>{p.label}</span>;
}

export function LiveBadge({ viewers }: { viewers?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red/15 px-1.5 py-0.5 text-[11px] font-semibold text-red ring-1 ring-inset ring-red/25">
      <span className="live-ping size-1.5 rounded-full bg-red" />
      LIVE{viewers ? <span className="num font-medium text-text/80">{viewers}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function PageTitle({ title, sub, right, icon, art }: { title: string; sub?: string; right?: React.ReactNode; icon?: React.ReactNode; art?: SceneVariant }) {
  if (art) {
    return (
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-line">
        <SceneArt variant={art} className="absolute inset-0 h-full w-full" />
        {/* readability: dark fade from the left + bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg/70 to-transparent" />
        <div className="relative flex min-h-[148px] flex-wrap items-end gap-x-4 gap-y-3 p-5 md:p-6">
          {icon}
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">{title}</h1>
            {sub ? <p className="mt-1 text-sm text-text/75">{sub}</p> : null}
          </div>
          {right ? <div className="ml-auto">{right}</div> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
      {icon}
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
      </div>
      {right ? <div className="ml-auto">{right}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">{children}</h2>
      {right ? <div className="ml-auto">{right}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const VARIANTS: SceneVariant[] = ["sunset", "neon", "dusk", "night"];

/** 9:16 Shorts preview in the real output layout: facecam on top, gameplay below, hook + captions. */
export function VerticalClip({ scene, hook, caption, seed = 0, styleId = "pop", animate = true, image }: { scene: readonly [string, string, string]; hook: string; caption: string; seed?: number; styleId?: string; animate?: boolean; image?: string }) {
  const tint = scene[0];
  const cs = styleById(styleId);
  return (
    <div className="relative flex aspect-[9/16] flex-col overflow-hidden bg-black">
      {/* facecam */}
      <div className="relative grid h-[34%] place-items-center overflow-hidden bg-[#141418]">
        <div className="absolute inset-0" style={{ background: `radial-gradient(80% 90% at 50% 100%, color-mix(in oklab, ${tint} 22%, transparent), transparent)` }} />
        <div className="cam-face relative size-12 rounded-full bg-white/12" style={{ animationDelay: `-${seed % 2}s` }} />
        <div className="absolute bottom-0 h-7 w-20 rounded-t-full bg-white/[0.08]" />
      </div>
      {/* gameplay */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <SceneArt variant={VARIANTS[seed % VARIANTS.length]} seed={seed * 13 + 3} animated={animate} className="absolute inset-0 h-full w-full scale-[1.35]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        <div className="absolute inset-x-3 top-3 text-center">
          <span className="inline-block rounded-md bg-white px-2 py-1 font-display text-[11px] font-bold leading-tight text-black shadow-lg">{hook}</span>
        </div>
        <div className="absolute inset-x-0 bottom-[20%] text-center">
          <span className={`${animate ? "caption-pop" : "inline-block"} ${cs.box ?? ""}`} style={{ animationDelay: `-${(seed * 0.6).toFixed(2)}s` }}>
            <span className={`text-[19px] tracking-tight ${cs.text}`}>{caption}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
