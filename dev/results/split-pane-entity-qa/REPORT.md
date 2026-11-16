# QA: Split opens a record inside its pane, commit 4fa3c040 (playground)

Served from detached worktrees QA created, each confirmed with lsof -> pid -> cwd -> `git rev-parse HEAD`:
- :1437 = 4fa3c0401e6c0dc1e5724961e40b51ce6aba7fcb (the commit under test)
- :1438 = fee82e4dec019decba515bcaf8d85dc415a36c7a (baseline for the Escape question)
Headless Chromium (Playwright), 1440x900, CEJIL unless stated. Worktrees and servers removed afterwards.
`tsc --noEmit` exit 0, `npm run build` exit 0 on 4fa3c040. Console: no errors in any run (only the known `atomFamily` deprecation warning).

## Defects

### D1 (medium). Escape does nothing when the other pane's panel is on top of this pane's panel (sync OFF). Also on fee82e4d, so older than this commit.
Answer to "does Escape fail to close the left pane's Filters panel": only in this state; a plain left Filters panel closes on Escape on both commits (40+ variants tried, see below).
Steps (sync OFF, Split, CEJIL):
1. In the left pane, click the rail's Filters. The panel opens.
2. Click a card in the right pane. Its preview opens in the right pane (it is now the top layer).
3. Click inside the left Filters panel (focus moves to the left panel).
4. Press Escape, twice or more.
Expected: Escape closes the panel in the pane that holds the focus (left Filters), as every other pane key does.
Actual: nothing closes, on either commit, however often Escape is pressed. Only focusing the right preview and pressing Escape there closes it; then the left one closes.
Cause (read, not proven): `LibraryRail` closes on Escape only for `layer.isTopNow()` (the app-wide layer stack, shared by both panes). The right preview is the top layer, so the left rail ignores the key, and the right preview does not act on a key whose focus is in the left pane.
Evidence: `escape-stuck-1437.png`, `escape-stuck-1438.png`, `scripts/t10b.mjs`.
What does NOT reproduce it (both ports, all closed on the first Escape): fresh left Filters, Results, Views; after the right pane's Filters was closed with X; after left Back from a record; right pane showing a record; left preview then Filters; focus in the right search box; selection active; divider dragged; a facet ticked; the pointer over the right pane; the right Views opened and closed first; Notebook opened and closed first; both panes' panels open (the later one closes first, then the other).

### D2 (high). In a Split pane without a drawer, two controls do nothing: the entity pill in the Relationships list, and the toolbar's Filters button.
A pane gets a drawer only from 813px (360 + 448 + 5; measured: none at 718, drawer at 861 and 987). At 1440 the default 50/50 panes are 718px, so the default Split has no drawer.
Steps (sync OFF or ON, either pane):
1. Open a record from a card (e.g. Pávez Pávez 13 de mayo). The pane is 718px wide.
2. Relationships tab. Expand "País", click the pill "Chile" (aria-label "Open Chile").
3. Click the toolbar's "Filters" button.
Expected: the pill opens the connected-entity slide-over with "Open entity"; Filters opens the Filters slide-over (the SplitView comment says Filters "falls back to the slide-over").
Actual: nothing opens in either case. The Filters button shows its pressed look and the `FiltersSlideOver` dialog stays `visibility:hidden`, `inert`, opacity 0. No "Open entity" button exists in the DOM.
Works: the same clicks with the divider at End (left pane 987px, drawer present): the pill slide-over opens inside the drawer area (`left-wide-pill.png`); in the Drawer layout's full-window view both work (`slideover-pill-drawer-off.png`).
Cause (read): `SplitView` now drops the drawer when `!fits`, but (a) `EntityPreviewSlideOver` is mounted only through the drawer (`EntityDrawerPreview overlay`) and `PublishedEntityView`, and (b) `RelationshipsView` still calls `useRelFiltersDock(() => setDrawerTab("filters"))`, so the toolbar believes Filters is a drawer tab and sets a tab of a drawer that is not rendered (`RelationshipsToolbar` reads `relFiltersDockCountAtom`).
Effect on my checks: Escape for the Relationships Filters slide-over in two panes could not be exercised (see list below).
Evidence: `slideover-from-pill-split.png`, `slideover-pill-left-off.png`, `rel-filters-narrow-pane.png`, `rel-filters-both-panes-sync-off.png`, `left-wide-pill.png`; scripts `x8.mjs`, `x9.mjs`, `x10.mjs`, `x11.mjs`, `x15.mjs`.

### D3 (low, design question). "Discard changes?" appears for a navigation that does not touch the pane being edited, and discards nothing.
Steps: left pane: open a record, Edit, type in Description. Right pane: click a card's Open. A "Discard changes?" dialog appears (guard is global). Choose "Discard changes".
Expected: either no dialog (the right pane navigates; the left edit is untouched), or the left edit is discarded.
Actual: the right pane opens the record; the left pane stays in edit mode with its text ("QA dirty edit") and the guard asks again on the left pane's Back. Cancel keeps everything as it was (correct).
Same with sync ON and OFF. Evidence: `dirty-guard-sync-off.png`, `scripts/t17.mjs`.

