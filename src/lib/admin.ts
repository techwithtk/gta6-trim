import "server-only";
import type { Session } from "@/lib/session";

/** Site owners: emails in ADMIN_EMAILS (comma-separated, set in Vercel). Nobody is an admin when it's unset. */
export function isAdmin(s: Pick<Session, "email"> | null | undefined): boolean {
  if (!s?.email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(s.email.toLowerCase());
}
