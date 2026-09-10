import { startTransition } from "react";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, libraryEntitiesAtom, type DataSource } from "./dataSource";
import { languageAtom } from "./language";
import { breakpointAtom } from "./viewport";
import { distinctFieldLabels } from "../utils/entityFields";
import { listColumnOptions } from "../components/library/listColumns";
import {
  optionsFor,
  type DisplayContext,
  type DisplayValue,
  type DisplayValues,
  type LibraryViewMode,
} from "../data/libraryDisplay";

/** The COMMITTED library search — what every consumer filters, ranks, marks and
 *  counts by. Read this one everywhere; only the search input itself binds to
 *  the draft below. */
export const libraryQueryAtom = atom("");

/** What is currently TYPED in the search box, which is not the same thing as
 *  what you are searching for.
 *
 *  Emptying the box used to empty the results with it: you cleared the text to
 *  type something else, or just to see the row underneath, and the entire result
 *  set — with its facets, its counts and its snippets — evaporated mid-read. So
 *  the two are split. Every non-empty draft commits immediately, so live search
 *  is unchanged; an EMPTY draft commits nothing, leaving the last real search
 *  standing. The committed query is dismissed deliberately, by its chip in
 *  ACTIVE FILTERS or by Clear all — never as a side effect of an empty box. */
const searchDraftStateAtom = atom("");
export const librarySearchDraftAtom = atom(
  (get) => get(searchDraftStateAtom),
  (get, set, next: string) => {
    // The DRAFT is urgent: it is the text in the box, and a character that
    // appears a frame after you typed it is the one thing search must never do.
    set(searchDraftStateAtom, next);
    // The COMMIT is not. Committing drives filter → rank → count → snippets over
    // the whole corpus, and running that synchronously inside the keystroke is
    // what put 2.6s tasks on the main thread. As a transition React can abandon
    // it when the next keystroke arrives, and keeps showing the previous results
    // until the new ones are ready — see `useDeferredValue` in `LibraryView`.
    if (next.trim())
      startTransition(() => {
        // Becoming active is the moment the FIRST character commits — from here
        // on the query is only being refined, and a view that jumped on every
        // keystroke would be a view you can't leave.
        const becomingActive = !get(libraryQueryAtom).trim();
        set(libraryQueryAtom, next);
        if (becomingActive) set(enterSearchResultsAtom);
      });
  },
);

/** Drop the search for real: empties the box AND the committed query, and puts
 *  the library back in the view the search took it out of. The only route back
 *  to "no search" — the box's own X clears just the text. */
export const clearLibrarySearchAtom = atom(null, (get, set) => {
  set(searchDraftStateAtom, "");
  set(libraryQueryAtom, "");
  const prior = get(preSearchViewModeAtom);
  // Only if the search is still where it put you: having walked to another view
  // yourself, you are not returned from it.
  if (prior && get(viewModeStateAtom) === "results") set(viewModeStateAtom, prior);
  set(preSearchViewModeAtom, null);
  set(searchModeOverriddenAtom, false);
});

/** The running search, or `null` — the search as its OWN state, deliberately not
 *  folded into the filter count.
 *
 *  A search is not a facet. You run it from the search box at the top of the
 *  results, not from the Filters panel, and counting it there made the Filters
 *  tab claim custody of something it doesn't hold: type a query having ticked
 *  nothing, and the tab wore a "1" and an attention dot over a panel with every
 *  box unticked. The dot means "something you set is still on BACK HERE", and
 *  the search was never back there. This is what the Results page's
 *  active-search element reads instead. */
export const libraryActiveSearchAtom = atom(
  (get) => get(libraryQueryAtom).trim() || null,
);

/** Recent searches — the queries you actually ran, newest first.
 *
 *  SESSION storage, following `appViewAtom`'s reasoning exactly: a reload should
 *  keep your place, but a visit should start clean. In localStorage this list
 *  would hand every later visitor of a shared prototype the last person's
 *  research questions, which is a different feature (and a worse one).
 *
 *  What gets recorded is a COMMITTED, SETTLED query — see `recordSearchAtom`.
 *  Recording per keystroke would fill the log with "v", "ve", "vel" and bury the
 *  one entry anybody wanted. */
