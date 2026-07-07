"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminNotificationSettings, Profile } from "@/lib/supabase/types";
import type { WhatsAppSettingsInput } from "@/lib/whatsapp/settings";
import { validateWhatsAppSettingsInput } from "@/lib/whatsapp/settings";
import { sendPendingTaskSummaryWhatsAppAlert } from "@/lib/whatsapp/templates";

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
    throw new Error("Only approved admins can manage WhatsApp alerts.");
  }

  return profile;
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function updateWhatsAppAlertSettings(input: WhatsAppSettingsInput): Promise<ActionResult<AdminNotificationSettings>> {
  try {
    const profile = await requireAdminProfile();
    const supabase = await createSupabaseServerClient();
    const payload = validateWhatsAppSettingsInput(input);
    const { data: existing, error: existingError } = await supabase
      .from("admin_notification_settings")
      .select("id,admin_user_id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const result = existing
      ? await supabase
          .from("admin_notification_settings")
          .update({
            ...payload,
            admin_user_id: existing.admin_user_id ?? profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabase
          .from("admin_notification_settings")
          .insert({
            admin_user_id: profile.id,
            ...payload,
          })
          .select("*")
          .single();

    if (result.error || !result.data) {
      throw new Error(result.error?.message || "WhatsApp alert settings could not be saved.");
    }

    revalidatePath("/admin/notification-settings");

    return { success: true, data: result.data as AdminNotificationSettings, error: null };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to save WhatsApp alert settings.") };
  }
}

export async function sendWhatsAppPendingSummaryTest(): Promise<ActionResult<{ totalPendingTasks: number; overdueTasks: number; submittedButUngraded: number }>> {
  try {
    await requireAdminProfile();
    const result = await sendPendingTaskSummaryWhatsAppAlert();

    return {
      success: true,
      data: {
        totalPendingTasks: result.totalPendingTasks,
        overdueTasks: result.overdueTasks,
        submittedButUngraded: result.submittedButUngraded,
      },
      error: null,
    };
  } catch (error) {
    return { success: false, data: null, error: actionError(error, "Failed to send WhatsApp test message.") };
  }
}
