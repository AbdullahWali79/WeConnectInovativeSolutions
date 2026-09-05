"use client";

import { useState } from "react";
import { PROMPT_SUBMISSION_PATH } from "@/lib/prompt-submission-form";

export function SubmissionFormShare() {
  const [message, setMessage] = useState("");
  const buttonClass = "rounded-full border border-outline-variant px-5 py-3 font-semibold";
  return <div className="space-y-3">
    <p className="text-sm text-on-surface-variant">Share this website page with students. The same link opens from Share your prompts in the public library.</p>
    <a href={PROMPT_SUBMISSION_PATH} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-primary underline">{PROMPT_SUBMISSION_PATH}</a>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary" onClick={async () => {
        const url = new URL(PROMPT_SUBMISSION_PATH, window.location.origin).href;
        try { await navigator.clipboard.writeText(url); setMessage(`Copied: ${url}`); }
        catch { setMessage(`Copy this link: ${url}`); }
      }}>Copy student link</button>
      <a href={PROMPT_SUBMISSION_PATH} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open submission page</a>
    </div>
    {message && <p role="status" className="break-all text-sm text-primary">{message}</p>}
  </div>;
}
