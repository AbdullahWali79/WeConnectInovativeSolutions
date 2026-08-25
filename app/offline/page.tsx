import Link from "next/link";

export const metadata = { title: "You're Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--wc-bg)] px-6 py-16 text-center">
      <section className="wc-card w-full max-w-lg p-8 sm:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--wc-surface-low)] text-[var(--wc-primary)]">
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">wifi_off</span>
        </div>
        <h1 className="text-3xl font-black text-[var(--wc-on-surface)]">You’re offline</h1>
        <p className="mt-4 text-[var(--wc-on-surface-variant)]">
          Please check your internet connection. Pages you visited earlier may still be available.
        </p>
        <Link className="wc-primary-btn mt-8" href="/">Try again</Link>
      </section>
    </main>
  );
}
