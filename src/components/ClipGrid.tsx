"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Play, Send, X } from "lucide-react";
import type { Clip } from "@/lib/jobs";
import { usePlan } from "@/lib/account";
import { postFor, postLabel, useSocial } from "@/lib/social";
import { PostModal } from "@/components/PostModal";

const fmtAt = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

/** Grid of finished 9:16 Shorts: play, score, length, download, and (on Studio) post to social media. */
export function ClipGrid({ jobId, clips, onPlay }: { jobId: string; clips: Clip[]; onPlay: (file: string) => void }) {
  const postable = usePlan().limits.autopost;
  const social = useSocial(postable);
  const [target, setTarget] = useState<Clip | null>(null);
  return (
    <>
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {clips.map((c) => (
        <li key={c.file} className="min-w-0">
          <button onClick={() => onPlay(c.file)} className="group relative block aspect-[9/16] w-full overflow-hidden border border-line bg-black transition-colors duration-150 hover:border-pink" aria-label={`Play ${c.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/import/${jobId}/${c.thumb}`} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
            <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100"><Play className="size-8 fill-white text-white" /></span>
            <span className="num absolute left-1.5 top-1.5 bg-pink px-1.5 text-[10.5px] font-bold text-black">★ {(c.score * 10).toFixed(1)}</span>
            {typeof c.at === "number" ? <span className="num absolute right-1.5 top-1.5 bg-black/75 px-1 text-[10px]">at {fmtAt(c.at)}</span> : null}
            <span className="num absolute bottom-1.5 right-1.5 bg-black/75 px-1 text-[10.5px]">0:{String(c.length).padStart(2, "0")}</span>
          </button>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-muted" title={c.reason}>{c.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={`/api/import/${jobId}/${c.file}?download=1`} className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-text underline-offset-2 hover:text-pink hover:underline">
              <Download className="size-3" /> Download
            </a>
            {postable ? (
              <button onClick={() => setTarget(c)} className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-pink underline-offset-2 hover:underline">
                <Send className="size-3" /> Post
              </button>
            ) : null}
          </div>
          {postable ? <PostStatus post={postFor(social.posts, jobId, c.file)} /> : null}
        </li>
      ))}
    </ul>
    {postable ? <PostModal target={target ? { jobId, clip: target } : null} accounts={social.accounts} posts={social.posts} onClose={() => setTarget(null)} /> : null}
    </>
  );
}

function PostStatus({ post }: { post?: ReturnType<typeof postFor> }) {
  if (!post) return null;
  const l = postLabel(post);
  const links = post.platforms.filter((p) => p.url);
  return (
    <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${l.tone === "ok" ? "text-green" : l.tone === "bad" ? "text-red" : "text-subtle"}`}>
      {l.text}
      {links.map((p, i) => <a key={i} href={p.url} target="_blank" rel="noreferrer" className="ml-1.5 normal-case text-muted underline underline-offset-2 hover:text-text">{p.platform}</a>)}
    </p>
  );
}

/** Full-screen 9:16 player with a download button. */
export function ClipPlayer({ playing, onClose }: { playing: { job: string; file: string } | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {playing ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={onClose}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <video src={`/api/import/${playing.job}/${playing.file}`} controls autoPlay playsInline className="max-h-[80vh] border-2 border-white/85 bg-black" style={{ aspectRatio: "9 / 16" }} />
            <div className="mt-3 flex justify-center">
              <a href={`/api/import/${playing.job}/${playing.file}?download=1`} className="inline-flex h-10 items-center gap-2 border-2 border-black bg-pink px-4 font-poster text-[17px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa]">
                <Download className="size-4" strokeWidth={2.5} /> Download
              </a>
            </div>
            <button onClick={onClose} aria-label="Close" className="absolute -right-3 -top-3 grid size-8 place-items-center rounded-full bg-white text-black"><X className="size-4" /></button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
