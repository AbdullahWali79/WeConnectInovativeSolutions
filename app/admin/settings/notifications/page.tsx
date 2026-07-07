import { redirect } from "next/navigation";
import { MailNotificationSettings } from "@/components/admin/mail-notification-settings";
import { getDefaultMailSettings, getOrCreateAdminMailSettings } from "@/lib/mail/mail-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export default async function NotificationSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/settings/notifications");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  let setupError: string | null = null;
  const settings = await getOrCreateAdminMailSettings(profile.id).catch((error) => {
    setupError = error instanceof Error ? error.message : "Mail settings database table is not ready.";
    return getDefaultMailSettings(profile.id);
  });

  return <MailNotificationSettings initialSettings={settings} setupError={setupError} />;
}
