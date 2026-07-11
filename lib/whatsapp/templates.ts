import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminNotificationSettings } from "@/lib/supabase/types";
import { getStoredWhatsAppSettings, getWhatsAppSettingsOrDefaults } from "./settings";
import { sendWhatsAppTemplateMessage } from "./client";
import { writeWhatsAppNotificationLog } from "./logger";
import {
  defaultPendingSummaryWhatsAppTemplate,
  defaultRegistrationWhatsAppTemplate,
  renderWhatsAppTemplate,
} from "./message-templates";
import type { PendingTaskSummary, WhatsAppTemplateComponent } from "./types";

export const whatsappTemplateNames = {
  registration: "new_student_registration_admin_alert",
  pendingSummary: "daily_pending_task_summary_admin",
} as const;

type RegistrationAlertInput = {
  studentName: string;
  courseName?: string | null;
  phone?: string | null;
  status?: string | null;
};

type ZonedParts = {
  date: string;
  minutes: number;
};

function body(parameters: string[]): WhatsAppTemplateComponent[] {
  return [
    {
      type: "body",
      parameters: parameters.map((text) => ({ type: "text", text })),
    },
  ];
}

function getProviderMessageId(result: Awaited<ReturnType<typeof sendWhatsAppTemplateMessage>>) {
  return result?.messages?.[0]?.id;
}

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

function getDueState(settings: AdminNotificationSettings, now: Date) {
  const timezone = settings.pending_task_alert_timezone || "Asia/Karachi";
  const current = getZonedParts(now, timezone);
  const targetMinutes = timeToMinutes(settings.pending_task_alert_time || "19:00:00");

  if (settings.last_pending_task_alert_sent_at) {
    const lastSent = getZonedParts(new Date(settings.last_pending_task_alert_sent_at), timezone);

    if (lastSent.date === current.date) {
      return { due: false, reason: "WhatsApp pending task alert already sent today" };
    }
  }

  if (current.minutes < targetMinutes) {
    return { due: false, reason: "WhatsApp pending task alert time has not arrived yet" };
  }

  return { due: true, reason: null };
}

export function buildRegistrationAlertPreview(input: RegistrationAlertInput, template = defaultRegistrationWhatsAppTemplate) {
  return renderWhatsAppTemplate(template || defaultRegistrationWhatsAppTemplate, {
    student_name: input.studentName || "Unknown Student",
    course_name: input.courseName || "Not selected",
    phone: input.phone || "Not provided",
    status: input.status || "Pending Review",
  });
}

export function buildPendingSummaryPreview(
  summary: PendingTaskSummary,
  dateLabel = new Date().toLocaleDateString("en-PK"),
  template = defaultPendingSummaryWhatsAppTemplate,
) {
  return renderWhatsAppTemplate(template || defaultPendingSummaryWhatsAppTemplate, {
    total_pending_tasks: summary.totalPendingTasks,
    overdue_tasks: summary.overdueTasks,
    submitted_but_ungraded: summary.submittedButUngraded,
    date_label: dateLabel,
  });
}

