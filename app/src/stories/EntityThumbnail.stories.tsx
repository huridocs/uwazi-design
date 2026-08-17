import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityThumbnail } from "../components/library/EntityThumbnail";
import { artworkLibraryEntities } from "../data/artworks/adapt";
import type { Entity } from "../data/entities";
import type { ThumbFit, ThumbFrame } from "../atoms/library";

/** A Library card's preview slot.
 *
 *  The interesting branch is `image`: the asset is drawn at its REAL ratio, and
 *  the fit is chosen from that ratio against the FRAME's rather than from a
 *  house style. An image whose orientation matches the frame covers it; anything
 *  else is matted, because cropping a standing figure to a 3:1 band leaves a
 *  sliver that could be any painting. A square matches neither frame, so it mats
 *  in both. The list layout's chip stays a small square whatever the grid's
 *  frame is, and a mat inside 2.25rem is almost all mat, so it covers.
 *
 *  The glyph is still here, and still honest: it is what an image entity with no
 *  asset gets, and what a broken asset falls back to. */
const meta: Meta<typeof EntityThumbnail> = {
  title: "Library/EntityThumbnail",
  component: EntityThumbnail,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Real seed entities, so the ratios in these stories are the ratios that ship. */
const artworks: Entity[] = artworkLibraryEntities().filter((e) => e.image);
const byAspect = (aspect: NonNullable<Entity["image"]>["aspect"]) =>
  artworks.find((e) => e.image?.aspect === aspect)!;

const SAMPLES = [
  { label: "portrait", entity: byAspect("portrait") },
  { label: "landscape", entity: byAspect("landscape") },
  { label: "square", entity: byAspect("square") },
];

/** The card slot — `h-24 w-full`, the real thing, at three real ratios. */
export const CardSlot: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3 max-w-4xl">
      {SAMPLES.map(({ label, entity }) => (
        <div key={label} className="space-y-1.5">
          <EntityThumbnail
            kind="image"
            image={entity.image}
            className="h-24 w-full rounded overflow-hidden border border-border/60"
          />
          <p className="text-meta text-ink-tertiary">
            {label} · {entity.image!.width}×{entity.image!.height}
          </p>
        </div>
      ))}
    </div>
  ),
};

/** The list layout's chip — 2.25rem square, covering at every ratio. */
export const ListChip: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {SAMPLES.map(({ label, entity }) => (
        <div key={label} className="flex items-center gap-2">
          <EntityThumbnail
            kind="image"
            image={entity.image}
            size="sm"
            className="w-9 h-9 rounded shrink-0 overflow-hidden"
          />
          <span className="text-meta text-ink-tertiary">{label}</span>
        </div>
      ))}
    </div>
  ),
};

/** The frame the card draws, at each size preset. Landscape is a full-width band;
 *  portrait is a 3:4 frame sized from its height — the same tables `EntityCard`
 *  keeps, so these stories move when the grid does. */
const FRAME_H: Record<ThumbFrame, { size: string; h: string }[]> = {
  landscape: [
    { size: "small", h: "h-16" },
    { size: "medium", h: "h-24" },
    { size: "large", h: "h-36" },
  ],
  portrait: [
    { size: "small", h: "h-24" },
    { size: "medium", h: "h-36" },
    { size: "large", h: "h-52" },
  ],
};
const FRAMES: ThumbFrame[] = ["landscape", "portrait"];
/** The shape the picture takes inside the band — the same rule `EntityCard`
 *  applies. Explicit `cover` is full-bleed in EVERY frame: cover means fill, and
 *  a 3:4 frame with vellum down both sides is not filling. */
const shape = (frame: ThumbFrame, fit: ThumbFit = "auto") =>
  frame === "portrait" && fit !== "cover" ? "aspect-[3/4]" : "w-full";

/** The Display menu's size presets, in BOTH frames. A portrait frame at a given
 *  size stands as tall as a landscape one a step up — which is what makes Size
 *  read as one control across the two shapes. The row band is full width at both,
 *  so the portrait pictures hang centred and the grid rows still line up. */
