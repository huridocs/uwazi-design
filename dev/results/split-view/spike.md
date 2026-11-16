# Split view: scoping spike

2026-10-07, branch `operator/f27f40` (from playground d4c63ba0, after Full width).
Split itself is not built. This is what a build needs to know first.

## What was tried

- `jotai-scope@0.10.0`, the newest release that accepts the installed jotai 2.18.1
  (0.11 and later need jotai ≥ 2.20).
- `libraryPaneScopedAtoms` in `atoms/library.ts` lists 49 primitives, private bases
  included: the search, every facet, the map area base, the chosen view, the display
  store, the sort bases, the selection, what the pane has open, and the pane-measured
  atoms (sort and language fold, columns in effect, preview count). The harness adds
  `networkFindStepAtom`.
- Harness `views/LibrarySplitSpike.tsx` (dev builds only):
  - `?splitSpike=2`: two `LibraryView`s side by side, each under
    `<ScopeProvider atoms={…}>`, both in Full width, each with its own rail.
  - `?splitSpike=1`: one scoped pane; `&half` sets it at a split pane's width beside an
    empty pane, the fair baseline.
  - There is no divider and no shared chrome.
- Checked with headless Chromium at 1600×900 on CEJIL (4,398 records), and Nepal for
  the collection switch.

## Scoping: what works

Each item below was checked live, one pane changing while the other was read.

- Search: "Lima" in the left pane gives 29 results there; the right pane stays at 4,398
  entities. The Results rail dot shows only on the left.
- Facets: ticking Causa on the left gives 337 of 4,398 there. The right pane's Filters
  panel still counts the whole corpus (Causa 337, Medida Provisional 150, Documentos
  2908).
- Brush: 337 dated on the left, 3,592 dated on the right.
- View mode: Network on the left and Map on the right at the same time.
- Map area: panning the right map gives 373 of 4,398 and 357 dated there; the left
  pane is unchanged. `libraryMapBoundsAtom` reads `viewModeStateAtom` and the scoped
  `mapBoundsStateAtom` through the scope, so its rule (null outside Map) holds per pane.
  The map is fed `unbounded` and `filtered` narrows it, per pane.
- Selection: Cmd+click on the left shows the selection bar only there. The
  `entitySelectedAtom` family and the select-all logic follow the scope.
- Preview: a card opens its preview in its own pane only.
- Saved views: saved in the left pane, opened in the right; the right pane gets the
  search and the facet, and the left is untouched.
  - `applyLibrarySnapshotAtom` writes through the scope.
  - The saved-views list and the search history stay shared, as they should.
  - `currentSavedViewIdAtom` resolves per pane.
- Language: switching it in one pane switches both. It is a shared atom, which is
  intended.

Derived atoms need no listing. Unscoped derived atoms read the scoped primitives when
evaluated inside a scope: `libraryViewModeAtom`, `libraryMapBoundsAtom`,
`librarySortAtom`, `libraryActiveFilterCountAtom`, `libraryCardInfoAtom`, the selection
family and `currentSavedViewIdAtom` all behaved per pane. `filtered`, the facet counts
and the brush are component memos in `LibraryView` and `LibraryFilters`, so they are per
pane by construction.

## Scoping: what breaks, and what Split has to do about it

1. **Writes from outside both panes reach neither pane.** Each one writes the root
   store, and every pane is scoped.
   - Collection switch (`switchDataSource`, from the navbar): it resets the root
     store's facets only. Verified: with Causa ticked in both panes, switching to Nepal
     leaves both at "0 of 2,124 entities".
   - Reset demo data (`registerSettingsReset`), the `#view=` link (`useViewLink` in
     `App`) and the Settings default view: same mechanism, seen in the code, not tested
     live.
   - Fix: leave pane A unscoped (root store) and scope only pane B. Then link,
     reset and default-view writes land in A. Separately, pane B resets its own filters
     on a `dataSourceAtom` change, by calling `switchDataSource`'s reset part through
     its own store.
2. **One Escape clears both panes' selections.** Verified with a selection in each
   pane. Each `LibraryView` adds a `window` keydown listener. Fix: listen on the pane
   root, or check that the event target or the focused element is inside the pane.
3. **The Shift-range order is module state.** `viewOrder` in `EntitySelectBox.tsx` is
   a module-level variable: the pane that committed last owns it. In the test both
   panes drew the same order, so the range came out right; with different sorts it
   would range over the other pane's order. Fix: a context or a scoped atom.
4. **The focused entity is global** (`focusedEntityIdAtom`, set by
   `focusEntityForPreviewAtom`). The preview's Document and Files tabs read the focused
   entity's file atoms. With a preview open in each pane, the later one wins, and the
   other's Document and Files would show the wrong record. This is from reading the
   code; the live check could not tell the two previews apart (both had 0 files).
   Options: the Split preview takes the slide-over's flavour (Metadata and
   Relationships only, "Open entity" for the rest), or the file atoms move behind the
   entity scope.
