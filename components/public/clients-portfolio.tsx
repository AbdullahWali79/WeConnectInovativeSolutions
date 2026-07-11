"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
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
    <section className="bg-[#030B1C] py-20 lg:py-28 relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(6,43,127,0.2),transparent)] pointer-events-none" />
      
      <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
        <FadeIn>
          <div className="mb-16 max-w-3xl text-center mx-auto">
            <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
              <Icon name="work_history" className="text-sm" /> Happy Clients Portfolio
            </div>
            <h2 className="text-3xl font-black text-white md:text-4xl lg:text-5xl mt-3 mb-4 leading-tight">
              Where Our Trainees <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#91A3C7]">Make an Impact</span>
            </h2>
            <p className="mt-4 text-lg text-[#91A3C7] mb-6">
              WeConnect-Innovation trainees have actively contributed to building modern, robust solutions for these amazing clients.
            </p>
            <div className="inline-flex items-center self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
              Real Projects. Real Impact.
            </div>
          </div>
        </FadeIn>

        <div className="relative w-full h-[450px] md:h-[500px] flex items-center justify-center mt-12 mb-8">
          {/* Left Nav Button */}
          <button 
            onClick={handlePrev}
            className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
          >
            <Icon name="arrow_back" className="text-2xl" />
          </button>

          <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
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
                <div 
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
                  <article
                    className={`flex h-full w-full flex-col overflow-hidden rounded-[28px] border transition-all duration-500 bg-[#061A3D] p-6 sm:p-8 text-center items-center justify-center ${
                      isActive 
                        ? 'border-[#FFD24A]/50 shadow-[0_0_60px_rgba(255,210,74,0.2)] bg-gradient-to-br from-[#061A3D] to-[#062B7F]' 
                        : 'border-white/10 shadow-xl'
                    }`}
                  >
                    {/* Glow effect for active card */}
                    {isActive && (
                      <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-[#FFD24A]/20 to-transparent blur-sm pointer-events-none" />
                    )}

                    <div className="flex flex-1 flex-col items-center relative z-10 w-full">
                      <div className={`mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
                        isActive ? 'bg-[#FFD24A]/10 border border-[#FFD24A]/30 shadow-[0_0_30px_rgba(255,210,74,0.4)]' : 'bg-white/5 border border-white/10'
                      }`}>
                        {client.logoUrl ? (
                          <div className="relative h-12 w-12">
                            <Image src={client.logoUrl} alt={client.name} fill className="object-contain" unoptimized />
                          </div>
                        ) : (
                          <span className={`text-2xl font-black ${isActive ? 'text-[#FFD24A]' : 'text-white'}`}>
                            {client.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className={`mb-4 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
                        isActive ? 'bg-[#FFD24A] text-[#030B1C]' : 'bg-white/10 text-[#91A3C7]'
                      }`}>
                        {client.industry}
                      </div>

                      <h3 className={`mb-4 text-2xl font-black transition-colors duration-500 ${isActive ? 'text-white' : 'text-[#91A3C7]'}`}>
                        {client.name}
                      </h3>
                      
                      <p className="text-sm leading-relaxed text-[#91A3C7]">
                        {client.shortDescription}
                      </p>
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
          <div className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-2">
            {happyClients.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[#FFD24A]' : 'w-2 bg-white/20 hover:bg-white/50'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
