"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateAITool } from "@/lib/ai-tools";

export async function getMyAITools() {
  const profile = await getCurrentUserProfile();
  if (profile.role !== "student" || profile.status !== "approved") throw new Error("Only approved students can submit AI tools.");
  const { data, error } = await createSupabaseServiceClient().from("ai_tools").select("*").eq("submitted_by", profile.id).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function submitAITool(input: { name: string; url: string; benefits: string; image_url: string }) {
  const profile = await getCurrentUserProfile();
  if (profile.role !== "student" || profile.status !== "approved") return { ok: false, error: "Only approved students can submit AI tools." };
  const validation = validateAITool(input);
  if (!validation.ok) return validation;
  const email = typeof profile.email === "string" ? profile.email : null;
  const { error } = await createSupabaseServiceClient().from("ai_tools").insert({ ...validation.data, submitted_by: profile.id, submitter_email: email, status: "pending" });
  if (error) return { ok: false, error: error.code === "23505" ? "This AI tool URL has already been submitted." : error.message };
  revalidatePath("/student/ai-tools"); revalidatePath("/admin/ai-tools");
  return { ok: true };
}

