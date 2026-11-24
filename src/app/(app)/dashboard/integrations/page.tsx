"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Info, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { usePlan } from "@/lib/account";
import { refreshDrive, refreshStorage, useDrive, useStorage, type StorageProvider } from "@/lib/drive";
import { MAX_ACCOUNTS_PER_PLATFORM, type SocialPlatform } from "@/lib/plans";
import { PLATFORM_META, refreshAccounts, useSocial, type SocialAccount } from "@/lib/social";

const ORDER: SocialPlatform[] = ["tiktok", "youtube", "instagram", "facebook"];
const STORAGE = [
  { name: "Google Drive", color: "#1fa463", letter: "G" },
  { name: "Dropbox", color: "#0061fe", letter: "D" },
  { name: "OneDrive", color: "#0a72d4", letter: "O" },
];

function Mark({ letter, color, size = 36 }: { letter: string; color: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center border-2 border-black font-poster font-black text-white" style={{ width: size, height: size, fontSize: size * 0.5, background: color }}>
      {letter}
    </span>
  );
}

export default function IntegrationsPage() {
  return <Suspense fallback={<div className="h-64 animate-pulse bg-surface" />}><Integrations /></Suspense>;
}

function Integrations() {
  const plan = usePlan();
  const postable = plan.limits.autopost;
  const social = useSocial(postable);
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Coming back from the platform's login page: show the result, refresh the list, clean the URL.
  useEffect(() => {
    const connected = params.get("connected") as SocialPlatform | null;
    if (!connected) return;
    const name = PLATFORM_META[connected]?.name ?? "Account";
    // bundle.social adds "<platform>-callback" on success, or an error key such as "facebook-not-enough-pages".
    const errKey = [...params.keys()].find((k) => k !== "connected" && !k.endsWith("-callback") && k !== "errorReason");
    const t = setTimeout(() => {
      setNotice(errKey ? { tone: "bad", text: friendlyError(errKey, name, params.get("errorReason")) } : { tone: "ok", text: `${name} connected.` });
      refreshAccounts();
      router.replace("/dashboard/integrations", { scroll: false });
    }, 0);
    return () => clearTimeout(t);
  }, [params, router]);

  const connect = async (platform: SocialPlatform) => {
    setBusy(platform); setNotice(null);
    try {
      const r = await fetch("/api/social/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ platform }) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error ?? "Couldn't start connecting.");
      window.location.assign(d.url);
    } catch (e) {
      setNotice({ tone: "bad", text: e instanceof Error ? e.message : "Couldn't start connecting." });
      setBusy(null);
    }
  };
  const remove = async (a: SocialAccount) => {
    if (!window.confirm(`Disconnect ${a.displayName || a.username}? Scheduled posts to it will be cancelled.`)) return;
    setBusy(a.id); setNotice(null);
    try {
      const r = await fetch(`/api/social/accounts/${encodeURIComponent(a.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error ?? "Couldn't disconnect.");
      await refreshAccounts();
    } catch (e) {
      setNotice({ tone: "bad", text: e instanceof Error ? e.message : "Couldn't disconnect." });
    } finally { setBusy(null); }
  };

  const perPlatform = Math.min(social.perPlatform || plan.limits.accountsPerPlatform, MAX_ACCOUNTS_PER_PLATFORM);

  return (
    <>
      <div className="mb-7">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Post without leaving GTA6 Trim</p>
        <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">Integra<span className="text-pink">tions.</span></h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Connect your accounts once. Then press <span className="text-text">Post</span> under any clip to publish it or schedule it.</p>
      </div>

      {notice ? (
        <p role="status" className={`mb-5 flex items-center gap-2 border px-4 py-3 text-sm ${notice.tone === "ok" ? "border-green/40 bg-green/[0.07] text-green" : "border-red/40 bg-red/[0.07] text-red"}`}>
          {notice.tone === "ok" ? <Check className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />} {notice.text}
        </p>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-poster text-[28px] font-black uppercase leading-none">Social accounts</h2>
        <span className="h-px flex-1 bg-line" />
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-subtle"><ShieldCheck className="size-3.5" /> {postable ? `${perPlatform} per platform` : "Studio plan"}</span>
      </div>

      {!postable ? (
        <section className="flex flex-col gap-4 border-2 border-white/85 bg-surface p-5 shadow-[6px_6px_0_var(--pink)] sm:flex-row sm:items-center">
          <div className="flex -space-x-1.5">{ORDER.map((p) => <Mark key={p} letter={PLATFORM_META[p].letter} color={PLATFORM_META[p].color} />)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-poster text-[22px] font-black uppercase leading-none">Posting is on the Studio plan</div>
            <p className="mt-1.5 text-sm text-muted">On {plan.name}, download your Shorts and post them yourself. Studio posts and schedules them to TikTok, YouTube Shorts, Instagram Reels and Facebook, with up to {MAX_ACCOUNTS_PER_PLATFORM} accounts on each.</p>
          </div>
          <Link href="/dashboard/billing" className="inline-flex h-10 shrink-0 items-center justify-center border-2 border-black bg-pink px-4 font-poster text-[17px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa]">Upgrade to Studio</Link>
        </section>
      ) : social.error ? (
        <p className="flex items-center gap-2 border border-orange/40 bg-orange/[0.07] px-4 py-3 text-sm text-orange"><AlertCircle className="size-4 shrink-0" /> {social.error}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ORDER.map((p) => {
            const m = PLATFORM_META[p];
            const list = social.accounts.filter((a) => a.platform === p);
            const full = list.length >= perPlatform;
            return (
              <section key={p} className="border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Mark letter={m.letter} color={m.color} />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium">{m.name}</div>
                    <div className="truncate text-xs text-subtle">{m.note}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="num text-sm">{social.ready ? list.length : "–"} / {perPlatform}</div>
                    <div className="mt-1 flex justify-end gap-1" aria-hidden>
                      {Array.from({ length: perPlatform }, (_, k) => <span key={k} className={`h-1.5 w-4 ${k < list.length ? "bg-pink" : "bg-white/10"}`} />)}
                    </div>
                  </div>
                </div>

                {!social.ready ? (
                  <div className="mt-4 h-11 animate-pulse bg-surface-2" />
                ) : (
                  <ul className="mt-4 space-y-2">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 border border-line bg-surface-2 px-3 py-2">
                        <span className="grid size-7 place-items-center bg-surface-3 text-[11px] font-semibold">{(a.displayName || a.username).replace(/[@.]/g, "").slice(0, 2).toUpperCase()}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{a.displayName || a.username}{a.username && a.displayName !== a.username ? <span className="ml-1.5 text-xs text-subtle">{a.username}</span> : null}</span>
                        {!a.active ? <span className="text-xs text-orange">Reconnect</span> : <span className="hidden items-center gap-1 text-xs text-green sm:inline-flex"><Check className="size-3" /> Connected</span>}
                        <button onClick={() => remove(a)} disabled={busy === a.id} className="grid size-7 place-items-center text-subtle transition-colors duration-150 hover:bg-red/10 hover:text-red" aria-label={`Disconnect ${a.displayName || a.username}`}>
                          {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3">
                  {full ? (
                    <p className="text-xs text-subtle">Maximum of {perPlatform} {m.name} accounts reached.</p>
                  ) : (
                    <button onClick={() => connect(p)} disabled={!!busy || !social.ready} className="inline-flex h-9 items-center gap-1.5 border border-white/25 px-3 text-sm transition-colors duration-150 hover:border-pink hover:text-pink disabled:opacity-40">
                      {busy === p ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Connect {m.name}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs text-subtle">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        You log in on each platform&apos;s own page. We never see your password, we only get permission to publish videos you choose, and you can disconnect anytime.
      </p>

      <div className="mb-4 mt-10 flex items-center gap-3">
        <h2 className="font-poster text-[28px] font-black uppercase leading-none">Cloud storage</h2>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <GoogleDriveCard />
        <StorageCard provider="dropbox" />
        <StorageCard provider="onedrive" />
      </div>
      <p className="mt-3 text-xs text-subtle">Clips go into a &quot;GTA6 Trim&quot; folder. Google Drive and Dropbox only let us see the files we save there; we never read the rest of your storage.</p>
    </>
  );
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Google Drive: asks Google (through our sign-in provider) for permission to create files in the user's Drive. */
function GoogleDriveCard() {
  const drive = useDrive();
  const { user, isLoaded } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("drive") === "1") refreshDrive();
  }, []);

  const connect = async () => {
    if (!user) return;
    setBusy(true); setError(null);
    try {
      const back = `${window.location.origin}/dashboard/integrations?drive=1`;
      const google = user.externalAccounts.find((a) => a.provider === "google");
      const acct = google
        ? await google.reauthorize({ additionalScopes: [DRIVE_SCOPE], redirectUrl: back })
        : await user.createExternalAccount({ strategy: "oauth_google", additionalScopes: [DRIVE_SCOPE], redirectUrl: back });
      const url = acct.verification?.externalVerificationRedirectURL;
      if (!url) throw new Error("Google didn't return a sign-in page. Try again.");
      window.location.assign(url.toString());
    } catch (e) {
      const msg = (e as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
      setError(msg?.longMessage ?? msg?.message ?? (e instanceof Error ? e.message : "Couldn't start connecting."));
      setBusy(false);
    }
  };

  return (
    <div className="border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Mark letter="G" color="#1fa463" size={32} />
        <span className="text-sm">Google Drive</span>
        {drive.connected ? <span className="ml-auto inline-flex items-center gap-1 text-xs text-green"><Check className="size-3" /> Connected</span> : null}
      </div>
      {!drive.ready ? (
        <div className="mt-3 h-9 animate-pulse bg-surface-2" />
      ) : drive.connected ? (
        <p className="mt-3 text-xs text-muted">Press <span className="text-text">Drive</span> under any clip to save it, or <Link href="/dashboard/drive" className="text-pink underline underline-offset-2">post videos from your Drive</Link>.</p>
      ) : (
        <button onClick={connect} disabled={busy || !isLoaded} className="mt-3 inline-flex h-9 items-center gap-1.5 border border-white/25 px-3 text-sm transition-colors duration-150 hover:border-pink hover:text-pink disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Connect Google Drive
        </button>
      )}
      {error ? <p className="mt-2 text-xs text-red">{error}</p> : null}
    </div>
  );
}

function friendlyError(code: string, name: string, reason: string | null) {
  if (code.includes("not-enough-pages") || reason === "facebook-no-pages-found") return "No Facebook Page found. Posting needs a Page you manage, not a personal profile.";
  if (code.includes("not-enough-channels")) return "That Google account has no YouTube channel yet. Create one on YouTube, then connect again.";
  if (code.includes("not-professional-account") || code.includes("instagram-not-enough-accounts")) return "Instagram needs a Business or Creator account. Switch it in the Instagram app (Settings → Account type), then connect again.";
  if (code.includes("not-enough-permissions")) return `${name} wasn't connected because some permissions were unticked. Connect again and allow everything asked.`;
  if (reason === "facebook-two-factor-required") return "Facebook needs two-factor login turned on for this account. Turn it on, then connect again.";
  return `${name} couldn't connect. Try again.`;
}

const STORAGE_ERRORS: Record<string, string> = {
  denied: "wasn't connected: permission was cancelled. Try again and allow access.",
  expired: "wasn't connected: the sign-in link expired. Try again.",
  plan: "is on Pro and Studio.",
  failed: "couldn't connect. Try again in a minute.",
  unavailable: "isn't available yet.",
};

/** Dropbox / OneDrive: our own OAuth (tokens stay on our server). Shown as "Soon" until the app keys are set, and as an upgrade on Starter. */
function StorageCard({ provider }: { provider: StorageProvider }) {
  const st = useStorage();
  const s = st[provider];
  const meta = STORAGE.find((x) => x.name.toLowerCase().replace(" ", "") === provider)!;
  const [busy, setBusy] = useState(false);
  const q = useSearchParams();
  const code = q.get("provider") === provider ? q.get("storage_error") : null;
  const error = code ? `${meta.name} ${STORAGE_ERRORS[code] ?? STORAGE_ERRORS.failed}` : null;
  const justConnected = q.get("storage") === provider;

  useEffect(() => { if (justConnected) refreshStorage(); }, [justConnected]);

  const disconnect = async () => {
    if (!window.confirm(`Disconnect ${meta.name}? Clips already saved stay in your ${meta.name}.`)) return;
    setBusy(true);
    await fetch(`/api/storage?provider=${provider}`, { method: "DELETE" }).catch(() => {});
    await refreshStorage();
    setBusy(false);
  };

  return (
    <div className={`border border-line bg-surface p-4 ${st.ready && !s.available ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <Mark letter={meta.letter} color={meta.color} size={32} />
        <span className="text-sm">{meta.name}</span>
        {!st.ready ? null : !s.available ? (
          <span className="ml-auto border border-white/15 px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider text-subtle">Soon</span>
        ) : s.connected ? <span className="ml-auto inline-flex items-center gap-1 text-xs text-green"><Check className="size-3" /> Connected</span> : null}
      </div>
      {!st.ready ? (
        <div className="mt-3 h-9 animate-pulse bg-surface-2" />
      ) : !s.available ? null : !s.allowed ? (
        <p className="mt-3 text-xs text-muted">On Pro and Studio. <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Upgrade</Link></p>
      ) : s.connected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="min-w-0 flex-1 truncate">{s.account ? `As ${s.account}. ` : ""}Press <span className="text-text">{meta.name}</span> under any clip.</span>
          <button onClick={disconnect} disabled={busy} className="inline-flex items-center gap-1 text-subtle hover:text-red disabled:opacity-40"><Trash2 className="size-3" /> Disconnect</button>
        </div>
      ) : (
        <a href={`/api/drive/${provider}/connect`} onClick={() => setBusy(true)} className="mt-3 inline-flex h-9 items-center gap-1.5 border border-white/25 px-3 text-sm transition-colors duration-150 hover:border-pink hover:text-pink">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Connect {meta.name}
        </a>
      )}
      {error ? <p className="mt-2 text-xs text-red">{error}</p> : null}
    </div>
  );
}
