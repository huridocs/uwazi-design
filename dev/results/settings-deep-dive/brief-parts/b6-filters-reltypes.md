Part b6. Pages: Filters, Relationship types. Reference: `huridocs/uwazi` `production` v1.229.224 (`/Users/juanmnl/Developer/huridocs/uwazi-ref`). All cites are repo-relative `path:line`; everything below was re-read in code (not copied from the inventory) unless marked `(unverified)`. Nothing was run.

Path abbreviations: `R/` = `app/react/V2/Routes/Settings/`; `UI/` = `app/react/V2/Components/UI/`; `FRM/` = `app/react/V2/Components/Forms/`; `LIB/` = `app/react/V2/Routes/Library/`; `API/` = `app/api/`; `en.csv` = `contents/ui-translations/en.csv`. A string cited only to `en.csv:n` is the default for a translation key; inline `<Translate>` text is the fallback shown when the key is missing from the DB.

Notification mechanism used by both pages: `notify(type, title, message?, details?)` writes to the request-status notification list (Beacon panel), not a transient toast (`app/react/V2/atoms/requestStatusAtom.ts:144-154`, `requestStatusTypes.ts:27`). The inventory calls these "toasts". The prototype maps to the Beacon (CLAUDE.md "Notifications and Bert").

### Filters

Route `/settings/filters`, admin only (`app/react/Routes.tsx:483-487`; nav link under `NeedAuthorization roles={['admin']}`, `R/SettingsNavigation.tsx:26-41`, label `Filters` at `:41`, in the first rail section headed `Settings`, last item after `Translations`). Component `R/Filters/FiltersTable.tsx`. What it stores: `settings.filters` = ordered list of `{id, name}` template entries and `{id, name, items:[{id, name}]}` groups (`API/core/application/settings/saveSettingsInput.ts:35-42`). It only controls the Library `Type` facet; it does not restrict search results (nothing in `API/` search reads it; unverified by exhaustive grep, only `libraryTypeFilters.ts` and `TypeFacet.tsx` read it in V2).

#### 1. Screen map

Top to bottom inside a scroll container (`R/Filters/FiltersTable.tsx:152`), `SettingsContent` on `bg-parchment` (`app/react/V2/Components/Layouts/SettingsContent.tsx:22-26`).

1. Header: title only `Filters` (`FiltersTable.tsx:154`), no breadcrumb path. On `<lg` a back chevron to `/settings` with sr-only `Navigate back` (`app/react/V2/Components/Layouts/SettingsContent.tsx:62-67`).
2. Info banner (`FiltersTable.tsx:156-190`), `rounded-md border p-4 shadow-md`, info-banner tokens:
   - Heading row, CheckCircle icon + `Filters configuration` (`:168`; key `Filters configuration`, en.csv:526 value is `Filters`, see defects).
   - Paragraph `By default, users can filter the entities in the library based on the types you have defined. However, you can configure how these entity types will be displayed:` (`:171-174`, key `Filters configuration description`, en.csv:527).
   - Bullet 1 `drag and drop each entity type into the window in order to configure their order` (`:178-180`, key `Filters configuration`, so en.csv:526 `Filters`).
   - Bullet 2 `Select "Add group" below to group filters under a label e.g ("Documents "or "People")` (`:183-186`, key `Filters configuration example`, en.csv:528 value `select "Add group" below to group filters under a label e.g ("Documents ""or ""People")`, lowercase `select`).
3. Table (`:191-203`), `dnd={{enable:true}}`, `enableSelections`, white raised card.
   - Table header row (`UI/Table/Table.tsx:265-289`): left text `Filters` (`FiltersTable.tsx:201`, en.csv:524); right, only when at least one group exists: ghost `Collapse all` (disabled when no group is open) and ghost `Expand all` (disabled when none can expand) (`Table.tsx:276-284`; en.csv:224, :484).
   - Column header row, left to right (`Table.tsx:112-149`):
     1. drag handle column, sr-only `Empty` (`UI/Table/DnDComponents.tsx:170`, en.csv:452)
     2. select-all checkbox, sr-only `Select all` (`UI/Table/RowSelectComponents.tsx:69`, en.csv:1149)
     3. group chevron column (only when any row is a group), sr-only `Empty` (`UI/Table/GroupComponents.tsx:9`)
     4. `Label` (`R/Filters/components/TableComponents.tsx:12`, en.csv:644), `w-full`, rendered uppercase `text-sm` (`Table.tsx:302`), sortable (see part 8)
     5. `Action`, sr-only (`TableComponents.tsx:13`, en.csv:29)
   - Body rows: drag handle (sr-only `Drag row`, `DnDComponents.tsx:77`, en.csv:425), row checkbox (sr-only `Select`, `RowSelectComponents.tsx:36`, en.csv:1144), for group rows a chevron button showing `Group` with sr-only `Open group` (`GroupComponents.tsx:22-23`, en.csv:561, :904; `bg-parchment` + `text-ink` when open, `bg-warm` + `text-ink-secondary` when closed), the name (`TableComponents.tsx:15-17`), and for group rows only a secondary `Edit` button (`:23-38`, en.csv:435). Template rows have no action cell content. Child rows of an open group show the child indicator in the group-button column (`DnDComponents.tsx:141`).
   - Expanded group row: `bg-warm border-border` (`DnDComponents.tsx:30-35`).
   - Empty open group: one extra row `Empty group. Drop here to add` (`DnDComponents.tsx:148-159`, en.csv:453), italic `text-sm text-ink-secondary`.
   - Zero rows: `NO DATA AVAILABLE` centred in a `p-10` cell (`UI/Table/DefaultNoDataMessage.tsx:6`, en.csv:812).
4. Sticky footer `SettingsContent.Footer` (`SettingsContent.tsx:95-113`), `border-t px-4 py-3 bg-parchment`, `flex-wrap gap-2`, `md:justify-between` (`FiltersTable.tsx:205`).
   - No row selected (`:210-243`): left group `Add entity type` (primary, `:213-215`, en.csv:48), `Add group` (primary, `:216-224`, en.csv:54). Right group `Cancel` (secondary, `disabled={!hasChanges || disabled}`, `:227-233`, en.csv:171), `Save` (success/green, same disabled rule, `:234-240`, en.csv:1105).
   - One or more rows selected (`:206-209`): only `Delete` (danger, en.csv:366). No count, no tint. The Add/Cancel/Save buttons are unmounted while a selection exists, so Save is not reachable until the selection is cleared.
