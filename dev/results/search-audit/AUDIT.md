# Library search results and Adv. Search: audit and proposal (2026-10-14)

Audit only; no code changed. Walked headless on playground e4e73b5f and d2ea2683 at 1440 in the Drawer, Full width and Split layouts, plus phone 390, light and dark (Nepal). The Split checks had Sync filters off; Sync filters on was not checked.

## Queries

| Corpus | Query | Results |
|---|---|---|
| Sample | life | 19 |
| Sample | Tablada | 3 |
| Sample | "right to life" | 19 |
| Sample | habeas | 16 |
| Sample | zzqx | 0 |
| CEJIL | derechos | 4,000 |
| CEJIL | Grossman | 44 |
| CEJIL | "desaparición forzada" | 675 |
| CEJIL | Chile, partial | 807 |
| CEJIL | Chile, whole | 805 |
| CEJIL | Chile, whole, full text | 670 |
| CEJIL | Chile, whole, title | 1 |
| CEJIL | zzqx | 0 |
| Nepal | police | 447 |
| Nepal | Oli | 273 |
| Nepal | "tear gas" | 56 |
| Nepal | "tear gas", Quotes | 37 |
| Nepal | curfew | 105 |
| Nepal | zzqx | 0 |
| Vegas | shots | 30 |
| Vegas | Mandalay | 29 |
| Vegas | "route 91" | 11 |
| Vegas | gunfire | 63 |
| Vegas | zzqx | 0 |

- Annotated screenshots are `A-` to `F-` in this folder; raw captures are in `shots/`.
- The numbers in the annotations (1–13) are the problems listed below.
- The CEJIL "derechos" count of 4,000 is not a cap: the template counts add up to it.

## 1. What works and what is weak

### Works

- **Speed.** On CEJIL, Enter to the updated count takes 150–210 ms. A query never feels slow.
- **Ranking.** Results sort by relevance while a query runs (`scoreRelevance`). The order is: exact title, coverage, field weight, frequency, whole word.
- **Scope and Match.** Search in and Match work as stated, and the masthead chip names them ("· Full text · Whole words"). Whole words removes 2 of 807 "Chile" results; Title leaves 1.
- **Snippets.**
  - Highlighting is case- and accent-insensitive.
  - The excerpt is cut around the hit, and its length follows the pane width.
  - On CEJIL and Nepal PDFs a passage has a page tag ("p.2 · 5×") that opens the document at that page.
- **Shared passages.** Passages folds the same document page under one row with "↳ also under N entities".
- **Grouped layout.** A card shows Properties, then Document ("5 of 8 pages"), and names a borrowed PDF ("↳ from …").
- **List and timeline.** `MatchOrigin` marks a row only when the hit is in a field the row does not show (the tag icon in List). It is quiet and correct.
- **Network.** It keeps matches full and fades the rest, and the find stepper walks them.
- **Dark mode.** The highlight, chips and cards read well (D).

### Weak

**Repetition across rows.** This is the same trap the grouped Relationships view had.
1. **(1, A) Borrowed passages repeat per record.** CEJIL records that read a connected PDF show the same passage once per record. "…siete votos contra uno, 1. el Estado violó los derechos…" is the best passage for at least three of the first eight Spine rows, and repeats in Grouped and Tree. Only Passages folds these.
2. **(2, A) The query is shown four times in Adv. Search:**
   - the masthead field;
   - the masthead chip;
   - the AdvancedSearchBar term chip;
   - the drawer's Active filters chip.
3. **(4, B) Near-identical snippets.** 39 of 44 "Grossman" results are Commission reports. Each shows the same Firmantes list in a different order, and each card reads Properties › Firmantes › the list.
4. **(5, B) Three labels for one snippet.** A section label (PROPERTIES), a field label (FIRMANTES) and a tinted box all sit around a one-line snippet. In the drawer this is about 140px per result for one line of evidence.
5. **(8, D) One label per quote.** Nepal's Grouped card repeats "SOURCE QUOTE" before every quote: 9 times on "Curfew order…".
6. **Passages repeats the record.** Each row carries the record title and "DOCUMENT", so one record with 8 matching pages is 8 rows with the same attribution.
7. **Grouped repeats facts that do not change.** Every card prints template · country · year even when every result is one template. Spine prints "Document ·" before every location.

