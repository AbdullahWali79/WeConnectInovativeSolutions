import { redirect } from "next/navigation";
import { MistralSettings } from "@/components/admin/mistral-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { DEFAULT_AI_INSTRUCTIONS } from "@/lib/ai-assistant";
import { DEFAULT_MISTRAL_SETTINGS, getMistralSettings } from "@/lib/ai-assistant/mistral";

export default async function MistralSettingsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/settings/mistral");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  let setupError: string | null = null;
  const settings = await getMistralSettings().catch((error) => {
    setupError = error instanceof Error ? error.message : "Mistral settings table is not ready.";
    return DEFAULT_MISTRAL_SETTINGS;
  });
  return <MistralSettings initial={{ model: settings.model, enabled: settings.enabled, systemInstructions: settings.system_instructions?.trim() || DEFAULT_AI_INSTRUCTIONS, validationStatus: settings.validation_status, lastError: settings.last_error, hasApiKey: Boolean(settings.api_key) }} defaultInstructions={DEFAULT_AI_INSTRUCTIONS} setupError={setupError} />;
}
