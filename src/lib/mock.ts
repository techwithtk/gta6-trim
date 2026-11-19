// Mock data + live simulator. Replace with Twitch API + hype detector in Phase 1–2.


export type Permission = "owned" | "authorized" | "discovery";
export type Platform = "twitch" | "kick" | "youtube";

export type Stream = {
  id: string;
  channel: string;
  title: string;
  platform: Platform;
  permission: Permission;
  viewers: number;
  hype: number; // 0–100
  chatRate: number; // msgs/sec
  history: number[]; // last 30 hype samples
  clipsToday: number;
  scene: [string, string, string]; // thumbnail gradient
  cam: "tl" | "tr" | "bl" | "br";
  uptime: string;
  url: string; // public stream link
  lang: string;
  thumbnail?: string; // real stream preview (Twitch)
};

export type Moment = {
  id: string;
  streamId: string;
  channel: string;
  score: number;
  title: string;
  trigger: string;
  at: number;
  status: "detected" | "clipping" | "ready";
};

const SEED: Omit<Stream, "history" | "hype" | "chatRate" | "url" | "lang">[] = [
  { id: "s1", channel: "NeonDrifter", title: "🔴 GTA 6 MARATHON DAY 2 · every heist, no skips", platform: "twitch", permission: "owned", viewers: 61240, clipsToday: 14, scene: ["#ff8a3d", "#ff3d9a", "#3b1460"], cam: "br", uptime: "9h 12m" },
  { id: "s2", channel: "BayfrontBandit", title: "first-person only run · DROPS ON", platform: "twitch", permission: "authorized", viewers: 33180, clipsToday: 9, scene: ["#22d3ee", "#1e3a8a", "#0b0612"], cam: "tl", uptime: "4h 40m" },
  { id: "s3", channel: "PalmTreePixel", title: "making every WRONG decision in Leonida 💀", platform: "twitch", permission: "authorized", viewers: 20410, clipsToday: 6, scene: ["#fbbf24", "#f97316", "#7c2d12"], cam: "bl", uptime: "6h 03m" },
  { id: "s4", channel: "MiaPlaysLive", title: "GOTY?? story mode blind playthrough | !socials", platform: "kick", permission: "discovery", viewers: 8020, clipsToday: 0, scene: ["#f472b6", "#334155", "#0f172a"], cam: "br", uptime: "2h 51m" },
  { id: "s5", channel: "SwampKingTV", title: "airboat chaos + police chases all night", platform: "twitch", permission: "owned", viewers: 6110, clipsToday: 4, scene: ["#10b981", "#065f46", "#022c22"], cam: "tr", uptime: "11h 26m" },
  { id: "s6", channel: "ZeroChillZed", title: "24/7 MARATHON · PS5 GIVEAWAY at 10K followers", platform: "youtube", permission: "discovery", viewers: 5940, clipsToday: 0, scene: ["#38bdf8", "#0ea5e9", "#0c4a6e"], cam: "tl", uptime: "21h 08m" },
  { id: "s7", channel: "LowRiderLuna", title: "car meet + custom builds · chill vibes", platform: "twitch", permission: "authorized", viewers: 1180, clipsToday: 2, scene: ["#a855f7", "#ec4899", "#1e1b4b"], cam: "bl", uptime: "3h 17m" },
  { id: "s8", channel: "MrNoBrakes", title: "playing GTA 6 for the FIRST time (I'm in NZ)", platform: "twitch", permission: "discovery", viewers: 945, clipsToday: 0, scene: ["#94a3b8", "#475569", "#1e293b"], cam: "tl", uptime: "1h 02m" },
  { id: "s9", channel: "ViceVandal", title: "GTA 6 online grind · heists with viewers", platform: "kick", permission: "discovery", viewers: 14200, clipsToday: 0, scene: ["#53fc18", "#166534", "#052e16"], cam: "br", uptime: "5h 44m" },
  { id: "s10", channel: "LeonidaLens", title: "photo mode tour + secrets hunting", platform: "youtube", permission: "discovery", viewers: 3300, clipsToday: 0, scene: ["#f97316", "#7c2d12", "#1c0a03"], cam: "tr", uptime: "2h 09m" },
  { id: "s11", channel: "KeysAndChaos", title: "100% completion speedrun attempt #3", platform: "twitch", permission: "discovery", viewers: 9700, clipsToday: 0, scene: ["#22d3ee", "#155e75", "#082f49"], cam: "tl", uptime: "7h 31m" },
  { id: "s12", channel: "SunsetStuntz", title: "stunt jumps only · no fall damage challenge", platform: "kick", permission: "discovery", viewers: 2100, clipsToday: 0, scene: ["#fb7185", "#9f1239", "#4c0519"], cam: "bl", uptime: "1h 48m" },
];

