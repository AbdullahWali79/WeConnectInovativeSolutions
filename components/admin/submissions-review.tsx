"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { courseInScope, filterCoursesByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, Profile, Submission, SubmissionStatus, Task } from "@/lib/supabase/types";
import { normalizeAnyUrl } from "@/lib/profile-links";
import { formatDateTime, toNumber } from "@/lib/utils";

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

type ReviewForm = { score: string; feedback: string; status: SubmissionStatus };

export function SubmissionsReview({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canGrade = currentRole === "admin" || permissions.includes("submissions.grade");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseScope, setCourseScope] = useState<CourseScope>(null);
  const [forms, setForms] = useState<Record<string, ReviewForm>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [screenshots, setScreenshots] = useState<SubmissionScreenshot[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    let scope: CourseScope = null;
    try {
      scope = await loadTeacherCourseScope(supabase as never, currentRole);
      setCourseScope(scope);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to load course scope." });
      scope = [];
    }
    const [submissionResult, taskResult, profileResult, courseResult, screenshotResult] = await Promise.all([
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student"),
      supabase.from("courses").select("*"),
      supabase.from("submission_screenshots").select("*").order("created_at", { ascending: true }),
    ]);
    const error = submissionResult.error ?? taskResult.error ?? profileResult.error ?? courseResult.error ?? screenshotResult.error;
    if (error) setToast({ type: "error", message: error.message });
    const scopedTasks = (taskResult.data ?? []).filter((task) => courseInScope(task.course_id, scope));
    const scopedTaskIds = new Set(scopedTasks.map((task) => task.id));
    const loadedSubmissions = (submissionResult.data ?? []).filter((submission) => scopedTaskIds.has(submission.task_id));
    const scopedStudentIds = new Set(scopedTasks.map((task) => task.student_id));
    setSubmissions(loadedSubmissions);
    setTasks(scopedTasks);
    setStudents(currentRole === "teacher" ? (profileResult.data ?? []).filter((profile) => scopedStudentIds.has(profile.id)) : (profileResult.data ?? []));
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setScreenshots(screenshotResult.data ?? []);
    setForms(Object.fromEntries(loadedSubmissions.map((submission) => [submission.id, {
      score: String(submission.score ?? 0),
      feedback: submission.feedback ?? "",
      status: submission.status,
    }])));
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  // Client-side filtering logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const task = taskById.get(submission.task_id);
      const student = studentById.get(submission.student_id);

      const matchesSearch =
        !searchTerm ||
        (student?.full_name && student.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student?.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task?.title && task.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (submission.explanation && submission.explanation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCourse =
        (!selectedCourseId || (task && task.course_id === selectedCourseId)) &&
        Boolean(task && courseInScope(task.course_id, courseScope));

      const matchesStatus =
        !selectedStatus ||
        submission.status === selectedStatus;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [submissions, searchTerm, selectedCourseId, selectedStatus, taskById, studentById, courseScope]);

  function updateForm(submissionId: string, patch: Partial<ReviewForm>) {
    setForms((current) => ({ ...current, [submissionId]: { ...current[submissionId], ...patch } }));
  }

  async function saveReview(submission: Submission, forcedStatus?: SubmissionStatus) {
    if (!canGrade) {
      setToast({ type: "error", message: "You do not have permission to grade submissions." });
      return;
    }
    const form = forms[submission.id];
    if (!form) return;
    const status = forcedStatus ?? form.status;
    if ((status === "revision_required" || status === "rejected") && !form.feedback.trim()) {
      setToast({ type: "error", message: `${status === "rejected" ? "Reject" : "Revision"} feedback is required.` });
      return;
    }
    const score = status === "reviewed" ? toNumber(form.score, 0) : 0;

    setBusyId(submission.id);
    const { error } = await supabase
      .from("submissions")
      .update({
        status,
        score,
        feedback: form.feedback.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    const task = taskById.get(submission.task_id);
    if (task) {
      const taskStatus = status === "reviewed" ? "reviewed" : status === "rejected" ? "rejected" : "revision_required";
      await supabase.from("tasks").update({ status: taskStatus }).eq("id", submission.task_id);
      await supabase.rpc("refresh_student_progress", {
        target_student_id: submission.student_id,
        target_course_id: task.course_id,
      });
    }

    setToast({
      type: "success",
      message:
        status === "reviewed"
          ? "Submission accepted."
          : status === "rejected"
            ? "Submission rejected."
            : "Revision requested.",
    });
    await loadData();
  }

  if (loading) return <LoadingState label="Loading submissions..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader eyebrow="Submission Review" title="Review and score submissions" description="Score submissions, add feedback, or request revision. Saving updates task status and progress reports automatically." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {submissions.length === 0 ? (
          <EmptyState title="No submissions yet" description="Student submissions will appear here after assigned tasks are submitted." icon="rate_review" />
        ) : (
          <div className="space-y-6">
            {/* Search & Filter Controls */}
            <div className="grid gap-4 sm:grid-cols-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-sm">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant/70">
                  <Icon name="search" className="text-lg" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wc-input pl-10 pr-8"
                  placeholder="Search student, task..."
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-primary transition"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="wc-input appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  }}
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="wc-input appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Accept</option>
                  <option value="rejected">Reject</option>
                  <option value="revision_required">Revise</option>
                </select>
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <EmptyState
                title="No matches found"
                description="Try adjusting your search terms or filters to find what you are looking for."
                icon="search"
              />
            ) : (
              <div className="grid gap-4">
                {filteredSubmissions.map((submission) => {
                  const task = taskById.get(submission.task_id);
                  const proofLinks = Array.isArray(submission.proof_links)
                    ? submission.proof_links.filter((link): link is string => typeof link === "string" && link.trim().length > 0)
                    : [];
                  const subScreenshots = screenshots.filter((s) => s.task_submission_id === submission.id);
              const form = forms[submission.id] ?? { score: "0", feedback: "", status: submission.status };
              return (
                <article key={submission.id} className="wc-card overflow-hidden">
                  <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
                    <div className="p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-on-surface">{task?.title ?? "Unknown task"}</h2>
                        <StatusPill value={submission.status} />
                      </div>
                      <p className="text-sm text-on-surface-variant">{submission.explanation || "No explanation provided."}</p>
                      <div className="mt-3 grid gap-2 text-xs text-on-surface-variant md:grid-cols-2">
                        <p><b>Student:</b> {studentById.get(submission.student_id)?.full_name ?? "Unknown"}</p>
                        <p><b>Course:</b> {task ? courseById.get(task.course_id)?.title ?? "Unknown" : "Unknown"}</p>
                        <p><b>Submitted:</b> {formatDateTime(submission.submitted_at)}</p>
                        <p><b>Max score:</b> {task?.max_score ?? 100}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ResourceLink label="GitHub" url={submission.github_url} />
                        <ResourceLink label="Google Doc" url={submission.google_doc_url} />
                        <ResourceLink label="Google Sheet" url={submission.google_sheet_url} />
                        <ResourceLink label="Image" url={submission.image_url} />
                        <ResourceLink label="YouTube" url={submission.youtube_url} />
                        <ResourceLink label="Proof" url={submission.proof_url} />
                      </div>
                      <GoogleDriveImagePreviews links={proofLinks} />
                      {subScreenshots.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Submitted Screenshots</p>
                          <div className="flex flex-wrap gap-3">
                            {subScreenshots.map((screen) => (
                              <div
                                key={screen.id}
                                className="group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant hover:border-primary transition"
                                onClick={() => setLightboxUrl(screen.cdn_url)}
                              >
                                <img
                                  src={screen.cdn_url}
                                  alt={screen.original_filename}
                                  className="h-16 w-24 object-cover transition group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                                  <Icon name="zoom_in" className="text-white text-base" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {canGrade ? <form className="space-y-3 border-t border-outline-variant bg-surface-container-lowest p-4 xl:border-l xl:border-t-0" onSubmit={(event) => { event.preventDefault(); void saveReview(submission); }}>
                      <label className="block">
                        <span className="wc-label">Review Status</span>
                        <select className="wc-input mt-2" value={form.status} onChange={(event) => updateForm(submission.id, { status: event.target.value as SubmissionStatus })}>
                          <option value="submitted">Submitted</option>
                          <option value="reviewed">Accept</option>
                          <option value="rejected">Reject</option>
                          <option value="revision_required">Revise</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="wc-label">Score</span>
                        <input className="wc-input mt-2" type="number" min="0" max={task?.max_score ?? 100} value={form.score} onChange={(event) => updateForm(submission.id, { score: event.target.value })} />
                      </label>
                      <label className="block">
                        <span className="wc-label">Feedback</span>
                        <textarea className="wc-input mt-2 min-h-20" value={form.feedback} onChange={(event) => updateForm(submission.id, { feedback: event.target.value })} placeholder="Give actionable feedback..." />
                      </label>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                        <button type="button" disabled={busyId === submission.id} onClick={() => saveReview(submission, "reviewed")} className="wc-primary-btn py-2.5 text-sm">Accept</button>
                        <button type="button" disabled={busyId === submission.id} onClick={() => saveReview(submission, "rejected")} className="wc-secondary-btn border-rose-500 py-2.5 text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30">Reject</button>
                        <button type="button" disabled={busyId === submission.id} onClick={() => saveReview(submission, "revision_required")} className="wc-secondary-btn border-orange-500 py-2.5 text-sm text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30">Revise</button>
                      </div>
                    </form> : (
                      <div className="border-t border-outline-variant bg-surface-container-lowest p-4 xl:border-l xl:border-t-0">
                        <div className="rounded-xl bg-surface-container-low p-4">
                          <p className="text-sm font-bold text-on-surface">Read-only review</p>
                          <p className="mt-2 text-xs leading-5 text-on-surface-variant">Grading is not enabled for this teacher account.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5"
            >
              <Icon name="open_in_new" className="text-sm" /> View full image
            </a>
            <button
              className="text-white hover:text-primary transition p-2"
              onClick={() => setLightboxUrl(null)}
            >
              <Icon name="close" className="text-2xl" />
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Screenshot Preview"
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ResourceLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return <a href={normalizeAnyUrl(url)} target="_blank" rel="noreferrer" className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold text-primary">{label}</a>;
}
