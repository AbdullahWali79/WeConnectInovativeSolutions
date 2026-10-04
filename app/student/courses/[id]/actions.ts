/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getStudentCourseData(courseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", course: null, lessons: [], progress: [] };

  // 1. Get Course
  const { data: course, error: courseError } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (courseError || !course) return { error: "Course not found", course: null, lessons: [], progress: [] };

  // 2. Get Lessons
  const { data: lessons, error: lessonsError } = await (supabase.from("course_lessons" as any).select("*").eq("course_id", courseId).order("display_order"));
  if (lessonsError) return { error: lessonsError.message, course: null, lessons: [], progress: [] };

  // 3. Get Progress
  const { data: progress, error: progressError } = await (supabase.from("student_course_progress" as any).select("lesson_id").eq("course_id", courseId).eq("student_id", user.id));
  
  return {
    error: null,
    course,
    lessons: lessons || [],
    progress: (progress || []).map((p: any) => p.lesson_id)
  };
}

export async function markLessonComplete(courseId: string, lessonId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await (supabase.from("student_course_progress" as any).insert({
    student_id: user.id,
    course_id: courseId,
    lesson_id: lessonId
  }));

  if (error) {
    if (error.code === '23505') return { ok: true }; // Already completed (unique constraint)
    return { ok: false, error: error.message };
  }

  revalidatePath(`/student/courses/${courseId}`);
  return { ok: true };
}
