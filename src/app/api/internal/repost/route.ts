import { NextResponse, type NextRequest } from "next/server";
import { activePlan, fromWorker } from "@/lib/autopost-server";
import { PLATFORM_NAME } from "@/lib/postErrors";
import { createPost, listAccounts, listPosts, postStats, socialConfigured, SocialError } from "@/lib/bundle";
import { pickWinner } from "@/lib/repost";
import { limitsFor, worker } from "@/lib/worker";

export const maxDuration = 300;

/**
 * Called once a day by the worker for each customer with auto-repost on. Re-checks the Studio plan and the accounts,
 * picks the clip that most beat the customer's usual views (if any), writes fresh post text and posts it.
 * Returns {posted: "<jobId>/<file>"} or {posted: null, message}.
 */
export async function POST(req: NextRequest) {
  if (!fromWorker(req.headers.get("x-worker-secret"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { uid?: string; accounts?: string[]; consent?: boolean; multiple?: number; delayDays?: number; done?: string[] };
  if (!b.uid) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (!socialConfigured()) return NextResponse.json({ error: "Social posting isn't switched on." }, { status: 503 });
  try {
    const plan = await activePlan(b.uid);
    const limits = plan ? limitsFor(plan) : null;
    if (!limits?.autopost) return NextResponse.json({ error: "Auto-repost needs the Studio plan." }, { status: 403 });

    const ids = new Set(b.accounts ?? []);
    const accounts = (await listAccounts(b.uid)).filter((a) => a.slot <= limits.accountsPerPlatform && a.active && ids.has(a.id))
      .filter((a) => a.platform !== "tiktok" || b.consent);
    const paused = accounts.filter((a) => a.needsReconnect);
    const live = accounts.filter((a) => !a.needsReconnect);
    if (accounts.length && !live.length) return NextResponse.json({ posted: null, message: `Paused: ${paused.map((a) => PLATFORM_NAME[a.platform]).join(", ")} connection expired. Reconnect it in Integrations.` });
    if (!accounts.length) return NextResponse.json({ posted: null, message: "None of the chosen accounts are connected anymore." });

    const posts = await listPosts(b.uid);
    const stats = await postStats(posts);
    const pick = pickWinner({ posts, stats, done: new Set(b.done ?? []), multiple: Number(b.multiple) || 3, delayDays: Number(b.delayDays) || 3, accounts: live.map((a) => a.id) });
    if ("reason" in pick) return NextResponse.json({ posted: null, message: pick.reason });

    const [jobId, file] = pick.externalId.split("/");
    const q = `uid=${encodeURIComponent(b.uid)}`;
    // Fresh wording, so the repost isn't a word-for-word duplicate. Falls back to the clip's saved text.
    const tr = await worker(`/jobs/${jobId}/clips/${file}/text`, { method: "POST", body: JSON.stringify({ uid: b.uid, fresh: true }), signal: AbortSignal.timeout(120_000) }).catch(() => null);
    const text = tr && tr.ok ? ((await tr.json()) as { text?: { youtube_title?: string; instagram?: string } }).text : undefined;
    const jr = await worker(`/jobs/${jobId}?${q}`).catch(() => null);
    const clip = jr && jr.ok ? ((await jr.json()) as { clips?: { file: string; title?: string }[] }).clips?.find((c) => c.file === file) : undefined;
    const title = (text?.youtube_title || clip?.title || "GTA 6 moment").slice(0, 100);
    const caption = (text?.instagram || `${title}\n\n#GTA6 #GTAVI #gaming #shorts`).slice(0, 2200);

    const fr = await worker(`/jobs/${jobId}/${file}?${q}&ttl=${7 * 86400}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    const videoUrl = fr && fr.ok ? ((await fr.json()) as { url?: string }).url : undefined;
    if (!videoUrl) return NextResponse.json({ posted: null, message: "The winning clip has expired from storage." });

    const chosen = live.filter((a) => pick.accounts.includes(a.id));
    await createPost({ uid: b.uid, externalId: pick.externalId, caption, title, videoUrl, accounts: chosen });
    return NextResponse.json({ posted: pick.externalId, title, message: `Reposted (${pick.views} views vs your usual ${pick.usual}).` }, { status: 201 });
  } catch (e) {
    console.error("[repost]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof SocialError ? e.message : "Repost failed." }, { status: 502 });
  }
}
