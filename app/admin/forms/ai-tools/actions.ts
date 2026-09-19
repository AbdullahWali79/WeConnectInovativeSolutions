"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

type InsertForm = Database["public"]["Tables"]["public_ai_tool_forms"]["Insert"];

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function createAIToolForm(title: string) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    
    const slug = slugify(title);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("public_ai_tool_forms")
      .insert({ title, slug, created_by: user?.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;
        const retry = await supabase.from("public_ai_tool_forms").insert({ title, slug: uniqueSlug, created_by: user?.id }).select().single();
        if (retry.error) return { ok: false as const, error: retry.error.message };
        revalidatePath("/admin/forms/ai-tools");
        return { ok: true as const, data: retry.data };
      }
      return { ok: false as const, error: error.message };
    }

    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const, data };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to create form." };
  }
}

export async function updateAIToolForm(id: string, payload: Partial<InsertForm>) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("public_ai_tool_forms").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update form." };
  }
}

export async function deleteAIToolForm(id: string) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("public_ai_tool_forms").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to delete form." };
  }
}

export async function createAIToolCategory(formId: string, category: string) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("public_ai_tool_categories").insert({ form_id: formId, category: category.trim() });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to create category." };
  }
}

export async function toggleAIToolCategory(id: string, isActive: boolean) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("public_ai_tool_categories").update({ is_active: isActive }).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update category." };
  }
}

export async function deleteAIToolCategory(id: string) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("public_ai_tool_categories").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to delete category." };
  }
}

export async function reviewAIToolSubmission(id: string, action: "publish" | "reject", note?: string) {
  try {
    await requirePermission("admin");
    const supabase = createSupabaseServiceClient();
    
    // get submission
    const { data: submission, error: subError } = await supabase.from("public_ai_tool_submissions").select("*").eq("id", id).single();
    if (subError || !submission) return { ok: false as const, error: "Submission not found." };
    if (submission.status !== "pending") return { ok: false as const, error: "Submission is already processed." };

    if (action === "publish") {
      // Create AI Tool
      const { data: aiTool, error: aiError } = await supabase.from("ai_tools").insert({
        name: submission.tool_name,
        url: submission.tool_url,
        category: submission.category_snapshot,
        benefits: submission.benefits,
        image_url: submission.image_url,
        youtube_url: submission.youtube_url,
        status: "approved",
        submitted_by: submission.submitter_name,
        submitter_email: submission.submitter_phone,
        published_at: new Date().toISOString(),
      }).select().single();
      
      if (aiError) return { ok: false as const, error: aiError.message };
      
      // Mark submission approved
      await supabase.from("public_ai_tool_submissions").update({ status: "approved", published_ai_tool_id: aiTool.id }).eq("id", id);
    } else {
      // mark rejected
      await supabase.from("public_ai_tool_submissions").update({ status: "rejected" }).eq("id", id);
    }

    revalidatePath("/admin/forms/ai-tools");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to process submission." };
  }
}
