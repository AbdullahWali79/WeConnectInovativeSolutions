import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { FeedbackGallery } from "@/components/public/feedback-gallery";
import { Icon } from "@/components/icon";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { feedbackAudienceOptions, feedbackCategoriesByAudience } from "@/lib/feedback";
import type { FeedbackEntry } from "@/lib/supabase/types";

export const revalidate = 300;

type SearchParams = {
  audience?: string;
  category?: string;
};

export default async function TestimonialsPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = createSupabasePublicClient();
  const { data: feedback, error } = await supabase
    .from("feedback_entries")
    .select("id,audience_type,category,name,rating,title,message,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const entries = (feedback ?? []) as Pick<FeedbackEntry, "id" | "audience_type" | "category" | "name" | "rating" | "title" | "message" | "created_at">[];
  const selectedAudience =
    resolvedSearchParams.audience === "student" || resolvedSearchParams.audience === "client" ? resolvedSearchParams.audience : "all";
  const allCategories = Array.from(
    new Set(feedbackAudienceOptions.flatMap((option) => feedbackCategoriesByAudience[option.value].map((item) => item.value))),
  );
  const availableCategories =
    selectedAudience === "all"
      ? allCategories
      : feedbackCategoriesByAudience[selectedAudience].map((item) => item.value);
  const selectedCategory = resolvedSearchParams.category && availableCategories.includes(resolvedSearchParams.category)
    ? resolvedSearchParams.category
    : "all";

  const filteredEntries = entries.filter((entry) => {
    const audienceMatch = selectedAudience === "all" || entry.audience_type === selectedAudience;
    const categoryMatch = selectedCategory === "all" || entry.category === selectedCategory;
    return audienceMatch && categoryMatch;
  });

  const audienceCounts = {
    all: entries.length,
    student: entries.filter((entry) => entry.audience_type === "student").length,
    client: entries.filter((entry) => entry.audience_type === "client").length,
  };

  const categoryCounts = (
    selectedAudience === "all"
      ? entries
      : entries.filter((entry) => entry.audience_type === selectedAudience)
  ).reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.category] = (accumulator[entry.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <main className="overflow-x-clip bg-[linear-gradient(180deg,#F7F9FF_0%,#EEF4FF_100%)] text-on-background">
      <PublicHeader />

      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,43,127,0.12),transparent_45%)]" />
        <div className="relative z-10 mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Icon name="favorite" className="text-sm" /> Approved Stories
            </div>
            <Link href="/feedback" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-surface shadow-card transition hover:opacity-95">
              <Icon name="send" className="text-sm" /> Share feedback
            </Link>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-[#0A2A72] sm:text-5xl">
              Testimonials and <span className="text-[#0A2A72]">approved feedback</span>
            </h1>
            <p className="mt-4 text-lg leading-8 text-[#4B628F]">
              Filter approved feedback by student or client categories. Only admin-approved stories appear here.
            </p>
          </div>

          <div className="mt-12">
            {error ? (
              <div className="rounded-2xl border border-orange-300 bg-orange-50 p-5 text-sm font-semibold text-orange-800">
                Feedback table is not ready yet. Please run the feedback migration in Supabase.
              </div>
            ) : (
              <FeedbackGallery
                entries={filteredEntries}
                selectedAudienceType={selectedAudience}
                selectedCategory={selectedCategory}
                audienceCounts={audienceCounts}
                categoryCounts={categoryCounts}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
