import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { firstAllowedAdminRoute } from "@/lib/admin-landing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultWhatsAppSettings } from "@/lib/whatsapp/settings";

export default async function AdminPage() {
  const access = await requirePermissionPage("/admin", "dashboard.view");

  if (!access.granted) {
    // Teachers are often granted a single module (e.g. Social Media Campaigns)
    // and no dashboard. Send them to the first module they can open instead of
    // an "Access denied" wall right after login.
    const landing = firstAllowedAdminRoute(access.permissions);
    if (landing && landing !== "/admin") redirect(landing);
    return <AccessDenied description="Dashboard access has not been enabled for this teacher account." />;
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
    <AdminDashboard
      currentRole={access.profile.role}
      permissions={access.permissions}
      approvedStudentMessageTemplate={settings.approved_student_message_template}
    />
  );
}
