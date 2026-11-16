Path prefixes used in cites (all relative to `uwazi-ref`): `T/` = `app/react/V2/Routes/Settings/Thesauri/`; `UI/` = `app/react/V2/Components/UI/`; `FORM/` = `app/react/V2/Components/Forms/`; `V2/` = `app/react/V2/`; `CORE/` = `app/api/core/`; `API/` = `app/api/`; `csv:N` = `contents/ui-translations/en.csv:N`. "(unverified)" = read from code, not run, or depends on a library not present in the repo checkout.

### Thesauri

**1. Screen map**

Routes: list `/settings/thesauri`, new `/settings/thesauri/new`, edit `/settings/thesauri/edit/:_id` (`app/react/Routes.tsx:451-462`). Admin only (`adminsOnlyRoute`, same lines). Rail link "Thesauri" under the "Metadata" group, admin only (`V2/Routes/Settings/SettingsNavigation.tsx:50-56`).

List page, top to bottom:
- Header: title `"Thesauri"`, no breadcrumb, no description banner, no subtitle (`T/ThesauriList.tsx:63`; header component `V2/Components/Layouts/SettingsContent.tsx:57-86`). On phones a back chevron with sr-only "Navigate back" (`SettingsContent.tsx:62-67`, csv:782).
- One bordered card (`T/components/ThesauriTable.tsx:27-42`):
  - Card header bar: h2 `"Thesauri"` (`ThesauriTable.tsx:37-39`). No search, no filter, no count.
  - Column header row (CSS uppercase, `UI/Table/Table.tsx:302`), left to right:
    1. checkbox column, header checkbox with sr-only `"Select all"` (`UI/Table/RowSelectComponents.tsx:69`); not sortable.
    2. `"Label"` (width 6/12), sortable (click toggles; chevron up/down/up-down icon), default sort `name` ascending (`ThesauriTable.tsx:30`, `T/components/TableComponents.tsx:128-133`).
    3. `"Templates"` (width 6/12), not sortable (`TableComponents.tsx:134-139`).
    4. `"Action"`, not sortable (`TableComponents.tsx:140-145`).
  - Row: checkbox (sr-only `"Select"`, `RowSelectComponents.tsx:36`) | thesaurus name in ink + a bordered translation pill (see Section 2 note) | gray `Pill` per template using it, text = template name translated in the template's context (`TableComponents.tsx:64-74`) | ghost button `"Edit"` (`TableComponents.tsx:76-87`).
- Sticky footer (`SettingsContent.tsx:95-113`), nothing ticked: primary button `"Add thesaurus"` (a link to `/settings/thesauri/new`), left aligned (`ThesauriList.tsx:86-95`). Rows ticked: footer tinted info (`highlighted`), danger button `"Delete"` then text `Selected {n} of {m}` (n = ticked rows, m = all thesauri, ticked or not) (`ThesauriList.tsx:73-85`). Snapshot text order: Selected, n, of, m (`T/specs/__snapshots__/Thesauri.spec.tsx.snap:232-245`).

Editor page (new and edit), top to bottom:
- Header: breadcrumb `"Thesauri"` (link to the list) then the current name typed in the name input, live (`T/EditThesaurus.tsx:125-128`). On `/new` the last crumb is absent until the first keystroke (`watch('name')` is `undefined`, `SettingsContent.tsx:78`) (unverified).
- One bordered card with shadow containing a `Table` (`T/ThesaurusForm.tsx:77-107`):
  - Card header bar, left: the name text input (placeholder `"Thesauri name"`, no visible label, always-visible clear "X" with sr-only `"Clear"` that does nothing, `ThesaurusForm.tsx:84-91`, `FORM/InputField.tsx:154-165`). Right: ghost buttons `"Collapse all"` and `"Expand all"`, shown only when at least one group exists; each disabled when it cannot act (`UI/Table/Table.tsx:265-289`, `:246-249`).
  - Column header row, left to right: drag column (sr-only `"Empty"`, `UI/Table/DnDComponents.tsx:170`) | select-all checkbox (sr-only `"Select all"`) | group-toggle column (sr-only `"Empty"`, only when a group exists, `UI/Table/GroupComponents.tsx:9`) | `"Label"` (width 11/12, sortable, no default sort) | `"Action"` (not sortable) (`T/components/TableComponents.tsx:109-124`, `UI/Table/Table.tsx:112-149`).
  - Value row: drag handle button (sr-only `"Drag row"`, `DnDComponents.tsx:76`) | checkbox | on group rows a button with chevron and visible text `"Group"` plus sr-only `"Open group"` (`GroupComponents.tsx:22-23`) | label in ink plus the translation pill (only for a saved thesaurus) | ghost `"Edit"`.
  - Group rows are collapsed on load (tanstack default, unverified); children are indented rows with a child indicator in the group column (`DnDComponents.tsx:141`).
