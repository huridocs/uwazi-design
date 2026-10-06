import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Checkbox } from "./Checkbox";
import { BAR_GHOST } from "./warmButton";
import { SectionLabel } from "./SectionLabel";

/* The filter panel's parts, shared by the Library's Filters and the
   Relationships filters (drawer tab, slide-over, phone sheet), so the two
   panels are one system: paper cards on a warm rail, one header, one row, one
   search box, one Match line, one "Load N more". */

/** `bg-paper` on the warm rail, and nothing else: no border, no shadow. The
 *  paper-against-warm step is the whole definition; a stack of these reads as a
 *  column of blocks rather than a column of outlined boxes.
 *
 *  Both other treatments were tried and dropped: `shadow-sm` barely read in
 *  dark, and a hairline border read as too much fence for a filter list. */
export const FILTER_CARD = "bg-paper rounded-lg p-1.5";

/** The warm rail the cards stack on: the pane's first block at the lane's
 *  `pt-3`, the cards 6px apart. A `bleed` lane, so the ground reaches the pane
 *  edge and the cards sit on the gutter. */
export const FILTER_RAIL = "bleed bg-warm pt-3 pb-3 space-y-1.5";

/** ONE row metric for every filter list: 28px, the whole label + checkbox row
 *  is the target. */
export const FILTER_ROW = "flex items-center py-1 transition-colors";

/** The count badge a header carries while its card has ticks. */
export function SelectedCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      data-part="selected-count"
      className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-carbon/10 text-meta font-semibold text-carbon tabular-nums"
    >
      {n}
    </span>
  );
}

/** A filter card: a paper block with a title, the ticked count, and a Clear
 *  that shows while the card narrows anything. Its body is the caller's. */
