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
  servicesRequired: PublicClientHuntService[];
  notes?: string;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

function pakistanDayRange() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const start = new Date(`${date}T00:00:00+05:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function motivation(completed: number, target: number, name: string) {
  const remaining = Math.max(target - completed, 0);
  if (completed >= target) return `Excellent ${name}! Aaj ka target complete ho gaya. Aap ki consistency hi aap ki success banegi!`;
  if (completed === 0) return `${name}, har successful client journey pehli search se shuru hoti hai. Energy ke sath aaj ka pehla lead find karein!`;
  if (remaining === 1) return `Great work ${name}! Sirf 1 client aur — aap target complete karne ke bohat qareeb hain!`;
  return `Shabash ${name}! Momentum bana hua hai. ${remaining} aur quality clients find karein aur aaj ka target complete karein!`;
}

async function progressData(formId: string, phone: string, name: string) {
  const supabase = createSupabaseServiceClient();
  const { data: form } = await supabase.from("public_client_hunt_forms").select("daily_target").eq("id", formId).maybeSingle();
  const target = Math.max(form?.daily_target ?? 3, 1);
  const { start, end } = pakistanDayRange();
  const { data } = await supabase.from("public_client_hunt_submissions").select("submitter_phone").eq("form_id", formId).gte("submitted_at", start).lt("submitted_at", end);
  const normalized = normalizePhone(phone);
  const completed = (data ?? []).filter((item) => normalizePhone(item.submitter_phone) === normalized).length;
  return { completed, target, remaining: Math.max(target - completed, 0), message: motivation(completed, target, name.trim() || "Student") };
}

export async function getGuestClientHuntProgress(formId: string, phone: string, name: string) {
  if (!formId || normalizePhone(phone).length < 7 || !name.trim()) return { success: false as const };
  return { success: true as const, progress: await progressData(formId, phone, name) };
}

export async function submitGuestClientHunt(input: GuestClientHuntInput) {
  const submitterName = input.submitterName.trim();
  const submitterPhone = input.submitterPhone.trim();
  const phoneDigits = normalizePhone(submitterPhone);
  const websiteUrl = input.websiteUrl.trim();
  const clientGmbUrl = input.clientGmbUrl?.trim() || "";
  const clientPhone = input.clientPhone?.trim() || "";

  const keywordText = input.keywordText?.trim() || "";
  if (!submitterName || phoneDigits.length < 7 || !websiteUrl || !clientGmbUrl || normalizePhone(clientPhone).length < 7 || input.clientHasWhatsapp === null || input.clientHasWhatsapp === undefined || (!input.keywordId && !keywordText)) {
    return { success: false as const, error: "Name, phone, website, client GMB URL, client phone, WhatsApp status and keyword are required." };
  }
  const servicesRequired = [...new Set(input.servicesRequired ?? [])];
  if (servicesRequired.length === 0 || servicesRequired.some((service) => !PUBLIC_CLIENT_HUNT_SERVICES.some((item) => item.value === service))) {
    return { success: false as const, error: "Please select at least one valid required service." };
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
    client_phone: clientPhone,
    client_has_whatsapp: input.clientHasWhatsapp,
    service_required: servicesRequired[0],
    services_required: servicesRequired,
    notes: input.notes?.trim() || null,
  });
  if (error) return { success: false as const, error: "Submission could not be saved. Please try again." };
  return { success: true as const, progress: await progressData(input.formId, submitterPhone, submitterName) };
}