- Sticky footer, nothing ticked, left to right: primary `"Add item"`, ghost `"Add group"`, ghost `"Sort"`, secondary `"Import"`; right side: ghost `"Cancel"` (link to `/settings/thesauri`), success (green) `"Save"` (`T/EditThesaurus.tsx:154-186`, `T/components/ThesaurusActions.tsx:33-44`). Rows ticked: tinted footer with danger `"Remove"` and `Selected {n}` `of` `{m}` where m = number of root rows only (`EditThesaurus.tsx:140-153`).
- Right side panels (500px, overlay) for add/edit item and add/edit group; see Section 4 (`UI/Sidepanel.tsx:71`).

Button visibility and disabled states (editor): `"Import"` disabled while the name input is empty (`EditThesaurus.tsx:170`); `"Cancel"` and `"Save"` disabled while `isImporting` (`EditThesaurus.tsx:184`, `ThesaurusActions.tsx:36,40`); the five left buttons are replaced by `"Remove"` while any row is ticked. `"Save"` is never disabled for pristine state.

**2. Fields**

| Label | Control | Placeholder | Help / tooltip | Default | Validation and message | Required | Cite |
|---|---|---|---|---|---|---|---|
| (none visible; header input, id `thesauri-name`) | text input with no-op clear X | `"Thesauri name"` | none | `''` on new; current name on edit | Client: `required: true`; failure only turns the input red (`hasErrors`), no message, no request. Server create: trimmed, `"Name cannot be empty"` (Zod, also `"Name is required"` when not a string). Server create and rename: exact, case-sensitive match against another thesaurus: `A thesaurus with name "{name}" already exists` (HTTP 422). Server update with unchanged name: no check; update does not trim or check empty (unverified) | yes | `T/ThesaurusForm.tsx:84-91`; `CORE/domain/thesaurus/Thesaurus.ts:64-71`, `:216-224`; `CORE/domain/thesaurus/errors.ts:14-20`; `CORE/infrastructure/mongodb/thesauri/MongoThesauriDataSource.ts:60-71`; `CORE/application/ThesauriService.ts:36-43,61-66` |
| `"Title"` (Add item panel, one per card, card title `"Item"`) | text input; typing in the last card appends one more empty card | none | none | one empty card | Client: none. On submit, cards whose raw label is `''` are dropped, others are whitespace-collapsed (newlines to space, runs of spaces to one, trim). No duplicate check. Server create: `"Label cannot be empty"`; duplicates (same level, exact string): `Thesaurus with Id: "{id}" has duplicated labels: "{a}" "{b}"` where a nested duplicate prints as `{group}/{label}`. Server update: neither is checked (unverified) | no | `T/components/ThesauriValueFormSidepanel.tsx:40-67,108-117`; `app/shared/sanitizationUtils.ts:20-27`; `CORE/domain/thesaurus/Thesaurus.ts:49-88` |
| `"Group"` (Add item panel, select inside each card) | select, options: `"No Group"` (hard-coded, not translated) then every existing group by label | none | none | `"No Group"` | none; disabled when editing an existing item (shows its current group) | no | `ThesauriValueFormSidepanel.tsx:118-134`, `csv:818` |
| `"Title"` (Edit item panel) | text input, one card | none | none | current label | blank submit: panel closes, nothing changes (blank rows are filtered before submit). Edit only changes the label | no | `ThesauriValueFormSidepanel.tsx:31,56-67`; `T/helpers.ts:125-141` |
| `"Name"` (Add/Edit group panel, card title `"Group"`) | text input | none | none | `''` / current group label | Client: `required: true`, message `"This field is required"` under the card and red input. Server: same as item label | yes | `T/components/ThesauriGroupFormSidepanel.tsx:143-156` |
| `"Title"` (group panel item cards, card title `"Item"`) | text input, repeating; typing in the last card appends one more | none | none | one empty card (add) / existing children plus one empty card (edit) | Client: every card except the last is `required` (red state only, no message); field-array rule `minLength: 2` means at least one real card plus the trailing empty card, otherwise `"This field is required"` shows under the first card. Submitting an untouched add form shows two `"This field is required"` messages (name and first card) | at least 1 item | `ThesauriGroupFormSidepanel.tsx:40-45,85-102`; `T/specs/Thesauri.spec.tsx:216-232,266-278` |
| (Import) file | hidden `<input type="file" id="import">` opened by the `"Import"` button; no `accept`, no size check | n/a | none in UI | none | server: see Section 6 and Section 5 (CSV errors) | no | `T/components/ImportButton.tsx:38-51` |

Info banners (inside add-mode panels, above the first card; shown only when opened empty):
- Add item panel: heading `"Adding items to the thesauri"`; body line 1 `"You can add one or many items in this form."`; line 2 (key `thesauri new item desc`) `"Once you type the first item name, a new item form will appear underneath it, so you can keep on adding as many as you want."` (`ThesauriValueFormSidepanel.tsx:83-107`; `csv:88,1531,1320`).
- Add group panel: heading `"Adding a group and its items."`; line 1 same; line 2 (key `thesauri new group desc`) `"Each item created will live inside this group. Once you type the first item name, a new item form will appear underneath it, so you can keep on adding as many as you want."` (`ThesauriGroupFormSidepanel.tsx:117-142`; `csv:87,1319`).
- Note: `csv:1319-1320` store the key itself as the English value; the long text lives in the in-code default and in migration `API/migrations/migrations/164-update-translations/index.ts:15-24`. Use the long text.

