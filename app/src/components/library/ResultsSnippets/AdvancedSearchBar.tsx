import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Ban, Plus, Quote, Split } from "lucide-react";
import {
  clearLibrarySearchAtom,
  libraryQueryAtom,
  librarySearchDraftAtom,
  librarySearchMatchInputAtom,
  librarySearchScopeInputAtom,
} from "../../../atoms/library";
import { SEARCH_SCOPE_LABEL, type SearchScope } from "../../../utils/searchScope";
import { MATCH_LABEL, type QueryMatchMode } from "../../../utils/queryTokens";
import {
  appendClause,
  clauseLabel,
  parseClauses,
  withoutClause,
  type ClauseKind,
} from "../../../utils/queryClauses";
import { Select } from "../../shared/Select";
import { ActiveFilterChip } from "../../shared/ActiveFilterChip";
import { BarDivider } from "../../shared/BarDivider";
import { COMMIT_FILL } from "../../shared/warmButton";

/** The Adv. Search query toolbar: where the query is tested ("Search in"), how
 *  a term matches ("Match"), and the query itself as chips that can be removed
 *  or added to without typing the syntax. Every control writes the one query
 *  the masthead box holds (`librarySearchDraftAtom`), or the two modifiers
 *  the Library's matcher calls read, so the box, the chips and the results
 *  never disagree. The selects commit in a transition, as the box does.
 *
 *  `wide`: one row, Search in and Match, then the chips and the add buttons
 *  (two rows in a narrow pane). `stacked` (phones): the selects, the add
 *  buttons, then the chips. Every row is a fixed `h-8`; a long query scrolls
 *  its chips sideways rather than adding a line, and composing a clause swaps
 *  the chips for an input in the same row, so nothing below ever moves. The
 *  query syntax is in the search box's tips popover, not here. */

const SCOPES = (["all", "title", "metadata", "fulltext", "quotes"] as const).map((value) => ({
  value,
  label: SEARCH_SCOPE_LABEL[value],
}));

const MATCHES = (["partial", "whole"] as const).map((value) => ({ value, label: MATCH_LABEL[value] }));

const ADDS: { kind: ClauseKind; label: string; icon: ReactNode; placeholder: string }[] = [
  { kind: "phrase", label: "Exact phrase", icon: <Quote size={12} aria-hidden />, placeholder: "Words in this order" },
  { kind: "any", label: "Any of", icon: <Split size={12} aria-hidden />, placeholder: "Words, any one is enough" },
  { kind: "not", label: "Exclude", icon: <Ban size={12} aria-hidden />, placeholder: "Words no result may contain" },
];

/** The masthead's secondary-control recipe (the Views and Display buttons
 *  beside Sort and View): paper, edge, `h-8`, so the bar's buttons and its two
 *  Selects read as the same family as the toolbar above them. */
const SECONDARY = `inline-flex items-center gap-1 h-8 px-2.5 rounded-md border text-xs font-medium cursor-pointer
  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35`;
const SECONDARY_REST = "bg-paper text-ink-secondary border-border hover:bg-parchment hover:text-ink";
const SECONDARY_ON = "bg-paper text-ink border-ink/40 shadow-sm";

