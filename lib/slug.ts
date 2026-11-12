/**
 * Slug utilities for SEO-friendly product URLs.
 *
 * Generates URL-safe slugs from product names and resolves them back to products.
 * Falls back to UUID when a slug cannot be generated or is ambiguous.
 */

/**
 * Convert a string into a URL-safe slug.
 *
 * "AI Resume Builder & ATS Optimizer" → "ai-resume-builder-ats-optimizer"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/-+/g, "-")           // collapse multiple hyphens
    .replace(/^-+|-+$/g, "")       // trim leading/trailing hyphens
    .slice(0, 80);                 // cap length
}

/**
 * Check whether a string looks like a UUID.
 */
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Build a unique slug for a product.
 *
 * If the slugified name collides with another product, append a short hash of
 * the product ID to guarantee uniqueness.
 */
export function buildProductSlug(
  name: string,
  id: string,
  existingSlugs: Map<string, string> = new Map(),
): string {
  const base = slugify(name);
  if (!base) return id; // fallback to UUID if name produces empty slug

  // Check for collision
  const existingId = existingSlugs.get(base);
  if (existingId && existingId !== id) {
    // Collision — append first 8 chars of UUID
    const shortId = id.replace(/-/g, "").slice(0, 8);
    return `${base}-${shortId}`;
  }

  return base;
}
