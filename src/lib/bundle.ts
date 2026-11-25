import "server-only";
import type { SocialPlatform } from "@/lib/plans";
import { isAuthError } from "@/lib/postErrors";

/**
 * bundle.social posting API. A bundle.social "team" holds ONE account per platform, so each GTA6 Trim customer gets up
 * to 3 teams ("slots", named gt6:<uid>:<n>) — that is how they reach 3 accounts per platform. Customers connect through
 * bundle.social's hosted portal, which sends them to the platform's own login page. The API key stays on the server.
 */
const BASE = "https://api.bundle.social/api/v1";
const KEY = process.env.BUNDLE_SOCIAL_API_KEY ?? "";

export const socialConfigured = () => !!KEY;
export const PLATFORMS: SocialPlatform[] = ["tiktok", "youtube", "instagram", "facebook"];
const TYPE: Record<SocialPlatform, string> = { tiktok: "TIKTOK", youtube: "YOUTUBE", instagram: "INSTAGRAM", facebook: "FACEBOOK" };
const PLATFORM_OF: Record<string, SocialPlatform> = { TIKTOK: "tiktok", YOUTUBE: "youtube", INSTAGRAM: "instagram", FACEBOOK: "facebook" };

export class SocialError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function b<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    cache: "no-store",
    headers: { "x-api-key": KEY, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!res.ok) {
    const e = (body ?? {}) as { message?: string | string[]; error?: string };
    const msg = Array.isArray(e.message) ? e.message.join(", ") : e.message ?? e.error ?? `Posting service error ${res.status}`;
    throw new SocialError(msg, res.status);
  }
  return body as T;
}

/* ------------------------------------------------------------------ slots (one bundle.social team each) */

type Team = { id: string; name: string };
const prefix = (uid: string) => `gt6:${uid}:`;

/** The customer's slot teams, slot 1 first. Only teams whose name carries their user id count as theirs. */
async function slots(uid: string): Promise<{ id: string; n: number }[]> {
  const d = await b<{ items?: Team[] }>(`/team/?search=${encodeURIComponent(prefix(uid))}&limit=50`);
  return (d.items ?? [])
    .filter((t) => t.name.startsWith(prefix(uid)) && /^\d+$/.test(t.name.slice(prefix(uid).length)))
    .map((t) => ({ id: t.id, n: Number(t.name.slice(prefix(uid).length)) }))
    .sort((a, z) => a.n - z.n);
}

async function createSlot(uid: string, n: number): Promise<string> {
  const t = await b<Team>("/team/", { method: "POST", body: JSON.stringify({ name: `${prefix(uid)}${n}` }) });
  return t.id;
}

/* ------------------------------------------------------------------ accounts */

export type SocialAccount = { id: string; platform: SocialPlatform; username: string; displayName: string; active: boolean; slot: number; needsReconnect?: boolean };
type RawAccount = { id: string; type: string; teamId: string; username?: string | null; displayName?: string | null; deleteOn?: string | null; updatedAt?: string | null; createdAt?: string | null; channels?: { id: string; name?: string | null; username?: string | null }[] | null };

/** Account ids are "<teamId>~<TYPE>" because bundle.social disconnects and posts by team + platform. */
const accountId = (teamId: string, type: string) => `${teamId}~${type}`;
export const parseAccountId = (id: string) => {
  const [teamId, type] = id.split("~");
  return teamId && PLATFORM_OF[type] ? { teamId, type, platform: PLATFORM_OF[type] } : null;
};

