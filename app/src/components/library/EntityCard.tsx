import { Fragment, memo } from "react";
import {
  AudioLines,
  CirclePlay,
  Clapperboard,
  Image as ImageIcon,
  Link2,
  Maximize2,
  Pilcrow,
  Table2,
  X,
} from "lucide-react";
import { useAtomValue, useStore } from "jotai";
import { languageAtom } from "../../atoms/language";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { HighlightedText } from "../shared/HighlightedText";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import {
  EntitySelectBox,
  FOCUS_RING_ON_SELECT,
  PREVIEWED_RING,
  SELECTED_LOOK,
  holdTextSelection,
  lastPointerWasTouch,
  selectionIntent,
} from "./EntitySelectBox";
import { librarySelectionActiveAtom } from "../../atoms/library";
import { EntityThumbnail, QuietMark } from "./EntityThumbnail";
import { measurePeekRoom, peekEnter, peekLeave } from "./docPeek";
import { CardValue, ownsItsRemainder } from "./CardValue";
import { LIBRARY_SORTS } from "../../data/libraryDisplay";
import { getEntityType, imageFocusKey, type EntityImage } from "../../data/entities";
import { entityScalarFields, type EntityScalarField } from "../../utils/entityFields";
import type { PropertyKind } from "../../utils/propertyKind";
import type { CardMark, MediaMark } from "../../data/entities";
import type { Entity } from "../../data/entities";
import {
  libraryCardInfoAtom,
  libraryCardSideAtom,
  cardFieldLimit,
  librarySortAtom,
  libraryThumbSizeAtom,
  type LibrarySort,
  libraryThumbFitAtom,
  libraryThumbFrameAtom,
  type LibraryViewMode,
  type ThumbFrame,
  type ThumbSize,
} from "../../atoms/library";

/** The preview slot per Display-menu size and frame.
 *
 *  Landscape is a full-width band with a fixed height per size. Portrait is the
 *  card's full width at 3:4; `LibraryView` narrows the columns for portrait, and
 *  Size steps the column count there rather than a height here.
 *
 *  Both are definite boxes before an image loads (fixed height, or aspect against
 *  the column width), so loading shifts nothing. `m` is 144px because below that
 *  a document's first page is unreadable; `s` (60px) is for readers who want the
 *  text, with the page as an identifier. Each floor keeps the same offset from its band. */
const COVER_H: Record<ThumbSize, string> = { s: "h-[3.75rem]", m: "h-36", l: "h-48" };
const CARD_FLOOR: Record<ThumbSize, string> = {
  s: "min-h-[13.25rem]",
  m: "min-h-[18.5rem]",
  l: "min-h-[21.5rem]",
};
/** The list row's chip is square at every frame (see `EntityThumbnail`) and is
 *  sized against the row's two text lines, not the band. */
const CHIP_BOX: Record<ThumbSize, string> = { s: "w-7 h-7", m: "w-9 h-9", l: "w-12 h-12" };

/** The side layout's slot: a fixed width per size at the frame's ratio (4:3 or
 *  3:4), a definite box before any image loads. It spans the card's rows, so it
 *  is the card's floor and `CARD_FLOOR` does not apply. */
const SIDE_W: Record<ThumbSize, string> = { s: "", m: "w-40", l: "w-52" };
/** A side card shows at most three properties, whatever the Display menu says,
 *  so its height stays near its slot's. The rest is counted in the footer (`+N`). */
const SIDE_FIELD_CAP = 3;
const SIDE_SHAPE: Record<ThumbFrame, string> = { landscape: "aspect-[4/3]", portrait: "aspect-[3/4]" };
/** Small is set by height (3.75rem) at the frame's ratio, both sides written out
 *  so the box is definite before any image loads. The card is then as tall as
 *  its text, not its slot. */
const SIDE_SMALL: Record<ThumbFrame, string> = {
  landscape: "h-[3.75rem] w-[5rem]",
  portrait: "h-[3.75rem] w-[2.8125rem]",
};

/** The field the current sort reads on this card, so the card can shade it.
 *
 *  `country` is matched by value, not label: the label differs per corpus and
 *  language ("País", "Country"), and `entity.country` is the value the sort
 *  compares. `recent` marks nothing because a card shows no added-on date. */
