import { useState } from "react";
import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { EntityImage, PreviewKind } from "../../data/entities";
import type { ThumbFit, ThumbFrame } from "../../atoms/library";
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
  fit = "auto",
  frame = "landscape",
  className = "",
}: {
  kind: PreviewKind;
  entityId?: string;
  /** The asset behind `kind === "image"`. Absent → the glyph. */
  image?: EntityImage;
  size?: "sm" | "md" | "lg";
  /** Image fit only — the Display menu's override. `auto` keeps the
   *  ratio-decides rule below; documents ignore it entirely. */
  fit?: ThumbFit;
  /** The SHAPE of the box the caller has drawn. It does not size anything here —
   *  the caller owns the box — but `auto` has to know which way the frame runs
   *  to decide whether an image fits it or has to be matted in it. */
  frame?: ThumbFrame;
  className?: string;
}) {
  if (kind === "document") {
    const file = entityId ? primaryFile(entityId) : null;
    return (
      <PdfPageThumb url={file?.url} ext={file?.type} size={size} className={className} />
    );
  }
  if (kind === "image") {
    return <ImageThumb image={image} size={size} fit={fit} frame={frame} className={className} />;
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
 *  **Fit is decided from the asset's real ratio against the FRAME's, not a house
 *  style.** One rule, read both ways round: an image whose orientation MATCHES
 *  the frame covers it; anything else is matted on vellum.
 *   - a landscape work in the wide frame, or a portrait work in the 3:4 frame,
 *     crops to something that still reads as the painting, and fills the card;
 *   - the mismatch under `cover` would show a sliver — 10% of a standing figure
 *     across a 3:1 band, unrecognisable and identical from card to card — so it
 *     is `contain` instead. A gallery mats what doesn't fit the wall; it doesn't
 *     crop to the frame.
 *   - a SQUARE matches neither, so it mats in both. At 0.75 the portrait frame
 *     would take a quarter of its width off, and a square composition is the one
 *     that has nothing to spare at the edges.
 *   - the list layout's chip is a small SQUARE whatever the grid's frame is —
 *     a 3:4 chip would outgrow the two lines of text it sits beside — and a mat
 *     inside 2.25rem is almost all mat, so it covers at any ratio.
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
  fit,
  frame,
  className,
}: {
  image?: EntityImage;
  size: "sm" | "md" | "lg";
  fit: ThumbFit;
  frame: ThumbFrame;
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
  // An explicit fit wins for every ratio — a user who asked for whole images
  // gets whole images, mat and all. `auto` keeps the rule above: cover only what
  // runs the same way as the frame.
  const matted =
    fit === "contain" || (fit === "auto" && size !== "sm" && image.aspect !== frame);
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
