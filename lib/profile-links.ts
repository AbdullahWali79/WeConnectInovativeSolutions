import type { Profile } from "@/lib/supabase/types";

export type ProfileLinkKey = "github_url" | "linkedin_url" | "facebook_url" | "indeed_url";

export const profileLinkFields: Array<{ key: ProfileLinkKey; label: string; hosts: string[] }> = [
  { key: "github_url", label: "GitHub profile", hosts: ["github.com", "www.github.com", "gist.github.com"] },
  { key: "linkedin_url", label: "LinkedIn page", hosts: ["linkedin.com", "www.linkedin.com"] },
  { key: "facebook_url", label: "Facebook account", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com"] },
  { key: "indeed_url", label: "Indeed account", hosts: ["indeed.com", "www.indeed.com", "my.indeed.com"] },
];

export function isStudentProfileComplete(profile: Pick<Profile, ProfileLinkKey>) {
  return profileLinkFields.every((field) => Boolean(profile[field.key]?.trim()));
}

export function getMissingProfileLinks(profile: Pick<Profile, ProfileLinkKey>) {
  return profileLinkFields.filter((field) => !profile[field.key]?.trim());
}

export function normalizeProfileLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).toString();
  } catch {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }
}

export function normalizeAnyUrl(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";

  try {
    return new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`).toString();
  } catch {
    return trimmed;
  }
}

export function validateProfileLink(value: string, label: string, allowedHosts: string[]) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  try {
    const normalized = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const isAllowed = allowedHosts.length === 0 || allowedHosts.some((allowedHost) => {
      const cleaned = allowedHost.replace(/^www\./, "");
      return host === cleaned || host.endsWith(`.${cleaned}`);
    });

    if (!["http:", "https:"].includes(parsed.protocol) || !isAllowed) {
      throw new Error();
    }

    return parsed.toString();
  } catch {
    throw new Error(`Paste a valid ${label} link.`);
  }
}
