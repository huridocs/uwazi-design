# Review: Library Network view at playground 925d23d7, reviewed as the Library's default view

Covers commits bb13e9a9, d4356f82 and 582a29a3, plus the wiring in `LibraryView`, `atoms/library.ts`
and `libraryDisplay.ts`. I read every Network file and ran the view in headless Chromium against a
dev server on :1430, at 1440×900 and at 390×844 with dpr 3 and touch, on CEJIL and Nepal. The
Playwright scripts and screenshots are in the session scratchpad. Line numbers are in
`app/src/components/library/NetworkCanvas.tsx` unless a different file is named.

Findings are ranked most severe first. Each one is tagged **Measured** (seen in the headless run)
or **Code** (read from the code, not run).

## 1. High: the canvas keeps its old resolution when devicePixelRatio changes (Measured)

`:615-637`. `canvas.width` and `canvas.height` are set only in the layout effect keyed on
`[size, placement.extent]`, but `draw()` reads `window.devicePixelRatio` on every frame (`:291`,
`:302`). When the window moves from a 1× screen to a 2× one, or the user zooms the browser, the
CSS size stays the same, so the ResizeObserver does not fire. The backing store stays at the old
resolution while `setTransform(dpr)` uses the new one.

Repro: open Network, then set `deviceScaleFactor: 2` through CDP without resizing. The canvas
stays at 951×628 for 951×628 CSS px with dpr 2. The drawing is then twice as large and only its
top-left quarter shows: marks and labels are cut at the pane edge (`2-cejil-dpr2.png`). Hit
testing still uses CSS coordinates, so tooltips name marks the user cannot see. A Mac with an
external monitor hits this on every move between screens.

Fix direction: listen to `matchMedia('(resolution: Xdppx)')` and reapply the backing size.

## 2. High (for a default view): the overview gives no sign of the selected record (Measured)

`:396-409`. Rings and incident edges are drawn only inside the `nodesAlpha > 0.01` block. CEJIL
and Nepal (500 or more records) open on community marks, so a record selected in Cards or List,
whose preview stays open in the drawer, has no mark on the canvas after switching to Network.
The camera does not pan to it either. In the screen-reader list it is not pressed, because the
list holds only the 60 best-connected records.

Repro: in Cards, preview "Julien Grisonas y otros. Audiencia del 10 de mayo de 2021", then switch
View to Network. The drawer shows the record and the canvas shows nothing (`4-selected-then-network.png`).
The same happens when the selection changes from the drawer, for example from a relationship pill.

Recommendation: when `selected` changes or the view opens with a selection, draw its community
mark ringed and offer to centre it.

## 3. Medium: keyboard users can reach only 60 records and 20 groups (Code; Measured that tabbing lands on "Perú, País")

`:72` (`KEYBOARD_LIST = 60`), `:955-964` and `:998-1005`. The node list is the 60 records with
most neighbours, or while filtering the first 60 matches. Centring a group does not change the
list. With no filter, 4,338 of CEJIL's 4,398 records cannot be reached or selected from the
keyboard. While filtering, a search with 743 matches exposes only 60 of them. As the default
view, this is the keyboard path to the Library's records. The list should follow the camera or
the focused group.

## 4. Medium: while Focus is arranging, hit testing uses positions that are not drawn (Code)

`LibraryNetworkView.tsx:168-172` and `NetworkCanvas.tsx:203-209`, `:778-781`. When the match set
changes, `focusLayout` becomes null at once and `pending` is true. `target` therefore switches to
the global positions and `quad` is rebuilt for them. `shown` keeps the previous focus positions,
because a move waits for `fitKey`. For large collections `marksOn` also turns back on. Until the
worker answers (875 ms measured for "tortura" on CEJIL: 743 matches, 3,105 members), hover and
click test against the global positions while the nodes are drawn at the old focus positions.
A click on a visible node selects a different record, or nothing.

## 5. Medium: hidden Evidence plus a search that matches only hidden records reads "No records match" (Code)