const searchHistoryJSON = createJSONStorage<string[]>(() => sessionStorage);
export const librarySearchHistoryAtom = atomWithStorage<string[]>(
  "uwazi:searchHistory",
  [],
  searchHistoryJSON,
  { getOnInit: true },
);

/** How many searches the log keeps. Small on purpose: it is a way back to what
 *  you just did, not an archive — past ~8 you scan it slower than you retype. */
export const SEARCH_HISTORY_CAP = 8;
/** Below this, a query isn't worth remembering (and is faster to retype). */
export const MIN_LOGGED_QUERY = 2;

/** Record a search. Deduped case-insensitively — re-running an old query moves
 *  it back to the top rather than listing it twice — and capped. */
export const recordSearchAtom = atom(null, (get, set, raw: string) => {
  const q = raw.trim();
  if (q.length < MIN_LOGGED_QUERY) return;
  const rest = get(librarySearchHistoryAtom).filter(
    (h) => h.toLowerCase() !== q.toLowerCase(),
  );
  set(librarySearchHistoryAtom, [q, ...rest].slice(0, SEARCH_HISTORY_CAP));
});

/** Forget one entry (its × ) or the lot (Clear all). */
export const forgetSearchAtom = atom(null, (get, set, q: string) => {
  set(
    librarySearchHistoryAtom,
    get(librarySearchHistoryAtom).filter((h) => h !== q),
  );
});
export const clearSearchHistoryAtom = atom(null, (_get, set) => {
  set(librarySearchHistoryAtom, []);
});

/** Selected entity-type facets (typeId → on). Empty = all types. */
export const libraryTypeFiltersAtom = atom<Record<string, boolean>>({});

/** "Has document" facet toggle. */
export const libraryHasDocAtom = atom(false);

/** Publishing-status facet: keys "published" / "restricted". */
export const libraryStatusFiltersAtom = atom<Record<string, boolean>>({});

/** Mobile filters drawer open state (the sidebar is persistent on desktop). */
export const libraryFiltersOpenAtom = atom(false);

/** Entity previewed in the right drawer. null → the drawer shows Filters. */
export const librarySelectedEntityIdAtom = atom<string | null>(null);

/** The Results-tab full-text page the user last jumped to. Lives here (not in the
 *  drawer subtree, which unmounts while a preview shows) so its spine node stays
 *  lit + `aria-pressed` when the user closes the preview and lands back on the
 *  Results list — the fix for the otherwise-unreachable active state. */
export interface ResultsActivePage {
  entityId: string;
  page: number;
}
export const resultsActivePageAtom = atom<ResultsActivePage | null>(null);

/** Which KINDS of match the results keep — the Results tab's title/properties/
 *  document chips.
 *
 *  DECISION (2026-07-21): these are a real FILTER, not a panel-local view toggle,
 *  so they narrow the LEFT PANE too. A researcher who turns off "Document" is
 *  saying "show me entities that matched in their metadata", and a grid that kept
 *  showing full-text-only hits would contradict the panel beside it — the two
 *  panes are one result set at two levels of detail. Living in the filter state
 *  also makes the Results header count correct by construction (it counts the
 *  filtered set) rather than needing a separate "N of M" reconciliation.
 *
 *  They are query-relative, so they no-op without a query and reset whenever the
 *  query changes — that keeps them from becoming an invisible sticky filter. */
export interface MatchTypeFilters {
  title: boolean;
  properties: boolean;
  document: boolean;
}
export const ALL_MATCH_TYPES: MatchTypeFilters = {
  title: true,
  properties: true,
  document: true,
};
export const matchTypeFiltersAtom = atom<MatchTypeFilters>(ALL_MATCH_TYPES);

/** A Results-tab "Properties" hit the user clicked: open the entity preview on
 *  its Metadata tab and flash the matching field. Matched by field KEY (stable,
 *  not the localized label) against the drawer's `MetadataField.id`. The metadata
 *  body clears it once it has scrolled + flashed. */
export interface FocusMetadataField {
  entityId: string;
  fieldKey: string;
  /** Bumped on every request, and the reason this is not a plain object.
   *
   *  The record CLEARS the request once it has scrolled and flashed, which is
   *  right — a focus is an event, not a state. But clicking the same property
   *  twice writes an equal-looking value, and without something that differs
   *  the second write is indistinguishable from the first for any consumer that
   *  compares. The nonce is the `pageJumpAtom` / `fillRequestAtom` idiom the
   *  app already uses wherever an atom carries a request rather than a value. */
  nonce: number;
}
export const focusMetadataFieldAtom = atom<FocusMetadataField | null>(null);

