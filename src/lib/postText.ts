"use client";

export type PostText = { tiktok: string; youtube_title: string; youtube_description: string; instagram: string; facebook: string };

/** AI-written post text for a clip (cached on the clip by the worker; fresh=true writes a new set). */
export async function fetchPostText(jobId: string, file: string, fresh = false): Promise<PostText> {
  const r = await fetch(`/api/clips/${jobId}/${file}/text`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fresh }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.text) throw new Error(d.error ?? "Couldn't write the text.");
  return d.text as PostText;
}
