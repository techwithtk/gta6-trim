// Brand kit: mirrors worker/brand.py. The worker renders; this list only drives the picker and plan checks.

export type Brand = { style: string; accent: string; hookColor: string; handle: string; logo: boolean; position: "tl" | "tr"; opacity: number };

/** Order matters: plans unlock the first N (plan.limits.captionStyles). */
export const BRAND_STYLES: { id: string; name: string; font: string; text: string; active: string; box?: string }[] = [
  { id: "classic", name: "Classic", font: "Anton", text: "#FFFFFF", active: "#FF2E88" },
  { id: "yellow", name: "Highlighter", font: "Anton", text: "#FFFFFF", active: "#FFE14D" },
  { id: "comic", name: "Comic", font: "Bangers", text: "#FFFFFF", active: "#FFE14D" },
  { id: "clean", name: "Clean", font: "Archivo Black", text: "#FFFFFF", active: "#3DFF8A" },
  { id: "boxed", name: "Boxed", font: "Anton", text: "#FFFFFF", active: "#FFFFFF", box: "#FF2E88" },
  { id: "neon", name: "Neon", font: "Bebas Neue", text: "#FFFFFF", active: "#22D3EE" },
  { id: "pop", name: "Pop", font: "Luckiest Guy", text: "#FFFFFF", active: "#FF3B30" },
  { id: "fire", name: "Fire", font: "Archivo Black", text: "#FFE14D", active: "#FF6A00" },
];

export const DEFAULT_BRAND: Brand = { style: "classic", accent: "", hookColor: "", handle: "", logo: false, position: "tr", opacity: 0.85 };
export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
export const HANDLE_RE = /^[@A-Za-z0-9_.\- ]{0,30}$/;
