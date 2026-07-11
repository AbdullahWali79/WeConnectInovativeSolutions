"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Enrollment, ManualEnrollment, Profile } from "@/lib/supabase/types";
import { createManualCompletion } from "@/app/admin/actions";
import { formatDate } from "@/lib/utils";

type StudentCourseOption = {
  courseId: string;
  courseName: string;
  enrollmentDate: string | null;
  status: Enrollment["status"] | "none";
};

function compareCreatedDesc(a: { created_at: string }, b: { created_at: string }) {
  return b.created_at.localeCompare(a.created_at);
}

function dateOnly(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ManualCompletionManager() {
  const supabase = createSupabaseBrowserClient();
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [manualEnrollments, setManualEnrollments] = useState<ManualEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [certificateIssued, setCertificateIssued] = useState(true);
  const [showOnCompletedPage, setShowOnCompletedPage] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [studentResult, courseResult, enrollmentResult, manualResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("manual_enrollments").select("*").order("created_at", { ascending: false }),
    ]);

    const error = studentResult.error ?? courseResult.error ?? enrollmentResult.error ?? manualResult.error;
    if (error) {
      setToast({ type: "error", message: error.message });
    }

    setStudents((studentResult.data ?? []) as Profile[]);
    setCourses((courseResult.data ?? []) as Course[]);
    setEnrollments((enrollmentResult.data ?? []) as Enrollment[]);
    setManualEnrollments((manualResult.data ?? []) as ManualEnrollment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const enrollmentsByStudentId = useMemo(() => {
    return enrollments.reduce((map, enrollment) => {
      const current = map.get(enrollment.student_id) ?? [];
      current.push(enrollment);
      map.set(enrollment.student_id, current);
      return map;
    }, new Map<string, Enrollment[]>());
  }, [enrollments]);
  const manualKeySet = useMemo(() => {
    return new Set(
      manualEnrollments.map((record) => {
        const email = record.email?.trim().toLowerCase() ?? "";
        const courseName = record.course_name.trim().toLowerCase();
        return `${email}::${courseName}`;
      }),
    );
  }, [manualEnrollments]);

  const studentRows = useMemo(() => {
    return students
      .filter((student) => student.role === "student")
      .map((student) => {
        const studentEnrollments = (enrollmentsByStudentId.get(student.id) ?? []).slice().sort(compareCreatedDesc);
        const primaryEnrollment = studentEnrollments[0] ?? null;
        const options: StudentCourseOption[] = studentEnrollments.length > 0
          ? studentEnrollments.map((enrollment) => ({
              courseId: enrollment.course_id,
              courseName: courseById.get(enrollment.course_id)?.title ?? "Unknown course",
              enrollmentDate: enrollment.created_at,
              status: enrollment.status,
            }))
          : courses.map((course) => ({
              courseId: course.id,
              courseName: course.title,
              enrollmentDate: student.created_at,
              status: "none",
            }));

        const selectedCourse = primaryEnrollment?.course_id ? courseById.get(primaryEnrollment.course_id) : null;
        const selectedCourseTitle = options[0]?.courseName ?? "No course selected";
        const hasManualRecord = Boolean(
          student.email &&
            manualKeySet.has(`${student.email.trim().toLowerCase()}::${(selectedCourse?.title ?? "").trim().toLowerCase()}`),
        );

        return {
          student,
          primaryEnrollment,
          options,
          selectedCourseTitle,
          manualCount: student.email
            ? manualEnrollments.filter((record) => record.email?.trim().toLowerCase() === student.email?.trim().toLowerCase()).length
            : 0,
          hasManualRecord,
        };
      })
      .filter((row) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          row.student.full_name?.toLowerCase().includes(term) ||
          row.student.email?.toLowerCase().includes(term) ||
          row.options.some((option) => option.courseName.toLowerCase().includes(term))
        );
      });
  }, [courseById, courses, enrollmentsByStudentId, manualEnrollments, manualKeySet, search, students]);

  const activeStudent = activeStudentId ? studentById.get(activeStudentId) ?? null : null;
  const activeEnrollments = activeStudent ? (enrollmentsByStudentId.get(activeStudent.id) ?? []).slice().sort(compareCreatedDesc) : [];
  const activeCourseOptions: StudentCourseOption[] = activeEnrollments.length > 0
    ? activeEnrollments.map((enrollment) => ({
        courseId: enrollment.course_id,
        courseName: courseById.get(enrollment.course_id)?.title ?? "Unknown course",
        enrollmentDate: enrollment.created_at,
        status: enrollment.status,
      }))
    : courses.map((course) => ({
        courseId: course.id,
        courseName: course.title,
        enrollmentDate: activeStudent?.created_at ?? null,
        status: "none",
      }));

  const selectedCourse = selectedCourseId ? courseById.get(selectedCourseId) ?? null : null;
  const selectedEnrollment = activeEnrollments.find((enrollment) => enrollment.course_id === selectedCourseId) ?? null;
  const startDate = dateOnly(selectedEnrollment?.created_at ?? activeStudent?.created_at ?? null) || new Date().toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  const manualRecordKey = activeStudent?.email && selectedCourse ? `${activeStudent.email.trim().toLowerCase()}::${selectedCourse.title.trim().toLowerCase()}` : "";
  const hasManualRecord = manualRecordKey ? manualKeySet.has(manualRecordKey) : false;
  const selectedCourseStatus = selectedEnrollment?.status ?? "none";
  const isAlreadyCompleted = selectedCourseStatus === "completed" || hasManualRecord;

  function openCompletion(studentId: string) {
    const student = studentById.get(studentId);
    if (!student) return;
    const studentEnrollments = (enrollmentsByStudentId.get(studentId) ?? []).slice().sort(compareCreatedDesc);
    const defaultCourseId = studentEnrollments[0]?.course_id ?? courses[0]?.id ?? "";
    setActiveStudentId(studentId);
    setSelectedCourseId(defaultCourseId);
    setCertificateIssued(true);
    setShowOnCompletedPage(true);
    setNotes(`Manual completion created for ${student.full_name ?? student.email ?? "student"}.`);
  }

  useEffect(() => {
    if (!activeStudentId) return;
    const available = activeCourseOptions.find((option) => option.courseId === selectedCourseId);
    if (!available && activeCourseOptions.length > 0) {
      setSelectedCourseId(activeCourseOptions[0].courseId);
    }
  }, [activeCourseOptions, activeStudentId, selectedCourseId]);

  async function handleSave() {
    if (!activeStudentId || !selectedCourseId) {
      setToast({ type: "error", message: "Select a student and course first." });
      return;
    }

    setSaving(true);
    const result = await createManualCompletion({
      studentId: activeStudentId,
      courseId: selectedCourseId,
      certificateIssued,
      showOnCompletedPage,
      notes,
    });
    setSaving(false);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to create manual completion." });
      return;
    }

    setToast({ type: "success", message: "Manual completion created at 100/100." });
    setActiveStudentId(null);
    setSelectedCourseId("");
    await loadData();
  }

  if (loading) return <LoadingState label="Loading manual completions..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Manual Completion"
        title="Complete students manually"
        description="Pick any student, auto-fill the start and end dates, and create a public 100/100 completion record."
        action={<Link href="/admin/manual-enrollments" className="wc-secondary-btn px-4 py-2 text-sm"><Icon name="list" className="text-base" /> Manual Records</Link>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Students", value: students.length, icon: "groups" },
          { label: "Approved", value: students.filter((student) => student.status === "approved").length, icon: "verified" },
          { label: "Manual Records", value: manualEnrollments.length, icon: "workspace_premium" },
          { label: "Public Records", value: manualEnrollments.filter((record) => record.show_on_completed_page).length, icon: "visibility" },
        ].map((stat) => (
          <div key={stat.label} className="wc-card flex items-center gap-3 p-4">
            <Icon name={stat.icon} className="text-2xl text-primary" />
            <div>
              <p className="text-2xl font-extrabold text-on-surface">{stat.value}</p>
              <p className="text-xs text-on-surface-variant">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or course..."
            className="wc-input w-full pl-10"
          />
        </div>
      </div>

      <div className="wc-card overflow-hidden">
        <div className="border-b border-outline-variant/70 p-4">
          <p className="wc-label">Students</p>
          <h2 className="mt-1 text-base font-bold text-on-surface">{studentRows.length} records</h2>
        </div>

        {studentRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No students found"
              description="Approve student accounts first, then create a manual completion for them."
              icon="school"
            />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {studentRows.map(({ student, options, selectedCourseTitle, manualCount }, index) => {
              const canComplete = student.status === "approved" && options.length > 0;
              const currentCourse = options[0];
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {student.full_name?.charAt(0).toUpperCase() ?? "S"}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{student.full_name ?? "Unnamed student"}</p>
                        <p className="text-xs text-on-surface-variant">{student.email ?? "No email"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${student.status === "approved" ? "bg-emerald-100 text-emerald-800" : student.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                        {student.status}
                      </span>
                      {isAlreadyCompleted ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary">
                          Already completed
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3">
                      <p>Current course: <span className="font-semibold text-on-surface">{selectedCourseTitle}</span></p>
                      <p>Enrollments: <span className="font-semibold text-on-surface">{options.length}</span></p>
                      <p>Manual records: <span className="font-semibold text-on-surface">{manualCount}</span></p>
                    </div>

                    <p className="mt-3 text-xs text-on-surface-variant">
                      {currentCourse ? `Latest enrollment starts ${formatDate(currentCourse.enrollmentDate)}.` : "No enrollment found; you can still select a course in the completion dialog."}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCompletion(student.id)}
                      disabled={!canComplete}
                      className="wc-primary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="workspace_premium" className="text-base" />
                      {isAlreadyCompleted ? "Refresh Completion" : "Manual Complete"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeStudent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setActiveStudentId(null);
                setSelectedCourseId("");
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 18 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-background shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-outline-variant/70 p-5">
                <div>
                  <p className="wc-label">Manual Completion</p>
                  <h2 className="mt-1 text-xl font-black text-on-surface">{activeStudent.full_name ?? "Unnamed student"}</h2>
                  <p className="text-sm text-on-surface-variant">{activeStudent.email ?? "No email"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudentId(null);
                    setSelectedCourseId("");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container"
                >
                  <Icon name="close" className="text-on-surface-variant" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-outline-variant/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Start Date</p>
                    <p className="mt-2 text-lg font-black text-on-surface">{startDate}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Auto-filled from the enrollment date or student record.</p>
                  </div>
                  <div className="rounded-2xl border border-outline-variant/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Completion Date</p>
                    <p className="mt-2 text-lg font-black text-on-surface">{endDate}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Uses today&apos;s date automatically.</p>
                  </div>
                </div>

                <div>
                  <label className="wc-label mb-1">Course</label>
                  <select
                    className="wc-input w-full"
                    value={selectedCourseId}
                    onChange={(event) => setSelectedCourseId(event.target.value)}
                  >
                    {activeCourseOptions.map((option) => (
                      <option key={option.courseId} value={option.courseId}>
                        {option.courseName} {option.status === "completed" ? "(completed)" : option.status === "active" ? "(active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-surface-container p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Score</p>
                    <p className="mt-2 text-2xl font-black text-primary">100/100</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Marks</p>
                    <p className="mt-2 text-2xl font-black text-primary">25/25</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Grade</p>
                    <p className="mt-2 text-2xl font-black text-primary">A+</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant/70 p-4">
                    <input
                      type="checkbox"
                      checked={certificateIssued}
                      onChange={(event) => setCertificateIssued(event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Issue certificate</p>
                      <p className="text-xs text-on-surface-variant">Create the completion certificate record.</p>
                    </div>
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant/70 p-4">
                    <input
                      type="checkbox"
                      checked={showOnCompletedPage}
                      onChange={(event) => setShowOnCompletedPage(event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Show on public page</p>
                      <p className="text-xs text-on-surface-variant">Publish the record in completed students.</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="wc-label mb-1">Notes</label>
                  <textarea
                    className="wc-input w-full"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional admin note"
                  />
                </div>

                {isAlreadyCompleted ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    This student already has a completion for the selected course. Saving again will update the existing record.
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/70 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudentId(null);
                      setSelectedCourseId("");
                    }}
                    className="wc-secondary-btn px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !selectedCourseId}
                    className="wc-primary-btn px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name={saving ? "hourglass_empty" : "workspace_premium"} className="text-base" />
                    {saving ? "Saving..." : "Create Manual Completion"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
