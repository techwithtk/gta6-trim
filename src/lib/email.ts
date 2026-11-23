import "server-only";

/** Transactional email through Resend's HTTP API (no SDK). Off until RESEND_API_KEY is set. */
const KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM || "GTA6 Trim <hello@gta6trim.com>";

export const emailConfigured = () => !!KEY;

export async function sendEmail(m: { to: string; subject: string; html: string; text: string }): Promise<{ ok: boolean; error?: string }> {
  if (!KEY) return { ok: false, error: "no key" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return { ok: true };
    const d = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: d.message ?? `Email service error ${r.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
}
