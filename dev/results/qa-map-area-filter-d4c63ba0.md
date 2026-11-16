# QA: Library Map area filter at d4c63ba0 (2026-10-07)

Served from a detached worktree I created at d4c63ba0, port 1430. Chain: lsof :1430 → pid 92421 → cwd `.../scratchpad/qa-map/app` → `git rev-parse HEAD` = d4c63ba0773ca123952d0d1de2ca7d5a44046f3f. Worktree and server removed afterwards.

Driven in a visible Chrome tab (document.hidden = false, checked before each step). Gestures went through the Claude-in-Chrome input tool (CDP mouse/wheel events delivered to a visible tab). Screenshots were taken for inspection only and were not saved to disk.

Timings are from a 20 ms poll of the page text, from the input event to the masthead change. They include poll granularity.

## Rundown

| # | Step | Result | How |
|---|------|--------|-----|
| 1 | Open Map: nothing narrows | PASS (CEJIL, Nepal, 390 frame) | App driven. CEJIL 4,398 entities, facet counts (Causa 337 …), brush "3,592 dated" unchanged after open and after 2 s. Nepal 2,124 / 279 located. Reopening Map from Cards also starts with no area. |
| 2a | Drag-pan | PASS | CEJIL: 4,398 → "370 of 4,398"; caption "370 of 373 located entities in map area · 4,025 with no geolocation"; brush 3,592 → 356 dated; Countries counts changed; 186 ms after pointerup. Nepal: 268 of 2,124, Event 125, Location 87, brush 181. |
| 2b | Wheel zoom | PASS | CEJIL 3 ticks → 209 of 373; 1 tick out → 371; ~480 ms after the wheel event. Nepal 8 ticks → 278, then pan → 268. |
| 2c | Trackpad pinch | PARTIAL | No real trackpad available. Sent ctrl+wheel (the event shape a pinch produces) through the input tool: updated like wheel (209 of 373, 503 ms). Not a real pinch. |
| 2d | Double-click zoom | PASS | CEJIL 208 → 127 of 373, brush 205 → 126 dated, 443 ms. Nepal: two double-clicks → "0 of 2,124 / 0 of 279" (empty area, see N3). |
| 2e | +/− buttons | PASS | CEJIL − → 372 of 373 (437 ms), + → 208 (461 ms). Nepal − → 278, + → 268. |
| 2f | Unlocated count in caption | PASS | Caption always "· 4,025 with no geolocation" (Nepal "· 1,845"). Records without geo never counted inside the area. |
| 3 | "In map area" chip, × clears without moving the map | PASS | Chip appears in the same state change as the count. × at zoomed-in CEJIL: marker positions identical before/after (same coordinates for all 21 markers), count back to 4,398, brush 3,592, Template counts back. |
| 4a | Pin click sets no area | PASS | CEJIL (Uruguay pin) opened the preview in the drawer; no chip, 4,398. Nepal Java pin: no chip, 2,124. |
| 4b | Cluster click sets no area | **FAIL vs brief** | CEJIL: clicking the "25" cluster zoomed to it and set the area ("27 of 4,398", chip, brush 27 dated). Nepal: clicking the 278 cluster → "278 of 2,124 … in map area". Code does this on purpose: `gestureAt.current = performance.now()` before `cluster.zoomToBounds` (LibraryMapView.tsx, a47ed29d). CLAUDE.md only says a "pin click" does not write the area. Decision for Operator/Design: is a cluster zoom a reader zoom? |
| 4c | Pane resize sets no area | PASS | Dragged the drawer divider 819 → 640 → 819 on CEJIL (map width 815 → 636 → 815): no chip, 4,398 throughout. Not tested with an area already set (does the area stay stale after a resize). |
| 5a | Leave Map (to Cards) drops area | PASS | "26 of 4,398" + chip → Cards: 4,398, no chip, facet counts full. Back in Map: no area. |
| 5b | Collection switch | PASS | CEJIL area set → Nepal: 2,124, no chip. |
| 5c | Clear all | PASS | CEJIL: area → Clear all → 4,398, no chip. The map refits to all points on Clear all (the × chip does not). |
| 5d | Reset demo data | PASS | Nepal area set → Settings → Library round trip keeps it (control: "0 of 2,124", chip) → Reset demo data → Library: 2,124, no chip. |
| 6a | Saved view with area, clear, reopen | PASS | Saved "QA map area" ("Map · 1 filter"); Clear all; reopened from the Views menu: 362 of 4,398, chip, 348 dated, all 13 marker positions identical to before saving. localStorage snapshot holds `mapBounds {south -36.0313, west -142.0313, north 35.3174, east 1.2305}`. |
| 6b | Copy link, open in new load | PASS | Link captured from the Copy-link button. Opened in a fresh navigation (from /index.html): 362 of 4,398, chip, marker positions identical. Hash removed. A hand-mangled link (my typo at the tail) was ignored without error: state unchanged. |
| 7 | Facet cards keep height and order while panning | PASS | Heights of all 10 cards in the Filters panel identical at baseline and at every polled state during pan/zoom (97,427,296,153,296,161,296,615,166,32). Zero-count rows stay listed (greyed). Empty-area state in the Nepal timeline swaps the brush for "No results to plot — Clear filters"; I did not measure its height. |
| 8 | 390 px | PARTIAL | Iframe 388 px wide holding the app (same origin, link-opened in Map). Touch events were synthetic (`new TouchEvent`, `Touch`), not a real touch device. One-finger drag: 4,398 → 354 of 373; two-finger spread: → 12 of 373; Filters button shows "1"; the sheet shows chip "In map area" and Published 12. Opens with 4,398 at 390. |

