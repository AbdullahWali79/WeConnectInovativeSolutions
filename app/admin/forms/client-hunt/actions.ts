"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { publicClientHuntSlug } from "@/lib/public-client-hunt";

const refresh = () => revalidatePath("/admin/forms/client-hunt");

export async function savePublicClientHuntForm(input: { id?: string; title: string; slug: string; description: string; isActive: boolean; dailyTarget: number }) {
  const admin = await requireAdminOnly();
  const title = input.title.trim();
  const slug = publicClientHuntSlug(input.slug || title);
  if (!title || !slug) return { success: false as const, error: "Form title and a valid share-link slug are required." };
  const dailyTarget = Math.min(Math.max(Math.round(Number(input.dailyTarget) || 3), 1), 100);
  const payload = { title, slug, description: input.description.trim() || null, is_active: input.isActive, daily_target: dailyTarget, created_by: admin.id, updated_at: new Date().toISOString() };
  const supabase = createSupabaseServiceClient();
  let { error } = input.id ? await supabase.from("public_client_hunt_forms").update(payload).eq("id", input.id) : await supabase.from("public_client_hunt_forms").insert(payload);

  // Keep form editing functional while an older production database is still
  // waiting for the daily_target migration. The database will use target 3.
  if (error?.code === "PGRST204" && error.message.includes("daily_target")) {
    const legacyPayload = { title, slug, description: input.description.trim() || null, is_active: input.isActive, created_by: admin.id, updated_at: new Date().toISOString() };
    ({ error } = input.id ? await supabase.from("public_client_hunt_forms").update(legacyPayload).eq("id", input.id) : await supabase.from("public_client_hunt_forms").insert(legacyPayload));
  }
  if (error) return { success: false as const, error: error.code === "23505" ? "This share-link slug is already in use." : error.message };
  refresh();
  return { success: true as const };
}

export async function deletePublicClientHuntForm(id: string) {
  await requireAdminOnly();
  const { error } = await createSupabaseServiceClient().from("public_client_hunt_forms").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  refresh();
  return { success: true as const };
}

export async function addPublicClientHuntKeyword(formId: string, keywordValue: string) {
  await requireAdminOnly();
  const keyword = keywordValue.trim();
  if (!keyword) return { success: false as const, error: "Keyword is required." };
  const { error } = await createSupabaseServiceClient().from("public_client_hunt_keywords").insert({ form_id: formId, keyword });
  if (error) return { success: false as const, error: error.code === "23505" ? "This keyword already exists on the form." : error.message };
  refresh();
  return { success: true as const };
}

export async function togglePublicClientHuntKeyword(id: string, isActive: boolean) {
  await requireAdminOnly();
  const { error } = await createSupabaseServiceClient().from("public_client_hunt_keywords").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false as const, error: error.message };
  refresh();
  return { success: true as const };
}

export async function deletePublicClientHuntKeyword(id: string) {
  await requireAdminOnly();
  const { error } = await createSupabaseServiceClient().from("public_client_hunt_keywords").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  refresh();
  return { success: true as const };
}

export async function deletePublicClientHuntSubmission(id: string) {
  await requireAdminOnly();
  const { error } = await createSupabaseServiceClient().from("public_client_hunt_submissions").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  refresh();
  return { success: true as const };
}

export async function getOrCreatePublicClientHuntShortCode(formId: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: readError } = await supabase.from("public_client_hunt_forms").select("short_code").eq("id", formId).maybeSingle();
  if (readError) return { success: false as const, error: readError.message };
  if (existing?.short_code) return { success: true as const, shortCode: existing.short_code };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = crypto.randomUUID().replaceAll("-", "").slice(0, 6);
    const { error } = await supabase.from("public_client_hunt_forms").update({ short_code: shortCode, updated_at: new Date().toISOString() }).eq("id", formId).is("short_code", null);
    if (!error) {
      const { data } = await supabase.from("public_client_hunt_forms").select("short_code").eq("id", formId).single();
      if (data?.short_code) { refresh(); return { success: true as const, shortCode: data.short_code }; }
    }
    if (error?.code !== "23505") return { success: false as const, error: error?.message || "Tiny URL could not be created." };
  }
  return { success: false as const, error: "A unique tiny URL could not be created. Please try again." };
}
