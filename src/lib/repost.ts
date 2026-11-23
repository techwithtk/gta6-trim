// Picks the clip to auto-repost: the one that most beat the customer's usual views, posted long enough ago,
// and not yet on every account they chose. Pure, so it can be tested without the posting service.

type Part = { platform: string; accountId?: string; postId?: string; status: string };
type Post = { externalId?: string; createdAt?: string; platforms: Part[] };
type Stat = { views: number };

export const MIN_POSTS = 5;      // need this many posts with views before "usual" means anything
export const MIN_VIEWS = 300;    // never repost something tiny just because the baseline is tinier
const MAX_AGE_DAYS = 14;         // clips are deleted after 30 days; reposting old ones also looks stale

export type Pick = { externalId: string; views: number; usual: number; accounts: string[] } | { reason: string };

export function pickWinner(opts: { posts: Post[]; stats: Record<string, Stat>; done: Set<string>; multiple: number; delayDays: number; accounts: string[]; now?: number }): Pick {
  const now = opts.now ?? Date.now();
  const rows = opts.posts.flatMap((p) => p.platforms.filter((x) => x.status === "published" && x.postId)
    .map((x) => ({ p, x, views: opts.stats[`${x.postId}~${x.platform}`]?.views, at: Date.parse(p.createdAt ?? "") })))
    .filter((r) => r.views !== undefined && Number.isFinite(r.at) && now - r.at < 30 * 86400_000) as { p: Post; x: Part; views: number; at: number }[];
  if (rows.length < MIN_POSTS) return { reason: `Waiting for more posts with views (${rows.length}/${MIN_POSTS}).` };
  const sorted = rows.map((r) => r.views).sort((a, b) => a - b);
  const usual = sorted[Math.floor(sorted.length / 2)];

  // Every account each clip has already gone to (any post, any status), so we never post a clip to the same account twice.
  const used = new Map<string, Set<string>>();
  for (const p of opts.posts) for (const x of p.platforms) if (p.externalId && x.accountId) {
    used.set(p.externalId, (used.get(p.externalId) ?? new Set()).add(x.accountId));
  }

  const best = new Map<string, number>();
  for (const r of rows) {
    const id = r.p.externalId;
    const age = now - r.at;
    if (!id || opts.done.has(id) || age < opts.delayDays * 86400_000 || age > MAX_AGE_DAYS * 86400_000) continue;
    best.set(id, Math.max(best.get(id) ?? 0, r.views));
  }
  const winners = [...best].filter(([, v]) => v >= Math.max(MIN_VIEWS, usual * opts.multiple)).sort((a, z) => z[1] - a[1]);
  for (const [externalId, views] of winners) {
    const accounts = opts.accounts.filter((a) => !used.get(externalId)?.has(a));
    if (accounts.length) return { externalId, views, usual, accounts };
  }
  return { reason: winners.length ? "Your best clips are already on every account you picked." : `No clip has ${opts.multiple}× your usual ${usual} views yet.` };
}
