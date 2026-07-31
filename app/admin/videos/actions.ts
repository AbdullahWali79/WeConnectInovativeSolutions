"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStudentVideoStatus(
  videoId: string,
  status: "approved" | "rejected" | "revision_required",
  feedback?: string
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Ensure user is an admin or teacher
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("student_videos")
    .update({
      status,
      admin_feedback: feedback || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", videoId);

  if (error) {
    console.error("Error updating video status:", error);
    return { error: "Failed to update video" };
  }

  revalidatePath("/admin/videos");
  revalidatePath("/admin/videos/" + videoId);
  revalidatePath("/videos"); // revalidate public page too
  
  return { success: true };
}
