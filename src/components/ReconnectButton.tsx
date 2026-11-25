"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { SocialAccount } from "@/lib/social";

/** Sends the customer to the platform's own login page to log this same account in again (same slot, same auto-post settings). */
export function ReconnectButton({ account, className = "" }: { account: Pick<SocialAccount, "id" | "platform">; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/social/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ platform: account.platform, accountId: account.id }) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error ?? "Couldn't start reconnecting.");
      window.location.assign(d.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start reconnecting.");
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button onClick={go} disabled={busy} className={`inline-flex h-8 items-center gap-1.5 bg-pink px-3 text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${className}`}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Reconnect
      </button>
      {error ? <span className="text-xs text-red">{error}</span> : null}
    </span>
  );
}