5. Overlays (outside the content): `AddTemplatesModal` (when `showModal`), `ConfirmNavigationModal` (when blocked), `FiltersSidepanel` (always mounted, `isOpen={showSidepanel}`) (`:246-272`).

Add entity type modal (`R/Filters/components/AddTemplatesModal.tsx`):
- `Modal size="lg"` (`:28`: `max-w-lg`), header `h1` `Add entity type` (`:31`) + close X (`:33`, closes without adding). Body `pt-4 h-96` (`:35`).
- Body is a `MultiselectList` (`:36-42`, non-checkbox button items, `FRM/MultiselectList/MultiselectList.tsx`): a search input with placeholder `Search` (`:316`, en.csv:1120; 300 ms debounce `:126`; match is accent- and case-insensitive on the template name, `:58-90`), then a radio pair `All` (default) / `Selected` followed by ` (n)` when n > 0 (`:326-336`, `:305-314`; `Selected` radio disabled while nothing is selected, en.csv:97, :1167), then the list of templates. Empty list: `No items available` (`:112`, en.csv:821), centred.
- Footer (`:44-62`): `Cancel` (ghost, grows, closes) then `Add` + ` (n)` when n > 0 (primary, grows, `disabled={!selected.length}`, `:50-59`, en.csv:39). Click closes the modal and calls `onAdd(selected)`.
- Options are the templates not already used as a top-level entry or inside any group (`R/Filters/components/helpers.ts:19-35`), label = raw template name (`AddTemplatesModal.tsx:19`), listed in the loader's order (`templatesAPI.getAll`), no sort.

Group sidepanel (`R/Filters/components/FiltersSidepanel.tsx`):
- `Sidepanel withOverlay size=medium` (`:83-88`, `UI/Sidepanel.tsx:52-61`): 500 px wide from `md`, full width below, slides from the right, overlay click and `Escape` close it (`Sidepanel.tsx:119-127, 226`), focus trapped, focus restored on close. Header bar `h1` title: `Edit group` when the loaded group has a `name`, otherwise `Add group` (`:87`, en.csv:440, :54), plus close X with sr-only `Close` (`Sidepanel.tsx:37-47`, en.csv:220).
- Body (`:89-124`, form id `group-edit-form`): `Card` titled `General Information` (`:94`, en.csv:553) with one text input labelled `Name`; `Card` titled `Entity types` (`:107`, en.csv:474) holding a `MultiSelect` labelled `Entity types` (`:114`).
- `MultiSelect` (`FRM/MultiSelect.tsx`): a 3rem header showing the label and a `PlusCircle` button (sr-only `Select`, `:118`, disabled when no options) that opens a popover of checkboxes (max-h-56) listing the options; the body shows the chosen options as grey pills each with an `x` button (sr-only `Remove`, `:186`, en.csv:1066); with nothing chosen the body shows the default placeholder `No options` (`:36`, `:192`, en.csv:829). `canBeEmpty` defaults true.
- Options = the group's current members + templates not used elsewhere (`:43-46`, `:115`). Value order = order in which the user ticks them (new ids appended, `MultiSelect.tsx:86-92`).
- Footer `px-4 py-3` (`:125-141`): `Cancel` (secondary, grows, closes and resets, en.csv:171), then `Update` when the loaded group has an `id` else `Add` (primary submit, grows, `:137-139`, en.csv:1435, :39).

#### 2. Fields

| Label | Control | Placeholder | Help text | Default | Validation rule and error message | Required | Cite |
|---|---|---|---|---|---|---|---|
| `Name` (group) | text input `id="group-name"` | none | none | `''` for Add; group name for Edit | Client: react-hook-form `required: true`; message `This field is required` under the input (en.csv:1341). Only an empty string fails; no trim, so `"  "` passes (unverified, RHF default). No duplicate check against other group or template names. Server: `name: z.string().optional()`, strict object (`saveSettingsInput.ts:35-42`); no rule. | yes (client only) | `FiltersSidepanel.tsx:95-104` |
| `Entity types` (group) | `MultiSelect` popover + pills | `No options` (shown when none selected) | none | members of the group being edited, else none | none; empty selection allowed | no | `FiltersSidepanel.tsx:109-120`, `FRM/MultiSelect.tsx:36,192` |
| (hidden) `id` | `<input class="hidden">` registered | n/a | n/a | existing group `id` | on submit, if the group has no `id`, `uniqueID()` is assigned and also becomes `rowId` | n/a | `FiltersSidepanel.tsx:91-92, 74-75` |
| Template list (Add entity type modal) | `MultiselectList` buttons + search | `Search` | none | none selected | `Add` disabled while nothing selected; no other rule | no | `AddTemplatesModal.tsx:36-59`, `FRM/MultiselectList/MultiselectList.tsx:316` |
| Row checkbox / select-all | checkbox | n/a | n/a | unchecked | none. Ticking a group row ticks its children (react-table `selectSubRows` default; unverified) | no | `UI/Table/RowSelectComponents.tsx:21-33` |

Server-side validation of the save: body must match `SaveSettingsInputSchema`; each filter allows only `_id`, `id`, `name`, `items` (strict) (`API/core/application/settings/saveSettingsInput.ts:35-42, 209`). Template ids are not checked against existing templates. On a schema failure `ZodError` becomes an AJV `ValidationError` (`API/common.v2/infrastructure/AbstractController.ts:22-35`) and HTTP 422 (`API/utils/handleError.js:93-99`); the notification details show `error.message` of the legacy `FetchResponseError` (exact text unverified).

#### 3. Row actions and bulk actions

