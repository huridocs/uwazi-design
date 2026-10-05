import type { ReactNode } from "react";
import { HighlightedText } from "../shared/HighlightedText";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { entityPropertyValue, type PropertyColumn } from "../../utils/entityFields";
import type { Entity } from "../../data/entities";
import type { Language } from "../../atoms/language";
import type { Column } from "../shared/DataTable";
import type { ToggleOption } from "../../data/libraryDisplay";
import type { DataSource } from "../../atoms/dataSource";
import { formatAtPrecision } from "../../utils/dateFormat";

/** Everything the list table can draw, once.
 *
 *  A column used to take three edits — a `Column` literal in `LibraryView`, a
 *  key on the shared five-key info record, and a line in the Display menu's
 *  `ITEMS` — which is why the table only ever offered the three the info record
 *  happened to have. Here a column is ONE entry: its id, its header, how wide
 *  its track is, whether it sorts, whether it starts on, and how it draws a
 *  cell. The menu reads this list for its toggles, the table reads it for its
 *  columns, and neither knows anything the other doesn't. */

/** What a cell needs that the entity itself doesn't carry. */
export interface ListCellContext {
  /** The DEFERRED query — marks are painted for a settled result set, never for
   *  a query whose results haven't been computed. */
  query: string;
  language: Language;
  connectionsOf: (e: Entity) => number;
  /** The Match cell, supplied by the view.
   *
   *  `MatchOrigin` reaches back into the Library atoms, and this module is read
   *  BY the atom layer (the Display menu's column toggles are this same list) —
   *  importing it here would close a cycle between the two layers. It also needs
   *  the view's select handler and its per-row "what does this row already
   *  mark?" set, both of which live there. So the view hands the cell in. */
  renderMatch: (e: Entity) => ReactNode;
}

export interface ListColumnSpec {
  id: string;
  label: string;
  /** Header text, when it differs from the toggle's label. */
  header?: ReactNode;
  default: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  sortKey?: string;
  /** Offered only while a query is running (Match has nothing to say without
   *  one). Gated on CONTEXT, so it comes and goes on the one transition — no
   *  query → query — that replaces every row anyway. */
  requiresQuery?: boolean;
  /** Offered only in these collections: a column that reads `listCells`. */
  only?: DataSource[];
  cell: (e: Entity, ctx: ListCellContext) => ReactNode;
}

/** The built-in columns, in the order the table draws them.
 *
 *  `type` is off by default and that is the whole reason it can exist. A bare
 *  chip column never worked: the chip is 1.5rem but a "TYPE" header needs room
 *  for its label and its sort arrow, so the track always ran ~2rem wider than
 *  its contents and the gap had to sit somewhere ugly. So OFF, the chip rides
 *  with the title exactly as it always has; ON, it moves into a real column that
 *  prints the template NAME — which fills the track the chip could not — and the
 *  title cell drops it rather than printing the type twice. */
export const LIST_COLUMNS: ListColumnSpec[] = [
  {
    id: "title",
    label: "Title",
    default: true,
    sortKey: "title",
    cell: (e, ctx) => (
      <span data-part="title-cell" className="flex items-center gap-2 min-w-0">
        <EntityTypeTag variant="swatch" typeId={e.typeId} />
        <span data-part="title" className="font-medium text-ink truncate">
          <HighlightedText text={e.title} query={ctx.query} />
        </span>
      </span>
    ),
  },
  {
    id: "type",
    label: "Template",
    header: "Template",
    default: false,
    width: "9rem",
    sortKey: "type",
    cell: (e) => <EntityTypeTag typeId={e.typeId} />,
  },
  {
    // WHERE it matched, when the row can't show it. Title and Country are marked
    // in place — that mark IS the evidence. A hit in any other property, or in
    // the document body, leaves the row looking unmatched, which in a few
    // thousand results is the difference between a result list and a list.
    // 3.5rem of reserved track: contents come and go per row as the query is
    // refined, the track never moves.
    id: "match",
    label: "Match origin",
    header: "Match",
    default: true,
    width: "3.5rem",
    requiresQuery: true,
    cell: (e, ctx) => ctx.renderMatch(e),
  },
  {
    id: "country",
    label: "Country",
    default: true,
    width: "9rem",
    sortKey: "country",
    cell: (e, ctx) => (
      <span data-part="country" className="text-ink-secondary truncate">
        {e.country ? <HighlightedText text={e.country} query={ctx.query} /> : "—"}
      </span>
    ),
  },
  {
    id: "date",
    label: "Date",
    default: true,
    width: "5rem",
    sortKey: "recent",
    // The year, unless the corpus says how precisely the date is known; then
    // as precisely as that, in the collection's date format.
    cell: (e) => (
      <span data-part="date" className="text-ink-tertiary tabular-nums">
        {e.createdAt
          ? e.datePrecision
            ? formatAtPrecision(new Date(e.createdAt), e.datePrecision)
            : new Date(e.createdAt).getUTCFullYear()
          : "—"}
      </span>
    ),
  },
  {
    id: "verification",
    label: "Verification",
    default: true,
    width: "7rem",
    only: ["nepal"],
    cell: (e) => listCell(e, "verification"),
  },
  {
    id: "placeOrPublisher",
    label: "Location or publisher",
    header: "Location / Publisher",
    default: true,
    width: "10rem",
    only: ["nepal"],
    cell: (e, ctx) => listCell(e, "placeOrPublisher", ctx.query),
  },
  {
    id: "connections",
    label: "Relationships",
    default: true,
    width: "8rem",
    align: "right",
    sortKey: "connections",
    cell: (e, ctx) => (
      <span data-part="connections" className="text-ink-secondary tabular-nums">
        {ctx.connectionsOf(e).toLocaleString()}
      </span>
    ),
  },
];

