"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { filterCoursesByScope, filterEnrollmentsByScope, loadTeacherCourseScope, courseInScope, type CourseScope } from "@/lib/admin-course-scope";
import { deleteStudentAccount, resetStudentPassword, setStudentLifecycleStatus, toggleStudentCompletion, updateStudentGithubUrl, updateStudentNotes, updateStudentProgressSummary } from "@/app/admin/actions";
import type { PermissionKey } from "@/lib/admin-permissions";
import type { Application, Course, Enrollment, Profile, ProgressReport, StudentFeeRecord, Submission, Task } from "@/lib/supabase/types";
import { normalizeProfileLinkUrl } from "@/lib/profile-links";
import { formatDate, formatDateTime } from "@/lib/utils";

type StudentRow = Profile & { enrollments: Enrollment[]; progress: ProgressReport[] };
type ApprovedApplicationRow = Application & { hasProfile: boolean };
type StudentViewRow = StudentRow & {
  displayStatus: "active" | "pending_fee" | "completed" | "dropped" | "blocked" | "inactive" | "approved";
  displayStatusLabel: string;
  feeSummaryLabel: string;
  latestFeeMonth: string | null;
};

function compareMonthKeysDesc(a: string, b: string) {
  return b.localeCompare(a);
}

function getStudentStatusLabel(status: StudentViewRow["displayStatus"]) {
  switch (status) {
    case "active":
      return "Active";
    case "pending_fee":
      return "Pending Fee";
    case "completed":
      return "Completed";
    case "dropped":
      return "Dropped";
    case "blocked":
      return "Blocked";
    case "inactive":
      return "Inactive";
    case "approved":
      return "Awaiting Signup";
    default:
      return "Pending Fee";
  }
}

function getFeeSummaryLabel(status: StudentFeeRecord["status"]) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "waived":
      return "Waived";
    case "pending":
    case "overdue":
    default:
      return "Pending Fee";
  }
}