### D4 (low). The pane's Back arrow does not mirror in RTL.
In Arabic the Back control in each pane's tab strip still points left (←); in RTL it should point right. It is `ArrowLeft` in `MainTabs`, newly visible on desktop through `inPane`. Evidence: `records-both-filters-darkrtl.png`, `records-both-filters-rtl.png`.

## Observations (not defects, Operator decides)
- Reset demo data leaves a record open in each pane (they stay open and usable; their Library underneath is reset). `resetLibraryForSource` closes them on a collection switch; the Reset path does not appear to. Not tested: a record created this session and then deleted by Reset. `after-reset-sync-*.png`.
- Synced Split with a record open in both panes still draws the rail and the shared time strip; both act on the hidden Libraries (the strip's "10y" changes 3,592 -> 1,872 dated). `records-both-filters-light.png`.
- Outside Split (Drawer and Full width), Back from a record does not restore the Library's scroll (500 -> 0). Same on fee82e4d, so not from this commit. In a pane, Back restores view, scroll and preview.
- Opening a Library row's preview with a list scrolled resets the list scroll to 0 before my scroll was set; I set the scroll after the preview was open for the Back test. Not compared to fee82e4d.
- Two panes can both be in Edit with their own armed field.

## Pass / fail rundown (all "driven" = headless browser, 1440x900)
| Check | Result | How |
|---|---|---|
| tsc --noEmit; npm run build | PASS | run |
| Open from a card, sync OFF/ON, left/right | PASS: that pane only, other pane's text unchanged, no full-window view, no page scroll | driven |
| Open from a List row (row click, then View entity), sync OFF/ON, both panes | PASS | driven |
| Open from the preview's View entity, sync OFF/ON, both panes | PASS | driven |
| Open from a passage hit in Adv. Search results ("Page 23, 9 matches"), sync OFF/ON, both panes | PASS (opens on Document tab) | driven |
| Open from an Adv. Search result title (then View entity), sync OFF/ON, both panes | PASS | driven |
| Open from a Map cluster row: "Open" button, and row preview then View entity, sync OFF/ON, both panes | PASS (a single unclustered pin was not found in CEJIL; the cluster list rows are the open path) | driven |
| Open from a Network node (click, then View entity), sync OFF/ON, both panes | PASS | driven |
| Different records with PDFs in both panes: independent pages (23/34, 120/177), independent hit counters (0/77, 0/99) | PASS | driven |
| F3, Shift+F3, Ctrl+G, Meta+G step only the focused pane's document; with focus on the body, the pane under the pointer | PASS, sync OFF and ON | driven |
| Escape with two armed click-to-fill fields: disarms only the focused pane's | PASS | driven |
| Escape for a Relationships Filters slide-over in two panes | NOT EXERCISED (blocked by D2) | - |
| Tab switches per pane (left Relationships, right Files) | PASS | driven |
| Back: record history first (left Argentina -> Julien record -> Library) then restores that pane's Library: List view, scroll 420, preview open; other pane's record untouched | PASS, sync OFF and ON | driven |
| Collection switch (CEJIL -> Nepal) closes both pane records; opening works afterwards | PASS, sync OFF and ON | driven |
| Rail panels centred and closing on Escape; shared strip works while panes show records | PASS (Filters panel cx 720 = divider; strip 10y filters) in light, dark, RTL, dark+RTL | driven |
| Divider Home/End with records in both panes: panes 448 / 987; no control outside its pane, no horizontal overflow, no page scroll; tabs Relationships, Files, Metadata via the folded Section menu; Document tab in the 448px pane | PASS, sync OFF and ON, both sides | driven |
| Drawer appears when a pane is wide enough | PASS: none at 718; at 861 drawer 408 (max 408); at 987 drawer 494 = half | driven |
| Click-to-fill: arming per pane; Escape in the other pane leaves it armed | PASS | driven |
| Click-to-fill edit in one pane, open in the other: guard asks; Cancel keeps both | PASS; Discard behaviour: see D3 | driven |
| Reset demo data with records open | see Observation; works, records stay open | driven |
| RTL and dark (also with records in both panes) | PASS except D4 | driven |
| Outside Split (Drawer, Full width): Open goes to the full-window entity view, Back (breadcrumb) returns to the Library | PASS | driven |
| Escape on the left pane's Filters, sync OFF, on 4fa3c040 and fee82e4d | Same on both. Reproduces only in the D1 state | driven |
| Entity pill and Filters button in a pane without drawer | FAIL (D2) | driven |

Not exercised: Map single pin; a created-then-reset entity; Tree/Graph pills; Timeline view; Escape inside a PDF viewer (no handler found in `DocumentViewer`); tablet and phone widths.

## Files
Screenshots and scripts are in this folder (`*.png`, `scripts/`). Key ones: `open-passage-right-unsynced.png`, `two-docs-sync-off.png`, `two-docs-keys-sync-on.png`, `history-two-records-sync-off.png`, `back-restores-library-sync-off.png`, `tabs-per-pane-sync-off.png`, `divider-Home-records-sync-on.png`, `narrow-Home-document-sync-on.png`, `records-both-filters-*.png`, `two-edit-forms.png`, `dirty-guard-sync-off.png`, `collection-switch-sync-off.png`, `outside-split-drawer-entity.png`.
