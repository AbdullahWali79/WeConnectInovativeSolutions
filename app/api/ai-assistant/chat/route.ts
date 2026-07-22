import { NextRequest, NextResponse } from "next/server";
import { buildWebsiteKnowledge, callGemini, getAiSettings, type PublicChatMessage } from "@/lib/ai-assistant";
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
    const settings = await getAiSettings();
    return NextResponse.json({ enabled: settings.enabled && Boolean(settings.api_key), assistantName: settings.assistant_name, welcomeMessage: settings.welcome_message, status: settings.validation_status });
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
    const settings = await getAiSettings();
    if (!settings.enabled) return NextResponse.json({ error: "The AI assistant is currently offline. Please use the Contact page." }, { status: 503 });
    if (!settings.api_key) return NextResponse.json({ error: "The AI assistant is not configured yet." }, { status: 503 });
    const knowledge = await buildWebsiteKnowledge();
    const answer = await callGemini(settings, messages, knowledge);
    if (settings.validation_status !== "active") {
      await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: "active", last_error: null, last_checked_at: new Date().toISOString() }).eq("id", true);
    }
    return NextResponse.json({ answer, assistantName: settings.assistant_name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assistant request failed.";
    try {
      await createSupabaseServiceClient().from("ai_assistant_settings").update({ validation_status: "error", last_error: message.slice(0, 500), last_checked_at: new Date().toISOString() }).eq("id", true);
    } catch {}
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again or use the Contact page." }, { status: 503 });
  }
}