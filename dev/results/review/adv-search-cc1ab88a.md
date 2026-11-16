# Review: Adv. Search toolbar, commit cc1ab88a (playground)

Reviewed `git show cc1ab88a` (13 files) plus the callers of the search core: `MatchOrigin`,
`DocumentSearchBody`, `HighlightedText`, `DocumentViewer`, `RelationshipsGraphView`,
`switchDataSource`, `libraryViewModeAtom`, `Select`. The clause parser was run with tsx
against `parseSearchQuery` (script in the session scratchpad). I did not run the app.
Findings are ranked most severe first.

## 1. High: Match mode is global module state and leaks out of the Library

`utils/queryTokens.ts:201-206`, set from `atoms/library.ts:70-77`.

`termIn` / `termHit` read `matchMode`, and every caller in the app goes through them:
`highlightRanges` (all `HighlightedText`: relationship rows, tree, graph hover, Settings ›
Thesauri search, EntityPill), `RelationshipsGraphView.matchesQuery` (graph tint), the entity
drawer's Search tab (`DocumentSearchBody` → `buildSnippetsFor`), and the PDF marks
(`DocumentViewer` → `markSearchHits`). The mode is reset only by `clearLibrarySearchAtom`.

Repro (no query needed): Library → View: Adv. Search with an empty box → Match: Whole words
→ open any entity → Document tab, Search "tortur". You get no passages, although partial
matching is the documented rule there and no control on that surface shows the mode. The
Relationships search filters through `useFilteredReferences`, which does not use `termIn`, so
rows still match but their marks disappear. The graph tint follows the mode, so list and graph
disagree. Nothing resets it: with no query there is no search chip whose × would call
`clearLibrarySearchAtom`.

Stale results follow from the same cause: `DocumentSearchBody`'s snippet memo (`:51-60`),
`DocumentViewer`'s `customTextRenderer` (keyed on `termsKey` only, `:86-92`) and
`MatchOrigin`'s `origin` / `snippets` memos (`MatchOrigin.tsx:99-122`) do not key on the
mode, so they keep their old answers after a toggle until something else changes.

Suggested direction (for Code): pass the mode as an argument from the Library paths, or scope
it to the Library's own calls, instead of using module state.

## 2. High: Search in and Match keep narrowing after you leave Adv. Search, with no control or indicator

`atoms/library.ts:458-467` (`libraryViewModeAtom` keeps the query and does not touch the
modifiers). `AdvancedSearchBar` is mounted only in `ResultsMainView` and, on phones, in
`ResultsBody`.

Repro (desktop): CEJIL → search "tortura" → Adv. Search → Search in: Title → View: Cards.
Cards and List show only title matches. The masthead chip shows the query only.
`libraryActiveFilterCountAtom` does not count the modifiers, so the Filters tab has no dot.
The drawer's Results tab returns with Title/Properties/Document chips and Document reads 0,
but nothing says why. The only ways out are to go back to Adv. Search or to end the search.

Related: `snapshotFilterCount` (`savedViews.ts:264-267`) now counts scope and match, but
`libraryActiveFilterCountAtom` does not. Its doc comment says the two counts are the same, and
they now disagree: a saved view reads "2 filters" for a state where the live count was 0.

## 3. Medium: a collection switch keeps Search in: Quotes on a corpus that has no quotes

`switchDataSource` (`atoms/library.ts:988-1007`) keeps the query and the scope.
`Select.tsx:110` falls back to `options[0]` when the value is not among the options.

Repro: Nepal → search "police" → Adv. Search → Search in: Quotes → switch the collection to
CEJIL. `scopedFieldText(…, "quotes")` is "" and `bodyInScope("quotes")` is false, so every
view is empty. The Select's options no longer include Quotes and its trigger reads
"Search in: All", so the control shows the wrong value. In Adv. Search, "No matches … in
Quotes" with "Search everywhere" gets you out. In Cards or List the Library is just empty.
`writeSnapshot` (`savedViews.ts:188`) has the same gap: it accepts `quotes` for any
collection without checking `libraryHasQuotesAtom`, which matters for a link built by hand or
a snapshot captured after this leak.

## 4. Medium: an unclosed quote shows a truncated chip, and removing a chip writes the truncation into the box

`queryTokens.ts:66-73` (existing tokenizer behaviour); this commit exposes it through
`parseClauses` and `withoutClause` (`queryClauses.ts:23-53, 67-69`).

The `\S+` branch matches `"velasq`, and `slice(1, -1)` drops the last letter. With a space,
`"human rights` becomes `"huma` + `rights`. Verified:
- `"velasq` → chip `Exact: "velas"`
- `tortura "human rights` → chips `tortura`, `Exact: "huma"`, `rights`; removing `tortura`
  writes `"huma" rights` into the box, so the user's text is lost.

Before this commit the box kept what was typed. Now any chip × rewrites it.

## 5. Medium-low: adding a clause after a trailing operator joins it to the wrong group

`appendClause` (`queryClauses.ts:93-99`). The box commits on every non-empty keystroke, so
`tortura OR` or `tortura NOT` can be the committed query when a builder button is used.
Verified:
- `a OR` + Exact "x y" → `a OR "x y"` → one Any-of chip instead of a separate Exact chip.
- `a NOT` + Any of "x y" → `a NOT AND x OR y`. The parser keeps `negate` across `AND`, so
  it reads a ∧ ¬x ∧ y: x is excluded and y is required, which is the opposite of what the user
  asked for.

## 6. Low: Search in does not reach MatchOrigin or the title marks

