import { type ClassValue, clsx } from "clsx";
import type { Application } from "@/lib/supabase/types";
import {
  buildApprovedStudentWhatsAppMessage,
  defaultApprovedStudentWhatsappTemplate,
} from "@/lib/whatsapp/message-templates";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(deltaSeconds, "second");

  const deltaMinutes = Math.round(deltaSeconds / 60);
  const absMinutes = Math.abs(deltaMinutes);
  if (absMinutes < 60) return rtf.format(deltaMinutes, "minute");

  const deltaHours = Math.round(deltaSeconds / 3600);
  const absHours = Math.abs(deltaHours);
  if (absHours < 24) return rtf.format(deltaHours, "hour");

  const deltaDays = Math.round(deltaSeconds / 86400);
  const absDays = Math.abs(deltaDays);
  if (absDays < 30) return rtf.format(deltaDays, "day");

  const deltaMonths = Math.round(deltaSeconds / 2592000);
  const absMonths = Math.abs(deltaMonths);
  if (absMonths < 12) return rtf.format(deltaMonths, "month");

  const deltaYears = Math.round(deltaSeconds / 31536000);
  return rtf.format(deltaYears, "year");
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type WhatsappMessageTemplate = "default" | "internship" | "intermediate" | "fresher" | "follow_up";

export const whatsappMessageTemplateOptions = [
  { value: "default", label: "General outreach" },
  { value: "internship", label: "Internship details" },
  { value: "intermediate", label: "Intermediate skill path" },
  { value: "fresher", label: "Fresher onboarding" },
  { value: "follow_up", label: "Short follow-up" },
] as const;

export function normalizeWhatsappPhone(phone: string | null | undefined) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  if (!digits.startsWith("92") && digits.length === 10) digits = `92${digits}`;

  return digits.length >= 11 ? digits : null;
}

function buildWhatsappMessageLines(
  application: Pick<Application, "full_name" | "phone">,
  courseTitle: string | null,
  template: WhatsappMessageTemplate
) {
  const baseLines = [
    `Assalam o Alaikum ${application.full_name},`,
    "Welcome to WeConnectInnovation!",
    courseTitle ? `Course: ${courseTitle}.` : null,
  ].filter(Boolean) as string[];

  switch (template) {
    case "internship":
      return [
        ...baseLines,
        "Hum industry aur internships ke darmiyan ka gap reduce kar rahe hain using our expertise, products, aur training.",
        "Agar aap expert hain to aap ko sirf 3 month internship ke per month Software House charges dene honge jo 3k per month hain.",
        "Agar aap us skill par internship karna chahte hain jisme intermediate level ka experience hai (3-4 month), to aap pehle month sirf training karenge aur uske liye Software House 7k charge karega.",
        "Baqi 2 month ke liye sirf 3k per month Software House ka charge hoga.",
        "Agar aap fresher hain to pehle month ka charge 10k hoga aur baqi 2 month ke liye 5k per month Software House ko dena hoga.",
        "Iska nateeja ye hoga ke Software House aapko internship letter dega aur review ke baad job offer karega, phir aapko remotely apne saath attach karega.",
        "End mein aapko client hunting 3 levels mein sikhai jayegi lazmi.",
        "Yeh message aap ki marzi se approach karne ke liye hai.",
        "Address: Sharqi Colony Back Side of Cookooz Cafe, Near Main Masjid.",
      ];
    case "intermediate":
      return [
        ...baseLines,
        "Agar aap intermediate level ka experience rakhte hain to pehle month training hogi jiska charge 7k hoga.",
        "Baqi 2 month ke liye sirf 3k per month Software House charges lagenge.",
        "Training ke baad internship letter aur review ke baad job offer possible hai.",
        "Client hunting 3 levels mein sikhai jayegi.",
        "Yeh message aap ki marzi se approach karne ke liye hai.",
      ];
    case "fresher":
      return [
        ...baseLines,
        "Agar aap fresher hain to pehla month ka charge 10k hoga aur baqi 2 month ke liye 5k per month Software House ko dena hoga.",
        "Iske bad aapko internship letter diya jayega aur review ke baad job offer diya ja sakta hai.",
        "Hum aapko client hunting 3 levels mein bhi sikhayenge.",
        "Yeh message aap ki marzi se approach karne ke liye hai.",
      ];
    case "follow_up":
      return [
        ...baseLines,
        "Hum internships aur software house ke charges aur structure ka detail dene ke liye ready hain.",
        "Agar aap apni marzi se approach karna chahte hain to hum aapki madad karenge.",
      ];
    case "default":
    default:
      return [
        ...baseLines,
        "Aap ka admission approve ho gaya hai.",
        "Aap ab We Connect Software House join kar sakte hain.",
        "Address: Sharqi Colony Back Side of Cookooz Cafe, Near Main Masjid.",
      ];
  }
}

export function buildApprovedStudentWhatsappUrl(
  application: Pick<Application, "full_name" | "phone" | "email">,
  courseTitle?: string | null,
  template: WhatsappMessageTemplate = "default",
  defaultMessageTemplate = defaultApprovedStudentWhatsappTemplate,
) {
  const phone = normalizeWhatsappPhone(application.phone);
  if (!phone) return null;

  const messageBody =
    template === "default"
      ? buildApprovedStudentWhatsAppMessage(application, courseTitle ?? null, defaultMessageTemplate)
      : buildWhatsappMessageLines(application, courseTitle ?? null, template).join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(messageBody)}`;
}