export const HOOKS = [
  "He did NOT see that cop car coming 💀",
  "Chat called it 10 seconds early",
  "The most cursed parking job in Leonida",
  "Heist went wrong in the funniest way",
  "Bro jumped a jet ski over a highway",
  "NPC said WHAT to him?? 😭",
  "Clutch escape with 1 HP left",
  "Gator ambush out of nowhere 🐊",
];
export const TRIGGERS = ["Chat 6.2× baseline", "KEKW burst", "12 community clips", "Audio spike +18 dB", "Chat 4.8× + LUL wall", "\"CLIP IT\" ×40"];

const LANGS = ["EN", "EN", "EN", "ES", "EN", "EN", "EN", "EN", "PT", "EN", "EN", "EN"];

export function streamUrl(platform: Platform, channel: string) {
  const h = channel.toLowerCase();
  return platform === "twitch" ? `twitch.tv/${h}` : platform === "kick" ? `kick.com/${h}` : `youtube.com/@${h}/live`;
}

export function initial(): Stream[] {
  return SEED.map((s, i) => {
    const base = 25 + ((i * 17) % 40);
    return { ...s, url: streamUrl(s.platform, s.channel), lang: LANGS[i] ?? "EN", hype: base, chatRate: 8 + i * 3, history: Array.from({ length: 30 }, (_, k) => Math.round(base + Math.sin(k / 3 + i) * 8)) };
  });
}

export function seedMoments(now: number): Moment[] {
  return [
    { id: "m0", streamId: "s1", channel: "NeonDrifter", score: 9.1, title: HOOKS[3], trigger: TRIGGERS[2], at: now - 95_000, status: "ready" },
    { id: "m1", streamId: "s2", channel: "BayfrontBandit", score: 8.4, title: HOOKS[6], trigger: TRIGGERS[0], at: now - 260_000, status: "ready" },
    { id: "m2", streamId: "s3", channel: "PalmTreePixel", score: 7.6, title: HOOKS[2], trigger: TRIGGERS[1], at: now - 540_000, status: "ready" },
  ];
}

export function fmtViewers(n0: number) {
  const n = Math.round(n0);
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${n}`;
}

export function ago(at: number, now: number | null) {
  if (!now) return "";
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ---------- static data for other screens ----------

export const QUEUE = [
  { id: "c1", image: "/gta6/clip-1.jpg", captionWord: "ONE JOB 😭", channel: "NeonDrifter", title: "Heist went wrong in the funniest way", score: 9.1, length: 38, caption: "the getaway driver had ONE job 😭 #gta6 #gaming #fyp", platforms: ["tiktok", "shorts", "reels"], scene: ["#ff8a3d", "#ff3d9a", "#3b1460"] as const },
  { id: "c2", image: "/gta6/clip-2.jpg", captionWord: "STILL ALIVE?!", channel: "BayfrontBandit", title: "Clutch escape with 1 HP left", score: 8.4, length: 27, caption: "how is he still alive 💀 #gta6 #clutch", platforms: ["tiktok", "shorts"], scene: ["#22d3ee", "#1e3a8a", "#0b0612"] as const },
  { id: "c3", image: "/gta6/clip-3.jpg", captionWord: "PARKING: NONE", channel: "PalmTreePixel", title: "The most cursed parking job in Leonida", score: 7.6, length: 22, caption: "parking skills: none #gta6 #funny", platforms: ["shorts", "reels"], scene: ["#fbbf24", "#f97316", "#7c2d12"] as const },
  { id: "c4", image: "/gta6/clip-4.jpg", captionWord: "RUN!! 🐊", channel: "SwampKingTV", title: "Gator ambush out of nowhere 🐊", score: 8.8, length: 31, caption: "florida moment #gta6 #gator", platforms: ["tiktok", "shorts", "reels"], scene: ["#10b981", "#065f46", "#022c22"] as const },
];

export const POSTED = [
  { id: "p1", title: "Cop car came out of NOWHERE 💀", channel: "NeonDrifter", platform: "TikTok", posted: "2h ago", views: 412_300, likes: 38_100, trend: "up" },
  { id: "p2", title: "Chat called it 10 seconds early", channel: "BayfrontBandit", platform: "YouTube Shorts", posted: "3h ago", views: 188_920, likes: 11_400, trend: "up" },
  { id: "p3", title: "Bro jumped a jet ski over a highway", channel: "NeonDrifter", platform: "Reels", posted: "5h ago", views: 97_450, likes: 7_020, trend: "flat" },
  { id: "p4", title: "NPC said WHAT to him?? 😭", channel: "PalmTreePixel", platform: "TikTok", posted: "7h ago", views: 61_800, likes: 5_310, trend: "up" },
  { id: "p5", title: "Airboat vs police helicopter", channel: "SwampKingTV", platform: "YouTube Shorts", posted: "9h ago", views: 23_140, likes: 1_480, trend: "down" },
  { id: "p6", title: "Custom lowrider reveal", channel: "LowRiderLuna", platform: "Reels", posted: "12h ago", views: 8_930, likes: 702, trend: "flat" },
];

export const DAILY_VIEWS = [42, 55, 61, 58, 90, 130, 188, 240, 310, 402, 520, 790]; // thousands, last 12 days
