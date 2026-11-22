/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import {
  completeCampaignRegistration,
  fetchMyCampaign,
  fetchMyCampaigns,
  submitDayWork,
} from "@/app/student/campaigns/actions";
import { StudentSheetView } from "./student-sheet-view";

type Row = any;

const FIELD_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
const LABEL_CLASS = "mb-1 block text-xs font-bold text-on-surface-variant";

const DEFAULT_CAMPAIGN_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1uufJf0w7v5_4JGfqmMKuCZmyuqckC-tP";

const STATUS_TONE: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  revision: "bg-orange-50 text-orange-700 border-orange-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  selected: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShort(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

export function CampaignPortal() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchMyCampaigns();
    if (res.success) setCampaigns(res.campaigns as Row[]);
    else setToast({ type: "error", message: res.error || "Could not load your campaigns." });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (selectedId) {
    return (
      <>
        <Toast toast={toast} onClear={() => setToast(null)} />
        <CampaignDetail
          campaignId={selectedId}
          onBack={() => {
            setSelectedId(null);
            void load();
          }}
          setToast={setToast}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-16 text-on-surface-variant">
        <Icon name="sync" className="animate-spin" /> Loading your campaigns…
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-3xl border border-outline-variant/60 bg-surface-lowest p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Icon name="table_chart" className="text-3xl" />
        </div>
        <h3 className="text-lg font-black text-on-surface">No campaigns assigned yet</h3>
        <p className="mt-2 text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
          Your teacher or admin will assign you to a client campaign. As soon as you are enrolled, your daily Google Sheet content calendar will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-surface-lowest to-primary/5 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 border border-emerald-600/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Icon name="table_chart" className="text-xs" /> Client Content Workspaces
              </span>
              <span className="text-xs text-on-surface-variant hidden sm:inline">• Google Sheets Style</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Social Media Client Campaigns
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              Open your assigned client spreadsheet, follow daily content guidelines, submit your video &amp; post links, and see who won the official benchmark pick!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("open-account-settings"));
                }
              }}
              title="Edit your name, email, phone number, or change password"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-outline-variant/60 bg-surface-lowest/90 backdrop-blur-sm px-3.5 py-3 text-xs font-bold text-on-surface shadow-sm transition hover:bg-surface hover:border-primary/40 hover:text-primary"
            >
              <Icon name="manage_accounts" className="text-base text-primary" />
              <span>Edit Profile &amp; Password</span>
            </button>
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest/80 backdrop-blur-sm p-3 text-center min-w-[90px] shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Active</p>
              <p className="text-lg font-black text-emerald-600">{campaigns.length}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-lowest/80 backdrop-blur-sm p-3 text-center min-w-[100px] shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Sheet View</p>
              <p className="text-xs font-black text-primary flex items-center justify-center gap-1 mt-1">
                <Icon name="check_circle" className="text-xs text-emerald-600" /> Enabled
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-4 pt-3 border-t border-outline-variant/40 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-lowest/90 border border-outline-variant/50 px-2.5 py-1 text-[11px] font-bold text-on-surface">
            📊 Google Sheets Layout
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-lowest/90 border border-outline-variant/50 px-2.5 py-1 text-[11px] font-bold text-on-surface">
            ⭐ Daily Winner Benchmark
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-lowest/90 border border-outline-variant/50 px-2.5 py-1 text-[11px] font-bold text-on-surface">
            🔗 Instant Drive / Docs Link Paste
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-lowest/90 border border-outline-variant/50 px-2.5 py-1 text-[11px] font-bold text-on-surface">
            👥 Live Teammates Work
          </span>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((campaign) => {
          const registered = campaign.registration_status === "approved";
          const waiting = campaign.registration_status === "registered";
          const clientInitial = (campaign.client_name || "C").trim().charAt(0).toUpperCase();

          return (
            <button
              key={campaign.id}
              onClick={() => setSelectedId(campaign.id)}
              className="group relative flex flex-col justify-between rounded-3xl border border-outline-variant/70 bg-surface-lowest p-5 text-left transition-all hover:border-emerald-500 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
            >
              {/* Subtle top accent bar */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary group-hover:h-2 transition-all" />

              <div>
                {/* Header Row: Client badge, Name & Status */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg shadow-md shadow-emerald-600/20">
                      {clientInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-on-surface group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {campaign.client_name}
                      </p>
                      <p className="truncate text-xs font-medium text-on-surface-variant">
                        {campaign.campaign_name || "Social media campaign"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      registered
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : waiting
                          ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "border-outline-variant bg-surface-low text-on-surface-variant"
                    }`}
                  >
                    {registered ? "Active Client" : waiting ? "Pending approval" : "Register first"}
                  </span>
                </div>

                {/* Dates & Timeline */}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Icon name="calendar_month" className="text-sm text-emerald-600" />
                  <span>{formatDate(campaign.period_start)} –</span>
                  {campaign.period_end ? (
                    <span>{formatDate(campaign.period_end)}</span>
                  ) : (
                    <span className="font-black text-emerald-600 uppercase text-[10px] bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                      Ongoing
                    </span>
                  )}
                </div>

                {/* Progress Bar of Shared Days */}
                <div className="mt-3 rounded-2xl bg-surface-low/70 border border-outline-variant/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-on-surface-variant text-[11px] flex items-center gap-1">
                      <Icon name="description" className="text-xs text-emerald-600" /> Planned Calendar
                    </span>
                    <span className="text-on-surface text-[11px]">
                      {campaign.visible_days} of {campaign.total_days} days shared
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(8, Math.round(((campaign.visible_days || 1) / (campaign.total_days || 1)) * 100)),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {campaign.needs_attention > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-xl px-2.5 py-1">
                    <Icon name="error" className="text-[14px]" /> {campaign.needs_attention} submission(s) need changes
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Icon name="table_chart" className="text-sm" /> Open Google Sheet View
                </span>
                <span className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white p-2 text-xs font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
                  <Icon name="arrow_forward" className="text-[15px] transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function CampaignDetail({
  campaignId,
  onBack,
  setToast,
}: {
  campaignId: string;
  onBack: () => void;
  setToast: (state: ToastState) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Row | null>(null);
  const [member, setMember] = useState<Row | null>(null);
  const [members, setMembers] = useState<Row[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [days, setDays] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [menus, setMenus] = useState({ plan: true, submit: true, history: true });
  const [tab, setTab] = useState<"sheet" | "plan" | "submit" | "history">("sheet");
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchMyCampaign(campaignId);
    if (res.success) {
      setCampaign(res.campaign as Row);
      setMember(res.member as Row);
      setDays(res.days as Row[]);
      setSubmissions(res.submissions as Row[]);
      setMembers(((res as any).members as Row[]) || []);
      setCurrentUserId((res as any).currentUserId || "");
      setMenus(res.menus);
    } else {
      setToast({ type: "error", message: res.error || "Could not load this campaign." });
    }
    setLoading(false);
  }, [campaignId, setToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, Row> = {};
    for (const submission of submissions) map[submission.day_id] = submission;
    return map;
  }, [submissions]);

  /** The next day the student should be working on. */
  const nextDay = useMemo(() => {
    const today = todayIso();
    const upcoming = days.filter((day) => !byDay[day.id] && (!day.post_date || day.post_date >= today));
    if (upcoming.length > 0) return upcoming[0];
    const unsubmitted = days.find((day) => !byDay[day.id]);
    return unsubmitted ?? null;
  }, [days, byDay]);

  useEffect(() => {
    if (nextDay && !activeDayId) setActiveDayId(nextDay.id);
  }, [nextDay, activeDayId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-16 text-on-surface-variant">
        <Icon name="sync" className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!campaign || !member) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">This campaign could not be loaded.</p>
        <button onClick={onBack} className="mt-4 rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold">
          Back
        </button>
      </div>
    );
  }

  const header = (
    <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#dadce0] dark:border-zinc-800 bg-surface-lowest shadow-sm">
      {/* Google Sheets Top Titlebar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/70 px-3.5 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:text-emerald-700 hover:border-emerald-600 shadow-sm transition"
            title="Back to all campaigns"
          >
            <Icon name="arrow_back" className="text-sm" />
            <span className="hidden sm:inline">My campaigns</span>
          </button>

          {/* Google Sheets Document Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F9D58] text-white shadow-sm">
            <Icon name="table_chart" className="text-lg" />
          </div>

          {/* Document Title & Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm sm:text-base font-black text-on-surface tracking-tight">
                {campaign.client_name} <span className="font-normal text-on-surface-variant hidden md:inline">— Social Media Calendar</span>
              </h2>
              <span className="hidden sm:inline-flex items-center text-amber-500" title="Starred">
                <Icon name="star" className="text-xs" />
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-on-surface-variant truncate">
              <span>{campaign.campaign_name || "Daily Content Workflow"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Icon name="cloud_done" className="text-[12px]" /> All changes saved
              </span>
            </p>
          </div>
        </div>

        {/* Right side: Collaborators Avatars & Status */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Collaborator Avatars (Like Google Sheets Live User Bubbles) */}
          {members.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden p-0.5">
              {members.slice(0, 4).map((m, idx) => {
                const isMe = m.student_id === currentUserId;
                const name = m.student?.full_name || "Student";
                const initials = name
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const colors = [
                  "bg-emerald-600 text-white ring-emerald-300",
                  "bg-blue-600 text-white ring-blue-300",
                  "bg-purple-600 text-white ring-purple-300",
                  "bg-amber-600 text-white ring-amber-300",
                ];
                const colorClass = isMe
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-500 font-black"
                  : colors[idx % colors.length];

                return (
                  <span
                    key={m.student_id}
                    title={`${name} ${isMe ? "(You)" : ""}`}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-surface-lowest shadow-sm ${colorClass}`}
                  >
                    {initials || "S"}
                  </span>
                );
              })}
              {members.length > 4 && (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-[10px] font-bold text-on-surface ring-2 ring-surface-lowest shadow-sm">
                  +{members.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Campaign status */}
          {campaign.period_end ? (
            <span className="text-[10px] sm:text-[11px] font-semibold text-on-surface-variant bg-surface-low border border-outline-variant/50 rounded-full px-2.5 py-0.5">
              {formatDate(campaign.period_start)} – {formatDate(campaign.period_end)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Ongoing
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("open-account-settings"));
              }
            }}
            title="Edit your email, phone, or password"
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-lowest px-2.5 py-1 text-[11px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-sm transition"
          >
            <Icon name="manage_accounts" className="text-xs text-primary" />
            <span className="hidden sm:inline">Profile &amp; Password</span>
          </button>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: "sheet" as const, label: "Sheet 1: Content Sheet 📊", icon: "table_chart", enabled: true },
    { id: "plan" as const, label: "Sheet 2: Detailed Plan 📅", icon: "calendar_month", enabled: menus.plan },
    { id: "submit" as const, label: "Sheet 3: Submit Work 📤", icon: "cloud_upload", enabled: menus.submit },
    { id: "history" as const, label: "Sheet 4: My Submissions 🕒", icon: "history", enabled: menus.history },
  ].filter((item) => item.enabled);

  const activeDay = days.find((day) => day.id === activeDayId) ?? nextDay ?? days[0] ?? null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {header}

      {tabs.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-8 text-center text-sm text-on-surface-variant">
          Your admin has not enabled any section for you yet.
        </div>
      ) : (
        <>
          {/* Google Sheets Workbook Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-[#dadce0] dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-900/60 p-1.5 rounded-2xl hide-scrollbar shadow-inner">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-low text-xs font-bold shrink-0 cursor-default" title="Google Sheets Tabs">
              <Icon name="add" className="text-sm text-on-surface-variant" />
            </span>
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-surface-lowest text-[#0F9D58] border-b-2 border-[#0F9D58] shadow-sm font-black"
                      : "text-on-surface-variant hover:bg-surface-lowest/70 hover:text-on-surface"
                  }`}
                >
                  <Icon name={item.icon} className={`text-[15px] ${active ? "text-[#0F9D58]" : "text-on-surface-variant"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {tab === "sheet" && (
            <StudentSheetView
              campaign={campaign}
              days={days}
              submissions={submissions}
              members={members}
              currentUserId={currentUserId}
              onReload={load}
              setToast={setToast}
            />
          )}

          {tab === "plan" && <PlanPanel days={days} byDay={byDay} activeDayId={activeDay?.id ?? null} onPick={setActiveDayId} />}

          {tab === "submit" && (
            <SubmitPanel
              days={days}
              byDay={byDay}
              submissions={submissions}
              currentUserId={currentUserId}
              activeDay={activeDay}
              onPick={setActiveDayId}
              driveUrl={member.drive_url || DEFAULT_CAMPAIGN_DRIVE_FOLDER}
              onSubmitted={(submission) => {
                setSubmissions((current) => {
                  const rest = current.filter((row) => row.day_id !== submission.day_id);
                  return [submission, ...rest];
                });
                setToast({ type: "success", message: "Submitted. Your teacher will review it." });
              }}
            />
          )}

          {tab === "history" && <HistoryPanel days={days} submissions={submissions} />}
        </>
      )}
    </div>
  );
}

function RegistrationGate({
  member,
  campaignName,
  onDone,
  setToast,
}: {
  member: Row;
  campaignName: string;
  onDone: () => void;
  setToast: (state: ToastState) => void;
}) {
  const waiting = member.registration_status === "registered";
  const rejected = member.registration_status === "rejected";
  const [handles, setHandles] = useState<Record<string, string>>({
    instagram: member.social_handles?.instagram || "",
    facebook: member.social_handles?.facebook || "",
    tiktok: member.social_handles?.tiktok || "",
    youtube: member.social_handles?.youtube || "",
    linkedin: member.social_handles?.linkedin || "",
    x: member.social_handles?.x || "",
  });
  const [note, setNote] = useState(member.registration_note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const res = await completeCampaignRegistration(member.campaign_id, { social_handles: handles, note });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not save your registration.");
      return;
    }
    setToast({ type: "success", message: "Registration submitted — waiting for admin approval." });
    onDone();
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="badge" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-on-surface">
            {waiting ? "Registration submitted" : rejected ? "Registration needs attention" : "Register for this campaign"}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            {waiting
              ? "Your details are with the admin. You will see the plan and the submit form as soon as they approve you."
              : rejected
                ? "The admin asked you to update your details. Fix them below and submit again."
                : `Before you start work on ${campaignName}, confirm your details and social accounts.`}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <Icon name="cloud_done" className="text-base text-emerald-600" />
          <span>Direct Google Drive Video Upload Active</span>
        </div>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
          You don&apos;t need to configure a Drive folder manually. You can drag and drop your daily reel or video directly on the <strong>Submit post</strong> tab.
        </p>
        {member.drive_url && (
          <a
            href={member.drive_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline dark:text-emerald-300"
          >
            <Icon name="folder_open" className="text-[14px]" /> Open assigned Drive folder
          </a>
        )}
      </div>

      {!waiting && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: "instagram", label: "Instagram" },
              { key: "facebook", label: "Facebook" },
              { key: "tiktok", label: "TikTok" },
              { key: "youtube", label: "YouTube" },
              { key: "linkedin", label: "LinkedIn" },
              { key: "x", label: "X (Twitter)" },
            ].map((field) => (
              <div key={field.key}>
                <label className={LABEL_CLASS}>{field.label}</label>
                <input
                  value={handles[field.key] || ""}
                  onChange={(event) => setHandles({ ...handles, [field.key]: event.target.value })}
                  className={FIELD_CLASS}
                  placeholder={`@your${field.key}handle`}
                />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <label className={LABEL_CLASS}>Anything the admin should know? (optional)</label>
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={FIELD_CLASS} />
          </div>

          {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">{error}</p>}

          <button
            onClick={() => void submit()}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name={saving ? "sync" : "how_to_reg"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
            {saving ? "Submitting…" : "Submit registration"}
          </button>
        </>
      )}

      {waiting && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          <Icon name="hourglass_top" className="text-[16px]" /> Waiting for admin approval
        </div>
      )}
    </div>
  );
}

function PlanPanel({
  days,
  byDay,
  activeDayId,
  onPick,
}: {
  days: Row[];
  byDay: Record<string, Row>;
  activeDayId: string | null;
  onPick: (id: string) => void;
}) {
  const active = days.find((day) => day.id === activeDayId) ?? days[0] ?? null;

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-8 text-center text-sm text-on-surface-variant">
        No day has been shared with you yet. Your teacher will publish the plan when it is ready.
      </div>
    );
  }

  const blocks: { label: string; value?: string | null }[] = active
    ? [
        { label: "Goal", value: active.goal },
        { label: "Hook text", value: active.x_draft },
        { label: "Video prompt / AI prompt", value: active.image_headline },
        { label: "Reel script / Scene-by-scene script", value: active.reel_script },
        { label: "Post caption", value: active.caption },
        { label: "Platform plan", value: active.platform_plan },
        { label: "Hashtags", value: active.hashtags },
        { label: "Call to Action (CTA)", value: active.cta },
        { label: "Engagement action", value: active.engagement_action },
        { label: "Metrics to record", value: active.metrics_to_record },
      ]
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest">
        <p className="border-b border-outline-variant px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          Shared days ({days.length})
        </p>
        <div className="max-h-80 overflow-y-auto custom-scrollbar lg:max-h-[520px]">
          {days.map((day) => {
            const submission = byDay[day.id];
            const isActive = active?.id === day.id;
            return (
              <button
                key={day.id}
                onClick={() => onPick(day.id)}
                className={`flex w-full items-start gap-2 border-b border-outline-variant/60 px-3 py-2.5 text-left last:border-0 ${
                  isActive ? "bg-primary/5" : "hover:bg-surface-low"
                }`}
              >
                <span className="mt-0.5 text-[11px] font-black text-on-surface-variant">#{day.day_number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-on-surface">{day.theme || "Untitled day"}</span>
                  <span className="block text-[11px] text-on-surface-variant">{formatShort(day.post_date)}</span>
                </span>
                {submission && (
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_TONE[submission.status] || STATUS_TONE.submitted}`}>
                    {submission.is_selected ? "Winner" : submission.status}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                Day {active.day_number} · {formatDate(active.post_date)}
              </p>
              <h3 className="mt-1 text-lg font-black leading-snug text-on-surface">{active.theme || "Untitled day"}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {active.source_link && (
                <a
                  href={active.source_link.startsWith("http") ? active.source_link : `https://${active.source_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <Icon name="description" className="text-[14px]" /> Docs Brief ↗
                </a>
              )}
              {active.research_note && (
                <a
                  href={active.research_note.startsWith("http") ? active.research_note : `https://${active.research_note}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Icon name="smart_toy" className="text-[14px]" /> ChatGPT ↗
                </a>
              )}
              {active.image_headline && (
                <a
                  href={active.image_headline.startsWith("http") ? active.image_headline : `https://${active.image_headline}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
                >
                  <Icon name="folder_open" className="text-[14px]" /> Assets ↗
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {blocks
              .filter((block) => block.value)
              .map((block) => (
                <div key={block.label} className="rounded-lg border border-outline-variant bg-surface-low p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{block.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">{block.value}</p>
                </div>
              ))}
          </div>

          {active.published_url && (
            <a
              href={active.published_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <Icon name="open_in_new" className="text-[14px]" /> Final published post
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SubmitPanel({
  days,
  byDay,
  submissions,
  currentUserId,
  activeDay,
  onPick,
  driveUrl,
  onSubmitted,
}: {
  days: Row[];
  byDay: Record<string, Row>;
  submissions?: Row[];
  currentUserId?: string;
  activeDay: Row | null;
  onPick: (id: string) => void;
  driveUrl?: string | null;
  onSubmitted: (submission: Row) => void;
}) {
  const existing = activeDay ? byDay[activeDay.id] : null;
  const locked = existing && ["approved", "selected"].includes(existing.status);
  const dayWinner = submissions?.find(
    (s) => s.day_id === activeDay?.id && (s.is_selected || s.status === "selected"),
  );
  const isMeWinner = Boolean(dayWinner && currentUserId && dayWinner.student_id === currentUserId);

  const [form, setForm] = useState({
    video_url: existing?.video_url || "",
    post_url: existing?.post_url || "",
    doc_url: existing?.doc_url || "",
    images: Array.isArray(existing?.image_urls) ? existing.image_urls.join("\n") : "",
    caption: existing?.caption || "",
    note: existing?.note || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [uploadingFileSizeMb, setUploadingFileSizeMb] = useState(0);
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Set to true in future if admin wants to re-enable direct browser video upload
  const ENABLE_DIRECT_VIDEO_UPLOAD = false;
  // Set to true in future if admin wants to display Drive folder links directly to students
  const SHOW_DRIVE_FOLDER_BUTTONS = false;

  function cancelUpload() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploadingVideo(false);
    setUploadProgress(0);
    setError("Upload cancelled. You can paste your video link directly below.");
  }

  async function handleVideoUpload(file: File) {
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name)) {
      setError("Please select a video file (MP4, MOV, WEBM).");
      return;
    }
    const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    if (file.size > 4.5 * 1024 * 1024) {
      setError(
        `Video file is ${sizeMb} MB. Direct web uploads are limited to under 4.5 MB on cloud servers. Please click "Upload to Drive Folder" above or upload directly to your Google Drive and paste the link below (recommended for full videos).`,
      );
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(5);
    setUploadingFileName(file.name);
    setUploadingFileSizeMb(sizeMb);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.timeout = 45000;
    xhr.open("POST", "/api/student/campaign-video-upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Upload to server spans 5% to 85%
        const percent = Math.min(85, Math.max(5, Math.round((event.loaded / event.total) * 85)));
        setUploadProgress(percent);
      }
    };

    xhr.ontimeout = () => {
      xhrRef.current = null;
      setUploadingVideo(false);
      setError("Upload timed out. Please click 'Upload to Drive Folder' above or paste your Google Drive link below.");
    };

    xhr.onload = () => {
      xhrRef.current = null;
      setUploadingVideo(false);
      try {
        if (xhr.status === 413) {
          setError(`File is too large for direct browser upload (${sizeMb} MB exceeds server limit). Please upload to your Google Drive and paste the link below.`);
          return;
        }
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
          setUploadProgress(100);
          setForm((prev) => ({ ...prev, video_url: data.url }));
          setUploadedVideoName(file.name);
        } else {
          setError(data.error || "Upload failed. Please paste your Google Drive link directly below.");
        }
      } catch {
        setError("Upload did not complete. Please paste your Google Drive link directly below.");
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setUploadingVideo(false);
      setError("Network connection issue while uploading. Please paste your Google Drive link directly below.");
    };

    xhr.send(formData);
  }

  useEffect(() => {
    setForm({
      video_url: existing?.video_url || "",
      post_url: existing?.post_url || "",
      doc_url: existing?.doc_url || "",
      images: Array.isArray(existing?.image_urls) ? existing.image_urls.join("\n") : "",
      caption: existing?.caption || "",
      note: existing?.note || "",
    });
    setError("");
  }, [activeDay?.id, existing?.id, existing?.video_url, existing?.post_url, existing?.doc_url, existing?.caption, existing?.note, existing?.image_urls]);

  if (!activeDay) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-8 text-center text-sm text-on-surface-variant">
        No day has been shared with you yet, so there is nothing to submit.
      </div>
    );
  }

  async function submit() {
    setSaving(true);
    setError("");
    const res = await submitDayWork(activeDay!.id, {
      video_url: form.video_url,
      post_url: form.post_url,
      doc_url: form.doc_url,
      image_urls: form.images.split(/\s*[\n,]\s*/).filter(Boolean),
      caption: form.caption,
      note: form.note,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not submit your work.");
      return;
    }
    onSubmitted(res.submission as Row);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-3">
        <label className={LABEL_CLASS}>Which day are you submitting?</label>
        <select
          value={activeDay.id}
          onChange={(event) => onPick(event.target.value)}
          className={FIELD_CLASS}
        >
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              Day {day.day_number} · {formatShort(day.post_date)} · {day.theme || "Untitled"}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Day {activeDay.day_number} · {formatDate(activeDay.post_date)}
            </p>
            <h3 className="mt-1 truncate text-base font-black text-on-surface">{activeDay.theme || "Untitled day"}</h3>
          </div>
          {SHOW_DRIVE_FOLDER_BUTTONS && (
            <a
              href={driveUrl || DEFAULT_CAMPAIGN_DRIVE_FOLDER}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 shadow-sm transition"
              title="Open Google Drive folder"
            >
              <Icon name="folder" className="text-[15px]" /> Upload to Drive Folder ↗
            </a>
          )}
        </div>

        {dayWinner && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Icon name="emoji_events" className="text-base" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">
                  Official Day Winner ⭐
                </p>
                <p className="text-xs font-bold text-on-surface">
                  {isMeWinner ? "You are the winner for this day!" : `${dayWinner.student?.full_name || "A student"} won this day`}
                </p>
              </div>
            </div>
            {(dayWinner.video_url || dayWinner.doc_url || dayWinner.post_url) && (
              <a
                href={dayWinner.video_url || dayWinner.doc_url || dayWinner.post_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2.5 py-1 text-xs font-bold shadow-sm hover:bg-amber-600 transition"
              >
                <Icon name="visibility" className="text-xs" /> View Winning Post ↗
              </a>
            )}
          </div>
        )}

        {existing && (
          <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${STATUS_TONE[existing.status] || STATUS_TONE.submitted}`}>
            <Icon name={existing.status === "revision" || existing.status === "rejected" ? "error" : "check_circle"} className="text-[16px]" />
            {existing.is_selected
              ? "Your post was picked as the final one for this day."
              : existing.status === "revision"
                ? "Your teacher asked for changes — update the links and submit again."
                : existing.status === "rejected"
                  ? "This attempt was rejected. Submit a new one."
                  : existing.status === "approved"
                    ? "Approved by your teacher."
                    : "Submitted — waiting for review."}
          </div>
        )}

        {existing?.feedback && (
          <p className="mt-2 rounded-lg bg-surface-low px-3 py-2 text-xs text-on-surface">
            <span className="font-bold">Teacher feedback:</span> {existing.feedback}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLASS}>Campaign Video (Google Drive / YouTube link)</label>
              {SHOW_DRIVE_FOLDER_BUTTONS && (
                <a
                  href={driveUrl || DEFAULT_CAMPAIGN_DRIVE_FOLDER}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Icon name="folder" className="text-[14px]" /> Open Drive Folder ↗
                </a>
              )}
            </div>

            {ENABLE_DIRECT_VIDEO_UPLOAD && (
              <>
                {form.video_url ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                        <Icon name="movie" className="text-xl" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          {uploadedVideoName || "Video attached"}
                        </p>
                        <a
                          href={form.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 underline dark:text-emerald-300"
                        >
                          <Icon name="open_in_new" className="text-[12px]" /> View in Google Drive
                        </a>
                      </div>
                    </div>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, video_url: "" }));
                          setUploadedVideoName(null);
                        }}
                        className="shrink-0 rounded-lg p-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Remove video"
                      >
                        <Icon name="close" className="text-sm" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => !locked && !uploadingVideo && videoInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
                      uploadingVideo
                        ? "border-primary bg-primary/5 cursor-wait"
                        : "border-outline-variant bg-surface-low hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*,.mp4,.mov,.webm"
                      className="hidden"
                      disabled={locked || uploadingVideo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleVideoUpload(f);
                        e.target.value = "";
                      }}
                    />
                    {uploadingVideo ? (
                      <div className="flex flex-col items-center gap-3 py-3 w-full max-w-md mx-auto">
                        <div className="flex items-center justify-between w-full text-xs font-bold text-on-surface">
                          <span className="flex items-center gap-2 text-primary">
                            <Icon name="sync" className="animate-spin text-sm" />
                            {uploadProgress < 85 ? "Uploading video file…" : "Saving to Google Drive…"}
                          </span>
                          <span className="text-primary font-black text-sm">{uploadProgress}%</span>
                        </div>

                        {/* Dynamic Progress Bar */}
                        <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden border border-outline-variant/60 shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${Math.max(uploadProgress, 6)}%` }}
                          />
                        </div>

                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-bold text-on-surface truncate max-w-xs">
                            {uploadingFileName} ({uploadingFileSizeMb} MB)
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {uploadProgress < 85
                              ? `Uploading bytes... ${uploadProgress}%`
                              : "Uploading completed — saving to Google Drive..."}
                          </p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                            💡 Fast option: You can also paste your Google Drive link directly below!
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelUpload();
                          }}
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 cursor-pointer"
                        >
                          <Icon name="close" className="text-xs" /> Cancel upload
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Icon name="video_call" className="text-2xl" />
                        </div>
                        <p className="text-sm font-bold text-on-surface">Click or drag video here to upload</p>
                        <p className="text-xs text-on-surface-variant">Direct upload under 4.5MB. For full videos, click &quot;Upload to Drive Folder&quot; above and paste the link below.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!locked && (
              <div>
                <input
                  value={form.video_url}
                  onChange={(event) => setForm({ ...form, video_url: event.target.value })}
                  className={FIELD_CLASS}
                  placeholder="https://drive.google.com/file/d/… or https://youtube.com/…"
                  disabled={locked}
                />
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Paste the Google Drive or YouTube link to your video.
                </p>
              </div>
            )}

            {form.video_url && !ENABLE_DIRECT_VIDEO_UPLOAD && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <Icon name="movie" className="text-lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Video link provided
                    </p>
                    <a
                      href={form.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 underline dark:text-emerald-300"
                    >
                      <Icon name="open_in_new" className="text-[12px]" /> Test / View video link
                    </a>
                  </div>
                </div>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, video_url: "" }))}
                    className="shrink-0 rounded-lg p-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    title="Remove link"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Script / design doc (optional)</label>
            <input
              value={form.doc_url}
              onChange={(event) => setForm({ ...form, doc_url: event.target.value })}
              className={FIELD_CLASS}
              placeholder="https://docs.google.com/… or notes link"
              disabled={locked}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Note for your teacher (optional)</label>
            <input
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              className={FIELD_CLASS}
              placeholder="Any question or context for your teacher…"
              disabled={locked}
            />
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">{error}</p>}

        <button
          onClick={() => void submit()}
          disabled={saving || Boolean(locked)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
        >
          <Icon name={saving ? "sync" : "cloud_upload"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
          {saving ? "Submitting…" : existing ? "Update submission" : "Submit work"}
        </button>
      </div>
    </div>
  );
}

function HistoryPanel({ days, submissions }: { days: Row[]; submissions: Row[] }) {
  const dayMap = useMemo(() => {
    const map: Record<string, Row> = {};
    for (const day of days) map[day.id] = day;
    return map;
  }, [days]);

  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-8 text-center text-sm text-on-surface-variant">
        You have not submitted anything yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-low text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Day</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Links</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {submissions.map((submission) => {
              const day = dayMap[submission.day_id];
              return (
                <tr key={submission.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-bold text-on-surface">#{day?.day_number ?? "—"}</p>
                    <p className="text-xs text-on-surface-variant">{formatShort(day?.post_date)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[submission.status] || STATUS_TONE.submitted}`}>
                      {submission.is_selected ? "Winner" : submission.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {submission.video_url && (
                        <a href={submission.video_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                          Video
                        </a>
                      )}
                      {submission.post_url && (
                        <a href={submission.post_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                          Post
                        </a>
                      )}
                      {submission.doc_url && (
                        <a href={submission.doc_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                          Doc
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{submission.feedback || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
