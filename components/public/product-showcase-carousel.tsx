"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { AnimatedCounter } from "@/components/public/animations";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Product } from "@/lib/supabase/types";

interface ProductShowcaseCarouselProps {
  products: Product[];
  totalCount?: number;
}

export function ProductShowcaseCarousel({ products, totalCount }: ProductShowcaseCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % (products?.length || 1));
  }, [products?.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + (products?.length || 1)) % (products?.length || 1));
  }, [products?.length]);

  // Optional auto-play
  useEffect(() => {
    if (!products || products.length === 0) return;
    const timer = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [handleNext, products]);

  // If no products, don't render
  if (!products || products.length === 0) return null;

  return (
    <div className="w-full bg-[#030B1C] py-20 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(6,43,127,0.3),transparent)] pointer-events-none"></div>
      
      {/* Grid Pattern overlay for tech aesthetic */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="homepage-wide-container mb-12 text-center relative z-10 px-5 md:px-margin-page mx-auto max-w-container-max">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A] mb-4">
          <Icon name="rocket_launch" className="text-sm" /> Innovation Showcase
        </div>
        <h2 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-black text-white md:text-5xl">
          <span>Featured Digital Products</span>
          <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-3 py-1 text-xl font-black text-[#FFD24A] tabular-nums md:text-2xl">
            <AnimatedCounter value={totalCount ?? products.length} />
          </span>
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-[#91A3C7]">
          Explore tools, templates, and projects developed by our talented community and mentors.
        </p>
      </div>

      {/* 3D Carousel Container */}
      <div className="relative z-10 w-full h-[500px] sm:h-[550px] md:h-[600px] flex items-center justify-center px-5">
        
        {/* Left Navigation Button - Absolute Left */}
        <button 
          onClick={handlePrev}
          className="absolute left-4 md:left-12 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
        >
          <Icon name="arrow_back" className="text-2xl" />
        </button>

        <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
          {products.map((product, index) => {
            // Calculate distance from active index
            let diff = index - activeIndex;
            
            // Handle wrap-around for infinite feel
            if (diff > Math.floor(products.length / 2)) {
              diff -= products.length;
            } else if (diff < -Math.floor(products.length / 2)) {
              diff += products.length;
            }

            // Determine styles based on distance
            let translateX = 0;
            let translateZ = 0;
            let rotateY = 0;
            let opacity = 0;
            let zIndex = 0;
            let scale = 1;

            if (diff === 0) {
              // Active Center Card
              translateX = 0;
              translateZ = 0;
              rotateY = 0;
              opacity = 1;
              zIndex = 30;
              scale = 1;
            } else if (diff === 1) {
              // First Right Card
              translateX = 50; // percentage
              translateZ = -100;
              rotateY = -15; // angle slightly inwards
              opacity = 0.7;
              zIndex = 20;
              scale = 0.85;
            } else if (diff === -1) {
              // First Left Card
              translateX = -50;
              translateZ = -100;
              rotateY = 15;
              opacity = 0.7;
              zIndex = 20;
              scale = 0.85;
            } else if (diff === 2) {
              // Second Right Card
              translateX = 80;
              translateZ = -200;
              rotateY = -25;
              opacity = 0.4;
              zIndex = 10;
              scale = 0.7;
            } else if (diff === -2) {
              // Second Left Card
              translateX = -80;
              translateZ = -200;
              rotateY = 25;
              opacity = 0.4;
              zIndex = 10;
              scale = 0.7;
            } else {
              // Hidden Cards
              translateX = diff > 0 ? 100 : -100;
              translateZ = -300;
              opacity = 0;
              zIndex = 0;
              scale = 0.5;
            }

            const isActive = diff === 0;

            return (
              <div 
                key={product.id}
                className="absolute w-[300px] sm:w-[350px] md:w-[400px] h-[450px] sm:h-[500px] transition-all duration-700 ease-in-out cursor-pointer"
                style={{
                  transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transformStyle: 'preserve-3d'
                }}
                onClick={() => setActiveIndex(index)}
              >
                <article className={`flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-500 ${isActive ? 'border-[#FFD24A]/50 bg-[#061A3D] shadow-[0_0_60px_rgba(255,210,74,0.2)]' : 'border-white/10 bg-[#061A3D]/80 backdrop-blur-xl shadow-xl'}`}>
                  <div className="relative h-[220px] w-full shrink-0 overflow-hidden bg-white/5">
                    {(product.image_cdn_url ?? product.image_url) ? (
                      <Image 
                        src={normalizeImageUrl(product.image_cdn_url ?? product.image_url ?? "") ?? product.image_cdn_url ?? product.image_url ?? ""} 
                        alt={product.name} 
                        fill 
                        className="object-cover transition-transform duration-700 hover:scale-110" 
                        unoptimized 
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#91A3C7] opacity-50">
                        <Icon name="image" className="text-6xl" />
                      </div>
                    )}
                    
                    {/* Overlay gradient for text readability if needed */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061A3D] to-transparent opacity-80" />
                    
                    <div className="absolute left-4 bottom-4 flex gap-2 flex-wrap">
                      <span className="rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FFD24A] backdrop-blur-md">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-1 flex-col p-6 relative z-10 bg-[#061A3D]">
                    <h3 className={`mb-3 text-2xl font-black line-clamp-2 transition-colors ${isActive ? 'text-white' : 'text-[#91A3C7]'}`}>
                      {product.name}
                    </h3>
                    <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-[#91A3C7] flex-1">
                      {product.short_description || product.full_description || "No description available."}
                    </p>
                    
                    <div className="mt-auto">
                      <Link 
                        href="/products" 
                        onClick={(e) => { if(!isActive) e.preventDefault(); }}
                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-black transition-all ${isActive ? 'bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] hover:scale-[1.02]' : 'border border-white/20 text-white hover:bg-white/5'}`}
                      >
                        <Icon name="visibility" className="text-lg" /> VIEW DETAILS
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        {/* Right Navigation Button - Absolute Right */}
        <button 
          onClick={handleNext}
          className="absolute right-4 md:right-12 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
        >
          <Icon name="arrow_forward" className="text-2xl" />
        </button>

      </div>
      
      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8 relative z-10">
        {products.map((_, idx) => (
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

