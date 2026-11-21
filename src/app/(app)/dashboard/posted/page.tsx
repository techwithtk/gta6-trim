"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarClock, Check, ExternalLink, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { usePlan } from "@/lib/account";
import { useJobs, type Clip } from "@/lib/jobs";
import { PLATFORM_META, refreshPosts, useSocial, type SocialPost } from "@/lib/social";
import { quickReason } from "@/lib/postErrors";
import { PostModal } from "@/components/PostModal";
import type { SocialPlatform } from "@/lib/plans";

const ORDER: SocialPlatform[] = ["tiktok", "youtube", "instagram", "facebook"];
type Status = "published" | "scheduled" | "publishing" | "failed";
type Filter = "all" | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" }, { id: "published", label: "Posted" }, { id: "scheduled", label: "Scheduled" }, { id: "failed", label: "Failed" },
];
const norm = (s: string): Status => (s === "published" || s === "scheduled" || s === "failed" ? s : "publishing");
const STATUS_STYLE: Record<Status, string> = {
  published: "bg-green/15 text-green", scheduled: "bg-white/10 text-text", publishing: "bg-white/10 text-muted", failed: "bg-red/15 text-red",
};
const STATUS_LABEL: Record<Status, string> = { published: "Posted", scheduled: "Scheduled", publishing: "Posting…", failed: "Failed" };
const fmtWhen = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

