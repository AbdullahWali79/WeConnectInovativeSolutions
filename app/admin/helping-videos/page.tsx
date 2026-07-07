import { redirect } from "next/navigation";
import { HelpingVideosManager } from "@/components/admin/helping-videos-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export default async function AdminHelpingVideosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/helping-videos");
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  return <HelpingVideosManager />;
}
