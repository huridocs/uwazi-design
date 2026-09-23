import { Fragment, memo } from "react";
import { Link2, X } from "lucide-react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { HighlightedText } from "../shared/HighlightedText";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { EntityThumbnail, QuietMark } from "./EntityThumbnail";
import { getEntityType } from "../../data/entities";
import { entityScalarFields } from "../../utils/entityFields";
import type { Entity } from "../../data/entities";
import {
  libraryCardInfoAtom,
  libraryThumbSizeAtom,
  type LibraryViewMode,
  type ThumbSize,
} from "../../atoms/library";
import {
  EntitySelectBox,
  FOCUS_RING_ON_SELECT,
  PREVIEWED_RING,
  SELECTED_LOOK,
  holdTextSelection,
} from "./EntitySelectBox";

/** The card's ONE preview treatment.
 *
 *  A band: full card width, fixed height, so its ratio is whatever the column
 *  happens to be (~3:1 at three columns). It is a DEFINITE box before an image
 *  loads, which is the no-shift contract — the no-preview well takes the same
 *  box, so empty slots and pictures agree on height and position. */
/* The size / frame / fit controls left `main` with the Playground Split
   (2026-09-08); they are on `playground`. What stayed is the treatment those
   controls defaulted to — a landscape BAND at the medium height, with `auto`
   fit — so the cards render exactly as they did before the controls went. The
   numbers below are the M row of the tables that used to be here — re-based
   2026-09-09 along with playground's control, where the old M was cut: the band
   ran 64 / 96 / 144 and only the top of that ramp shows a document as a
   document. At 96 a judgment's first page was a grey smudge with a PDF tag on
   it. The floor moves with the band, one for one.

   `auto` is still a real rule, not "do nothing": an image whose orientation
   matches the frame covers it, anything else is matted on vellum. It lives in
   `EntityThumbnail`, which keeps taking `fit` and `frame` — `PdfPageThumb`'s
   geometry, `QuietMark` and the video / audio / no-preview treatments all read
   the frame, and `scripts/check-thumbs.ts` measures against it. */
/* Size came back as a control on `main` (2026-09-23) with Small as the default:
   a 60px (3.75rem) preview. M and L are the band heights playground re-based
   to; the floors keep one offset from the band (+9.5rem) at every size. */
const COVER_H: Record<ThumbSize, string> = { s: "h-[3.75rem]", m: "h-36", l: "h-48" };
const CARD_FLOOR: Record<ThumbSize, string> = {
  s: "min-h-[13.25rem]",
  m: "min-h-[18.5rem]",
  l: "min-h-[21.5rem]",
};
/** The list row's chip is square — see EntityThumbnail. */
const CHIP_BOX: Record<ThumbSize, string> = { s: "w-7 h-7", m: "w-9 h-9", l: "w-12 h-12" };


/** How many of the parent grid's row tracks one card claims — one per row it
 *  draws (slot? · title · metadata? · footer).
 *
 *  Static strings because Tailwind reads class names, not expressions. The count
 *  is the same for every card on screen (both toggles are global Display
 *  settings), which is the condition subgrid needs: cards in a visual row must
 *  claim the same tracks or they stop sharing them. */
const ROW_SPAN: Record<number, string> = {
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
};

/** A Library result for one standalone entity. Mirrors the Uwazi card IA:
 *  title → metadata field label/value pairs → footer (template pill · View).
 *  Clicking the surface opens the entity in the drawer; "View" navigates in.
 *  Selected (previewed) = bg-parchment; no left-border accent. */
