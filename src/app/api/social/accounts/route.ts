import { NextResponse, type NextRequest } from "next/server";
import { requireStudio, socialError } from "@/lib/social-server";
import { listAccounts } from "@/lib/bundle";

/** GET /api/social/accounts → the customer's connected social accounts (slots beyond their plan are hidden). */
export async function GET(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  try {
    const accounts = (await listAccounts(r.s.uid)).filter((a) => a.slot <= r.perPlatform);
    return NextResponse.json({ accounts, perPlatform: r.perPlatform });
  } catch (e) {
    return socialError(e);
  }
}
