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
      <label className="wc-label" htmlFor="social-post-url">Apni published post ka URL</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input id="social-post-url" name="url" type="url" required placeholder="Post open karein, Copy link karein aur yahan paste karein" className="wc-input min-w-0 flex-1" />
        <button disabled={pending} className="wc-primary-btn justify-center sm:min-w-40">
          <Icon name={pending ? "progress_activity" : "add_link"} className={pending ? "animate-spin" : ""} />
          {pending ? "Fetching..." : "Submit post"}
        </button>
      </div>
      <div className="mt-3 rounded-lg bg-[#EEF4FF] px-4 py-3 text-xs leading-5 text-[#17335F]">
        <p className="font-black text-[#0A2A72]">Sahi link paste karne ka tareeqa:</p>
        <p>Apni post open karein, <strong>Share / Copy link</strong> select karein aur woh link yahan paste karein. Profile, home page ya login link paste na karein.</p>
        <p className="mt-1 font-bold">Supported: LinkedIn, Facebook, Instagram, X/Twitter, Threads aur TikTok. Post public honi chahiye.</p>
      </div>
      {message ? <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-error-container text-error"}`}>{message.text}</p> : null}
    </form>
  );
}
