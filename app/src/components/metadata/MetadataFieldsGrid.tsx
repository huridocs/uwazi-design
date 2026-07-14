import { ExternalLink } from "lucide-react";
import type { MetadataField } from "../../data/metadata";
import { isLongField } from "./MetadataFieldsTable";

/** Scalar metadata as a GRID — but a connected one.
 *
 *  The old read view tiled a bordered card per field with heuristic column
 *  spans. It looked like a grid and read as debris: every card had its own
 *  border, its own width, its own edges, so nothing lined up with anything.
 *
 *  This is the same tiled shape with the borders taken away from the cells and
 *  given to the SPACE BETWEEN them: `gap-px` over a border-coloured surface, so
 *  the hairlines are shared. One card, one lattice, columns that actually align —
 *  and it stays aligned at every breakpoint, because the rules are gaps rather
 *  than per-cell borders that would need to know which row they're on.
 *
 *  Long-form fields (a paragraph) take the full row: a description doesn't
 *  belong in a third of a column. */
export function MetadataFieldsGrid({ fields }: { fields: MetadataField[] }) {
  const shown = fields.filter((f) => !!f.value?.trim());
  if (shown.length === 0) return null;

  return (
    // The rules are 1px RINGS on the cells, over a 1px gap — neighbours' rings
    // meet in the gap and read as one shared hairline, and the card's own border
    // clips the outer ones. (Colouring the container and letting it show through
    // `gap-px` is the usual trick, but it paints wherever a cell is ABSENT — so a
    // half-filled last row ends in a slab of border colour. Rings paint only
    // where there is something to rule off.)
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px">
      {shown.map((f) => (
        <div
          key={f.id}
          style={{ boxShadow: "0 0 0 1px var(--border-soft)" }}
          className={`bg-paper px-4 py-2.5 min-w-0 ${
            isLongField(f) ? "col-span-1 sm:col-span-2 xl:col-span-3" : ""
          }`}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {f.label}
          </span>
          {f.type === "country" ? (
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink">
              <span className="leading-none">{f.flag}</span>
              <span className="font-medium">{f.value}</span>
            </span>
          ) : f.type === "link" ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink">
              <span className="font-medium underline">{f.value}</span>
              <ExternalLink size={10} className="text-ink-muted shrink-0" />
            </span>
          ) : isLongField(f) ? (
            <p className="mt-0.5 text-sm text-ink leading-relaxed">{f.value}</p>
          ) : (
            <span className="mt-0.5 block text-sm font-medium text-ink leading-snug">
              {f.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