Translation pill (list name cell and editor value cell): a small bordered chip next to the label showing the label translated in the thesaurus context. Visible when the translation differs from the label; when equal it is hidden unless Live translate is active (`T/components/TableComponents.tsx:11-62`). Not shown for a thesaurus that has no `_id` yet.

Limits not found: no max length for name or labels in client or server; no maximum number of values (none found).

**3. Row actions and bulk actions**

List:
| Label | When enabled | What it does |
|---|---|---|
| `"Edit"` (row button) | always | navigates to `./edit/{_id}` (`T/components/ThesauriTable.tsx:22-24`) |
| Row checkbox `"Select"` | disabled for any thesaurus used by at least one template (computed from `templatesAtom`, `disableRowSelection: true`); boolean, so no tooltip, no reason shown | adds to selection (`T/ThesauriList.tsx:26-35`, `UI/Table/RowSelectComponents.tsx:37-43`) |
| `"Select all"` header checkbox | always | selects only selectable rows (tanstack `enableRowSelection`, `Table.tsx:165-168`) |
| `"Delete"` (footer) | one or more rows ticked | opens the Delete confirm (Section 4) |
| `"Add thesaurus"` (footer) | nothing ticked | link to `/settings/thesauri/new` |

Editor:
| Label | When enabled | What it does |
|---|---|---|
| `"Edit"` (row button) | always | group row opens the group panel; value row opens the item panel with its group (`T/EditThesaurus.tsx:94-103`) |
| Drag handle `"Drag row"` | always (mouse, touch, keyboard sensors; vertical axis only) | reorders. Rule `disableEditingGroups`: a row can only drop inside its own parent. Roots and groups reorder at root level; children reorder inside their group. No move between groups, no group inside a group (`UI/Table/helpers.ts:53-55,97-99`, `Table.tsx:210-237`, `ThesaurusForm.tsx:81`). Dragging a group collapses it (`DnDComponents.tsx:48-52`). Dragging while a header sort is active clears the sort first (`Table.tsx:221-224`) |
| `"Group"` button on group rows | group rows | expands/collapses that group |
| `"Collapse all"` / `"Expand all"` | only when a group exists; `"Collapse all"` disabled when nothing is expanded, `"Expand all"` disabled when nothing can expand | toggles every group (`Table.tsx:195-207,246-249,278-281`) |
| Header `"Label"` click | always | sorts root rows by label, toggling asc, desc, none; each change overwrites the in-memory order, so it becomes the saved order after Save; children are not sorted (`ThesaurusForm.tsx:103-105`, `Table.tsx:188-193`) (unverified for case rules: tanstack auto sort function) |
| Row checkbox `"Select"` | always | selects row; selecting a group also selects its children (tanstack default, unverified) |
| `"Add item"` | nothing ticked | opens add-item panel with one empty card (`EditThesaurus.tsx:86-89`) |
| `"Add group"` | nothing ticked | opens add-group panel with empty name and one empty item card (`EditThesaurus.tsx:90-93`, `T/helpers.ts:59-63`) |
| `"Sort"` | nothing ticked | sorts roots (groups and plain values together) and every group's children ascending by label with lodash `orderBy` (code-point order, case-sensitive); result is the saved order after Save (`T/helpers.ts:108-123`; test `T/specs/Thesauri.spec.tsx:504-543`) |
| `"Import"` | name not empty; nothing ticked | opens the OS file chooser; on file selection runs the import (Section 6) |
| `"Remove"` | one or more rows ticked | removes ticked rows from local state (asks for confirmation only in the case in Section 4). Removing the last child of a group removes the group. Needs Save (`EditThesaurus.tsx:105-120`, `T/helpers.ts:94-106`) |
| `"Cancel"` | not importing | link to the list, through the dirty guard (Section 7) |
| `"Save"` | not importing | Section 6 |

No per-row delete button, no duplicate action, no move-to-group action.

**4. Confirm dialogs and modals**

All three confirms use `ConfirmationModal` in danger style: red icon square, h3 header, close X, red alert strip with the warning text, body, buttons right-aligned in this order: cancel (warm button) then accept (danger button) (`UI/ConfirmationModal.tsx:110-157`). Default labels `"Cancel"` and `"Accept"` (`ConfirmationModal.tsx:143,151`; `csv:171,18`).

