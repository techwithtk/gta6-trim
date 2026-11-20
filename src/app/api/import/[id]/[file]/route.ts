import { NextResponse, type NextRequest } from "next/server";
import { requirePlan, worker } from "@/lib/worker";

/**
 * A finished Short (or its thumbnail). With R2 storage the worker returns a short-lived signed link and the browser
 * is redirected there; with local storage the file is streamed through. ?download=1 saves it as a file.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; file: string }> }) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const { id, file } = await params;
  if (!/^[a-f0-9]{12}$/.test(id) || !/^(clip_\d{2}|live_\d{3}_\d{2})\.(mp4|jpg)$/.test(file)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const download = req.nextUrl.searchParams.get("download") === "1";
  const res = await worker(`/jobs/${id}/${file}?uid=${encodeURIComponent(r.s.uid)}${download ? "&download=1" : ""}`, { signal: AbortSignal.timeout(300_000) }).catch(() => null);
  if (!res || !res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (res.headers.get("content-type")?.includes("application/json")) {
    const { url } = (await res.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.redirect(url, { headers: { "cache-control": "private, no-store" } });
  }
  if (!res.body) return NextResponse.json({ error: "not found" }, { status: 404 });
  const headers = new Headers({ "content-type": res.headers.get("content-type") ?? "application/octet-stream", "cache-control": "private, max-age=3600" });
  const len = res.headers.get("content-length");
  if (len) headers.set("content-length", len);
  if (download) headers.set("content-disposition", `attachment; filename="gta6trim-${id}-${file}"`);
  return new NextResponse(res.body, { headers });
}
