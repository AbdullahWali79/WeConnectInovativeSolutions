"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Image, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Enrollment, Profile, ProgressReport, StudentProject, Submission, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import * as XLSX from "xlsx";
import { getMissingProfileLinks, isStudentProfileComplete } from "@/lib/profile-links";

type ExportFormat = "pdf" | "xlsx" | "projects-pdf" | "projects-xlsx";

type DateWiseReportRow = {
  sortKey: string;
  date: string;
  course: string;
  task: string;
  feedback: string;
  status: string;
  deadline: string;
  submitted_at: string;
  reviewed_at: string;
  score: string;
  max_score: number;
};

type SubmissionRow = {
  submission: Submission;
  task: Task | null;
  courseTitle: string;
};

type TaskSubmissionRow = {
  task: Task;
  submission: Submission | null;
  courseTitle: string;
};

type ProgressCourse = {
  courseId: string;
  enrollment: Enrollment | null;
};

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function getReportPeriod(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) return `${formatDateOnly(dateFrom)} to ${formatDateOnly(dateTo)}`;
  if (dateFrom) return `From ${formatDateOnly(dateFrom)}`;
  if (dateTo) return `Up to ${formatDateOnly(dateTo)}`;
  return "Complete Report";
}

function toDateMs(value: string) {
  return new Date(value).getTime();
}

function formatReportStatus(status: string) {
  if (status === "reviewed") return "Accepted";
  if (status === "revision_required") return "Revision Required";
  if (status === "rejected") return "Rejected";
  if (status === "submitted") return "Submitted";
  return status.replaceAll("_", " ");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 18,
    fontSize: 8,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: { flexGrow: 1 },
  logo: { width: 44, height: 44, marginLeft: 12, borderRadius: 8, objectFit: "contain", backgroundColor: "#ffffff" },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: "#dbeafe",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  metaChip: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 7.5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#082f75",
    color: "#ffffff",
  },
  tableHeaderCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 7.5,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    fontSize: 7.5,
    color: "#0f172a",
  },
  muted: { color: "#64748b" },
  noData: {
    marginTop: 20,
    padding: 16,
    textAlign: "center",
    color: "#475569",
    borderWidth: 1,
    borderColor: "#dbe4ff",
    borderRadius: 8,
  },
});

