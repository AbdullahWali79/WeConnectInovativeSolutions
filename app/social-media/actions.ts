"use server";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserProfile } from "@/lib/admin-access";
import { getSocialPlatform, type SocialReactionType } from "@/lib/social-media";

const allowedPlatforms = new Set(["LinkedIn", "Facebook", "Instagram", "X", "Threads", "TikTok"]);

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^127\./.test(address) || /^10\./.test(address) || /^192\.168\./.test(address) || /^169\.254\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address) || address === "0.0.0.0";
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:") throw new Error("Only secure HTTPS post links are allowed.");
  if (url.username || url.password || url.port) throw new Error("This URL format is not allowed.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("This URL is not public.");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("This URL does not resolve to a public website.");
}

function readMeta(html: string, property: string) {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attributes.get("property") ?? attributes.get("name") ?? "").toLowerCase();
    if (key === property.toLowerCase()) return attributes.get("content")?.trim() || null;
  }
  return null;
}

function decodeEntities(value: string | null) {
  return value?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? null;
}

async function fetchPostMetadata(initialUrl: URL) {
  let current = initialUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WeConnectPostPreview/1.0)", Accept: "text/html" },
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The social platform returned an invalid redirect.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) return { title: null, description: null, imageUrl: null, siteName: null };
    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (!contentType.includes("text/html") || contentLength > 1_500_000) return { title: null, description: null, imageUrl: null, siteName: null };
    const html = (await response.text()).slice(0, 1_500_000);
    const rawImage = readMeta(html, "og:image") ?? readMeta(html, "twitter:image");
    let imageUrl: string | null = null;
    if (rawImage) {
      try {
        const parsedImage = new URL(rawImage, current);
        if (parsedImage.protocol === "https:") imageUrl = parsedImage.toString();
      } catch {}
    }
    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
    return {
      title: decodeEntities(readMeta(html, "og:title") ?? readMeta(html, "twitter:title") ?? titleTag)?.slice(0, 180) ?? null,
      description: decodeEntities(readMeta(html, "og:description") ?? readMeta(html, "description") ?? readMeta(html, "twitter:description"))?.slice(0, 500) ?? null,
      imageUrl,
      siteName: decodeEntities(readMeta(html, "og:site_name"))?.slice(0, 100) ?? null,
    };
  }
  throw new Error("The post URL redirected too many times.");
}

