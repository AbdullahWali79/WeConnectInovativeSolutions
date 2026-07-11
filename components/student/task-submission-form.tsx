"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Submission, Task, TaskResource } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

type SubmissionScreenshot = {
  id: string;
  task_submission_id: string;
  student_id: string;
  task_id: string;
  github_url: string;
  cdn_url: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

const initialForm = { explanation: "", github_url: "", google_doc_url: "", google_sheet_url: "", image_url: "", youtube_url: "", proof_url: "" };

export function TaskSubmissionForm({ taskId }: { taskId: string }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<SubmissionScreenshot[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [taskResult, resourceResult, submissionResult] = await Promise.all([
      supabase.from("tasks").select("*").eq("id", taskId).maybeSingle(),
      supabase.from("task_resources").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
      supabase.from("submissions").select("*").eq("task_id", taskId).maybeSingle(),
    ]);
    const error = taskResult.error ?? resourceResult.error ?? submissionResult.error;
    if (error) setToast({ type: "error", message: error.message });
    setTask(taskResult.data ?? null);
    setResources(resourceResult.data ?? []);
    
    const existing = submissionResult.data;
    setSubmission(existing ?? null);
    if (existing) {
      setForm({
        explanation: existing.explanation ?? "",
        github_url: existing.github_url ?? "",
        google_doc_url: existing.google_doc_url ?? "",
        google_sheet_url: existing.google_sheet_url ?? "",
        image_url: existing.image_url ?? "",
        youtube_url: (existing as typeof existing & { youtube_url?: string | null }).youtube_url ?? "",
        proof_url: existing.proof_url ?? "",
      });

      // Fetch screenshots
      const { data: screenshotData } = await supabase
        .from("submission_screenshots")
        .select("*")
        .eq("task_submission_id", existing.id)
        .order("created_at", { ascending: true });
      setExistingScreenshots(screenshotData ?? []);
    }
    setLoading(false);
  }, [supabase, taskId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (selectedFiles.length + files.length > 5) {
      setToast({ type: "error", message: "You can upload up to 5 screenshots maximum." });
      return;
    }
    
    const validExtensions = ["jpg", "jpeg", "png", "webp"];
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!validExtensions.includes(ext)) {
        setToast({ type: "error", message: `Invalid file type: ${file.name}. Only jpg, jpeg, png, webp are allowed.` });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToast({ type: "error", message: `File size too large: ${file.name}. Maximum size is 5MB.` });
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.explanation.trim()) {
      setToast({ type: "error", message: "Explanation is required." });
      return;
    }
    if (!form.proof_url.trim()) {
      setToast({ type: "error", message: "A proof link is required before submission." });
      return;
    }

    if (submission && submission.status !== "revision_required") {
      setToast({ type: "error", message: "This task already has a final submission decision." });
      return;
    }

    if (selectedFiles.length === 0) {
      setToast({ type: "error", message: "Please upload at least 1 screenshot." });
      return;
    }
    if (selectedFiles.length > 5) {
      setToast({ type: "error", message: "You can upload up to 5 screenshots." });
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToast({ type: "error", message: "User session not found." });
      setSaving(false);
      return;
    }

    try {
      const uploadedScreenshots: { githubUrl: string; cdnUrl: string; originalFilename: string; fileSize: number; mimeType: string }[] = [];
      
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "task-screenshot");
        formData.append("taskId", taskId);
        formData.append("entityId", user.id);
        
        const res = await fetch("/api/uploads/github", {
          method: "POST",
          body: formData,
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Upload to GitHub failed.");
        }
        
        uploadedScreenshots.push({
          githubUrl: data.githubUrl,
          cdnUrl: data.githubCdnUrl,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || "image/octet-stream",
        });
      }
      
      const { data: submissionId, error: submitError } = await supabase.rpc("submit_task", {
        target_task_id: taskId,
        submission_explanation: form.explanation.trim(),
        submission_github_url: form.github_url.trim() || null,
        submission_google_doc_url: form.google_doc_url.trim() || null,
        submission_google_sheet_url: form.google_sheet_url.trim() || null,
        submission_image_url: form.image_url.trim() || null,
        submission_youtube_url: form.youtube_url.trim() || null,
        submission_proof_url: form.proof_url.trim() || null,
      });
      
      if (submitError) {
        throw submitError;
      }
      
      if (!submissionId) {
        throw new Error("Failed to retrieve task submission ID.");
      }
      
      const { error: deleteError } = await supabase
        .from("submission_screenshots")
        .delete()
        .eq("task_submission_id", submissionId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      const screenshotRows = uploadedScreenshots.map(item => ({
        task_submission_id: submissionId,
        student_id: user.id,
        task_id: taskId,
        github_url: item.githubUrl,
        cdn_url: item.cdnUrl,
        original_filename: item.originalFilename,
        file_size: item.fileSize,
        mime_type: item.mimeType,
      }));
      
      const { error: insertError } = await supabase
        .from("submission_screenshots")
        .insert(screenshotRows);
        
      if (insertError) {
        throw insertError;
      }
      
      setToast({ type: "success", message: "Task submitted successfully with screenshots." });
      router.push("/student");
      router.refresh();
      
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Submission failed.";
      setToast({ type: "error", message: errMsg });
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading task submission..." />;
  if (!task) return <EmptyState title="Task not found" description="The task either does not exist or is not assigned to your account." icon="assignment_late" />;

  const locked = submission?.status === "submitted" || submission?.status === "reviewed" || submission?.status === "rejected";
  const submissionButtonLabel =
    submission?.status === "revision_required"
      ? "Resubmit Task"
      : submission?.status === "submitted"
        ? "Under Review"
        : submission?.status === "reviewed"
          ? "Accepted"
          : submission?.status === "rejected"
            ? "Rejected"
            : "Submit Task";

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Task Submission"
        title={task.title}
        description="Submit your explanation and proof links for admin review."
        action={
          <Link href="/student" className="wc-secondary-btn flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-surface-container transition-all">
            <Icon name="arrow_back" /> Back to Dashboard
          </Link>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <form onSubmit={submit} className="bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-3xl p-6 md:p-8 space-y-6 transition hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          {submission ? (
            <div className="rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/5 to-blue-50/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <StatusPill value={submission.status} />
                <span className="text-xs text-on-surface-variant">
                  Submitted {formatDateTime(submission.submitted_at)}
                  {submission.score !== null && submission.score !== undefined && ` · Score: ${submission.score} / ${task.max_score}`}
                </span>
              </div>
              {submission.feedback && (
                <div className="mt-3 rounded-2xl bg-white/80 p-4 border border-outline-variant/30 relative shadow-sm">
                  <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-wider">
                    <Icon name="chat_bubble_outline" className="text-xs" /> Admin Feedback
                  </div>
                  <p className="mt-4 pt-1 text-sm text-on-surface leading-relaxed">
                    {submission.feedback}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <label className="block space-y-2 group">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80 group-focus-within:text-primary transition-colors">
              Explanation *
            </span>
            <div className="rounded-2xl border border-outline-variant/60 bg-white/50 p-4 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                disabled={locked}
                className="w-full bg-transparent text-sm text-on-surface outline-none min-h-40 placeholder-on-surface-variant/40 resize-y"
                value={form.explanation}
                onChange={(event) => updateField("explanation", event.target.value)}
                placeholder="Explain your work, key implementation decisions, and how the admin should review it."
                required
              />
            </div>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <UrlInput label="GitHub Link" value={form.github_url} disabled={locked} onChange={(value) => updateField("github_url", value)} />
            <UrlInput label="Google Docs Link" value={form.google_doc_url} disabled={locked} onChange={(value) => updateField("google_doc_url", value)} />
            <UrlInput label="Google Sheet Link" value={form.google_sheet_url} disabled={locked} onChange={(value) => updateField("google_sheet_url", value)} />
            <UrlInput label="Image / Proof URL" value={form.image_url} disabled={locked} onChange={(value) => updateField("image_url", value)} />
            <UrlInput label="YouTube Link" value={form.youtube_url} disabled={locked} onChange={(value) => updateField("youtube_url", value)} />
            <UrlInput label="Primary Proof URL" value={form.proof_url} disabled={locked} required onChange={(value) => updateField("proof_url", value)} />
          </div>

          {/* Compulsory Screenshot Section */}
          <div className="rounded-3xl border border-outline-variant/60 bg-gradient-to-b from-surface-container-low to-white p-6 space-y-5">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <Icon name="image" className="text-primary text-lg" /> Compulsory Screenshots *
              </span>
              <span className="text-xs text-on-surface-variant block mt-1">
                Please upload between 1 to 5 screenshots of your work. Supported formats: JPG, JPEG, PNG, WEBP (Max 5MB per image).
              </span>
            </div>

            {!locked && (
              <div className="group relative border-2 border-dashed border-outline-variant/80 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center bg-white/50 cursor-pointer shadow-sm hover:shadow-md">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform duration-300">
                  <Icon name="cloud_upload" className="text-3xl" />
                </div>
                <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Select screenshots from device</span>
                <span className="text-xs text-on-surface-variant mt-1.5">Drag and drop or click to choose files</span>
              </div>
            )}

            {previews.length > 0 && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                {previews.map((preview, index) => (
                  <div key={`preview-${index}`} className="relative group rounded-2xl border border-outline-variant/50 overflow-hidden aspect-video bg-surface-container-lowest shadow-sm hover:shadow-md transition">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1.5 right-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white p-1.5 transition active:scale-90"
                      >
                        <Icon name="close" className="text-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {locked && existingScreenshots.length > 0 && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                {existingScreenshots.map((screen) => (
                  <div key={screen.id} className="relative rounded-2xl border border-outline-variant/50 overflow-hidden aspect-video bg-surface-container-lowest shadow-sm">
                    <img src={screen.cdn_url} alt={screen.original_filename} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={saving || locked}
            className={`w-full py-4 text-base font-bold rounded-2xl transition duration-300 flex items-center justify-center gap-2 shadow-lg ${
              locked
                ? "bg-surface-container text-on-surface-variant/50 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white active:scale-[0.98]"
            }`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Icon name={locked ? "lock" : "send"} className="text-lg" />
                <span>{submissionButtonLabel}</span>
              </>
            )}
          </button>
        </form>

        <aside className="space-y-6">
          {/* Task Brief */}
          <div className="wc-card overflow-hidden bg-gradient-to-br from-primary/[0.02] via-white to-white p-6 shadow-sm border border-outline-variant/40 rounded-3xl">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2 font-bold">
              <Icon name="assignment" className="text-primary" /> Task Brief
            </h2>
            <div className="mt-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                {task.description ?? "No task description provided."}
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-outline-variant/50 space-y-4 text-sm text-on-surface-variant">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase font-semibold text-on-surface-variant/70"><Icon name="schedule" className="text-base" /> Deadline</span>
                <span className="font-bold text-on-surface">{formatDateTime(task.deadline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase font-semibold text-on-surface-variant/70"><Icon name="grade" className="text-base" /> Max Score</span>
                <span className="font-bold text-on-surface">{task.max_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase font-semibold text-on-surface-variant/70"><Icon name="info" className="text-base" /> Status</span>
                <StatusPill value={task.status} />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="wc-card p-6 shadow-sm border border-outline-variant/40 rounded-3xl">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2 font-bold">
              <Icon name="folder_open" className="text-primary" /> Resources
            </h2>
            {resources.length === 0 ? (
              <div className="mt-4 text-center py-8 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low">
                <Icon name="drafts" className="text-3xl text-on-surface-variant/30 mb-2" />
                <p className="text-sm text-on-surface-variant">No reference resources attached.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-low/75 p-4 text-label-md text-primary transition hover:bg-primary/5 hover:border-primary/20"
                  >
                    <span className="font-semibold truncate">{resource.title ?? resource.resource_type.replaceAll("_", " ")}</span>
                    <Icon name="open_in_new" className="text-lg text-primary/70" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function UrlInput({
  label,
  value,
  disabled,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 group">
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80 group-focus-within:text-primary transition-colors">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="relative flex items-center rounded-2xl border border-outline-variant/60 bg-white/50 px-4 py-3 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
        <input
          disabled={disabled}
          required={required}
          className="w-full bg-transparent text-sm text-on-surface outline-none placeholder-on-surface-variant/40 disabled:opacity-50"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://..."
        />
        <Icon name="link" className="text-lg text-on-surface-variant/30 group-focus-within:text-primary transition-colors ml-2" />
      </div>
    </label>
  );
}
