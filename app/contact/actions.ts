"use server";

import { CONTACT_EMAIL } from "@/lib/contact";
import { sendGoogleScriptMail } from "@/lib/mail/google-script-mailer";

export type SubmitContactQueryInput = {
  full_name: string;
  email: string;
  message: string;
};

type SubmitContactQueryResult =
  | { success: true; error: null }
  | { success: false; error: string };

const emailPattern = /^\S+@\S+\.\S+$/;

export async function submitContactQuery(input: SubmitContactQueryInput): Promise<SubmitContactQueryResult> {
  const fullName = input.full_name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();

  if (!fullName || !email || !message) {
    return { success: false, error: "Name, email, and message are required." };
  }

  if (!emailPattern.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  await sendGoogleScriptMail(
    {
      type: "contact_query",
      emailHeading: "New Contact Query",
      emailSummary: "A new public contact form query was submitted on the WeConnect website.",
      senderName: fullName,
      senderEmail: email,
      message,
      replyTo: email,
      receivedAt: new Date().toISOString(),
      source: "public-contact-form",
    },
    { recipientEmail: CONTACT_EMAIL },
  );

  return { success: true, error: null };
}
