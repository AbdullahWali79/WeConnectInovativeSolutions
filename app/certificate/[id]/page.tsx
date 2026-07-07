import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CertificatePageClient } from "@/components/public/certificate-page-client";
import type { ManualEnrollment, ManualEnrollmentComment, AdminSignatureSettings } from "@/lib/supabase/types";
import { getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabasePublicClient();
  const { data } = await supabase.from("manual_enrollments").select("full_name, course_name").eq("id", id).single();

  if (!data) return { title: "Certificate Not Found | WeConnect" };

  return {
    title: `${data.full_name} – Certificate | WeConnect`,
    description: `Official completion certificate for ${data.full_name} — ${data.course_name} at WeConnect Innovation.`,
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabasePublicClient();
  const branding = await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap());

  const [{ data: enrollment }, { data: comments }, { data: sigSettings }] = await Promise.all([
    supabase.from("manual_enrollments").select("*").eq("id", id).single(),
    supabase
      .from("manual_enrollment_comments")
      .select("*")
      .eq("enrollment_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("admin_signature_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!enrollment) notFound();

  return (
    <CertificatePageClient
      enrollment={enrollment as ManualEnrollment}
      comments={(comments as ManualEnrollmentComment[]) ?? []}
      signatureSettings={sigSettings as AdminSignatureSettings | null}
      branding={branding.landing}
    />
  );
}