export const EntityCard = memo(function EntityCard({
  entity,
  layout,
  query,
  selected,
  connections = 0,
  onSelect,
  onView,
  selectable = false,
  onRemove,
  className = "",
  as: Root = "div",
}: {
  entity: Entity;
  layout: LibraryViewMode;
  /** The query to MARK — passed in, never read from `libraryQueryAtom` here.
   *  Subscribing to the raw atom made every mounted card re-render on every
   *  keystroke (~2,594 renders per query over a 120-card grid), which is exactly
   *  the work `LibraryView`'s `useDeferredValue` exists to defer: the cards were
   *  re-rendering for a query whose results hadn't been computed yet. The owner
   *  passes the DEFERRED query, so a card re-renders once per settled query. */
  query: string;
  selected: boolean;
  connections?: number;
  /** A plain click previews; a Cmd/Ctrl or Shift click (or a touch tap while
   *  a selection is going) is a selection gesture: the event is passed up so
   *  the host can tell. */
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onView: (id: string) => void;
  /** Carry the (visually hidden) selection checkbox — `EntitySelectBox`. */
  selectable?: boolean;
  /** The selection drawer's "Remove from selection" — a hover / focus X at the
   *  row's end (list layout). `null` keeps the slot empty. */
  onRemove?: ((id: string) => void) | null;
  className?: string;
  /** The element: `li` when the host is a list. */
  as?: "div" | "li";
}) {
  const language = useAtomValue(languageAtom);
  const info = useAtomValue(libraryCardInfoAtom);
  const thumbSize = useAtomValue(libraryThumbSizeAtom);
  const showPreview = info.preview;
  const showMetadata = info.metadata;
  const showConnections = info.connections;

  const connectionBadge = showConnections && connections > 0 && (
    <span className="inline-flex items-center gap-1 text-meta text-ink-tertiary tabular-nums" title={`${connections} connections`}>
      <Link2 size={11} className="text-ink-muted" />
      {connections.toLocaleString()}
    </span>
  );

  // Adapter-supplied real fields (e.g. CEJIL) win; otherwise derive from the mock
  // entityMetadata profile. Only fields that resolved to a value. Shared with
  // the list table's metadata columns, which ask the identical question.
  const scalarFields = entityScalarFields(entity, language);
  // At most THREE fields, and no appended "Language" row: the card is a
  // scan-target, not a record. Language repeats the toolbar's own selector on
  // every card, and beyond three rows the grid stops reading as cards and starts
  // reading as prose. The full record is one click away in the drawer.
  const fields = scalarFields.slice(0, 3);

  const viewButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onView(entity.id);
      }}
      className="shrink-0 inline-flex items-center px-2.5 h-6 text-meta font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      View
    </button>
  );

  const base = `group relative text-start rounded-md border transition-colors cursor-pointer ${FOCUS_RING_ON_SELECT}`;
  // Previewed OR selected: the parchment ground and the carbon ring — one
  // look. The selected case is CSS off the hidden checkbox itself, so a
  // selection change re-renders nothing but the box.
  const surface = `${selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60 hover:bg-parchment"}
    ${SELECTED_LOOK}`;
  const selectBox = selectable ? <EntitySelectBox id={entity.id} title={entity.title} /> : null;

  // The card container is NOT a button — it hosts nested controls (View,
  // connection badge), so a stretched invisible primary-action button carries
  // the keyboard/AT path instead, and the content sits above it. Clicks on
  // content bubble to the container's plain onClick (mouse path unchanged).
  const primaryAction = (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Preview ${entity.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id, e);
      }}
      className="absolute inset-0 w-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
    />
  );

  if (layout === "list") {
    const type = getEntityType(entity.typeId);
    const metaFields = scalarFields.slice(0, 2);
    // Two-line editorial row: title leads, a quiet meta line (type + key
    // fields, middot-separated) sits beneath. The leading block is the
    // thumbnail when there is one, else a vellum well with the type's square
    // dot — so rows always align and carry the entity colour without
    // repeating a pill per row.
    return (
      <Root
        data-component="EntityCard"
        onClick={(e) => onSelect(entity.id, e)}
        onMouseDown={holdTextSelection}
        className={`${base} ${surface} w-full ${className}`}
      >
        {primaryAction}
        {selectBox}
        <div className="relative px-3 py-2 flex items-center gap-3">
          {showPreview &&
            (entity.preview ? (
              <EntityThumbnail
                kind={entity.preview}
                entityId={entity.id}
                image={entity.image}
                size="sm"
                fit="auto"
                tint={type?.color}
                className={`${CHIP_BOX[thumbSize]} rounded shrink-0 overflow-hidden`}
              />
            ) : (
              // The same mark the grid's empty slot draws, at chip scale — its
              // parts are fractions of the box, so one component serves both.
              <QuietMark tint={type?.color} className={`${CHIP_BOX[thumbSize]} rounded shrink-0`} />
            ))}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink truncate leading-snug">
              <HighlightedText text={entity.title} query={query} />
            </div>
            <div className="flex items-center gap-1.5 text-meta text-ink-tertiary min-w-0">
              {!showPreview && (
                <span
                  className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: type?.color ?? "#6B7280" }}
                />
              )}
              <span className="shrink-0">{type?.name ?? entity.typeId}</span>
              {showMetadata &&
                metaFields.map((f) => (
                  <Fragment key={f.id}>
                    <span className="shrink-0 text-ink-muted">·</span>
                    <span className="truncate">
                      <ThesaurusValueLabel value={f.value}>
                        <HighlightedText text={f.value} query={query} />
                      </ThesaurusValueLabel>
                    </span>
                  </Fragment>
                ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {connectionBadge}
            {viewButton}
            {onRemove !== undefined && (
              <span className="w-6 h-6 shrink-0 flex">
                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // The row leaves the list with its X. From the keyboard
                      // (`detail` 0), hand focus to the neighbour's X so the
                      // next Enter removes the next row instead of landing on
                      // the page.
                      const li = e.currentTarget.closest("li");
                      const next =
                        e.detail === 0
                          ? (li?.nextElementSibling ?? li?.previousElementSibling)?.querySelector<HTMLButtonElement>(
                              "[data-part=remove]",
                            )
                          : null;
                      onRemove(entity.id);
                      next?.focus();
                    }}
                    data-part="remove"
                    aria-label={`Remove ${entity.title} from selection`}
                    title="Remove from selection"
                    className="w-6 h-6 flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-warm
                      opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                  >
                    <X size={13} />
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      </Root>
    );
  }

  // A floor, not a fixed height — but only where heights actually vary: with
  // metadata ON, entities carry 1–3 display fields and a one-field card would
  // sit short of a three-field neighbour. With metadata OFF the card is
  // slot + title + footer, already equal everywhere, and in PORTRAIT the aspect
  // slot plus the grid row's own stretch keeps neighbours level — a rem floor
  // sized for one column width is wrong at every other.
  const minHeight = showPreview && showMetadata ? CARD_FLOOR[thumbSize] : "";

  /** One track per row this card draws. Both toggles are global, so every card
   *  on screen agrees — see ROW_SPAN. */
  const rowCount = 2 + (showPreview ? 1 : 0) + (showMetadata ? 1 : 0);

  /** Slot class: the landscape band. The picture fills it — a landscape image
   *  covers, anything else mats (ImageThumb's object-fit owns that call). */
  const slotShape = `w-full ${COVER_H[thumbSize]}`;

  return (
    // A SUBGRID, not a flex column. The card's rows — slot, title, metadata,
    // footer — are the parent grid's row tracks, so every card in a visual row
    // shares them: a title that wraps to two lines grows THAT ROW's title track
    // and every sibling's metadata starts on the same line as a result. The card
    // no longer has to guess at alignment, which is what the reserved second
    // title line was doing.
    //
    // The rows are direct children, so the old inner wrapper is gone and each
    // row carries its own `relative`. That is load-bearing, not tidying: the
    // stretched primary-action button is `absolute inset-0` and paints in the
    // positioned layer, so a STATIC sibling would paint underneath it and the
    // nested View button would stop taking clicks. Positioned siblings at
    // `z-index: auto` paint in DOM order, and the rows come after.
    <Root
      data-component="EntityCard"
      onClick={(e) => onSelect(entity.id, e)}
      onMouseDown={holdTextSelection}
      className={`${base} ${surface} ${minHeight} grid grid-rows-subgrid ${ROW_SPAN[rowCount]} gap-y-2.5 p-3 ${className}`}
    >
      {primaryAction}
      {selectBox}
      {/* The preview slot is ALWAYS filled when previews are on: an entity with
          no thumbnail gets a quiet vellum well carrying its type colour (the
          same idiom the list layout uses). Rendering the thumbnail only when one
          exists made every row as tall as its tallest card and left the grid
          ragged — reserving the slot is what lets rows line up. */}
      {/* The row is what has to line up, so the SLOT is a full-width shrink-0
          box at every frame — band in landscape, 3:4 in portrait — and the
          picture fills it. The no-preview well takes the same box, so empty
          slots and pictures agree on both height and position. */}
      {showPreview && (
        <span data-part="preview" className={`relative min-w-0 shrink-0 ${slotShape}`}>
          {entity.preview ? (
            <EntityThumbnail
              kind={entity.preview}
              entityId={entity.id}
              image={entity.image}
              fit="auto"
              frame="landscape"
              tint={getEntityType(entity.typeId)?.color}
              className="h-full w-full rounded overflow-hidden border border-border/60"
            />
          ) : (
            <QuietMark
              tint={getEntityType(entity.typeId)?.color}
              className="h-full w-full rounded border border-border/60"
            />
          )}
        </span>
      )}
      {/* Two lines are PERMITTED (`line-clamp-2`), no longer reserved. The floor
          used to be `min-h-[2.375rem]` unconditionally, which bought alignment
          by making every card pay for a second title line whether or not any
          title in the grid used one — on the artworks collection, where not one
          of 82 titles wraps, it was 38px of nothing between every title and its
          first metadata row. The row track buys the same alignment and only
          charges the rows that need it.
          `not-supports-…` keeps the old floor for engines without subgrid, where
          each card is back to sizing itself and a reserved line is the only
          thing holding a row level. */}
      {/* `self-start`: the title's box is its own two clamped lines, never the
          TRACK's height. A track taller than two lines stretched the box, and
          `line-clamp` then showed a third line cut mid-glyph under it. */}
      <span
        data-part="title"
        className={`relative min-w-0 self-start text-sm font-semibold text-ink leading-snug line-clamp-2
          not-supports-[grid-template-rows:subgrid]:min-h-[2.375rem]`}
      >
        <HighlightedText text={entity.title} query={query} />
      </span>

      {showMetadata && (
        <div className="relative min-w-0 space-y-1.5">
          {fields.map((f) => (
            <div key={f.id} className="min-w-0">
              <span className="block text-meta text-ink-tertiary leading-tight">{f.label}</span>
              {/* Exactly ONE line per field, always. `truncate` rather than
                  `line-clamp-1` because the old `block line-clamp-1` pair fought
                  over `display` (block won) and the clamp silently never
                  applied — which is how three-line values reached the grid. The
                  "+N more" is a shrink-0 sibling, so it survives the ellipsis
                  instead of being cut off inside it. */}
              <span className="flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug">
                <span className="truncate" title={f.value}>
                  <ThesaurusValueLabel value={f.value}>
                    <HighlightedText text={f.value} query={query} />
                  </ThesaurusValueLabel>
                </span>
                {!!f.more && (
                  <span className="shrink-0 text-meta text-ink-tertiary">+{f.more} more</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The footer is its own row track, so it lands on one line across the
          whole grid row without `mt-auto` pushing it there — and `self-end`
          keeps it on the track's bottom edge in the fallback, where the track
          may be taller than the footer. */}
      <div className="relative min-w-0 self-end flex items-center justify-between gap-2 pt-1">
        <EntityTypeTag typeId={entity.typeId} />
        <div className="shrink-0 flex items-center gap-2">
          {connectionBadge}
          {viewButton}
        </div>
      </div>
    </Root>
  );
});
