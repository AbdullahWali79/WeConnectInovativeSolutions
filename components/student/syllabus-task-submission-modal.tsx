"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Submission, Task } from "@/lib/supabase/types";
import { getProofLinkError } from "@/lib/proof-links";

type Props = {
  task: Task;
  course?: Course;
  submission?: Submission;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onError: (message: string) => void;
};

export function SyllabusTaskSubmissionModal({ task, course, submission, onClose, onSaved, onError }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [explanation, setExplanation] = useState(submission?.explanation ?? "");
  const [proofUrl, setProofUrl] = useState(submission?.proof_url ?? "");
  const [imageUrl, setImageUrl] = useState(submission?.image_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, saving]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!explanation.trim()) return onError("Explanation is required.");
    const proofError = getProofLinkError(proofUrl);
    if (proofError) return onError(proofError);
    if (imageUrl.trim()) {
      try {
        const url = new URL(imageUrl.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return onError("Enter a valid public image URL.");
      }
    }

    setSaving(true);
    const { error } = await supabase.rpc("submit_task", {
      target_task_id: task.id,
      submission_explanation: explanation.trim(),
      submission_proof_url: proofUrl.trim(),
      submission_image_url: imageUrl.trim() || null,
      submission_github_url: null,
      submission_google_doc_url: null,
      submission_google_sheet_url: null,
      submission_youtube_url: null,
    });
    setSaving(false);
    if (error) return onError(error.message);
    await onSaved(submission?.status === "revision_required" ? "Task resubmitted successfully." : "Task submitted successfully.");
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="syllabus-task-title" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary">{task.workflow_type === "daily" ? "Daily Task" : "Syllabus Task"}</p>
            <h2 id="syllabus-task-title" className="mt-1 text-title-lg text-on-surface">Submit task</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Submit the task explanation, proof link, and optional image URL for review.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container disabled:opacity-50" aria-label="Close task form">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
            <label className="block">
              <span className="wc-label">Course</span>
              <input className="wc-input mt-2 bg-surface-container-low" value={course?.title ?? "Unknown course"} readOnly />
            </label>
            <label className="block">
              <span className="wc-label">Task Title</span>
              <input className="wc-input mt-2 bg-surface-container-low" value={task.title} readOnly />
            </label>
            <label className="block sm:col-span-2">
              <span className="wc-label">Explanation</span>
              <textarea className="wc-input mt-2 min-h-32" value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explain your work, key implementation decisions, and how the admin should review it." required />
            </label>
            <div className="space-y-4 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 sm:col-span-2">
              <label className="block">
                <span className="wc-label">Proof Link *</span>
                <input className="wc-input mt-2" type="url" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://..." required />
              </label>
              <label className="block">
                <span className="wc-label flex items-center gap-2"><Icon name="image" className="text-primary" /> Image URL (Optional)</span>
                <input className="wc-input mt-2" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... public image link" />
                <span className="mt-1 block text-xs text-on-surface-variant">Paste a public image or Google Drive link. No file upload is required.</span>
              </label>
            </div>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-outline-variant/60 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="wc-secondary-btn" disabled={saving}>Cancel</button>
            <button type="submit" className="wc-primary-btn" disabled={saving}>{saving ? "Submitting..." : submission?.status === "revision_required" ? "Resubmit Task" : "Submit Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
