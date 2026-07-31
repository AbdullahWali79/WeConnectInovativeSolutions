import type { Service } from "@/lib/supabase/types";

const now = "2026-07-30T00:00:00.000Z";
const makeService = (service: Omit<Service, "id" | "created_at" | "updated_at" | "status" | "cta_label" | "cta_link">): Service => ({
  ...service,
  id: service.slug,
  status: "active",
  cta_label: "Discuss your project",
  cta_link: "/contact",
  created_at: now,
  updated_at: now,
});

export const fallbackServices: Service[] = [
  makeService({ title: "Custom Web Development", slug: "custom-web-development", category: "Engineering", icon: "language", short_description: "Fast, secure websites and web applications built around your business.", description: "From conversion-focused company websites to advanced portals and dashboards, we design and develop responsive digital experiences using modern, scalable technology.", highlights: ["Business websites", "Web applications & portals", "Performance and security"], featured: true, display_order: 1 }),
  makeService({ title: "WordPress & E-commerce", slug: "wordpress-ecommerce", category: "Commerce", icon: "shopping_cart", short_description: "Professional WordPress stores and content platforms that are easy to manage.", description: "Launch or modernize your online business with tailored WordPress, WooCommerce, product catalog, payment and order-management solutions.", highlights: ["WordPress development", "WooCommerce stores", "Maintenance & optimization"], featured: true, display_order: 2 }),
  makeService({ title: "Mobile App Development", slug: "mobile-app-development", category: "Engineering", icon: "smartphone", short_description: "Cross-platform mobile products designed for real users and business growth.", description: "We create polished Flutter applications with reliable API integrations, intuitive journeys and maintainable code for Android and iOS.", highlights: ["Flutter apps", "API integration", "App UI & release support"], featured: true, display_order: 3 }),
  makeService({ title: "AI Automation & Assistants", slug: "ai-automation-assistants", category: "Artificial Intelligence", icon: "auto_awesome", short_description: "Practical AI workflows that reduce repetitive work and improve response time.", description: "We build custom AI assistants, document workflows, content systems and operational automations aligned with your team and data.", highlights: ["Custom AI assistants", "Workflow automation", "LLM integration"], featured: true, display_order: 4 }),
  makeService({ title: "Digital Marketing & Growth", slug: "digital-marketing-growth", category: "Marketing", icon: "campaign", short_description: "Connected campaigns across search, social media and local business channels.", description: "Our growth services combine content planning, social media, SEO, Google Business Profile and measurable campaign execution.", highlights: ["Social media marketing", "SEO & local visibility", "Campaign strategy"], featured: false, display_order: 5 }),
  makeService({ title: "UI/UX & Product Design", slug: "ui-ux-product-design", category: "Design", icon: "draw", short_description: "Clear, accessible interfaces that make complex products feel simple.", description: "We turn ideas and requirements into user flows, wireframes, high-fidelity interfaces and reusable design systems ready for development.", highlights: ["UX research & flows", "Interface design", "Design systems"], featured: false, display_order: 6 }),
  makeService({ title: "Research & Data Consultancy", slug: "research-data-consultancy", category: "Consultancy", icon: "science", short_description: "Structured research support, analysis and evidence-led reporting.", description: "Our team supports academic and business research with methodology guidance, data analysis, visualization and professional reporting.", highlights: ["Research planning", "Data analysis", "Reports & visualization"], featured: false, display_order: 7 }),
  makeService({ title: "Corporate Training Solutions", slug: "corporate-training-solutions", category: "Learning", icon: "school", short_description: "Job-relevant technology and digital skills training for teams.", description: "Drawing from our active course catalog, we build practical training programs in web development, AI, WordPress, marketing and professional digital skills.", highlights: ["Custom learning tracks", "Hands-on projects", "Progress reporting"], featured: false, display_order: 8 }),
  makeService({ title: "Custom Desktop Applications", slug: "custom-desktop-applications", category: "Engineering", icon: "desktop_windows", short_description: "Robust desktop applications and software updates built with Python and Electron.", description: "We build powerful custom desktop software for Windows, macOS, and Linux using Python and Electron. We also provide maintenance, bug fixes, and feature updates for your existing applications.", highlights: ["Python & Electron Apps", "Cross-platform support", "App maintenance & updates"], featured: false, display_order: 9 }),
];
export function serviceSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
