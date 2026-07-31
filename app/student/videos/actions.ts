"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitStudentVideo(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const video_url = formData.get("video_url") as string;

  if (!title || !video_url) {
    return { error: "Title and Video URL are required" };
  }

  const { error } = await supabase.from("student_videos").insert({
    student_id: user.id,
    title,
    description: description || null,
    video_url,
    status: "submitted",
  });

  if (error) {
    console.error("Error submitting video:", error);
    return { error: "Failed to submit video" };
  }

  revalidatePath("/student/videos");
  return { success: true };
}