/** Ask the record to scroll to a field and flash it. THE way to raise a focus
 *  request — it stamps the nonce, so no caller has to remember to. */
let focusNonce = 0;
export const requestMetadataFocusAtom = atom(
  null,
  (_get, set, req: { entityId: string; fieldKey: string }) => {
    set(focusMetadataFieldAtom, { ...req, nonce: ++focusNonce });
  },
);

/** A map cluster opened in the drawer — the entities located at one place. */
export interface LibraryCluster {
  label: string;
  ids: string[];
}
export const librarySelectedClusterAtom = atom<LibraryCluster | null>(null);

/** Keyword-style Countries facet: selected country names + match mode. */
export const libraryCountryFiltersAtom = atom<Record<string, boolean>>({});
export type FacetMode = "AND" | "OR";
export const libraryCountryModeAtom = atom<FacetMode>("OR");

/** Keyword-style Descriptores (violations) facet — CEJIL property facet. The
 *  mode mirrors the Countries facet: "OR" = entity has any selected descriptor,
 *  "AND" = entity has all of them (meaningful — an entity carries several). */
export const libraryDescriptorFiltersAtom = atom<Record<string, boolean>>({});
export const libraryDescriptorModeAtom = atom<FacetMode>("OR");

/** Date-range property filter (the entity's representative date, e.g. CEJIL
 *  `Fecha`). ISO `yyyy-mm-dd` strings; "" = open-ended on that side. Mirrors
 *  Uwazi's per-property DateFilter (a from/to range). */
export const libraryDateFromAtom = atom<string>("");
export const libraryDateToAtom = atom<string>("");

/** Dynamic facets generated from INHERITED relationship properties (e.g. a
 *  person's Role, a case's Region) — keyed `inheritProperty → (value → on)`.
 *  Mirrors Uwazi, where an inherited relationship property becomes a filter. */
export const libraryInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Relationship-CHAIN facet selections (CEJIL only) — keyed `${chainId}:${seg}`
 *  → (value → on). Several keys of one chain combine path-coupled (a single
 *  traversed path must satisfy them all). See utils/chainTraversal.ts. */
export const libraryChainFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Results layout. `results` is the evidence view promoted out of the drawer: it
 *  reads the same `buildSnippetsFor` output the Results tab does, at full width.
 *  It stays selectable with no query (the switcher may not gain and lose a
 *  segment as you type — that shifts every control beside it); the view renders
 *  its own "search to see where terms match" state instead.
 *
 *  The mode list itself lives in `data/libraryDisplay` — it keys the option
 *  registry, so the registry is where a new mode has to be declared or it would
 *  be a mode with no options and no way to notice. */
export type { LibraryViewMode };

/** Where the library was before a search took it to Results, and whether the
 *  reader has overruled that for the current query. Both are cleared when the
 *  search is dismissed, so the next search starts the behaviour over. */
const preSearchViewModeAtom = atom<LibraryViewMode | null>(null);
const searchModeOverriddenAtom = atom(false);

const viewModeStateAtom = atom<LibraryViewMode>("cards");

/** The library's view mode.
 *
 *  Writing it is also how the reader overrules the search's own choice of view:
 *  leaving Results while a query is running says "not for this search", so the
 *  query stops steering AND stops restoring at the end of it — being returned to
 *  a mode you had already walked away from is the same interruption in reverse.
 *  A search that starts again after a dismissal steers again. */
export const libraryViewModeAtom = atom(
  (get) => get(viewModeStateAtom),
  (get, set, next: LibraryViewMode) => {
    if (next !== "results" && get(libraryQueryAtom).trim()) {
      set(searchModeOverriddenAtom, true);
      set(preSearchViewModeAtom, null);
    }
    set(viewModeStateAtom, next);
  },
);

/** A query has become active: show the evidence.
 *
 *  Results answers "why is this row here?", which is the question a search just
 *  asked — so a search opens it instead of leaving it as a mode you have to know
 *  about. It remembers the mode it displaced, and `clearLibrarySearchAtom` puts
 *  it back; the view keeps its own no-query state, because it stays selectable
 *  with nothing typed. It lives here, in the atom that commits the query, rather
 *  than in an effect watching the query from a component: the switch is part of
 *  the search starting, not a consequence some mounted view happens to notice. */
