import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import "./globals.css";
import { SOCIALS } from "@/components/SocialLinks";

const ORG_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GTA6 Trim",
  url: "https://gta6trim.com",
  logo: "https://gta6trim.com/icon.svg",
  email: "hello@gta6trim.com",
  sameAs: SOCIALS.map((s) => s.href),
});

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "GTA6 Trim — Turn live GTA 6 streams into viral Shorts",
  description: "GTA6 Trim finds viral moments in live GTA 6 streams and long YouTube videos, adds captions, and auto-posts Shorts to TikTok, YouTube, Instagram and Facebook.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSONLD }} />
        <ClerkProvider
          signInUrl="/login"
          signUpUrl="/login"
          afterSignOutUrl="/api/auth/logout"
          appearance={{ theme: dark, cssLayerName: "clerk", variables: { colorPrimary: "#ff2e88", colorBackground: "#111114", borderRadius: "0.75rem" } }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