export function FilterCard({
  title,
  headingLevel = 2,
  selectedCount = 0,
  onClear,
  narrowing,
  component = "FilterCard",
  stack = false,
  className = "",
  children,
}: {
  title?: string;
  /** 3 inside a group that carries its own `h2`. */
  headingLevel?: 2 | 3;
  selectedCount?: number;
  /** Shown as "× Clear" in the header while `narrowing` (default: any tick). */
  onClear?: () => void;
  narrowing?: boolean;
  component?: string;
  /** The body is a stack of blocks (Match line, search, rows) 6px apart; the
   *  header takes part in that stack instead of padding itself. */
  stack?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const showClear = !!onClear && (narrowing ?? selectedCount > 0);
  return (
    <section data-component={component} className={`${FILTER_CARD} ${stack ? "space-y-1.5" : ""} ${className}`}>
      {title && (
        // 6px from the header to the first item, whatever it is: `pb-1.5`, or
        // the stack's own gap.
        <header data-part="header" className={`flex items-center justify-between gap-2 px-2 pt-1 ${stack ? "" : "pb-1.5"}`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <Heading data-part="title" className="text-tab font-semibold text-ink truncate">
              {title}
            </Heading>
            <SelectedCount n={selectedCount} />
          </span>
          {showClear && (
            <button
              type="button"
              data-part="clear"
              onClick={onClear}
              aria-label={`Clear ${title}`}
              className="shrink-0 inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
            >
              <X size={11} aria-hidden />
              Clear
            </button>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

/** One value row: checkbox · optional marker · label · count. A row at 0 is
 *  shown in place and cannot be ticked (nothing would be added); a ticked one
 *  stays live so it can be unticked. */
export function FilterOption({
  label,
  count,
  checked,
  onToggle,
  marker,
  ariaLabel,
  indent = false,
  italic = false,
  disabled,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
  marker?: ReactNode;
  ariaLabel?: string;
  /** A thesaurus child under its group label. */
  indent?: boolean;
  /** The pinned "No label" row. */
  italic?: boolean;
  /** Override the 0-count rule (a list whose 0s are inert as a whole). */
  disabled?: boolean;
}) {
  const unavailable = disabled ?? (count === 0 && !checked);
  return (
    <label
      data-part="option"
      data-state={checked ? "checked" : unavailable ? "unavailable" : "unchecked"}
      className={`${FILTER_ROW} gap-2.5 pe-2 rounded-sm ${indent ? "ps-5" : "ps-2"} ${
        checked
          ? "cursor-pointer bg-carbon/[0.04] hover:bg-carbon/[0.07]"
          : unavailable
            ? "cursor-default"
            : "cursor-pointer hover:bg-warm"
      }`}
    >
      <Checkbox checked={checked} onChange={onToggle} ariaLabel={ariaLabel ?? `${label}, ${count}`} unavailable={unavailable} />
      {marker}
      <span
        data-part="label"
        className={`flex-1 truncate text-tab ${italic ? "italic " : ""}${
          checked ? "text-ink font-medium" : count === 0 ? "text-ink-muted" : "text-ink-secondary"
        }`}
      >
        {label}
      </span>
      <span
        data-part="count"
        className={`shrink-0 text-tab font-semibold tabular-nums ${count === 0 ? "text-ink-muted" : "text-ink-secondary"}`}
      >
        {count}
      </span>
    </label>
  );
}

/** The search-within-a-card box. */
export function FilterSearch({ value, onChange, title }: { value: string; onChange: (v: string) => void; title: string }) {
  return (
    <div data-part="search" className="px-1">
      <div className="relative flex items-center gap-1.5 h-8 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          aria-label={`Search ${title.toLowerCase()}`}
          className="flex-1 min-w-0 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="shrink-0 text-ink-muted hover:text-ink cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <Search size={14} className="text-ink-muted shrink-0" />
        )}
      </div>
    </div>
  );
}

/** A caption, text segments, and a note slot at the end that is always
 *  mounted, so the row never changes height. The facets' Match line. */
export function SegmentRow<T extends string>({
  component,
  caption,
  groupLabel,
  options,
  value,
  onChange,
  note = "",
}: {
  component: string;
  caption: string;
  groupLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  note?: string;
}) {
  return (
    <div data-component={component} className="flex items-center gap-0.5 h-5 px-2">
      <span aria-hidden className="text-meta text-ink-tertiary me-1">{caption}</span>
      <div role="group" aria-label={groupLabel} className="flex items-center gap-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            data-part="mode"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-1.5 h-5 rounded-sm text-meta transition-colors cursor-pointer ${
              value === o.value ? "bg-warm text-ink" : "text-ink-tertiary hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span data-part="missing" aria-live="polite" className="ms-auto text-meta tabular-nums text-ink-tertiary">
        {note}
      </span>
    </div>
  );
}

/** Rows a list card shows before "Load N more". */
export const FILTER_LIST_CAP = 6;

/** A searchable, multi-select value list in a card: the Library's keyword
 *  facets (Countries, Descriptores, properties) and every Relationships facet.
 *  The caller orders `entries` (the collection's order, never the live counts,
 *  so a tick elsewhere changes numbers, not rows). */
export function FilterListCard({
  title,
  entries,
  selected,
  onToggle,
  onClear,
  label = (id) => id,
  renderMarker,
  searchable = false,
  cap = FILTER_LIST_CAP,
  match,
  inert = false,
  narrowing,
  selectedCount,
  headingLevel = 2,
  noLabelId,
  noLabelText = "No label",
  groupOf,
  component = "FilterListCard",
}: {
  title: string;
  entries: [string, number][];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onClear: () => void;
  label?: (id: string) => string;
  renderMarker?: (id: string) => ReactNode;
  /** A search box above the rows. */
  searchable?: boolean;
  cap?: number;
  /** The Match line, under the header. */
  match?: ReactNode;
  /** The values are kept but take no part (a Library facet in `missing`):
   *  dimmed and inert. */
  inert?: boolean;
  /** Whether Clear shows; default any tick. */
  narrowing?: boolean;
  /** Default: the ticked values. */
  selectedCount?: number;
  headingLevel?: 2 | 3;
  /** The "no value" bucket (Uwazi's "No label"), pinned last under a rule. */
  noLabelId?: string;
  noLabelText?: string;
  /** Thesaurus values that nest one level: an entry's group label. Children
   *  gather under a non-selectable label; ungrouped entries come first. */
  groupOf?: (id: string) => string | undefined;
  component?: string;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = search.trim().toLowerCase();

  const noLabel = noLabelId ? entries.find(([id]) => id === noLabelId) : undefined;
  const regular = useMemo(
    () => (noLabelId ? entries.filter(([id]) => id !== noLabelId) : entries),
    [entries, noLabelId],
  );
  const matched = useMemo(
    () => (q ? regular.filter(([id]) => label(id).toLowerCase().includes(q)) : regular),
    [regular, q, label],
  );
  const ordered = useMemo(() => {
    if (!groupOf) return matched.map((entry) => ({ entry, group: undefined as string | undefined }));
    const loose: { entry: [string, number]; group?: string }[] = [];
    const groups = new Map<string, [string, number][]>();
    for (const entry of matched) {
      const g = groupOf(entry[0]);
      if (!g) loose.push({ entry });
      else groups.set(g, [...(groups.get(g) ?? []), entry]);
    }
    for (const [group, list] of groups) for (const entry of list) loose.push({ entry, group });
    return loose;
  }, [matched, groupOf]);

  const visible = q || showAll ? ordered : ordered.slice(0, cap);
  const hidden = ordered.length - visible.length;
  const ticked = selectedCount ?? Object.values(selected).filter(Boolean).length;

  return (
    <FilterCard
      component={component}
      title={title}
      headingLevel={headingLevel}
      selectedCount={ticked}
      onClear={onClear}
      narrowing={narrowing}
      stack
    >
      {match}
      <div
        data-part="values"
        className={`space-y-1.5 transition-opacity ${inert ? "opacity-40" : ""}`}
        ref={(el) => el?.toggleAttribute("inert", inert)}
      >
        {searchable && <FilterSearch value={search} onChange={setSearch} title={title} />}
        <div data-part="options" className="max-h-64 overflow-auto">
          {visible.length === 0
            ? q && <p className="px-2 py-1 text-xs text-ink-tertiary">No matches.</p>
            : visible.map(({ entry: [id, n], group }, i) => (
                <Fragment key={id}>
                  {group && group !== visible[i - 1]?.group && (
                    <SectionLabel as="span" className="px-2 pt-1.5 pb-0.5">
                      <span className="truncate">{group}</span>
                    </SectionLabel>
                  )}
                  <FilterOption
                    label={label(id)}
                    count={n}
                    checked={!!selected[id]}
                    onToggle={() => onToggle(id)}
                    marker={renderMarker?.(id)}
                    indent={!!group}
                    ariaLabel={`${group ? `${label(id)} (${group})` : label(id)}, ${n}`}
                    disabled={inert ? false : undefined}
                  />
                </Fragment>
              ))}
          {hidden > 0 && (
            <button
              type="button"
              data-part="load-more"
              onClick={() => setShowAll(true)}
              className="px-2 py-1 text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
            >
              Load {hidden} more
            </button>
          )}
          {showAll && !q && ordered.length > cap && (
            <button
              type="button"
              data-part="show-less"
              onClick={() => setShowAll(false)}
              className="px-2 py-1 text-xs font-medium text-ink-tertiary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
            >
              Show less
            </button>
          )}
          {noLabel && (
            <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <FilterOption
                label={noLabelText}
                count={noLabel[1]}
                checked={!!selected[noLabel[0]]}
                onToggle={() => onToggle(noLabel[0])}
                italic
              />
            </div>
          )}
        </div>
      </div>
    </FilterCard>
  );
}

/** A filter panel footer's button: a ghost, since nothing there commits. */
export const FILTER_FOOTER_BUTTON = `px-3 py-1.5 text-xs font-medium rounded-md ${BAR_GHOST} transition-colors cursor-pointer`;

/** The footer's Clear: at the end of the footer, always mounted (disabled with
 *  nothing set), so setting the first filter moves nothing. */
export function FilterClearAll({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      data-part="clear"
      data-gutter-align="box"
      onClick={onClick}
      disabled={disabled}
      className={`ms-auto ${FILTER_FOOTER_BUTTON} disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-ink-secondary`}
    >
      Clear
    </button>
  );
}