| Label | When enabled | What it does | Cite |
|---|---|---|---|
| `Edit` (group row only) | always on a group row | stores the row in `sidepanelAtom`, opens the sidepanel with that group's name and members; template rows show nothing | `TableComponents.tsx:19-41` |
| Drag handle (`Drag row`) | every row | mouse, touch or keyboard sensor, vertical axis only (`restrictToVerticalAxis`); rules in part 8 | `UI/Table/Table.tsx:239-243, 252-257`, `DnDComponents.tsx:62-79` |
| Group chevron (`Group` / `Open group`) | group rows | toggles expansion | `GroupComponents.tsx:15-24` |
| `Collapse all` / `Expand all` | when a group is open / when a group can expand | toggles every row | `Table.tsx:195-207, 278-283` |
| Row checkbox | always | selection; selection decides which footer shows | `FiltersTable.tsx:139-149, 206` |
| `Delete` (footer, bulk) | any selection | removes the ticked rows (templates, or whole groups with their members, or single members of a group) from local state, clears selection. No confirm, no undo, nothing sent until Save | `FiltersTable.tsx:98-116`, `helpers.ts:67-86` |
| `Add entity type` | no selection | opens the modal; `Add` appends one `{id: templateId, name, rowId}` per chosen template at the end of the top level, in selection order | `FiltersTable.tsx:93-96`, `helpers.ts:37-47` |
| `Add group` | no selection | clears `sidepanelAtom`, opens the sidepanel empty (title `Add group`) | `FiltersTable.tsx:216-224` |
| `Cancel` | `hasChanges` and not saving | restores the loaded filters; does not clear the selection | `FiltersTable.tsx:87-91` |
| `Save` | `hasChanges` and not saving | see part 6 | `FiltersTable.tsx:118-137` |

#### 4. Confirm dialogs and modals

| Trigger | Title | Body | Buttons in order | Cite |
|---|---|---|---|---|
| Navigate away while `hasChanges` (any route change, `useBlocker`) | `Discard changes?` (en.csv:397) | `You have unsaved changes. Do you want to continue?` (en.csv:1537) | close X, `Cancel` (ghost, closes the modal only), `Discard changes` (primary; closes and calls `blocker.proceed()`) (en.csv:171, :396) | `UI/ConfirmNavigationModal.tsx:11-39`, `FiltersTable.tsx:54, 72-76, 253-262` |
| `Add entity type` | `Add entity type` | multiselect list (see part 1) | `Cancel`, `Add (n)` | `AddTemplatesModal.tsx` |
| `Add group` / `Edit` | sidepanel `Add group` / `Edit group` | form (see part 1) | `Cancel`, `Add` / `Update` | `FiltersSidepanel.tsx` |
| `Delete` | none | none: no confirmation | n/a | `FiltersTable.tsx:98-116` |

`ConfirmNavigationModal` is `Modal size="md"` (`max-w-md`), header `h1 text-xl font-medium`, body plain text, footer two growing buttons.

#### 5. Empty / loading / error states

- Empty table: `NO DATA AVAILABLE` (`UI/Table/DefaultNoDataMessage.tsx:6`). Footer still shows Add buttons. An empty list is valid: the Library then shows every template (see part 9).
- Empty group: `Empty group. Drop here to add` (`DnDComponents.tsx:159`). A static variant `This group is empty` (`:161`) is used only when DnD is disabled, never on this page.
- Loading: none found. The route loader blocks navigation; there is no skeleton or spinner on the page (`FiltersTable.tsx:33-42`). Saving only disables Cancel and Save (`:48, :119, :230, :237`).
- Loader errors: a failed templates read throws a route error (`:38-39`); a failed settings read is swallowed and shows an empty filter list (`:36-37`).
- Save error: notification type `error`, title `An error occurred` (en.csv:116), details = the `FetchResponseError.message` (`:123-130`). Buttons are re-enabled; local edits are kept.
- Save success: notification type `success`, title `Filters saved` (en.csv:530) (`:136`).
- Field error: `This field is required` (en.csv:1341).
- No-options placeholder in the group multiselect: `No options`.

#### 6. Save

1. Click `Save` (enabled when the JSON of the current rows differs from the loaded rows, `FiltersTable.tsx:78-85`). `setDisabled(true)`.
2. Client builds the payload with `sanitizeFilters` (`helpers.ts:88-108`): drops `rowId` and `_id`; for rows with `subRows` writes them as `items` (each without `rowId`, `_id`); skips any group whose `subRows` is empty, silently; a template row keeps `{id, name}`.
3. `POST /api/settings` with body `{filters: [...]}` (`app/react/V2/api/settings/index.ts:22-33`, route `API/core/infrastructure/express/settings/routes.ts:10`, `needsAuthorization()` = admin).
4. Server: `SaveSettingsController` parses with `SaveSettingsUseCase.InputSchema` (`SaveSettingsController.ts:8`), runs `SettingsService.save` in a transaction (`API/core/application/settings/SettingsService.ts:29-37`):
   1. `translations.reconcile` calls `reconcileFilters` (`SettingsTranslationService.ts:79, 102-126`): only entries that have `items` (groups) feed the translation context `{id:'Filters', label:'Filters', type:'Uwazi UI'}`; renamed group names are key-renamed and removed groups' keys deleted (matched by `id`, property `name`).
   2. `current.apply(incoming)` does `Object.assign` of the new `filters` array onto settings (`API/core/domain/settings/Settings.ts:137-142`): a full replace, no merge.
   3. persist, emit `SettingsChangedEvent`; a listener broadcasts socket `updateSettings` to the tenant (`API/core/infrastructure/listeners/BroadcastSettingsChanged.ts:27`), so other open sessions merge the new settings (`app/react/App/sockets.js:82-85`).
   4. Activity log entry `Updated settings` (`API/activitylog/activitylogParser.ts:20`).
5. Response is the full public settings (`SaveSettingsController.ts:10-11`).
6. Client: `setSettings(prev => mergeClientSettings(prev, response))` (`FiltersTable.tsx:132`), re-enable, `setHasChanges(false)`, `await revalidator.revalidate()` (loader re-runs; the effect at `:65-70` resets rows and `hasChanges`), then notification `success` `Filters saved` (`:133-136`). Selection is not cleared.
7. Errors: step 3 failure gives the error notification in part 5; 401 handling is the legacy `api` client's (redirect to login, unverified); 422 on a malformed body.

#### 7. Dirty guard

