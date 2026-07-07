import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";
import type { Profile } from "@/lib/supabase/types";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as Profile | null;

  if (!profile) {
    redirect("/login?message=profile_pending");
  }

  if ((profile.role === "admin" || profile.role === "teacher") && profile.status === "approved") {
    redirect("/admin");
  }

  if (profile.status !== "approved") {
    redirect(`/login?message=${profile.status}`);
  }

  const branding = await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap());

  return <StudentShell profile={profile} branding={branding.student}>{children}</StudentShell>;
}