export function AdvancedSearchBar({
  hasQuotes,
  layout = "wide",
  trailing,
}: {
  /** Offer "Quotes" only in a collection whose entities carry quote fields. */
  hasQuotes: boolean;
  layout?: "wide" | "stacked";
  /** Wide only: the end of the bar (the hidden-by-filters line). */
  trailing?: ReactNode;
}) {
  const [scope, setScope] = useAtom(librarySearchScopeInputAtom);
  const [match, setMatch] = useAtom(librarySearchMatchInputAtom);
  // The committed query, not the deferred one the results render with: two
  // quick edits must each build on the last, or the second drops the first.
  const committed = useAtomValue(libraryQueryAtom);
  const setDraft = useSetAtom(librarySearchDraftAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);
  const [composing, setComposing] = useState<ClauseKind | null>(null);

  // A query longer than its row scrolls; the row's end fades while it does, so
  // a cut chip reads as "more this way", not as a broken chip.
  const clausesRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = clausesRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [committed, composing]);

  const scopes = hasQuotes ? SCOPES : SCOPES.filter((s) => s.value !== "quotes");
  const clauses = parseClauses(committed);

  // An emptied query ends the search, as the masthead chip's × does: an empty
  // draft alone commits nothing (see `librarySearchDraftAtom`).
  const write = (next: string) => (next.trim() ? setDraft(next) : clearSearch());

  const selects = (
    <span className="flex items-center gap-1.5 min-w-0">
      <Select
        value={scope}
        options={scopes}
        onChange={(v) => setScope(v as SearchScope)}
        ariaLabel="Search in"
        triggerPrefix="Search in:"
        sheetTitle="Search in"
        steady
      />
      <Select
        value={match}
        options={MATCHES}
        onChange={(v) => setMatch(v as QueryMatchMode)}
        ariaLabel="Match"
        triggerPrefix="Match:"
        sheetTitle="Match"
        steady
      />
    </span>
  );

  const adds = (
    <span data-part="add-clause" className="flex items-center gap-1.5 shrink-0">
      {ADDS.map((a) => (
        <button
          key={a.kind}
          type="button"
          data-gutter-align="box"
          className={`${SECONDARY} ${composing === a.kind ? SECONDARY_ON : SECONDARY_REST}`}
          aria-pressed={composing === a.kind}
          onClick={() => setComposing((c) => (c === a.kind ? null : a.kind))}
        >
          <Plus size={12} aria-hidden />
          {a.label}
        </button>
      ))}
    </span>
  );

  const chips = composing ? (
    <ClauseComposer
      key={composing}
      kind={composing}
      onAdd={(input) => {
        const next = appendClause(committed, composing, input);
        if (next !== committed) write(next);
        setComposing(null);
      }}
      onCancel={() => setComposing(null)}
    />
  ) : (
    <span
      ref={clausesRef}
      data-part="clauses"
      data-overflow={overflowing || undefined}
      role="list"
      aria-label="Search terms"
      className="min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar
        data-[overflow]:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]
        rtl:data-[overflow]:[mask-image:linear-gradient(to_left,#000_calc(100%-1.5rem),transparent)]"
    >
      {clauses.length === 0 ? (
        <span className="text-xs text-ink-tertiary truncate">No terms yet</span>
      ) : (
        clauses.map((c, i) => (
          <span role="listitem" key={`${i}:${clauseLabel(c)}`} className="shrink-0">
            <ActiveFilterChip
              label={clauseLabel(c)}
              removeLabel={`Remove from search: ${clauseLabel(c)}`}
              onRemove={() => write(withoutClause(committed, i))}
            />
          </span>
        ))
      )}
    </span>
  );

  if (layout === "stacked") {
    return (
      <div data-component="AdvancedSearchBar" data-layout="stacked" className="shrink-0 flex flex-col gap-1.5 pb-3">
        <div className="h-8 flex items-center">{selects}</div>
        <div className="h-8 flex items-center">{adds}</div>
        <div className="h-8 flex items-center gap-1 min-w-0">{chips}</div>
      </div>
    );
  }

  // The pane body's first block: the Library lane's `py-3` above it, as every
  // view has, and `pb-3` below, the card grid's own gap to the first card.
  // One row where the pane can hold it: the selects, then the query's chips
  // with the add buttons right after the last one. In a narrower pane the
  // chips and add buttons take a second row. The row count follows the pane's
  // width (a container query), never the query, so typing never moves the
  // results; a long query scrolls its chips sideways.
  return (
    <div data-component="AdvancedSearchBar" data-layout="wide" className="@container shrink-0 pb-3">
      <div className="flex flex-wrap @min-[56rem]:flex-nowrap items-center gap-x-2 gap-y-1.5 min-w-0">
        <span className="h-8 shrink-0 flex items-center">{selects}</span>
        <BarDivider className="hidden @min-[56rem]:block" />
        <span
          data-part="query"
          className="order-last @min-[56rem]:order-none basis-full @min-[56rem]:basis-auto @min-[56rem]:flex-1
            h-8 min-w-0 flex items-center gap-2"
        >
          {chips}
          {adds}
        </span>
        {trailing && <span className="ms-auto shrink-0 flex items-center">{trailing}</span>}
      </div>
    </div>
  );
}

/** The input a clause is typed into, in place of the chips. Enter adds,
 *  Escape cancels (and stops there, so it never clears the Library's selection). */
function ClauseComposer({
  kind,
  onAdd,
  onCancel,
}: {
  kind: ClauseKind;
  onAdd: (input: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const add = ADDS.find((a) => a.kind === kind)!;
  return (
    <form
      data-part="composer"
      className="flex-1 min-w-0 flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(value);
      }}
    >
      <label className="flex-1 min-w-0 flex items-center gap-1.5 h-8 ps-2 pe-1 rounded-md bg-paper border border-border focus-within:ring-2 focus-within:ring-ink/35">
        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-ink-secondary">
          {add.icon}
          {add.label}
        </span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          placeholder={add.placeholder}
          aria-label={add.label}
          className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={!value.trim()}
        className={`h-8 px-3 rounded-md text-xs font-medium cursor-pointer disabled:cursor-default disabled:opacity-40 ${COMMIT_FILL}`}
      >
        Add
      </button>
      <button type="button" data-gutter-align="box" onClick={onCancel} className={`${SECONDARY} ${SECONDARY_REST}`}>
        Cancel
      </button>
    </form>
  );
}
