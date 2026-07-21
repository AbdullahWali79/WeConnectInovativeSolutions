"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Icon } from "@/components/icon";

interface Partner {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
}

interface MousCarouselProps {
  partners: Partner[];
}

export function MousCarousel({ partners }: MousCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % (partners?.length || 1));
  }, [partners?.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + (partners?.length || 1)) % (partners?.length || 1));
  }, [partners?.length]);

  // Optional auto-play
  useEffect(() => {
    if (!partners || partners.length === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [handleNext, partners]);

  if (!partners || partners.length === 0) {
    return (
      <div className="col-span-full rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center text-[var(--wc-on-surface-variant)] backdrop-blur-md max-w-3xl mx-auto">
        We are currently onboarding software house partners. Their details will appear here soon.
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full h-[450px] sm:h-[500px] flex items-center justify-center px-5 max-w-7xl mx-auto">

      {/* Left Navigation Button */}
      <button
        onClick={handlePrev}
        className="absolute left-0 md:left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_back" className="text-2xl" />
      </button>

      <div className="relative w-full max-w-4xl h-full flex justify-center items-center perspective-1000">
        {partners.map((partner, index) => {
          let diff = index - activeIndex;

          if (diff > Math.floor(partners.length / 2)) {
            diff -= partners.length;
          } else if (diff < -Math.floor(partners.length / 2)) {
            diff += partners.length;
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
              key={partner.id}
              className="absolute w-[280px] sm:w-[320px] md:w-[360px] h-[380px] sm:h-[420px] transition-all duration-700 ease-in-out cursor-pointer"
              style={{
                transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                transformStyle: 'preserve-3d'
              }}
              onClick={() => setActiveIndex(index)}
            >
              <article className={`flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-500 ${isActive ? 'border-[var(--wc-secondary)]/50 bg-[var(--wc-surface-lowest)] shadow-glow-lg' : 'border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/80 backdrop-blur-xl shadow-xl'}`}>
                <div className="flex flex-1 flex-col p-8 items-center text-center">
                  <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border transition-all duration-500 ${isActive ? 'bg-[var(--wc-secondary)]/10 border-[var(--wc-secondary)]/30 scale-110 shadow-[0_0_30px_rgba(var(--landing-accent-rgb),0.2)]' : 'border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)]'}`}>
                    {partner.logo_url ? (
                      <div className="relative h-16 w-16">
                        <Image src={partner.logo_url} alt={partner.name} fill sizes="64px" className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <span className={`text-2xl font-black ${isActive ? 'text-[var(--wc-secondary)]' : 'text-on-surface'}`}>
                        {partner.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className={`mb-4 text-2xl font-black transition-colors ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                    {partner.name}
                  </h3>

                  {partner.tagline && (
                    <p className="mb-6 flex-1 text-sm leading-relaxed text-[var(--wc-on-surface-variant)]">
                      {partner.tagline}
                    </p>
                  )}

                  {/* Social Links / Website */}
                  <div className="mt-auto flex flex-wrap justify-center gap-4 pt-5 border-t border-[var(--wc-outline-variant)] w-full">
                    {partner.website_url && (
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if(!isActive) e.preventDefault(); }}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-[var(--wc-secondary)] hover:text-on-surface' : 'text-[var(--wc-on-surface-variant)] hover:text-on-surface'}`}
                      >
                        <Icon name="language" className="text-lg" /> Website
                      </a>
                    )}
                    {partner.facebook_url && (
                      <a
                        href={partner.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if(!isActive) e.preventDefault(); }}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-[var(--wc-secondary)] hover:text-on-surface' : 'text-[var(--wc-on-surface-variant)] hover:text-on-surface'}`}
                      >
                        <Icon name="facebook" className="text-lg" /> Facebook
                      </a>
                    )}
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {/* Right Navigation Button */}
      <button
        onClick={handleNext}
        className="absolute right-0 md:right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
      >
        <Icon name="arrow_forward" className="text-2xl" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-[-40px] left-0 right-0 flex justify-center gap-2">
        {partners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[var(--wc-secondary)]' : 'w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