export async function sendRegistrationWhatsAppAlert(input: RegistrationAlertInput) {
  const settings = await getWhatsAppSettingsOrDefaults();

  if (!settings.registration_alert_enabled) {
    return { skipped: true, reason: "WhatsApp registration alerts are disabled by admin" };
  }

  const studentName = input.studentName || "Unknown Student";
  const courseName = input.courseName || "Not selected";
  const phone = input.phone || "Not provided";
  const status = input.status || "Pending Review";
  const messageBody = buildRegistrationAlertPreview(
    { studentName, courseName, phone, status },
    settings.registration_message_template,
  );

  try {
    const result = await sendWhatsAppTemplateMessage({
      to: settings.whatsapp_number,
      templateName: whatsappTemplateNames.registration,
      components: body([studentName, courseName, phone, status]),
    });

    await writeWhatsAppNotificationLog({
      recipientNumber: settings.whatsapp_number,
      alertType: "student_registration",
      templateName: whatsappTemplateNames.registration,
      messageBody,
      status: "sent",
      providerMessageId: getProviderMessageId(result),
    });

    return { success: true, providerMessageId: getProviderMessageId(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send WhatsApp registration alert.";

    await writeWhatsAppNotificationLog({
      recipientNumber: settings.whatsapp_number,
      alertType: "student_registration",
      templateName: whatsappTemplateNames.registration,
      messageBody,
      status: "failed",
      errorMessage: message,
    });

    throw new Error(message);
  }
}

export async function getPendingTaskSummary(): Promise<PendingTaskSummary> {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const [pendingTasks, overdueTasks, submittedButUngraded] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress", "submitted", "revision_required"]),
    supabase.from("tasks").select("*", { count: "exact", head: true }).lt("deadline", now).in("status", ["pending", "in_progress", "submitted", "revision_required"]),
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("status", "submitted"),
  ]);

  const error = pendingTasks.error ?? overdueTasks.error ?? submittedButUngraded.error;

  if (error) {
    throw new Error(error.message);
  }

  return {
    totalPendingTasks: pendingTasks.count ?? 0,
    overdueTasks: overdueTasks.count ?? 0,
    submittedButUngraded: submittedButUngraded.count ?? 0,
  };
}

export async function sendPendingTaskSummaryWhatsAppAlert(options: { recipientNumber?: string } = {}) {
  const settings = options.recipientNumber ? null : await getWhatsAppSettingsOrDefaults();
  const recipientNumber = options.recipientNumber || settings?.whatsapp_number || process.env.WHATSAPP_ADMIN_NUMBER || "923270728950";
  const summary = await getPendingTaskSummary();
  const dateLabel = new Date().toLocaleDateString("en-PK");
  const messageBody = buildPendingSummaryPreview(summary, dateLabel, settings?.pending_summary_message_template || defaultPendingSummaryWhatsAppTemplate);

  try {
    const result = await sendWhatsAppTemplateMessage({
      to: recipientNumber,
      templateName: whatsappTemplateNames.pendingSummary,
      components: body([
        String(summary.totalPendingTasks),
        String(summary.overdueTasks),
        String(summary.submittedButUngraded),
        dateLabel,
      ]),
    });

    await writeWhatsAppNotificationLog({
      recipientNumber,
      alertType: "pending_task_summary",
      templateName: whatsappTemplateNames.pendingSummary,
      messageBody,
      status: "sent",
      providerMessageId: getProviderMessageId(result),
    });

    return { success: true, ...summary, providerMessageId: getProviderMessageId(result) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send WhatsApp pending task summary.";

    await writeWhatsAppNotificationLog({
      recipientNumber,
      alertType: "pending_task_summary",
      templateName: whatsappTemplateNames.pendingSummary,
      messageBody,
      status: "failed",
      errorMessage: message,
    });

    throw new Error(message);
  }
}

export async function sendDuePendingTaskWhatsAppAlerts(options: { forceTime?: boolean } = {}) {
  const settings = await getStoredWhatsAppSettings();

  if (!settings) {
    return { skipped: true, reason: "WhatsApp alert settings are not configured" };
  }

  if (!settings.pending_task_alert_enabled) {
    return { skipped: true, reason: "WhatsApp pending task alerts disabled by admin" };
  }

  if (!options.forceTime) {
    const dueState = getDueState(settings, new Date());

    if (!dueState.due) {
      return { skipped: true, reason: dueState.reason };
    }
  }

  const result = await sendPendingTaskSummaryWhatsAppAlert({ recipientNumber: settings.whatsapp_number });
  const supabase = createSupabaseServiceClient();

  await supabase
    .from("admin_notification_settings")
    .update({
      last_pending_task_alert_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  return result;
}
