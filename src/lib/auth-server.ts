import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { findActiveSubscription } from "@/lib/dodo";
import { planById } from "@/lib/plans";
import { SESSION_COOKIE, SESSION_MAX_AGE, cookieOptions, decodeSession, encodeSession, type Session } from "@/lib/session";

/**
 * Who you are comes from Clerk (Google, Discord, Twitch or email sign-in).
 * What you paid for comes from Dodo, cached in the signed `gt_session` cookie and re-checked every few hours.
 */

/** The plan cookie, but only if it belongs to the user Clerk says is signed in. */
export async function readSession(req: NextRequest): Promise<Session | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const s = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  return s && s.uid === userId ? s : null;
}

/** Build a fresh session for the signed-in Clerk user by asking Dodo about their plan. */
export async function buildSession(previous?: Session | null): Promise<Session | null> {
  const user = await currentUser();
  if (!user) return null;
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  if (!primary || primary.verification?.status !== "verified") return null;
  const email = primary.emailAddress.toLowerCase();
  const base = {
    uid: user.id,
    email,
    name: user.fullName || user.username || email.split("@")[0],
    picture: user.imageUrl,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  // Local testing only: DEV_PLAN=starter|pro|studio in .env.local gives the signed-in user that plan. Never used in production.
  const devPlan = process.env.NODE_ENV !== "production" ? process.env.DEV_PLAN : undefined;
  if (devPlan === "starter" || devPlan === "pro" || devPlan === "studio") {
    return { ...base, plan: devPlan, cycle: "monthly", checkedAt: Date.now() };
  }
  try {
    const found = await findActiveSubscription(email);
    if (!found) {
      const seat = await teamSeat(email).catch(() => null);
      if (seat) return { ...base, ...seat, checkedAt: Date.now() };
    }
    return { ...base, plan: found?.plan ?? null, cycle: found?.cycle, sub: found?.sub, trialEndsAt: found?.trialEndsAt, checkedAt: Date.now() };
  } catch (e) {
    // Dodo unreachable: keep the last known plan for the same user rather than locking a paying customer out.
    console.error("[auth] plan lookup failed", e instanceof Error ? e.message : e);
    const keep = previous && previous.uid === base.uid ? previous : null;
    return { ...base, plan: keep?.plan ?? null, cycle: keep?.cycle, sub: keep?.sub, trialEndsAt: keep?.trialEndsAt, checkedAt: Date.now() };
  }
}

/**
 * Team seats: no subscription of their own, but invited (by this verified email) to a Studio owner's team.
 * They get the owner's plan and work in the owner's workspace. Checked again whenever the session refreshes.
 */
async function teamSeat(email: string): Promise<Pick<Session, "plan" | "cycle" | "trialEndsAt" | "ws" | "wsName"> | null> {
  const url = (process.env.WORKER_URL ?? "").replace(/\/$/, "");
  if (!url || !process.env.WORKER_SECRET) return null;
  const r = await fetch(`${url}/seats?email=${encodeURIComponent(email)}`, { headers: { "x-worker-secret": process.env.WORKER_SECRET }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const owner = r.ok ? ((await r.json()) as { owner?: string | null }).owner : null;
  if (!owner) return null;
  const c = await clerkClient();
  const u = await c.users.getUser(owner);
  const ownerEmail = (u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0])?.emailAddress;
  const sub = ownerEmail ? await findActiveSubscription(ownerEmail) : null;
  if (!sub || planById(sub.plan).limits.seats < 2) return null; // owner no longer on a plan with seats
  return { plan: sub.plan, cycle: sub.cycle, trialEndsAt: sub.trialEndsAt, ws: owner, wsName: u.fullName || u.username || ownerEmail?.split("@")[0] || "your team" };
}

export async function setSession(res: NextResponse, req: NextRequest, s: Session) {
  res.cookies.set(SESSION_COOKIE, await encodeSession(s), cookieOptions(new URL(req.url).protocol === "https:"));
  return res;
}
