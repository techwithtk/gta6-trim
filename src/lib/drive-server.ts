import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

/** Only files GTA6 Trim creates: we never see the rest of the customer's Drive. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** A fresh Google access token with Drive permission for this user, or null if Drive isn't connected. Clerk refreshes it. */
export async function driveToken(uid: string): Promise<string | null> {
  try {
    const c = await clerkClient();
    const r = await c.users.getUserOauthAccessToken(uid, "google");
    const t = r.data.find((x) => (x.scopes ?? []).some((s) => s.includes("drive.file")));
    return t?.token ?? null;
  } catch {
    return null;
  }
}