`:236` (`matchOrder` filters by `nodeOn`) and `:1019-1020`. In Nepal with Display › Layers ›
Evidence off, a filter whose matches are all sources, claims or media shows "No records match"
on the canvas, while the masthead says "N results". The matches exist and are hidden by a
Display switch. The chip should say that. `focusAvailable` also counts the hidden matches
(`LibraryNetworkView.tsx:136`), so Focus is offered for a member set that is empty.

## 6. Medium: a two-finger trackpad scroll zooms, and horizontal scroll does nothing (Code)

`:747-753`. Every wheel event is a zoom. On macOS a two-finger swipe is a wheel event without
`ctrlKey`, so a vertical swipe zooms, a horizontal swipe is ignored, and panning needs
click-drag. Pinch (`ctrlKey`) is handled correctly. On a canvas that fills the main pane by
default, a swipe meant to pan is the most common gesture. The convention is to pan on wheel
with `deltaX`/`deltaY` and zoom on `ctrlKey` or `metaKey`.

Related cost: each wheel event calls `zoomAt` → `move(…, false)` → `finish()`, which runs a
synchronous `draw()` and `setRel()` (a React render) on every event rather than once per frame.
The same path runs on every pinch `pointermove` (`:840`). Pan through `request()` measured 60 fps
(median 16.7 ms, p95 17.6 ms). A high-rate trackpad stream makes several full draws per frame.

## 7. Medium: the tooltip is clipped at the bottom and stays stale after the camera moves (Measured)

`:1055-1058`. `top: hover.y + 14` has no lower bound, and the host is `overflow-hidden`.
Hovering a node 18 px above the canvas bottom placed the tooltip at y=737 with the canvas
ending at 741, so it was invisible (`5-tooltip-bottom.png`). The tooltip should flip above the
pointer.

`hover` is updated only on `pointermove`. A double-click, Fit, the zoom buttons, wheel zoom and
filter moves all move the drawing under a still pointer, and the tooltip keeps describing what
used to be there. After a double-click on the Guatemala mark, the view showed nodes but the
tooltip still read "Guatemala · 277 records · Double-click to centre" (`8-dblclick-guatemala.png`).
Hover should be re-hit-tested after each camera change.

## 8. Medium: on phones the community names run off the edge and over the marks (Measured)

`:515-537`. Community names check only for overlap with each other: there is no bound against
`W`, and none against the marks. At 390 px, "República Dominicana" and "Comisión Interamericana
de" are cut at the right edge, and names sit across neighbouring marks (`15-phone-network.png`).
Node labels already drop when cut (`:431`); community names do not. The drawing also fills
about 45% of the sheet's height at 390, because the fit is bound by width.

## 9. Low-medium: a failed layout fetch is permanent and silent (Code)

`data/network/layout.ts:36-44`. A `!r.ok` response (a 404 under another base path, or a 5xx)
resolves to `null` and stays in `pending`. Only a rejected fetch is evicted. Either way the view
draws every record on one sunflower spiral as one community, with no message and no retry until
reload. As the default view, the first screen would be wrong with nothing saying why.

## 10. Low-medium: the Focus worker cannot cancel and runs requests one after another (Code; Measured 875 ms)

`data/network/focus.ts:148-164`. A superseded request still runs to completion, and the next one
waits behind it. With the deferred query, typing "tortura" sent only 2 requests (329 ms, then
875 ms), so the queue is short on that path. Clicking several facets in a row sends one request
per distinct match set, and each runs up to 400 FA2 iterations over as many as several thousand
members. The comment's target of "well under a second" is already met only narrowly at 743
matches. A generation id checked before posting, or terminating and restarting the worker when
a newer request arrives, would bound the wait. Up to `FOCUS_MAX` (1,000) matches, the members
can be most of CEJIL: 3,105 of 4,398 at 743 matches.

## 11. Low: the Focus cache ignores the graph's identity (Code)

