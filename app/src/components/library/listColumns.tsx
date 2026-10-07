import type { MouseEvent, ReactNode } from "react";
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

/** Track widths by what a column holds. Fixed tracks, so a column never
 *  squeezes; the Title takes the slack above its minimum. When the tracks need
 *  more than the pane, the table scrolls sideways in the Library's lane. */
export const LIST_TRACK = {
  title: "minmax(16rem, 1fr)",
  count: "9rem",
  date: "7.5rem",
  dateRange: "12rem",
  number: "6rem",
  id: "8rem",
  short: "10rem",
  long: "14rem",
} as const;

const META_TRACK: Record<string, string> = {
  date: LIST_TRACK.date,
  daterange: LIST_TRACK.dateRange,
  numeric: LIST_TRACK.number,
  generatedid: LIST_TRACK.id,
  select: LIST_TRACK.short,
  relationship: LIST_TRACK.short,
  text: LIST_TRACK.long,
  link: LIST_TRACK.long,
  geolocation: LIST_TRACK.long,
};

/** A cut value names itself on hover: the native tooltip, set only when the
 *  text is truncated, so a value that fits shows none. */
export function fullOnHover(text: string) {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      if (el.scrollWidth > el.clientWidth) el.title = text;
      else el.removeAttribute("title");
    },
  };
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
 *  The template swatch is the row's first element in every collection: the
 *  square that opens to the tinted name on hover. `type` (the Template NAME as
 *  its own column) is off by default everywhere and only adds the written
 *  name; it never takes the swatch away. A bare chip column never worked (a
 *  "TYPE" header needs more room than the 1.5rem chip), which is why the name
 *  column exists at all. */
export const LIST_COLUMNS: ListColumnSpec[] = [
  {
    id: "title",
    label: "Title",
    default: true,
    width: LIST_TRACK.title,
    sortKey: "title",
    cell: (e, ctx) => (
      <span data-part="title-cell" className="flex items-center gap-2 min-w-0">
        <EntityTypeTag variant="swatch" typeId={e.typeId} />
        <span data-part="title" className="font-medium text-ink truncate" {...fullOnHover(e.title)}>
          <HighlightedText text={e.title} query={ctx.query} fieldKey="title" />
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
      <span data-part="country" className="text-ink-secondary truncate" {...fullOnHover(e.country ?? "")}>
        {e.country ? <HighlightedText text={e.country} query={ctx.query} fieldKey="country" /> : "—"}
      </span>
    ),
  },
  {
    id: "date",
    label: "Date",
    default: true,
    width: LIST_TRACK.date,
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
    width: LIST_TRACK.count,
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
    <span data-part={id} className="text-ink-secondary truncate" {...fullOnHover(value ?? "")}>
      {value ? <HighlightedText text={value} query={query} fieldKey={id} /> : "—"}
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
    // The Template name column stays off, as everywhere; the swatch names the
    // template on hover. Wider when it is turned on: Nepal's names are longer.
    type: { width: "8.5rem" },
    country: { offered: false },
    date: { width: LIST_TRACK.date },
  },
};

/** The id a metadata column takes: the collection and the property's name.
 *  Prefixed so a property called "date" can never collide with the built-in
 *  track, and per collection so a choice in one corpus does not turn on a
 *  same-named property in another. A label renamed in Settings keeps the id,
 *  so a saved column choice survives. */
export const metaColumnId = (name: string, source: DataSource) => `meta:${source}:${name}`;
/** The id before choices were kept per collection (snapshots from then). */
export const legacyMetaColumnId = (id: string) => {
  const m = /^meta:[^:]+:(.*)$/.exec(id);
  return m ? `meta:${m[1]}` : null;
};

/** One of the corpus's own properties as a column.
 *
 *  Off by default, always: the table's shape today has no metadata tracks, and a
 *  corpus that carries a dozen properties would otherwise open as a spreadsheet
 *  nobody asked for. Values are addressed by LABEL — see `entityFieldValue` for
 *  why that is the only key the corpora share. */
export function metaColumn(col: PropertyColumn, source: DataSource): ListColumnSpec {
  return {
    id: metaColumnId(col.name, source),
    label: col.label,
    default: false,
    width: META_TRACK[col.type ?? ""] ?? LIST_TRACK.short,
    align: col.type === "numeric" ? "right" : undefined,
    cell: (e, ctx) => {
      const field = entityPropertyValue(e, col.name, ctx.language);
      if (!field) return <span data-part="meta" data-empty className="text-ink-tertiary">—</span>;
      return (
        <span data-part="meta" className="flex items-baseline gap-1 min-w-0 text-ink-secondary">
          <span className="truncate" {...fullOnHover(field.more ? `${field.value} (+${field.more})` : field.value)}>
            <HighlightedText text={field.value} query={ctx.query} fieldKey={col.name} />
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
    ...ctx.fieldColumns.map((col) => metaColumn(col, ctx.source)),
  ];
}

/** The same list as the Display menu's toggles. One derivation, so a column can
 *  never be drawable-but-unlistable (or the reverse). The built-ins come first;
 *  then each template's own properties under the template's name, in template
 *  order. A property several templates share is ONE column listed under each
 *  of them, so ticking it in one place ticks it everywhere. */
export function listColumnOptions(ctx: {
  hasQuery: boolean;
  fieldColumns: PropertyColumn[];
  source: DataSource;
}): ToggleOption[] {
  const specs = listColumnSpecs(ctx);
  const builtIns = specs.slice(0, specs.length - ctx.fieldColumns.length);
  const order: string[] = [];
  for (const col of ctx.fieldColumns) for (const t of col.templates) if (!order.includes(t)) order.push(t);
  return [
    ...builtIns.map((c) => ({ id: c.id, label: c.label, default: c.default })),
    ...order.flatMap((template) =>
      ctx.fieldColumns
        .filter((col) => col.templates.includes(template))
        .map((col) => ({ id: metaColumnId(col.name, ctx.source), label: col.label, default: false, group: template })),
    ),
  ];
}

/** The specs the user has left on, turned into `DataTable` columns. */
export function buildListColumns(
  specs: ListColumnSpec[],
  isOn: (id: string) => boolean,
  cellCtx: ListCellContext,
): Column<Entity>[] {
  return specs
    .filter((c) => isOn(c.id))
    .map((c) => ({
      id: c.id,
      header: c.header ?? c.label,
      width: c.width,
      align: c.align,
      sortKey: c.sortKey,
      cell: (e: Entity) => c.cell(e, cellCtx),
    }));
}
