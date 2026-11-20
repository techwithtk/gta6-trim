import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, limitsFor } from "@/lib/worker";
import { socialConfigured, SocialError } from "@/lib/bundle";
import type { Session } from "@/lib/session";

type Ok = { s: Session & { plan: NonNullable<Session["plan"]> }; perPlatform: number };

/** Signed in, on a plan with auto-post (Studio), and the posting service configured. */
export async function requireStudio(req: NextRequest): Promise<Ok | { error: NextResponse }> {
  const r = await requirePlan(req);
  if ("error" in r) return r;
  const limits = limitsFor(r.s.plan);
  if (!limits.autopost) return { error: NextResponse.json({ error: "Posting to social media is on the Studio plan." }, { status: 403 }) };
  if (!socialConfigured()) return { error: NextResponse.json({ error: "Social posting isn't switched on yet. Try again soon." }, { status: 503 }) };
  return { s: r.s, perPlatform: limits.accountsPerPlatform };
}

export function socialError(e: unknown) {
  if (e instanceof SocialError) {
    const auth = e.status === 401 || e.status === 403;
    const status = e.status >= 500 || auth ? 502 : e.status;
    return NextResponse.json({ error: auth ? "The posting service rejected our key. We're on it." : e.message }, { status });
  }
  return NextResponse.json({ error: "The posting service didn't respond. Try again in a minute." }, { status: 502 });
}
