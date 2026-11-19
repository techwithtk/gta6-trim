import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildSession, readSession, setSession } from "@/lib/auth-server";
import { RECHECK_MS } from "@/lib/session";

/** Who is signed in and which plan they have. Creates/refreshes the plan cookie on the fly after a Clerk sign-in. */
export async function GET(req: NextRequest) {
  const noStore = { headers: { "cache-control": "no-store" } };
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ user: null, plan: null, cycle: null }, noStore);

  let s = await readSession(req);
  const stale = !s || Date.now() - s.checkedAt > RECHECK_MS;
  if (stale) s = await buildSession(s);
  if (!s) return NextResponse.json({ user: null, plan: null, cycle: null, error: "unverified" }, noStore);

  const res = NextResponse.json({ user: { email: s.email, name: s.name, picture: s.picture ?? null }, plan: s.plan, cycle: s.cycle ?? null }, noStore);
  return stale ? setSession(res, req, s) : res;
}