`LibraryNetworkView.tsx:138`. `focusKey` uses `graph.ids.length`, not the graph or the
placement. In the Sample, adding or removing a reference rebuilds the graph with the same
length, so an earlier key returns a layout assembled from the old edges and the old placement.
The module cache (`focus.ts:119`) outlives the view.

## 12. Low: the move animation is not cancelled on unmount (Code)

`:560` cancels `frame` only. `anim` keeps stepping after a collection switch unmounts the
canvas (`placement` becomes null while the layout loads). `draw()` returns early, but `finish()`
still calls `setRel` on the unmounted component. This is harmless today; the cleanup should
cancel `anim.current` too.

## 13. Low: relationship types past 31 share one switch (Code)

`graph.ts:120` and `LibraryNetworkView.tsx:88`. Types from index 31 on fold into bit 31, so
turning one of them off does nothing while any other folded type is on. The menu still lists a
separate switch for each. No corpus reaches 32 types today. The comment documents the fold, but
the UI does not reflect it.

## 14. Low: there is no accessible announcement on the canvas when the match set changes (Code)

The only live region is "Arranging the matches" (`:1081`). The masthead readout carries the
count. The canvas's `aria-label` changes, but `role="img"` labels are not announced on change.
This is acceptable if the masthead readout is a live region; I did not check that.

## State (item 4 of the brief)

- `#view=` links and saved views carry `viewMode: "network"` and the `display.modes.network`
  answers: hub edges, layers and `type:<label>` keys. The camera, the Focus / Whole collection
  choice and the opened community are not carried. Nothing documents whether this is intended.
  For a default view, a link that opens on a fitted overview is reasonable, but it is worth one
  line in CLAUDE.md.
- `type:<label>` keys are labels. A view saved in one collection and opened in another with a
  same-named type switches it, which is harmless.
- Display state is an in-memory atom, not a settings store, so "Reset demo data" has nothing to
  clear and the toggles reset on reload, as in the other views.
- Making Network the default: `DEFAULT_VIEW_MODE` (`atoms/library.ts:509`) maps only cards,
  table and map, and Settings › Collection's default-view choice does not offer Network. Both
  need adding.

## Checked and clean

- **Eager cost.** `network.json` is not fetched on load or while another view is open (0
  requests on Cards, 1 after switching to Network). `networkGraphAtom` is read only by the view
  and by `libraryDisplayContextAtom`, which gates it on `viewMode === "network"`.
- **Per-keystroke path.** `LibraryNetworkView` is `memo`'d. A re-sort hands a new `matches`
  array but `matchKey` stays the same, so there is no refit or worker run. The per-keystroke work
  is O(n + m) typed-array passes. Search does not switch the view to Adv. Search.
- **Data structures.** The graph is typed arrays with CSR adjacency, and positions are a
  `Float32Array`. The per-frame bucket arrays are plain JS arrays (GC churn while panning), and
  panning measured 60 fps at node level on CEJIL.
- **Dark mode.** A MutationObserver on `:root` re-reads the tokens, and the repaint is correct
  (`6-dark.png`). The colours come from tokens (`--bg-warm`, `--text-*`, `--accent-blue`), all
  real.
- **Double-click.** It centres the community under the pointer and opens it into nodes. A single
  click keeps its own action.
- **Click, drag and pinch.** Click versus drag uses a 4 px threshold. A pinch released to one
  finger keeps panning from that finger.
- **Reduced motion.** `prefers-reduced-motion` skips the move animation.
- **Canvas a11y.** The canvas is `role="img"` with an `aria-label`. The screen-reader list
  buttons draw a carbon focus ring on the canvas and pan to it (checked by tabbing). The Focus
  button uses `aria-disabled` with a reason in its title.
- **Phone.** At dpr 3 the backing store is correct on first paint (1098×1914 for 366×638), and
  the view opens on marks at 390 px.
- **Rendering.** Nodes outside the viewport are culled with a 40 px pad, so they are not drawn
  outside the bounds.
- **Not run.** Touch pinch, double-tap and a collection switch in the middle of an animation
  were checked in the code only.
