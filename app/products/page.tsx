import { CmsElement } from "@/components/cms/cms-element";
import { ProductsCatalog, fallbackProducts } from "@/components/public/products-catalog";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getWhatsAppSettingsOrDefaults } from "@/lib/whatsapp/settings";
import { createPageMetadata, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { buildProductSlug, slugify } from "@/lib/slug";
import type { Product } from "@/lib/supabase/types";

export const metadata = createPageMetadata({
  title: "Software Products & Automation Portfolio",
  description: "Explore 100+ software products, business tools, AI applications, and digital solutions built by We Connect Innovative Solutions. Browse our portfolio of web apps, mobile apps, dashboards, and automation tools.",
  path: "/products",
  keywords: [
    "software products",
    "digital tools",
    "web applications",
    "mobile apps",
    "AI tools",
    "business software",
    "automation tools",
    "software portfolio",
    "We Connect Innovative Solutions",
    "SaaS products",
    "enterprise software",
    "startup tools",
  ],
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProducts(): Promise<Product[]> {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,image_url,image_github_path,image_github_url,image_cdn_url,short_description,full_description,price_or_access_type,badge,product_link,features,gallery_urls,video_url,show_in_branding,source_project_id,student_name,slug,seo_title,seo_description,seo_keywords,status,display_order,created_at,updated_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return fallbackProducts;
      }

      return data as Product[];
    } catch (err) {
      console.error("Error fetching products:", err);
      return fallbackProducts;
    }
}

export default async function ProductsPage() {
  const [products, whatsappSettings] = await Promise.all([
    getProducts(),
    getWhatsAppSettingsOrDefaults(),
  ]);

  // Build JSON-LD ItemList for SEO — helps search engines understand the product catalog
  const existingSlugs = new Map<string, string>();
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Software Products Portfolio",
    description: "Collection of software products, tools, and digital solutions by We Connect Innovative Solutions",
    url: absoluteUrl("/products"),
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((product, index) => {
      const slug = product.slug?.trim() ? slugify(product.slug) : buildProductSlug(product.name, product.id, existingSlugs);
      existingSlugs.set(slug, product.id);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: absoluteUrl(`/products/${slug}`),
      };
    }),
  };

  return (
    <CmsElement cmsId="32959515-0" as="main" className="bg-background text-on-background">
      <PublicHeader />

      {/* JSON-LD: ItemList for product catalog */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <ProductsCatalog initialProducts={products} whatsappNumber={whatsappSettings.whatsapp_number} />
    </CmsElement>
  );
}
