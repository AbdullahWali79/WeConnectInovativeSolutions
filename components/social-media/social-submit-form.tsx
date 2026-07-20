"use client";

import { useRef, useState, useTransition } from "react";
import { submitSocialPost } from "@/app/social-media/actions";
import { Icon } from "@/components/icon";

export function SocialSubmitForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <form ref={formRef} action={(formData) => startTransition(async () => {
      setMessage(null);
      const result = await submitSocialPost(formData);
      if (result.success) {
        formRef.current?.reset();
        setMessage({ type: "success", text: "Post submitted and added to this week's progress." });
      } else setMessage({ type: "error", text: result.error ?? "Post could not be submitted." });
    })} className="rounded-lg border border-outline-variant bg-white p-5 shadow-card">
      <label className="wc-label" htmlFor="social-post-url">Published post URL</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input id="social-post-url" name="url" type="url" required placeholder="https://www.linkedin.com/posts/..." className="wc-input min-w-0 flex-1" />
        <button disabled={pending} className="wc-primary-btn justify-center sm:min-w-40">
          <Icon name={pending ? "progress_activity" : "add_link"} className={pending ? "animate-spin" : ""} />
          {pending ? "Fetching..." : "Submit post"}
        </button>
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">Paste a public LinkedIn, Facebook, Instagram, X, Threads, or TikTok post link. Preview details are fetched automatically.</p>
      {message ? <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-error-container text-error"}`}>{message.text}</p> : null}
    </form>
  );
}
