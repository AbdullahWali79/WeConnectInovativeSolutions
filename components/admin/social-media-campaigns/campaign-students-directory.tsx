/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { type ToastState } from "@/components/toast";
import {
  type CampaignStudentRow,
  adminUpdateCampaignStudent,
  adminDeleteCampaignStudent,
  adminAssignStudentToCampaign,
  removeCampaignMember,
} from "@/app/admin/social-media-campaigns/actions";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanPhoneForWhatsapp(phone?: string | null) {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = "92" + digits;
  }
  return digits;
}

export function CampaignStudentsDirectory({
  students,
  campaigns,
  role,
  onReload,
  onOpenCampaign,
  setToast,
}: {
  students: CampaignStudentRow[];
  campaigns: any[];
  role: string;
  onReload: () => Promise<void>;
  onOpenCampaign: (campaignId: string) => void;
  setToast: (toast: ToastState) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [phoneFilter, setPhoneFilter] = useState<"all" | "has_phone" | "no_phone">("all");

  // Modals state
  const [editingStudent, setEditingStudent] = useState<CampaignStudentRow | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<CampaignStudentRow | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<CampaignStudentRow | null>(null);
  const [isWhatsappExportOpen, setIsWhatsappExportOpen] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "approved",
    newPassword: "",
    showPassword: false,
  });

  // Assign form state
  const [targetCampaignId, setTargetCampaignId] = useState("");
  const [targetDriveUrl, setTargetDriveUrl] = useState("");

  // Filtering
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      // 1. Text search (Name, Email, Phone, Campaign names)
      if (q) {
        const matchesName = s.full_name?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.toLowerCase().includes(q);
        const matchesCampaign = s.memberships?.some(
          (m) =>
            m.clientName?.toLowerCase().includes(q) ||
            m.campaignName?.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCampaign) {
          return false;
        }
      }

      // 2. Campaign filter
      if (selectedCampaignId !== "all") {
        const inCampaign = s.memberships?.some((m) => m.campaignId === selectedCampaignId);
        if (!inCampaign) return false;
      }

      // 3. Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "approved" && s.status !== "approved" && s.admin_status !== "approved") {
          return false;
        }
        if (selectedStatus === "inactive" && s.status !== "inactive") {
          return false;
        }
      }

      // 4. Phone filter
      if (phoneFilter === "has_phone" && !s.phone?.trim()) return false;
      if (phoneFilter === "no_phone" && Boolean(s.phone?.trim())) return false;

      return true;
    });
  }, [students, search, selectedCampaignId, selectedStatus, phoneFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = students.length;
    const withPhone = students.filter((s) => cleanPhoneForWhatsapp(s.phone)).length;
    const totalSubmissions = students.reduce((acc, s) => acc + (s.submissionsCount || 0), 0);
    const totalWinners = students.reduce((acc, s) => acc + (s.winningCount || 0), 0);
    return { total, withPhone, totalSubmissions, totalWinners };
  }, [students]);

  // Export to Excel / CSV
  function handleDownloadCsv() {
    if (filteredStudents.length === 0) {
      setToast({ type: "error", message: "No students to export." });
      return;
    }

    const headers = [
      "Student Name",
      "Email (Login)",
      "Phone / WhatsApp",
      "Formatted WhatsApp",
      "Assigned Campaigns",
      "Campaigns Count",
      "Total Submissions",
      "Winning Picks",
      "Status",
      "Date Joined",
    ];

    const rows = filteredStudents.map((s) => {
      const campaignsList = s.memberships.map((m) => m.clientName || m.campaignName).join("; ");
      const waDigits = cleanPhoneForWhatsapp(s.phone);
      const formattedWa = waDigits ? `+${waDigits}` : "";

      return [
        `"${(s.full_name || "").replace(/"/g, '""')}"`,
        `"${(s.email || "").replace(/"/g, '""')}"`,
        `"${(s.phone || "").replace(/"/g, '""')}"`,
        `"${formattedWa}"`,
        `"${campaignsList.replace(/"/g, '""')}"`,
        s.memberships.length,
        s.submissionsCount,
        s.winningCount,
        s.status || "approved",
        s.created_at ? formatDate(s.created_at) : "",
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `campaign_students_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ type: "success", message: `Downloaded ${filteredStudents.length} students to Excel CSV.` });
  }

  // Copy WhatsApp numbers
  function handleCopyAllWhatsapp(format: "comma" | "lines" | "detailed") {
    const list = filteredStudents
      .map((s) => {
        const wa = cleanPhoneForWhatsapp(s.phone);
        if (!wa) return null;
        if (format === "comma") return `+${wa}`;
        if (format === "lines") return `+${wa}`;
        return `${s.full_name}: +${wa}`;
      })
      .filter(Boolean) as string[];

    if (list.length === 0) {
      setToast({ type: "error", message: "No WhatsApp numbers found in current list." });
      return;
    }

    const separator = format === "comma" ? ", " : "\n";
    const textToCopy = list.join(separator);

    navigator.clipboard.writeText(textToCopy);
    setToast({
      type: "success",
      message: `Copied ${list.length} WhatsApp numbers to clipboard!`,
    });
  }

  // Open Edit Modal
  function handleOpenEdit(student: CampaignStudentRow) {
    setEditingStudent(student);
    setEditForm({
      fullName: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      status: student.status || "approved",
      newPassword: "",
      showPassword: false,
    });
  }

  // Save Edit
  async function handleSaveEdit() {
    if (!editingStudent) return;
    if (!editForm.fullName.trim()) {
      setToast({ type: "error", message: "Student name is required." });
      return;
    }
    if (!editForm.email.trim()) {
      setToast({ type: "error", message: "A valid email is required." });
      return;
    }

    setIsActionBusy(true);
    const res = await adminUpdateCampaignStudent(editingStudent.id, {
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      status: editForm.status,
      newPassword: editForm.newPassword.trim() || undefined,
    });
    setIsActionBusy(false);

    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to update student." });
      return;
    }

    setToast({ type: "success", message: "Student account updated successfully!" });
    setEditingStudent(null);
    void onReload();
  }

  // Handle Delete Student
  async function handleConfirmDelete() {
    if (!deletingStudent) return;
    setIsActionBusy(true);
    const res = await adminDeleteCampaignStudent(deletingStudent.id);
    setIsActionBusy(false);

    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to delete student account." });
      return;
    }

    setToast({ type: "success", message: `Deleted ${deletingStudent.full_name}'s account.` });
    setDeletingStudent(null);
    void onReload();
  }

  // Remove from single campaign
  async function handleRemoveFromCampaign(memberId: string, campaignName: string) {
    if (!confirm(`Remove this student from "${campaignName}"?`)) return;
    setIsActionBusy(true);
    const res = await removeCampaignMember(memberId);
    setIsActionBusy(false);

    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to remove from campaign." });
      return;
    }

    setToast({ type: "success", message: `Removed from ${campaignName}.` });
    void onReload();
  }

  // Assign to campaign
  async function handleSaveAssign() {
    if (!assigningStudent || !targetCampaignId) {
      setToast({ type: "error", message: "Please pick a target campaign." });
      return;
    }
    setIsActionBusy(true);
    const res = await adminAssignStudentToCampaign(
      assigningStudent.id,
      targetCampaignId,
      targetDriveUrl.trim(),
    );
    setIsActionBusy(false);

    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to assign student to campaign." });
      return;
    }

    setToast({ type: "success", message: `Student assigned to campaign successfully!` });
    setAssigningStudent(null);
    setTargetCampaignId("");
    setTargetDriveUrl("");
    void onReload();
  }

  return (
    <div className="space-y-3.5">
      {/* 1. TOP METRICS STRIP */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
          <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="groups" className="text-primary text-sm" /> Campaign Students
          </p>
          <p className="text-xl font-black text-on-surface mt-0.5">{metrics.total}</p>
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
          <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="chat" className="text-emerald-600 text-sm" /> With WhatsApp
          </p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{metrics.withPhone}</p>
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
          <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="cloud_upload" className="text-blue-600 text-sm" /> Total Submissions
          </p>
          <p className="text-xl font-black text-blue-600 mt-0.5">{metrics.totalSubmissions}</p>
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-surface-lowest p-3 shadow-2xs">
          <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="emoji_events" className="text-amber-500 text-sm" /> Winning Picks
          </p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{metrics.totalWinners}</p>
        </div>
      </div>

      {/* 2. ACTIONS & FILTERS BAR */}
      <div className="rounded-xl border border-outline-variant/70 bg-surface-lowest p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name, email, WhatsApp, or campaign..."
              className="w-full rounded-lg border border-outline-variant bg-surface-lowest py-2 pl-9 pr-3 text-xs text-on-surface outline-none focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download CSV / Excel */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition shadow-2xs"
              title="Download students directory to Excel CSV file"
            >
              <Icon name="table_view" className="text-sm text-emerald-600" />
              <span>Download Excel (.csv)</span>
            </button>

            {/* Fetch & Copy WhatsApp Numbers */}
            <button
              type="button"
              onClick={() => setIsWhatsappExportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:border-emerald-500 hover:text-emerald-600 transition shadow-2xs"
              title="Fetch, format and copy all WhatsApp numbers"
            >
              <Icon name="chat" className="text-sm text-emerald-600" />
              <span>WhatsApp Numbers ({metrics.withPhone})</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => void onReload()}
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition shadow-2xs"
              title="Refresh students list"
            >
              <Icon name="refresh" className="text-sm" />
            </button>
          </div>
        </div>

        {/* Dropdown Filters Strip */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-outline-variant/40">
          <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="filter_list" className="text-xs" /> Filters:
          </span>

          {/* Filter by Campaign */}
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="all">All Campaigns ({campaigns.length})</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name} {c.campaign_name ? `(${c.campaign_name})` : ""}
              </option>
            ))}
          </select>

          {/* Filter by Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved / Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Filter by Phone */}
          <select
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value as any)}
            className="rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="all">All Phone Statuses</option>
            <option value="has_phone">With WhatsApp ({metrics.withPhone})</option>
            <option value="no_phone">Missing Phone ({metrics.total - metrics.withPhone})</option>
          </select>

          <span className="ml-auto text-[11px] text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface">{filteredStudents.length}</strong> of {students.length} students
          </span>
        </div>
      </div>

      {/* 3. STUDENTS DIRECTORY TABLE */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <Icon name="person_search" className="text-xl" />
          </div>
          <p className="mt-2 text-sm font-bold text-on-surface">No students matched your search</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Try resetting your search query or filters above.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-lowest shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-[#f8f9fa] dark:bg-zinc-900 border-b border-outline-variant/60 text-[11px] font-bold text-on-surface-variant select-none">
                <tr>
                  <th className="px-3.5 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Email (Login ID)</th>
                  <th className="px-3 py-2.5">WhatsApp / Phone</th>
                  <th className="px-3 py-2.5">Assigned Campaigns</th>
                  <th className="px-3 py-2.5 text-center">Work &amp; Wins</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filteredStudents.map((s) => {
                  const waDigits = cleanPhoneForWhatsapp(s.phone);
                  const whatsappChatUrl = waDigits
                    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
                        `Salam ${s.full_name}, this is from WeConnect Innovative Solutions regarding your Social Media Campaigns.`,
                      )}`
                    : null;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-surface-low transition-colors group align-middle"
                    >
                      {/* Column 1: Student info */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                            {s.full_name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface truncate text-xs">
                              {s.full_name}
                            </p>
                            <p className="text-[10px] text-on-surface-variant font-medium">
                              Added {formatDate(s.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Email */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-on-surface truncate max-w-[170px]" title={s.email}>
                            {s.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(s.email);
                              setToast({ type: "success", message: `Copied email: ${s.email}` });
                            }}
                            title="Copy email address"
                            className="text-on-surface-variant hover:text-primary p-0.5 opacity-60 hover:opacity-100 transition"
                          >
                            <Icon name="content_copy" className="text-xs" />
                          </button>
                        </div>
                      </td>

                      {/* Column 3: WhatsApp & Phone */}
                      <td className="px-3 py-3">
                        {s.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-on-surface">
                              {s.phone}
                            </span>
                            {whatsappChatUrl && (
                              <a
                                href={whatsappChatUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 px-1.5 py-0.5 text-[10px] font-bold shadow-2xs transition"
                                title="Open WhatsApp Chat directly"
                              >
                                <Icon name="chat" className="text-xs text-emerald-600" />
                                <span>WhatsApp ↗</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(s.phone);
                                setToast({ type: "success", message: `Copied phone: ${s.phone}` });
                              }}
                              title="Copy phone number"
                              className="text-on-surface-variant hover:text-primary p-0.5 opacity-60 hover:opacity-100 transition"
                            >
                              <Icon name="content_copy" className="text-xs" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant/60 italic">
                            No phone provided
                          </span>
                        )}
                      </td>

                      {/* Column 4: Assigned Campaigns */}
                      <td className="px-3 py-3">
                        {s.memberships.length === 0 ? (
                          <span className="text-[10px] text-amber-600 font-semibold italic">
                            Not in any campaign
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {s.memberships.map((m) => (
                              <button
                                key={m.memberId}
                                type="button"
                                onClick={() => onOpenCampaign(m.campaignId)}
                                className="inline-flex items-center gap-1 rounded-md border border-outline-variant/60 bg-surface-lowest hover:bg-primary/5 hover:border-primary/40 px-1.5 py-0.5 text-[10px] font-bold text-on-surface transition"
                                title={`Open campaign "${m.clientName}"`}
                              >
                                <Icon name="campaign" className="text-[11px] text-primary" />
                                <span className="truncate max-w-[130px]">{m.clientName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Column 5: Submissions & Wins */}
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold text-[11px]">
                          <span className="rounded-full bg-surface-container px-2 py-0.5 text-on-surface" title="Total submissions submitted">
                            {s.submissionsCount} subs
                          </span>
                          {s.winningCount > 0 && (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 text-[10px] font-black" title="Official Benchmark Winners">
                              ⭐ {s.winningCount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Status */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            s.status === "inactive"
                              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${s.status === "inactive" ? "bg-zinc-400" : "bg-emerald-600"}`} />
                          {s.status === "inactive" ? "Inactive" : "Approved"}
                        </span>
                      </td>

                      {/* Column 7: Actions */}
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-[11px] font-bold text-on-surface hover:text-primary hover:border-primary/50 transition shadow-2xs"
                            title="Edit student profile, email, phone, or password"
                          >
                            <Icon name="edit" className="text-xs text-primary" />
                            <span>Edit</span>
                          </button>

                          {/* Assign to another campaign */}
                          {role === "admin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningStudent(s);
                                setTargetCampaignId(campaigns[0]?.id || "");
                                setTargetDriveUrl("");
                              }}
                              className="inline-flex items-center gap-0.5 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-[11px] font-bold text-on-surface-variant hover:text-on-surface transition shadow-2xs"
                              title="Assign student to another campaign"
                            >
                              <Icon name="add" className="text-xs" />
                              <span className="hidden sm:inline">Assign</span>
                            </button>
                          )}

                          {/* Delete Student */}
                          {role === "admin" && (
                            <button
                              type="button"
                              onClick={() => setDeletingStudent(s)}
                              className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-lowest p-1 text-xs text-on-surface-variant hover:text-red-600 hover:border-red-300 transition shadow-2xs"
                              title="Delete or remove student"
                            >
                              <Icon name="delete" className="text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 1: EDIT STUDENT ACCOUNT & CREDENTIALS               */}
      {/* --------------------------------------------------------- */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-lowest p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name="manage_accounts" className="text-lg" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-on-surface">Edit Student Account</h3>
                  <p className="text-[11px] text-on-surface-variant">Update profile, login email, WhatsApp or password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="e.g. Noor Fatima"
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              {/* Email (Login ID) */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Email Address (Login ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  WhatsApp / Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="0300-1234567 or +923001234567"
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="approved">Approved &amp; Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              {/* Reset Password */}
              <div className="rounded-xl border border-outline-variant/60 bg-surface-low p-3 space-y-1.5">
                <label className="block text-[11px] font-bold text-on-surface">
                  Set New Password <span className="text-[10px] font-normal text-on-surface-variant">(Leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <input
                    type={editForm.showPassword ? "text" : "password"}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-outline-variant bg-surface p-2 pr-9 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setEditForm({ ...editForm, showPassword: !editForm.showPassword })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name={editForm.showPassword ? "visibility_off" : "visibility"} className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Assigned Campaigns list with Remove button */}
              {editingStudent.memberships.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface mb-1">
                    Campaign Memberships
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {editingStudent.memberships.map((m) => (
                      <div
                        key={m.memberId}
                        className="flex items-center justify-between rounded-lg border border-outline-variant/50 bg-surface p-2 text-xs"
                      >
                        <span className="font-semibold text-on-surface truncate">
                          {m.clientName} {m.campaignName ? `(${m.campaignName})` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCampaign(m.memberId, m.clientName)}
                          className="text-red-600 hover:underline text-[11px] font-bold ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionBusy}
                onClick={handleSaveEdit}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {isActionBusy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 2: ASSIGN STUDENT TO ANOTHER CAMPAIGN               */}
      {/* --------------------------------------------------------- */}
      {assigningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-lowest p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-on-surface">Assign Student to Campaign</h3>
                <p className="text-[11px] text-on-surface-variant">
                  Adding <strong>{assigningStudent.full_name}</strong> to a new campaign
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningStudent(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Select Campaign <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetCampaignId}
                  onChange={(e) => setTargetCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="">-- Choose Campaign --</option>
                  {campaigns.map((c) => {
                    const alreadyIn = assigningStudent.memberships.some((m) => m.campaignId === c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={alreadyIn}>
                        {c.client_name} {alreadyIn ? "(Already enrolled)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface mb-1">
                  Drive Folder Link <span className="text-[10px] font-normal text-on-surface-variant">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={targetDriveUrl}
                  onChange={(e) => setTargetDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setAssigningStudent(null)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionBusy || !targetCampaignId}
                onClick={handleSaveAssign}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {isActionBusy ? "Assigning…" : "Assign to Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 3: DELETE STUDENT CONFIRMATION                       */}
      {/* --------------------------------------------------------- */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900 bg-surface-lowest p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950 text-red-600">
                <Icon name="warning" className="text-xl" />
              </div>
              <div>
                <h3 className="text-sm font-black text-on-surface">Delete Student Account?</h3>
                <p className="text-xs text-red-600 font-semibold">
                  {deletingStudent.full_name} ({deletingStudent.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              This will completely delete this student&apos;s account, their campaign assignments, work submissions, and login credentials. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionBusy}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isActionBusy ? "Deleting…" : "Yes, Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 4: WHATSAPP NUMBERS FETCH & BULK EXPORT DRAWER       */}
      {/* --------------------------------------------------------- */}
      {isWhatsappExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-lowest p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <Icon name="chat" className="text-lg" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-on-surface">WhatsApp Numbers Directory</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    {metrics.withPhone} valid WhatsApp numbers found in current list
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsappExportOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Copy format buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopyAllWhatsapp("comma")}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs"
                >
                  📋 Copy Comma-Separated (+923..., +923...)
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAllWhatsapp("lines")}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:border-primary shadow-2xs"
                >
                  📄 Copy Line-by-Line
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAllWhatsapp("detailed")}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-xs font-bold text-on-surface hover:border-primary shadow-2xs"
                >
                  👤 Copy with Student Names
                </button>
              </div>

              {/* Textarea preview */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-on-surface">
                  Numbers List Preview:
                </label>
                <textarea
                  readOnly
                  rows={8}
                  value={filteredStudents
                    .map((s) => {
                      const wa = cleanPhoneForWhatsapp(s.phone);
                      if (!wa) return null;
                      return `${s.full_name}: +${wa}`;
                    })
                    .filter(Boolean)
                    .join("\n")}
                  className="w-full rounded-xl border border-outline-variant bg-surface font-mono p-3 text-xs text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60">
              <span className="text-xs text-on-surface-variant">
                Total: <strong>{metrics.withPhone}</strong> numbers
              </span>
              <button
                type="button"
                onClick={() => setIsWhatsappExportOpen(false)}
                className="rounded-lg bg-surface-container px-4 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
