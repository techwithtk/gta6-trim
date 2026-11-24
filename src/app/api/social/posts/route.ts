import { NextResponse, type NextRequest } from "next/server";
import { requireStudio, socialError } from "@/lib/social-server";
import { createPost, listAccounts, listPosts } from "@/lib/bundle";
import { worker } from "@/lib/worker";
import { track } from "@/lib/track-server";

const MAX_SCHEDULE_DAYS = 6; // clip links handed to the posting service last 7 days

/** GET /api/social/posts → recent posts (status + live links), keyed to clips by externalId "<jobId>/<file>". */
export async function GET(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  try {
    return NextResponse.json({ posts: (await listPosts(r.s.uid)).filter((p) => p.externalId) });
  } catch (e) {
    return socialError(e);
  }
}

/** POST /api/social/posts {jobId, file, caption, title, accountIds, scheduledFor?} → post (or schedule) one clip. */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { jobId?: string; file?: string; caption?: string; title?: string; accountIds?: string[]; scheduledFor?: string; consent?: boolean };
  if (!b.jobId || !/^[a-f0-9]{12}$/.test(b.jobId) || !b.file || !/^(clip_\d{2}|live_\d{3}_\d{2})\.mp4$/.test(b.file)) return NextResponse.json({ error: "Pick a clip." }, { status: 400 });
  const ids = [...new Set((b.accountIds ?? []).filter((x) => typeof x === "string"))];
  if (!ids.length) return NextResponse.json({ error: "Pick at least one account." }, { status: 400 });
  const caption = String(b.caption ?? "").trim().slice(0, 2200);
  const title = String(b.title ?? "").trim().slice(0, 100) || caption.split("\n")[0].slice(0, 100) || "GTA 6 moment";

  let scheduledFor: string | undefined;
  if (b.scheduledFor) {
    const t = Date.parse(b.scheduledFor);
    if (!Number.isFinite(t)) return NextResponse.json({ error: "That schedule time isn't valid." }, { status: 400 });
    if (t < Date.now() + 2 * 60_000) return NextResponse.json({ error: "Pick a time at least a few minutes from now." }, { status: 400 });
    if (t > Date.now() + MAX_SCHEDULE_DAYS * 86400_000) return NextResponse.json({ error: `You can schedule up to ${MAX_SCHEDULE_DAYS} days ahead.` }, { status: 400 });
    scheduledFor = new Date(t).toISOString();
  }

  try {
    const mine = (await listAccounts(r.s.uid)).filter((a) => a.slot <= r.perPlatform);
    const accounts = mine.filter((a) => ids.includes(a.id));
    if (accounts.length !== ids.length) return NextResponse.json({ error: "One of those accounts isn't connected anymore. Refresh and try again." }, { status: 400 });
    if (accounts.some((a) => a.platform === "tiktok") && !b.consent) return NextResponse.json({ error: "Confirm TikTok's music usage terms to post to TikTok." }, { status: 400 });

    // A long-lived signed link to the finished clip (the posting service downloads it, now or at the scheduled time).
    const fr = await worker(`/jobs/${b.jobId}/${b.file}?uid=${encodeURIComponent(r.s.uid)}&ttl=${7 * 86400}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    const videoUrl = fr && fr.ok ? ((await fr.json()) as { url?: string }).url : undefined;
    if (!videoUrl) return NextResponse.json({ error: "We couldn't find that clip." }, { status: 404 });

    const post = await createPost({ uid: r.s.uid, externalId: `${b.jobId}/${b.file}`, caption, title, videoUrl, accounts, scheduledFor });
    await track("first_post", { uid: r.s.uid });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return socialError(e);
  }
}