export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 max-w-4xl">
      {FRAMES.map((frame) => (
        <div key={frame} className="space-y-3">
          <p className="text-meta font-semibold uppercase tracking-wide text-ink-tertiary">
            {frame}
          </p>
          {FRAME_H[frame].map(({ size, h }) => (
            <div key={size} className="space-y-1.5">
              <div className="grid grid-cols-3 gap-3">
                {SAMPLES.map(({ label: aspect, entity }) => (
                  <span key={aspect} className={`${h} w-full flex justify-center`}>
                    <EntityThumbnail
                      kind="image"
                      image={entity.image}
                      frame={frame}
                      className={`h-full ${shape(frame)} rounded overflow-hidden border border-border/60`}
                    />
                  </span>
                ))}
              </div>
              <p className="text-meta text-ink-tertiary">{size}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The Display menu's fit override, against all three real ratios in BOTH frames.
 *
 *  `auto` covers only what runs the same way as the frame — so the portrait
 *  column fills the portrait frame and mats in the landscape one, and the
 *  landscape column does the reverse.
 *
 *  `cover` FILLS, and in the portrait frame that means edge to edge: the 3:4
 *  frame is gone and the picture takes the whole band, because a setting called
 *  cover that leaves vellum down both sides is refusing its own instruction.
 *  What the frame still decides under cover is how TALL the band is — which is
 *  why the portrait row here crops a landscape work far less than the landscape
 *  row above it does a portrait one.
 *
 *  `contain` mats everywhere, in the frame. Documents ignore the prop. */
export const FitModes: Story = {
  render: () => (
    <div className="space-y-6 max-w-4xl">
      {FRAMES.map((frame) => (
        <div key={frame} className="space-y-3">
          <p className="text-meta font-semibold uppercase tracking-wide text-ink-tertiary">
            {frame}
          </p>
          {(["auto", "cover", "contain"] as const).map((fit) => (
            <div key={fit} className="space-y-1.5">
              <div className="grid grid-cols-3 gap-3">
                {SAMPLES.map(({ label: aspect, entity }) => (
                  <span
                    key={aspect}
                    // Portrait under cover gets its own taller band — the frame
                    // is gone, so the band is all that decides the crop.
                    className={`${
                      frame === "portrait" ? (fit === "cover" ? "h-44" : "h-36") : "h-24"
                    } w-full flex justify-center`}
                  >
                    <EntityThumbnail
                      kind="image"
                      image={entity.image}
                      fit={fit}
                      frame={frame}
                      className={`h-full ${shape(frame, fit)} rounded overflow-hidden border border-border/60`}
                    />
                  </span>
                ))}
              </div>
              <p className="text-meta text-ink-tertiary">
                fit: {fit} · portrait / landscape / square
                {frame === "portrait" && fit === "cover" && " · full-bleed, no frame"}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** No asset. An image entity whose adapter supplied nothing keeps the glyph —
 *  it says "picture, not here" rather than pretending to be one. A broken URL
 *  lands in the same place, via the `<img>`'s error path. */
export const NoAsset: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3 max-w-4xl">
      <div className="space-y-1.5">
        <EntityThumbnail
          kind="image"
          className="h-24 w-full rounded overflow-hidden border border-border/60"
        />
        <p className="text-meta text-ink-tertiary">image · no asset</p>
      </div>
      <div className="space-y-1.5">
        <EntityThumbnail
          kind="image"
          image={{ ...SAMPLES[0].entity.image!, url: "/artwork-images/does-not-exist.jpg" }}
          className="h-24 w-full rounded overflow-hidden border border-border/60"
        />
        <p className="text-meta text-ink-tertiary">image · broken url</p>
      </div>
      <div className="space-y-1.5">
        <EntityThumbnail
          kind="video"
          className="h-24 w-full rounded overflow-hidden border border-border/60"
        />
        <p className="text-meta text-ink-tertiary">video · unchanged</p>
      </div>
    </div>
  ),
};
