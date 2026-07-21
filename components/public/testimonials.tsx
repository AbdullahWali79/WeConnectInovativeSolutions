"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@/components/icon";
import { FadeIn } from "@/components/public/animations";

interface Testimonial {
  name: string;
  course: string;
  role: string;
  rating: number;
  text: string;
  initials: string;
  gradient: string;
}

const testimonialsData: Testimonial[] = [
  {
    name: "Hammad Siddiqui",
    course: "Web Development (WordPress)",
    role: "Paid WordPress Intern",
    rating: 5,
    text: "The structured syllabus and real software house-grade assignments pushed me to learn incredibly fast. Getting actual scores and detailed reviews on every task gave me immense confidence to tackle client projects.",
    initials: "HS",
    gradient: "from-[#FF512F] to-[#DD2476]",
  },
  {
    name: "Ayesha Malik",
    course: "Digital Marketing & Copywriting",
    role: "Marketing Specialist",
    rating: 5,
    text: "Thanks to WeConnect's mentor reviews, I learned client hunting and portfolio construction. The 3-month program transitioned smoothly into an internship, and now I manage client campaigns confidently.",
    initials: "AM",
    gradient: "from-[#11998e] to-[#38ef7d]",
  },
  {
    name: "Bilal Raza",
    course: "MERN Stack Development",
    role: "Junior Web Developer",
    rating: 5,
    text: "Review loops and strict coding standards pushed my coding skills to a professional standard. This is not just theoretical lectures; it's hands-on project building with real feedback. Highly recommended!",
    initials: "BR",
    gradient: "from-[#3F2B96] to-[#A8C0FF]",
  },
  {
    name: "Sana Khan",
    course: "App Development (Flutter)",
    role: "Flutter Developer Intern",
    rating: 5,
    text: "From writing basic widgets to deploying functional mobile apps, the mentoring here is unmatched. The training portal tracking helped me stay focused and finish all week milestones on time.",
    initials: "SK",
    gradient: "from-[#ff007f] to-[#7f00ff]",
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    if (testimonialsData.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % testimonialsData.length);
  }, []);

  const handlePrev = useCallback(() => {
    if (testimonialsData.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + testimonialsData.length) % testimonialsData.length);
  }, []);

  if (testimonialsData.length === 0) {
    return null;
  }

  return (
    <section className="bg-[var(--wc-bg)] py-20 lg:py-28 relative overflow-hidden border-t border-[var(--wc-outline-variant)]">
      {/* Decorative Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(6,43,127,0.3),transparent)] pointer-events-none" />

      <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
        <FadeIn>
          <div className="mb-16 max-w-3xl text-center mx-auto">
            <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="favorite" className="text-sm" /> Student Reviews
            </div>
            <h2 className="text-3xl font-black text-on-surface md:text-4xl lg:text-5xl mt-3 mb-4 leading-tight">
              Success Stories from <span className="bg-gradient-to-r from-[var(--wc-primary)] to-[var(--wc-secondary)] bg-clip-text text-transparent">Our Graduates</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--wc-on-surface-variant)]">
              Discover how our hands-on training tasks, professional code reviews, and structured pathways helped students secure real jobs and paid internships.
            </p>
          </div>
        </FadeIn>

        <div className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center mt-12 mb-8">
          {/* Left Nav Button */}
          <button
            onClick={handlePrev}
            className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
          >
            <Icon name="arrow_back" className="text-2xl" />
          </button>

          <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
            {testimonialsData.map((testimonial, index) => {
              let diff = index - activeIndex;

              if (diff > Math.floor(testimonialsData.length / 2)) {
                diff -= testimonialsData.length;
              } else if (diff < -Math.floor(testimonialsData.length / 2)) {
                diff += testimonialsData.length;
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
                  key={index}
                  className="absolute w-[300px] sm:w-[350px] md:w-[380px] h-[500px] sm:h-[530px] transition-all duration-700 ease-in-out cursor-pointer [perspective:1000px]"
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
                    className={`flex h-full w-full flex-col overflow-hidden rounded-[28px] border transition-all duration-500 bg-[var(--wc-surface-lowest)] text-left ${
                      isActive
                        ? 'border-[var(--wc-secondary)]/50 shadow-glow-lg bg-gradient-to-b from-[var(--wc-surface-lowest)] to-[var(--wc-primary)]'
                        : 'border-[var(--wc-outline-variant)] shadow-xl'
                    }`}
                  >
                    {/* Glow effect for active card */}
                    {isActive && (
                      <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[var(--wc-secondary)]/20 to-transparent blur-sm pointer-events-none" />
                    )}

                    {/* Top Content */}
                    <div className="p-8 pb-0 relative z-10 flex-1">
                      <div className="absolute top-6 right-8 text-6xl font-serif text-[var(--wc-on-surface-variant)] select-none pointer-events-none">
                        “
                      </div>

                      <div className="flex gap-1 mb-6 text-[var(--wc-secondary)]">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Icon key={i} name="star" className="text-xl" />
                        ))}
                      </div>

                      <p className={`text-base leading-relaxed italic font-medium transition-colors duration-500 ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                        &ldquo;{testimonial.text}&rdquo;
                      </p>
                    </div>

                    {/* User Profile */}
                    <div className="px-8 py-6 relative z-10 flex items-center gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${testimonial.gradient} text-on-surface font-extrabold text-lg shadow-lg`}>
                        {testimonial.initials}
                      </div>
                      <div>
                        <h4 className={`text-lg font-black transition-colors duration-500 ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                          {testimonial.name}
                        </h4>
                        <p className={`text-xs font-bold uppercase tracking-wider transition-colors duration-500 ${isActive ? 'text-[var(--wc-secondary)]' : 'text-[#5B6B88]'}`}>
                          {testimonial.role}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Course Details */}
                    <div className="bg-[var(--wc-surface-lowest)] p-6 sm:p-8 mt-auto border-t border-[var(--wc-outline-variant)] relative z-10">
                      <div className="mb-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${isActive ? 'bg-[var(--wc-secondary)] text-on-primary' : 'bg-[var(--wc-surface-low)] text-on-surface'}`}>
                          Completed Program
                        </span>
                      </div>
                      <h3 className={`text-xl font-black leading-snug line-clamp-1 transition-colors duration-500 ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                        {testimonial.course}
                      </h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5B6B88]">Final Assessment</p>
                          <p className={`text-lg font-black transition-colors duration-500 ${isActive ? 'text-[var(--wc-secondary)]' : 'text-on-surface'}`}>94 / 100</p>
                        </div>
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-500 ${isActive ? 'bg-[var(--wc-surface-low)] text-on-surface' : 'bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)]'}`}>
                          <Icon name="verified" className={`text-sm ${isActive ? 'text-[var(--wc-secondary)]' : 'text-[#5B6B88]'}`} />
                          <span>Verified</span>
                        </div>
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
            className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
          >
            <Icon name="arrow_forward" className="text-2xl" />
          </button>

          {/* Pagination Dots */}
          <div className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-2">
            {testimonialsData.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[var(--wc-secondary)]' : 'w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
