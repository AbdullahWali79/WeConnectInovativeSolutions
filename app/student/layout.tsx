import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";
import type { Profile } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  let profile = data as Profile | null;

  if (!profile) {
    redirect("/login?message=profile_pending");
  }

  if ((profile.role === "admin" || profile.role === "teacher") && profile.status === "approved") {
    redirect("/admin");
  }

  if (profile.status !== "approved") {
    redirect(`/login?message=${profile.status}`);
  }

  const { error: activityError } = await supabase.rpc("record_student_activity", {
    p_event_type: "heartbeat", p_path: "/student", p_active_seconds: 0,
  });
  const { data: checkedProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!checkedProfile || checkedProfile.status !== "approved") {
    redirect(`/login?message=${checkedProfile?.status ?? "profile_pending"}`);
  }
  if (activityError) throw new Error("Unable to verify student account access.");
  profile = checkedProfile as Profile;

  const branding = await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap());

  return <StudentShell profile={profile} branding={branding.student}>{children}</StudentShell>;
}
