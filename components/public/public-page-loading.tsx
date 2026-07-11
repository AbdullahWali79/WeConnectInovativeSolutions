import { PublicHeader } from "@/components/public/public-header";

export function PublicPageLoading({
  titleWidth = "w-72",
  cards = 6,
}: {
  titleWidth?: string;
  cards?: number;
}) {
  return (
    <main className="bg-background text-on-background">
      <PublicHeader />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,var(--wc-surface-lowest)_0%,var(--wc-surface)_100%)] py-16 md:py-20">
        <div className="homepage-wide-container">
          <div className="max-w-3xl space-y-4">
            <div className="h-9 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className={`h-12 ${titleWidth} max-w-full animate-pulse rounded-2xl bg-slate-200`} />
            <div className="h-5 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" />
            <div className="h-5 w-4/5 max-w-xl animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,var(--wc-surface-low)_0%,var(--wc-surface)_100%)] py-12 md:py-16">
        <div className="homepage-wide-container">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: cards }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-[#DDE6F5] bg-white shadow-sm" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
