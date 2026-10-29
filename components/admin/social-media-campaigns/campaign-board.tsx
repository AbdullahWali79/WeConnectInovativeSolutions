/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import {
  addCampaignMember,
  createCampaignStudent,
  deleteCampaign,
  fetchCampaignDetail,
  findStudentDuplicates,
  publishUpcomingDays,
  removeCampaignMember,
  replaceCampaignDays,
  reviewSubmission,
  searchCampaignStudents,
  setDayApproval,
  setDayPublished,
  setDayVisibility,
  setMemberMenus,
  setMemberRegistration,
  updateCampaign,
  updateCampaignDay,
  updateCampaignMember,
} from "@/app/admin/social-media-campaigns/actions";
import { parseCampaignPlan } from "@/lib/social-campaign-plan";

type Row = any;

const FIELD_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
const LABEL_CLASS = "mb-1 block text-xs font-bold text-on-surface-variant";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Either approver marks the day Done; a published link overrides everything. */
function dayState(day: Row) {
  if (day.published_url) return { key: "published", label: "Published", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (day.teacher_status === "done" || day.admin_status === "done") {
    return { key: "done", label: "Done", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (day.post_date && day.post_date < todayIso()) {
    return { key: "missed", label: "Missed", tone: "bg-red-50 text-red-700 border-red-200" };
  }
  return { key: "pending", label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function CampaignBoard({
  campaignId,
  onBack,
  role,
  teachers = [],
}: {
  campaignId: string;
  onBack: () => void;
  role: string;
  teachers?: Row[];
}) {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Row | null>(null);
  const [days, setDays] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [tab, setTab] = useState<"plan" | "team">("plan");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingDay, setEditingDay] = useState<Row | null>(null);
  const [busyDayId, setBusyDayId] = useState<string | null>(null);
  const [publishCount, setPublishCount] = useState("7");
  const [publishing, setPublishing] = useState(false);
  const [setupMissing, setSetupMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchCampaignDetail(campaignId);
    if (res.success) {
      setCampaign(res.campaign as Row);
      setDays(res.days as Row[]);
      setMembers(res.members as Row[]);
      setSubmissions((res as any).submissions ?? []);
      setSetupMissing(Boolean((res as any).setupMissing));
    } else {
      setToast({ type: "error", message: res.error || "Could not load this campaign." });
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const done = days.filter((day) => ["done", "published"].includes(dayState(day).key)).length;
    const missed = days.filter((day) => dayState(day).key === "missed").length;
    const shared = days.filter((day) => day.visible_to_students).length;
    return { total: days.length, done, missed, shared, percent: days.length ? Math.round((done / days.length) * 100) : 0 };
  }, [days]);

  const submissionsByDay = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const submission of submissions) {
      map[submission.day_id] = map[submission.day_id] ?? [];
      map[submission.day_id].push(submission);
    }
    return map;
  }, [submissions]);

  async function toggleVisibility(day: Row) {
    setBusyDayId(day.id);
    const res = await setDayVisibility(day.id, !day.visible_to_students);
    setBusyDayId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not change visibility." });
      return;
    }
    setDays((current) =>
      current.map((row) => (row.id === day.id ? { ...row, visible_to_students: res.visible_to_students } : row)),
    );
    setToast({
      type: "success",
      message: res.visible_to_students ? "Day shared with students" : "Day hidden from students",
    });
  }

  async function publishDays() {
    setPublishing(true);
    const res = await publishUpcomingDays(campaignId, Number(publishCount));
    setPublishing(false);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not publish days." });
      return;
    }
    if (res.published === 0) {
      setToast({ type: "info", message: res.message || "Nothing left to publish." });
      return;
    }
    const ids = new Set(res.dayIds ?? []);
    setDays((current) => current.map((row) => (ids.has(row.id) ? { ...row, visible_to_students: true } : row)));
    setToast({ type: "success", message: `Shared ${res.published} day${res.published === 1 ? "" : "s"} with students` });
  }

  async function review(day: Row, submission: Row, status: "approved" | "rejected" | "revision" | "selected") {
    const res = await reviewSubmission(submission.id, { status, feedback: submission.feedback ?? "" });
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not review this submission." });
      return;
    }
    setSubmissions((current) =>
      current.map((row) =>
        row.id === submission.id
          ? { ...row, status: res.status, is_selected: res.is_selected }
          : row.day_id === day.id && res.is_selected
            ? { ...row, is_selected: false }
            : row,
      ),
    );
    if (res.is_selected) {
      setDays((current) =>
        current.map((row) =>
          row.id === day.id
            ? { ...row, teacher_status: "done", status: "published", published_url: submission.post_url || submission.video_url || row.published_url }
            : row,
        ),
      );
    }
    setToast({ type: "success", message: res.is_selected ? "Picked as the final post for this day" : `Marked as ${res.status}` });
  }

  async function toggleApproval(day: Row, actor: "teacher" | "admin", done: boolean) {
    setBusyDayId(day.id);
    const res = await setDayApproval(day.id, actor, done);
    setBusyDayId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not update this approval." });
      return;
    }
    setDays((current) =>
      current.map((row) =>
        row.id === day.id
          ? {
              ...row,
              teacher_status: res.day.teacher_status,
              admin_status: res.day.admin_status,
              status: res.day.status,
              teacher_action_at: res.day.teacher_action_at,
              admin_action_at: res.day.admin_action_at,
            }
          : row,
      ),
    );
  }

  async function savePublished(day: Row, url: string) {
    setBusyDayId(day.id);
    const res = await setDayPublished(day.id, url);
    setBusyDayId(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not save the published link." });
      return;
    }
    setDays((current) =>
      current.map((row) =>
        row.id === day.id ? { ...row, published_url: res.published_url, status: res.status } : row,
      ),
    );
    setToast({ type: "success", message: res.published_url ? "Marked as published" : "Published link cleared" });
  }

  async function saveTeacher(teacherId: string) {
    const res = await updateCampaign(campaignId, { teacher_id: teacherId });
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not assign the teacher." });
      return;
    }
    const teacher = teachers.find((row) => row.id === teacherId);
    setCampaign((current) =>
      current
        ? {
            ...current,
            teacher_id: teacherId || null,
            teacher: teacher ? { full_name: teacher.full_name, email: teacher.email } : null,
          }
        : current,
    );
    setToast({ type: "success", message: teacherId ? `${teacher?.full_name || "Teacher"} assigned` : "Teacher removed" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-16 text-on-surface-variant">
        <Icon name="sync" className="animate-spin" /> Loading campaign…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">This campaign could not be loaded.</p>
        <button onClick={onBack} className="mt-4 rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold">
          Back to campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toast toast={toast} onClear={() => setToast(null)} />

      {setupMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-black">Student portal is not set up yet</p>
          <p className="mt-1">
            Run <span className="font-mono font-bold">supabase/migrations/20261028000001_social_campaign_student_portal.sql</span> in
            the Supabase SQL Editor. Until then, day sharing, student registration and submissions stay switched off — the plan and
            approvals keep working.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary">
          <Icon name="arrow_back" className="text-[16px]" /> All campaigns
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight text-on-surface sm:text-2xl">{campaign.client_name}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {campaign.campaign_name || "Social media campaign"} · {formatDate(campaign.period_start)} – {formatDate(campaign.period_end)}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <span>
                Teacher: <span className="font-bold text-on-surface">{campaign.teacher?.full_name || "Not assigned"}</span>
              </span>
              {role === "admin" && (
                <select
                  value={campaign.teacher_id || ""}
                  onChange={(event) => void saveTeacher(event.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-xs font-bold text-on-surface outline-none focus:border-primary"
                >
                  <option value="">— assign teacher —</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </option>
                  ))}
                </select>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-outline-variant px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {campaign.status}
            </span>
            {campaign.drive_folder_url && (
              <a
                href={campaign.drive_folder_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
              >
                <Icon name="folder" className="text-[15px]" /> Campaign Drive
              </a>
            )}
            {role === "admin" && (
              <button
                onClick={async () => {
                  if (!confirm(`Delete the campaign for ${campaign.client_name}? This removes all ${days.length} planned days and cannot be undone.`)) return;
                  const res = await deleteCampaign(campaignId);
                  if (!res.success) {
                    setToast({ type: "error", message: res.error || "Could not delete this campaign." });
                    return;
                  }
                  onBack();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                <Icon name="delete" className="text-[15px]" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="Days planned" value={String(stats.total)} />
          <Metric label="Shared" value={String(stats.shared)} tone="text-primary" />
          <Metric label="Done" value={String(stats.done)} tone="text-emerald-700" />
          <Metric label="Missed" value={String(stats.missed)} tone="text-red-600" />
          <Metric label="Completion" value={`${stats.percent}%`} />
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.percent}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-surface-low p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-on-surface">Share the plan with students</p>
            <p className="text-[11px] text-on-surface-variant">
              Students only see the days you publish. Write and review first, share when ready.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={publishCount}
              onChange={(event) => setPublishCount(event.target.value)}
              className="w-16 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary"
            />
            <button
              onClick={() => void publishDays()}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
            >
              <Icon name={publishing ? "sync" : "visibility"} className={`text-[16px] ${publishing ? "animate-spin" : ""}`} />
              {publishing ? "Sharing…" : "Share next days"}
            </button>
          </div>
        </div>
      </div>

      <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {[
          { id: "plan" as const, label: "Day plan", icon: "calendar_month" },
          { id: "team" as const, label: "Team & Drive links", icon: "group" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === item.id ? "bg-primary text-on-primary" : "border border-outline-variant bg-surface-lowest text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon name={item.icon} className="text-[18px]" /> {item.label}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
          {days.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-on-surface-variant">No day plan has been uploaded for this campaign yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-surface-low text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Day</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Theme</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Students</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Teacher</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Admin</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {days.map((day) => {
                    const state = dayState(day);
                    const isOpen = Boolean(expanded[day.id]);
                    return (
                      <Fragment key={day.id}>
                        <tr className="align-top hover:bg-surface-low/60">
                          <td className="px-4 py-3 font-bold text-on-surface">#{day.day_number}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDate(day.post_date)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpanded((current) => ({ ...current, [day.id]: !current[day.id] }))}
                              className="flex items-start gap-1 text-left font-semibold text-on-surface hover:text-primary"
                            >
                              <Icon name={isOpen ? "expand_less" : "expand_more"} className="mt-0.5 text-[16px] text-on-surface-variant" />
                              <span className="line-clamp-2 max-w-[280px]">{day.theme || "Untitled day"}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${state.tone}`}>{state.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              role="switch"
                              aria-checked={Boolean(day.visible_to_students)}
                              aria-label="Share this day with students"
                              disabled={busyDayId === day.id}
                              onClick={() => void toggleVisibility(day)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-bold transition-colors ${
                                day.visible_to_students
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-outline-variant bg-surface-lowest text-on-surface-variant hover:border-primary/40"
                              } ${busyDayId === day.id ? "opacity-50" : ""}`}
                            >
                              <Icon name={day.visible_to_students ? "visibility" : "visibility_off"} className="text-[14px]" />
                              {day.visible_to_students ? "Shared" : "Hidden"}
                              {(submissionsByDay[day.id]?.length ?? 0) > 0 && (
                                <span className="rounded-full bg-surface-container px-1.5 text-[10px] font-black text-on-surface">
                                  {submissionsByDay[day.id].length}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <ApprovalToggle
                              done={day.teacher_status === "done"}
                              disabled={busyDayId === day.id}
                              onClick={() => void toggleApproval(day, "teacher", day.teacher_status !== "done")}
                              label="Teacher"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ApprovalToggle
                              done={day.admin_status === "done"}
                              disabled={busyDayId === day.id}
                              onClick={() => void toggleApproval(day, "admin", day.admin_status !== "done")}
                              label="Admin"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingDay(day)}
                                title="Edit day content"
                                className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:border-primary hover:text-primary"
                              >
                                <Icon name="edit" className="text-[16px]" />
                              </button>
                              <button
                                onClick={() => {
                                  const url = prompt("Published post URL (leave empty to clear):", day.published_url || "");
                                  if (url !== null) void savePublished(day, url);
                                }}
                                title="Mark published"
                                className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:border-emerald-500 hover:text-emerald-600"
                              >
                                <Icon name="link" className="text-[16px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-surface-low/40">
                            <td colSpan={8} className="px-4 py-4">
                              <DayDetail
                                day={day}
                                submissions={submissionsByDay[day.id] ?? []}
                                onReview={(submission, status) => void review(day, submission, status)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <TeamPanel
          campaign={campaign}
          members={members}
          role={role}
          onReload={load}
          setToast={setToast}
        />
      )}

      {editingDay && (
        <DayEditModal
          day={editingDay}
          onClose={() => setEditingDay(null)}
          onSaved={(patch) => {
            setDays((current) => current.map((row) => (row.id === editingDay.id ? { ...row, ...patch } : row)));
            setEditingDay(null);
            setToast({ type: "success", message: "Day updated" });
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-low p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-xl font-black ${tone ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}

function ApprovalToggle({ done, disabled, onClick, label }: { done: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={done}
      aria-label={`${label} approval`}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-bold transition-colors ${
        done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-outline-variant bg-surface-lowest text-on-surface-variant hover:border-primary/40"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Icon name={done ? "check_circle" : "radio_button_unchecked"} className="text-[14px]" />
      {done ? "Done" : "Pending"}
    </button>
  );
}

function DayDetail({
  day,
  submissions,
  onReview,
}: {
  day: Row;
  submissions: Row[];
  onReview: (submission: Row, status: "approved" | "rejected" | "revision" | "selected") => void;
}) {
  const blocks: { label: string; value?: string | null }[] = [
    { label: "Goal", value: day.goal },
    { label: "Research / verify", value: day.research_note },
    { label: "Platform plan", value: day.platform_plan },
    { label: "Caption / talking points", value: day.caption },
    { label: "Image headline", value: day.image_headline },
    { label: "X post draft", value: day.x_draft },
    { label: "Reel script", value: day.reel_script },
    { label: "Hashtags", value: day.hashtags },
    { label: "Engagement action", value: day.engagement_action },
    { label: "CTA", value: day.cta },
    { label: "Metrics to record", value: day.metrics_to_record },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {blocks
          .filter((block) => block.value)
          .map((block) => (
            <div key={block.label} className="rounded-lg border border-outline-variant bg-surface-lowest p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{block.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">{block.value}</p>
            </div>
          ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {day.source_link && (
          <a href={day.source_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
            <Icon name="open_in_new" className="text-[14px]" /> Source / reference
          </a>
        )}
        {day.published_url && (
          <a href={day.published_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline">
            <Icon name="open_in_new" className="text-[14px]" /> Published post
          </a>
        )}
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-on-surface">
            Student submissions ({submissions.length})
          </p>
          <p className="text-[11px] text-on-surface-variant">
            {day.visible_to_students ? "This day is shared with students." : "Hidden — students cannot submit yet."}
          </p>
        </div>

        {submissions.length === 0 ? (
          <p className="mt-2 text-xs text-on-surface-variant">
            Nothing submitted yet. Students can submit once you share this day.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} onReview={onReview} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SUBMISSION_TONE: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  revision: "bg-orange-50 text-orange-700 border-orange-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  selected: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function SubmissionCard({
  submission,
  onReview,
}: {
  submission: Row;
  onReview: (submission: Row, status: "approved" | "rejected" | "revision" | "selected") => void;
}) {
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const links: { label: string; url?: string | null }[] = [
    { label: "Video", url: submission.video_url },
    { label: "Post", url: submission.post_url },
    { label: "Doc", url: submission.doc_url },
    ...(Array.isArray(submission.image_urls) ? submission.image_urls.map((url: string, index: number) => ({ label: `Image ${index + 1}`, url })) : []),
  ];

  return (
    <div className={`rounded-lg border p-3 ${submission.is_selected ? "border-emerald-300 bg-emerald-50/50" : "border-outline-variant bg-surface-low"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-on-surface">
            {submission.student?.full_name || "Student"}
            {submission.is_selected && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">FINAL</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {links
              .filter((link) => link.url)
              .map((link) => (
                <a
                  key={link.label}
                  href={link.url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  <Icon name="open_in_new" className="text-[12px]" /> {link.label}
                </a>
              ))}
          </div>
          {submission.note && <p className="mt-1 text-[11px] text-on-surface-variant">Note: {submission.note}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SUBMISSION_TONE[submission.status] || SUBMISSION_TONE.submitted}`}>
          {submission.is_selected ? "Winner" : submission.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Feedback for the student…"
          className="min-w-[160px] flex-1 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary"
        />
        <button
          onClick={() => onReview({ ...submission, feedback }, "selected")}
          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
          title="Use this as the final post for the day"
        >
          Pick final
        </button>
        <button
          onClick={() => onReview({ ...submission, feedback }, "revision")}
          className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-[11px] font-bold text-on-surface-variant hover:border-orange-400 hover:text-orange-600"
        >
          Needs changes
        </button>
        <button
          onClick={() => onReview({ ...submission, feedback }, "rejected")}
          className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-[11px] font-bold text-on-surface-variant hover:border-red-400 hover:text-red-600"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function DayEditModal({ day, onClose, onSaved }: { day: Row; onClose: () => void; onSaved: (patch: Row) => void }) {
  const [form, setForm] = useState({
    post_date: day.post_date || "",
    theme: day.theme || "",
    goal: day.goal || "",
    research_note: day.research_note || "",
    platform_plan: day.platform_plan || "",
    caption: day.caption || "",
    image_headline: day.image_headline || "",
    x_draft: day.x_draft || "",
    source_link: day.source_link || "",
    reel_script: day.reel_script || "",
    hashtags: day.hashtags || "",
    engagement_action: day.engagement_action || "",
    cta: day.cta || "",
    metrics_to_record: day.metrics_to_record || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const res = await updateCampaignDay(day.id, form);
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not save this day.");
      return;
    }
    onSaved(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-low p-4">
          <div>
            <h3 className="text-base font-bold text-on-surface">Day #{day.day_number}</h3>
            <p className="text-xs text-on-surface-variant">Edit the plan content for this day.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Post date</label>
              <input type="date" value={form.post_date} onChange={(e) => setForm({ ...form, post_date: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Theme</label>
              <input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Goal</label>
              <input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Research / verify before posting</label>
              <textarea rows={2} value={form.research_note} onChange={(e) => setForm({ ...form, research_note: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Platform plan</label>
              <textarea rows={2} value={form.platform_plan} onChange={(e) => setForm({ ...form, platform_plan: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Caption / talking points</label>
              <textarea rows={3} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Image headline</label>
              <input value={form.image_headline} onChange={(e) => setForm({ ...form, image_headline: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Hashtags</label>
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>X post draft</label>
              <textarea rows={2} value={form.x_draft} onChange={(e) => setForm({ ...form, x_draft: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Reel script / shot guidance</label>
              <textarea rows={4} value={form.reel_script} onChange={(e) => setForm({ ...form, reel_script: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Official source / link</label>
              <input value={form.source_link} onChange={(e) => setForm({ ...form, source_link: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>CTA</label>
              <input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Metrics to record</label>
              <input value={form.metrics_to_record} onChange={(e) => setForm({ ...form, metrics_to_record: e.target.value })} className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Engagement action</label>
              <textarea rows={2} value={form.engagement_action} onChange={(e) => setForm({ ...form, engagement_action: e.target.value })} className={FIELD_CLASS} />
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-outline-variant bg-surface-low p-4">
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name={saving ? "sync" : "save"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving…" : "Save day"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-outline-variant px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamPanel({
  campaign,
  members,
  role,
  onReload,
  setToast,
}: {
  campaign: Row;
  members: Row[];
  role: string;
  onReload: () => Promise<void>;
  setToast: (state: ToastState) => void;
}) {
  const [teacherDrive, setTeacherDrive] = useState(campaign.teacher_drive_url || "");
  const [folderDrive, setFolderDrive] = useState(campaign.drive_folder_url || "");
  const [savingLinks, setSavingLinks] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  const [newDrive, setNewDrive] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [newStudent, setNewStudent] = useState({ full_name: "", email: "", phone: "", password: "", drive_url: "" });
  const [creating, setCreating] = useState(false);
  const [duplicates, setDuplicates] = useState<Row[]>([]);
  const [createError, setCreateError] = useState("");
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchCampaignStudents(query, 15);
      if (cancelled) return;
      if (res.success) setResults(res.students as Row[]);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function saveLinks() {
    setSavingLinks(true);
    const res = await updateCampaign(campaign.id, {
      teacher_drive_url: teacherDrive,
      drive_folder_url: folderDrive,
    });
    setSavingLinks(false);
    setToast({ type: res.success ? "success" : "error", message: res.success ? "Drive links saved" : res.error || "Could not save links." });
  }

  async function assign(student: Row) {
    setAssigning(student.id);
    const res = await addCampaignMember(campaign.id, student.id, newDrive);
    setAssigning(null);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not assign this student." });
      return;
    }
    setQuery("");
    setResults([]);
    setNewDrive("");
    await onReload();
    setToast({ type: "success", message: `${student.full_name || "Student"} assigned` });
  }

  async function saveMemberDrive(member: Row, url: string) {
    const res = await updateCampaignMember(member.id, { drive_url: url });
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not save the drive link." });
      return;
    }
    await onReload();
    setToast({ type: "success", message: "Drive link updated" });
  }

  async function remove(member: Row) {
    if (!confirm(`Remove ${member.student?.full_name || "this student"} from the campaign?`)) return;
    const res = await removeCampaignMember(member.id);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not remove this student." });
      return;
    }
    await onReload();
    setToast({ type: "success", message: "Student removed" });
  }

  async function reimportPlan(file: File) {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCampaignPlan(buffer);
      if (parsed.days.length === 0) {
        setToast({ type: "error", message: parsed.warnings[0] || "No day rows found in this file." });
        return;
      }
      if (!confirm(`Replace the current day plan with ${parsed.days.length} days from "${parsed.sheetName}"? Existing approvals on those days will be lost.`)) {
        return;
      }
      const res = await replaceCampaignDays(campaign.id, parsed.days);
      if (!res.success) {
        setToast({ type: "error", message: res.error || "Import failed." });
        return;
      }
      await onReload();
      setToast({ type: "success", message: `Imported ${res.dayCount} days` });
    } finally {
      setUploading(false);
    }
  }

  async function setRegistration(member: Row, status: "pending" | "registered" | "approved" | "rejected") {
    const res = await setMemberRegistration(member.id, status);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not update the registration." });
      return;
    }
    await onReload();
    setToast({
      type: "success",
      message:
        status === "approved"
          ? `${member.student?.full_name || "Student"} approved — they can now see shared days`
          : `Registration marked ${status}`,
    });
  }

  async function saveMenus(member: Row, menus: Record<string, boolean>) {
    const res = await setMemberMenus(member.id, menus);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Could not update this student's menus." });
      return;
    }
    await onReload();
    setToast({ type: "success", message: "Student menus updated" });
  }

  /** Runs before we ever create an account, so the same person is never duplicated. */
  async function checkDuplicates() {
    if (!newStudent.email && !newStudent.phone) return;
    setCheckingDuplicate(true);
    const res = await findStudentDuplicates({ email: newStudent.email, phone: newStudent.phone });
    setCheckingDuplicate(false);
    if (!res.success) return;
    const matches = (res.matches as Row[]).filter((match) => !assignedIds.has(match.id));
    setDuplicates(matches);
  }

  async function createStudent() {
    setCreating(true);
    setCreateError("");
    const res = await createCampaignStudent({ campaign_id: campaign.id, ...newStudent });
    setCreating(false);
    if (!res.success) {
      if ((res as any).duplicate) setDuplicates(((res as any).matches ?? []) as Row[]);
      setCreateError(res.error || "Could not create this student.");
      return;
    }
    const created = newStudent;
    setNewStudent({ full_name: "", email: "", phone: "", password: "", drive_url: "" });
    setDuplicates([]);
    await onReload();
    setToast({
      type: "success",
      message: `${created.full_name} added — they can log in at /login with ${created.email}`,
    });
  }

  async function attachExisting(student: Row) {
    setCreating(true);
    setCreateError("");
    const res = await createCampaignStudent({
      campaign_id: campaign.id,
      use_existing_id: student.id,
      drive_url: newStudent.drive_url || newDrive,
    });
    setCreating(false);
    if (!res.success) {
      setCreateError(res.error || "Could not assign this student.");
      return;
    }
    setDuplicates([]);
    setNewStudent({ full_name: "", email: "", phone: "", password: "", drive_url: "" });
    await onReload();
    setToast({ type: "success", message: `${student.full_name || "Student"} attached to this campaign` });
  }

  const assignedIds = new Set(members.map((member) => member.student_id));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
        <h3 className="text-sm font-bold text-on-surface">Google Drive links</h3>
        <p className="mt-1 text-xs text-on-surface-variant">
          Admin assigns every link, so all campaign files stay in the admin&apos;s Drive.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Campaign folder (shared with students)</label>
            <input
              value={folderDrive}
              onChange={(e) => setFolderDrive(e.target.value)}
              disabled={role !== "admin"}
              className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant`}
              placeholder="https://drive.google.com/drive/folders/…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Teacher&apos;s upload folder</label>
            <input
              value={teacherDrive}
              onChange={(e) => setTeacherDrive(e.target.value)}
              disabled={role !== "admin"}
              className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant`}
              placeholder="https://drive.google.com/drive/folders/…"
            />
          </div>
        </div>
        {role === "admin" ? (
          <button
            onClick={() => void saveLinks()}
            disabled={savingLinks}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name={savingLinks ? "sync" : "save"} className={`text-[18px] ${savingLinks ? "animate-spin" : ""}`} />
            {savingLinks ? "Saving…" : "Save Drive links"}
          </button>
        ) : (
          <p className="mt-3 text-[11px] font-semibold text-on-surface-variant">
            Read-only — your admin sets the campaign folders.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Assigned students</h3>
            <p className="text-xs text-on-surface-variant">{members.length} student{members.length === 1 ? "" : "s"} · a student can be on several campaigns.</p>
          </div>
          {role === "admin" && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary">
              <Icon name={uploading ? "sync" : "upload_file"} className={`text-[16px] ${uploading ? "animate-spin" : ""}`} />
              {uploading ? "Importing…" : "Re-import plan"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void reimportPlan(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {members.length === 0 && <p className="text-sm text-on-surface-variant">No students assigned yet.</p>}
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={role === "admin"}
              onSaveDrive={saveMemberDrive}
              onRemove={remove}
              onRegistration={setRegistration}
              onSaveMenus={saveMenus}
            />
          ))}
        </div>

        {role === "admin" ? (
        <div className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface-low p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-on-surface">Add a student</p>
            <div className="flex gap-0.5 rounded-lg border border-outline-variant bg-surface-lowest p-0.5">
              {[
                { id: "existing" as const, label: "Existing account" },
                { id: "new" as const, label: "New student" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMode(item.id);
                    setCreateError("");
                    setDuplicates([]);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    mode === item.id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "existing" ? (
            <>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="Search by name, email or phone…"
                />
                <input
                  value={newDrive}
                  onChange={(e) => setNewDrive(e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="Their own Drive folder link"
                />
              </div>
              {searching && <p className="mt-2 text-xs text-on-surface-variant">Searching…</p>}
              {results.length > 0 && (
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-outline-variant bg-surface-lowest custom-scrollbar">
                  {results.map((student) => {
                    const already = assignedIds.has(student.id);
                    return (
                      <button
                        key={student.id}
                        disabled={already || assigning === student.id}
                        onClick={() => void assign(student)}
                        className="flex w-full items-center justify-between gap-2 border-b border-outline-variant p-2.5 text-left last:border-0 hover:bg-surface-low disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-on-surface">{student.full_name || "Unnamed student"}</span>
                          <span className="block truncate text-xs text-on-surface-variant">{student.email || student.phone || "—"}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-primary">
                          {already ? "Assigned" : assigning === student.id ? "Adding…" : "Assign"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Student name</label>
                  <input
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Email (their login)</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    onBlur={() => void checkDuplicates()}
                    className={FIELD_CLASS}
                    placeholder="student@email.com"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Phone</label>
                  <input
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    onBlur={() => void checkDuplicates()}
                    className={FIELD_CLASS}
                    placeholder="03xx-xxxxxxx"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Password</label>
                  <input
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLASS}>Their own Drive folder link</label>
                  <input
                    value={newStudent.drive_url}
                    onChange={(e) => setNewStudent({ ...newStudent, drive_url: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="https://drive.google.com/drive/folders/…"
                  />
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant">
                The student logs in at <span className="font-bold">/login</span> with this email and password — no separate
                application or registration needed. {checkingDuplicate && "Checking for an existing account…"}
              </p>

              {duplicates.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                  <p className="text-[11px] font-bold text-amber-900">
                    This person already has an account. Assign it instead of creating a duplicate:
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {duplicates.map((match) => (
                      <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1.5">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-on-surface">{match.full_name || "Unnamed"}</span>
                          <span className="block truncate text-[11px] text-on-surface-variant">
                            {match.email || match.phone || "—"} · {match.role}
                            {match.status ? ` · ${match.status}` : ""}
                          </span>
                        </span>
                        <button
                          onClick={() => void attachExisting(match)}
                          disabled={creating || assignedIds.has(match.id)}
                          className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-on-primary disabled:opacity-50"
                        >
                          {assignedIds.has(match.id) ? "Already on campaign" : creating ? "Adding…" : "Use this account"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createError && <p className="rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">{createError}</p>}

              <button
                onClick={() => void createStudent()}
                disabled={creating || duplicates.length > 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                <Icon name={creating ? "sync" : "person_add"} className={`text-[16px] ${creating ? "animate-spin" : ""}`} />
                {creating ? "Creating…" : "Create student & add to campaign"}
              </button>
            </div>
          )}
        </div>
        ) : (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-low p-3">
            <Icon name="lock" className="mt-0.5 shrink-0 text-[15px] text-on-surface-variant" />
            <p className="text-[11px] font-semibold text-on-surface-variant">
              Only an admin can add or remove students on a campaign. Ask your admin to assign someone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const REGISTRATION_TONE: Record<string, { label: string; tone: string }> = {
  pending: { label: "Not registered", tone: "bg-surface-container text-on-surface-variant border-outline-variant" },
  registered: { label: "Awaiting approval", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", tone: "bg-red-50 text-red-700 border-red-200" },
};

const MENU_LABELS: { key: "plan" | "submit" | "history"; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "submit", label: "Submit" },
  { key: "history", label: "History" },
];

function MemberRow({
  member,
  canManage,
  onSaveDrive,
  onRemove,
  onRegistration,
  onSaveMenus,
}: {
  member: Row;
  /** Adding/removing students and setting their Drive folder is admin-only. */
  canManage: boolean;
  onSaveDrive: (member: Row, url: string) => Promise<void>;
  onRemove: (member: Row) => Promise<void>;
  onRegistration: (member: Row, status: "pending" | "registered" | "approved" | "rejected") => Promise<void>;
  onSaveMenus: (member: Row, menus: Record<string, boolean>) => Promise<void>;
}) {
  const [drive, setDrive] = useState(member.drive_url || "");
  const [saving, setSaving] = useState(false);
  const dirty = (member.drive_url || "") !== drive;

  const registration = member.registration_status || "pending";
  const tone = REGISTRATION_TONE[registration] ?? REGISTRATION_TONE.pending;
  const menus = (member.menu_permissions && typeof member.menu_permissions === "object" ? member.menu_permissions : {}) as Record<string, boolean>;
  const handleList = Object.keys(member.social_handles ?? {});

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-low p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-on-surface">{member.student?.full_name || "Unnamed student"}</p>
          <p className="truncate text-xs text-on-surface-variant">{member.student?.email || member.student?.phone || "—"}</p>
          {handleList.length > 0 && (
            <p className="mt-1 truncate text-[11px] text-on-surface-variant">
              Registered handles: {handleList.map((key) => `${key}${member.social_handles[key] ? ` (${member.social_handles[key]})` : ""}`).join(", ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.tone}`}>{tone.label}</span>
          {registration !== "approved" && (
            <button
              onClick={() => void onRegistration(member, "approved")}
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
            >
              Approve
            </button>
          )}
          {registration === "approved" && (
            <button
              onClick={() => void onRegistration(member, "rejected")}
              className="rounded-lg border border-outline-variant px-2.5 py-1 text-[11px] font-bold text-on-surface-variant hover:border-red-300 hover:text-red-600"
            >
              Revoke
            </button>
          )}
          {canManage && (
            <button onClick={() => void onRemove(member)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Remove">
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {canManage ? (
          <input
            value={drive}
            onChange={(event) => setDrive(event.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-primary"
            placeholder="This student's own Drive folder link"
          />
        ) : (
          <p className="w-full truncate rounded-lg border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface-variant">
            {member.drive_url || "No Drive folder assigned by the admin yet"}
          </p>
        )}
        {member.drive_url && !dirty && (
          <a href={member.drive_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:border-primary hover:text-primary" title="Open drive">
            <Icon name="open_in_new" className="text-[15px]" />
          </a>
        )}
        {canManage && dirty && (
          <button
            onClick={async () => {
              setSaving(true);
              await onSaveDrive(member, drive);
              setSaving(false);
            }}
            disabled={saving}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
        )}
      </div>
      {!member.drive_url && (
        <p className="mt-1 text-[11px] font-semibold text-amber-700">
          No Drive link yet — the student cannot submit until {canManage ? "you add" : "the admin adds"} one.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-on-surface-variant">Menus:</span>
        {MENU_LABELS.map((item) => {
          const on = menus[item.key] !== false;
          return (
            <button
              key={item.key}
              role="switch"
              aria-checked={on}
              onClick={() => void onSaveMenus(member, { ...menus, [item.key]: !on })}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                on ? "border-primary/30 bg-primary/10 text-primary" : "border-outline-variant bg-surface-lowest text-on-surface-variant line-through"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
