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
  tint,
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
  /** The entity type's colour. The kinds with no asset of their own — audio, and
   *  the empty well next door — carry it so a slot without a picture still says
   *  WHICH KIND of thing is missing, instead of being an anonymous grey box. */
  tint?: string;
  className?: string;
}) {
  if (kind === "document") {
    const file = entityId ? primaryFile(entityId) : null;
    // The portrait slot is 3:4 and a page is ~0.77 — near enough that the page
    // fills it. The wide band keeps the inset stack frame, where a page can't
    // fill the box and the framing is what stops the fit reading as a crop.
    return (
      <PdfPageThumb
        url={file?.url}
        ext={file?.type}
        size={size}
        fill={frame === "portrait"}
        className={className}
      />
    );
  }
  if (kind === "image") {
    return <ImageThumb image={image} size={size} fit={fit} frame={frame} className={className} />;
  }
  if (kind === "video") {
    // The idiom is unchanged — ink ground, paper puck, ink triangle — but every
    // part of it is now a FRACTION of the slot. At a fixed 2rem the puck was a
    // button on a poster in the portrait frame and nearly the whole box in the
    // list chip; sized against the box it reads the same at both.
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ backgroundColor: "var(--text-primary)" }}
      >
        {/* Sized off the box's HEIGHT, not its width: the two slots differ by
            ratio, not by scale, and a width fraction that reads right in a 3:4
            box is half the height of the wide band. Height plus a cap holds one
            apparent size across both. */}
        <span className="flex items-center justify-center h-[40%] min-h-6 max-h-16 aspect-square rounded-full bg-paper/90">
          <Play className="w-[38%] h-[38%] text-ink ms-[6%]" fill="currentColor" />
        </span>
      </div>
    );
  }
  // Audio: a warm ground and a waveform in the entity's own colour, both scaled
  // to the slot. The old 24px glyph in `ink-tertiary` was a grey speck adrift in
  // a portrait box, and said nothing about what the recording belonged to.
  return (
    <div className={`flex items-center justify-center bg-warm ${className}`}>
      <span className="flex items-center justify-center h-[38%] min-h-4 max-h-16 aspect-square">
        <AudioLines
          className="w-full h-full"
          style={{ color: tint ?? "var(--text-tertiary)" }}
        />
      </span>
    </div>
  );
}

/** The preview slot for an entity that has NO preview at all.
 *
 *  It was a 10px dot, which is legible in a 2.25rem chip and lost in a portrait
 *  slot ten times that. This is the same idea at the slot's own scale: the
 *  entity's square dot, kept at its true colour, resting on a plaque of the same
 *  colour at a sixth strength — a mark, not a speck, and quiet enough that a
 *  grid of them still reads as empty slots rather than as content.
 *
 *  Vellum ground and the type colour, nothing new: `bg-parchment` stays
 *  selection and no other colour enters the card. */
export function QuietMark({ tint, className = "" }: { tint?: string; className?: string }) {
  const color = tint ?? "#6B7280";
  return (
    <span className={`bg-vellum flex items-center justify-center ${className}`}>
      <span
        className="flex items-center justify-center h-[34%] min-h-5 max-h-12 aspect-square rounded-md"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <span
          className="w-[38%] aspect-square rounded-[2px]"
          style={{ backgroundColor: color }}
        />
      </span>
    </span>
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
 *   - EXPLICIT `cover` is full-bleed, whatever the frame: the box it is handed
 *     is the whole slot, so the frame control keeps only the part it can still
 *     honestly claim under that instruction — how tall the band is.
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
  // gets whole images, mat and all, and one who asked for cover gets the slot
  // FILLED (the caller hands cover a full-width box in every frame, so there is
  // no 3:4 frame left to leave a mat inside). `auto` keeps the rule above: cover
  // only what runs the same way as the frame.
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
