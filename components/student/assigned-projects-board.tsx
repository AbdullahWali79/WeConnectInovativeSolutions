"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Submission, Task } from "@/lib/supabase/types";
import { SyllabusTaskSubmissionModal } from "@/components/student/syllabus-task-submission-modal";
import { StatusPill } from "@/components/status-pill";

export function StudentAssignedProjectsBoard({ studentId }: { studentId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [submissionTask, setSubmissionTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [taskResult, submissionResult, courseResult] = await Promise.all([
      supabase.from("tasks").select("*").eq("student_id", studentId).eq("workflow_type", "project").order("created_at", { ascending: false }),
      supabase.from("submissions").select("*").eq("student_id", studentId).order("submitted_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
    ]);

    if (taskResult.error) setToast({ type: "error", message: taskResult.error.message });
    else setTasks(taskResult.data ?? []);

    if (submissionResult.error) setToast({ type: "error", message: submissionResult.error.message });
    else setSubmissions(submissionResult.data ?? []);

    if (courseResult.error) setToast({ type: "error", message: courseResult.error.message });
    else setCourses(courseResult.data ?? []);

    setLoading(false);
  }, [supabase, studentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const submissionByTaskId = useMemo(() => new Map(submissions.map((submission) => [submission.task_id, submission])), [submissions]);

  if (loading) return <LoadingState label="Loading assigned projects..." />;

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Assignments"
        title="Assigned Projects"
        description="View and submit full projects assigned to you by the admin."
      />

      {tasks.length === 0 ? (
        <section className="rounded-2xl border border-outline-variant bg-surface p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest text-primary">
            <Icon name="assignment_turned_in" className="text-3xl" />
          </div>
          <h2 className="mt-4 text-xl font-bold">No projects assigned</h2>
          <p className="mt-2 text-on-surface-variant text-sm max-w-sm mx-auto">
            You don&apos;t have any assigned projects yet. When admins assign projects to you, they will appear here.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((task) => {
            const submission = submissionByTaskId.get(task.id);
            const status = submission?.status ?? task.status;
            const courseTitle = courseById.get(task.course_id)?.title ?? "Unknown Course";

            return (
              <div key={task.id} className="wc-card flex flex-col p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">{courseTitle}</p>
                    <h3 className="mt-1 text-lg font-bold leading-tight">{task.title}</h3>
                  </div>
                  <StatusPill value={status} />
                </div>
                
                <p className="mt-3 text-sm text-on-surface-variant flex-1 whitespace-pre-wrap leading-relaxed">
                  {task.description}
                </p>

                {submission?.feedback && (status === "revision_required" || status === "rejected") && (
                  <div className="mt-4 rounded-xl border border-error/20 bg-error/5 p-3 text-sm">
                    <p className="font-bold text-error">Admin Feedback:</p>
                    <p className="mt-1 text-error/80">{submission.feedback}</p>
                  </div>
                )}
                {submission?.feedback && status === "reviewed" && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <p className="font-bold text-primary">Admin Feedback:</p>
                    <p className="mt-1 text-primary/80">{submission.feedback}</p>
                  </div>
                )}

                <div className="mt-5 border-t border-outline-variant pt-4">
                  {status === "reviewed" ? (
                    <button type="button" disabled className="wc-secondary-btn w-full opacity-50">
                      <Icon name="check_circle" /> Completed
                    </button>
                  ) : status === "submitted" ? (
                    <button type="button" disabled className="wc-secondary-btn w-full opacity-50">
                      <Icon name="hourglass_empty" /> Pending Review
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmissionTask(task)}
                      className="wc-primary-btn w-full"
                    >
                      <Icon name="upload" /> 
                      {status === "revision_required" ? "Fix & Resubmit Project" : "Submit Project"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {submissionTask && (
        <SyllabusTaskSubmissionModal
          task={submissionTask}
          course={courseById.get(submissionTask.course_id)}
          submission={submissionByTaskId.get(submissionTask.id)}
          onClose={() => setSubmissionTask(null)}
          onError={(message) => setToast({ type: "error", message })}
          onSaved={async (message) => {
            setSubmissionTask(null);
            setToast({ type: "success", message });
            await loadData();
          }}
        />
      )}
    </div>
  );
}