async function cacheFeaturedImage(imageUrl: string | null, studentId: string) {
  if (!imageUrl) return null;
  try {
    let url = new URL(imageUrl);
    let response: Response | null = null;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      await assertPublicUrl(url);
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WeConnectPostPreview/1.0)",
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/*",
          Referer: `${url.protocol}//${url.hostname}/`,
        },
        cache: "no-store",
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        url = new URL(location, url);
        response = null;
        continue;
      }
      break;
    }
    if (!response) return null;
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };
    const extension = extensions[contentType];
    if (!extension) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (!buffer.length || buffer.byteLength > 5 * 1024 * 1024) return null;
    const storagePath = `social-posts/${studentId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin.storage.from("branding-assets").upload(storagePath, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return null;
    return supabaseAdmin.storage.from("branding-assets").getPublicUrl(storagePath).data.publicUrl || null;
  } catch {
    return null;
  }
}

async function requireApprovedUser() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.status !== "approved") throw new Error("Your account is not approved.");
  return profile;
}

function normalizeSubmittedPostUrl(url: URL) {
  url.hash = "";
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "igsh",
    "igshid",
    "si",
  ]) {
    url.searchParams.delete(key);
  }
  return url;
}

export async function submitSocialPost(formData: FormData) {
  try {
    const profile = await requireApprovedUser();
    if (profile.role !== "student") throw new Error("Only students can submit social posts.");
    const rawUrl = String(formData.get("url") ?? "").trim();
    if (!rawUrl) throw new Error("Apni published social media post ka link paste karein.");
    const url = normalizeSubmittedPostUrl(new URL(rawUrl));
    const platform = getSocialPlatform(url.hostname);
    if (!allowedPlatforms.has(platform)) throw new Error("Submit a LinkedIn, Facebook, Instagram, X, Threads, or TikTok post URL.");
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      throw new Error("Secure HTTPS social media post link paste karein.");
    }
    const metadata = await fetchPostMetadata(url).catch(() => ({ title: null, description: null, imageUrl: null, siteName: null }));
    const cachedImageUrl = await cacheFeaturedImage(metadata.imageUrl, profile.id);
    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin.from("social_media_posts").insert({
      student_id: profile.id,
      url: url.toString(),
      platform,
      title: metadata.title,
      description: metadata.description,
      image_url: cachedImageUrl ?? metadata.imageUrl,
      site_name: metadata.siteName,
    });
    if (error) {
      if (error.code === "23505") throw new Error("This post URL has already been submitted.");
      throw new Error(error.message);
    }
    revalidatePath("/student/social-media");
    revalidatePath("/admin/social-media");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Post could not be submitted." };
  }
}

export async function toggleSocialReaction(postId: string, reactionType: SocialReactionType) {
  try {
    const profile = await requireApprovedUser();
    if (!(["support", "insightful", "celebrate"] as string[]).includes(reactionType)) throw new Error("Invalid reaction.");
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: existing } = await supabaseAdmin.from("social_media_reactions").select("id,reaction_type").eq("post_id", postId).eq("user_id", profile.id).maybeSingle();
    if (existing?.reaction_type === reactionType) {
      const { error } = await supabaseAdmin.from("social_media_reactions").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else if (existing) {
      const { error } = await supabaseAdmin.from("social_media_reactions").update({ reaction_type: reactionType }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("social_media_reactions").insert({ post_id: postId, user_id: profile.id, reaction_type: reactionType });
      if (error) throw new Error(error.message);
    }
    revalidatePath("/student/social-media");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Reaction could not be saved." };
  }
}

export async function updateSocialWeeklyTarget(target: number) {
  try {
    const profile = await requireApprovedUser();
    if (profile.role !== "admin") throw new Error("Only the admin can update this target.");
    const value = Math.max(1, Math.min(20, Math.round(target)));
    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin.from("social_media_settings").upsert({ id: true, weekly_target: value, updated_by: profile.id, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/social-media");
    revalidatePath("/student/social-media");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Target could not be updated." };
  }
}

export async function deleteSocialPost(postId: string) {
  try {
    const profile = await requireApprovedUser();
    const supabaseAdmin = createSupabaseServiceClient();
    let query = supabaseAdmin.from("social_media_posts").delete().eq("id", postId);
    if (profile.role === "student") query = query.eq("student_id", profile.id);
    else if (profile.role !== "admin") throw new Error("You cannot remove this post.");
    const { error } = await query;
    if (error) throw new Error(error.message);
    revalidatePath("/student/social-media");
    revalidatePath("/admin/social-media");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Post could not be removed." };
  }
}

export async function refreshSocialPostPreview(postId: string) {
  try {
    const profile = await requireApprovedUser();
    const supabaseAdmin = createSupabaseServiceClient();
    let query = supabaseAdmin.from("social_media_posts").select("id,student_id,url").eq("id", postId);
    if (profile.role === "student") query = query.eq("student_id", profile.id);
    else if (profile.role !== "admin") throw new Error("You cannot refresh this post.");
    const { data: post, error: postError } = await query.maybeSingle();
    if (postError || !post) throw new Error(postError?.message ?? "Post not found.");
    const url = new URL(post.url);
    const metadata = await fetchPostMetadata(url);
    const cachedImageUrl = await cacheFeaturedImage(metadata.imageUrl, post.student_id);
    const { error } = await supabaseAdmin.from("social_media_posts").update({
      title: metadata.title,
      description: metadata.description,
      image_url: cachedImageUrl ?? metadata.imageUrl,
      site_name: metadata.siteName,
    }).eq("id", post.id);
    if (error) throw new Error(error.message);
    revalidatePath("/student/social-media");
    revalidatePath("/admin/social-media");
    revalidatePath(`/admin/social-media/${post.student_id}`);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Preview could not be refreshed." };
  }
}
