/** Shorts templates for YouTube and uploaded videos (live clipping keeps the automatic layout). Keep ids in sync with worker/templates.py. */
export const TEMPLATES = [
  { id: "auto", name: "Auto", desc: "Finds the speaker's camera and stacks it over the action" },
  { id: "full", name: "Full screen", desc: "The centre of the video fills the whole screen" },
  { id: "blur", name: "Blur fit", desc: "The whole picture, over a blurred copy of itself" },
  { id: "headline", name: "Headline", desc: "Bold headline on top, video in the middle, captions below" },
  { id: "meme", name: "Meme", desc: "White screen, meme-style text above the video" },
  { id: "cinematic", name: "Cinematic", desc: "Video in the middle on black, captions below, no extra text" },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const isTemplate = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);
