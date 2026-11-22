import { NextResponse, type NextRequest } from "next/server";
import { requireStudio, socialError } from "@/lib/social-server";
import { listPosts, postStats, refreshPostStats, SocialError, statKey } from "@/lib/bundle";
import type { SocialPlatform } from "@/lib/plans";

/** GET /api/social/stats → latest views/likes/comments/shares per posted clip, keyed "<postId>~<platform>". */
export async function GET(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  try {
    return NextResponse.json({ stats: await postStats(await listPosts(r.s.uid)) });
  } catch (e) {
    // Analytics off on the posting service (403): the page still works, just without numbers.
    if (e instanceof SocialError && e.status === 403) return NextResponse.json({ stats: {}, unavailable: true });
    return socialError(e);
  }
}

/** POST /api/social/stats {postId, platform} → fetch fresh numbers for one post now (6 per post per day). */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { postId?: string; platform?: string };
  const platform = b.platform as SocialPlatform;
  if (!b.postId || typeof b.postId !== "string" || !["tiktok", "youtube", "instagram", "facebook"].includes(platform)) return NextResponse.json({ error: "Pick a post." }, { status: 400 });
  try {
    const mine = (await listPosts(r.s.uid)).some((p) => p.platforms.some((x) => x.postId === b.postId && x.platform === platform && x.status === "published"));
    if (!mine) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const stats = await refreshPostStats(b.postId, platform);
    return NextResponse.json({ key: statKey(b.postId, platform), stats });
  } catch (e) {
    if (e instanceof SocialError && e.status === 429) return NextResponse.json({ error: "Numbers can be refreshed 6 times a day per post. They also update on their own every day." }, { status: 429 });
    if (e instanceof SocialError && e.status === 403) return NextResponse.json({ error: "Stats aren't switched on yet." }, { status: 503 });
    return socialError(e);
  }
}
