import { X, Download, ExternalLink } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { filesAtom, viewerFileIdAtom } from "../../atoms/files";
import { FileEntry, FileKind } from "../../data/files";
import { asset } from "../../utils/asset";

/** Per-kind fallback sample URLs used when a FileEntry doesn't carry one.
 *  Lets the viewer show real content for every kind in the prototype without
 *  bundling large binaries. */
const SAMPLE_URLS: Record<FileKind, string | undefined> = {
  pdf: asset("/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf"),
  document: undefined,
  audio: "https://www.w3schools.com/html/horse.mp3",
  video: "https://www.w3schools.com/html/mov_bbb.mp4",
  image: "https://picsum.photos/seed/uwazi-evidence/720/960",
  link: undefined,
};

/** Lightweight viewer overlay opened from "View" kebab actions. Renders the
 *  file content inline based on its kind — PDF iframe, audio/video player,
 *  image, or external link card. */
export function FileViewerModal() {
  const [fileId, setFileId] = useAtom(viewerFileIdAtom);
  const files = useAtomValue(filesAtom);

  if (!fileId) return null;
  const file = files.find((f) => f.id === fileId);
  if (!file) return null;

  const close = () => setFileId(null);
  const url = file.url ?? SAMPLE_URLS[file.type];

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`View ${file.name}`}
      onClick={close}
    >
      <div
        className="bg-paper shadow-xl w-full md:max-w-3xl md:rounded-lg md:max-h-[90vh] h-full md:h-auto flex flex-col md:animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-ink-secondary bg-vellum px-1.5 py-px rounded">
                {file.language}
              </span>
              <span className="text-[10px] text-ink-tertiary uppercase">{file.type}</span>
              <span className="text-[10px] text-ink-tertiary">{file.size}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && file.type !== "link" && (
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
              >
                <Download size={12} className="text-ink-tertiary" /> Download
              </a>
            )}
            <button
              onClick={close}
              aria-label="Close viewer"
              className="p-1.5 rounded-md hover:bg-parchment transition-colors cursor-pointer"
            >
              <X size={18} className="text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-warm/40 flex items-center justify-center p-6">
          <FileViewerBody file={file} url={url} />
        </div>
      </div>
    </div>
  );
}

/** Resolve the URL to render: explicit on the file, or a per-kind fallback
 *  sample. Exported so consumers can mirror download links / hrefs. */
export function resolveFileUrl(file: FileEntry): string | undefined {
  return file.url ?? SAMPLE_URLS[file.type];
}

export function FileViewerBody({ file, url }: { file: FileEntry; url?: string }) {
  if (file.type === "pdf") {
    return (
      <iframe
        title={file.name}
        src={url}
        className="w-full h-[70vh] bg-paper rounded shadow-sm"
      />
    );
  }
  if (file.type === "image" && url) {
    return (
      <img
        src={url}
        alt={file.name}
        className="max-h-[70vh] max-w-full rounded shadow-sm object-contain"
      />
    );
  }
  if (file.type === "audio" && url) {
    return (
      <div className="w-full max-w-md bg-paper rounded-md shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-md bg-warm flex items-center justify-center">
          <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-ink ml-1" />
        </div>
        <audio controls src={url} className="w-full" />
        <p className="text-[11px] text-ink-tertiary truncate w-full text-center">
          {file.name}
        </p>
      </div>
    );
  }
  if (file.type === "video" && url) {
    return (
      <video
        controls
        src={url}
        className="max-h-[70vh] max-w-full bg-ink rounded shadow-sm"
      />
    );
  }
  if (file.type === "link") {
    const href = file.name.startsWith("http") ? file.name : `https://${file.name}`;
    return (
      <div className="w-full max-w-md bg-paper rounded-md shadow-sm p-6 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-seal flex items-center justify-center">
          <ExternalLink size={20} className="text-white" />
        </div>
        <p className="text-sm font-medium text-ink text-center break-all">
          {file.name}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 text-xs font-medium text-paper bg-ink hover:bg-ink/90 rounded-md transition-colors cursor-pointer"
        >
          Open link
        </a>
      </div>
    );
  }
  return (
    <div className="text-sm text-ink-muted">
      No preview available for this file kind.
    </div>
  );
}
