export function getYouTubeVideoId(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");

      const segments = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(segments[0] ?? "")) {
        return segments[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeEmbedUrl(value: string | null | undefined) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : null;
}

export function isDirectVideoUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    const pathname = new URL(value.trim()).pathname.toLowerCase();
    return [".mp4", ".webm", ".ogg", ".mov"].some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}
