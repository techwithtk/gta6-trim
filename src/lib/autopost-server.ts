import "server-only";
import { timingSafeEqual } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { listAccounts, socialConfigured } from "@/lib/bundle";
import { findActiveSubscription } from "@/lib/dodo";
import { planById, type PlanId } from "@/lib/plans";
import { limitsFor } from "@/lib/worker";

export type AutopostIn = { accounts?: string[]; minScore?: number; gapMin?: number; consent?: boolean };
type Limits = ReturnType<typeof limitsFor>;

/** Auto-post settings for a live session: only the customer's own connected accounts, TikTok only with the music-terms consent. */
export async function checkAutopost(uid: string, limits: Limits, a?: AutopostIn): Promise<{ autopost?: AutopostIn } | { error: string; status: number }> {
  if (!a?.accounts?.length) return {};
  if (!limits.autopost) return { error: "Auto-post is on the Studio plan.", status: 403 };
  if (!socialConfigured()) return { error: "Social posting isn't switched on yet.", status: 503 };
  const ids = new Set(a.accounts);
  const mine = (await listAccounts(uid).catch(() => [])).filter((x) => x.slot <= limits.accountsPerPlatform && ids.has(x.id));
  if (mine.length !== ids.size) return { error: "One of those accounts isn't connected anymore. Refresh and try again.", status: 400 };
  if (mine.some((x) => x.platform === "tiktok") && !a.consent) return { error: "Confirm TikTok's music usage terms to auto-post to TikTok.", status: 400 };
  return { autopost: { accounts: mine.map((x) => x.id), minScore: Number(a.minScore) || 0.75, gapMin: Number(a.gapMin) || 60, consent: !!a.consent } };
}

/** The customer's current paid plan (and free-trial end, if any), looked up fresh — for calls from the worker, where there is no browser session. */
export async function activeSub(uid: string): Promise<{ plan: PlanId; trialEndsAt?: number } | null> {
  const user = await (await clerkClient()).users.getUser(uid);
  const email = (user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0])?.emailAddress;
  const sub = email ? await findActiveSubscription(email) : null;
  return sub && planById(sub.plan) ? { plan: sub.plan, trialEndsAt: sub.trialEndsAt } : null;
}

export async function activePlan(uid: string): Promise<PlanId | null> {
  return (await activeSub(uid))?.plan ?? null;
}

const SECRET = process.env.WORKER_SECRET ?? "";
export const fromWorker = (h: string | null) => {
  if (!SECRET || !h) return false;
  const a = Buffer.from(h), b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
};
