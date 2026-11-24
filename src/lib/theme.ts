"use client";

import { useSyncExternalStore } from "react";

export type Theme = "comic" | "dark" | "light";
export const THEMES: Theme[] = ["comic", "dark", "light"];
const KEY = "gt-theme";
const listeners = new Set<() => void>();

const el = () => (typeof document === "undefined" ? null : document.getElementById("gt-app"));
const read = (): Theme => {
  const t = el()?.dataset.theme;
  return t === "dark" || t === "light" ? t : "comic";
};

/** Switch the dashboard theme (comic is the default). Remembered in this browser. */
export function setTheme(t: Theme) {
  const node = el();
  if (node) node.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => "comic");
}

/** Runs before first paint (inlined in the dashboard layout) so nobody sees a flash of the wrong theme. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||t==="light")document.getElementById("gt-app").dataset.theme=t}catch(e){}`;
