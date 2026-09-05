import { z } from "zod";

export type Contributor = { id: string; name: string; email: string; request_note: string; status: "pending" | "approved" | "rejected"; auto_publish: boolean; admin_note: string; created_at: string };
export type Prompt = { id: string; contributor_id: string | null; title: string; description: string; category: string; model: string; template: string; media_urls: string[]; price: number; purchase_url: string; status: "pending" | "approved" | "rejected"; admin_note: string; created_at: string };

export function drivePreview(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com") return null;
    const id = parsed.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? parsed.searchParams.get("id");
    return id && /^[\w-]{10,150}$/.test(id) ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch { return null; }
}

export function promptVariables(template: string) {
  return [...new Set(Array.from(template.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_ ]{0,59})\s*\}\}/g), (match) => match[1].trim()))];
}

export function fillPrompt(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_ ]{0,59})\s*\}\}/g, (original, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(values, key.trim()) ? values[key.trim()] : undefined;
    return typeof value === "string" && value.trim() ? value.trim() : original;
  });
}

export const promptSchema = z.object({
  title: z.string().trim().min(3).max(140), description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60), model: z.string().trim().min(2).max(80),
  template: z.string().trim().min(20).max(30000),
  media_urls: z.array(z.string().max(500).refine((url) => Boolean(drivePreview(url)), "Use a Google Drive file sharing link.")).min(1).max(6),
  price: z.coerce.number().finite().min(0).max(1000000),
  purchase_url: z.string().trim().max(1000).refine((value) => { if (!value) return true; try { return new URL(value).protocol === "https:"; } catch { return false; } }, "Use an HTTPS purchase or contact link.").default(""),
});

export function promptInput(form: FormData) {
  return promptSchema.parse({ ...Object.fromEntries(form), media_urls: String(form.get("media_urls") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean) });
}
