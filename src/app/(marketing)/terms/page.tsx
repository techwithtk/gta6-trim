import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of Service — GTA6 Trim", description: "The rules for using GTA6 Trim." };

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you and {LEGAL.operator} (&quot;{LEGAL.product}&quot;, &quot;we&quot;, &quot;us&quot;) for using {LEGAL.site} and the
          {` ${LEGAL.product}`} app. By creating an account or paying for a plan you agree to them. If you don&apos;t agree, please don&apos;t use the service.
        </p>
      }
      sections={[
        {
          h: "What GTA6 Trim does",
          body: (
            <>
              <p>{LEGAL.product} helps you find moments in live game streams and long videos, cut them into short vertical clips, add captions, save them to cloud storage and post them to social platforms you connect.</p>
              <p>
                {LEGAL.product} is an independent tool. It is <strong>not affiliated with, endorsed or sponsored by</strong> Rockstar Games, Take-Two Interactive, Twitch, Kick, YouTube, Google,
                TikTok or Meta. All trademarks belong to their owners. Stream listings use public information from those platforms.
              </p>
            </>
          ),
        },
        {
          h: "Your account",
          body: (
            <ul>
              <li>You sign in with Google. You must be at least 18, or the age of majority where you live, to buy a plan.</li>
              <li>One account is for one person or one business. Keep your Google account secure; you are responsible for activity on your account.</li>
              <li>Give us accurate information and keep your email current, because receipts and account notices go there.</li>
            </ul>
          ),
        },
        {
          h: "Content you clip: you need permission",
          body: (
            <>
              <p>
                <strong>Only clip, edit and post content you own or have permission to use.</strong> That means your own streams, or streams and videos whose creator allows it
                (for example a paid clipping campaign or written permission). The app asks you to confirm this before clipping someone else&apos;s content.
              </p>
              <p>You are responsible for the clips you create and post, including following copyright law and each platform&apos;s rules. We may remove clips or suspend accounts that infringe other people&apos;s rights.</p>
              <p>
                Copyright owners can send takedown requests to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with the content&apos;s location, proof of ownership and contact details. We act on valid requests promptly and may suspend repeat infringers.
              </p>
            </>
          ),
        },
        {
          h: "Acceptable use",
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>spam, mass-post duplicate content, or use the service to break any platform&apos;s terms (TikTok, YouTube, Instagram, Facebook, Twitch, Kick, Google Drive and others);</li>
                <li>impersonate creators or mislead viewers about who made a clip;</li>
                <li>post illegal, hateful, sexual or violent content involving real people, or anything that harms minors;</li>
                <li>try to get around plan limits (including the limit of 3 connected accounts per social platform), resell access, or share one account between many people;</li>
                <li>attack, overload, reverse-engineer or scrape the service.</li>
              </ul>
            </>
          ),
        },
        {
          h: "Connected platforms",
          body: (
            <p>
              Posting and cloud saving work through the official APIs of TikTok, YouTube, Instagram, Facebook, Google Drive, Dropbox, OneDrive and Box. Those companies can change or limit their
              APIs at any time, and some (for example TikTok public posting) require their own review. We can&apos;t guarantee any third-party platform will accept every post. You can disconnect an
              account at any time in Integrations.
            </p>
          ),
        },
        {
          h: "Plans, billing and renewal",
          body: (
            <>
              <p>
                Payments are processed by <strong>Dodo Payments</strong>, which acts as our online reseller and Merchant of Record. Dodo handles card details, invoices and sales tax/VAT/GST; we never
                see or store your full card number.
              </p>
              <ul>
                <li>Plans are subscriptions billed monthly or yearly in advance. Prices are listed in USD; taxes are added at checkout and your bank may show a local-currency amount.</li>
                <li>Your plan <strong>renews automatically</strong> at the end of each billing period until you cancel.</li>
                <li>You can upgrade, downgrade or cancel anytime in <strong>Plan &amp; billing</strong>. Plan changes are prorated. When you cancel, you keep access until the end of the period you paid for and are not charged again.</li>
                <li>Each plan has the limits shown on the pricing page (live streams at once, videos, clips per month, connected accounts). Unused allowance does not roll over.</li>
                <li>We may change prices for future billing periods; we&apos;ll email you at least 14 days before a change affects you.</li>
              </ul>
            </>
          ),
        },
        {
          h: "Refunds",
          body: (
            <p>
              Refunds are covered by our <Link href="/refunds">Refund Policy</Link>.
            </p>
          ),
        },
        {
          h: "Who owns what",
          body: (
            <>
              <p>You keep any rights you have in the content you upload, clip or create. You give us permission to store, process and transmit it only to provide the service to you (for example to cut, caption, save and post your clips).</p>
              <p>The {LEGAL.product} software, design and brand belong to us. Don&apos;t copy or resell them.</p>
            </>
          ),
        },
        {
          h: "Service changes and availability",
          body: <p>We work to keep the service running, but it may sometimes be unavailable for maintenance or because of problems with streaming or social platforms. We may add, change or remove features; if we remove a core feature of your paid plan we&apos;ll offer a prorated refund.</p>,
        },
        {
          h: "Suspension and termination",
          body: <p>You can stop using the service and cancel at any time. We may suspend or close accounts that break these terms, infringe others&apos; rights or put the service at risk. Where reasonable we&apos;ll warn you first and explain why.</p>,
        },
        {
          h: "Disclaimers",
          body: <p>The service is provided &quot;as is&quot;. We don&apos;t promise that any clip will get views, followers or income, that hype detection will catch every moment, or that the service will be error-free.</p>,
        },
        {
          h: "Limitation of liability",
          body: <p>To the extent the law allows, we are not liable for indirect or consequential losses (such as lost profits, lost data or account strikes on third-party platforms), and our total liability for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer-protection law.</p>,
        },
        {
          h: "Changes to these terms",
          body: <p>We may update these terms. For significant changes we&apos;ll email you or show a notice in the app at least 14 days before they take effect. Continuing to use the service after that means you accept the new terms.</p>,
        },
        {
          h: "Contact",
          body: (
            <p>
              {LEGAL.operator} · <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
