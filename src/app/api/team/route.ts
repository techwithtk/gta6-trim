import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth-server";
import { planById } from "@/lib/plans";
import { worker, workerConfigured } from "@/lib/worker";

/** Only the owner of a plan with seats (Studio) manages the team; members never can. */
async function owner(req: NextRequest) {
  const s = await readSession(req);
  if (!s) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  if (s.ws) return { error: NextResponse.json({ error: `You're on ${s.wsName ?? "someone else"}'s team. Only the owner can manage seats.` }, { status: 403 }) };
  const seats = s.plan ? planById(s.plan).limits.seats : 0;
  if (seats < 2) return { error: NextResponse.json({ error: "Team seats are on the Studio plan." }, { status: 403 }) };
  if (!workerConfigured()) return { error: NextResponse.json({ error: "Try again in a minute." }, { status: 503 }) };
  return { s, max: seats - 1 };
}

const offline = () => NextResponse.json({ error: "Couldn't reach the server. Try again in a minute." }, { status: 503 });

/** GET /api/team → {seats:[{email, createdAt}], max} */
export async function GET(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  try {
    const r = await worker(`/seats?owner=${encodeURIComponent(o.s.uid)}`);
    const d = await r.json();
    return NextResponse.json({ seats: d.seats ?? [], max: o.max }, { status: r.status });
  } catch {
    return offline();
  }
}

/** POST /api/team {email} → invite. They get access when they sign in to GTA6 Trim with that email. */
export async function POST(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  const b = (await req.json().catch(() => ({}))) as { email?: string };
  try {
    const r = await worker("/seats", { method: "POST", body: JSON.stringify({ owner: o.s.uid, email: b.email ?? "", max: o.max, ownerEmail: o.s.email }) });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return offline();
  }
}

/** DELETE /api/team?email= → remove a seat. The person loses access within about 30 minutes. */
export async function DELETE(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  try {
    const r = await worker("/seats/remove", { method: "POST", body: JSON.stringify({ owner: o.s.uid, email: req.nextUrl.searchParams.get("email") ?? "" }) });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch {
    return offline();
  }
}
