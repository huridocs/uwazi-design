import { useState } from "react";
import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { EntityImage, PreviewKind } from "../../data/entities";
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
 *  An image entity draws its ACTUAL image when the adapter supplies one
 *  (`Entity.image`, which the caller passes in — the card already holds the
 *  entity, so nothing has to be looked up again). The glyph survives as the
 *  honest fallback for an image entity with no asset, and video/audio keep
 *  theirs, because there are genuinely no assets for those.
 */
export function EntityThumbnail({
  kind,
  entityId,
  image,
  size = "md",
  className = "",
}: {
  kind: PreviewKind;
  entityId?: string;
  /** The asset behind `kind === "image"`. Absent → the glyph. */
  image?: EntityImage;
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
    return <ImageThumb image={image} size={size} className={className} />;
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

/** The image preview — the real asset, or the glyph if there isn't one.
 *
 *  **Fit is decided from the asset's real ratio, not a house style.** The card's
 *  slot is wide and short (`h-24 w-full` ≈ 3:1) and the sampled paintings run
 *  0.55 to 1.60, so one rule can't serve both ends:
 *   - a LANDSCAPE work in a wide slot crops to a band that still reads as the
 *     painting, and `cover` fills the card;
 *   - a PORTRAIT or SQUARE work under `cover` would show a sliver across the
 *     middle — 10% of a standing figure, unrecognisable and identical from card
 *     to card — so it is `contain`, matted on vellum. A gallery mats what
 *     doesn't fit the wall; it doesn't crop to the frame.
 *   - the list layout's chip is a 2.25rem SQUARE, where a mat would be almost
 *     all mat, so it covers whatever the ratio.
 *
 *  `width`/`height` are the JPEG's own pixels, so the ratio is known before a
 *  byte arrives. Both current callers fix the slot themselves, so nothing can
 *  shift today; the attributes are what keep that true for a caller that sizes
 *  the slot from the image instead.
 *
 *  `alt=""`: the image is decorative WHERE IT SITS. Every card names itself
 *  twice already — the stretched primary action carries `Select <title>` and the
 *  title is rendered beside the thumbnail — so `image.alt` ("<title> — <artist>")
 *  would be a third reading of the same words. It stays on the type for a
 *  consumer that renders the image ALONE, which no caller does yet.
 *
 *  A broken asset falls back to the glyph rather than a broken-image icon: the
 *  seed is generated from a sampling script and can drift from what shipped in
 *  `public/`. */
function ImageThumb({
  image,
  size,
  className,
}: {
  image?: EntityImage;
  size: "sm" | "md" | "lg";
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center bg-carbon-tint ${className}`}>
        <ImageIcon size={24} className="text-carbon/60" />
      </div>
    );
  }
  const matted = size !== "sm" && image.aspect !== "landscape";
  return (
    <div className={`flex items-center justify-center ${matted ? "bg-vellum" : ""} ${className}`}>
      <img
        src={image.url}
        alt=""
        width={image.width}
        height={image.height}
        // Dozens of cards are in the grid and only a few are on screen; the
        // document previews next to them already rasterise on approach.
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full"
        style={{ objectFit: matted ? "contain" : "cover" }}
      />
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
