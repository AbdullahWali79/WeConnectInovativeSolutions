/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmptyState } from "@/components/empty-state";
import { TalentPortfolioManager } from "@/components/student/talent-portfolio-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TalentPortfolioPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <EmptyState title="Not Signed In" description="Sign in to manage your talent portfolio." icon="person" />;
  }

  // Cast because talent_profiles might not be in the generated types yet
  const { data } = await supabase
    .from("talent_profiles" as any)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const talentProfile = data || null;

  return <TalentPortfolioManager talentProfile={talentProfile} userId={user.id} />;
}

