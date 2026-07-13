import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { X, SlidersHorizontal } from "lucide-react";
import {
  libraryQueryAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDescriptorFiltersAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  libraryActiveFilterCountAtom,
  clearLibraryFiltersAtom,
  librarySelectedEntityIdAtom,
  librarySelectedClusterAtom,
} from "../../atoms/library";
import { dataSourceAtom } from "../../atoms/dataSource";
import { languageAtom } from "../../atoms/language";
import { getEntityType } from "../../data/entities";
import { libraryInheritedDefs } from "../../utils/libraryFacets";

interface Item {
  id: string;
  group: string;
  label: string;
  color?: string;
  remove: () => void;
}

/** The active-filter readout in the footer.
 *
 *  The Filters panel is the home of filters, but the drawer swaps it out for the
 *  entity preview — so while you're reading an entity there was NO way to see
 *  what was narrowing the results. This is that way: a popover listing every
 *  active filter, each removable on its own, without closing the entity you're
 *  looking at. "Open the Filters panel" is there when you want the full surface.
 *
 *  It sits in the footer, which is always mounted and whose height never changes,
 *  so none of this moves the results. */
export function ActiveFiltersButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const count = useAtomValue(libraryActiveFilterCountAtom);
  const clearAll = useSetAtom(clearLibraryFiltersAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);
  const setSelectedCluster = useSetAtom(librarySelectedClusterAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const language = useAtomValue(languageAtom);

  const [query, setQuery] = useAtom(libraryQueryAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const drop = <T,>(set: (fn: (s: T) => T) => void, key: string) => () =>
      set((s: T) => {
        const next = { ...(s as object) } as Record<string, unknown>;
        delete next[key];
        return next as T;
      });

    if (query.trim())
      out.push({
        id: "q",
        group: "Search",
        label: `“${query.trim()}”`,
        remove: () => setQuery(""),
      });

    for (const [id, on] of Object.entries(typeFilters))
      if (on)
        out.push({
          id: `type-${id}`,
          group: "Type",
          label: getEntityType(id)?.name ?? id,
          color: getEntityType(id)?.color,
          remove: drop(setTypeFilters, id),
        });

    if (hasDocOnly)
      out.push({
        id: "doc",
        group: "Document",
        label: "Has a document",
        remove: () => setHasDocOnly(false),
      });

    for (const [id, on] of Object.entries(statusFilters))
      if (on)
        out.push({
          id: `status-${id}`,
          group: "Status",
          label: id === "published" ? "Published" : "Restricted",
          remove: drop(setStatusFilters, id),
        });

    for (const [c, on] of Object.entries(countryFilters))
      if (on)
        out.push({
          id: `country-${c}`,
          group: "Country",
          label: c,
          remove: drop(setCountryFilters, c),
        });

    for (const [d, on] of Object.entries(descriptorFilters))
      if (on)
        out.push({
          id: `desc-${d}`,
          group: "Descriptor",
          label: d,
          remove: drop(setDescriptorFilters, d),
        });

    if (dateFrom || dateTo)
      out.push({
        id: "date",
        group: "Date",
        label: `${dateFrom || "…"} → ${dateTo || "…"}`,
        remove: () => {
          setDateFrom("");
          setDateTo("");
        },
      });

    const defs = libraryInheritedDefs(dataSource, language);
    for (const [propId, vals] of Object.entries(inheritedFilters))
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `inh-${propId}-${v}`,
            group: defs.find((d) => d.propId === propId)?.label ?? propId,
            label: v,
            remove: () =>
              setInheritedFilters((s) => {
                const next = { ...(s[propId] ?? {}) };
                delete next[v];
                return { ...s, [propId]: next };
              }),
          });

    for (const [key, vals] of Object.entries(chainFilters))
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `chain-${key}-${v}`,
            group: "Connected",
            label: v,
            remove: () =>
              setChainFilters((s) => {
                const next = { ...(s[key] ?? {}) };
                delete next[v];
                return { ...s, [key]: next };
              }),
          });

    return out;
  }, [
    query,
    typeFilters,
    hasDocOnly,
    statusFilters,
    countryFilters,
    descriptorFilters,
    dateFrom,
    dateTo,
    inheritedFilters,
    chainFilters,
    dataSource,
    language,
    setQuery,
    setTypeFilters,
    setHasDocOnly,
    setStatusFilters,
    setCountryFilters,
    setDescriptorFilters,
    setDateFrom,
    setDateTo,
    setInheritedFilters,
    setChainFilters,
  ]);

  if (count === 0) return null;

  return (
    // `flex`, not a bare block: as a block, the inline-flex button below sits in
    // a LINE BOX and gets baseline-aligned, leaving room for descenders under it.
    // The wrapper measured 25px tall around a 20px button, so the button rode
    // 2.5px low and the count fell out of line with "Showing N of M" beside it.
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 px-1.5 h-5 text-[11px] font-medium rounded-md
          transition-colors cursor-pointer ${
            open ? "bg-warm text-ink" : "text-ink-secondary hover:bg-warm hover:text-ink"
          }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--accent-blue)" }}
        />
        {count} {count === 1 ? "filter" : "filters"}
      </button>

      {open && (
        // Opens UPWARD — the button lives in the footer.
        <div
          role="dialog"
          aria-label="Active filters"
          className="absolute bottom-full mb-1.5 start-0 z-50 w-72 bg-paper border border-border rounded-md shadow-lg
            animate-fade-in-up overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
              Active filters
            </span>
            <button
              onClick={() => {
                clearAll();
                setOpen(false);
              }}
              className="ms-auto px-1.5 h-5 text-[11px] font-medium rounded text-ink-tertiary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <ul className="max-h-64 overflow-auto py-1">
            {items.map((it) => (
              <li key={it.id}>
                {/* Full-width row: removing a filter here can't shift the NEXT
                    row under the cursor sideways, the way a wrapping chip row
                    did — the list only ever collapses downward. */}
                <div className="group flex items-center gap-2 px-3 py-1.5 hover:bg-warm transition-colors">
                  {it.color ? (
                    <span
                      className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: it.color }}
                    />
                  ) : (
                    <span className="w-1.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-ink-tertiary leading-tight">
                      {it.group}
                    </span>
                    <span className="block text-xs text-ink truncate">{it.label}</span>
                  </span>
                  {/* Always visible: this is a list OF things to remove, so
                      hiding the remove until hover would be hiding the point. */}
                  <button
                    onClick={it.remove}
                    aria-label={`Remove ${it.group}: ${it.label}`}
                    className="shrink-0 p-1 rounded text-ink-muted hover:bg-parchment hover:text-ink
                      transition-colors cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
                  >
                    <X size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              setSelectedId(null);
              setSelectedCluster(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-ink-secondary
              hover:bg-warm hover:text-ink transition-colors cursor-pointer"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <SlidersHorizontal size={12} className="text-ink-tertiary" />
            Open the Filters panel
          </button>
        </div>
      )}
    </div>
  );
}
