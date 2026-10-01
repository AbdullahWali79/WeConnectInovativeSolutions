import { CmsElement, CmsLink } from "@/components/cms/cms-element";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicHeader } from "@/components/public/public-header";
import { TalentMarketplace } from "@/components/public/talent-marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

export default async function TalentPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch all active services with their associated approved profiles
  // Since we created raw SQL tables, we do a join manually or if Supabase can do it
  // Supabase syntax for joins: "*, talent_profiles(*)"
  const { data: servicesData } = await supabase
    .from("talent_services" as any)
    .select(`
      *,
      talent_profiles (*),
      talent_reviews (*)
    `)
    .eq("status", "active")
    .eq("talent_profiles.status", "approved");

  // Filter out any where the profile might be missing or not approved (Supabase sometimes returns null for the joined record if it doesn't match the inner eq)
  const validServices = (servicesData || []).filter(
    (s: any) => s.talent_profiles && s.talent_profiles.status === "approved"
  );

  return (
    <CmsElement cmsId="f820f709-0" as="main" className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader />
      <CmsElement cmsId="f820f709-1" as="div" className="flex-1">
        <TalentMarketplace services={validServices} />
      </CmsElement>
      <CmsElement cmsId="f820f709-2" as="footer" className="border-t py-12" style={{ backgroundColor: "var(--wc-bg)", color: "var(--wc-on-surface-variant)", borderColor: "color-mix(in srgb, var(--wc-on-bg) 5%, transparent)" }}>
        <CmsElement cmsId="f820f709-3" as="div" className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-between gap-6 lg:flex-row">
          <CmsElement cmsId="f820f709-4" as="div" className="text-xl font-bold" style={{ color: "var(--wc-on-bg)" }}>We Connect Innovative Solutions Pvt. Ltd.</CmsElement>
          <CmsElement cmsId="f820f709-5" as="div" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <CmsLink cmsId="f820f709-6" href="/internships" className="transition-colors hover:text-[var(--wc-secondary)]">Looking for Internships?</CmsLink>
            <CmsLink cmsId="f820f709-7" href="/contact" className="transition-colors hover:text-[var(--wc-secondary)]">Contact Us</CmsLink>
          </CmsElement>
          <CmsElement cmsId="f820f709-8" as="p" className="text-center text-sm lg:text-right">
            &copy; 2026 We Connect Innovative Solutions Pvt. Ltd. All rights reserved.{" "}
            <CmsElement cmsId="f820f709-9" as="a" href={CONTACT_EMAIL_HREF} className="hover:underline" style={{ color: "var(--wc-secondary)" }}>{CONTACT_EMAIL}</CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}