1. Delete selected thesauri (list). Trigger: footer `"Delete"`. Size `lg`. Header `"Delete"`. Warning `"Are you sure you want to delete this item?"`. Body: bulleted list of the selected thesaurus names (no template names, no counts). Buttons: `"Cancel"` closes; `"Accept"` runs the delete (Section 6 note on delete) (`T/ThesauriList.tsx:99-115`). Buttons are not disabled while the request runs.
2. Remove values that are in use (editor). Trigger: footer `"Remove"` when (a) at least one template uses this thesaurus (`templatesAtom`, `property.content === thesaurus._id`) and (b) the first ticked row (tree order) already has an `id`, i.e. was saved. Otherwise removal is immediate. Header `"Delete"`. Warning `"Are you sure you want to delete this item?"`. Body `"Changes in the thesaurus will impact all the entities using these values."`. Buttons `"Cancel"` closes; `"Accept"` removes the rows from local state and clears the selection; Save still required (`T/components/ThesaurusActions.tsx:13-31`, `T/EditThesaurus.tsx:52-62,105-120`).
3. Discard changes (editor). Trigger: leaving with unsaved changes (Section 7). Size `md`. Header `"Discard changes?"` with close X. Body `"You have unsaved changes. Do you want to continue?"`. Buttons: ghost `"Cancel"` closes the modal and stays; primary `"Discard changes"` closes the modal and proceeds with the navigation (`UI/ConfirmNavigationModal.tsx:11-40`; `csv:397,1537,396`).

Side panels (not confirms; `UI/Sidepanel.tsx`): 500px from the right with overlay; close by header X (sr-only `"Close"`), overlay click, or Escape (`Sidepanel.tsx:41-44,120,160,226`).
- Add item: title `"Add item"`; banner (Section 2); one or more cards `"Item"` with `"Title"` and `"Group"`; footer buttons ghost `"Cancel"` (closes), primary `"Add"` (adds all non-blank cards to the local list, closes). Items with a group are appended at the end of that group; items with `"No Group"` are appended at the end of the root list (`T/components/ThesauriValueFormSidepanel.tsx:69-157`, `T/helpers.ts:81-92`).
- Edit item: title `"Edit item"`; one card `"Item"` with `"Title"` and a disabled `"Group"`; no banner; buttons `"Cancel"`, `"Edit"`. Changes the label only (`helpers.ts:125-141`).
- Add group: title `"Add group"`; banner; card `"Group"` with `"Name"`; cards `"Item"` with `"Title"`; buttons `"Cancel"`, `"Add group"`. Adds the group at the end of the root list with its non-blank items (`ThesauriGroupFormSidepanel.tsx:104-176`, `helpers.ts:142-163`).
- Edit group: title `"Edit group"`; no banner; card `"Group"` with `"Name"`; one card per existing child plus a trailing empty card; buttons `"Cancel"`, `"Edit group"`. Renames the group, renames edited children, appends new children. Children cannot be removed here (blank is blocked by `required`); use `"Remove"` in the table.

**5. Empty / loading / error states**

- List with no thesauri: one table row spanning all columns, centered gray `"NO DATA AVAILABLE"` (`UI/Table/DefaultNoDataMessage.tsx:6`, `UI/Table/NoDataRow.tsx`, `csv:812`). The footer `"Add thesaurus"` stays.
- Editor with no values: same `"NO DATA AVAILABLE"` row; `"Collapse all"` / `"Expand all"` hidden (`Table.tsx:322-324`).
- Expanded group with no children: row text `"Empty group. Drop here to add"` (italic, secondary; `UI/Table/DnDComponents.tsx:148-164`, `csv:453`). The drop does not work in this editor (see Section 11). `"This group is empty"` is the non-dnd variant (`DnDComponents.tsx:160`), unused here.
- Loading: no skeleton and no spinner on the page. A global request indicator turns on at the first request and stays at least 1000 ms (`V2/atoms/requestStatusAtom.ts:28,34-57`; `V2/api/policies.ts:11-37`).
- Loader failure (list or edit): route error boundary page (`app/react/Routes.tsx:219`; `T/createThesauriLoader.ts:16-17`). Copy owned by the cross-cutting error page: `"Unexpected error"` / `"Something went wrong"`, `"Service busy"` / `"The service is temporarily busy. Please try again in a moment."` (`V2/shared/errorUtils.tsx:9-31`).
- Unknown id on `/edit/:_id`: loader returns `undefined` (`V2/api/thesauri/index.ts:43`) and the page renders like `/new` (unverified: router behaviour for `undefined`).
- Request failures raise notifications through the API policy for every non-401, non-404, non-cancelled error (`V2/api/policies.ts:60-72`):
  - network or timeout: error `"Could not reach server. Please try again later."` (`policies.ts:43`).
  - HTTP 409: warning, title = server code or message, details = server detail (`policies.ts:46-52`).
  - other: error `"An error occurred"`, details = `error.detail ?? error.message` (`policies.ts:53-57`; `csv:116`). `detail` is the server `prettyMessage` (`app/shared/apiClient/normalizeError.ts:91`). For Zod and AJV errors it is `{message}` then `{instancePath}: {message}` lines (`API/utils/handleError.js:30-41`); for domain errors it also carries `url:`, `body:`, `query:` lines before the message (`handleError.js:44-60`) (unverified in a live run).
