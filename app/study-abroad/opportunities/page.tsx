"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Link from "next/link";
import Image from "next/image";

type Opportunity = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  original_link: string;
  created_at: string;
};

const typeFilters = [
  { value: "all", label: "All Types" },
  { value: "scholarship", label: "Scholarships", keywords: ["scholarship", "scholarships", "fully funded", "funded", "stipend"] },
  { value: "admission", label: "Admissions", keywords: ["admission", "admissions", "intake", "apply", "application"] },
  { value: "funding", label: "Funding", keywords: ["grant", "funding", "financial aid", "fee waiver", "tuition"] },
  { value: "fellowship", label: "Fellowships", keywords: ["fellowship", "research", "exchange"] },
];

const countryNames = [
  "Australia",
  "Canada",
  "China",
  "Finland",
  "France",
  "Germany",
  "Hungary",
  "Italy",
  "Japan",
  "Malaysia",
  "Netherlands",
  "Pakistan",
  "Saudi Arabia",
  "South Korea",
  "Turkey",
  "UAE",
  "UK",
  "United Kingdom",
  "USA",
  "United States",
];

const dateFilters = [
  { value: "all", label: "Any Time" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

export default function StudyAbroadOpportunitiesPage() {
  const supabase = createSupabaseBrowserClient();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    async function fetchOpportunities() {
      const { data, error } = await supabase
        .from("study_abroad_opportunities")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching opportunities:", error);
      } else {
        setOpportunities(data as Opportunity[]);
      }
      setIsLoading(false);
    }
    
    fetchOpportunities();
  }, [supabase]);

  const availableCountries = useMemo(() => {
    const countries = countryNames.filter((country) =>
      opportunities.some((opp) => `${opp.title} ${opp.description}`.toLowerCase().includes(country.toLowerCase()))
    );
    return Array.from(new Set(countries)).sort((a, b) => a.localeCompare(b));
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedType = typeFilters.find((filter) => filter.value === typeFilter);
    const selectedDateDays = dateFilter === "all" ? null : Number(dateFilter);
    const now = Date.now();

    return opportunities.filter((opp) => {
      const searchableText = `${opp.title} ${opp.description}`.toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      const matchesType = typeFilter === "all" || selectedType?.keywords?.some((keyword) => searchableText.includes(keyword));
      const matchesCountry = countryFilter === "all" || searchableText.includes(countryFilter.toLowerCase());
      const matchesDate = !selectedDateDays || now - new Date(opp.created_at).getTime() <= selectedDateDays * 24 * 60 * 60 * 1000;
      return matchesSearch && matchesType && matchesCountry && matchesDate;
    });
  }, [countryFilter, dateFilter, opportunities, searchQuery, typeFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCountryFilter("all");
    setDateFilter("all");
  };

  return (
    <main className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />
      
      <section className="relative overflow-hidden bg-[var(--wc-bg)] pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),transparent)]" />
        <div className="relative mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="flight_takeoff" className="text-sm" /> Study Abroad
            </div>
            <h1 className="text-4xl font-black leading-tight text-on-surface sm:text-5xl md:text-6xl">
              Latest Opportunities & Scholarships
            </h1>
            <p className="mt-6 text-lg leading-8 text-[var(--wc-on-surface-variant)]">
              Discover recently posted scholarships, university admissions alerts, and funding opportunities curated by our team.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Icon name="sync" className="animate-spin text-4xl text-primary" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-outline-variant/60 bg-[var(--wc-surface-lowest)] py-32 text-center">
              <Icon name="event_busy" className="text-5xl text-on-surface-variant" />
              <h2 className="mt-4 text-xl font-bold">No opportunities currently listed</h2>
              <p className="mt-2 max-w-md text-on-surface-variant">
                Check back soon! Our team regularly updates this page with new scholarships and university intakes.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-2xl border border-outline-variant/60 bg-[var(--wc-surface-lowest)] p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.7fr))_auto]">
                  <div className="relative">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search scholarships, universities, country..."
                      className="h-12 w-full rounded-xl border border-outline-variant/70 bg-white pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="h-12 rounded-xl border border-outline-variant/70 bg-white px-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {typeFilters.map((filter) => (
                      <option key={filter.value} value={filter.value}>{filter.label}</option>
                    ))}
                  </select>
                  <select
                    value={countryFilter}
                    onChange={(event) => setCountryFilter(event.target.value)}
                    className="h-12 rounded-xl border border-outline-variant/70 bg-white px-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="all">All Countries</option>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    className="h-12 rounded-xl border border-outline-variant/70 bg-white px-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {dateFilters.map((filter) => (
                      <option key={filter.value} value={filter.value}>{filter.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-12 rounded-xl border border-outline-variant/70 bg-white px-5 text-sm font-black text-on-surface-variant transition hover:border-primary hover:text-primary"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-3 text-sm font-semibold text-on-surface-variant">
                  Showing {filteredOpportunities.length} of {opportunities.length} opportunities
                </p>
              </div>

              {filteredOpportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-outline-variant/60 bg-[var(--wc-surface-lowest)] py-24 text-center">
                  <Icon name="filter_alt_off" className="text-5xl text-on-surface-variant" />
                  <h2 className="mt-4 text-xl font-bold">No opportunities match these filters</h2>
                  <button type="button" onClick={clearFilters} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredOpportunities.map((opp) => (
                <article 
                  key={opp.id} 
                  className="group flex flex-col overflow-hidden rounded-3xl border border-outline-variant/60 bg-[var(--wc-surface-lowest)] transition hover:-translate-y-1 hover:border-[var(--wc-primary)]/30 hover:shadow-xl"
                >
                  {opp.image_url ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                      <Image 
                        src={opp.image_url} 
                        alt={opp.title} 
                        fill 
                        className="object-cover transition duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-[var(--wc-primary)]/10 text-[var(--wc-primary)]">
                      <Icon name="school" className="text-5xl opacity-50" />
                    </div>
                  )}
                  
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--wc-secondary)]">
                      <Icon name="schedule" className="text-sm" />
                      {new Date(opp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-xl font-bold leading-tight">
                      {opp.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-on-surface-variant">
                      {opp.description}
                    </p>
                    
                    {opp.original_link && (
                      <div className="mt-6 border-t border-outline-variant/40 pt-4">
                        <a 
                          href={opp.original_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-bold text-primary transition group-hover:text-primary/80"
                        >
                          View Original Post <Icon name="arrow_outward" className="text-sm" />
                        </a>
                      </div>
                    )}
                  </div>
                </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="px-5 pb-20 md:px-margin-page">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[var(--wc-primary)] px-6 py-12 text-center text-white sm:px-12">
          <Icon name="connect_without_contact" className="text-4xl text-[#ffd24a]" />
          <h2 className="mt-5 text-3xl font-black sm:text-4xl">Ready to apply for these opportunities?</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">
            Don&apos;t miss out on these chances. Book a counselling session with our experts to start your application process.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact?topic=study-abroad" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd24a] px-7 py-4 text-sm font-black text-[#081735]">
              Book Student Counselling <Icon name="send" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
