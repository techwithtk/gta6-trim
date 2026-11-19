import { LEGAL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — GTA6 Trim", description: "What GTA6 Trim collects, why, and your choices." };

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal information {LEGAL.operator} (&quot;{LEGAL.product}&quot;, &quot;we&quot;) collects when you use {LEGAL.site}, why, who we share it with and the choices
          you have. We keep collection to what the service needs and we never sell your data.
        </p>
      }
      sections={[
        {
          h: "What we collect",
          body: (
            <ul>
              <li><strong>Account:</strong> your name, email address and profile photo from Google when you sign in.</li>
              <li><strong>Billing:</strong> your plan, subscription status and the name and email used at checkout, from Dodo Payments. Card details go directly to Dodo; we never receive your full card number.</li>
              <li><strong>Your work:</strong> the streams and videos you choose, the clips, captions, titles and settings you create, and links you paste.</li>
              <li><strong>Connected accounts:</strong> when you connect TikTok, YouTube, Instagram, Facebook, Google Drive, Dropbox, OneDrive or Box, we store the access tokens those platforms give us and basic account details (such as the handle). We use them only to do what you ask, like posting an approved clip or saving a file.</li>
              <li><strong>Technical:</strong> basic logs (IP address, browser, pages, errors) kept for security and debugging.</li>
              <li><strong>Public stream data:</strong> stream titles, channel names, viewer counts and chat activity published by Twitch and other platforms, used to find highlight moments.</li>
            </ul>
          ),
        },
        {
          h: "How we use it",
          body: (
            <ul>
              <li>to run your account, check which plan you&apos;ve paid for, and provide the features of that plan;</li>
              <li>to find moments, cut clips, write captions and titles, save files and post where you tell us to;</li>
              <li>to send receipts, security and service notices (no marketing emails unless you opt in);</li>
              <li>to prevent fraud and abuse, and to comply with the law.</li>
            </ul>
          ),
        },
        {
          h: "Who we share it with",
          body: (
            <>
              <p>We share data only with service providers that help us run {LEGAL.product}, and only what they need:</p>
              <ul>
                <li><strong>Dodo Payments</strong>: payments, invoices and tax (Merchant of Record).</li>
                <li><strong>Google</strong>: sign-in.</li>
                <li><strong>Vercel</strong>: website hosting.</li>
                <li><strong>Streaming platforms</strong> (Twitch, and Kick/YouTube when added): to read public stream information.</li>
                <li><strong>Platforms you connect</strong>: to post or save the clips you approve.</li>
                <li><strong>AI providers</strong>: transcripts and short text are sent to an AI model to suggest clips, captions, titles and hashtags. They are not used to train public models under our agreements where available.</li>
              </ul>
              <p>We may also disclose information if required by law or to protect our users and service. We do not sell or rent personal data, and we don&apos;t use advertising trackers.</p>
            </>
          ),
        },
        {
          h: "Cookies",
          body: (
            <ul>
              <li><strong>gt_session</strong>: keeps you signed in (up to 30 days). Strictly necessary.</li>
              <li><strong>gt_oauth</strong>: protects the Google sign-in step; deleted after about 10 minutes.</li>
            </ul>
          ),
        },
        {
          h: "How long we keep it",
          body: <p>We keep your data while your account is active. If you ask us to delete your account we remove your personal data and clips within 30 days, except records we must keep by law (for example billing records, which Dodo Payments keeps as Merchant of Record) and short-lived backups that expire on their own.</p>,
        },
        {
          h: "Your choices and rights",
          body: (
            <>
              <p>You can disconnect any linked platform in Integrations at any time. You can also ask us to access, correct, export or delete your personal data, or object to how we use it, by emailing <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We reply within 30 days.</p>
              <p>Depending on where you live (for example the EU/UK under GDPR, California under CCPA, or India under the DPDP Act) you may have further rights, including complaining to your data-protection authority.</p>
            </>
          ),
        },
        {
          h: "Security",
          body: <p>Data is encrypted in transit (HTTPS). Secrets and access tokens are stored encrypted and only used by our servers. No system is perfectly secure; if a breach affects you we&apos;ll tell you as the law requires.</p>,
        },
        {
          h: "International transfers",
          body: <p>Our providers may process data in countries other than yours, including the United States. Where required, we rely on safeguards such as standard contractual clauses.</p>,
        },
        {
          h: "Children",
          body: <p>{LEGAL.product} is not for children under 16, and paid plans require you to be 18 or the age of majority. We don&apos;t knowingly collect data from children; contact us and we&apos;ll delete it.</p>,
        },
        {
          h: "Changes and contact",
          body: (
            <p>
              We&apos;ll post updates here and email you about significant changes. Questions or requests: {LEGAL.operator} · <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
