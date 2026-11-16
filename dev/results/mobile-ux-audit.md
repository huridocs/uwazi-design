# Mobile UX audit — playground and main

Date: 2026-09-28. Audit only, no code changes.

**Builds.**
- `playground` 8a0eb727 ("Entity view on phones: no action bar runs past the screen").
- `main` origin/main 33d72d83.
Both were served one at a time on :1433 from fresh detached worktrees.

**How.**
- Headless Chromium through Playwright with `isMobile`, `hasTouch`, device scale 2, driven by taps. Bulk selection was driven by real long-presses sent as CDP touch events. Juan's Chrome was not used.
- 50 scripted scenarios per branch, one per surface or state. Each ran at 390 light EN, 390 dark EN, 360 light EN, 430 light EN, and 390 light with the reading language set to Arabic, which turns the whole app RTL. That is 500 screenshots.
- On every screen an automated check recorded:
  - page overflow and elements past the screen edge;
  - clipped content;
  - interactive targets under 24px and under 44px;
  - visible text under 11px;
  - controls that are invisible until hover;
  - fixed/sticky collisions;
  - sheets that don't fit;
  - inputs under 16px;
  - unnamed controls.
- I then read the screenshots and followed each finding into the code.

**Screenshots.**
- `mobile-ux-audit/M##-*.png`: one or two per issue, named after the issue ID.
- `mobile-ux-audit/sheets/`: contact sheets. `pgA`–`pgG` are playground, `mA`–`mE` are main.
- `mobile-ux-audit/harness/`: the scripts, so the pass can be re-run after fixes.

**What this could not test.** These items are inferred from the code and flagged "device check":
- iOS Safari's own chrome and virtual keyboard;
- pinch zoom;
- the home-indicator safe area.

**Constraint applied (from Juan, via Operator).** Facet and list rows stay compact and uniform (about 1.75rem). No fix below raises a list row to 44px. Where a dense row's control is small, the fix makes the whole row the hit area, or extends the hit area with padding that doesn't change the row's height.

**Work already queued with Code.** These are not re-proposed; where an issue here depends on one of them, the table says so.
- Entity action bars (done on playground in 8a0eb727; main still needs it, see M11).
- Library ⋯ menu moving to a bottom bar.
- Stacked, staggered bottom sheets for all nested views, taller from layer 2.
- Results sheet opening on search.

---

## Summary

**Clean everywhere.** There is no page-level horizontal overflow at 360, 390 or 430. No visible text is under 11px; the only hits were the PDF text layer, which is transparent by design. No fixed or sticky elements collide, and every sheet and modal fits the screen.

**What's wrong falls into five groups.**
1. **Things you cannot do on a phone** (M01–M04, M08). The entity preview never opens from a relationship. The relationships Filters panel never opens. Create entity does nothing. Settings can't be reached. Bulk selection exists only as an undiscoverable long-press.
2. **Viewport foundations** (M05, M06, M12–M14). Every text input is 12–14px, so iOS zooms the page on focus. The app is `h-screen` (100vh), not the dynamic viewport. There is no virtual-keyboard handling. On main, closed sheets are still keyboard-focusable.
3. **Overflow and clipping** (M09–M11, M26, M27): the tips popover, Import CSV, main's entity bar, the Paragraph Extraction table, and RTL menus.
4. **Touch affordances** (M07, M15, M22). Controls appear only on hover, several small targets sit outside dense rows, and the selection menu collides with the native iOS callout.
5. **Layout polish** (M16–M21, M23–M25, M28–M29).

**Main vs playground.**
- Nineteen issues are on both branches.
- Two are main-only: M06 (inert sheets) and M11 (entity bar). Playground already has both fixes and they port cleanly.
- M04 differs by branch: main has no Settings entry on phones at all, while playground has one that shows only Account.
- Four were seen only on playground: M16 and M18, because main has neither the Settings menu section nor the time strip, plus M25 and M27b, which weren't checked on main.

---

## Issues

