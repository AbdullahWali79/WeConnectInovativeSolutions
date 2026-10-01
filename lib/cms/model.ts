import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const safeUrl = (value: string) => {
  if (!value) return true;
  if (/[\\\u0000-\u0020]/.test(value)) return false;
  if (/^(\/(?!\/)|#|mailto:|tel:)/i.test(value)) return true;
  try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) && !!parsed.hostname; } catch { return false; }
};
const safeImage = (value: string) => safeUrl(value) && (!value || /^(https?:\/\/|\/(?!\/))/i.test(value));
const url = z.string().max(2000).refine(safeUrl, "Use an https:// URL, /path, #anchor, mailto: or tel: link.");
export const styleSchema = z.object({
  color: color.optional(), backgroundColor: color.optional(),
  fontSize: z.number().min(8).max(160).optional(),
  padding: z.number().min(0).max(200).optional(),
  borderRadius: z.number().min(0).max(100).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]).optional(),
});
export const elementSchema = z.object({
  texts: z.record(z.string().max(20000)).optional(),
  href: url.optional(), src: z.string().max(2000).refine(safeImage, "Use an https:// or /path image URL.").optional(),
  alt: z.string().max(1000).optional(), hidden: z.boolean().optional(),
  style: styleSchema.optional(),
});
export const blockSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().max(500), body: z.string().max(20000),
  image: z.string().max(2000).refine(safeImage).default(""),
  button: z.string().max(200), href: url,
  position: z.enum(["before", "after"]), hidden: z.boolean(), style: styleSchema,
});
export const documentSchema = z.object({
  elements: z.record(elementSchema).refine(v => Object.keys(v).length <= 2000),
  blocks: z.array(blockSchema).max(100),
  order: z.record(z.array(z.string().max(500)).max(200)).default({}),
});
export type CmsStyle = z.infer<typeof styleSchema>;
export type CmsElementOverride = z.infer<typeof elementSchema>;
export type CmsBlock = z.infer<typeof blockSchema>;
export type CmsDocument = z.infer<typeof documentSchema>;
export const emptyDocument = (): CmsDocument => ({ elements: {}, blocks: [], order: {} });
export type PageSetting = { id: string; label: string; menu_visible: boolean; active: boolean; sort_order: number };
export type PageEntry = { id: string; label: string; href?: string; parent?: string; kind: "page" | "group" | "anchor"; source?: string };
export type CmsSelection = { id: string; tag: string; texts: Record<string, string>; href?: string; src?: string; alt?: string; style: CmsStyle; parentId?: string; siblings?: string[] };
export function isPublicPath(path: string) {
  return /^\/(?!\/)/.test(path) && !/^\/(admin|student|student-app|api|login|offline|_next)(\/|$)/.test(path);
}
export function parseDocument(value: unknown): CmsDocument {
  const result = documentSchema.safeParse(value);
  return result.success ? result.data : emptyDocument();
}
export function pageIsActive(path: string, settings: PageSetting[]) {
  return !settings.some(s => !s.active && s.id.startsWith("/") && !s.id.includes("#") && (s.id === path || (s.id !== "/" && path.startsWith(`${s.id}/`))));
}
export function menuIsVisible(id: string, settings: PageSetting[]) {
  const setting = settings.find(s => s.id === id);
  return setting?.menu_visible !== false && setting?.active !== false && (!id.startsWith("/") || pageIsActive(id.split("#")[0], settings));
}
