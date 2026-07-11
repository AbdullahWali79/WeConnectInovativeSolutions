import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function writeWhatsAppNotificationLog(input: {
  recipientNumber: string;
  alertType: string;
  templateName?: string;
  messageBody?: string;
  status: "queued" | "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
}) {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("whatsapp_notification_logs").insert({
      recipient_number: input.recipientNumber,
      alert_type: input.alertType,
      template_name: input.templateName ?? null,
      message_body: input.messageBody ?? null,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_message: input.errorMessage ?? null,
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
    });
  } catch {
    // Notification sending should not fail only because audit logging is unavailable.
  }
}
