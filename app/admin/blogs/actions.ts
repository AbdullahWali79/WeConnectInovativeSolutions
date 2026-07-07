"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminOnly } from "@/lib/admin-access";
import { getBlogBySlug as getPublicBlogBySlug, type BlogInput, validateBlogInput } from "@/lib/blogs";
import type { Blog } from "@/lib/supabase/types";

function isMissingBlogMediaMetadataColumn(error: { message?: string } | null) {
  return Boolean(error?.message && /cover_image_github_path|cover_image_github_url|cover_image_cdn_url|column/i.test(error.message));
}

function stripBlogMediaMetadata<T extends Record<string, unknown>>(payload: T) {
  const rest = { ...payload };
  delete rest.cover_image_github_path;
  delete rest.cover_image_github_url;
  delete rest.cover_image_cdn_url;
  return rest;
}

export async function getBlogs() {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Blog[];
}

export async function getBlogBySlug(slug: string) {
  return getPublicBlogBySlug(slug, { publishedOnly: true });
}

export async function createBlog(input: BlogInput) {
  const profile = await requireAdminOnly();
  const validation = validateBlogInput(input);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = createSupabaseServiceClient();
  const payload = {
    ...validation.data,
    created_by: profile.id,
  };
  let { error } = await supabase.from("blogs").insert(payload);

  if (error && isMissingBlogMediaMetadataColumn(error)) {
    const fallback = await supabase.from("blogs").insert(stripBlogMediaMetadata(payload));
    error = fallback.error;
  }

  if (error) {
    return { ok: false, error: error.code === "23505" ? "Slug must be unique." : error.message };
  }

  revalidatePath("/admin/blogs");
  revalidatePath("/blogs");
  return { ok: true };
}

export async function updateBlog(id: string, input: BlogInput) {
  await requireAdminOnly();
  const validation = validateBlogInput(input);
  if (!validation.ok) return { ok: false, error: validation.error };

  const supabase = createSupabaseServiceClient();
  let { error } = await supabase.from("blogs").update(validation.data).eq("id", id);

  if (error && isMissingBlogMediaMetadataColumn(error)) {
    const fallback = await supabase.from("blogs").update(stripBlogMediaMetadata(validation.data)).eq("id", id);
    error = fallback.error;
  }

  if (error) {
    return { ok: false, error: error.code === "23505" ? "Slug must be unique." : error.message };
  }

  revalidatePath("/admin/blogs");
  revalidatePath("/blogs");
  revalidatePath(`/blogs/${validation.data.slug}`);
  return { ok: true };
}

export async function deleteBlog(id: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("blogs").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/blogs");
  revalidatePath("/blogs");
  return { ok: true };
}