const enterSearchResultsAtom = atom(null, (get, set) => {
  if (get(searchModeOverriddenAtom)) return;
  const mode = get(viewModeStateAtom);
  if (mode === "results") return;
  set(preSearchViewModeAtom, mode);
  set(viewModeStateAtom, "results");
});

/** Results body flavour — four readings of the same snippets:
 *  - `grouped`   one wide card per entity: its matched properties beside its
 *                document passages (the drawer's card, given room)
 *  - `tree`      entity → matched field → its snippets, collapsible at both levels
 *  - `passages`  every matching passage as one flat ranked list, entity secondary
 *                — the reading view
 *  - `spine`     passages on a proportional time axis, each entity carrying its
 *                strongest one */
export type ResultsLayout = "grouped" | "tree" | "passages" | "spine";

/** Timeline body flavour — four ways to read the same chronology:
 *  - `rail`     the text-references minimap on a vertical time track: dots and
 *               counted clusters that fan out into their members. Navigation —
 *               clicking picks an entity, it does not filter.
 *  - `density`  the same track as a volume histogram; clicking a bar FILTERS the
 *               Library to that period.
 *  - `spine`    a proportional chronology — every entity at its exact instant
 *  - `lanes`    a template × period grid */
export type TimelineLayout = "rail" | "density" | "spine" | "lanes";

/** How many metadata properties a card draws.
 *
 *  It replaced a boolean. `Metadata: on/off` answered only "all or nothing",
 *  and the interesting question — how much of a record a card should carry —
 *  had been answered by a constant in the code (three, then five) that nobody
 *  could see or change. A template's property count is not the app's business
 *  to cap; it is the reader's to choose. `none` is the old `off`. */
export type CardFields = "none" | "3" | "5" | "all";
export const DEFAULT_CARD_FIELDS: CardFields = "all";

/** The choice as a number of lines, or null for "every one this entity has". */
export function cardFieldLimit(v: CardFields): number | null {
  return v === "none" ? 0 : v === "all" ? null : Number(v);
}

/** Thumbnail rendering — how tall the preview slot is drawn and how an image
 *  sits inside it.
 *
 *  Two steps, not three. The band was 64 / 96 / 144px and the top of that ramp
 *  is where a document first reads as a document; below it a page is a grey
 *  smudge with a PDF tag on it, which is not a preview of anything. So 144 is
 *  the BASE now (`m`, the default) and `l` is the one step above it. The old
 *  small was cut rather than renamed: a control whose first option nobody should
 *  pick is a control with a wrong default. */
export type ThumbSize = "m" | "l";

/** The SHAPE of the slot, for the whole grid at once — never per card, or rows
 *  stop lining up and the grid ragged-edges the way it did before the slot was
 *  reserved at all. `landscape` is the wide band the cards have always had;
 *  `portrait` is a taller slot for a corpus that is mostly standing figures (the
 *  artworks sample runs 30 portrait to 22 landscape) — drawn as a centred 3:4
 *  frame under `auto`/`contain`, and as a tall full-width band under an explicit
 *  `cover`, where the instruction is to fill and a frame would only mat.
 *  Size scales BOTH: a portrait frame at size N is as tall as a landscape one at
 *  N+1, which is what keeps the two orientations feeling like one control. */
export type ThumbFrame = "landscape" | "portrait";

/** How an IMAGE sits in its slot — documents keep their cropped-sheet framing
 *  whatever this says. `auto` is the ratio-decides rule, now read against the
 *  FRAME: an image whose orientation matches the frame covers it, anything else
 *  is matted (a square never matches, so it mats in both). `cover`/`contain`
 *  force one treatment for every ratio. */
export type ThumbFit = "auto" | "cover" | "contain";

/** How much air a list row gets. Height and padding ONLY — the type never
 *  shrinks, so compact stays on the 11px floor the rest of the app keeps. */
export type ListDensity = "comfortable" | "compact";

/** Track scope, mirroring the document minimap's whole-document / this-page
 *  toggle: `all` plots the entire corpus span, `year` zooms the track to the
 *  year you're currently reading (months, with ↑/↓ counts for the rest). */
