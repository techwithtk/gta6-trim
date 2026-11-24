"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const send = (name: "visit" | "pricing_view", extra: Record<string, string> = {}) => {
  const body = JSON.stringify({ name, path: location.pathname, ...extra });
  try {
    if (navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/t", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
};

const once = (key: string) => {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
};

/** First-party funnel tracking: one "visit" per browser session (with its source) and "pricing_view" when pricing is seen. */
export function Tracker() {
  const path = usePathname();

  useEffect(() => {
    if (once("gt_visit")) {
      const q = new URLSearchParams(location.search);
      send("visit", { ref: document.referrer, utm: q.get("utm_source") ?? q.get("ref") ?? "" });
    }
  }, []);

  useEffect(() => {
    if (path.startsWith("/checkout") || path.startsWith("/dashboard/billing")) {
      if (once("gt_pricing")) send("pricing_view");
      return;
    }
    const el = document.getElementById("pricing");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (once("gt_pricing")) send("pricing_view");
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [path]);

  return null;
}
