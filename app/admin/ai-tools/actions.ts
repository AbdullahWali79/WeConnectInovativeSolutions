"use server";
import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateAITool } from "@/lib/ai-tools";

export async function getAllAITools() { await requireAdminOnly(); const { data, error } = await createSupabaseServiceClient().from("ai_tools").select("*").order("created_at", { ascending: false }); if (error) throw new Error(error.message); return data ?? []; }
export async function createAdminAITool(input: { name: string; url: string; benefits: string; image_url: string }) { const admin = await requireAdminOnly(); const validation = validateAITool(input); if (!validation.ok) return validation; const { error } = await createSupabaseServiceClient().from("ai_tools").insert({ ...validation.data, submitted_by: admin.id, submitter_email: admin.email ?? null, status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), published_at: new Date().toISOString() }); if (error) return { ok: false, error: error.code === "23505" ? "This AI tool URL already exists." : error.message }; refresh(); return { ok: true }; }
export async function reviewAITool(id: string, status: "approved" | "rejected", admin_note: string) { const admin = await requireAdminOnly(); const now = new Date().toISOString(); const { error } = await createSupabaseServiceClient().from("ai_tools").update({ status, admin_note: admin_note.trim() || null, reviewed_by: admin.id, reviewed_at: now, published_at: status === "approved" ? now : null, updated_at: now }).eq("id", id); if (error) return { ok: false, error: error.message }; refresh(); return { ok: true }; }
export async function deleteAITool(id: string) { await requireAdminOnly(); const { error } = await createSupabaseServiceClient().from("ai_tools").delete().eq("id", id); if (error) return { ok: false, error: error.message }; refresh(); return { ok: true }; }
function refresh() { revalidatePath("/ai-tools"); revalidatePath("/student/ai-tools"); revalidatePath("/admin/ai-tools"); }
