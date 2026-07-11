import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Blog } from "@/lib/supabase/types";

export type BlogInput = {
  title: string;
  slug: string;
  target_keyword?: string | null;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  cover_image_github_path?: string | null;
  cover_image_github_url?: string | null;
  cover_image_cdn_url?: string | null;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  display_order?: number;
  published?: boolean;
  featured?: boolean;
  published_at?: string | null;
};

export function slugifyBlogTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeBlogTags(tags: string | string[] | null | undefined) {
  const source = Array.isArray(tags) ? tags : (tags ?? "").split(",");
  return Array.from(new Set(source.map((tag) => tag.trim()).filter(Boolean)));
}

export function normalizeBlogInput(input: BlogInput) {
  const title = input.title.trim();
  const slug = slugifyBlogTitle(input.slug || input.title);
  const published = Boolean(input.published);
  const publishedAt = input.published_at?.trim() || (published ? new Date().toISOString() : null);

  return {
    title,
    slug,
    target_keyword: input.target_keyword?.trim() || null,
    excerpt: input.excerpt?.trim() || null,
    content: input.content.trim(),
    cover_image_url: input.cover_image_url?.trim() || null,
    cover_image_github_path: input.cover_image_github_path?.trim() || null,
    cover_image_github_url: input.cover_image_github_url?.trim() || null,
    cover_image_cdn_url: input.cover_image_cdn_url?.trim() || null,
    tags: normalizeBlogTags(input.tags),
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    display_order: Number.isFinite(input.display_order) ? Number(input.display_order) : 1,
    published,
    featured: Boolean(input.featured),
    published_at: publishedAt,
  };
}

export function validateBlogInput(input: BlogInput) {
  const normalized = normalizeBlogInput(input);
  if (!normalized.title) return { ok: false as const, error: "Title is required." };
  if (!normalized.slug) return { ok: false as const, error: "Slug is required." };
  if (!normalized.content) return { ok: false as const, error: "Content is required." };
  if (normalized.seo_description && normalized.seo_description.length > 160) {
    return { ok: false as const, error: "SEO description must be 160 characters or less." };
  }
  if (!Number.isFinite(normalized.display_order)) {
    return { ok: false as const, error: "Display order must be a number." };
  }
  return { ok: true as const, data: normalized };
}

export async function getBlogs({ publishedOnly = false }: { publishedOnly?: boolean } = {}) {
  const supabase = createSupabasePublicClient();
  let query = supabase
    .from("blogs")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (publishedOnly) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Blog[];
}

export async function getBlogBySlug(slug: string, { publishedOnly = true }: { publishedOnly?: boolean } = {}) {
  const supabase = createSupabasePublicClient();
  let query = supabase.from("blogs").select("*").eq("slug", slug);

  if (publishedOnly) {
    query = query.eq("published", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data as Blog | null;
}

export async function getRelatedBlogs(blog: Blog, limit = 3) {
  const blogs = await getBlogs({ publishedOnly: true });
  const tags = new Set(blog.tags ?? []);
  const related = blogs
    .filter((item) => item.id !== blog.id)
    .map((item) => ({
      item,
      score: (item.tags ?? []).filter((tag) => tags.has(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || Number(new Date(b.item.published_at ?? b.item.created_at)) - Number(new Date(a.item.published_at ?? a.item.created_at)))
    .slice(0, limit)
    .map(({ item }) => item);

  return related;
}
