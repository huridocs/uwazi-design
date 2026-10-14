import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, Pin, Search } from "lucide-react";
import type { Entity } from "../../../data/entities";
import { getEntityType } from "../../../data/entities";
import {
  compareEvidence,
  type EntitySnippets,
  type FullTextSnippet,
  type MetadataSnippet,
} from "../../../utils/librarySnippets";
import {
  librarySearchMatchInputAtom,
  librarySearchScopeInputAtom,
  resultsCurrentPageAtom,
} from "../../../atoms/library";
import { useActiveFilters } from "../../../hooks/useActiveFilters";
import { FULL_TEXT_MIN, SEARCH_SCOPE_LABEL, type SearchScope } from "../../../utils/searchScope";
import type { RelevanceBreakdown } from "../../../utils/relevance";
import { HighlightedText } from "../../shared/HighlightedText";
import { SectionLabel } from "../../shared/SectionLabel";
import { PinToggle } from "../../shared/PinToggle";
import { TimeTag } from "../../shared/TimeTag";
import { EvidenceStatus } from "../../relationships/rows/EvidenceStatus";
import { ContestedClock } from "../../relationships/rows/ContestedClock";
import { UploadStateMark } from "../UploadStateMark";
import { getEntity } from "../../../data/entities";
import { snippetReferences } from "../../../utils/snippetRefs";
import { reportedAt, sourcePublisher } from "../../../utils/refEvidence";
import { formatAtPrecision } from "../../../utils/dateFormat";
import { passagePinKey, passagePinnedAtom, togglePassagePinAtom } from "../../../atoms/notebook";
import type { ZeroResultSuggestion } from "../../../utils/zeroResultSuggestions";
import { PageTag } from "../../shared/PageTag";
import { MatchedTerms } from "../MatchedTerms";
import { AlsoUnder } from "./AlsoUnder";
import {
  EntitySelectBox,
  FOCUS_RING_ON_SELECT,
  PREVIEWED_RING,
  SELECTED_LOOK,
  holdTextSelection,
} from "../EntitySelectBox";

/** One matched record and the snippets behind it, for every place the Library
 *  lists search results: the drawer's Results tab, the rail panel, the phone
 *  sheet and the Adv. Search layouts. Built on the shape of the Relationships
 *  `MemberCard`: a stretched invisible button opens the record, and the head,
 *  the snippets and their page tags sit above it with their own targets.
 *
 *  What a row leaves out: the title's own snippet (the head prints it marked),
 *  a section label unless the record mixes properties and pages, a field label
 *  after its first snippet, and a passage another record already shows (it
 *  reads "↳ Same passage as …"; `passageOwners`). */

export interface Result {
  entity: Entity;
  snippets: EntitySnippets;
}

export type SelectHandler = (id: string, e?: MouseEvent) => void;

/** Metadata snippets minus the title, which the head already prints marked.
 *  The count badge still counts a title hit; a title-only match has no body. */
export const properties = (s: EntitySnippets): MetadataSnippet[] => s.metadata.filter((m) => m.fieldKey !== "title");

/** A passage's identity across results: the text it was cut from and its page
 *  (the text itself where the corpus has no pages). CEJIL records that read a
 *  connected PDF share one `docKey`, so their passages meet here. */
export const passageKey = (s: EntitySnippets, p: FullTextSnippet, entityId: string) =>
  `${s.docKey ?? entityId}|${p.page ?? p.text}`;

export interface PassageOwner {
  /** The first record, in drawing order, that shows this passage. */
  owner: Entity;
  /** The later records that read the same passage; they show a "same passage"
   *  line instead of the text. */
  also: Entity[];
}

/** Who shows each passage, for results in the order they are drawn. The first
 *  record keeps the text; every later one gets one line pointing back. Built
 *  once per drawn list, so a keystroke that leaves the list alone costs
 *  nothing. */
export function passageOwners(results: Result[]): Map<string, PassageOwner> {
  const out = new Map<string, PassageOwner>();
  for (const { entity, snippets } of results) {
    for (const p of snippets.fullText) {
      const key = passageKey(snippets, p, entity.id);
      claim(out, key, entity);
    }
    // A reference's quote is one passage whichever end it is read from (Nepal:
    // the source that says it and the record it is about).
    for (const g of properties(snippets)) if (g.refId) claim(out, `ref|${g.refId}`, entity);
  }
  return out;
}

function claim(out: Map<string, PassageOwner>, key: string, entity: Entity) {
  const seen = out.get(key);
  if (!seen) out.set(key, { owner: entity, also: [] });
  else if (seen.owner.id !== entity.id && !seen.also.some((e) => e.id === entity.id)) seen.also.push(entity);
}

