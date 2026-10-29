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
} from "@/app/admin/social-media-campaigns/actions";
import { parseCampaignPlan, type ParsedPlan } from "@/lib/social-campaign-plan";
import { CampaignBoard } from "./campaign-board";

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
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [teachers, setTeachers] = useState<any[]>(initialTeachers);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [setupIssue, setSetupIssue] = useState("");

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (silent) setRefreshing(true);
    else setLoading(true);

    const result = await fetchCampaignWorkspace();

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
  }, []);

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

  if (openId) {
    return (
      <>
        <Toast toast={toast} onClear={() => setToast(null)} />
        <CampaignBoard
          campaignId={openId}
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
    <div className="space-y-4">
      <Toast toast={toast} onClear={() => setToast(null)} />

      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black leading-tight text-on-surface sm:text-2xl">Social Media Campaigns</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Upload a client&apos;s day-wise plan, assign a teacher and students, and track every day&apos;s post.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              onClick={() => setIsTeacherOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary"
            >
              <Icon name="person_add" className="text-[16px]" /> New teacher
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary hover:bg-primary-container"
            >
              <Icon name="add" className="text-[16px]" /> New campaign
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Campaigns" value={String(campaigns.length)} />
          <Stat label="Active" value={String(totals.active)} />
          <Stat label="Posts done" value={String(totals.done)} tone="text-emerald-700" />
          <Stat label="Completion" value={`${totals.percent}%`} />
        </div>
      </div>

      {setupIssue && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-900">
            <Icon name="warning" className="mt-0.5 shrink-0 text-[16px]" />
            {setupIssue}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, campaign or teacher…"
            className={`${FIELD_CLASS} pl-9`}
          />
        </div>
        <button
          onClick={() => void load({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2.5 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <Icon name="refresh" className={`text-[16px] ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Updating…" : "Refresh"}
        </button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-16 text-on-surface-variant">
          <Icon name="sync" className="animate-spin" /> Loading campaigns…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-primary">
            <Icon name="campaign" className="text-[24px]" />
          </div>
          <p className="mt-3 text-sm font-bold text-on-surface">No campaigns yet</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Create one and upload the client&apos;s 30-day plan to get the daily board running.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary"
          >
            <Icon name="add" className="text-[16px]" /> New campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((campaign) => {
            const percent = campaign.day_count ? Math.round((campaign.done_count / campaign.day_count) * 100) : 0;
            return (
              <button
                key={campaign.id}
                onClick={() => setOpenId(campaign.id)}
                className="group rounded-2xl border border-outline-variant bg-surface-lowest p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface-low"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-on-surface">{campaign.client_name}</p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {campaign.campaign_name || "Social media campaign"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      campaign.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : campaign.status === "completed"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-on-surface-variant">
                  {formatDate(campaign.period_start)} – {formatDate(campaign.period_end)}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Teacher: <span className="font-bold text-on-surface">{campaign.teacher?.full_name || "Not assigned"}</span>
                  {" · "}
                  {campaign.member_count} student{campaign.member_count === 1 ? "" : "s"}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {campaign.done_count}/{campaign.day_count} days
                  </span>
                </div>
              </button>
            );
          })}
        </div>
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
    <div className="rounded-xl border border-outline-variant bg-surface-low p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-xl font-black ${tone ?? "text-on-surface"}`}>{value}</p>
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
      const parsed = parseCampaignPlan(buffer);
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
              <label className={LABEL_CLASS}>End date</label>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className={FIELD_CLASS} />
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
            <div>
              <label className={LABEL_CLASS}>Campaign Drive folder (for students)</label>
              <input value={form.drive_folder_url} onChange={(e) => setForm({ ...form, drive_folder_url: e.target.value })} className={FIELD_CLASS} placeholder="https://drive.google.com/drive/folders/…" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Teacher Drive folder</label>
              <input value={form.teacher_drive_url} onChange={(e) => setForm({ ...form, teacher_drive_url: e.target.value })} className={FIELD_CLASS} placeholder="https://drive.google.com/drive/folders/…" />
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
