"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Check, Loader2, Lock, Trash2, FolderOpen, Info, ShieldCheck } from "lucide-react";
import { PageTitle, SectionLabel } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { Toggle } from "@/components/forms";
import { EASE_OUT, SPRING, SPRING_EVENT, T } from "@/components/motion";
import { usePlan } from "@/lib/account";
import { MAX_ACCOUNTS_PER_PLATFORM, PLANS, type SocialPlatform, type StorageProvider } from "@/lib/plans";

/* ---------- brand-neutral marks (simple letter tiles, no copied logos) ---------- */
function Mark({ letter, color, size = 36 }: { letter: string; color: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[10px] font-display font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 55%, #09090b))` }}>
      {letter}
    </span>
  );
}

const STORAGE: { id: StorageProvider; name: string; color: string; letter: string; via: string }[] = [
  { id: "gdrive", name: "Google Drive", color: "#1fa463", letter: "G", via: "Google" },
  { id: "dropbox", name: "Dropbox", color: "#0061fe", letter: "D", via: "Dropbox" },
  { id: "onedrive", name: "OneDrive", color: "#0a72d4", letter: "O", via: "Microsoft" },
  { id: "box", name: "Box", color: "#0b5cd5", letter: "B", via: "Box" },
];

const SOCIAL: { id: SocialPlatform; name: string; color: string; letter: string; note: string }[] = [
  { id: "instagram", name: "Instagram", color: "#e1306c", letter: "I", note: "Needs a Business or Creator account" },
  { id: "facebook", name: "Facebook Pages", color: "#1877f2", letter: "F", note: "Posts as Reels to a Page you manage" },
  { id: "youtube", name: "YouTube", color: "#ff0033", letter: "Y", note: "Uploads as Shorts" },
  { id: "tiktok", name: "TikTok", color: "#25f4ee", letter: "T", note: "Public posting after TikTok app review" },
];

type Account = { id: string; handle: string; autopost: boolean };
const minPlanFor = (p: StorageProvider) => PLANS.find((pl) => pl.limits.storage.includes(p))!;

