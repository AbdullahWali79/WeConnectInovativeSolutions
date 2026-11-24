/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { createTeacherAccount } from "@/app/admin/actions";
import type { TeacherSelectablePermissionKey } from "@/lib/admin-permissions";
import {
  createCampaign,
  fetchCampaignWorkspace,
  fetchAllCampaignStudents,
  fetchDailySubmissionsOverview,
  type DailySubmissionsData,
  type CampaignStudentRow,
} from "@/app/admin/social-media-campaigns/actions";
import { parseCampaignPlan, downloadCampaignTemplate, type ParsedPlan } from "@/lib/social-campaign-plan";
import { CampaignBoard } from "./campaign-board";
import { EditCampaignModal } from "./edit-campaign-modal";
import { CampaignStudentsDirectory } from "./campaign-students-directory";
import { DailySubmissionsReport } from "./daily-submissions-report";

const FIELD_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
const LABEL_CLASS = "mb-1 block text-xs font-bold text-on-surface-variant";

const CAMPAIGN_TEACHER_PERMISSIONS: TeacherSelectablePermissionKey[] = [
  "dashboard.view",
  "social_campaigns.view",
  "social_campaigns.edit",
  "social_campaigns.approve",
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function CampaignsManager({
  role,
  initialCampaigns = [],
  initialTeachers = [],
  initialError = "",
}: {
  role: string;
  initialCampaigns?: any[];
  initialTeachers?: any[];
  initialError?: string;
}) {
  const [toast, setToast] = useState<ToastState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  // The server already handed us the rows, so there is nothing to wait for.
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"campaigns" | "students" | "submissions">("campaigns");
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [teachers, setTeachers] = useState<any[]>(initialTeachers);
  const [students, setStudents] = useState<CampaignStudentRow[]>([]);
  const [dailySubmissionsData, setDailySubmissionsData] = useState<DailySubmissionsData | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [setupIssue, setSetupIssue] = useState("");

  const loadStudents = useCallback(async () => {
    const res = await fetchAllCampaignStudents();
    if (res.success) {
      setStudents(res.students);
    }
  }, []);

  const loadDailySubmissions = useCallback(async () => {
    const res = await fetchDailySubmissionsOverview();
    if (res.success && res.data) {
      setDailySubmissionsData(res.data);
    }
  }, []);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [result] = await Promise.all([
      fetchCampaignWorkspace(),
      loadStudents(),
      loadDailySubmissions(),
    ]);

    if (result.success) {
      setCampaigns(result.campaigns);
      setTeachers(result.teachers);
      setSetupIssue("");
    } else {
      const message = result.error || "Could not load campaigns.";
      // Surface a clear hint when the migration has not been applied yet.
      if (/does not exist|schema cache|could not find the table|relation .*sm_/i.test(message)) {
        setSetupIssue("The campaigns tables are not in the database yet. Run supabase/migrations/20261028000000_social_media_campaigns.sql in the Supabase SQL Editor, then refresh.");
      }
      setToast({ type: "error", message });
    }

    setLoading(false);
    setRefreshing(false);
  }, [loadStudents, loadDailySubmissions]);

  useEffect(() => {
    if (initialError) return;
    // Data arrived with the HTML, so only correct it if the page was rendered
    // before a change landed elsewhere. Silent = no spinner, no flicker.
    void load({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return campaigns;
    return campaigns.filter((campaign) => {
      const haystack = `${campaign.client_name} ${campaign.campaign_name ?? ""} ${campaign.teacher?.full_name ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [campaigns, query]);

  const totals = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === "active").length;
    const done = campaigns.reduce((sum, campaign) => sum + (campaign.done_count ?? 0), 0);
    const planned = campaigns.reduce((sum, campaign) => sum + (campaign.day_count ?? 0), 0);
    return { active, done, planned, percent: planned ? Math.round((done / planned) * 100) : 0 };
  }, [campaigns]);

  const todaySubmissionsCount = useMemo(() => {
    if (!dailySubmissionsData?.submissions) return 0;
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayUtc = now.toISOString().slice(0, 10);
    return dailySubmissionsData.submissions.filter((s) => {
      const created = s.created_at ? s.created_at.slice(0, 10) : "";
      const updated = s.updated_at ? s.updated_at.slice(0, 10) : "";
      return created === todayLocal || created === todayUtc || updated === todayLocal || updated === todayUtc;
    }).length;
  }, [dailySubmissionsData]);

  if (openId) {
    return (
      <>
        <Toast toast={toast} onClear={() => setToast(null)} />
        <CampaignBoard
          campaignId={openId}
          initialCampaign={campaigns.find((c) => c.id === openId) ?? null}
          role={role}
          teachers={teachers}
          onBack={() => {
            setOpenId(null);
            // Silent: the rows are already on screen, so re-syncing in the
            // background must not blank the list.
            void load({ silent: true });
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <Toast toast={toast} onClear={() => setToast(null)} />

      {/* Compact Top Header & Stats Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black leading-tight text-on-surface">Social Media Campaigns</h1>
            <p className="text-xs text-on-surface-variant">
              Manage client campaigns, assign teachers &amp; students, and track daily deliverables.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTeacherOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary transition shadow-2xs"
            >
              <Icon name="person_add" className="text-[15px]" /> New teacher
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container transition shadow-2xs"
            >
              <Icon name="add" className="text-[15px]" /> New campaign
            </button>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Campaigns" value={String(campaigns.length)} />
          <Stat label="Active" value={String(totals.active)} />
          <button
            type="button"
            onClick={() => {
              setActiveTab("submissions");
              void loadDailySubmissions();
            }}
            className="text-left rounded-xl border border-outline-variant/60 bg-surface-lowest p-2.5 hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer group"
            title="Click to view Today's Submissions & Deliverables"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant">Posts done</span>
              <span className="text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Today →
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              {totals.done} <span className="text-xs font-normal text-on-surface-variant">/ {totals.planned}</span>
            </p>
          </button>
          <Stat label="Completion" value={`${totals.percent}%`} />
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            activeTab === "campaigns"
              ? "bg-primary text-on-primary shadow-xs"
              : "border border-outline-variant/70 bg-surface-lowest text-on-surface hover:bg-surface-low"
          }`}
        >
          <Icon name="campaign" className="text-base" />
          <span>Campaigns Overview</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              activeTab === "campaigns"
                ? "bg-white/20 text-white"
                : "bg-surface-container text-on-surface"
            }`}
          >
            {campaigns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("students");
            void loadStudents();
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            activeTab === "students"
              ? "bg-primary text-on-primary shadow-xs"
              : "border border-outline-variant/70 bg-surface-lowest text-on-surface hover:bg-surface-low"
          }`}
        >
          <Icon name="groups" className="text-base" />
          <span>Campaign Students Management</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              activeTab === "students"
                ? "bg-white/20 text-white"
                : "bg-surface-container text-on-surface"
            }`}
          >
            {students.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("submissions");
            void loadDailySubmissions();
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            activeTab === "submissions"
              ? "bg-primary text-on-primary shadow-xs"
              : "border border-outline-variant/70 bg-surface-lowest text-on-surface hover:bg-surface-low"
          }`}
        >
          <Icon name="task_alt" className="text-base text-emerald-500" />
          <span>Today&apos;s Submissions &amp; WhatsApp Report</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              activeTab === "submissions"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            }`}
          >
            {todaySubmissionsCount > 0
              ? `${todaySubmissionsCount} Today`
              : (dailySubmissionsData?.submissions?.length ? `${dailySubmissionsData.submissions.length} Total` : "Report")}
          </span>
        </button>
      </div>

      {setupIssue && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-900">
            <Icon name="warning" className="mt-0.5 shrink-0 text-[15px]" />
            {setupIssue}
          </p>
        </div>
      )}

      {/* TAB 1: CAMPAIGNS OVERVIEW */}
      {activeTab === "campaigns" && (
        <>

      {/* Search and Refresh bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, campaign or teacher…"
            className="w-full rounded-lg border border-outline-variant bg-surface-lowest py-2 pl-8 pr-3 text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => void load({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-60 transition"
        >
          <Icon name="refresh" className={`text-[15px] ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Updating…" : "Refresh"}
        </button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-12 text-on-surface-variant">
          <Icon name="sync" className="animate-spin" /> Loading campaigns…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-primary">
            <Icon name="campaign" className="text-[22px]" />
          </div>
          <p className="mt-2 text-sm font-bold text-on-surface">No campaigns found</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Create one and upload the client&apos;s 30-day plan to get the daily board running.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary"
          >
            <Icon name="add" className="text-[15px]" /> New campaign
          </button>
        </div>
      ) : (
        /* High-density 3-per-row grid */
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign) => {
            const percent = campaign.day_count ? Math.round((campaign.done_count / campaign.day_count) * 100) : 0;
            return (
              <div
                key={campaign.id}
                onClick={() => setOpenId(campaign.id)}
                className="group rounded-xl border border-outline-variant bg-surface-lowest p-3 text-left transition-all hover:border-primary/50 hover:bg-surface-low hover:shadow-md cursor-pointer relative flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-on-surface group-hover:text-primary transition-colors">
                        {campaign.client_name}
                      </p>
                      <p className="truncate text-[11px] text-on-surface-variant font-medium">
                        {campaign.campaign_name || "Social media campaign"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase tracking-wide ${
                          campaign.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : campaign.status === "completed"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-outline-variant text-on-surface-variant"
                        }`}
                      >
                        {campaign.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(campaign);
                        }}
                        className="inline-flex items-center gap-0.5 rounded-md border border-outline-variant/70 bg-surface-lowest px-1.5 py-0.5 text-[11px] font-bold text-on-surface-variant hover:text-primary hover:border-primary hover:bg-primary/5 transition shadow-2xs"
                        title="Edit campaign name & settings"
                      >
                        <Icon name="edit" className="text-[12px]" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-on-surface-variant">
                    <p className="flex items-center gap-1 truncate">
                      <Icon name="calendar_today" className="text-[12px] text-primary shrink-0" />
                      <span>{formatDate(campaign.period_start)} –</span>
                      {campaign.period_end ? (
                        <span>{formatDate(campaign.period_end)}</span>
                      ) : (
                        <span className="font-bold text-emerald-600">Ongoing</span>
                      )}
                    </p>
                    <p className="flex items-center gap-1 truncate">
                      <Icon name="person" className="text-[12px] text-on-surface-variant shrink-0" />
                      <span className="truncate">Teacher: <strong className="text-on-surface font-semibold">{campaign.teacher?.full_name?.split(" ")[0] || "Not assigned"}</strong></span>
                      <span>·</span>
                      <span>{campaign.member_count} student{campaign.member_count === 1 ? "" : "s"}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-outline-variant/40 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant shrink-0">
                    {campaign.done_count}/{campaign.day_count} days ({percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* TAB 2: CAMPAIGN STUDENTS DIRECTORY & MANAGEMENT */}
      {activeTab === "students" && (
        <CampaignStudentsDirectory
          students={students}
          campaigns={campaigns}
          role={role}
          onReload={async () => {
            await load({ silent: true });
          }}
          onOpenCampaign={(campaignId) => setOpenId(campaignId)}
          setToast={setToast}
          onViewSubmissions={() => {
            setActiveTab("submissions");
            void loadDailySubmissions();
          }}
        />
      )}

      {/* TAB 3: DAILY SUBMISSIONS & LEADERBOARD */}
      {activeTab === "submissions" && (
        <DailySubmissionsReport
          data={
            dailySubmissionsData || {
              campaigns,
              days: [],
              members: [],
              submissions: [],
            }
          }
          role={role}
          onReload={async () => {
            await loadDailySubmissions();
          }}
          onOpenCampaign={(campaignId) => setOpenId(campaignId)}
          setToast={setToast}
        />
      )}

      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          teachers={teachers}
          onClose={() => setEditingCampaign(null)}
          onSaved={async (updated) => {
            setEditingCampaign(null);
            setCampaigns((current) =>
              current.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
            );
            setToast({ type: "success", message: `Campaign "${updated.client_name}" updated successfully` });
            await load({ silent: true });
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      )}

      {isCreateOpen && (
        <CampaignFormModal
          teachers={teachers}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async (campaignId, dayCount) => {
            setIsCreateOpen(false);
            await load({ silent: true });
            setToast({ type: "success", message: `Campaign created with ${dayCount} planned days` });
            setOpenId(campaignId);
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      )}

      {isTeacherOpen && (
        <TeacherModal
          onClose={() => setIsTeacherOpen(false)}
          onCreated={async (name) => {
            setIsTeacherOpen(false);
            await load({ silent: true });
            setToast({ type: "success", message: `Teacher ${name} created` });
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-low p-2 sm:p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={`mt-0.5 text-base sm:text-lg font-black ${tone ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}

function CampaignFormModal({
  teachers,
  onClose,
  onCreated,
  onError,
}: {
  teachers: any[];
  onClose: () => void;
  onCreated: (campaignId: string, dayCount: number) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [plan, setPlan] = useState<ParsedPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    campaign_name: "",
    period_start: "",
    period_end: "",
    goal: "",
    teacher_id: "",
    drive_folder_url: "",
    teacher_drive_url: "",
    status: "active" as "active" | "draft",
  });

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseCampaignPlan(buffer);
      setPlan(parsed);
      setForm((current) => ({
        ...current,
        client_name: current.client_name || parsed.clientName || "",
        period_start: current.period_start || parsed.periodStart || "",
        period_end: current.period_end || parsed.periodEnd || "",
        goal: current.goal || parsed.goal || "",
      }));
      if (parsed.days.length === 0) onError(parsed.warnings[0] || "No day rows found in this file.");
    } catch {
      onError("That file could not be read. Upload an .xlsx, .xls or .csv plan.");
      setPlan(null);
    } finally {
      setParsing(false);
    }
  }

  async function submit() {
    if (!form.client_name.trim()) {
      onError("Client name is required.");
      return;
    }
    setSaving(true);
    const res = await createCampaign({ ...form, days: plan?.days ?? [] });
    setSaving(false);
    if (!res.success) {
      onError(res.error || "Could not create the campaign.");
      return;
    }
    await onCreated(res.campaignId, res.dayCount);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-low p-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">New client campaign</h2>
            <p className="text-xs text-on-surface-variant">Upload the day-wise plan, then assign the teacher.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Day-wise Plan (.xlsx, .csv)</span>
            <button
              type="button"
              onClick={downloadCampaignTemplate}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
              title="Download pre-formatted Excel plan template with sample rows"
            >
              <Icon name="download" className="text-[14px]" /> Download plan template (.xlsx)
            </button>
          </div>

          <label className="block cursor-pointer rounded-xl border border-dashed border-outline-variant bg-surface-low p-5 text-center hover:border-primary/50">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Icon name={parsing ? "sync" : "upload_file"} className={`text-[26px] text-primary ${parsing ? "animate-spin" : ""}`} />
            <p className="mt-2 text-sm font-bold text-on-surface">
              {parsing ? "Reading plan…" : plan ? fileName : "Upload the day-wise plan"}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {plan
                ? `${plan.days.length} days detected in "${plan.sheetName}"`
                : ".xlsx / .xls / .csv — the sheet with a Day column (e.g. 30-Day Calendar)"}
            </p>
          </label>

          {plan && plan.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              {plan.warnings.map((warning) => (
                <p key={warning} className="text-xs font-semibold text-amber-800">
                  {warning}
                </p>
              ))}
            </div>
          )}

          {plan && plan.days.length > 0 && (
            <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-outline-variant custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-low text-on-surface-variant">
                  <tr>
                    <th className="px-2 py-1.5 font-bold">Day</th>
                    <th className="px-2 py-1.5 font-bold">Date</th>
                    <th className="px-2 py-1.5 font-bold">Theme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {plan.days.slice(0, 40).map((day) => (
                    <tr key={day.day_number}>
                      <td className="px-2 py-1.5 font-bold text-on-surface">{day.day_number}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-on-surface-variant">{day.post_date ?? "—"}</td>
                      <td className="max-w-[320px] truncate px-2 py-1.5 text-on-surface">{day.theme ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Client name *</label>
              <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={FIELD_CLASS} placeholder="Adam Azam" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Campaign name</label>
              <input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} className={FIELD_CLASS} placeholder="30-day organic growth" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Start date</label>
              <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL_CLASS}>End date</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, period_end: "" })}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Clear (Ongoing)
                </button>
              </div>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className={FIELD_CLASS} />
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Optional: Khali chorr dein agar project ongoing hai (jab tak client karwaye).
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Goal</label>
              <textarea rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className={FIELD_CLASS} placeholder="Work toward 1,000 genuine net new followers in 30 days." />
            </div>
            <div>
              <label className={LABEL_CLASS}>Assigned teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={FIELD_CLASS}>
                <option value="">Not assigned yet</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.email}
                  </option>
                ))}
              </select>
              <Link href="/admin/subadmins" className="mt-1 inline-block text-[11px] font-bold text-primary hover:underline">
                Manage teachers &amp; permissions
              </Link>
            </div>
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "draft" })} className={FIELD_CLASS}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Icon name="cloud_done" className="text-base text-emerald-600" />
                <span>Zero-Friction Google Drive Upload Active</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Students and teachers submit campaign videos directly from the browser into your central Google Drive folder. Manual Drive links are no longer required to create a campaign.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-outline-variant bg-surface-low p-4">
          <button
            onClick={() => void submit()}
            disabled={saving || !form.client_name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name={saving ? "sync" : "save"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
            {saving ? "Creating…" : "Create campaign"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-outline-variant px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (name: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.fullName.trim() || !form.email.trim()) {
      onError("Teacher name and email are required.");
      return;
    }
    if (form.password.length < 8) {
      onError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    const result = await createTeacherAccount({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      permissions: CAMPAIGN_TEACHER_PERMISSIONS,
    });
    setSaving(false);
    if (!result.success) {
      onError(result.error || "Could not create the teacher account.");
      return;
    }
    await onCreated(form.fullName.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-low p-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">New teacher</h2>
            <p className="text-xs text-on-surface-variant">Gets campaign view + approval access automatically.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={LABEL_CLASS}>Full name *</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={FIELD_CLASS} placeholder="03001234567" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Temporary password *</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={FIELD_CLASS} placeholder="At least 8 characters" />
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-outline-variant bg-surface-low p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Permissions granted</p>
            <p className="mt-1 text-xs text-on-surface">
              Dashboard, View Campaigns, Edit Campaigns, Approve Daily Posts
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-outline-variant bg-surface-low p-4">
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name={saving ? "sync" : "person_add"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
            {saving ? "Creating…" : "Create teacher"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-outline-variant px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
