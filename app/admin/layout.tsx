import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePermissions } from "@/lib/admin-access";
import { getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";
import type { Profile } from "@/lib/supabase/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  const canAccessAdmin = profile?.status === "approved" && (profile.role === "admin" || profile.role === "teacher");

  if (!profile || !canAccessAdmin) {
    redirect("/student");
  }

  const permissions = await getEffectivePermissions(profile);
  const branding = await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap());

  return <AdminShell profile={profile} permissions={permissions} branding={branding.admin}>{children}</AdminShell>;
}
