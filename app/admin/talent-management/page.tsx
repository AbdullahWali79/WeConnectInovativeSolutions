/* eslint-disable @typescript-eslint/no-explicit-any */
import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { TalentManager } from "@/components/admin/talent-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TalentManagementPage() {
  // We can restrict it to adminOnly or just use a generic permission like dashboard.view for teachers if needed.
  // We'll restrict to pure admin for now by checking role or using requirePermissionPage
  const access = await requirePermissionPage("/admin/talent-management", "dashboard.view");

  if (!access.granted || access.profile.role !== "admin") {
    return <AccessDenied description="You do not have permission to access Talent Management." />;
  }

  // Fetch pending applications and approved profiles
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("talent_profiles" as any)
    .select("*")
    .order("created_at", { ascending: false });

  return <TalentManager initialProfiles={profiles || []} />;
}

