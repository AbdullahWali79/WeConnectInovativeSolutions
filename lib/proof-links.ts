const blockedDomainLabels = new Set([
  "adult",
  "escort",
  "hentai",
  "nude",
  "nudity",
  "onlyfans",
  "porn",
  "pornhub",
  "porno",
  "pornography",
  "redtube",
  "sex",
  "sexy",
  "xnxx",
  "xvideos",
  "xxx",
]);

export function getProofLinkError(value: string) {
  const link = value.trim();
  if (!link) return "Proof link is required.";

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return "Enter a valid link starting with http:// or https://.";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http:// or https:// links are allowed.";
  }

  const domainLabels = url.hostname.toLowerCase().split(/[.-]/).filter(Boolean);
  if (domainLabels.some((label) => blockedDomainLabels.has(label))) {
    return "Adult or vulgar website links are not allowed.";
  }

  return null;
}
