// Single source of truth for pricing tiers and feature limits.
// UI gating (account slots, live sessions, imports, caption styles, storage) reads from here.

export type PlanId = "starter" | "pro" | "studio";
export type SocialPlatform = "instagram" | "facebook" | "youtube" | "tiktok";
export type StorageProvider = "gdrive" | "dropbox" | "onedrive" | "box";

/** Hard product rule: never more than 3 accounts per social platform. Auto-posting is a Studio (and Enterprise) feature only. */
export const MAX_ACCOUNTS_PER_PLATFORM = 3;

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  monthly: number; // USD
  yearly: number; // USD per month, billed yearly
  highlight?: boolean;
  limits: {
    liveSessions: number; // streams clipped at the same time
    ytImports: number; // YouTube long-form links per month
    ytMaxMinutes: number; // max length per imported video
    clips: number; // clips per month
    autopost: boolean; // can connect social accounts and post/schedule from GTA6 Trim
    accountsPerPlatform: number; // ≤ MAX_ACCOUNTS_PER_PLATFORM, 0 when autopost is off
    storage: StorageProvider[];
    captionStyles: number; // number of caption presets unlocked
    seats: number;
  };
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For new clippers getting their first pages growing.",
    monthly: 49,
    yearly: 39,
    limits: { liveSessions: 2, ytImports: 20, ytMaxMinutes: 120, clips: 200, autopost: false, accountsPerPlatform: 0, storage: ["gdrive"], captionStyles: 4, seats: 1 },
    features: [
      "Live GTA 6 directory · Twitch (Kick & YouTube Live soon)",
      "2 live streams clipped at once",
      "20 YouTube long-form videos / month (up to 2h each)",
      "200 clips / month · 1080p, no watermark",
      "AI captions · 4 styles",
      "Save to Google Drive",
      "Download your Shorts and post them yourself",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For clippers posting every day across platforms.",
    monthly: 99,
    yearly: 79,
    highlight: true,
    limits: { liveSessions: 5, ytImports: 60, ytMaxMinutes: 240, clips: 600, autopost: false, accountsPerPlatform: 0, storage: ["gdrive", "dropbox", "onedrive"], captionStyles: 8, seats: 1 },
    features: [
      "Everything in Starter",
      "5 live streams clipped at once",
      "60 YouTube long-form videos / month (up to 4h each)",
      "600 clips / month",
      "AI captions · all 8 styles + brand colors",
      "AI titles & hashtags written for each platform, ready to copy",
      "Save to Google Drive, Dropbox & OneDrive",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "For teams and agencies running many pages.",
    monthly: 199,
    yearly: 159,
    limits: { liveSessions: 10, ytImports: 200, ytMaxMinutes: 360, clips: 2000, autopost: true, accountsPerPlatform: 3, storage: ["gdrive", "dropbox", "onedrive", "box"], captionStyles: 8, seats: 3 },
    features: [
      "Everything in Pro",
      "10 live streams clipped at once",
      "200 YouTube long-form videos / month (up to 6h each)",
      "2,000 clips / month · priority processing",
      "Auto-post + scheduling to TikTok, YouTube Shorts, Instagram Reels & Facebook · 3 accounts each",
      "Save to Google Drive, Dropbox, OneDrive & Box · auto-upload folders",
      "3 team seats · performance analytics",
    ],
  },
];

/** Enterprise is sold by conversation, not self-serve checkout. */
export const ENTERPRISE = {
  name: "Enterprise",
  blurb: "For networks, agencies and brands with custom needs.",
  features: [
    "Custom live stream and clip volume",
    "Multiple workspaces and unlimited seats",
    "Up to 3 accounts each on TikTok, YouTube, Instagram & Facebook, per workspace",
    "Custom caption styles and branding",
    "API access and priority support",
    "Invoice billing",
  ],
};

export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;

/** Rows for the comparison table on the pricing page. */
export const COMPARISON: { label: string; values: (p: Plan) => string | boolean }[] = [
  { label: "Live stream directory", values: () => true },
  { label: "Live streams clipped at once", values: (p) => `${p.limits.liveSessions}` },
  { label: "YouTube long-form imports / month", values: (p) => `${p.limits.ytImports}` },
  { label: "Max video length", values: (p) => `${p.limits.ytMaxMinutes / 60}h` },
  { label: "Clips / month", values: (p) => p.limits.clips.toLocaleString("en-US") },
  { label: "AI caption styles", values: (p) => `${p.limits.captionStyles}` },
  { label: "AI titles & hashtags", values: (p) => p.id !== "starter" },
  { label: "Google Drive", values: (p) => p.limits.storage.includes("gdrive") },
  { label: "Dropbox & OneDrive", values: (p) => p.limits.storage.includes("dropbox") },
  { label: "Box", values: (p) => p.limits.storage.includes("box") },
  { label: "Download clips", values: () => true },
  { label: "Auto-post: TikTok, YouTube, Instagram, Facebook", values: (p) => p.limits.autopost },
  { label: "Accounts per platform", values: (p) => (p.limits.autopost ? `${p.limits.accountsPerPlatform}` : false) },
  { label: "Post scheduling", values: (p) => p.limits.autopost },
  { label: "Team seats", values: (p) => `${p.limits.seats}` },
];
