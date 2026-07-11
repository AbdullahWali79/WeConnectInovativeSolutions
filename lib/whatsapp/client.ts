import type { WhatsAppSendResult, WhatsAppTemplateMessageInput } from "./types";

function isConfigured(value: string | undefined, placeholder: string) {
  return Boolean(value && value.trim() && value.trim() !== placeholder && !value.trim().startsWith("your_"));
}

export function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = "en",
  components = [],
}: WhatsAppTemplateMessageInput) {
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const recipient = normalizeWhatsAppNumber(to);

  if (!recipient) {
    throw new Error("WhatsApp recipient number is missing.");
  }

  if (!isConfigured(phoneNumberId, "your_phone_number_id") || !isConfigured(accessToken, "your_meta_whatsapp_cloud_api_token")) {
    throw new Error("WhatsApp API credentials are missing.");
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => null)) as (WhatsAppSendResult & { error?: { message?: string } }) | null;

  if (!response.ok) {
    throw new Error(result?.error?.message || "Failed to send WhatsApp message.");
  }

  return result as WhatsAppSendResult;
}
