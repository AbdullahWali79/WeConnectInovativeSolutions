"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CLIENT_HUNTING_SPECIALIZATIONS, getClientHuntSpecializationLabel, type ClientHuntScenarioSpecialization, type ClientHuntSpecialization } from "@/lib/client-hunting";
import { getMissingProfileLinks, isStudentProfileComplete, profileLinkFields } from "@/lib/profile-links";
import type { ClientHuntLead, ClientHuntScenario, Enrollment, Profile, StudentFeeRecord } from "@/lib/supabase/types";
import type { PermissionKey } from "@/lib/admin-permissions";

type ScenarioForm = {
  title: string;
  description: string;
  specialization: ClientHuntScenarioSpecialization;
  target_count: string;
  instructions: string;
  scenario_date: string;
  is_active: boolean;
};

type LeadReviewForm = {
  note: string;
};

const initialScenarioForm: ScenarioForm = {
  title: "",
  description: "",
  specialization: "web_development",
  target_count: "3",
  instructions: "",
  scenario_date: new Date().toISOString().slice(0, 10),
  is_active: true,
};

function pakistanDateValue(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function pakistanDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function pakistanDayBounds(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, day, -5)).toISOString(),
    end: new Date(Date.UTC(year, month - 1, day + 1, -5)).toISOString(),
  };
}

