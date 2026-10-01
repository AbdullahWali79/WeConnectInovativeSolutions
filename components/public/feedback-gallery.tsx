"use client";
import { CmsElement, CmsInstance, CmsLink } from "@/components/cms/cms-element";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import type { FeedbackAudienceType, FeedbackEntry } from "@/lib/supabase/types";
import { feedbackAudienceOptions, feedbackCategoriesByAudience, getFeedbackCategoryLabel } from "@/lib/feedback";
import { formatDate, formatRelativeTime } from "@/lib/utils";

type FeedbackRow = Pick<
  FeedbackEntry,
  "id" | "audience_type" | "category" | "name" | "rating" | "title" | "message" | "created_at"
>;

function StarRow({ rating }: { rating: number }) {
  return (
    <CmsElement cmsId="a22df45d-0" as="div" className="flex gap-1 text-[var(--wc-secondary)]">
      {Array.from({ length: 5 }).map((_, index) => (
        <CmsInstance key={index} instance={String(index)}><Icon key={index} name="star" className={`text-sm ${index < rating ? "opacity-100" : "opacity-25"}`} /></CmsInstance>
      ))}
    </CmsElement>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildAvatarGradient(entryId: string) {
  const palettes = [
    "from-[var(--wc-primary)] to-[#0033a0]",
    "from-[#0f766e] to-[#115e59]",
    "from-[#7c3aed] to-[#5b21b6]",
    "from-[#b45309] to-[#92400e]",
  ];
  const index = Math.abs(Array.from(entryId).reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palettes.length;
  return palettes[index];
}

function FeedbackCard({ entry, active = false }: { entry: FeedbackRow; active?: boolean }) {
  return (
    <CmsElement cmsId="a22df45d-1" as="article"
      className={`group relative h-full overflow-hidden rounded-[30px] border transition-all duration-700 ${
        active
          ? "border-[var(--wc-secondary)]/45 bg-[linear-gradient(180deg,#0b1c3d_0%,#08122a_100%)] shadow-[0_24px_80px_rgba(2,7,27,0.45)]"
          : "border-[var(--wc-outline-variant)] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.08)_100%)] shadow-[0_18px_54px_rgba(2,7,27,0.22)]"
      }`}
    >
      <CmsElement cmsId="a22df45d-2" as="div" className="pointer-events-none absolute inset-0">
        <CmsElement cmsId="a22df45d-3" as="div" className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_70%)] opacity-80" />
        <CmsElement cmsId="a22df45d-4" as="div" className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-[var(--wc-secondary)]/10 blur-3xl" />
        <CmsElement cmsId="a22df45d-5" as="div" className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-[var(--wc-primary)]/18 blur-3xl" />
      </CmsElement>

      <CmsElement cmsId="a22df45d-6" as="div" className="relative flex h-full flex-col p-5 md:p-6">
        <CmsElement cmsId="a22df45d-7" as="div" className="mb-5 flex items-start justify-between gap-4">
          <CmsElement cmsId="a22df45d-8" as="div" className="flex min-w-0 items-center gap-3">
            <CmsElement cmsId="a22df45d-9" as="div" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${buildAvatarGradient(entry.id)} text-sm font-black tracking-widest text-white shadow-lg`}>
              {getInitials(entry.name)}
            </CmsElement>

            <CmsElement cmsId="a22df45d-10" as="div" className="min-w-0">
              <CmsElement cmsId="a22df45d-11" as="div" className="flex flex-wrap items-center gap-2">
                <CmsElement cmsId="a22df45d-12" as="span" className={`text-xs font-bold uppercase tracking-[0.22em] ${active ? "text-[var(--wc-secondary)]" : "text-[#B8C8E8]"}`}>{entry.audience_type}</CmsElement>
                <CmsElement cmsId="a22df45d-13" as="span" className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  <Icon name="check" className="text-[12px]" />
                  Verified
                </CmsElement>
              </CmsElement>
              <CmsElement cmsId="a22df45d-14" as="h3" className="mt-1 whitespace-nowrap text-[18px] font-black leading-none text-white sm:text-[20px] md:text-[22px]">
                {entry.name}
              </CmsElement>
            </CmsElement>
          </CmsElement>

          <StarRow rating={entry.rating} />
        </CmsElement>

        <CmsElement cmsId="a22df45d-15" as="div" className="mb-4 flex flex-wrap gap-2">
          <CmsElement cmsId="a22df45d-16" as="span" className={`rounded-full border px-3 py-1 text-[11px] font-bold ${active ? "border-[var(--wc-primary)]/15 bg-[#eef4ff] text-[var(--wc-primary)]" : "border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)]"}`}>
            {entry.audience_type === "student" ? "Student review" : "Client review"}
          </CmsElement>
          <CmsElement cmsId="a22df45d-17" as="span" className={`rounded-full border px-3 py-1 text-[11px] font-bold ${active ? "border-[var(--wc-secondary)]/35 bg-[#fff7db] text-[#8a6400]" : "border-[var(--wc-secondary)]/20 bg-[var(--wc-secondary)]/12 text-[var(--wc-secondary)]"}`}>
            {getFeedbackCategoryLabel(entry.audience_type, entry.category)}
          </CmsElement>
        </CmsElement>

        <CmsElement cmsId="a22df45d-18" as="div" className={`mb-4 flex items-center gap-2 text-xs font-semibold ${active ? "text-[#B8C8E8]" : "text-[#9FB0D1]"}`}>
          <Icon name="schedule" className="text-sm" />
          <CmsElement cmsId="a22df45d-19" as="span">{formatRelativeTime(entry.created_at)}</CmsElement>
        </CmsElement>

        <CmsElement cmsId="a22df45d-20" as="div" className="flex-1">
          {entry.title ? <CmsElement cmsId="a22df45d-21" as="h4" className={`text-[28px] font-black leading-tight ${active ? "text-white" : "text-[#D6E1F5]"}`}>{entry.title}</CmsElement> : null}
          <CmsElement cmsId="a22df45d-22" as="p" className={`mt-4 text-sm leading-7 ${active ? "text-[#D6E1F5]" : "text-[#B8C8E8]"}`}>&ldquo;{entry.message}&rdquo;</CmsElement>
        </CmsElement>

        <CmsElement cmsId="a22df45d-23" as="div" className={`mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs ${active ? "text-[#B8C8E8]" : "text-[#9FB0D1]"}`}>
          <CmsElement cmsId="a22df45d-24" as="span" className="font-bold uppercase tracking-widest">Approved by admin</CmsElement>
          <CmsElement cmsId="a22df45d-25" as="span">{formatDate(entry.created_at)}</CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}

export function FeedbackGallery({
  entries,
  selectedAudienceType,
  selectedCategory,
  audienceCounts,
  categoryCounts,
}: {
  entries: FeedbackRow[];
  selectedAudienceType: FeedbackAudienceType | "all";
  selectedCategory: string;
  audienceCounts: Record<"all" | FeedbackAudienceType, number>;
  categoryCounts: Record<string, number>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const chipBase =
    "group inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const chipIdle = "border border-outline-variant bg-white !text-[#17335F] hover:border-[#0A2A72]/30 hover:bg-[#EEF4FF] hover:!text-[var(--wc-primary)] hover:shadow-sm";
  const chipActive = "border-transparent bg-primary text-white shadow-sm";
  const countBase = "inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums";
  const countIdle = "bg-surface-container-high text-on-surface-variant group-hover:bg-[var(--wc-surface-low)]";
  const countActive = "bg-white/20 text-white";

  const categories = useMemo(
    () =>
      selectedAudienceType === "all"
        ? Array.from(
            new Set(feedbackAudienceOptions.flatMap((option) => feedbackCategoriesByAudience[option.value].map((item) => item.value))),
          )
        : feedbackCategoriesByAudience[selectedAudienceType].map((item) => item.value),
    [selectedAudienceType],
  );

  function buildHref(nextAudience: FeedbackAudienceType | "all", nextCategory: string) {
    const params = new URLSearchParams();
    if (nextAudience !== "all") params.set("audience", nextAudience);
    if (nextCategory !== "all") params.set("category", nextCategory);
    const query = params.toString();
    return query ? `/testimonials?${query}` : "/testimonials";
  }

  function getCategoryCount(value: string) {
    return categoryCounts[value] ?? 0;
  }

  const visibleEntries = entries;

  const handleNext = useCallback(() => {
    if (visibleEntries.length === 0) return;
    setActiveIndex((current) => (current + 1) % visibleEntries.length);
  }, [visibleEntries.length]);

  const handlePrev = useCallback(() => {
    if (visibleEntries.length === 0) return;
    setActiveIndex((current) => (current - 1 + visibleEntries.length) % visibleEntries.length);
  }, [visibleEntries.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedAudienceType, selectedCategory, entries]);

  useEffect(() => {
    if (isPaused || visibleEntries.length < 2) return;
    const timer = window.setInterval(handleNext, 5000);
    return () => window.clearInterval(timer);
  }, [handleNext, isPaused, visibleEntries.length]);

  if (visibleEntries.length === 0) {
    return (
      <CmsElement cmsId="a22df45d-26" as="div">
        <CmsElement cmsId="a22df45d-27" as="div" className="mb-3 flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
          <CmsLink cmsId="a22df45d-28" href={buildHref("all", "all")} prefetch aria-pressed={selectedAudienceType === "all"} className={`${chipBase} ${selectedAudienceType === "all" ? chipActive : chipIdle}`}>
            <CmsElement cmsId="a22df45d-29" as="span">All</CmsElement>
            <CmsElement cmsId="a22df45d-30" as="span" className={`${countBase} ${selectedAudienceType === "all" ? countActive : countIdle}`}>{audienceCounts.all}</CmsElement>
          </CmsLink>
          {feedbackAudienceOptions.map((option) => (
            <CmsLink cmsId="a22df45d-31" instance={String(option.value)}
              key={option.value}
              href={buildHref(option.value, "all")}
              prefetch
              aria-pressed={selectedAudienceType === option.value}
              className={`${chipBase} ${selectedAudienceType === option.value ? chipActive : chipIdle}`}
            >
              <CmsElement cmsId="a22df45d-32" as="span">{option.label}</CmsElement>
              <CmsElement cmsId="a22df45d-33" as="span" className={`${countBase} ${selectedAudienceType === option.value ? countActive : countIdle}`}>{audienceCounts[option.value]}</CmsElement>
            </CmsLink>
          ))}
        </CmsElement>

        <CmsElement cmsId="a22df45d-34" as="div" className="mb-8 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1">
          <CmsLink cmsId="a22df45d-35"
            href={buildHref(selectedAudienceType, "all")}
            prefetch
            aria-pressed={selectedCategory === "all"}
            className={`${chipBase} ${selectedCategory === "all" ? "border-transparent bg-surface-container-high text-on-surface shadow-sm" : chipIdle}`}
          >
            <CmsElement cmsId="a22df45d-36" as="span">All Categories</CmsElement>
            <CmsElement cmsId="a22df45d-37" as="span" className={`${countBase} ${selectedCategory === "all" ? "bg-white text-on-surface" : countIdle}`}>{entries.length}</CmsElement>
          </CmsLink>
          {categories.map((value) => {
            const label =
              selectedAudienceType === "all"
                ? feedbackAudienceOptions
                    .flatMap((option) => feedbackCategoriesByAudience[option.value])
                    .find((item) => item.value === value)?.label ?? value
                : getFeedbackCategoryLabel(selectedAudienceType, value);

            return (
              <CmsLink cmsId="a22df45d-38" instance={String(value)}
                key={value}
                href={buildHref(selectedAudienceType, value)}
                prefetch
                aria-pressed={selectedCategory === value}
                className={`${chipBase} ${selectedCategory === value ? "border-transparent bg-secondary-container text-on-secondary-fixed shadow-sm" : chipIdle}`}
              >
                <CmsElement cmsId="a22df45d-39" as="span">{label}</CmsElement>
                <CmsElement cmsId="a22df45d-40" as="span" className={`${countBase} ${selectedCategory === value ? "bg-[var(--wc-surface-low)] text-on-secondary-fixed" : countIdle}`}>
                  {getCategoryCount(value)}
                </CmsElement>
              </CmsLink>
            );
          })}
        </CmsElement>

        <CmsElement cmsId="a22df45d-41" as="div" className="rounded-[28px] border border-[var(--wc-outline-variant)] bg-[linear-gradient(180deg,#081638_0%,#050d20_100%)] p-8 text-center text-on-surface shadow-[0_24px_70px_rgba(2,7,27,0.28)]">
          <Icon name="reviews" className="text-4xl text-[var(--wc-secondary)]" />
          <CmsElement cmsId="a22df45d-42" as="h3" className="mt-3 text-xl font-black">No approved feedback yet</CmsElement>
          <CmsElement cmsId="a22df45d-43" as="p" className="mt-2 text-sm text-[var(--wc-on-surface-variant)]">Approved stories will appear here after admin review.</CmsElement>
        </CmsElement>
      </CmsElement>
    );
  }

  const total = visibleEntries.length;
  const center = activeIndex % total;
  const left = (center - 1 + total) % total;
  const right = (center + 1) % total;
  const farLeft = (center - 2 + total) % total;
  const farRight = (center + 2) % total;

  return (
    <CmsElement cmsId="a22df45d-44" as="div">
      <CmsElement cmsId="a22df45d-45" as="div" className="mb-3 flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
        <CmsLink cmsId="a22df45d-46" href={buildHref("all", "all")} prefetch aria-pressed={selectedAudienceType === "all"} className={`${chipBase} ${selectedAudienceType === "all" ? chipActive : chipIdle}`}>
          <CmsElement cmsId="a22df45d-47" as="span">All</CmsElement>
          <CmsElement cmsId="a22df45d-48" as="span" className={`${countBase} ${selectedAudienceType === "all" ? countActive : countIdle}`}>{audienceCounts.all}</CmsElement>
        </CmsLink>
        {feedbackAudienceOptions.map((option) => (
          <CmsLink cmsId="a22df45d-49" instance={String(option.value)}
            key={option.value}
            href={buildHref(option.value, "all")}
            prefetch
            aria-pressed={selectedAudienceType === option.value}
            className={`${chipBase} ${selectedAudienceType === option.value ? chipActive : chipIdle}`}
          >
            <CmsElement cmsId="a22df45d-50" as="span">{option.label}</CmsElement>
            <CmsElement cmsId="a22df45d-51" as="span" className={`${countBase} ${selectedAudienceType === option.value ? countActive : countIdle}`}>{audienceCounts[option.value]}</CmsElement>
          </CmsLink>
        ))}
      </CmsElement>

      <CmsElement cmsId="a22df45d-52" as="div" className="mb-8 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1">
        <CmsLink cmsId="a22df45d-53"
          href={buildHref(selectedAudienceType, "all")}
          prefetch
          aria-pressed={selectedCategory === "all"}
          className={`${chipBase} ${selectedCategory === "all" ? "border-transparent bg-surface-container-high text-on-surface shadow-sm" : chipIdle}`}
        >
          <CmsElement cmsId="a22df45d-54" as="span">All Categories</CmsElement>
          <CmsElement cmsId="a22df45d-55" as="span" className={`${countBase} ${selectedCategory === "all" ? "bg-white text-on-surface" : countIdle}`}>{entries.length}</CmsElement>
        </CmsLink>
        {categories.map((value) => {
          const label =
            selectedAudienceType === "all"
              ? feedbackAudienceOptions
                  .flatMap((option) => feedbackCategoriesByAudience[option.value])
                  .find((item) => item.value === value)?.label ?? value
              : getFeedbackCategoryLabel(selectedAudienceType, value);

          return (
            <CmsLink cmsId="a22df45d-56" instance={String(value)}
              key={value}
              href={buildHref(selectedAudienceType, value)}
              prefetch
              aria-pressed={selectedCategory === value}
              className={`${chipBase} ${selectedCategory === value ? "border-transparent bg-secondary-container text-on-secondary-fixed shadow-sm" : chipIdle}`}
            >
              <CmsElement cmsId="a22df45d-57" as="span">{label}</CmsElement>
              <CmsElement cmsId="a22df45d-58" as="span" className={`${countBase} ${selectedCategory === value ? "bg-[var(--wc-surface-low)] text-on-secondary-fixed" : countIdle}`}>
                {getCategoryCount(value)}
              </CmsElement>
            </CmsLink>
          );
        })}
      </CmsElement>

      <CmsElement cmsId="a22df45d-59" as="div" className="relative mx-auto flex h-[520px] w-full items-center justify-center overflow-hidden rounded-[34px] border border-[var(--wc-outline-variant)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,#06122a_0%,#040a18_100%)] px-4 py-6 shadow-[0_30px_100px_rgba(2,7,27,0.28)] sm:h-[560px] sm:px-8">
        <CmsElement cmsId="a22df45d-60" as="div" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--landing-accent-rgb),0.12),transparent_42%)]" />

        <CmsElement cmsId="a22df45d-61" as="button"
          type="button"
          onClick={handlePrev}
          className="absolute left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface backdrop-blur-md transition hover:bg-[var(--wc-secondary)] hover:text-on-primary sm:left-6"
          aria-label="Previous feedback"
        >
          <Icon name="arrow_back" className="text-2xl" />
        </CmsElement>

        <CmsElement cmsId="a22df45d-62" as="button"
          type="button"
          onClick={handleNext}
          className="absolute right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface backdrop-blur-md transition hover:bg-[var(--wc-secondary)] hover:text-on-primary sm:right-6"
          aria-label="Next feedback"
        >
          <Icon name="arrow_forward" className="text-2xl" />
        </CmsElement>

        <CmsElement cmsId="a22df45d-63" as="div"
          className="relative flex h-full w-full items-center justify-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {[farLeft, left, center, right, farRight].map((index, position) => {
            const entry = visibleEntries[index];
            const slot = position - 2;
            const isCenter = slot === 0;
            const hidden = Math.abs(slot) > 2;
            const transforms: Record<number, string> = {
              "-2": "translateX(-46%) scale(0.72)",
              "-1": "translateX(-24%) scale(0.86)",
              "0": "translateX(0) scale(1)",
              "1": "translateX(24%) scale(0.86)",
              "2": "translateX(46%) scale(0.72)",
            };
            const opacityMap: Record<number, number> = { "-2": 0.14, "-1": 0.52, "0": 1, "1": 0.52, "2": 0.14 };
            const zIndexMap: Record<number, number> = { "-2": 10, "-1": 20, "0": 40, "1": 20, "2": 10 };

            return (
              <CmsElement cmsId="a22df45d-64" as="button" instance={String(entry.id)}
                key={entry.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`absolute w-[290px] sm:w-[340px] md:w-[380px] xl:w-[420px] transition-all duration-700 ease-in-out ${
                  hidden ? "pointer-events-none opacity-0" : "pointer-events-auto"
                }`}
                style={{
                  transform: transforms[slot as -2 | -1 | 0 | 1 | 2],
                  opacity: opacityMap[slot as -2 | -1 | 0 | 1 | 2],
                  zIndex: zIndexMap[slot as -2 | -1 | 0 | 1 | 2],
                }}
                aria-label={`Show feedback from ${entry.name}`}
              >
                <FeedbackCard entry={entry} active={isCenter} />
              </CmsElement>
            );
          })}
        </CmsElement>

        <CmsElement cmsId="a22df45d-65" as="div" className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
          {visibleEntries.map((_, idx) => (
            <CmsElement cmsId="a22df45d-66" as="button" instance={String(idx)}
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${idx === activeIndex ? "w-8 bg-[var(--wc-secondary)]" : "w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]"}`}
              aria-label={`Go to feedback ${idx + 1}`}
            />
          ))}
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
