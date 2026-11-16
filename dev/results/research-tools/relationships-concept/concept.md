# Relationships concept

2026-10-05 · Design lane · playground `1b029c03` on :1428 · Nepal, CEJIL, Sample.
Files: `audit.html` (Part 1, annotated screenshots and the control table), `sketches.html` (Part 2),
`screens/` (current state, 1440×900, light and dark).

## Why

The panel spends its controls on arranging rows: four views, eight group axes, a second group level, five sorts,
three densities, Collapse/Expand. None of them says whether a link is confirmed, when it held or who reported it,
and the Nepal data has all three on every reference (`verification` on 5,319, `date` on 146, publisher on every
source). The adapter drops them (`data/nepal/profile.ts`). Counts disagree across views: the CEJIL judge reads 349
on the tab, 174 vs 163 for Firmantes in list vs tree, 327 in the graph, 326 on the profile.

## Three changes

1. **The tab opens on a summary.** One sentence of counts, then rows named as questions ("What led to it", "Who
   acted", "What is claimed about it"), each with its records and a verification-strength bar. A row scopes the
   reference list. Direction becomes wording; the arrow glyph and the Direction facet go.
2. **Link metadata is visible and filterable.** Status chip and date range on each reference, a Verification facet,
   an "as of" date, and "Why we believe this" on fields that come from `evidence[]`.
3. **Time and place are one view.** Strip, map and list share one filter state; events get a place from
   `occurred_at`; hour precision where the data has it.

## Remove or merge

| Today | Proposal |
|---|---|
| List, Tree, Graph, When | Summary, References, When and where |
| Tree evidence column | Strength column in the summary |
| Graph view | Cut; a graph is drawn only for a chosen path |
| Display menu: Group by, Then by, Density | Cut. Two fixed groupings (by question; by template in References) |
| Sort: Appearance, Most evidence, A→Z, Z→A, None | Date, Evidence, Document order (only with a document) |
| Facets: Anchoring, Direction | "With quote" toggle; Direction cut |
| Facet: Relationship type | The summary rows |
| Collapse / Expand all | Cut; the summary opens answered |
| Tinted pills with direction arrows | Type dot plus ink text |
| "HUB · 5 parties" | Labelled by the act: "Signed together · 5" |
| "No document" pane on records without files | Collapsed |

Kept as is: references, derived relationships, hubs, page tags, the slide-over, search, the vocabulary.

Rule change this needs: CLAUDE.md says the tab count is the only number on the surface. The summary needs counts
in its sentence and rows; toolbars and info rows stay number-free.

## Build order

**Phase 1, on today's data.**
- Feature 1: carry `verification`, `date` and `file`/`page` onto `Reference` (optional fields; CEJIL and Sample
  untouched); status chip and tenure on rows; Verification facet; "as of" date; provenance popover from
  `evidence[]`.
- Feature 3: derived event geolocation from `occurred_at`; map, list and time brush on one filter state; date range
  on `when` start and end at day or hour precision.

**Phase 2.** Summary as the default tab; cut Tree, Graph, Display, Density, Then by, Direction; claim evidence
matrix (publishers × supports/disputes, quote in the cell).

**Phase 3.** "Connect to…" paths (BFS over references, sources and high-degree hubs skipped by default, weakest
link sets the path status, absence reported) and the 2-hop pivot that hands its set to the Library.

**Phase 4, needs data.** Source independence (`syndicated_from` is on 89 of 922 sources), structured casualty
figures, target-side anchors, `createdBy`.
