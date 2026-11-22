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

/**
 * Extracts and categorizes links from a submission object.
 * Handles both modern multi-link records (video_url = Drive, doc_url = Docs, post_url = Live)
 * and legacy records where any link might have been stored in video_url.
 */
export function extractSubmissionLinks(
  sub:
    | {
        video_url?: string | null;
        doc_url?: string | null;
        post_url?: string | null;
        [key: string]: unknown;
      }
    | null
    | undefined,
) {
  if (!sub) return { driveUrl: null, docUrl: null, postUrl: null, hasAny: false };

  let driveUrl: string | null = null;
  let docUrl: string | null = null;
  let postUrl: string | null = null;

  const rawVideo = typeof sub.video_url === "string" && sub.video_url.trim() ? sub.video_url.trim() : null;
  const rawDoc = typeof sub.doc_url === "string" && sub.doc_url.trim() ? sub.doc_url.trim() : null;
  const rawPost = typeof sub.post_url === "string" && sub.post_url.trim() ? sub.post_url.trim() : null;

  if (rawDoc) {
    docUrl = rawDoc;
  }
  if (rawPost) {
    postUrl = rawPost;
  }
  if (rawVideo) {
    if (rawVideo.includes("docs.google.com")) {
      if (!docUrl) docUrl = rawVideo;
    } else if (/facebook\.com|instagram\.com|tiktok\.com|youtube\.com\/shorts/i.test(rawVideo)) {
      if (!postUrl) postUrl = rawVideo;
    } else {
      driveUrl = rawVideo;
    }
  }

  return {
    driveUrl,
    docUrl,
    postUrl,
    hasAny: Boolean(driveUrl || docUrl || postUrl),
  };
}

