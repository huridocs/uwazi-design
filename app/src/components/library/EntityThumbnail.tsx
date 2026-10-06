import { useState } from "react";
import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { EntityImage, PreviewKind } from "../../data/entities";
import type { ThumbFit, ThumbFrame } from "../../atoms/library";
import { getEntityProfile } from "../../data/entityProfiles";
import { resolvePrimaryFile } from "../../data/files";
import { PdfPageThumb } from "../shared/PdfPageThumb";

/** A Library card's preview.
 *
 *  A document entity shows page one of its own document, the same preview the
 *  Metadata card shows. An image entity shows its asset (`Entity.image`, passed
 *  in by the caller, which already holds the entity) and falls back to a glyph
 *  without one. Video and audio have no poster assets, so they draw a tile: a
 *  play mark on ink, or a waveform.
 */
export function EntityThumbnail({
  kind,
  entityId,
  image,
  size = "md",
  fit = "auto",
  frame = "landscape",
  tint,
  peek = false,
  lift = false,
  loupe = false,
  className = "",
}: {
  kind: PreviewKind;
  entityId?: string;
  /** The asset behind `kind === "image"`. Absent → the glyph. */
  image?: EntityImage;
  size?: "sm" | "md" | "lg";
  /** Image fit only: the Display menu's override. `auto` applies the ratio rule
   *  in `ImageThumb`; documents ignore it. */
  fit?: ThumbFit;
  /** The shape of the box the caller has drawn. It sizes nothing here; `auto`
   *  fit needs it to decide whether an image covers the box or is matted. */
  frame?: ThumbFrame;
  /** The entity type's colour. Audio and the empty slot use it so a slot with
   *  no picture still shows which type of entity it is. */
  tint?: string;
  /** A document's sheet slides up on the card's hover (landscape frame only). */
  peek?: boolean;
  /** Small cards: the document's page rises further (see `PdfPageThumb`).
   *  Documents only. */
  lift?: boolean;
  /** A loupe magnifies the document's page under the pointer (`PageLoupe`).
   *  Documents only. */
  loupe?: boolean;
  className?: string;
}) {
  if (kind === "document") {
    const file = entityId ? primaryFile(entityId) : null;
    // The portrait slot is 3:4 and a page is ~0.77, so the page fills it. The
    // wide band keeps the inset sheet frame so a page that can't fill the box
    // doesn't read as a crop, and starts the sheet at the page's first line:
    // from the top edge, a band showed blank margin and the letterhead.
    return (
      <PdfPageThumb
        url={file?.url}
        ext={file?.type}
        size={size}
        fill={frame === "portrait"}
        peek={peek}
        lift={lift}
        loupe={loupe}
        fromText
        className={className}
      />
    );
  }
  if (kind === "image") {
    return <ImageThumb image={image} size={size} fit={fit} frame={frame} className={className} />;
  }
  if (kind === "video") {
    // Warm ground like audio, paper puck, ink triangle, each sized as a fraction
    // of the slot so it reads the same in the portrait slot and the list chip.
    // An ink ground turned a list of CEJIL hearings into a column of black bars.
    return (
      <div
        data-component="EntityThumbnail"
        data-kind="video"
        className={`flex items-center justify-center bg-warm ${className}`}
      >
        {/* Sized off the box's height, not its width: the slots differ by ratio,
            not scale. Height plus min/max caps keeps one apparent size in both. */}
        <span data-part="puck" className="flex items-center justify-center h-[40%] min-h-6 max-h-16 aspect-square rounded-full bg-paper shadow-sm">
          <Play aria-hidden className="w-[38%] h-[38%] text-ink ms-[6%]" fill="currentColor" />
        </span>
      </div>
    );
  }
  // Audio: a warm ground and a waveform in the entity type's colour, both
  // scaled to the slot.
  return (
    <div data-component="EntityThumbnail" data-kind="audio" className={`flex items-center justify-center bg-warm ${className}`}>
      <span data-part="waveform" className="flex items-center justify-center h-[38%] min-h-4 max-h-16 aspect-square">
        <AudioLines
          aria-hidden
          className="w-full h-full"
          style={{ color: tint ?? "var(--text-tertiary)" }}
        />
      </span>
    </div>
  );
}

