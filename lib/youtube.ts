export function extractYouTubeVideoId(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const pathId = parsed.pathname.split("/").filter(Boolean)[0];
      return pathId ?? null;
    }

    if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const segments = parsed.pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
        return lastSegment ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeEmbedUrl(url: string | null | undefined) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}

export function getYouTubeThumbnailUrl(url: string | null | undefined) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}
