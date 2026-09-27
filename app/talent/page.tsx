/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicHeader } from "@/components/public/public-header";
import { TalentMarketplace } from "@/components/public/talent-marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
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
      talent_profiles (*)
    `)
    .eq("status", "active")
    .eq("talent_profiles.status", "approved");

  // Filter out any where the profile might be missing or not approved (Supabase sometimes returns null for the joined record if it doesn't match the inner eq)
  const validServices = (servicesData || []).filter(
    (s: any) => s.talent_profiles && s.talent_profiles.status === "approved"
  );

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <PublicHeader />
      <div className="flex-1">
        <TalentMarketplace services={validServices} />
      </div>
      <footer className="border-t py-12" style={{ backgroundColor: "var(--wc-bg)", color: "var(--wc-on-surface-variant)", borderColor: "color-mix(in srgb, var(--wc-on-bg) 5%, transparent)" }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="text-xl font-bold" style={{ color: "var(--wc-on-bg)" }}>We Connect Innovative Solutions Pvt. Ltd.</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <Link href="/internships" className="transition-colors hover:text-[var(--wc-secondary)]">Looking for Internships?</Link>
            <Link href="/contact" className="transition-colors hover:text-[var(--wc-secondary)]">Contact Us</Link>
          </div>
          <p className="text-center text-sm lg:text-right">
            &copy; 2026 We Connect Innovative Solutions Pvt. Ltd. All rights reserved.{" "}
            <a href={CONTACT_EMAIL_HREF} className="hover:underline" style={{ color: "var(--wc-secondary)" }}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </footer>
    </main>
  );
}