- Condition: `useBlocker(hasChanges)` (`FiltersTable.tsx:54`); `hasChanges` is `JSON.stringify(rows) !== JSON.stringify(loadedFilters)` (`:78-85`), so reverting an edit by hand clears it.
- Copy and buttons: see the first row of part 4.
- Scope: every in-app navigation, including rail links and the navbar. No exceptions (the Thesauri editor exempts paths containing `edit`; this page does not).
- Not covered: browser reload or tab close (no `beforeunload`); closing the group sidepanel with unsaved sidepanel input (no prompt, input discarded); `Cancel` footer button (no prompt); `Delete` (no prompt).
- `Cancel` in the modal only closes it and does not call `blocker.reset()` (`:253-262`); behaviour of the blocker afterwards is unverified.

#### 8. Sort, filter, search, pagination

- Search: none on the page. The Add entity type modal has a search (see part 1).
- Filter: none. Pagination: none.
- Sort by column: the `Label` header is sortable (`TableComponents.tsx:44-49` does not set `enableSorting:false`; `Action` sets it false, `:54`). Click cycles ascending, descending, none, with chevrons (`UI/Table/SortingChevrons.tsx`; `ChevronUpDownIcon` neutral). No default sort. Sorting runs on every level (react-table sorts children too). Whenever `sorting` changes the table calls `onSort(rows)` and this page writes those rows as the new order, so a sort becomes an unsaved reorder (`Table.tsx:188-193`, `FiltersTable.tsx:195-197`) (inferred from code, not run).
- Drag and drop rules (`UI/Table/helpers.ts:26-110`; `Table.tsx:210-237`):
  1. Reorder at top level by dropping on another top-level row.
  2. Drag a top-level template onto a member row of a group, or onto the `Empty group. Drop here to add` row, and it moves into that group at that position.
  3. Drag a member out by dropping it on a top-level row; it lands at that index at top level. Dropping on the group's own row also places it at top level next to the group.
  4. A group cannot be dropped onto a member of a group (`:97-99`), so groups never nest. A group dropped on another group's row reorders at top level.
  5. If any sort is active, the first drop resets sorting and applies to the currently sorted order (`Table.tsx:220-224`).
  6. An open group collapses while it is dragged (`DnDComponents.tsx:49-52`).
  7. Collision is `closestCenter`; no keyboard instructions are shown; the handle is a `button` with `@dnd-kit` keyboard sensor (`Table.tsx:239-243`), so Space + arrows works (unverified in browser).
  8. Dropped row styling: dragged row scaled 0.7, opacity 0.9, 4 px outline, hovered row gets class `dnd-hover-shadow` (`DnDComponents.tsx:109-123`).
- Add group: appended at the end, or replaces the existing group with the same `id` in place (`helpers.ts:49-65`). Editing a group: members unticked leave the group and are not re-added at top level; they return to the pool of the Add entity type modal (`helpers.ts:19-35`).

#### 9. Propagation

- Library `Type` facet reads `settings.filters` through `LIB/libraryTypeFilters.ts:12-44` and `LIB/Components/TypeFacet.tsx:33-108` (mounted at `LIB/Components/LibraryFilters.tsx:275`):
  - Facet card title: `Type` (`TypeFacet.tsx:50`, en.csv:1419).
  - Items: each filter entry becomes `{id: filter.id || filter.name, name: filter.name || id}`; entries with neither are dropped; `items` kept only for children with an `id` (child name falls back to its id); `items` omitted when none remain (`libraryTypeFilters.ts:12-28`).
  - Fallback: if the built list is empty, every template is listed sorted by raw `name` with `localeCompare` (`:30-44`). If there are no templates either, the facet renders nothing (`TypeFacet.tsx:45-47`); there is no empty-copy.
  - Once at least one filter exists, templates not listed anywhere do not appear in the facet (their entities still appear in results).
  - Group row: bold, label `<Translate context="Filters">{name}</Translate>` (`:68`), chevron button with aria-label `Collapse` / `Expand` (untranslated, `LIB/Components/FacetCard.tsx:86`), checkbox checked when every child is in `typeIds`, count = sum of children counts (`:40-43`). Ticking toggles all children: if all are selected it unselects them, else selects all (`libraryTypeFilters.ts:46-52`). Initially expanded when any child is selected (`TypeFacet.tsx:26-28`).
  - Child row label: `<Translate context={child.id}>{child.name}</Translate>` (template id context), count from `aggregations.templates` (`:84-85`). Top-level template row: bold, same context rule (`:94-103`).
  - A group ticks into the `type` URL filter as the member template ids.
- Translations: group names live in translation context `Filters` (type `Uwazi UI`), written on Save (`SettingsTranslationService.ts:120-125`); template names come from each template's own context.
- Template rename and delete reach the filters through `API/core/infrastructure/settings/ReconcileFiltersOnTemplateChange.ts:34-49` and `API/core/domain/settings/settingsTree.ts:50-71`: rename updates a top-level entry with that `id`; delete removes the template at every depth.
- Other sessions: socket `updateSettings` refreshes `settingsAtom` (`sockets.js:82-85`).
- Legacy V1 Library `FEATURED/ALL` switch also reads `settings.filters` (`app/react/Library/components/DocumentTypesList.jsx`, `TemplatesFilter.tsx`) (unverified, from the inventory, not re-read).

#### 10. Improvements to layer on

- UX9 (keyboard reordering everywhere) and gap-matrix Filters "Reorder and nest": add Move up/down buttons and a "move to group" select as the keyboard and touch path next to the drag handle; forbid group-in-group as Uwazi does.
- UX12 and gap-matrix Filters "Phone": list rows with a show toggle, group chip and move buttons instead of the 580 px table.
- UX5 and gap-matrix Filters "Delete": removing rows or a group is undoable from the Beacon instead of silent; Uwazi has no confirm.
- UX2 and shared list pattern 2 ("One save per page", audit lines 75-83): footer shows `BAR_GHOST` Cancel (`Discard changes`) and the commit in ink, enabled only while dirty and reset after save; the bulk Delete shows a count in a fixed slot and does not replace the Save area.
- Gap-matrix Filters "Add group": create action lives in the footer; the sidepanel becomes a `Modal` (CLAUDE.md "Every dialog is Modal").
- Gap-matrix Filters "Group name validation": trim, same message `This field is required`; add a duplicate-name check.
- Gap-matrix Filters "Page intro": say "templates" not "types" or "entity types" (vocabulary table); keep the meaning of the banner.
- Gap-matrix Filters "Empty state" (UX1 family, shared pattern 1 "Empty state"): empty message names the effect ("No templates listed. The Library shows every template.") and offers `Add entity type`.
- Gap-matrix Filters "Template rows" and decision G13: show/hide model replaces the Add entity type modal; Properties table kept only as a read view over template flags.
- UX1 and gap-matrix Filters "Search": defer (list is short); keep the Add modal search only if the modal is kept.
- UX11: last-saved line in the footer fed by the Activity log (`Updated settings`).