export async function listAccounts(uid: string): Promise<SocialAccount[]> {
  const mine = await slots(uid);
  const teams = await Promise.all(mine.map((s) => Promise.all([
    b<{ socialAccounts?: RawAccount[] }>(`/team/${s.id}`),
    b<{ items?: RawPost[] }>(`/post/?teamId=${s.id}&orderBy=createdAt&order=DESC&limit=25`).then((d) => d.items ?? []).catch(() => [] as RawPost[]),
  ]).then(([t, posts]) => ({ s, t, posts }))));
  return teams.flatMap(({ s, t, posts }) =>
    (t.socialAccounts ?? [])
      .filter((a) => PLATFORM_OF[a.type])
      .map((a) => {
        const ch = a.channels?.[0];
        const name = a.displayName || ch?.name || a.username || PLATFORM_OF[a.type];
        return { id: accountId(s.id, a.type), platform: PLATFORM_OF[a.type], username: a.username || ch?.username || "", displayName: name, active: !a.deleteOn, slot: s.n, needsReconnect: loginRejected(a, posts) };
      }),
  );
}

/**
 * The platform rejected this account's login: its latest finished post failed with an auth error, after the account was last (re)connected.
 * Reconnecting refreshes the account's updatedAt, which clears this on its own.
 */
function loginRejected(a: RawAccount, posts: RawPost[]): boolean {
  const since = a.updatedAt ?? a.createdAt ?? "";
  const last = posts.find((p) => p.data && a.type in p.data && (p.errors?.[a.type] || p.status === "POSTED" || p.status === "ERROR"));
  if (!last || (last.createdAt ?? "") <= since) return false;
  return isAuthError(last.errors?.[a.type] ?? (last.status === "ERROR" ? last.error : null));
}

/** Hosted connect link for the first slot without this platform (or, with reconnectId, that account's own slot to log in again) (adds a slot if needed, up to the plan's cap). */
export async function connectUrl(uid: string, platform: SocialPlatform, perPlatform: number, redirectUrl: string, reconnectId?: string): Promise<string> {
  const mine = await slots(uid);
  const again = reconnectId ? parseAccountId(reconnectId) : null;
  if (reconnectId && (!again || again.platform !== platform || !mine.some((s) => s.id === again.teamId))) throw new SocialError("Account not found.", 404);
  const taken = again ? new Set<string>() : new Set((await listAccounts(uid)).filter((a) => a.platform === platform).map((a) => parseAccountId(a.id)!.teamId));
  let teamId = again?.teamId ?? mine.filter((s) => s.n <= perPlatform).find((s) => !taken.has(s.id))?.id;
  if (!teamId) {
    const used = new Set(mine.map((s) => s.n));
    const n = Array.from({ length: perPlatform }, (_, i) => i + 1).find((k) => !used.has(k));
    if (!n) throw new SocialError(`You can connect up to ${perPlatform} accounts per platform.`, 409);
    teamId = await createSlot(uid, n);
  }
  const d = await b<{ url: string }>("/social-account/create-portal-link", {
    method: "POST",
    body: JSON.stringify({ teamId, socialAccountTypes: [TYPE[platform]], redirectUrl, expiresIn: 30, hidePoweredBy: true, goBackButtonText: "Back to GTA6 Trim", language: "en" }),
  });
  return d.url;
}

export async function disconnect(uid: string, id: string) {
  const p = parseAccountId(id);
  if (!p || !(await slots(uid)).some((s) => s.id === p.teamId)) throw new SocialError("Account not found.", 404);
  await b("/social-account/disconnect", { method: "DELETE", body: JSON.stringify({ type: p.type, teamId: p.teamId }) });
}

/* ------------------------------------------------------------------ posts */

export type PostResult = {
  id: string;
  status: "published" | "partial" | "failed" | "scheduled" | "publishing";
  externalId?: string; // "<jobId>/<file>"
  createdAt?: string;
  scheduledFor?: string;
  platforms: { platform: string; accountId?: string; postId?: string; status: string; url?: string; error?: string }[];
};

type RawPost = {
  id: string;
  teamId: string;
  referenceKey?: string | null;
  status: string;
  postDate?: string | null;
  createdAt?: string | null;
  data?: Record<string, unknown>;
  error?: string | null;
  errors?: Record<string, string | null> | null;
  externalData?: Record<string, { permalink?: string | null } | null> | null;
};

