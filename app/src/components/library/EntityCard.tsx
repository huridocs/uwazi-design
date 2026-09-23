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

/** The preview slot at each Display-menu size AND frame.
 *
 *  **Landscape** is a band: full card width, fixed height per size, so its
 *  ratio is whatever the column happens to be (~3:1 at three columns).
 *  **Portrait** is the card's full width at 3:4 — the SLOT is portrait-shaped,
 *  not a portrait picture centred in a wide band (that read as landscape, twice).
 *  What keeps it from becoming a poster is the GRID, not the slot: LibraryView
 *  re-hangs portrait cards in narrower columns, and Size steps the column count
 *  there instead of a height table here. A gallery wall gets taller pictures by
 *  hanging more of them, smaller.
 *
 *  Both are DEFINITE boxes before an image loads — fixed height, or aspect
 *  resolved against the column width — which is the no-shift contract. */
/*  RE-BASED: what was Large is the base. The band ran 64 / 96 / 144px and only
    the top of that ramp shows a document as a document — at 96 a judgment's
    first page is a grey smudge with a PDF tag on it. So `m` is 144 and `l` is
    the step above it; the old 64 is gone rather than renamed, because a control
    whose first option nobody should pick has the wrong default.

    The floors move with the band, one for one (+3rem each), so the 1–3 metadata
    field spread they absorb is unchanged. */
/*  SMALL IS BACK (2026-09-23), for the side layout first: a 60px preview
    (3.75rem) makes a short card with a wide text side. Cut once (c8e52fbc)
    because a 96px band made a first page a smudge; at 60 it is smaller still,
    and deliberately — Small is the choice for a reader who wants the text, and
    the page is an identifier there, not a preview to read. Medium stays the
    default. The floor keeps the same offset from the band as the other two. */
const COVER_H: Record<ThumbSize, string> = { s: "h-[3.75rem]", m: "h-36", l: "h-48" };
const CARD_FLOOR: Record<ThumbSize, string> = {
  s: "min-h-[13.25rem]",
  m: "min-h-[18.5rem]",
  l: "min-h-[21.5rem]",
};
/** The list row's chip is square at every frame — see EntityThumbnail. It does
 *  NOT follow the band: a row is two lines of text tall, so the chip is sized
 *  against the row and the old m/l pair is the whole useful range there. */
const CHIP_BOX: Record<ThumbSize, string> = { s: "w-7 h-7", m: "w-9 h-9", l: "w-12 h-12" };

/** The SIDE layout's slot: a fixed WIDTH per size, and the frame's ratio
 *  against it — 4:3 for landscape, 3:4 for portrait. Width plus aspect is a
 *  definite box before any image loads, the same no-shift contract as the
 *  stacked slot. The slot spans the card's rows at the logical start, so its
 *  height is also the card's floor: no `CARD_FLOOR` here, and a one-field card
 *  is as tall as its neighbours because the subgrid shares the rows. */
const SIDE_W: Record<ThumbSize, string> = { s: "", m: "w-40", l: "w-52" };
/** How many properties a SIDE card shows, whatever the Display menu's count:
 *  three lines of the label/value grid. The side card's height is meant to
 *  sit near its slot's (the metadata-off look), not to stack a record beside a
 *  small picture; the rest is counted in the footer (`+N`) and one click away
 *  in the drawer. */
const SIDE_FIELD_CAP = 3;
const SIDE_SHAPE: Record<ThumbFrame, string> = { landscape: "aspect-[4/3]", portrait: "aspect-[3/4]" };
/** Small is defined by its HEIGHT (60px, 3.75rem) at the frame's ratio, with
 *  both sides written out so the box is definite before any image loads:
 *  4:3 → 5rem wide, 3:4 → 2.8125rem wide. The side card at Small is then as
 *  tall as its text (title and up to three fields), not its slot. */
const SIDE_SMALL: Record<ThumbFrame, string> = {
  landscape: "h-[3.75rem] w-[5rem]",
  portrait: "h-[3.75rem] w-[2.8125rem]",
};

/** What the sort key is READING on this card, so the card can mark it.
 *
 *  The sort answers "why is this row where it is", and the answer was only ever
 *  in the toolbar — a Library sorted by Country gave no sign, on any card, of
 *  which value put it there. Shading the value the sort read is the per-card
 *  half of that, the way `MatchOrigin` is the per-card half of "why is this row
 *  here" for search.
 *
 *  `country` is matched by VALUE, not by label: the property is "País" in this
 *  corpus and "Country" in another, and the entity already carries the hoisted
 *  value the sort itself compares. Matching the label would work in one language
 *  and break in the next, the same trap the field keys avoid. `recent` marks
 *  nothing — a card carries no added-on date, and inventing one to have
 *  something to shade would be worse than the silence. */
