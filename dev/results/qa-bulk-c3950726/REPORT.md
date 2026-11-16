# QA: Library bulk feature on playground c3950726

Served from my own detached worktree on :1426 (lsof -> cwd -> `git rev-parse` = c3950726, clean apart from the node_modules symlink). Headless Chromium (Playwright); 390px runs used touch emulation; Juan's Chrome window not used. Sample and CEJIL, light and dark at 1440; 390 on Sample. ~250 screenshots and the exported CSV files are in this folder. No console errors in any run.

Note: playground has moved on to 969df104 ("bulk review 2": guards, touch, safe Undo, keep files, ...). Everything below is c3950726; I did not test the later commits.

## FAIL

1. Phone (390): the four footer actions are unreachable. Create entity, Upload PDF, Import CSV and Export CSV (results) are `FooterButton` = `hidden sm:flex` (LibraryView.tsx:1504 at this commit), the bar renders empty, and the toolbar's "More options" menu holds only Filters / Results. Repro: 390x844, Sample, Library: no button at the bottom, no menu entry. Shots: phone-selected-Sample-light-390.png.
2. Phone (390): no way to select. No touch route exists at this commit (no `useTouchSelection`; it arrives in d2b020d3). A 700 ms press-and-hold on a card ends as a tap and opens the entity (the cards disappear). So the selection bar, Actions sheet, bulk edit, share and delete cannot be reached on a phone. Repro: touch emulation, 390px, press and hold a card 700 ms. Shot: phone-after-longpress-Sample-light-390.png.
3. Cmd/Shift+click on a card's exhibit thumbnail opens the lightbox instead of selecting. Repro: Sample, Cards, Cmd+click (or Shift+click) the thumbnail of "Case 12.250 (Bámaca Velásquez)", "Forced Displacement", "Pedro Cabrera" etc.: `ImageLightbox` opens, selection stays 0, and the modal blocks the footer. The thumbnails are a selection dead zone. Shots: thumb-Meta.png, thumb-Shift.png.
4. "Select all N" is covered by the "1 filter" button at 1440. Repro: CEJIL, tick Type "Resolución de la CorteIDH", press the footer select-all box (120 selected): the offer "Select all 1,084" renders under the "1 filter" trigger and its click point hits "1 filter" (elementFromPoint). OK at 1280 and 1700. Shot: selectall-overlap-1440.png.

## Observations (not failing the brief, worth a decision)

- Editing a seeded record is blocked by the required Description: Sample Court Case and CEJIL Causa records have none, so Save is disabled with "1 error blocks saving" until a description is typed. Once filled, Save works (all checks below).
- In Results only the title button takes Cmd/Shift-click (Cards/List/Timeline take the whole row). Tree, Passages and Spine layouts carry no selection control at all (only the grouped card has `EntitySelectBox`).
- After "Select all 4,398", unticking the footer box removes only the 120 loaded entities; 4,278 stay selected without a prompt (CEJIL).
- Created and edited entities do not survive a full page reload (in-memory store); they persist across views and searches. The brief said "session".
- Share review reads "Make 41 entities private" but the button says "Apply to 53 entities" (12 already private).
- Ctrl+click could not be exercised: Chromium on macOS turns Ctrl+click into a context click. Cmd and Shift verified.
- "Open entity" (View entity) is absent from the drawer while a form is open (spec: `invisible`, kept in the layout); no visible defect.

## PASS (Sample and CEJIL, light and dark unless noted)

- Create entity: template picker, save, entity appears in Cards, List, Timeline, Results and is found by title and by a field value (Sample light/dark, CEJIL light/dark).
- Upload PDF with 2 real PDFs (Gelman EN 606 KB, Bámaca EN 948 KB): modal with a title per file, Beacon task, count 53 -> 55, uploaded entity opens with a working PDF viewer (Sample light/dark, CEJIL).
- Import CSV routes to Tools > Import CSV with the New Import dialog.
- Export CSV: file uwazi-<corpus>-<date>.csv, BOM, header Title,Template,Language,Date added + template union; "|" joins (people, related cases, rights invoked; CEJIL descriptors); formula cells (=, @, +, -) neutralised with a leading apostrophe; ISO dates on CEJIL; export of a selection = exactly the selected rows with only their templates' columns; export of results follows the search (17 rows = 17 results); every row has the header's column count.
- Selection: Cmd+click toggles and Shift+click ranges in Cards, List, Timeline and Results; no visible checkbox (hidden box 1x1), rows are bg-parchment, no text selected, no layout shift (Sample and CEJIL, light and dark: 120 checks, 0 fails).
- Keyboard: Tab reaches the hidden "Select <title>" box, the card shows the focus ring, Space toggles, Shift+Arrow extends and moves focus, Escape clears.
- Select-all box selects the loaded entities; "Select all 4,398" selects every result; "N not in view" appears when a search hides selected entities.
- Selection drawer: lists the selection, Remove X drops one, Close keeps the selection, Actions menu opens by keyboard, arrows move, Escape returns focus to Actions.
- Single edit saves (Sample and CEJIL): card, List, Timeline, Results and search follow; Status value moves on the card.
- Thesaurus: Add value appears in the picker, is selected, shows on the card and in the Library facet and in Settings > Thesauri > Case status; Create thesaurus (Organization "Type") binds the property, lists its values, saves, shows in the facet and in Settings > Thesauri.
- Bulk edit: Mixed placeholders, "Will change", Revert, tri-state coverage "N of M" projected live, review text names count, entities and change, Apply, Undo from the notifications drawer restores exact values (including a value that was absent), dirty guard on selection change, over 200 entities runs as a Beacon task with progress; Cancel at 37% reports "Cancelled after 400 of 1,084 entities" and coverage is exactly 400; Cancel at 0% changes 0.
- Change template: preview with KEPT / DROPPED / NEW and "always kept" line, apply, kept property keeps its value, Undo restores template and values.
- Share + Permissions: Mixed access "41 published, 12 private", Will change / Revert, review step, Apply, Status facet follows (12/41 -> 53/0), Undo restores 12/41; Permissions opens the same dialog with the user field focused, adds "afarah", persists, Undo removes it.
- Delete: confirm names the count, entities leave every view (53 -> 50), Undo re-adds the same cards.
- Copy From: two steps, step 2 lists current -> incoming with select none and a live count, values are staged in the form only, Cancel discards.
- No horizontal overflow at 390.

## Not exercised
Ctrl+click (see above), Windows/Linux rendering, RTL, keyboard route in List/Timeline/Results, the bulk features on a phone (no route to them), CEJIL Share/Permissions/Delete/Change template, dark 390, the commits after c3950726.
