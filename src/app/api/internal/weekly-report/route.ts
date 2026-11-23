import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { activeSub, fromWorker } from "@/lib/autopost-server";
import { listPosts, postStats, socialConfigured } from "@/lib/bundle";
import { emailConfigured, sendEmail } from "@/lib/email";
import { planById } from "@/lib/plans";
import { weeklyEmail, weeklySubject, type WeeklyData } from "@/lib/weekly-report";
import { worker } from "@/lib/worker";

export const maxDuration = 300;

const SITE = "https://gta6trim.com";
const WEEK = 7 * 86400;
type J = { id: string; kind?: string; status?: string; createdAt?: number; clips?: { file: string; title?: string; score?: number }[] };

/** Gather one customer's last 7 days. Returns null when they have no active plan (no email then). */
async function dataFor(uid: string): Promise<{ to: string; d: WeeklyData } | null> {
  const sub = await activeSub(uid);
  if (!sub) return null;
  const plan = planById(sub.plan);
  const user = await (await clerkClient()).users.getUser(uid);
  const to = (user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0])?.emailAddress;
  if (!to) return null;

  const since = Date.now() / 1000 - WEEK;
  const res = await worker(`/jobs?uid=${encodeURIComponent(uid)}`).catch(() => null);
  const jobs = (res && res.ok ? ((await res.json()) as J[]) : []).filter((j) => (j.createdAt ?? 0) >= since && j.status !== "error");
  const clips = jobs.flatMap((j) => (j.clips ?? []).map((c) => ({ ...c, jobId: j.id })));

  const d: WeeklyData = {
    name: user.firstName || user.fullName || user.username || to.split("@")[0],
    planName: plan.name,
    posting: plan.limits.autopost,
    clips: clips.length,
    videos: jobs.filter((j) => j.kind !== "live").length,
    liveSessions: jobs.filter((j) => j.kind === "live").length,
    posts: 0, views: 0, likes: 0,
    site: SITE,
  };

  if (plan.limits.autopost && socialConfigured()) {
    try {
      const posts = (await listPosts(uid)).filter((p) => Date.parse(p.createdAt ?? "") >= since * 1000);
      const stats = await postStats(posts);
      const byClip = new Map<string, number>();
      for (const p of posts) for (const x of p.platforms) {
        if (x.status !== "published") continue;
        d.posts++;
        const st = x.postId ? stats[`${x.postId}~${x.platform}`] : undefined;
        if (st) {
          d.views += st.views; d.likes += st.likes;
          if (p.externalId) byClip.set(p.externalId, (byClip.get(p.externalId) ?? 0) + st.views);
        }
      }
      const best = [...byClip].sort((a, z) => z[1] - a[1])[0];
      if (best && best[1] > 0) {
        const [jobId, file] = best[0].split("/");
        const c = clips.find((x) => x.jobId === jobId && x.file === file);
        if (c?.title) d.top = { title: c.title, views: best[1] };
      }
    } catch (e) {
      console.error("[weekly-report] stats", e instanceof Error ? e.message : e);
    }
  }
  if (!d.top) {
    const best = [...clips].sort((a, z) => (z.score ?? 0) - (a.score ?? 0))[0];
    if (best?.title) d.top = { title: best.title, score: best.score };
  }
  return { to, d };
}

/**
 * Called by the worker every Monday with the customers active in the last week: {uids: string[]}.
 * Sends each one a summary email. ?dry=1 returns the first customer's rendered email instead of sending (still worker-only).
 */
export async function POST(req: NextRequest) {
  if (!fromWorker(req.headers.get("x-worker-secret"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { uids?: string[] };
  const uids = [...new Set((b.uids ?? []).filter((u) => typeof u === "string" && u))].slice(0, 500);
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  if (dry) {
    for (const uid of uids) {
      const r = await dataFor(uid).catch(() => null);
      if (r) return new NextResponse(weeklyEmail(r.d).html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return NextResponse.json({ error: "No customer with an active plan in that list." }, { status: 404 });
  }
  if (!emailConfigured()) return NextResponse.json({ skipped: "no key", uids: uids.length });

  let sent = 0, skipped = 0, failed = 0;
  for (const uid of uids) { // one at a time: gentle on Clerk, Dodo, bundle.social and the email service
    try {
      const r = await dataFor(uid);
      if (!r) { skipped++; continue; }
      const { html, text } = weeklyEmail(r.d);
      const res = await sendEmail({ to: r.to, subject: weeklySubject(r.d), html, text });
      if (res.ok) sent++;
      else { failed++; console.error("[weekly-report] send", res.error); }
    } catch (e) {
      failed++;
      console.error("[weekly-report]", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ sent, skipped, failed });
}
