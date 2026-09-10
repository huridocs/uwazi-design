import { Fragment, memo } from "react";
import { Clapperboard, Image as ImageIcon, Link2, Pilcrow, Table2 } from "lucide-react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { HighlightedText } from "../shared/HighlightedText";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { EntityThumbnail, QuietMark } from "./EntityThumbnail";
import { CardValue, ownsItsRemainder } from "./CardValue";
import { LIBRARY_SORTS } from "../../data/libraryDisplay";
import { getEntityType } from "../../data/entities";
import { entityScalarFields, type EntityScalarField } from "../../utils/entityFields";
import type { PropertyKind } from "../../utils/propertyKind";
import type { Entity } from "../../data/entities";
import {
  libraryCardInfoAtom,
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
const COVER_H: Record<ThumbSize, string> = { m: "h-36", l: "h-48" };
const CARD_FLOOR: Record<ThumbSize, string> = {
  m: "min-h-[18.5rem]",
  l: "min-h-[21.5rem]",
};
/** The list row's chip is square at every frame — see EntityThumbnail. It does
 *  NOT follow the band: a row is two lines of text tall, so the chip is sized
 *  against the row and the old m/l pair is the whole useful range there. */
const CHIP_BOX: Record<ThumbSize, string> = { m: "w-9 h-9", l: "w-12 h-12" };

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
 *  called for anyone not reading glyphs. */
const MARK_ICON: Partial<Record<PropertyKind, typeof Pilcrow>> = {
  long: Pilcrow,
  table: Table2,
  media: Clapperboard,
};
const MARK_LABEL: Partial<Record<PropertyKind, string>> = {
  long: "Has a written summary",
  table: "Has a table",
  media: "Has media",
};

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
  onFocusProperty,
  metadataTrack = true,
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
  onSelect: (id: string) => void;
  onView: (id: string) => void;
  /** Open the entity in the drawer WITH one property focused — the record
   *  scrolls to it and flashes it. Optional: the layouts that don't offer a
   *  property trigger simply don't pass it. */
  onFocusProperty?: (id: string, fieldKey: string) => void;
  /** Whether the grid draws a metadata track AT ALL — one answer for every card
   *  on screen, computed by the view. See the track comment below. */
  metadataTrack?: boolean;
}) {
  const language = useAtomValue(languageAtom);
  const sort = useAtomValue(librarySortAtom);
  const info = useAtomValue(libraryCardInfoAtom);
  const thumbSize = useAtomValue(libraryThumbSizeAtom);
  const thumbFit = useAtomValue(libraryThumbFitAtom);
  const thumbFrame = useAtomValue(libraryThumbFrameAtom);
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
  const limit = cardFieldLimit(info.fields);
  const fields = limit === null ? scalarFields : scalarFields.slice(0, limit);
  /* What the choice left behind, so a card showing three of nine says so. At
     "All" it is always 0. At "None" it is suppressed rather than accurate: the
     reader has said they do not want properties on the card, and answering that
     with "+7" on every card is a count nobody asked for. */
  const beyond = limit === 0 ? 0 : scalarFields.length - fields.length;

  /* Kinds the entity holds that cannot be a line. Adapter-supplied; a corpus
     without one simply has none, which is the truth for the mock sample. */
  const marks = showMetadata ? (entity.marks ?? []) : [];
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
      View
    </button>
  );

  const base =
    "group relative text-start rounded-md border transition-colors cursor-pointer";
  const surface = selected ? "bg-parchment border-border" : "bg-paper border-border/60 hover:bg-parchment";

  // The card container is NOT a button — it hosts nested controls (View,
  // connection badge), so a stretched invisible primary-action button carries
  // the keyboard/AT path instead, and the content sits above it. Clicks on
  // content bubble to the container's plain onClick (mouse path unchanged).
  const primaryAction = (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Select ${entity.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id);
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
      <div onClick={() => onSelect(entity.id)} className={`${base} ${surface} w-full`}>
        {primaryAction}
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
          </div>
        </div>
      </div>
    );
  }

  // A floor, not a fixed height — but only where heights actually vary: with
  // metadata ON, entities carry 1–3 display fields and a one-field card would
  // sit short of a three-field neighbour. With metadata OFF the card is
  // slot + title + footer, already equal everywhere, and in PORTRAIT the aspect
  // slot plus the grid row's own stretch keeps neighbours level — a rem floor
  // sized for one column width is wrong at every other.
  const minHeight =
    showPreview && showMetadata && metadataTrack && thumbFrame === "landscape"
      ? CARD_FLOOR[thumbSize]
      : "";

  /** One track per row this card draws. Both toggles are global, so every card
   *  on screen agrees — see ROW_SPAN. */
  const rowCount = 2 + (showPreview ? 1 : 0) + (showMetadata && metadataTrack ? 1 : 0);

  /** Slot class: landscape = the fixed band; portrait = the card's width at
   *  3:4. The picture fills the slot either way — Cover crops to fill it,
   *  auto/contain mat within it (ImageThumb's object-fit owns that call). */
  const slotShape = thumbFrame === "portrait" ? "aspect-[3/4]" : COVER_H[thumbSize];

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
    <div
      onClick={() => onSelect(entity.id)}
      className={`${base} ${surface} ${minHeight} grid grid-rows-subgrid ${ROW_SPAN[rowCount]} gap-y-2.5 p-3`}
    >
      {primaryAction}
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
        <span className={`relative min-w-0 shrink-0 w-full ${slotShape}`}>
          {entity.preview ? (
            <EntityThumbnail
              kind={entity.preview}
              entityId={entity.id}
              image={entity.image}
              fit={thumbFit}
              frame={thumbFrame}
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
      <span
        className="relative min-w-0 text-sm font-semibold text-ink leading-snug line-clamp-2
          not-supports-[grid-template-rows:subgrid]:min-h-[2.375rem]"
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
        <div className="relative min-w-0 space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="min-w-0">
              <span className="block text-meta font-semibold uppercase tracking-wider text-ink-tertiary leading-tight">
                {f.label}
              </span>
              {/* Exactly ONE line per field, always. `truncate` rather than
                  `line-clamp-1` because the old `block line-clamp-1` pair fought
                  over `display` (block won) and the clamp silently never
                  applied — which is how three-line values reached the grid. The
                  "+N more" is a shrink-0 sibling, so it survives the ellipsis
                  instead of being cut off inside it. */}
              <span
                className={`flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug ${sortMark(f.id === sortedId)}`}
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
                    <CardValue field={f} query={query} />
                  </button>
                ) : (
                  <CardValue field={f} query={query} />
                )}
                {!!f.more && !ownsItsRemainder(f) && (
                  <span className="shrink-0 text-meta text-ink-tertiary">+{f.more} more</span>
                )}
              </span>
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
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="block text-meta font-semibold uppercase tracking-wider text-ink-tertiary leading-tight w-full">
                {extraImages.length === 1 ? "1 more image" : `${extraImages.length} more images`}
              </span>
              {extraImages.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusProperty(entity.id, img.fieldKey!);
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
        </div>
      )}

      {/* The footer is its own row track, so it lands on one line across the
          whole grid row without `mt-auto` pushing it there — and `self-end`
          keeps it on the track's bottom edge in the fallback, where the track
          may be taller than the footer. */}
      <div className="relative min-w-0 self-end flex items-center justify-between gap-2 pt-1">
        <span className={sortMark(sort === "type")} title={sort === "type" ? sortedNote : undefined}>
          <EntityTypeTag typeId={entity.typeId} />
        </span>
        <div className="flex items-center gap-2">
          {/* Marks and the count ride a line that is ALREADY MOUNTED, which is
              the whole reason they are here: neither can make a card taller,
              and a card that gains a paragraph does not shove its neighbours.
              They are signals, not targets — the record has no field for a
              nested table or a media config yet, and a click that lands
              nowhere is worse than no click. */}
          {marks.length > 0 && (
            <span className="flex items-center gap-1 text-ink-muted" title={markTitle}>
              {marks.map((m) => {
                const Icon = MARK_ICON[m];
                return Icon ? <Icon key={m} size={11} aria-hidden /> : null;
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
    </div>
  );
});
