"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function fetchTalentServices(profileId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("talent_services" as any)
    .select(`
      *,
      talent_reviews (*)
    `)
    .eq("talent_id", profileId);
    
  if (error) {
    console.error("Failed to fetch talent services:", error);
    return [];
  }
  return data;
}

export async function fetchAllTalentServices() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("talent_services" as any)
    .select("id, talent_id, title, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch all talent services:", error);
    return [];
  }
  return data;
}

export async function approveTalentProfile(profileId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_profiles" as any)
    .update({ status: "approved" })
    .eq("id", profileId);
  return { success: !error, error: error?.message };
}

export async function rejectTalentProfile(profileId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_profiles" as any)
    .update({ status: "rejected" })
    .eq("id", profileId);
  return { success: !error, error: error?.message };
}

export async function toggleTalentWhatsApp(profileId: string, currentStatus: boolean) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_profiles" as any)
    .update({ whatsapp_enabled: !currentStatus })
    .eq("id", profileId);
  return { success: !error, error: error?.message };
}

export async function updateTalentServiceLimit(profileId: string, limit: number) {
  const normalizedLimit = Math.min(4, Math.max(1, Math.trunc(Number(limit) || 1)));
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_profiles" as any)
    .update({ service_limit: normalizedLimit })
    .eq("id", profileId);
  return { success: !error, error: error?.message, serviceLimit: normalizedLimit };
}

export async function toggleTalentServiceStatus(serviceId: string, currentStatus: string) {
  const supabase = createSupabaseServiceClient();
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const { error } = await supabase
    .from("talent_services" as any)
    .update({ status: newStatus })
    .eq("id", serviceId);
  return { success: !error, error: error?.message, newStatus };
}

export async function deleteTalentService(serviceId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_services" as any)
    .delete()
    .eq("id", serviceId);
  return { success: !error, error: error?.message };
}

export async function updateTalentRequestStatus(reqId: string, newStatus: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("talent_requests" as any)
    .update({ status: newStatus })
    .eq("id", reqId);
  return { success: !error, error: error?.message };
}