**Why it matched, and how strongly.**
- The count badges say what kind of match it was ("8 passages", "1 field", "1 title match"). Nothing says how strong it was.
- Results are ranked, but a title hit and a hit in a 300-page document's index look the same in the drawer, apart from the order.
- `MatchedTerms` names the field for each term only on multi-term queries.

**Snippet quality.**
- Nepal and Vegas quotes show without their source, publisher, date or verification. The facets for these (Verification, Publisher) are beside the results, but the rows do not show them (C, D).
- A quote is evidence in this product. Shown bare, "Police responded with water cannons, tear gas…" appears four times in a row with nothing to tell the sources apart (6, C).
- Labels are inconsistent: the same Nepal quote is "SOURCE QUOTE" on a target and "QUOTE" on a source (7, C).

**Jumping to the passage.**
- Works on CEJIL and Nepal PDFs.
- Sample passages have no page (mock text), so they show "3×" and no target.
- Vegas has no recording jump from results, even though Relationships rows have a `TimeTag` that opens the recording at the moment.

**Empty and zero states.**
- **(9, E)** A zero result says "No matches for "zzqx"" and offers Clear search. It offers no Whole → Partial switch, no "search everywhere" (only when a scope was narrowed), and no spelling or near-match hint.
- **(10)** Every facet in the drawer shows 0. The panel says nothing useful, and it says it in 30 lines.
- **(11)** The chart's "Clear filters" clears the query, but the button says filters.

**Volume.**
- **Show more.** On CEJIL "derechos" Adv. Search draws 24 cards per step: "Show more — 3,904 remaining" after four steps. Each step is about 30 ms slower than the one before (185 → 212 → 244 ms), because snippets are rebuilt for the whole slice. Reaching the end takes about 165 clicks, which no one will do. Cards and List have pagination with Folio, so Adv. Search is the only long list without it.
- **(13, F) Spine plots one slice.** The time axis is drawn only for the visible results, so "Show more" changes the axis under the reader.

**Time.**
- **(12, F)** Vegas is timed to the second. The Spine row shows only the day ("2017/10/01"), and all of these 63 results fall within minutes of each other.

**Layout defects.**
- **(3, B)** The drawer card's count badge wraps to two lines ("1 / field") when the title truncates. This happens on every Commission report in the drawer, the rail panel, the Split pane panel and the phone sheet.

**Accessibility.**
- No live region announces the result count or a change of results. The masthead readout updates silently.
- Page rows are labelled "Page N, M matches", so a screen reader never hears the snippet.
- Heading levels change with the layout: Grouped uses h2, Tree h3, and Passages and Spine have none.
- Opening a result does not move focus.

## 2. What newer work left it out of step

- **Pagination and Folio.** Cards and List page with Folio and keep the page through Back. Adv. Search and the Results tab still use Show more (24 and 40 per step), with no page state, so Back from a record loses the place. At 4,000 hits, drawing the whole set is not right: it should page like Cards and List.
- **Split and the rail.**
  - Results open in the pane's rail panel at 29rem, the same body as the drawer. They work, but at 29rem the badge wraps and the snippets are narrow.
  - Not checked: Split with Sync filters on, where the rail is shared and Results is meant to show the left pane's query.
- **Overview as landing.**
  - A search on the Overview leaves it for Cards, by the rule, so Search in and Match appear only once the reader picks Adv. Search. Not checked: where the Overview's own Search action leads.
  - The zero state has nothing from the Overview: no suggested facets or featured records.
- **Record-per-row grouping and member cards (Relationships).**
  - Relationships now draws one row per record, leaves out what the group already says, and folds large sets to five plus "+N".
  - Results do neither:
    - a record with 8 matching pages is 8 rows in Passages;
    - 39 reports with the same Firmantes snippet are 39 cards;
    - a borrowed PDF's passage repeats under every record that borrows it.
