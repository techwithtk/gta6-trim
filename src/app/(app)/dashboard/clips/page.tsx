"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Film, HardDriveUpload, Hash, Radio, Scissors, Search, Send, Upload } from "lucide-react";
import { usePlan } from "@/lib/account";
import { useJobs, type Job } from "@/lib/jobs";
import { postFor, useSocial } from "@/lib/social";
import { useDrive } from "@/lib/drive";
import { ClipGrid, ClipPlayer } from "@/components/ClipGrid";

type Source = "all" | "live" | "video";
type State = "all" | "new" | "posted";
type Sort = "newest" | "best";
const SOURCES: { id: Source; label: string }[] = [{ id: "all", label: "All" }, { id: "live", label: "Live" }, { id: "video", label: "Videos" }];

export default function ClipsPage() {
  return <Suspense fallback={<div className="h-64 animate-pulse bg-surface" />}><Clips /></Suspense>;
}

/** Every finished Short in one place (live sessions and videos), with what you can do next: watch, edit, post, save, download. */
function Clips() {
  const plan = usePlan();
  const studio = plan.limits.autopost;
  const social = useSocial(studio);
  const drive = useDrive();
  const { jobs, ready } = useJobs();
  const params = useSearchParams();
  const only = params.get("job");
  const [source, setSource] = useState<Source>("all");
  const [state, setState] = useState<State>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<{ job: string; file: string } | null>(null);

  const withClips = jobs.filter((j) => j.clips?.length && (j.kind === "live" || j.status === "done"));
  const total = withClips.reduce((n, j) => n + j.clips.length, 0);
  const posted = studio ? withClips.reduce((n, j) => n + j.clips.filter((c) => postFor(social.posts, j.id, c.file)).length, 0) : 0;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return withClips
      .filter((j) => (!only || j.id === only) && (source === "all" || (source === "live") === (j.kind === "live")))
      .map((j) => {
        let clips = j.clips.filter((c) => !needle || c.title.toLowerCase().includes(needle) || (j.channel || j.title || "").toLowerCase().includes(needle));
        if (studio && state !== "all") clips = clips.filter((c) => !!postFor(social.posts, j.id, c.file) === (state === "posted"));
        clips = sort === "best" ? [...clips].sort((a, z) => z.score - a.score) : j.kind === "live" ? [...clips].reverse() : clips;
        return { j, clips };
      })
      .filter((g) => g.clips.length)
      .sort((a, z) => (sort === "best" ? Math.max(...z.clips.map((c) => c.score)) - Math.max(...a.clips.map((c) => c.score)) : z.j.createdAt - a.j.createdAt));
  }, [withClips, only, source, state, sort, q, studio, social.posts]);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Everything you&apos;ve clipped</p>
          <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">My <span className="text-pink">clips.</span></h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Every Short from your live sessions and videos. Pick one and choose what&apos;s next.</p>
        </div>
        <div className="flex gap-6 font-mono text-[11px] uppercase tracking-wider text-subtle">
          <span><span className="num block font-poster text-[28px] font-black leading-none text-text">{total}</span>clips</span>
          {studio ? <span><span className="num block font-poster text-[28px] font-black leading-none text-text">{total - posted}</span>not posted yet</span> : null}
        </div>
      </div>

      {/* What you can do with a clip */}
      <ul className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <NextStep icon={Film} title="Watch" text="Click a clip to play it." />
        <NextStep icon={Scissors} title="Edit" text="Trim, fix captions, hook, stickers." />
        <NextStep icon={Hash} title="Post text" text={plan.id === "starter" ? "AI titles & hashtags on Pro." : "AI titles & hashtags to copy."} />
        <NextStep icon={Send} title="Post" text={studio ? "Post or schedule to your accounts." : "Auto-post is on Studio."} href={studio ? undefined : "/dashboard/billing"} />
        <NextStep icon={drive.connected ? HardDriveUpload : Download} title={drive.connected ? "Save to Drive" : "Download"} text={drive.connected ? "Saves into a “GTA6 Trim” folder." : "Or connect Google Drive."} href={drive.connected ? undefined : "/dashboard/integrations"} />
      </ul>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Source" className="flex border border-white/20">
          {SOURCES.map((s) => (
            <button key={s.id} role="tab" aria-selected={source === s.id} onClick={() => setSource(s.id)}
              className={`h-8 px-3 font-mono text-[11px] font-bold uppercase tracking-wider ${source === s.id ? "bg-white text-black" : "text-muted hover:text-text"}`}>{s.label}</button>
          ))}
        </div>
        {studio ? (
          <div role="tablist" aria-label="Posted" className="flex border border-white/20">
            {([["all", "Any"], ["new", "Not posted"], ["posted", "Posted"]] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={state === id} onClick={() => setState(id)}
                className={`h-8 px-3 font-mono text-[11px] font-bold uppercase tracking-wider ${state === id ? "bg-white text-black" : "text-muted hover:text-text"}`}>{label}</button>
            ))}
          </div>
        ) : null}
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
          className="h-8 border border-white/20 bg-bg px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-text outline-none focus:border-pink">
          <option value="newest">Newest first</option>
          <option value="best">Best score first</option>
        </select>
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles or streamers" aria-label="Search clips"
            className="h-8 w-full border border-white/20 bg-bg pl-8 pr-3 text-sm outline-none placeholder:text-subtle focus:border-pink" />
        </label>
        {only ? <Link href="/dashboard/clips" className="font-mono text-[11px] uppercase tracking-wider text-pink hover:underline">Showing one session · show all</Link> : null}
      </div>

      {!ready ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse bg-surface" />)}</div>
      ) : !total ? (
        <div className="border-2 border-white/85 bg-surface p-6 shadow-[6px_6px_0_var(--pink)]">
          <h2 className="font-poster text-[26px] font-black uppercase leading-none">No clips yet</h2>
          <p className="mt-2 text-sm text-muted">Start a <Link href="/dashboard/live" className="text-text underline underline-offset-2">live session</Link> or <Link href="/dashboard" className="text-text underline underline-offset-2">clip a video</Link>. Finished Shorts show up here.</p>
        </div>
      ) : !groups.length ? (
        <p className="border border-line bg-surface p-6 text-sm text-subtle">No clips match these filters.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ j, clips }) => <Group key={j.id} j={j} clips={clips} onPlay={(file) => setPlaying({ job: j.id, file })} />)}
        </div>
      )}

      <ClipPlayer playing={playing} onClose={() => setPlaying(null)} />
    </>
  );
}

