import { NextResponse, type NextRequest } from "next/server";
import { requireStudio, socialError } from "@/lib/social-server";
import { disconnect } from "@/lib/bundle";

/** DELETE /api/social/accounts/:id → disconnect one of the customer's own accounts. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireStudio(req);
  if ("error" in r) return r.error;
  const { id } = await params;
  try {
    await disconnect(r.s.uid, decodeURIComponent(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return socialError(e);
  }
}
