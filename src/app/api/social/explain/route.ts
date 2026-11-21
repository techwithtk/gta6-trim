import { NextResponse, type NextRequest } from "next/server";
import { requireStudio } from "@/lib/social-server";
import { worker } from "@/lib/worker";

/** POST {platform, error} → {reason, fix}: a failed post's error explained in plain words by AI. */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { platform?: string; error?: string };
  if (!b.error) return NextResponse.json({ error: "Nothing to explain." }, { status: 400 });
  try {
    const res = await worker("/explain-post", { method: "POST", body: JSON.stringify({ platform: String(b.platform ?? "").slice(0, 20), error: String(b.error).slice(0, 1500) }), signal: AbortSignal.timeout(60_000) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The AI helper didn't respond. Try again in a minute." }, { status: 503 });
  }
}
