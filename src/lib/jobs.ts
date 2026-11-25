"use client";

import { useSyncExternalStore } from "react";

/** One clipping job (a YouTube link or an uploaded file) as the worker reports it. */
export type Clip = {
  file: string; thumb: string; title: string; reason: string; score: number; length: number; at?: number;
  hook?: string;
  src?: { offset: number; dur: number }; // present = editable in the clip editor
  editing?: boolean; editAt?: number; editError?: string | null; edited?: boolean;
  v?: number; // bumps on every re-render (cache-busts the video and thumbnail)
  text?: PostTextLite; // AI post text already written (Drive imports write it up front)
  drive?: string; // original Google Drive file name
};
export type PostTextLite = { tiktok: string; youtube_title: string; youtube_description: string; instagram: string; facebook: string };
export type Autopost = { accounts: string[]; minScore: number; gapMin: number; consent: boolean };
export type Job = {
  id: string;
  vid: string;
  title: string;
  duration: number;
  status: "queued" | "running" | "done" | "error" | "recording" | "ended";
  kind?: "live" | "drive";
  auto?: boolean; // live session started by auto-start
  platform?: "twitch" | "kick";
  login?: string;
  channel?: string;
  chunks?: number;
  processed?: number;
  stop?: boolean;
  endedAt?: number;
  endReason?: string; // "ended" | "stopped" | "time limit" | "hours used" | "lost"
  autopost?: Autopost | null;
  autopostLast?: { file: string; title: string; at: number; ok: boolean; error?: string | null };
  step: number;
  steps: string[];
  error?: string;
  clips: Clip[];
  failed?: { name: string; error: string }[]; // Drive imports: files that couldn't be imported
  createdAt: number; // unix seconds
};

type State = { ready: boolean; jobs: Job[]; offline: string | null };

let state: State = { ready: false, jobs: [], offline: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

const emit = () => listeners.forEach((l) => l());
/** How soon to poll again: fast while a video is processing, steady during live sessions, slow when idle. */
const nextPollMs = () =>
  state.jobs.some((j) => j.status === "queued" || j.status === "running") ? 4000
  : state.jobs.some((j) => j.clips?.some((c) => c.editing)) ? 5000
  : state.jobs.some((j) => j.status === "recording" || (j.kind === "live" && (j.processed ?? 0) < (j.chunks ?? 0))) ? 15000
  : 30000;

/** Fetch the signed-in user's jobs now. */
export async function refreshJobs() {
  try {
    const r = await fetch("/api/import", { cache: "no-store" });
    const d = await r.json();
    state = r.ok ? { ready: true, jobs: d.jobs ?? [], offline: null } : { ...state, ready: true, offline: d.error ?? "The clipping engine is offline." };
  } catch {
    state = { ...state, ready: true, offline: "The clipping engine is offline right now." };
  }
  emit();
}

/** Poll quickly while something is processing, slowly otherwise. One poller shared by the whole dashboard. */
function loop() {
  refreshJobs().finally(() => {
    timer = setTimeout(loop, nextPollMs());
  });
}

/** Show a just-created job immediately and speed up polling. */
export function addJob(job: Job) {
  state = { ...state, jobs: [job, ...state.jobs.filter((j) => j.id !== job.id)] };
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(loop, 3000);
}

const SERVER: State = state;

export function useJobs(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!started) {
        started = true;
        loop();
      }
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}

/** This calendar month's usage, counted from real jobs. */
export function monthUsage(jobs: Job[]) {
  // No jobs yet (always the case while the page is pre-rendered): skip reading the clock.
  if (!jobs.length) return { videos: 0, clips: 0 };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
  const mine = jobs.filter((j) => (j.createdAt ?? 0) >= start);
  return {
    videos: mine.filter((j) => j.status !== "error" && j.kind !== "live" && j.kind !== "drive").length,
    clips: mine.reduce((n, j) => n + (j.clips?.length ?? 0), 0),
  };
}