Severity:
- **Blocker:** a task can't be done on a phone.
- **High:** it can be done, but badly or with data risk.
- **Medium:** it degrades the task.
- **Low:** polish.

Size: S ≈ under a day, M ≈ 1–3 days, L ≈ a week.

**Port** says how a fix moves between branches:
- **clean:** the same code path on both, so one change cherry-picks.
- **main-specific:** main needs a different change.
- **pg-only:** the issue doesn't exist on main.

| ID | Surface | Branch | Sev | What happens | Proposed fix | Size | Port |
|---|---|---|---|---|---|---|---|
| M01 | Entity · Relationships → entity overlay | both | Blocker | Tapping an entity pill ("Open Case 11.137") does nothing. `RelationshipsView` mounts `<EntityOverlay/>` inside the mobile "Document" section's sheet content, which is closed, so the overlay opens where nobody can see it. `M01-main-*.png`, `M01-pg-*.png` | On mobile, render the overlay as its own bottom-sheet layer at view level, not inside a section. This is the first consumer of the queued stacked-sheets work: overlay = layer 2 (taller), anything opened from it = layer 3. | M | clean (same code; land with stacked sheets) |
| M02 | Entity · Relationships → Filters | both | Blocker | The Filters button opens nothing. `RelationshipsFiltersPanel` lives in the desktop right pane, which phones don't render. `M02-pg-*.png` | Same pattern as M01: a bottom sheet on mobile, the same component as the Library Filters sheet. | S | clean |
| M03 | Library · Actions → Create entity | both | Blocker | Nothing visible happens. `handleCreate` starts a draft and selects it into the right-hand drawer, which isn't shown on phones, so the draft exists but can't be seen. `M03-main-*.png` | On mobile, open the draft's edit form full screen (the entity view in edit mode) or as a layer-2 sheet. Also check the draft isn't left orphaned when the user backs out. | M | clean |
| M04a | Navbar menu → Settings | main | Blocker | The phone menu ends at Paragraph Extraction. There is no Settings, theme, interface language or collection switch, so Settings is unreachable on main (Paragraph Extraction's "Back to settings" is the only back door). `M04-main-menu-no-settings.png` | Port playground's Settings section of `MobileNavDrawer` (theme, language, User/System settings). | S | main-specific (port from pg) |
| M04b | Settings · System settings | pg | Blocker | "System settings" and "User settings" both open a list with only USER › Account. Desktop lists 11 system sections (Dashboard … Relationship types). `M04-pg-system-settings-only-account.png` | Make the mobile Settings list read the same section registry as the desktop rail, grouped User / System. System settings drills straight to the System group. | M | pg first; main gets it with M04a |
| M05 | Every text input | both | High | Inputs are 12px (Library search, relationships search, Share) or 14px (edit form, Bert, Activity log, Files rename). iOS Safari zooms the page on focus below 16px, and with an `overflow:hidden` shell the page stays zoomed after blur. Device check. | On mobile only, set input, select and textarea to 16px (`@media (max-width: 767px)` in `index.css`, or `text-base md:text-sm` on the shared input classes). Placeholders can shorten (see M28) so the box height doesn't change. | S | clean |
| M06 | Closed bottom sheets | main | High | Closed `MobileBottomSheet`s aren't `inert`. Tab from the page lands on "Close", "Library", "Preserve", … parked at y 868–1286, below the screen; a screen reader reads them too. | Port playground's `inert` on closed sheets (the rule in CLAUDE.md). | S | main-specific (port from pg) |
| M07 | Hover-only actions | both | High | These controls are opacity 0 until hover, with no touch equivalent: Recent searches "Forget search" (`M07-pg-recent-*.png`), notification "Dismiss" (`M07-pg-notifications-*.png`), relationship "Delete reference", selection chip "Remove from selection", and Files group-card actions. On touch they are either unreachable or appear after a tap as a stuck hover, which is how a stray trash icon shows on the relationship rows. No `@media (hover: none)` rule exists anywhere. | Add one global rule: under `@media (hover: none)`, hover-revealed controls show at rest, muted (`text-ink-muted`), next to their existing `group-focus-within` rule. Delete stays on the row, still one tap from confirm. Swipe-to-dismiss for notifications is optional later. | S | clean |
| M08 | Library · bulk selection | both | High | Long-press works (`M08-*.png` shows "1 selected · Actions · Clear"), but the only place it is mentioned is the screen-reader label of "Select all". The card checkbox is `sr-only`, so a phone user has no visible way in. | Add "Select" to the Library Actions sheet (the ⋯ bottom bar once Code lands it). It enters a selection mode where a tap toggles, the same state the long-press already sets. Keep long-press. | S | clean |
| M09 | Library · search tips popover | both | High | The popover is laid out to x=431 on a 390px screen, so its right column is clipped. In RTL it still overflows to the right. `M09-*.png` | On mobile, render the tips as a bottom sheet (or clamp to the viewport with `max-width: calc(100vw - 2·gutter)`), anchored with logical properties. | S | clean |
| M10 | Import CSV · list and detail | both | High | Detail: the stat grid, the "932 / 932 rows" label, the table and "Delete Import" run to 412–428px and are clipped. In RTL, "Delete Import" starts at −22px. List: the summary strip ("… 1 Fail") is clipped at 402px. `M10-*.png` | On mobile, stack the stat cards one per row (or two narrow ones), let the table scroll inside its own scroller with a visible edge fade, and make the footer bar wrap. | M | clean |
| M11 | Entity · action bar | main | High | The ⋯ button sits at 413–449px, off screen (at −59px in RTL). Playground fixed this in 8a0eb727. `M11-main-*.png` | Port 8a0eb727. | S | main-specific (port) |
| M12 | App shell height | both | Medium | `App` is `h-screen` (100vh) with `overflow:hidden`. On iOS Safari, 100vh includes the collapsing URL bar, so every bottom bar (Actions, Edit/Save, pager, New Import) can sit under the browser toolbar until the bar collapses. Device check. | Use `h-dvh`, with `h-screen` as the fallback for old engines. | S | clean |
| M13 | Keyboard over inputs | both | Medium | There is no `visualViewport` handling anywhere. Bert is anchored to the lower third, and Copy From, Share and the edit form have inputs low on the screen. When the iOS keyboard opens, the fixed layers don't move, so the input can end up under the keyboard. Device check. | A small `useVisualViewport` hook that sets a `--kb` custom property on `:root`. Bottom-anchored sheets and modals pad by it, and a focused input scrolls into view inside its own scroller. Bert on mobile anchors to the top while the input has focus. | M | clean |
| M14 | Safe areas | both | Low | `MobileBottomSheet` and `AdaptiveSplitView` use `env(safe-area-inset-bottom)`, but the viewport meta has no `viewport-fit=cover`, so the inset is always 0. That's harmless in a Safari tab, but wrong for an installed web app or a future full-bleed layout. | Only when full-bleed is wanted: add `viewport-fit=cover`, and give every fixed bottom bar (Library Actions, entity footer, pager, Import CSV footer) the same inset padding. Until then, leave it. | S | clean |
| M15 | Small targets outside dense rows | both | Medium | Measured: entity "Go back" 20×20; pager Previous/Next 20px tall; toast "Dismiss" 16×16; "Clear search" 16×16; search "tips" 23×20 (playground); Files row ⋯ 22×22; Import CSV row "View" 22×22; relationships "Search tips" 17×17 and footer Collapse/Expand all 17px; ToC Collapse/Expand All 16px; click-to-fill "Stop filling" ×16; Share "Lookup help" 20×20; task "Cancel" 20×20; graph nodes 6–7px; time-strip range handles 12px wide (playground). All are under the 24px WCAG 2.2 minimum. `M15-*.png`, `M29-*.png` | Extend the hit area without changing the drawing: `relative` plus an `::after { inset: -10px }` (or padding with a negative margin) on icon buttons and text links, which gives at least 40px. Graph nodes get an invisible r=16 hit circle. Time-strip handles get a 24px transparent grip. Dense list rows (facets, results, ToC) keep their 1.75rem height; the row itself is the target. | M | clean |
| M16 | Navbar menu | pg | Medium | The menu opens at half height. Theme, RTL, language and User/System settings sit below the fold, and a fade is the only sign there is more. `M16-*.png` | Open the menu sheet at full height on phones, or move the Settings group above ML tools. | S | pg-only (then main via M04a) |
| M17 | Library · Display / View menus | both | Medium | Display options and View are desktop popovers on phones. Display runs from the top bar almost to the bottom edge, and it's a long list of small rows with no Done. `M17-*.png` | With the queued ⋯ → bottom bar work, open Display options and View as bottom sheets with a header and Done, the same shell as Filters. | M | clean (queued with Code) |
| M18 | Library · time strip | pg | Medium | The strip takes about 110px of every Library screen, and at 360–390 its axis labels overlap ("Jan 2023Apr 2023"). `M18-*.png` | Default it off on mobile (it stays in the Display menu), and when it's on, show at most 3 axis ticks under 430px. | S | pg-only |
| M19 | Library · list view | both | Medium | The Title column truncates to about 10 characters ("Case 10.48…") while Country is "—" for every row and Date takes a fixed column. `M19-*.png` | On mobile, render the list as title + one muted meta line (type · date), with no table columns. Sort stays in the Display menu. | M | clean |
| M20 | Library · map view | both | Low | The map is a short band in the middle of an otherwise empty screen. `M20-*.png` | Let the map fill the pane's height on mobile, and pin the count caption to its bottom edge. | S | clean |
| M21 | Document viewer | both | Medium | The PDF renders at fit-width, where body text is about 5px on a 390px screen. There are no zoom controls on phones, and pinch zooms the whole UI (navbar, bars) because the shell is fixed. `M21-*.png` | A zoom control in the ⋯ menu (Fit width / 125 / 150 / 200), with the page scrolling in both directions inside its pane; or pinch handled on the page canvas only. The Plain text and HTML renditions are the readable default on phones; offer them first. | M | clean |
| M22 | Document · text selection | both | Medium | The FloatingMenu ("Create relationship" and the other actions) appears above the selection, exactly where iOS draws its own copy/lookup callout. Device check. `M22-*.png` | On touch, place the FloatingMenu below the selection, or dock it to the bottom bar while a selection exists. | S | clean |
| M23 | Document · ToC sheet | both | Low | The title appears twice: the sheet header "Table of contents" and the panel's own "Table of contents" heading. `M23-*.png` | Hide the panel heading when it sits in a sheet; keep Collapse/Expand All in the sheet header. | S | clean |
| M24 | Bert modal | both | Low | The header shows "⌘K", meaningless on touch. The context chip reads "View Component catalog" while the user is in the Library. `M24-*.png` | Hide the shortcut hint under `(hover: none)`. Fix the Auto context to name the current view. | S | clean |
| M25 | Library · Results rows | pg (main's search stays in Cards; not checked) | Low | Match chips ("1 title match") wrap to two lines next to a truncated title. | Put the match chips on the meta line under the title on mobile. (The Results sheet work may already cover this; check it there.) | S | clean (check against queued Results sheet) |
| M26 | Settings · Paragraph Extraction | both | Low | The table is cut at "PARAGR…", with sideways scroll and no sign of it. `M26-*.png` | Stack the columns on mobile (template, status chip, count on one line). | S | clean |
| M27a | RTL · rendition menu | main | Medium | In RTL, the PDF / Plain text / HTML menu opens at −71px, off the left edge. `M27-main-*.png` | Anchor it with logical properties (`inset-inline-end`), as playground already does. | S | main-specific |
| M27b | RTL · translation toast | pg (main not checked) | Low | "No translation in AR. Showing EN" renders as "No translation in AR. / .Showing EN": an English sentence inside an RTL container without `dir`. `M27-pg-*.png` | Put `dir="auto"` (or `<bdi>`) on the message text. | S | clean |
| M28 | Library · search box | both | Low | At 360–390 the placeholder truncates mid-word ("Search title & me"). On main, the "tips" chip takes about 47px of the box. `M28-*.png` | A mobile placeholder, "Search", and the tips chip as an icon only under 430px. | S | clean |
| M29 | Relationships · graph on phones | both | Low | 6–7px nodes, labels only on the branch pills; hard to use at 390px. `M29-*.png` | Keep the graph available, but on phones open it at a larger node size with hit circles (M15). The redesign's Map (relationships-redesign-v3 §2) replaces it later. | S | clean |
| M30 | Collection switcher | both | Low | Desktop has the "Sample ▾" collection switch in the Library crumb; phones have no way to change collection. | Add "Collection" to the menu sheet (with M04a/M16). | S | pg first, then main |

**Not issues** (checked and fine):
- Sheets and modals fit at all three widths: Filters, Actions, menu, ToC, Share, Delete confirm, Copy From, New Import, Bert.
- Dark mode shows no contrast or visibility regressions in the screens read.
- The notifications drawer fits, and its task rows are usable.
- Long-press selection works and shows its bottom bar.
- The click-to-fill "listening" chip shows correctly on phones.
- The entity section switcher (Document / Metadata / Relationships / Files) works.
- Upload PDF opens the native file picker, and Export CSV downloads a file.
- The one unnamed-control hit (the logo button) is a false positive: its image has `alt="Uwazi"`.

---

## Batches

Each batch can ship on its own. The order is by impact.

**Batch 1 — Can't do it on a phone** (M01, M02, M03, M08, M04a/M04b)
- M01, M02 and M03 are the same pattern: a panel that only exists in the desktop right pane. Land them with the queued stacked-sheets work, as its first three consumers.
- M08 is a single Actions entry.
- M04a ports playground's menu section to main. M04b fixes the list on playground, and main then takes the same code.
- Ports: M01–M03 and M08 are clean. M04 needs main-specific work: port the menu section, then the list fix.

**Batch 2 — Viewport foundations** (M05, M06, M12, M13, M14)
- Mostly `index.css` and `App.tsx`, plus a small hook for M13.
- M06 is a port to main.
- Ports: clean; M06 is main-specific.
- The one batch that needs a real iPhone to verify (keyboard, dvh, zoom-on-focus).

**Batch 3 — Overflow and clipping** (M09, M10, M11, M26, M27a, M27b)
- Ports: clean, except M11 and M27a, which are main-specific ports of fixes playground already has.

**Batch 4 — Touch affordances** (M07, M15, M22, M24)
- One `(hover: none)` rule, one hit-area utility, and a FloatingMenu placement change.
- Ports: clean. It respects the dense-row rule: no list row grows.

**Batch 5 — Layout polish** (M16, M17, M18, M19, M20, M21, M23, M25, M28, M29, M30)
- M17 folds into the queued ⋯ bottom-bar work. M18 is playground-only. M21 is the only M-size item here.
- Ports: clean, except M16 and M18, which are playground-only.

**Suggested order:** 1 → 2 → 3 → 4 → 5.

- **Must be on main:** batches 1–3 are what Juan asked for.
- **Worth doing on both:** batches 4 and 5.

## Who

- **Code:** Batches 1–3 and the M15 hit-area utility.
- **Design (me):** the M19 mobile list layout, the M21 zoom control, and the M17 sheet shells, if Juan wants to see them before Code builds them.
- **QA:** re-run `harness/audit.cjs` on both branches after each batch. It prints the same checks, so regressions show as diffs.
- **Device check (someone with an iPhone):** M05, M12, M13 and M22 after Batch 2. Headless Chromium can't reproduce Safari's keyboard, toolbar or zoom behaviour.
