import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminMailSettings } from "@/lib/supabase/types";
import { getMailSettingsOrDefaults, getStoredAdminMailSettings } from "./mail-settings";
import { getApplicationSiteUrl, sendGoogleScriptMail } from "./google-script-mailer";

type ZonedParts = {
  date: string;
  minutes: number;
};

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour ?? 0);
  const minute = Number(values.minute ?? 0);

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: hour * 60 + minute,
  };
}

function timeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function getDueState(settings: AdminMailSettings, now: Date) {
  const timezone = settings.timezone || "Asia/Karachi";
  const current = getZonedParts(now, timezone);
  const targetMinutes = timeToMinutes(settings.daily_summary_time || "16:00:00");

  if (settings.last_daily_summary_sent_at) {
    const lastSent = getZonedParts(new Date(settings.last_daily_summary_sent_at), timezone);

    if (lastSent.date === current.date) {
      return { due: false, reason: "Daily summary already sent today" };
    }
  }

  if (current.minutes < targetMinutes) {
    return { due: false, reason: "Daily summary time has not arrived yet" };
  }

  return { due: true, reason: null };
}

export async function getPendingNotificationCounts() {
  const supabase = createSupabaseServiceClient();

  const [applications, submissions] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
  ]);

  const error = applications.error ?? submissions.error;

  if (error) {
    throw new Error(error.message);
  }

  const pendingApplications = applications.count ?? 0;
  const pendingSubmissions = submissions.count ?? 0;

  return {
    pendingApplications,
    pendingSubmissions,
    totalPending: pendingApplications + pendingSubmissions,
  };
}

export async function sendPendingTaskSummaryEmail(options: { recipientEmail?: string } = {}) {
  const counts = await getPendingNotificationCounts();
  const settings = options.recipientEmail ? null : await getMailSettingsOrDefaults();

  await sendGoogleScriptMail({
    type: "pending_task_summary",
    totalPending: counts.totalPending,
    pendingApplications: counts.pendingApplications,
    pendingSubmissions: counts.pendingSubmissions,
    generatedAt: new Date().toISOString(),
    adminDashboardUrl: `${getApplicationSiteUrl()}/admin`,
    emailHeading: "Daily Pending Tasks Summary",
    emailSummary: "Here is your scheduled WeConnect pending tasks summary.",
  }, {
    recipientEmail: options.recipientEmail || settings?.admin_email,
  });

  return counts;
}

export async function sendDailyPendingSummary(options: { forceTime?: boolean } = {}) {
  const settings = await getStoredAdminMailSettings();

  if (!settings) {
    return { skipped: true, reason: "Mail settings are not configured" };
  }

  if (!settings.send_daily_pending_summary) {
    return { skipped: true, reason: "Daily summary disabled by admin" };
  }

  if (!options.forceTime) {
    const dueState = getDueState(settings, new Date());

    if (!dueState.due) {
      return { skipped: true, reason: dueState.reason };
    }
  }

  const counts = await sendPendingTaskSummaryEmail({ recipientEmail: settings.admin_email });
  const supabase = createSupabaseServiceClient();

  await supabase
    .from("admin_mail_settings")
    .update({
      last_daily_summary_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  return { success: true, ...counts };
}