- Server messages, verbatim:
  - Delete in use (HTTP 400): `Cannot delete thesaurus with {count} associated templates. Please remove the related templates first.` ({count} = number of templates with a property whose `content` is the thesaurus id) (`CORE/domain/thesaurus/errors.ts:31-38`; `CORE/application/DeleteThesaurus.ts:22-25`; `CORE/infrastructure/mongodb/template/MongoTemplatesDAO.ts:75-77`).
  - Not found (HTTP 400): `The Thesaurus with Id "{id}" was not found` (`errors.ts:5-12`).
  - Duplicate name (HTTP 422): `A thesaurus with name "{name}" already exists` (`errors.ts:14-20`; mapped by `API/common.v2/infrastructure/AbstractController.ts:37-39`).
  - Create validation (HTTP 422): `Name cannot be empty`, `Name is required`, `Label cannot be empty`, `Label is required`, `ID is required`, `Thesaurus with Id: "{id}" has duplicated labels: "{label}" "{label}"` (`CORE/domain/thesaurus/Thesaurus.ts:49-88`).
  - CSV import (HTTP 400): `Invalid csv: nested value need to be under a non-nested value` (first data row starts with `-`); `Invalid csv: all the values for a row must be either nested or non-nested` (a row mixes nested and non-nested cells across language columns) (`API/csv/importThesauri.ts:83-98`; `contents/translation-context.csv:582-583`). A file that is not CSV, is empty, or has no header: no specific message found (none found).

**6. Save**

Save (footer `"Save"`, or Enter in the name input; form id `edit-thesaurus`):
1. Client validation: react-hook-form checks `name` is not empty string (`T/ThesaurusForm.tsx:90`). On failure the input turns red, nothing is sent, no notification.
2. Client builds the payload `{...formData, name, _id?, values}` where `values` is the in-memory rows with `rowId`, `groupId` removed and `subRows` renamed to `values`; existing values keep their `id`, new ones have none; a plain value has no `values` key, a group has `values: [...]` (`ThesaurusForm.tsx:52-54`, `T/helpers.ts:28-35`).
3. Request `POST /api/thesauris` (JSON), admin only (`V2/api/thesauri/index.ts:46-63`; `CORE/v1_layer/thesauri/routes.ts:14-30`). No `_id` routes to create, `_id` present routes to update.
4. Server, create (`CreateThesaurus.ts:13-23`, `ThesauriService.ts:61-66`):
   1. Domain validation (Zod): name trimmed and non-empty, labels trimmed and non-empty, no duplicate labels per level; fresh ids (`uuid.v4()` per value, ObjectId for the thesaurus) (`Thesaurus.ts:49-88,231-250`).
   2. In one transaction: name uniqueness check, insert, create the translation context (type `Thesaurus`, label = name, context id = thesaurus `_id`, one key per label plus one for the name, value = the key, in every installed language) (`ThesaurusTranslationService.ts:46-57,172-184`).
   3. Respond with the thesaurus; emit socket `thesauriChange` (`CreateThesaurusController.ts:32-51`).
5. Server, update (`UpdateThesaurus.ts:20-36`, `ThesauriService.ts:68-86`, diff by value `id` in `CORE/domain/thesaurus/ThesaurusDiff.ts`):
   1. Type-only check of the body (`UpdateThesaurusController.ts:11-26`); not found throws `The Thesaurus with Id "{id}" was not found`.
   2. Values with `id` keep it; values without `id` get a new uuid (`Thesaurus.ts:195-214`). No duplicate, blank, or trim validation runs here (`Thesaurus.ts:216-224`, `validate = false`) (unverified).
   3. Nothing changed (no add, remove, rename, order): no write, still a success response. Order-only change: write the thesaurus, stop (no translation or entity work) (`ThesauriService.ts:20-34,71-77`, `ThesaurusDiff.ts:161-175`).
   4. Otherwise: if the name changed, name uniqueness check; write thesaurus; update the translation context; enqueue entity denormalization for updated and removed value ids (not added ones) (`ThesauriService.ts:79-85,45-59`).
   5. Translation context changes: added value, new key in every language with the label as text; removed value, key deleted in every language unless another value has the same label; renamed value, key renamed, default language gets the new label and other languages keep their existing text under the new key; renamed thesaurus, name key renamed and context label updated (`ThesaurusTranslationService.ts:59-146`, `CORE/domain/translation/TranslationContextModel.ts:60-130`).
   6. Respond with the thesaurus; emit socket `thesauriChange` (`UpdateThesaurusController.ts:70-89`).
6. Entity denormalization job (asynchronous, after the response): rebuilds every select and multiselect value on entities that used the changed ids, in all languages; a removed value is dropped from the entity's metadata (`if (!thesaurusValue) return`); a renamed value shows the new label in the default language; reindexes the entities (`CORE/infrastructure/jobs/DispatcherAdapter.ts:69-77`, `CORE/infrastructure/jobs/DenormalizeEntitiesHandler.ts:59-72`, `CORE/application/DenormalizeThesaurusEntities.ts:22-79`, `CORE/application/propertyAssignmentCreatorService/SelectPropertyAssignmentCreatorService.ts:37-81`, `CORE/infrastructure/mongodb/entity/MongoEntitiesDataSource.ts:54-56`). The user sees no progress or completion message.
7. Client after success: notification success `"Thesauri added."` when the page was `/new`, `"Thesauri updated."` when it was an edit page (`ThesaurusForm.tsx:61-67`; `csv:1316,1321`). New: navigate (replace) to `../edit/{_id}`. Edit: revalidate the loader and stay (`ThesaurusForm.tsx:44-50`). The editor never returns to the list.
8. Errors: any API error shows `"Error updating thesauri."` (same text for create and update; `ThesaurusForm.tsx:56-59`; `csv:481`) plus the policy notification `"An error occurred"` with details (Section 5). The user stays on the editor with edits intact.

