import { useEffect, useRef, useState } from "react";
import { AudioLines, Clapperboard, EyeOff, ExternalLink, ImageIcon, TriangleAlert } from "lucide-react";
import type { EntityImage } from "../../data/entities";
import type { MediaItemView } from "../../data/entityProfiles";
import { MetadataCard } from "./MetadataCard";
import { MediaFieldValue } from "./MediaFieldValue";

const KIND_TITLE: Record<MediaItemView["kind"], string> = {
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  graphic: "Graphic",
};

const LINK =
  "inline-flex items-center gap-1 min-w-0 underline-offset-2 hover:underline hover:text-ink rounded " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40";

/** A media item's record leads with the item: the picture, the player, or the
 *  post it links to.
 *
 *  - A bundled picture opens full size, and its credit (attribution, licence,
 *    file page) sits under it on every surface: the copy is only ours to show
 *    on those terms.
 *  - A video or podcast plays through the record's media player
 *    (`MediaFieldValue`), from the segment the record is about when it has one.
 *    Nothing loads from the host until the reader presses play.
 *  - A graphic or distressing item is covered until the reader chooses to see
 *    it. The cover takes the stage's own box, so revealing it moves nothing,
 *    and a revealed video still waits for its play button.
 *  - A misattributed item says so first, with the fact-checks that found it. */
export function MediaItemCard({
  item,
  onOpenImage,
}: {
  item: MediaItemView;
  onOpenImage: (image: EntityImage) => void;
}) {
  const misattributed = item.verification?.value === "misattributed";
  return (
    <MetadataCard title={KIND_TITLE[item.kind]} component="MediaItemCard">
      {/* A reading measure: across a 1,400px record a player or a picture is
          larger than anything around it needs to be. */}
      <div data-part="measure" className="flex flex-col gap-2 w-full max-w-[44rem]">
        {misattributed && <MisattributionNote item={item} />}
        <CoveredStage warning={item.contentWarning}>
          <Stage item={item} onOpenImage={onOpenImage} />
        </CoveredStage>
        {item.image && <Credit item={item} />}
        {/* A recording's own page, when the player is somewhere else (a podcast
          host, an outlet's page) or there is no player at all. */}
        {!item.image && item.embed && item.page && item.page.url !== item.embed && (
          <p data-part="page" className="text-meta text-ink-tertiary">
            <a
              href={item.page.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} max-w-full`}
              title={item.page.url}
            >
              <span className="truncate">{item.page.label}</span>
              <ExternalLink size={10} aria-hidden className="shrink-0" />
            </a>
          </p>
        )}
      </div>
    </MetadataCard>
  );
}

/** Misattributed: the item was shared as something it is not. Amber, at the
 *  top, in words, with the fact-checks named and linked. */
function MisattributionNote({ item }: { item: MediaItemView }) {
  return (
    <div data-part="misattributed" role="note" className="flex gap-2.5 rounded-md bg-warning-light px-3 py-2.5">
      <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold text-warning-label">Misattributed</p>
        <p className="text-sm text-ink leading-snug">
          {"Fact-checkers found it was not recorded where or when it was\u00a0shared."}
        </p>
        {item.factChecks.length > 0 ? (
          <ul data-part="fact-checks" className="flex flex-col gap-0.5">
            {item.factChecks.map((f) => (
              <li key={f.entityId} className="text-sm text-ink-secondary leading-snug min-w-0">
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${LINK} font-medium text-ink`}
                    title={f.title}
                  >
                    <span className="truncate">Fact-check: {f.publisher}</span>
                    <ExternalLink size={11} aria-hidden className="shrink-0" />
                  </a>
                ) : (
                  <span className="font-medium text-ink">Fact-check: {f.publisher}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          item.verifiedBy && <p className="text-sm text-ink-secondary">Fact-checked by {item.verifiedBy}</p>
        )}
      </div>
    </div>
  );
}

/** The cover over a graphic or distressing item. The stage stays mounted
 *  underneath, inert and hidden (a picture is blurred past recognition), so
 *  the box is its final size before and after. One button reveals it, for
 *  as long as the record stays open. */
