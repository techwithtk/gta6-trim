# Clipwave design system

Source: ui-ux-pro-max (style "Modern Dark / Cinema", pairing "Tech Startup") + motion-design skill.

## Look
- Near-black neutral surfaces (`--bg #09090b`, `--surface #111114`), hairline borders (`white/7%`).
- **One accent**: sunset gradient orange `#ff7a1a` → pink `#ff2e88`. Use it only where something is happening:
  spikes, live state, the single primary CTA per screen. Everything else is neutral (white buttons, grey data).
- Status colours: green = done/owned, cyan = processing/authorized, red = live.
- Fonts: Space Grotesk (headings), Geist (body), Geist Mono via `.num` (every live number).
- No emoji as icons — Lucide icons at `strokeWidth 1.75`.
- No fake gameplay art. Live visuals are data: chat-activity `Waveform`, `HypeGauge`, `HypeBar`, `Sparkline`.

## Motion (tokens in `src/components/motion.tsx` + `globals.css`)
- Personality: **Corporate** for UI, **Energetic** only for viral-moment events.
- Signature ease `cubic-bezier(0.2,0,0,1)`; entrances `cubic-bezier(0.16,1,0.3,1)`.
- Durations: quick 150ms (press, exit), base 250ms (state change), slow 400ms (enter, page).
- `SPRING` for layout moves; `SPRING_EVENT` (overshoot) only for spike badges, success check, toasts.
- Exits are faster than entrances. Staggers ≤ 500ms total.
- Table re-ranks every 6s (not every tick) so rows glide instead of jitter.
- Three layers: primary (data changes), secondary (status chips/progress), ambient (one slow glow).
- `prefers-reduced-motion` disables all animation (CSS + `MotionConfig reducedMotion="user"`).
