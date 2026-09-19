"use server";

import { createSupabasePublicClient } from "@/lib/supabase/public";

function normalizeUrlForComparison(urlStr: string) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.substring(4);
    
    // Removing trailing slashes and common indexing files from path
    let path = url.pathname;
    if (path.endsWith('/')) path = path.slice(0, -1);
    if (path.endsWith('/index.html') || path.endsWith('/index.php')) {
      path = path.substring(0, path.lastIndexOf('/'));
    }
    
    return host + path;
  } catch {
    return urlStr.toLowerCase().trim();
  }
}

export async function submitPublicAITool(formId: string, payload: {
  categoryId: string;
  categorySnapshot: string;
  submitterName: string;
  submitterPhone: string;
  toolName: string;
  toolUrl: string;
  benefits: string;
  imageUrl: string;
  youtubeUrl?: string;
}) {
  try {
    const supabase = createSupabasePublicClient();
    
    // Validate inputs
    const toolUrlStr = payload.toolUrl.trim();
    if (!toolUrlStr) return { ok: false as const, error: "Tool URL is required." };
    
    try { new URL(toolUrlStr); } catch { return { ok: false as const, error: "Please enter a valid URL." }; }

    const normalizedNew = normalizeUrlForComparison(toolUrlStr);

    // 1. Check duplicates in ai_tools (published)
    const { data: publishedTools, error: pubError } = await supabase.from("ai_tools").select("url");
    if (pubError) throw pubError;
    
    for (const pt of publishedTools) {
      if (normalizeUrlForComparison(pt.url) === normalizedNew) {
        return { ok: false as const, error: "This tool has already been published to the AI Tools directory." };
      }
    }

    // 2. Check duplicates in submissions
    const { data: pendingTools, error: penError } = await supabase.from("public_ai_tool_submissions").select("tool_url, status");
    if (penError) throw penError;

    for (const pt of pendingTools) {
      if (normalizeUrlForComparison(pt.tool_url) === normalizedNew) {
        if (pt.status === "rejected") {
           // We might allow submitting again if rejected, or just block it. 
           // Let's block it for now.
           return { ok: false as const, error: "This tool was already submitted previously but was not accepted." };
        }
        return { ok: false as const, error: "This tool has already been submitted and is pending review." };
      }
    }

    // 3. Insert submission
    const { error: insertError } = await supabase.from("public_ai_tool_submissions").insert({
      form_id: formId,
      category_id: payload.categoryId,
      category_snapshot: payload.categorySnapshot,
      submitter_name: payload.submitterName.trim(),
      submitter_phone: payload.submitterPhone.trim(),
      tool_name: payload.toolName.trim(),
      tool_url: toolUrlStr,
      benefits: payload.benefits.trim(),
      image_url: payload.imageUrl.trim(),
      youtube_url: payload.youtubeUrl?.trim() || null,
      status: "pending"
    });

    if (insertError) throw insertError;

    // 4. Get count for this phone number
    const { count, error: countError } = await supabase
      .from("public_ai_tool_submissions")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("submitter_phone", payload.submitterPhone.trim());

    if (countError) throw countError;

    return { ok: true as const, totalSubmitted: count || 1 };

  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to submit tool." };
  }
}