- **Evidence, verification and contest (Nepal, Vegas).**
  - The evidence card (`RefEvidenceCard`) and the status chip (`EvidenceStatus`) exist and are shared, but results show neither.
  - A quote found in search is the strongest case for them: it should carry its status chip, and its publisher and date.
  - The contested state should show where it applies.
- **Uploads.** Result rows do not draw `UploadStateMark`, so a record still uploading or processing looks like any other. Cards and List show it.
- **Notebook.** You cannot pin from a result. `PinToggle` is on cards, the entity header and relationship pills. A passage found in search is the most natural thing to cite, and the Notebook's citation builder already formats anchored quotes.

## 3. Proposal, ranked

Each item gives the problem, the change, the files and a size (S, M or L). The numbers in brackets are the problems above.

1. **Fold passages that are the same text.**
   - Problem: [1] a borrowed PDF's passage repeats under every record that reads it, in Grouped, Tree and Spine.
   - Change: key passages on document and page in every layout, as Passages does. Show the first record's passage once with "also under N records" (`AlsoUnder`), and give the others a one-line "↳ same passage as …".
   - Files: `ResultsMainView.tsx` (Grouped, Tree, Spine), `EntityResultCard.tsx`, `utils/librarySnippets.ts`.
   - Size: M.
2. **Page Adv. Search and the Results tab with Folio.**
   - Problem: about 165 Show more clicks on CEJIL; each step costs more; Back loses the place; Spine's axis covers one slice [13].
   - Change: use `LibraryPagination` and `libraryPageStateAtom` keyed the same way. Draw Spine's axis from the whole result set, and page only the rows.
   - Files: `ResultsMainView.tsx`, `ResultsBody.tsx`, `LibraryView.tsx` footer, `atoms/library.ts`.
   - Size: M.
3. **One row per record in Passages.**
   - Problem: 8 rows for one record [Passages repetition].
   - Change: the record heads its group once and its passages follow, each with its page tag, folding past three to "Show all N passages". This is the grouped Relationships row (`MemberCard` variant `row`), with search snippets in place of quotes.
   - Files: `ResultsMainView.tsx` `PassagesBody`, reuse from `relationships/rows/MemberCard.tsx`.
   - Size: M.
4. **Show quotes as evidence on Nepal and Vegas.**
   - Problem: [6][8] a quote shows with no source, publisher, date or status.
   - Change: put the reference's `EvidenceStatus` chip (it opens `RefEvidenceCard`), the publisher and the reported date on each quote snippet. Add `ContestedClock` / contest marks where they apply. Use one label, "Quote", for both ends [7].
   - Files: `EntityResultCard.tsx`, `ResultsMainView.tsx`, `utils/librarySnippets.ts` (carry the reference id on quote snippets).
   - Size: M.
5. **Cut the labels around a snippet.**
   - Problem: [4][5][8] three labels per one-line snippet, and one label per quote.
   - Change: drop the PROPERTIES/DOCUMENT section labels when a card has only one kind. Print a field label once over all its snippets. Drop the tinted box and use one indent. Print template · country · year only when the result set mixes templates.
   - Files: `EntityResultCard.tsx`, `ResultsMainView.tsx` `GroupedBody`/`PropertyRow`.
   - Size: S.
6. **Fix the count badge wrap.**
   - Problem: [3] "1 / field" on two lines in the drawer, rail, Split and sheet.
   - Change: `whitespace-nowrap shrink-0` on the badge, and let the title truncate first.
   - Files: `relationships/RelationshipGroupedCard.tsx` (shared header), `EntityResultCard.tsx`.
   - Size: S.
7. **Show the query once.**
   - Problem: [2] four copies in Adv. Search.
   - Change: in Adv. Search, the masthead field and the bar's term chips are the query. Leave the query out of the drawer's Active filters (it is not a filter, by the rule for Search in and Match). Drop the masthead chip's term in Adv. Search and keep only the count.
   - Files: `LibraryView.tsx` readout, `LibraryFilters.tsx` active chips, `ActiveSearchChip.tsx`.
   - Size: S.
