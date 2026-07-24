import { NextRequest, NextResponse } from "next/server";
import { buildWebsiteKnowledge, callGemini, getAiSettings, type PublicChatMessage } from "@/lib/ai-assistant";
import { callDeepSeek, getDeepSeekSettings } from "@/lib/ai-assistant/deepseek";
import { callMistral, getMistralSettings } from "@/lib/ai-assistant/mistral";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const limits = new Map<string, { count: number; resetAt: number }>();

function allowed(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const current = limits.get(ip);
  if (!current || current.resetAt < now) {
    limits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}

export async function GET() {
  try {
    const [settings, deepSeek, mistral] = await Promise.all([getAiSettings(), getDeepSeekSettings().catch(() => null), getMistralSettings().catch(() => null)]);
    const enabled = (settings.enabled && Boolean(settings.api_key)) || Boolean(deepSeek?.enabled && deepSeek.api_key) || Boolean(mistral?.enabled && mistral.api_key);
    return NextResponse.json({ enabled, assistantName: settings.assistant_name, welcomeMessage: settings.welcome_message, status: enabled ? "active" : settings.validation_status });
  } catch {
    return NextResponse.json({ enabled: false, assistantName: "WeConnect Assistant", welcomeMessage: "Hello! How can I guide you today?", status: "error" });
  }
}
export async function POST(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Too many messages. Please wait a minute and try again." }, { status: 429 });
  try {
    const body = await request.json() as { messages?: PublicChatMessage[] };
    const messages = (body.messages ?? []).filter((message) => (message.role === "user" || message.role === "model") && typeof message.text === "string");
    if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    const [settings, deepSeek, mistral] = await Promise.all([getAiSettings(), getDeepSeekSettings().catch(() => null), getMistralSettings().catch(() => null)]);
    const geminiAvailable = settings.enabled && Boolean(settings.api_key);
    const deepSeekAvailable = Boolean(deepSeek?.enabled && deepSeek.api_key);
    const mistralAvailable = Boolean(mistral?.enabled && mistral.api_key);
    if (!geminiAvailable && !deepSeekAvailable && !mistralAvailable) return NextResponse.json({ error: "The AI assistant is currently offline. Please use the Contact page." }, { status: 503 });
    const knowledge = await buildWebsiteKnowledge();
    let answer: string | null = null;
    let geminiError: string | null = null;
    if (geminiAvailable) {
      try {
        answer = await callGemini(settings, messages, knowledge);
        if (settings.validation_status !== "active") await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
      } catch (error) {
        geminiError = error instanceof Error ? error.message : "Gemini request failed.";
        await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: "error", last_error: geminiError.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      }
    }
    if (!answer && deepSeekAvailable && deepSeek) {
      try {
        answer = await callDeepSeek(deepSeek, messages, knowledge);
        if (deepSeek.validation_status !== "active") await createSupabaseServiceClient().from("deepseek_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "DeepSeek request failed.";
        await createSupabaseServiceClient().from("deepseek_assistant_settings").update({ validation_status: "error", last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      }
    }
    if (!answer && mistralAvailable && mistral) {
      answer = await callMistral(mistral, messages, knowledge);
      if (mistral.validation_status !== "active") await createSupabaseServiceClient().from("mistral_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
    }
    if (!answer) throw new Error(geminiError || "No AI provider is available.");
    return NextResponse.json({ answer, assistantName: settings.assistant_name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assistant request failed.";
    try {
      const deepSeek = await getDeepSeekSettings().catch(() => null);
      if (deepSeek?.enabled) await createSupabaseServiceClient().from("deepseek_assistant_settings").update({ validation_status: "error", last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
      const mistral = await getMistralSettings().catch(() => null);
      if (mistral?.enabled) await createSupabaseServiceClient().from("mistral_assistant_settings").update({ validation_status: "error", last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
    } catch {}
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again or use the Contact page." }, { status: 503 });
  }
}
