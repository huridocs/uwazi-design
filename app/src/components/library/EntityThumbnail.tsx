import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { PreviewKind } from "../../data/entities";
import { getEntityProfile } from "../../data/entityProfiles";
import { PdfPageThumb } from "../shared/PdfPageThumb";

/** A Library card's preview.
 *
 *  For a document-bearing entity this is now PAGE ONE OF ITS DOCUMENT, not a
 *  drawing of a document: the same thing the Metadata card shows, so a card and
 *  the entity behind it look like each other. The old skeleton-lines mock was
 *  identical on every card, which made the preview column pure texture — it told
 *  you "this has a document", which the card already said.
 *
 *  It stays a mock for image/video/audio: there genuinely are no assets for those.
 *  And the skeleton lives on as the loading/failure state under the page, so a
 *  card is never a blank rectangle while pdf.js works.
 *
 *  `entityId` is optional — without it (or without a PDF) you get the placeholder,
 *  which is what the audio/video/image kinds want anyway. */
export function EntityThumbnail({
  kind,
  entityId,
  width,
  className = "",
}: {
  kind: PreviewKind;
  entityId?: string;
  /** Render width of the page in px — pdf.js rasterises to this, so pass the real
   *  box size or the page comes out blurry (or needlessly huge). */
  width?: number;
  className?: string;
}) {
  if (kind === "document") {
    const pdfUrl = entityId ? firstPdf(entityId) : null;
    if (pdfUrl && width) {
      return (
        <PdfPageThumb
          url={pdfUrl}
          width={width}
          className={className}
          fallback={<DocumentPlaceholder />}
        />
      );
    }
    return (
      <div className={`flex items-center justify-center bg-vellum ${className}`}>
        <DocumentPlaceholder />
      </div>
    );
  }
  if (kind === "image") {
    return (
      <div className={`flex items-center justify-center bg-carbon-tint ${className}`}>
        <ImageIcon size={24} className="text-carbon/60" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ backgroundColor: "var(--text-primary)" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-paper/90">
          <Play size={14} className="text-ink ms-0.5" fill="currentColor" />
        </div>
      </div>
    );
  }
  // audio
  return (
    <div className={`flex items-center justify-center bg-warm ${className}`}>
      <AudioLines size={24} className="text-ink-tertiary" />
    </div>
  );
}

/** The stylised page — now the loading/failure state behind a real thumbnail, and
 *  still the whole story for a document we have no file for. */
function DocumentPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-vellum">
      <div className="bg-paper shadow-sm rounded-[2px] w-[38%] h-[78%] p-2 flex flex-col gap-1.5">
        <div className="h-1.5 w-2/3 rounded-full bg-border" />
        <div className="h-1 w-full rounded-full bg-border-soft" />
        <div className="h-1 w-full rounded-full bg-border-soft" />
        <div className="h-1 w-4/5 rounded-full bg-border-soft" />
        <div className="h-1 w-full rounded-full bg-border-soft" />
      </div>
    </div>
  );
}

/** The entity's first PDF, if it has one. Profiles are cached, so this is cheap
 *  to call per card. */
function firstPdf(entityId: string): string | null {
  const profile = getEntityProfile(entityId);
  if (!profile.hasDocument) return null;
  const primary = (profile.documentGroups ?? []).filter((g) => g.isPrimary)[0];
  const files = profile.files ?? [];
  const inGroup = primary ? files.filter((f) => f.groupId === primary.id) : files;
  return (inGroup.find((f) => f.type === "pdf") ?? files.find((f) => f.type === "pdf"))?.url ?? null;
}
