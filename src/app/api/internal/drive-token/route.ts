import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { driveToken } from "@/lib/drive-server";

const SECRET = process.env.WORKER_SECRET ?? "";
const fromWorker = (h: string | null) => {
  if (!SECRET || !h) return false;
  const a = Buffer.from(h), b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Worker only (x-worker-secret): a fresh Google Drive token (drive.file scope) for a Drive import in progress.
 * Google tokens last about an hour; a big import can take longer. The worker uses it once and never stores it.
 */
export async function POST(req: NextRequest) {
  if (!fromWorker(req.headers.get("x-worker-secret"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { uid } = (await req.json().catch(() => ({}))) as { uid?: string };
  if (!uid || !/^user_[A-Za-z0-9]{10,60}$/.test(uid)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const token = await driveToken(uid);
  return token ? NextResponse.json({ token }, { headers: { "cache-control": "no-store" } }) : NextResponse.json({ error: "Drive not connected." }, { status: 404 });
}
