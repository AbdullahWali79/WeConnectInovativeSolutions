"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function fetchPersonalPrompts() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  // Need to bypass TS error if relation doesn't exist in auto-generated types yet
  const { data, error } = await (supabase.from("admin_personal_prompts" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }));

  if (error) return { success: false, error: error.message };
  return { success: true, prompts: data || [] };
}

export async function addPersonalPrompt(data: any) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase.from("admin_personal_prompts" as any).insert({ ...data, user_id: user.id }));
  return { success: !error, error: error?.message };
}

export async function updatePersonalPrompt(id: string, data: any) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase.from("admin_personal_prompts" as any).update(data).eq("id", id).eq("user_id", user.id));
  return { success: !error, error: error?.message };
}

export async function deletePersonalPrompt(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase.from("admin_personal_prompts" as any).delete().eq("id", id).eq("user_id", user.id));
  return { success: !error, error: error?.message };
}
