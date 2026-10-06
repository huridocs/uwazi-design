import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Ban, Plus, Quote, Split } from "lucide-react";
import {
  clearLibrarySearchAtom,
  librarySearchDraftAtom,
  librarySearchMatchAtom,
  librarySearchScopeAtom,
} from "../../../atoms/library";
import type { SearchScope } from "../../../utils/librarySnippets";
import type { QueryMatchMode } from "../../../utils/queryTokens";
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
import { BAR_GHOST, COMMIT_FILL } from "../../shared/warmButton";

/** The Adv. Search query toolbar: where the query is tested ("Search in"), how
 *  a term matches ("Match"), and the query itself as chips that can be removed
 *  or added to without typing the syntax. Every control writes the one query
 *  the masthead box holds (`librarySearchDraftAtom`), or the two atoms the
 *  matcher reads, so the box, the chips and the results never disagree.
 *
 *  `wide`: two rows, the selects and the syntax line, then chips and the add
 *  buttons. `stacked` (the phone Results sheet): the selects, the add buttons,
 *  then the chips. Every row is a fixed `h-8`; a long query scrolls its chip
 *  row sideways rather than adding a line, and composing a clause swaps the
 *  chips for an input in the same row, so nothing below ever moves. */

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "title", label: "Title" },
  { value: "metadata", label: "Metadata" },
  { value: "fulltext", label: "Full text" },
  { value: "quotes", label: "Quotes" },
];

const MATCHES: { value: QueryMatchMode; label: string }[] = [
  { value: "partial", label: "Partial words" },
  { value: "whole", label: "Whole words" },
];

const ADDS: { kind: ClauseKind; label: string; icon: ReactNode; placeholder: string }[] = [
  { kind: "phrase", label: "Exact phrase", icon: <Quote size={12} aria-hidden />, placeholder: "Words in this order" },
  { kind: "any", label: "Any of", icon: <Split size={12} aria-hidden />, placeholder: "Words, any one is enough" },
  { kind: "not", label: "Exclude", icon: <Ban size={12} aria-hidden />, placeholder: "Words no result may contain" },
];

const GHOST = `inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium cursor-pointer
  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 ${BAR_GHOST}`;

export function AdvancedSearchBar({
  query,
  hasQuotes,
  layout = "wide",
  trailing,
}: {
  /** The committed query. */
  query: string;
  /** Offer "Quotes" only in a collection whose entities carry quote fields. */
  hasQuotes: boolean;
  layout?: "wide" | "stacked";
  /** Wide only: the end of the first row (the hidden-by-filters line). */
  trailing?: ReactNode;
}) {
  const [scope, setScope] = useAtom(librarySearchScopeAtom);
  const [match, setMatch] = useAtom(librarySearchMatchAtom);
  const setDraft = useSetAtom(librarySearchDraftAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);
  const [composing, setComposing] = useState<ClauseKind | null>(null);

  const scopes = hasQuotes ? SCOPES : SCOPES.filter((s) => s.value !== "quotes");
  const clauses = parseClauses(query);

  // An emptied query ends the search, as the masthead chip's × does: an empty
  // draft alone commits nothing (see `librarySearchDraftAtom`).
  const write = (next: string) => (next.trim() ? setDraft(next) : clearSearch());

  const selects = (
    <span className="flex items-center gap-2 min-w-0">
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
    <span data-part="add-clause" className="flex items-center gap-0.5 shrink-0">
      {ADDS.map((a) => (
        <button
          key={a.kind}
          type="button"
          className={`${GHOST} ${composing === a.kind ? "bg-warm text-ink" : ""}`}
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
        const next = appendClause(query, composing, input);
        if (next !== query) write(next);
        setComposing(null);
      }}
      onCancel={() => setComposing(null)}
    />
  ) : (
    <span
      data-part="clauses"
      role="list"
      aria-label="Search terms"
      className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar"
    >
      {clauses.length === 0 ? (
        <span className="text-xs text-ink-tertiary truncate">No terms yet. Type in the search box or add one here.</span>
      ) : (
        clauses.map((c, i) => (
          <span role="listitem" key={`${i}:${clauseLabel(c)}`} className="shrink-0">
            <ActiveFilterChip
              label={clauseLabel(c)}
              removeLabel={`Remove from search: ${clauseLabel(c)}`}
              onRemove={() => write(withoutClause(query, i))}
            />
          </span>
        ))
      )}
    </span>
  );

  const hint = (
    <span data-part="syntax" className="min-w-0 truncate text-xs text-ink-tertiary" dir="ltr">
      <Code>"exact phrase"</Code> · <Code>a OR b</Code> · <Code>NOT c</Code> · <Code>juris*</Code> · <Code>198?</Code>
    </span>
  );

  if (layout === "stacked") {
    return (
      <div data-component="AdvancedSearchBar" data-layout="stacked" className="shrink-0 flex flex-col gap-1 pt-1 pb-2">
        <div className="h-8 flex items-center">{selects}</div>
        <div className="h-8 flex items-center -ms-2">{adds}</div>
        <div className="h-8 flex items-center gap-1 min-w-0">{chips}</div>
      </div>
    );
  }

  return (
    <div data-component="AdvancedSearchBar" data-layout="wide" className="shrink-0 flex flex-col gap-1 pt-1 pb-2">
      <div className="h-8 flex items-center gap-3 min-w-0">
        {selects}
        <span className="flex-1 min-w-0 flex">{hint}</span>
        {trailing}
      </div>
      <div className="h-8 flex items-center gap-2 min-w-0">
        {chips}
        <BarDivider />
        {adds}
      </div>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-meta text-ink-secondary">{children}</code>;
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
      <button type="button" onClick={onCancel} className={GHOST}>
        Cancel
      </button>
    </form>
  );
}
