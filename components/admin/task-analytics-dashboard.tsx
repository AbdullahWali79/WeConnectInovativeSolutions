"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Document, Image as PdfImage, Page as PdfPage, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { TaskAnalyticsCard } from "@/components/admin/task-analytics-card";
import { upsertStudentFeeRecord } from "@/app/admin/actions";
import type { DailyPendingReportRow, PaidFeeStudentDetail, StudentTaskDetail, StudentWorkSummary, TaskAnalyticsDashboardData } from "@/app/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminSignatureSettings, Course, Enrollment, Profile, StudentFeeRecord } from "@/lib/supabase/types";
import { formatDate, formatDateTime } from "@/lib/utils";

type MetricKey = "todayTasks" | "paidFees" | "clientHuntToday";
type DrilldownRow = {
  studentName: string;
  detail: string;
  secondary?: string;
  tertiary?: string;
};
type FeeDraft = {
  monthKey: string;
  amountDue: string;
  amountPaid: string;
  dueDate: string;
  paymentMethod: string;
  notes: string;
  status: "pending" | "paid" | "partial" | "overdue" | "waived";
};
type FeeStudentCourseOption = {
  courseId: string;
  courseTitle: string;
  enrollmentId: string;
  monthHint: string;
};
type FeeStudentOption = {
  studentId: string;
  studentName: string;
  email: string;
  phone: string;
  courses: FeeStudentCourseOption[];
  latestFeeMonth: string | null;
};
type ReportType = "complete" | "pending" | "clientPending" | "daily";
type DailyCompactRow = {
  studentName: string;
  submittedCount: number;
  clientHuntingCount: number;
  feedback: string;
};
type UnpaidDailyRow = {
  studentName: string;
  courseTitles: string;
  taskTitles: string;
  feedback: string;
  status: "submitted" | "pending";
};

const metricConfig: Array<{
  key: MetricKey;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: "todayTasks",
    label: "Today Task Students",
    icon: "today",
    description: "Students who submitted any task today.",
  },
  {
    key: "paidFees",
    label: "Paid Fee Students",
    icon: "paid",
    description: "Students with paid fee status in the current record.",
  },
  {
    key: "clientHuntToday",
    label: "Client Hunt Today",
    icon: "manage_search",
    description: "Students who submitted client hunting work today.",
  },
];

const reportTypeOptions: Array<{ value: ReportType; label: string; description: string }> = [
  { value: "complete", label: "Complete Report", description: "Summary plus all task analytics sections." },
  { value: "pending", label: "Pending Students Only", description: "Only students whose selected task is pending." },
  { value: "clientPending", label: "Client Hunting Pending Only", description: "Only Client Hunting pending students." },
];

function metricCount(data: TaskAnalyticsDashboardData, key: MetricKey) {
  switch (key) {
    case "todayTasks":
      return data.todaySubmittedCount;
    case "paidFees":
      return data.paidFeeStudentsCount;
    case "clientHuntToday":
      return data.dailyPendingReportRows.filter((row) => row.clientHuntTitles !== "Nothing Submitted").length;
  }
}

function rowsForReportType(data: TaskAnalyticsDashboardData, reportType: ReportType, dailyRows: DailyPendingReportRow[]) {
  switch (reportType) {
    case "daily":
      return dailyRows.map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        email: "",
        courseTitle: "Daily Report",
        taskTitle: row.taskTitles,
        clientHuntTitle: row.clientHuntTitles,
        joinedAt: new Date().toISOString(),
        submittedAt: row.status === "submitted" ? new Date().toISOString() : null,
        status: row.status,
      }));
    case "pending":
      return data.report.notSubmittedStudents;
    case "clientPending":
      return data.clientHuntingPendingStudents.map((row) => ({ ...row, status: "pending" as const }));
    case "complete":
    default:
      return [
        ...data.todaySubmittedStudents,
        ...data.report.notSubmittedStudents,
        ...data.activeStudents,
        ...data.clientHuntingAssignedStudents,
      ];
  }
}

function sectionRowsForReportType(data: TaskAnalyticsDashboardData, reportType: ReportType, dailyRows: DailyPendingReportRow[]) {
  switch (reportType) {
    case "daily":
      return [
        {
          title: "Daily Pending Report",
          rows: dailyRows.map((row) => ({
            studentId: row.studentId,
            studentName: row.studentName,
            email: "",
            courseTitle: "Daily Report",
            taskTitle: row.taskTitles,
            clientHuntTitle: row.clientHuntTitles,
            joinedAt: new Date().toISOString(),
            submittedAt: row.status === "submitted" ? new Date().toISOString() : null,
            status: row.status,
          })),
        },
      ];
    case "pending":
      return [
        { title: "Pending Students", rows: data.report.notSubmittedStudents },
      ];
    case "clientPending":
      return [
        { title: "Client Hunting Pending", rows: data.clientHuntingPendingStudents.map((row) => ({ ...row, status: "pending" as const })) },
      ];
    case "complete":
    default:
      return [
        { title: "Today Submitted Students", rows: data.todaySubmittedStudents },
        { title: "Pending Students", rows: data.report.notSubmittedStudents },
        { title: "Active Students", rows: data.activeStudents },
        { title: "Client Hunting Assigned", rows: data.clientHuntingAssignedStudents },
        { title: "Client Hunting Pending", rows: data.clientHuntingPendingStudents.map((row) => ({ ...row, status: "pending" as const })) },
      ];
  }
}

function reportTypeLabel(reportType: ReportType) {
  return reportTypeOptions.find((option) => option.value === reportType)?.label ?? "Complete Report";
}

function sortDailyPendingReportRows(rows: DailyPendingReportRow[]) {
  return [...rows].sort((first, second) => first.studentName.localeCompare(second.studentName));
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonthKeyValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getMonthHint(monthKey: string | null | undefined) {
  return monthKey || localMonthKeyValue();
}

function getPakistanDayBounds(dateStr: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startPktInUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 5 * 60 * 60 * 1000);
  const endPktInUtc = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 5 * 60 * 60 * 1000);
  return {
    startIso: startPktInUtc.toISOString(),
    endIso: endPktInUtc.toISOString(),
  };
}

