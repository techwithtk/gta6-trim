import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildSession, setSession } from "@/lib/auth-server";
import { SESSION_COOKIE, decodeSession, safeNext } from "@/lib/session";

/** Re-checks the signed-in user's subscription with Dodo, refreshes the plan cookie, then sends them on. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL(`/login?redirect_url=${encodeURIComponent(next)}`, url.origin));

  const previous = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const fresh = await buildSession(previous);
  if (!fresh) return NextResponse.redirect(new URL("/login?error=unverified", url.origin));
  const dest = !fresh.plan && next.startsWith("/dashboard") ? "/checkout?plan=pro&need=plan" : next;
  return setSession(NextResponse.redirect(new URL(dest, url.origin)), req, fresh);
}