export type TimelineScope = "all" | "year";
export const libraryTimelineScopeAtom = atom<TimelineScope>("all");

// ── Display options ──────────────────────────────────────────────────────────

/** EVERY Display-menu value, in one store, shaped the way the registry is.
 *
 *  It used to be six atoms plus a five-key `libraryInfoAtom` that cards and the
 *  list table SHARED — so "Country" was one switch over a card's subtitle and a
 *  table column that have nothing to do with each other, and the table could
 *  only ever offer the three columns that record happened to have keys for.
 *
 *  Now: `modes` holds each view's own answers, `shared` holds the handful that
 *  are genuinely global. Both are SPARSE — an absent key means "still on its
 *  registry default", which is what lets a default change without migrating
 *  anybody's session, and what makes "is this off its default?" a real question
 *  rather than a comparison against a hard-coded guess.
 *
 *  Session state, deliberately: the menu's dot already advertises anything off
 *  its default, so a reload starting clean is the contract the info toggles
 *  always kept. */
export interface LibraryDisplayState {
  modes: Partial<Record<LibraryViewMode, DisplayValues>>;
  shared: DisplayValues;
}
export const libraryDisplayAtom = atom<LibraryDisplayState>({ modes: {}, shared: {} });

/** The property labels the current corpus carries, for the list's optional
 *  metadata columns. Derived, so it recomputes only when the source's entity
 *  array or the language changes — never per keystroke — and capped, because
 *  this is a MENU and menus must be stable and cheap. */
export const libraryFieldLabelsAtom = atom((get) =>
  distinctFieldLabels(get(libraryEntitiesAtom), get(languageAtom)),
);

/** What the registry needs to know that it can't: the viewport, whether a query
 *  is running, and the columns this corpus can offer. One atom, so the menu, the
 *  dot and the table all resolve the same option list. */
export const libraryDisplayContextAtom = atom<DisplayContext>((get) => {
  const hasQuery = get(libraryQueryAtom).trim().length > 0;
  return {
    isMobile: get(breakpointAtom) === "mobile",
    hasQuery,
    listColumns: listColumnOptions({ hasQuery, fieldLabels: get(libraryFieldLabelsAtom) }),
  };
});

/** Read one option for one mode, falling back to its registry default. */
function readOption(
  state: LibraryDisplayState,
  mode: LibraryViewMode,
  id: string,
  scope: "mode" | "shared",
  fallback: DisplayValue,
): DisplayValue {
  const bag = scope === "shared" ? state.shared : state.modes[mode];
  return bag?.[id] ?? fallback;
}

/** A read/write atom over one option of the CURRENT view mode.
 *
 *  Resolving against `libraryViewModeAtom` rather than taking a mode argument is
 *  what keeps the split invisible to consumers: a card is only ever mounted
 *  inside the view whose options govern it, so "the current mode" and "my mode"
 *  are the same mode. The menu writes the view you are looking at; the view
 *  reads the view it is. */
function displayOption<T extends DisplayValue>(
  id: string,
  scope: "mode" | "shared",
  fallback: T,
) {
  return atom(
    (get) => readOption(get(libraryDisplayAtom), get(libraryViewModeAtom), id, scope, fallback) as T,
    (get, set, next: T | ((prev: T) => T)) => {
      const mode = get(libraryViewModeAtom);
      const state = get(libraryDisplayAtom);
      const prev = readOption(state, mode, id, scope, fallback) as T;
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      set(
        libraryDisplayAtom,
        scope === "shared"
          ? { ...state, shared: { ...state.shared, [id]: value } }
          : {
              ...state,
              modes: { ...state.modes, [mode]: { ...state.modes[mode], [id]: value } },
            },
      );
    },
  );
}

export const DEFAULT_RESULTS_LAYOUT: ResultsLayout = "grouped";
export const DEFAULT_TIMELINE_LAYOUT: TimelineLayout = "rail";
export const DEFAULT_THUMB_SIZE: ThumbSize = "m";
export const DEFAULT_THUMB_FRAME: ThumbFrame = "landscape";
export const DEFAULT_THUMB_FIT: ThumbFit = "auto";
export const DEFAULT_LIST_DENSITY: ListDensity = "comfortable";
export const DEFAULT_TIME_HUB = true;

