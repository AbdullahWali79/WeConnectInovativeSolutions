"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Enrollment, Profile, ProgressReport, Submission, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import * as XLSX from "xlsx";
import { getMissingProfileLinks, isStudentProfileComplete } from "@/lib/profile-links";

type ExportFormat = "pdf" | "xlsx";

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
  },
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
  dateFrom,
  dateTo,
  rows,
  summary,
}: {
  dateFrom: string;
  dateTo: string;
  rows: DateWiseReportRow[];
  summary: {
    courses: number;
    tasks: number;
    reviewed: number;
    averageScore: number;
  };
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>We Connect Innovative Solutions</Text>
          <Text style={pdfStyles.subtitle}>{getReportPeriod(dateFrom, dateTo)}</Text>
          <View style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaChip}>Courses: {summary.courses}</Text>
            <Text style={pdfStyles.metaChip}>Tasks: {summary.tasks}</Text>
            <Text style={pdfStyles.metaChip}>Reviewed: {summary.reviewed}</Text>
            <Text style={pdfStyles.metaChip}>Avg Score: {summary.averageScore}</Text>
          </View>
        </View>

        {rows.length === 0 ? (
          <Text style={pdfStyles.noData}>No tasks found for the selected date range.</Text>
        ) : (
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: "27%" }]}>Task</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: "41%" }]}>Admin Feedback</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: "14%" }]}>Score</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: "18%" }]}>Status</Text>
            </View>
            {rows.map((row, index) => (
              <View key={`${row.date}-${row.task}-${index}`} style={pdfStyles.tableRow} wrap={false}>
                <Text style={[pdfStyles.tableCell, { width: "27%" }]}>{row.task}{"\n"}<Text style={pdfStyles.muted}>{row.course} - {row.date}</Text></Text>
                <Text style={[pdfStyles.tableCell, { width: "41%" }]}>{row.feedback}</Text>
                <Text style={[pdfStyles.tableCell, { width: "14%" }]}>{row.score}/{row.max_score}</Text>
                <Text style={[pdfStyles.tableCell, { width: "18%" }]}>{row.status}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function StudentProgress() {
  const supabase = createSupabaseBrowserClient();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportResult, courseResult, enrollmentResult, taskResult, submissionResult, userResult] = await Promise.all([
      supabase.from("progress_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("courses").select("*"),
      supabase.from("enrollments").select("*"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);
    setReports(reportResult.data ?? []);
    setCourses(courseResult.data ?? []);
    setEnrollments(enrollmentResult.data ?? []);
    setTasks(taskResult.data ?? []);
    setSubmissions(submissionResult.data ?? []);
    const userId = userResult.data.user?.id;
    if (userId) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(profileData as Profile | null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [supabase]);

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
        if (task?.workflow_type === "daily") return null;
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
      if (task.workflow_type === "daily") return false;
      return ["submitted", "reviewed", "revision_required", "rejected"].includes(task.status) || submissions.some((submission) => submission.task_id === task.id);
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

  const reportRows = useMemo(() => {
    const startMs = reportStart ? new Date(`${reportStart}T00:00:00`).getTime() : null;
    const endMs = reportEnd ? new Date(`${reportEnd}T23:59:59.999`).getTime() : null;

    return submissionRows
      .filter(({ submission }) => {
        const submittedMs = toDateMs(submission.submitted_at);
        return (startMs === null || submittedMs >= startMs) && (endMs === null || submittedMs <= endMs);
      })
      .map(({ submission, task, courseTitle }) => ({
        sortKey: submission.submitted_at,
        date: formatDateOnly(submission.submitted_at),
        course: courseTitle,
        task: task?.title ?? "Unknown task",
        feedback: submission.feedback?.trim() || "No feedback yet.",
        status: formatReportStatus(submission.status),
        deadline: formatDateOnly(task?.deadline),
        submitted_at: formatDateOnly(submission.submitted_at),
        reviewed_at: formatDateOnly(submission.reviewed_at),
        score: String(submission.score ?? 0),
        max_score: task?.max_score ?? 100,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [reportEnd, reportStart, submissionRows]);

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
      tasks: reportRows.length,
      reviewed: reviewedCount,
      averageScore,
    };
  }, [reportRows]);

  async function exportReport(format: ExportFormat) {
    setExporting(format);

    try {
      const fileBase = reportStart || reportEnd
        ? `progress-report-${reportStart || "start"}-to-${reportEnd || "latest"}`
        : "complete-progress-report";

      if (format === "pdf") {
        const blob = await pdf(
          <DateWiseProgressReportPdf
            dateFrom={reportStart}
            dateTo={reportEnd}
            rows={reportRows}
            summary={reportSummary}
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
        ["Reviewed", reportSummary.reviewed],
        ["Average Score", reportSummary.averageScore],
      ]);
      summarySheet["!cols"] = [{ wch: 22 }, { wch: 28 }];

      const detailSheet = XLSX.utils.json_to_sheet(reportRows.map((row) => ({
        Task: row.task,
        Feedback: row.feedback,
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
        { wch: 52 },
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
        eyebrow="My Progress"
        title="Progress report"
        description="Your target tasks and completion percentages update automatically after admin reviews submissions."
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
            <div className="flex gap-2">
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
      {enrollments.length === 0 ? (
        <EmptyState title="No enrollments yet" description="Your enrollments will appear after admin approval." icon="monitoring" />
      ) : (
      <div className="space-y-8">
          {enrollments.map((enrollment) => {
            const report = reports.find((item) => item.course_id === enrollment.course_id);
            const courseTasks = tasks.filter((task) => task.course_id === enrollment.course_id && task.workflow_type !== "daily");
            const targetTasks = report?.target_tasks ?? enrollment.target_tasks ?? 100;
            const progress = report?.progress_percentage ?? enrollment.progress_percentage;
            const averageScore = profileComplete ? (report?.average_score ?? enrollment.final_score) : "Pending";
            return (
              <section key={enrollment.id} className="wc-card">
                <div className="sticky top-0 z-20 rounded-t-2xl bg-primary p-6 text-white shadow-lg">
                  <p className="text-label-sm uppercase tracking-widest text-blue-100">{enrollment.status}</p>
                  <h2 className="mt-2 text-3xl font-extrabold">{courseById.get(enrollment.course_id)?.title ?? "Course"}</h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <Metric label="Progress" value={`${progress}%`} />
                    <Metric label="Target Tasks" value={targetTasks} />
                    <Metric label="Reviewed" value={report?.completed_tasks ?? courseTasks.filter((task) => task.status === "reviewed").length} />
                    <Metric label="Average Score" value={averageScore} />
                  </div>
                  <div className="mt-6 h-3 rounded-full bg-white/20"><div className="h-3 rounded-full bg-secondary-container" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-sm text-blue-100">Reviewed {report?.completed_tasks ?? 0} of {targetTasks} target tasks</p>
                </div>

                <div className="overflow-hidden rounded-b-2xl divide-y divide-outline-variant/70">
                  {taskSubmissionRows.filter((row) => row.task.course_id === enrollment.course_id).length === 0 ? (
                    <p className="p-6 text-body-md text-on-surface-variant">No submitted tasks for this course yet.</p>
                  ) : (
                    taskSubmissionRows
                      .filter((row) => row.task.course_id === enrollment.course_id)
                      .map(({ task, submission }) => {
                      return (
                        <div key={submission?.id ?? task.id} className="grid gap-4 p-6 md:grid-cols-[1fr_180px_180px_180px] md:items-center">
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
                </div>
              </section>
            );
          })}

          <section className="wc-card overflow-hidden">
            <div className="bg-surface-container-low p-6">
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
                  <div key={submission.id} className="grid gap-4 p-6 md:grid-cols-[1fr_180px_180px_180px] md:items-center">
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