Delete thesaurus (list, `"Accept"` in the Delete confirm):
1. Client sends one `DELETE /api/thesauris?_id={id}` per ticked row, in parallel; reports only the first failure (`V2/services/http/HttpThesaurusService.ts:11-18`).
2. Server per id: load (else `The Thesaurus with Id "{id}" was not found`); count templates with a property whose `content` is the id; if more than 0, refuse with `Cannot delete thesaurus with {count} associated templates. Please remove the related templates first.`; else in one transaction delete the translation context (all languages) then the thesaurus; emit socket `thesauriDelete` (`CORE/application/DeleteThesaurus.ts:17-32`, `DeleteThesaurusController.ts:9-19`). Entities are not touched (no entity can reference a thesaurus that no template uses).
3. Client: error: notification error `"An error occurred"` with details = server message (`T/ThesauriList.tsx:44-50`), plus the policy notification, so the same failure appears twice (`policies.ts:60-72`). Success: notification success `"Thesauri deleted"` and selection cleared (`ThesauriList.tsx:51-54`; `csv:1317`). Both: list revalidated, modal closed (`ThesauriList.tsx:56-57`). The client-side checkbox guard makes the in-use refusal reachable only with a stale `templatesAtom`.

Import (CSV), editor `"Import"`:
1. Click `"Import"` sets `isImporting` (disables Cancel and Save) and opens the file chooser (`EditThesaurus.tsx:166-169`, `ImportButton.tsx:43-46`).
2. On file selection the client sends the current name and all in-memory values (unsaved edits included) plus the file as multipart `POST /api/thesauris`, fields `thesauri` (JSON) and `file` (`V2/api/thesauri/index.ts:81-93`).
3. Server first creates (no `_id`) or updates the thesaurus exactly as Save does (including its validation and side effects), then parses the CSV and appends values, then saves again through the update path (`CreateThesaurusController.ts:34-48`, `UpdateThesaurusController.ts:72-86`, `API/csv/csvLoader.ts:25-58`).
4. CSV format (`API/csv/importThesauri.ts`, `CORE/v1_layer/thesauri/thesauri.js:15-65`):
   - Delimiter `,` or `;`. First row is the header. Each header cell is an installed language's English name (for example `English`, `Spanish`) (`importThesauri.ts:100-116`).
   - The label column is the default language's column, else the request language's, else the first column (`importThesauri.ts:122-131`).
   - A cell whose first non-space character is `-` is a child of the nearest previous non-nested row; the dash is stripped. A parent with at least one child becomes a group. All cells in a row must be all nested or all not nested; the first data row cannot be nested (`importThesauri.ts:50-98`).
   - Cells are whitespace-collapsed and trimmed; the literals `null`, `NULL`, `Null`, `undefined`, `UNDEFINED`, `Undefined`, `N/A`, `n/a`, `N/a` become empty and the row is skipped (`API/csv/sanitizationUtils.ts:47-64`, `API/csv/importThesauri.ts:13-32`).
   - Values are appended after existing values. A label already present at the same level (case-insensitive, trimmed) is skipped, including duplicates inside the file; matching groups merge by label (`thesauri.js:15-65`). Values are never removed or reordered.
   - Other installed-language columns become translations of the label keys in the thesaurus context (`importThesauri.ts:34-48,133-143`, `csvLoader.ts:45-58`).
   - Sample accepted by the code:
     ```
     English,Spanish
     Fruit,Fruta
     - Apple,Manzana
     - Banana,Banano
     Dog,Perro
     ```
   - No file type, size, or row-count limit found in client or server (none found).
5. Success: client sets `_id`, notification success `"Thesauri updated."` (also on a new thesaurus), navigates (replace) to `../edit/{_id}`, clears `isImporting` (`EditThesaurus.tsx:172-177`). Failure: clears `isImporting`, notification error `"Error adding thesauri."` plus the policy notification with the server message (`EditThesaurus.tsx:178-181`; `csv:477`).

**7. Dirty guard**

- Condition: a router blocker fires on any navigation when the destination pathname does not contain the substring `edit` and the current name or the sanitized values differ (lodash `isEqual`) from the loaded thesaurus (`T/EditThesaurus.tsx:67-84`, `T/helpers.ts:165-172`).
- Modal: `"Discard changes?"` / `"You have unsaved changes. Do you want to continue?"` / `"Cancel"`, `"Discard changes"` (Section 4, item 3).
- Exceptions: any destination containing `edit` skips the guard (so the post-save redirect to `../edit/{id}` passes, and so does `/settings/templates/edit/...`); no `beforeunload` handler (tab close or reload discards silently).
- On `/new` the loaded thesaurus is `undefined`, so the comparison reports a change even when nothing was typed: Cancel on an untouched new thesaurus opens the modal (unverified, derived from `helpers.ts:169-171`).
- Panel text typed but not submitted does not count as unsaved.
- Import success counts as saved (redirect passes the guard).

