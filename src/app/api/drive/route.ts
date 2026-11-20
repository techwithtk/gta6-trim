import { NextResponse, type NextRequest } from "next/server";
import { requirePlan } from "@/lib/worker";
import { driveToken } from "@/lib/drive-server";

/** GET /api/drive → { connected } — whether this user has given GTA6 Trim permission to save to their Google Drive. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  return NextResponse.json({ connected: !!(await driveToken(r.s.uid)) });
}
