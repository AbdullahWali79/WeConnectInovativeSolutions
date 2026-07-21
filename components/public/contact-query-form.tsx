"use client";

import { useState } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { CONTACT_EMAIL } from "@/lib/contact";
import { submitContactQuery } from "@/app/contact/actions";

const initialForm = {
  full_name: "",
  email: "",
  message: "",
};

export function ContactQueryForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const result = await submitContactQuery({
      full_name: form.full_name,
      email: form.email,
      message: form.message,
    });

    setLoading(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error });
      return;
    }

    setForm(initialForm);
    setToast({ type: "success", message: "Your query has been sent. We will reply by email." });
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-4 text-sm text-[var(--wc-on-surface-variant)]">
        Send your query to <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-on-surface underline underline-offset-2">{CONTACT_EMAIL}</a>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Your Name</span>
          <input
            value={form.full_name}
            onChange={(event) => updateField("full_name", event.target.value)}
            className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
            placeholder="Your full name"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Email</span>
          <input
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
            placeholder="you@example.com"
            type="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Query</span>
          <textarea
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            className="min-h-40 w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-5 py-4 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
            placeholder="Write your question or request here"
            required
          />
        </label>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] py-4 text-sm font-black text-on-primary shadow-glow transition-all hover:scale-[1.02] hover:shadow-glow-lg disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? "SENDING..." : "SEND QUERY"}
        </button>
      </form>
    </>
  );
}
