"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { promptInput } from "@/lib/prompts";
import { currentContributor, endPromptSession, limitPromptAction, passwordHash, passwordMatches, promptDb, startPromptSession } from "@/lib/prompts-server";

export type PromptActionResult = { ok: boolean; message: string };
function failure(error: unknown): PromptActionResult {
  return { ok: false, message: error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join(" ")}: ${issue.message}`).join("; ") : error instanceof Error ? error.message : "Something went wrong. Please retry." };
}
export async function contributorAuth(form: FormData): Promise<PromptActionResult> {
  try {
    const email = z.string().trim().email().max(254).parse(form.get("email")).toLowerCase();
    const password = z.string().min(12, "Use at least 12 characters.").max(128).parse(form.get("password"));
    await limitPromptAction("auth", email);
    const db = promptDb();
    if (form.get("mode") === "register") {
      const name = z.string().trim().min(2).max(100).parse(form.get("name"));
      const request_note = z.string().trim().min(10).max(2000).parse(form.get("request_note"));
      const { data, error } = await db.from("prompt_contributors").insert({ name, email, request_note, password_hash: await passwordHash(password) }).select("id").single();
      if (error) throw new Error(error.code === "23505" ? "An account already exists for this email. Please sign in." : "Could not submit your request. Please retry.");
      await startPromptSession(data.id);
    } else {
      const { data, error } = await db.from("prompt_contributors").select("id,password_hash").eq("email", email).maybeSingle();
      if (error) throw new Error("Sign-in is temporarily unavailable.");
      const encoded = data?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`;
      if (!(await passwordMatches(password, encoded)) || !data) throw new Error("Incorrect email or password.");
      await startPromptSession(data.id);
    }
    revalidatePath("/prompts/contribute");
    return { ok: true, message: "Signed in. Your contributor status is shown below." };
  } catch (error) { return failure(error); }
}
export async function contributorLogout(): Promise<PromptActionResult> {
  try { await endPromptSession(); revalidatePath("/prompts/contribute"); return { ok: true, message: "Signed out." }; } catch (error) { return failure(error); }
}
export async function saveContributorPrompt(form: FormData): Promise<PromptActionResult> {
  try {
    const contributor = await currentContributor();
    if (!contributor || contributor.status !== "approved") throw new Error("Admin approval is required before submitting prompts.");
    await limitPromptAction("submit", contributor.id, 30);
    const input = promptInput(form);
    const id = String(form.get("id") || "");
    const payload = { ...input, contributor_id: contributor.id, status: contributor.auto_publish ? "approved" : "pending", admin_note: "" };
    const db = promptDb();
    const query = id ? db.from("prompt_library").update(payload).eq("id", z.string().uuid().parse(id)).eq("contributor_id", contributor.id) : db.from("prompt_library").insert(payload);
    const { data, error } = await query.select("id").single();
    if (error || !data) throw new Error("Could not save this prompt. Please retry.");
    revalidatePath("/prompts"); revalidatePath("/prompts/contribute"); revalidatePath("/admin/prompts");
    return { ok: true, message: contributor.auto_publish ? "Your prompt is published." : "Your prompt has been sent to admin for review." };
  } catch (error) { return failure(error); }
}
