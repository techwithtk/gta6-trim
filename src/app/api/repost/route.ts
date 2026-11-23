import { NextResponse, type NextRequest } from "next/server";
import { requireStudio } from "@/lib/social-server";
import { checkAutopost } from "@/lib/autopost-server";
import { limitsFor, worker } from "@/lib/worker";

const offline = () => NextResponse.json({ error: "The clipping engine is offline right now. Try again soon." }, { status: 503 });

/** GET /api/repost → this customer's auto-repost settings and last result (Studio). */
export async function GET(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  try {
    const res = await worker(`/repost?uid=${encodeURIComponent(r.s.uid)}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}

/** POST /api/repost {on, accounts, consent, multiple, delayDays} → save. Accounts must be the customer's own. */
export async function POST(req: NextRequest) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const b = (await req.json().catch(() => ({}))) as { on?: boolean; accounts?: string[]; consent?: boolean; multiple?: number; delayDays?: number };
  if (b.on) {
    if (!b.accounts?.length) return NextResponse.json({ error: "Pick at least one account to repost to." }, { status: 400 });
    const ap = await checkAutopost(r.s.uid, limitsFor(r.s.plan), { accounts: b.accounts, consent: b.consent });
    if ("error" in ap) return NextResponse.json({ error: ap.error }, { status: ap.status });
  }
  try {
    const res = await worker("/repost", { method: "POST", body: JSON.stringify({ uid: r.s.uid, on: !!b.on, accounts: b.accounts ?? [], consent: !!b.consent, multiple: b.multiple, delayDays: b.delayDays }) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return offline();
  }
}
