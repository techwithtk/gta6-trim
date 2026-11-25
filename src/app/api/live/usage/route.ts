import { NextResponse, type NextRequest } from "next/server";
import { requirePlan } from "@/lib/worker";
import { liveBudget, liveUsed, nextReset } from "@/lib/live-budget";

/** GET /api/live/usage → { usedSec, limitSec, label, resetsAt } for the live-hours meter. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const b = liveBudget(r.s.plan, r.s.trialEndsAt);
  const trial = b.label.includes("trial");
  return NextResponse.json({ usedSec: await liveUsed(r.s.uid, b), limitSec: b.sec, label: b.label, resetsAt: trial ? null : nextReset() });
}