function sortedFieldId(
  sort: LibrarySort,
  entity: Entity,
  fields: EntityScalarField[],
): string | null {
  if (sort !== "country" || !entity.country) return null;
  return fields.find((f) => f.value === entity.country)?.id ?? null;
}

/** Footer glyph and accessible label for each kind that cannot be a card line.
 *  Media is split by the value (set by the adapter): a recording that is neither
 *  clearly video nor audio gets the neutral play mark. */
const MARK_ICON: Record<CardMark, typeof Pilcrow> = {
  long: Pilcrow,
  table: Table2,
  video: Clapperboard,
  audio: AudioLines,
  media: CirclePlay,
};
const MARK_LABEL: Record<CardMark, string> = {
  long: "Has a written summary",
  table: "Has a table",
  video: "Has video",
  audio: "Has audio",
  media: "Has media",
};
const isMediaMark = (m: CardMark): m is MediaMark => m === "video" || m === "audio" || m === "media";

/** Kinds whose value is something to open (a place, a connected entity, a table,
 *  a file). Only these become triggers: each trigger is a tab stop on every card,
 *  and making every property one would triple the stops per grid row. */
const INSPECTABLE = new Set<PropertyKind>(["place", "relationship", "table", "media", "files"]);

/** A trigger needs an inspectable kind and the template key the record is keyed
 *  on; without the key there is nothing to focus. */
function inspectable(f: EntityScalarField): boolean {
  return !!f.key && !!f.kind && INSPECTABLE.has(f.kind);
}

/** Parent-grid row tracks one card claims, one per row it draws (slot? · title ·
 *  metadata? · footer). Static strings because Tailwind reads class names, not
 *  expressions. Every card on screen must claim the same count, or cards in a
 *  visual row stop sharing subgrid tracks. */
const ROW_SPAN: Record<number, string> = {
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
};

/** A Library result for one entity: title, metadata label/value pairs, footer
 *  (template tag · Open). Clicking the card previews it in the drawer; Open
 *  navigates to it. */
