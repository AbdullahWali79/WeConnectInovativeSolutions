"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TalentService } from "@/components/student/talent-portfolio-manager";

export type TalentServiceInput = {
  title: string;
  description: string;
  skills: string[];
  imageUrl: string;
  videoUrl: string;
};

type TalentProfileStatus = {
  id: string;
  status: string;
};

export async function addTalentService(input: TalentServiceInput) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Please sign in again before adding a service." };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const skills = input.skills.map((skill) => skill.trim()).filter(Boolean);

  if (!title || !description || skills.length === 0) {
    return { success: false, error: "Title, description, and skills are required." };
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabase
    .from("talent_profiles" as any)
    .select("id,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const talentProfile = profile as unknown as TalentProfileStatus | null;

  if (!talentProfile || talentProfile.status !== "approved") {
    return { success: false, error: "Your talent profile must be approved before adding services." };
  }

  const { count, error: countError } = await supabase
    .from("talent_services" as any)
    .select("id", { count: "exact", head: true })
    .eq("talent_id", user.id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if ((count || 0) >= 3) {
    return { success: false, error: "You can add maximum 3 services." };
  }

  const { data, error } = await supabase
    .from("talent_services" as any)
    .insert({
      talent_id: user.id,
      title,
      description,
      skills,
      image_url: input.imageUrl.trim(),
      video_url: input.videoUrl.trim(),
      status: "inactive",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/student/talent-portfolio");
  revalidatePath("/admin/talent-management");
  return { success: true, service: data as unknown as TalentService };
}
