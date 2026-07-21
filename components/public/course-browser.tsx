"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Course, CourseCategory } from "@/lib/supabase/types";
import { Icon } from "@/components/icon";

type CertificateFilter = "all" | "included" | "not_included";

interface CourseBrowserProps {
  readonly courses: Course[];
  readonly categories: CourseCategory[];
}

function getCourseCategoryName(course: Course, categories: CourseCategory[]) {
  return categories.find((category) => category.id === course.category_id)?.name ?? "Uncategorized";
}

function formatCertificateLabel(isIncluded: boolean) {
  return isIncluded ? "Certificate Included" : "No Certificate";
}

export function CourseBrowser({ courses, categories }: CourseBrowserProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [certificateFilter, setCertificateFilter] = useState<CertificateFilter>("all");

  const levelOptions = useMemo(() => Array.from(new Set(courses.map((course) => course.level).filter(Boolean))) as string[], [courses]);
  const durationOptions = useMemo(() => Array.from(new Set(courses.map((course) => course.duration).filter(Boolean))) as string[], [courses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const categoryName = getCourseCategoryName(course, categories);
      const certificateIncluded = true;

      const matchesSearch =
        query.length === 0 ||
        course.title.toLowerCase().includes(query) ||
        (course.description ?? "").toLowerCase().includes(query);

      const matchesLevel = levelFilter === "all" || course.level === levelFilter;
      const matchesDuration = durationFilter === "all" || course.duration === durationFilter;
      const matchesCategory = categoryFilter === "all" || categoryName === categoryFilter;
      const matchesCertificate =
        certificateFilter === "all" ||
        (certificateFilter === "included" && certificateIncluded) ||
        (certificateFilter === "not_included" && !certificateIncluded);

      return matchesSearch && matchesLevel && matchesDuration && matchesCategory && matchesCertificate;
    });
  }, [search, levelFilter, durationFilter, categoryFilter, certificateFilter, courses, categories]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="grid gap-4 rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 backdrop-blur-xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] lg:grid-cols-2 xl:grid-cols-5">
        <label className="block xl:col-span-2">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Search Courses</span>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7D8BA6]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] pl-11 pr-4 py-3 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all"
              placeholder="Search by title or description"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Level</span>
          <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all">
            <option value="all" className="text-black">All Levels</option>
            {levelOptions.map((level) => (
              <option key={level} value={level} className="text-black">
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Duration</span>
          <select value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)} className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all">
            <option value="all" className="text-black">All Durations</option>
            {durationOptions.map((duration) => (
              <option key={duration} value={duration} className="text-black">
                {duration}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all">
            <option value="all" className="text-black">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name} className="text-black">
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block xl:col-span-5">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">Certificate Availability</span>
          <select value={certificateFilter} onChange={(event) => setCertificateFilter(event.target.value as CertificateFilter)} className="w-full max-w-sm rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] transition-all">
            <option value="all" className="text-black">All Courses</option>
            <option value="included" className="text-black">Certificate Included</option>
            <option value="not_included" className="text-black">No Certificate</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-5 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--wc-on-surface-variant)]">
          Showing <span className="font-bold text-[var(--wc-secondary)]">{filteredCourses.length}</span> of <span className="font-bold text-on-surface">{courses.length}</span> active courses
        </p>
        <Link href="/contact" className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-2 text-sm font-bold text-on-surface transition hover:bg-[var(--wc-surface-low)] md:self-auto">
          <Icon name="send" className="text-sm" /> Need help choosing?
        </Link>
      </div>

      {filteredCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const categoryName = getCourseCategoryName(course, categories);
            const certificateIncluded = true;
            const certificateLabel = formatCertificateLabel(certificateIncluded);

            return (
              <article key={course.id} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-lowest)]/80">
                <div className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] px-6 py-4">
                  <span className="rounded-full bg-[var(--wc-secondary)]/10 px-3 py-1 text-xs font-bold text-[var(--wc-secondary)]">{categoryName}</span>
                  <span className="rounded-full bg-[var(--wc-surface-low)] px-3 py-1 text-xs font-bold text-on-surface">{course.level ?? "Open"}</span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)] transition group-hover:bg-[var(--wc-secondary)]/20 group-hover:text-[var(--wc-secondary)]">
                      <Icon name="school" className="text-2xl" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">Active Course</p>
                      <h3 className="text-xl font-black text-on-surface group-hover:text-[var(--wc-secondary)] transition-colors line-clamp-2">{course.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-[var(--wc-on-surface-variant)] flex-1">
                    {course.description ?? "A practical WeConnect-Innovation course with guided tasks and mentor review."}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--wc-outline-variant)] pt-5 text-xs font-bold text-[var(--wc-on-surface-variant)]">
                    <span className="flex items-center gap-2">
                      <Icon name="schedule" className="text-sm text-[var(--wc-secondary)]" /> {course.duration ?? "Self paced"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Icon name="verified" className="text-sm text-[var(--wc-secondary)]" /> {certificateLabel}
                    </span>
                  </div>

                  <Link href={`/apply?course=${course.id}`} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] py-3 text-center text-sm font-black text-on-primary shadow-glow transition-transform hover:scale-[1.02]">
                    APPLY NOW
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center backdrop-blur-md">
          <Icon name="search_off" className="mx-auto text-5xl text-[var(--wc-on-surface-variant)]" />
          <h3 className="mt-5 text-2xl font-black text-on-surface">No courses match your filters</h3>
          <p className="mt-2 text-[var(--wc-on-surface-variant)]">Try adjusting the search, level, duration, category, or certificate options.</p>
        </div>
      )}
    </div>
  );
}
