import { NextResponse, type NextRequest } from "next/server";
import { requirePlan } from "@/lib/worker";
import { allowed, configured, connect, isProvider, readState } from "@/lib/storage-server";

/** OAuth return from Dropbox / Microsoft. The signed state must match the signed-in person (stops CSRF / mix-ups). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/integrations?${q}`, url.origin));
  if (!isProvider(provider) || !configured(provider)) return back("storage_error=unavailable");
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const me = r.s.self ?? r.s.uid;
  if (url.searchParams.get("error")) return back(`storage_error=denied&provider=${provider}`);
  if (readState(url.searchParams.get("state"), provider) !== me) return back(`storage_error=expired&provider=${provider}`);
  if (!allowed(r.s.plan, provider)) return back(`storage_error=plan&provider=${provider}`);
  const code = url.searchParams.get("code");
  if (!code) return back(`storage_error=denied&provider=${provider}`);
  try {
    await connect(provider, me, code, url.origin);
    return back(`storage=${provider}`);
  } catch (e) {
    console.error("[storage] connect failed", provider, e instanceof Error ? e.message : e);
    return back(`storage_error=failed&provider=${provider}`);
  }
}
