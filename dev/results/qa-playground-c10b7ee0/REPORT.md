# QA: origin/playground c10b7ee0 (2026-09-24)

Served from a detached worktree of c10b7ee0 (`git status` clean), Vite on the reserved port 1427. The claude-in-chrome window could not be set to 1440 CSS px: `resize_window` leaves `innerWidth` at 1710. All checks therefore ran in headless Chromium (Playwright) at 1440x900, light and dark. "360" means the Library drawer at its minimum width (`Home` on the resize separator, aria-valuemin 360). Screenshots are in this folder, named `<check>-<theme>-<width>.png`.

## Defects

### D1 (high): at the 360 drawer, "Copy from…" is clipped and cannot be clicked
Steps: Library, drawer to minimum width (focus the resize separator, press Home), Create entity.
- The edit bar is 360 px wide but its four buttons need 437 px (Copy from… 991-1104, Cancel 1116-1180, Save and create another 1192-1356, Save 1368-1428; bar starts at x=1080). "Copy from…" overflows 89 px to the left, so only "i…" shows at the drawer edge.
- Playwright's click on the button is intercepted by the Library's bottom bar (`div.bleed.h-12.bg-paper` in `[data-part=content]`), so a mouse cannot reach it. Keyboard focus and Enter still work.
- Same in dark and light, and in the Duplicate draft. At the default width (460) the bar fits (980-1440, no clipping).
- Screenshots: `1-editbar-light-360.png`, `1-editbar-dark-360.png`, `4-copyfrom-dark-360.png`.
- Not reproduced at 360: the labels do not wrap (whiteSpace nowrap except "Save"), the problem is horizontal overflow only.

### D2 (medium): changing the template on a draft copies the typed Title into the other languages
Steps: Create entity, type Title "QA person one" (Languages row reads "3 of 3 other languages empty"), change the template to Violation.
- Result: Español, Français and العربية title fields all now contain "QA person one" and the row reads "3 other languages set". The user never entered them, and no confirm mentioned it.
- Screenshot: `2-retype-title-langs.png`.

### D3 (low): Batch entry closes with focus on `<body>`
Steps: Create entity chevron menu, Batch entry…, Escape (or Cancel).
- `document.activeElement` is BODY afterwards. Upload documents, Add file, Create relationship, New import and Copy From all return focus to their trigger. The menu item unmounts, so the trigger (chevron button) needs to be the restore target.

### D4 (low): `__gutter()` fails on two of the shared modals
- Batch entry (Person template, 768 px wide host): `starts [0,16]`, `ends [-182,16]`. The grid table is 182 px wider than the host; it sits in a scrolling `bleed-flush overflow-auto` div, so the page is usable (horizontal scroll), but the check reports a fail.
- Create relationship, step 2 (relation type list): `starts [0,16]`, `ends [0,16]`. The "Relates to" and "Refers to" rows are full-bleed elements without the `bleed` marker (rows listed with `bleed:false`, start 0 / inkEnd 0). Text lines up at 16 visually.
- Upload documents, Add file, New import (Library and Import view), Create relationship step 1 all pass.

### D5 (low, observation): Batch entry template picker is a native `<select>`
The create flow's picker is the searchable floating TemplateSelect; the Batch entry modal still uses a native select (`2-batch-empty-light.png`). Not necessarily a bug, listed because the brief says "one template picker".

### D6 (low): Side cards truncate labels and values at 1440
With the drawer at its default width the two-column side cards (470 px each) show "ACCEPTS COURT…", "RESPONDENT ST…", "CONVENTION AR…", "SOURCE INSTRU…" and "North Ameri…". `5-side-light.png`. In Portrait + Small the footer type label truncates to "COURT C…" (`5-portrait-small-light.png`).

### Brief mismatch
The edit bar has no "Save all"; the buttons are Copy from…, Cancel, Save and create another, Save. If "Save all" is meant for another surface (batch or bulk edit), it was not found in the new-entity bar.