/**
 * referenceKey = "<jobId>/<file>@<sentAt>~<n>": bundle.social needs it unique across the whole organization, so each slot
 * team a single "Post" click goes to gets its own "~<n>". groupOf() strips that to put the parts of one click back together.
 */
const clipOf = (ref?: string | null) => (ref && ref.includes("@") ? ref.slice(0, ref.lastIndexOf("@")) : undefined);
const groupOf = (ref: string) => ref.replace(/~\d+$/, "");

function rollup(parts: RawPost[]): PostResult {
  const platforms = parts.flatMap((p) =>
    Object.keys(p.data ?? {}).filter((t) => PLATFORM_OF[t]).map((t) => {
      const err = p.errors?.[t] ?? (p.status === "ERROR" ? p.error || "Posting failed." : undefined);
      const url = p.externalData?.[t]?.permalink ?? undefined;
      const st = err ? "failed" : url || p.status === "POSTED" ? "published" : p.status === "SCHEDULED" ? "scheduled" : "publishing";
      return { platform: PLATFORM_OF[t], accountId: accountId(p.teamId, t), postId: p.id, status: st, url, error: err ?? undefined };
    }),
  );
  const s = platforms.map((x) => x.status);
  const status: PostResult["status"] =
    s.length && s.every((x) => x === "published") ? "published"
    : s.some((x) => x === "failed") ? (s.some((x) => x === "published") ? "partial" : s.every((x) => x === "failed") ? "failed" : "publishing")
    : s.some((x) => x === "scheduled") && !s.some((x) => x === "publishing") ? "scheduled"
    : "publishing";
  const first = parts[0];
  return { id: first.referenceKey ? groupOf(first.referenceKey) : first.id, status, externalId: clipOf(first.referenceKey), createdAt: first.createdAt ?? undefined, scheduledFor: first.postDate ?? undefined, platforms };
}

export type PostInput = {
  uid: string;
  externalId: string; // "<jobId>/<file>"
  caption: string;
  title: string;
  videoUrl: string;
  accounts: SocialAccount[];
  scheduledFor?: string; // ISO 8601; omitted = now
};

export async function createPost(i: PostInput): Promise<PostResult> {
  const ref = `${i.externalId}@${Date.now()}`.slice(0, 120);
  const byTeam = new Map<string, SocialAccount[]>();
  for (const a of i.accounts) {
    const t = parseAccountId(a.id)!.teamId;
    byTeam.set(t, [...(byTeam.get(t) ?? []), a]);
  }
  const postDate = i.scheduledFor ?? new Date().toISOString();
  const teams = [...byTeam];
  const settled = await Promise.allSettled(
    teams.map(async ([teamId, accts], n) => {
      const up = await b<{ id: string }>("/upload/from-url", { method: "POST", body: JSON.stringify({ teamId, url: i.videoUrl }), signal: AbortSignal.timeout(120_000) });
      const data: Record<string, unknown> = {};
      for (const a of accts) {
        const uploadIds = [up.id];
        if (a.platform === "tiktok") data.TIKTOK = { type: "VIDEO", text: i.caption.slice(0, 2200), uploadIds, privacy: "PUBLIC_TO_EVERYONE" };
        if (a.platform === "youtube") data.YOUTUBE = { type: "SHORT", text: i.title.slice(0, 100), description: i.caption.slice(0, 5000), uploadIds, privacy: "PUBLIC", madeForKids: false };
        if (a.platform === "instagram") data.INSTAGRAM = { type: "REEL", text: i.caption.slice(0, 2200), uploadIds, shareToFeed: true };
        if (a.platform === "facebook") data.FACEBOOK = { type: "REEL", text: i.caption.slice(0, 5000), uploadIds };
      }
      return b<RawPost>("/post/", {
        method: "POST",
        body: JSON.stringify({ teamId, title: i.title.slice(0, 100) || "GTA 6 clip", referenceKey: `${ref}~${n}`, postDate, status: "SCHEDULED", socialAccountTypes: accts.map((a) => TYPE[a.platform]), data }),
        signal: AbortSignal.timeout(60_000),
      });
    }),
  );
  // One team failing (a disconnected page, a platform hiccup) must not hide the posts that did go out to the others.
  const created: RawPost[] = [];
  settled.forEach((res, n) => {
    const [teamId, accts] = teams[n];
    if (res.status === "fulfilled") created.push({ ...res.value, referenceKey: res.value.referenceKey ?? `${ref}~${n}` });
    else {
      const msg = res.reason instanceof Error ? res.reason.message : "Posting failed.";
      created.push({ id: `${ref}~${n}`, teamId, referenceKey: `${ref}~${n}`, status: "ERROR", error: msg, createdAt: new Date().toISOString(),
        data: Object.fromEntries(accts.map((a) => [TYPE[a.platform], {}])) });
    }
  });
  if (settled.every((x) => x.status === "rejected")) throw (settled[0] as PromiseRejectedResult).reason;
  return rollup(created);
}

