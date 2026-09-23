"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminOnly } from "@/lib/admin-access";

export async function getSimulationCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("simulation_categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching simulation categories:", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function getSimulations() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("simulations")
    .select("*, simulation_categories(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching simulations:", error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function createSimulationCategory(formData: FormData) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const name = formData.get("name") as string;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  const { error } = await (supabase as any).from("simulation_categories").insert({
    name,
    slug,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/admin/simulations");
  return { success: true };
}

export async function createSimulation(formData: FormData) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const title = formData.get("title") as string;
  const category_id = formData.get("category_id") as string;
  const html_script = formData.get("html_script") as string;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const { error } = await (supabase as any).from("simulations").insert({
    title,
    slug,
    category_id,
    html_script,
    is_published: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/simulations");
  return { success: true };
}

export async function updateSimulation(id: string, formData: FormData) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const title = formData.get("title") as string;
  const category_id = formData.get("category_id") as string;
  const html_script = formData.get("html_script") as string;

  const { error } = await (supabase as any).from("simulations").update({
    title,
    category_id,
    html_script,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/simulations");
  return { success: true };
}

export async function getSimulationById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}
