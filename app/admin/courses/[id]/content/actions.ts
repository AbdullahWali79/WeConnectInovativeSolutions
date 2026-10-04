/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDriveAccessToken, getDriveSettings } from "@/lib/google-drive";

// Ensure course exists
async function verifyCourse(courseId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("courses").select("id").eq("id", courseId).single();
  if (error || !data) throw new Error("Course not found");
}

export async function getCourseLessons(courseId: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  // Using 'as any' to avoid TS errors for new tables
  const { data, error } = await (supabase.from("course_lessons" as any).select("*").eq("course_id", courseId).order("display_order"));
  if (error) return { error: error.message, data: null };
  return { data: data || [], error: null };
}

export async function importFromGoogleDriveFolder(courseId: string, folderUrl: string) {
  await requireAdminOnly();
  await verifyCourse(courseId);

  // Extract folder ID from URL
  let folderId = "";
  const match = folderUrl.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) folderId = match[1];
  else {
    const idMatch = folderUrl.match(/id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) folderId = idMatch[1];
  }

  if (!folderId) {
    return { ok: false, error: "Invalid Google Drive Folder URL." };
  }

  try {
    const token = await getDriveAccessToken();
    
    // Fetch files in folder (video only)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'video/'&fields=files(id,name)&orderBy=name`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json();
      return { ok: false, error: err.error?.message || "Failed to fetch from Google Drive." };
    }

    const { files } = await res.json();
    if (!files || files.length === 0) {
      return { ok: false, error: "No video files found in this folder." };
    }

    const supabase = createSupabaseServiceClient();

    // Get current max display_order
    const { data: existing } = await (supabase.from("course_lessons" as any).select("display_order").eq("course_id", courseId).order("display_order", { ascending: false }).limit(1));
    let startOrder = existing && existing.length > 0 ? (existing[0] as any).display_order + 1 : 1;

    const inserts = files.map((file: any) => ({
      course_id: courseId,
      title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
      drive_file_id: file.id,
      display_order: startOrder++
    }));

    const { error } = await (supabase.from("course_lessons" as any).insert(inserts));
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/courses/${courseId}/content`);
    return { ok: true, count: files.length };
  } catch (e: any) {
    return { ok: false, error: e.message || "An unexpected error occurred." };
  }
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await (supabase.from("course_lessons" as any).delete().eq("id", lessonId));
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/courses/${courseId}/content`);
  return { ok: true };
}

export async function reorderLessons(courseId: string, orderedIds: string[]) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  
  // Need to update one by one for simple reorder
  for (let i = 0; i < orderedIds.length; i++) {
    await (supabase.from("course_lessons" as any).update({ display_order: i + 1 }).eq("id", orderedIds[i]));
  }

  revalidatePath(`/admin/courses/${courseId}/content`);
  return { ok: true };
}
