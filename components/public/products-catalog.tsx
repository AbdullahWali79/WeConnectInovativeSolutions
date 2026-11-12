"use client";
import { CmsElement, CmsImage, CmsInstance } from "@/components/cms/cms-element";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { normalizeImageUrl } from "@/lib/image-url";
import { buildProductSlug } from "@/lib/slug";
import type { Product } from "@/lib/supabase/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/public/animations";
import Link from "next/link";

const badgeTone: Record<string, string> = {
  premium: "bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] text-on-primary",
  hot: "bg-gradient-to-r from-red-500 to-rose-600 text-on-surface",
  new: "bg-gradient-to-r from-[#4379FF] to-blue-600 text-on-surface",
  free: "bg-gradient-to-r from-emerald-400 to-emerald-600 text-on-surface",
  paid: "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-on-surface",
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

/**
 * Pre-compute slug map so all products get consistent, collision-free slugs.
 */
function useProductSlugs(products: Product[]): Map<string, string> {
  return useMemo(() => {
    const existingSlugs = new Map<string, string>();
    const slugToId = new Map<string, string>();

    for (const product of products) {
      const slug = buildProductSlug(product.name, product.id, existingSlugs);
      existingSlugs.set(slug, product.id);
      slugToId.set(product.id, slug);
    }

    return slugToId;
  }, [products]);
}

export function ProductsCatalog({ initialProducts = fallbackProducts, whatsappNumber = "923270728950" }: { readonly initialProducts?: Product[]; readonly whatsappNumber?: string }) {
  const products = initialProducts;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const slugMap = useProductSlugs(products);

  const categories = useMemo(() => {
    const values = new Set(products.map((product) => product.category));
    if (products.some((product) => product.show_in_branding && product.video_url)) values.add("Branding");
    return Array.from(values).sort();
  }, [products]);

  const filtered = useMemo(() => products.filter((product) => {
    const queryMatch = `${product.name} ${product.short_description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const categoryMatch = category === "all"
      || (category === "Branding"
        ? Boolean(product.show_in_branding && product.video_url)
        : product.category === category);
    return queryMatch && categoryMatch;
  }), [products, query, category]);

  return (
    <CmsElement cmsId="a44d6aea-9" as="section" className="relative min-h-screen overflow-hidden bg-[var(--wc-bg)] pb-16 pt-24 text-on-surface md:pb-20 md:pt-28">
      {/* Background Effects */}
      <CmsElement cmsId="a44d6aea-10" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></CmsElement>

      <CmsElement cmsId="a44d6aea-11" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
        <FadeIn>
          <CmsElement cmsId="a44d6aea-12" as="div" className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
            <CmsElement cmsId="a44d6aea-13" as="div" className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--wc-secondary)]">
              <Icon name="diamond" className="text-sm" /> Digital Products
            </CmsElement>
            <CmsElement cmsId="a44d6aea-14" as="h1" className="mb-3 bg-gradient-to-r from-[var(--wc-primary)] to-[var(--wc-secondary)] bg-clip-text text-3xl font-black leading-tight text-transparent md:text-4xl lg:text-5xl">
              Explore Our Premium Assets
            </CmsElement>
            <CmsElement cmsId="a44d6aea-15" as="p" className="text-sm leading-6 text-[var(--wc-on-surface-variant)] md:text-base">
              Discover robust tools, high-end templates, and complete software solutions engineered by our expert team.
            </CmsElement>
          </CmsElement>
        </FadeIn>

        <FadeIn>
          <CmsElement cmsId="a44d6aea-16" as="div" className="mb-7 flex flex-col gap-3 rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-3 shadow-sm backdrop-blur-md lg:flex-row lg:items-center">
            <CmsElement cmsId="a44d6aea-17" as="div" className="relative shrink-0 lg:w-64 xl:w-72">
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--wc-on-surface-variant)]" />
              <input
                className="w-full rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-bg)]/35 py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-[#5B6B88] transition-all focus:border-[var(--wc-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--wc-secondary)]/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools, templates, or assets..."
              />
            </CmsElement>
            <CmsElement cmsId="a44d6aea-18" as="div" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CmsElement cmsId="a44d6aea-19" as="button"
                onClick={() => setCategory("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${category === "all" ? "bg-[var(--wc-secondary)] text-on-primary shadow-glow" : "border border-[var(--wc-outline-variant)] bg-transparent text-[var(--wc-on-surface-variant)] hover:border-[var(--wc-secondary)]/40 hover:text-on-surface"}`}
              >
                All
              </CmsElement>
              {categories.map((item) => (
                <CmsElement cmsId="a44d6aea-20" as="button" instance={String(item)}
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${category === item ? "bg-[var(--wc-secondary)] text-on-primary shadow-glow" : "border border-[var(--wc-outline-variant)] bg-transparent text-[var(--wc-on-surface-variant)] hover:border-[var(--wc-secondary)]/40 hover:text-on-surface"}`}
                >
                  {item}
                </CmsElement>
              ))}
            </CmsElement>
          </CmsElement>
        </FadeIn>

        {filtered.length === 0 ? (
          <FadeIn>
            <CmsElement cmsId="a44d6aea-21" as="div" className="bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] rounded-3xl p-12 text-center">
              <Icon name="inventory_2" className="text-6xl text-[#5B6B88] mb-4" />
              <CmsElement cmsId="a44d6aea-22" as="h3" className="text-2xl font-bold text-on-surface mb-2">No products found</CmsElement>
              <CmsElement cmsId="a44d6aea-23" as="p" className="text-[var(--wc-on-surface-variant)]">Try a different category or search term.</CmsElement>
            </CmsElement>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" staggerDelay={0.05}>
            {filtered.map((product) => {
              const slug = slugMap.get(product.id) ?? product.id;
              return (
                <CmsInstance key={product.id} instance={String(product.id)}>
                  <StaggerItem key={product.id}>
                    <Link href={`/products/${slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--wc-secondary)]/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
                      {/* Image */}
                      <CmsElement cmsId="a44d6aea-25" as="div" className="relative h-40 w-full overflow-hidden bg-[var(--wc-surface-lowest)] md:h-44">
                        <CmsElement cmsId="a44d6aea-26" as="div" className="absolute inset-0 bg-gradient-to-t from-[var(--wc-bg)] to-transparent z-10 opacity-60"></CmsElement>
                        {(product.image_cdn_url ?? product.image_url) ? (
                          <CmsImage cmsId="a44d6aea-27" src={normalizeImageUrl(product.image_cdn_url ?? product.image_url ?? "") ?? product.image_cdn_url ?? product.image_url ?? ""} alt={`${product.name} – ${product.category} product`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-contain transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <CmsElement cmsId="a44d6aea-28" as="div" className="flex h-full items-center justify-center text-[var(--wc-on-surface-variant)]"><Icon name="code_blocks" className="text-6xl opacity-20" /></CmsElement>
                        )}
                        <CmsElement cmsId="a44d6aea-29" as="div" className="absolute right-3 top-3 z-20">
                          <CmsElement cmsId="a44d6aea-30" as="span" className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg ${badgeTone[product.badge] ?? "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                            {product.badge}
                          </CmsElement>
                        </CmsElement>
                        {product.video_url ? <CmsElement cmsId="a44d6aea-31" as="span" className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"><Icon name="play_circle" className="text-sm" /> Video</CmsElement> : null}
                      </CmsElement>

                      {/* Content */}
                      <CmsElement cmsId="a44d6aea-32" as="div" className="flex flex-1 flex-col p-4">
                        <CmsElement cmsId="a44d6aea-33" as="h3" className="mb-2 line-clamp-2 min-h-12 text-lg font-bold leading-snug text-on-surface transition-colors group-hover:text-[var(--wc-secondary)]">{product.name}</CmsElement>
                        {product.short_description ? (
                          <CmsElement cmsId="a44d6aea-desc" as="p" className="mb-4 line-clamp-2 text-xs text-[var(--wc-on-surface-variant)]">{product.short_description}</CmsElement>
                        ) : (
                          <CmsElement cmsId="a44d6aea-desc2" as="div" className="mb-4 flex-1" />
                        )}
                        <CmsElement cmsId="a44d6aea-34" as="span" className="flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--wc-outline-variant)] bg-transparent py-2.5 text-xs font-bold text-on-surface transition-all hover:border-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)] hover:text-on-primary">
                          View Details <Icon name="arrow_forward" className="text-base" />
                        </CmsElement>
                      </CmsElement>
                    </Link>
                  </StaggerItem>
                </CmsInstance>
              );
            })}
          </StaggerContainer>
        )}
      </CmsElement>
    </CmsElement>
  );
}
