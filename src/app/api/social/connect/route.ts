import { NextResponse, type NextRequest } from "next/server";
import { requireStudio, socialError } from "@/lib/social-server";
import { connectUrl, PLATFORMS } from "@/lib/bundle";
import type { SocialPlatform } from "@/lib/plans";

/** POST /api/social/connect {platform} → { url } of the hosted connect page. Respects the per-platform cap. */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const { platform } = (await req.json().catch(() => ({}))) as { platform?: string };
  if (!platform || !PLATFORMS.includes(platform as SocialPlatform)) return NextResponse.json({ error: "Pick a platform." }, { status: 400 });
  try {
    const back = new URL(`/dashboard/integrations?connected=${platform}`, req.nextUrl.origin).toString();
    return NextResponse.json({ url: await connectUrl(r.s.uid, platform as SocialPlatform, r.perPlatform, back) });
  } catch (e) {
    return socialError(e);
  }
}
