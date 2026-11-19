import { Big_Shoulders, Instrument_Serif } from "next/font/google";

const poster = Big_Shoulders({ variable: "--font-poster", subsets: ["latin"], weight: ["700", "800", "900"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["italic", "normal"] });

/** Public site: loads the landing page's editorial fonts. Each page chooses its own chrome. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${poster.variable} ${serif.variable}`}>{children}</div>;
}
