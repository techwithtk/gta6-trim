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

/* ------------------------------------------------------------------ Dropbox + OneDrive (Pro and Studio) */

export type StorageProvider = "dropbox" | "onedrive";
export const STORAGE_LABEL: Record<StorageProvider, string> = { dropbox: "Dropbox", onedrive: "OneDrive" };
type ProviderState = { available: boolean; allowed: boolean; connected: boolean; account: string | null };
type StorageState = { ready: boolean } & Record<StorageProvider, ProviderState>;
const EMPTY: ProviderState = { available: false, allowed: false, connected: false, account: null };
let sState: StorageState = { ready: false, dropbox: EMPTY, onedrive: EMPTY };
const sListeners = new Set<() => void>();
let sStarted = false;
const S_SERVER: StorageState = sState;

export async function refreshStorage() {
  try {
    const r = await fetch("/api/storage", { cache: "no-store" });
    const d = r.ok ? await r.json() : {};
    sState = { ready: true, dropbox: { ...EMPTY, ...d.dropbox }, onedrive: { ...EMPTY, ...d.onedrive } };
  } catch {
    sState = { ...sState, ready: true };
  }
  sListeners.forEach((l) => l());
}

/** Which of Dropbox / OneDrive are set up on the server, allowed on this plan, and connected by this person. */
export function useStorage(): StorageState {
  return useSyncExternalStore(
    (cb) => {
      sListeners.add(cb);
      if (!sStarted) { sStarted = true; refreshStorage(); }
      return () => sListeners.delete(cb);
    },
    () => sState,
    () => S_SERVER,
  );
}

export async function saveToStorage(provider: StorageProvider, jobId: string, files: string[]): Promise<{ file: string; link?: string; error?: string }[]> {
  const r = await fetch("/api/storage/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, jobId, files }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `Couldn't save to ${STORAGE_LABEL[provider]}.`);
  return d.saved ?? [];
}
