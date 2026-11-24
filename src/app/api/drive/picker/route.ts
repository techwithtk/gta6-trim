import { NextResponse, type NextRequest } from "next/server";
import { requireStudio } from "@/lib/social-server";
import { driveToken } from "@/lib/drive-server";

/**
 * GET /api/drive/picker → what the browser needs to open Google's file picker:
 * {token, apiKey, appId}. The token is the customer's own short-lived Google token with the "drive.file" permission,
 * so the picker only grants access to the files they choose. apiKey is a browser key restricted to the Picker API.
 */
export async function GET(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const apiKey = process.env.GOOGLE_PICKER_API_KEY ?? "";
  const appId = process.env.GOOGLE_PROJECT_NUMBER ?? "";
  if (!apiKey || !appId) return NextResponse.json({ error: "Picking from Google Drive isn't switched on yet." }, { status: 503 });
  const token = await driveToken(r.s.self ?? r.s.uid);
  if (!token) return NextResponse.json({ connected: false }, { headers: { "cache-control": "no-store" } });
  return NextResponse.json({ connected: true, token, apiKey, appId }, { headers: { "cache-control": "no-store" } });
}
