"use client";
import { CmsElement } from "@/components/cms/cms-element";

import { useState } from "react";
import { PROMPT_SUBMISSION_PATH } from "@/lib/prompt-submission-form";

export function SubmissionFormShare() {
  const [message, setMessage] = useState("");
  const buttonClass = "rounded-full border border-outline-variant px-5 py-3 font-semibold";
  return <CmsElement cmsId="b4824211-0" as="div" className="space-y-3">
    <CmsElement cmsId="b4824211-1" as="p" className="text-sm text-on-surface-variant">Share this website page with students. The same link opens from Share your prompts in the public library.</CmsElement>
    <CmsElement cmsId="b4824211-2" as="a" href={PROMPT_SUBMISSION_PATH} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-primary underline">{PROMPT_SUBMISSION_PATH}</CmsElement>
    <CmsElement cmsId="b4824211-3" as="div" className="flex flex-wrap gap-3">
      <CmsElement cmsId="b4824211-4" as="button" type="button" className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary" onClick={async () => {
        const url = new URL(PROMPT_SUBMISSION_PATH, window.location.origin).href;
        try { await navigator.clipboard.writeText(url); setMessage(`Copied: ${url}`); }
        catch { setMessage(`Copy this link: ${url}`); }
      }}>Copy student link</CmsElement>
      <CmsElement cmsId="b4824211-5" as="a" href={PROMPT_SUBMISSION_PATH} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open submission page</CmsElement>
    </CmsElement>
    {message && <CmsElement cmsId="b4824211-6" as="p" role="status" className="break-all text-sm text-primary">{message}</CmsElement>}
  </CmsElement>;
}