export default function IntegrationsPage() {
  const plan = usePlan();
  const perPlatform = Math.min(plan.limits.accountsPerPlatform, MAX_ACCOUNTS_PER_PLATFORM);

  const [storage, setStorage] = useState<Partial<Record<StorageProvider, { folder: string; auto: boolean }>>>({ gdrive: { folder: "My Drive / GTA6 Trim", auto: true } });
  const [accounts, setAccounts] = useState<Record<SocialPlatform, Account[]>>({
    instagram: [{ id: "a1", handle: "@gta6trim", autopost: true }],
    facebook: [],
    youtube: [{ id: "a2", handle: "GTA6 Trim", autopost: true }, { id: "a3", handle: "GTA 6 Moments", autopost: false }],
    tiktok: [{ id: "a4", handle: "@gta6trim", autopost: true }],
  });
  const [connecting, setConnecting] = useState<{ kind: "storage"; id: StorageProvider } | { kind: "social"; id: SocialPlatform } | null>(null);
  const [busy, setBusy] = useState(false);

  const target = connecting ? (connecting.kind === "storage" ? STORAGE.find((s) => s.id === connecting.id)! : SOCIAL.find((s) => s.id === connecting.id)!) : null;

  // Mock OAuth: real version redirects to the provider's consent screen and stores the refresh token server-side.
  const authorize = () => {
    if (!connecting) return;
    setBusy(true);
    setTimeout(() => {
      if (connecting.kind === "storage") {
        setStorage((s) => ({ ...s, [connecting.id]: { folder: connecting.id === "gdrive" ? "My Drive / GTA6 Trim" : "/Apps/GTA6 Trim", auto: true } }));
      } else {
        const id = connecting.id;
        setAccounts((a) => {
          const n = a[id].length + 1;
          return { ...a, [id]: [...a[id], { id: `${id}-${Date.now()}`, handle: id === "youtube" || id === "facebook" ? `GTA Clips ${n}` : `@gtaclips.${n}`, autopost: true }] };
        });
      }
      setBusy(false);
      setConnecting(null);
    }, 1200);
  };

  return (
    <>
      <PageTitle title="Integrations"
        art="dusk" sub="Save clips to your cloud storage and auto-post them to your social accounts" />

      {/* ---------- Storage ---------- */}
      <SectionLabel right={<span className="text-xs text-subtle">Clips upload as 1080p MP4 + caption file</span>}>Cloud storage</SectionLabel>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STORAGE.map((p, i) => {
          const conn = storage[p.id];
          const allowed = plan.limits.storage.includes(p.id);
          return (
            <motion.section key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: T.slow, ease: EASE_OUT, delay: i * 0.05 }} className={`panel flex flex-col p-4 ${conn ? "!border-green/30" : ""}`}>
              <div className="flex items-center gap-3">
                <Mark letter={p.letter} color={p.color} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={conn ? "on" : "off"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="text-xs">
                      {conn ? <span className="inline-flex items-center gap-1 text-green"><Check className="size-3" /> Connected</span> : <span className="text-subtle">Not connected</span>}
                    </motion.div>
                  </AnimatePresence>
                </div>
                {!allowed ? <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-inset ring-white/10"><Lock className="size-3" />{minPlanFor(p.id).name}</span> : null}
              </div>

              {conn ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-muted"><FolderOpen className="size-3.5 shrink-0" /><span className="truncate">{conn.folder}</span></div>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-muted">Auto-upload new clips</span>
                    <Toggle on={conn.auto} onChange={(v) => setStorage((s) => ({ ...s, [p.id]: { ...conn, auto: v } }))} label={`Auto-upload to ${p.name}`} />
                  </label>
                  <button onClick={() => setStorage((s) => { const n = { ...s }; delete n[p.id]; return n; })} className="text-subtle transition-colors duration-150 hover:text-red">Disconnect</button>
                </div>
              ) : (
                <div className="mt-auto pt-4">
                  {allowed ? (
                    <button onClick={() => setConnecting({ kind: "storage", id: p.id })} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90">
                      Connect {p.name}
                    </button>
                  ) : (
                    <Link href="/dashboard/billing" className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-line-strong text-sm text-muted transition-colors duration-150 hover:text-text">Upgrade to unlock</Link>
                  )}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>

      {/* ---------- Social ---------- */}
      <SectionLabel
        right={
          <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
            <ShieldCheck className="size-3.5" />
            {plan.name}: {perPlatform} per platform · max {MAX_ACCOUNTS_PER_PLATFORM} on any plan
          </span>
        }
      >
        Auto-post accounts
      </SectionLabel>
      <div className="grid gap-4 lg:grid-cols-2">
        {SOCIAL.map((p, i) => {
          const list = accounts[p.id];
          const atPlan = list.length >= perPlatform;
          const atMax = list.length >= MAX_ACCOUNTS_PER_PLATFORM;
          return (
            <motion.section key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: T.slow, ease: EASE_OUT, delay: 0.15 + i * 0.05 }} className="panel p-4">
              <div className="flex items-center gap-3">
                <Mark letter={p.letter} color={p.color} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-subtle">{p.note}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="num text-sm">{list.length} / {perPlatform}</div>
                  <div className="mt-1 flex justify-end gap-1" aria-hidden>
                    {Array.from({ length: MAX_ACCOUNTS_PER_PLATFORM }, (_, k) => (
                      <motion.span
                        key={k}
                        className="h-1 w-4 rounded-full"
                        animate={{ backgroundColor: k < list.length ? "rgb(255,46,136)" : k < perPlatform ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)" }}
                        transition={{ duration: T.base }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                <AnimatePresence initial={false}>
                  {list.map((a) => (
                    <motion.li
                      key={a.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: T.quick } }}
                      transition={{ duration: T.base, ease: EASE_OUT, layout: SPRING }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2">
                        <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold">{a.handle.replace(/[@.]/g, "").slice(0, 2).toUpperCase()}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{a.handle}</span>
                        <span className="hidden text-xs text-subtle sm:inline">Auto-post</span>
                        <Toggle on={a.autopost} onChange={(v) => setAccounts((s) => ({ ...s, [p.id]: s[p.id].map((x) => (x.id === a.id ? { ...x, autopost: v } : x)) }))} label={`Auto-post to ${a.handle}`} />
                        <button onClick={() => setAccounts((s) => ({ ...s, [p.id]: s[p.id].filter((x) => x.id !== a.id) }))} className="grid size-7 place-items-center rounded-md text-subtle transition-colors duration-150 hover:bg-red/10 hover:text-red" aria-label={`Remove ${a.handle}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-3">
                {!atPlan ? (
                  <button onClick={() => setConnecting({ kind: "social", id: p.id })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm transition-colors duration-150 hover:bg-white/[0.05]">
                    <Plus className="size-4" /> Add {p.name} account
                  </button>
                ) : atMax ? (
                  <p className="text-xs text-subtle">Maximum of {MAX_ACCOUNTS_PER_PLATFORM} {p.name} accounts reached.</p>
                ) : (
                  <p className="text-xs text-subtle">
                    {plan.name} allows {perPlatform} {p.name} {perPlatform === 1 ? "account" : "accounts"}. <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Upgrade</Link> to add up to {MAX_ACCOUNTS_PER_PLATFORM}.
                  </p>
                )}
              </div>
            </motion.section>
          );
        })}
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-subtle">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        We only ask for permission to upload files we create and to publish posts. We never read your other files or messages, and you can disconnect anytime.
      </p>

      {/* Mock OAuth consent step */}
      <Modal open={!!connecting} onClose={() => !busy && setConnecting(null)} title={target ? `Connect ${target.name}` : "Connect"}>
        {target ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Mark letter={target.letter} color={target.color} size={44} />
              <div className="text-sm text-muted">
                You&apos;ll sign in with {"via" in target ? target.via : target.name} and approve GTA6 Trim. We&apos;ll come straight back here.
              </div>
            </div>
            <ul className="space-y-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
              {(connecting?.kind === "storage"
                ? ["Create a GTA6 Trim folder", "Upload clips we make for you", "No access to your other files"]
                : ["Publish videos you approve (or auto-post)", "Read basic profile info and post status", "No access to messages or followers"]
              ).map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="size-4 text-green" />{t}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button disabled={busy} onClick={() => setConnecting(null)} className="h-9 rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors duration-150 hover:text-text disabled:opacity-40">Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={authorize} disabled={busy} className="inline-flex h-9 min-w-36 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors duration-150 hover:bg-white/90">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={busy ? "b" : "i"} className="inline-flex items-center gap-2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }} transition={SPRING_EVENT}>
                    {busy ? <><Loader2 className="size-4 animate-spin" /> Connecting…</> : <>Continue to {"via" in target ? target.via : target.name}</>}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
