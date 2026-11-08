"use server";

import { promptDb } from "@/lib/prompts-server";
import { randomUUID } from "node:crypto";

export async function lookupSubmitterProfile(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 7) {
    return { success: true, found: false };
  }

  const lookupTerm = digits.slice(-10); // Match last 10 digits to handle local 03xx vs international +923xx
  const db = promptDb();

  try {
    // 1. Check in profiles table (existing students/users in academy)
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, phone")
      .ilike("phone", `%${lookupTerm}%`)
      .limit(1)
      .maybeSingle();

    if (profile?.full_name) {
      return {
        success: true,
        found: true,
        name: profile.full_name,
        phone: profile.phone || rawPhone,
        source: "profile" as const,
      };
    }

    // 2. Check in previous prompt_library submissions
    const { data: prompt } = await db
      .from("prompt_library")
      .select("admin_note")
      .ilike("admin_note", `%${lookupTerm}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prompt?.admin_note) {
      try {
        const parsed = JSON.parse(prompt.admin_note);
        if (parsed.student_name) {
          return {
            success: true,
            found: true,
            name: parsed.student_name,
            phone: parsed.student_phone || rawPhone,
            source: "previous_submission" as const,
          };
        }
      } catch {
        // ignore JSON parse error
      }
    }

    return { success: true, found: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return { success: false, error: message };
  }
}

export async function uploadPromptImage(formData: FormData) {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No image file provided." };
  }

  if (file.size > 15 * 1024 * 1024) {
    return { success: false, error: "Image size must be under 15MB." };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { success: false, error: "Only PNG, JPG, WebP, or GIF images are allowed." };
  }

  const DEFAULT_GOOGLE_DRIVE_WEBHOOK = "https://script.google.com/macros/s/AKfycbz6dX4HSLNQWPgGsAt62po9YcvpRVOr20OlltDz6aAPQFbgeowUUv6QVzL4wOR6KgyvMA/exec";
  const webhookUrl = process.env.GOOGLE_DRIVE_UPLOAD_WEBHOOK_URL?.trim() || DEFAULT_GOOGLE_DRIVE_WEBHOOK;

  // 1. Primary: Direct Google Drive Webhook Upload (0% Supabase space used)
  if (webhookUrl) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const gDriveRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          base64Data,
          folderId: "1grsUVz0LtpTNmfjsyaBbMyE6xfjHdqJR",
        }),
      });

      const gDriveData = await gDriveRes.json();
      if (gDriveData?.success && gDriveData?.url) {
        return { success: true, url: gDriveData.url };
      }
      console.warn("Google Drive upload webhook returned non-success, falling back to Supabase:", gDriveData);
    } catch (gDriveErr) {
      console.warn("Google Drive upload webhook failed, falling back to Supabase:", gDriveErr);
    }
  }

  // 2. Secondary Fallback: Supabase Storage
  const db = promptDb();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `prompts/${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await db.storage
      .from("prompt-media")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = db.storage
      .from("prompt-media")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { success: false, error: message };
  }
}

export async function submitPublicPrompt(payload: {
  fullName: string;
  phone: string;
  title: string;
  category: string;
  model: string;
  description: string;
  template: string;
  mediaUrls: string[];
}) {
  const { fullName, phone, title, category, model, description, template, mediaUrls } = payload;

  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: "Please enter your full name." };
  }

  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 8) {
    return { success: false, error: "Please enter a valid phone or WhatsApp number." };
  }

  if (!title || title.trim().length < 3) {
    return { success: false, error: "Prompt title must be at least 3 characters." };
  }

  if (!category || category.trim().length < 2) {
    return { success: false, error: "Please select or enter a category." };
  }

  if (!model || model.trim().length < 2) {
    return { success: false, error: "Please select or specify the AI model (e.g., ChatGPT, Midjourney)." };
  }

  if (!description || description.trim().length < 10) {
    return { success: false, error: "Please provide a short description (at least 10 characters) explaining what this prompt generates." };
  }

  if (!template || template.trim().length < 15) {
    return { success: false, error: "Please write the actual prompt text or template (at least 15 characters)." };
  }

  if (!mediaUrls || mediaUrls.length === 0) {
    return { success: false, error: "Please upload at least one image or screenshot preview of your prompt output." };
  }

  const db = promptDb();

  try {
    const adminNoteData = JSON.stringify({
      student_name: fullName.trim(),
      student_phone: phone.trim(),
      submitted_at: new Date().toISOString(),
    });

    const { data, error } = await db
      .from("prompt_library")
      .insert({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        model: model.trim(),
        template: template.trim(),
        media_urls: mediaUrls,
        price: 0,
        purchase_url: "",
        status: "pending",
        admin_note: adminNoteData,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: data.id,
      message: "Prompt submitted successfully! Our team will review and publish it to the prompt library.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return { success: false, error: message };
  }
}
