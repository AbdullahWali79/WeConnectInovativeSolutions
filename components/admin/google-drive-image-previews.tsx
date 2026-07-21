import { Icon } from "@/components/icon";

function getGoogleDriveFileId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com" && !url.hostname.endsWith(".drive.google.com")) {
      return null;
    }

    const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    return pathMatch?.[1] ?? url.searchParams.get("id");
  } catch {
    return null;
  }
}

export function GoogleDriveImagePreviews({ links }: { links: string[] }) {
  const images = links
    .map((url) => {
      const fileId = getGoogleDriveFileId(url);
      return fileId
        ? {
            url,
            previewUrl: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w1200",
          }
        : null;
    })
    .filter((image): image is { url: string; previewUrl: string } => image !== null);

  if (images.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-outline-variant/50 bg-surface-container-low p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Google Drive image previews
        </p>
        <span className="text-xs font-bold text-primary">{images.length} image{images.length === 1 ? "" : "s"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((image, index) => (
          <a
            key={image.url + "-" + index}
            href={image.url}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-video overflow-hidden rounded-xl border border-outline-variant bg-white"
            title={"Open Google Drive image " + (index + 1)}
          >
            <img
              src={image.previewUrl}
              alt={"Submitted Google Drive image " + (index + 1)}
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Icon name="open_in_new" className="text-xl text-white" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}