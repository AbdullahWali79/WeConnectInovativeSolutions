"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getPublicSimulationCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("simulation_categories")
    .select("*, simulations(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public simulation categories:", error);
    return { success: false, error: error.message };
  }
  
  // Filter out categories that have no published simulations
  const filteredData = data?.map(cat => ({
    ...cat,
    simulations: cat.simulations.filter((s: { is_published: boolean }) => s.is_published)
  })).filter(cat => cat.simulations.length > 0);

  return { success: true, data: filteredData };
}

export async function getPublicSimulationBySlug(categorySlug: string, simulationSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("simulations")
    .select("*, simulation_categories!inner(*)")
    .eq("slug", simulationSlug)
    .eq("simulation_categories.slug", categorySlug)
    .eq("is_published", true)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function submitSimulationRequest(data: { userName: string; email: string; topic: string; description: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("simulation_requests").insert({
    user_name: data.userName,
    email: data.email,
    topic: data.topic,
    description: data.description,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
