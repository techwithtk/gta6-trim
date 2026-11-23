import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth-server";
import { planById } from "@/lib/plans";
import type { Session } from "@/lib/session";

/** The clipping worker (worker/server.py). Only the server talks to it; the shared secret never reaches the browser. */
const WORKER_URL = process.env.WORKER_URL ?? "";
const WORKER_SECRET = process.env.WORKER_SECRET ?? "";

export const workerConfigured = () => !!WORKER_URL && !!WORKER_SECRET;

export function worker(path: string, init?: RequestInit) {
  return fetch(WORKER_URL.replace(/\/$/, "") + path, {
    ...init,
    cache: "no-store",
    headers: { ...(init?.headers ?? {}), "x-worker-secret": WORKER_SECRET, "content-type": "application/json" },
    signal: init?.signal ?? AbortSignal.timeout(90_000),
  });
}

/** Signed in + on a paid plan + worker reachable, or a ready-made error response. */
export async function requirePlan(req: NextRequest): Promise<{ s: Session & { plan: NonNullable<Session["plan"]> } } | { error: NextResponse }> {
  const s = await readSession(req);
  if (!s) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  if (!s.plan) return { error: NextResponse.json({ error: "Pick a plan to import videos." }, { status: 402 }) };
  if (!workerConfigured()) return { error: NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 }) };
  // Team members work in the owner's workspace: every job, account and setting is keyed by the workspace id.
  return { s: { ...(s as Session & { plan: NonNullable<Session["plan"]> }), uid: s.ws ?? s.uid, self: s.uid } };
}

export const limitsFor = (plan: NonNullable<Session["plan"]>) => planById(plan).limits;

/** What the plan unlocks in the brand kit; sent with every job so a downgrade takes effect on the next clip. */
export const brandCapsFor = (plan: NonNullable<Session["plan"]>) => ({ styles: planById(plan).limits.captionStyles, custom: plan !== "starter" });
