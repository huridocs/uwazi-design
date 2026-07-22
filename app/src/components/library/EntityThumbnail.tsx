import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { PreviewKind } from "../../data/entities";
import { getEntityProfile } from "../../data/entityProfiles";
import { resolvePrimaryFile } from "../../data/files";
import { PdfPageThumb } from "../shared/PdfPageThumb";

/** A Library card's preview.
 *
 *  For a document-bearing entity it's page one of its ACTUAL document, in the
 *  cropped-sheet frame — the same preview the Metadata card shows, so a card and
 *  the entity behind it look like each other. The drawn sheet with ruled lines is
 *  gone: it was a picture of a document pretending to be the document, identical
 *  on every card.
 *
 *  image/video/audio keep their glyphs — there are genuinely no assets for those.
 */
export function EntityThumbnail({
  kind,
  entityId,
  size = "md",
  className = "",
}: {
  kind: PreviewKind;
  entityId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (kind === "document") {
    const file = entityId ? primaryFile(entityId) : null;
    return (
      <PdfPageThumb url={file?.url} ext={file?.type} size={size} className={className} />
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
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ backgroundColor: "var(--text-primary)" }}
      >
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

/** The entity's primary document. Profiles are cached, so per-card is cheap; the
 *  card has no atoms to read, so it resolves against the profile's own files
 *  (which is what the atoms are seeded from when you open the entity). */
function primaryFile(entityId: string) {
  const profile = getEntityProfile(entityId);
  if (!profile.hasDocument) return null;
  return resolvePrimaryFile(profile.files ?? [], profile.documentGroups ?? [], null, "EN");
}