function CoveredStage({ warning, children }: { warning: MediaItemView["contentWarning"]; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const covered = !!warning && !revealed;
  const stageRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef(false);
  // React 18 has no `inert` prop.
  useEffect(() => {
    stageRef.current?.toggleAttribute("inert", covered);
  }, [covered]);
  // After a reveal, focus moves to what was revealed rather than to the body.
  useEffect(() => {
    if (!revealed || !revealRef.current) return;
    revealRef.current = false;
    stageRef.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [revealed]);
  if (!warning) return <>{children}</>;
  const graphic = warning.value === "graphic";
  return (
    // `data-state`, not `data-covered`: that attribute is the overlay stack's
    // (index.css hides everything under it).
    <div
      data-part="covered-stage"
      data-state={covered ? "covered" : "revealed"}
      className="relative overflow-hidden rounded-md"
    >
      <div
        ref={stageRef}
        aria-hidden={covered || undefined}
        className={covered ? "blur-2xl saturate-50 select-none pointer-events-none" : undefined}
      >
        {children}
      </div>
      {covered && (
        <div
          data-part="cover"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-3 text-center bg-vellum/95"
        >
          <EyeOff size={18} aria-hidden className="text-ink-tertiary" />
          <p className="text-sm font-medium text-ink">{graphic ? "Graphic content" : "Distressing content"}</p>
          <p className="max-w-[26rem] text-meta text-ink-secondary leading-snug">
            {graphic
              ? "This item may show violence or injury. It\u00a0stays covered until you choose to see\u00a0it."
              : "This item may be upsetting. It\u00a0stays covered until you choose to see\u00a0it."}
          </p>
          <button
            type="button"
            data-part="reveal"
            onClick={() => {
              revealRef.current = true;
              setRevealed(true);
            }}
            className="mt-1 rounded-md bg-paper px-3 py-1 text-xs font-medium text-ink hover:bg-warm transition-colors cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            Show {graphic ? "graphic" : "distressing"} content
          </button>
        </div>
      )}
    </div>
  );
}

function Stage({ item, onOpenImage }: { item: MediaItemView; onOpenImage: (image: EntityImage) => void }) {
  if (item.image) return <ImageStage image={item.image} onOpen={onOpenImage} />;
  if (item.embed)
    return (
      <MediaFieldValue
        raw={item.embed}
        segment={item.segment}
        kindHint={item.kind === "audio" || item.kind === "video" ? item.kind : undefined}
      />
    );
  return <LinkStage item={item} />;
}

/** The picture, matted, in a box reserved from its pixel size and capped for a
 *  drawer (see `ImageCard`, whose frame this is). It opens full size. */
function ImageStage({ image, onOpen }: { image: EntityImage; onOpen: (image: EntityImage) => void }) {
  return (
    <button
      type="button"
      data-part="open"
      onClick={() => onOpen(image)}
      aria-label={`View ${image.alt} full size`}
      title="View full size"
      className="block w-full cursor-zoom-in rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <div
        data-part="frame"
        className="w-full overflow-hidden rounded bg-vellum flex items-center justify-center"
        style={{
          aspectRatio: `${image.width} / ${image.height}`,
          maxHeight: "26rem",
          border: "1px solid var(--border-primary)",
        }}
      >
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </button>
  );
}

/** A post the collection does not hold or play (an X, Facebook or TikTok
 *  video): where it is, and the way out. A fixed box, so a cover over it has
 *  room for its words. */
function LinkStage({ item }: { item: MediaItemView }) {
  const Icon = item.kind === "audio" ? AudioLines : item.kind === "video" ? Clapperboard : ImageIcon;
  const where = item.platform ? `on ${item.platform}` : "elsewhere";
  return (
    <div
      data-part="link-stage"
      className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-md border border-border bg-warm px-4 py-4 text-center"
    >
      <Icon size={20} aria-hidden className="text-ink-tertiary" />
      <p className="text-sm text-ink-secondary">
        {item.kind === "audio" ? "Recording" : item.kind === "video" ? "Video" : "Item"} posted {where}.{" "}
        {"The\u00a0collection links it; it holds no\u00a0copy."}
      </p>
      {item.page && (
        <a
          href={item.page.url}
          target="_blank"
          rel="noopener noreferrer"
          title={item.page.url}
          className={`${LINK} max-w-full text-xs font-medium text-ink-secondary`}
        >
          <span className="truncate">Open {where === "elsewhere" ? "the original" : where.slice(3)}</span>
          <ExternalLink size={10} aria-hidden className="shrink-0" />
        </a>
      )}
    </div>
  );
}

/** Attribution and licence under a bundled picture: always shown, never
 *  behind a hover or a cover. */
function Credit({ item }: { item: MediaItemView }) {
  return (
    <p
      data-part="credit"
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-ink-secondary leading-snug"
    >
      {item.attribution && <span>{item.attribution}</span>}
      {item.licence && (
        <>
          <span aria-hidden className="text-ink-tertiary">
            ·
          </span>
          {item.licenceUrl ? (
            <a href={item.licenceUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              {item.licence}
              <ExternalLink size={10} aria-hidden className="shrink-0" />
            </a>
          ) : (
            <span>{item.licence}</span>
          )}
        </>
      )}
      {item.page && (
        <>
          <span aria-hidden className="text-ink-tertiary">
            ·
          </span>
          <a
            href={item.page.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${LINK} max-w-full`}
            title={item.page.url}
          >
            <span className="truncate">{item.page.label}</span>
            <ExternalLink size={10} aria-hidden className="shrink-0" />
          </a>
        </>
      )}
    </p>
  );
}
