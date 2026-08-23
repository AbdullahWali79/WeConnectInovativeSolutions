import type { PublicClientHuntService } from "@/lib/supabase/types";

export const PUBLIC_CLIENT_HUNT_SERVICES: { value: PublicClientHuntService; label: string }[] = [
  { value: "website_development", label: "Website Development" },
  { value: "chatbot", label: "AI Chatbot" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "social_media_marketing", label: "Social Media Marketing" },
  { value: "seo", label: "SEO" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "automation", label: "Business Automation" },
  { value: "other", label: "Other" },
];

export function publicClientHuntServiceLabel(value: string) {
  return PUBLIC_CLIENT_HUNT_SERVICES.find((item) => item.value === value)?.label ?? value.replaceAll("_", " ");
}

export function publicClientHuntSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
