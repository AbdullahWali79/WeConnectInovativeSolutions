import { redirect } from "next/navigation";
import { WhatsAppAlertSettings } from "@/components/admin/whatsapp-alert-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminNotificationSettings, Profile } from "@/lib/supabase/types";
import { getDefaultWhatsAppSettings } from "@/lib/whatsapp/settings";

export default async function WhatsAppNotificationSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/notification-settings");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  let setupError: string | null = null;
  const { data: settingsData, error } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    setupError = error.message;
  }

  const settings = (settingsData as AdminNotificationSettings | null) ?? getDefaultWhatsAppSettings(profile.id);

  return (
    <WhatsAppAlertSettings initialSettings={settings} setupError={setupError} />
  );
}