/** Recent posts across the customer's slots, one entry per "Post" click. */
export async function listPosts(uid: string): Promise<PostResult[]> {
  const mine = await slots(uid);
  const all = (
    await Promise.all(mine.map((s) => b<{ items?: RawPost[] }>(`/post/?teamId=${s.id}&orderBy=createdAt&order=DESC&limit=100`).then((d) => d.items ?? [])))
  ).flat().filter((p) => clipOf(p.referenceKey) && p.status !== "DELETED");
  const groups = new Map<string, RawPost[]>();
  for (const p of all) { const g = groupOf(p.referenceKey!); groups.set(g, [...(groups.get(g) ?? []), p]); }
  return [...groups.values()].map(rollup).sort((a, z) => (z.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/* ------------------------------------------------------------------ analytics */

export type PostStats = { views: number; likes: number; comments: number; shares: number; at?: string };
type RawStat = { views?: number | null; impressions?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; createdAt?: string | null };

const pick = (items: RawStat[] | undefined): PostStats | null => {
  const last = [...(items ?? [])].sort((a, z) => (z.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
  if (!last) return null;
  return { views: last.views || last.impressions || 0, likes: last.likes ?? 0, comments: last.comments ?? 0, shares: last.shares ?? 0, at: last.createdAt ?? undefined };
};
export const statKey = (postId: string, platform: string) => `${postId}~${platform}`;

/** Latest views/likes/comments/shares for every published part of the customer's posts, keyed "<postId>~<platform>". */
export async function postStats(posts: PostResult[]): Promise<Record<string, PostStats>> {
  const byType = new Map<string, string[]>();
  for (const p of posts) for (const x of p.platforms) {
    if (x.status !== "published" || !x.postId) continue;
    const t = TYPE[x.platform as SocialPlatform];
    if (t) byType.set(t, [...new Set([...(byType.get(t) ?? []), x.postId])]);
  }
  const out: Record<string, PostStats> = {};
  await Promise.all([...byType].flatMap(([type, ids]) => {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
    return chunks.map(async (chunk) => {
      const q = new URLSearchParams({ platformType: type, limit: "20" });
      for (const id of chunk) q.append("postIds", id);
      const d = await b<{ results?: { postId: string; items?: RawStat[] }[] }>(`/analytics/post/bulk?${q}`);
      for (const r of d.results ?? []) {
        const s = pick(r.items);
        if (s) out[statKey(r.postId, PLATFORM_OF[type])] = s;
      }
    });
  }));
  return out;
}

/** Ask the platform for fresh numbers now (bundle.social allows 6 per post per day). */
export async function refreshPostStats(postId: string, platform: SocialPlatform): Promise<PostStats | null> {
  const r = await b<RawStat>("/analytics/post/force", { method: "POST", body: JSON.stringify({ postId, platformType: TYPE[platform] }) });
  return pick([r]);
}
