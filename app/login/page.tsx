import { Suspense } from "react";
import LoginClient from "./login-client";
import { LoadingState } from "@/components/loading-state";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student Login", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--wc-bg)] flex items-center justify-center p-8"><LoadingState label="Loading login..." /></main>}>
      <LoginClient />
    </Suspense>
  );
}
