# Library Results view audit (branch `playground`)

Paths are relative to `app/src/`. Everything below was read in code; nothing was run in a browser. Line numbers are from HEAD of `playground` (80ea4e94).

## 1. Data path and ranking

- Entity set: `LibraryView.tsx:467` `matchTypeBase` (facets + search, chips not applied) → `:472` `filtered` (chips applied via `passesMatchTypes`, `utils/libraryFilter.ts:264`) → sorted at `:505` by `scoreOf(e).score` when sort = relevance, otherwise by the chosen sort key. The Results view receives `filtered` as `entities` (`:926`).
- Score (`utils/relevance.ts`): exact title +1000, title prefix +150, title run +60; +100 per query term hit anywhere; per term, best field weight (title 12, property 5, own document 2, borrowed document 0.4) × (1+log2 hits), halved if no whole-word hit; connections ≤0.5 and recency ≤0.4 as tie-breakers. Ties go to type name, then title (`LibraryView.tsx:508`).
- `EntitySnippets` (`utils/librarySnippets.ts:68`) carries: `count` (metadata field groups + matched pages, NOT occurrences), `metadata[{field, fieldKey, texts[1]}]`, `fullText[{page|null, text, hits}]` capped at `MAX_FULLTEXT=5` (passages layout 8), `fullTextTotal` (every matched page), `borrowedFrom`.
- Snippets are built only for the visible slice: `ResultsMainView.tsx:238` `cappedResults`, entities `slice(0, visible)`, `STEP = 24` (`:69`). Drawer: `ResultsBody.tsx:18` `RESULTS_STEP = 40`. "Show more" adds a page; there is no total-ordered pagination or virtualisation.
- `MatchCategories` (`librarySnippets.ts:576`): three booleans. Used only for the chip gate and chip counts (`LibraryView.tsx:526`), never per row.

## 2. What each layout shows

| | grouped (`ResultsMainView.tsx:443`) | tree (`:621`) | passages (`:819`) | spine (`:1028`) |
|---|---|---|---|---|
| unit | entity card | entity → field/Document branch → leaves | one row per passage (property or page) | one 22px row per entity, plotted by date |
| title | marked, opens preview | marked, in shared card shell | marked, under the quote | marked, max 18rem |
| count badge | `snippets.count` (`:504`) | `snippets.count` via shell | none | `snippets.count` (`:1108`) |
| type | chip + type name (`:489`, `:507`) | colour dot only | colour dot only | colour dot only |
| country / year | yes (`:507`, `:517`) | no | no | date gutter only |
| property hits | left column, field label + excerpt | branch per field, count = 1 always (`:666`) | row, field label | first property only if no document hit (`bestPassage :1161`) |
| document hits | up to 5 excerpts, "3 of 41 pages", Show all (`:588`) | branch with "5 of 23 shown" note, no control | up to 8 per entity, `p.N`, `N×`, "Document" | densest page only, `Document · p.N · N×` |
| page tag / jump | yes (`PassageRow :1206`) | yes | yes | yes when page non-null |
| hits per page | `N×` in tag | same | `N×` | `N×` on best only |
| borrowedFrom | `↳ from` on section label (`:569`) | on branch header (`:699`) | on every row (`:993`) | in fixed 14rem slot (`:1127`) |
| MatchedTerms (term → field) | full (`:526`) | missed terms only (`:716`) | none | none |
| ordering | entity rank | entity rank | flat, resorted by `hits` desc (`:881`) | by date (`TimeSpine.tsx:166`), rank not visible |
| Show all pages | yes (per entity) | no | no ("open an entity", `:1005`) | no |

Drawer tab (`EntityResultCard.tsx`): one layout, card per entity with Properties (including the Title snippet, unlike the main view) and Document spine (`PageSpine`), MatchedTerms, page count + Show all, Collapse/Expand all. 40 per page.

`MatchOrigin` is not used in Results at all; it serves the Library list table and timeline Spine (`MatchOrigin.tsx`). It builds a 1-snippet popover on hover and shows `MatchedTerms`.

## 3. Computed but not used by any layout

