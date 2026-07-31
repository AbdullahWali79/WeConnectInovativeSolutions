"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("student_videos")
    .update({
      status,
      admin_feedback: feedback || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", videoId)
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating video status:", error);
    return { error: error?.message || "Failed to update video. Check permissions." };
  }

  revalidatePath("/admin/videos");
  revalidatePath("/admin/videos/" + videoId);
  revalidatePath("/videos"); // revalidate public page too
  
  return { success: true };
}