export const EntityCard = memo(function EntityCard({
  entity,
  layout,
  query,
  selected,
  connections = 0,
  onSelect,
  onView,
  onFocusProperty,
  onOpenImage,
  metadataTrack = true,
  selectable = false,
  onRemove,
  className = "",
  as: Root = "article",
}: {
  entity: Entity;
  layout: LibraryViewMode;
  /** The query to highlight. A prop, never a `libraryQueryAtom` subscription:
   *  that would re-render every mounted card on each keystroke. `LibraryView`
   *  passes the deferred query, so a card re-renders once per settled query. */
  query: string;
  selected: boolean;
  connections?: number;
  /** Preview, or a selection when Cmd/Ctrl or Shift is held; the event is
   *  passed so the host can tell which. */
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onView: (id: string) => void;
  /** Render the visually hidden `EntitySelectBox`. Off where there are no bulk
   *  actions (the template preview). */
  selectable?: boolean;
  /** The selection drawer's "Remove from selection" X, shown on hover or focus.
   *  Its slot is reserved on every row so it shifts nothing. List layout only;
   *  `null` keeps the slot empty (a row already removed). */
  onRemove?: ((id: string) => void) | null;
  /** Extra classes on the root (the selection drawer dims an unticked row). */
  className?: string;
  /** Open the entity in the drawer with one property focused (scrolled to and
   *  flashed). Hosts without property triggers omit it. */
  onFocusProperty?: (id: string, fieldKey: string) => void;
  /** Show one image full size. The view owns the lightbox so a grid mounts one
   *  overlay, not one per card. */
  onOpenImage?: (image: EntityImage) => void;
  /** Whether the grid draws a metadata track at all; computed once by the view
   *  for every card. See the track comment below. */
  metadataTrack?: boolean;
  /** Root element: `article` by default; list hosts pass `li` so the card is the
   *  list item itself. A wrapper `li` would take the subgrid row tracks and the
   *  cards would stop sharing them. */
  as?: "article" | "li";
}) {
  const store = useStore();
  const language = useAtomValue(languageAtom);
  const sort = useAtomValue(librarySortAtom);
  const info = useAtomValue(libraryCardInfoAtom);
  const thumbSize = useAtomValue(libraryThumbSizeAtom);
  const thumbFit = useAtomValue(libraryThumbFitAtom);
  const thumbFrame = useAtomValue(libraryThumbFrameAtom);
  // Side only in the grid; the atom already falls back on phones and with
  // previews off.
  const side = useAtomValue(libraryCardSideAtom) && layout === "cards";
  const showPreview = info.preview;
  const showMetadata = info.metadata;
  const showConnections = info.connections;

  const connectionBadge = showConnections && connections > 0 && (
    <span
      className={`inline-flex items-center gap-1 text-meta text-ink-tertiary tabular-nums ${
        sort === "connections" ? "rounded-sm bg-vellum -mx-1 px-1 -my-px py-px" : ""
      }`}
      title={sort === "connections" ? `Sorted by relationships: ${connections}` : `${connections} relationships`}
    >
      <Link2 size={11} className="text-ink-muted" />
      {connections.toLocaleString()}
    </span>
  );

  // Only fields that resolved to a value; shared with the list table's metadata columns.
  const scalarFields = entityScalarFields(entity, language);
  /* No fixed ceiling: the count is the Display menu's choice (None / First 3 /
     First 5 / All). The subgrid keeps rows level whatever the line counts, and
     no "Language" row is added because the toolbar already shows it. */
  const menuLimit = cardFieldLimit(info.fields);
  const limit = side ? Math.min(menuLimit ?? Infinity, SIDE_FIELD_CAP) : menuLimit;
  const fields = limit === null ? scalarFields : scalarFields.slice(0, limit);
  /* Properties the limit left out, shown as `+N`. Suppressed at "None": the
     reader turned properties off, so a count on every card is noise. */
  const beyond = limit === 0 ? 0 : scalarFields.length - fields.length;

  /* Kinds that cannot be a card line; adapter-supplied, absent in the mock sample. */
  const marks = showMetadata ? (entity.marks ?? []) : [];
  /* Only a real `image` asset enlarges; see the slot below for why the other kinds don't. */
  const enlargeable =
    showPreview && layout === "cards" && entity.preview === "image" && !!entity.image && !!onOpenImage;
  /* Images after the first (the first is the slot's picture), and only those with
     a property key, since the link opens the record at that key. */
  const extraImages =
    showMetadata && metadataTrack
      ? (entity.images ?? []).slice(1).filter((img) => !!img.fieldKey)
      : [];
  /* The sort mark shades an existing element (property row, title, template tag
     or connection count), so it adds no line and moves nothing. */
  const sortedId = sortedFieldId(sort, entity, fields);
  const sortLabel = LIBRARY_SORTS.find((c) => c.id === sort)?.label ?? sort;
  const sortedNote = `Sorted by ${sortLabel}`;
  const sortMark = (on: boolean) =>
    on ? "rounded-sm bg-vellum -mx-1 px-1 -my-px py-px" : "";
  const markTitle = marks.map((m) => MARK_LABEL[m]).join(" · ");

  const viewButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onView(entity.id);
      }}
      className="shrink-0 inline-flex items-center px-2.5 h-6 text-meta font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      Open
    </button>
  );

  const base = `group relative text-start rounded-md border transition-colors cursor-pointer data-[peek]:z-10 has-[:focus-visible]:z-10 ${FOCUS_RING_ON_SELECT}`;
  // Previewed and selected both use bg-parchment. The selected case is CSS off
  // the hidden checkbox, so a selection change re-renders only the box.
  const surface = `${selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60 hover:bg-parchment"}
    ${SELECTED_LOOK}`;
  const selectBox = selectable ? <EntitySelectBox id={entity.id} title={entity.title} /> : null;

  // The card is not a button because it hosts nested controls. A stretched
  // invisible button carries the keyboard and screen-reader path; mouse clicks
  // on content bubble to the container's plain onClick.
  const primaryAction = (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Preview ${entity.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id, e);
      }}
      data-part="primary-action"
      className="absolute inset-0 w-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
    />
  );

  if (layout === "list") {
    const type = getEntityType(entity.typeId);
    const metaFields = scalarFields.slice(0, 2);
    // Two-line row: title, then type and key fields. The leading block is the
    // thumbnail or a `QuietMark`, so rows align and carry the type colour.
    return (
      <Root
        data-component="EntityCard"
        data-layout="list"
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
                fit={thumbFit}
                tint={type?.color}
                className={`${CHIP_BOX[thumbSize]} rounded shrink-0 overflow-hidden`}
              />
            ) : (
              // Same mark as the grid's empty slot; its parts scale with the box.
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
                    <CardValue field={f} query={query} compact />
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
                      // From the keyboard (`detail` 0), move focus to the
                      // neighbour's X so focus is not lost when this row unmounts.
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

  // A min-height only with metadata on in the landscape stacked layout, where
  // field counts vary. In portrait the aspect slot and row stretch keep cards
  // level, and a rem floor would be right at only one column width.
  const minHeight =
    showPreview && showMetadata && metadataTrack && thumbFrame === "landscape" && !side
      ? CARD_FLOOR[thumbSize]
      : "";

  /** One track per row drawn; see `ROW_SPAN`. */
  const rowCount = 2 + (showPreview && !side ? 1 : 0) + (showMetadata && metadataTrack ? 1 : 0);

  /** Landscape is the fixed band, portrait the card's width at 3:4. How the
   *  picture sits inside is `ImageThumb`'s object-fit. */
  const slotShape = side
    ? `${thumbSize === "s" ? SIDE_SMALL[thumbFrame] : `${SIDE_W[thumbSize]} ${SIDE_SHAPE[thumbFrame]}`} row-span-full col-start-1 self-start`
    : `w-full ${thumbFrame === "portrait" ? "aspect-[3/4]" : COVER_H[thumbSize]}`;
  /** Side layout: text rows are placed explicitly in column 2 so child order
   *  can never put one under the slot. */
  const textCol = side ? "col-start-2" : "";
  /** A landscape document peeks out of its band on hover (`docPeek.ts`), so its
   *  wrapper must not clip. */
  const peekDoc = entity.preview === "document" && thumbFrame === "landscape";
  return (
    // A subgrid: the card's rows are the parent grid's tracks, so a wrapping
    // title grows that row's title track for every card in the row.
    //
    // Each row needs its own `relative`. The primary-action button is `absolute
    // inset-0`; a static sibling would paint under it and its nested controls
    // would stop taking clicks. Positioned siblings paint in DOM order.
    <Root
      data-component="EntityCard"
      data-layout="cards"
      data-card-layout={side ? "side" : "stacked"}
      // The keyboard peek is CSS (`:focus-visible`) but still needs the room
      // above it measured.
      onFocus={peekDoc ? (e) => measurePeekRoom(e.currentTarget) : undefined}
      onClick={(e) => onSelect(entity.id, e)}
      onMouseDown={holdTextSelection}
      className={`${base} ${surface} ${minHeight} grid grid-rows-subgrid ${ROW_SPAN[rowCount]} gap-y-2.5 p-3 ${
        side ? "grid-cols-[auto_minmax(0,1fr)] gap-x-3" : ""
      }`}
    >
      {primaryAction}
      {selectBox}
      {/* With previews on the slot is always rendered, with a `QuietMark` when
          there is no thumbnail, so every card in a row has the same slot box. */}
      {showPreview && (
        <span
          data-part="preview"
          className={`relative min-w-0 shrink-0 ${slotShape}`}
          // The page peek follows the thumbnail, not the card; see `docPeek.ts`.
          onPointerEnter={peekDoc ? peekEnter : undefined}
          onPointerLeave={peekDoc ? peekLeave : undefined}
        >
          {entity.preview ? (
            enlargeable ? (
              /* A nested control above the primary action, with
                 `stopPropagation` so a click never also selects. Only real image
                 assets: video/audio are drawings, and a document thumbnail is a
                 raster at card width, so enlarging it only blurs it; Open shows
                 the document. */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // A selection gesture (Cmd/Ctrl or Shift, or a touch tap
                  // while a selection is active) selects instead. Read at click
                  // time so no card subscribes to the selection.
                  if (
                    selectionIntent(e) ||
                    (lastPointerWasTouch() && store.get(librarySelectionActiveAtom))
                  ) {
                    onSelect(entity.id, e);
                    return;
                  }
                  onOpenImage!(entity.image!);
                }}
                aria-label={`Open ${entity.image!.filename ?? entity.title} full size`}
                title="View full size"
                /* `cursor-zoom-in!` overrides the global `cursor: pointer` on
                   buttons in `index.css`; the cursor signals that this enlarges. */
                className="thumb-zoom-trigger relative block h-full w-full cursor-zoom-in! rounded
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              >
                <EntityThumbnail
                  kind={entity.preview}
                  entityId={entity.id}
                  image={entity.image}
                  fit={thumbFit}
                  frame={thumbFrame}
                  peek={thumbFrame === "landscape"}
                  tint={getEntityType(entity.typeId)?.color}
                  className="h-full w-full rounded overflow-hidden border border-border/60"
                />
                {/* Zoom icon shown on hover or focus. `.thumb-zoom` /
                    `.thumb-zoom-trigger` are plain rules in index.css because a
                    Tailwind named-group variant loses a specificity tie there. */}
                <span
                  aria-hidden
                  className="thumb-zoom pointer-events-none absolute bottom-1 end-1 flex items-center
                    justify-center w-5 h-5 rounded-md bg-ink/60 text-paper"
                >
                  <Maximize2 size={11} />
                </span>
              </button>
            ) : (
              <EntityThumbnail
                kind={entity.preview}
                entityId={entity.id}
                image={entity.image}
                fit={thumbFit}
                frame={thumbFrame}
                peek={thumbFrame === "landscape"}
                lift={peekDoc && thumbSize === "s"}
                tint={getEntityType(entity.typeId)?.color}
                className={`h-full w-full rounded border border-border/60 ${peekDoc ? "" : "overflow-hidden"}`}
              />
            )
          ) : (
            <QuietMark
              tint={getEntityType(entity.typeId)?.color}
              className="h-full w-full rounded border border-border/60"
            />
          )}
        </span>
      )}
      {/* Up to two lines; the subgrid track aligns titles across a row. Without
          subgrid support, `not-supports-…` reserves the second line instead. */}
      <span
        data-part="title"
        /* `self-start`: a stretched box taller than two lines makes `line-clamp`
           show a third line cut mid-glyph. */
        className={`relative min-w-0 ${textCol} self-start text-sm font-semibold text-ink leading-snug line-clamp-2
          not-supports-[grid-template-rows:subgrid]:min-h-[2.375rem]`}
      >
        <span
          className={sortMark(sort === "title")}
          title={sort === "title" ? sortedNote : undefined}
        >
          <HighlightedText text={entity.title} query={query} />
        </span>
      </span>

      {/* `metadataTrack` is one answer for the whole result set, so every card
          claims the same tracks. A per-card `fields.length > 0` would break the
          shared subgrid. It drops the gap when no card has any property. */}
      {showMetadata && metadataTrack && (
        /* Labels use `MetadataCard`'s field-label style (uppercase, tracked,
           muted) so values are what the eye scans; `space-y-2` separates pairs
           while label and value stay tight. */
        /* A `dl` with one `dt`/`dd` per property; the per-pair `div` is valid
           inside a `dl` and keeps label and value together. */
        <dl
          data-part="metadata"
          // `@container/fields`: a chip row drops chips as the card narrows
          // (CardValue), measured against this box, not the viewport.
          className={`@container/fields relative min-w-0 ${textCol} ${
            side ? "self-start grid grid-cols-[fit-content(42%)_minmax(0,1fr)] gap-x-2 gap-y-1" : "space-y-2"
          }`}
        >
          {fields.map((f) => (
            /* Side: label and value columns, one line each. The label takes its
               natural width up to 42% (`fit-content`) so values keep at least
               58%. `contents` puts both straight into the grid. */
            <div key={f.id} className={side ? "contents" : "min-w-0"}>
              <dt
                className={`text-meta font-semibold uppercase text-ink-tertiary leading-tight ${
                  // Side: tighter tracking to fit a ~270px text column.
                  // Stacked: two lines at most, since some labels are full
                  // sentences and would push the grid row down.
                  side ? "block min-w-0 truncate self-baseline leading-snug tracking-wide" : "line-clamp-2 tracking-wider"
                }`}
                title={f.label}
              >
                {f.label}
              </dt>
              {/* One line per field. `+N more` is a shrink-0 sibling so the
                  ellipsis never cuts it off. Don't combine `block` with
                  `line-clamp-1`: `block` overrides the clamp's `display`. */}
              <dd
                className={`flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug ${side ? "self-baseline" : ""} ${sortMark(f.id === sortedId)}`}
                title={f.id === sortedId ? sortedNote : undefined}
              >
                {inspectable(f) && onFocusProperty ? (
                  /* Inspectable kinds only (see `INSPECTABLE`): a nested button
                     above the primary action that stops propagation. */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusProperty(entity.id, f.key!);
                    }}
                    aria-label={`Open ${f.label} on ${entity.title}`}
                    className="flex min-w-0 text-start rounded-sm cursor-pointer
                      underline decoration-transparent hover:decoration-current underline-offset-2
                      transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                  >
                    <CardValue field={f} query={query} compact={side} />
                  </button>
                ) : (
                  <CardValue field={f} query={query} compact={side} />
                )}
                {!!f.more && !ownsItsRemainder(f, side) && (
                  <span className="shrink-0 text-meta text-ink-tertiary">+{f.more} more</span>
                )}
              </dd>
            </div>
          ))}

          {/* Card images beyond the one the slot shows, listed by filename; a
              click opens the record at that image. Inside the metadata track so
              it adds no row and the grid stays level. */}
          {extraImages.length > 0 && onFocusProperty && (
            <div className={`min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${side ? "col-span-2" : ""}`}>
              <span className="block text-meta font-semibold uppercase tracking-wider text-ink-tertiary leading-tight w-full">
                {extraImages.length === 1 ? "1 more image" : `${extraImages.length} more images`}
              </span>
              {extraImages.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusProperty(entity.id, imageFocusKey(img));
                  }}
                  aria-label={`Open ${img.filename ?? "image"} on ${entity.title}`}
                  title={img.filename}
                  className="inline-flex items-center gap-1 min-w-0 max-w-full text-xs text-ink
                    underline decoration-transparent hover:decoration-current underline-offset-2
                    transition-colors cursor-pointer rounded-sm
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                >
                  <ImageIcon size={11} className="shrink-0 text-ink-muted" aria-hidden />
                  <span className="truncate">{img.filename ?? "Image"}</span>
                </button>
              ))}
            </div>
          )}
        </dl>
      )}

      {/* Its own row track aligns footers across a grid row; `self-end` keeps it
          at the bottom in the no-subgrid fallback. */}
      <div
        data-part="footer"
        className={`relative min-w-0 ${textCol} self-end flex items-center justify-between gap-2 pt-1`}
      >
        {/* `min-w-0` on this flex item too, or a long template name pushes the
            count and Open past the card's edge instead of truncating. */}
        <span
          className={`min-w-0 flex-1 ${sortMark(sort === "type")}`}
          title={sort === "type" ? sortedNote : undefined}
        >
          <EntityTypeTag typeId={entity.typeId} />
        </span>
        <div className="shrink-0 flex items-center gap-2">
          {/* Marks and the count sit on the always-mounted footer, so they
              never make a card taller.

              A media mark is a pointer-only shortcut to the recording in the
              record (`MediaFieldValue`). It stays `aria-hidden` with no role:
              a focusable-looking control that the keyboard cannot reach would
              be announced as operable. Keyboard users use Open or the card;
              the sr-only line below names the mark. */}
          {marks.length > 0 && (
            <span className="flex items-center gap-1 text-ink-muted" title={markTitle}>
              {marks.map((m) => {
                const Icon = MARK_ICON[m];
                const key = isMediaMark(m) ? entity.mediaKeys?.[m] : undefined;
                if (key && onFocusProperty) {
                  return (
                    <span
                      key={m}
                      aria-hidden
                      data-part="media-mark"
                      data-kind={m}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusProperty(entity.id, key);
                      }}
                      title={`${MARK_LABEL[m]} — open it in the record`}
                      className="flex items-center rounded-sm cursor-pointer hover:text-ink transition-colors"
                    >
                      <Icon size={11} />
                    </span>
                  );
                }
                return <Icon key={m} size={11} aria-hidden data-part="mark" data-kind={m} />;
              })}
              <span className="sr-only">{markTitle}</span>
            </span>
          )}
          {beyond > 0 && (
            <span
              className="text-meta text-ink-tertiary tabular-nums"
              title={`${beyond} more ${beyond === 1 ? "property" : "properties"} on the record`}
            >
              +{beyond}
            </span>
          )}
          {connectionBadge}
          {viewButton}
        </div>
      </div>
    </Root>
  );
});