function DateWiseProgressReportPdf({
  rows,
  studentName,
  skillName,
  logoUrl,
}: {
  rows: DateWiseReportRow[];
  studentName: string;
  skillName: string;
  logoUrl: string;
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerText}>
            <Text style={pdfStyles.title}>{studentName}</Text>
            <Text style={pdfStyles.subtitle}>{skillName}</Text>
          </View>
          {/* @react-pdf/renderer Image does not support the DOM alt property. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoUrl} style={pdfStyles.logo} />
        </View>

        {rows.length === 0 ? (
          <Text style={pdfStyles.noData}>No tasks found for the selected date range.</Text>
        ) : (
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: "55%" }]}>Task / Project</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: "20%" }]}>Score</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: "25%" }]}>Status</Text>
            </View>
            {rows.map((row, index) => (
              <View key={`${row.date}-${row.task}-${index}`} style={pdfStyles.tableRow} wrap={false}>
                <Text style={[pdfStyles.tableCell, { width: "55%" }]}>{row.task}</Text>
                <Text style={[pdfStyles.tableCell, { width: "20%" }]}>{row.max_score > 0 ? `${row.score}/${row.max_score}` : "N/A"}</Text>
                <Text style={[pdfStyles.tableCell, { width: "25%" }]}>{row.status}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function StudentProgress({ targetStudentId, adminMode = false }: { targetStudentId?: string; adminMode?: boolean } = {}) {
  const supabase = createSupabaseBrowserClient();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let reportQuery = supabase.from("progress_reports").select("*").order("updated_at", { ascending: false });
    let enrollmentQuery = supabase.from("enrollments").select("*");
    let taskQuery = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    let submissionQuery = supabase.from("submissions").select("*").order("submitted_at", { ascending: false });
    let projectQuery = supabase.from("student_projects").select("*").eq("status", "approved").order("reviewed_at", { ascending: false });
    if (targetStudentId) {
      reportQuery = reportQuery.eq("student_id", targetStudentId);
      enrollmentQuery = enrollmentQuery.eq("student_id", targetStudentId);
      taskQuery = taskQuery.eq("student_id", targetStudentId);
      submissionQuery = submissionQuery.eq("student_id", targetStudentId);
      projectQuery = projectQuery.eq("student_id", targetStudentId);
    }
    const [reportResult, courseResult, enrollmentResult, taskResult, submissionResult, projectResult, userResult] = await Promise.all([
      reportQuery,
      supabase.from("courses").select("*"),
      enrollmentQuery,
      taskQuery,
      submissionQuery,
      projectQuery,
      supabase.auth.getUser(),
    ]);
    setReports(reportResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setEnrollments(enrollmentResult.data ?? []);
    setTasks(taskResult.data ?? []);
    setSubmissions(submissionResult.data ?? []);
    setProjects((projectResult.data ?? []) as StudentProject[]);
    const userId = targetStudentId ?? userResult.data.user?.id;
    if (userId) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(profileData as Profile | null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [supabase, targetStudentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const profileComplete = profile ? isStudentProfileComplete(profile) : false;
  const missingLinks = profile ? getMissingProfileLinks(profile) : [];

  const submissionRows = useMemo<SubmissionRow[]>(() => {
    return submissions
      .map((submission) => {
        const task = tasks.find((item) => item.id === submission.task_id);
        const title = task?.title?.trim().toLowerCase() ?? "";
        if (title.includes("client hunting")) return null;
        const courseTitle = task ? courseById.get(task.course_id)?.title ?? "Unknown course" : "Unknown course";
        return { submission, task, courseTitle };
      })
      .filter((row): row is SubmissionRow => Boolean(row))
      .sort((first, second) => toDateMs(second.submission.submitted_at) - toDateMs(first.submission.submitted_at));
  }, [courseById, submissions, tasks]);

  const taskSubmissionRows = useMemo<TaskSubmissionRow[]>(() => {
    const visibleTasks = tasks.filter((task) => {
      const title = task.title.trim().toLowerCase();
      if (title.includes("client hunting")) return false;
      return true;
    });

    return visibleTasks
      .map((task) => {
        const submission = submissions.find((item) => item.task_id === task.id) ?? null;
        const courseTitle = courseById.get(task.course_id)?.title ?? "Unknown course";
        return { task, submission, courseTitle };
      })
      .sort((first, second) => {
        const firstDate = first.submission?.submitted_at ?? first.task.created_at;
        const secondDate = second.submission?.submitted_at ?? second.task.created_at;
        return toDateMs(secondDate) - toDateMs(firstDate);
      });
  }, [courseById, submissions, tasks]);

  const progressCourses = useMemo<ProgressCourse[]>(() => {
    const courseIds = new Set<string>();
    enrollments.forEach((item) => courseIds.add(item.course_id));
    reports.forEach((item) => courseIds.add(item.course_id));
    tasks.forEach((item) => courseIds.add(item.course_id));
    projects.forEach((item) => {
      if (item.course_id) courseIds.add(item.course_id);
    });

    return [...courseIds].map((courseId) => ({
      courseId,
      enrollment: enrollments.find((item) => item.course_id === courseId) ?? null,
    }));
  }, [enrollments, projects, reports, tasks]);

  const reportRows = useMemo(() => {
    const startMs = reportStart ? new Date(`${reportStart}T00:00:00`).getTime() : null;
    const endMs = reportEnd ? new Date(`${reportEnd}T23:59:59.999`).getTime() : null;

    const taskRows: DateWiseReportRow[] = taskSubmissionRows
      .filter(({ task, submission }) => {
        const activityMs = toDateMs(submission?.submitted_at ?? task.created_at);
        return (startMs === null || activityMs >= startMs) && (endMs === null || activityMs <= endMs);
      })
      .map(({ submission, task, courseTitle }) => ({
        sortKey: submission?.submitted_at ?? task.created_at,
        date: formatDateOnly(submission?.submitted_at ?? task.created_at),
        course: courseTitle,
        task: task.title,
        feedback: submission?.feedback?.trim() || "No feedback yet.",
        status: formatReportStatus(submission?.status ?? task.status),
        deadline: formatDateOnly(task.deadline),
        submitted_at: formatDateOnly(submission?.submitted_at),
        reviewed_at: formatDateOnly(submission?.reviewed_at),
        score: String(submission?.score ?? 0),
        max_score: task.max_score ?? 100,
      }));

    const projectRows: DateWiseReportRow[] = projects
      .filter((project) => {
        const activityMs = toDateMs(project.reviewed_at ?? project.updated_at ?? project.created_at);
        return (startMs === null || activityMs >= startMs) && (endMs === null || activityMs <= endMs);
      })
      .map((project) => ({
        sortKey: project.reviewed_at ?? project.updated_at ?? project.created_at,
        date: formatDateOnly(project.reviewed_at ?? project.updated_at ?? project.created_at),
        course: project.course_id ? courseById.get(project.course_id)?.title ?? "Unknown course" : "Projects",
        task: `[Project] ${project.title}`,
        feedback: project.admin_feedback?.trim() || "No feedback yet.",
        status: formatReportStatus(project.status),
        deadline: "-",
        submitted_at: formatDateOnly(project.created_at),
        reviewed_at: formatDateOnly(project.reviewed_at),
        score: "N/A",
        max_score: 0,
      }));

    return [...taskRows, ...projectRows].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [courseById, projects, reportEnd, reportStart, taskSubmissionRows]);

  const reportSummary = useMemo(() => {
    const uniqueCourses = new Set(reportRows.map((row) => row.course));
    const reviewedCount = reportRows.filter((row) => row.status === "Accepted").length;
    const reviewedScores = reportRows
      .filter((row) => Number(row.score) > 0)
      .map((row) => Number(row.score));
    const averageScore = reviewedScores.length > 0
      ? Math.round(reviewedScores.reduce((total, score) => total + score, 0) / reviewedScores.length)
      : 0;

    return {
      courses: uniqueCourses.size,
      tasks: reportRows.filter((row) => !row.task.startsWith("[Project] ")).length,
      projects: reportRows.filter((row) => row.task.startsWith("[Project] ")).length,
      reviewed: reviewedCount,
      averageScore,
    };
  }, [reportRows]);

  async function exportReport(format: ExportFormat) {
    setExporting(format);

    try {
      const isProjectsOnly = format === "projects-pdf" || format === "projects-xlsx";
      const exportRows = isProjectsOnly
        ? reportRows.filter((row) => row.task.startsWith("[Project] "))
        : reportRows;
      const fileBase = isProjectsOnly
        ? (reportStart || reportEnd ? `projects-report-${reportStart || "start"}-to-${reportEnd || "latest"}` : "complete-projects-report")
        : reportStart || reportEnd
        ? `progress-report-${reportStart || "start"}-to-${reportEnd || "latest"}`
        : "complete-progress-report";

      if (format === "pdf" || format === "projects-pdf") {
        const blob = await pdf(
          <DateWiseProgressReportPdf
            rows={exportRows}
            studentName={profile?.full_name?.trim() || profile?.email || "Student"}
            skillName={isProjectsOnly
              ? "Completed Projects"
              : [...new Set(reportRows.map((row) => row.course).filter((course) => course !== "Projects" && course !== "Unknown course"))].join(", ") || "Skills Progress Report"}
            logoUrl={`${window.location.origin}/logo.jpeg`}
          />,
        ).toBlob();
        downloadBlob(blob, `${fileBase}.pdf`);
        return;
      }

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["We Connect Innovative Solutions"],
        ["Report Period", getReportPeriod(reportStart, reportEnd)],
        ["Courses", reportSummary.courses],
        ["Tasks", reportSummary.tasks],
        ["Projects", reportSummary.projects],
        ["Reviewed", reportSummary.reviewed],
        ["Average Score", reportSummary.averageScore],
      ]);
      summarySheet["!cols"] = [{ wch: 22 }, { wch: 28 }];

      const detailSheet = XLSX.utils.json_to_sheet(exportRows.map((row) => ({
        "Task / Project": row.task,
        Score: row.score,
        "Max Score": row.max_score,
        Status: row.status,
        Course: row.course,
        Date: row.date,
        Deadline: row.deadline,
        Submitted: row.submitted_at,
        Reviewed: row.reviewed_at,
      })));
      detailSheet["!cols"] = [
        { wch: 34 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Date Wise Report");

      const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      downloadBlob(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  if (loading) return <LoadingState label="Loading your progress..." />;

  return (
    <>
      <PageHeader
        eyebrow={adminMode ? "Student Reports" : "My Progress"}
        title={adminMode ? `${profile?.full_name || profile?.email || "Student"} report` : "Progress report"}
        description={adminMode ? "Download this student's complete task and project reports in the same format available in the student portal." : "Your target tasks and completion percentages update automatically after admin reviews submissions."}
        action={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block">
              <span className="wc-label">From</span>
              <input className="wc-input mt-2" type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} />
            </label>
            <label className="block">
              <span className="wc-label">To</span>
              <input className="wc-input mt-2" type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void exportReport("pdf")}
                disabled={exporting !== null}
                className="wc-primary-btn text-sm py-2 px-4 disabled:opacity-60"
              >
                {exporting === "pdf" ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => void exportReport("xlsx")}
                disabled={exporting !== null}
                className="wc-secondary-btn text-sm py-2 px-4 disabled:opacity-60"
              >
                {exporting === "xlsx" ? "Preparing Excel..." : "Download Excel"}
              </button>
              <button
                type="button"
                onClick={() => void exportReport("projects-pdf")}
                disabled={exporting !== null || reportSummary.projects === 0}
                className="wc-secondary-btn text-sm py-2 px-4 disabled:opacity-60"
              >
                {exporting === "projects-pdf" ? "Preparing Projects..." : "Download Projects PDF"}
              </button>
              <button
                type="button"
                onClick={() => void exportReport("projects-xlsx")}
                disabled={exporting !== null || reportSummary.projects === 0}
                className="wc-secondary-btn text-sm py-2 px-4 disabled:opacity-60"
              >
                {exporting === "projects-xlsx" ? "Preparing Projects..." : "Download Projects Excel"}
              </button>
            </div>
          </div>
        }
      />
      {!profileComplete ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-bold">Profile links incomplete</p>
          <p className="mt-1 text-sm">
            Add your social profile links before your internship score is counted.
          </p>
          {missingLinks.length > 0 ? <p className="mt-2 text-xs font-semibold">Missing: {missingLinks.map((item) => item.label).join(", ")}</p> : null}
        </div>
      ) : null}
      {progressCourses.length === 0 ? (
        <EmptyState title="No progress yet" description="Your assigned tasks and reviewed work will appear here." icon="monitoring" />
      ) : (
      <div className="space-y-8">
          {progressCourses.map(({ courseId, enrollment }) => {
            const report = reports.find((item) => item.course_id === courseId);
            const courseSubmissions = taskSubmissionRows.filter((row) => row.task.course_id === courseId);
            const targetTasks = report?.target_tasks ?? enrollment?.target_tasks ?? 100;
            const reviewedSubmissions = courseSubmissions.filter((row) => row.submission?.status === "reviewed");
            const reviewedTasks = report?.completed_tasks ?? reviewedSubmissions.length;
            const courseProjects = projects.filter((project) => project.course_id === courseId || (!project.course_id && progressCourses.length === 1));
            const approvedProjects = courseProjects.length;
            const completedWork = reviewedTasks + approvedProjects;
            const progress = report?.progress_percentage ?? enrollment?.progress_percentage ?? Math.min(100, Math.round((completedWork / Math.max(targetTasks, 1)) * 100));
            const scoredSubmissions = reviewedSubmissions.filter((row) => row.submission?.score != null);
            const derivedAverage = scoredSubmissions.length
              ? Math.round((scoredSubmissions.reduce((total, row) => total + (row.submission?.score ?? 0), 0) / scoredSubmissions.length) * 100) / 100
              : 0;
            const averageScore = profileComplete ? (report?.average_score ?? enrollment?.final_score ?? derivedAverage) : "Pending";
            return (
              <section key={courseId} className="wc-card">
                <div className="sticky top-0 z-20 rounded-t-2xl bg-primary p-4 text-white shadow-lg sm:p-6">
                  <p className="text-label-sm uppercase tracking-widest text-blue-100">{enrollment?.status ?? "Assigned work"}</p>
                  <h2 className="mt-2 break-words text-xl font-extrabold sm:text-3xl">{courseById.get(courseId)?.title ?? "Course"}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 xl:grid-cols-5">
                    <Metric label="Progress" value={`${progress}%`} />
                    <Metric label="Target Work" value={targetTasks} />
                    <Metric label="Tasks Completed" value={reviewedTasks} />
                    <Metric label="Projects Completed" value={approvedProjects} />
                    <Metric label="Average Score" value={averageScore} />
                  </div>
                  <div className="mt-6 h-3 rounded-full bg-white/20"><div className="h-3 rounded-full bg-secondary-container" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-sm text-blue-100">{reviewedTasks} reviewed tasks + {approvedProjects} approved projects = {reviewedTasks + approvedProjects} of {targetTasks} target work</p>
                </div>

                <div className="overflow-hidden rounded-b-2xl divide-y divide-outline-variant/70">
                  {courseSubmissions.length === 0 ? (
                    <p className="p-6 text-body-md text-on-surface-variant">No submitted tasks for this course yet.</p>
                  ) : (
                    courseSubmissions
                      .map(({ task, submission }) => {
                      return (
                        <div key={submission?.id ?? task.id} className="grid gap-3 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_180px_180px_180px] md:items-center">
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface">{task.title}</p>
                            <p className="text-body-sm text-on-surface-variant">Deadline {formatDateTime(task.deadline)}</p>
                          </div>
                          <StatusPill value={submission?.status ?? task.status} />
                          <p className="text-body-sm text-on-surface-variant">{formatDateTime(submission?.submitted_at ?? task.created_at)}</p>
                          <p className="text-body-sm text-on-surface-variant">Score {submission?.score ?? 0}/{task.max_score ?? 100}</p>
                          <TaskFeedback feedback={submission?.feedback} />
                        </div>
                      );
                    })
                  )}
                  {courseProjects.length > 0 ? (
                    <div className="border-t-4 border-primary/20">
                      <div className="bg-surface-container-low px-4 py-3 sm:px-6">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Completed projects ({courseProjects.length})</p>
                      </div>
                      {courseProjects.map((project) => (
                        <div key={project.id} className="grid gap-3 border-t border-outline-variant/70 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_180px_180px_180px] md:items-center">
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface">{project.title}</p>
                            <p className="text-body-sm text-on-surface-variant">Project</p>
                          </div>
                          <StatusPill value={project.status} />
                          <p className="text-body-sm text-on-surface-variant">{formatDateTime(project.reviewed_at ?? project.updated_at)}</p>
                          <p className="text-body-sm text-on-surface-variant">Project completed</p>
                          <TaskFeedback feedback={project.admin_feedback} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}

          <section className="wc-card overflow-hidden">
            <div className="bg-surface-container-low p-4 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">All submissions</p>
              <h2 className="mt-2 text-xl font-extrabold text-on-surface">Tasks submitted by you</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                This section lists every task submission found for your account.
              </p>
            </div>
            <div className="divide-y divide-outline-variant/70">
              {submissionRows.length === 0 ? (
                <p className="p-6 text-body-md text-on-surface-variant">No submitted tasks found yet.</p>
              ) : (
                submissionRows.map(({ submission, task, courseTitle }) => (
                  <div key={submission.id} className="grid gap-3 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_180px_180px_180px] md:items-center">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface">{task?.title ?? "Unknown task"}</p>
                      <p className="text-body-sm text-on-surface-variant">{courseTitle}</p>
                    </div>
                    <StatusPill value={submission.status} />
                    <p className="text-body-sm text-on-surface-variant">{formatDateTime(submission.submitted_at)}</p>
                    <p className="text-body-sm text-on-surface-variant">Score {submission.score ?? 0}/{task?.max_score ?? 100}</p>
                    <TaskFeedback feedback={submission.feedback} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TaskFeedback({ feedback }: { feedback: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 md:col-span-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-primary">Admin feedback</p>
      <p className="mt-1 text-sm leading-5 text-on-surface-variant">
        {feedback?.trim() || "No feedback yet."}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-100">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
