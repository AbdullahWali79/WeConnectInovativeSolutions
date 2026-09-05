import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Contributor, Prompt } from "@/lib/prompts";

const scrypt = promisify(scryptCallback);
const cookieName = "wc_prompt_session";
export const contributorColumns = "id,name,email,request_note,status,auto_publish,admin_note,created_at";
export function promptDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Prompt library is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  const derived = await scrypt(password, salt, 64) as Buffer;
  const stored = Buffer.from(expected, "hex");
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}
export async function limitPromptAction(scope: string, identity: string, maximum = 10) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  for (const key of [`${scope}:identity:${identity}`, `${scope}:ip:${ip}`]) {
    const { data, error } = await promptDb().rpc("prompt_take_attempt", { bucket: hash(key), max_attempts: maximum });
    if (error) throw new Error("Prompt library is temporarily unavailable.");
    if (!data) throw new Error("Too many attempts. Please try again in 15 minutes.");
  }
}
export async function startPromptSession(id: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 86400000);
  const { error } = await promptDb().from("prompt_sessions").insert({ token_hash: hash(token), contributor_id: id, expires_at: expires.toISOString() });
  if (error) throw new Error("Could not start your session.");
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
}
export async function endPromptSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) {
    const { error } = await promptDb().from("prompt_sessions").delete().eq("token_hash", hash(token));
    if (error) throw new Error("Could not sign out. Please retry.");
  }
  jar.delete(cookieName);
}
export async function currentContributor(): Promise<Contributor | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const db = promptDb();
  const { data: session, error } = await db.from("prompt_sessions").select("contributor_id").eq("token_hash", hash(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new Error("Could not verify your prompt session.");
  if (!session) return null;
  const { data, error: profileError } = await db.from("prompt_contributors").select(contributorColumns).eq("id", session.contributor_id).single();
  if (profileError) throw new Error("Could not load your contributor account.");
  return data as Contributor;
}
export async function publicPrompts(): Promise<Prompt[]> {
  // Paid template bodies are excluded by the database query, not only hidden in the UI.
  const columns = "id,contributor_id,title,description,category,model,media_urls,price,purchase_url,status,created_at";
  const db = promptDb();
  const [free, paid] = await Promise.all([
    db.from("prompt_library").select(`${columns},template`).eq("status", "approved").eq("price", 0),
    db.from("prompt_library").select(columns).eq("status", "approved").gt("price", 0),
  ]);
  if (free.error || paid.error) throw new Error("Prompt library is temporarily unavailable. Please try again later.");
  return [...(free.data ?? []), ...(paid.data ?? []).map((p) => ({ ...p, template: "" }))].map((p) => ({ ...p, admin_note: "" })) as Prompt[];
}
