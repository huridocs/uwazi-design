import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { getEntityType } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";

/** One value of a list field: a relationship field's connected record, or a
 *  multiselect's label. */
export interface ChipValue {
  key: string;
  /** What the chip prints, and what the sort and the filter read. */
  text: string;
  /** The record's template, for a relationship value. */
  typeId?: string;
  /** Opens the record (the preview slide-over). Absent: the chip only names. */
  onOpen?: () => void;
  /** Drawn in place of `text` (a thesaurus value with its group). */
  render?: ReactNode;
}

/** Lines of chips shown before the list folds behind "Show all N". */
export const FOLD_LINES = 3;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Natural order: 131.1.1 < 131.2 < 131.47 < 131.181. */
export function sortNatural<T extends { text: string }>(values: T[]): T[] {
  return [...values].sort((a, b) => collator.compare(a.text, b.text));
}

/** The one template every value shares, or undefined when they mix (or are
 *  not records at all). */
export function sharedTemplate(values: ChipValue[]): string | undefined {
  const first = values[0]?.typeId;
  if (!first || values.some((v) => v.typeId !== first)) return undefined;
  return first;
}

/** The template's dot, drawn once beside the field label when every value
 *  shares it, so the type colour is not repeated on each chip. */
export function TemplateDot({ typeId }: { typeId: string }) {
  const type = getEntityType(typeId);
  return (
    <span
      data-part="template-dot"
      title={type?.name}
      aria-hidden
      className="w-1.5 h-1.5 rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20"
      style={{ backgroundColor: type?.color ?? "var(--text-tertiary)" }}
    />
  );
}

const CHIP =
  "inline-flex items-center min-w-0 max-w-full h-6 px-2 rounded-md border border-border-soft bg-paper text-xs font-medium text-ink";

/** A field's values as a wrapping list of chips, in natural order.
 *
 *  Every value of one template: quiet chips with no dot or tint (the host draws
 *  the template's dot by the label, `TemplateDot`). Mixed templates keep the
 *  entity pill, whose dot is what tells them apart.
 *
 *  Past `FOLD_LINES` lines the list folds to the chips that fit them and a
 *  "Show all N"; the lines are measured, not a count, so the fold is the same
 *  height in a narrow column and a wide one. Expanded, a filter field narrows
 *  the chips and "Show fewer" folds them again. Chips past the fold are not
 *  rendered, so Tab never reaches a hidden one. */
export function ValueChips({
  label,
  values,
  unit = "values",
  after,
}: {
  /** The field's label, for the list's accessible name. */
  label: string;
  values: ChipValue[];
  /** What a value is, in the accessible name ("29 records"). */
  unit?: string;
  /** Drawn after the last chip (a capped field's "+N more"). */
  after?: ReactNode;
}) {
  const sorted = useMemo(() => sortNatural(values), [values]);
  const quiet = !!sharedTemplate(values);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  // How many chips fit the folded lines; null while (re)measuring, when every
  // chip is laid out inside the clipped box so the measure sees real widths.
  const [fit, setFit] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new width or a new value set measures again.
  useLayoutEffect(() => setFit(null), [width, sorted]);

  useLayoutEffect(() => {
    if (fit !== null || expanded) return;
    const el = listRef.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    const tops: number[] = [];
    let n = 0;
    for (const it of items) {
      if (it.dataset.part !== "chip") continue;
      const t = it.offsetTop;
      if (!tops.includes(t)) tops.push(t);
      if (tops.length > FOLD_LINES) break;
      n++;
    }
    setFit(n);
  }, [fit, expanded, sorted]);

  // Expanded is only reachable from a fold, and stays one while a resize
  // re-measures.
  const folds = expanded || (fit !== null && fit < sorted.length);
  const q = query.trim().toLowerCase();
  const shown = expanded
    ? q
      ? sorted.filter((v) => v.text.toLowerCase().includes(q))
      : sorted
    : fit === null || !folds
      ? sorted
      : sorted.slice(0, fit);

  return (
    <div data-component="ValueChips" data-folded={folds && !expanded ? "" : undefined} className="flex flex-col gap-2 min-w-0">
      {expanded && (
        <div
          data-part="filter"
          className="flex items-center gap-1.5 h-7 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${sorted.length.toLocaleString()} ${unit}`}
            aria-label={`Filter ${label}`}
            className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-ink-muted focus:outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear filter" className="shrink-0 text-ink-muted hover:text-ink cursor-pointer">
              <X size={12} />
            </button>
          ) : (
            <Search size={12} aria-hidden className="text-ink-muted shrink-0" />
          )}
        </div>
      )}
      <ul
        ref={listRef}
        role="list"
        aria-label={`${label}, ${sorted.length.toLocaleString()} ${unit}`}
        className="flex flex-wrap items-center gap-1.5 min-w-0"
        // While measuring, the box is held to the folded lines, so the
        // re-measure never shows the whole list for a frame.
        style={fit === null && !expanded ? { maxHeight: `calc(${FOLD_LINES} * 1.5rem + ${FOLD_LINES - 1} * 0.375rem)`, overflow: "hidden" } : undefined}
      >
        {shown.map((v) => (
          <li key={v.key} data-part="chip" className="min-w-0 max-w-full flex">
            {v.onOpen ? (
              <button
                type="button"
                data-part="entity-open"
                onClick={v.onOpen}
                title="Preview source entity"
                className={
                  quiet
                    ? `${CHIP} hover:bg-warm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`
                    : "min-w-0 max-w-full rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                }
              >
                {quiet ? <span className="truncate">{v.render ?? v.text}</span> : <EntityPill typeId={v.typeId ?? ""} label={v.text} />}
              </button>
            ) : v.typeId && !quiet ? (
              <EntityPill typeId={v.typeId} label={v.text} />
            ) : (
              <span className={CHIP} title={v.text}>
                <span className="truncate">{v.render ?? v.text}</span>
              </span>
            )}
          </li>
        ))}
        {expanded && q && shown.length === 0 && (
          <li data-part="empty" className="h-6 flex items-center text-xs text-ink-tertiary">
            No matches.
          </li>
        )}
        {after && <li className="flex">{after}</li>}
      </ul>
      {folds && (
        <button
          type="button"
          data-part={expanded ? "show-fewer" : "show-all"}
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((e) => !e);
            setQuery("");
          }}
          className="self-start text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
        >
          {expanded ? "Show fewer" : `Show all ${sorted.length.toLocaleString()}`}
        </button>
      )}
    </div>
  );
}
