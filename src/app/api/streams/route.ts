import { getLiveGtaStreams } from "@/lib/twitch";

/** GET /api/streams → live GTA VI streams from Twitch (or { source: "sample" } when keys aren't set). */
export async function GET() {
  return Response.json(await getLiveGtaStreams());
}