/** The preview slot for an entity that has no preview.
 *
 *  The entity's square dot at its true colour on a plaque of the same colour at
 *  9% strength. The plaque is 22% of the slot height: larger, a screen of empty
 *  slots reads as coloured tiles rather than empty slots. `max-h-8` caps it in
 *  the portrait slot and `min-h-4` keeps it visible in the 2.25rem list chip.
 *  Vellum ground and the type colour only: `bg-parchment` is reserved for
 *  selection. */
export function QuietMark({ tint, className = "" }: { tint?: string; className?: string }) {
  const color = tint ?? "#6B7280";
  return (
    <span data-component="QuietMark" className={`bg-vellum flex items-center justify-center ${className}`}>
      <span
        data-part="plaque"
        className="flex items-center justify-center h-[22%] min-h-4 max-h-8 aspect-square rounded-md"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)` }}
      >
        <span
          data-part="dot"
          className="w-[42%] aspect-square rounded-[2px]"
          style={{ backgroundColor: color }}
        />
      </span>
    </span>
  );
}

/** The image preview: the asset, or a glyph if there is none.
 *
 *  `auto` fit compares the image's orientation with the frame's: a match covers
 *  the slot; anything else, a square included, is matted on vellum, because
 *  cover would crop a mismatched image to an unrecognisable sliver. Explicit
 *  `cover` fills the slot in any frame. The `sm` list chip is square and too
 *  small for a mat, so it always covers.
 *
 *  `width`/`height` give the ratio before the image loads, so a caller that
 *  sizes the slot from the image won't shift layout.
 *
 *  `alt=""`: the card already names itself through its primary action and its
 *  visible title. `image.alt` stays on the type for a caller that shows the
 *  image alone.
 *
 *  A broken asset falls back to the glyph: the seed comes from a sampling script
 *  and can drift from what is in `public/`. */
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
      <div data-component="EntityThumbnail" data-kind="image" data-state="missing" className={`flex items-center justify-center bg-carbon-tint ${className}`}>
        <ImageIcon size={24} aria-hidden className="text-carbon/60" />
      </div>
    );
  }
  // An explicit fit applies at every ratio; `auto` covers only an image that
  // runs the same way as the frame.
  const matted =
    fit === "contain" || (fit === "auto" && size !== "sm" && image.aspect !== frame);
  /* An image taller than its frame is anchored to the top, like the document
     sheet, because faces and mastheads sit high. A wider image stays centred. */
  const taller =
    !matted && (image.aspect === "portrait" || (image.aspect === "square" && frame === "landscape"));
  return (
    <div
      data-component="EntityThumbnail"
      data-kind="image"
      data-fit={matted ? "contain" : "cover"}
      className={`flex items-center justify-center ${matted ? "bg-vellum" : ""} ${className}`}
    >
      <img
        data-part="image"
        src={image.url}
        alt=""
        width={image.width}
        height={image.height}
        // Only a few of the grid's cards are on screen; the document previews
        // beside them also rasterise on approach.
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-full h-full"
        style={{
          objectFit: matted ? "contain" : "cover",
          objectPosition: taller ? "50% 0%" : "50% 50%",
        }}
      />
    </div>
  );
}

/** The entity's primary document. Profiles are cached, so a per-card lookup is
 *  cheap. The card reads no atoms, so it resolves against the profile's own
 *  files, which are what seed those atoms when the entity opens. */
function primaryFile(entityId: string) {
  const profile = getEntityProfile(entityId);
  if (!profile.hasDocument) return null;
  return resolvePrimaryFile(profile.files ?? [], profile.documentGroups ?? [], null, "EN");
}
