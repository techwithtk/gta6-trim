import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, decodeSession, isStale } from "@/lib/session";

const isDashboard = (path: string) => path === "/dashboard" || path.startsWith("/dashboard/");

/**
 * Clerk on every request (so auth() works in routes), plus the dashboard guard:
 *  - not signed in                         → /login
 *  - plan cookie missing / other user / 6h → /api/auth/refresh (asks Dodo), then back here
 *  - signed in, no paid plan               → pick a plan at /checkout
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isDashboard(req.nextUrl.pathname)) return;
  const here = req.nextUrl.pathname + req.nextUrl.search;
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL(`/login?redirect_url=${encodeURIComponent(here)}`, req.url));

  const s = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s || s.uid !== userId || isStale(s)) {
    return NextResponse.redirect(new URL(`/api/auth/refresh?next=${encodeURIComponent(here)}`, req.url));
  }
  if (!s.plan) return NextResponse.redirect(new URL("/checkout?plan=pro&need=plan", req.url));
});

export const config = {
  matcher: [
    // Everything except Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
