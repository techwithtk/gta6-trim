import { PaperFooter, PaperNav } from "@/components/PaperChrome";

/** Landing-style header + footer for checkout, login and legal pages. `.paper-chrome` re-maps the app's dark tokens to paper & ink. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp paper-chrome paper-grain relative flex min-h-screen flex-col overflow-x-clip">
      <PaperNav />
      <main className="relative z-[1] flex-1 pb-24">{children}</main>
      <PaperFooter />
    </div>
  );
}