#### 11. Uwazi defects NOT to copy

- Rename inside a group is not reflected: `renameFilterTree` matches only top-level `filter.id === templateId` (`settingsTree.ts:50-59`), so a template renamed while inside a group keeps its old stored name in `items[].name`. Correct: store template ids only and read names from the template store, so groups follow renames. (The facet renders child names through `Translate context={child.id}`, which may hide it; unverified.)
- Empty groups until Save: deleting a template leaves its group with `items: []` in settings (`settingsTree.ts:61-71`) and the Library then renders that group as a plain row with the group id as its filter value and a count of 0 (`libraryTypeFilters.ts:18-27`). Correct: drop a group when its last member is removed, in every writer.
- Groups with no members are silently dropped on Save (`helpers.ts:94-96`) after the user added them: the group appears in the table and vanishes after Save with no message. Correct: either require one member in the group form, or keep the empty group, or tell the user.
- Banner copy is wired to the wrong keys: heading and bullet 1 both use key `Filters configuration`, whose default is `Filters` (en.csv:526), so a fresh install likely shows `Filters` twice instead of the inline sentences (unverified at runtime); bullet 2 default is lowercase `select` and has misplaced spaces and quotes `e.g ("Documents ""or ""People")` (en.csv:528). Correct: one key per sentence, `Select "Add group" below to group templates under a label, for example "Documents" or "People".`
- `Cancel` in the discard dialog does not reset the blocker (`FiltersTable.tsx:253-262`); a later navigation may not reopen the dialog (unverified). Correct: reset the guard on Cancel.
- `Delete` has no confirm and no undo, and replaces the Save/Cancel buttons while any row is ticked, so a pending edit cannot be saved without unticking first (`FiltersTable.tsx:206-243`).
- No dirty guard on the sidepanel or the modal; closing drops input silently.
- Group `name` is not trimmed and duplicates are accepted; a group whose loaded record has no `id` gets a new `id` on edit (`FiltersSidepanel.tsx:74`), which can duplicate it in the translation context (unverified).
- Server accepts any `id` values and replaces the whole list; two admins saving from stale pages overwrite each other (last write wins, `Settings.ts:137-142`).
- Group chevron aria-label `Collapse` / `Expand` is not translated (`FacetCard.tsx:86`).

### Relationship types

Route `/settings/relationship-types` (index only, no create/edit routes; add and edit open in a sidepanel) (`app/react/Routes.tsx:443-450`), admin only; nav link `Relationship types` under `NeedAuthorization roles={['admin']}`, second section headed `Metadata`, after `Templates` and `Thesauri` (`R/SettingsNavigation.tsx:44-62`). Component `R/RelationshipTypes/RelationshipTypes.tsx`; form `components/Form.tsx`; columns `components/TableComponents.tsx`; loader `createRelationshipTypesLoader.ts:12-19` (`GET /api/relationtypes`, `app/react/V2/api/relationshiptypes/index.ts:30-42`). Data model: `{_id, name}` only (`API/core/domain/relationshipType/RelationshipType.ts:1-10`, DTO `API/core/infrastructure/express/relationshipType/RelationshipTypeMapper.ts`). No inverse label, no description, no colour.

#### 1. Screen map

Top to bottom (`R/RelationshipTypes/RelationshipTypes.tsx:113-198`):

1. Header: title only `Relationship types` (`:116`; en.csv:1055). No description, no banner.
2. One table card (`:119-133`), `enableSelections`, no drag, no groups.
   - Table header row: `Relationship types` (`:124-126`), no buttons.
   - Column header row, left to right: select-all checkbox (sr-only `Select all`), then
     1. `Label` (`R/RelationshipTypes/components/TableComponents.tsx:46`, `w-1/2`, sortable `:56`)
     2. `Templates` (`:48`, `w-1/2`, not sortable `:62`)
     3. `Action` (`:47`, `w-0 text-center`, visible text, not sortable `:68-69`)
   - Row cells:
     - checkbox (sr-only `Select`); disabled, with no tooltip, when any template property uses the type (`disableRowSelection: Boolean(templatesUsingIt.length)`, `RelationshipTypes.tsx:54`; `UI/Table/RowSelectComponents.tsx:37`, boolean reason gives no tooltip)
     - `Label` cell: `{translation}({name})`, translated name in `text-indigo-800` followed immediately by the stored name in parentheses with no space (`TableComponents.tsx:26-30`); the pair always shows, even when equal (e.g. `Parent(Parent)`)
     - `Templates` cell: grey `Pill`s, one per template that has a relationship property whose `relationType` equals the type id, `whitespace-nowrap`, text `<Translate context={template._id}>{template.name}</Translate>` (`:32-44`); empty cell when unused
     - `Action` cell: ghost button `Edit` (`:16-24`, en.csv:435)
   - Zero rows: `NO DATA AVAILABLE` (`UI/Table/DefaultNoDataMessage.tsx:6`).
3. Sticky footer (`:136-160`), `highlighted={selectedItems.length > 0}` (info-tint background when something is selected, `SettingsContent.tsx:104`):
   - Nothing selected: single primary button `Add relationship type` (`:154-156`, en.csv:65).
   - Something selected: danger `Delete` (`:139-146`, en.csv:366) followed by the text `Selected` `{n}` `of` `{total}` (`:147-148`; en.csv:1167, :885). The JSX puts no space between `of` and the total (`:147-148`), so it renders `Selected 2 of5`-style text (inferred, not run).
