export function getGoogleDriveFileId(url: string) {
  const trimmedUrl = url.trim();
  const fileMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.hostname.includes("drive.google.com")) {
      return parsed.searchParams.get("id");
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeImageUrl(url: string | null | undefined) {
  if (!url) return null;
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;

  const driveFileId = getGoogleDriveFileId(trimmedUrl);
  if (driveFileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1600`;
  }

  return trimmedUrl;
}
