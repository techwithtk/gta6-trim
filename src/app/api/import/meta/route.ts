import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/** Title, length and caption availability for a pasted YouTube link. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const url = req.nextUrl.searchParams.get("url") ?? "";
  try {
    const res = await worker(`/meta?url=${encodeURIComponent(url)}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });
  }
}
