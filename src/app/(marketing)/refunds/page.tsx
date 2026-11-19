import { LEGAL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Refund Policy — GTA6 Trim", description: "Cancelling and refunds for GTA6 Trim plans." };

export default function Page() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={
        <p>
          We want you to be happy with {LEGAL.product}. This page explains how cancelling and refunds work. Payments are processed by <strong>Dodo Payments</strong>, our Merchant of Record, so
          approved refunds are sent by Dodo to your original payment method.
        </p>
      }
      sections={[
        {
          h: "7-day money-back on your first payment",
          body: (
            <p>
              If {LEGAL.product} isn&apos;t right for you, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> within <strong>7 days of your first payment</strong> for a plan and we&apos;ll refund it in
              full. This applies once per customer.
            </p>
          ),
        },
        {
          h: "Renewals",
          body: (
            <>
              <p>Plans renew automatically. Cancel before your renewal date and you won&apos;t be charged again.</p>
              <p>If you forgot to cancel and the renewal charged in the last <strong>48 hours</strong>, and you haven&apos;t used the service since, email us and we&apos;ll refund that renewal.</p>
            </>
          ),
        },
        {
          h: "How to cancel",
          body: (
            <p>
              Go to <strong>Dashboard → Plan &amp; billing → Invoices, card &amp; cancel</strong>. Cancelling stops future charges; you keep access until the end of the period you already paid for.
              Outside the cases on this page, we don&apos;t refund partly used billing periods.
            </p>
          ),
        },
        {
          h: "Plan changes",
          body: <p>Upgrades and downgrades are prorated automatically: you pay the difference for an upgrade, and a downgrade credits the unused part of your current plan toward future charges.</p>,
        },
        {
          h: "When we refund automatically",
          body: (
            <ul>
              <li>you were charged twice for the same thing;</li>
              <li>a technical fault on our side stopped the service from working for most of a billing period;</li>
              <li>we remove a core feature of your paid plan (prorated refund).</li>
            </ul>
          ),
        },
        {
          h: "When refunds aren't available",
          body: <p>Accounts suspended for breaking our <a href="/terms">Terms</a> (for example clipping content without permission or spamming platforms) aren&apos;t eligible for refunds. This doesn&apos;t affect any rights you have under consumer law.</p>,
        },
        {
          h: "How long refunds take",
          body: <p>We reply to refund requests within 2 business days. Once approved, Dodo Payments sends the refund to your original payment method, usually within 5–10 business days depending on your bank. Taxes are refunded along with the payment.</p>,
        },
        {
          h: "Contact",
          body: (
            <p>
              Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the email on your account and include the date of the charge.
            </p>
          ),
        },
      ]}
    />
  );
}
