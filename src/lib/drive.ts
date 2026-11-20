"use client";

import { useSyncExternalStore } from "react";

/** Whether the signed-in user has connected Google Drive. One shared check for the whole dashboard. */
type State = { ready: boolean; connected: boolean };
let state: State = { ready: false, connected: false };
const listeners = new Set<() => void>();
let started = false;
const SERVER: State = state;

export async function refreshDrive() {
  try {
    const r = await fetch("/api/drive", { cache: "no-store" });
    const d = await r.json();
    state = { ready: true, connected: !!(r.ok && d.connected) };
  } catch {
    state = { ...state, ready: true };
  }
  listeners.forEach((l) => l());
}

export function useDrive(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!started) { started = true; refreshDrive(); }
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}

export async function saveToDrive(jobId: string, files: string[]): Promise<{ file: string; link?: string; error?: string }[]> {
  const r = await fetch("/api/drive/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, files }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Couldn't save to Drive.");
  return d.saved ?? [];
}