**8. Sort, filter, search, pagination**

- List: sort by Label only; default `name` ascending; header click cycles asc, desc, unsorted; comparison is the tanstack automatic sort function (case rules unverified). No search, no filter, no pagination, all rows rendered (`T/components/ThesauriTable.tsx:30`, `T/components/TableComponents.tsx:128-145`). Server returns insertion order (`CORE/infrastructure/mongodb/thesauri/MongoThesauriDAO.ts:18-26`).
- Editor: no search, no filter, no pagination. Order is the stored order, edited by drag, `"Sort"`, or the Label header (all persisted by Save).
- Group collapse state is local and not persisted.
- Selection: list selection ignores non-selectable rows; editor selection spans roots and children.

**9. Propagation**

- Template editor property dialog: thesaurus select lists every non-template entry of `thesauriAtom`, labels translated, sorted by label, first option `"Select..."`; updated live by socket `thesauriChange` / `thesauriDelete` (`V2/Routes/Settings/Templates/components/fields/ThesaurusField.tsx:16-37`; `app/react/App/sockets.js:87-105`).
- Template editor property table: options cell resolves the thesaurus name from `thesauriAtom` (`V2/Routes/Settings/Templates/components/TemplateEditorTableComponents.tsx:73-79`).
- This list: Templates pills and disabled checkboxes come from `templatesAtom`, so they change when a template's property is bound or unbound (`T/ThesauriList.tsx:23-38`).
- Entity edit form select and multiselect options read `thesauriAtom` (`V2/Components/Metadata/EntityEditor/EditEntity.tsx`, `.../Components/useLiveThesaurus.ts`); Library and dataviz filter pickers too (`V2/Dataviz/editor/components/data/filters/FilterValueInput.tsx`) (unverified in detail).
- Entities already stored: renamed and removed values are rewritten by the asynchronous job (Section 6, step 6). New values affect no stored entity.
- Translations screen: context type `Thesaurus` created on create, keys follow renames and removals, deleted with the thesaurus (`ThesaurusTranslationService.ts`, `DeleteThesaurus.ts:27-30`). Editing those translations later re-labels entity values per language (`CORE/application/translation/PropagateThesaurusTranslationService.ts`).
- Other admin sessions: socket events update their `thesauriAtom` (`sockets.js:87-105`); an open editor does not refresh.
- Template delete or rebind elsewhere changes whether a thesaurus can be deleted (`CORE/infrastructure/mongodb/template/MongoTemplatesDAO.ts:75-77`).

**10. Improvements to layer on**

- UX1 (search on lists and long editors), gap row "List table ... add search" and "Long lists: no search": search row on the list and inside the editor value tree.
- UX2 (bulk selection with selection bar), gap rows "Remove selected values" and "Delete from list": fixed-width count slot, `BAR_GHOST` actions, `BAR_DANGER` Delete/Remove on the bar ladder.
- UX3 (CSV import and export), gap row "Import CSV": Dropzone, preview of values to add and duplicates skipped, then apply; Export CSV; no save-before-parse.
- UX4 (impact before delete), gap rows "Delete from list" and "Remove selected values": the confirm names the templates and states how many entities use the values; explain why a checkbox is disabled.
- UX5 (undo in the Beacon for child deletes), gap row "Remove selected values": immediate remove with Undo instead of the conditional confirm.
- UX6 (thesaurus editor as a tree: inline edit, collapsible groups, A-Z jump, move to group), gap rows "Items", "Groups", "Long lists": replaces the side panels and the move-between-groups gap.
- UX9 (keyboard reordering), gap row "Reorder by drag": grip plus Move up and Move down, same parent rule.
- UX11 (last-saved line in editor footers), no thesauri gap row: "Saved {time} by {user}" in the editor footer.
- UX12 (phone rows and sheets), gap row "Phone": value rows with an edit sheet, no table.
- Design form pattern, gap row "Name: required, trimmed, unique": inline message and case-insensitive trimmed uniqueness on the name; the editor must show a message (Uwazi shows none; `AddThesaurusModal` already uses `"Thesaurus name already exists"`, `V2/Routes/Settings/Templates/components/AddThesaurusModal.tsx:85`, `csv:1326`).
- Design validation, gap row "Duplicate and blank validation": enforce on every save, same fold rule everywhere; same label under different groups stays allowed.
- Design list-page empty and loading states, gap row "Empty and loading": named empty state with an Add action, skeleton rows while loading.
- Design list shell and bar ladder, gap rows "Add thesaurus (footer)" and "Save": `BAR_LEAD` for Add thesaurus, Save disabled until dirty (gap row "Save").
- Dirty guard through `useDirtyGuard` on Back, Cancel, rail and navbar, gap row "Leave with unsaved edits"; also guard edit-to-edit.
- Locale-aware `Sort`, gap row "Sort button".
- Entity value drop on removal, gap row "Value delete effect on entities", and rename following into the Translations store, gap row "Rename value".
- Templates pills from the live template store, gap row "List table"; translation pill deferred until a Translations store exists, gap row "Translation pill".
- Item count column in the list is prototype-only: keep, derive from the same count as the editor (gap "Prototype-only" table).
- Divider colour: use `border-soft` rows (UX audit, "Thesauri" findings).

