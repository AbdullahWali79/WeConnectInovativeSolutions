"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_MISTRAL_SETTINGS, getMistralSettings, testMistralConnection } from "@/lib/ai-assistant/mistral";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { MistralAssistantSettings } from "@/lib/supabase/types";

type Input = { apiKey?: string; model: string; enabled: boolean; systemInstructions: string };
type Result = { success: boolean; error?: string; status?: MistralAssistantSettings["validation_status"]; lastError?: string | null; hasApiKey?: boolean };

async function requireAdmin() {
  const profile = await getCurrentUserProfile();
  if (profile.role !== "admin" || profile.status !== "approved") throw new Error("Only an approved admin can manage Mistral settings.");
  return profile;
}

export async function saveMistralSettings(input: Input): Promise<Result> {
  try {
    const profile = await requireAdmin();
    const current = await getMistralSettings().catch(() => DEFAULT_MISTRAL_SETTINGS);
    const apiKey = input.apiKey?.trim() || current.api_key;
    if (input.enabled && !apiKey) return { success: false, error: "Add a Mistral API key before enabling fallback." };
    const changedKey = Boolean(input.apiKey?.trim());
    const payload = {
      id: true,
      api_key: apiKey,
      model: input.model.trim() || DEFAULT_MISTRAL_SETTINGS.model,
      enabled: input.enabled,
      system_instructions: input.systemInstructions.trim() || null,
      validation_status: changedKey ? "not_tested" as const : current.validation_status,
      last_error: changedKey ? null : current.last_error,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await createSupabaseServiceClient().from("mistral_assistant_settings").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/settings/mistral");
    return { success: true, status: payload.validation_status, lastError: payload.last_error, hasApiKey: Boolean(apiKey) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save Mistral settings." };
  }
}

export async function testSavedMistralConnection(): Promise<Result> {
  try {
    await requireAdmin();
    const settings = await getMistralSettings();
    if (!settings.api_key) return { success: false, error: "Save a Mistral API key first." };
    try {
      await testMistralConnection(settings);
      await createSupabaseServiceClient().from("mistral_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
      revalidatePath("/admin/settings/mistral");
      return { success: true, status: "active", lastError: null, hasApiKey: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed.";
      const status = /api key|authentication|invalid key|rejected|unauthorized/i.test(message) ? "invalid" : "error";
      await createSupabaseServiceClient().from("mistral_assistant_settings").update({ validation_status: status, last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      return { success: false, error: message, status, lastError: message, hasApiKey: true };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Connection test failed." };
  }
}
