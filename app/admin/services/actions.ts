"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOnly } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { serviceSlug } from "@/lib/services";
import type { Service } from "@/lib/supabase/types";

export type ServiceInput = Pick<Service, "title" | "slug" | "category" | "icon" | "short_description" | "description" | "highlights" | "cta_label" | "cta_link" | "featured" | "status" | "display_order">;

function validate(input: ServiceInput) {
  const data = {
    ...input,
    title: input.title.trim(),
    slug: serviceSlug(input.slug || input.title),
    category: input.category.trim(),
    icon: input.icon.trim() || "design_services",
    short_description: input.short_description.trim(),
    description: input.description.trim(),
    highlights: input.highlights.map((item) => item.trim()).filter(Boolean),
    cta_label: input.cta_label.trim() || "Discuss your project",
    cta_link: input.cta_link.trim() || "/contact",
    display_order: Number(input.display_order) || 0,
    updated_at: new Date().toISOString(),
  };
  if (!data.title || !data.slug || !data.category || !data.short_description || !data.description) return { error: "Title, category, short description and full description are required." };
  return { data };
}

export async function getAdminServices() {
  await requireAdminOnly();
  const { data, error } = await createSupabaseServiceClient().from("services").select("*").order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function saveService(id: string | null, input: ServiceInput) {
  await requireAdminOnly();
  const result = validate(input);
  if (!result.data) return { ok: false, error: result.error };
  const supabase = createSupabaseServiceClient();
  const request = id ? supabase.from("services").update(result.data).eq("id", id) : supabase.from("services").insert(result.data);
  const { error } = await request;
  if (error) return { ok: false, error: error.code === "23505" ? "Service slug must be unique." : error.message };
  revalidatePath("/services");
  revalidatePath("/admin/services");
  return { ok: true };
}

export async function deleteService(id: string) {
  await requireAdminOnly();
  const { error } = await createSupabaseServiceClient().from("services").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/services");
  revalidatePath("/admin/services");
  return { ok: true };
}
