"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
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
    <div className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center mt-12 mb-8">
      {/* Left Nav Button */}
      <button 
        onClick={handlePrev}
        className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_back" className="text-2xl" />
      </button>

      <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
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
            <div 
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
              <article
                className={`flex h-full w-full flex-col overflow-hidden rounded-[28px] border transition-all duration-500 bg-[#061A3D] p-6 text-left ${
                  isActive 
                    ? 'border-[#FFD24A]/50 shadow-[0_0_60px_rgba(255,210,74,0.2)] bg-gradient-to-br from-[#061A3D] to-[#062B7F]' 
                    : 'border-white/10 shadow-xl'
                }`}
              >
                {/* Glow effect for active card */}
                {isActive && (
                  <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[#FFD24A]/20 to-transparent blur-sm pointer-events-none" />
                )}

                <div className="flex flex-1 flex-col relative z-10">
                  <div className="mb-6 flex items-start justify-between gap-2">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
                      isActive ? 'bg-[#FFD24A] text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.4)]' : 'bg-white/10 text-white'
                    }`}>
                      <Icon name="school" className="text-2xl" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-right transition-colors duration-500 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#FFD24A]/10 text-[#FFD24A]'
                    }`}>
                      {course.level ?? "Open"}
                    </span>
                  </div>

                  <h3 className={`text-2xl font-black transition-colors duration-500 line-clamp-2 ${isActive ? 'text-white' : 'text-[#91A3C7]'}`}>
                    {course.title}
                  </h3>
                  
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-[#91A3C7] line-clamp-4">
                    {course.description ?? "A practical WeConnect-Innovation course with guided tasks and mentor review."}
                  </p>

                  <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#5B6B88]">
                    <span className="flex items-center gap-1.5">
                      <Icon name="schedule" className="text-sm" /> {course.duration ?? "Self paced"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[#FFD24A]">
                      <Icon name="verified" className="text-sm" /> Certificate
                    </span>
                  </div>

                  <div className="mt-8">
                    {isActive ? (
                      <Link
                        href={`/apply?course=${course.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD24A] py-3.5 text-sm font-bold text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-transform hover:scale-[1.02]"
                      >
                        Apply Now <Icon name="arrow_forward" className="text-[16px]" />
                      </Link>
                    ) : (
                      <button className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {/* Right Nav Button */}
      <button 
        onClick={handleNext}
        className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_forward" className="text-2xl" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-[-20px] left-0 right-0 flex justify-center gap-2">
        {courses.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[#FFD24A]' : 'w-2 bg-white/20 hover:bg-white/50'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
