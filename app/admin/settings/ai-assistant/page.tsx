import { redirect } from "next/navigation";
import { AiAssistantSettings } from "@/components/admin/ai-assistant-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_AI_SETTINGS, getAiSettings } from "@/lib/ai-assistant";

export default async function AiAssistantSettingsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/settings/ai-assistant");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  let setupError: string | null = null;
  const settings = await getAiSettings().catch((error) => {
    setupError = error instanceof Error ? error.message : "AI settings table is not ready.";
    return DEFAULT_AI_SETTINGS;
  });
  return <AiAssistantSettings initial={{ provider: settings.provider, model: settings.model, enabled: settings.enabled, assistantName: settings.assistant_name, welcomeMessage: settings.welcome_message, systemInstructions: settings.system_instructions ?? "", validationStatus: settings.validation_status, lastError: settings.last_error, lastCheckedAt: settings.last_checked_at, hasApiKey: Boolean(settings.api_key) }} setupError={setupError} />;
}