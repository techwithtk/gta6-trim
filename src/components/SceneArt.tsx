import { useId } from "react";

/**
 * Original "sunset coast city" artwork, drawn in SVG (no third-party IP, no logos/characters).
 * Variants change the time of day. All geometry is deterministic so SSR and client match.
 */
export type SceneVariant = "sunset" | "dusk" | "night" | "neon";

const PALETTES: Record<SceneVariant, { sky: string[]; sun: [string, string]; far: string; near: string; water: [string, string]; glow: string; windows: string; stars: boolean }> = {
  sunset: { sky: ["#1d0a33", "#5a1a5e", "#c2306b", "#ff6b5e", "#ffb054"], sun: ["#ffe27a", "#ff4f8b"], far: "#5b1f5f", near: "#1a0b26", water: ["#ff7a6a", "#2a0d3a"], glow: "#ff8a5c", windows: "#ffd27a", stars: false },
  dusk: { sky: ["#0a0d24", "#2a1650", "#7b2a7a", "#e0507a", "#ff9a6a"], sun: ["#ffc26e", "#ff3d7f"], far: "#3d1d5c", near: "#120a22", water: ["#d4507a", "#140a2a"], glow: "#ff6a8a", windows: "#ffcf8a", stars: true },
  night: { sky: ["#04050d", "#0b1030", "#1c1a4a", "#3a1d5c", "#6b2a6e"], sun: ["#ff9ec7", "#8b5cf6"], far: "#1f1a45", near: "#07070f", water: ["#6b3aa0", "#05060f"], glow: "#8b5cf6", windows: "#7dd3fc", stars: true },
  neon: { sky: ["#070312", "#1a0636", "#4a0a5a", "#a3166e", "#ff2e88"], sun: ["#fff27a", "#ff2e88"], far: "#3a0a52", near: "#0a0414", water: ["#ff2e88", "#0a0414"], glow: "#22d3ee", windows: "#22d3ee", stars: true },
};

/* Seeded PRNG so every render is identical. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const f = (n: number) => n.toFixed(1);

function skyline(seed: number, baseY: number, minH: number, maxH: number, width: number) {
  const r = rng(seed);
  const blocks: { x: number; w: number; h: number; antenna: boolean }[] = [];
  let x = -20;
  while (x < width + 20) {
    const w = 26 + r() * 64;
    const h = minH + Math.pow(r(), 1.6) * (maxH - minH);
    blocks.push({ x, w, h, antenna: r() > 0.86 });
    x += w + (r() > 0.7 ? 6 : 0);
  }
  return blocks.map((b) => ({ ...b, y: baseY - b.h }));
}

/** One palm tree: curved trunk + drooping fronds. */
function Palm({ x, y, h, lean, s = 1, color, sway = 0 }: { x: number; y: number; h: number; lean: number; s?: number; color: string; sway?: number }) {
  const topX = x + lean;
  const topY = y - h;
  const trunk = `M${f(x - 7 * s)} ${f(y)} Q${f(x + lean * 0.2)} ${f(y - h * 0.55)} ${f(topX - 2.5 * s)} ${f(topY)} L${f(topX + 2.5 * s)} ${f(topY)} Q${f(x + lean * 0.2 + 9 * s)} ${f(y - h * 0.55)} ${f(x + 7 * s)} ${f(y)} Z`;
  const angles = [-178, -158, -136, -114, -92, -66, -42, -20, 2];
  const leaves = angles.map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const L = (112 + (i % 3) * 22) * s;
    const tx = topX + Math.cos(a) * L;
    const ty = topY + Math.sin(a) * L * 0.55 + L * 0.42; // droop
    const mx = (topX + tx) / 2;
    const my = (topY + ty) / 2 - 22 * s;
    const nx = -(ty - topY) / L;
    const ny = (tx - topX) / L;
    const w = 19 * s;
    return `M${f(topX)} ${f(topY)} Q${f(mx + nx * w)} ${f(my + ny * w)} ${f(tx)} ${f(ty)} Q${f(mx - nx * w * 0.35)} ${f(my - ny * w * 0.35 + 8 * s)} ${f(topX)} ${f(topY)} Z`;
  });
  return (
    <g>
      <path d={trunk} fill={color} />
      <g className="palm-sway" style={{ transformOrigin: `${f(topX)}px ${f(topY)}px`, animationDelay: `${-sway}s` }}>
        {leaves.map((d, i) => (
          <path key={i} d={d} fill={color} />
        ))}
        <circle cx={f(topX)} cy={f(topY + 3)} r={f(6 * s)} fill={color} />
      </g>
    </g>
  );
}

