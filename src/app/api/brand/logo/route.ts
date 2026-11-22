import { NextResponse, type NextRequest } from "next/server";
import { brandCapsFor, requirePlan, worker } from "@/lib/worker";

const MAX = 2 * 1024 * 1024;

/** POST /api/brand/logo (multipart "file") → upload a logo. DELETE → remove it. Pro and Studio. */
export async function POST(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  if (!brandCapsFor(r.s.plan).custom) return NextResponse.json({ error: "Your logo on clips is on Pro and Studio." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pick an image." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Use an image under 2 MB." }, { status: 400 });
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Use a PNG, JPG or WebP image." }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const res = await worker("/brand/logo", { method: "POST", body: JSON.stringify({ uid: r.s.uid, data }) });
    const d = await res.json();
    return NextResponse.json(res.ok ? { brand: d } : d, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const r = await requirePlan(req);
  if ("error" in r) return r.error;
  try {
    const res = await worker("/brand/logo", { method: "POST", body: JSON.stringify({ uid: r.s.uid, remove: true }) });
    const d = await res.json();
    return NextResponse.json(res.ok ? { brand: d } : d, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Couldn't remove the logo. Try again." }, { status: 503 });
  }
}