`MatchOrigin.tsx:99-122` calls `hiddenMatchOrigin` and `buildSnippetsFor` with no scope.
`EntityCard` / `HighlightedText` mark titles whatever the scope. Under Search in: Full text,
List rows (and the Adv. Search spine, which uses `MatchOrigin`) still show "Matched in
<property>", and the title is marked, although neither counted toward the match. Under
Title, a row can show the document mark.

On phones, the Results sheet sits over Cards/List. Changing Match there leaves the memoised
`EntityCard`s with marks computed under the old mode, because the `query` prop did not
change.

## 7. Low (plausible, not measured): scope and match changes run outside a transition

`AdvancedSearchBar.tsx:90, 99` set the atoms directly. Each change reruns `filterState`,
`matchTypeBase`, `searchMatchCount`, both brush passes and the facet counts as an urgent
render. The query commit uses `startTransition` (`library.ts:46`) for this reason. On CEJIL
this probably blocks the main thread for the same multi-second task the transition was added
to avoid. Separately, Whole words replaces `includes` with a Unicode lookbehind regex over
every document blob on each keystroke. The "per-keystroke cost is React, not the scan"
measurement in CLAUDE.md was made with `includes` and may not hold in this mode.

## 8. Low: Search in: Full text with a query under 3 characters always returns nothing

`libraryFilter.ts:595-599`: `body = fullTextSearch && bodyInScope(scope)`, `fullTextSearch`
needs `q.length >= 3`, and `meta` is "" under `fulltext`. A query like "19" reads "No matches
for "19" in Full text" even when pages contain it. The gate should be stated in the empty
message, or the scope should not apply below the threshold.

## 9. Low: the builder shows chips for things the parser ignores or does not support

- `NOT * b` → chip `Exclude: *` (the parser drops a lone `*`, so the chip does nothing);
  `a OR * OR b` → `Any of: a, *, b`.
- `(a OR b) c` → `Any of: (a, b)`, `c`. Parentheses are literal characters, so the chip looks
  like grouping is supported when it is not.

## 10. Low: chip × computes from the deferred query

`ResultsMainView` receives `query` (deferred) and `AdvancedSearchBar` passes it to
`withoutClause` and `appendClause`. Two quick edits on CEJIL, both made before the transition
settles, are each computed from the same stale query. The second click overwrites the first
(remove chip 0 twice → only one chip is removed). Reading `libraryQueryAtom` in the bar would
avoid this.

## 11. Low (plausible): gutter rules in the stacked bar

`AdvancedSearchBar.tsx:169`: the add row carries `-ms-2`. CLAUDE.md says "rows carry no
`px-*`/`mx-*`". The ghost buttons (`px-2`) declare no `data-gutter-align`. Check with
`window.__gutter()` on a phone-width Results sheet.

## Checked and clean

- **Round trip.** `tortura NOT Chile AND Peru OR Colombia` parses as tortura ∧ ¬Chile ∧
  (Peru ∨ Colombia), which is what the chips say. It serialises to `tortura NOT Chile Peru OR
  Colombia`, which gives the same parse. These also give the same parse and the expected chips:
  two Any-of groups (`… AND Bolivia OR Ecuador`); an Exclude of a phrase (`NOT "desaparición
  forzada"`); an Exclude of two words (two Exclude chips); and the hand-typed `a OR b c`,
  `a NOT b OR c`, `a OR NOT b`, `NOT a OR b`, `a AND OR b`, `a OR b NOT c OR d`, and
  trailing `OR` / `NOT`. Removing the middle chip (`Exclude: Chile`) gives
  `tortura Peru OR Colombia`. The only defects found are items 4, 5 and 9.
- **Old snapshots.** Views and links without `searchScope` / `searchMatch` open with
  `all` / `partial` (`writeSnapshot` `:188-189`). An unknown scope value falls back to `all`.
  `facetKey` defaults both keys, so old and new history entries for the same search dedupe.
- **Memos keyed on terms in the Library.** `searchTerms`, `searchQuery`, `categoriesOf`,
  `scoreOf`, `filterState`, `matchTypeBase`, `searchMatchCount`, both brush memos,
  `LibraryFilters`' facet state and the ResultsBody / ResultsMainView snippet memos all re-run
  on a mode or scope change. Relevance's `bodyHitsCache` now keys on the mode.
- **Scope agreement inside the Library.** `matchesSearch`, `matchCategoriesWithTerms`,
  `buildSnippetsFor`, `entitySearchParts` / `scoreRelevance` and the facet counts all take the
  same scope, so the Results / List / Cards sets and their counts agree. Item 6 is the
  exception.
- **Quotes is hidden where no entity carries `quote:` fields** (`libraryHasQuotesAtom`).
  Items 3 and the `writeSnapshot` case are where it still applies.
- **Bert** does not call `termIn` / `termHit`, so the match mode does not reach it.
- **Per-keystroke cost.** `ResultsBody` is still `memo`'d, and its call site
  (`LibraryView.tsx:1644-1663`) passes stable callbacks with no inline arrows.
  `matchTypeCounts` is still memoised. `EntityCard` still receives the deferred query as a
  prop.
- **Accessibility.** Each chip's × is named "Remove from search: <label>". The chip row is
  `role="list"` with list items. The composer input's Escape calls `preventDefault()` and
  `stopPropagation()`. The add buttons expose `aria-pressed`. The selects have `ariaLabel`.
- **Layout.** Bar rows are fixed at `h-8`. The composer replaces the chips in the same row, and
  the hidden-by-filters line stays mounted and is hidden with `invisible`. The one shift is the
  bar appearing when CEJIL finishes loading (`Frame bar={null}`), which is a loading
  transition.