export const libraryResultsLayoutAtom = displayOption<ResultsLayout>(
  "resultsLayout",
  "mode",
  DEFAULT_RESULTS_LAYOUT,
);
export const libraryTimelineLayoutAtom = displayOption<TimelineLayout>(
  "timelineLayout",
  "mode",
  DEFAULT_TIMELINE_LAYOUT,
);
const thumbSizeStateAtom = displayOption<ThumbSize>("thumbSize", "mode", DEFAULT_THUMB_SIZE);
/** Reads through a validity check, because the stored value outlives the option
 *  list: a session that had picked the old Small still holds `"s"`, and an
 *  unknown key indexes the size tables to `undefined` — a card with no band
 *  height at all. Anything not on the current list reads as the default. */
export const libraryThumbSizeAtom = atom(
  (get) => {
    const v = get(thumbSizeStateAtom);
    return v === "m" || v === "l" ? v : DEFAULT_THUMB_SIZE;
  },
  (_get, set, next: ThumbSize) => set(thumbSizeStateAtom, next),
);
export const libraryThumbFrameAtom = displayOption<ThumbFrame>(
  "thumbFrame",
  "mode",
  DEFAULT_THUMB_FRAME,
);
export const libraryThumbFitAtom = displayOption<ThumbFit>("thumbFit", "mode", DEFAULT_THUMB_FIT);
export const libraryListDensityAtom = displayOption<ListDensity>(
  "density",
  "mode",
  DEFAULT_LIST_DENSITY,
);
/** The time strip charts the whole result set, so it is one switch for every
 *  mode — the only `shared` toggle in the registry. */
export const libraryTimeHubAtom = displayOption<boolean>("timeStrip", "shared", DEFAULT_TIME_HUB);

/** What a CARD carries, for whichever mode is drawing cards. Replaces the old
 *  `libraryInfoAtom`, which the list table also read. */
export const libraryCardInfoAtom = atom((get) => {
  const state = get(libraryDisplayAtom);
  const mode = get(libraryViewModeAtom);
  const read = (id: string) => readOption(state, mode, id, "mode", true) !== false;
  const fieldsRaw = readOption(state, mode, "cardFields", "mode", DEFAULT_CARD_FIELDS);
  const fields: CardFields =
    fieldsRaw === "none" || fieldsRaw === "3" || fieldsRaw === "5" || fieldsRaw === "all"
      ? fieldsRaw
      : DEFAULT_CARD_FIELDS;
  return {
    preview: read("preview"),
    /** Kept as the boolean the surfaces already ask for — it is now derived from
     *  the count rather than stored beside it, so the two can never disagree. */
    metadata: fields !== "none",
    fields,
    country: read("country"),
    date: read("date"),
    connections: read("connections"),
  };
});

/** Is a given list column drawn? Columns default from their own spec, so a
 *  column added to `LIST_COLUMNS` arrives switched on (or off) without anyone
 *  editing this. */
export const libraryListColumnsAtom = atom((get) => {
  const bag = get(libraryDisplayAtom).modes.list;
  const defaults = new Map(
    get(libraryDisplayContextAtom).listColumns.map((o) => [o.id, o.default]),
  );
  return (id: string) => (bag?.[id] as boolean | undefined) ?? defaults.get(id) ?? false;
});

/** Does any control THE MENU IS SHOWING sit off its default?
 *
 *  One fold over the registry, which is the point: every term is gated by the
 *  same data that renders its section, so the dot can never point at a control
 *  this mode hides. Hiding Thumbnail in Cards then switching to Results used to
 *  leave it lit over a menu with no "Show information" in it, and no way to
 *  clear it.
 *
 *  `external` options are excluded, which is a deliberate change: the old
 *  expression lit the dot for a non-default SORT on mobile. The dot is for state
 *  HIDDEN behind the trigger, and sort is not hidden — it has its own control,
 *  with its own visible checkmark, inside the very menu the dot is pointing at
 *  (and its own labelled Select in the toolbar everywhere else). Counting it
 *  would also make "Reset this view" a lie, since sort is shared across every
 *  mode and resetting one view's display has no business changing it. */
export const libraryDisplayModifiedAtom = atom((get) => {
  const state = get(libraryDisplayAtom);
  const mode = get(libraryViewModeAtom);
  const ctx = get(libraryDisplayContextAtom);
  return optionsFor(mode, ctx).some(
    (o) =>
      o.scope !== "external" &&
      readOption(state, mode, o.id, o.scope, o.fallback) !== o.fallback,
  );
});

