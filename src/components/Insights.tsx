"use client";

import { useMemo } from "react";
import { Clock, Eye, Lightbulb, Ruler, Trophy, User, Zap } from "lucide-react";
import type { Clip, Job } from "@/lib/jobs";
import { compact, PLATFORM_META, statFor, type PostStats, type SocialPost } from "@/lib/social";
import type { SocialPlatform } from "@/lib/plans";

/** One published post on one platform, with its numbers and what we know about the clip. */
type Row = { views: number; likes: number; platform: SocialPlatform; at: Date; streamer?: string; length?: number; hook: boolean; clip?: Clip; jobId?: string; key: string };

const MIN_ROWS = 4;      // below this, any "pattern" is noise
const MIN_GROUP = 2;     // a group needs at least this many posts to be compared

const WINDOWS: { id: string; label: string; from: number; to: number }[] = [
  { id: "morning", label: "Morning (6am–12pm)", from: 6, to: 12 },
  { id: "afternoon", label: "Afternoon (12–5pm)", from: 12, to: 17 },
  { id: "evening", label: "Evening (5–10pm)", from: 17, to: 22 },
  { id: "night", label: "Late night (10pm–6am)", from: 22, to: 30 },
];
const windowOf = (d: Date) => { const h = d.getHours() < 6 ? d.getHours() + 24 : d.getHours(); return WINDOWS.find((w) => h >= w.from && h < w.to)!; };
const lengthOf = (s: number) => (s < 20 ? "Under 20s" : s < 35 ? "20–35s" : s < 50 ? "35–50s" : "50s+");

type Finding = { icon: typeof Eye; title: string; best: string; detail: string; lift: number };

/** Average views per post for each group; the best group if it beats the rest by a real margin. */
function compare(rows: Row[], keyOf: (r: Row) => string | undefined, title: string, icon: typeof Eye, fmt: (k: string) => string = (k) => k): Finding | null {
  const groups = new Map<string, number[]>();
  for (const r of rows) { const k = keyOf(r); if (k) groups.set(k, [...(groups.get(k) ?? []), r.views]); }
  const avg = [...groups].filter(([, v]) => v.length >= MIN_GROUP).map(([k, v]) => ({ k, n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length }));
  if (avg.length < 2) return null;
  avg.sort((a, z) => z.avg - a.avg);
  const [best, ...rest] = avg;
  const others = rest.reduce((a, g) => a + g.avg * g.n, 0) / rest.reduce((a, g) => a + g.n, 0);
  const lift = others > 0 ? best.avg / others : best.avg > 0 ? 9 : 1;
  if (lift < 1.15) return null;
  return { icon, title, best: fmt(best.k), lift, detail: `${compact(Math.round(best.avg))} views per post on average${others > 0 ? `, ${lift >= 9 ? "far" : `${lift.toFixed(1)}×`} more than the rest` : ""} (${best.n} posts).` };
}

export function Insights({ posts, stats, jobs }: { posts: SocialPost[]; stats: Record<string, PostStats>; jobs: Job[] }) {
  const rows = useMemo(() => {
    const clips = new Map<string, { job: Job; clip: Clip }>();
    for (const j of jobs) for (const c of j.clips ?? []) clips.set(`${j.id}/${c.file}`, { job: j, clip: c });
    const out: Row[] = [];
    for (const p of posts) for (const x of p.platforms) {
      const st = statFor(stats, x.postId, x.platform);
      if (!st || x.status !== "published") continue;
      const info = p.externalId ? clips.get(p.externalId) : undefined;
      const at = new Date(p.scheduledFor || p.createdAt || 0);
      out.push({
        views: st.views, likes: st.likes, platform: x.platform as SocialPlatform, at, key: `${p.id}~${x.platform}`,
        streamer: info ? (info.job.kind === "live" ? info.job.channel || info.job.login : info.job.channel) || undefined : undefined,
        length: info?.clip.length, hook: !!info?.clip.hook, clip: info?.clip, jobId: info?.job.id,
      });
    }
    return out;
  }, [posts, stats, jobs]);

  const findings = useMemo(() => {
    if (rows.length < MIN_ROWS) return [];
    return [
      compare(rows, (r) => windowOf(r.at).id, "Best time to post", Clock, (k) => WINDOWS.find((w) => w.id === k)!.label),
      compare(rows, (r) => r.streamer, "Best streamer", User),
      compare(rows, (r) => r.platform, "Best platform", Zap, (k) => PLATFORM_META[k as SocialPlatform]?.name ?? k),
      compare(rows, (r) => (r.length ? lengthOf(r.length) : undefined), "Best clip length", Ruler),
      compare(rows, (r) => (r.clip ? (r.hook ? "With an opening hook" : "Without a hook") : undefined), "Hooks", Lightbulb),
    ].filter((f): f is Finding => !!f).sort((a, z) => z.lift - a.lift);
  }, [rows]);

  const top = useMemo(() => {
    const byClip = new Map<string, { views: number; row: Row }>();
    for (const r of rows) {
      if (!r.clip || !r.jobId) continue;
      const k = `${r.jobId}/${r.clip.file}`;
      const cur = byClip.get(k);
      byClip.set(k, { views: (cur?.views ?? 0) + r.views, row: cur?.row ?? r });
    }
    return [...byClip.values()].sort((a, z) => z.views - a.views).slice(0, 3).filter((t) => t.views > 0);
  }, [rows]);

  const time = findings.find((f) => f.title === "Best time to post");

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-poster text-[28px] font-black uppercase leading-none">What <span className="text-pink">works</span></h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      {rows.length < MIN_ROWS ? (
        <div className="border border-line bg-surface p-5 text-sm text-muted">
          <p className="text-text">Insights unlock after {MIN_ROWS} posts have views.</p>
          <p className="mt-1">You have {rows.length} so far. Then you&apos;ll see your best time to post, best streamer, best platform and best clip length here.</p>
        </div>
      ) : (
        <>
          {time ? (
            <p className="mb-3 flex items-start gap-2 border-l-2 border-pink bg-pink/[0.07] px-4 py-3 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-pink" />
              <span><span className="font-medium">Next step:</span> schedule your next posts in the <span className="font-medium">{time.best.toLowerCase()}</span>. That&apos;s when your clips get the most views.</span>
            </p>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            {findings.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {findings.slice(0, 4).map((f) => (
                  <li key={f.title} className="border border-line bg-surface p-4">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-subtle"><f.icon className="size-3.5 text-pink" /> {f.title}</div>
                    <p className="mt-2 text-[17px] font-medium leading-tight">{f.best}</p>
                    <p className="mt-1 text-xs text-muted">{f.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-line bg-surface p-5 text-sm text-muted">No clear pattern yet: your posts perform about the same across times, streamers and platforms. Keep posting and this fills in.</div>
            )}

            {top.length ? (
              <div className="border border-line bg-surface p-4">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-subtle"><Trophy className="size-3.5 text-pink" /> Top clips</div>
                <ol className="space-y-3">
                  {top.map(({ views, row }, i) => (
                    <li key={row.key} className="flex items-center gap-3">
                      <span className="w-4 font-poster text-[20px] font-black text-muted">{i + 1}</span>
                      <div className="aspect-[9/16] w-9 shrink-0 overflow-hidden border border-line bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/import/${row.jobId}/${row.clip!.thumb}${row.clip!.v ? `?v=${row.clip!.v}` : ""}`} alt="" className="size-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{row.clip!.title}</p>
                        <p className="font-mono text-[11px] text-subtle"><Eye className="mr-1 inline size-3" />{compact(views)} views{row.streamer ? ` · ${row.streamer}` : ""}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