export function SceneArt({ variant = "sunset", className = "", animated = true, seed = 7 }: { variant?: SceneVariant; className?: string; animated?: boolean; seed?: number }) {
  const uid = useId().replace(/:/g, "");
  const p = PALETTES[variant];
  const W = 1600;
  const H = 900;
  const horizon = 600;
  const far = skyline(seed, horizon, 60, 230, W);
  const near = skyline(seed + 11, horizon + 4, 30, 140, W);
  const r = rng(seed + 3);
  const stars = p.stars ? Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 340, s: 0.6 + r() * 1.6, o: 0.3 + r() * 0.7 })) : [];
  const winR = rng(seed + 5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`${animated ? "scene-animated" : ""} ${className}`} aria-hidden role="img">
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, i) => (
            <stop key={i} offset={i / (p.sky.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={`sun${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sun[0]} />
          <stop offset="1" stopColor={p.sun[1]} />
        </linearGradient>
        <linearGradient id={`water${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.water[0]} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.water[1]} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        {/* Retro striped sun: stripes cut out of the lower half */}
        <mask id={`sunmask${uid}`}>
          <rect x="0" y="0" width={W} height={H} fill="white" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x="0" y={f(470 + i * 22 + i * i * 1.5)} width={W} height={f(3 + i * 2.2)} fill="black" />
          ))}
        </mask>
      </defs>

      {/* Sky */}
      <rect width={W} height={H} fill={`url(#sky${uid})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={f(s.x)} cy={f(s.y)} r={f(s.s)} fill="white" opacity={f(s.o)} className={i % 5 === 0 ? "twinkle" : undefined} style={i % 5 === 0 ? { animationDelay: `${-(i % 7)}s` } : undefined} />
      ))}

      {/* Sun + glow */}
      <circle cx="1060" cy="470" r="330" fill={`url(#glow${uid})`} />
      <circle cx="1060" cy="470" r="170" fill={`url(#sun${uid})`} mask={`url(#sunmask${uid})`} />

      {/* Thin clouds */}
      <g opacity="0.35" fill={p.sun[1]}>
        <rect className="cloud-drift" x="180" y="250" width="420" height="6" rx="3" />
        <rect className="cloud-drift slow" x="900" y="215" width="360" height="5" rx="2.5" />
        <rect className="cloud-drift" x="1180" y="300" width="300" height="4" rx="2" style={{ animationDelay: "-12s" }} />
      </g>

      {/* Distant hills for depth */}
      <path d="M0 560 Q180 470 360 520 T720 500 Q900 440 1080 505 T1400 480 Q1520 470 1600 500 L1600 610 L0 610 Z" fill={p.far} opacity="0.55" />

      {/* Far skyline */}
      <g fill={p.far}>
        {far.map((b, i) => (
          <g key={i}>
            <rect x={f(b.x)} y={f(b.y)} width={f(b.w)} height={f(b.h + 2)} />
            {b.antenna ? <rect x={f(b.x + b.w / 2 - 1.5)} y={f(b.y - 30)} width="3" height="30" /> : null}
          </g>
        ))}
      </g>
      {/* Near skyline with lit windows */}
      <g>
        {near.map((b, i) => (
          <g key={i}>
            <rect x={f(b.x)} y={f(b.y)} width={f(b.w)} height={f(b.h + 4)} fill={p.near} />
            {Array.from({ length: Math.floor(b.h / 18) }, (_, row) =>
              Array.from({ length: Math.floor(b.w / 14) }, (_, col) =>
                winR() > 0.62 ? <rect key={`${row}-${col}`} x={f(b.x + 5 + col * 14)} y={f(b.y + 8 + row * 18)} width="5" height="7" fill={p.windows} opacity={f(0.35 + winR() * 0.5)} /> : null,
              ),
            )}
          </g>
        ))}
      </g>

      {/* Water / bay with sun reflection */}
      <rect x="0" y={horizon} width={W} height={H - horizon} fill={`url(#water${uid})`} />
      <g fill={p.sun[0]}>
        {Array.from({ length: 9 }, (_, i) => {
          const w = 220 - i * 18;
          return <rect key={i} className="reflect" x={f(1060 - w / 2)} y={f(horizon + 14 + i * 16)} width={f(w)} height="3" rx="1.5" opacity={f(0.55 - i * 0.05)} style={{ animationDelay: `${-i * 0.35}s` }} />;
        })}
      </g>

      {/* Water ripples */}
      <g stroke={p.sun[0]} strokeWidth="2" strokeLinecap="round" opacity="0.18">
        {Array.from({ length: 10 }, (_, i) => {
          const y = horizon + 22 + i * 16;
          const off = (i * 137) % 600;
          return <path key={i} d={`M${off} ${y} h120 M${off + 520} ${y + 6} h90 M${(off + 980) % 1500} ${y + 3} h140`} />;
        })}
      </g>

      {/* Coastal highway + car */}
      <rect x="0" y="770" width={W} height="10" fill={p.near} />
      <rect x="0" y="780" width={W} height="120" fill={p.near} opacity="0.92" />
      <g className="car-drive">
        <path d="M0 768 L18 752 Q40 740 74 738 L118 738 Q140 740 156 752 L176 758 Q190 760 192 768 Z" fill="#0b0712" />
        <rect x="186" y="760" width="8" height="4" rx="2" fill="#ffe8b0" />
        <rect x="-2" y="758" width="7" height="4" rx="2" fill="#ff3d5e" />
        <rect x="-120" y="758" width="118" height="4" rx="2" fill="#ff3d5e" opacity="0.25" />
      </g>

      {/* Palms (foreground) */}
      <Palm x={150} y={900} h={420} lean={60} s={1.25} color="#07040c" sway={0} />
      <Palm x={300} y={900} h={300} lean={-40} s={0.95} color="#0a0612" sway={1.3} />
      <Palm x={1470} y={900} h={460} lean={-70} s={1.3} color="#07040c" sway={0.7} />
      <Palm x={1330} y={900} h={280} lean={30} s={0.85} color="#0a0612" sway={2.1} />

      {/* Birds */}
      <g fill="none" stroke="#0a0612" strokeWidth="3" strokeLinecap="round" opacity="0.7" className="birds">
        <path d="M600 330 q10 -8 20 0 q10 -8 20 0" />
        <path d="M650 300 q7 -6 14 0 q7 -6 14 0" />
        <path d="M560 300 q6 -5 12 0 q6 -5 12 0" />
      </g>
    </svg>
  );
}
