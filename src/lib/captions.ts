// Caption style presets. Plans unlock the first N (plan.limits.captionStyles).

export type CaptionStyle = {
  id: string;
  name: string;
  /** classes for the caption text in previews */
  text: string;
  /** optional wrapper classes (box / background) */
  box?: string;
};

export const CAPTION_STYLES: CaptionStyle[] = [
  { id: "pop", name: "Pop", text: "font-display font-bold text-[#ffe14d] [text-shadow:0_2px_0_#000,0_0_12px_rgba(0,0,0,.8)]" },
  { id: "clean", name: "Clean", text: "font-sans font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.9)]" },
  { id: "boxed", name: "Boxed", text: "font-sans font-bold text-white", box: "rounded-md bg-black/80 px-2 py-0.5" },
  { id: "outline", name: "Outline", text: "font-display font-bold text-white [-webkit-text-stroke:1.5px_#000] [paint-order:stroke_fill]" },
  { id: "karaoke", name: "Karaoke", text: "font-display font-bold text-white [text-shadow:0_2px_0_#000] [&>em]:not-italic [&>em]:text-[#3dff8a]" },
  { id: "neon", name: "Neon", text: "font-display font-bold text-[#ff7ac8] [text-shadow:0_0_8px_#ff2e88,0_0_18px_#ff2e88]" },
  { id: "sunset", name: "Sunset", text: "font-display font-bold accent-text [filter:drop-shadow(0_2px_0_#000)]" },
  { id: "mono", name: "Terminal", text: "font-mono font-semibold text-[#7dd3fc]", box: "rounded bg-black/70 px-1.5" },
];

export const styleById = (id: string) => CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES[0];

/** Mock transcript lines for the caption editor. */
export const SAMPLE_TRANSCRIPT = [
  { t: "0:00", text: "okay okay we just need the getaway car" },
  { t: "0:04", text: "WAIT where is he going" },
  { t: "0:07", text: "bro drove straight into the canal" },
  { t: "0:11", text: "he had ONE job chat" },
  { t: "0:15", text: "the cops are just watching him sink" },
];

/** Mock AI title/hashtag suggestions, cycled by "Regenerate". */
export const AI_SUGGESTIONS = [
  { title: "Getaway driver had ONE job 😭", tags: "#gta6 #gaming #funny #fyp #gtaonline" },
  { title: "He drove the getaway car into a canal 💀", tags: "#gta6 #gamingclips #fail #viral" },
  { title: "Worst heist escape in GTA 6 history", tags: "#gta6 #heist #gamer #shorts" },
];

export const PLATFORM_LIMITS = {
  tiktok: { label: "TikTok caption", max: 2200 },
  instagram: { label: "Instagram caption", max: 2200 },
  youtube: { label: "YouTube Shorts title", max: 100 },
  facebook: { label: "Facebook post", max: 5000 },
} as const;
