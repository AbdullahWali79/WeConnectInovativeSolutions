"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { courseInScope, filterCoursesByScope, loadTeacherCourseScope, type CourseScope } from "@/lib/admin-course-scope";
import { updateEnrollmentTargetTasks } from "@/app/admin/actions";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Course, Enrollment, Profile, ProgressReport } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

export function ProgressManager({
  currentRole = "admin",
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseScope, setCourseScope] = useState<CourseScope>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editingTargetKey, setEditingTargetKey] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState("100");
  const [savingTargetKey, setSavingTargetKey] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

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
    const [reportResult, studentResult, courseResult, enrollmentResult] = await Promise.all([
      supabase.from("progress_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "student"),
      supabase.from("courses").select("*"),
      supabase.from("enrollments").select("*"),
    ]);
    const error = reportResult.error ?? studentResult.error ?? courseResult.error ?? enrollmentResult.error;
    if (error) setToast({ type: "error", message: error.message });
    const scopedReports = (reportResult.data ?? []).filter((report) => courseInScope(report.course_id, scope));
    const scopedStudentIds = new Set(scopedReports.map((report) => report.student_id));
    const scopedEnrollments = (enrollmentResult.data ?? []).filter((enrollment) => courseInScope(enrollment.course_id, scope));
    setReports(scopedReports);
    setStudents(currentRole === "teacher" ? (studentResult.data ?? []).filter((profile) => scopedStudentIds.has(profile.id)) : (studentResult.data ?? []));
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setEnrollments(scopedEnrollments);
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const enrollmentByStudentCourse = useMemo(
    () => new Map(enrollments.map((enrollment) => [`${enrollment.student_id}:${enrollment.course_id}`, enrollment])),
    [enrollments],
  );

  async function saveTarget(studentId: string, courseId: string) {
    const targetTasks = Number(targetDraft);
    const key = `${studentId}:${courseId}`;
    setSavingTargetKey(key);
    const result = await updateEnrollmentTargetTasks({ studentId, courseId, targetTasks });
    setSavingTargetKey(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save target tasks." });
      return;
    }

    setToast({ type: "success", message: "Target tasks updated." });
    setEditingTargetKey(null);
    setTargetDraft("100");
    await loadData();
  }

  function downloadWeeklyReport() {
    const rows = reports.map((report) => {
      const student = studentById.get(report.student_id);
      const course = courseById.get(report.course_id);
      const enrollment = enrollmentByStudentCourse.get(`${report.student_id}:${report.course_id}`);
      return {
        student: student?.full_name ?? "Unknown student",
        email: student?.email ?? "",
        course: course?.title ?? "Unknown course",
        target_tasks: enrollment?.target_tasks ?? report.target_tasks ?? 100,
        reviewed_tasks: report.completed_tasks,
        assigned_tasks: report.total_tasks,
        pending_tasks: report.pending_tasks,
        progress_percentage: report.progress_percentage,
        average_score: report.average_score,
        updated_at: report.updated_at,
      };
    });

    const header = ["Student", "Email", "Course", "Target Tasks", "Reviewed Tasks", "Assigned Tasks", "Pending Tasks", "Progress %", "Average Score", "Updated At"];
    const csv = [
      header.join(","),
      ...rows.map((row) => [
        row.student,
        row.email,
        row.course,
        row.target_tasks,
        row.reviewed_tasks,
        row.assigned_tasks,
        row.pending_tasks,
        row.progress_percentage,
        row.average_score,
        row.updated_at,
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weekly-progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState label="Loading progress reports..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Progress Reports"
        title="Automatic progress reports"
        description="Progress updates automatically when tasks, submissions, or target tasks change."
        action={<button type="button" onClick={downloadWeeklyReport} className="wc-primary-btn text-sm py-2 px-4">Download Weekly Report</button>}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {courseScope !== null && courseScope.length === 0 ? (
          <EmptyState title="No assigned course" description="Ask the admin to assign at least one course to this teacher account." icon="school" />
        ) : reports.length === 0 ? (
          <EmptyState title="No progress reports yet" description="Assign tasks to enrolled students to generate progress records." icon="monitoring" />
        ) : (
          <div className="wc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Tasks</th>
                    <th className="px-4 py-3">Avg Score</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {reports.map((report) => {
                    const key = `${report.student_id}:${report.course_id}`;
                    const enrollment = enrollmentByStudentCourse.get(key);
                    const targetTasks = enrollment?.target_tasks ?? report.target_tasks ?? 100;
                    const isEditing = editingTargetKey === key;
                    const isSaving = savingTargetKey === key;

                    return (
                      <motion.tr key={report.id} whileHover={{ backgroundColor: "rgba(0, 33, 110, 0.02)" }} className="transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-on-surface">{studentById.get(report.student_id)?.full_name ?? "Unknown student"}</p>
                          <p className="text-[11px] text-on-surface-variant">{studentById.get(report.student_id)?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">{courseById.get(report.course_id)?.title ?? "Unknown course"}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="number"
                                min="1"
                                value={targetDraft}
                                onChange={(event) => setTargetDraft(event.target.value)}
                                className="wc-input max-w-28"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => void saveTarget(report.student_id, report.course_id)}
                                  className="wc-primary-btn px-3 py-2 text-xs disabled:opacity-60"
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTargetKey(null);
                                    setTargetDraft(String(targetTasks));
                                  }}
                                  className="wc-secondary-btn px-3 py-2 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-on-surface">{targetTasks} tasks</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTargetKey(key);
                                  setTargetDraft(String(targetTasks));
                                }}
                                className="text-xs font-bold text-primary"
                              >
                                Set target
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-36">
                            <div className="mb-1 flex justify-between text-xs font-bold text-primary">
                              <span>{report.progress_percentage}%</span>
                              <span>{report.completed_tasks}/{targetTasks}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface-container">
                              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${report.progress_percentage}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">{report.completed_tasks} reviewed · {report.pending_tasks} pending</td>
                        <td className="px-4 py-3 text-sm font-bold text-on-surface">{report.average_score}</td>
                        <td className="px-4 py-3 text-[11px] text-on-surface-variant">{formatDateTime(report.updated_at)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