4. Sidepanel (`:162-179`): `Sidepanel size="medium" withOverlay` (500 px right panel with overlay; `Escape` and overlay click close).
   - Title (uppercase): `Add relationship type` when `formValues.name === ''`, else `Edit relationship type` (`:164-166`). `Add relationship type` is en.csv:65; `Edit relationship type` is not in en.csv (searched), so the inline text is the fallback.
   - Body: `Card` titled `Relationship Type` (`Form.tsx:30`, en.csv:1050) containing the single input `Name` (`:32-49`, label en.csv:773).
   - Footer pinned to the bottom, `absolute bottom-0 px-4 py-3` (`Form.tsx:53-70`): `Cancel` (ghost, grows, closes) then `Save` (primary submit, grows) (en.csv:171, :1105).
5. Delete confirmation modal (see part 4).

#### 2. Fields

| Label | Control | Placeholder | Help text | Default | Validation rule and error message | Required | Cite |
|---|---|---|---|---|---|---|---|
| `Name` | text input `id="relationship-type-name"`, `data-testid="relationship-type-form-name"` | none | none | `''` (Add), current name (Edit); form `mode: 'onSubmit'` so rules run only on Save | Client rule 1 `required: true`: the input turns red, no message text. Client rule 2 `alreadyExists`: fails when another type has `type.name === value` and a different `_id`; message `Already exists` (en.csv:105). The compare is case-sensitive and untrimmed (`Form.tsx:36-47`). Server create: `existsByName(name)` compares `lower(trim(name))` and throws `Error('duplicated_entry')` (`API/core/application/CreateRelationshipType.ts:19-22`; `API/core/infrastructure/mongodb/relationshipType/MongoRelationshipTypesDataSource.ts:41-53`, Postgres `.../postgresql/relationshipType/PostgresRelationshipTypesDataSource.ts:51-59`). Server update: same check excluding own id (`UpdateRelationshipType.ts:25-28`), plus `Error('Relationship type not found')` (`:21-23`) and `Error('Relationship type _id is required for update')` when the body has no `_id` (`UpdateRelationshipTypeController.ts:13`; the route sends bodies without `_id` to create, so unreachable). Schema: `name: z.string()` with no min length (`RelationshipTypeRouteSchemas.ts:3-9`), so the server accepts `''` and untrimmed names; the stored name is not trimmed. | yes (client) | `Form.tsx:32-49` |

Data sent: Add `{name}` (`rowId` stripped, `RelationshipTypes.tsx:75-77`); Edit starts from the table row (`:65-68`, which also holds `translation`, `templates`, `disableRowSelection`), so the POST body likely carries those extra keys, which the server accepts through `.passthrough()` (`RelationshipTypeRouteSchemas.ts:9`) and ignores (inferred, not run). Correct: send only `{_id, name}`.

Related field in the template editor (not on this page): property type `Relationship` shows a select labelled `Relationship type` + `*` (required), first option `Select...`, options sorted by translated name (`R/Templates/components/fields/RelationshipFields.tsx:26-36, 83-99`; en.csv:1051, :1166).

#### 3. Row actions and bulk actions

| Label | When enabled | What it does | Cite |
|---|---|---|---|
| `Edit` (row) | always | copies the row into the form, opens the sidepanel (title `Edit relationship type`) | `RelationshipTypes.tsx:65-68` |
| Row checkbox | disabled (no tooltip) when a template property uses the type | select for bulk delete | `RelationshipTypes.tsx:54` |
| Select all (header) | always | selects every row that is enabled (react-table `enableRowSelection`) | `UI/Table/Table.tsx:165-168` |
| `Add relationship type` (footer) | nothing selected | form with `{name:'', rowId:'NEW_REL'}`, opens the sidepanel | `RelationshipTypes.tsx:70-73, 154-156` |
| `Delete` (footer) | one or more rows selected | opens the confirm modal; no per-row delete button | `:139-146` |

Bulk delete runs one `DELETE /api/relationtypes?_id=<id>` per selected id in parallel and returns the first failure (`app/react/V2/services/http/HttpRelationshipTypesService.ts:11-18`, `app/react/V2/api/relationshiptypes/index.ts:67-81`); other deletes may already have succeeded (partial success is possible).

#### 4. Confirm dialogs and modals

| Trigger | Title | Body | Buttons in order | Cite |
|---|---|---|---|---|
| `Delete` footer button | `Delete` (en.csv:366), with a warning-triangle icon | red alert block `Do you want to delete the following items?` (en.csv:403, `role="alert"`), then a bulleted list of the stored `name` of each selected row (raw name, not the translation) | close X; `Cancel` (warm); `Accept` (danger); both default labels (en.csv:171, :18) | `RelationshipTypes.tsx:180-196`, `UI/ConfirmationModal.tsx:110-157` |
| `Add relationship type` / `Edit` | sidepanel, not a modal | see part 1 | `Cancel`, `Save` | `RelationshipTypes.tsx:162-179`, `Form.tsx` |

Modal is `ConfirmationModal size="lg" dangerStyle` (`max-w-lg`). `Accept` runs `deleteSelected`; `Cancel` and the X only close it.

Refusal messages (server `HTTP 400`, plain objects built with `createError(message, 400)`, checked in this order; first failure stops) (`API/core/application/DeleteRelationshipType.ts:21-46, 50-51`):
1. `Cannot delete type being used in templates: {names}` where `{names}` = raw template names joined by `, ` for templates with a relationship property using the type (`:27`). The client already disables the checkbox for this case, so it only appears with a stale template list.
2. `Cannot delete type being used in relationships` when the legacy connections count for the type is > 0, or, if the new-relationships feature is enabled, the new relationship count is > 0 (`:34-41`; `API/relationships/relationships.js:155-157`, `API/relationships.v2/relationtypes/v2_support.ts:7-15`).
3. `Cannot delete type being used in relationship queries` when `relationTypeIsUsedInQueries` is true (`:43-45`). In v1.229.224 this cannot trigger: the check iterates an empty list (`API/relationships.v2/templates.v2/services/CreateTemplateService.ts:212-217`).

