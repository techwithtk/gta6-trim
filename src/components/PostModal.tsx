"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Send, CalendarClock } from "lucide-react";
import { Modal } from "@/components/Modal";
import type { Clip } from "@/lib/jobs";
import { addPost, PLATFORM_META, postFor, postLabel, type SocialAccount, type SocialPost } from "@/lib/social";
import type { SocialPlatform } from "@/lib/plans";

const ORDER: SocialPlatform[] = ["tiktok", "youtube", "instagram", "facebook"];
const PRIMARY =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-pink font-poster font-black uppercase text-black shadow-[3px_3px_0_#fafafa] transition-transform duration-150 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none";

const defaultCaption = (c: Clip) => `${c.title}\n\n#GTA6 #GTAVI #gaming #shorts`;
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Post (or schedule) one finished Short to the customer's connected accounts. */
export function PostModal({ target, accounts, posts, onClose }: { target: { jobId: string; clip: Clip } | null; accounts: SocialAccount[]; posts: SocialPost[]; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose} title="Post this Short" width={520}>
      {target ? <PostForm key={`${target.jobId}/${target.clip.file}`} jobId={target.jobId} clip={target.clip} accounts={accounts} posts={posts} onClose={onClose} /> : null}
    </Modal>
  );
}

function PostForm({ jobId, clip, accounts, posts, onClose }: { jobId: string; clip: Clip; accounts: SocialAccount[]; posts: SocialPost[]; onClose: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(accounts.filter((a) => a.active).map((a) => a.id)));
  const [caption, setCaption] = useState(() => defaultCaption(clip));
  const [title, setTitle] = useState(clip.title);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const [bounds, setBounds] = useState<{ min: string; max: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SocialPost | null>(null);

  const chosen = accounts.filter((a) => picked.has(a.id));
  const hasTikTok = chosen.some((a) => a.platform === "tiktok");
  const hasYouTube = chosen.some((a) => a.platform === "youtube");
  const prev = postFor(posts, jobId, clip.file);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (!accounts.length) {
    return (
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">Connect your TikTok, YouTube, Instagram or Facebook account first. It takes about 10 seconds: you log in on the platform&apos;s own page and come straight back.</p>
        <div className="flex justify-end"><Link href="/dashboard/integrations" className={`${PRIMARY} h-10 px-4 text-[17px]`}>Connect accounts</Link></div>
      </div>
    );
  }

  if (done) {
    const label = postLabel(done);
    return (
      <div className="space-y-4 p-5">
        <p className="flex items-center gap-2 text-sm"><Check className="size-4 text-green" /> {done.status === "scheduled" ? "Scheduled." : label.tone === "bad" ? "Some posts didn't go through." : "Sent. Links appear here as each platform finishes."}</p>
        <ul className="space-y-1.5 text-sm">
          {done.platforms.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-24 text-muted">{PLATFORM_META[p.platform as SocialPlatform]?.name ?? p.platform}</span>
              <span className={p.error ? "text-red" : "text-text"}>{p.error ? p.error : p.status}</span>
              {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs underline underline-offset-2">Open <ExternalLink className="size-3" /></a> : null}
            </li>
          ))}
        </ul>
        <div className="flex justify-end"><button onClick={onClose} className="h-10 border border-line-strong px-4 text-sm text-muted hover:text-text">Close</button></div>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const scheduledFor = when === "later" && at ? new Date(at).toISOString() : undefined;
      if (when === "later" && !scheduledFor) throw new Error("Pick a date and time.");
      const r = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, file: clip.file, caption, title, accountIds: [...picked], scheduledFor, consent }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't post.");
      const post = { ...(d.post as SocialPost), externalId: `${jobId}/${clip.file}` };
      addPost(post);
      setDone(post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post.");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
      {prev ? <p className="border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-muted">This clip was already sent ({postLabel(prev).text.toLowerCase()}). Posting again makes a second post.</p> : null}

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">Post to</legend>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {ORDER.flatMap((p) => accounts.filter((a) => a.platform === p)).map((a) => {
            const m = PLATFORM_META[a.platform];
            const on = picked.has(a.id);
            return (
              <li key={a.id}>
                <label className={`flex cursor-pointer items-center gap-2.5 border px-2.5 py-2 text-sm transition-colors duration-150 ${on ? "border-pink bg-pink/[0.06]" : "border-line hover:border-white/30"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="size-4 accent-[var(--pink)]" />
                  <span className="grid size-6 shrink-0 place-items-center text-[11px] font-bold text-white" style={{ background: m.color }}>{m.letter}</span>
                  <span className="min-w-0 flex-1 truncate">{a.displayName || a.username}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {hasYouTube ? (
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">YouTube title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} className="h-10 w-full border border-white/20 bg-bg px-3 text-sm outline-none focus:border-pink" />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1.5 flex justify-between font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">Caption <span className="num normal-case">{caption.length} / 2200</span></span>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 2200))} rows={4} className="w-full resize-y border border-white/20 bg-bg px-3 py-2 text-sm outline-none focus:border-pink" />
      </label>

      <div>
        <div className="flex border border-white/20" role="radiogroup" aria-label="When">
          {([["now", "Post now", Send], ["later", "Schedule", CalendarClock]] as const).map(([v, label, Icon]) => (
            <button key={v} role="radio" aria-checked={when === v} onClick={() => {
                setWhen(v);
                if (v === "later") {
                  const now = Date.now();
                  setBounds({ min: localInput(new Date(now + 5 * 60000)), max: localInput(new Date(now + 6 * 86400000)) });
                  if (!at) setAt(localInput(new Date(now + 3600_000)));
                }
              }}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${when === v ? "bg-white text-black" : "text-muted hover:text-text"}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        {when === "later" ? (
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} min={bounds?.min} max={bounds?.max}
            className="mt-2 h-10 w-full border border-white/20 bg-bg px-3 text-sm outline-none [color-scheme:dark] focus:border-pink" aria-label="Post at" />
        ) : null}
      </div>

      {hasTikTok ? (
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pink)]" />
          <span>By posting to TikTok, I agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline underline-offset-2">Music Usage Confirmation</a>. The video posts publicly.</span>
        </label>
      ) : null}

      {error ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="h-10 border border-line-strong px-4 text-sm text-muted hover:text-text">Cancel</button>
        <button onClick={submit} disabled={busy || !picked.size || (hasTikTok && !consent) || !caption.trim()} className={`${PRIMARY} h-10 px-4 text-[17px]`}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : when === "now" ? <Send className="size-4" /> : <CalendarClock className="size-4" />}
          {when === "now" ? `Post to ${picked.size}` : `Schedule ${picked.size}`}
        </button>
      </div>
    </div>
  );
}
