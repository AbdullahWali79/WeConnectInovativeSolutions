import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminNotificationSettings } from "@/lib/supabase/types";
import { normalizeWhatsAppNumber } from "./client";
import {
  defaultApprovedStudentWhatsappTemplate,
  defaultPendingSummaryWhatsAppTemplate,
  defaultRegistrationWhatsAppTemplate,
  normalizeTemplateText,
} from "./message-templates";

export type WhatsAppSettingsInput = {
  whatsappNumber: string;
  registrationAlertEnabled: boolean;
  pendingTaskAlertEnabled: boolean;
  pendingTaskAlertTime: string;
  pendingTaskAlertTimezone: string;
  pendingTaskAlertFrequency: "daily";
  registrationMessageTemplate: string;
  pendingSummaryMessageTemplate: string;
  approvedStudentMessageTemplate: string;
};

export type WhatsAppSettingsSnapshot = Omit<AdminNotificationSettings, "id"> & {
  id: string | null;
};

export const supportedWhatsAppTimezones = [
  "Asia/Karachi",
  "UTC",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
];

export function normalizeTime(value: string) {
  const trimmed = value.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);

  if (!match) {
    throw new Error("Alert time must be a valid 24-hour time.");
  }

  return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
}

export function validateWhatsAppSettingsInput(input: WhatsAppSettingsInput) {
  const whatsappNumber = normalizeWhatsAppNumber(input.whatsappNumber);
  const pendingTaskAlertTimezone = input.pendingTaskAlertTimezone.trim() || "Asia/Karachi";
  const registrationMessageTemplate = normalizeTemplateText(input.registrationMessageTemplate) || defaultRegistrationWhatsAppTemplate;
  const pendingSummaryMessageTemplate = normalizeTemplateText(input.pendingSummaryMessageTemplate) || defaultPendingSummaryWhatsAppTemplate;
  const approvedStudentMessageTemplate = normalizeTemplateText(input.approvedStudentMessageTemplate) || defaultApprovedStudentWhatsappTemplate;

  if (!/^923\d{9}$/.test(whatsappNumber)) {
    throw new Error("Use a valid Pakistan WhatsApp number without spaces, for example 923270728950.");
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: pendingTaskAlertTimezone });
  } catch {
    throw new Error("Select a valid timezone.");
  }

  return {
    whatsapp_number: whatsappNumber,
    registration_alert_enabled: input.registrationAlertEnabled,
    pending_task_alert_enabled: input.pendingTaskAlertEnabled,
    pending_task_alert_time: normalizeTime(input.pendingTaskAlertTime),
    pending_task_alert_timezone: pendingTaskAlertTimezone,
    pending_task_alert_frequency: "daily" as const,
    registration_message_template: registrationMessageTemplate,
    pending_summary_message_template: pendingSummaryMessageTemplate,
    approved_student_message_template: approvedStudentMessageTemplate,
  };
}

export function getDefaultWhatsAppSettings(adminUserId?: string | null): WhatsAppSettingsSnapshot {
  const now = new Date().toISOString();

  return {
    id: null,
    admin_user_id: adminUserId ?? null,
    whatsapp_number: normalizeWhatsAppNumber(process.env.WHATSAPP_ADMIN_NUMBER || "923270728950"),
    registration_alert_enabled: true,
    pending_task_alert_enabled: false,
    pending_task_alert_time: "19:00:00",
    pending_task_alert_timezone: "Asia/Karachi",
    pending_task_alert_frequency: "daily",
    registration_message_template: defaultRegistrationWhatsAppTemplate,
    pending_summary_message_template: defaultPendingSummaryWhatsAppTemplate,
    approved_student_message_template: defaultApprovedStudentWhatsappTemplate,
    last_pending_task_alert_sent_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getStoredWhatsAppSettings() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminNotificationSettings | null;
}

export async function getWhatsAppSettingsOrDefaults(adminUserId?: string | null): Promise<WhatsAppSettingsSnapshot> {
  try {
    return (await getStoredWhatsAppSettings()) ?? getDefaultWhatsAppSettings(adminUserId);
  } catch {
    return getDefaultWhatsAppSettings(adminUserId);
  }
}