function listCell(e: Entity, id: string, query = "") {
  const value = e.listCells?.[id];
  return (
    <span data-part={id} className="text-ink-secondary truncate">
      {value ? <HighlightedText text={value} query={query} /> : "—"}
    </span>
  );
}

/** A collection's own List defaults, over the built-ins': which columns start
 *  on or are not offered, and wider tracks where its values are longer. Nepal
 *  records carry no country, and their dates print to the day. */
const COLLECTION_COLUMNS: Partial<
  Record<DataSource, Record<string, { default?: boolean; width?: string; offered?: false }>>
> = {
  nepal: {
    type: { default: true, width: "8.5rem" },
    country: { offered: false },
    date: { width: "6rem" },
  },
};

/** The id a metadata column takes: the property's name. Prefixed so a
 *  property called "date" can never collide with the built-in track. A label
 *  renamed in Settings keeps the id, so a saved column choice survives. */
export const metaColumnId = (name: string) => `meta:${name}`;

/** One of the corpus's own properties as a column.
 *
 *  Off by default, always: the table's shape today has no metadata tracks, and a
 *  corpus that carries a dozen properties would otherwise open as a spreadsheet
 *  nobody asked for. Values are addressed by LABEL — see `entityFieldValue` for
 *  why that is the only key the corpora share. */
export function metaColumn(col: PropertyColumn): ListColumnSpec {
  return {
    id: metaColumnId(col.name),
    label: col.label,
    default: false,
    width: "10rem",
    cell: (e, ctx) => {
      const field = entityPropertyValue(e, col.name, ctx.language);
      if (!field) return <span data-part="meta" data-empty className="text-ink-tertiary">—</span>;
      return (
        <span data-part="meta" className="flex items-baseline gap-1 min-w-0 text-ink-secondary">
          <span className="truncate">
            <HighlightedText text={field.value} query={ctx.query} />
          </span>
          {field.more ? (
            <span data-part="more" className="shrink-0 text-meta text-ink-tertiary tabular-nums">
              +{field.more}
            </span>
          ) : null}
        </span>
      );
    },
  };
}

/** Every column on offer right now: the built-ins the context allows, then one
 *  per property the corpus carries. */
export function listColumnSpecs(ctx: {
  hasQuery: boolean;
  fieldColumns: PropertyColumn[];
  source: DataSource;
}): ListColumnSpec[] {
  const own = COLLECTION_COLUMNS[ctx.source] ?? {};
  return [
    ...LIST_COLUMNS.filter(
      (c) =>
        (!c.requiresQuery || ctx.hasQuery) &&
        (!c.only || c.only.includes(ctx.source)) &&
        own[c.id]?.offered !== false,
    ).map((c) => (own[c.id] ? { ...c, ...own[c.id] } : c)),
    ...ctx.fieldColumns.map(metaColumn),
  ];
}

/** The same list as the Display menu's toggles. One derivation, so a column can
 *  never be drawable-but-unlistable (or the reverse). */
export function listColumnOptions(ctx: {
  hasQuery: boolean;
  fieldColumns: PropertyColumn[];
  source: DataSource;
}): ToggleOption[] {
  return listColumnSpecs(ctx).map((c) => ({
    id: c.id,
    label: c.label,
    default: c.default,
  }));
}

/** The specs the user has left on, turned into `DataTable` columns.
 *
 *  `title` swallows the type chip unless the Template column is drawing it —
 *  see `LIST_COLUMNS`. */
export function buildListColumns(
  specs: ListColumnSpec[],
  isOn: (id: string) => boolean,
  cellCtx: ListCellContext,
): Column<Entity>[] {
  const on = specs.filter((c) => isOn(c.id));
  const typeColumn = on.some((c) => c.id === "type");
  return on.map((c) => ({
    id: c.id,
    header: c.header ?? c.label,
    width: c.width,
    align: c.align,
    sortKey: c.sortKey,
    cell:
      c.id === "title" && typeColumn
        ? (e: Entity) => (
            <span data-part="title" className="font-medium text-ink truncate">
              <HighlightedText text={e.title} query={cellCtx.query} />
            </span>
          )
        : (e: Entity) => c.cell(e, cellCtx),
  }));
}
