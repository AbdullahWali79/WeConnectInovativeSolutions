export function isGoogleMapsHost(hostname: string) {
  const host = hostname.trim().toLowerCase();

  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host.startsWith("maps.google.")
  );
}

export function isGoogleMapsUrl(value: string) {
  try {
    return isGoogleMapsHost(new URL(value.trim()).hostname);
  } catch {
    return false;
  }
}

export function normalizeGoogleMapsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    return new URL(normalized).toString();
  } catch {
    return normalized;
  }
}

export function extractGoogleMapsHint(input: string) {
  let current = input.trim();

  try {
    const parsed = new URL(current);
    const pathParts = parsed.pathname
      .split("/")
      .map((part) => decodeURIComponent(part).replace(/\+/g, " ").trim())
      .filter(Boolean);

    const queryHint =
      parsed.searchParams.get("query") ||
      parsed.searchParams.get("q") ||
      parsed.searchParams.get("destination") ||
      parsed.searchParams.get("place") ||
      parsed.searchParams.get("query_place_id");

    if (queryHint) {
      current = decodeURIComponent(queryHint).replace(/\+/g, " ").trim();
    } else {
      const placeIndex = pathParts.findIndex((part) => part.toLowerCase() === "place");
      if (placeIndex >= 0 && pathParts[placeIndex + 1]) {
        current = pathParts[placeIndex + 1];
      } else {
        const searchIndex = pathParts.findIndex((part) => part.toLowerCase() === "search");
        if (searchIndex >= 0 && pathParts[searchIndex + 1]) {
          current = pathParts[searchIndex + 1];
        } else {
          const lastMeaningfulPart = [...pathParts].reverse().find((part) => {
            const lower = part.toLowerCase();
            return lower !== "maps" && lower !== "search" && lower !== "place" && !lower.startsWith("@");
          });
          current = lastMeaningfulPart ?? current;
        }
      }
    }
  } catch {
    current = current
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("?")[0]
      .split("#")[0];
  }

  return current
    .replace(/@[\d.,-]+z?/gi, "")
    .replace(/\/+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
