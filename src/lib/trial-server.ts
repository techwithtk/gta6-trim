import "server-only";
import { TRIAL } from "@/lib/plans";
import { worker } from "@/lib/worker";

type J = { kind?: string; status?: string; createdAt?: number };

/**
 * During a free trial: the plan's features, but at most TRIAL.liveSessions live sessions and TRIAL.videos videos in total.
 * Returns a customer-facing message when the cap is reached, else null. Counts everything started since the trial began.
 */
export async function trialCapError(uid: string, trialEndsAt: number | undefined | null, kind: "live" | "video"): Promise<string | null> {
  if (!trialEndsAt || Date.now() > trialEndsAt) return null;
  const since = (trialEndsAt - TRIAL.days * 86400_000) / 1000 - 60;
  const res = await worker(`/jobs?uid=${encodeURIComponent(uid)}`).catch(() => null);
  const jobs = res && res.ok ? ((await res.json()) as J[]) : [];
  const mine = jobs.filter((j) => (j.createdAt ?? 0) >= since && j.status !== "error");
  if (kind === "live" && mine.filter((j) => j.kind === "live").length >= TRIAL.liveSessions) {
    return `Your free trial includes ${TRIAL.liveSessions} live sessions, and you've used them all. Your plan starts automatically when the trial ends.`;
  }
  if (kind === "video" && mine.filter((j) => j.kind !== "live" && j.kind !== "drive").length >= TRIAL.videos) {
    return `Your free trial includes ${TRIAL.videos} YouTube videos, and you've used them both. Your plan starts automatically when the trial ends.`;
  }
  return null;
}