What the user sees: the page shows an `error` notification titled `An error occurred` (en.csv:116) with `details = error.detail ?? error.message` (`RelationshipTypes.tsx:97-103`). `detail` is the body's `prettyMessage`, which for these errors is built by `fallbackPrettifier` as `\nurl: /api/relationtypes\nquery: {…"_id": "<id>"…}\n<message>` (`API/utils/handleError.js:42-62, 215-216`; `API/utils/error_handling_middleware.js:36-38`; `app/shared/apiClient/normalizeError.ts:81-97`), so the details text includes url and query lines before the message (from code; not run). A second `error` notification from the global request policy appears for the same failure (`app/react/V2/api/policies.ts:39-62, 66-76`); the call passes no `policies.notification:false` (inferred). After any failure the modal closes, the loader revalidates and the selection is kept (`:109-110`).

#### 5. Empty / loading / error states

- Empty: `NO DATA AVAILABLE` (`UI/Table/DefaultNoDataMessage.tsx:6`, en.csv:812). Footer still shows `Add relationship type`. There is no seeded type; a new instance has none until an admin adds one (Relationships need at least one: en.csv:109 `An admin needs to add relationship types before you can create a relationship.`).
- Loading: none found (route loader; no skeleton). The global request bar runs during requests (`policies.ts:11-37`).
- Loader error: `throwApiError(error)` route error (`createRelationshipTypesLoader.ts:17`).
- Save or delete error: notification `error`, title `An error occurred`, details `error.detail ?? error.message` (`RelationshipTypes.tsx:80-85, 98-103`); the sidepanel closes even on error (`:90`).
- Field errors: `Already exists`; `required` has no text (input turns red only).
- Success: notification `success`, title `Updated` (en.csv:1439) for add, edit and delete alike (`:87, :105`). No `Relationship type created successfully.`: that string is only used by the template-editor modal (`R/Templates/components/AddRelationshipTypeModal.tsx:36`).

#### 6. Save

Add or Edit (sidepanel `Save`, submit of form `relationship-type-form`):
1. Client: react-hook-form validation (part 2). On failure nothing is sent.
2. `relationshipTypesService.upsert(data)` where `data` is the form values minus `rowId` (`RelationshipTypes.tsx:75-77`) = `POST /api/relationtypes` (`app/react/V2/api/relationshiptypes/index.ts:44-65`). The route calls update when `req.body._id` is set, else create (`API/core/infrastructure/express/relationshipType/routes.ts:9-17`); `needsAuthorization()` = admin.
3. Create (`CreateRelationshipType.ts:18-32`): duplicate check (part 2), new `RelationshipType(id, name)`, in one transaction insert the type and create a translation context `{id: <type id>, label: <name>, type: 'Relationship Type'}` with key `<name>` and value `<name>` in every installed language (`API/core/application/relationshipTypeTranslationService/RelationshipTypeTranslationService.ts:18-27`; `API/core/application/translation/TranslationsService.ts:112-116`). Returns `{_id, name}`.
4. Update (`UpdateRelationshipType.ts:19-38`): load current, duplicate check excluding self, update the name and `updateContext` with `keyChanges {oldName: newName}` (`RelationshipTypeTranslationService.ts:29-41`): the key is renamed in every language, the default language gets the new name as its value and other languages keep their existing translated text (`API/core/domain/translation/TranslationContextModel.ts:57-77, 95-103`). The id never changes, so template properties and references need no rewrite.
5. Activity log `Created relation type` (`method: Create`, name field `name`) for the POST (`API/activitylog/activitylogParser.ts:80-85`); the same description is used for updates (the route key is the same).
6. Client success: notification `success` `Updated`, `setIsSidepanelOpen(false)`, `await revalidator.revalidate()` (`RelationshipTypes.tsx:86-91`); the loader data refills the table and `relationshipTypesAtom` (`:61-63`). No socket event for relationship types (none in `app/react/App/sockets.js`), so other sessions see changes on their next load.
7. Client error: notification `error`, `An error occurred` + details; panel closes (part 5). Case-only duplicates reach step 3/4 and fail with HTTP 500 (see part 11).

Delete (modal `Accept`):
1. `DELETE /api/relationtypes?_id=<id>` per selected id, in parallel (`HttpRelationshipTypesService.ts:11-18`); `needsAuthorization()`.
2. Server checks in order: templates, relationships, queries (part 4), then in one transaction deletes the translation context (`translationsDS.deleteByContextId`, all languages) and the type (`DeleteRelationshipType.ts:53-56`). Returns `true`.
3. Activity log `Deleted relation type` (`activitylogParser.ts:139-143`).
4. Client: on error notify (part 4/5); on success notify `Updated`, clear selection (`setSelectedItems([])`), close the modal, revalidate (`RelationshipTypes.tsx:94-111`).

#### 7. Dirty guard

none found. There is no `useBlocker` or `ConfirmNavigationModal` in the page, the sidepanel closes on `Escape`, overlay click, `Cancel` or the X without a prompt, and edits are discarded (`RelationshipTypes.tsx`, `UI/Sidepanel.tsx:119-127`). The form has no per-field guard.

#### 8. Sort, filter, search, pagination

- Default order: rows sorted client-side by the translated name with `localeCompare` (`RelationshipTypes.tsx:57`), computed with `t(relationshipType._id, relationshipType.name, null, false)` (`:52`). This runs on every revalidate and when `templatesAtom` changes.
- Column sort: only `Label` is sortable (`TableComponents.tsx:56`); clicking cycles ascending, descending, none with chevrons. The sort key is the raw `name` accessor (`:52`), not the translation, so a header sort can differ from the default order (inferred). No `defaultSorting`.
- Search, filter, pagination: none found.
- Selection state is held per page visit; ticking is by row id (`rowId = _id`).

#### 9. Propagation

