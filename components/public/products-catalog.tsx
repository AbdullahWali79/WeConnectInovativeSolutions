"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Product } from "@/lib/supabase/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/public/animations";

const badgeTone: Record<string, string> = {
  premium: "bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] text-[#030B1C]",
  hot: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
  new: "bg-gradient-to-r from-[#4379FF] to-blue-600 text-white",
  free: "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white",
  paid: "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white",
};

export const fallbackProducts: Product[] = [
  {
    id: "ai-resume-optimizer",
    name: "AI Resume Optimizer",
    category: "AI Tools",
    image_url: null,
    short_description: "Optimize resumes for ATS and role-specific applications.",
    full_description: "A smart assistant for polishing resume language, skills alignment, and keyword coverage.",
    price_or_access_type: "Free",
    badge: "free",
    product_link: null,
    features: ["ATS suggestions", "Keyword checks", "Role fit guidance"],
    status: "active",
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "client-proposal-pack",
    name: "Client Proposal Pack",
    category: "Templates",
    image_url: null,
    short_description: "Professional proposal templates for agency/freelance projects.",
    full_description: "Includes scope sheet, timeline framework, and communication templates for client onboarding.",
    price_or_access_type: "Paid",
    badge: "premium",
    product_link: null,
    features: ["Proposal template", "Scope matrix", "Delivery milestones"],
    status: "active",
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function ProductsCatalog({ initialProducts = fallbackProducts }: { readonly initialProducts?: Product[] }) {
  const products = initialProducts;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const filtered = useMemo(() => products.filter((product) => {
    const queryMatch = `${product.name} ${product.short_description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const categoryMatch = category === "all" || product.category === category;
    return queryMatch && categoryMatch;
  }), [products, query, category]);

  return (
    <section className="min-h-screen bg-[#030B1C] text-white pt-32 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>
      
      <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
        <FadeIn>
          <div className="mb-12 max-w-3xl text-center mx-auto">
            <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-2 text-xs font-bold tracking-widest text-[#FFD24A] uppercase">
              <Icon name="diamond" className="text-sm" /> Digital Products
            </div>
            <h1 className="text-4xl font-black md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white to-[#91A3C7] mb-6">
              Explore Our Premium Assets
            </h1>
            <p className="text-lg text-[#91A3C7]">
              Discover robust tools, high-end templates, and complete software solutions engineered by our expert team.
            </p>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="mb-10 grid gap-4 md:grid-cols-[1fr_auto] items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <div className="relative">
              <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91A3C7]" />
              <input 
                className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder-[#5B6B88] focus:outline-none focus:ring-2 focus:ring-[#FFD24A]/50 rounded-xl transition-all" 
                value={query} 
                onChange={(event) => setQuery(event.target.value)} 
                placeholder="Search tools, templates, or assets..." 
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setCategory("all")} 
                className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all ${category === "all" ? "bg-[#FFD24A] text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)]" : "bg-white/5 border border-white/10 text-[#91A3C7] hover:bg-white/10"}`}
              >
                All
              </button>
              {categories.map((item) => (
                <button 
                  key={item} 
                  onClick={() => setCategory(item)} 
                  className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all ${category === item ? "bg-[#FFD24A] text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)]" : "bg-white/5 border border-white/10 text-[#91A3C7] hover:bg-white/10"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {filtered.length === 0 ? (
          <FadeIn>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Icon name="inventory_2" className="text-6xl text-[#5B6B88] mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
              <p className="text-[#91A3C7]">Try a different category or search term.</p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
            {filtered.map((product) => (
              <StaggerItem key={product.id}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white/5 border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                  <div className="relative h-48 w-full bg-[#061A3D] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#030B1C] to-transparent z-10 opacity-60"></div>
                    {(product.image_cdn_url ?? product.image_url) ? (
                      <Image src={normalizeImageUrl(product.image_cdn_url ?? product.image_url ?? "") ?? product.image_cdn_url ?? product.image_url ?? ""} alt={product.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-contain transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#91A3C7]"><Icon name="code_blocks" className="text-6xl opacity-20" /></div>
                    )}
                    <div className="absolute top-4 right-4 z-20">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg ${badgeTone[product.badge] ?? "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                        {product.badge}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3">
                      <span className="rounded-md bg-[#062B7F]/50 border border-[#062B7F] px-2.5 py-1 text-[10px] font-bold text-[#91A3C7] uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white transition-colors group-hover:text-[#FFD24A] line-clamp-2">{product.name}</h3>
                    <p className="mb-6 line-clamp-3 text-sm text-[#91A3C7] flex-1">{product.short_description ?? "No description available for this premium asset."}</p>
                    <button onClick={() => setSelected(product)} className="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C]">
                      View Details
                    </button>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Product Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030B1C]/80 backdrop-blur-md p-4 sm:p-6" onClick={() => setSelected(null)}>
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#061A3D] shadow-[0_0_80px_rgba(0,0,0,0.8)]" onClick={(event) => event.stopPropagation()}>
              
              {/* Header / Sticky Close */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#061A3D]/90 p-6 backdrop-blur-xl">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#FFD24A] uppercase mb-1">{selected.category}</p>
                  <h2 className="text-2xl font-black text-white line-clamp-1">{selected.name}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110">
                  <Icon name="close" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(selected.image_cdn_url ?? selected.image_url) && (
                  <div className="relative mb-10 h-64 sm:h-80 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <Image src={normalizeImageUrl(selected.image_cdn_url ?? selected.image_url ?? "") ?? selected.image_cdn_url ?? selected.image_url ?? ""} alt={selected.name} fill sizes="min(100vw, 896px)" unoptimized className="object-contain" />
                  </div>
                )}
                
                <div className="mb-10">
                  <h3 className="text-xl font-black text-white mb-4">Overview</h3>
                  <p className="text-base text-[#91A3C7] leading-relaxed">{selected.full_description ?? selected.short_description ?? "No detailed overview available."}</p>
                </div>

                <div className="mb-10 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#91A3C7]">Access / Pricing</p>
                    <p className="mt-2 text-xl font-black text-white">{selected.price_or_access_type ?? "Not specified"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#91A3C7]">Availability</p>
                    <p className="mt-2 text-xl font-black text-white capitalize">{selected.status}</p>
                  </div>
                </div>

                <div className="mb-10">
                  <h3 className="text-xl font-black text-white mb-5">Key Features</h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {(selected.features ?? []).length > 0 ? (
                      (selected.features ?? []).map((feature) => (
                        <li key={feature} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/5 p-4 hover:border-white/10 transition-colors">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFD24A]/20 text-[#FFD24A]">
                            <Icon name="check" className="text-sm" />
                          </div>
                          <span className="text-sm font-bold text-[#91A3C7]">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[#5B6B88]">No feature list provided.</li>
                    )}
                  </ul>
                </div>

                {selected.product_link && (
                  <div className="mt-10 border-t border-white/10 pt-8 pb-4 text-center">
                    <a href={selected.product_link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] px-10 py-4 text-base font-black text-[#030B1C] transition-transform hover:scale-[1.02] shadow-[0_0_30px_rgba(255,210,74,0.3)]">
                      ACCESS PRODUCT <Icon name="open_in_new" className="text-lg" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

