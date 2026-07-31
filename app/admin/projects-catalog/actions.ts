"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function importProjects(courseId: string, projects: { title: string; description: string }[]) {
  const supabase = await createSupabaseServerClient();
  
  const payloads = projects.map(p => ({
    course_id: courseId,
    title: p.title,
    description: p.description
  }));

  const { error } = await supabase.from("course_projects").insert(payloads);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/admin/projects-catalog");
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { error } = await supabase.from("course_projects").delete().eq("id", projectId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/admin/projects-catalog");
  return { success: true };
}

export async function updateProject(projectId: string, title: string, description: string) {
  const supabase = await createSupabaseServerClient();
  
  const { error } = await supabase.from("course_projects").update({ title, description }).eq("id", projectId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/admin/projects-catalog");
  return { success: true };
}
