import { redirect } from "next/navigation";
import { BrandingSettings } from "@/components/admin/branding-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";
import type { Profile } from "@/lib/supabase/types";

export const metadata = {
  title: "Branding Settings | Admin | WeConnect",
  description: "Manage one shared logo and separate color schemes for landing, admin, and student areas.",
};

export default async function BrandingSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/settings/branding");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  const branding = await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap());

  return <BrandingSettings initialSettings={branding} />;
}