/** Put this mode back to the registry's answers, leaving every other mode
 *  alone. Shared options are left alone too — they aren't this mode's to reset. */
export const resetLibraryDisplayAtom = atom(null, (get, set) => {
  const mode = get(libraryViewModeAtom);
  const state = get(libraryDisplayAtom);
  const modes = { ...state.modes };
  delete modes[mode];
  set(libraryDisplayAtom, { ...state, modes });
});

/** Sort order. */
export type LibrarySort =
  | "recent"
  | "title"
  | "connections"
  | "type"
  | "country";
export const DEFAULT_LIBRARY_SORT: LibrarySort = "recent";
export const librarySortAtom = atom<LibrarySort>(DEFAULT_LIBRARY_SORT);
export type LibrarySortDir = "asc" | "desc";
export const librarySortDirAtom = atom<LibrarySortDir>("desc");
/** Natural direction for a freshly-picked sort key: text → A→Z, value → high→low. */
export const defaultSortDir = (key: LibrarySort): LibrarySortDir =>
  key === "title" || key === "type" || key === "country" ? "asc" : "desc";

/** Switch collection. Template ids, countries and descriptors are per-source, so
 *  every facet and the open preview have to go with it — this lives in an atom
 *  (not in the view) because the collection picker now sits in the navbar, and
 *  two call-sites clearing "most of" the facets would drift. */
export const selectDataSourceAtom = atom(null, (_get, set, source: DataSource) => {
  set(dataSourceAtom, source);
  set(libraryTypeFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryStatusFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(librarySelectedEntityIdAtom, null);
  set(librarySelectedClusterAtom, null);
});

/** Clear every filter. ONE definition: the Filters panel and the view each had
 *  their own, and they had already drifted — the panel's forgot the search box,
 *  the view's forgot the AND/OR modes. */
/** Clear the facet filters but KEEP the query — for the Results tab's "hidden by
 *  filters · Clear filters" line, which widens the facets to reveal the matches
 *  the current query found but the facets excluded. */
export const clearLibraryFacetsAtom = atom(null, (_get, set) => {
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryCountryModeAtom, "OR");
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDescriptorModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
});

export const clearLibraryFiltersAtom = atom(null, (_get, set) => {
  // BOTH halves of the search: clearing only the committed query would leave the
  // box still holding text that no longer filters anything, and the next
  // keystroke would silently re-commit the old string.
  set(clearLibrarySearchAtom);
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryCountryModeAtom, "OR");
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDescriptorModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
});

/** Count of active FACETS — types, has-doc, status, countries, descriptors,
 *  dates, inherited and chain values. The search is NOT one of them: see
 *  `libraryActiveSearchAtom`. This is what the Filters tab's count and dot read,
 *  so both describe the panel's own state and nothing else.
 *
 *  Surfaces that LIST the filters (the Active-filters sheet and the action-bar
 *  popover) show the search alongside the facets, so they size themselves off
 *  `useActiveFilters().length` — the real length of what they render — rather
 *  than this. Counting from the list is how they stay honest either way. */
export const libraryActiveFilterCountAtom = atom((get) => {
  let n = Object.values(get(libraryTypeFiltersAtom)).filter(Boolean).length;
  if (get(libraryHasDocAtom)) n += 1;
  n += Object.values(get(libraryStatusFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryDescriptorFiltersAtom)).filter(Boolean).length;
  if (get(libraryDateFromAtom) || get(libraryDateToAtom)) n += 1;
  for (const vals of Object.values(get(libraryInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  for (const vals of Object.values(get(libraryChainFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  return n;
});

/** Is ANYTHING narrowing the results — a facet or the search?
 *
 *  What the "nothing matched" escape hatches gate on (the map's and the time
 *  brush's Clear buttons), because those clear both. Gating them on the facet
 *  count alone would strand the one case they exist for: a search that matches
 *  nothing, with no facets ticked, offering no way out of an empty screen. */
export const libraryHasNarrowingAtom = atom(
  (get) => get(libraryActiveFilterCountAtom) > 0 || get(libraryActiveSearchAtom) !== null,
);
