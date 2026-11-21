import { Suspense } from "react";
import { Big_Shoulders } from "next/font/google";
import { Shell } from "@/components/Shell";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { THEME_BOOT } from "@/lib/theme";

// Same poster headline font as the landing page, so the dashboard reads as the same brand.
const poster = Big_Shoulders({ variable: "--font-poster", subsets: ["latin"], weight: ["700", "800", "900"] });

/** Dashboard area (after purchase). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="gt-app" data-theme="dark" suppressHydrationWarning className={poster.variable}>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <Shell>
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>
        {children}
      </Shell>
    </div>
  );
}
