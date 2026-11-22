import { NextResponse, type NextRequest } from "next/server";
import { brandCapsFor, requirePlan, worker } from "@/lib/worker";
import { BRAND_STYLES, HANDLE_RE, HEX_RE, type Brand } from "@/lib/brand";

const offline = () => NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });

/** GET /api/brand → the customer's brand kit + what their plan unlocks. */
export async function GET(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  try {
    const res = await worker(`/brand?uid=${encodeURIComponent(r.s.uid)}`);
    return NextResponse.json({ brand: await res.json(), caps: brandCapsFor(r.s.plan) }, { status: res.ok ? 200 : res.status });
  } catch {
    return offline();
  }
}

/** POST /api/brand {brand} → save. Styles and custom options the plan doesn't include are refused. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  const caps = brandCapsFor(r.s.plan);
  const b = ((await req.json().catch(() => ({}))) as { brand?: Partial<Brand> }).brand ?? {};
  const idx = BRAND_STYLES.findIndex((s) => s.id === b.style);
  if (idx < 0) return NextResponse.json({ error: "Pick a caption style." }, { status: 400 });
  if (idx >= caps.styles) return NextResponse.json({ error: "That caption style is on Pro and Studio." }, { status: 403 });
  const custom = !!(b.accent || b.hookColor || b.handle || b.logo);
  if (custom && !caps.custom) return NextResponse.json({ error: "Brand colours, logo and @handle are on Pro and Studio." }, { status: 403 });
  if ((b.accent && !HEX_RE.test(b.accent)) || (b.hookColor && !HEX_RE.test(b.hookColor))) return NextResponse.json({ error: "Colours must look like #FF2E88." }, { status: 400 });
  if (b.handle && !HANDLE_RE.test(b.handle)) return NextResponse.json({ error: "Your @handle can use letters, numbers, _ . and - (30 max)." }, { status: 400 });
  try {
    const res = await worker("/brand", { method: "POST", body: JSON.stringify({ uid: r.s.uid, brand: b }) });
    return NextResponse.json({ brand: await res.json() }, { status: res.ok ? 200 : res.status });
  } catch {
    return offline();
  }
}