5. **The nested preview stack is global.** `overlayStackBase` and
   `previewEntityIdAtom`: a connected record opened inside one pane's preview would
   stack in both panes' previews. Scope `atoms/rightPane.ts`'s bases.
6. **Other per-pane atoms not in the list yet:**
   - bulk edit (`libraryBulkEditOpenAtom`, `libraryBulkEditIdsAtom`)
   - `librarySelectionDialogAtom`
   - `libraryEditRequestAtom`
   - `focusMetadataFieldAtom`
   - the Relationships panel's scoped state inside each preview (`EntityScopeProvider`
     already handles that one).
7. **The overlay layer stack is shared, which is correct but visible.** One Escape
   closes only the topmost layer across both panes; with a preview open in each, the
   later one closes first.
8. **No camera atoms needed.** The Network camera (focus layout, find cursor, zoom)
   lives in `NetworkCanvas`'s refs and state, so each pane has its own. Only
   `networkFindStepAtom` needed scoping.

## Cost: two CEJIL panes against one

Measured in headless Chromium with `--use-angle=metal --enable-gpu-rasterization`,
three runs each.

- "Event" is the Event Timing duration, from input to the next paint.
- "Long tasks" is the sum of long tasks.
- "Half" is one scoped pane at 800px beside an empty pane.

| Measure | Plain Full width (1600px) | 1 scoped pane (1600px) | 2 scoped panes (800px each) |
|---|---|---|---|
| Keystroke event, median | 48 ms | 48–56 ms | 48 ms |
| Keystroke event, max | 96 ms | 96 ms | 96–128 ms |
| Long tasks over 14 keystrokes | 120–181 ms | 113–179 ms | 250–309 ms |
| Facet toggle click event, median | 192–208 ms | 184–200 ms | 184–200 ms |
| Long tasks per facet toggle | 162–170 ms | 168–172 ms | 170–183 ms |

CDP metrics over the 14 keystrokes, one scoped pane at half width against two panes:

| | 1 pane, half width | 2 panes |
|---|---|---|
| Script | 1,450–1,560 ms | 1,420–1,580 ms |
| Recalc style | 87–91 ms | 92–98 ms |
| Layout | 191–238 ms | 309–338 ms |
| DOM nodes | 10.4k | 20.3k |

What this shows:

- **A change in one pane costs the other no script.** The idle pane's `LibraryView`
  did not re-render (render counter flat at 8) on four keystrokes or a facet toggle,
  and a MutationObserver saw no DOM change in it over 14 keystrokes. Script time is
  the same with one pane or two. The input-to-paint median is unchanged; the
  four-keystroke and toggle probes were not timed in this run.
- **Layout costs about 9 ms more per keystroke with two panes.** That is about +120 ms
  over 14 keystrokes, with the document holding twice the nodes. `contain: strict` on
  each pane did not remove it (layout 327–397 ms with it). The cause is not isolated.
  Outside the panes, the only DOM changes during typing were the Beacon's
  background-task updates, which happen with one pane too. A performance trace is the
  next step if this matters.
- **Shared changes cost both panes, as expected.**
  - Language switch: click event 104–120 ms with one pane, 168–184 ms with two. Long
    tasks 69–97 ms against 129–147 ms.
  - Load, long tasks after the corpus lands: 167–220 ms against 462–475 ms.
- **Unscoped derived atoms are evaluated once per scope.**
  - `libraryEntitiesAtom`: 2 evaluations at load with one pane, 4 with two. With no
    session edits it returns the corpus array as is, so both panes share one array and
    the WeakMap caches keyed on it. After an edit each pane builds its own overlaid
    array.
  - `networkGraphAtom` is built twice with both panes in Network.
  - Fix for both: wrap them in a cache keyed on their inputs (source and entities
    identity), so a second scope gets the same object.

## Recommendation

Split is feasible with jotai-scope. The per-keystroke and per-toggle cost of a second
pane is small (layout only, about 9 ms per keystroke). The work is in the shared
paths, items 1–6 above:

- leave pane A on the root store;
- pane B resets its facets on a collection switch;
- pane-local Escape and selection order;
- a preview that does not move the global focus;
- the overlay stack scoped;
- the heavy unscoped derived atoms cached by input.

Upgrading jotai to ≥ 2.20 would allow jotai-scope 0.12; 0.10 was enough for this spike.

Full width fixes found during the spike (committed d11657bb):

- the masthead's Select popovers sat under the rail;
- Escape closed the selection list instead of clearing the selection;
- every Cmd+click slid the selection list over the cards being picked.
