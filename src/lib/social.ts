"use client";

import { useSyncExternalStore } from "react";
import type { SocialPlatform } from "@/lib/plans";

export type SocialAccount = { id: string; platform: SocialPlatform; username: string; displayName: string; active: boolean };
export type SocialPost = {
  id: string;
  status: string;
  externalId?: string;
  createdAt?: string;
  scheduledFor?: string;
  platforms: { platform: string; accountId?: string; status: string; url?: string; error?: string }[];
};

export const PLATFORM_META: Record<SocialPlatform, { name: string; color: string; letter: string; note: string }> = {
  tiktok: { name: "TikTok", color: "#25f4ee", letter: "T", note: "Posts publicly to your profile" },
  youtube: { name: "YouTube", color: "#ff0033", letter: "Y", note: "Uploads as Shorts" },
  instagram: { name: "Instagram", color: "#e1306c", letter: "I", note: "Needs a Business or Creator account" },
  facebook: { name: "Facebook Pages", color: "#1877f2", letter: "F", note: "Posts as Reels to a Page you manage" },
};

type State = { ready: boolean; accounts: SocialAccount[]; perPlatform: number; posts: SocialPost[]; error: string | null };
let state: State = { ready: false, accounts: [], perPlatform: 0, posts: [], error: null };
const listeners = new Set<() => void>();
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const emit = () => listeners.forEach((l) => l());
const set = (p: Partial<State>) => { state = { ...state, ...p }; emit(); };

export async function refreshAccounts() {
  try {
    const r = await fetch("/api/social/accounts", { cache: "no-store" });
    const d = await r.json();
    set(r.ok ? { ready: true, accounts: d.accounts ?? [], perPlatform: d.perPlatform ?? 0, error: null } : { ready: true, error: d.error ?? "Couldn't load your accounts." });
  } catch {
    set({ ready: true, error: "Couldn't load your accounts." });
  }
}

export async function refreshPosts() {
  try {
    const r = await fetch("/api/social/posts", { cache: "no-store" });
    if (r.ok) set({ posts: ((await r.json()).posts ?? []) as SocialPost[] });
  } catch { /* keep the last list */ }
  if (timer) clearTimeout(timer);
  const busy = state.posts.some((p) => ["publishing", "pending", "processing"].includes(p.status));
  timer = setTimeout(refreshPosts, busy ? 8000 : 60000);
}

export function addPost(p: SocialPost) {
  set({ posts: [p, ...state.posts.filter((x) => x.id !== p.id)] });
  if (timer) clearTimeout(timer);
  timer = setTimeout(refreshPosts, 5000);
}

const SERVER: State = state;

/** Connected accounts + recent posts, shared across the dashboard. Pass enabled=false on plans without posting. */
export function useSocial(enabled: boolean): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (enabled && !started) {
        started = true;
        refreshAccounts();
        refreshPosts();
      }
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}

/** The latest post of a clip ("<jobId>/<file>"), if any. */
export const postFor = (posts: SocialPost[], jobId: string, file: string) => posts.find((p) => p.externalId === `${jobId}/${file}`);

export function postLabel(p: SocialPost): { text: string; tone: "ok" | "wait" | "bad" } {
  const s = p.status;
  if (s === "published") return { text: "Posted", tone: "ok" };
  if (s === "partial") return { text: "Partly posted", tone: "bad" };
  if (s === "failed") return { text: "Post failed", tone: "bad" };
  if (s === "scheduled") return { text: "Scheduled", tone: "wait" };
  return { text: "Posting…", tone: "wait" };
}
