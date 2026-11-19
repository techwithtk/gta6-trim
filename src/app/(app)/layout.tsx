import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { WelcomeBanner } from "@/components/WelcomeBanner";

/** Dashboard area (after purchase). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      {children}
    </Shell>
  );
}
