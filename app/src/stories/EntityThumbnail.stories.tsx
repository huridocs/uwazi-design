import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityThumbnail } from "../components/library/EntityThumbnail";
import { artworkLibraryEntities } from "../data/artworks/adapt";
import type { Entity } from "../data/entities";

/** A Library card's preview slot.
 *
 *  The interesting branch is `image`: the asset is drawn at its REAL ratio, and
 *  the fit is chosen from that ratio rather than from a house style. The card's
 *  slot is wide and short, so a landscape work covers it and a portrait or
 *  square one is matted — cropping a standing figure to a 3:1 band leaves a
 *  sliver that could be any painting. The list layout's chip is a small square,
 *  where a mat would be almost all mat, so it covers whatever the ratio.
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
          <p className="text-[10px] text-ink-tertiary">
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
          <span className="text-[10px] text-ink-tertiary">{label}</span>
        </div>
      ))}
    </div>
  ),
};

/** The Display menu's size presets — the slot the card reserves at each. The
 *  same class drives the document sheet next door, so a mixed grid keeps one
 *  row height whatever the preset. */
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-4xl">
      {(
        [
          { label: "small", h: "h-16" },
          { label: "medium", h: "h-24" },
          { label: "large", h: "h-36" },
        ] as const
      ).map(({ label, h }) => (
        <div key={label} className="space-y-1.5">
          <div className="grid grid-cols-3 gap-3">
            {SAMPLES.map(({ label: aspect, entity }) => (
              <EntityThumbnail
                key={aspect}
                kind="image"
                image={entity.image}
                className={`${h} w-full rounded overflow-hidden border border-border/60`}
              />
            ))}
          </div>
          <p className="text-[10px] text-ink-tertiary">{label}</p>
        </div>
      ))}
    </div>
  ),
};

/** The Display menu's fit override, against all three real ratios. `auto` is
 *  the shipped rule (ratio decides); `cover` fills and crops every ratio;
 *  `contain` mats every ratio on vellum. Documents ignore the prop. */
export const FitModes: Story = {
  render: () => (
    <div className="space-y-4 max-w-4xl">
      {(["auto", "cover", "contain"] as const).map((fit) => (
        <div key={fit} className="space-y-1.5">
          <div className="grid grid-cols-3 gap-3">
            {SAMPLES.map(({ label: aspect, entity }) => (
              <EntityThumbnail
                key={aspect}
                kind="image"
                image={entity.image}
                fit={fit}
                className="h-24 w-full rounded overflow-hidden border border-border/60"
              />
            ))}
          </div>
          <p className="text-[10px] text-ink-tertiary">
            fit: {fit} · portrait / landscape / square
          </p>
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
        <p className="text-[10px] text-ink-tertiary">image · no asset</p>
      </div>
      <div className="space-y-1.5">
        <EntityThumbnail
          kind="image"
          image={{ ...SAMPLES[0].entity.image!, url: "/artwork-images/does-not-exist.jpg" }}
          className="h-24 w-full rounded overflow-hidden border border-border/60"
        />
        <p className="text-[10px] text-ink-tertiary">image · broken url</p>
      </div>
      <div className="space-y-1.5">
        <EntityThumbnail
          kind="video"
          className="h-24 w-full rounded overflow-hidden border border-border/60"
        />
        <p className="text-[10px] text-ink-tertiary">video · unchanged</p>
      </div>
    </div>
  ),
};
