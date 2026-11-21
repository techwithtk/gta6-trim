"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const KEY = "gt-theme";
const listeners = new Set<() => void>();

const el = () => (typeof document === "undefined" ? null : document.getElementById("gt-app"));
const read = (): Theme => (el()?.dataset.theme === "light" ? "light" : "dark");

/** Switch the dashboard between dark and light. Remembered in this browser. */
export function setTheme(t: Theme) {
  const node = el();
  if (node) node.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => "dark");
}

/** Runs before first paint (inlined in the dashboard layout) so a light-mode user never sees a dark flash. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${KEY}");if(!t&&window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches)t="light";if(t==="light")document.getElementById("gt-app").dataset.theme="light"}catch(e){}`;
