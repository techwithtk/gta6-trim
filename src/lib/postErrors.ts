/** Quick plain-words reading of common posting errors (the AI explainer covers the rest). */
const RULES: { re: RegExp; reason: string; fix: string }[] = [
  { re: /token|expired|re-?auth|unauthori[sz]ed|permission|revoked|401|403/i, reason: "The connection to this account expired or lost permission.", fix: "Open Integrations, disconnect the account and connect it again, then retry." },
  { re: /business|creator|professional account/i, reason: "Instagram only allows posting to Business or Creator accounts.", fix: "In the Instagram app: Settings → Account type → switch to Creator or Business, then reconnect it." },
  { re: /duration|too long|too short|length/i, reason: "The video length isn't allowed on this platform.", fix: "Trim the clip in the editor (Shorts and Reels: under 90 seconds is safest), then post again." },
  { re: /aspect|resolution|dimension|ratio/i, reason: "The platform didn't accept the video's size.", fix: "Re-render the clip from the editor and try again. If it keeps failing, contact support." },
  { re: /rate|limit|too many|quota|spam/i, reason: "The platform is limiting how often this account can post.", fix: "Wait a few hours before posting again, and post less often (auto-post: every 2–3 hours)." },
  { re: /duplicate|already posted|same content/i, reason: "The platform thinks this video was already posted.", fix: "Edit the clip (trim or change the hook) so it's different, or post a different clip." },
  { re: /copyright|music|rights/i, reason: "The platform flagged the audio or content for rights reasons.", fix: "Only post streams you have permission to repost; try a clip with less background music." },
  { re: /private|privacy|unverified/i, reason: "The account's privacy settings blocked a public post.", fix: "Make sure the account can post publicly (TikTok: unverified apps may only post privately until reviewed)." },
  { re: /download|fetch|url|media|file/i, reason: "The posting service couldn't download the video.", fix: "Retry the post. If the clip is older than 7 days, re-render it in the editor first." },
];

export function quickReason(error?: string): { reason: string; fix: string } | null {
  if (!error) return null;
  return RULES.find((r) => r.re.test(error)) ?? null;
}
