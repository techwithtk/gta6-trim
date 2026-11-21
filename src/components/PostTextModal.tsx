"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { fetchPostText, type PostText } from "@/lib/postText";

const FIELDS: { key: keyof PostText; label: string; color: string; rows: number }[] = [
  { key: "tiktok", label: "TikTok caption", color: "#25f4ee", rows: 3 },
  { key: "youtube_title", label: "YouTube Shorts title", color: "#ff0033", rows: 1 },
  { key: "youtube_description", label: "YouTube description", color: "#ff0033", rows: 3 },
  { key: "instagram", label: "Instagram caption", color: "#e1306c", rows: 4 },
  { key: "facebook", label: "Facebook caption", color: "#1877f2", rows: 3 },
];

/** AI titles, captions and hashtags for each platform, ready to copy. */
export function PostTextModal({ target, onClose }: { target: { jobId: string; file: string; title: string } | null; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose} title="Post text" width={620}>
      {target ? <Body key={`${target.jobId}/${target.file}`} jobId={target.jobId} file={target.file} title={target.title} /> : null}
    </Modal>
  );
}

function Body({ jobId, file, title }: { jobId: string; file: string; title: string }) {
  const [text, setText] = useState<PostText | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = (fresh: boolean) => {
    setBusy(true); setError(null);
    fetchPostText(jobId, file, fresh).then(setText).catch((e) => setError(e instanceof Error ? e.message : "Couldn't write the text.")).finally(() => setBusy(false));
  };
  useEffect(() => {
    let live = true;
    fetchPostText(jobId, file).then((t) => live && setText(t)).catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't write the text.")).finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [jobId, file]);

  const copy = async (k: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied((c) => (c === k ? null : c)), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
      <p className="text-sm text-muted">Written by AI for <span className="text-text">{title}</span>. Edit anything, then copy it into each app.</p>
      {error ? <p role="alert" className="border border-red/40 bg-red/[0.07] px-3 py-2 text-xs text-red">{error}</p> : null}
      {!text && busy ? (
        <div className="grid h-48 place-items-center text-sm text-subtle"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Writing titles and hashtags…</span></div>
      ) : text ? (
        <>
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <span className="size-2" style={{ background: f.color }} /> {f.label}
                <button type="button" onClick={() => copy(f.key, text[f.key])} className="ml-auto inline-flex items-center gap-1 normal-case tracking-normal text-text hover:text-pink">
                  {copied === f.key ? <><Check className="size-3.5 text-green" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
                </button>
              </span>
              <textarea value={text[f.key]} rows={f.rows} onChange={(e) => setText({ ...text, [f.key]: e.target.value })}
                className="w-full resize-y border border-white/20 bg-bg px-3 py-2 text-sm outline-none focus:border-pink" />
            </label>
          ))}
          <div className="flex justify-end">
            <button onClick={() => load(true)} disabled={busy} className="inline-flex h-9 items-center gap-2 border border-white/25 px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:border-pink disabled:opacity-40">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Write new versions
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
