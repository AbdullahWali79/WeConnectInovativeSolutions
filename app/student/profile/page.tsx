import { EmptyState } from "@/components/empty-state";
import { StudentProfileManager } from "@/components/student/student-profile-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export default async function StudentProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <EmptyState title="Profile unavailable" description="Sign in to manage your profile links." icon="person" />;
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "student") {
    return <EmptyState title="Profile unavailable" description="Student profile could not be loaded." icon="person" />;
  }

  return <StudentProfileManager profile={profile} />;
}