8. **A zero state that leads somewhere.**
   - Problem: [9][10][11] the only offer is Clear search; 30 facet rows show 0; "Clear filters" clears the query.
   - Change: offer the switches that would return results, each with its count: "Partial words: 12", "Search everywhere: 3", "Remove 'Exclude …'". Hide zero facets while the result is empty. Label the chart's button "Clear search" when only the query is set.
   - Files: `ResultsMainView.tsx`, `ResultsBody.tsx`, `LibraryFilters.tsx`, the chart footer in `LibraryView.tsx`.
   - Size: M.
9. **Say how strong a match is, without a score.**
   - Problem: a title hit and a hit buried in a document look alike.
   - Change: order the badge by where the hit is (Title, then field names, then "p.12, p.40 +3"). Show `MatchedTerms` for single terms too when the hit is only in full text.
   - Files: `ResultsMainView.tsx`, `MatchedTerms.tsx`.
   - Size: S.
10. **Spine at the corpus's grain.**
    - Problem: [12] Vegas Spine shows the day for records timed to the second.
    - Change: read `RecordContext.timed` and `span.seconds`, as the Timeline does, and print the time; the axis buckets by minute and second when the span is under a day.
    - Files: `ResultsMainView.tsx` `SpineBody`, `TimeSpine`.
    - Size: S.
11. **Pin from a result.**
    - Problem: you cannot cite a passage from search.
    - Change: `PinToggle` on each record head, and "Pin passage" on a snippet's hover. The citation goes through `utils/notebookCitations.ts` with the page or quote.
    - Files: `EntityResultCard.tsx`, `ResultsMainView.tsx`, `atoms/notebook.ts`.
    - Size: M.
12. **Mark uploads in results.**
    - Problem: a record still uploading looks finished.
    - Change: `UploadStateMark` on the record head, as on cards.
    - Files: `EntityResultCard.tsx`, `ResultsMainView.tsx`.
    - Size: S.
13. **Accessibility pass.**
    - Problem: no live count; snippets hidden behind "Page N, M matches"; heading levels change by layout.
    - Change: `aria-live="polite"` on the readout. Page rows name the page and keep the snippet as the description (`aria-describedby`). One heading level (h3 under the view's h2) in every layout. On open, focus moves to the preview's title.
    - Files: `LibraryView.tsx`, `PageSpine.tsx`, `ResultsMainView.tsx`.
    - Size: S.
14. **Jump to the moment from a Vegas result.**
    - Problem: no jump from a recording's result.
    - Change: a `TimeTag` on recording hits that carry a media anchor, as on Relationships rows.
    - Files: `ResultsMainView.tsx`, `EntityResultCard.tsx`.
    - Size: S.

Order of work: 6 and 7 are fixes; 1, 3 and 5 remove most of the repetition; 2 makes the large result sets usable; 4 is the one change the evidence corpora need.

### Bigger ideas

- **A. One results body for the drawer and the main view.** `ResultsBody`/`EntityResultCard` and `ResultsMainView`'s Grouped are two versions of one card; the code read also found the page rows (`PageSpine` vs `PassageRow`), the property rows, and the empty, loading and error blocks written twice. Build one record row with search snippets on the `MemberCard` model, used by the drawer, the rail, the sheet and the Grouped and Passages layouts. Every fix above then lands once. Size: L.
- **B. Results grouped by where they matched.** Group-by for Adv. Search, as in Relationships: by field ("Firmantes · 39 records", one row each, the snippet once as the group's caption), by document (the borrowed PDFs at once), by template, or by source for Nepal quotes. Group headers carry the shape (`GroupSummary`'s idea): span, evidence mix. This answers the 39-identical-snippets case directly. Size: L.
- **C. Search as a saved question in the Notebook.** Pin the query, with its scope, match and filters, as a Notebook entry that reruns and shows what is new since it was pinned. It is built from the saved-view snapshot that already exists. Size: L.
