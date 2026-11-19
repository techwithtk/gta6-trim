// Server-only Twitch Helix client (app access token via client credentials).
// Never import this from a client component — it reads TWITCH_CLIENT_SECRET.
import { cacheLife } from "next/cache";

export type LiveStream = {
  id: string;
  login: string;
  name: string;
  title: string;
  viewers: number;
  startedAt: string;
  language: string;
  thumbnail: string; // 640x360
  url: string;
};

export type StreamsResult = { source: "twitch"; game: string; streams: LiveStream[]; fetchedAt: string } | { source: "sample"; reason: string };

const GAME_NAME = "Grand Theft Auto VI";

async function appToken(id: string, secret: string) {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Twitch token error ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function helix<T>(path: string, id: string, token: string): Promise<T> {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, { headers: { "Client-Id": id, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Twitch API ${path.split("?")[0]} error ${res.status}`);
  return res.json() as Promise<T>;
}

/** Live GTA VI streams on Twitch, cached ~1 minute so we stay far under rate limits. */
export async function getLiveGtaStreams(): Promise<StreamsResult> {
  "use cache";
  cacheLife("minutes");

  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return { source: "sample", reason: "Twitch keys not set" };

  try {
    const token = await appToken(id, secret);
    const games = await helix<{ data: { id: string; name: string }[] }>(`games?name=${encodeURIComponent(GAME_NAME)}`, id, token);
    const game = games.data[0];
    if (!game) return { source: "sample", reason: `Game "${GAME_NAME}" not found on Twitch` };

    const live = await helix<{
      data: { id: string; user_login: string; user_name: string; title: string; viewer_count: number; started_at: string; language: string; thumbnail_url: string }[];
    }>(`streams?game_id=${game.id}&type=live&first=100`, id, token);

    return {
      source: "twitch",
      game: game.name,
      fetchedAt: new Date().toISOString(),
      streams: live.data.map((s) => ({
        id: s.id,
        login: s.user_login,
        name: s.user_name,
        title: s.title,
        viewers: s.viewer_count,
        startedAt: s.started_at,
        language: s.language,
        thumbnail: s.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
        url: `twitch.tv/${s.user_login}`,
      })),
    };
  } catch (e) {
    return { source: "sample", reason: e instanceof Error ? e.message : "Twitch request failed" };
  }
}
