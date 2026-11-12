import type { MetadataRoute } from "next";
import { automationServices } from "@/lib/automation-services";
import { absoluteUrl } from "@/lib/seo";
import { getBlogs } from "@/lib/blogs";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { buildProductSlug } from "@/lib/slug";
import type { Product } from "@/lib/supabase/types";

async function getActiveProducts(): Promise<{ id: string; name: string; updated_at: string }[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,name,updated_at")
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (error || !data) return [];
    return data.map((p) => ({ id: String(p.id), name: String(p.name), updated_at: String(p.updated_at) }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [blogs, products] = await Promise.all([
    getBlogs({ publishedOnly: true }).catch(() => []),
    getActiveProducts(),
  ]);
  const corePages = [
    ["/", "weekly", 1],
    ["/services", "weekly", 0.9],
    ["/products", "weekly", 0.8],
    ["/blogs", "weekly", 0.7],
    ["/contact", "monthly", 0.8],
    ["/team", "monthly", 0.5],
    ["/testimonials", "monthly", 0.6],
    ["/research-consultancy", "monthly", 0.5],
  ] as const;

  // Build slug map for collision-free product URLs in the sitemap
  const existingSlugs = new Map<string, string>();

  return [
    ...corePages.map(([path, changeFrequency, priority]) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...automationServices.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...blogs.map((blog) => ({
      url: absoluteUrl(`/blogs/${blog.slug}`),
      lastModified: new Date(blog.updated_at || blog.published_at || blog.created_at),
      changeFrequency: "monthly" as const,
      priority: blog.featured ? 0.8 : 0.7,
    })),
    ...products.map((product) => {
      const slug = buildProductSlug(product.name, product.id, existingSlugs);
      existingSlugs.set(slug, product.id);
      return {
        url: absoluteUrl(`/products/${slug}`),
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    }),
  ];
}
