import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";

export type MailPayload = {
  type: "new_student_registration" | "pending_task_summary" | "contact_query";
  [key: string]: unknown;
};

type MailWebhookResult = {
  success?: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
};

const DEFAULT_ADMIN_EMAIL = "abdullahwale@gmail.com";

export function getAdminNotificationEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL;
}

export function getApplicationSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return "http://localhost:3001";
}

function toJsonPayload(payload: MailPayload): Json {
  return structuredClone(payload) as Json;
}

async function writeEmailLog(input: {
  emailType: MailPayload["type"];
  recipientEmail: string;
  status: "sent" | "failed";
  payload: MailPayload;
  errorMessage?: string;
}) {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("email_notification_logs").insert({
      email_type: input.emailType,
      recipient_email: input.recipientEmail,
      status: input.status,
      payload: toJsonPayload(input.payload),
      error_message: input.errorMessage ?? null,
    });
  } catch {
    // Email delivery should not fail only because audit logging is unavailable.
  }
}

export async function sendGoogleScriptMail(payload: MailPayload, options: { recipientEmail?: string } = {}) {
  const webhookUrl = process.env.GOOGLE_SCRIPT_MAIL_WEBHOOK;
  const secret = process.env.MAIL_WEBHOOK_SECRET;
  const recipientEmail = options.recipientEmail || getAdminNotificationEmail();

  if (!webhookUrl) {
    throw new Error("GOOGLE_SCRIPT_MAIL_WEBHOOK is missing");
  }

  if (!secret) {
    throw new Error("MAIL_WEBHOOK_SECRET is missing");
  }

  const logPayload = { ...payload, adminEmail: recipientEmail };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...logPayload,
        secret,
      }),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as MailWebhookResult | null;

    if (!response.ok || result?.success !== true) {
      throw new Error(result?.error || "Failed to send email");
    }

    await writeEmailLog({
      emailType: payload.type,
      recipientEmail,
      status: "sent",
      payload: logPayload,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";

    await writeEmailLog({
      emailType: payload.type,
      recipientEmail,
      status: "failed",
      payload: logPayload,
      errorMessage: message,
    });

    throw new Error(message);
  }
}