## Findings

**F1 (decision, 4b above).** Cluster click sets the area. Brief says it must not; code is deliberate; CLAUDE.md wording mentions only a pin.

**F2 (observation, no defect found).** The Template card showed Causa 0 / Medida 0 / all rows 0 while "Published 370" in CEJIL under an area. Cause: CEJIL's located entities are `País` records (pin I opened was "Uruguay"), and the Template card has no row for that template (rows sum to 4,020 of 4,398 even with no filter, 378 short). So the zeros are correct for the rows shown. The missing País row is not caused by this commit. Operator can decide if País should be listed.

**F3 (minor, unverified cause).** CEJIL after a pan to 370 in area: visible cluster badges summed to 371 (181+170+20). After a wheel zoom the badges summed to the in-area count (371 of 373 → 371). The one-record difference after the first pan is most likely a cluster whose centre is inside the view but one member is just outside; I did not confirm it.

**F4 (behaviour to know).** Empty area state ("0 of 2,124") works: facet counts all 0, brush says "No results to plot" with a Clear filters button that clears the area; map caption keeps the unlocated count.

**F5 (environment, not an app bug).** document.hidden was true in the first tabs the extension gave me, because they sit behind Juan's active tab in his Chrome window. In a hidden tab the app's debounce does not run: a pan I made appeared as "no change" and its chip showed only after the tab became visible. This is the same effect Code hit. Any gesture check must confirm `document.hidden === false`.

**Console.** Nepal tab: no errors. CEJIL tab: one `Warning: AbortException: TextLayer task cancelled` from react-pdf when the pin click opened a document preview (unrelated to the area).

## Things I changed outside the repo

- I raised the QA tab to the front (osascript set active tab) twice; Juan's own active tab in that window changed meanwhile and the window changed order once. I did not restore his active tab index (he had moved it himself by then).
- The extension put the QA tabs in Juan's existing Chrome window and I resized that window to 1280 x 898 with `resize_window`. I do not know the size it had before. It is within the ≤1440 limit, but if it was larger, it needs a manual resize.
- I clicked Reset demo data on port 1430, which affects only that origin's storage (localhost:1430 sessionStorage/localStorage), and saved one view "QA map area" there.

## Recommendations (not dispatched)

- Operator/Design: decide F1 (cluster zoom sets an area or not) and update CLAUDE.md or the code to match.
- Code, when F1 is decided: a vitest for `entityInMapBounds` (wrapped longitudes: west < -180, east > 180; `east - west >= 360`; entity without `geo`; lat on the edge) and for the snapshot round-trip (`captureLibrarySnapshot` → `writeSnapshot` keeps `mapBounds`; `isMapBounds` rejects NaN/missing keys; an old snapshot without it opens with null). None of that was run by me as a test; I only observed it in the app.
- Real touch on a device or Chrome device-mode is still unverified at 390.
