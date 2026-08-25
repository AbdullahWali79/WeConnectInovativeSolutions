import { createSupabasePublicClient } from "@/lib/supabase/public";
import { normalizeImageUrl } from "@/lib/image-url";

export type AIToolStatus = "pending" | "approved" | "rejected";
export type AITool = {
  id: string; name: string; url: string; benefits: string; image_url: string; youtube_url: string | null;
  submitted_by: string | null; submitter_email: string | null; status: AIToolStatus;
  admin_note: string | null; published_at: string | null; created_at: string;
};

export function validateAITool(input: { name: string; url: string; benefits: string; image_url: string; youtube_url?: string }) {
  const data = { name: input.name.trim(), url: input.url.trim(), benefits: input.benefits.trim(), image_url: input.image_url.trim(), youtube_url: input.youtube_url?.trim() || null };
  if (data.name.length < 2 || data.name.length > 120) return { ok: false as const, error: "Tool name must be 2 to 120 characters." };
  if (data.benefits.length < 10 || data.benefits.length > 2000) return { ok: false as const, error: "Benefits must be 10 to 2000 characters." };
  try { const url = new URL(data.url); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return { ok: false as const, error: "Enter a complete, valid tool URL." }; }
  try { const url = new URL(data.image_url); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return { ok: false as const, error: "Enter a valid public image or Google Drive URL." }; }
  if (data.youtube_url) { try { const url = new URL(data.youtube_url); if (!/^(www\.)?(youtube\.com|youtu\.be)$/i.test(url.hostname)) throw new Error(); } catch { return { ok: false as const, error: "Enter a valid YouTube video URL." }; } }
  return { ok: true as const, data };
}

export async function getApprovedAITools() {
  const { data, error } = await createSupabasePublicClient().from("ai_tools").select("*").eq("status", "approved").order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AITool[]).map((tool) => ({ ...tool, image_url: normalizeImageUrl(tool.image_url) ?? tool.image_url }));
}
