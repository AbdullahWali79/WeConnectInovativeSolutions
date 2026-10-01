import "server-only";
import { navCategories, groupId } from "./navigation";
import { automationServices } from "@/lib/automation-services";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PageEntry } from "./model";

export async function getPageEntries(): Promise<PageEntry[]> {
  const entries: PageEntry[] = [{ id: "/", label: "Home", href: "/", kind: "page" }];
  for (const category of navCategories) {
    const id = category.href || groupId(category.label);
    entries.push({ id, label: category.label, href: category.href, kind: category.href ? "page" : "group" });
    for (const item of category.items ?? []) entries.push({ id: item.href, label: item.label, href: item.href, parent: id, kind: item.href.includes("#") ? "anchor" : "page" });
  }
  for (const service of automationServices) entries.push({ id: `/services/${service.slug}`, href: `/services/${service.slug}`, label: service.name, parent: "/services", kind: "page" });
  for (const [path, label] of [["/feedback", "Feedback"], ["/privacy-policy", "Privacy Policy"], ["/terms", "Terms & Conditions"], ["/prompts/submit", "Submit Prompt"], ["/prompts/contribute", "Contribute Prompt"]]) {
    entries.push({ id: path, href: path, label, kind: "page" });
  }
  const supabase = await createSupabaseServerClient();
  const [categories, simulations, blogs] = await Promise.all([
    supabase.from("simulation_categories").select("id,name,slug"),
    supabase.from("simulations").select("id,title,slug,category_id").eq("is_published", true),
    supabase.from("blogs").select("title,slug").eq("published", true),
  ]);
  for (const cat of categories.data ?? []) {
    const id = `/simulations#${cat.slug}`;
    entries.push({ id, href: id, label: cat.name, parent: "group:simulations", kind: "anchor" });
    for (const sim of (simulations.data ?? []).filter(s => s.category_id === cat.id)) {
      const path = `/simulations/${cat.slug}/${sim.slug}`;
      entries.push({ id: path, href: path, label: sim.title, parent: id, kind: "page", source: "/admin/simulations" });
    }
  }
  for (const blog of blogs.data ?? []) {
    const path = `/blogs/${blog.slug}`;
    entries.push({ id: path, href: path, label: blog.title, parent: "/blogs", kind: "page", source: "/admin/blogs" });
  }
  return entries;
}