- `RelevanceBreakdown.covered / terms / exactTitle / fields / score` (`relevance.ts:57`): nothing outside `relevance.ts` reads them (grep). Only `perTerm` is read, by `MatchedTerms`. Deliberate for `score` ("never how well"), but `exactTitle` and `covered` are plain facts.
- `TermAttribution.ownDocumentHits` (`relevance.ts:49`, capped at 64): no reader. This is the only per-term occurrence count in the codebase and nothing shows it.
- Per-term counts per field: `countHits` runs for every term × field inside `scoreRelevance` and the results are dropped after picking the best field. No way to say "3 in Country, 12 in the document".
- `MatchCategories` per entity: computed and cached (`categoriesOf`, `LibraryView.tsx:398`) but not passed to `ResultsMainView`; a card can't say "title + document".
- `hits` per page is used, but there is no entity-level sum of occurrences. `count` mixes field groups and pages, so "7" can mean 2 properties + 5 pages, or 7 pages. `FullTextSnippet.hits` for property rows is hard-coded `1` in the passages flattening (`:859`).
- `matchedPages` beyond the cap: `fullTextTotal` is known, but the page numbers of the un-excerpted pages are discarded (`librarySnippets.ts:568` `continue`). Neither a page list nor a hit-density strip is possible today.
- Connections: `countByEntity` feeds the tie-breaker only; no layout prints it (a Causa with 40 connections vs 1 looks identical).
- Dates: grouped prints the year only; tree and passages print none; spine prints the date but drops undated results into a footnote (`:1135`).
- Entity type: name only in grouped; tree/passages/spine show a colour dot (dot colour alone is not readable, and the chips in the Library toolbar are not linked to it).
- `borrowedFrom.entityId`: rendered as text only (`BorrowedDocLine` is deliberately not a link since the main pane has no `EntityOverlay`).
- `document.paged` (whether page numbers are real) is used implicitly by `page: null`; there is no explicit "page numbers unavailable for this collection" note, so the Sample corpus shows Document hits with no location and no explanation.

## 4. What a user cannot answer today

1. Why this rank. No number by design. But `exactTitle`, `covered` (terms hit of terms typed) and the score's dominant factor exist and are hidden. Under implicit AND every result covers every term, so ranking between results is by field weight and frequency, and nothing on the page says so. Passages and spine give no attribution at all. Changing Sort to Title in Results is honoured by grouped/tree but silently overridden by passages (`:881` re-sorts by hits) and spine (by date).
2. How many hits per entity. Badge = fields + matched pages (`librarySnippets.ts:573`), not occurrences; spine shows it with no label. Tree branch counts are `texts.length` (always 1 for properties, `:666`).
3. Which terms matched (multi-term). Only grouped (full) and tree (missed only). Passages and spine show none. For OR queries in passages and spine, there is no way to tell which term a row is about.
4. Where in the document. Pages are listed only for the 5 (or 8) excerpted; no page list, no density strip, no "matches on pages 3, 7, 14–19 of 41". Total page count of the document is not shown either, so "3 of 41 pages" means 41 matching pages, not pages in the document.
5. Narrowing. Results header has only Title / Properties / Document chips (`:336`). No narrowing by which property (a Country hit vs Description hit), by entity type, by page count / document own-vs-borrowed, or by "hit all terms". The type facet sits in the Filters tab, not reachable from the Results header. Own vs borrowed is not filterable, although borrowed hits are down-weighted 5×.
6. Why is this result here when there are no snippets (title-only): grouped prints nothing (a header-only card, `:534`), tree prints "Matched in the title — nothing else", passages footnotes a count (`:1010`), spine shows a row with no passage.
7. Whole-set overview. Grouped/tree/passages show the first N by rank; no distribution over types, years or match kinds for the whole result set (only the match-type chip counts). Spine plots only the visible page of ranked entities (24 to start), so it does not show when the term occurs across the result set, and Show more re-lays the axis.

## 5. Concrete gaps (file:line)

