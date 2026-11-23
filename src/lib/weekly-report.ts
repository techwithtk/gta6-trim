// The weekly summary email: plain data in, HTML + text out. Pure, so it can be rendered and checked without sending.

export type WeeklyData = {
  name: string;
  planName: string;
  posting: boolean; // plan includes auto-post (Studio)
  clips: number;
  videos: number;
  liveSessions: number;
  posts: number;
  views: number;
  likes: number;
  top?: { title: string; views?: number; score?: number };
  site: string; // https://gta6trim.com
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmt = (n: number) => new Intl.NumberFormat("en", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

export function weeklySubject(d: WeeklyData): string {
  if (d.posting && d.views > 0) return `Your clips got ${fmt(d.views)} views this week`;
  if (d.clips > 0) return `You made ${d.clips} GTA 6 Short${d.clips === 1 ? "" : "s"} this week`;
  return "Your GTA6 Trim week";
}

export function weeklyEmail(d: WeeklyData): { html: string; text: string } {
  const first = esc(d.name.split(" ")[0] || "there");
  const stats: [string, string][] = d.posting
    ? [["Clips made", fmt(d.clips)], ["Posts published", fmt(d.posts)], ["Views", fmt(d.views)], ["Likes", fmt(d.likes)]]
    : [["Clips made", fmt(d.clips)], ["Live sessions", fmt(d.liveSessions)], ["Videos clipped", fmt(d.videos)]];
  const cell = ([label, value]: [string, string]) =>
    `<td style="padding:14px 10px;background:#17171c;border:1px solid #2a2a33;text-align:center;width:${Math.floor(100 / stats.length)}%">
       <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1">${value}</div>
       <div style="margin-top:6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9b9ba8">${label}</div></td>`;
  const top = d.top
    ? `<tr><td style="padding:22px 28px 0">
         <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#FF2E88;font-weight:700">Top clip this week</div>
         <div style="margin-top:6px;font-size:17px;color:#ffffff;font-weight:600">${esc(d.top.title)}</div>
         <div style="margin-top:4px;font-size:13px;color:#9b9ba8">${d.top.views ? `${fmt(d.top.views)} views` : d.top.score ? `Viral score ${(d.top.score * 10).toFixed(1)}/10` : ""}</div>
       </td></tr>`
    : "";
  const nudge = d.clips === 0
    ? "Quiet week. Start a live session or paste a YouTube link and we'll cut the best moments for you."
    : d.posting
      ? "Turn on auto-post for your next live session and the best moments go out while the stream is still running."
      : "Studio posts your best clips to TikTok, YouTube, Instagram and Facebook for you, with views and likes tracked here.";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(weeklySubject(d))}</title></head>
<body style="margin:0;padding:0;background:#0b0b0e;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0e"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#101014;border:1px solid #2a2a33">
  <tr><td style="padding:24px 28px 0"><span style="display:inline-block;background:#FF2E88;color:#000;font-weight:900;font-size:13px;letter-spacing:1px;padding:4px 8px">GTA6 TRIM</span></td></tr>
  <tr><td style="padding:18px 28px 0">
    <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.2">Hey ${first}, here's your week.</div>
    <div style="margin-top:6px;font-size:14px;color:#9b9ba8">${esc(d.planName)} plan · last 7 days</div>
  </td></tr>
  <tr><td style="padding:20px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>${stats.map(cell).join("")}</tr></table></td></tr>
  ${top}
  <tr><td style="padding:22px 28px 0;font-size:14px;line-height:1.5;color:#d6d6de">${esc(nudge)}</td></tr>
  <tr><td style="padding:22px 28px 28px"><a href="${d.site}/dashboard" style="display:inline-block;background:#FF2E88;color:#000000;font-weight:800;text-decoration:none;padding:12px 20px;font-size:15px">Open your dashboard</a></td></tr>
</table>
<div style="max-width:560px;padding:14px 8px;font-size:11px;line-height:1.5;color:#6b6b78">You get this weekly summary because you have a GTA6 Trim plan. To stop it, reply "unsubscribe" or manage your plan at <a href="${d.site}/dashboard/billing" style="color:#9b9ba8">${d.site.replace(/^https?:\/\//, "")}/dashboard/billing</a>.</div>
</td></tr></table></body></html>`;

  const text = [
    `Hey ${d.name.split(" ")[0] || "there"}, here's your GTA6 Trim week (${d.planName} plan).`,
    "",
    ...stats.map(([l, v]) => `${l}: ${v}`),
    ...(d.top ? ["", `Top clip: ${d.top.title}${d.top.views ? ` (${fmt(d.top.views)} views)` : ""}`] : []),
    "",
    nudge,
    "",
    `Open your dashboard: ${d.site}/dashboard`,
    "",
    `To stop these emails, reply "unsubscribe" or visit ${d.site}/dashboard/billing`,
  ].join("\n");
  return { html, text };
}
