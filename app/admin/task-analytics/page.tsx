import { AccessDenied } from "@/components/admin/access-denied";
import { TaskAnalyticsDashboard } from "@/components/admin/task-analytics-dashboard";
import { getTaskAnalyticsDashboardData } from "@/app/admin/actions";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminSignatureSettings } from "@/lib/supabase/types";

export default async function TaskAnalyticsPage() {
  const access = await requirePermissionPage("/admin/task-analytics", "dashboard.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="Task analytics is available only for approved admin accounts." />;
  }

  const data = await getTaskAnalyticsDashboardData();
  const supabaseAdmin = createSupabaseServiceClient();
  const { data: signatureSettings } = await supabaseAdmin
    .from("admin_signature_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <TaskAnalyticsDashboard
      data={data}
      adminName={access.profile.full_name ?? access.profile.email ?? "Admin"}
      signatureSettings={(signatureSettings as AdminSignatureSettings | null) ?? null}
    />
  );
}
