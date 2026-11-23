import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { planById, type PlanId } from "@/lib/plans";
import { worker } from "@/lib/worker";

/**
 * Dropbox + OneDrive saving. The website holds the app keys and runs the OAuth sign-in and token refresh;
 * the worker keeps the tokens (server-side only) and uploads the clips. Keyed by the person's own Clerk id.
 */
export type Provider = "dropbox" | "onedrive";
export const PROVIDERS: Provider[] = ["dropbox", "onedrive"];
export const LABEL: Record<Provider, string> = { dropbox: "Dropbox", onedrive: "OneDrive" };

const CFG: Record<Provider, { id: string; secret: string; auth: string; token: string; scope?: string }> = {
  dropbox: {
    id: "DROPBOX_APP_KEY", secret: "DROPBOX_APP_SECRET",
    auth: "https://www.dropbox.com/oauth2/authorize", token: "https://api.dropboxapi.com/oauth2/token",
  },
  onedrive: {
    id: "MS_CLIENT_ID", secret: "MS_CLIENT_SECRET",
    auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access Files.ReadWrite User.Read",
  },
};

export const isProvider = (p: string | null | undefined): p is Provider => p === "dropbox" || p === "onedrive";
const creds = (p: Provider) => ({ id: process.env[CFG[p].id] ?? "", secret: process.env[CFG[p].secret] ?? "" });
export const configured = (p: Provider) => { const c = creds(p); return !!(c.id && c.secret && process.env.SESSION_SECRET); };
export const allowed = (plan: PlanId | null | undefined, p: Provider) => !!plan && (planById(plan).limits.storage as string[]).includes(p);
export const redirectUri = (origin: string, p: Provider) => `${origin}/api/drive/${p}/callback`;

/* ------------------------------------------------------------------ signed OAuth state (CSRF) */

const sign = (data: string) => createHmac("sha256", process.env.SESSION_SECRET ?? "").update(data).digest("base64url");

export function makeState(uid: string, p: Provider): string {
  const data = Buffer.from(JSON.stringify({ u: uid, p, e: Date.now() + 15 * 60_000 })).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function readState(state: string | null, p: Provider): string | null {
  const [data, sig] = (state ?? "").split(".");
  if (!data || !sig) return null;
  const want = Buffer.from(sign(data)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const s = JSON.parse(Buffer.from(data, "base64url").toString()) as { u?: string; p?: string; e?: number };
    return s.p === p && typeof s.u === "string" && (s.e ?? 0) > Date.now() ? s.u : null;
  } catch {
    return null;
  }
}

export function authUrl(p: Provider, origin: string, uid: string): string {
  const q = new URLSearchParams({ client_id: creds(p).id, response_type: "code", redirect_uri: redirectUri(origin, p), state: makeState(uid, p) });
  if (p === "dropbox") q.set("token_access_type", "offline");
  if (CFG[p].scope) q.set("scope", CFG[p].scope!);
  return `${CFG[p].auth}?${q}`;
}

/* ------------------------------------------------------------------ tokens */

type Tok = { access?: string; refresh?: string; expires?: number; account?: string };

async function tokenCall(p: Provider, params: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const c = creds(p);
  const body = new URLSearchParams({ ...params, client_id: c.id, client_secret: c.secret, ...(CFG[p].scope ? { scope: CFG[p].scope! } : {}) });
  const r = await fetch(CFG[p].token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`${LABEL[p]} sign-in failed (${r.status}).`);
  return d;
}

async function accountName(p: Provider, access: string): Promise<string | undefined> {
  try {
    if (p === "dropbox") {
      const r = await fetch("https://api.dropboxapi.com/2/users/get_current_account", { method: "POST", headers: { authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(10_000) });
      const d = await r.json();
      return d.email || d.name?.display_name;
    }
    const r = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(10_000) });
    const d = await r.json();
    return d.mail || d.userPrincipalName || d.displayName;
  } catch {
    return undefined;
  }
}

async function saveTok(uid: string, p: Provider, data: Tok) {
  const r = await worker("/storage/token", { method: "POST", body: JSON.stringify({ uid, provider: p, data }) });
  if (!r.ok) throw new Error("Couldn't save the connection. Try again.");
}

/** OAuth callback: swap the code for tokens and store them on the worker. */
export async function connect(p: Provider, uid: string, code: string, origin: string) {
  const t = await tokenCall(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(origin, p) });
  await saveTok(uid, p, { access: t.access_token, refresh: t.refresh_token, expires: Date.now() + (t.expires_in ?? 3600) * 1000, account: await accountName(p, t.access_token) });
}

/** A working access token for this person, refreshed (and re-saved) when it's about to expire. Null = not connected. */
export async function accessToken(uid: string, p: Provider): Promise<string | null> {
  const r = await worker(`/storage/token?uid=${encodeURIComponent(uid)}&provider=${p}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Couldn't reach the server. Try again.");
  const t = (await r.json()) as Tok;
  if (t.access && (t.expires ?? 0) > Date.now() + 120_000) return t.access;
  if (!t.refresh) return null;
  const n = await tokenCall(p, { grant_type: "refresh_token", refresh_token: t.refresh });
  await saveTok(uid, p, { ...t, access: n.access_token, refresh: n.refresh_token ?? t.refresh, expires: Date.now() + (n.expires_in ?? 3600) * 1000 });
  return n.access_token;
}