/** Whether the drawn set mixes templates, so a head names its template only
 *  where that tells one result from the next. */
export const mixesTemplates = (entities: Entity[]) => {
  const first = entities[0]?.typeId;
  return entities.some((e) => e.typeId !== first);
};

/* ------------------------------------------------------------------ *
 * The record
 * ------------------------------------------------------------------ */

export function ResultRecord({
  entity,
  snippets,
  query,
  variant,
  selected = false,
  onSelect,
  selectable = false,
  facts = false,
  expanded,
  onToggle,
  relevance,
  headSlot,
  children,
}: {
  entity: Entity;
  snippets: EntitySnippets;
  query: string;
  /** `card`: a bordered box (the drawer, Grouped, Tree). `row`: a hairline row
   *  on one sheet (Passages). */
  variant: "card" | "row";
  /** The record open in the preview. */
  selected?: boolean;
  onSelect: SelectHandler;
  /** Draw the hidden selection box (the main pane, where selection runs). */
  selectable?: boolean;
  /** Print template · country · year: only when the set mixes templates. */
  facts?: boolean;
  /** With `onToggle`, the head carries a disclosure and the body folds. */
  expanded?: boolean;
  onToggle?: () => void;
  /** Multi-term queries: which field carried each term (`MatchedTerms`). */
  relevance?: RelevanceBreakdown | null;
  /** More marks for the head, after the upload state. */
  headSlot?: ReactNode;
  children?: ReactNode;
}) {
  const type = getEntityType(entity.typeId);
  const open = onToggle ? expanded !== false : true;
  const isCard = variant === "card";

  return (
    <article
      data-component="ResultRecord"
      data-variant={variant}
      data-state={selected ? "selected" : undefined}
      className={`group relative transition-colors ${
        isCard
          ? `rounded-md border ${selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60"}`
          : `${selected ? `bg-parchment ${PREVIEWED_RING}` : "hover:bg-parchment/60"}`
      } ${selectable ? `${SELECTED_LOOK} ${FOCUS_RING_ON_SELECT}` : ""}`}
    >
      {selectable && <EntitySelectBox id={entity.id} title={entity.title} />}
      <button
        type="button"
        data-part="primary-action"
        aria-pressed={selected}
        aria-label={`Open ${entity.title}`}
        onClick={(e) => onSelect(entity.id, e)}
        onMouseDown={holdTextSelection}
        className="absolute inset-0 w-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
      />
      {/* Presses go through to the button beneath; the record's own controls
          take them back. */}
      <div className="relative min-w-0 pointer-events-none [&_button]:pointer-events-auto [&_input]:pointer-events-auto">
        <header data-part="head" className={`@container flex flex-col gap-0.5 ${isCard ? "px-3 py-2" : "px-3 pt-2.5"}`}>
          {/* One line at a fixed height: the title truncates before the
              count, the slot or the facts give way, so the badge never wraps. */}
          <div className="flex items-center gap-2 min-w-0 h-6">
            {onToggle && (
              <button
                type="button"
                data-part="toggle"
                onClick={onToggle}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${entity.title}`}
                className="shrink-0 -ms-1 p-0.5 rounded-sm text-ink-muted hover:text-ink hover:bg-warm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/30"
              >
                <ChevronDown size={14} aria-hidden className={`transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            )}
            <span
              aria-hidden
              data-part="dot"
              className="w-2 h-2 rounded-[2px] shrink-0"
              style={{ backgroundColor: type?.color ?? "var(--text-muted)" }}
            />
            {/* h2: a results surface has no heading of its own between the
                page's h1 and its records; labels under the record are h3. */}
            <h2 data-part="title" className="min-w-0 truncate text-sm font-medium text-ink">
              <HighlightedText text={entity.title} query={query} fieldKey="title" />
            </h2>
            <WhereBadge snippets={snippets} className="hidden @md:inline-block" />
            <UploadStateMark entityId={entity.id} />
            {headSlot}
            {facts && <Facts entity={entity} typeName={type?.name} />}
            <PinToggle entityId={entity.id} title={entity.title} reveal className={facts ? "" : "ms-auto"} />
          </div>
          {/* A narrow card (the drawer, the rail, a phone) gives the badge its
              own line, so the title keeps the width. */}
          <WhereBadge snippets={snippets} className="@md:hidden self-start max-w-full" />
          <MatchedTerms relevance={relevance ?? null} query={query} />
        </header>
        {open && children}
      </div>
    </article>
  );
}

/** Where the record matched, in the order a reader checks: the title, the
 *  fields by name (two, then "+N"), then the pages (the two best in page
 *  order, then "+N"; "Document" where it has no pages). Attribution, not a
 *  score: it says where to look, and the ranking says how much. It holds the
 *  line at the badge's height and truncates rather than wrap. */
export function whereMatched(s: EntitySnippets): string {
  const parts: string[] = [];
  if (s.metadata.some((m) => m.fieldKey === "title")) parts.push("Title");
  const fields = [...new Set(properties(s).map((m) => m.field))];
  if (fields.length) parts.push(fields.slice(0, 2).join(", ") + (fields.length > 2 ? ` +${fields.length - 2}` : ""));
  if (s.fullTextTotal > 0) {
    const pages = s.fullText
      .map((p) => p.page)
      .filter((p): p is number => p !== null)
      .slice(0, 2)
      .sort((a, b) => a - b);
    const rest = s.fullTextTotal - pages.length;
    parts.push(
      pages.length
        ? pages.map((p) => `p.${p}`).join(", ") + (rest > 0 ? ` +${rest}` : "")
        : "Document",
    );
  }
  return parts.join(" · ");
}

function WhereBadge({ snippets, className = "" }: { snippets: EntitySnippets; className?: string }) {
  const where = whereMatched(snippets);
  if (!where) return null;
  return (
    <span
      data-component="WhereBadge"
      title={`Matched in ${where}`}
      dir="ltr"
      className={`shrink-0 max-w-[55%] h-5 px-1.5 leading-5 truncate whitespace-nowrap text-xs font-medium rounded-md bg-parchment text-ink-tertiary ${className}`}
    >
      {where}
    </span>
  );
}

function Facts({ entity, typeName }: { entity: Entity; typeName?: string }) {
  const parts = [
    typeName,
    entity.country,
    entity.createdAt ? String(new Date(entity.createdAt).getUTCFullYear()) : undefined,
  ].filter(Boolean) as string[];
  if (!parts.length) return null;
  return (
    <span data-part="facts" className="ms-auto shrink-0 flex items-center gap-1.5 text-meta text-ink-tertiary">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <Sep />}
          <span className={i === parts.length - 1 && p.length === 4 ? "tabular-nums" : undefined}>{p}</span>
        </Fragment>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * The evidence under a record
 * ------------------------------------------------------------------ */

export interface EvidenceHandlers {
  /** A property snippet: the record's Metadata tab, focused on that field. */
  onFocusProperty: (id: string, fieldKey: string) => void;
  /** A page: select the record and jump its document there. */
  onSelectSnippet: (id: string, page: number) => void;
  /** Open a record (the one a "same passage" line points to). */
  onSelect: SelectHandler;
}

/** One record's snippets: properties, then its pages. Grouped, the drawer and
 *  the sheet use it.
 *
 *  - Section labels ("Properties", "Document") only where the record has both.
 *  - A field label once over its snippets: a run of one label (Nepal's quotes,
 *    one field per quote) prints it once.
 *  - Pages another record already shows become one "↳ Same passage as …" line.
 *  - "5 of 23 pages · Show all" when the excerpts were capped. */
export function ResultEvidence({
  entity,
  snippets,
  query,
  owners,
  showAll,
  onToggleShowAll,
  handlers,
}: {
  entity: Entity;
  snippets: EntitySnippets;
  query: string;
  owners: Map<string, PassageOwner>;
  showAll: boolean;
  onToggleShowAll: () => void;
  handlers: EvidenceHandlers;
}) {
  const { own, props, shared, commonAlso } = splitShared(entity, snippets, owners);
  const hasPages = snippets.fullText.length > 0;
  if (!props.length && !hasPages && !shared.length) return null;
  const mixed = props.length > 0 && hasPages;
  const capped = snippets.fullTextTotal > snippets.fullText.length || showAll;

  return (
    <div data-component="ResultEvidence" className="flex flex-col gap-2 px-3 pb-2.5">
      {props.length > 0 && (
        <section data-part="properties" className="flex flex-col gap-1">
          {mixed && <SectionLabel as="h3">Properties</SectionLabel>}
          <PropertyRuns entity={entity} lines={props} query={query} onFocusProperty={handlers.onFocusProperty} />
        </section>
      )}
      {hasPages && (
        <section data-part="document" className="flex flex-col gap-1">
          {mixed && <SectionLabel as="h3">Document</SectionLabel>}
          {own.length > 0 && (
            <ul className="flex flex-col">
              {own.map(({ snippet, also }) => (
                <li key={`${snippet.page ?? snippet.text}`}>
                  <SnippetLine
                    entityId={entity.id}
                    snippet={snippet}
                    query={query}
                    onJump={handlers.onSelectSnippet}
                    trailing={also.length > 0 ? <AlsoUnder entities={also} onOpenEntity={handlers.onSelect} /> : null}
                  />
                </li>
              ))}
            </ul>
          )}
          {(capped || commonAlso) && (
            <p data-part="document-foot" className="flex flex-wrap items-center gap-x-1.5 min-w-0 px-2 text-meta text-ink-tertiary">
              {capped && (
                <>
                  <span dir="ltr" className="tabular-nums">
                    {snippets.fullText.length < snippets.fullTextTotal
                      ? `${snippets.fullText.length} of ${snippets.fullTextTotal.toLocaleString()}`
                      : snippets.fullTextTotal.toLocaleString()}{" "}
                    {snippets.fullTextTotal === 1 ? "page" : "pages"}
                  </span>
                  <Sep />
                  <button
                    type="button"
                    data-part="show-all"
                    onClick={onToggleShowAll}
                    aria-expanded={showAll}
                    className="font-medium text-ink-secondary hover:text-ink hover:underline cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
                  >
                    {showAll ? "Show fewer" : "Show all"}
                  </button>
                </>
              )}
              {commonAlso && <AlsoUnder entities={commonAlso} onOpenEntity={handlers.onSelect} />}
            </p>
          )}
        </section>
      )}
      <SharedLines entity={entity} shared={shared} handlers={handlers} />
    </div>
  );
}

/** Passages ranked across the record (Passages layout): property snippets and
 *  pages on one scale (`compareEvidence`), the first `FOLD` shown, the rest
 *  behind "Show all N passages". Each line names where it is: the field, or
 *  the page. */
const FOLD = 3;
export function RankedEvidence({
  entity,
  snippets,
  query,
  owners,
  handlers,
}: {
  entity: Entity;
  snippets: EntitySnippets;
  query: string;
  owners: Map<string, PassageOwner>;
  handlers: EvidenceHandlers;
}) {
  const [all, setAll] = useState(false);
  const { own, props, shared, commonAlso } = splitShared(entity, snippets, owners);
  type Line =
    | { kind: "field"; group: MetadataSnippet; text: string; refs: number; refIds: string[]; groupsMet: number; hits: number }
    | { kind: "page"; snippet: FullTextSnippet; also: Entity[]; groupsMet: number; hits: number };
  const lines: Line[] = [
    ...props.map(({ group, text, refs, refIds }) => ({
      kind: "field" as const,
      group,
      text,
      refs,
      refIds,
      groupsMet: group.groupsMet,
      hits: group.hits,
    })),
    ...own.map(({ snippet, also }) => ({
      kind: "page" as const,
      snippet,
      also,
      groupsMet: snippet.groupsMet,
      hits: snippet.hits,
    })),
  ].sort(compareEvidence);
  if (!lines.length && !shared.length) return null;
  const shown = all ? lines : lines.slice(0, FOLD);

  return (
    <div data-component="RankedEvidence" className="flex flex-col gap-0.5 px-3 pb-2.5">
      {shown.length > 0 && (
        <ul className="flex flex-col">
          {shown.map((line) =>
            line.kind === "field" ? (
              <li key={`f|${line.group.fieldKey}|${line.text}`}>
                <SnippetLine
                  entityId={entity.id}
                  text={line.text}
                  query={query}
                  label={line.group.field}
                  note={refsNote(line.refs)}
                  refIds={line.refIds}
                  onActivate={() => handlers.onFocusProperty(entity.id, line.group.fieldKey)}
                />
              </li>
            ) : (
              <li key={`p|${line.snippet.page ?? line.snippet.text}`}>
                <SnippetLine
                  entityId={entity.id}
                  snippet={line.snippet}
                  query={query}
                  label={line.snippet.page === null ? "Document" : undefined}
                  onJump={handlers.onSelectSnippet}
                  trailing={line.also.length > 0 ? <AlsoUnder entities={line.also} onOpenEntity={handlers.onSelect} /> : null}
                />
              </li>
            ),
          )}
        </ul>
      )}
      <SharedLines entity={entity} shared={shared} handlers={handlers} />
      {(lines.length > FOLD || commonAlso) && (
        <p className="flex flex-wrap items-center gap-x-1.5 min-w-0 px-2 text-meta text-ink-tertiary">
          {lines.length > FOLD && (
            <button
              type="button"
              data-part="more-passages"
              aria-expanded={all}
              onClick={() => setAll((v) => !v)}
              className="font-medium text-ink-secondary hover:text-ink hover:underline cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
            >
              {all ? "Show fewer passages" : `Show all ${lines.length} passages`}
            </button>
          )}
          {commonAlso && <AlsoUnder entities={commonAlso} onOpenEntity={handlers.onSelect} />}
        </p>
      )}
    </div>
  );
}

/** A property snippet as a line. `refs` counts the references whose quote is
 *  this same text, so a source quoted three times prints the words once. */
export interface PropLine {
  group: MetadataSnippet;
  text: string;
  refs: number;
  /** The references whose words these are (Nepal quotes, Vegas annotations). */
  refIds: string[];
}

/** Passages another record shows first, by that record; `null` is a quote. */
export interface SharedGroup {
  owner: Entity;
  pages: (number | null)[];
}

/** A record's evidence split by who shows it. Its own pages (with the records
 *  that read the same page) and its own property lines (identical text once);
 *  then the pages and quotes another record shows first, grouped by it. */
export function splitShared(entity: Entity, snippets: EntitySnippets, owners: Map<string, PassageOwner>) {
  const own: { snippet: FullTextSnippet; also: Entity[] }[] = [];
  const byOwner = new Map<string, SharedGroup>();
  const share = (owner: Entity, page: number | null) => {
    const g = byOwner.get(owner.id);
    if (g) g.pages.push(page);
    else byOwner.set(owner.id, { owner, pages: [page] });
  };
  for (const snippet of snippets.fullText) {
    const o = owners.get(passageKey(snippets, snippet, entity.id));
    if (!o || o.owner.id === entity.id) own.push({ snippet, also: o?.also ?? [] });
    else share(o.owner, snippet.page);
  }
  const props: PropLine[] = [];
  const byText = new Map<string, PropLine>();
  for (const group of properties(snippets)) {
    const o = group.refId ? owners.get(`ref|${group.refId}`) : undefined;
    if (o && o.owner.id !== entity.id) {
      share(o.owner, null);
      continue;
    }
    for (const text of group.texts) {
      const k = `${group.field}|${text}`;
      const seen = byText.get(k);
      if (seen) {
        seen.refs++;
        if (group.refId) seen.refIds.push(group.refId);
      } else {
        const line = { group, text, refs: 1, refIds: group.refId ? [group.refId] : [] };
        byText.set(k, line);
        props.push(line);
      }
    }
  }
  // A shared file's pages (a stand-in several records resolve to) are read by
  // the same records, so every page would carry the same "also under N": said
  // once for the record instead.
  const ids = (es: Entity[]) => es.map((e) => e.id).join(",");
  const first = own[0]?.also ?? [];
  const commonAlso = first.length > 0 && own.every((o) => ids(o.also) === ids(first)) ? first : null;
  if (commonAlso) for (const o of own) o.also = [];
  return { own, props, shared: [...byOwner.values()], commonAlso };
}

/** "3 references" after a line whose words several references quote. */
export const refsNote = (n: number) => (n > 1 ? `${n} references` : undefined);

/** "↳ Same passage as <record> · p.2 p.5": one line per record that already
 *  shows these pages. The name opens that record; each page tag jumps this
 *  record's document there. */
export function SharedLines({
  entity,
  shared,
  handlers,
}: {
  entity: Entity;
  shared: SharedGroup[];
  handlers: EvidenceHandlers;
}) {
  if (!shared.length) return null;
  return (
    <>
      {shared.map(({ owner, pages }) => (
        <p
          key={owner.id}
          data-part="same-passage"
          className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 px-2 py-0.5 text-meta text-ink-tertiary"
        >
          <span aria-hidden className="text-ink-muted">↳</span>
          <span>{pages.length === 1 ? "Same passage as" : `Same ${pages.length} passages as`}</span>
          <button
            type="button"
            data-part="same-as"
            onClick={(e) => handlers.onSelect(owner.id, e)}
            className="min-w-0 max-w-[18rem] truncate font-medium text-ink-secondary hover:text-ink hover:underline cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
          >
            {owner.title}
          </button>
          {[...new Set(pages)].map((page) =>
            page !== null ? (
              <PageTag key={page} page={page} onClick={() => handlers.onSelectSnippet(entity.id, page)} />
            ) : null,
          )}
        </p>
      ))}
    </>
  );
}

/** Property lines under their labels: a label once over a run of lines that
 *  share it, each line opening its field. */
export function PropertyRuns({
  entity,
  lines,
  query,
  onFocusProperty,
}: {
  entity: Entity;
  lines: PropLine[];
  query: string;
  onFocusProperty: (id: string, fieldKey: string) => void;
}) {
  return (
    <>
      {labelRuns(lines).map((run) => (
        <div key={run.lines[0].group.fieldKey} data-part="property" className="flex flex-col">
          <SectionLabel as="h3" className="px-2">
            {run.field}
          </SectionLabel>
          <ul className="flex flex-col">
            {run.lines.map((l) => (
              <li key={`${l.group.fieldKey}|${l.text}`}>
                <SnippetLine
                  entityId={entity.id}
                  text={l.text}
                  query={query}
                  note={refsNote(l.refs)}
                  refIds={l.refIds}
                  onActivate={() => onFocusProperty(entity.id, l.group.fieldKey)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Consecutive lines that share a label, as one run. */
export function labelRuns(lines: PropLine[]) {
  const runs: { field: string; lines: PropLine[] }[] = [];
  for (const l of lines) {
    const last = runs[runs.length - 1];
    if (last && last.field === l.group.field) last.lines.push(l);
    else runs.push({ field: l.group.field, lines: [l] });
  }
  return runs;
}

/* ------------------------------------------------------------------ *
 * One snippet
 * ------------------------------------------------------------------ */

/** One excerpt, its terms marked, with a trailing tag: the page and the count
 *  ("p.7 · 2×") for a page, the field's name where a ranked list mixes fields
 *  and pages. A page jumps the document there; a field opens it; a passage
 *  with nowhere to go (a corpus without pages) is passive text.
 *
 *  The button's name is its text, so a screen reader hears the passage and
 *  its page, not only "Page 7". The tag trails the last word, so it stays
 *  next to the sentence it cites and takes no line of its own. */
export function SnippetLine({
  entityId,
  snippet,
  text,
  query,
  label,
  note,
  refIds,
  onJump,
  onActivate,
  trailing,
}: {
  entityId: string;
  /** A page snippet; or `text` for a property's. */
  snippet?: FullTextSnippet;
  text?: string;
  query: string;
  /** Printed in the tag before the page: a field name, or "Document" where a
   *  ranked list has no page to name. */
  label?: string;
  /** Last in the tag: "3 references" for words several references quote. */
  note?: string;
  /** The references whose words these are: their evidence goes on a line
   *  under the excerpt (`LineEvidence`). */
  refIds?: string[];
  onJump?: (id: string, page: number) => void;
  onActivate?: () => void;
  trailing?: ReactNode;
}) {
  const active = useAtomValue(resultsCurrentPageAtom);
  const page = snippet?.page ?? null;
  const hits = snippet?.hits ?? 0;
  const tag = [label, page !== null ? `p.${page}` : null, hits > 1 ? `${hits}×` : null, note].filter(Boolean).join(" · ");
  const body = (
    // `wrap-anywhere`: extracted text carries unbreakable runs (dot leaders,
    // URLs) wider than a narrow pane's line. `dir="auto"`: the excerpt's own
    // script sets its direction, not the UI's.
    <span data-part="excerpt" dir="auto" className="block text-sm text-ink leading-relaxed wrap-anywhere">
      <HighlightedText text={snippet?.text ?? text ?? ""} query={query} />
      {tag && (
        // `bdi dir="ltr"` keeps "p.15 · 2×" in order under RTL without
        // forcing the passage's own direction; a field name is translated, so
        // it takes `auto`.
        <bdi
          dir={label && page === null ? "auto" : "ltr"}
          data-part="tag"
          className="ms-1.5 whitespace-nowrap text-meta font-semibold text-ink-tertiary tabular-nums"
        >
          {tag}
        </bdi>
      )}
    </span>
  );
  const go = page !== null && onJump ? () => onJump(entityId, page) : onActivate;
  const isActive = page !== null && active?.entityId === entityId && active.page === page;
  return (
    <div data-component="SnippetLine" data-variant={go ? undefined : "passive"} className="group/line flex flex-col">
      <div className="flex items-start gap-1">
        {go ? (
          <button
            type="button"
            aria-pressed={page !== null ? isActive : undefined}
            onClick={go}
            className={`min-w-0 flex-1 text-start rounded-md px-2 py-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/25 ${
              isActive ? "bg-parchment" : "hover:bg-warm"
            }`}
          >
            {body}
          </button>
        ) : (
          <span className="min-w-0 flex-1 px-2 py-1">{body}</span>
        )}
        <PassagePin
          entityId={entityId}
          text={snippet?.text ?? text ?? ""}
          page={page ?? undefined}
          refId={refIds?.[0]}
        />
        {trailing && <span className="shrink-0 self-center">{trailing}</span>}
      </div>
      {refIds && refIds.length > 0 && <LineEvidence entityId={entityId} refIds={refIds} />}
    </div>
  );
}

/** "Pin passage": the line's words to the notebook, cited through
 *  `notebookCitations` with their page, or through their reference for a
 *  quote or an annotation. Shown on the line's hover and focus; kept once
 *  pinned. */
function PassagePin({ entityId, text, page, refId }: { entityId: string; text: string; page?: number; refId?: string }) {
  const passage = { entityId, text, ...(page !== undefined ? { page } : {}), ...(refId ? { refId } : {}) };
  const pinned = useAtomValue(passagePinnedAtom(passagePinKey(passage)));
  const toggle = useSetAtom(togglePassagePinAtom);
  return (
    <button
      type="button"
      data-component="PassagePin"
      data-state={pinned ? "on" : "off"}
      aria-pressed={pinned}
      aria-label={pinned ? "Remove passage from notebook" : "Pin passage to notebook"}
      title={pinned ? "Remove passage from notebook" : "Pin passage"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(passage);
      }}
      className={`hit-area shrink-0 mt-1 inline-flex items-center justify-center w-6 h-6 rounded-md transition-[opacity,color,background-color] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40 focus-visible:opacity-100 ${
        pinned
          ? "text-ink hover:bg-parchment"
          : "text-ink-muted hover:text-ink hover:bg-parchment opacity-0 group-hover/line:opacity-100 group-focus-within/line:opacity-100 pointer-coarse:opacity-100"
      }`}
    >
      <Pin size={12} aria-hidden fill={pinned ? "currentColor" : "none"} />
    </button>
  );
}

/** What stands behind a quote or an annotation, under its words: the link's
 *  status chip (it opens `RefEvidenceCard`), a clock off its moment
 *  (`ContestedClock`), the time it opens the recording at (`TimeTag`), and
 *  who reported it and when. Each part self-hides where the reference has
 *  nothing for it. */
function LineEvidence({ entityId, refIds }: { entityId: string; refIds: string[] }) {
  const refs = useMemo(() => snippetReferences(entityId, refIds), [entityId, refIds]);
  if (!refs.length) return null;
  const rated = refs.filter((r) => r.verification);
  const verification = rated.length
    ? rated.every((r) => r.verification === rated[0].verification)
      ? rated[0].verification
      : ("mixed" as const)
    : undefined;
  const clock = refs.find((r) => r.contest?.clock)?.contest?.clock;
  const anchor = refs.find((r) => r.mediaAnchor)?.mediaAnchor;
  const publishers = [...new Set(refs.flatMap((r) => (r.sources ?? []).map(sourcePublisher)))];
  // The earliest report among them, at the precision its source states.
  let first: { t: number; precision: "day" | "month" | "year" } | undefined;
  for (const r of refs) {
    const t = reportedAt(r);
    if (t === undefined || (first && first.t <= t)) continue;
    const src = r.sources?.find((s) => s.published === t);
    first = { t, precision: src?.datePrecision ?? "day" };
  }
  const reported = first ? formatAtPrecision(new Date(first.t * 1000), first.precision) : undefined;
  const words = [
    publishers.length ? publishers.slice(0, 2).join(", ") + (publishers.length > 2 ? ` +${publishers.length - 2}` : "") : undefined,
    reported,
  ].filter(Boolean) as string[];
  if (!verification && !clock && !anchor && !words.length) return null;
  return (
    <div data-part="line-evidence" className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 ps-2 pb-1 text-meta text-ink-tertiary">
      <EvidenceStatus verification={verification} period={refs.find((r) => r.period)?.period} refs={refs} />
      {clock && <ContestedClock deviation={clock.deviation} />}
      {anchor && <TimeTag anchor={anchor} recordingTitle={getEntity(anchor.recordingId)?.title} />}
      {words.map((w, i) => (
        <Fragment key={i}>
          {(i > 0 || verification || clock || anchor) && <Sep />}
          <span className="min-w-0 truncate">{w}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * States around the list
 * ------------------------------------------------------------------ */

/** A centred state in the results' column. */
export function ResultsBlank({ children }: { children: ReactNode }) {
  return (
    <div data-part="blank" className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      {children}
    </div>
  );
}

/** CEJIL is the one corpus that loads: its error, then its loading line. */
export function CorpusLoadState({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  return (
    <ResultsBlank>
      {error ? (
        <>
          <span role="alert" className="text-sm text-ink-tertiary">
            Couldn’t load the CEJIL collection.
          </span>
          <WarmButton onClick={onRetry}>Retry</WarmButton>
        </>
      ) : (
        <>
          <span aria-hidden className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
          <span role="status" className="text-sm text-ink-tertiary">
            Loading the full CEJIL collection…
          </span>
        </>
      )}
    </ResultsBlank>
  );
}

/** No query yet. `hint` says where a query is typed on this surface. */
export function NoSearchState({ hint }: { hint: string }) {
  return (
    <ResultsBlank>
      <Search size={20} className="text-ink-muted" aria-hidden="true" />
      <span className="text-sm font-medium text-ink-secondary">Search to see where terms match</span>
      <span className="text-xs text-ink-tertiary">{hint}</span>
    </ResultsBlank>
  );
}

/** No result for the query. Says so, then offers each switch that would bring
 *  results back, with how many it would return (`zeroResultSuggestions`):
 *  partial words while Match is whole words, every field while Search in is
 *  narrowed, each excluding facet dropped. One click applies one. Clear search
 *  stays last. */
export function ZeroResults({
  query,
  scope,
  suggestions,
  onClearSearch,
}: {
  query: string;
  scope: SearchScope;
  suggestions: readonly ZeroResultSuggestion[];
  onClearSearch: () => void;
}) {
  const setMatch = useSetAtom(librarySearchMatchInputAtom);
  const setScope = useSetAtom(librarySearchScopeInputAtom);
  const filters = useActiveFilters();
  const offers = suggestions.flatMap((sg) => {
    if (sg.kind === "match") return [{ key: "match", label: "Partial words", count: sg.count, apply: () => setMatch("partial") }];
    if (sg.kind === "scope") return [{ key: "scope", label: "Search everywhere", count: sg.count, apply: () => setScope("all") }];
    const chips = filters.filter((f) => f.facetKey === sg.key);
    if (!chips.length) return [];
    return [
      {
        key: `exclude:${sg.key}`,
        label: `Remove “Exclude ${chips[0].group}”`,
        count: sg.count,
        apply: () => chips.forEach((c) => c.remove()),
      },
    ];
  });
  return (
    <ResultsBlank>
      <span dir="ltr" className="text-sm font-medium text-ink-secondary">
        No matches for “{query}”{scope === "all" ? "" : ` in ${SEARCH_SCOPE_LABEL[scope]}`}
      </span>
      {/* Document bodies are scanned from three characters (`fullTextSearch`),
          so a shorter query in Full text can only come back empty. */}
      {scope === "fulltext" && query.length < FULL_TEXT_MIN && (
        <span className="text-xs text-ink-tertiary">Full text search needs at least {FULL_TEXT_MIN}&nbsp;characters.</span>
      )}
      <span data-part="offers" className="flex flex-wrap items-center justify-center gap-2">
        {offers.map((o) => (
          <WarmButton key={o.key} onClick={o.apply}>
            {o.label}: <span className="tabular-nums">{o.count.toLocaleString()}</span>
          </WarmButton>
        ))}
        <WarmButton onClick={onClearSearch}>Clear search</WarmButton>
      </span>
    </ResultsBlank>
  );
}

/** "N more matches hidden by filters · Clear filters". Mounted whatever the
 *  count, so ticking a facet never moves the list; empty, it is invisible
 *  and, `inline`, takes no width. */
export function HiddenByFilters({
  count,
  onClear,
  inline = false,
}: {
  count: number;
  onClear: () => void;
  inline?: boolean;
}) {
  const none = count === 0;
  return (
    <span
      data-part="hidden-by-filters"
      aria-hidden={none}
      className={`text-meta text-ink-tertiary ${inline ? "shrink-0 whitespace-nowrap" : "block pb-2"} ${
        none ? (inline ? "invisible w-0 overflow-hidden" : "invisible") : ""
      }`}
    >
      {count.toLocaleString()} {inline ? "hidden by filters" : `more ${count === 1 ? "match" : "matches"} hidden by filters`}
      <Sep className="mx-1" />
      <button
        type="button"
        onClick={onClear}
        tabIndex={none ? -1 : undefined}
        className="font-medium text-carbon hover:underline cursor-pointer"
      >
        Clear filters
      </button>
    </span>
  );
}

export function WarmButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

export function Sep({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`text-ink-muted ${className}`}>
      ·
    </span>
  );
}
