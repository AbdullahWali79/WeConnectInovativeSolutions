import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { ProductVideoPreview } from "@/components/product-video-preview";
import { FadeIn } from "@/components/public/animations";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getWhatsAppSettingsOrDefaults } from "@/lib/whatsapp/settings";
import { normalizeImageUrl } from "@/lib/image-url";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { slugify, isUUID, buildProductSlug } from "@/lib/slug";
import type { Product } from "@/lib/supabase/types";

export const revalidate = 300;
export const dynamic = "force-dynamic";

type ProductDetailProps = {
  params: Promise<{ slug: string }>;
};

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

const PRODUCT_COLUMNS =
  "id,name,category,image_url,image_github_path,image_github_url,image_cdn_url,short_description,full_description,price_or_access_type,badge,product_link,features,gallery_urls,related_links,video_url,show_in_branding,source_project_id,student_name,slug,seo_title,seo_description,seo_keywords,status,display_order,created_at,updated_at";

/**
 * Resolve the effective slug for a product.
 *
 * Priority: admin-set slug → auto-generated slug from name.
 */
function resolveSlug(product: Product, existingSlugs?: Map<string, string>): string {
  if (product.slug && product.slug.trim()) {
    return product.slug.trim();
  }
  return buildProductSlug(product.name, product.id, existingSlugs);
}

/**
 * Trim a meta description to Google's ~160 char display limit without
 * cutting a word in half. Falls back to a hard cut when there is no sensible
 * word boundary.
 */
function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > max * 0.75 ? cut.slice(0, lastSpace) : cut;
  return safe.replace(/[\s,;:.–—-]+$/g, "") + "…";
}

/**
 * Fetch a product by slug or UUID.
 *
 * The `slug` param can be either:
 *  - a UUID (old-style URL, e.g. /products/abc-123-...) → direct lookup by id
 *  - a DB slug (admin-set, e.g. /products/ai-resume-builder) → lookup by slug column
 *  - an auto-generated slug (from product name) → fetch all and match
 */
async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const supabase = createSupabasePublicClient();

    // If it's a UUID, do a direct id lookup (backward compat with old URLs)
    if (isUUID(slug)) {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("id", slug)
        .eq("status", "active")
        .single();

      if (error || !data) return null;
      return data as Product;
    }

    // Try direct lookup by slug column first (admin-set slug)
    const { data: slugMatch } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (slugMatch) return slugMatch as Product;

    // Fallback: fetch all active products and match by canonical slug OR by the
    // legacy auto-generated slug. Keeping the legacy map means URLs that were
    // shared/indexed before the SEO migration still resolve — the page then
    // 308-redirects them to the canonical admin slug (see ProductDetailPage).
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (error || !data) return null;

    const products = data as Product[];

    const canonicalMap = new Map<string, Product>();
    const legacyMap = new Map<string, Product>();
    const canonicalSeen = new Map<string, string>();
    const legacySeen = new Map<string, string>();

    for (const product of products) {
      // Admin-set (or auto-generated) canonical slug
      const canonicalSlug = resolveSlug(product, canonicalSeen);
      canonicalSeen.set(canonicalSlug, product.id);
      if (!canonicalMap.has(canonicalSlug)) canonicalMap.set(canonicalSlug, product);

      // Legacy slug derived straight from the product name
      const legacySlug = buildProductSlug(product.name, product.id, legacySeen);
      legacySeen.set(legacySlug, product.id);
      if (!legacyMap.has(legacySlug)) legacyMap.set(legacySlug, product);
    }

    return canonicalMap.get(slug) ?? legacyMap.get(slug) ?? null;
  } catch {
    return null;
  }
}

async function getRelatedProducts(category: string, excludeId: string): Promise<Product[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "active")
      .eq("category", category)
      .neq("id", excludeId)
      .order("display_order", { ascending: true })
      .limit(3);

    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}

/**
 * Get all active products with their slugs — used for generateStaticParams
 * and for building the slug map on the listing page.
 */
async function getAllActiveProducts(): Promise<Product[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}

/**
 * Pre-render product pages at build time for optimal SEO.
 */
