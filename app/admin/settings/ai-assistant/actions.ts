"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_AI_SETTINGS, getAiSettings, testAiConnection } from "@/lib/ai-assistant";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AiAssistantSettings } from "@/lib/supabase/types";

type Input = { apiKey?: string; model: string; enabled: boolean; assistantName: string; welcomeMessage: string; systemInstructions: string };
type Result = { success: boolean; error?: string; status?: AiAssistantSettings["validation_status"]; lastError?: string | null; hasApiKey?: boolean };

async function requireAdmin() {
  const profile = await getCurrentUserProfile();
  if (profile.role !== "admin" || profile.status !== "approved") throw new Error("Only an approved admin can manage AI settings.");
  return profile;
}

export async function saveAiSettings(input: Input): Promise<Result> {
  try {
    const profile = await requireAdmin();
    const current = await getAiSettings().catch(() => DEFAULT_AI_SETTINGS);
    const apiKey = input.apiKey?.trim() || current.api_key;
    if (input.enabled && !apiKey) return { success: false, error: "Add a Gemini API key before enabling the assistant." };
    const payload = {
      id: true,
      provider: "gemini" as const,
      api_key: apiKey,
      model: input.model.trim() || DEFAULT_AI_SETTINGS.model,
      enabled: input.enabled,
      assistant_name: input.assistantName.trim() || DEFAULT_AI_SETTINGS.assistant_name,
      welcome_message: input.welcomeMessage.trim() || DEFAULT_AI_SETTINGS.welcome_message,
      system_instructions: input.systemInstructions.trim() || null,
      validation_status: apiKey === current.api_key ? current.validation_status : "not_tested" as const,
      last_error: apiKey === current.api_key ? current.last_error : null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await createSupabaseServiceClient().from("ai_assistant_settings").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/settings/ai-assistant");
    return { success: true, status: payload.validation_status, lastError: payload.last_error, hasApiKey: Boolean(apiKey) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save AI settings." };
  }
}

export async function testSavedAiConnection(): Promise<Result> {
  try {
    await requireAdmin();
    const settings = await getAiSettings();
    if (!settings.api_key) return { success: false, error: "Save a Gemini API key first." };
    try {
      await testAiConnection(settings);
      await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
      revalidatePath("/admin/settings/ai-assistant");
      return { success: true, status: "active", lastError: null, hasApiKey: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed.";
      const status = /api key|permission|unauthenticated|invalid/i.test(message) ? "invalid" : "error";
      await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: status, last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      return { success: false, error: message, status, lastError: message, hasApiKey: true };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Connection test failed." };
  }
}