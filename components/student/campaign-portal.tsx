/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import {
  completeCampaignRegistration,
  fetchMyCampaign,
  fetchMyCampaigns,
  submitDayWork,
} from "@/app/student/campaigns/actions";

type Row = any;

const FIELD_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
const LABEL_CLASS = "mb-1 block text-xs font-bold text-on-surface-variant";

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
      <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
          <Icon name="rocket_launch" />
        </div>
        <p className="text-sm font-bold text-on-surface">No campaigns assigned yet</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Your admin will assign you to a client campaign. It will appear here once they do.
        </p>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="grid gap-3 sm:grid-cols-2">
        {campaigns.map((campaign) => {
          const registered = campaign.registration_status === "approved";
          const waiting = campaign.registration_status === "registered";
          return (
            <button
              key={campaign.id}
              onClick={() => setSelectedId(campaign.id)}
              className="group flex flex-col rounded-2xl border border-outline-variant bg-surface-lowest p-4 text-left transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-on-surface">{campaign.client_name}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {campaign.campaign_name || "Social media campaign"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    registered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : waiting
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-outline-variant bg-surface-low text-on-surface-variant"
                  }`}
                >
                  {registered ? "Active" : waiting ? "Awaiting approval" : "Register first"}
                </span>
              </div>

              <p className="mt-2 text-xs text-on-surface-variant">
                {formatDate(campaign.period_start)} – {formatDate(campaign.period_end)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <Icon name="visibility" className="text-[14px]" /> {campaign.visible_days} of {campaign.total_days} days shared
                </span>
                {campaign.needs_attention > 0 && (
                  <span className="inline-flex items-center gap-1 font-bold text-orange-600">
                    <Icon name="error" className="text-[14px]" /> {campaign.needs_attention} need changes
                  </span>
                )}
              </div>

              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                Open campaign <Icon name="arrow_forward" className="text-[14px] transition-transform group-hover:translate-x-0.5" />
              </span>
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
  const [days, setDays] = useState<Row[]>([]);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const [menus, setMenus] = useState({ plan: true, submit: true, history: true });
  const [tab, setTab] = useState<"plan" | "submit" | "history">("plan");
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchMyCampaign(campaignId);
    if (res.success) {
      setCampaign(res.campaign as Row);
      setMember(res.member as Row);
      setDays(res.days as Row[]);
      setSubmissions(res.submissions as Row[]);
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
    <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" className="text-[16px]" /> My campaigns
      </button>
      <h2 className="text-xl font-black leading-tight text-on-surface sm:text-2xl">{campaign.client_name}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        {campaign.campaign_name || "Social media campaign"} · {formatDate(campaign.period_start)} – {formatDate(campaign.period_end)}
      </p>
      {campaign.teacher?.full_name && (
        <p className="mt-1 text-xs text-on-surface-variant">
          Teacher: <span className="font-bold text-on-surface">{campaign.teacher.full_name}</span>
        </p>
      )}
    </div>
  );

  if (member.registration_status !== "approved") {
    return (
      <div className="space-y-4">
        {header}
        <RegistrationGate
          member={member}
          campaignName={campaign.client_name}
          onDone={() => void load()}
          setToast={setToast}
        />
      </div>
    );
  }

  const tabs = [
    { id: "plan" as const, label: "Next day plan", icon: "calendar_month", enabled: menus.plan },
    { id: "submit" as const, label: "Submit work", icon: "cloud_upload", enabled: menus.submit },
    { id: "history" as const, label: "My submissions", icon: "history", enabled: menus.history },
  ].filter((item) => item.enabled);

  const activeDay = days.find((day) => day.id === activeDayId) ?? nextDay ?? days[0] ?? null;

  return (
    <div className="space-y-4">
      {header}

      {tabs.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-8 text-center text-sm text-on-surface-variant">
          Your admin has not enabled any section for you yet.
        </div>
      ) : (
        <>
          <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {tabs.map((item) => (
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

          {tab === "plan" && <PlanPanel days={days} byDay={byDay} activeDayId={activeDay?.id ?? null} onPick={setActiveDayId} />}

          {tab === "submit" && (
            <SubmitPanel
              days={days}
              byDay={byDay}
              activeDay={activeDay}
              onPick={setActiveDayId}
              driveUrl={member.drive_url}
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

      <div className="mt-4 rounded-xl border border-outline-variant bg-surface-low p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Your Drive folder</p>
        {member.drive_url ? (
          <a
            href={member.drive_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 break-all text-sm font-bold text-primary hover:underline"
          >
            <Icon name="folder" className="text-[16px]" /> Open your upload folder
          </a>
        ) : (
          <p className="mt-1 text-sm text-on-surface-variant">
            The admin has not added your Drive link yet. You can still register — but ask them for the link before you start uploading.
          </p>
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
        { label: "Platform plan", value: active.platform_plan },
        { label: "Caption / talking points", value: active.caption },
        { label: "Image headline", value: active.image_headline },
        { label: "Reel script", value: active.reel_script },
        { label: "Hashtags", value: active.hashtags },
        { label: "Engagement action", value: active.engagement_action },
        { label: "CTA", value: active.cta },
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
            {active.source_link && (
              <a
                href={active.source_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-primary hover:border-primary"
              >
                <Icon name="open_in_new" className="text-[14px]" /> Reference
              </a>
            )}
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
  activeDay,
  onPick,
  driveUrl,
  onSubmitted,
}: {
  days: Row[];
  byDay: Record<string, Row>;
  activeDay: Row | null;
  onPick: (id: string) => void;
  driveUrl?: string | null;
  onSubmitted: (submission: Row) => void;
}) {
  const existing = activeDay ? byDay[activeDay.id] : null;
  const locked = existing && ["approved", "selected"].includes(existing.status);

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
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
            >
              <Icon name="folder" className="text-[14px]" /> Upload to my Drive
            </a>
          )}
        </div>

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
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Video link (Drive / YouTube)</label>
            <input
              value={form.video_url}
              onChange={(event) => setForm({ ...form, video_url: event.target.value })}
              className={FIELD_CLASS}
              placeholder="https://drive.google.com/…"
              disabled={locked}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Published post URL</label>
            <input
              value={form.post_url}
              onChange={(event) => setForm({ ...form, post_url: event.target.value })}
              className={FIELD_CLASS}
              placeholder="https://instagram.com/p/…"
              disabled={locked}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Script / design doc (optional)</label>
            <input
              value={form.doc_url}
              onChange={(event) => setForm({ ...form, doc_url: event.target.value })}
              className={FIELD_CLASS}
              placeholder="https://docs.google.com/…"
              disabled={locked}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Image links — one per line (optional)</label>
            <textarea
              rows={2}
              value={form.images}
              onChange={(event) => setForm({ ...form, images: event.target.value })}
              className={FIELD_CLASS}
              disabled={locked}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Caption you used (optional)</label>
            <textarea
              rows={2}
              value={form.caption}
              onChange={(event) => setForm({ ...form, caption: event.target.value })}
              className={FIELD_CLASS}
              disabled={locked}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Note for your teacher (optional)</label>
            <input
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              className={FIELD_CLASS}
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