export async function generateStaticParams() {
  const products = await getAllActiveProducts();

  // Build slug map for collision detection
  const existingSlugs = new Map<string, string>();
  const params: { slug: string }[] = [];

  for (const product of products) {
    const slug = resolveSlug(product, existingSlugs);
    existingSlugs.set(slug, product.id);
    params.push({ slug });
  }

  return params;
}

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found",
      description: "The requested product could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const imageUrl = normalizeImageUrl(product.image_cdn_url ?? product.image_url);
  const productSlug = resolveSlug(product);
  const canonicalUrl = absoluteUrl(`/products/${productSlug}`);

  // Use admin-provided SEO title, or fall back to auto-generated
  const seoTitle =
    product.seo_title?.trim() ||
    `${product.name} – ${product.category} Software | ${SITE_NAME}`;

  // Use admin-provided SEO description, or fall back to auto-generated.
  // trimDescription keeps the snippet inside Google's display limit and
  // avoids cutting a word in half.
  const seoDescription = trimDescription(
    product.seo_description?.trim() ||
      product.short_description ||
      product.full_description?.replace(/[#*`>]/g, "") ||
      `Discover ${product.name}, a ${product.badge} ${product.category.toLowerCase()} solution by ${SITE_NAME}. ${product.features?.slice(0, 3).join(", ") || ""}`
  );

  // Use admin-provided keywords, or fall back to auto-generated
  const keywords =
    product.seo_keywords?.length && product.seo_keywords.length > 0
      ? product.seo_keywords
      : [
          product.name,
          product.category,
          `${product.category} software`,
          `${product.category} tool`,
          product.badge === "free" ? "free software" : product.badge === "paid" ? "paid software" : `${product.badge} product`,
          "software product",
          "digital tool",
          SITE_NAME,
          ...(product.features ?? []).slice(0, 8),
          ...(product.student_name ? [product.student_name] : []),
        ];

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: seoTitle,
      description: seoDescription,
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630, alt: `${product.name} – ${product.category} product screenshot` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
    other: {
      "product:price": product.price_or_access_type ?? "",
      "product:availability": product.status === "active" ? "in stock" : "out of stock",
      "product:category": product.category,
      "product:brand": SITE_NAME,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Badge styling                                                      */
/* ------------------------------------------------------------------ */

const badgeTone: Record<string, string> = {
  premium: "bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] text-on-primary",
  hot: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
  new: "bg-gradient-to-r from-[#4379FF] to-blue-600 text-white",
  free: "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white",
  paid: "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { slug } = await params;
  const [product, whatsappSettings] = await Promise.all([
    getProductBySlug(slug),
    getWhatsAppSettingsOrDefaults(),
  ]);

  if (!product) notFound();

  // Consolidate legacy / UUID / auto-generated URLs onto the canonical SEO slug.
  // A permanent redirect preserves link equity for URLs shared before the
  // migration and prevents duplicate-content penalties in search engines.
  const canonicalSlug = resolveSlug(product);
  if (canonicalSlug !== slug) {
    permanentRedirect(`/products/${canonicalSlug}`);
  }

  const related = await getRelatedProducts(product.category, product.id).catch(() => []);
  const imageUrl = normalizeImageUrl(product.image_cdn_url ?? product.image_url);
  const galleryImages = (product.gallery_urls?.length
    ? product.gallery_urls
    : [product.image_cdn_url ?? product.image_url]
  )
    .filter((v): v is string => Boolean(v))
    .map((v) => normalizeImageUrl(v) ?? v);

  const descriptionHtml = renderMarkdownToHtml(
    product.full_description || product.short_description || "No detailed overview available."
  );

  const whatsappNumber = whatsappSettings.whatsapp_number.replace(/\D/g, "");
  const canonicalUrl = absoluteUrl(`/products/${canonicalSlug}`);

  /* JSON-LD structured data for SEO */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.short_description || product.full_description?.slice(0, 300) || undefined,
    applicationCategory: product.category,
    url: canonicalUrl,
    image: imageUrl || undefined,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    ...(product.features?.length
      ? { featureList: product.features }
      : {}),
    ...(product.price_or_access_type
      ? {
          offers: {
            "@type": "Offer",
            price: product.badge === "free" ? "0" : "0",
            priceCurrency: "USD",
            description: product.price_or_access_type,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(product.student_name
      ? { author: { "@type": "Person", name: product.student_name } }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Products", item: absoluteUrl("/products") },
      { "@type": "ListItem", position: 3, name: product.name, item: canonicalUrl },
    ],
  };

  return (
    <CmsElement cmsId="prod-slug-0" as="main" className="min-h-screen bg-[var(--wc-bg)] text-on-surface">
      <PublicHeader />

      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero / breadcrumb */}
      <CmsElement cmsId="prod-slug-1" as="section" className="relative overflow-hidden pt-28 md:pt-36">
        <CmsElement cmsId="prod-slug-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none" />

        <CmsElement cmsId="prod-slug-3" as="div" className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
          {/* Breadcrumb */}
          <CmsElement cmsId="prod-slug-4" as="nav" className="mb-6 flex items-center gap-2 text-xs font-bold text-[var(--wc-on-surface-variant)]">
            <CmsLink cmsId="prod-slug-5" href="/" className="transition hover:text-[var(--wc-secondary)]">Home</CmsLink>
            <Icon name="chevron_right" className="text-sm opacity-50" />
            <CmsLink cmsId="prod-slug-6" href="/products" className="transition hover:text-[var(--wc-secondary)]">Products</CmsLink>
            <Icon name="chevron_right" className="text-sm opacity-50" />
            <CmsElement cmsId="prod-slug-7" as="span" className="truncate text-[var(--wc-secondary)]">{product.name}</CmsElement>
          </CmsElement>

          {/* Back link */}
          <CmsLink cmsId="prod-slug-8" href="/products" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--wc-secondary)] transition hover:text-on-surface">
            <Icon name="arrow_back" className="text-lg" /> Back to all products
          </CmsLink>

          {/* Title block */}
          <FadeIn>
            <CmsElement cmsId="prod-slug-9" as="div" className="mb-6 flex flex-wrap items-center gap-3">
              <CmsElement cmsId="prod-slug-10" as="span" className="rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">
                {product.category}
              </CmsElement>
              <CmsElement cmsId="prod-slug-11" as="span" className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg ${badgeTone[product.badge] ?? "bg-slate-800 text-slate-300"}`}>
                {product.badge}
              </CmsElement>
              {product.student_name ? (
                <CmsElement cmsId="prod-slug-12" as="span" className="rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-3 py-1 text-xs font-bold text-[var(--wc-on-surface-variant)]">
                  by {product.student_name}
                </CmsElement>
              ) : null}
            </CmsElement>

            <CmsElement cmsId="prod-slug-13" as="h1" className="max-w-4xl text-4xl font-black leading-tight text-on-surface sm:text-5xl md:text-6xl">
              {product.name}
            </CmsElement>

            {product.short_description ? (
              <CmsElement cmsId="prod-slug-14" as="p" className="mt-6 max-w-3xl text-lg leading-8 text-[var(--wc-on-surface-variant)]">
                {product.short_description}
              </CmsElement>
            ) : null}
          </FadeIn>
        </CmsElement>
      </CmsElement>

      {/* Main content */}
      <CmsElement cmsId="prod-slug-15" as="section" className="py-12 md:py-16">
        <CmsElement cmsId="prod-slug-16" as="div" className="mx-auto max-w-6xl px-5 md:px-8">
          <CmsElement cmsId="prod-slug-17" as="div" className="grid gap-10 lg:grid-cols-[1fr_360px]">

            {/* Left column: gallery + description + features */}
            <CmsElement cmsId="prod-slug-18" as="div">
              {/* Gallery / hero image */}
              {galleryImages.length > 0 ? (
                <CmsElement cmsId="prod-slug-19" as="div" className="mb-10 overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)]">
                  <CmsElement cmsId="prod-slug-20" as="img"
                    src={galleryImages[0]}
                    alt={`${product.name} – ${product.category} product screenshot`}
                    className="max-h-[480px] w-full object-contain"
                  />
                </CmsElement>
              ) : (
                <CmsElement cmsId="prod-slug-21" as="div" className="mb-10 flex h-64 items-center justify-center rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)]">
                  <Icon name="code_blocks" className="text-6xl text-[var(--wc-on-surface-variant)] opacity-20" />
                </CmsElement>
              )}

              {/* Video */}
              {product.video_url ? (
                <CmsElement cmsId="prod-slug-22" as="div" className="mb-10">
                  <CmsElement cmsId="prod-slug-23" as="h2" className="mb-4 text-xl font-black text-on-surface">Project Video / Demo</CmsElement>
                  <ProductVideoPreview url={product.video_url} title={`${product.name} video demo`} />
                </CmsElement>
              ) : null}

              {/* Full description */}
              <CmsElement cmsId="prod-slug-24" as="div" className="mb-10">
                <CmsElement cmsId="prod-slug-25" as="h2" className="mb-4 text-xl font-black text-on-surface">Overview</CmsElement>
                <CmsElement cmsId="prod-slug-26" as="div" className="product-rich-content" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
              </CmsElement>

              {/* Features */}
              <CmsElement cmsId="prod-slug-27" as="div" className="mb-10">
                <CmsElement cmsId="prod-slug-28" as="h2" className="mb-5 text-xl font-black text-on-surface">Key Features</CmsElement>
                <CmsElement cmsId="prod-slug-29" as="ul" className="grid gap-3 sm:grid-cols-2">
                  {(product.features ?? []).length > 0 ? (
                    (product.features ?? []).map((feature) => (
                      <CmsElement cmsId="prod-slug-30" as="li" instance={String(feature)} key={feature} className="flex items-start gap-3 rounded-xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] p-4">
                        <CmsElement cmsId="prod-slug-31" as="div" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--wc-secondary)]/20 text-[var(--wc-secondary)]">
                          <Icon name="check" className="text-sm" />
                        </CmsElement>
                        <CmsElement cmsId="prod-slug-32" as="span" className="text-sm font-bold text-[var(--wc-on-surface-variant)]">{feature}</CmsElement>
                      </CmsElement>
                    ))
                  ) : (
                    <CmsElement cmsId="prod-slug-33" as="li" className="text-[#5B6B88]">No feature list provided.</CmsElement>
                  )}
                </CmsElement>
              </CmsElement>
            </CmsElement>

            {/* Right column: sticky sidebar with pricing + CTA */}
            <CmsElement cmsId="prod-slug-34" as="aside" className="lg:sticky lg:top-28 lg:self-start">
              <CmsElement cmsId="prod-slug-35" as="div" className="rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-6 shadow-sm">

                {/* Pricing */}
                <CmsElement cmsId="prod-slug-36" as="div" className="mb-6">
                  <CmsElement cmsId="prod-slug-37" as="p" className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">Access / Pricing</CmsElement>
                  <CmsElement cmsId="prod-slug-38" as="p" className="mt-2 text-2xl font-black text-on-surface">{product.price_or_access_type ?? "Contact for details"}</CmsElement>
                </CmsElement>

                {/* Availability */}
                <CmsElement cmsId="prod-slug-39" as="div" className="mb-6">
                  <CmsElement cmsId="prod-slug-40" as="p" className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">Availability</CmsElement>
                  <CmsElement cmsId="prod-slug-41" as="p" className="mt-2 text-lg font-black capitalize text-emerald-500">{product.status}</CmsElement>
                </CmsElement>

                {/* External product link */}
                {product.product_link ? (
                  <CmsElement cmsId="prod-slug-42" as="a" href={product.product_link} target="_blank" rel="noreferrer"
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wc-outline-variant)] bg-transparent px-6 py-3.5 text-sm font-black text-on-surface transition-all hover:border-[var(--wc-secondary)] hover:bg-[var(--wc-secondary)]/10">
                    Visit Product <Icon name="open_in_new" className="text-base" />
                  </CmsElement>
                ) : null}

                {/* WhatsApp CTA */}
                <CmsElement cmsId="prod-slug-43" as="a"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello, I am interested in "${product.name}". Please share its details and access options.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-6 py-4 text-base font-black text-on-primary transition-transform hover:scale-[1.02] shadow-[0_0_30px_rgba(var(--landing-accent-rgb),0.3)]"
                >
                  <Icon name="chat" className="text-lg" /> CONTACT ON WHATSAPP
                </CmsElement>

                {/* Share */}
                <CmsElement cmsId="prod-slug-44" as="div" className="mt-6 border-t border-[var(--wc-outline-variant)] pt-6">
                  <CmsElement cmsId="prod-slug-45" as="p" className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">Share this product</CmsElement>
                  <CmsElement cmsId="prod-slug-46" as="div" className="flex gap-2">
                    <CmsElement cmsId="prod-slug-47" as="a"
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`}
                      target="_blank" rel="noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--wc-outline-variant)] text-[var(--wc-on-surface-variant)] transition hover:border-[var(--wc-secondary)] hover:text-[var(--wc-secondary)]"
                      aria-label="Share on Facebook"
                    >
                      <Icon name="share" className="text-lg" />
                    </CmsElement>
                    <CmsElement cmsId="prod-slug-48" as="a"
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(canonicalUrl)}`}
                      target="_blank" rel="noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--wc-outline-variant)] text-[var(--wc-on-surface-variant)] transition hover:border-[var(--wc-secondary)] hover:text-[var(--wc-secondary)]"
                      aria-label="Share on Twitter / X"
                    >
                      <Icon name="send" className="text-lg" />
                    </CmsElement>
                    <CmsElement cmsId="prod-slug-49" as="a"
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`}
                      target="_blank" rel="noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--wc-outline-variant)] text-[var(--wc-on-surface-variant)] transition hover:border-[var(--wc-secondary)] hover:text-[var(--wc-secondary)]"
                      aria-label="Share on LinkedIn"
                    >
                      <Icon name="group" className="text-lg" />
                    </CmsElement>
                  </CmsElement>
                </CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      {/* Related products */}
      {related.length > 0 ? (
        <CmsElement cmsId="prod-slug-50" as="section" className="border-t border-[var(--wc-outline-variant)] py-12 md:py-16">
          <CmsElement cmsId="prod-slug-51" as="div" className="mx-auto max-w-6xl px-5 md:px-8">
            <CmsElement cmsId="prod-slug-52" as="h2" className="mb-8 text-2xl font-black text-on-surface">Related Products</CmsElement>
            <CmsElement cmsId="prod-slug-53" as="div" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rel) => {
                const relImg = normalizeImageUrl(rel.image_cdn_url ?? rel.image_url);
                const relSlug = resolveSlug(rel);
                return (
                  <CmsLink cmsId="prod-slug-54" instance={String(rel.id)} key={rel.id} href={`/products/${relSlug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--wc-secondary)]/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
                  >
                    <CmsElement cmsId="prod-slug-55" as="div" className="relative h-40 w-full overflow-hidden bg-[var(--wc-surface-lowest)]">
                      {relImg ? (
                        <CmsElement cmsId="prod-slug-56" as="img" src={relImg} alt={rel.name} className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <CmsElement cmsId="prod-slug-57" as="div" className="flex h-full items-center justify-center text-[var(--wc-on-surface-variant)]">
                          <Icon name="code_blocks" className="text-6xl opacity-20" />
                        </CmsElement>
                      )}
                    </CmsElement>
                    <CmsElement cmsId="prod-slug-58" as="div" className="flex flex-1 flex-col p-4">
                      <CmsElement cmsId="prod-slug-59" as="p" className="text-[10px] font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{rel.category}</CmsElement>
                      <CmsElement cmsId="prod-slug-60" as="h3" className="mt-1 line-clamp-2 text-base font-bold leading-snug text-on-surface transition-colors group-hover:text-[var(--wc-secondary)]">{rel.name}</CmsElement>
                      {rel.short_description ? (
                        <CmsElement cmsId="prod-slug-61" as="p" className="mt-2 line-clamp-2 text-xs text-[var(--wc-on-surface-variant)]">{rel.short_description}</CmsElement>
                      ) : null}
                      <CmsElement cmsId="prod-slug-62" as="span" className="mt-auto pt-4 text-xs font-black text-[var(--wc-secondary)]">View Details &rarr;</CmsElement>
                    </CmsElement>
                  </CmsLink>
                );
              })}
            </CmsElement>
          </CmsElement>
        </CmsElement>
      ) : null}
    </CmsElement>
  );
}
