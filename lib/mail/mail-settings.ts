import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminMailSettings } from "@/lib/supabase/types";
import { getAdminNotificationEmail } from "./google-script-mailer";

export type MailSettingsInput = {
  adminEmail: string;
  sendRegistrationAlerts: boolean;
  sendDailyPendingSummary: boolean;
  dailySummaryTime: string;
  timezone: string;
};

export type MailSettingsSnapshot = Omit<AdminMailSettings, "id"> & {
  id: string | null;
};

const emailPattern = /^\S+@\S+\.\S+$/;

export function normalizeDailySummaryTime(value: string) {
  const trimmed = value.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);

  if (!match) {
    throw new Error("Daily summary time must be a valid 24-hour time.");
  }

  return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
}

export function validateMailSettingsInput(input: MailSettingsInput) {
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const dailySummaryTime = normalizeDailySummaryTime(input.dailySummaryTime);
  const timezone = input.timezone.trim() || "Asia/Karachi";

  if (!emailPattern.test(adminEmail)) {
    throw new Error("A valid admin notification email is required.");
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new Error("Select a valid timezone.");
  }

  return {
    admin_email: adminEmail,
    send_registration_alerts: input.sendRegistrationAlerts,
    send_daily_pending_summary: input.sendDailyPendingSummary,
    daily_summary_time: dailySummaryTime,
    timezone,
  };
}

export function getDefaultMailSettings(adminUserId?: string | null): MailSettingsSnapshot {
  const now = new Date().toISOString();

  return {
    id: null,
    admin_user_id: adminUserId ?? null,
    admin_email: getAdminNotificationEmail(),
    send_registration_alerts: true,
    send_daily_pending_summary: false,
    daily_summary_time: "16:00:00",
    timezone: "Asia/Karachi",
    last_daily_summary_sent_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getStoredAdminMailSettings() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admin_mail_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminMailSettings | null;
}

export async function getMailSettingsOrDefaults(adminUserId?: string | null): Promise<MailSettingsSnapshot> {
  try {
    return (await getStoredAdminMailSettings()) ?? getDefaultMailSettings(adminUserId);
  } catch {
    return getDefaultMailSettings(adminUserId);
  }
}

export async function getOrCreateAdminMailSettings(adminUserId: string) {
  const supabase = createSupabaseServiceClient();
  const existing = await getStoredAdminMailSettings();

  if (existing) {
    return existing;
  }

  const defaults = getDefaultMailSettings(adminUserId);
  const { data, error } = await supabase
    .from("admin_mail_settings")
    .insert({
      admin_user_id: adminUserId,
      admin_email: defaults.admin_email,
      send_registration_alerts: defaults.send_registration_alerts,
      send_daily_pending_summary: defaults.send_daily_pending_summary,
      daily_summary_time: defaults.daily_summary_time,
      timezone: defaults.timezone,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Mail settings could not be created.");
  }

  return data as AdminMailSettings;
}

export async function saveAdminMailSettings(adminUserId: string, input: MailSettingsInput) {
  const supabase = createSupabaseServiceClient();
  const existing = await getStoredAdminMailSettings();
  const payload = validateMailSettingsInput(input);

  if (!existing) {
    const { data, error } = await supabase
      .from("admin_mail_settings")
      .insert({
        admin_user_id: adminUserId,
        ...payload,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Mail settings could not be saved.");
    }

    return data as AdminMailSettings;
  }

  const { data, error } = await supabase
    .from("admin_mail_settings")
    .update({
      ...payload,
      admin_user_id: existing.admin_user_id ?? adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Mail settings could not be saved.");
  }

  return data as AdminMailSettings;
}
