import { NextResponse, type NextRequest } from "next/server";
import { requirePlan } from "@/lib/worker";
import { allowed, authUrl, configured, isProvider, LABEL } from "@/lib/storage-server";

/** GET /api/drive/{dropbox|onedrive}/connect → redirects to the provider's own sign-in page. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  if (!configured(provider)) return NextResponse.json({ error: `${LABEL[provider]} is coming soon.` }, { status: 503 });
  if (!allowed(r.s.plan, provider)) return NextResponse.json({ error: `${LABEL[provider]} is on Pro and Studio.` }, { status: 403 });
  return NextResponse.redirect(authUrl(provider, new URL(req.url).origin, r.s.self ?? r.s.uid));
}