function NextStep({ icon: Icon, title, text, href }: { icon: typeof Film; title: string; text: string; href?: string }) {
  const body = (
    <>
      <Icon className="size-4 shrink-0 text-pink" />
      <span className="min-w-0"><span className="block font-mono text-[11px] font-bold uppercase tracking-wider">{title}</span><span className="block text-xs text-muted">{text}</span></span>
    </>
  );
  return (
    <li>
      {href ? <Link href={href} className="flex h-full items-start gap-2.5 border border-line bg-surface px-3 py-2.5 hover:border-white/30">{body}</Link>
        : <div className="flex h-full items-start gap-2.5 border border-line bg-surface px-3 py-2.5">{body}</div>}
    </li>
  );
}

function Group({ j, clips, onPlay }: { j: Job; clips: Job["clips"]; onPlay: (file: string) => void }) {
  const live = j.kind === "live";
  const when = new Date(j.createdAt * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {live ? <Radio className="size-4 text-pink" /> : <Upload className="size-4 text-muted" />}
        <h2 className="text-[15px] font-medium">{live ? j.channel || j.login : j.title}</h2>
        {live ? <span className="font-mono text-[10px] font-bold uppercase" style={{ color: j.platform === "kick" ? "#53fc18" : "#a970ff" }}>{j.platform === "kick" ? "Kick" : "Twitch"}</span> : null}
        {live && j.status === "recording" ? <span className="inline-flex items-center gap-1 bg-pink px-1.5 font-mono text-[10px] font-bold uppercase text-black"><span className="size-1.5 animate-pulse rounded-full bg-black" /> Live now</span> : null}
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">{when} · {clips.length} clip{clips.length === 1 ? "" : "s"}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <ClipGrid jobId={j.id} clips={clips} onPlay={onPlay} />
    </section>
  );
}
