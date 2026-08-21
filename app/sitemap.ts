import type { MetadataRoute } from "next";
import { automationServices } from "@/lib/automation-services";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
  ];
}