/** Every Short sent to social media: counts per platform, status per account, and why a post failed. */
export default function PostedPage() {
  const plan = usePlan();
  const studio = plan.limits.autopost;
  const social = useSocial(studio);
  const { jobs } = useJobs();
  const [filter, setFilter] = useState<Filter>("all");
  const [platform, setPlatform] = useState<SocialPlatform | "all">("all");
  const [retry, setRetry] = useState<{ jobId: string; clip: Clip } | null>(null);

  const clips = useMemo(() => {
    const m = new Map<string, { jobId: string; clip: Clip }>();
    for (const j of jobs) for (const c of j.clips ?? []) m.set(`${j.id}/${c.file}`, { jobId: j.id, clip: c });
    return m;
  }, [jobs]);
  const accountName = (id?: string) => social.accounts.find((a) => a.id === id)?.displayName;

  const counts = useMemo(() => {
    const out = Object.fromEntries(ORDER.map((p) => [p, { published: 0, scheduled: 0, publishing: 0, failed: 0 }])) as Record<SocialPlatform, Record<Status, number>>;
    for (const p of social.posts) for (const x of p.platforms) if (out[x.platform as SocialPlatform]) out[x.platform as SocialPlatform][norm(x.status)]++;
    return out;
  }, [social.posts]);
  const totalPosted = ORDER.reduce((n, p) => n + counts[p].published, 0);
  const totalFailed = ORDER.reduce((n, p) => n + counts[p].failed, 0);
  const clipsPosted = new Set(social.posts.filter((p) => p.platforms.some((x) => norm(x.status) === "published")).map((p) => p.externalId)).size;

  const visible = social.posts.filter((p) => {
    const parts = p.platforms.filter((x) => platform === "all" || x.platform === platform);
    return parts.length && (filter === "all" || parts.some((x) => norm(x.status) === filter));
  });

  if (!studio) {
    return (
      <>
        <Header />
        <div className="border-2 border-white/85 bg-surface p-6 shadow-[6px_6px_0_var(--pink)]">
          <h2 className="font-poster text-[26px] font-black uppercase leading-none">Posting is on Studio</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">Post and schedule Shorts to TikTok, YouTube, Instagram and Facebook from here, see every post in one place, and get a plain-English reason when one fails.</p>
          <Link href="/dashboard/billing" className="mt-4 inline-flex h-10 items-center border-2 border-black bg-pink px-4 font-poster text-[17px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa]">See Studio</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header right={
        <button onClick={() => refreshPosts()} className="inline-flex h-9 items-center gap-2 border border-white/25 px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:border-pink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      } />

      {/* Totals */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat n={clipsPosted} label="clips posted" />
        <Stat n={totalPosted} label="posts live across platforms" />
        <Stat n={totalFailed} label="failed posts" bad={totalFailed > 0} />
      </div>

      {/* Per platform */}
      <ul className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((p) => {
          const m = PLATFORM_META[p], c = counts[p];
          return (
            <li key={p}>
              <button onClick={() => setPlatform(platform === p ? "all" : p)}
                className={`w-full border bg-surface p-4 text-left transition-colors duration-150 ${platform === p ? "border-pink" : "border-line hover:border-white/30"}`}>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center text-[12px] font-bold text-white" style={{ background: m.color }}>{m.letter}</span>
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <div className="mt-3 flex items-end gap-4">
                  <span><span className="num block font-poster text-[30px] font-black leading-none">{c.published}</span><span className="font-mono text-[10px] uppercase tracking-wider text-subtle">posted</span></span>
                  <span><span className="num block font-poster text-[20px] font-black leading-none text-muted">{c.scheduled + c.publishing}</span><span className="font-mono text-[10px] uppercase tracking-wider text-subtle">waiting</span></span>
                  <span><span className={`num block font-poster text-[20px] font-black leading-none ${c.failed ? "text-red" : "text-muted"}`}>{c.failed}</span><span className="font-mono text-[10px] uppercase tracking-wider text-subtle">failed</span></span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-poster text-[28px] font-black uppercase leading-none">Every post</h2>
        <div role="tablist" className="flex border border-white/20">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={`h-8 px-3 font-mono text-[11px] font-bold uppercase tracking-wider ${filter === f.id ? "bg-white text-black" : "text-muted hover:text-text"}`}>{f.label}</button>
          ))}
        </div>
        {platform !== "all" ? <button onClick={() => setPlatform("all")} className="font-mono text-[11px] uppercase tracking-wider text-pink hover:underline">{PLATFORM_META[platform].name} only · clear</button> : null}
        <span className="h-px flex-1 bg-line" />
      </div>

      {!social.ready ? (
        <div className="h-40 animate-pulse bg-surface" />
      ) : social.error ? (
        <p className="flex items-center gap-2 border border-red/40 bg-red/[0.07] px-4 py-3 text-sm text-red"><AlertCircle className="size-4" /> {social.error}</p>
      ) : !social.posts.length ? (
        <div className="border border-line bg-surface p-6 text-sm text-muted">
          Nothing posted yet. Press <span className="text-text">Post</span> under any clip on <Link href="/dashboard" className="text-text underline underline-offset-2">Make clips</Link>, or turn on auto-post when you start a <Link href="/dashboard/live" className="text-text underline underline-offset-2">live session</Link>.
        </div>
      ) : !visible.length ? (
        <p className="border border-line bg-surface p-6 text-sm text-subtle">No posts match this filter.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((p) => (
            <PostRow key={p.id} post={p} info={p.externalId ? clips.get(p.externalId) : undefined} platform={platform} accountName={accountName}
              onRetry={(x) => setRetry(x)} />
          ))}
        </ul>
      )}

      <PostModal target={retry} accounts={social.accounts} posts={social.posts} onClose={() => { setRetry(null); refreshPosts(); }} />
    </>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Your social media</p>
        <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">Posted <span className="text-pink">clips.</span></h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Which clips went out, where, and how many. If a post fails, you&apos;ll see why and how to fix it.</p>
      </div>
      {right}
    </div>
  );
}

function Stat({ n, label, bad }: { n: number; label: string; bad?: boolean }) {
  return (
    <div className="border border-line bg-surface px-4 py-3">
      <span className={`num block font-poster text-[36px] font-black leading-none ${bad ? "text-red" : ""}`}>{n}</span>
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">{label}</span>
    </div>
  );
}

function PostRow({ post, info, platform, accountName, onRetry }: {
  post: SocialPost; info?: { jobId: string; clip: Clip }; platform: SocialPlatform | "all";
  accountName: (id?: string) => string | undefined; onRetry: (x: { jobId: string; clip: Clip }) => void;
}) {
  const parts = post.platforms.filter((x) => platform === "all" || x.platform === platform);
  const failed = parts.some((x) => norm(x.status) === "failed");
  const [jobId, file] = (post.externalId ?? "/").split("/");
  return (
    <li className={`border bg-surface p-4 ${failed ? "border-red/40" : "border-line"}`}>
      <div className="flex gap-4">
        <div className="w-16 shrink-0">
          <div className="aspect-[9/16] overflow-hidden border border-line bg-black">
            {info ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/import/${jobId}/${info.clip.thumb}${info.clip.v ? `?v=${info.clip.v}` : ""}`} alt="" className="size-full object-cover" />
            ) : null}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[15px] font-medium">{info?.clip.title ?? file ?? "Clip"}</span>
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider text-subtle">
              {post.status === "scheduled" ? <><CalendarClock className="size-3" /> for {fmtWhen(post.scheduledFor)}</> : <><Send className="size-3" /> {fmtWhen(post.createdAt)}</>}
            </span>
            {failed && info ? (
              <button onClick={() => onRetry(info)} className="ml-auto inline-flex items-center gap-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-pink hover:underline">
                <RefreshCw className="size-3" /> Post again
              </button>
            ) : null}
          </div>
          <ul className="mt-2.5 space-y-2">
            {parts.map((x, i) => <PlatformLine key={i} part={x} name={accountName(x.accountId)} />)}
          </ul>
        </div>
      </div>
    </li>
  );
}

function PlatformLine({ part, name }: { part: SocialPost["platforms"][number]; name?: string }) {
  const s = norm(part.status);
  const m = PLATFORM_META[part.platform as SocialPlatform];
  const quick = s === "failed" ? quickReason(part.error) : null;
  const [ai, setAi] = useState<{ reason: string; fix: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const explain = async () => {
    setBusy(true); setAiError(null);
    try {
      const r = await fetch("/api/social/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ platform: m?.name ?? part.platform, error: part.error }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't explain this.");
      setAi(d);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Couldn't explain this.");
    } finally { setBusy(false); }
  };
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="grid size-5 shrink-0 place-items-center text-[10px] font-bold text-white" style={{ background: m?.color ?? "#555" }}>{m?.letter ?? "?"}</span>
        <span className="text-muted">{name ?? m?.name ?? part.platform}</span>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${STATUS_STYLE[s]}`}>
          {s === "published" ? <Check className="size-3" /> : s === "failed" ? <AlertCircle className="size-3" /> : s === "publishing" ? <Loader2 className="size-3 animate-spin" /> : null}
          {STATUS_LABEL[s]}
        </span>
        {part.url ? <a href={part.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2 hover:text-pink">Open <ExternalLink className="size-3" /></a> : null}
      </div>
      {s === "failed" ? (
        <div className="ml-7 mt-1.5 border-l-2 border-red/50 pl-3 text-xs">
          {ai ? (
            <>
              <p className="text-text"><span className="text-subtle">Why: </span>{ai.reason}</p>
              <p className="mt-0.5 text-text"><span className="text-subtle">Fix: </span>{ai.fix}</p>
            </>
          ) : quick ? (
            <>
              <p className="text-text"><span className="text-subtle">Why: </span>{quick.reason}</p>
              <p className="mt-0.5 text-text"><span className="text-subtle">Fix: </span>{quick.fix}</p>
            </>
          ) : (
            <p className="text-text">{part.error ? "The platform rejected this post." : "The platform didn't say why."}</p>
          )}
          {part.error ? <p className="mt-1 break-words font-mono text-[10.5px] text-subtle">Platform said: {part.error.slice(0, 300)}</p> : null}
          {part.error && !ai ? (
            <button onClick={explain} disabled={busy} className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-pink hover:underline disabled:opacity-50">
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Explain with AI
            </button>
          ) : null}
          {aiError ? <p className="mt-1 text-red">{aiError}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
