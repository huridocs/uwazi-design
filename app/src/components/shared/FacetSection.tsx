import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Checkbox } from "./Checkbox";
import { MatchModeToggle } from "./MatchModeToggle";
import { SectionLabel } from "./SectionLabel";

export type FacetMode = "AND" | "OR";

interface FacetSectionProps {
  title: string;
  total: number;
  entries: [string, number][];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  label: (id: string) => string;
  renderMarker?: (id: string) => ReactNode;
  defaultExpanded?: boolean;
  /** ID treated as "no value for this facet" — pinned at the bottom with a
   *  divider above. Hidden if no entry matches. Mirrors Uwazi's "No label"
   *  bucket. */
  noLabelId?: string;
  /** Label shown for the pinned no-label row (default: "No label"). */
  noLabelText?: string;
  /** Show an inline search box once the facet has more than `searchThreshold`
   *  rows. For facets that get long at full-corpus scale (countries, descriptors). */
  searchable?: boolean;
  /** Row count above which the search box kicks in. Default 8. */
  searchThreshold?: number;
  /** Rows shown before a "Show all" toggle. Default 8 (Infinity = no cap). */
  collapsedCount?: number;
  /** When provided, a small AND/OR segmented control sits under the header —
   *  for multi-value facets where "match all" vs "match any" both make sense
   *  (e.g. descriptors). Omit for single-value facets (country, type). */
  mode?: FacetMode;
  onModeChange?: (mode: FacetMode) => void;
  /** Reset just this facet (clears its selections). Shown as a header "Clear"
   *  affordance whenever the facet has an active selection. */
  onClear?: () => void;
  /** For thesaurus-backed facets whose values nest one level: maps an entry id
   *  to its GROUP label (undefined = top-level). Entries sharing a group gather
   *  under a non-selectable group label, slightly indented; ungrouped entries
   *  keep their order ahead of the groups. */
  groupOf?: (id: string) => string | undefined;

  /* ── Opt-ins for a FORM list (the thesaurus picker) ── a facet and a
     property's value list are the same shape — search, rows, "N more" — so the
     picker is this component, not a copy of it. Every prop below defaults to
     the facet's behaviour. */
  /** No collapsible header and no pane rule: a list inside a form field, whose
   *  label is the field's own. Rows keep their fill inside the list's box
   *  instead of bleeding to the pane edge. */
  bare?: boolean;
  /** `radio` for a single-value property. The rows become one radio group. */
  control?: "checkbox" | "radio";
  /** Rows shown MIXED (indeterminate): some of the entities being edited hold
   *  the value and some don't. Reported as `aria-checked="mixed"`. */
  mixed?: Record<string, boolean>;
  /** What sits where the facet prints its count — the bulk form's coverage
   *  ("4 of 12"), or nothing. */
  renderCount?: (id: string, count: number) => ReactNode;
  /** The row's accessible name, when it says more than the label ("Amnistía,
   *  on 4 of 12"). */
  ariaLabelOf?: (id: string) => string;
  /** Tag drawn after a row's label (the picker's "New"). */
  renderBadge?: (id: string) => ReactNode;
  /** The search box's placeholder. Default "Search <title>". */
  searchPlaceholder?: string;
  /** Shown instead of the rows when there are none at all (not "no matches"). */
  emptyState?: ReactNode;
}

/** A native checkbox that can also be MIXED — `indeterminate` is a DOM
 *  property with no attribute, so it is set from an effect. */
