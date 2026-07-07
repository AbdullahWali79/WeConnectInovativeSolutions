import { AccessDenied } from "@/components/admin/access-denied";
import { ApplicationsManager } from "@/components/admin/applications-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultWhatsAppSettings } from "@/lib/whatsapp/settings";

export default async function ApplicationsPage() {
  const access = await requirePermissionPage("/admin/applications", "applications.view");

  if (!access.granted) {
    return <AccessDenied description="Application access has not been enabled for this teacher account." />;
  }

  const supabase = await createSupabaseServerClient();
  const { data: settingsData } = await supabase
    .from("admin_notification_settings")
    .select("approved_student_message_template")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const settings = settingsData ?? getDefaultWhatsAppSettings(access.profile.id);

  return (
    <ApplicationsManager
      currentRole={access.profile.role}
      permissions={access.permissions}
      approvedStudentMessageTemplate={settings.approved_student_message_template}
    />
  );
}
