import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { MetadataField } from "../../data/metadata";
import { isLongField } from "./MetadataFieldsTable";

export interface GridItem {
  id: string;
  label: string;
  content: ReactNode;
  /** Takes the whole row — a paragraph doesn't belong in a third of a column. */
  long?: boolean;
}

/** A scalar metadata field as a grid item. Connections come in as items too (see
 *  MetadataView) — a link-only connection is a property whose value happens to be
 *  an entity, and it reads better in the record than in a card of its own. */
export function fieldItem(f: MetadataField): GridItem {
  const long = isLongField(f);
  return {
    id: f.id,
    label: f.label,
    long,
    content:
      f.type === "country" ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-ink">
          <span className="leading-none">{f.flag}</span>
          <span className="font-medium">{f.value}</span>
        </span>
      ) : f.type === "link" ? (
        <span className="inline-flex items-center gap-1 text-sm text-ink">
          <span className="font-medium underline">{f.value}</span>
          <ExternalLink size={10} className="text-ink-muted shrink-0" />
        </span>
      ) : long ? (
        <p className="text-sm text-ink leading-relaxed">{f.value}</p>
      ) : (
        <span className="block text-sm font-medium text-ink leading-snug">{f.value}</span>
      ),
  };
}

/** Scalar metadata as a GRID — but a connected one.
 *
 *  The old read view tiled a bordered card per field with heuristic column spans.
 *  It looked like a grid and read as debris: every card had its own border, its
 *  own width, its own edges, so nothing lined up with anything.
 *
 *  Here the hairlines live in the GAPS between cells: 1px rings over a 1px gap,
 *  so neighbours' rings meet and read as one shared rule, and the card's border
 *  clips the outer ones. (Colouring the container and letting it show through
 *  `gap-px` is the usual trick, but it paints wherever a cell is ABSENT — a
 *  half-filled last row ends in a slab of border colour.)
 *
 *  Rows always FILL. The column count follows the item count (two fields get two
 *  half-width columns, not two thirds and a dead stub), and the last item widens
 *  to close its row. A lattice with a ragged edge just looks broken. */
export function MetadataFieldsGrid({ items }: { items: GridItem[] }) {
  if (items.length === 0) return null;

  // Long items each take a row of their own, so only the SHORT ones tile — and
  // the row-filling maths only has to reason about them.
  const longs = items.filter((i) => i.long);
  const shorts = items.filter((i) => !i.long);
  const n = shorts.length;

  const cols =
    n <= 1
      ? "grid-cols-1"
      : n === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  // The last short cell stretches over whatever its row has left over.
  const r2 = n % 2;
  const r3 = n % 3;
  const lastSpan = [
    n >= 2 && r2 === 1 ? "sm:col-span-2" : "",
    n >= 3 && r3 === 1 ? "xl:col-span-3" : n >= 3 && r3 === 2 ? "xl:col-span-2" : "",
  ].join(" ");

  const cell = (item: GridItem, cls = "") => (
    <div
      key={item.id}
      style={{ boxShadow: "0 0 0 1px var(--border-soft)" }}
      className={`bg-paper px-4 py-2.5 min-w-0 ${cls}`}
    >
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
        {item.label}
      </span>
      <div className="mt-0.5">{item.content}</div>
    </div>
  );

  return (
    <div className={`grid ${cols} gap-px`}>
      {longs.map((i) => cell(i, "col-span-full"))}
      {shorts.map((i, idx) => cell(i, idx === n - 1 ? lastSpan : ""))}
    </div>
  );
}
