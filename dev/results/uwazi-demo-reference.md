# Uwazi demo reference (demo.uwazi.io, "UN Membership (Demo)", signed in as admin)

Observed 2026-09-21 in Chrome at ~1500px wide, in a tab I opened, using Juan's existing session. Look-only: I opened forms and dialogs and cancelled out; I saved, published, deleted and imported nothing. One exception to report: I clicked "Export CSV" once (see 3), no dialog appeared and a download may have started. Screenshots were viewed, not saved to disk (the path `dev/library-bulk/` was not writable for me; this file is in `dev/results/`).

## 1. Multi-select in the library

- Hint text under the grid: "ProTip! Use cmd or shift + click to select multiple cards." Cards, list and map have the same header line: "N selected of 30 shown of 504 entities" and a "Select all" button beside the sort control. (I did not click Select all, so I don't know whether it selects the 30 shown or all 504.)
- Plain click on a card: selects it (blue border on the card, "1 selected"), and the side panel shows that entity's read view with tabs (info, search, connections count) and a footer of View / Edit / Share / Delete.
- cmd+click: adds/removes a card. Result: "2 selected", side panel title "✓ 2 selected" with an X to clear, then a plain list of the selected entities (title + coloured template tag), footer Edit / Share / Delete (no View).
- shift+click: a real RANGE from the last-clicked card: Edda Ceccoli selected, shift+click on a card two rows down gave "7 selected" (the anchor plus the six cards after it in grid order), listed in the panel in grid order. Selecting a range replaced the earlier cmd-selection (the earlier "test"/"TEST" cards were not kept).
- The selected count sits in the results line; the panel lists every selected entity (no cap seen up to 7).
- Footer of the whole library (left, always visible): Create entity, Upload PDF(s) to create, Import CSV, Export CSV. Right, under the filters: Clear Filters. Nothing in this bar changes with a selection; selection actions are in the side-panel footer.

## 2. Bulk edit (side panel "Edit" with N selected)

- Banner at the top (amber): "Warning: you are editing multiple entities. Fields marked with a ⚠ will be updated with the same value." Header stays "N selected". Footer: Cancel / Save (green).
- **Mixed templates** (Leadership + Document + Leadership): the form shows Type ("Select..."; options: Admission to the UN, Document, Leadership, State, TO REVIEW: Submitted Document) and only the properties common to the selected templates (here just the "Uwazi Features" multiselect with "add value", a search box, checkbox list, "6 more"). No Title field. A field the user touches gets a ⚠ icon before its label and the ticked value moves to the top with a green check.
- **Same template** (7 Leadership): the same banner, Type preset to "Leadership", and every property of the template in template order: Image, State (with "affects Region of State, Map"), Region of State, Role(s) (with "add value"), Gender, Relevant Tenure as Head of Government (From/To), Currently Serving as Head of Government, Tenure as UN Secretary-General, Currently Serving..., Image Credit, Image Source Link, Relevant Video, Map, Uwazi Features, Additional Notes. No Title (titles are per entity).
- I did not see how a property whose values differ across the selection is displayed (the selections I tried differed in State/Role, and the fields appeared empty/unticked with no "mixed" marker). The ⚠ appears only after the user edits the field.
- Changing Type in bulk: the Type select is present in both forms (same list as the single-entity form). I did not change it, so the confirm wording and what happens to properties are not observed.
- Cancel with the bulk form open (even unchanged): a modal "Confirm / Discard changes" with Cancel and a red Accept. Save wording not observed (not clicked).
- Single-entity Edit form for comparison: Title *, "add icon", Type select, then the properties; footer "Copy From", Cancel, Save (green). Cancelling an unchanged single edit closes without a confirm.

## 3. CSV export

- "Export CSV" is in the library footer next to "Import CSV". Clicking it with 3 entities selected produced NO dialog: the page did not change. A file download may have started silently; I did not verify and did not click again. Whether it exports the selection or the whole current search was not determined. Recommend Juan checks his Downloads folder and confirms; I should have asked before clicking a button that can download a file.
- Import CSV is a separate footer button (not opened).

## 4. Footer / action buttons

- Library footer: Create entity (green when the pointer is over it), Upload PDF(s) to create, Import CSV, Export CSV; all four are always visible to an admin. Signed out, only Export CSV and Clear Filters exist.
- Side-panel footer with a single selection: View, Edit, Share (green), Delete (red). With several: Edit, Share (green), Delete (red). There is no Publish/Unpublish button; publishing is done through Share (below).
- I did not press Delete.

## 5. Thesauri in the edit form

- Select/multiselect properties render as an inline checkbox list with a "Search item" box and "N more" expander; the chosen value moves to the top with a green check (single-entity form: State shows "✓ San Marino" first). Some also show flags. Properties can be linked ("State (affects Region of State, Map)" with an info icon).
- "add value" link next to a thesaurus property label (Role(s), Gender, Currently Serving..., Uwazi Features, ...) opens a small modal "Add thesaurus value": a single "Value" text field, Cancel / Save. So a thesaurus VALUE can be created from the form, in bulk edit too. I cancelled it. A whole new thesaurus is only created in Settings (not opened).

## 6. Permissions / Share / publish

- Share with 3 mixed entities opens "Share with people and groups": an "Add people or groups" input and rows: Administrators and Editors ("Can edit", fixed), Public ("Mixed access"), demo ("Mixed access"), HURIDOCS ("Mixed access"). Each row's select offers "Can see", "Can edit" (or "Mixed access"), "Remove". So "Public: Can see" is publishing; "Public: remove" is unpublishing, and mixed state is shown as an explicit "Mixed access" option. Only a "Close" button was visible before any change; I made none.
- Cards show a lock icon on restricted (unpublished) entities; the filter panel has "Published 492 / Restricted 12" toggles (both ticked by default for an editor) and a "Permissions" facet group (Shared as viewer / Shared as editor with counts by user or group).

## 7. Copy From (single-entity edit form)

- Button "Copy From" in the edit footer. Opens a wide panel over the library: title "Copy properties to this entity from:". Left column: the target entity's own form (unchanged, editable, with the same fields). Right column: a Search box (Enter to search), results as title + template tag (searched "Achille" → "Achille Van Acker, Leadership").
- Clicking a result shows the SOURCE entity's read-only property list in the right column (State, Region of State, Role(s), Gender, Relevant Tenure, Map...). Footer: a back arrow (returns to the search results), Cancel, and a green "Copy Highlighted" button. The intent is to highlight source properties and copy those into the form; my click on a property did not visibly change the highlight, so how properties are chosen and how it maps between differing templates is NOT verified. I did not press Copy Highlighted.
- Cancel closes the panel and returns to the target's edit form with its values unchanged. I did not test what happens when navigating away mid-flow.

## What to copy

- Range and toggle: plain click = select and preview; cmd+click toggles; shift+click selects the range from the last click; panel lists the selected items; "N selected of M shown of T" in the results line; a hint line for the modifiers.
- Bulk edit banner wording and a per-field marker that only shows on touched fields; no Title in bulk; Type offered in both same-template and mixed forms; a discard confirm on Cancel.
- "Mixed access" as an explicit state in Share; publishing as the Public row of Share rather than a separate button.
- "add value" from the form with a one-field modal.
- Copy From as a two-column overlay (target form beside source picker) with a back arrow and one action.

## What to improve (differences from our prototype)

- Their selection actions live in the side panel footer and the footer bar does not react; ours could tint the bar (as ToolsActionBar does) and keep the list in the drawer.
- Their cards give no non-colour cue for "selected" beyond the blue border and count; ours needs a real checkbox for a11y (see map §7).
- Their bulk form doesn't show mixed current values or the number of entities that would change; we can show "N of M have a value" per field.
- Their Export CSV gives no feedback in the UI and is ambiguous about selection vs results; ours should ask or state which.
- Their Cancel-with-no-changes still asks for confirmation in bulk edit; ours should not.
- Their Share dialog has no visible Save until a change (unverified); ours has Save/Discard when dirty and persists nothing. Both need the persistence layer.
- Our ShareEntityModal is single-entity, starts "private" regardless of `Entity.published`, and has no "Mixed access" state.

## Not verified

Select all (30 vs 504), what Export CSV exports and whether it downloaded, Save wording and outcome of bulk edit, bulk Type change, how differing values display in the bulk form, Delete confirm wording, Copy Highlighted mechanics, Copy From navigation-away behaviour, the map view selection, Import CSV dialog, thesaurus Settings pages.