export function StudentsManager({
  currentRole = "admin",
  permissions = [],
}: {
  currentRole?: Profile["role"];
  permissions?: PermissionKey[];
}) {
  const supabase = createSupabaseBrowserClient();
  const canEditStudents = currentRole === "admin" || permissions.includes("students.edit");
  const canDeleteStudents = currentRole === "admin";
  const canAssignTasks = currentRole === "admin" || permissions.includes("tasks.view");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [feeRecords, setFeeRecords] = useState<StudentFeeRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courseScope, setCourseScope] = useState<CourseScope>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [detailStudent, setDetailStudent] = useState<StudentRow | null>(null);

  const [resetModal, setResetModal] = useState<{ open: boolean; student: Profile | null }>({ open: false, student: null });
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [editingGithubStudentId, setEditingGithubStudentId] = useState<string | null>(null);
  const [githubDraft, setGithubDraft] = useState("");
  const [savingGithubStudentId, setSavingGithubStudentId] = useState<string | null>(null);
  const [editingNotesStudentId, setEditingNotesStudentId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<{ weakAreas: string; nextFocus: string; followUpDate: string }>({
    weakAreas: "",
    nextFocus: "",
    followUpDate: "",
  });
  const [savingNotesStudentId, setSavingNotesStudentId] = useState<string | null>(null);
  const [editingProgressStudentId, setEditingProgressStudentId] = useState<string | null>(null);
  const [progressDraft, setProgressDraft] = useState({ completedTasks: 0, targetTasks: 100, averageScore: 0 });
  const [savingProgressStudentId, setSavingProgressStudentId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [studentListTab, setStudentListTab] = useState<"total" | "active" | "completed" | "inactive">("total");

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
    const [profileResult, enrollmentResult, courseResult, progressResult, applicationResult, taskResult, submissionResult, feeResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("title"),
      supabase.from("progress_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("applications").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("student_fee_records").select("*").order("month_key", { ascending: false }),
    ]);
    const error = profileResult.error ?? enrollmentResult.error ?? courseResult.error ?? progressResult.error ?? applicationResult.error ?? taskResult.error ?? submissionResult.error ?? feeResult.error;
    if (error) setToast({ type: "error", message: error.message });
    const scopedEnrollments = filterEnrollmentsByScope(enrollmentResult.data ?? [], scope);
    const scopedStudentIds = new Set(scopedEnrollments.map((enrollment) => enrollment.student_id));
    setProfiles(currentRole === "teacher" ? (profileResult.data ?? []).filter((profile) => scopedStudentIds.has(profile.id)) : (profileResult.data ?? []));
    setApplications((applicationResult.data ?? []).filter((application) => courseInScope(application.course_id, scope)));
    setEnrollments(scopedEnrollments);
    setCourses(filterCoursesByScope(courseResult.data ?? [], scope));
    setProgressReports((progressResult.data ?? []).filter((report) => courseInScope(report.course_id, scope)));
    setFeeRecords((feeResult.data ?? []).filter((fee) => scopedStudentIds.has(fee.student_id)));
    setTasks((taskResult.data ?? []).filter((task) => courseInScope(task.course_id, scope)));
    setSubmissions((submissionResult.data ?? []).filter((submission) => {
      const task = (taskResult.data ?? []).find((item) => item.id === submission.task_id);
      return task ? courseInScope(task.course_id, scope) : false;
    }));
    setLoading(false);
  }, [currentRole, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const enrolledCourses = useMemo(
    () => courses.filter((course) => enrollments.some((enrollment) => enrollment.course_id === course.id)),
    [courses, enrollments],
  );
  const students: StudentRow[] = useMemo(() => profiles.map((profile) => ({
    ...profile,
    enrollments: enrollments.filter((enrollment) => enrollment.student_id === profile.id),
    progress: progressReports.filter((report) => report.student_id === profile.id),
  })), [profiles, enrollments, progressReports]);
  const studentsWithFeeStatus = useMemo<StudentViewRow[]>(() => {
    const feeRecordsByStudentId = feeRecords.reduce((map, fee) => {
      const current = map.get(fee.student_id) ?? [];
      current.push(fee);
      map.set(fee.student_id, current);
      return map;
    }, new Map<string, StudentFeeRecord[]>());

    return students.map((student) => {
      const records = (feeRecordsByStudentId.get(student.id) ?? []).sort((a, b) => compareMonthKeysDesc(a.month_key, b.month_key));
      const latestFee = records[0] ?? null;
      const hasFeeData = records.length > 0;
      let displayStatus: StudentViewRow["displayStatus"] = student.admin_status ?? "approved";
      if (!student.admin_status) {
        if (student.status === "rejected") {
          displayStatus = "inactive";
        } else if (student.enrollments.some((enrollment) => enrollment.status === "completed")) {
          displayStatus = "completed";
        } else if (hasFeeData && (latestFee?.status === "paid" || latestFee?.status === "waived")) {
          displayStatus = "active";
        } else {
          displayStatus = "approved";
        }
      }

      return {
        ...student,
        displayStatus,
        displayStatusLabel: getStudentStatusLabel(displayStatus),
        feeSummaryLabel: latestFee ? getFeeSummaryLabel(latestFee.status) : "Pending Fee",
        latestFeeMonth: latestFee?.month_key ?? null,
      };
    });
  }, [feeRecords, students]);

  const approvedApplications: ApprovedApplicationRow[] = useMemo(
    () => applications
      .filter((application) => !profiles.some((profile) => profile.email?.toLowerCase() === application.email.toLowerCase()))
      .map((application) => ({ ...application, hasProfile: false })),
    [applications, profiles],
  );
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  useEffect(() => {
    if (selectedCourseId && !enrolledCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId("");
    }
  }, [selectedCourseId, enrolledCourses]);

  // Client-side filtering logic
  const filteredApplications = useMemo(() => {
    return approvedApplications.filter((app) => {
      const matchesSearch =
        !searchTerm ||
        app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.phone && app.phone.includes(searchTerm));
      
      const matchesCourse = (!selectedCourseId || app.course_id === selectedCourseId) && courseInScope(app.course_id, courseScope);
      const matchesStatus = !selectedStatus || selectedStatus === "approved";

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [approvedApplications, searchTerm, selectedCourseId, selectedStatus, courseScope]);

  const filteredStudents = useMemo(() => {
    return studentsWithFeeStatus.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        (student.full_name && student.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.phone && student.phone.includes(searchTerm));

      const matchesCourse =
        !selectedCourseId ||
        student.enrollments.some((e) => e.course_id === selectedCourseId);

      return matchesSearch && matchesCourse;
    });
  }, [studentsWithFeeStatus, searchTerm, selectedCourseId]);
  const activeStudents = useMemo(() => filteredStudents.filter((student) => student.displayStatus === "active"), [filteredStudents]);
  const completedStudents = useMemo(
    () => filteredStudents.filter((student) => student.displayStatus === "completed"),
    [filteredStudents],
  );
  const inactiveStudents = useMemo(() => filteredStudents.filter((student) => student.displayStatus === "inactive"), [filteredStudents]);
  const totalStudents = filteredStudents;
  const visibleStudents =
    studentListTab === "active"
      ? activeStudents
      : studentListTab === "completed"
        ? completedStudents
      : studentListTab === "inactive"
        ? inactiveStudents
        : totalStudents;

  async function deleteStudent(student: Profile) {
    if (!canDeleteStudents) {
      setToast({ type: "error", message: "Only the admin can delete student accounts." });
      return;
    }

    if (!confirm(`Delete ${student.full_name ?? student.email ?? "this student"}? This removes the auth account and linked profile.`)) return;

    const result = await deleteStudentAccount(student.id);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to delete student account." });
      return;
    }

    setToast({ type: "success", message: "Student deleted successfully." });
    await loadData();
  }

  async function resetPassword() {
    if (!resetModal.student || !newPassword.trim()) return;
    if (!canEditStudents) {
      setToast({ type: "error", message: "You do not have permission to reset student passwords." });
      return;
    }
    setResetting(true);
    const result = await resetStudentPassword(resetModal.student.id, newPassword.trim());
    setResetting(false);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to reset password." });
      return;
    }
    setToast({ type: "success", message: "Password reset successfully." });
    setResetModal({ open: false, student: null });
    setNewPassword("");
  }

  async function copyNewPassword() {
    if (!newPassword.trim()) {
      setToast({ type: "error", message: "Enter a new password first." });
      return;
    }

    try {
      await navigator.clipboard.writeText(newPassword.trim());
      setToast({ type: "success", message: "New password copied to clipboard." });
    } catch {
      setToast({ type: "error", message: "Copy to clipboard failed." });
    }
  }

  function openGithubEditor(student: StudentRow) {
    setEditingGithubStudentId(student.id);
    setGithubDraft(student.github_url ?? "");
  }

  function cancelGithubEditor() {
    setEditingGithubStudentId(null);
    setGithubDraft("");
  }

  function openNotesEditor(student: StudentRow) {
    setEditingNotesStudentId(student.id);
    setNotesDraft({
      weakAreas: student.weak_areas ?? "",
      nextFocus: student.next_focus ?? "",
      followUpDate: student.follow_up_date ?? "",
    });
  }

  function cancelNotesEditor() {
    setEditingNotesStudentId(null);
    setNotesDraft({ weakAreas: "", nextFocus: "", followUpDate: "" });
  }

  async function saveGithubLink(student: StudentRow) {
    setSavingGithubStudentId(student.id);
    const result = await updateStudentGithubUrl(student.id, githubDraft);
    setSavingGithubStudentId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save GitHub link." });
      return;
    }

    setToast({ type: "success", message: "GitHub link saved." });
    cancelGithubEditor();
    await loadData();
  }

  async function saveStudentNotes(student: StudentRow) {
    setSavingNotesStudentId(student.id);
    const result = await updateStudentNotes({
      studentId: student.id,
      weakAreas: notesDraft.weakAreas,
      nextFocus: notesDraft.nextFocus,
      followUpDate: notesDraft.followUpDate,
    });
    setSavingNotesStudentId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save notes." });
      return;
    }

    setToast({ type: "success", message: "Student notes saved." });
    cancelNotesEditor();
    await loadData();
  }

  function openProgressEditor(student: StudentRow) {
    const { activeEnrollment, progressReport } = getStudentProgress(student);
    const completedTasks = progressReport?.completed_tasks ?? 0;
    const targetTasks = progressReport?.target_tasks ?? activeEnrollment?.target_tasks ?? 100;
    const averageScore = progressReport?.average_score ?? activeEnrollment?.final_score ?? 0;
    setEditingProgressStudentId(student.id);
    setProgressDraft({ completedTasks, targetTasks, averageScore });
  }

  function cancelProgressEditor() {
    setEditingProgressStudentId(null);
    setProgressDraft({ completedTasks: 0, targetTasks: 100, averageScore: 0 });
  }

  async function saveStudentProgress(student: StudentRow) {
    const { activeEnrollment } = getStudentProgress(student);
    const courseId = activeEnrollment?.course_id ?? student.enrollments[0]?.course_id ?? null;
    if (!courseId) {
      setToast({ type: "error", message: "No course enrollment found for this student." });
      return;
    }

    setSavingProgressStudentId(student.id);
    const result = await updateStudentProgressSummary({
      studentId: student.id,
      courseId,
      completedTasks: progressDraft.completedTasks,
      targetTasks: progressDraft.targetTasks,
      averageScore: progressDraft.averageScore,
    });
    setSavingProgressStudentId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to update student progress." });
      return;
    }

    setToast({ type: "success", message: "Student progress updated." });
    cancelProgressEditor();
    await loadData();
  }

  async function setLifecycleStatus(student: StudentRow, nextStatus: "approved" | "active" | "completed" | "inactive") {
    if (!canEditStudents) {
      setToast({ type: "error", message: "You do not have permission to update student status." });
      return;
    }

    const confirmed = confirm(`Set ${student.full_name ?? student.email ?? "this student"} to ${nextStatus}?`);
    if (!confirmed) return;

    const result = await setStudentLifecycleStatus({ studentId: student.id, status: nextStatus });
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to update student lifecycle status." });
      return;
    }

    setToast({ type: "success", message: `Student status changed to ${nextStatus}.` });
    await loadData();
  }

  async function toggleCompletion(student: StudentRow, completed: boolean, courseId?: string | null) {
    if (!canEditStudents) {
      setToast({ type: "error", message: "You do not have permission to update completion status." });
      return;
    }

    const targetCourseId = courseId ?? student.enrollments.find((enrollment) => enrollment.status === "completed")?.course_id ?? student.enrollments[0]?.course_id;
    if (!targetCourseId) {
      setToast({ type: "error", message: "No course enrollment found for this student." });
      return;
    }

    const confirmed = confirm(
      completed
        ? `Mark ${student.full_name ?? student.email ?? "this student"} as completed for this course?`
        : `Reopen ${student.full_name ?? student.email ?? "this student"} for this course? This will remove completion status.`,
    );
    if (!confirmed) return;

    const result = await toggleStudentCompletion(student.id, targetCourseId, completed);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to update completion status." });
      return;
    }

    setToast({ type: "success", message: completed ? "Student marked completed." : "Student reopened successfully." });
    await loadData();
  }

  function getStudentProgress(student: StudentRow) {
    const activeEnrollment = student.enrollments.find((enrollment) => enrollment.status === "active") ?? student.enrollments[0] ?? null;
    const progressReport = activeEnrollment
      ? student.progress.find((report) => report.course_id === activeEnrollment.course_id) ?? null
      : student.progress[0] ?? null;

    return { activeEnrollment, progressReport };
  }

  if (loading) return <LoadingState label="Loading students..." />;

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Students"
        title="Enrolled students"
        description="Approved applications and enrolled student profiles. Approved applicants appear here even before signup, and enrolled profiles appear after the student verifies their email and creates a password."
        action={canAssignTasks ? <Link href="/admin/tasks" className="wc-primary-btn text-sm py-2 px-4">Assign Task</Link> : undefined}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {students.length === 0 && approvedApplications.length === 0 ? (
          <EmptyState title="No student records yet" description="Approve an application to show it here, and have the student sign up to create an enrolled profile." icon="groups" />
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
                  placeholder="Search name, email, phone..."
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
                  {enrolledCourses.map((course) => (
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
                  <option value="active">Active</option>
                  <option value="pending_fee">Pending Fee</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                  <option value="approved">Awaiting Signup</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setStudentListTab("total")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  studentListTab === "total"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Total Students
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${studentListTab === "total" ? "bg-white/20" : "bg-surface-container text-on-surface-variant"}`}>
                  {totalStudents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentListTab("active")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  studentListTab === "active"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Active Students
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${studentListTab === "active" ? "bg-white/20" : "bg-surface-container text-on-surface-variant"}`}>
                  {activeStudents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentListTab("completed")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  studentListTab === "completed"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Completed Students
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${studentListTab === "completed" ? "bg-white/20" : "bg-surface-container text-on-surface-variant"}`}>
                  {completedStudents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStudentListTab("inactive")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  studentListTab === "inactive"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Inactive Students
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${studentListTab === "inactive" ? "bg-white/20" : "bg-surface-container text-on-surface-variant"}`}>
                  {inactiveStudents.length}
                </span>
              </button>
            </div>

            {filteredStudents.length === 0 && filteredApplications.length === 0 ? (
              <EmptyState
                title="No matches found"
                description="Try adjusting your search terms or filters to find what you are looking for."
                icon="search"
              />
            ) : (
              <>
                {studentListTab === "total" ? (
                  <StudentTable
                    title="All Students"
                    students={totalStudents}
                    getStudentProgress={getStudentProgress}
                    editingGithubStudentId={editingGithubStudentId}
                    savingGithubStudentId={savingGithubStudentId}
                    editingNotesStudentId={editingNotesStudentId}
                    savingNotesStudentId={savingNotesStudentId}
                    githubDraft={githubDraft}
                    setGithubDraft={setGithubDraft}
                    notesDraft={notesDraft}
                    setNotesDraft={setNotesDraft}
                    openGithubEditor={openGithubEditor}
                    cancelGithubEditor={cancelGithubEditor}
                    saveGithubLink={saveGithubLink}
                    openNotesEditor={openNotesEditor}
                    cancelNotesEditor={cancelNotesEditor}
                    saveStudentNotes={saveStudentNotes}
                    setDetailStudent={setDetailStudent}
                    setResetModal={setResetModal}
                    setLifecycleStatus={setLifecycleStatus}
                    openProgressEditor={openProgressEditor}
                    editingProgressStudentId={editingProgressStudentId}
                    savingProgressStudentId={savingProgressStudentId}
                    progressDraft={progressDraft}
                    setProgressDraft={setProgressDraft}
                    cancelProgressEditor={cancelProgressEditor}
                    saveStudentProgress={saveStudentProgress}
                    toggleCompletion={toggleCompletion}
                    deleteStudent={deleteStudent}
                    canEditStudents={canEditStudents}
                    canDeleteStudents={canDeleteStudents}
                  />
                ) : visibleStudents.length > 0 ? (
                  <StudentTable
                    title={studentListTab === "active" ? "Active Students" : studentListTab === "completed" ? "Completed Students" : "Inactive Students"}
                    students={visibleStudents}
                    getStudentProgress={getStudentProgress}
                    editingGithubStudentId={editingGithubStudentId}
                    savingGithubStudentId={savingGithubStudentId}
                    editingNotesStudentId={editingNotesStudentId}
                    savingNotesStudentId={savingNotesStudentId}
                    githubDraft={githubDraft}
                    setGithubDraft={setGithubDraft}
                    notesDraft={notesDraft}
                    setNotesDraft={setNotesDraft}
                    openGithubEditor={openGithubEditor}
                    cancelGithubEditor={cancelGithubEditor}
                    saveGithubLink={saveGithubLink}
                    openNotesEditor={openNotesEditor}
                    cancelNotesEditor={cancelNotesEditor}
                    saveStudentNotes={saveStudentNotes}
                    setDetailStudent={setDetailStudent}
                    setResetModal={setResetModal}
                    setLifecycleStatus={setLifecycleStatus}
                    openProgressEditor={openProgressEditor}
                    editingProgressStudentId={editingProgressStudentId}
                    savingProgressStudentId={savingProgressStudentId}
                    progressDraft={progressDraft}
                    setProgressDraft={setProgressDraft}
                    cancelProgressEditor={cancelProgressEditor}
                    saveStudentProgress={saveStudentProgress}
                    toggleCompletion={toggleCompletion}
                    deleteStudent={deleteStudent}
                    canEditStudents={canEditStudents}
                    canDeleteStudents={canDeleteStudents}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </motion.div>

      {resetModal.open && resetModal.student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-primary">Reset Password</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{resetModal.student.full_name} — {resetModal.student.email}</p>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">New Password</span>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wc-input mt-2" placeholder="Enter new password" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void copyNewPassword()} className="wc-secondary-btn">Copy</button>
              <button disabled={resetting || !newPassword.trim()} onClick={resetPassword} className="wc-primary-btn flex-1">{resetting ? "Resetting..." : "Reset Password"}</button>
              <button onClick={() => { setResetModal({ open: false, student: null }); setNewPassword(""); }} className="wc-secondary-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {detailStudent ? (
        <StudentDetailDrawer
          student={detailStudent}
          tasks={tasks.filter((task) => task.student_id === detailStudent.id)}
          submissions={submissions.filter((submission) => submission.student_id === detailStudent.id)}
          progressReports={progressReports.filter((report) => report.student_id === detailStudent.id)}
          taskById={taskById}
          courseById={courseById}
          onClose={() => setDetailStudent(null)}
        />
      ) : null}
    </>
  );
}

function StudentDetailDrawer({
  student,
  tasks,
  submissions,
  progressReports,
  taskById,
  courseById,
  onClose,
}: {
  student: StudentRow;
  tasks: Task[];
  submissions: Submission[];
  progressReports: ProgressReport[];
  taskById: Map<string, Task>;
  courseById: Map<string, Course>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={onClose}>
      <motion.aside
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="h-full w-full max-w-3xl overflow-y-auto bg-background p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Student Details</p>
            <h2 className="mt-1 text-2xl font-black text-on-surface">{student.full_name ?? "Unnamed student"}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{student.email} &middot; {student.phone ?? "No phone"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <span className="rounded-full bg-surface-container px-2 py-1">GitHub</span>
              {student.github_url ? (
                <a href={normalizeProfileLinkUrl(student.github_url)} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">
                  Open repository
                </a>
              ) : (
                <span>Not added yet</span>
              )}
            </div>
            <div className="mt-3 grid gap-2 rounded-xl border border-outline-variant bg-surface-lowest p-3 text-xs text-on-surface-variant">
              <ProfileLinkRow label="LinkedIn" url={student.linkedin_url} />
              <ProfileLinkRow label="Facebook" url={student.facebook_url} />
              <ProfileLinkRow label="Indeed" url={student.indeed_url} />
            </div>
            <div className="mt-3 rounded-xl border border-outline-variant bg-surface-lowest p-3 text-xs text-on-surface-variant">
              <p className="font-bold uppercase tracking-wider text-primary">Admin Notes</p>
              <p className="mt-2"><span className="font-bold text-on-surface">Weak areas:</span> {student.weak_areas ?? "Not added"}</p>
              <p className="mt-1"><span className="font-bold text-on-surface">Next focus:</span> {student.next_focus ?? "Not added"}</p>
              <p className="mt-1"><span className="font-bold text-on-surface">Follow-up:</span> {student.follow_up_date ? formatDate(student.follow_up_date) : "Not set"}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Enrollments" value={student.enrollments.length} icon="school" />
          <SummaryTile label="Tasks" value={tasks.length} icon="assignment" />
          <SummaryTile label="Submissions" value={submissions.length} icon="rate_review" />
        </div>

        <section className="mt-6">
          <h3 className="text-base font-bold text-on-surface">Courses & Progress</h3>
          <div className="mt-3 space-y-3">
            {student.enrollments.length === 0 ? (
              <EmptyState title="No enrollments" description="This student has no course enrollments yet." icon="school" />
            ) : student.enrollments.map((enrollment) => {
              const report = progressReports.find((item) => item.course_id === enrollment.course_id);
              const progress = report?.progress_percentage ?? enrollment.progress_percentage;
              return (
                <div key={enrollment.id} className="rounded-xl border border-outline-variant bg-surface-lowest p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-on-surface">{courseById.get(enrollment.course_id)?.title ?? "Unknown course"}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Reviewed {report?.completed_tasks ?? 0}/{report?.target_tasks ?? enrollment.target_tasks ?? 100} target tasks &middot; Assigned {report?.total_tasks ?? 0} tasks &middot; Average score {report?.average_score ?? enrollment.final_score}
                      </p>
                    </div>
                    <StatusPill value={enrollment.status} />
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-right text-xs font-bold text-primary">{progress}%</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-base font-bold text-on-surface">Assigned Tasks</h3>
          <div className="mt-3 space-y-3">
            {tasks.length === 0 ? (
              <EmptyState title="No tasks" description="No tasks have been assigned to this student yet." icon="assignment" />
            ) : tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-outline-variant bg-surface-lowest p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-on-surface">{task.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{courseById.get(task.course_id)?.title ?? "Unknown course"} &middot; Due {formatDateTime(task.deadline)}</p>
                  </div>
                  <StatusPill value={task.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-base font-bold text-on-surface">Submissions</h3>
          <div className="mt-3 space-y-3">
            {submissions.length === 0 ? (
              <EmptyState title="No submissions" description="Student submissions will appear here after they upload work." icon="rate_review" />
            ) : submissions.map((submission) => {
              const task = taskById.get(submission.task_id);
              return (
                <div key={submission.id} className="rounded-xl border border-outline-variant bg-surface-lowest p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-on-surface">{task?.title ?? "Unknown task"}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Submitted {formatDateTime(submission.submitted_at)} &middot; Score {submission.score}</p>
                      {submission.feedback ? <p className="mt-2 text-xs leading-5 text-on-surface-variant">{submission.feedback}</p> : null}
                    </div>
                    <StatusPill value={submission.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </motion.aside>
    </div>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-lowest p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-primary">
          <Icon name={icon} />
        </span>
        <div>
          <p className="text-2xl font-black text-primary">{value}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StudentTable({
  title,
  students,
  getStudentProgress,
  editingGithubStudentId,
  savingGithubStudentId,
  editingNotesStudentId,
  savingNotesStudentId,
  githubDraft,
  setGithubDraft,
  notesDraft,
  setNotesDraft,
  openGithubEditor,
  cancelGithubEditor,
  saveGithubLink,
  openNotesEditor,
  cancelNotesEditor,
  saveStudentNotes,
  setDetailStudent,
  setResetModal,
  setLifecycleStatus,
  openProgressEditor,
  editingProgressStudentId,
  savingProgressStudentId,
  progressDraft,
  setProgressDraft,
  cancelProgressEditor,
  saveStudentProgress,
  toggleCompletion,
  deleteStudent,
  canEditStudents,
  canDeleteStudents,
}: {
  title: string;
  students: StudentViewRow[];
  getStudentProgress: (student: StudentRow) => { activeEnrollment: Enrollment | null; progressReport: ProgressReport | null };
  editingGithubStudentId: string | null;
  savingGithubStudentId: string | null;
  editingNotesStudentId: string | null;
  savingNotesStudentId: string | null;
  githubDraft: string;
  setGithubDraft: (value: string) => void;
  notesDraft: { weakAreas: string; nextFocus: string; followUpDate: string };
  setNotesDraft: React.Dispatch<React.SetStateAction<{ weakAreas: string; nextFocus: string; followUpDate: string }>>;
  openGithubEditor: (student: StudentRow) => void;
  cancelGithubEditor: () => void;
  saveGithubLink: (student: StudentRow) => Promise<void>;
  openNotesEditor: (student: StudentRow) => void;
  cancelNotesEditor: () => void;
  saveStudentNotes: (student: StudentRow) => Promise<void>;
  setDetailStudent: (student: StudentRow) => void;
  setResetModal: (value: { open: boolean; student: Profile | null }) => void;
  setLifecycleStatus: (student: StudentRow, nextStatus: "approved" | "active" | "completed" | "inactive") => Promise<void>;
  openProgressEditor: (student: StudentRow) => void;
  editingProgressStudentId: string | null;
  savingProgressStudentId: string | null;
  progressDraft: { completedTasks: number; targetTasks: number; averageScore: number };
  setProgressDraft: React.Dispatch<React.SetStateAction<{ completedTasks: number; targetTasks: number; averageScore: number }>>;
  cancelProgressEditor: () => void;
  saveStudentProgress: (student: StudentRow) => Promise<void>;
  toggleCompletion: (student: StudentRow, completed: boolean, courseId?: string | null) => Promise<void>;
  deleteStudent: (student: StudentRow) => Promise<void>;
  canEditStudents: boolean;
  canDeleteStudents: boolean;
}) {
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);
  const toggleRow = (studentId: string) => {
    setExpandedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    );
  };

  return (
    <div className="wc-card overflow-hidden">
      <div className="border-b border-outline-variant/40 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-left">
          <thead className="bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-primary">
            <tr>
              <th className="w-[18%] px-2 py-2">Student</th>
              <th className="w-[18%] px-2 py-2">GitHub</th>
              <th className="w-[16%] px-2 py-2">Notes</th>
              <th className="w-[16%] px-2 py-2">Progress</th>
              <th className="w-[14%] px-2 py-2">Tasks / Score</th>
              <th className="w-[10%] px-2 py-2">Status</th>
              <th className="w-[8%] px-2 py-2">Expand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {students.map((student) => {
              const { activeEnrollment, progressReport } = getStudentProgress(student);
              const progressValue = progressReport?.progress_percentage ?? activeEnrollment?.progress_percentage ?? 0;
              const completedTasks = progressReport?.completed_tasks ?? 0;
              const targetTasks = progressReport?.target_tasks ?? activeEnrollment?.target_tasks ?? 100;
              const averageScore = progressReport?.average_score ?? activeEnrollment?.final_score ?? 0;
              const isEditingGithub = editingGithubStudentId === student.id;
              const isSavingGithub = savingGithubStudentId === student.id;
              const isEditingNotes = editingNotesStudentId === student.id;
              const isSavingNotes = savingNotesStudentId === student.id;
              const isExpanded = expandedStudentIds.includes(student.id);
              const isEditingProgress = editingProgressStudentId === student.id;

              return (
                <>
                <tr key={student.id} className="transition-colors hover:bg-surface-container-low/40">
                  <td className="px-2 py-2 align-top">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">
                        {student.full_name?.slice(0, 1).toUpperCase() ?? "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-on-surface">{student.full_name ?? "Unnamed student"}</p>
                        <p className="truncate text-[11px] text-on-surface-variant">{student.email}</p>
                        <p className="text-[10px] text-on-surface-variant">Joined {formatDate(student.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    {isEditingGithub ? (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={githubDraft}
                          onChange={(event) => setGithubDraft(event.target.value)}
                          className="wc-input text-xs"
                          placeholder="https://github.com/username/repo"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={isSavingGithub} onClick={() => void saveGithubLink(student)} className="wc-primary-btn px-3 py-2 text-xs disabled:opacity-60">
                            {isSavingGithub ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={cancelGithubEditor} className="wc-secondary-btn px-3 py-2 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {student.github_url ? (
                          <a href={normalizeProfileLinkUrl(student.github_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary" title={student.github_url}>
                            <Icon name="link" className="text-[14px]" />
                            Added link
                          </a>
                        ) : (
                          <p className="text-xs text-on-surface-variant">Not added yet</p>
                        )}
                        {canEditStudents ? (
                          <button type="button" onClick={() => openGithubEditor(student)} className="inline-flex items-center gap-1 text-xs font-bold text-primary" title={student.github_url ? "Edit GitHub link" : "Add GitHub link"}>
                            <Icon name="edit" className="text-sm" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Weak areas</span>
                          <textarea value={notesDraft.weakAreas} onChange={(event) => setNotesDraft((current) => ({ ...current, weakAreas: event.target.value }))} className="wc-input mt-1 min-h-16 text-xs" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Next focus</span>
                          <input type="text" value={notesDraft.nextFocus} onChange={(event) => setNotesDraft((current) => ({ ...current, nextFocus: event.target.value }))} className="wc-input mt-1 text-xs" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Follow-up date</span>
                          <input type="date" value={notesDraft.followUpDate} onChange={(event) => setNotesDraft((current) => ({ ...current, followUpDate: event.target.value }))} className="wc-input mt-1 text-xs" />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={isSavingNotes} onClick={() => void saveStudentNotes(student)} className="wc-primary-btn px-3 py-2 text-xs disabled:opacity-60">
                            {isSavingNotes ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={cancelNotesEditor} className="wc-secondary-btn px-3 py-2 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-on-surface-variant">{student.weak_areas || student.next_focus || student.follow_up_date ? "Notes added" : "No notes added"}</p>
                        {canEditStudents ? (
                          <button type="button" onClick={() => openNotesEditor(student)} className="inline-flex items-center gap-2 text-xs font-bold text-primary">
                            <Icon name="edit" className="text-sm" />
                            Add notes
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {isEditingProgress ? (
                      <div className="space-y-2 rounded-xl border border-outline-variant bg-surface-lowest p-2">
                        <div className="grid grid-cols-3 gap-2">
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Completed</span>
                            <input
                              type="number"
                              min={0}
                              value={progressDraft.completedTasks}
                              onChange={(event) => setProgressDraft((current) => ({ ...current, completedTasks: Number(event.target.value) }))}
                              className="wc-input mt-1 text-xs"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Target</span>
                            <input
                              type="number"
                              min={1}
                              value={progressDraft.targetTasks}
                              onChange={(event) => setProgressDraft((current) => ({ ...current, targetTasks: Number(event.target.value) }))}
                              className="wc-input mt-1 text-xs"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Score</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={progressDraft.averageScore}
                              onChange={(event) => setProgressDraft((current) => ({ ...current, averageScore: Number(event.target.value) }))}
                              className="wc-input mt-1 text-xs"
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={savingProgressStudentId === student.id} onClick={() => void saveStudentProgress(student)} className="wc-primary-btn px-3 py-2 text-xs disabled:opacity-60">
                            {savingProgressStudentId === student.id ? "Saving..." : "Save Progress"}
                          </button>
                          <button type="button" onClick={cancelProgressEditor} className="wc-secondary-btn px-3 py-2 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => openProgressEditor(student)} className="min-w-44 text-left">
                        <div className="mb-1 flex justify-between text-[11px] font-bold text-primary">
                          <span>{progressValue}%</span>
                          <span>{completedTasks}/{targetTasks}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-container">
                          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }} />
                        </div>
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px] text-on-surface-variant">
                    <p className="font-semibold text-on-surface">Assigned {student.progress[0]?.total_tasks ?? 0} tasks</p>
                    <p className="text-[11px]">Average score {averageScore}</p>
                  </td>
                  <td className="px-2 py-2 align-top">
                    {canEditStudents ? (
                      <select
                        value={student.displayStatus}
                        onChange={(event) => void setLifecycleStatus(student, event.target.value as "approved" | "active" | "completed" | "inactive")}
                        className="wc-input w-full rounded-full border-0 bg-transparent px-0 py-0 text-xs font-bold uppercase tracking-wider text-primary shadow-none focus:ring-0"
                      >
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <StatusPill value={student.displayStatus} />
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRow(student.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary"
                        aria-label={isExpanded ? "Collapse row" : "Expand row"}
                      >
                        <Icon name={isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} className="text-base" />
                      </button>
                      <button type="button" onClick={() => setDetailStudent(student)} className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-[10px] font-bold text-primary">
                        <Icon name="visibility" className="text-sm" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr key={`${student.id}-expanded`} className="bg-surface-container-low/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">Quick Actions</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {canEditStudents ? (
                              <button type="button" onClick={() => setResetModal({ open: true, student })} className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-xs font-bold text-primary">
                                <Icon name="lock_reset" className="text-sm" />
                                Password
                              </button>
                            ) : null}
                            {canEditStudents ? (
                              <button
                                type="button"
                                onClick={() => void setLifecycleStatus(student, student.displayStatus === "inactive" ? "approved" : "inactive")}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${student.displayStatus === "inactive" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                              >
                                <Icon name={student.displayStatus === "inactive" ? "verified_user" : "person_off"} className="text-sm" />
                                {student.displayStatus === "inactive" ? "Activate" : "Deactivate"}
                              </button>
                            ) : null}
                            {canEditStudents ? (
                              <button
                                type="button"
                                onClick={() => void toggleCompletion(student, student.displayStatus !== "completed", student.enrollments.find((enrollment) => enrollment.status === "completed")?.course_id ?? student.enrollments[0]?.course_id ?? null)}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                                  student.displayStatus === "completed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-indigo-100 text-indigo-800"
                                }`}
                              >
                                <Icon name={student.displayStatus === "completed" ? "undo" : "workspace_premium"} className="text-sm" />
                                {student.displayStatus === "completed" ? "Reopen" : "Mark Completed"}
                              </button>
                            ) : null}
                            {canDeleteStudents ? (
                              <button type="button" onClick={() => void deleteStudent(student)} className="inline-flex items-center gap-1 rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-error">
                                <Icon name="delete" className="text-sm" />
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">Summary</p>
                          <div className="mt-3 grid gap-2 text-xs text-on-surface-variant sm:grid-cols-2">
                            <p>GitHub: {student.github_url ? "Added" : "Not added"}</p>
                            <p>Notes: {student.weak_areas || student.next_focus || student.follow_up_date ? "Added" : "Not added"}</p>
                            <p>Progress: {progressValue}%</p>
                            <p>Tasks: {completedTasks}/{targetTasks}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileLinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bold text-on-surface">{label}</span>
      {url ? (
        <a href={normalizeProfileLinkUrl(url)} target="_blank" rel="noreferrer" className="truncate font-semibold text-primary underline underline-offset-4">
          Open
        </a>
      ) : (
        <span>Not added</span>
      )}
    </div>
  );
}
