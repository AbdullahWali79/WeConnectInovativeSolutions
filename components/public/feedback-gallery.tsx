"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    <div className="flex gap-1 text-[var(--wc-secondary)]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} name="star" className={`text-sm ${index < rating ? "opacity-100" : "opacity-25"}`} />
      ))}
    </div>
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
    <article
      className={`group relative h-full overflow-hidden rounded-[30px] border transition-all duration-700 ${
        active
          ? "border-[var(--wc-secondary)]/45 bg-[linear-gradient(180deg,#0b1c3d_0%,#08122a_100%)] shadow-[0_24px_80px_rgba(2,7,27,0.45)]"
          : "border-[var(--wc-outline-variant)] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.08)_100%)] shadow-[0_18px_54px_rgba(2,7,27,0.22)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_70%)] opacity-80" />
        <div className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-[var(--wc-secondary)]/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-[var(--wc-primary)]/18 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${buildAvatarGradient(entry.id)} text-sm font-black tracking-widest text-on-surface shadow-lg`}>
              {getInitials(entry.name)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-[0.22em] ${active ? "text-[var(--wc-secondary)]" : "text-[var(--wc-on-surface-variant)]"}`}>{entry.audience_type}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  <Icon name="check" className="text-[12px]" />
                  Verified
                </span>
              </div>
              <h3 className="mt-1 whitespace-nowrap text-[18px] font-black leading-none text-on-surface sm:text-[20px] md:text-[22px]">
                {entry.name}
              </h3>
            </div>
          </div>

          <StarRow rating={entry.rating} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${active ? "border-[var(--wc-primary)]/15 bg-[#eef4ff] text-[var(--wc-primary)]" : "border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)]"}`}>
            {entry.audience_type === "student" ? "Student review" : "Client review"}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${active ? "border-[var(--wc-secondary)]/35 bg-[#fff7db] text-[#8a6400]" : "border-[var(--wc-secondary)]/20 bg-[var(--wc-secondary)]/12 text-[var(--wc-secondary)]"}`}>
            {getFeedbackCategoryLabel(entry.audience_type, entry.category)}
          </span>
        </div>

        <div className={`mb-4 flex items-center gap-2 text-xs font-semibold ${active ? "text-[var(--wc-on-surface-variant)]" : "text-[var(--wc-on-surface-variant)]"}`}>
          <Icon name="schedule" className="text-sm" />
          <span>{formatRelativeTime(entry.created_at)}</span>
        </div>

        <div className="flex-1">
          {entry.title ? <h4 className={`text-[28px] font-black leading-tight ${active ? "text-on-surface" : "text-[var(--wc-on-surface-variant)]"}`}>{entry.title}</h4> : null}
          <p className={`mt-4 text-sm leading-7 ${active ? "text-[var(--wc-on-surface-variant)]" : "text-[var(--wc-on-surface-variant)]"}`}>“{entry.message}”</p>
        </div>

        <div className={`mt-6 flex items-center justify-between border-t border-[var(--wc-outline-variant)] pt-4 text-xs ${active ? "text-[var(--wc-on-surface-variant)]" : "text-[var(--wc-on-surface-variant)]"}`}>
          <span className="font-bold uppercase tracking-widest">Approved by admin</span>
          <span>{formatDate(entry.created_at)}</span>
        </div>
      </div>
    </article>
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
  const chipActive = "border-transparent bg-primary text-on-surface shadow-sm";
  const countBase = "inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums";
  const countIdle = "bg-surface-container-high text-on-surface-variant group-hover:bg-[var(--wc-surface-low)]";
  const countActive = "bg-[var(--wc-surface-low)] text-on-surface";

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
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
          <Link href={buildHref("all", "all")} prefetch aria-pressed={selectedAudienceType === "all"} className={`${chipBase} ${selectedAudienceType === "all" ? chipActive : chipIdle}`}>
            <span>All</span>
            <span className={`${countBase} ${selectedAudienceType === "all" ? countActive : countIdle}`}>{audienceCounts.all}</span>
          </Link>
          {feedbackAudienceOptions.map((option) => (
            <Link
              key={option.value}
              href={buildHref(option.value, "all")}
              prefetch
              aria-pressed={selectedAudienceType === option.value}
              className={`${chipBase} ${selectedAudienceType === option.value ? chipActive : chipIdle}`}
            >
              <span>{option.label}</span>
              <span className={`${countBase} ${selectedAudienceType === option.value ? countActive : countIdle}`}>{audienceCounts[option.value]}</span>
            </Link>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1">
          <Link
            href={buildHref(selectedAudienceType, "all")}
            prefetch
            aria-pressed={selectedCategory === "all"}
            className={`${chipBase} ${selectedCategory === "all" ? "border-transparent bg-surface-container-high text-on-surface shadow-sm" : chipIdle}`}
          >
            <span>All Categories</span>
            <span className={`${countBase} ${selectedCategory === "all" ? "bg-white text-on-surface" : countIdle}`}>{entries.length}</span>
          </Link>
          {categories.map((value) => {
            const label =
              selectedAudienceType === "all"
                ? feedbackAudienceOptions
                    .flatMap((option) => feedbackCategoriesByAudience[option.value])
                    .find((item) => item.value === value)?.label ?? value
                : getFeedbackCategoryLabel(selectedAudienceType, value);

            return (
              <Link
                key={value}
                href={buildHref(selectedAudienceType, value)}
                prefetch
                aria-pressed={selectedCategory === value}
                className={`${chipBase} ${selectedCategory === value ? "border-transparent bg-secondary-container text-on-secondary-fixed shadow-sm" : chipIdle}`}
              >
                <span>{label}</span>
                <span className={`${countBase} ${selectedCategory === value ? "bg-[var(--wc-surface-low)] text-on-secondary-fixed" : countIdle}`}>
                  {getCategoryCount(value)}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-[var(--wc-outline-variant)] bg-[linear-gradient(180deg,#081638_0%,#050d20_100%)] p-8 text-center text-on-surface shadow-[0_24px_70px_rgba(2,7,27,0.28)]">
          <Icon name="reviews" className="text-4xl text-[var(--wc-secondary)]" />
          <h3 className="mt-3 text-xl font-black">No approved feedback yet</h3>
          <p className="mt-2 text-sm text-[var(--wc-on-surface-variant)]">Approved stories will appear here after admin review.</p>
        </div>
      </div>
    );
  }

  const total = visibleEntries.length;
  const center = activeIndex % total;
  const left = (center - 1 + total) % total;
  const right = (center + 1) % total;
  const farLeft = (center - 2 + total) % total;
  const farRight = (center + 2) % total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
        <Link href={buildHref("all", "all")} prefetch aria-pressed={selectedAudienceType === "all"} className={`${chipBase} ${selectedAudienceType === "all" ? chipActive : chipIdle}`}>
          <span>All</span>
          <span className={`${countBase} ${selectedAudienceType === "all" ? countActive : countIdle}`}>{audienceCounts.all}</span>
        </Link>
        {feedbackAudienceOptions.map((option) => (
          <Link
            key={option.value}
            href={buildHref(option.value, "all")}
            prefetch
            aria-pressed={selectedAudienceType === option.value}
            className={`${chipBase} ${selectedAudienceType === option.value ? chipActive : chipIdle}`}
          >
            <span>{option.label}</span>
            <span className={`${countBase} ${selectedAudienceType === option.value ? countActive : countIdle}`}>{audienceCounts[option.value]}</span>
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1">
        <Link
          href={buildHref(selectedAudienceType, "all")}
          prefetch
          aria-pressed={selectedCategory === "all"}
          className={`${chipBase} ${selectedCategory === "all" ? "border-transparent bg-surface-container-high text-on-surface shadow-sm" : chipIdle}`}
        >
          <span>All Categories</span>
          <span className={`${countBase} ${selectedCategory === "all" ? "bg-white text-on-surface" : countIdle}`}>{entries.length}</span>
        </Link>
        {categories.map((value) => {
          const label =
            selectedAudienceType === "all"
              ? feedbackAudienceOptions
                  .flatMap((option) => feedbackCategoriesByAudience[option.value])
                  .find((item) => item.value === value)?.label ?? value
              : getFeedbackCategoryLabel(selectedAudienceType, value);

          return (
            <Link
              key={value}
              href={buildHref(selectedAudienceType, value)}
              prefetch
              aria-pressed={selectedCategory === value}
              className={`${chipBase} ${selectedCategory === value ? "border-transparent bg-secondary-container text-on-secondary-fixed shadow-sm" : chipIdle}`}
            >
              <span>{label}</span>
              <span className={`${countBase} ${selectedCategory === value ? "bg-[var(--wc-surface-low)] text-on-secondary-fixed" : countIdle}`}>
                {getCategoryCount(value)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="relative mx-auto flex h-[520px] w-full items-center justify-center overflow-hidden rounded-[34px] border border-[var(--wc-outline-variant)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,#06122a_0%,#040a18_100%)] px-4 py-6 shadow-[0_30px_100px_rgba(2,7,27,0.28)] sm:h-[560px] sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--landing-accent-rgb),0.12),transparent_42%)]" />

        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface backdrop-blur-md transition hover:bg-[var(--wc-secondary)] hover:text-on-primary sm:left-6"
          aria-label="Previous feedback"
        >
          <Icon name="arrow_back" className="text-2xl" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="absolute right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface backdrop-blur-md transition hover:bg-[var(--wc-secondary)] hover:text-on-primary sm:right-6"
          aria-label="Next feedback"
        >
          <Icon name="arrow_forward" className="text-2xl" />
        </button>

        <div
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
              <button
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
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
          {visibleEntries.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${idx === activeIndex ? "w-8 bg-[var(--wc-secondary)]" : "w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]"}`}
              aria-label={`Go to feedback ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
