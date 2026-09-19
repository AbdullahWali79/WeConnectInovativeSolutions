import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { GuestAIToolForm } from "@/components/public/guest-ai-tool-form";
import type { PublicAIToolForm, PublicAIToolCategory } from "@/lib/supabase/types";

export default async function PublicAIToolFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();
  
  const { data } = await supabase.from("public_ai_tool_forms").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) notFound();
  
  const form = data as PublicAIToolForm;
  
  const { data: categoryData } = await supabase.from("public_ai_tool_categories").select("*").eq("form_id", form.id).eq("is_active", true).order("created_at", { ascending: true });
  const categories = (categoryData ?? []) as PublicAIToolCategory[];

  return <main className="min-h-screen bg-background px-4 py-10 text-on-background">
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-secondary">We Connect Innovative Solutions</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">{form.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-on-surface-variant">{form.description || "Submit an AI Tool below."}</p>
      </div>
      <GuestAIToolForm form={form} categories={categories} />
    </div>
  </main>;
}
