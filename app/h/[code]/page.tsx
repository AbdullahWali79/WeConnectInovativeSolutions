import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { GuestClientHuntForm } from "@/components/public/guest-client-hunt-form";
import type { PublicClientHuntForm, PublicClientHuntKeyword } from "@/lib/supabase/types";

export default async function TinyClientHuntFormPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("public_client_hunt_forms").select("*").eq("short_code", code).eq("is_active", true).maybeSingle();
  if (!data) notFound();
  const form = data as PublicClientHuntForm;
  const { data: keywordData } = await supabase.from("public_client_hunt_keywords").select("*").eq("form_id", form.id).eq("is_active", true).order("created_at", { ascending: true });
  const keywords = (keywordData ?? []) as PublicClientHuntKeyword[];

  return <main className="min-h-screen bg-background px-3 py-6 text-on-background sm:px-4 sm:py-10"><div className="mx-auto max-w-3xl"><div className="mb-5 text-center sm:mb-7"><p className="text-xs font-black uppercase tracking-[0.16em] text-secondary sm:text-sm sm:tracking-[0.2em]">We Connect Innovative Solutions</p><h1 className="mt-3 text-2xl font-black leading-tight sm:text-5xl">{form.title}</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant sm:mt-4 sm:text-base">{form.description || "Find a potential client and submit the lead details below."}</p></div><GuestClientHuntForm form={form} keywords={keywords} /></div></main>;
}
