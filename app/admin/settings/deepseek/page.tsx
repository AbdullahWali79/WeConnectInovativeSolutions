import { redirect } from "next/navigation";
import { DeepSeekSettings } from "@/components/admin/deepseek-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_AI_INSTRUCTIONS } from "@/lib/ai-assistant";
import { DEFAULT_DEEPSEEK_SETTINGS, getDeepSeekSettings } from "@/lib/ai-assistant/deepseek";

export default async function DeepSeekSettingsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/settings/deepseek");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  let setupError: string | null = null;
  const settings = await getDeepSeekSettings().catch((error) => {
    setupError = error instanceof Error ? error.message : "DeepSeek settings table is not ready.";
    return DEFAULT_DEEPSEEK_SETTINGS;
  });
  return <DeepSeekSettings initial={{ model: settings.model, enabled: settings.enabled, systemInstructions: settings.system_instructions?.trim() || DEFAULT_AI_INSTRUCTIONS, validationStatus: settings.validation_status, lastError: settings.last_error, hasApiKey: Boolean(settings.api_key) }} defaultInstructions={DEFAULT_AI_INSTRUCTIONS} setupError={setupError} />;
}
