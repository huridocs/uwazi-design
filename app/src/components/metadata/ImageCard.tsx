import type { EntityProfile } from "../../data/entityProfiles";
import { EntityThumbnail } from "../library/EntityThumbnail";
import { MetadataCard, Property } from "./MetadataCard";

/** The entity's picture, when the entity IS one.
 *
 *  `DocumentCard`'s counterpart, and it lives beside it for the same reason: the
 *  record is one component behind the drawer and the Metadata view, so the thing
 *  the record is ABOUT has to be in the record, not bolted onto one surface. An
 *  artwork previously reached the drawer and found a document card with no
 *  document — nothing rendered — while the card that had just been clicked was
 *  showing the painting.
 *
 *  Same image path as the card (`EntityThumbnail` → `ImageThumb`): one loader,
 *  one broken-asset fallback, one `object-fit` rule. `fit="contain"` because
 *  this is the detail view — a card in a 3:1 slot crops a landscape to a band
 *  because a card is a scan target, but the place you came to LOOK at the
 *  painting shows the whole painting, matted.
 *
 *  THE BOX IS RESERVED FROM THE REAL PIXELS. `aspect-ratio` off the JPEG's own
 *  width and height means the frame is its final size before a byte arrives, so
 *  nothing under it moves when the image lands. The cap is what makes that safe
 *  for a drawer: these run to 0.55 ratio, and a portrait at the drawer's width
 *  would otherwise reserve a box taller than the pane it sits in — the cap is a
 *  layout constant, resolved at layout time like the ratio, so it costs no
 *  reflow either. */
export function ImageCard({ profile }: { profile: EntityProfile }) {
  const image = profile.image;
  if (!image) return null;

  return (
    <MetadataCard title="Image">
      <div
        className="w-full overflow-hidden rounded bg-vellum"
        style={{
          aspectRatio: `${image.width} / ${image.height}`,
          maxHeight: "22rem",
          border: "1px solid var(--border-primary)",
        }}
      >
        <EntityThumbnail
          kind="image"
          image={image}
          size="lg"
          fit="contain"
          className="w-full h-full"
        />
      </div>
      {/* Two facts, so two columns at every width — no container query to serve,
          and the file's own name and size are one tab away in Files rather than
          repeated here under a second label. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2">
        <Property label="Dimensions" value={`${image.width} × ${image.height} px`} ltr />
        <Property label="Orientation" value={image.aspect} />
      </div>
    </MetadataCard>
  );
}
