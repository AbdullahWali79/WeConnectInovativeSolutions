import type { MetadataRoute } from "next";
import { automationServices } from "@/lib/automation-services";
import { absoluteUrl } from "@/lib/seo";
import { getBlogs } from "@/lib/blogs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const blogs = await getBlogs({ publishedOnly: true }).catch(() => []);
  const corePages = [
    ["/", "weekly", 1],
    ["/services", "weekly", 0.9],
    ["/products", "weekly", 0.7],
    ["/blogs", "weekly", 0.7],
    ["/contact", "monthly", 0.8],
    ["/team", "monthly", 0.5],
    ["/testimonials", "monthly", 0.6],
    ["/research-consultancy", "monthly", 0.5],
  ] as const;

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
  ];
}
