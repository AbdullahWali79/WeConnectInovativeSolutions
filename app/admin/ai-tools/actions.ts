"use server";
import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateAITool } from "@/lib/ai-tools";

type ToolInput = { name: string; url: string; category: string; benefits: string; image_url: string; youtube_url?: string };
export async function getAllAITools() { await requireAdminOnly(); const supabase = createSupabaseServiceClient(); const [{ data, error }, { data: admins, error: adminError }] = await Promise.all([supabase.from("ai_tools").select("*").order("created_at", { ascending: false }), supabase.from("profiles").select("id").eq("role", "admin")]); if (error) throw new Error(error.message); if (adminError) throw new Error(adminError.message); const adminIds = new Set((admins ?? []).map((row) => row.id)); return (data ?? []).map((row) => ({ ...row, submitter_role: row.submitted_by && adminIds.has(row.submitted_by) ? "admin" as const : "student" as const })); }
export async function createAdminAITool(input: ToolInput) { const admin = await requireAdminOnly(); const validation = validateAITool(input); if (!validation.ok) return validation; const now = new Date().toISOString(); const { error } = await createSupabaseServiceClient().from("ai_tools").insert({ ...validation.data, submitted_by: admin.id, submitter_email: admin.email ?? null, status: "approved", reviewed_by: admin.id, reviewed_at: now, published_at: now }); if (error) return { ok: false, error: error.code === "23505" ? "This AI tool URL already exists." : error.message }; refresh(); return { ok: true }; }
export async function updateAdminAITool(id: string, input: ToolInput) {
  await requireAdminOnly();
  const validation = validateAITool(input);
  if (!validation.ok) return validation;
  const { error } = await createSupabaseServiceClient().from("ai_tools").update({ ...validation.data, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "This AI tool URL already exists." : error.message };
  refresh();
  return { ok: true };
}
export async function importAdminAIToolsBulk(tools: ToolInput[]) {
  const admin = await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  let imported = 0;
  
  for (const tool of tools) {
    const validation = validateAITool(tool);
    if (!validation.ok) continue;
    
    // Check if URL already exists
    const { data: existing } = await supabase.from("ai_tools").select("id").eq("url", validation.data.url).single();
    if (existing) continue;
    
    const { error } = await supabase.from("ai_tools").insert({
      ...validation.data,
      submitted_by: admin.id,
      submitter_email: admin.email ?? null,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      published_at: null
    });
    
    if (!error) imported++;
  }
  
  refresh();
  return { ok: true, message: `Successfully imported ${imported} new AI tools.` };
}
export async function updateAIToolVideo(id: string, youtubeUrl: string) { await requireAdminOnly(); const value = youtubeUrl.trim(); if (value) { try { const url = new URL(value); if (!/^(www\.)?(youtube\.com|youtu\.be)$/i.test(url.hostname)) throw new Error(); } catch { return { ok: false, error: "Enter a valid YouTube video URL." }; } } const { error } = await createSupabaseServiceClient().from("ai_tools").update({ youtube_url: value || null, updated_at: new Date().toISOString() }).eq("id", id); if (error) return { ok: false, error: error.message }; refresh(); return { ok: true }; }
export async function reviewAITool(id: string, status: "approved" | "rejected", admin_note: string) { const admin = await requireAdminOnly(); const now = new Date().toISOString(); const { error } = await createSupabaseServiceClient().from("ai_tools").update({ status, admin_note: admin_note.trim() || null, reviewed_by: admin.id, reviewed_at: now, published_at: status === "approved" ? now : null, updated_at: now }).eq("id", id); if (error) return { ok: false, error: error.message }; refresh(); return { ok: true }; }
export async function deleteAITool(id: string) { await requireAdminOnly(); const { error } = await createSupabaseServiceClient().from("ai_tools").delete().eq("id", id); if (error) return { ok: false, error: error.message }; refresh(); return { ok: true }; }
function refresh() { revalidatePath("/ai-tools"); revalidatePath("/student/ai-tools"); revalidatePath("/admin/ai-tools"); }

export async function fetchAIToolMetadata(urlStr: string) {
  try {
    let target = urlStr.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    const url = new URL(target);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: "Failed to fetch URL" };
    
    const html = await res.text();
    
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
    const twImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i);
    
    let imageUrl = ogImageMatch?.[1] || twImageMatch?.[1] || "";
    
    if (imageUrl) {
      if (imageUrl.startsWith("/")) {
        imageUrl = url.origin + imageUrl;
      }
      return { ok: true, imageUrl };
    }
    
    return { ok: false, error: "No image found" };
  } catch (error) {
    return { ok: false, error: "Invalid URL or network error" };
  }
}
