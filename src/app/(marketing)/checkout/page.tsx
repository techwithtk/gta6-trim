import { Suspense } from "react";
import { CheckoutForm } from "./CheckoutForm";
import { SiteChrome } from "@/components/SiteChrome";
import { paymentsConfigured } from "@/lib/dodo";

export const metadata = { title: "Checkout — GTA6 Trim" };

export default function CheckoutPage() {
  return (
    <SiteChrome>
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted">Loading checkout…</div>}>
      <CheckoutForm live={paymentsConfigured()} />
    </Suspense>
    </SiteChrome>
  );
}
