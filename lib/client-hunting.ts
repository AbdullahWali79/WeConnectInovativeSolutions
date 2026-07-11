export const CLIENT_HUNTING_SPECIALIZATIONS = [
  { value: "web_development", label: "Web Development" },
  { value: "app_development", label: "App Development" },
  { value: "seo", label: "SEO" },
  { value: "gmb", label: "GMB" },
  { value: "social_media_marketing", label: "Social Marketing" },
  { value: "automation", label: "Automation" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "other", label: "Other" },
] as const;

export type ClientHuntSpecialization = (typeof CLIENT_HUNTING_SPECIALIZATIONS)[number]["value"];
export type ClientHuntScenarioSpecialization = ClientHuntSpecialization | "all";

export const CLIENT_HUNTING_LEAD_STATUSES = ["pending", "approved", "rejected", "duplicate"] as const;

export type ClientHuntLeadStatus = (typeof CLIENT_HUNTING_LEAD_STATUSES)[number];

export const clientHuntSpecializationLabelByValue = new Map(
  CLIENT_HUNTING_SPECIALIZATIONS.map((item) => [item.value, item.label] as const),
);

const PRIMARY_TARGET_VALUES = [
  CLIENT_HUNTING_SPECIALIZATIONS.find((item) => item.value === "seo"),
  CLIENT_HUNTING_SPECIALIZATIONS.find((item) => item.value === "automation"),
  CLIENT_HUNTING_SPECIALIZATIONS.find((item) => item.value === "web_development"),
  CLIENT_HUNTING_SPECIALIZATIONS.find((item) => item.value === "app_development"),
  CLIENT_HUNTING_SPECIALIZATIONS.find((item) => item.value === "gmb"),
] as const;

export const CLIENT_HUNTING_PRIMARY_TARGET_OPTIONS = PRIMARY_TARGET_VALUES.filter(Boolean) as (typeof CLIENT_HUNTING_SPECIALIZATIONS)[number][];

export function getClientHuntSpecializationLabel(value: string | null | undefined) {
  if (!value) return "Unspecified";
  return clientHuntSpecializationLabelByValue.get(value as ClientHuntSpecialization) ?? value;
}

export function normalizeClientHuntSpecializations(values: Array<string | null | undefined>) {
  const allowedValues = new Set<string>(CLIENT_HUNTING_SPECIALIZATIONS.map((item) => item.value));
  const uniqueValues: ClientHuntSpecialization[] = [];

  for (const value of values) {
    if (!value || !allowedValues.has(value)) {
      continue;
    }

    const typedValue = value as ClientHuntSpecialization;
    if (!uniqueValues.includes(typedValue)) {
      uniqueValues.push(typedValue);
    }
  }

  return uniqueValues;
}

export function normalizeComparableText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

export function normalizePhoneNumber(value: string | null | undefined) {
  return value?.replace(/[^0-9]+/g, "") ?? "";
}

export function normalizeWebsiteUrl(value: string | null | undefined) {
  if (!value) return "";

  const trimmed = value.trim().toLowerCase();

  try {
    const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];
  }
}

export function maskLeadValue(value: string | null | undefined) {
  if (!value) return "Hidden after approval";
  if (value.length <= 4) return "Hidden after approval";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