- Translations: each type has a translation context of type `Relationship Type` with id = the type `_id` and one key (the name) per language (`RelationshipTypeTranslationService.ts:18-46`; context type enum `API/core/infrastructure/mongodb/translation/schemas/TranslationDBO.ts:10`). Admins translate it in Settings > Translations; the Label cell then shows the translation followed by the stored name in brackets (`TableComponents.tsx:28`). Deleting the type deletes the context in all languages.
- Name display everywhere: `t(type._id, type.name)` (context = type id). Examples: template editor select options (`RelationshipFields.tsx:30`), property flag in the template table `<Translate context={relationType?._id}>{relationType?.name}</Translate>` (`R/Templates/components/TemplateEditorTableComponents.tsx:80, 135-136`).
- Template relationship properties: a property stores `relationType: <type _id>` (+ `content` target template, `inherit`). The Templates column on this page is derived on the client: for each template, `tmpl.properties?.some(p => p.relationType === type._id)` using `templatesAtom` (`RelationshipTypes.tsx:40-47`). A used type cannot be ticked, and the server refuses delete with refusal 1.
- Template editor creates types inline: `Add relationship type` modal (`Modal size="md"`, title `Add relationship type`, input `Name` with placeholder `Relationship type name`, `Cancel` secondary, `Save` success, `Save` disabled when the trimmed name is empty or saving, duplicate message `Relationship type name already exists`, success notification `Relationship type created successfully.`) (`R/Templates/components/AddRelationshipTypeModal.tsx:12-79`; en.csv:1052-1054). Its duplicate check is trimmed and case-insensitive (`app/react/V2/services/useRelationshipTypeMutations.ts:19-28`), unlike this page's form.
- Relationships: references store the type `_id` (`template` field of legacy connections); renaming does not touch them; deleting is refused while any exist (refusal 2). In the Relationships panel an untyped reference shows `No label` (`app/react/V2/Routes/Entity/Components/relationships/panel/RelationshipsSsrIndex.tsx:39`, en.csv:823); this is a display label, not a stored relationship type, and the Settings list never shows it (no row, none found in `API/` seeds).
- `relationshipTypesAtom` is refreshed on each page load and revalidate (`RelationshipTypes.tsx:61-63`) and is what the template editor reads (`RelationshipFields.tsx:17`).
- Activity log entries `Created relation type`, `Deleted relation type` (`activitylogParser.ts:80-85, 139-143`).

#### 10. Improvements to layer on

- UX4 and gap-matrix "Delete: tick rows" / "Delete confirm": show impact before deleting. Refuse when a template property uses the type and name those templates; when only references use it show the real count. Decision G6: Settings refuses with the count; the Relationships panel's "Manage relationship types" modal keeps the reassign-to-no-label path.
- UX2 and gap-matrix "Multi-select with Selected N of M": use the shared selection bar (fixed count slot, `BAR_GHOST` actions, `BarDivider`, `BAR_DANGER` Delete); fix the missing space in `Selected N of M`.
- UX1 and gap-matrix "Search and sort": add the list search row (low priority; the list is short).
- UX12 and gap-matrix "Phone": list rows with name and usage, edit in a sheet.
- Gap-matrix "Name rules" (Design: validation): trim, compare case-insensitively on the client, show a message for the empty case, same `Already exists` text; do not reproduce the HTTP 500.
- Gap-matrix "Templates column": keep template pills from the template store and add a references count column (vocabulary: "references").
- Gap-matrix "List table": show the stored name in brackets only when it differs from the translation.
- Gap-matrix "Save model": after save return to the list with the row highlighted; add a dirty guard on Cancel and close of the panel (improved over Uwazi).
- Gap-matrix "Empty state" (shared list pattern 1): `NO DATA AVAILABLE` becomes a message that names relationship types and offers `Add relationship type`.
- Gap-matrix "Inverse name" and decision G5: drop it (not in Uwazi).
- Gap-matrix "Create inline from the template property dialog": one registry shared by Settings, the Relationships panel modal and the template dialog.
- Shared list pattern (audit lines 62-74) "Create verbs": `Add relationship type` on the bar, `Add` or `Save` as the commit; commit in ink (decision G2).

#### 11. Uwazi defects NOT to copy

- Case-only duplicate gives HTTP 500: the client check is case-sensitive and untrimmed (`Form.tsx:39-43`), the server check is trimmed and case-insensitive and throws a plain `Error('duplicated_entry')` (`CreateRelationshipType.ts:19-22`, `UpdateRelationshipType.ts:25-28`), which `prettifyError` maps to code 500 (`API/utils/handleError.js:70-73`) and then hides as `A server side error has occurred` (`handleError.js:288-295`); the user sees `An error occurred` with that text, twice (page + global policy). Correct: reject `lower(trim(name))` duplicates on the client with `Already exists`, and make the server return a 4xx domain error with a readable message.
- Required name shows no message, only a red input (`Form.tsx:36-48`). Correct: `This field is required`.
- Whitespace-only or untrimmed names pass the client; the server stores the name untrimmed and accepts `''` (`RelationshipTypeRouteSchemas.ts:3-9`). Correct: trim, reject empty.
- Success text is `Updated` for add, edit and delete (`RelationshipTypes.tsx:87, 105`), which does not say what happened. Correct: name the action and the type.
- Sidepanel closes on save error (`RelationshipTypes.tsx:90`), dropping the typed name. Correct: keep it open on error.
- Delete: usage by references is only discovered after `Accept`, with a raw server message (plus `url` and `query` lines in the details), and the error does not say which of several types failed; bulk delete is not atomic (`HttpRelationshipTypesService.ts:11-18`). Correct: show usage before `Accept`, report per type, delete in one request or roll back.
- Footer text renders `of` glued to the total (`RelationshipTypes.tsx:147-148`).
- Label cell always prints `translation(name)` with no space, even when both are equal (`TableComponents.tsx:28`).
- Header sort uses the raw `name`, default order uses the translation (`RelationshipTypes.tsx:57` vs `TableComponents.tsx:52`). Correct: one sort key.
- Dead code path: the third refusal `Cannot delete type being used in relationship queries` never fires (`CreateTemplateService.ts:212-217`); do not build UI for it.
- The sidepanel title keys `Edit relationship type` and the `of` wording are built with template strings (`RelationshipTypes.tsx:164-166`), so `Edit relationship type` is missing from en.csv and cannot be translated by default. Correct: one explicit key per title.
- No realtime update: another admin's change appears only after reload (no socket for relationship types).
