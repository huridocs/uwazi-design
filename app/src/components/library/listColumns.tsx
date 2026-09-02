import type { ReactNode } from "react";
import { HighlightedText } from "../shared/HighlightedText";
import { EntityTypeChip } from "../shared/EntityTypeChip";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { entityFieldValue } from "../../utils/entityFields";
import type { Entity } from "../../data/entities";
import type { Language } from "../../atoms/language";
import type { Column } from "../shared/DataTable";
import type { ToggleOption } from "../../data/libraryDisplay";

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
      <span className="flex items-center gap-2 min-w-0">
        <EntityTypeChip typeId={e.typeId} />
        <span className="font-medium text-ink truncate">
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
      <span className="text-ink-secondary truncate">
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
    cell: (e) => (
      <span className="text-ink-tertiary tabular-nums">
        {e.createdAt ? new Date(e.createdAt).getUTCFullYear() : "—"}
      </span>
    ),
  },
  {
    id: "connections",
    label: "Connections",
    default: true,
    width: "8rem",
    align: "right",
    sortKey: "connections",
    cell: (e, ctx) => (
      <span className="text-ink-secondary tabular-nums">
        {ctx.connectionsOf(e).toLocaleString()}
      </span>
    ),
  },
];

/** The id a metadata column takes. Prefixed so a property called "Date" can
 *  never collide with the built-in track of that name. */
export const metaColumnId = (label: string) => `meta:${label}`;

/** One of the corpus's own properties as a column.
 *
 *  Off by default, always: the table's shape today has no metadata tracks, and a
 *  corpus that carries a dozen properties would otherwise open as a spreadsheet
 *  nobody asked for. Values are addressed by LABEL — see `entityFieldValue` for
 *  why that is the only key the corpora share. */
export function metaColumn(label: string): ListColumnSpec {
  return {
    id: metaColumnId(label),
    label,
    default: false,
    width: "10rem",
    cell: (e, ctx) => {
      const field = entityFieldValue(e, label, ctx.language);
      if (!field) return <span className="text-ink-tertiary">—</span>;
      return (
        <span className="flex items-baseline gap-1 min-w-0 text-ink-secondary">
          <span className="truncate">
            <HighlightedText text={field.value} query={ctx.query} />
          </span>
          {field.more ? (
            <span className="shrink-0 text-meta text-ink-tertiary tabular-nums">
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
  fieldLabels: string[];
}): ListColumnSpec[] {
  return [
    ...LIST_COLUMNS.filter((c) => !c.requiresQuery || ctx.hasQuery),
    ...ctx.fieldLabels.map(metaColumn),
  ];
}

/** The same list as the Display menu's toggles. One derivation, so a column can
 *  never be drawable-but-unlistable (or the reverse). */
export function listColumnOptions(ctx: {
  hasQuery: boolean;
  fieldLabels: string[];
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
            <span className="font-medium text-ink truncate">
              <HighlightedText text={e.title} query={cellCtx.query} />
            </span>
          )
        : (e: Entity) => c.cell(e, cellCtx),
  }));
}
