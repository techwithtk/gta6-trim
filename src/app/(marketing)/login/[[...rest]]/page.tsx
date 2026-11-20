import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/ui/themes";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata = { title: "Log in — GTA6 Trim" };

/** Clerk's sign-in (with sign-up built in), styled to match the landing page. */
export default function LoginPage() {
  return (
    <SiteChrome>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-2)]">Backstage pass</p>
        <h1 className="mb-8 mt-2 text-center text-[clamp(52px,9vw,80px)]">Log <span className="text-[var(--fluo)] [-webkit-text-stroke:2px_var(--ink)]">in.</span></h1>
        <Suspense fallback={<div className="h-[420px] w-full max-w-sm animate-pulse border-2 border-[var(--ink)] bg-surface" />}>
          <SignIn
            routing="path"
            path="/login"
            withSignUp
            fallbackRedirectUrl="/dashboard"
            appearance={{
              theme: neobrutalism,
              // Override every colour the site-wide dark theme sets, or inputs inherit white text on this white form.
              variables: {
                colorPrimary: "#ff2e88", colorPrimaryForeground: "#ffffff",
                colorBackground: "#fbf8f1", colorForeground: "#0d0d0c",
                colorInput: "#ffffff", colorInputForeground: "#0d0d0c",
                colorNeutral: "#0d0d0c", colorMutedForeground: "#4a4743", colorMuted: "#f5f0e6",
                borderRadius: "0",
              },
            }}
          />
        </Suspense>
        <p className="mt-8 max-w-sm text-center text-xs leading-relaxed text-muted">
          Use the same email you pay with — your plan is linked to it. By continuing you agree to the{" "}
          <a href="/terms" className="underline underline-offset-2">Terms</a> and <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </SiteChrome>
  );
}
