# QA: Library Split synced mode, commit 4545778a (operator/7ec9c0)

Served on :1437 from a detached worktree QA created. :1421 was already taken and serves cc89dfe7 (playground), so it was not used.
Confirmed: lsof :1437 -> pid 80502 -> cwd .../scratchpad/wt/app -> `git rev-parse HEAD` = 4545778a557dfe1f39a371729fbd992fb23bc8c5.
Headless Chromium (Playwright), 1440x900, CEJIL collection, Layout = Split. Worktree and server removed afterwards.

## Result: 1 defect (minor), everything else passes

| # | Check | How | Result |
|---|---|---|---|
| 1 | tsc --noEmit | run | PASS (exit 0) |
| 2 | npm run build | run | PASS (exit 0, only the usual chunk-size warning) |
| 3 | Unsynced: two rails, two strips | driven | PASS: 2 rails (cx 687, 1409), 2 TimeBrush |
| 4 | Synced: one rail, one strip | driven | PASS: 1 rail in the split layer (cx 720 = divider cx 720), 1 TimeBrush in `split-brush` slot, 1440px wide |
| 5 | Rail follows divider on drag | driven | PASS: 650/600/560/520/900, rail cx == divider cx at every step |
| 6 | Rail follows Shift+Arrow, Arrow, Home, End, dblclick | driven | PASS: 871, 728, 584, 728, 756, 451, 990, reset 720; rail cx == divider cx each time |
| 7 | Filters, Results, Notebook, Views open centred | driven | PASS: each panel l488 r952 cx720 under the rail at sep 50%; at sep 451 panel cx 451 |
| 8 | Panels trap focus | driven | PASS: 40 Tab + 10 Shift+Tab per panel, 0 escapes, 4 panels |
| 9 | Panels close on Escape, focus returns to the rail button | driven | PASS (4 of 4) |
| 10 | X button closes, focus back to rail button | driven | PASS (Filters) |
| 11 | Preview from left pane card opens centred, owner left | driven | PASS |
| 12 | Preview from right pane card opens centred, owner right | driven | PASS (cards clicked at x=250 / x=1200, outside the panel) |
| 13 | A rail panel opening closes the preview, and a preview closes a rail panel; left <-> right preview swap | driven | PASS: only one dialog open in every transition; tab trap holds in the right pane's preview (0 escapes in 30 Tab) |
| 14 | Escape closes a preview | driven | PASS (left and right) |
| 15 | Dark mode | driven | PASS: layout and values identical, screenshot checked |
| 16 | RTL (AR), also dark+RTL | driven | PASS: dir=rtl, rail follows drag and Shift+Arrow, panel centred; screenshot checked |
| 17 | Map in both panes: caption, zoom, attribution clear of rail | driven, rect intersection | PASS at 50%, Home (31%), End (69%): 0 overlaps |
| 18 | Network in both panes: breadcrumb, find stepper, layout, zoom, "isolated" chip clear of rail | driven, rect intersection | PASS, except the legend button (D1) |
| 19 | Console errors | driven, all runs | PASS: none. Only `atomFamily is deprecated` warning, present on playground too |
| 20 | Divider draggable above the open panel | driven | PASS: mouse drag at y=100 with Filters open moves divider and panel together |
| 21 | Toggle Sync off with a panel open, then on | driven | PASS: off -> 2 rails, 2 strips, the panel stays in the left pane (cx 270); on -> 1 rail, panel centred again |
| 22 | Rapid repeats: 1-9 clicks on Filters, 12 Views/Results alternations | driven | PASS: final state matches parity, identical to unsynced |
| 23 | 1024x768 synced, Filters | driven | PASS: panel inside viewport, cx == divider |
| 24 | Las Vegas: left Sync view + right Cards, both Sync, left Cards + right Sync | driven | PASS: one strip drawn when either pane wants one (right's when left does not); both Sync -> slot height 0, panes grow to 852 |
| 25 | A dirty edit keeps a panel open but hidden when the other pane claims the spot | code read only (LibraryRail `yieldRef`, `isOpen`) | NOT EXERCISED |
| 26 | Tablet/phone | not exercised (Split is desktop-only) | n/a |

## Defect

### D1 (minor): Network legend button in the right pane sits under the rail
Steps:
1. Layout = Split, Sync filters On, collection CEJIL.
2. Set View = Network in both panes (or at least the right pane).
3. Look at the right pane's top-left: the layers/Templates legend button (`[data-part=legend]`, x 735-767, y 145-177 at 1440 wide) overlaps the rail (x 701-739, y 145-285) by 4px; it touches the rail edge. Same overlap at divider Home (legend 465-497, rail ~432-470) and End (1004-1036).
Cause (code read): `NetworkCanvas.tsx` applies `--rail-reserve-start` to the breadcrumb only; the legend uses a fixed `left-3`. A search or a centred community moves nothing for it. The expanded legend (collections with <= 8 templates, pane >= 640px) starts at the same left edge, so it would sit under the rail by the same amount, longer.
Evidence: `defect-network-legend-vs-rail.png` (crop), `synced-network-both.png`, `synced-network-search.png` (breadcrumb at 751, legend at 735).
Recommend: Code gives the legend the same `left-[calc(0.75rem+var(--rail-reserve-start,0px))]` as the breadcrumb (and anything else absolutely placed at the start edge of the Network canvas). Spec for a test: with synced Split and both panes on Network, no `[data-overlay]` rect in the right pane intersects the `LibraryRail` rect at 50%, Home and End.

## Observations (not defects)
- While a panel is open the divider is reachable only above the rail (y 52-145) and in the 12px under the panel (y 741-753); at the rail's height elementFromPoint hits the rail. Matches CLAUDE.md.
- Port: `:1421` is held by a server running cc89dfe7 from the shared checkout, so anyone testing 4545778a there would be testing the previous commit.

## Screenshots (this folder)
- unsynced-light.png, synced-light.png, synced-filters-panel.png (the three asked for)
- synced-dark-filters.png, synced-rtl-filters.png, synced-darkrtl-filters.png, synced-*-views-dragged.png
- synced-preview-right.png, synced-filters-dragged.png, toggle-off-with-panel.png, synced-1024-filters.png
- synced-map-both/Home/End/filters.png, synced-network-both/Home/End/filters/search.png, defect-network-legend-vs-rail.png
- synced-vegas-both-sync.png, synced-vegas-left-sync.png
- scripts/: the Playwright scripts used (need a dev server on :1437 and the repo's app/node_modules)
