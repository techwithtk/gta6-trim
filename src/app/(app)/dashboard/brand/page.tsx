"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Loader2, Lock, Trash2 } from "lucide-react";
import { usePlan } from "@/lib/account";
import { BRAND_STYLES, DEFAULT_BRAND, HANDLE_RE, type Brand } from "@/lib/brand";

/** Caption style, colours, logo and @handle, burned into every new Short (and any clip the customer edits). */
export default function BrandPage() {
  const plan = usePlan();
  const maxStyles = plan.limits.captionStyles;
  const custom = plan.id !== "starter";
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [saved, setSaved] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "logo" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/brand", { cache: "no-store" }).then(async (r) => {
      const d = await r.json();
      if (r.ok) { setBrand({ ...DEFAULT_BRAND, ...d.brand }); setSaved({ ...DEFAULT_BRAND, ...d.brand }); }
      else setMsg({ ok: false, text: d.error ?? "Couldn't load your brand kit." });
    }).catch(() => setMsg({ ok: false, text: "Couldn't load your brand kit." })).finally(() => setLoading(false));
  }, []);

  // Live preview, rendered by the same code that renders the clips. Debounced so typing doesn't spam it.
  useEffect(() => {
    if (loading) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const r = await fetch("/api/brand/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brand }), signal: ctrl.signal });
        if (r.ok) {
          const url = URL.createObjectURL(await r.blob());
          setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; });
        }
      } catch { /* aborted or offline: keep the last preview */ }
      setPreviewBusy(false);
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [brand, loading]);

  const set = (p: Partial<Brand>) => { setBrand((b) => ({ ...b, ...p })); setMsg(null); };
  const dirty = !!saved && JSON.stringify(saved) !== JSON.stringify(brand);
  const handleOk = HANDLE_RE.test(brand.handle);

  const save = async () => {
    setBusy("save"); setMsg(null);
    try {
      const r = await fetch("/api/brand", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brand }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Couldn't save.");
      const b = { ...DEFAULT_BRAND, ...d.brand };
      setBrand(b); setSaved(b);
      setMsg({ ok: true, text: "Saved. New clips use your brand kit." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally { setBusy(null); }
  };

  const uploadLogo = async (file: File) => {
    setBusy("logo"); setMsg(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/brand/logo", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Upload failed.");
      setBrand((b) => ({ ...b, logo: true }));
      setSaved((s) => (s ? { ...s, logo: true } : s));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." });
    } finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; }
  };
  const removeLogo = async () => {
    setBusy("logo");
    try {
      await fetch("/api/brand/logo", { method: "DELETE" });
      setBrand((b) => ({ ...b, logo: false }));
      setSaved((s) => (s ? { ...s, logo: false } : s));
    } finally { setBusy(null); }
  };

  return (
    <>
      <div className="mb-7">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Make every clip yours</p>
        <h1 className="mt-1 font-poster text-[clamp(44px,6vw,64px)] font-black uppercase leading-[0.9]">Brand <span className="text-pink">kit.</span></h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Pick a caption style, your colours, and put your logo and @handle on every Short. Applies to new clips and any clip you edit.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          {/* Caption style */}
          <section>
            <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-subtle">Caption style</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRAND_STYLES.map((s, i) => {
                const locked = i >= maxStyles, on = brand.style === s.id;
                return (
                  <li key={s.id}>
                    <button disabled={locked || loading} onClick={() => set({ style: s.id })} aria-pressed={on}
                      className={`relative w-full border bg-black p-3 text-left transition-colors duration-150 ${on ? "border-pink" : "border-line hover:border-white/30"} disabled:cursor-not-allowed disabled:opacity-45`}>
                      <span className="block truncate text-center font-poster text-[20px] font-black uppercase leading-none [text-shadow:0_2px_0_#000]">
                        <span style={{ color: s.text }}>No </span>
                        <span style={{ color: s.box ? s.active : (on && brand.accent) || s.active, background: s.box ? (on && brand.accent) || s.box : undefined, padding: s.box ? "0 4px" : undefined }}>way</span>
                        <span style={{ color: s.text }}> bro</span>
                      </span>
                      <span className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/70">
                        {s.name}
                        {on ? <Check className="size-3 text-pink" /> : locked ? <span className="inline-flex items-center gap-1"><Lock className="size-3" /> Pro</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {maxStyles < BRAND_STYLES.length ? (
              <p className="mt-2 text-xs text-subtle">{maxStyles} styles on your plan. <Link href="/dashboard/billing" className="text-text underline underline-offset-2">Pro</Link> unlocks all {BRAND_STYLES.length}, plus your colours and logo.</p>
            ) : null}
          </section>

          {/* Colours, logo, handle */}
          <section className={custom ? "" : "opacity-50"} inert={!custom}>
            <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-subtle">
              Your colours, logo &amp; handle {custom ? null : <span className="inline-flex items-center gap-1 text-pink"><Lock className="size-3" /> Pro &amp; Studio</span>}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Highlight colour" hint="The word being spoken" value={brand.accent} fallback={BRAND_STYLES.find((s) => s.id === brand.style)?.box ?? BRAND_STYLES.find((s) => s.id === brand.style)?.active ?? "#FF2E88"} onChange={(v) => set({ accent: v })} />
              <ColorField label="Hook colour" hint="Block behind the opening line" value={brand.hookColor} fallback="#FF2E88" onChange={(v) => set({ hookColor: v })} />

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Your @handle</span>
                <input value={brand.handle} onChange={(e) => set({ handle: e.target.value.slice(0, 30) })} placeholder="@yourpage" maxLength={30}
                  className={`h-10 w-full border bg-bg px-3 text-sm outline-none placeholder:text-subtle focus:border-pink ${handleOk ? "border-white/20" : "border-red"}`} />
                <span className={`mt-1 block text-xs ${handleOk ? "text-subtle" : "text-red"}`}>{handleOk ? "Shown small in a top corner. Leave empty for none." : "Letters, numbers, _ . and - only."}</span>
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium">Logo</span>
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  <button onClick={() => fileRef.current?.click()} disabled={busy === "logo"}
                    className="inline-flex h-10 items-center gap-2 border border-white/25 px-3 text-sm hover:border-pink disabled:opacity-50">
                    {busy === "logo" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {brand.logo ? "Replace" : "Upload"}
                  </button>
                  {brand.logo ? (
                    <button onClick={removeLogo} disabled={busy === "logo"} className="inline-flex h-10 items-center gap-1.5 px-2 text-sm text-muted hover:text-red disabled:opacity-50">
                      <Trash2 className="size-4" /> Remove
                    </button>
                  ) : null}
                </div>
                <span className="mt-1 block text-xs text-subtle">PNG with a transparent background looks best. Max 2 MB.</span>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium">Corner</span>
                <div className="flex border border-white/20" role="radiogroup">
                  {([["tl", "Top left"], ["tr", "Top right"]] as const).map(([id, label]) => (
                    <button key={id} role="radio" aria-checked={brand.position === id} onClick={() => set({ position: id })}
                      className={`h-9 flex-1 font-mono text-[11px] font-bold uppercase tracking-wider ${brand.position === id ? "bg-white text-black" : "text-muted hover:text-text"}`}>{label}</button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 flex justify-between text-sm font-medium">Watermark strength <span className="font-mono text-xs text-subtle">{Math.round(brand.opacity * 100)}%</span></span>
                <input type="range" min={30} max={100} step={5} value={Math.round(brand.opacity * 100)} onChange={(e) => set({ opacity: Number(e.target.value) / 100 })} className="mt-3 w-full accent-[var(--pink)]" />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={!dirty || !handleOk || busy === "save"}
              className="inline-flex h-11 items-center gap-2 border-2 border-black bg-pink px-5 font-poster text-[18px] font-black uppercase text-black shadow-[3px_3px_0_#fafafa] disabled:opacity-40 disabled:shadow-none">
              {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : null} Save brand kit
            </button>
            {msg ? <p className={`text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p> : dirty ? <p className="text-sm text-subtle">Unsaved changes</p> : null}
          </div>
        </div>

        {/* Preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-subtle">Preview</h2>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden border border-line bg-surface">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="How your Shorts will look" className="size-full object-cover" />
            ) : <div className="size-full animate-pulse bg-surface" />}
            {previewBusy ? <Loader2 className="absolute right-2 top-2 size-4 animate-spin text-white/70" /> : null}
          </div>
          <p className="mt-2 text-center text-xs text-subtle">Drawn by the same engine that makes your clips.</p>
        </aside>
      </div>
    </>
  );
}

function ColorField({ label, hint, value, fallback, onChange }: { label: string; hint: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value || fallback} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label}
          className="h-10 w-14 cursor-pointer border border-white/20 bg-bg p-1" />
        <span className="font-mono text-xs text-muted">{value || "Style default"}</span>
        {value ? <button onClick={() => onChange("")} className="font-mono text-[10.5px] uppercase tracking-wider text-subtle hover:text-text">Reset</button> : null}
      </div>
      <span className="mt-1 block text-xs text-subtle">{hint}</span>
    </div>
  );
}