function MixedCheckbox({
  checked,
  mixed,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  mixed: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      data-component="Checkbox"
      checked={checked}
      aria-checked={mixed ? "mixed" : checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="w-3.5 h-3.5 rounded cursor-pointer shrink-0 accent-ink"
    />
  );
}

export function FacetSection({
  title,
  total,
  entries,
  selected,
  onToggle,
  label,
  renderMarker,
  defaultExpanded = true,
  noLabelId,
  noLabelText = "No label",
  searchable = false,
  searchThreshold = 8,
  collapsedCount = 8,
  mode,
  onModeChange,
  onClear,
  groupOf,
  bare = false,
  control = "checkbox",
  mixed,
  renderCount,
  ariaLabelOf,
  renderBadge,
  searchPlaceholder,
  emptyState,
}: FacetSectionProps) {
  const radioName = useId();
  const [open, setOpen] = useState(defaultExpanded || bare);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const selectedCount = entries.reduce(
    (n, [id]) => n + (selected[id] ? 1 : 0),
    0,
  );

  const noLabelEntry = noLabelId
    ? entries.find(([id]) => id === noLabelId)
    : undefined;
  const allRegular = noLabelId
    ? entries.filter(([id]) => id !== noLabelId)
    : entries;

  const showSearch = searchable && allRegular.length > searchThreshold;
  const q = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      q
        ? allRegular.filter(([id]) => label(id).toLowerCase().includes(q))
        : allRegular,
    [allRegular, q, label],
  );

  // Group-aware ordering: children gather under their group (first-seen group
  // order), ungrouped entries keep their position ahead of the groups. Without
  // `groupOf` every row is ungrouped and the order is untouched.
  const ordered = useMemo(() => {
    if (!groupOf)
      return matched.map((entry) => ({ entry, group: undefined as string | undefined }));
    const ungrouped: [string, number][] = [];
    const groups = new Map<string, [string, number][]>();
    for (const entry of matched) {
      const g = groupOf(entry[0]);
      if (!g) ungrouped.push(entry);
      else {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(entry);
      }
    }
    const out: { entry: [string, number]; group?: string }[] = ungrouped.map((entry) => ({ entry }));
    for (const [group, list] of groups) for (const entry of list) out.push({ entry, group });
    return out;
  }, [matched, groupOf]);

  // Searching reveals everything that matches; otherwise cap to collapsedCount.
  const cap = q || showAll ? Infinity : collapsedCount;
  const regularRows = ordered.slice(0, cap);
  const hiddenCount = ordered.length - regularRows.length;

  return (
    /* Rows carry no side padding: the host's gutter places the content, and
       `bleed` runs the divider and each row's hover / selected fill to the pane
       edge. Group children indent by 0.75rem PAST the gutter. */
    <div
      data-component="FacetSection"
      data-variant={bare ? "bare" : undefined}
      className={bare ? "" : "bleed"}
      style={bare ? undefined : { borderBottom: "1px solid var(--border-soft)" }}
      role={bare ? "group" : undefined}
      aria-label={bare ? title : undefined}
    >
      {!bare && (
      <div
        data-part="header"
        className={`bleed flex items-center gap-2 py-2.5 transition-colors ${
          open ? "" : "hover:bg-warm"
        }`}
      >
        <button
          type="button"
          data-part="toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
        >
          <ChevronDown
            size={12}
            className={`text-ink-tertiary shrink-0 transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <span data-part="title" className="text-tab font-semibold text-ink-secondary truncate">
            {title}
          </span>
          {selectedCount > 0 && (
            <span
              data-part="selected-count"
              className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-carbon/10 text-meta font-semibold text-carbon tabular-nums">
              {selectedCount}
            </span>
          )}
        </button>
        {selectedCount > 0 && onClear ? (
          <button
            type="button"
            data-part="clear"
            onClick={onClear}
            className="shrink-0 inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} />
            Clear
          </button>
        ) : (
          <span data-part="total" className="shrink-0 text-meta text-ink-tertiary tabular-nums">
            {total}
          </span>
        )}
      </div>
      )}
      {open && (
        <div data-part="body" className={bare ? "" : "pb-2"}>
          {(showSearch || mode) && (
            <div className="pt-0.5 pb-2 space-y-2">
              {mode && onModeChange && (
                <MatchModeToggle mode={mode} onChange={onModeChange} label="Match" />
              )}
              {showSearch && (
                <div
                  data-part="search"
                  className="relative flex items-center gap-1.5 h-7 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}`}
                    aria-label={`Search ${title}`}
                    className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-ink-muted focus:outline-none"
                  />
                  {query ? (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="shrink-0 text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <Search size={12} className="text-ink-muted shrink-0" />
                  )}
                </div>
              )}
            </div>
          )}
          {allRegular.length === 0 && emptyState ? (
            emptyState
          ) : (
            matched.length === 0 && (
              <p data-part="empty" className={`${bare ? "px-2 " : ""}py-1.5 text-xs text-ink-muted`}>
                No matches.
              </p>
            )
          )}
          {regularRows.map((row, idx) => {
            const [id, count] = row.entry;
            const checked = !!selected[id];
            // A NON-SELECTABLE group label opens each run of grouped children —
            // the thesaurus group is context, not a filter value of its own.
            const showGroupHeader = !!row.group && row.group !== regularRows[idx - 1]?.group;
            return (
              <Fragment key={id}>
                {/* A `span`, not the label's default heading: the facet title
                    above is a button, so there is no section for it to head. */}
                {showGroupHeader && (
                  <SectionLabel as="span" className="pt-2 pb-0.5">
                    <span className="truncate">{row.group}</span>
                  </SectionLabel>
                )}
                <label
                  data-part="option"
                  className={`${bare ? "px-2 rounded-md" : "bleed"} flex items-center gap-2 py-1.5 cursor-pointer transition-colors ${
                    checked ? "bg-carbon/[0.04] hover:bg-carbon/[0.07]" : "hover:bg-warm"
                  }`}
                  style={
                    row.group
                      ? {
                          paddingInlineStart: bare
                            ? "1.25rem"
                            : "calc(var(--gutter, 0px) + 0.75rem)",
                        }
                      : undefined
                  }
                >
                  {control === "radio" ? (
                    <input
                      type="radio"
                      name={radioName}
                      checked={checked}
                      onChange={() => onToggle(id)}
                      aria-label={ariaLabelOf?.(id) ?? (row.group ? `${label(id)} (${row.group})` : label(id))}
                      className="w-3.5 h-3.5 cursor-pointer shrink-0 accent-ink"
                    />
                  ) : mixed ? (
                    <MixedCheckbox
                      checked={checked}
                      mixed={!!mixed[id]}
                      onChange={() => onToggle(id)}
                      ariaLabel={ariaLabelOf?.(id) ?? (row.group ? `${label(id)} (${row.group})` : label(id))}
                    />
                  ) : (
                    <Checkbox
                      checked={checked}
                      onChange={() => onToggle(id)}
                      ariaLabel={ariaLabelOf?.(id) ?? (row.group ? `${label(id)} (${row.group})` : label(id))}
                    />
                  )}
                  {renderMarker?.(id)}
                  <span
                    className={`text-tab truncate ${renderBadge ? "min-w-0" : "flex-1"} ${
                      checked || mixed?.[id] ? "text-ink font-medium" : "text-ink-secondary"
                    }`}
                  >
                    {label(id)}
                  </span>
                  {renderBadge && <span className="flex-1 min-w-0 flex items-center">{renderBadge(id)}</span>}
                  <span className="text-meta text-ink-tertiary tabular-nums shrink-0">
                    {renderCount ? renderCount(id, count) : count}
                  </span>
                </label>
              </Fragment>
            );
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              data-part="show-more"
              onClick={() => setShowAll(true)}
              className={`${bare ? "px-2 " : ""}py-1.5 text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer`}
            >
              Load {hiddenCount} more
            </button>
          )}
          {showAll && !q && matched.length > collapsedCount && (
            <button
              type="button"
              data-part="show-less"
              onClick={() => setShowAll(false)}
              className={`${bare ? "px-2 " : ""}py-1.5 text-xs font-medium text-ink-tertiary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer`}
            >
              Show less
            </button>
          )}
          {noLabelEntry && (
            <label
              data-part="no-label"
              className="bleed flex items-center gap-2 py-1.5 cursor-pointer hover:bg-warm transition-colors border-t border-border-soft"
            >
              <Checkbox
                checked={!!selected[noLabelEntry[0]]}
                onChange={() => onToggle(noLabelEntry[0])}
                ariaLabel={noLabelText}
              />
              <span className="text-xs italic text-ink-tertiary truncate flex-1">
                {noLabelText}
              </span>
              <span className="text-meta text-ink-tertiary tabular-nums shrink-0">
                {noLabelEntry[1]}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
