import { worker, workerConfigured } from "@/lib/worker";

type Result = { source: "kick"; streams: unknown[] } | { source: "sample"; reason: string };
let cached: { at: number; data: Result } | null = null;

/** GET /api/streams/kick → live GTA VI streams on Kick, fetched by the worker and cached for a minute. */
export async function GET() {
  if (cached && Date.now() - cached.at < 60_000) return Response.json(cached.data);
  if (!workerConfigured()) return Response.json({ source: "sample", reason: "Worker not configured" });
  try {
    const res = await worker("/kick/streams", { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return Response.json({ source: "sample", reason: `Kick list error ${res.status}` });
    const d = (await res.json()) as { streams?: unknown[] };
    cached = { at: Date.now(), data: { source: "kick", streams: d.streams ?? [] } };
    return Response.json(cached.data);
  } catch {
    return Response.json({ source: "sample", reason: "Kick list unavailable" });
  }
}