function buildDailyReportRows(
  activeStudents: StudentTaskDetail[],
  taskDetails: StudentTaskDetail[],
  reportDate: string,
): DailyPendingReportRow[] {
  if (!reportDate) return [];

  const { startIso, endIso } = getPakistanDayBounds(reportDate);

  const titlesByStudent = new Map<string, Set<string>>();
  const clientHuntTitlesByStudent = new Map<string, Set<string>>();

  for (const detail of taskDetails) {
    const activeDate = detail.reviewedAt ?? detail.submittedAt;
    if (!activeDate || activeDate < startIso || activeDate >= endIso) continue;
    const title = detail.taskTitle?.trim();
    if (!title) continue;
    const existing = titlesByStudent.get(detail.studentId) ?? new Set<string>();
    existing.add(title);
    titlesByStudent.set(detail.studentId, existing);
    if (title.toLowerCase().includes("client hunting")) {
      const clientExisting = clientHuntTitlesByStudent.get(detail.studentId) ?? new Set<string>();
      clientExisting.add(title);
      clientHuntTitlesByStudent.set(detail.studentId, clientExisting);
    }
  }

  return sortDailyPendingReportRows(
    activeStudents.map((student) => {
      const titles = Array.from(titlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
      const clientHuntTitles = Array.from(clientHuntTitlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
      return {
        studentId: student.studentId,
        studentName: student.studentName,
        taskTitles: titles.length > 0 ? titles.join(", ") : "Nothing Submitted",
        clientHuntTitles: clientHuntTitles.length > 0 ? clientHuntTitles.join(", ") : "Nothing Submitted",
        status: titles.length > 0 ? "submitted" : "pending",
      };
    }),
  );
}

function dailyReportSheetRows(rows: DailyPendingReportRow[]) {
  return rows.map((row) => ({
    "Student Name": row.studentName,
    "Task Titles": row.taskTitles,
    "Client Hunt": row.clientHuntTitles,
    Status: row.status === "submitted" ? "Submitted" : "Pending",
  }));
}

function buildDailyCompactRows(activeStudents: StudentTaskDetail[], taskDetails: StudentTaskDetail[], reportDate: string): DailyCompactRow[] {
  if (!reportDate) return [];

  const { startIso, endIso } = getPakistanDayBounds(reportDate);

  const countsByStudent = new Map<string, {
    studentName: string;
    submittedCount: number;
    clientHuntingCount: number;
    feedbacks: string[];
  }>();

  for (const student of activeStudents) {
    countsByStudent.set(student.studentId, {
      studentName: student.studentName,
      submittedCount: 0,
      clientHuntingCount: 0,
      feedbacks: [],
    });
  }

  for (const detail of taskDetails) {
    const activeDate = detail.reviewedAt ?? detail.submittedAt;
    if (!activeDate || activeDate < startIso || activeDate >= endIso) continue;
    const entry = countsByStudent.get(detail.studentId);
    if (!entry) continue;

    entry.submittedCount += 1;
    if ((detail.taskTitle ?? "").toLowerCase().includes("client hunting")) {
      entry.clientHuntingCount += 1;
    }
    if (detail.taskStatus === "reviewed" && detail.feedback && detail.feedback.trim()) {
      entry.feedbacks.push(detail.feedback.trim());
    }
  }

  return Array.from(countsByStudent.values()).map((entry) => ({
    studentName: entry.studentName,
    submittedCount: entry.submittedCount,
    clientHuntingCount: entry.clientHuntingCount,
    feedback: entry.feedbacks.length > 0 ? entry.feedbacks.join("; ") : "No feedback",
  })).sort((first, second) => first.studentName.localeCompare(second.studentName));
}

function buildUnpaidDailyRows(activeStudents: StudentTaskDetail[], taskDetails: StudentTaskDetail[], reportDate: string): UnpaidDailyRow[] {
  if (!reportDate) return [];

  const { startIso, endIso } = getPakistanDayBounds(reportDate);
  const uniqueStudents = Array.from(new Map(activeStudents.map((student) => [student.studentId, student])).values());
  const taskTitlesByStudent = new Map<string, Set<string>>();
  const courseTitlesByStudent = new Map<string, Set<string>>();
  const feedbacksByStudent = new Map<string, string[]>();
  const submittedByStudent = new Set<string>();

  for (const student of uniqueStudents) {
    taskTitlesByStudent.set(student.studentId, new Set<string>());
    courseTitlesByStudent.set(student.studentId, new Set<string>());
    feedbacksByStudent.set(student.studentId, []);
  }

  for (const detail of taskDetails) {
    const activeDate = detail.reviewedAt ?? detail.submittedAt;
    if (!activeDate || activeDate < startIso || activeDate >= endIso) continue;

    const taskTitle = detail.taskTitle?.trim();
    if (taskTitle) {
      taskTitlesByStudent.get(detail.studentId)?.add(taskTitle);
    }

    const courseTitle = detail.courseTitle?.trim();
    if (courseTitle) {
      courseTitlesByStudent.get(detail.studentId)?.add(courseTitle);
    }

    const feedback = detail.feedback?.trim();
    if (feedback) {
      feedbacksByStudent.get(detail.studentId)?.push(feedback);
    }

    if (detail.status === "submitted") {
      submittedByStudent.add(detail.studentId);
    }
  }

  return uniqueStudents
    .map((student) => {
      const taskTitles = Array.from(taskTitlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
      const courseTitles = Array.from(courseTitlesByStudent.get(student.studentId) ?? []).sort((first, second) => first.localeCompare(second));
      const feedback = feedbacksByStudent.get(student.studentId) ?? [];

      const row = {
        studentName: student.studentName,
        courseTitles: courseTitles.length > 0 ? courseTitles.join(", ") : student.courseTitle,
        taskTitles: taskTitles.length > 0 ? taskTitles.join(", ") : "Nothing Submitted",
        feedback: feedback.length > 0 ? feedback.join("; ") : "No feedback",
        status: submittedByStudent.has(student.studentId) ? "submitted" : "pending",
      } satisfies UnpaidDailyRow;
      return row;
    })
    .sort((first, second) => first.studentName.localeCompare(second.studentName));
}

function dailyReportFileDate(reportDate: string) {
  return reportDate || fileDate();
}

function reportFileBase(reportType: ReportType) {
  switch (reportType) {
    case "daily":
      return "task-analytics-daily-report";
    case "pending":
      return "task-analytics-pending-students";
    case "clientPending":
      return "task-analytics-client-hunting-pending";
    case "complete":
    default:
      return "task-analytics-complete-report";
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function displayDateTime(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not submitted";
}

function displayDate(value: string | null | undefined) {
  return value ? formatDate(value) : "Not set";
}

type ExportSummary = {
  totalActiveStudents: number;
  todaySubmitted: number;
  pendingStudents: number;
  clientHuntingAssigned: number;
  clientHuntingPending: number;
};

function buildExportSummary(rows: StudentTaskDetail[]): ExportSummary {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayStart = today.toISOString();
  const tomorrowStart = tomorrow.toISOString();

  return {
    totalActiveStudents: new Set(rows.map((row) => row.studentId)).size,
    todaySubmitted: new Set(rows.filter((row) => row.submittedAt && row.submittedAt >= todayStart && row.submittedAt < tomorrowStart).map((row) => row.studentId)).size,
    pendingStudents: new Set(rows.filter((row) => row.status === "pending").map((row) => row.studentId)).size,
    clientHuntingAssigned: new Set(rows.filter((row) => (row.taskTitle ?? "").toLowerCase().includes("client hunting")).map((row) => row.studentId)).size,
    clientHuntingPending: new Set(rows.filter((row) => row.status === "pending" && (row.taskTitle ?? "").toLowerCase().includes("client hunting")).map((row) => row.studentId)).size,
  };
}

function compactDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function compactDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function exportStatusLabel(row: StudentTaskDetail, sectionTitle?: string) {
  if (row.status === "submitted") return "Submitted";
  if (sectionTitle?.toLowerCase().includes("nothing submitted")) return "Nothing Submitted";
  return sectionTitle?.toLowerCase().includes("client hunting pending") ? "Client Hunting Pending" : "Pending";
}

function worksheetRows(rows: StudentTaskDetail[], sectionTitle?: string) {
  return rows.map((row) => ({
    "Student Name": row.studentName,
    Email: row.email,
    "Course Title": row.courseTitle,
    "Task Title": row.taskTitle ?? "No assigned task",
    "Joined Date": displayDate(row.joinedAt),
    "Submitted Date": row.submittedAt ? displayDateTime(row.submittedAt) : "",
    Status: exportStatusLabel(row, sectionTitle),
  }));
}

function fitWorksheet(sheet: XLSX.WorkSheet, widths: number[], rangeRef?: string) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  if (rangeRef) sheet["!autofilter"] = { ref: rangeRef };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
}

function downloadExcelWorkbook({
  rows,
  metricLabel,
  generatedAt,
  reportType,
  sectionRows,
}: {
  rows: StudentTaskDetail[];
  metricLabel: string;
  generatedAt: string;
  reportType: ReportType;
  sectionRows: Array<{ title: string; rows: StudentTaskDetail[] }>;
}) {
  const summary = buildExportSummary(rows);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Task Analytics Report",
    Subject: "WeConnect Innovation Task Analytics",
    Author: "WeConnect Admin Panel",
    Company: "WeConnect Innovation",
    CreatedDate: new Date(generatedAt),
  };

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["WeConnect Innovation"],
    ["Task Analytics Report"],
    ["Generated At", formatDateTime(generatedAt)],
    ["Generated By", "WeConnect Admin Panel"],
    ["Selected View", metricLabel],
    ["Report Type", reportTypeLabel(reportType)],
    [],
    ["Dashboard Summary"],
    ["Metric", "Count"],
    ["Total Active Students", summary.totalActiveStudents],
    ["Today Submitted", summary.todaySubmitted],
    ["Pending Students", summary.pendingStudents],
    ["Client Hunting Assigned", summary.clientHuntingAssigned],
    ["Client Hunting Pending", summary.clientHuntingPending],
  ]);
  fitWorksheet(summarySheet, [32, 24]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Dashboard Summary");

  const appendRowsSheet = (name: string, items: StudentTaskDetail[]) => {
    const data = worksheetRows(items, name);
    const sheet = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ "Student Name": "No records", Email: "", "Course Title": "", "Task Title": "", "Joined Date": "", "Submitted Date": "", Status: "" }]);
    fitWorksheet(sheet, [24, 32, 30, 38, 16, 22, 14], `A1:G${Math.max(data.length + 1, 2)}`);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };

  if (reportType === "complete") {
    for (const section of sectionRows) appendRowsSheet(section.title, section.rows);
  } else {
    appendRowsSheet(sectionRows[0]?.title ?? reportTypeLabel(reportType), sectionRows[0]?.rows ?? []);
  }

  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${reportFileBase(reportType)}-${fileDate()}.xlsx`,
  );
}

function chunkPdfRows(rows: StudentTaskDetail[]) {
  const chunks: StudentTaskDetail[][] = [];
  let current: StudentTaskDetail[] = [];
  let units = 0;
  const maxUnits = 18;

  for (const row of rows) {
    const estimatedUnits = Math.max(
      1,
      Math.ceil(row.studentName.length / 24),
      Math.ceil(row.email.length / 26),
      Math.ceil(row.courseTitle.length / 24),
      Math.ceil((row.taskTitle ?? "No assigned task").length / 34),
    );

    if (current.length > 0 && units + estimatedUnits > maxUnits) {
      chunks.push(current);
      current = [];
      units = 0;
    }

    current.push(row);
    units += estimatedUnits;
  }

  if (current.length > 0 || chunks.length === 0) chunks.push(current);
  return chunks;
}

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 15,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  header: {
    backgroundColor: "#08265f",
    color: "#ffffff",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  brand: {
    fontSize: 17,
    color: "#f5c542",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 700,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 10,
    color: "#dbe7ff",
    marginBottom: 6,
  },
  accent: {
    height: 4,
    backgroundColor: "#f5c542",
    borderRadius: 999,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    width: "18.4%",
    minHeight: 74,
    borderWidth: 1,
    borderColor: "#d8e0ef",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#58677f",
    textTransform: "uppercase",
    lineHeight: 1.25,
    textAlign: "center",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    color: "#08265f",
    fontWeight: 700,
    textAlign: "center",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 700,
    color: "#08265f",
  },
  table: {
    borderWidth: 1,
    borderColor: "#d8e0ef",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#08265f",
    color: "#ffffff",
  },
  th: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e4e9f2",
    minHeight: 34,
    alignItems: "center",
  },
  rowAlt: {
    backgroundColor: "#eef6ff",
  },
  td: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: "center",
    fontSize: 7.5,
    fontWeight: 700,
    overflow: "hidden",
  },
  badgeSubmitted: {
    backgroundColor: "#dcfce7",
    color: "#087f3f",
  },
  badgePending: {
    backgroundColor: "#ffedd5",
    color: "#b45309",
  },
  badgeClient: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  signaturePanel: {
    marginTop: 190,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d8e0ef",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBox: {
    width: 220,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d8e0ef",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  signatureTitle: {
    fontSize: 9,
    color: "#58677f",
    textTransform: "uppercase",
    marginBottom: 6,
    fontWeight: 700,
  },
  signatureImage: {
    width: 130,
    height: 52,
    objectFit: "contain",
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 11,
    color: "#08265f",
    fontWeight: 700,
    marginBottom: 4,
  },
  signatureMeta: {
    fontSize: 8,
    color: "#64748b",
  },
  empty: {
    padding: 14,
    color: "#64748b",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 15,
    right: 15,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#d8e0ef",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 9,
  },
});

const compactPdfStyles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 22,
    paddingHorizontal: 12,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  brand: {
    fontSize: 14,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 8.5,
    marginBottom: 4,
  },
  accent: {
    marginBottom: 10,
  },
  summaryGrid: {
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    minHeight: 58,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  summaryLabel: {
    fontSize: 7,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 22,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 6,
    fontSize: 14,
  },
  table: {
    borderRadius: 5,
  },
  tableHeader: {
    minHeight: 22,
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 7.5,
  },
  row: {
    minHeight: 24,
  },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7.25,
    lineHeight: 1.2,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 3,
    fontSize: 6.8,
    borderRadius: 6,
  },
  footer: {
    bottom: 10,
    left: 12,
    right: 12,
    paddingTop: 5,
    fontSize: 8,
  },
});

function PdfTable({ title, rows }: { title: string; rows: StudentTaskDetail[] }) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.th, { width: "16%" }]}>Student</Text>
          <Text style={[pdfStyles.th, { width: "20%" }]}>Email</Text>
          <Text style={[pdfStyles.th, { width: "17%" }]}>Course</Text>
          <Text style={[pdfStyles.th, { width: "20%" }]}>Task</Text>
          <Text style={[pdfStyles.th, { width: "8%" }]}>Joined</Text>
          <Text style={[pdfStyles.th, { width: "10%" }]}>Submitted</Text>
          <Text style={[pdfStyles.th, { width: "10%" }]}>Status</Text>
        </View>
        {rows.length === 0 ? (
          <Text style={pdfStyles.empty}>No records for this section.</Text>
        ) : (
          rows.map((row, index) => (
            <View key={`${title}-${row.studentId}-${row.taskTitle ?? "task"}-${index}`} style={[pdfStyles.row, index % 2 === 1 ? pdfStyles.rowAlt : null]} wrap={false}>
              <Text style={[pdfStyles.td, { width: "16%" }]}>{row.studentName}</Text>
              <Text style={[pdfStyles.td, { width: "20%" }]}>{row.email || "-"}</Text>
              <Text style={[pdfStyles.td, { width: "17%" }]}>{row.courseTitle}</Text>
              <Text style={[pdfStyles.td, { width: "20%" }]}>{row.taskTitle || "No assigned task"}</Text>
              <Text style={[pdfStyles.td, { width: "8%" }]}>{compactDate(row.joinedAt)}</Text>
              <Text style={[pdfStyles.td, { width: "10%" }]}>{row.submittedAt ? compactDateTime(row.submittedAt) : "-"}</Text>
              <Text style={[pdfStyles.td, pdfStyles.statusBadge, { width: "10%" }, row.status === "submitted" ? pdfStyles.badgeSubmitted : pdfStyles.badgePending]}>
                {exportStatusLabel(row, title)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function TaskAnalyticsPdfReport({
  rows,
  metricLabel,
  generatedAt,
  reportType,
  sections,
  includeSignature,
  adminName,
  signatureUrl,
}: {
  rows: StudentTaskDetail[];
  metricLabel: string;
  generatedAt: string;
  reportType: ReportType;
  sections: Array<{ title: string; rows: StudentTaskDetail[] }>;
  includeSignature: boolean;
  adminName: string;
  signatureUrl?: string | null;
}) {
  const summary = buildExportSummary(rows);
  const pages = sections.flatMap((section) =>
    chunkPdfRows(section.rows).map((chunk, index) => ({
      title: `${section.title}${index > 0 ? " (continued)" : ""}`,
      rows: chunk,
    })),
  );
  const reportLabel = reportTypeLabel(reportType);

  return (
    <Document>
      <PdfPage size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.brand}>WeConnect Innovation</Text>
          <Text style={pdfStyles.title}>Task Analytics Report</Text>
          <Text style={pdfStyles.subtitle}>Generated: {formatDateTime(generatedAt)}</Text>
          <Text style={pdfStyles.subtitle}>Report Type: {reportLabel}</Text>
          <Text style={pdfStyles.subtitle}>Selected View: {metricLabel}</Text>
          <Text style={pdfStyles.subtitle}>Generated By: {adminName}</Text>
        </View>
        <View style={pdfStyles.accent} />

        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Active Students</Text>
            <Text style={pdfStyles.summaryValue}>{summary.totalActiveStudents}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Today Submitted</Text>
            <Text style={pdfStyles.summaryValue}>{summary.todaySubmitted}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Pending Students</Text>
            <Text style={pdfStyles.summaryValue}>{summary.pendingStudents}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Client Hunting Assigned</Text>
            <Text style={pdfStyles.summaryValue}>{summary.clientHuntingAssigned}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Client Hunting Pending</Text>
            <Text style={pdfStyles.summaryValue}>{summary.clientHuntingPending}</Text>
          </View>
        </View>

        <PdfTable title={pages[0]?.title ?? reportLabel} rows={pages[0]?.rows ?? []} />

        <View style={pdfStyles.footer} fixed>
          <Text>Generated by WeConnect Admin Panel | {formatDateTime(generatedAt)}</Text>
          <Text>weconnectinnovation.com | Confidential Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </PdfPage>
      {pages.slice(1).map((page, index) => (
        <PdfPage key={`${page.title}-${index}`} size="A4" orientation="landscape" style={pdfStyles.page}>
          <PdfTable title={page.title} rows={page.rows} />
          <View style={pdfStyles.footer} fixed>
            <Text>Generated by WeConnect Admin Panel | {formatDateTime(generatedAt)}</Text>
            <Text>weconnectinnovation.com | Confidential Report</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ))}
      {includeSignature && signatureUrl ? (
        <PdfPage size="A4" orientation="landscape" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <Text style={pdfStyles.brand}>WeConnect Innovation</Text>
            <Text style={pdfStyles.title}>Task Analytics Report</Text>
            <Text style={pdfStyles.subtitle}>Digital approval for {reportLabel}</Text>
            <Text style={pdfStyles.subtitle}>Generated: {formatDateTime(generatedAt)}</Text>
          </View>
          <View style={pdfStyles.accent} />
          <View style={pdfStyles.signaturePanel} wrap={false}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureTitle}>Approved / Generated By</Text>
              <PdfImage src={signatureUrl} style={pdfStyles.signatureImage} />
              <Text style={pdfStyles.signatureName}>{adminName}</Text>
              <Text style={pdfStyles.signatureMeta}>{formatDateTime(generatedAt)}</Text>
            </View>
          </View>
          <View style={pdfStyles.footer} fixed>
            <Text>Generated by WeConnect Admin Panel | {formatDateTime(generatedAt)}</Text>
            <Text>weconnectinnovation.com | Confidential Report</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ) : null}
    </Document>
  );
}

function chunkDailyCompactRows(rows: DailyCompactRow[]) {
  const chunks: DailyCompactRow[][] = [];
  if (rows.length === 0) return chunks;

  const firstPageLimit = 11;
  const otherPageLimit = 20;

  chunks.push(rows.slice(0, firstPageLimit));

  let index = firstPageLimit;
  while (index < rows.length) {
    chunks.push(rows.slice(index, index + otherPageLimit));
    index += otherPageLimit;
  }

  return chunks;
}

function chunkUnpaidDailyRows(rows: UnpaidDailyRow[]) {
  const chunks: UnpaidDailyRow[][] = [];
  if (rows.length === 0) return chunks;

  const firstPageLimit = 10;
  const otherPageLimit = 18;

  chunks.push(rows.slice(0, firstPageLimit));

  let index = firstPageLimit;
  while (index < rows.length) {
    chunks.push(rows.slice(index, index + otherPageLimit));
    index += otherPageLimit;
  }

  return chunks;
}

function chunkDailyReportRows(rows: DailyPendingReportRow[]) {
  const chunks: DailyPendingReportRow[][] = [];
  if (rows.length === 0) return chunks;

  const firstPageLimit = 11;
  const otherPageLimit = 20;

  chunks.push(rows.slice(0, firstPageLimit));

  let index = firstPageLimit;
  while (index < rows.length) {
    chunks.push(rows.slice(index, index + otherPageLimit));
    index += otherPageLimit;
  }

  return chunks;
}

function DailyReportPdf({
  rows,
  reportDate,
  adminName,
}: {
  rows: DailyPendingReportRow[];
  reportDate: string;
  adminName: string;
}) {
  const pages = chunkDailyReportRows(rows);
  const reportLabel = `Daily Report for ${reportDate}`;

  return (
    <Document>
      <PdfPage size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.brand}>WeConnect Innovation</Text>
          <Text style={pdfStyles.title}>Daily Pending Report</Text>
          <Text style={pdfStyles.subtitle}>Report Date: {reportDate}</Text>
          <Text style={pdfStyles.subtitle}>Generated By: {adminName}</Text>
        </View>
        <View style={pdfStyles.accent} />

        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Submitted Today</Text>
            <Text style={pdfStyles.summaryValue}>{rows.filter((row) => row.status === "submitted").length}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Nothing Submitted</Text>
            <Text style={pdfStyles.summaryValue}>{rows.filter((row) => row.status === "pending").length}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Students</Text>
            <Text style={pdfStyles.summaryValue}>{rows.length}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>{reportLabel}</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.th, { width: "25%" }]}>Student</Text>
              <Text style={[pdfStyles.th, { width: "36%" }]}>Task Titles</Text>
              <Text style={[pdfStyles.th, { width: "24%" }]}>Client Hunt</Text>
              <Text style={[pdfStyles.th, { width: "15%" }]}>Status</Text>
            </View>
            {pages[0]?.length === 0 ? (
              <Text style={pdfStyles.empty}>No records for this date.</Text>
            ) : (
              pages[0].map((row, index) => (
                <View key={`${row.studentId}-${index}`} style={[pdfStyles.row, index % 2 === 1 ? pdfStyles.rowAlt : null]} wrap={false}>
                  <Text style={[pdfStyles.td, { width: "25%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, { width: "36%" }]}>{row.taskTitles}</Text>
                  <Text style={[pdfStyles.td, { width: "24%" }]}>{row.clientHuntTitles}</Text>
                  <Text style={[pdfStyles.td, pdfStyles.statusBadge, { width: "15%" }, row.status === "submitted" ? pdfStyles.badgeSubmitted : pdfStyles.badgePending]}>
                    {row.status === "submitted" ? "Submitted" : "Pending"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
          <Text>weconnectinnovation.com | Confidential Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </PdfPage>
      {pages.slice(1).map((page, index) => (
        <PdfPage key={`${reportLabel}-${index}`} size="A4" orientation="landscape" style={pdfStyles.page}>
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>{reportLabel}</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "25%" }]}>Student</Text>
                <Text style={[pdfStyles.th, { width: "36%" }]}>Task Titles</Text>
                <Text style={[pdfStyles.th, { width: "24%" }]}>Client Hunt</Text>
                <Text style={[pdfStyles.th, { width: "15%" }]}>Status</Text>
              </View>
              {page.map((row, rowIndex) => (
                <View key={`${row.studentId}-${rowIndex}`} style={[pdfStyles.row, rowIndex % 2 === 1 ? pdfStyles.rowAlt : null]} wrap={false}>
                  <Text style={[pdfStyles.td, { width: "25%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, { width: "36%" }]}>{row.taskTitles}</Text>
                  <Text style={[pdfStyles.td, { width: "24%" }]}>{row.clientHuntTitles}</Text>
                  <Text style={[pdfStyles.td, pdfStyles.statusBadge, { width: "15%" }, row.status === "submitted" ? pdfStyles.badgeSubmitted : pdfStyles.badgePending]}>
                    {row.status === "submitted" ? "Submitted" : "Pending"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={pdfStyles.footer} fixed>
            <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
            <Text>weconnectinnovation.com | Confidential Report</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ))}
    </Document>
  );
}



function DailyCompactPdf({
  rows,
  reportDate,
  adminName,
  includeSignature,
  signatureUrl,
}: {
  rows: DailyCompactRow[];
  reportDate: string;
  adminName: string;
  includeSignature: boolean;
  signatureUrl?: string | null;
}) {
  const pages = chunkDailyCompactRows(rows);
  const totalSubmitted = rows.reduce((sum, row) => sum + row.submittedCount, 0);
  const totalClientHunting = rows.reduce((sum, row) => sum + row.clientHuntingCount, 0);

  return (
    <Document>
      <PdfPage size="A4" orientation="landscape" style={[pdfStyles.page, compactPdfStyles.page]}>
        <View style={[pdfStyles.header, compactPdfStyles.header]}>
          <Text style={[pdfStyles.brand, compactPdfStyles.brand]}>WeConnect Innovation</Text>
          <Text style={[pdfStyles.title, compactPdfStyles.title]}>Active Students Daily Report</Text>
          <Text style={[pdfStyles.subtitle, compactPdfStyles.subtitle]}>Report Date: {reportDate}</Text>
          <Text style={[pdfStyles.subtitle, compactPdfStyles.subtitle]}>Generated By: {adminName}</Text>
        </View>
        <View style={[pdfStyles.accent, compactPdfStyles.accent]} />

        <View style={[pdfStyles.summaryGrid, compactPdfStyles.summaryGrid]}>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Active Students</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{rows.length}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Task Submitted</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{totalSubmitted}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Client Hunting</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{totalClientHunting}</Text>
          </View>
        </View>

        <View style={[pdfStyles.section, compactPdfStyles.section]}>
          <Text style={[pdfStyles.sectionTitle, compactPdfStyles.sectionTitle]}>Student Summary</Text>
          <View style={[pdfStyles.table, compactPdfStyles.table]}>
            <View style={[pdfStyles.tableHeader, compactPdfStyles.tableHeader]}>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Student Name</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "15%", textAlign: "center" }]}>Task Submitted</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "15%", textAlign: "center" }]}>Client Hunting</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "40%" }]}>Feedback</Text>
            </View>
            {pages[0]?.length === 0 ? (
              <Text style={pdfStyles.empty}>No records for this date.</Text>
            ) : (
              pages[0].map((row, index) => (
                <View
                  key={`${row.studentName}-${index}`}
                  style={[pdfStyles.row, compactPdfStyles.row, index % 2 === 1 ? pdfStyles.rowAlt : null]}
                  wrap={false}
                >
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "15%", textAlign: "center" }]}>{row.submittedCount}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "15%", textAlign: "center" }]}>{row.clientHuntingCount}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "40%" }]}>{row.feedback}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[pdfStyles.footer, compactPdfStyles.footer]} fixed>
          <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
          <Text>We Connect Innovations Solutions | weconnectinnovation.online</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </PdfPage>
      {pages.slice(1).map((page, index) => (
        <PdfPage key={`daily-compact-${index}`} size="A4" orientation="landscape" style={[pdfStyles.page, compactPdfStyles.page]}>
          <View style={[pdfStyles.section, compactPdfStyles.section]}>
            <Text style={[pdfStyles.sectionTitle, compactPdfStyles.sectionTitle]}>Student Summary</Text>
            <View style={[pdfStyles.table, compactPdfStyles.table]}>
              <View style={[pdfStyles.tableHeader, compactPdfStyles.tableHeader]}>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Student Name</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "15%", textAlign: "center" }]}>Task Submitted</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "15%", textAlign: "center" }]}>Client Hunting</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "40%" }]}>Feedback</Text>
              </View>
              {page.map((row, rowIndex) => (
                <View
                  key={`${row.studentName}-${rowIndex}`}
                  style={[pdfStyles.row, compactPdfStyles.row, rowIndex % 2 === 1 ? pdfStyles.rowAlt : null]}
                  wrap={false}
                >
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "15%", textAlign: "center" }]}>{row.submittedCount}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "15%", textAlign: "center" }]}>{row.clientHuntingCount}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "40%" }]}>{row.feedback}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[pdfStyles.footer, compactPdfStyles.footer]} fixed>
            <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
            <Text>We Connect Innovations Solutions | weconnectinnovation.online</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ))}
      {includeSignature && signatureUrl ? (
        <PdfPage size="A4" orientation="landscape" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <Text style={pdfStyles.brand}>WeConnect Innovation</Text>
            <Text style={pdfStyles.title}>Active Students Daily Report</Text>
            <Text style={pdfStyles.subtitle}>Digital approval for {reportDate}</Text>
            <Text style={pdfStyles.subtitle}>Generated By: {adminName}</Text>
          </View>
          <View style={pdfStyles.accent} />
          <View style={pdfStyles.signaturePanel} wrap={false}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureTitle}>Approved / Generated By</Text>
              <PdfImage src={signatureUrl} style={pdfStyles.signatureImage} />
              <Text style={pdfStyles.signatureName}>{adminName}</Text>
              <Text style={pdfStyles.signatureMeta}>{formatDateTime(new Date().toISOString())}</Text>
            </View>
          </View>
          <View style={pdfStyles.footer} fixed>
            <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
            <Text>We Connect Innovations Solutions | weconnectinnovation.online</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ) : null}
    </Document>
  );
}

function UnpaidDailyPdf({
  rows,
  reportDate,
  adminName,
}: {
  rows: UnpaidDailyRow[];
  reportDate: string;
  adminName: string;
}) {
  const pages = chunkUnpaidDailyRows(rows);
  const submittedCount = rows.filter((row) => row.status === "submitted").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <Document>
      <PdfPage size="A4" orientation="landscape" style={[pdfStyles.page, compactPdfStyles.page]}>
        <View style={[pdfStyles.header, compactPdfStyles.header]}>
          <Text style={[pdfStyles.brand, compactPdfStyles.brand]}>WeConnect Innovation</Text>
          <Text style={[pdfStyles.title, compactPdfStyles.title]}>Unpaid Students Daily Report</Text>
          <Text style={[pdfStyles.subtitle, compactPdfStyles.subtitle]}>Report Date: {reportDate}</Text>
          <Text style={[pdfStyles.subtitle, compactPdfStyles.subtitle]}>Generated By: {adminName}</Text>
        </View>
        <View style={[pdfStyles.accent, compactPdfStyles.accent]} />

        <View style={[pdfStyles.summaryGrid, compactPdfStyles.summaryGrid]}>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Unpaid Students</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{rows.length}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Task Submitted</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{submittedCount}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, compactPdfStyles.summaryCard]}>
            <Text style={[pdfStyles.summaryLabel, compactPdfStyles.summaryLabel]}>Nothing Submitted</Text>
            <Text style={[pdfStyles.summaryValue, compactPdfStyles.summaryValue]}>{pendingCount}</Text>
          </View>
        </View>

        <View style={[pdfStyles.section, compactPdfStyles.section]}>
          <Text style={[pdfStyles.sectionTitle, compactPdfStyles.sectionTitle]}>Unpaid Student Summary</Text>
          <View style={[pdfStyles.table, compactPdfStyles.table]}>
            <View style={[pdfStyles.tableHeader, compactPdfStyles.tableHeader]}>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "22%" }]}>Student Name</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "18%" }]}>Courses</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Task Titles</Text>
              <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Feedback</Text>
            </View>
            {pages[0]?.length === 0 ? (
              <Text style={pdfStyles.empty}>No unpaid students found for this date.</Text>
            ) : (
              pages[0].map((row, index) => (
                <View key={`${row.studentName}-${index}`} style={[pdfStyles.row, compactPdfStyles.row, index % 2 === 1 ? pdfStyles.rowAlt : null]} wrap={false}>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "22%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "18%" }]}>{row.courseTitles}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.taskTitles}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.feedback}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[pdfStyles.footer, compactPdfStyles.footer]} fixed>
          <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
          <Text>We Connect Innovations Solutions | weconnectinnovation.online</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </PdfPage>
      {pages.slice(1).map((page, index) => (
        <PdfPage key={`unpaid-daily-${index}`} size="A4" orientation="landscape" style={[pdfStyles.page, compactPdfStyles.page]}>
          <View style={[pdfStyles.section, compactPdfStyles.section]}>
            <Text style={[pdfStyles.sectionTitle, compactPdfStyles.sectionTitle]}>Unpaid Student Summary</Text>
            <View style={[pdfStyles.table, compactPdfStyles.table]}>
              <View style={[pdfStyles.tableHeader, compactPdfStyles.tableHeader]}>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "22%" }]}>Student Name</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "18%" }]}>Courses</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Task Titles</Text>
                <Text style={[pdfStyles.th, compactPdfStyles.th, { width: "30%" }]}>Feedback</Text>
              </View>
              {page.map((row, rowIndex) => (
                <View key={`${row.studentName}-${rowIndex}`} style={[pdfStyles.row, compactPdfStyles.row, rowIndex % 2 === 1 ? pdfStyles.rowAlt : null]} wrap={false}>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "22%" }]}>{row.studentName}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "18%" }]}>{row.courseTitles}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.taskTitles}</Text>
                  <Text style={[pdfStyles.td, compactPdfStyles.td, { width: "30%" }]}>{row.feedback}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[pdfStyles.footer, compactPdfStyles.footer]} fixed>
            <Text>Generated by WeConnect Admin Panel | {reportDate}</Text>
            <Text>We Connect Innovations Solutions | weconnectinnovation.online</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </PdfPage>
      ))}
    </Document>
  );
}

const reportCardPdfStyles = StyleSheet.create({
  page: { padding: 28, backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "Helvetica" },
  header: { borderRadius: 8, backgroundColor: "#15558a", padding: 18, marginBottom: 14 },
  eyebrow: { color: "#bfdbfe", fontSize: 9, fontWeight: 700, letterSpacing: 1 },
  title: { color: "#ffffff", fontSize: 20, fontWeight: 700, marginTop: 5 },
  subtitle: { color: "#dbeafe", fontSize: 9, marginTop: 5 },
  columns: { flexDirection: "row", gap: 12 },
  column: { flex: 1, borderWidth: 1, borderColor: "#dbe3ec", borderRadius: 6, overflow: "hidden" },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#e8f0f7", paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderText: { color: "#15558a", fontSize: 8, fontWeight: 700 },
  row: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#e2e8f0", minHeight: 22, paddingVertical: 4, paddingHorizontal: 8 },
  number: { width: 20, color: "#15558a", fontSize: 8, fontWeight: 700 },
  name: { flex: 1, fontSize: 8.5, fontWeight: 700 },
  count: { width: 38, color: "#15558a", fontSize: 9, fontWeight: 700, textAlign: "right" },
  footer: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#cbd5e1", marginTop: 14, paddingTop: 9 },
  footerText: { color: "#15558a", fontSize: 9, fontWeight: 700 },
});

function ReportCardPdf({ rows, eyebrow = "REPORT CARD", title = "Active Students Reviewed Tasks", subtitle }: { rows: StudentWorkSummary[]; eyebrow?: string; title?: string; subtitle: string }) {
  const rowsPerColumn = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, rowsPerColumn), rows.slice(rowsPerColumn)];
  const totalReviewed = rows.reduce((total, row) => total + row.tasksCompletedCount, 0);

  return (
    <Document title={title} author="WeConnect Admin Panel">
      <PdfPage size="A4" orientation="landscape" style={reportCardPdfStyles.page} wrap={false}>
        <View style={reportCardPdfStyles.header}>
          <Text style={reportCardPdfStyles.eyebrow}>{eyebrow}</Text>
          <Text style={reportCardPdfStyles.title}>{title}</Text>
          <Text style={reportCardPdfStyles.subtitle}>{subtitle}</Text>
        </View>
        <View style={reportCardPdfStyles.columns}>
          {columns.map((column, columnIndex) => (
            <View key={`report-card-column-${columnIndex}`} style={reportCardPdfStyles.column}>
              <View style={reportCardPdfStyles.tableHeader}>
                <Text style={reportCardPdfStyles.tableHeaderText}>ACTIVE STUDENT</Text>
                <Text style={reportCardPdfStyles.tableHeaderText}>REVIEWED</Text>
              </View>
              {column.map((row, rowIndex) => (
                <View key={row.studentId} style={reportCardPdfStyles.row}>
                  <Text style={reportCardPdfStyles.number}>{columnIndex * rowsPerColumn + rowIndex + 1}.</Text>
                  <Text style={reportCardPdfStyles.name}>{row.studentName}</Text>
                  <Text style={reportCardPdfStyles.count}>{row.tasksCompletedCount}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={reportCardPdfStyles.footer}>
          <Text style={reportCardPdfStyles.footerText}>Active Students: {rows.length}</Text>
          <Text style={reportCardPdfStyles.footerText}>Total Reviewed Tasks: {totalReviewed}</Text>
        </View>
      </PdfPage>
    </Document>
  );
}

type StudentFeedbackReportRow = {
  taskTitle: string;
  courseTitle: string;
  reviewedAt: string | null;
  feedback: string;
};

const studentReportPdfStyles = StyleSheet.create({
  page: { padding: 30, backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "Helvetica", fontSize: 8 },
  header: { borderRadius: 8, backgroundColor: "#15558a", padding: 18, marginBottom: 14 },
  eyebrow: { color: "#bfdbfe", fontSize: 9, fontWeight: 700, letterSpacing: 1 },
  title: { color: "#ffffff", fontSize: 20, fontWeight: 700, marginTop: 5 },
  subtitle: { color: "#dbeafe", fontSize: 9, marginTop: 5 },
  table: { borderWidth: 1, borderColor: "#dbe3ec", borderRadius: 6, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#e8f0f7", paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: "#15558a", fontSize: 7.5, fontWeight: 700 },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 8 },
  cell: { fontSize: 8, lineHeight: 1.3 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, color: "#15558a", fontSize: 8, fontWeight: 700 },
});

function StudentFeedbackPdf({ studentName, rows, generatedDate }: { studentName: string; rows: StudentFeedbackReportRow[]; generatedDate: string }) {
  return (
    <Document title={`${studentName} Task Feedback Report`} author="WeConnect Admin Panel">
      <PdfPage size="A4" orientation="landscape" style={studentReportPdfStyles.page}>
        <View style={studentReportPdfStyles.header}>
          <Text style={studentReportPdfStyles.eyebrow}>STUDENT REPORT</Text>
          <Text style={studentReportPdfStyles.title}>{studentName}</Text>
          <Text style={studentReportPdfStyles.subtitle}>Reviewed tasks with feedback up to {generatedDate}</Text>
        </View>
        <View style={studentReportPdfStyles.table}>
          <View style={studentReportPdfStyles.tableHeader} fixed>
            <Text style={[studentReportPdfStyles.th, { width: "5%" }]}>#</Text>
            <Text style={[studentReportPdfStyles.th, { width: "23%" }]}>TASK</Text>
            <Text style={[studentReportPdfStyles.th, { width: "18%" }]}>COURSE</Text>
            <Text style={[studentReportPdfStyles.th, { width: "14%" }]}>REVIEWED</Text>
            <Text style={[studentReportPdfStyles.th, { width: "40%" }]}>FEEDBACK</Text>
          </View>
          {rows.map((row, index) => (
            <View key={`${row.taskTitle}-${row.reviewedAt}-${index}`} style={studentReportPdfStyles.row} wrap={false}>
              <Text style={[studentReportPdfStyles.cell, { width: "5%" }]}>{index + 1}</Text>
              <Text style={[studentReportPdfStyles.cell, { width: "23%", fontWeight: 700 }]}>{row.taskTitle}</Text>
              <Text style={[studentReportPdfStyles.cell, { width: "18%" }]}>{row.courseTitle}</Text>
              <Text style={[studentReportPdfStyles.cell, { width: "14%" }]}>{row.reviewedAt ? formatDate(row.reviewedAt) : "-"}</Text>
              <Text style={[studentReportPdfStyles.cell, { width: "40%" }]}>{row.feedback}</Text>
            </View>
          ))}
        </View>
        <View style={studentReportPdfStyles.footer} fixed>
          <Text>Total Reviewed Tasks: {rows.length}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </PdfPage>
    </Document>
  );
}

export function TaskAnalyticsDashboard({
  data,
  adminName,
  signatureSettings,
}: {
  data: TaskAnalyticsDashboardData;
  adminName: string;
  signatureSettings: AdminSignatureSettings | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("todayTasks");
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [isTodayReportOpen, setIsTodayReportOpen] = useState(false);
  const [isStudentReportOpen, setIsStudentReportOpen] = useState(false);
  const [selectedStudentReportId, setSelectedStudentReportId] = useState("");
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("complete");
  const [reportDate, setReportDate] = useState(() => localDateInputValue());
  const [includeSignature, setIncludeSignature] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [feeSaving, startFeeSaving] = useTransition();
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState<FeeDraft | null>(null);
  const [feeStudentSearch, setFeeStudentSearch] = useState("");
  const [selectedFeeStudentId, setSelectedFeeStudentId] = useState("");
  const [selectedFeeCourseId, setSelectedFeeCourseId] = useState("");
  const [feeStudentOptions, setFeeStudentOptions] = useState<FeeStudentOption[]>([]);

  const dailyReportRows = useMemo(() => buildDailyReportRows(data.activeStudents, data.allTaskDetails, reportDate), [data.activeStudents, data.allTaskDetails, reportDate]);
  const dailyCompactRows = useMemo(() => buildDailyCompactRows(data.activeStudents, data.allTaskDetails, reportDate), [data.activeStudents, data.allTaskDetails, reportDate]);
  const unpaidDailyRows = useMemo(() => buildUnpaidDailyRows(data.unpaidActiveStudents, data.unpaidTaskDetails, reportDate), [data.unpaidActiveStudents, data.unpaidTaskDetails, reportDate]);
  const todayTaskDrilldownRows = useMemo<DrilldownRow[]>(
    () =>
      dailyReportRows
        .filter((row) => row.status === "submitted")
        .map((row) => ({
          studentName: row.studentName,
          detail: row.taskTitles,
          secondary: row.clientHuntTitles,
          tertiary: "Submitted today",
        })),
    [dailyReportRows],
  );
  const clientHuntTodayRows = useMemo<DrilldownRow[]>(
    () =>
      dailyReportRows
        .filter((row) => row.clientHuntTitles !== "Nothing Submitted")
        .map((row) => ({
          studentName: row.studentName,
          detail: row.clientHuntTitles,
          secondary: row.taskTitles,
          tertiary: "Client Hunt today",
        })),
    [dailyReportRows],
  );
  const paidFeeDrilldownRows = useMemo<DrilldownRow[]>(
    () =>
      data.paidFeeStudents.map((row) => ({
        studentName: row.studentName,
        detail: `${row.courseTitle} • ${row.monthKey}`,
        secondary: `Paid ${row.amountPaid} / Due ${row.amountDue}`,
        tertiary: row.status === "paid" ? "Paid" : "Waived",
      })),
    [data.paidFeeStudents],
  );
  const selectedReportRows = useMemo(() => rowsForReportType(data, selectedReportType, dailyReportRows), [data, selectedReportType, dailyReportRows]);
  const selectedReportSections = useMemo(() => sectionRowsForReportType(data, selectedReportType, dailyReportRows), [data, selectedReportType, dailyReportRows]);
  const selectedReportSummary = useMemo(() => buildExportSummary(selectedReportRows), [selectedReportRows]);
  const selectedReportOption = reportTypeOptions.find((option) => option.value === selectedReportType) ?? reportTypeOptions[0];
  const dailyReportStats = useMemo(
    () => ({
      submitted: todayTaskDrilldownRows.length,
      paid: data.paidFeeStudentsCount,
      clientHunt: clientHuntTodayRows.length,
    }),
    [clientHuntTodayRows.length, data.paidFeeStudentsCount, todayTaskDrilldownRows.length],
  );

  const drilldownState = useMemo(() => {
    switch (selectedMetric) {
      case "todayTasks":
        return {
          title: "Today Task Students",
          description: "Students who submitted any task today.",
          rows: todayTaskDrilldownRows,
        };
      case "paidFees":
        return {
          title: "Paid Fee Students",
          description: "Students with paid fee records.",
          rows: paidFeeDrilldownRows,
        };
      case "clientHuntToday":
      default:
        return {
          title: "Client Hunt Today",
          description: "Students who submitted client hunting work today.",
          rows: clientHuntTodayRows,
        };
    }
  }, [clientHuntTodayRows, paidFeeDrilldownRows, selectedMetric, todayTaskDrilldownRows]);

  function generateReport() {
    setGeneratingReport(true);
    window.setTimeout(() => {
      setReportGeneratedAt(new Date().toISOString());
      setGeneratingReport(false);
      document.getElementById("task-analytics-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  function downloadCompactStudentReportPng(rows: StudentWorkSummary[], eyebrow: string, title: string, subtitle: string, filePrefix: string) {
    const rowsPerColumn = Math.ceil(rows.length / 2);
    const width = 1600;
    const headerHeight = 190;
    const columnHeaderHeight = 54;
    const rowHeight = 58;
    const footerHeight = 76;
    const padding = 64;
    const height = headerHeight + columnHeaderHeight + Math.max(rowsPerColumn, 1) * rowHeight + footerHeight + padding;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#15558a";
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = "#bfdbfe";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(eyebrow, padding, 52);
    context.fillStyle = "#ffffff";
    context.font = "700 42px Arial, sans-serif";
    context.fillText(title, padding, 108);
    context.fillStyle = "#dbeafe";
    context.font = "24px Arial, sans-serif";
    context.fillText(subtitle, padding, 153);

    const gap = 36;
    const columnWidth = (width - padding * 2 - gap) / 2;
    const drawColumn = (columnRows: StudentWorkSummary[], columnIndex: number, startNumber: number) => {
      const x = padding + columnIndex * (columnWidth + gap);
      const top = headerHeight + 28;
      context.fillStyle = "#e8f0f7";
      context.fillRect(x, top, columnWidth, columnHeaderHeight);
      context.fillStyle = "#15558a";
      context.font = "700 18px Arial, sans-serif";
      context.fillText("ACTIVE STUDENT", x + 20, top + 34);
      context.textAlign = "right";
      context.fillText("REVIEWED", x + columnWidth - 20, top + 34);
      context.textAlign = "left";

      columnRows.forEach((row, rowIndex) => {
        const y = top + columnHeaderHeight + rowIndex * rowHeight;
        context.fillStyle = rowIndex % 2 === 0 ? "#ffffff" : "#f1f5f9";
        context.fillRect(x, y, columnWidth, rowHeight);
        context.strokeStyle = "#dbe3ec";
        context.beginPath();
        context.moveTo(x, y + rowHeight);
        context.lineTo(x + columnWidth, y + rowHeight);
        context.stroke();
        context.fillStyle = "#15558a";
        context.beginPath();
        context.arc(x + 30, y + rowHeight / 2, 18, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#ffffff";
        context.font = "700 15px Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(String(startNumber + rowIndex), x + 30, y + rowHeight / 2 + 5);
        context.textAlign = "left";
        context.fillStyle = "#0f172a";
        context.font = "700 20px Arial, sans-serif";
        const maxNameWidth = columnWidth - 190;
        let studentName = row.studentName;
        while (context.measureText(studentName).width > maxNameWidth && studentName.length > 3) studentName = `${studentName.slice(0, -4)}...`;
        context.fillText(studentName, x + 62, y + rowHeight / 2 + 7);
        context.fillStyle = "#15558a";
        context.font = "700 21px Arial, sans-serif";
        context.textAlign = "right";
        context.fillText(String(row.tasksCompletedCount), x + columnWidth - 30, y + rowHeight / 2 + 7);
        context.textAlign = "left";
      });
    };

    drawColumn(rows.slice(0, rowsPerColumn), 0, 1);
    drawColumn(rows.slice(rowsPerColumn), 1, rowsPerColumn + 1);

    const footerY = headerHeight + 28 + columnHeaderHeight + Math.max(rowsPerColumn, 1) * rowHeight + 28;
    context.fillStyle = "#15558a";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(`Active Students: ${rows.length}`, padding, footerY + 28);
    context.textAlign = "right";
    context.fillText(`Total Reviewed Tasks: ${rows.reduce((total, row) => total + row.tasksCompletedCount, 0)}`, width - padding, footerY + 28);
    context.textAlign = "left";

    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filePrefix}-${localDateInputValue()}.png`);
    }, "image/png");
  }

  function downloadReportCardPng() {
    const displayDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    downloadCompactStudentReportPng(reportCardRows, "REPORT CARD", "Active Students Reviewed Tasks", `Total reviewed tasks up to ${displayDate}`, "active-students-report-card");
  }

  async function downloadReportCardPdf() {
    if (reportCardRows.length === 0) return;
    const displayDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    const blob = await pdf(<ReportCardPdf rows={reportCardRows} subtitle={`Total reviewed tasks up to ${displayDate}`} />).toBlob();
    downloadBlob(blob, `active-students-report-card-${localDateInputValue()}.pdf`);
  }

  function downloadTodayReportPng() {
    const displayDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    downloadCompactStudentReportPng(todayReportRows, "TODAY REPORT", "Today Reviewed Tasks", `Tasks reviewed on ${displayDate}`, "today-reviewed-tasks-report");
  }

  async function downloadTodayReportPdf() {
    if (todayReportRows.length === 0) return;
    const displayDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    const blob = await pdf(<ReportCardPdf rows={todayReportRows} eyebrow="TODAY REPORT" title="Today Reviewed Tasks" subtitle={`Tasks reviewed on ${displayDate}`} />).toBlob();
    downloadBlob(blob, `today-reviewed-tasks-report-${localDateInputValue()}.pdf`);
  }

  async function downloadStudentFeedbackPdf() {
    if (!selectedStudentReport || selectedStudentReportRows.length === 0) return;
    const displayDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    const blob = await pdf(<StudentFeedbackPdf studentName={selectedStudentReport.studentName} rows={selectedStudentReportRows} generatedDate={displayDate} />).toBlob();
    const safeName = selectedStudentReport.studentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadBlob(blob, `${safeName || "student"}-task-feedback-report-${localDateInputValue()}.pdf`);
  }

  function printReport() {
    setReportGeneratedAt((current) => current ?? new Date().toISOString());
    window.setTimeout(() => window.print(), 50);
  }

  const selectedMetricLabel = metricConfig.find((metric) => metric.key === selectedMetric)?.label ?? "Students";
  const studentWorkSummaryRows = useMemo(
    () => [...data.studentWorkSummaries].sort((first, second) => {
      if (second.tasksCompletedCount !== first.tasksCompletedCount) {
        return second.tasksCompletedCount - first.tasksCompletedCount;
      }
      if (second.clientHuntsDoneCount !== first.clientHuntsDoneCount) {
        return second.clientHuntsDoneCount - first.clientHuntsDoneCount;
      }
      return first.studentName.localeCompare(second.studentName);
    }),
    [data.studentWorkSummaries],
  );
  const reportCardRows = useMemo(
    () => [...data.studentWorkSummaries].sort((first, second) => first.studentName.localeCompare(second.studentName)),
    [data.studentWorkSummaries],
  );
  const todayReportRows = useMemo(() => {
    const { startIso, endIso } = getPakistanDayBounds(localDateInputValue());
    const reviewedCountByStudent = new Map<string, number>();
    for (const detail of data.allTaskDetails) {
      if (detail.taskStatus !== "reviewed" || !detail.reviewedAt || detail.reviewedAt < startIso || detail.reviewedAt >= endIso) continue;
      reviewedCountByStudent.set(detail.studentId, (reviewedCountByStudent.get(detail.studentId) ?? 0) + 1);
    }
    return data.studentWorkSummaries
      .map((student) => ({ ...student, tasksCompletedCount: reviewedCountByStudent.get(student.studentId) ?? 0 }))
      .sort((first, second) => first.studentName.localeCompare(second.studentName));
  }, [data.allTaskDetails, data.studentWorkSummaries]);
  const selectedStudentReport = useMemo(
    () => reportCardRows.find((student) => student.studentId === selectedStudentReportId) ?? null,
    [reportCardRows, selectedStudentReportId],
  );
  const selectedStudentReportRows = useMemo<StudentFeedbackReportRow[]>(
    () => data.allTaskDetails
      .filter((detail) => detail.studentId === selectedStudentReportId && detail.taskStatus === "reviewed")
      .sort((first, second) => (second.reviewedAt ?? "").localeCompare(first.reviewedAt ?? ""))
      .map((detail) => ({
        taskTitle: detail.taskTitle?.trim() || "Untitled task",
        courseTitle: detail.courseTitle || "-",
        reviewedAt: detail.reviewedAt ?? null,
        feedback: detail.feedback?.trim() || "No feedback provided",
      })),
    [data.allTaskDetails, selectedStudentReportId],
  );

  const selectedFeeStudent = useMemo(
    () => feeStudentOptions.find((student) => student.studentId === selectedFeeStudentId) ?? null,
    [feeStudentOptions, selectedFeeStudentId],
  );
  const selectedFeeCourse = useMemo(
    () => selectedFeeStudent?.courses.find((course) => course.courseId === selectedFeeCourseId) ?? selectedFeeStudent?.courses[0] ?? null,
    [selectedFeeCourseId, selectedFeeStudent],
  );
  const feeStudentLookupResults = useMemo(() => {
    const search = normalizeSearchText(feeStudentSearch);
    const results = feeStudentOptions.filter((student) => {
      if (!search) return true;
      const courseText = student.courses.map((course) => course.courseTitle).join(" ");
      const text = normalizeSearchText(`${student.studentName} ${student.email} ${student.phone} ${courseText}`);
      return text.includes(search);
    });

    return results.slice(0, 12);
  }, [feeStudentOptions, feeStudentSearch]);

  useEffect(() => {
    if (!isFeeModalOpen) return;

    let cancelled = false;

    async function loadFeeStudents() {
      setFeeLoading(true);
      setFeeError(null);

      const [profileResult, enrollmentResult, courseResult, feeResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "student").eq("status", "approved").order("full_name", { ascending: true }),
        supabase.from("enrollments").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("courses").select("*").order("title", { ascending: true }),
        supabase.from("student_fee_records").select("student_id,course_id,month_key,updated_at").order("updated_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const loadError = profileResult.error ?? enrollmentResult.error ?? courseResult.error ?? feeResult.error;
      if (loadError) {
        setFeeError(loadError.message);
        setFeeLoading(false);
        return;
      }

      const approvedStudents = (profileResult.data ?? []) as Profile[];
      const activeEnrollments = (enrollmentResult.data ?? []) as Enrollment[];
      const courses = (courseResult.data ?? []) as Course[];
      const feeRows = (feeResult.data ?? []) as StudentFeeRecord[];

      const studentById = new Map(approvedStudents.map((student) => [student.id, student]));
      const courseById = new Map(courses.map((course) => [course.id, course]));
      const latestMonthByPair = new Map<string, string>();

      for (const fee of feeRows) {
        const key = `${fee.student_id}:${fee.course_id}`;
        if (!latestMonthByPair.has(key)) {
          latestMonthByPair.set(key, fee.month_key);
        }
      }

      const optionMap = new Map<string, FeeStudentOption>();
      for (const enrollment of activeEnrollments) {
        const student = studentById.get(enrollment.student_id);
        const course = courseById.get(enrollment.course_id);
        if (!student || !course) continue;

        const current = optionMap.get(student.id) ?? {
          studentId: student.id,
          studentName: student.full_name ?? "Unnamed student",
          email: student.email ?? "",
          phone: student.phone ?? "",
          courses: [],
          latestFeeMonth: null,
        };

        const monthHint = getMonthHint(latestMonthByPair.get(`${student.id}:${course.id}`));
        current.courses.push({
          courseId: course.id,
          courseTitle: course.title,
          enrollmentId: enrollment.id,
          monthHint,
        });
        current.latestFeeMonth = current.latestFeeMonth ?? monthHint;
        optionMap.set(student.id, current);
      }

      const options = Array.from(optionMap.values()).map((student) => ({
        ...student,
        courses: student.courses.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle)),
      }));

      setFeeStudentOptions(options);
      setFeeLoading(false);
    }

    void loadFeeStudents();

    return () => {
      cancelled = true;
    };
  }, [isFeeModalOpen, supabase]);

  function openFeeModal(student?: PaidFeeStudentDetail) {
    setFeeError(null);
    setFeeSuccess(null);
    setFeeStudentSearch(student?.studentName ?? "");
    setSelectedFeeStudentId(student?.studentId ?? "");
    setSelectedFeeCourseId(student?.courseId ?? "");
    setFeeDraft({
      monthKey: student?.monthKey || localMonthKeyValue(),
      amountDue: student ? String(student.amountDue ?? 0) : "",
      amountPaid: student ? String(student.amountPaid ?? 0) : "",
      dueDate: localDateInputValue(),
      paymentMethod: "",
      notes: "",
      status: student?.status === "waived" ? "waived" : student ? "paid" : "pending",
    });
    setIsFeeModalOpen(true);
  }

  function selectFeeStudent(student: FeeStudentOption) {
    setFeeStudentSearch(student.studentName);
    setSelectedFeeStudentId(student.studentId);
    setSelectedFeeCourseId(student.courses[0]?.courseId ?? "");
    setFeeDraft((current) =>
      current ?? {
        monthKey: student.courses[0]?.monthHint ?? localMonthKeyValue(),
        amountDue: "",
        amountPaid: "",
        dueDate: "",
        paymentMethod: "",
        notes: "",
        status: "pending",
      },
    );
  }

  function selectFeeCourse(courseId: string) {
    setSelectedFeeCourseId(courseId);
  }

  function closeFeeModal() {
    setIsFeeModalOpen(false);
  }

  function saveFeeDraft() {
    if (!feeDraft || !selectedFeeStudent || !selectedFeeCourse) {
      setFeeError("Please select a student and course.");
      return;
    }

    setFeeError(null);
    setFeeSuccess(null);
    startFeeSaving(async () => {
      const result = await upsertStudentFeeRecord({
        student_id: selectedFeeStudent.studentId,
        course_id: selectedFeeCourse.courseId,
        month_key: feeDraft.monthKey,
        amount_due: Number(feeDraft.amountDue || 0),
        amount_paid: Number(feeDraft.amountPaid || 0),
        due_date: feeDraft.dueDate || null,
        status: feeDraft.status,
        payment_method: feeDraft.paymentMethod || null,
        notes: feeDraft.notes || null,
      });

      if (!result.success) {
        setFeeError(result.error);
        return;
      }

      setFeeSuccess("Fee record saved.");
      setIsFeeModalOpen(false);
      setIsDrilldownOpen(false);
      router.refresh();
    });
  }

  async function downloadDailyPdfReport() {
    return downloadDailyCompactPdfReport();
  }

  async function downloadDailyCompactPdfReport() {
    const generatedAt = new Date().toISOString();

    setExportError(null);
    setReportGeneratedAt(generatedAt);
    setExporting("pdf");

    try {
      const blob = await pdf(
        <DailyCompactPdf
          rows={dailyCompactRows}
          reportDate={reportDate}
          adminName={adminName}
          includeSignature={false}
          signatureUrl={null}
        />,
      ).toBlob();
      downloadBlob(blob, `daily-compact-report-${dailyReportFileDate(reportDate)}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  async function downloadUnpaidDailyPdfReport() {
    const generatedAt = new Date().toISOString();

    setExportError(null);
    setReportGeneratedAt(generatedAt);
    setExporting("pdf");

    try {
      const blob = await pdf(
        <UnpaidDailyPdf
          rows={unpaidDailyRows}
          reportDate={reportDate}
          adminName={adminName}
        />,
      ).toBlob();
      downloadBlob(blob, `unpaid-daily-report-${dailyReportFileDate(reportDate)}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  function downloadDailyWorkbookReport() {
    const generatedAt = new Date().toISOString();
    setExportError(null);
    setReportGeneratedAt(generatedAt);
    setExporting("csv");
    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: "Daily Pending Report",
      Subject: "WeConnect Daily Pending Report",
      Author: "WeConnect Admin Panel",
      Company: "WeConnect Innovation",
      CreatedDate: new Date(generatedAt),
    };
    const sheet = XLSX.utils.json_to_sheet(
      dailyReportSheetRows(dailyReportRows).length > 0
        ? dailyReportSheetRows(dailyReportRows)
        : [{ "Student Name": "No records", "Task Titles": "", Status: "" }],
    );
    sheet["!cols"] = [{ wch: 28 }, { wch: 58 }, { wch: 14 }];
    sheet["!autofilter"] = { ref: `A1:C${Math.max(dailyReportRows.length + 1, 2)}` };
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(workbook, sheet, "Daily Report");
    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `daily-pending-report-${dailyReportFileDate(reportDate)}.xlsx`,
    );
    window.setTimeout(() => setExporting(null), 150);
  }

  async function downloadPdfReport() {
    const generatedAt = new Date().toISOString();
    const signatureUrl = signatureSettings?.signature_url ?? null;

    if (includeSignature && !signatureUrl) {
      setExportError("Digital signature not found. Please add digital signature first.");
      return;
    }

    setExportError(null);
    setReportGeneratedAt(generatedAt);
    setExporting("pdf");

    try {
      const blob = await pdf(
        <TaskAnalyticsPdfReport
          rows={selectedReportRows}
          metricLabel={selectedMetricLabel}
          generatedAt={generatedAt}
          reportType={selectedReportType}
          sections={selectedReportSections}
          includeSignature={includeSignature}
          adminName={adminName}
          signatureUrl={signatureUrl}
        />,
      ).toBlob();
      downloadBlob(blob, `${reportFileBase(selectedReportType)}-${fileDate()}${includeSignature ? "-signed" : ""}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  function downloadWorkbookReport() {
    const generatedAt = new Date().toISOString();
    setExportError(null);
    setReportGeneratedAt(generatedAt);
    setExporting("csv");
    downloadExcelWorkbook({
      rows: selectedReportRows,
      metricLabel: selectedMetricLabel,
      generatedAt,
      reportType: selectedReportType,
      sectionRows: selectedReportSections,
    });
    window.setTimeout(() => setExporting(null), 150);
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #task-analytics-report,
          #task-analytics-report * {
            visibility: visible;
          }

          #task-analytics-report {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            background: white;
            color: #111827;
          }

          .task-analytics-print-hidden {
            display: none !important;
          }
        }
      `}</style>

      <PageHeader
        eyebrow="Reports"
        title="Admin reports"
        description="View daily submission status, pending work, active enrollments, and Client Hunting progress from one admin-only dashboard."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsReportCardOpen(true)} className="wc-secondary-btn px-4 py-2 text-sm">
              <Icon name="assessment" className="text-base" />
              Report Card
            </button>
            <button type="button" onClick={() => setIsTodayReportOpen(true)} className="wc-secondary-btn px-4 py-2 text-sm">
              <Icon name="today" className="text-base" />
              Today Report
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStudentReportId((current) => current || reportCardRows[0]?.studentId || "");
                setIsStudentReportOpen(true);
              }}
              className="wc-primary-btn px-4 py-2 text-sm"
            >
              <Icon name="person_search" className="text-base" />
              Student Report
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 task-analytics-print-hidden">
        {metricConfig.map((metric) => (
          <TaskAnalyticsCard
            key={metric.key}
            label={metric.label}
            count={metricCount(data, metric.key)}
            icon={metric.icon}
            description={metric.description}
            active={selectedMetric === metric.key}
            onClick={() => {
              setSelectedMetric(metric.key);
              setIsDrilldownOpen(true);
            }}
          />
        ))}
      </div>

      <section className="mt-6 wc-card overflow-hidden task-analytics-print-hidden">
        <div className="border-b border-outline-variant/50 bg-surface-container-low px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Active Overview</p>
          <h2 className="mt-1 text-xl font-black text-on-surface">Active students, paid students, and completed tasks</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            These cards follow the same active-student counting rule used in the fee and analytics reports.
          </p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <SummaryMetricCard
            label="Active Students"
            value={data.totalActiveStudents}
            icon="groups"
            tone="blue"
            description="Students with active enrollments and paid fee status."
          />
          <SummaryMetricCard
            label="Paid Students"
            value={data.paidFeeStudentsCount}
            icon="paid"
            tone="green"
            description="Unique students counted by the latest active fee record."
          />
          <SummaryMetricCard
            label="Completed Tasks"
            value={data.completedTasksCount}
            icon="task_alt"
            tone="amber"
            description="Reviewed tasks completed across active paid enrollments."
          />
        </div>
      </section>

      <section className="mt-6 wc-card overflow-hidden task-analytics-print-hidden">
        <div className="border-b border-outline-variant/50 bg-primary px-5 py-5 text-on-primary">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Student-wise Report</p>
          <h2 className="mt-1 text-xl font-black text-white">Per-student active progress</h2>
          <p className="mt-1 text-sm text-blue-100">
            Each active student shows fee counts, completed tasks, and approved client hunts in one row.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-surface-container-low text-left text-[11px] font-black uppercase tracking-wider text-primary">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Fees Paid</th>
                <th className="px-5 py-3">Tasks Completed</th>
                <th className="px-5 py-3">Client Hunts Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {studentWorkSummaryRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-sm text-on-surface-variant">
                    No active student records found.
                  </td>
                </tr>
              ) : (
                studentWorkSummaryRows.map((row) => (
                  <tr key={row.studentId} className="hover:bg-surface-container/40">
                    <td className="px-5 py-4">
                      <div className="font-bold text-on-surface">{row.studentName}</div>
                      <div className="mt-1 text-xs text-on-surface-variant">{row.email || "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-primary">{row.paidFeesCount}</td>
                    <td className="px-5 py-4 text-sm font-bold text-primary">{row.tasksCompletedCount}</td>
                    <td className="px-5 py-4 text-sm font-bold text-primary">{row.clientHuntsDoneCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="daily-pending-report" className="mt-6 wc-card overflow-hidden">
        <div className="border-b border-outline-variant/50 bg-primary px-5 py-5 text-on-primary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Reports Menu</p>
              <h2 className="mt-1 text-xl font-black text-white">Daily Report</h2>
              <p className="mt-1 text-sm text-blue-100">Pick a date to see each student&apos;s task titles for that day. Current date paid students are counted separately, and overdue students are excluded from paid status.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 task-analytics-print-hidden">
              <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm ring-1 ring-white/40">
                <span>Report Date</span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(event) => setReportDate(event.target.value)}
                  className="rounded-md border border-outline-variant bg-white px-2 py-1 text-sm font-medium text-on-surface outline-none"
                />
              </label>
              <button
                type="button"
                onClick={downloadDailyPdfReport}
                disabled={exporting === "pdf"}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-secondary-container hover:text-on-secondary-fixed hover:shadow-md disabled:opacity-60"
              >
                <Icon name="picture_as_pdf" className="text-sm" />
                {exporting === "pdf" ? "Preparing PDF..." : "Download Compact PDF"}
              </button>
              <button
                type="button"
                onClick={downloadDailyWorkbookReport}
                disabled={exporting === "csv"}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-secondary-container hover:text-on-secondary-fixed hover:shadow-md disabled:opacity-60"
              >
                <Icon name="download" className="text-sm" />
                {exporting === "csv" ? "Preparing Excel..." : "Download Excel"}
              </button>
              <button
                type="button"
                onClick={downloadUnpaidDailyPdfReport}
                disabled={exporting === "pdf"}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-secondary-container hover:text-on-secondary-fixed hover:shadow-md disabled:opacity-60"
              >
                <Icon name="picture_as_pdf" className="text-sm" />
                {exporting === "pdf" ? "Preparing Unpaid PDF..." : "Unpaid Daily PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <ReportMetric
              label="Today Task Students"
              value={dailyReportStats.submitted}
              tone="green"
              onClick={() => {
                setSelectedMetric("todayTasks");
                setIsDrilldownOpen(true);
              }}
            />
            <ReportMetric
              label="Paid Fee Students"
              value={dailyReportStats.paid}
              tone="amber"
              onClick={() => {
                setSelectedMetric("paidFees");
                setIsDrilldownOpen(true);
              }}
            />
            <ReportMetric
              label="Client Hunt Today"
              value={dailyReportStats.clientHunt}
              onClick={() => {
                setSelectedMetric("clientHuntToday");
                setIsDrilldownOpen(true);
              }}
            />
          </div>
        </div>
      </section>

      {isReportCardOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Active students report card"
          onClick={() => setIsReportCardOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 bg-primary px-5 py-4 text-on-primary">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Report Card</p>
                <h3 className="mt-1 text-xl font-black text-white">Active students reviewed tasks</h3>
                <p className="mt-1 text-sm text-blue-100">
                  Total reviewed tasks up to {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={downloadReportCardPng}
                  disabled={reportCardRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="download" className="text-base" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={downloadReportCardPdf}
                  disabled={reportCardRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="picture_as_pdf" className="text-base" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportCardOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Close report card"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-105px)] overflow-auto p-5">
              {reportCardRows.length === 0 ? (
                <EmptyState title="No active students found" description="There are no active student task records to display." icon="assessment" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-outline-variant/60">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-5 py-3">Active Student</th>
                        <th className="px-5 py-3 text-center">Reviewed Tasks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {reportCardRows.map((row, index) => (
                        <tr key={row.studentId} className="transition hover:bg-surface-container/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-black text-on-primary-container">{index + 1}</span>
                              <span className="font-bold text-on-surface">{row.studentName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-primary px-3 py-1.5 text-sm font-black text-on-primary">
                              {row.tasksCompletedCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-container-low">
                      <tr>
                        <td className="px-5 py-3 text-sm font-black text-on-surface">Total active students: {reportCardRows.length}</td>
                        <td className="px-5 py-3 text-center text-sm font-black text-primary">
                          {reportCardRows.reduce((total, row) => total + row.tasksCompletedCount, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isTodayReportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Today reviewed tasks report"
          onClick={() => setIsTodayReportOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 bg-primary px-5 py-4 text-on-primary">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Today Report</p>
                <h3 className="mt-1 text-xl font-black text-white">Today reviewed tasks</h3>
                <p className="mt-1 text-sm text-blue-100">
                  Tasks reviewed on {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={downloadTodayReportPng}
                  disabled={todayReportRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="download" className="text-base" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={downloadTodayReportPdf}
                  disabled={todayReportRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="picture_as_pdf" className="text-base" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsTodayReportOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Close today report"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-105px)] overflow-auto p-5">
              {todayReportRows.length === 0 ? (
                <EmptyState title="No active students found" description="There are no active student records to display." icon="today" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-outline-variant/60">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-5 py-3">Active Student</th>
                        <th className="px-5 py-3 text-center">Reviewed Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {todayReportRows.map((row, index) => (
                        <tr key={row.studentId} className="transition hover:bg-surface-container/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-black text-on-primary-container">{index + 1}</span>
                              <span className="font-bold text-on-surface">{row.studentName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-primary px-3 py-1.5 text-sm font-black text-on-primary">
                              {row.tasksCompletedCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-container-low">
                      <tr>
                        <td className="px-5 py-3 text-sm font-black text-on-surface">Total active students: {todayReportRows.length}</td>
                        <td className="px-5 py-3 text-center text-sm font-black text-primary">
                          {todayReportRows.reduce((total, row) => total + row.tasksCompletedCount, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isStudentReportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Single student task feedback report"
          onClick={() => setIsStudentReportOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/60 bg-primary px-5 py-4 text-on-primary">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Student Report</p>
                <h3 className="mt-1 text-xl font-black text-white">Reviewed tasks and feedback</h3>
                <p className="mt-1 text-sm text-blue-100">Select one active student and download their compact PDF report.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStudentFeedbackPdf}
                  disabled={!selectedStudentReport || selectedStudentReportRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="picture_as_pdf" className="text-base" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsStudentReportOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Close student report"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-108px)] space-y-4 overflow-auto p-5">
              <label className="block space-y-2">
                <span className="wc-label">Select active student</span>
                <select
                  value={selectedStudentReportId}
                  onChange={(event) => setSelectedStudentReportId(event.target.value)}
                  className="wc-input w-full"
                >
                  <option value="">Select student</option>
                  {reportCardRows.map((student) => <option key={student.studentId} value={student.studentId}>{student.studentName}</option>)}
                </select>
              </label>

              {!selectedStudentReport ? (
                <EmptyState title="Select a student" description="Choose an active student to preview reviewed tasks and feedback." icon="person_search" />
              ) : selectedStudentReportRows.length === 0 ? (
                <EmptyState title="No reviewed tasks" description={`${selectedStudentReport.studentName} has no reviewed task records yet.`} icon="fact_check" />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="sticky top-0 bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3">Reviewed</th>
                        <th className="px-4 py-3">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {selectedStudentReportRows.map((row, index) => (
                        <tr key={`${row.taskTitle}-${row.reviewedAt}-${index}`} className="align-top hover:bg-surface-container/40">
                          <td className="px-4 py-3 text-sm font-bold text-on-surface">{row.taskTitle}</td>
                          <td className="px-4 py-3 text-sm text-on-surface-variant">{row.courseTitle}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-on-surface-variant">{row.reviewedAt ? formatDate(row.reviewedAt) : "-"}</td>
                          <td className="max-w-md px-4 py-3 text-sm text-on-surface-variant">{row.feedback}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isDrilldownOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${drilldownState.title} details`}
          onClick={() => setIsDrilldownOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 bg-surface-container-low px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Drilldown Details</p>
              <h3 className="mt-1 text-xl font-black text-on-surface">{drilldownState.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{drilldownState.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedMetric === "paidFees" ? (
                <button type="button" onClick={() => openFeeModal()} className="wc-secondary-btn px-4 py-2 text-sm">
                  <Icon name="add" className="text-base" />
                  Add Fee
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsDrilldownOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                aria-label="Close drilldown"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
          </div>

            <div className="max-h-[calc(90vh-92px)] overflow-auto p-5">
              {drilldownState.rows.length === 0 ? (
                <EmptyState title="No records found" description="There are no matching records for this card." icon="fact_check" />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
                  <table className="w-full min-w-[860px] text-left">
                    <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Detail</th>
                        <th className="px-4 py-3">Secondary</th>
                        <th className="px-4 py-3">Status</th>
                        {selectedMetric === "paidFees" ? <th className="px-4 py-3">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {selectedMetric === "paidFees"
                        ? data.paidFeeStudents.map((row) => (
                            <tr key={`${row.studentId}-${row.courseId}-${row.monthKey}`}>
                              <td className="px-4 py-3">
                                <div className="font-bold text-on-surface">{row.studentName}</div>
                                <div className="mt-1 text-xs text-on-surface-variant">{row.email || "-"}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">
                                {row.courseTitle} • {row.monthKey}
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">
                                Paid {row.amountPaid} / Due {row.amountDue}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
                                  {row.status === "paid" ? "Paid" : "Waived"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button type="button" onClick={() => openFeeModal(row)} className="wc-secondary-btn px-3 py-2 text-xs">
                                  Add Fee
                                </button>
                              </td>
                            </tr>
                          ))
                        : drilldownState.rows.map((row, index) => (
                            <tr key={`${drilldownState.title}-${row.studentName}-${index}`}>
                              <td className="px-4 py-3">
                                <div className="font-bold text-on-surface">{row.studentName}</div>
                                <div className="mt-1 text-xs text-on-surface-variant">{row.tertiary ?? "-"}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{row.detail}</td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{row.secondary ?? "-"}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
                                  Submitted
                                </span>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isFeeModalOpen && feeDraft ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Add fee record"
          onClick={closeFeeModal}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 bg-surface-container-low px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Fee entry</p>
                <h3 className="mt-1 text-xl font-black text-on-surface">Add student fee</h3>
                <p className="mt-1 text-sm text-on-surface-variant">Add or update a fee record directly from the drilldown popup.</p>
              </div>
              <button
                type="button"
                onClick={closeFeeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                aria-label="Close fee form"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {feeError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{feeError}</div> : null}
              {feeSuccess ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feeSuccess}</div> : null}

              <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                <div className="space-y-3 rounded-[22px] border border-outline-variant/60 bg-surface-container-low p-4">
                  <label className="space-y-2">
                    <span className="wc-label">Search student</span>
                    <input
                      value={feeStudentSearch}
                      onChange={(event) => {
                        setFeeStudentSearch(event.target.value);
                        setSelectedFeeStudentId("");
                        setSelectedFeeCourseId("");
                      }}
                      placeholder="Search approved enrolled student"
                      className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                    />
                  </label>

                  <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                    {feeLoading ? (
                      <div className="rounded-2xl border border-dashed border-outline-variant/70 p-4 text-sm text-on-surface-variant">Loading approved students...</div>
                    ) : feeStudentLookupResults.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-outline-variant/70 p-4 text-sm text-on-surface-variant">
                        No approved enrolled students found.
                      </div>
                    ) : (
                      feeStudentLookupResults.map((student) => {
                        const isSelected = student.studentId === selectedFeeStudentId;
                        return (
                          <button
                            key={student.studentId}
                            type="button"
                            onClick={() => selectFeeStudent(student)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary-container text-on-primary-container"
                                : "border-outline-variant/70 bg-surface hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold">{student.studentName}</p>
                                <p className="mt-1 text-xs opacity-80">
                                  {student.email || "No email"} Â· {student.phone || "No phone"}
                                </p>
                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                                  {student.courses.length} active course{student.courses.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              {student.latestFeeMonth ? (
                                <div className="text-right text-[11px] font-bold uppercase tracking-wider opacity-80">
                                  <div>Latest fee</div>
                                  <div>{student.latestFeeMonth}</div>
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[22px] border border-outline-variant/60 bg-surface p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Assignment details</p>
                    <h4 className="mt-1 text-lg font-black text-on-surface">{selectedFeeStudent?.studentName ?? "Select a student"}</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">{selectedFeeStudent?.email ?? "Student summary appears after selection."}</p>
                  </div>

                  {selectedFeeStudent ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Courses</p>
                        <p className="mt-1 text-2xl font-black text-primary">{selectedFeeStudent.courses.length}</p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Latest fee</p>
                        <p className="mt-1 text-sm font-bold text-on-surface">{selectedFeeStudent.latestFeeMonth ?? "None"}</p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Course</p>
                        <p className="mt-1 text-sm font-bold text-on-surface">{selectedFeeCourse?.courseTitle ?? "Select course"}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <span className="wc-label">Course</span>
                    <select
                      value={selectedFeeCourseId}
                      onChange={(event) => selectFeeCourse(event.target.value)}
                      disabled={!selectedFeeStudent}
                      className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none disabled:bg-surface-container-low"
                    >
                      <option value="">Select course</option>
                      {selectedFeeStudent?.courses.map((course) => (
                        <option key={course.courseId} value={course.courseId}>
                          {course.courseTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="wc-label">Month Key</span>
                      <input
                        type="month"
                        value={feeDraft.monthKey}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, monthKey: event.target.value } : current))}
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="wc-label">Status</span>
                      <select
                        value={feeDraft.status}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, status: event.target.value as FeeDraft["status"] } : current))}
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="overdue">Overdue</option>
                        <option value="waived">Waived</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="wc-label">Amount Due</span>
                      <input
                        type="number"
                        min="0"
                        value={feeDraft.amountDue}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, amountDue: event.target.value } : current))}
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="wc-label">Amount Paid</span>
                      <input
                        type="number"
                        min="0"
                        value={feeDraft.amountPaid}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, amountPaid: event.target.value } : current))}
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="wc-label">Due Date</span>
                      <input
                        type="date"
                        value={feeDraft.dueDate}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, dueDate: event.target.value } : current))}
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="wc-label">Payment Method</span>
                      <input
                        value={feeDraft.paymentMethod}
                        onChange={(event) => setFeeDraft((current) => (current ? { ...current, paymentMethod: event.target.value } : current))}
                        placeholder="Cash, bank transfer, JazzCash..."
                        className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="wc-label">Notes</span>
                    <textarea
                      rows={3}
                      value={feeDraft.notes}
                      onChange={(event) => setFeeDraft((current) => (current ? { ...current, notes: event.target.value } : current))}
                      className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                      placeholder="Optional internal notes"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/60 pt-4">
                    <button type="button" onClick={closeFeeModal} className="wc-secondary-btn px-4 py-2 text-sm">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveFeeDraft}
                      disabled={feeSaving || !selectedFeeStudent || !selectedFeeCourse || feeLoading}
                      className="wc-primary-btn px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {feeSaving ? "Saving..." : "Save Fee"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}

function ReportMetric({
  label,
  value,
  tone = "navy",
  onClick,
}: {
  label: string;
  value: number;
  tone?: "navy" | "green" | "amber";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-800"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900"
        : "bg-surface-container-low text-primary";

  return (
    <button type="button" onClick={onClick} className={`rounded-xl border border-outline-variant/60 p-4 text-left transition hover:-translate-y-0.5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </button>
  );
}

function SummaryMetricCard({
  label,
  value,
  icon,
  tone,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "blue" | "green" | "amber";
  description: string;
}) {
  const toneClasses =
    tone === "green"
      ? { card: "border-green-200 bg-green-50", icon: "bg-green-100 text-green-700", value: "text-green-950", label: "text-green-900", description: "text-green-800/80" }
      : tone === "amber"
        ? { card: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-700", value: "text-amber-950", label: "text-amber-900", description: "text-amber-800/80" }
        : { card: "border-blue-200 bg-blue-50", icon: "bg-blue-100 text-blue-700", value: "text-blue-950", label: "text-blue-900", description: "text-blue-800/80" };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses.icon}`}>
          <Icon name={icon} className="text-[24px]" />
        </div>
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-bold text-slate-600">Live</span>
      </div>
      <p className={`mt-4 text-4xl font-black leading-none ${toneClasses.value}`}>{value}</p>
      <h3 className={`mt-2 text-sm font-black ${toneClasses.label}`}>{label}</h3>
      <p className={`mt-1 text-xs leading-relaxed ${toneClasses.description}`}>{description}</p>
    </div>
  );
}

function ReportList({ title, rows }: { title: string; rows: StudentTaskDetail[] }) {
  return (
    <div className="rounded-xl border border-outline-variant/60">
      <div className="flex items-center justify-between border-b border-outline-variant/50 px-4 py-3">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-primary">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No students found" description="There are no students in this report section." icon="fact_check" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {rows.map((row, index) => (
                <tr key={`${title}-${row.studentId}-${index}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-on-surface">{row.studentName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{row.email || "Not set"}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{row.courseTitle}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{row.taskTitle || "No assigned task"}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{formatDate(row.joinedAt)}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{row.submittedAt ? formatDateTime(row.submittedAt) : "Not submitted"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.status === "submitted" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                      {row.status === "submitted"
                        ? "Submitted"
                        : title.toLowerCase().includes("nothing submitted")
                          ? "Nothing Submitted"
                          : title.toLowerCase().includes("client hunting pending")
                            ? "Client Hunting Pending"
                            : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
