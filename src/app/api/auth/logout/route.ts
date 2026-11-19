import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Clears the plan cookie. Clerk's own sign-out (SignOutButton) ends the login and then redirects here. */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", new URL(req.url).origin));
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