function sortedFieldId(
  sort: LibrarySort,
  entity: Entity,
  fields: EntityScalarField[],
): string | null {
  if (sort !== "country" || !entity.country) return null;
  return fields.find((f) => f.value === entity.country)?.id ?? null;
}

/** The footer glyph for a kind that cannot be a card line, and what it is
 *  called for anyone not reading glyphs.
 *
 *  Media is split by what the VALUE is (the adapter reads it): the clapperboard
 *  means video and only video, a waveform means audio, and a recording whose
 *  address names neither gets a neutral play mark rather than a guessed film. */
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

/** The kinds whose value is a THING you would open rather than a sentence you
 *  have already read: a place, a connected entity, a table, a file.
 *
 *  This is the whole restraint in Part B of the proposal, and it is about tab
 *  stops. Every trigger is one, times every card on screen; making all three
 *  rows clickable turns a five-stop grid row into a fifteen-stop one, which is
 *  a worse library to move through than the one that has no triggers at all. */
const INSPECTABLE = new Set<PropertyKind>(["place", "relationship", "table", "media", "files"]);

/** A field is a trigger only when it is an inspectable kind AND carries the
 *  template key the record is keyed on. No key, no honest target. */
function inspectable(f: EntityScalarField): boolean {
  return !!f.key && !!f.kind && INSPECTABLE.has(f.kind);
}

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
 *  title → metadata field label/value pairs → footer (template pill · Open).
 *  Clicking the surface opens the entity in the drawer; "Open" navigates in.
 *  Selected (previewed) = bg-parchment; no left-border accent. */
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
  /** The query to MARK — passed in, never read from `libraryQueryAtom` here.
   *  Subscribing to the raw atom made every mounted card re-render on every
   *  keystroke (~2,594 renders per query over a 120-card grid), which is exactly
   *  the work `LibraryView`'s `useDeferredValue` exists to defer: the cards were
   *  re-rendering for a query whose results hadn't been computed yet. The owner
   *  passes the DEFERRED query, so a card re-renders once per settled query. */
  query: string;
  selected: boolean;
  connections?: number;
  /** The card's own click — a preview, or (with Cmd/Ctrl or Shift held) a
   *  selection gesture: the event is passed up so the host can tell. */
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onView: (id: string) => void;
  /** Carry the (visually hidden) selection checkbox — `EntitySelectBox`. Hosts
   *  that don't offer bulk actions (the template preview) leave it off. */
  selectable?: boolean;
  /** The selection drawer's "Remove from selection" — a hover / focus X at the
   *  row's end, in place of the checkbox the drawer used to show. Its slot is
   *  reserved on every row, so it appearing moves nothing. List layout only;
   *  `null` keeps the slot empty (a row already removed). */
  onRemove?: ((id: string) => void) | null;
  /** Extra classes on the card's own element (the selection drawer dims a
   *  row that was unticked). */
  className?: string;
  /** Open the entity in the drawer WITH one property focused — the record
   *  scrolls to it and flashes it. Optional: the layouts that don't offer a
   *  property trigger simply don't pass it. */
  onFocusProperty?: (id: string, fieldKey: string) => void;
  /** Show one image at its own size. The VIEW owns the lightbox, not the card:
   *  one overlay for a grid of 120 rather than 120 that each render nothing. */
  onOpenImage?: (image: EntityImage) => void;
  /** Whether the grid draws a metadata track AT ALL — one answer for every card
   *  on screen, computed by the view. See the track comment below. */
  metadataTrack?: boolean;
  /** The card's own element. A card is an `article` — a self-contained entity
   *  record — EXCEPT where it is one item of a list, and then it is the `li`
   *  itself rather than sitting inside one: in the grid the card IS the subgrid
   *  item, so a wrapper `li` would take the row tracks and the cards would stop
   *  sharing them. The three list hosts pass `li`; the template preview renders
   *  a lone inert card and keeps the default. */
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
      title={sort === "connections" ? `Sorted by Connections — ${connections}` : `${connections} connections`}
    >
      <Link2 size={11} className="text-ink-muted" />
      {connections.toLocaleString()}
    </span>
  );

  // Adapter-supplied real fields (e.g. CEJIL) win; otherwise derive from the mock
  // entityMetadata profile. Only fields that resolved to a value. Shared with
  // the list table's metadata columns, which ask the identical question.
  const scalarFields = entityScalarFields(entity, language);
  /* EVERY property the entity resolves, and no appended "Language" row — that
     one repeats the toolbar's own selector on every card.

     There is no ceiling. There was one, at five, and it was mine and it was
     wrong: I justified it with a thirteen-property Causa that does not exist.
     Once paragraphs, tables and media became footer marks the real spread across
     the corpus is 0-9 properties and Causa tops out at 7, so a ceiling of five
     was truncating 1,138 of 4,398 entities — 26% — to save at most four lines in
     the worst row. And level rows were never the ceiling's job: the subgrid sizes
     each track to the tallest card in the row and pins every footer to the same
     y, whatever the line counts are. Cards SHOULD carry different numbers of
     properties; that is the whole point of taking shape from a template.

     How many is the READER's choice, in the Display menu — "Metadata
     properties: None / First 3 / First 5 / All", defaulting to All. It replaced
     a Metadata on/off switch, which answered only "all or nothing" while the
     interesting number sat in this file as a constant nobody could see. */
  const menuLimit = cardFieldLimit(info.fields);
  const limit = side ? Math.min(menuLimit ?? Infinity, SIDE_FIELD_CAP) : menuLimit;
  const fields = limit === null ? scalarFields : scalarFields.slice(0, limit);
  /* What the choice left behind, so a card showing three of nine says so. At
     "All" it is always 0. At "None" it is suppressed rather than accurate: the
     reader has said they do not want properties on the card, and answering that
     with "+7" on every card is a count nobody asked for. */
  const beyond = limit === 0 ? 0 : scalarFields.length - fields.length;

  /* Kinds the entity holds that cannot be a line. Adapter-supplied; a corpus
     without one simply has none, which is the truth for the mock sample. */
  const marks = showMetadata ? (entity.marks ?? []) : [];
  /* A picture worth enlarging: a real asset behind an `image` preview. See the
     slot below for why documents, video, audio and the no-preview mark are all
     out. */
  const enlargeable =
    showPreview && layout === "cards" && entity.preview === "image" && !!entity.image && !!onOpenImage;
  /* Images past the first — the first IS the slot's picture. Only those with a
     property key, since a name with nothing to open is a dead link. */
  const extraImages =
    showMetadata && metadataTrack
      ? (entity.images ?? []).slice(1).filter((img) => !!img.fieldKey)
      : [];
  /* The mark rides whatever the sort is reading — a property row, the title, the
     template tag or the connection count. It is a shade on an element that is
     already there, so it costs no line and cannot move anything. */
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

  const base = `group relative text-start rounded-md border transition-colors cursor-pointer ${FOCUS_RING_ON_SELECT}`;
  // Previewed OR selected is bg-parchment — the same ground, one rule. The
  // selected case is CSS off the hidden checkbox itself, so a selection
  // change re-renders nothing but the box.
  const surface = `${selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60 hover:bg-parchment"}
    ${SELECTED_LOOK}`;
  const selectBox = selectable ? <EntitySelectBox id={entity.id} title={entity.title} /> : null;

  // The card container is NOT a button — it hosts nested controls (Open,
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
      data-part="primary-action"
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
                      onRemove(entity.id);
                    }}
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
  const minHeight =
    showPreview && showMetadata && metadataTrack && thumbFrame === "landscape" && !side
      ? CARD_FLOOR[thumbSize]
      : "";

  /** One track per row this card draws. Both toggles are global, so every card
   *  on screen agrees — see ROW_SPAN. */
  const rowCount = 2 + (showPreview && !side ? 1 : 0) + (showMetadata && metadataTrack ? 1 : 0);

  /** Slot class: landscape = the fixed band; portrait = the card's width at
   *  3:4. The picture fills the slot either way — Cover crops to fill it,
   *  auto/contain mat within it (ImageThumb's object-fit owns that call). */
  const slotShape = side
    ? `${thumbSize === "s" ? SIDE_SMALL[thumbFrame] : `${SIDE_W[thumbSize]} ${SIDE_SHAPE[thumbFrame]}`} row-span-full col-start-1 self-start`
    : `w-full ${thumbFrame === "portrait" ? "aspect-[3/4]" : COVER_H[thumbSize]}`;
  /** In the side layout every text row sits in the second column, beside the
   *  slot. Explicit rather than left to auto-placement, so the order of the
   *  children can never put a row under the slot. */
  const textCol = side ? "col-start-2" : "";

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
    // nested Open button would stop taking clicks. Positioned siblings at
    // `z-index: auto` paint in DOM order, and the rows come after.
    <Root
      data-component="EntityCard"
      data-layout="cards"
      data-card-layout={side ? "side" : "stacked"}
      onClick={(e) => onSelect(entity.id, e)}
      onMouseDown={holdTextSelection}
      className={`${base} ${surface} ${minHeight} grid grid-rows-subgrid ${ROW_SPAN[rowCount]} gap-y-2.5 p-3 ${
        side ? "grid-cols-[auto_minmax(0,1fr)] gap-x-3" : ""
      }`}
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
            enlargeable ? (
              /* The picture opens full size, WITHOUT becoming the card's main
                 gesture. Selecting the entity is still what clicking a card
                 does; this is a nested control on top of the stretched primary
                 action, the same shape the property triggers take, with its own
                 name and `stopPropagation` so a click never fires both.

                 Only a REAL ASSET. Not the no-preview mark, which is a mark.
                 Not the video or audio treatments, which are drawings of a kind
                 of file and enlarge into bigger drawings. And deliberately not
                 the document sheet: what the card holds there is a bitmap
                 rasterised at the card's own width, so "full size" would be that
                 same 352px raster blown up — softer than the card, and a lie
                 about what full size means. A document's full size is the
                 document, and `View` already goes there. */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // A selection gesture on the picture is a selection, never
                  // the lightbox: Cmd/Ctrl or Shift held, or a tap on touch
                  // while a selection is going (read at click time, so no
                  // card subscribes to the selection).
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
                /* `cursor-zoom-in!` because `index.css` sets `cursor: pointer`
                   on every enabled button, and this one is not a pointer thing
                   — the cursor is most of what says "this enlarges". */
                className="thumb-zoom-trigger relative block h-full w-full cursor-zoom-in! rounded
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              >
                <EntityThumbnail
                  kind={entity.preview}
                  entityId={entity.id}
                  image={entity.image}
                  fit={thumbFit}
                  frame={thumbFrame}
                  tint={getEntityType(entity.typeId)?.color}
                  className="h-full w-full rounded overflow-hidden border border-border/60"
                />
                {/* The only affordance a mouse gets besides the cursor, which
                    it cannot see until it is already there. One element, in one
                    corner, on hover or focus — the card already changes ground
                    on hover and does not need a second thing moving. */}
                {/* `.thumb-zoom` / `.thumb-zoom-trigger` are a plain pair in
                    index.css, not a Tailwind named-group variant — see the rule
                    there for why the variant loses a specificity tie. */}
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
                tint={getEntityType(entity.typeId)?.color}
                className="h-full w-full rounded overflow-hidden border border-border/60"
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
      <span
        data-part="title"
        /* `self-start`: the title's box is its own two clamped lines, never the
           TRACK's height. A track taller than two lines (the side slot spanning
           a title and a footer, a neighbour's longer title) stretched the box,
           and `line-clamp` then showed a third line cut mid-glyph under it. */
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

      {/* The track, not the card, decides. `metadataTrack` is computed ONCE
          over the whole result set by the view and handed to every card, so all
          of them claim the same subgrid tracks — a per-card `fields.length > 0`
          would let one template's cards claim three tracks and another's four,
          and the row would stop sharing them. What it fixes is a template that
          resolves nothing (Instrumento): the row was mounted regardless and
          drew a visible gap between title and footer. */}
      {showMetadata && metadataTrack && (
        /* READABILITY, not decoration. Seven label/value pairs at nearly equal
           weight, evenly spaced, read as one flat ladder with nothing to land
           on — which is what a card grew into once the ceiling came off.

           Two changes, and between them the values become the thing you scan.
           The LABEL takes the record's own field-label recipe (uppercase,
           tracked, muted, semibold at 11px — `MetadataCard`'s head, verbatim),
           so it reads as a caption rather than as a second value; it is
           smaller-looking than the sentence-case grey it replaces despite the
           same size, because small caps at this scale sit lower than lowercase
           with ascenders. And the pairs get AIR between them (`space-y-2`)
           while label and value stay locked together (`leading-tight`, no gap),
           so the eye chunks by pair instead of reading fourteen equal lines.

           It also makes the card and the record say a field name the same way,
           which they did not before. */
        /* A record's label/value pairs ARE a description list: `dl` with one
           `dt`/`dd` per property, so the pairing is in the markup and not only
           in the spacing. The `div` wrapper per pair is valid inside a `dl` and
           is what keeps label and value locked together. */
        <dl
          data-part="metadata"
          className={`relative min-w-0 ${textCol} ${
            side ? "self-start grid grid-cols-[fit-content(42%)_minmax(0,1fr)] gap-x-3 gap-y-1" : "space-y-2"
          }`}
        >
          {fields.map((f) => (
            /* Side: a label column and a value column, like the record, one
               line per field. The label column takes its natural width up to
               42% (`fit-content`), so a short label costs only itself and a long
               one ("Documentos de la CorteIDH") keeps the value at least 58% of
               the row; neither wraps, each ends in an ellipsis past its column.
               `contents` puts label and value straight into the grid. */
            <div key={f.id} className={side ? "contents" : "min-w-0"}>
              <dt
                className={`block text-meta font-semibold uppercase tracking-wider text-ink-tertiary leading-tight ${
                  side ? "min-w-0 truncate self-baseline leading-snug" : ""
                }`}
                title={side ? f.label : undefined}
              >
                {f.label}
              </dt>
              {/* Exactly ONE line per field, always. `truncate` rather than
                  `line-clamp-1` because the old `block line-clamp-1` pair fought
                  over `display` (block won) and the clamp silently never
                  applied — which is how three-line values reached the grid. The
                  "+N more" is a shrink-0 sibling, so it survives the ellipsis
                  instead of being cut off inside it. */}
              <dd
                className={`flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug ${side ? "self-baseline" : ""} ${sortMark(f.id === sortedId)}`}
                title={f.id === sortedId ? sortedNote : undefined}
              >
                {inspectable(f) && onFocusProperty ? (
                  /* A property whose value is a THING TO INSPECT gets a real
                     button, above the card's stretched primary action and
                     stopping propagation — the pattern every nested card
                     control uses. Deliberately not every property: each trigger
                     is a tab stop, and a plain sentence has already said
                     everything it has. */
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

          {/* THE IMAGES THE SLOT CANNOT DRAW.
              A template may select several image properties for the card, and a
              slot holds one. The rest were absent — not truncated, not counted.
              A filename is a poorer thing than a picture and an honest one, and
              it is a way IN: the click opens the record at the images.

              Inside the metadata track, so it costs no row of its own and the
              grid stays level. Only from the second image on; the first is the
              picture above. */}
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

      {/* The footer is its own row track, so it lands on one line across the
          whole grid row without `mt-auto` pushing it there — and `self-end`
          keeps it on the track's bottom edge in the fallback, where the track
          may be taller than the footer. */}
      <div
        data-part="footer"
        className={`relative min-w-0 ${textCol} self-end flex items-center justify-between gap-2 pt-1`}
      >
        {/* `min-w-0` on the wrapper, not just on the tag: the tag already says
            it may shrink (`min-w-0 max-w-full`, truncating label), but a flex
            ITEM only shrinks below its content when it is allowed to, and this
            wrapper sat at its natural width. A long template name — "Resolución
            de Presidencia de la CorteIDH" — then pushed the count and Open past
            the card's edge instead of truncating. */}
        <span
          className={`min-w-0 flex-1 ${sortMark(sort === "type")}`}
          title={sort === "type" ? sortedNote : undefined}
        >
          <EntityTypeTag typeId={entity.typeId} />
        </span>
        <div className="shrink-0 flex items-center gap-2">
          {/* Marks and the count ride a line that is ALREADY MOUNTED, which is
              the whole reason they are here: neither can make a card taller,
              and a card that gains a paragraph does not shove its neighbours.

              A MEDIA mark (video / audio / neutral) is also a POINTER shortcut:
              the record renders the recording and its chapters
              (`MediaFieldValue`), so a click lands on that property, like a
              property trigger. Pointer only, and deliberately NOT a control to
              assistive tech: no button, no role, no name — the glyph stays
              `aria-hidden` and the sr-only line below still says "Has video".
              It was a `<button tabIndex={-1}>` named "Open the recording…",
              which a screen reader announced as a button no keyboard could
              reach. Nothing may be announced as operable unless it can be
              operated. Keyboard readers open the record through Open or the
              card itself. Paragraph and table marks stay plain signals. */}
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
