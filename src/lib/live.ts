"use client";

import { useEffect, useRef, useState } from "react";
import { initial, seedMoments, HOOKS, TRIGGERS, type Stream, type Moment } from "./mock";
import type { LiveStream, StreamsResult } from "./twitch";

const TINTS: [string, string, string][] = [
  ["#ff8a3d", "#ff3d9a", "#3b1460"], ["#22d3ee", "#1e3a8a", "#0b0612"], ["#fbbf24", "#f97316", "#7c2d12"], ["#a855f7", "#ec4899", "#1e1b4b"],
  ["#10b981", "#065f46", "#022c22"], ["#38bdf8", "#0ea5e9", "#0c4a6e"], ["#fb7185", "#9f1239", "#4c0519"], ["#f472b6", "#334155", "#0f172a"],
];
function uptime(startedAt: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}
/** Map a real Twitch stream into the dashboard's Stream shape, keeping simulated hype for streams we already track. */
function fromTwitch(l: LiveStream, i: number, prev?: Stream): Stream {
  const base = prev?.hype ?? 25 + ((i * 17) % 40);
  return {
    id: l.id,
    channel: l.name,
    title: l.title,
    platform: "twitch",
    permission: prev?.permission ?? "discovery",
    viewers: l.viewers,
    hype: base,
    chatRate: prev?.chatRate ?? 10,
    history: prev?.history ?? Array.from({ length: 30 }, (_, k) => Math.round(base + Math.sin(k / 3 + i) * 8)),
    clipsToday: prev?.clipsToday ?? 0,
    scene: TINTS[i % TINTS.length],
    cam: "br",
    uptime: uptime(l.startedAt),
    url: l.url,
    lang: l.language.toUpperCase(),
    thumbnail: l.thumbnail,
  };
}

/** Simulates the live pipeline: viewers drift, hype random-walks, spikes create moments
 *  — but only for streams the customer is actively clipping (`active`). */
export function useLiveSim(active?: Set<string>) {
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  });
  const [streams, setStreams] = useState<Stream[]>(initial);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [source, setSource] = useState<{ kind: "sample" | "twitch"; note: string }>({ kind: "sample", note: "Sample data" });
  const counter = useRef(10);

  // Real Twitch streams (refresh every 60s). Falls back to sample streams when keys aren't configured.
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = (await (await fetch("/api/streams")).json()) as StreamsResult;
        if (stop) return;
        if (r.source === "twitch") {
          setStreams((prev) => r.streams.map((l, i) => fromTwitch(l, i, prev.find((p) => p.id === l.id))));
          setSource({ kind: "twitch", note: `${r.streams.length} live on Twitch` });
        } else {
          setSource({ kind: "sample", note: r.reason });
        }
      } catch {
        /* keep current data */
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const seeded = useRef(false);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (!seeded.current) {
        seeded.current = true;
        setMoments(seedMoments(Date.now()));
        return;
      }
      const spawned: Moment[] = [];
      setStreams((prev) =>
        prev.map((s) => {
          const spike = Math.random() < 0.035;
          let hype = s.hype + (Math.random() - 0.5) * 9 + (40 - s.hype) * 0.04;
          if (spike) hype = 82 + Math.random() * 18;
          hype = Math.max(4, Math.min(100, hype));
          const viewers = Math.max(200, Math.round(s.viewers * (1 + (Math.random() - 0.48) * 0.006)));
          let clipsToday = s.clipsToday;
          if (spike && (activeRef.current ? activeRef.current.has(s.id) : s.permission !== "discovery")) {
            clipsToday += 1;
            counter.current += 1;
            spawned.push({
              id: `m${counter.current}`,
              streamId: s.id,
              channel: s.channel,
              score: Math.round((7 + Math.random() * 3) * 10) / 10,
              title: HOOKS[Math.floor(Math.random() * HOOKS.length)],
              trigger: TRIGGERS[Math.floor(Math.random() * TRIGGERS.length)],
              at: Date.now(),
              status: "detected",
            });
          }
          return { ...s, hype, viewers, clipsToday, chatRate: Math.round(hype * 0.6 + Math.random() * 4), history: [...s.history.slice(1), hype] };
        }),
      );
      setMoments((prev) => {
        const advanced = prev.map((m) =>
          m.status === "detected" && Date.now() - m.at > 2500 ? { ...m, status: "clipping" as const } :
          m.status === "clipping" && Date.now() - m.at > 7000 ? { ...m, status: "ready" as const } : m,
        );
        return spawned.length ? [...spawned, ...advanced].slice(0, 40) : advanced;
      });
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  return { streams, moments, now, source };
}

