import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { PLATFORM_NAME } from "@/lib/postErrors";
import { createPost, listAccounts, socialConfigured, SocialError } from "@/lib/bundle";
import { findActiveSubscription } from "@/lib/dodo";
import { planById } from "@/lib/plans";
import { worker } from "@/lib/worker";
import { track } from "@/lib/track-server";

export const maxDuration = 300;

const SECRET = process.env.WORKER_SECRET ?? "";
const fromWorker = (h: string | null) => {
  if (!SECRET || !h) return false;
  const a = Buffer.from(h), b = Buffer.from(SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Called by the clipping worker (never the browser) when a live session with auto-post finds a strong new clip.
 * Re-checks that the customer is still on a plan with auto-post and that the accounts are still theirs, then posts.
 */
export async function POST(req: NextRequest) {
  if (!fromWorker(req.headers.get("x-worker-secret"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { uid?: string; jobId?: string; file?: string; title?: string; caption?: string; accounts?: string[]; consent?: boolean };
  if (!b.uid || !b.jobId || !/^[a-f0-9]{12}$/.test(b.jobId) || !b.file || !/^live_\d{3}_\d{2}\.mp4$/.test(b.file)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!socialConfigured()) return NextResponse.json({ error: "Social posting isn't switched on." }, { status: 503 });

  try {
    const user = await (await clerkClient()).users.getUser(b.uid);
    const email = (user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0])?.emailAddress;
    const sub = email ? await findActiveSubscription(email) : null;
    const limits = sub ? planById(sub.plan).limits : null;
    if (!limits?.autopost) return NextResponse.json({ error: "Auto-post needs the Studio plan." }, { status: 403 });

    const ids = new Set(b.accounts ?? []);
    const accounts = (await listAccounts(b.uid)).filter((a) => a.slot <= limits.accountsPerPlatform && a.active && ids.has(a.id))
      .filter((a) => a.platform !== "tiktok" || b.consent);
    // Accounts whose login the platform rejected are skipped until reconnected, so auto-post doesn't keep failing on them.
    const paused = accounts.filter((a) => a.needsReconnect);
    const live = accounts.filter((a) => !a.needsReconnect);
    if (accounts.length && !live.length) {
      return NextResponse.json({ error: `Paused: ${paused.map((a) => `${PLATFORM_NAME[a.platform]} (${a.displayName})`).join(", ")} connection expired. Reconnect it in Integrations to resume auto-post.` }, { status: 409 });
    }
    if (!accounts.length) return NextResponse.json({ error: "None of the chosen accounts are connected anymore." }, { status: 400 });

    const fr = await worker(`/jobs/${b.jobId}/${b.file}?uid=${encodeURIComponent(b.uid)}&ttl=${7 * 86400}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    const videoUrl = fr && fr.ok ? ((await fr.json()) as { url?: string }).url : undefined;
    if (!videoUrl) return NextResponse.json({ error: "Clip not found." }, { status: 404 });

    const title = String(b.title ?? "").trim().slice(0, 100) || "GTA 6 moment";
    const post = await createPost({ uid: b.uid, externalId: `${b.jobId}/${b.file}`, caption: String(b.caption ?? "").trim().slice(0, 2200) || `${title}\n\n#GTA6 #GTAVI #gaming #shorts`, title, videoUrl, accounts: live });
    await track("first_post", { uid: b.uid, anon: null, props: { auto: true } });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    const msg = e instanceof SocialError ? e.message : "Posting failed.";
    console.error("[autopost]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
