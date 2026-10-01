"use client";
import { CmsElement, CmsImage } from "@/components/cms/cms-element";

import React, { useState, useCallback } from "react";
import { FadeIn } from "@/components/public/animations";
import { Icon } from "@/components/icon";
import { happyClients } from "@/lib/data/clients";

export function ClientsPortfolio() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    if (happyClients.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % happyClients.length);
  }, []);

  const handlePrev = useCallback(() => {
    if (happyClients.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + happyClients.length) % happyClients.length);
  }, []);

  if (happyClients.length === 0) {
    return null;
  }

  return (
    <CmsElement cmsId="e4b092bb-0" as="section" className="bg-[var(--wc-bg)] py-20 lg:py-28 relative overflow-hidden border-t border-[var(--wc-outline-variant)]">
      <CmsElement cmsId="e4b092bb-1" as="div" className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(6,43,127,0.2),transparent)] pointer-events-none" />

      <CmsElement cmsId="e4b092bb-2" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
        <FadeIn>
          <CmsElement cmsId="e4b092bb-3" as="div" className="mb-16 max-w-3xl text-center mx-auto">
            <CmsElement cmsId="e4b092bb-4" as="div" className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              <Icon name="work_history" className="text-sm" /> Happy Clients Portfolio
            </CmsElement>
            <CmsElement cmsId="e4b092bb-5" as="h2" className="text-3xl font-black text-on-surface md:text-4xl lg:text-5xl mt-3 mb-4 leading-tight">
              Where Our Trainees <br className="hidden md:block" />
              <CmsElement cmsId="e4b092bb-6" as="span" className="bg-gradient-to-r from-[var(--wc-primary)] to-[var(--wc-secondary)] bg-clip-text text-transparent">Make an Impact</CmsElement>
            </CmsElement>
            <CmsElement cmsId="e4b092bb-7" as="p" className="mt-4 text-lg text-[var(--wc-on-surface-variant)] mb-6">
              WeConnect-Innovation trainees have actively contributed to building modern, robust solutions for these amazing clients.
            </CmsElement>
            <CmsElement cmsId="e4b092bb-8" as="div" className="inline-flex items-center self-start rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-1.5 text-xs font-bold text-on-surface shadow-sm">
              Real Projects. Real Impact.
            </CmsElement>
          </CmsElement>
        </FadeIn>

        <CmsElement cmsId="e4b092bb-9" as="div" className="relative w-full h-[450px] md:h-[500px] flex items-center justify-center mt-12 mb-8">
          {/* Left Nav Button */}
          <CmsElement cmsId="e4b092bb-10" as="button"
            onClick={handlePrev}
            className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
          >
            <Icon name="arrow_back" className="text-2xl" />
          </CmsElement>

          <CmsElement cmsId="e4b092bb-11" as="div" className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
            {happyClients.map((client, index) => {
              let diff = index - activeIndex;

              if (diff > Math.floor(happyClients.length / 2)) {
                diff -= happyClients.length;
              } else if (diff < -Math.floor(happyClients.length / 2)) {
                diff += happyClients.length;
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
                <CmsElement cmsId="e4b092bb-12" as="div" instance={String(client.id)}
                  key={client.id}
                  className="absolute w-[300px] sm:w-[320px] md:w-[350px] h-[350px] sm:h-[380px] transition-all duration-700 ease-in-out cursor-pointer [perspective:1000px]"
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
                  <CmsElement cmsId="e4b092bb-13" as="article"
                    className={`flex h-full w-full flex-col overflow-hidden rounded-[28px] border transition-all duration-500 bg-[var(--wc-surface-lowest)] p-6 sm:p-8 text-center items-center justify-center ${
                      isActive
                        ? 'border-[var(--wc-secondary)]/50 shadow-glow-lg bg-gradient-to-br from-[var(--wc-surface-lowest)] to-[var(--wc-primary)]'
                        : 'border-[var(--wc-outline-variant)] shadow-xl'
                    }`}
                  >
                    {/* Glow effect for active card */}
                    {isActive && (
                      <CmsElement cmsId="e4b092bb-14" as="div" className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[var(--wc-secondary)]/20 to-transparent blur-sm pointer-events-none" />
                    )}

                    <CmsElement cmsId="e4b092bb-15" as="div" className="flex flex-1 flex-col items-center relative z-10 w-full">
                      <CmsElement cmsId="e4b092bb-16" as="div" className={`mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
                        isActive ? 'bg-[var(--wc-secondary)]/10 border border-[var(--wc-secondary)]/30 shadow-glow-lg' : 'bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)]'
                      }`}>
                        {client.logoUrl ? (
                          <CmsElement cmsId="e4b092bb-17" as="div" className="relative h-12 w-12">
                            <CmsImage cmsId="e4b092bb-18" src={client.logoUrl} alt={client.name} fill className="object-contain" unoptimized />
                          </CmsElement>
                        ) : (
                          <CmsElement cmsId="e4b092bb-19" as="span" className={`text-2xl font-black ${isActive ? 'text-[var(--wc-secondary)]' : 'text-on-surface'}`}>
                            {client.name.slice(0, 2).toUpperCase()}
                          </CmsElement>
                        )}
                      </CmsElement>

                      <CmsElement cmsId="e4b092bb-20" as="div" className={`mb-4 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
                        isActive ? 'bg-[var(--wc-secondary)] text-on-primary' : 'bg-[var(--wc-surface-low)] text-[var(--wc-on-surface-variant)]'
                      }`}>
                        {client.industry}
                      </CmsElement>

                      <CmsElement cmsId="e4b092bb-21" as="h3" className={`mb-4 text-2xl font-black transition-colors duration-500 ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>
                        {client.name}
                      </CmsElement>

                      <CmsElement cmsId="e4b092bb-22" as="p" className="text-sm leading-relaxed text-[var(--wc-on-surface-variant)]">
                        {client.shortDescription}
                      </CmsElement>
                    </CmsElement>
                  </CmsElement>
                </CmsElement>
              );
            })}
          </CmsElement>

          {/* Right Nav Button */}
          <CmsElement cmsId="e4b092bb-23" as="button"
            onClick={handleNext}
            className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
          >
            <Icon name="arrow_forward" className="text-2xl" />
          </CmsElement>

          {/* Pagination Dots */}
          <CmsElement cmsId="e4b092bb-24" as="div" className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-2">
            {happyClients.map((_, idx) => (
              <CmsElement cmsId="e4b092bb-25" as="button" instance={String(idx)}
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[var(--wc-secondary)]' : 'w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
