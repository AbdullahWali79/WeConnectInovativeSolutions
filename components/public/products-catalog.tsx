"use client";
import { CmsElement, CmsImage, CmsInstance } from "@/components/cms/cms-element";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { ProductVideoPreview } from "@/components/product-video-preview";
import { normalizeImageUrl } from "@/lib/image-url";
import type { Product } from "@/lib/supabase/types";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/public/animations";

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

function drivePreviewUrl(value: string) {
  try {
    const url = new URL(value);
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get("id");
    return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600" : value;
  } catch {
    return value;
  }
}

function ProductGallery({ product }: { product: Product }) {
  const sourceImages = product.gallery_urls?.length
    ? product.gallery_urls
    : [product.image_cdn_url ?? product.image_url].filter((value): value is string => Boolean(value));
  const images = sourceImages.map(drivePreviewUrl);
  const [index, setIndex] = useState(0);
  if (!images.length) return null;

  return (
    <CmsElement cmsId="a44d6aea-0" as="div" className="mb-10">
      <CmsElement cmsId="a44d6aea-1" as="div" className="relative h-64 w-full overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] sm:h-80">
        <CmsImage cmsId="a44d6aea-2" src={images[index]} alt={product.name + " image " + (index + 1)} fill sizes="min(100vw, 896px)" unoptimized className="object-contain" />
        {images.length > 1 ? <>
          <CmsElement cmsId="a44d6aea-3" as="button" type="button" onClick={() => setIndex((index - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white"><Icon name="chevron_left" /></CmsElement>
          <CmsElement cmsId="a44d6aea-4" as="button" type="button" onClick={() => setIndex((index + 1) % images.length)} className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white"><Icon name="chevron_right" /></CmsElement>
          <CmsElement cmsId="a44d6aea-5" as="span" className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{index + 1}/{images.length}</CmsElement>
        </> : null}
      </CmsElement>
      {images.length > 1 ? <CmsElement cmsId="a44d6aea-6" as="div" className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, itemIndex) => <CmsElement cmsId="a44d6aea-7" as="button" instance={String(image + itemIndex)} type="button" key={image + itemIndex} onClick={() => setIndex(itemIndex)} className={"relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 " + (itemIndex === index ? "border-[var(--wc-secondary)]" : "border-transparent")}><CmsImage cmsId="a44d6aea-8" src={image} alt="" fill unoptimized className="object-cover" /></CmsElement>)}</CmsElement> : null}
    </CmsElement>
  );
}
export function ProductsCatalog({ initialProducts = fallbackProducts, whatsappNumber = "923270728950" }: { readonly initialProducts?: Product[]; readonly whatsappNumber?: string }) {
  const products = initialProducts;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);

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
            {filtered.map((product) => (
              <CmsInstance key={product.id} instance={String(product.id)}><StaggerItem key={product.id}>
                <CmsElement cmsId="a44d6aea-24" as="article" className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--wc-secondary)]/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
                  <CmsElement cmsId="a44d6aea-25" as="div" className="relative h-40 w-full overflow-hidden bg-[var(--wc-surface-lowest)] md:h-44">
                    <CmsElement cmsId="a44d6aea-26" as="div" className="absolute inset-0 bg-gradient-to-t from-[var(--wc-bg)] to-transparent z-10 opacity-60"></CmsElement>
                    {(product.image_cdn_url ?? product.image_url) ? (
                      <CmsImage cmsId="a44d6aea-27" src={normalizeImageUrl(product.image_cdn_url ?? product.image_url ?? "") ?? product.image_cdn_url ?? product.image_url ?? ""} alt={product.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="object-contain transition-transform duration-700 group-hover:scale-110" />
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
                  <CmsElement cmsId="a44d6aea-32" as="div" className="flex flex-1 flex-col p-4">
                    <CmsElement cmsId="a44d6aea-33" as="h3" className="mb-4 line-clamp-2 min-h-12 text-lg font-bold leading-snug text-on-surface transition-colors group-hover:text-[var(--wc-secondary)]">{product.name}</CmsElement>
                    <CmsElement cmsId="a44d6aea-34" as="button" onClick={() => setSelected(product)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--wc-outline-variant)] bg-transparent py-2.5 text-xs font-bold text-on-surface transition-all hover:border-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)] hover:text-on-primary">
                      View Details <Icon name="arrow_forward" className="text-base" />
                    </CmsElement>
                  </CmsElement>
                </CmsElement>
              </StaggerItem></CmsInstance>
            ))}
          </StaggerContainer>
        )}

        {/* Product Modal */}
        {selected && (
          <CmsElement cmsId="a44d6aea-35" as="div" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--wc-bg)]/80 backdrop-blur-md p-4 sm:p-6" onClick={() => setSelected(null)}>
            <CmsElement cmsId="a44d6aea-36" as="div" className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] shadow-[0_0_80px_rgba(0,0,0,0.8)]" onClick={(event) => event.stopPropagation()}>

              {/* Header / Sticky Close */}
              <CmsElement cmsId="a44d6aea-37" as="div" className="flex items-center justify-between border-b border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/90 p-6 backdrop-blur-xl">
                <CmsElement cmsId="a44d6aea-38" as="div">
                  <CmsElement cmsId="a44d6aea-39" as="p" className="text-[10px] font-bold tracking-widest text-[var(--wc-secondary)] uppercase mb-1">{selected.category}</CmsElement>
                  <CmsElement cmsId="a44d6aea-40" as="h2" className="text-2xl font-black text-on-surface line-clamp-1">{selected.name}</CmsElement>
                </CmsElement>
                <CmsElement cmsId="a44d6aea-41" as="button" onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110">
                  <Icon name="close" />
                </CmsElement>
              </CmsElement>

              {/* Scrollable Content */}
              <CmsElement cmsId="a44d6aea-42" as="div" className="flex-1 overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <CmsInstance key={selected.id} instance={String(selected.id)}><ProductGallery key={selected.id} product={selected} /></CmsInstance>

                {selected.video_url ? (
                  <CmsElement cmsId="a44d6aea-43" as="div" className="mb-10">
                    <CmsElement cmsId="a44d6aea-44" as="h3" className="mb-4 text-xl font-black text-on-surface">Project Video</CmsElement>
                    <ProductVideoPreview url={selected.video_url} title={`${selected.name} video`} />
                  </CmsElement>
                ) : null}

                <CmsElement cmsId="a44d6aea-45" as="div" className="mb-10">
                  <CmsElement cmsId="a44d6aea-46" as="h3" className="text-xl font-black text-on-surface mb-4">Overview</CmsElement>
                  <CmsElement cmsId="a44d6aea-47" as="div" className="product-rich-content" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(selected.full_description ?? selected.short_description ?? "No detailed overview available.") }} />
                </CmsElement>

                <CmsElement cmsId="a44d6aea-48" as="div" className="mb-10 grid gap-4 sm:grid-cols-2">
                  <CmsElement cmsId="a44d6aea-49" as="div" className="rounded-2xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] p-6 hover:bg-[var(--wc-surface-low)] transition-colors">
                    <CmsElement cmsId="a44d6aea-50" as="p" className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">Access / Pricing</CmsElement>
                    <CmsElement cmsId="a44d6aea-51" as="p" className="mt-2 text-xl font-black text-on-surface">{selected.price_or_access_type ?? "Not specified"}</CmsElement>
                  </CmsElement>
                  <CmsElement cmsId="a44d6aea-52" as="div" className="rounded-2xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] p-6 hover:bg-[var(--wc-surface-low)] transition-colors">
                    <CmsElement cmsId="a44d6aea-53" as="p" className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">Availability</CmsElement>
                    <CmsElement cmsId="a44d6aea-54" as="p" className="mt-2 text-xl font-black text-on-surface capitalize">{selected.status}</CmsElement>
                  </CmsElement>
                </CmsElement>

                <CmsElement cmsId="a44d6aea-55" as="div" className="mb-10">
                  <CmsElement cmsId="a44d6aea-56" as="h3" className="text-xl font-black text-on-surface mb-5">Key Features</CmsElement>
                  <CmsElement cmsId="a44d6aea-57" as="ul" className="grid gap-3 sm:grid-cols-2">
                    {(selected.features ?? []).length > 0 ? (
                      (selected.features ?? []).map((feature) => (
                        <CmsElement cmsId="a44d6aea-58" as="li" instance={String(feature)} key={feature} className="flex items-start gap-3 rounded-xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] p-4 hover:border-[var(--wc-outline-variant)] transition-colors">
                          <CmsElement cmsId="a44d6aea-59" as="div" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)]">
                            <Icon name="check" className="text-sm" />
                          </CmsElement>
                          <CmsElement cmsId="a44d6aea-60" as="span" className="text-sm font-bold text-[var(--wc-on-surface-variant)]">{feature}</CmsElement>
                        </CmsElement>
                      ))
                    ) : (
                      <CmsElement cmsId="a44d6aea-61" as="li" className="text-[#5B6B88]">No feature list provided.</CmsElement>
                    )}
                  </CmsElement>
                </CmsElement>

                <CmsElement cmsId="a44d6aea-62" as="div" className="mt-10 border-t border-[var(--wc-outline-variant)] pt-8 pb-4 text-center">
                  <CmsElement cmsId="a44d6aea-63" as="a"
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I am interested in "${selected.name}". Please share its details and access options.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-10 py-4 text-base font-black text-on-primary transition-transform hover:scale-[1.02] shadow-[0_0_30px_rgba(var(--landing-accent-rgb),0.3)]"
                  >
                    CONTACT ON WHATSAPP <Icon name="open_in_new" className="text-lg" />
                  </CmsElement>
                </CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>
        )}
      </CmsElement>
    </CmsElement>
  );
}

