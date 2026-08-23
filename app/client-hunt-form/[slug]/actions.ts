"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PUBLIC_CLIENT_HUNT_SERVICES } from "@/lib/public-client-hunt";
import type { PublicClientHuntService } from "@/lib/supabase/types";

export type GuestClientHuntInput = {
  formId: string;
  submitterName: string;
  submitterPhone: string;
  clientName?: string;
  websiteUrl: string;
  clientGmbUrl?: string;
  clientPhone?: string;
  clientHasWhatsapp?: boolean | null;
  keywordId?: string;
  keywordText?: string;
  serviceRequired: PublicClientHuntService;
  notes?: string;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

export async function submitGuestClientHunt(input: GuestClientHuntInput) {
  const submitterName = input.submitterName.trim();
  const submitterPhone = input.submitterPhone.trim();
  const phoneDigits = normalizePhone(submitterPhone);
  const websiteUrl = input.websiteUrl.trim();
  const clientGmbUrl = input.clientGmbUrl?.trim() || "";

  const keywordText = input.keywordText?.trim() || "";
  if (!submitterName || phoneDigits.length < 7 || !websiteUrl || (!input.keywordId && !keywordText)) {
    return { success: false as const, error: "Name, valid phone number, website URL and keyword are required." };
  }
  if (!PUBLIC_CLIENT_HUNT_SERVICES.some((item) => item.value === input.serviceRequired)) {
    return { success: false as const, error: "Please select a valid required service." };
  }
  try {
    new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
    if (clientGmbUrl) new URL(/^https?:\/\//i.test(clientGmbUrl) ? clientGmbUrl : `https://${clientGmbUrl}`);
  } catch {
    return { success: false as const, error: "Please enter valid website and GMB URLs." };
  }

  const supabase = createSupabaseServiceClient();
  const { data: profiles } = await supabase.from("profiles").select("id,phone").eq("role", "student");
  const registered = (profiles ?? []).some((profile) => normalizePhone(profile.phone ?? "") === phoneDigits);
  if (registered) {
    return {
      success: false as const,
      registered: true as const,
      error: "This phone number belongs to a registered student. Please submit client hunting from your student portal.",
    };
  }

  const { data: form } = await supabase.from("public_client_hunt_forms").select("id,is_active").eq("id", input.formId).maybeSingle();
  if (!form?.is_active) return { success: false as const, error: "This form is not accepting submissions." };

  const { data: activeKeywords } = await supabase.from("public_client_hunt_keywords").select("id,keyword,is_active,form_id").eq("form_id", input.formId).eq("is_active", true);
  const keyword = input.keywordId ? activeKeywords?.find((item) => item.id === input.keywordId) : null;
  if ((activeKeywords?.length ?? 0) > 0 && !keyword) return { success: false as const, error: "Please select an available keyword." };

  const { error } = await supabase.from("public_client_hunt_submissions").insert({
    form_id: input.formId,
    keyword_id: keyword?.id ?? null,
    keyword_snapshot: keyword?.keyword ?? keywordText,
    submitter_name: submitterName,
    submitter_phone: submitterPhone,
    client_name: input.clientName?.trim() || null,
    website_url: /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`,
    client_gmb_url: clientGmbUrl ? (/^https?:\/\//i.test(clientGmbUrl) ? clientGmbUrl : `https://${clientGmbUrl}`) : null,
    client_phone: input.clientPhone?.trim() || null,
    client_has_whatsapp: input.clientHasWhatsapp ?? null,
    service_required: input.serviceRequired,
    notes: input.notes?.trim() || null,
  });
  if (error) return { success: false as const, error: "Submission could not be saved. Please try again." };
  return { success: true as const };
}
