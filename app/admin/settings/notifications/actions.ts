"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminMailSettings, Profile } from "@/lib/supabase/types";
import type { MailSettingsInput } from "@/lib/mail/mail-settings";
import { saveAdminMailSettings } from "@/lib/mail/mail-settings";
import { sendPendingTaskSummaryEmail } from "@/lib/mail/send-daily-pending-summary";

type ActionResult<T = null> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

async function requireAdminProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (error || !profile || profile.role !== "admin" || profile.status !== "approved") {
    throw new Error("Only approved admins can manage email notifications.");
  }

  return profile;
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function saveMailNotificationSettings(input: MailSettingsInput): Promise<ActionResult<AdminMailSettings>> {
  try {
    const profile = await requireAdminProfile();
    const settings = await saveAdminMailSettings(profile.id, input);

    revalidatePath("/admin/settings/notifications");

    return { success: true, data: settings, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save email notification settings.") };
  }
}

export async function sendMailNotificationTestEmail(): Promise<ActionResult<{ totalPending: number; pendingApplications: number; pendingSubmissions: number }>> {
  try {
    await requireAdminProfile();
    const counts = await sendPendingTaskSummaryEmail();

    return { success: true, data: counts, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to send test email.") };
  }
}
