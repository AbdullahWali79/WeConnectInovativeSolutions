import { Icon } from "@/components/icon";
import { cleanExternalUrl, getGoogleDriveFileId } from "@/lib/image-url";

export function GoogleDriveImagePreviews({ links }: { links: string[] }) {
  const images = links
    .map((value) => {
      const url = cleanExternalUrl(value);
      const fileId = getGoogleDriveFileId(url);
      return fileId
        ? {
            url,
            previewUrl: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`,
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
          <div
            key={image.url + "-" + index}
            className="group relative aspect-video overflow-hidden rounded-xl border border-outline-variant bg-white"
          >
            <iframe
              src={image.previewUrl}
              title={"Submitted Google Drive image " + (index + 1)}
              loading="lazy"
              className="pointer-events-none h-full w-full border-0 bg-white"
              allow="autoplay"
            />
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100"
              title={"Open Google Drive image " + (index + 1)}
              aria-label={"Open Google Drive image " + (index + 1)}
            >
              <Icon name="open_in_new" className="text-xl text-white" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