export function ClientHuntingManager({
  currentRole,
  permissions = [],
  showSidebarPanels = true,
}: {
  currentRole: Profile["role"];
  permissions?: PermissionKey[];
  showSidebarPanels?: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scenarios, setScenarios] = useState<ClientHuntScenario[]>([]);
  const [leads, setLeads] = useState<ClientHuntLead[]>([]);
  const [activeEnrollments, setActiveEnrollments] = useState<Enrollment[]>([]);
  const [feeRecords, setFeeRecords] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [exportingAchievedPdf, setExportingAchievedPdf] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [scenarioFilter, setScenarioFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [keywordFilter, setKeywordFilter] = useState("all");
  const [scenarioForm, setScenarioForm] = useState<ScenarioForm>(initialScenarioForm);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isScenarioListModalOpen, setIsScenarioListModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTodayReportOpen, setIsTodayReportOpen] = useState(false);
  const [reviewForms, setReviewForms] = useState<Record<string, LeadReviewForm>>({});
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [globalTargetDraft, setGlobalTargetDraft] = useState("3");
  const [studentTargetDrafts, setStudentTargetDrafts] = useState<Record<string, string>>({});
  const [targetSavingId, setTargetSavingId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  const canEdit =
    currentRole === "admin" ||
    permissions.some((permission) => ["client_hunting.create", "client_hunting.edit", "client_hunting.delete", "client_hunting.approve"].includes(permission));

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profileResult, scenarioResult, leadResult, enrollmentResult, feeResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").eq("status", "approved").order("full_name"),
      supabase.from("client_hunt_scenarios").select("*").order("scenario_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("client_hunt_leads").select("*").order("submitted_at", { ascending: false }),
      supabase.from("enrollments").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("student_fee_records").select("*").order("updated_at", { ascending: false }),
    ]);

    const error = profileResult.error ?? scenarioResult.error ?? leadResult.error ?? enrollmentResult.error ?? feeResult.error;
    if (error) {
      setToast({ type: "error", message: error.message });
    }

    setProfiles(profileResult.data ?? []);
    setScenarios(scenarioResult.data ?? []);
    setLeads(leadResult.data ?? []);
    setActiveEnrollments((enrollmentResult.data ?? []) as Enrollment[]);
    setFeeRecords((feeResult.data ?? []) as StudentFeeRecord[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const refresh = () => {
      void loadData();
    };

    const intervalId = setInterval(refresh, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  const studentById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const scenarioById = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios]);
  const areaOptions = useMemo(() => {
    const values = new Set<string>();
    for (const lead of leads) {
      const area = lead.address?.trim();
      if (area) values.add(area);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [leads]);
  const keywordOptions = useMemo(() => {
    const values = new Set<string>();
    for (const lead of leads) {
      if (specializationFilter !== "all" && lead.specialization !== specializationFilter) {
        continue;
      }

      if (studentFilter !== "all" && lead.student_id !== studentFilter) {
        continue;
      }

      const scenario = lead.scenario_id ? scenarioById.get(lead.scenario_id) : null;
      const candidates = [
        scenario?.title,
        scenario?.specialization ? getClientHuntSpecializationLabel(scenario.specialization) : null,
        lead.note,
        lead.why_this_client,
      ];
      for (const candidate of candidates) {
        const value = candidate?.trim();
        if (value) values.add(value);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [leads, scenarioById, specializationFilter, studentFilter]);

  useEffect(() => {
    setKeywordFilter((current) => (current === "all" || keywordOptions.includes(current) ? current : "all"));
  }, [keywordOptions]);

  useEffect(() => {
    setKeywordFilter("all");
  }, [specializationFilter]);
  const filteredLeads = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const student = studentById.get(lead.student_id);
      const scenario = lead.scenario_id ? scenarioById.get(lead.scenario_id) : null;
      const matchesQuery =
        !needle ||
        lead.client_name.toLowerCase().includes(needle) ||
        lead.business_name.toLowerCase().includes(needle) ||
        (lead.email ?? "").toLowerCase().includes(needle) ||
        (lead.phone_number ?? "").toLowerCase().includes(needle) ||
        (lead.whatsapp_number ?? "").toLowerCase().includes(needle) ||
        (student?.full_name ?? "").toLowerCase().includes(needle) ||
        (student?.email ?? "").toLowerCase().includes(needle) ||
        (scenario?.title ?? "").toLowerCase().includes(needle) ||
        (lead.note ?? "").toLowerCase().includes(needle) ||
        (lead.why_this_client ?? "").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSpecialization = specializationFilter === "all" || lead.specialization === specializationFilter;
      const matchesStudent = studentFilter === "all" || lead.student_id === studentFilter;
      const matchesScenario = scenarioFilter === "all" || lead.scenario_id === scenarioFilter;
      const matchesArea = areaFilter === "all" || (lead.address ?? "").trim() === areaFilter;
      const matchesKeyword =
        keywordFilter === "all" ||
        (scenario?.title ?? "") === keywordFilter ||
        (lead.note ?? "") === keywordFilter ||
        (lead.why_this_client ?? "") === keywordFilter;
      return matchesQuery && matchesStatus && matchesSpecialization && matchesStudent && matchesScenario && matchesArea && matchesKeyword;
    });
  }, [areaFilter, keywordFilter, leads, query, scenarioById, scenarioFilter, specializationFilter, statusFilter, studentById, studentFilter]);

  const visiblePendingLeadIds = useMemo(
    () => filteredLeads.filter((lead) => lead.status === "pending").map((lead) => lead.id),
    [filteredLeads],
  );
  const selectedLeadIdSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const selectedVisiblePendingLeadIds = useMemo(
    () => visiblePendingLeadIds.filter((leadId) => selectedLeadIdSet.has(leadId)),
    [selectedLeadIdSet, visiblePendingLeadIds],
  );
  const allVisiblePendingSelected = visiblePendingLeadIds.length > 0 && selectedVisiblePendingLeadIds.length === visiblePendingLeadIds.length;

  useEffect(() => {
    setSelectedLeadIds((current) => current.filter((leadId) => visiblePendingLeadIds.includes(leadId)));
  }, [visiblePendingLeadIds]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLeads = leads.filter((lead) => lead.submitted_at.slice(0, 10) === today);
    const approved = leads.filter((lead) => lead.status === "approved");
    const pending = leads.filter((lead) => lead.status === "pending");
    const rejected = leads.filter((lead) => lead.status === "rejected");
    const duplicate = leads.filter((lead) => lead.status === "duplicate");
    const specializationCounts = CLIENT_HUNTING_SPECIALIZATIONS.map((item) => ({
      ...item,
      count: leads.filter((lead) => lead.specialization === item.value).length,
    })).filter((item) => item.count > 0);
    const studentCounts = profiles.map((profile) => ({
      profile,
      count: leads.filter((lead) => lead.student_id === profile.id).length,
      approvedCount: leads.filter((lead) => lead.student_id === profile.id && lead.status === "approved").length,
    })).sort((a, b) => b.count - a.count);

    return { todayLeads, approved, pending, rejected, duplicate, specializationCounts, studentCounts };
  }, [leads, profiles]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const studentRows = useMemo(() => {
    return profiles
      .map((profile) => {
        const studentLeads = leads.filter((lead) => lead.student_id === profile.id);
        const todayLeads = studentLeads.filter((lead) => lead.submitted_at.slice(0, 10) === today);
        const todayApproved = todayLeads.filter((lead) => lead.status === "approved").length;
        const todayPending = todayLeads.filter((lead) => lead.status === "pending").length;
        const todayRejected = todayLeads.filter((lead) => lead.status === "rejected").length;
        const dailyTarget = Math.max(profile.client_hunting_daily_target ?? 3, 1);
        const profileComplete = isStudentProfileComplete(profile);
        const missingLinks = getMissingProfileLinks(profile).length;

        return {
          profile,
          studentLeads,
          todayLeads,
          todayApproved,
          todayPending,
          todayRejected,
          dailyTarget,
          profileComplete,
          missingLinks,
          achievementPercent: Math.min(100, Math.round((todayApproved / dailyTarget) * 100)),
          completionPercent: Math.min(100, Math.round((todayApproved / dailyTarget) * 100)),
        };
      })
      .sort((a, b) => {
        if (a.profileComplete !== b.profileComplete) return Number(b.profileComplete) - Number(a.profileComplete);
        return b.todayApproved - a.todayApproved;
      });
  }, [leads, profiles, today]);
  const achievedTodayRows = useMemo(
    () => studentRows.filter((row) => row.todayApproved >= row.dailyTarget),
    [studentRows],
  );
  const eligibleActiveStudentIds = useMemo(() => {
    const latestFeeByEnrollment = new Map<string, StudentFeeRecord>();
    for (const feeRecord of feeRecords) {
      const key = `${feeRecord.student_id}:${feeRecord.course_id}`;
      const current = latestFeeByEnrollment.get(key);
      if (!current || feeRecord.updated_at > current.updated_at) latestFeeByEnrollment.set(key, feeRecord);
    }
    return new Set(
      activeEnrollments
        .filter((enrollment) => {
          const feeRecord = latestFeeByEnrollment.get(`${enrollment.student_id}:${enrollment.course_id}`);
          return feeRecord?.status === "paid" || feeRecord?.status === "waived";
        })
        .map((enrollment) => enrollment.student_id),
    );
  }, [activeEnrollments, feeRecords]);
  const todayClientHuntReportRows = useMemo(() => {
    const dateValue = pakistanDateValue();
    const { start, end } = pakistanDayBounds(dateValue);
    const countByStudent = new Map<string, number>();
    for (const lead of leads) {
      if (lead.submitted_at < start || lead.submitted_at >= end) continue;
      countByStudent.set(lead.student_id, (countByStudent.get(lead.student_id) ?? 0) + 1);
    }
    return profiles
      .filter((profile) => eligibleActiveStudentIds.has(profile.id))
      .map((profile) => ({
        studentId: profile.id,
        studentName: profile.full_name ?? profile.email ?? "Student",
        count: countByStudent.get(profile.id) ?? 0,
      }))
      .filter((student) => student.count > 0)
      .sort((first, second) => first.studentName.localeCompare(second.studentName));
  }, [eligibleActiveStudentIds, leads, profiles]);

  function downloadTodayClientHuntPng() {
    const rows = todayClientHuntReportRows;
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
    context.fillText("TODAY CLIENT HUNT REPORT", padding, 52);
    context.fillStyle = "#ffffff";
    context.font = "700 42px Arial, sans-serif";
    context.fillText("Student-wise Client Hunts", padding, 108);
    context.fillStyle = "#dbeafe";
    context.font = "24px Arial, sans-serif";
    context.fillText(`Client hunts submitted on ${pakistanDateLabel()}`, padding, 153);

    const gap = 36;
    const columnWidth = (width - padding * 2 - gap) / 2;
    const drawColumn = (columnRows: typeof rows, columnIndex: number, startNumber: number) => {
      const x = padding + columnIndex * (columnWidth + gap);
      const top = headerHeight + 28;
      context.fillStyle = "#e8f0f7";
      context.fillRect(x, top, columnWidth, columnHeaderHeight);
      context.fillStyle = "#15558a";
      context.font = "700 18px Arial, sans-serif";
      context.fillText("STUDENT", x + 20, top + 34);
      context.textAlign = "right";
      context.fillText("CLIENT HUNTS", x + columnWidth - 20, top + 34);
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
        const maxNameWidth = columnWidth - 210;
        let studentName = row.studentName;
        while (context.measureText(studentName).width > maxNameWidth && studentName.length > 3) studentName = `${studentName.slice(0, -4)}...`;
        context.fillText(studentName, x + 62, y + rowHeight / 2 + 7);
        context.fillStyle = "#15558a";
        context.font = "700 21px Arial, sans-serif";
        context.textAlign = "right";
        context.fillText(String(row.count), x + columnWidth - 30, y + rowHeight / 2 + 7);
        context.textAlign = "left";
      });
    };

    drawColumn(rows.slice(0, rowsPerColumn), 0, 1);
    drawColumn(rows.slice(rowsPerColumn), 1, rowsPerColumn + 1);
    const footerY = headerHeight + 28 + columnHeaderHeight + Math.max(rowsPerColumn, 1) * rowHeight + 28;
    context.fillStyle = "#15558a";
    context.font = "700 22px Arial, sans-serif";
    context.fillText(`Students Active Today: ${rows.length}`, padding, footerY + 28);
    context.textAlign = "right";
    context.fillText(`Total Client Hunts Today: ${rows.reduce((total, row) => total + row.count, 0)}`, width - padding, footerY + 28);
    context.textAlign = "left";
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `today-client-hunt-report-${pakistanDateValue()}.png`);
    }, "image/png");
  }

  function patchScenarioForm(patch: Partial<ScenarioForm>) {
    setScenarioForm((current) => ({ ...current, ...patch }));
  }

  function patchReviewForm(leadId: string, patch: Partial<LeadReviewForm>) {
    setReviewForms((current) => ({ ...current, [leadId]: { note: current[leadId]?.note ?? "", ...patch } }));
  }

  function patchStudentTargetDraft(studentId: string, value: string) {
    setStudentTargetDrafts((current) => ({ ...current, [studentId]: value }));
  }

  function prepareNextKeyword(profile: Profile) {
    const nextTitle = `${profile.full_name ?? profile.email ?? "Student"} next keyword`;
    const specialization = profile.client_hunting_specialization ?? "web_development";
    const targetCount = String(Math.max(profile.client_hunting_daily_target ?? 3, 1));

    setScenarioForm({
      title: nextTitle,
      description: `Next target for ${profile.full_name ?? profile.email ?? "this student"}.`,
      specialization,
      target_count: targetCount,
      instructions: `Create a fresh client-hunting keyword for ${profile.full_name ?? profile.email ?? "the student"}.`,
      scenario_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    });

    setIsScenarioModalOpen(true);
    setToast({ type: "success", message: `Next keyword prepared for ${profile.full_name ?? profile.email ?? "student"}.` });
  }

  function openScenarioModal() {
    setScenarioForm(initialScenarioForm);
    setIsScenarioModalOpen(true);
  }

  function closeScenarioModal() {
    setIsScenarioModalOpen(false);
  }

  function openScenarioListModal() {
    setIsScenarioListModalOpen(true);
  }

  function closeScenarioListModal() {
    setIsScenarioListModalOpen(false);
  }

  function openReviewModal() {
    setIsReviewModalOpen(true);
  }

  function closeReviewModal() {
    setIsReviewModalOpen(false);
  }

  function toggleLeadDetails(leadId: string) {
    setExpandedLeadId((current) => (current === leadId ? null : leadId));
  }

  function toggleLeadSelection(leadId: string, checked: boolean) {
    setSelectedLeadIds((current) => {
      if (checked) {
        return current.includes(leadId) ? current : [...current, leadId];
      }

      return current.filter((currentLeadId) => currentLeadId !== leadId);
    });
  }

  function toggleSelectAllVisiblePending(checked: boolean) {
    setSelectedLeadIds((current) => {
      const currentSet = new Set(current);

      if (checked) {
        for (const leadId of visiblePendingLeadIds) {
          currentSet.add(leadId);
        }
      } else {
        for (const leadId of visiblePendingLeadIds) {
          currentSet.delete(leadId);
        }
      }

      return Array.from(currentSet);
    });
  }

  function downloadWorkbook(workbook: XLSX.WorkBook, fileBase: string) {
    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBase}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAchievedTodayPdf() {
    setExportingAchievedPdf(true);

    try {
      const blob = await pdf(
        <AchievedTodayPdfReport
          rows={achievedTodayRows}
          generatedAt={new Date().toISOString()}
        />,
      ).toBlob();

      downloadBlob(blob, `today-target-achieved-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ type: "success", message: "Achieved target PDF downloaded." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to generate PDF report." });
    } finally {
      setExportingAchievedPdf(false);
    }
  }

  function exportClientWise() {
    const rows = filteredLeads.map((lead) => {
      const student = studentById.get(lead.student_id);
      const scenario = lead.scenario_id ? scenarioById.get(lead.scenario_id) : null;
      return {
        client_name: lead.client_name,
        business_name: lead.business_name,
        student_name: student?.full_name ?? "Unknown student",
        student_email: student?.email ?? "",
        specialization: getClientHuntSpecializationLabel(lead.specialization),
        scenario: scenario?.title ?? "No scenario",
        status: lead.status,
        website_url: lead.website_url ?? "",
        gmb_url: lead.gmb_url ?? "",
        facebook_page_url: lead.facebook_page_url ?? "",
        address: lead.address ?? "",
        phone_number: lead.phone_number ?? "",
        whatsapp_number: lead.whatsapp_number ?? "",
        email: lead.email ?? "",
        note: lead.note ?? "",
        why_this_client: lead.why_this_client ?? "",
        submitted_at: lead.submitted_at,
      };
    });

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Client Wise");
    downloadWorkbook(workbook, `client-wise-export-${new Date().toISOString().slice(0, 10)}`);
  }

  function exportStudentWise() {
    const rows = profiles.map((profile) => {
      const studentLeads = filteredLeads.filter((lead) => lead.student_id === profile.id);
      return {
        student_name: profile.full_name ?? "Unknown student",
        student_email: profile.email ?? "",
        specialization: profile.client_hunting_specialization ? getClientHuntSpecializationLabel(profile.client_hunting_specialization) : "Unspecified",
        total_leads: studentLeads.length,
        pending: studentLeads.filter((lead) => lead.status === "pending").length,
        approved: studentLeads.filter((lead) => lead.status === "approved").length,
        rejected: studentLeads.filter((lead) => lead.status === "rejected").length,
        duplicate: studentLeads.filter((lead) => lead.status === "duplicate").length,
        approved_ratio: studentLeads.length > 0 ? `${Math.round((studentLeads.filter((lead) => lead.status === "approved").length / studentLeads.length) * 100)}%` : "0%",
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Student Wise");
    downloadWorkbook(workbook, `student-wise-export-${new Date().toISOString().slice(0, 10)}`);
  }

  function exportSkillWise() {
    const rows = CLIENT_HUNTING_SPECIALIZATIONS.map((specialization) => {
      const specializationLeads = filteredLeads.filter((lead) => lead.specialization === specialization.value);
      return {
        specialization: specialization.label,
        total_leads: specializationLeads.length,
        pending: specializationLeads.filter((lead) => lead.status === "pending").length,
        approved: specializationLeads.filter((lead) => lead.status === "approved").length,
        rejected: specializationLeads.filter((lead) => lead.status === "rejected").length,
        duplicate: specializationLeads.filter((lead) => lead.status === "duplicate").length,
      };
    }).filter((row) => row.total_leads > 0);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Skill Wise");
    downloadWorkbook(workbook, `skill-wise-export-${new Date().toISOString().slice(0, 10)}`);
  }

  async function saveScenario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setToast({ type: "error", message: "You do not have permission to create scenarios." });
      return;
    }

    if (!scenarioForm.title.trim()) {
      setToast({ type: "error", message: "Scenario title is required." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("client_hunt_scenarios").insert({
      title: scenarioForm.title.trim(),
      description: scenarioForm.description.trim() || null,
      specialization: scenarioForm.specialization,
      target_count: Number(scenarioForm.target_count || 5),
      instructions: scenarioForm.instructions.trim() || null,
      scenario_date: scenarioForm.scenario_date || new Date().toISOString().slice(0, 10),
      is_active: scenarioForm.is_active,
    });
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Scenario saved." });
    setScenarioForm(initialScenarioForm);
    setIsScenarioModalOpen(false);
    await loadData();
  }

  async function toggleScenario(scenario: ClientHuntScenario) {
    if (!canEdit) return;
    setBusyId(scenario.id);
    const { error } = await supabase.from("client_hunt_scenarios").update({ is_active: !scenario.is_active, updated_at: new Date().toISOString() }).eq("id", scenario.id);
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: scenario.is_active ? "Scenario deactivated." : "Scenario activated." });
    await loadData();
  }

  async function approveLead(leadId: string) {
    if (!canEdit) return;
    setBusyId(leadId);
    const { error } = await supabase.rpc("approve_client_hunt_lead", { target_lead_id: leadId });
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Lead approved." });
    await loadData();
  }

  async function bulkApproveSelectedLeads() {
    if (!canEdit) return;
    if (selectedVisiblePendingLeadIds.length === 0) {
      setToast({ type: "error", message: "Select at least one pending lead to approve." });
      return;
    }

    setBulkApproving(true);
    const { data, error } = await supabase.rpc("bulk_approve_client_hunt_leads", {
      target_lead_ids: selectedVisiblePendingLeadIds,
    });
    setBulkApproving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setSelectedLeadIds([]);
    setToast({ type: "success", message: `${data ?? selectedVisiblePendingLeadIds.length} lead${(data ?? selectedVisiblePendingLeadIds.length) === 1 ? "" : "s"} approved.` });
    await loadData();
  }

  async function rejectLead(leadId: string) {
    if (!canEdit) return;
    const note = reviewForms[leadId]?.note?.trim() ?? "";
    setBusyId(leadId);
    const { error } = await supabase.rpc("reject_client_hunt_lead", { target_lead_id: leadId, reviewer_notes: note || null });
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Lead rejected." });
    await loadData();
  }

  async function markDuplicate(leadId: string) {
    if (!canEdit) return;
    setBusyId(leadId);
    const { error } = await supabase
      .from("client_hunt_leads")
      .update({ status: "duplicate", reviewed_by: null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", leadId);
    setBusyId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Lead marked as duplicate." });
    await loadData();
  }

  async function saveStudentTarget(studentId: string, value: string) {
    if (!canEdit) return;
    const target = Math.max(1, Number(value || 3));
    setTargetSavingId(studentId);
    const { error } = await supabase
      .from("profiles")
      .update({ client_hunting_daily_target: target })
      .eq("id", studentId)
      .eq("role", "student");
    setTargetSavingId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Student daily target updated." });
    setStudentTargetDrafts((current) => ({ ...current, [studentId]: String(target) }));
    await loadData();
  }

  async function applyGlobalTarget() {
    if (!canEdit) return;
    const target = Math.max(1, Number(globalTargetDraft || 3));
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ client_hunting_daily_target: target })
      .eq("role", "student");
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Daily target updated for all students." });
    setStudentTargetDrafts({});
    await loadData();
  }

  if (loading) return <LoadingState label="Loading client hunting..." />;

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Lead Intelligence"
        title="Client hunting workflow"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openScenarioModal} className="wc-primary-btn text-sm">
              <Icon name="add" />
              Create scenario
            </button>
            <button
              type="button"
              onClick={() => setIsTodayReportOpen(true)}
              className="wc-secondary-btn text-sm"
            >
              <Icon name="today" />
              Today Client Hunt Report
            </button>
          </div>
        }
      />

      {isTodayReportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Today client hunt report"
          onClick={() => setIsTodayReportOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/60 bg-primary px-5 py-4 text-on-primary">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Today Client Hunt Report</p>
                <h3 className="mt-1 text-xl font-black text-white">Student-wise client hunts</h3>
                <p className="mt-1 text-sm text-blue-100">Only students who submitted client hunts on {pakistanDateLabel()}.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadTodayClientHuntPng}
                  disabled={todayClientHuntReportRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="download" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => setIsTodayReportOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Close today client hunt report"
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-105px)] overflow-auto p-5">
              {todayClientHuntReportRows.length === 0 ? (
                <EmptyState title="No client hunts today" description="No active student has submitted a client hunt today." icon="manage_search" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-outline-variant/60">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3 text-center">Client Hunts Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {todayClientHuntReportRows.map((row, index) => (
                        <tr key={row.studentId} className="hover:bg-surface-container/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-black text-on-primary-container">{index + 1}</span>
                              <span className="font-bold text-on-surface">{row.studentName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-primary px-3 py-1.5 text-sm font-black text-on-primary">{row.count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-container-low">
                      <tr>
                        <td className="px-5 py-3 text-sm font-black text-on-surface">Students active today: {todayClientHuntReportRows.length}</td>
                        <td className="px-5 py-3 text-center text-sm font-black text-primary">{todayClientHuntReportRows.reduce((total, row) => total + row.count, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total leads" value={leads.length} icon="assignment" />
        <MetricCard label="Pending" value={stats.pending.length} icon="pending_actions" tone="secondary" />
        <MetricCard label="Approved" value={stats.approved.length} icon="check_circle" tone="success" />
        <MetricCard label="Rejected" value={stats.rejected.length} icon="close" tone="error" />
        <MetricCard label="Duplicates" value={stats.duplicate.length} icon="content_copy" tone="muted" />
      </div>

      <section className={`mt-6 grid gap-6 ${showSidebarPanels ? "xl:grid-cols-[360px_minmax(0,1fr)]" : ""}`}>
        {showSidebarPanels ? (
          <div className="space-y-6">
          <div className="wc-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-on-surface">Student review table</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Quick status with a separate detail view for full handling.</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  onClick={() => void downloadAchievedTodayPdf()}
                  disabled={exportingAchievedPdf || studentRows.length === 0}
                  className="wc-secondary-btn whitespace-nowrap"
                >
                  <Icon name="picture_as_pdf" />
                  {exportingAchievedPdf ? "Preparing PDF..." : "Target Achievers PDF"}
                </button>
                <button type="button" onClick={openReviewModal} className="wc-secondary-btn">
                  <Icon name="table_view" />
                  View details
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-variant">
              <table className="w-full min-w-[980px]">
                <thead className="bg-surface-container-low text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">Today</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 bg-white">
                  {studentRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-sm text-on-surface-variant" colSpan={7}>
                        No approved students found.
                      </td>
                    </tr>
                  ) : (
                    studentRows.map(({ profile, todayApproved, todayLeads, dailyTarget, profileComplete, missingLinks, completionPercent, todayPending, todayRejected }) => (
                      <tr key={profile.id}>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-on-surface">{profile.full_name ?? profile.email ?? "Student"}</p>
                          <p className="text-xs text-on-surface-variant">{profile.email ?? "No email"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {profileComplete ? "Complete" : `${missingLinks}/${profileLinkFields.length} missing`}
                            </span>
                            <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                              {profile.client_hunting_daily_target ?? 3} daily target
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">
                          {profile.client_hunting_specialization ? getClientHuntSpecializationLabel(profile.client_hunting_specialization) : "Unspecified"}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-on-surface">{todayApproved}/{dailyTarget}</p>
                          <p className="text-xs text-on-surface-variant">
                            {todayLeads.length} today · {todayPending} pending · {todayRejected} rejected
                          </p>
                          <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-surface-container">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <label className="block">
                            <span className="sr-only">Student target</span>
                            <input
                              className="wc-input w-20 px-2 py-1 text-right text-sm"
                              type="number"
                              min="1"
                              value={studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3)}
                              onChange={(event) => patchStudentTargetDraft(profile.id, event.target.value)}
                            />
                          </label>
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill value={profileComplete ? "approved" : "pending"} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => prepareNextKeyword(profile)}
                              className="wc-secondary-btn text-xs"
                            >
                              Next keyword
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentFilter(profile.id);
                                setStatusFilter("all");
                                setQuery("");
                              }}
                              className="wc-secondary-btn text-xs"
                            >
                              View leads
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveStudentTarget(profile.id, studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3))}
                              disabled={targetSavingId === profile.id || !canEdit}
                              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              {targetSavingId === profile.id ? "Saving..." : "Save target"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="wc-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-on-surface">Scenario list</h3>
              <button type="button" onClick={openScenarioListModal} className="wc-secondary-btn">
                <Icon name="table_view" />
                View details
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {scenarios.length === 0 ? (
                <EmptyState title="No scenarios yet" description="Create the first daily client hunting brief." icon="event_note" />
              ) : (
                scenarios.map((scenario) => (
                  <div key={scenario.id} className="rounded-2xl border border-outline-variant bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-on-surface">{scenario.title}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{getClientHuntSpecializationLabel(scenario.specialization)} - {scenario.scenario_date}</p>
                      </div>
                      <StatusPill value={scenario.is_active ? "active" : "inactive"} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-on-surface-variant">{scenario.target_count} leads target</p>
                      <button type="button" className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface" onClick={() => toggleScenario(scenario)} disabled={busyId === scenario.id || !canEdit}>
                        {scenario.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.specializationCounts.map((item) => (
              <div key={item.value} className="wc-card p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-primary">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="wc-card p-5">
            <div className="flex flex-col gap-3 border-b border-outline-variant/50 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-on-surface">Lead approvals</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Approve, reject, or mark duplicates. Filters are live.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input className="wc-input" placeholder="Search lead or student" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className="wc-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="duplicate">Duplicate</option>
                </select>
                <select className="wc-input" value={specializationFilter} onChange={(event) => setSpecializationFilter(event.target.value)}>
                  <option value="all">All specializations</option>
                  {CLIENT_HUNTING_SPECIALIZATIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select className="wc-input" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                  <option value="all">All students</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name ?? profile.email}
                    </option>
                  ))}
                </select>
                <select className="wc-input" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
                  <option value="all">All areas</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <select className="wc-input" value={keywordFilter} onChange={(event) => setKeywordFilter(event.target.value)}>
                  <option value="all">All</option>
                  {keywordOptions.map((keyword) => (
                    <option key={keyword} value={keyword}>
                      {keyword}
                    </option>
                  ))}
                </select>
                <select className="wc-input md:col-span-2" value={scenarioFilter} onChange={(event) => setScenarioFilter(event.target.value)}>
                  <option value="all">All scenarios</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <EmptyState title="No leads found" description="Adjust the filters or wait for students to submit their daily hunting work." icon="search" />
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-outline-variant">
                <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-on-surface-variant">
                    Select pending leads to approve them in bulk.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-surface-container px-3 py-2 text-xs font-bold text-on-surface disabled:opacity-50"
                      onClick={() => setSelectedLeadIds([])}
                      disabled={selectedVisiblePendingLeadIds.length === 0}
                    >
                      Clear selection
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-surface-container px-3 py-2 text-xs font-bold text-on-surface disabled:opacity-50"
                      onClick={() => toggleSelectAllVisiblePending(!allVisiblePendingSelected)}
                      disabled={visiblePendingLeadIds.length === 0}
                    >
                      {allVisiblePendingSelected ? "Unselect all pending" : "Select all pending"}
                    </button>
                    <button
                      type="button"
                      className="wc-primary-btn text-sm disabled:opacity-60"
                      onClick={() => void bulkApproveSelectedLeads()}
                      disabled={!canEdit || bulkApproving || selectedVisiblePendingLeadIds.length === 0}
                    >
                      <Icon name="check_circle" />
                      {bulkApproving ? "Approving..." : `Approve selected (${selectedVisiblePendingLeadIds.length})`}
                    </button>
                  </div>
                </div>
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead className="bg-surface-container-low text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allVisiblePendingSelected}
                            onChange={(event) => toggleSelectAllVisiblePending(event.target.checked)}
                            disabled={!canEdit || visiblePendingLeadIds.length === 0}
                          />
                          <span>Select</span>
                        </label>
                      </th>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Scenario</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-white">
                    {filteredLeads.map((lead) => {
                      const student = studentById.get(lead.student_id);
                      const scenario = lead.scenario_id ? scenarioById.get(lead.scenario_id) : null;
                      const reviewForm = reviewForms[lead.id] ?? { note: lead.reviewer_notes ?? "" };
                      const isExpanded = expandedLeadId === lead.id;
                      const isSelectable = canEdit && lead.status === "pending";

                      return (
                        <Fragment key={lead.id}>
                          <tr
                            className="cursor-pointer hover:bg-surface-container-low"
                            onClick={() => toggleLeadDetails(lead.id)}
                          >
                            <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedLeadIdSet.has(lead.id)}
                                disabled={!isSelectable}
                                title={isSelectable ? "Select for bulk approval" : "Only pending leads can be bulk approved"}
                                onChange={(event) => toggleLeadSelection(lead.id, event.target.checked)}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-primary">{getClientHuntSpecializationLabel(lead.specialization)}</p>
                              <p className="mt-1 text-sm font-black text-on-surface">{lead.business_name}</p>
                              <p className="text-xs text-on-surface-variant">{lead.client_name}</p>
                              {lead.target_areas?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {lead.target_areas.map((area) => (
                                    <span key={area} className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                      {getClientHuntSpecializationLabel(area)}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm font-bold text-on-surface">{student?.full_name ?? student?.email ?? "Unknown student"}</p>
                              <p className="text-xs text-on-surface-variant">{student?.email ?? lead.student_id}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm font-semibold text-on-surface">{scenario?.title ?? "No scenario"}</p>
                              <p className="text-xs text-on-surface-variant">{lead.submitted_at.slice(0, 10)}</p>
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill value={lead.status} />
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-2 text-xs font-bold text-on-surface"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleLeadDetails(lead.id);
                                }}
                              >
                                <Icon name={isExpanded ? "expand_less" : "expand_more"} />
                                {isExpanded ? "Collapse" : "View details"}
                              </button>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr className="bg-surface-container-lowest">
                              <td colSpan={6} className="px-4 pb-5 pt-0">
                                <div className="grid gap-4 rounded-2xl border border-outline-variant bg-white p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                  <div className="space-y-3 text-sm text-on-surface-variant">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <p><span className="font-bold text-on-surface">Client:</span> {lead.client_name}</p>
                                      <p><span className="font-bold text-on-surface">Business:</span> {lead.business_name}</p>
                                      <p><span className="font-bold text-on-surface">Website:</span> {lead.website_url ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">GMB:</span> {lead.gmb_url ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">Facebook:</span> {lead.facebook_page_url ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">Address:</span> {lead.address ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">Phone:</span> {lead.phone_number ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">WhatsApp:</span> {lead.whatsapp_number ?? "Empty"}</p>
                                      <p><span className="font-bold text-on-surface">Email:</span> {lead.email ?? "Empty"}</p>
                                      <p className="sm:col-span-2"><span className="font-bold text-on-surface">Why this client:</span> {lead.why_this_client ?? "None"}</p>
                                      <p className="sm:col-span-2"><span className="font-bold text-on-surface">Student note:</span> {lead.note ?? "None"}</p>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <label className="block">
                                      <span className="wc-label">Reviewer note</span>
                                      <textarea
                                        className="wc-input mt-2 min-h-24"
                                        value={reviewForm.note}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => patchReviewForm(lead.id, { note: event.target.value })}
                                        placeholder="Reason for rejection or internal note"
                                      />
                                    </label>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void approveLead(lead.id);
                                        }}
                                        disabled={busyId === lead.id || !canEdit}
                                        className="wc-primary-btn"
                                      >
                                        <Icon name="check" />
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void rejectLead(lead.id);
                                        }}
                                        disabled={busyId === lead.id || !canEdit}
                                        className="wc-secondary-btn"
                                      >
                                        <Icon name="close" />
                                        Reject
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void markDuplicate(lead.id);
                                        }}
                                        disabled={busyId === lead.id || !canEdit}
                                        className="wc-secondary-btn"
                                      >
                                        <Icon name="content_copy" />
                                        Duplicate
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {isScenarioModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create scenario dialog">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-outline-variant bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-on-surface">Create scenario</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Send a new daily hunt brief through WhatsApp and save it here for tracking.</p>
              </div>
              <button type="button" onClick={closeScenarioModal} className="rounded-full bg-surface-container px-3 py-2 text-sm font-bold text-on-surface">
                Close
              </button>
            </div>

            <form onSubmit={saveScenario} className="mt-6 space-y-4">
              <label className="block">
                <span className="wc-label">Title</span>
                <input className="wc-input mt-2" value={scenarioForm.title} onChange={(event) => patchScenarioForm({ title: event.target.value })} />
              </label>
              <label className="block">
                <span className="wc-label">Specialization</span>
                <select className="wc-input mt-2" value={scenarioForm.specialization} onChange={(event) => patchScenarioForm({ specialization: event.target.value as ClientHuntScenarioSpecialization })}>
                  <option value="all">All</option>
                  {CLIENT_HUNTING_SPECIALIZATIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="wc-label">Target count</span>
                  <input className="wc-input mt-2" type="number" min="1" value={scenarioForm.target_count} onChange={(event) => patchScenarioForm({ target_count: event.target.value })} />
                </label>
                <label className="block">
                  <span className="wc-label">Scenario date</span>
                  <input className="wc-input mt-2" type="date" value={scenarioForm.scenario_date} onChange={(event) => patchScenarioForm({ scenario_date: event.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="wc-label">Description</span>
                <textarea className="wc-input mt-2 min-h-24" value={scenarioForm.description} onChange={(event) => patchScenarioForm({ description: event.target.value })} />
              </label>
              <label className="block">
                <span className="wc-label">Instructions</span>
                <textarea className="wc-input mt-2 min-h-28" value={scenarioForm.instructions} onChange={(event) => patchScenarioForm({ instructions: event.target.value })} />
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                <input type="checkbox" checked={scenarioForm.is_active} onChange={(event) => patchScenarioForm({ is_active: event.target.checked })} />
                <span className="text-sm font-semibold text-on-surface">Mark active for students</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={closeScenarioModal} className="wc-secondary-btn">
                  Cancel
                </button>
                <button disabled={saving} className="wc-primary-btn">
                  <Icon name="send" />
                  {saving ? "Saving..." : "Save scenario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isReviewModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Student review details dialog">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-outline-variant bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-on-surface">Student review details</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Open the full table, update targets, and review student progress in one place.</p>
              </div>
              <button type="button" onClick={closeReviewModal} className="rounded-full bg-surface-container px-3 py-2 text-sm font-bold text-on-surface">
                Close
              </button>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-auto p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                <div>
                  <p className="text-sm font-bold text-on-surface">Daily target for all</p>
                  <p className="text-xs text-on-surface-variant">This updates every student target at once.</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="sr-only">Daily target for all</span>
                    <input
                      className="wc-input w-32"
                      type="number"
                      min="1"
                      value={globalTargetDraft}
                      onChange={(event) => setGlobalTargetDraft(event.target.value)}
                    />
                  </label>
                  <button type="button" onClick={applyGlobalTarget} disabled={saving || !canEdit} className="wc-primary-btn">
                    Apply to all
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-outline-variant">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead className="bg-surface-container-low text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Profile</th>
                      <th className="px-4 py-3">Specialization</th>
                      <th className="px-4 py-3">Today</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-white">
                    {studentRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-sm text-on-surface-variant" colSpan={7}>
                          No approved students found.
                        </td>
                      </tr>
                    ) : (
                      studentRows.map(({ profile, todayApproved, todayLeads, dailyTarget, profileComplete, missingLinks, completionPercent, todayPending, todayRejected }) => (
                        <tr key={profile.id}>
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-on-surface">{profile.full_name ?? profile.email ?? "Student"}</p>
                            <p className="text-xs text-on-surface-variant">{profile.email ?? "No email"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {profileComplete ? "Complete" : `${missingLinks}/${profileLinkFields.length} missing`}
                              </span>
                              <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                                {profile.client_hunting_daily_target ?? 3} daily target
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-on-surface-variant">
                            {profile.client_hunting_specialization ? getClientHuntSpecializationLabel(profile.client_hunting_specialization) : "Unspecified"}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-black text-on-surface">{todayApproved}/{dailyTarget}</p>
                            <p className="text-xs text-on-surface-variant">
                              {todayLeads.length} today · {todayPending} pending · {todayRejected} rejected
                            </p>
                            <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-surface-container">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <label className="block">
                              <span className="sr-only">Student target</span>
                              <input
                                className="wc-input w-20 px-2 py-1 text-right text-sm"
                                type="number"
                                min="1"
                                value={studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3)}
                                onChange={(event) => patchStudentTargetDraft(profile.id, event.target.value)}
                              />
                            </label>
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill value={profileComplete ? "approved" : "pending"} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => prepareNextKeyword(profile)}
                                className="wc-secondary-btn text-xs"
                              >
                                Next keyword
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentFilter(profile.id);
                                  setStatusFilter("all");
                                  setQuery("");
                                  closeReviewModal();
                                }}
                                className="wc-secondary-btn text-xs"
                              >
                                View leads
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveStudentTarget(profile.id, studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3))}
                                disabled={targetSavingId === profile.id || !canEdit}
                                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                              >
                                {targetSavingId === profile.id ? "Saving..." : "Save target"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isScenarioListModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Scenario list dialog">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-outline-variant bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-on-surface">Scenario list</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Open the active and inactive scenarios in popup form for quick handling.</p>
              </div>
              <button type="button" onClick={closeScenarioListModal} className="rounded-full bg-surface-container px-3 py-2 text-sm font-bold text-on-surface">
                Close
              </button>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-auto p-6">
              <div className="space-y-3">
                {scenarios.length === 0 ? (
                  <EmptyState title="No scenarios yet" description="Create the first daily client hunting brief." icon="event_note" />
                ) : (
                  scenarios.map((scenario) => (
                    <div key={scenario.id} className="rounded-2xl border border-outline-variant bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-on-surface">{scenario.title}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {getClientHuntSpecializationLabel(scenario.specialization)} - {scenario.scenario_date}
                          </p>
                          {scenario.description ? <p className="mt-2 text-sm text-on-surface-variant">{scenario.description}</p> : null}
                        </div>
                        <StatusPill value={scenario.is_active ? "active" : "inactive"} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-on-surface-variant">{scenario.target_count} leads target</p>
                        <button
                          type="button"
                          className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface"
                          onClick={() => toggleScenario(scenario)}
                          disabled={busyId === scenario.id || !canEdit}
                        >
                          {scenario.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const achievedPdfStyles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 26,
    paddingHorizontal: 16,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#08265f",
    color: "#ffffff",
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#f5c542",
    marginBottom: 6,
    fontWeight: 700,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 9.5,
    color: "#dbe7ff",
    lineHeight: 1.35,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#103c90",
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d8e0ef",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef4ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d8e0ef",
  },
  th: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontWeight: 700,
    color: "#08265f",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#edf2fb",
    minHeight: 32,
    alignItems: "stretch",
  },
  rowAlt: {
    backgroundColor: "#fafcff",
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
    lineHeight: 1.35,
    color: "#172033",
  },
  status: {
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 8,
    textAlign: "center",
  },
  approved: {
    backgroundColor: "#dcfce7",
    color: "#087f3f",
  },
  pending: {
    backgroundColor: "#ffedd5",
    color: "#b45309",
  },
  empty: {
    padding: 14,
    fontSize: 9,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#d8e0ef",
    fontSize: 8,
    color: "#64748b",
  },
});

function AchievedTodayPdfReport({
  rows,
  generatedAt,
}: {
  rows: Array<{
    profile: Profile;
    todayApproved: number;
    dailyTarget: number;
    todayPending: number;
    todayRejected: number;
    achievementPercent: number;
    completionPercent: number;
  }>;
  generatedAt: string;
}) {
  const totalStudents = rows.length;
  const totalAchieved = rows.reduce((sum, row) => sum + row.todayApproved, 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={achievedPdfStyles.page}>
        <View style={achievedPdfStyles.header}>
          <Text style={achievedPdfStyles.eyebrow}>WeConnect Client Hunting</Text>
          <Text style={achievedPdfStyles.title}>Today Target Achieved Report</Text>
          <Text style={achievedPdfStyles.subtitle}>
            Only students who met or exceeded today&apos;s client hunting target are included.
          </Text>
          <Text style={achievedPdfStyles.subtitle}>Generated at: {new Date(generatedAt).toLocaleString()}</Text>
          <View style={achievedPdfStyles.metaRow}>
            <Text style={achievedPdfStyles.metaChip}>Students: {totalStudents}</Text>
            <Text style={achievedPdfStyles.metaChip}>Leads achieved: {totalAchieved}</Text>
          </View>
        </View>

        <View style={achievedPdfStyles.table}>
          <View style={achievedPdfStyles.tableHeader}>
            <Text style={[achievedPdfStyles.th, { width: "24%" }]}>Student</Text>
            <Text style={[achievedPdfStyles.th, { width: "24%" }]}>Email</Text>
            <Text style={[achievedPdfStyles.th, { width: "16%" }]}>Specialization</Text>
            <Text style={[achievedPdfStyles.th, { width: "14%" }]}>Achieved</Text>
            <Text style={[achievedPdfStyles.th, { width: "10%" }]}>Pending</Text>
            <Text style={[achievedPdfStyles.th, { width: "12%" }]}>Status</Text>
          </View>

          {rows.length === 0 ? (
            <Text style={achievedPdfStyles.empty}>No students achieved today&apos;s target.</Text>
          ) : (
            rows.map((row, index) => (
              <View key={row.profile.id} style={[achievedPdfStyles.row, index % 2 === 1 ? achievedPdfStyles.rowAlt : null]} wrap={false}>
                <Text style={[achievedPdfStyles.td, { width: "24%" }]}>{row.profile.full_name ?? "Unknown student"}</Text>
                <Text style={[achievedPdfStyles.td, { width: "24%" }]}>{row.profile.email ?? "-"}</Text>
                <Text style={[achievedPdfStyles.td, { width: "16%" }]}>
                  {row.profile.client_hunting_specialization ? getClientHuntSpecializationLabel(row.profile.client_hunting_specialization) : "Unspecified"}
                </Text>
                <Text style={[achievedPdfStyles.td, { width: "14%" }]}>{Math.min(row.todayApproved, row.dailyTarget)}/{row.dailyTarget}</Text>
                <Text style={[achievedPdfStyles.td, { width: "10%" }]}>{row.todayPending}</Text>
                <Text style={[achievedPdfStyles.td, { width: "12%" }]}>
                  <Text style={[achievedPdfStyles.status, achievedPdfStyles.approved]}>
                    {row.achievementPercent}%
                  </Text>
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={achievedPdfStyles.footer} fixed>
          <Text>WeConnect Achieved Target Report</Text>
          <Text>Generated on {new Date(generatedAt).toLocaleDateString()}</Text>
        </Text>
      </Page>
    </Document>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: string;
  tone?: "default" | "secondary" | "success" | "error" | "muted";
}) {
  const toneClass = {
    default: "wc-card",
    secondary: "wc-card border-secondary/20 bg-secondary/5",
    success: "wc-card border-emerald-200 bg-emerald-50",
    error: "wc-card border-red-200 bg-red-50",
    muted: "wc-card border-slate-200 bg-slate-50",
  }[tone];

  return (
    <div className={`${toneClass} p-4`}>
      <div className="mb-3 inline-flex rounded-xl bg-surface-container p-2 text-primary">
        <Icon name={icon} className="text-lg" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="text-2xl font-black text-on-surface">{value}</p>
    </div>
  );
}
