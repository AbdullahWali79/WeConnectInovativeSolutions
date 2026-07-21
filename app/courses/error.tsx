"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/icon";

export default function CoursesError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,var(--wc-surface-lowest)_0%,var(--wc-surface)_100%)] px-5 py-16">
      <div className="max-w-xl rounded-2xl border border-[#DDE6F5] bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF4FF] text-[var(--wc-primary)]">
          <Icon name="error_outline" className="text-3xl" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold text-[#071A3B]">Unable to load courses</h1>
        <p className="mt-3 text-[#5B6B88]">
          There was a problem fetching the course list. You can retry, or return to the homepage while we recover.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="inline-flex items-center justify-center rounded-lg bg-[var(--wc-primary)] px-5 py-3 font-bold text-on-surface shadow-sm hover:shadow-md">
            Retry
          </button>
          <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-[#DDE6F5] px-5 py-3 font-bold text-[var(--wc-primary)] hover:bg-[#EEF4FF]">
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}