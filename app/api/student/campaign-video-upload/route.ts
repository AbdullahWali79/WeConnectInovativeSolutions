/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const DEFAULT_CAMPAIGN_FOLDER_ID = "1uufJf0w7v5_4JGfqmMKuCZmyuqckC-tP";
const DEFAULT_GOOGLE_DRIVE_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbz6dX4HSLNQWPgGsAt62po9YcvpRVOr20OlltDz6aAPQFbgeowUUv6QVzL4wOR6KgyvMA/exec";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    if (file.size > 80 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Video must be under 80MB. For larger videos, paste a Google Drive link." },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.GOOGLE_DRIVE_UPLOAD_WEBHOOK_URL?.trim() || DEFAULT_GOOGLE_DRIVE_WEBHOOK;
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "video/mp4",
        base64Data,
        folderId: DEFAULT_CAMPAIGN_FOLDER_ID,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (data?.success && data?.url) {
      return NextResponse.json({ success: true, url: data.url, name: file.name });
    }

    return NextResponse.json(
      { error: data?.error || "Google Drive upload failed. Please paste your Google Drive link below." },
      { status: 500 },
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { error: "Upload timed out. Please paste your Google Drive video link directly below." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: err?.message || "Upload failed. Please paste your Google Drive link directly below." },
      { status: 500 },
    );
  }
}
