"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_DEEPSEEK_SETTINGS, getDeepSeekSettings, testDeepSeekConnection } from "@/lib/ai-assistant/deepseek";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { DeepSeekAssistantSettings } from "@/lib/supabase/types";

type Input = { apiKey?: string; model: string; enabled: boolean; systemInstructions: string };
type Result = { success: boolean; error?: string; status?: DeepSeekAssistantSettings["validation_status"]; lastError?: string | null; hasApiKey?: boolean };

async function requireAdmin() {
  const profile = await getCurrentUserProfile();
  if (profile.role !== "admin" || profile.status !== "approved") throw new Error("Only an approved admin can manage DeepSeek settings.");
  return profile;
}

export async function saveDeepSeekSettings(input: Input): Promise<Result> {
  try {
    const profile = await requireAdmin();
    const current = await getDeepSeekSettings().catch(() => DEFAULT_DEEPSEEK_SETTINGS);
    const apiKey = input.apiKey?.trim() || current.api_key;
    if (input.enabled && !apiKey) return { success: false, error: "Add a DeepSeek API key before enabling fallback." };
    const changedKey = Boolean(input.apiKey?.trim());
    const payload = {
      id: true,
      api_key: apiKey,
      model: input.model.trim() || DEFAULT_DEEPSEEK_SETTINGS.model,
      enabled: input.enabled,
      system_instructions: input.systemInstructions.trim() || null,
      validation_status: changedKey ? "not_tested" as const : current.validation_status,
      last_error: changedKey ? null : current.last_error,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await createSupabaseServiceClient().from("deepseek_assistant_settings").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/settings/deepseek");
    return { success: true, status: payload.validation_status, lastError: payload.last_error, hasApiKey: Boolean(apiKey) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save DeepSeek settings." };
  }
}

export async function testSavedDeepSeekConnection(): Promise<Result> {
  try {
    await requireAdmin();
    const settings = await getDeepSeekSettings();
    if (!settings.api_key) return { success: false, error: "Save a DeepSeek API key first." };
    try {
      await testDeepSeekConnection(settings);
      await createSupabaseServiceClient().from("deepseek_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
      revalidatePath("/admin/settings/deepseek");
      return { success: true, status: "active", lastError: null, hasApiKey: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed.";
      const status = /api key|authentication|invalid key|rejected/i.test(message) ? "invalid" : "error";
      await createSupabaseServiceClient().from("deepseek_assistant_settings").update({ validation_status: status, last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      return { success: false, error: message, status, lastError: message, hasApiKey: true };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Connection test failed." };
  }
}