**11. Uwazi defects NOT to copy**

- Dirty guard skipped for any destination containing `edit` (`T/EditThesaurus.tsx:74`): guard every navigation when dirty, except the post-save redirect.
- Cancel on an untouched `/new` thesaurus asks "Discard changes?" (`helpers.ts:169-171`) (unverified): compare against an empty baseline.
- The guard modal's `"Cancel"` does not reset the blocker (`EditThesaurus.tsx:206-208`, `UI/ConfirmNavigationModal.tsx:26`) (unverified): the next navigation attempt may not prompt; reset on cancel.
- Whitespace-only item or group label passes the blank filter before sanitizing (`ThesauriValueFormSidepanel.tsx:59-62`, `ThesauriGroupFormSidepanel.tsx:69-75`), producing an empty-label row; on update the server stores it. Sanitize first, then drop empties.
- Update path skips duplicate, blank, and name-trim validation (`Thesaurus.ts:216-224`) (unverified): validate on every save and show the message inline.
- Duplicate-label message prints an internal id, `Thesaurus with Id: "{id}" has duplicated labels: ...` (`Thesaurus.ts:84`): name the thesaurus and show the offending labels and their group.
- Name uniqueness is exact and case-sensitive (`MongoThesauriDataSource.ts:60-62`): compare trimmed, case-insensitive.
- Name required failure is a red input with no text; whitespace-only name passes the client (`ThesaurusForm.tsx:90`): show a message, trim before checking.
- Name field shows a clear X that does nothing (`ThesaurusForm.tsx:85`): hide it or make it clear the field.
- Import saves the form first and parses after; a parse failure on a new thesaurus leaves it created while the client stays on `/new`, so the next Save fails with `A thesaurus with name "{name}" already exists`; the notification is only `"Error adding thesauri."` plus noisy details: parse and preview first, write once, redirect to the saved id on any partial write.
- `isImporting` is set on click and cleared only after an upload result, so cancelling the file dialog leaves Save and Cancel disabled (`EditThesaurus.tsx:167-169,184`): set it when a file is chosen. Re-selecting the same file may not fire `change` (`ImportButton.tsx:35`) (unverified): reset `input.value = ''`.
- Remove asks for confirmation only when the first ticked row is saved (`EditThesaurus.tsx:115`): check every ticked row.
- Selection count can exceed the total: n counts ticked children and groups, m counts root rows only (`EditThesaurus.tsx:150-151`) (unverified): count the same rows in both.
- Delete: checkbox disabled with no reason (`ThesauriList.tsx:34`); the confirm lists names only; the in-use refusal is a server string. Show which templates block it.
- Delete confirm buttons stay enabled during the request, and a failed delete notifies twice (policy plus component) (`ThesauriList.tsx:45-49`, `policies.ts:60-72`): disable during the request; one notification.
- Save failure notifies twice with the generic `"Error updating thesauri."` and a technical details string that includes request URL and body for domain errors (`handleError.js:44-60`) (unverified): one notification with the server reason.
- `"Empty group. Drop here to add"` is shown but the drop is rejected by `disableEditingGroups` (`UI/Table/helpers.ts:53-55`): either allow it or remove the hint; also allow moving a value between groups.
- `Sort` uses code-point order, uppercase before lowercase (`T/helpers.ts:108-123`); header sort overwrites the stored order and a third click does not restore it (`ThesaurusForm.tsx:103-105`): locale-aware compare, and keep header sort separate from stored order.
- Renaming a value in the default language leaves other languages showing the old text, because the untranslated copy of the old label is carried to the new key (`TranslationContextModel.ts:80-100`): when the other language text still equals the old label, update it too.
- `"No Group"` option text is hard-coded and untranslated (`ThesauriValueFormSidepanel.tsx:126`): translate it.
- `en.csv` stores `thesauri new item desc` and `thesauri new group desc` as their own keys (`csv:1319-1320`): use the long English text.
- Unknown thesaurus id on `/edit/:_id` renders the new-thesaurus editor (`V2/api/thesauri/index.ts:43`) (unverified): show a not-found state.
- Save with no changes still reports `"Thesauri updated."` (`ThesaurusForm.tsx:61-67`, `ThesauriService.ts:71-73`): disable Save until dirty.
- No page-level progress or notice after a rename or removal while the entity job runs (`ThesauriService.ts:45-59`): in the prototype, apply to entities on Save and say so in the success notification.
