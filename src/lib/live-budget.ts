import "server-only";
import { planById, TRIAL, type PlanId } from "@/lib/plans";
import { worker } from "@/lib/worker";

export type LiveBudget = { sec: number; since: number; label: string };

/** Start of the current calendar month in UTC, in seconds. Live hours reset then. */
const monthStart = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000; };
/** First moment of next month (UTC), in ms, for "resets on …". */
export const nextReset = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };

/**
 * How many seconds of live recording the customer gets, and from when they are counted:
 * TRIAL.liveHours during the free trial, otherwise the plan's monthly hours (calendar month, UTC).
 * The worker refuses new sessions and ends running ones when the hours are used up.
 */
export function liveBudget(plan: PlanId, trialEndsAt?: number | null): LiveBudget {
  if (trialEndsAt && Date.now() < trialEndsAt) {
    return { sec: TRIAL.liveHours * 3600, since: Math.floor((trialEndsAt - TRIAL.days * 86400_000) / 1000) - 60, label: "in your free trial" };
  }
  return { sec: planById(plan).limits.liveHours * 3600, since: monthStart(), label: "this month" };
}

/** Seconds of live recording used against the budget (running sessions count up to now). */
export async function liveUsed(uid: string, b: LiveBudget): Promise<number> {
  const res = await worker(`/live/usage?uid=${encodeURIComponent(uid)}&since=${b.since}`, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
  return res && res.ok ? Number(((await res.json()) as { seconds?: number }).seconds) || 0 : 0;
}