## Passed

1. New-entity edit bar (default width 460): Copy from… (label present), Cancel, Save and create another, Save all fit, no wrap, in light and dark. FAILS at 360 (D1).
2. Create flow
   - Create entity opens the draft directly; Template is the first field.
   - TemplateSelect: opens over the form, Title top unchanged (268.25 before and after); flips above the trigger when the viewport is 420 px tall (panel 8-188, trigger 192-230); search filters ("cou" gives Court Case, Country) with accent folding in code; ArrowUp/Down, Enter, Escape (closes list only, focus back on trigger, drawer stays open), Tab closes; typing a character on the trigger opens it with that character.
   - Recents: after a save the list shows "Recent: Person" above "All templates".
   - Drop-values confirm ("Change to Violation? Violation has no property for Profession…"): Escape and Keep this template leave Person and the value; Change template drops Profession, keeps Title and Description. Light and dark.
   - Save and create another: entity saved (53 to 54), next draft opens empty with the pinned Profession carried, toast "Saved “QA pin one”. The next one is open, 1 pinned value filled in." Pin toggle appears on hover, shows "Pinned", not offered on Title or Description.
   - Duplicate (Metadata tab actions): opens a Court Case draft with Case number and Date filed carried, Title and Description empty; Cancel returns to the Library, count unchanged.
   - Batch entry: pasting TSV fills the grid from the cell; a row with values and no Title is flagged (yellow, aria-invalid, "Needs a title"); select cells with unknown values are flagged ("Bogus", "Treaty"); footer reads "2 rows ready · 1 cell needs a fix" and the commit reads "Create N entities"; creating adds the rows and a notification. Date validation could not be exercised: the seeded "Date of birth", "Date filed" and "Date of adoption" columns are text fields.
3. Shared Modal (light and dark): Import CSV / New import (Library and Import view), Upload documents (via file chooser), Add file, Create relationship: aria-modal and labelled, initial focus inside, Tab and Shift+Tab stay inside over 14 and 3 presses, Escape closes and focus returns to the trigger, footer is Cancel ghost (transparent, no border) plus one commit (ink, or disabled parchment). `__gutter()` passes except D4.
4. Copy From scrim covers the whole drawer pane (980,52 to 1440,900 at default; 1080,52 to 1440,900 at 360), including header, tabs and footer (hit-tests at header, footer and close X all land on the scrim); Escape closes the picker and keeps the draft. Light and dark, both widths.
5. Library
   - Side layout: 2 columns at 1440 (x=12 and 494); 2 columns at 360 too.
   - Small size: thumbnails shrink in Side (80 px chip) and Stacked (3 columns at 342 px).
   - Portrait frame: Small gives 5 columns (201 px), Medium 4 (254 px); Side + Portrait 2 columns.
   - Doc peek: none at 150 ms and 300 ms, up at 500 ms; leaving settles and clears; hovering the title never raises it; no card up right after wheel scrolling.
   - Selection: Cmd-click and Shift-click build a selection (bar: Edit, Change template, Export CSV, Share, Permissions, Delete, "N selected", Clear, all on one line at both drawer widths); a plain click on a card collapses it to that card only; Remove in the selection drawer deselects the card (3 to 2); the 3 row Remove and Preview buttons are named.
   - Footer actions: Create entity, Upload PDF, Import CSV, Export CSV; Import CSV opens the shared modal (passes).
   - Console: no page errors; only pdf.js "TextLayer task cancelled" warnings.

## Not covered
Real Chrome at exactly 1440 (window resize does not change the viewport in this harness; headless used instead). Date-typed batch columns (no such template in seed data). Storybook a11y.

## Method
`dev/results/qa-playground-c10b7ee0/*.png` plus the scratch scripts under the session scratchpad. Nothing tracked was edited; the worktree was detached.
