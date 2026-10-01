"use client";
import { CmsElement, CmsLink } from "@/components/cms/cms-element";

import React, { useState, useCallback } from "react";
import { Icon } from "@/components/icon";
import type { Database } from "@/lib/supabase/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

interface CourseCarouselProps {
  courses: Course[];
}

export function CourseCarousel({ courses }: CourseCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    if (courses.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % courses.length);
  }, [courses.length]);

  const handlePrev = useCallback(() => {
    if (courses.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + courses.length) % courses.length);
  }, [courses.length]);

  if (courses.length === 0) {
    return null;
  }

  return (
    <CmsElement cmsId="c1f5081a-0" as="div" className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center mt-12 mb-8">
      {/* Left Nav Button */}
      <CmsElement cmsId="c1f5081a-1" as="button"
        onClick={handlePrev}
        className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_back" className="text-2xl" />
      </CmsElement>

      <CmsElement cmsId="c1f5081a-2" as="div" className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
        {courses.map((course, index) => {
          let diff = index - activeIndex;

          if (diff > Math.floor(courses.length / 2)) {
            diff -= courses.length;
          } else if (diff < -Math.floor(courses.length / 2)) {
            diff += courses.length;
          }

          let translateX = 0;
          let translateZ = 0;
          let rotateY = 0;
          let opacity = 0;
          let zIndex = 0;
          let scale = 1;

          if (diff === 0) {
            translateX = 0;
            translateZ = 0;
            rotateY = 0;
            opacity = 1;
            zIndex = 30;
            scale = 1;
          } else if (diff === 1) {
            translateX = 50;
            translateZ = -100;
            rotateY = -15;
            opacity = 0.7;
            zIndex = 20;
            scale = 0.85;
          } else if (diff === -1) {
            translateX = -50;
            translateZ = -100;
            rotateY = 15;
            opacity = 0.7;
            zIndex = 20;
            scale = 0.85;
          } else if (diff === 2) {
            translateX = 80;
            translateZ = -200;
            rotateY = -25;
            opacity = 0.4;
            zIndex = 10;
            scale = 0.7;
          } else if (diff === -2) {
            translateX = -80;
            translateZ = -200;
            rotateY = 25;
            opacity = 0.4;
            zIndex = 10;
            scale = 0.7;
          } else {
            translateX = diff > 0 ? 100 : -100;
            translateZ = -300;
            opacity = 0;
            zIndex = 0;
            scale = 0.5;
          }

          const isActive = diff === 0;

          return (
            <CmsElement cmsId="c1f5081a-3" as="div" instance={String(course.id)}
              key={course.id}
              className="absolute w-[300px] sm:w-[350px] md:w-[380px] h-[480px] sm:h-[500px] transition-all duration-700 ease-in-out cursor-pointer [perspective:1000px]"
              style={{
                transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
              }}
              onClick={() => {
                if (!isActive) {
                  setActiveIndex(index);
                }
              }}
            >
              <CmsElement cmsId="c1f5081a-4" as="article"
                className={`flex h-full w-full flex-col overflow-hidden rounded-[28px] border transition-all duration-500 bg-[var(--wc-surface-lowest)] p-6 text-left ${
                  isActive
                    ? 'border-[var(--wc-secondary)]/50 shadow-glow-lg bg-gradient-to-br from-[var(--wc-surface-lowest)] to-[var(--wc-primary)]'
                    : 'border-[var(--wc-outline-variant)] shadow-xl'
                }`}
              >
                {/* Glow effect for active card */}
                {isActive && (
                  <CmsElement cmsId="c1f5081a-5" as="div" className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[var(--wc-secondary)]/20 to-transparent blur-sm pointer-events-none" />
                )}

                <CmsElement cmsId="c1f5081a-6" as="div" className="flex flex-1 flex-col relative z-10">
                  <CmsElement cmsId="c1f5081a-7" as="div" className="mb-6 flex items-start justify-between gap-2">
                    <CmsElement cmsId="c1f5081a-8" as="div" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
                      isActive ? 'bg-[var(--wc-secondary)] text-on-primary shadow-[0_0_20px_rgba(var(--landing-accent-rgb),0.4)]' : 'bg-[var(--wc-surface-low)] text-on-surface'
                    }`}>
                      <Icon name="school" className="text-2xl" />
                    </CmsElement>
                    <CmsElement cmsId="c1f5081a-9" as="span" className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-right transition-colors duration-500 ${
                      isActive ? 'bg-[var(--wc-surface-low)] text-on-surface' : 'bg-[var(--wc-secondary)]/10 text-[var(--wc-secondary)]'
                    }`}>
                      {course.level ?? "Open"}
                    </CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="c1f5081a-10" as="h3" className={`text-2xl font-black transition-colors duration-500 line-clamp-2 ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                    {course.title}
                  </CmsElement>

                  <CmsElement cmsId="c1f5081a-11" as="p" className="mt-4 flex-1 text-sm leading-relaxed text-[var(--wc-on-surface-variant)] line-clamp-4">
                    {course.description ?? "A practical WeConnect-Innovation course with guided tasks and mentor review."}
                  </CmsElement>

                  <CmsElement cmsId="c1f5081a-12" as="div" className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#5B6B88]">
                    <CmsElement cmsId="c1f5081a-13" as="span" className="flex items-center gap-1.5">
                      <Icon name="schedule" className="text-sm" /> {course.duration ?? "Self paced"}
                    </CmsElement>
                    <CmsElement cmsId="c1f5081a-14" as="span" className="flex items-center gap-1.5 text-[var(--wc-secondary)]">
                      <Icon name="verified" className="text-sm" /> Certificate
                    </CmsElement>
                  </CmsElement>

                  <CmsElement cmsId="c1f5081a-15" as="div" className="mt-8">
                    {isActive ? (
                      <CmsLink cmsId="c1f5081a-16"
                        href={`/apply?course=${course.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-secondary)] py-3.5 text-sm font-bold text-on-primary shadow-glow transition-transform hover:scale-[1.02]"
                      >
                        Apply Now <Icon name="arrow_forward" className="text-[16px]" />
                      </CmsLink>
                    ) : (
                      <CmsElement cmsId="c1f5081a-17" as="button" className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] py-3.5 text-sm font-bold text-on-surface transition-colors hover:bg-[var(--wc-surface-low)]">
                        View Details
                      </CmsElement>
                    )}
                  </CmsElement>
                </CmsElement>
              </CmsElement>
            </CmsElement>
          );
        })}
      </CmsElement>

      {/* Right Nav Button */}
      <CmsElement cmsId="c1f5081a-18" as="button"
        onClick={handleNext}
        className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_forward" className="text-2xl" />
      </CmsElement>

      {/* Pagination Dots */}
      <CmsElement cmsId="c1f5081a-19" as="div" className="absolute bottom-[-20px] left-0 right-0 flex justify-center gap-2">
        {courses.map((_, idx) => (
          <CmsElement cmsId="c1f5081a-20" as="button" instance={String(idx)}
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[var(--wc-secondary)]' : 'w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </CmsElement>
    </CmsElement>
  );
}
