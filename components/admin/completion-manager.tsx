"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { ResultCardPDF } from "@/components/admin/result-card-pdf";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CompletedStudent, Course, Enrollment, Profile, ProgressReport } from "@/lib/supabase/types";
import { formatDate, formatDateTime } from "@/lib/utils";

export function CompletionManager() {
  const supabase = createSupabaseBrowserClient();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [completed, setCompleted] = useState<CompletedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [enrollmentResult, studentResult, courseResult, reportResult, completedResult] = await Promise.all([
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student"),
      supabase.from("courses").select("*"),
      supabase.from("progress_reports").select("*"),
      supabase.from("completed_students").select("*").order("completed_at", { ascending: false }),
    ]);
    const error = enrollmentResult.error ?? studentResult.error ?? courseResult.error ?? reportResult.error ?? completedResult.error;
    if (error) setToast({ type: "error", message: error.message });
    setEnrollments(enrollmentResult.data ?? []);
    setStudents(studentResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setReports(reportResult.data ?? []);
    setCompleted(completedResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const reportMap = useMemo(() => new Map(reports.map((report) => [`${report.student_id}:${report.course_id}`, report])), [reports]);
  const completedMap = useMemo(() => new Map(completed.map((row) => [`${row.student_id}:${row.course_id}`, row])), [completed]);

  async function markCompleted(enrollment: Enrollment, forceCompletion: boolean) {
    const student = studentById.get(enrollment.student_id);
    const course = courseById.get(enrollment.course_id);
    const confirmed = window.confirm(
      forceCompletion
        ? `Force complete ${course?.title ?? "this course"} for ${student?.full_name ?? "this student"}? This will mark the enrollment completed even if some tasks are still pending.`
        : `Complete and lock ${course?.title ?? "this course"} for ${student?.full_name ?? "this student"}? After locking, new tasks cannot be assigned for this enrollment.`,
    );
    if (!confirmed) return;

    setBusyId(enrollment.id);
    const { error } = await supabase.rpc("mark_course_completed", { target_student_id: enrollment.student_id, target_course_id: enrollment.course_id });
    setBusyId(null);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: "Course marked completed and published on landing page." });
    await loadData();
  }

  function printResultCard(enrollment: Enrollment, report: ProgressReport | undefined) {
    const student = studentById.get(enrollment.student_id);
    const course = courseById.get(enrollment.course_id);
    const totalTasks = report?.total_tasks ?? 0;
    const completedTasks = report?.completed_tasks ?? 0;
    const progress = report?.progress_percentage ?? enrollment.progress_percentage;
    const score = report?.average_score ?? enrollment.final_score;
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      setToast({ type: "error", message: "Popup blocked. Allow popups to print result card." });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Result Card</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
            .card { border: 1px solid #bfdbfe; border-radius: 18px; padding: 28px; max-width: 760px; margin: 0 auto; }
            .eyebrow { color: #072b8a; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }
            h1 { color: #072b8a; margin: 8px 0 20px; }
            h2 { margin: 0; font-size: 22px; }
            p { color: #475569; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
            .metric { border: 1px solid #dbeafe; border-radius: 12px; padding: 16px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .value { color: #072b8a; font-size: 24px; font-weight: 800; margin-top: 6px; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="eyebrow">WeConnect-Inovation Result Card</div>
            <h1>Course Completion Record</h1>
            <h2>${student?.full_name ?? "Unknown student"}</h2>
            <p>${student?.email ?? ""}</p>
            <h2>${course?.title ?? "Unknown course"}</h2>
            <p>Status: ${enrollment.status.toUpperCase()}</p>
            <div class="grid">
              <div class="metric"><div class="label">Progress</div><div class="value">${progress}%</div></div>
              <div class="metric"><div class="label">Average Score</div><div class="value">${score}</div></div>
              <div class="metric"><div class="label">Reviewed Tasks</div><div class="value">${completedTasks}/${totalTasks}</div></div>
              <div class="metric"><div class="label">Completion Date</div><div class="value">${enrollment.completed_at ? formatDate(enrollment.completed_at) : "Pending"}</div></div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function togglePublic(row: CompletedStudent) {
    const { error } = await supabase.from("completed_students").update({ is_public: !row.is_public }).eq("id", row.id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }
    setToast({ type: "success", message: row.is_public ? "Completion hidden from landing page." : "Completion published." });
    await loadData();
  }

  if (loading) return <LoadingState label="Loading completions..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader eyebrow="Course Completion" title="Complete enrollments" description="Mark a student course complete and publish the completion record to the public landing page." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {enrollments.length === 0 ? (
          <EmptyState title="No enrollments yet" description="Approve applications and have students complete Student Sign Up before completing courses." icon="workspace_premium" />
        ) : (
          <div className="grid gap-4">
            {enrollments.map((enrollment) => {
              const report = reportMap.get(`${enrollment.student_id}:${enrollment.course_id}`);
              const completedRow = completedMap.get(`${enrollment.student_id}:${enrollment.course_id}`);
              const totalTasks = report?.total_tasks ?? 0;
              const completedTasks = report?.completed_tasks ?? 0;
              const hasPendingTasks = totalTasks > 0 && completedTasks < totalTasks;
              return (
                <article key={enrollment.id} className="wc-card p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-on-surface">{studentById.get(enrollment.student_id)?.full_name ?? "Unknown student"}</h2>
                        <StatusPill value={enrollment.status} />
                        {completedRow ? <StatusPill value={completedRow.is_public ? "approved" : "inactive"} /> : null}
                      </div>
                      <p className="text-sm text-on-surface-variant">{courseById.get(enrollment.course_id)?.title ?? "Unknown course"}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Progress {report?.progress_percentage ?? enrollment.progress_percentage}% · Completed tasks {report?.completed_tasks ?? 0}/{report?.total_tasks ?? 0} · Score {report?.average_score ?? enrollment.final_score}</p>
                      {completedRow ? <p className="mt-1 text-xs text-on-surface-variant">Completed {formatDateTime(completedRow.completed_at)}</p> : null}
                      {hasPendingTasks ? <p className="mt-1 text-xs font-semibold text-orange-700">Some tasks are still pending. Use Force Complete only if you want to complete the enrollment manually.</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busyId === enrollment.id} onClick={() => markCompleted(enrollment, hasPendingTasks)} className="wc-primary-btn text-sm py-2 px-3 disabled:cursor-not-allowed disabled:opacity-50">
                        <Icon name="workspace_premium" className="text-base" /> {enrollment.status === "completed" ? "Refresh" : hasPendingTasks ? "Force Complete" : "Mark Completed"}
                      </button>
                      {completedRow ? <button onClick={() => togglePublic(completedRow)} className="wc-secondary-btn text-sm py-2 px-3">{completedRow.is_public ? "Hide Public" : "Show Public"}</button> : null}
                      {enrollment.status === "completed" ? (
                        <>
                          <button type="button" onClick={() => printResultCard(enrollment, report)} className="wc-secondary-btn text-sm py-2 px-3">
                            <Icon name="print" className="text-base" /> Print Result
                          </button>
                          <PDFDownloadLink
                            document={<ResultCardPDF student={studentById.get(enrollment.student_id) ?? null} course={courseById.get(enrollment.course_id) ?? null} enrollment={enrollment} report={report ?? null} />}
                            fileName={`${studentById.get(enrollment.student_id)?.full_name ?? "student"}-${courseById.get(enrollment.course_id)?.title ?? "course"}-result-card.pdf`.replaceAll(" ", "-").toLowerCase()}
                            className="wc-secondary-btn text-sm py-2 px-3"
                          >
                            {({ loading: pdfLoading }) => (
                              <>
                                <Icon name="download" className="text-base" /> {pdfLoading ? "Preparing..." : "PDF"}
                              </>
                            )}
                          </PDFDownloadLink>
                          <Link href={`/admin/internship-letters?studentId=${enrollment.student_id}&courseId=${enrollment.course_id}`} className="wc-secondary-btn text-sm py-2 px-3">
                            <Icon name="description" className="text-base" /> Issue Letter
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}
