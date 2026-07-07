import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--wc-surface-lowest)_0%,var(--wc-surface)_100%)] px-5 py-16 md:px-margin-page">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#DDE6F5] bg-white p-8 shadow-card">
        <h1 className="text-3xl font-extrabold text-[#062B7F]">Privacy Policy</h1>
        <p className="mt-4 text-[#5B6B88]">This page can be expanded later with your official privacy policy content.</p>
        <Link href="/" className="mt-6 inline-flex rounded-lg bg-[#062B7F] px-5 py-3 font-bold text-white">Back Home</Link>
      </div>
    </main>
  );
}