import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata = { title: "Log in — GTA6 Trim" };

/** Clerk's sign-in (with sign-up built in): Google, Discord, Twitch or email. */
export default function LoginPage() {
  return (
    <SiteChrome>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Suspense fallback={<div className="h-[420px] w-full max-w-sm animate-pulse rounded-2xl bg-surface" />}>
          <SignIn routing="path" path="/login" withSignUp fallbackRedirectUrl="/dashboard" />
        </Suspense>
        <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-subtle">
          Use the same email you pay with — your plan is linked to it. By continuing you agree to the{" "}
          <a href="/terms" className="underline underline-offset-2">Terms</a> and <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </SiteChrome>
  );
}
