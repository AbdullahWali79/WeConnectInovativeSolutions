import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { GuestClientHuntForm } from "@/components/public/guest-client-hunt-form";
import type { PublicClientHuntForm, PublicClientHuntKeyword } from "@/lib/supabase/types";

export default async function PublicClientHuntFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("public_client_hunt_forms").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) notFound();
  const form = data as PublicClientHuntForm;
  const { data: keywordData } = await supabase.from("public_client_hunt_keywords").select("*").eq("form_id", form.id).eq("is_active", true).order("keyword");
  const keywords = (keywordData ?? []) as PublicClientHuntKeyword[];

  return <main className="min-h-screen bg-background px-4 py-10 text-on-background">
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 text-center"><p className="text-sm font-black uppercase tracking-[0.2em] text-secondary">We Connect Innovative Solutions</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{form.title}</h1><p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">{form.description || "Find a potential client and submit the lead details below."}</p></div>
      <GuestClientHuntForm form={form} keywords={keywords} />
    </div>
  </main>;
}