1. `ResultsMainView.tsx:881` passages re-sorts by `hits` over the visible page only; hit density is per page-text, not comparable between a property row (`hits: 1`, `:859`) and a page. Property rows always sink. Also ignores the user's sort.
2. `ResultsMainView.tsx:315` `capped` expression reduces to `visible > results.length`; the "Showing every result" line at `:427` appears or not depending on whether the last page overshoots `entities.length`, not on any condition it names.
3. `ResultsMainView.tsx:691` tree prints "5 of 23 shown" with no Show all control; grouped has it (`:588`), the drawer has it (`EntityResultCard.tsx:117`). Passages and spine have neither.
4. `ResultsMainView.tsx:1161` spine `bestPassage` picks the densest page, else first property; with a title-only hit the row has no passage and no explanation, and no match-kind tag.
5. `ResultsMainView.tsx:504` / `:1108` / `RelationshipGroupedCard count` all print `snippets.count` unlabelled; nothing says whether it's fields, pages or occurrences.
6. `MatchedTerms` is not mounted in passages (`:945`) or spine (`:1109`); `EntityResultCard.tsx:80` mounts it but the property rows there also include the Title snippet that the main view drops (`:170`), so the drawer and main view disagree on what a "hit" is.
7. `librarySnippets.ts:568` excerpts past the cap are dropped without keeping their page numbers or hit counts, so no "pages with hits" strip is possible without a second pass.
8. `librarySnippets.ts:573` `count` sums fields and pages; adding a `totalOccurrences` (sum of `hits`) needs no new scan since `hits` is already computed per page (`:565`) but properties are not counted (`excerptAroundTerms` returns one window).
9. `relevance.ts` `covered`, `terms`, `exactTitle`, `fields`, `ownDocumentHits` have no consumer.
10. `LibraryView.tsx:936-938` passes `onClearSearch={() => clearSearch()}` and `onClearFilters={() => clearFacets()}` inline to `ResultsMainView`, and `ResultsMainView` is not `memo`'d (only `ResultsBody` is, `ResultsBody.tsx:71`). Inside, snippets are memoised on `[entities, visible, trimmed, language, source, layout, budget.ctx]`, so a parent re-render does not re-snippet, but any new prop derived per render (see perf) would.
11. Spine: `TimeSpine.tsx:166` sorts by date only; `SpineBody` keeps rank only through which 24 entities are loaded.
12. Match categories per row are available (`categoriesOf`) but the main view receives only aggregate `matchTypeCounts`.
13. Sample corpus: `page: null` everywhere gives excerpts with no location and no note (by design, §4.2), but nothing tells the user why.

## 6. Perf constraints (from CLAUDE.md, verified in code)

- `filterState` (`LibraryView.tsx:370`) must stay memoised on content keys. Any new per-query aggregate needed by Results (term counts, per-field counts, type distribution) should be built inside the existing lazy per-entity caches (`categoriesOf :398`, `scoreOf :428`) or over `matchTypeBase`, never by adding fields to `filterState` that change identity per render.
- `ResultsBody` is `memo` and its callbacks are `useCallback` at the call site (`:1057`). Any new prop to it (e.g. a per-entity categories getter) has to have a stable identity, like `scoreOf` (changes only with query/language/source/corpus).
- `ResultsMainView` re-snippets its visible page whenever `entities`, `visible`, `trimmed`, layout or `budget.ctx` change. Adding data to `EntitySnippets` costs at most the windowing pass already paid; new per-page or per-field counts should ride the existing loops (`librarySnippets.ts:548`, `:562`).
- Scan cost is not in the search scan (3,752 of 4,398 entities share 6 blobs); per-keystroke cost is React re-rendering. A larger per-card DOM (page density strips, per-term chips) multiplies over 24–40 cards × every keystroke commit; keep new elements inside already-mounted rows and don't add subscriptions to `libraryQueryAtom` (cards take the deferred query as prop).
- No layout shift: header strip is always mounted (`:325`); anything appearing per result must ride an already-mounted line (as `BorrowedDocLine` does), and any new chip row in the header must be fixed-height.
- Uncapped excerpting (`maxFullText: Infinity`) is only for expanded cards; a page-hit strip over all pages should use `fullTextTotal`-style counting, not excerpts.
- `entitySearchParts` / `foldedFields` are WeakMap-cached per entity or per page array; new attribution should read those, not re-fold.

## 7. Options and recommendation

Options, cheapest first:
A. Surface what is already computed: mount `MatchedTerms` in passages and spine; label the count badge; show `exactTitle` / "all N terms" on the card header; print `ownDocumentHits` as "N in document" per term. No new scans.
B. Add a per-entity occurrence total and per-field hit counts to `EntitySnippets` (sum of `hits`, count per `MetadataSnippet`) using the loops at `librarySnippets.ts:548` and `:562`; keep the page numbers of all matched pages (a `matchedPages: number[]`) so a card can show "pages 3, 7, 14–19 of 41" and a density strip. Small cost, no new pass.
C. Add narrowing beyond the three chips: field chips (per property label, counts from the same categoriser) and own/borrowed document; entity-type chips reading `matchTypeBase`. These need to run inside `categoriesOf`-style lazy caches and add stable-identity props.
D. Fix layout-specific defects: passages sort (rank-preserving with a hit-density secondary key, honouring sort), tree "Show all", spine sorted by date but showing rank number.

Recommendation: A then B first (they use data that already exists and answer "which terms", "how many hits", "where in the document"), then D1/D3 defects, then C. C is the largest change and needs a decision on whether match-type chips remain a global filter (`matchTypeFiltersAtom`, which narrows the left pane) or whether field/type narrowing stays Results-local.

Not verified: rendering, real timing, the Storybook stories for these components, and whether `libraryResultsLayoutAtom` layouts are exercised in the mobile sheet.
