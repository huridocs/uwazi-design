## Templates (list and editor)

Cite legend (all repo-relative to `uwazi-ref`). Bare file names live in `app/react/V2/Routes/Settings/Templates/` (`Templates.tsx`, `TemplatesEditor.tsx`, `helpers.ts`, `createTemplatesLoader.ts`, `createTemplatesEditorLoader.ts`) or its `components/` (`TemplatesTableComponents.tsx`, `DeleteTemplatesConfirmationModal.tsx`, `TemplateMetadata.tsx`, `TemplateEditorTableComponents.tsx`, `TemplatesEditorFooter.tsx`, `ConfigPropertyPanel.tsx`, `AddThesaurusModal.tsx`, `AddRelationshipTypeModal.tsx`, `defaultTemplateColors.ts`) and `components/fields/` (`LabelField.tsx`, `PrioritySortingField.tsx`, `GeneratedIdField.tsx`). Shared UI: `Table.tsx` = `app/react/V2/Components/UI/Table/Table.tsx`; `RowSelectComponents.tsx`, `DnDComponents.tsx`, `DefaultNoDataMessage.tsx`, `SortingChevrons.tsx` same folder; `SettingsContent.tsx` = `app/react/V2/Components/Layouts/SettingsContent.tsx`; `ConfirmationModal.tsx`, `ConfirmNavigationModal.tsx`, `Modal.tsx`, `Sidepanel.tsx`, `ProgressBar.tsx` = `app/react/V2/Components/UI/`; `ColorPicker.tsx` = `app/react/V2/Components/Forms/ColorPicker.tsx`. Server: `errors.ts` = `app/api/core/domain/template/errors.ts`; `TemplateDTOs.ts`, `UpdateTemplate.ts`, `CreateTemplate.ts`, `DeleteTemplate.ts`, `SetTemplateAsDefault.ts` = `app/api/core/application/`; `Template.ts` = `app/api/core/domain/template/Template.ts`; `handleError.js` = `app/api/utils/handleError.js`; `activitylogParser.ts` = `app/api/activitylog/activitylogParser.ts`; `en.csv` = `contents/ui-translations/en.csv`. Table headers render uppercase through CSS (`Table.tsx:302`); the strings below are the source casing.

Corrections to the inventory found while verifying: (a) bulk delete runs every DELETE in parallel and reports the first failure in input order; it does not abort (`HttpTemplatesService.ts:14-21` under `app/react/V2/services/http/`); (b) `InheritedPropertyCanNotBeDeleted` is a `DomainError`, so it is HTTP 400, not 422 (`handleError.js:142-144`); (c) every `POST /api/templates` logs "Created template", including updates (`activitylogParser.ts:68-73`); (d) the Cancel footer button is a secondary button inside a link, not a bare link (`TemplatesEditorFooter.tsx:50-54`); (e) the two confirm modals list `Cancel` first and `Continue` second (`ConfirmationModal.tsx:137-152`).

---

### Templates list (`/settings/templates`)

**1. Screen map**

- Route and gate: `Routes.tsx:376-381`, admin only (`Routes.tsx:379`). Settings nav entry `Templates` (`SettingsNavigation.tsx:55`).
- Header (`Templates.tsx:70`): title `Templates`. No breadcrumb path (none found). No description banner (none found). Below `lg`, a chevron link to `/settings` with sr-only `Navigate back` (`SettingsContent.tsx:62-67`, `en.csv:782`).
- Body: one table card (class `bg-paper`, `Templates.tsx:80`), selection checkboxes on, no drag (`Templates.tsx:72-81`).
- Columns, left to right (`TemplatesTableComponents.tsx:103-157`, `Table.tsx:130-138`):

| # | Header (verbatim) | Sortable | Cell | Cite |
|---|---|---|---|---|
| 0 | sr-only `Select all` (header checkbox, indeterminate when some selected) | no | row checkbox, sr-only `Select` | `RowSelectComponents.tsx:36,69` |
| 1 | `Name` | yes, default sort asc | link to `/settings/templates/edit/{_id}` plus blue pill `Default` on the default template | `TemplatesTableComponents.tsx:13-31,79,108-113`, `Templates.tsx:79` |
| 2 | `Translation` | yes | template name rendered in the UI language (`Translate context={_id}`); sort key is the raw `name`, not the translated text | `TemplatesTableComponents.tsx:33-35,80,114-119` |
| 3 | `Synced Template` (only when some template has `synced`) | no | text `Synced template`, tooltip below | `TemplatesTableComponents.tsx:85-101,122-131` |
| 4 | `Entities` | yes | count; `>=1000` as `1.2k`, `>=1000000` as `3M` (drops `.0`) | `TemplatesTableComponents.tsx:37-49,81,133-140` |
| 5 | `Set as default` | no | star icon button, sr-only `Set as default` | `TemplatesTableComponents.tsx:51-69,82,141-147` |
| 6 | `Action` | no | ghost button `Edit` inside a link | `TemplatesTableComponents.tsx:71-77,83,148-154` |

- Sort indicators: up/down chevron when idle, up when asc, down when desc (`SortingChevrons.tsx:9-18`). Whole header cell toggles sort (`Table.tsx:307`).
- Footer (sticky, left aligned, `Templates.tsx:83-104`): no selection shows `Add template` (primary, link to `/settings/templates/new`); one or more selected shows `Delete` (danger) then `Selected {n} of {total}` where the three words are separate translations `Selected`, `of` (`Templates.tsx:97-100`, `en.csv:1167,885`). No footer button is ever disabled.

**2. Fields** (no inputs on this page; cells and the row checkbox)

| Label | Control | Placeholder | Help / tooltip | Default | Validation and error | Required | Cite |
|---|---|---|---|---|---|---|---|
| Row checkbox | tanstack row selection | none found | tooltip with the joined reasons when disabled, width `w-40` | unchecked | disabled when any reason applies; reasons joined with a space: `A default template cannot be deleted.` (when `default`), `This template is in use by existing entities and cannot be deleted.` (when entity count > 0), `Synced templates cannot be deleted.` (when `synced`) | n/a | `createTemplatesLoader.ts:27-46`, `RowSelectComponents.tsx:37-41`, `en.csv:11,1370,1261` |
| Name link | `I18NLink` | none found | none found | n/a | synced templates render plain text with `cursor-not-allowed` | n/a | `TemplatesTableComponents.tsx:13-24` |
| `Default` pill | `Pill color="blue"` | none found | none found | shown iff `default` | none | n/a | `TemplatesTableComponents.tsx:25-29` |
| `Set as default` | icon button; `primary` variant when default, `secondary` otherwise | none found | none found (sr-only label only) | disabled when `default` or `synced` | server: `Template (ID: {id}) is already the default.` (400) | n/a | `TemplatesTableComponents.tsx:54-60`, `Template.ts:209-211` |
| Synced tooltip | `Tooltip` on `Synced template` | none found | `The source of this template is a sync.` / `All editing options will be disabled.` | hidden unless a synced template exists | none | n/a | `TemplatesTableComponents.tsx:87-98` |

**3. Row actions and bulk actions**

| Label | Enabled when | What it does | Cite |
|---|---|---|---|
| Name link | not synced | navigates to `/settings/templates/edit/{_id}` | `TemplatesTableComponents.tsx:18-23` |
| `Edit` | not synced | same navigation | `TemplatesTableComponents.tsx:71-77` |
| Star `Set as default` | row is not default and not synced | `POST /api/templates/setasdefault {_id}`, success toast, revalidate | `Templates.tsx:24-39` |
| Row checkbox | no reason applies | adds row to selection | `Table.tsx:165-168` |
| Header `Select all` | always | selects all selectable rows only | `RowSelectComponents.tsx:49-81` |
| `Delete` (footer) | 1+ rows selected | opens the delete modal | `Templates.tsx:92-101` |
| Duplicate / clone | none found | none found | none found |

**4. Confirm dialogs and modals**

Delete templates (`DeleteTemplatesConfirmationModal.tsx:22-37`, `ConfirmationModal.tsx:110-157`, danger style, size `md`):
- Trigger: footer `Delete`.
- Title: `Delete` (with warning-triangle icon, `h3`).
- Warning bar (`role="alert"`, red tint): `Do you want to delete the following items?`
- Body: bulleted list of the selected template names (`list-disc list-inside`, flex-wrap), `key` is the name.
- Buttons in order: close X (`aria-label="Close modal"`, `Modal.tsx:108`), `Cancel` (warm variant, left), `Delete` (danger, right).
- `Cancel` and X: close the modal, selection kept (`Templates.tsx:109`). `Delete`: closes the modal first, then sends the requests (`Templates.tsx:45-50`).
- No Escape and no backdrop-click handler in `Modal.tsx:26-51` (none found).
- Set as default has no confirm (none found).

**5. Empty / loading / error / notification states**

- Empty table: `NO DATA AVAILABLE` centred in the table body (`DefaultNoDataMessage.tsx:6`, `Table.tsx:322-324`). Footer still shows `Add template`.
- Loading: none found (route loader holds the previous page until data arrives).
- Loader error (templates or counts request fails): route error boundary, big status number, title `Well, this is awkward...` when the error has no name, error message, button `Show details` / `Hide details` (`createTemplatesLoader.ts:19,25`, `ErrorFallback.tsx:22-30,59-63`, under `app/react/V2/Components/ErrorHandling/`).
- Notifications go to the Beacon log (`notify(type, title, message, details)`, `atoms/requestStatusAtom.ts:144-153` under `app/react/V2/`):
  - success `Default template set successfully.` (`Templates.tsx:37`, `en.csv:364`)
  - success `Template(s) deleted successfully.` (`Templates.tsx:63`, `en.csv:1290`)
  - error title `An error occurred`, details `error.detail ?? error.message` (`Templates.tsx:28-33,53-58`, `en.csv:116`)
- Server error texts that reach the error detail on delete: `The default template cannot be deleted. Please set a different template as the default before deleting this one.` (`errors.ts:261-268`, 400) and `Cannot delete a template that has existing entities. Please remove the related entities first.` (`errors.ts:270-277`, 400).

**6. Save** (no form; two immediate actions)

Set as default:
1. Click star; no client validation.
2. `POST /api/templates/setasdefault` body `{_id}` (`app/react/V2/api/templates/index.ts:75-94`); admin only (`routes.ts:14-18` under `app/api/core/infrastructure/express/template/`).
3. Server, one transaction: load template, load current default, `setAsDefault` flips both flags, update both (`SetTemplateAsDefault.ts:20-32`, `Template.ts:202-218`).
4. Server emits socket `templateChange` for the new default and the old default (`SetTemplateAsDefaultController.ts:9-13`); `templatesAtom` updates (`app/react/App/sockets.js:62-71`).
5. Client: success toast, `revalidator.revalidate()`; the `Default` pill and the disabled star move to the new row (`Templates.tsx:37-38`).
6. Error: toast `An error occurred` + detail; no revalidate.
7. Activity log: `Set default template`, named by the template (`activitylogParser.ts:132-136`).

Delete:
1. Confirm modal closes (`Templates.tsx:46`).
2. One `DELETE /api/templates?_id={id}` per selected id, all in parallel; the first failing result in input order is returned; earlier successes stay deleted (`HttpTemplatesService.ts:14-21`).
3. Server per id (`DeleteTemplate.ts:27-95`): unknown id returns `{templateId}` (28-31); default template throws (33-35); template with entities throws (37-42); then in one transaction: remove relationship properties that point at this template from other templates and delete their translation keys, delete this template's translation context, delete the template (53-69); emit `TemplateDeletedEvent` (removes it from `settings.filters`, `app/api/core/infrastructure/settings/ReconcileFiltersOnTemplateChange.ts:36-40`); for every edited template emit `TemplateUpdatedEvent` and enqueue entity jobs (75-92).
4. Socket `templateDelete` (`DeleteTemplateController.ts:9`) removes it from `templatesAtom` (`sockets.js:73-79`).
5. Client success: `setSelectedItems([])`, toast `Template(s) deleted successfully.`, revalidate (`Templates.tsx:62-64`).
6. Client error: toast `An error occurred` + detail; selection kept; no revalidate, so partially deleted rows stay on screen until the next load (`Templates.tsx:52-60`).
7. Activity log: `Deleted template`, `nameField` is `_id` so the id is logged, not the name (`activitylogParser.ts:137`).

**7. Dirty guard**: none found (no form on this page).

**8. Sort, filter, search, pagination**

- Sort: client side, tanstack default toggle on header click (idle, then first direction, then reverse, then off); default `[{id:'name', desc:false}]` (`Templates.tsx:79`). `Name`, `Translation`, `Entities` only. First-click direction per column is the tanstack default (strings asc, numbers desc) (unverified, library behaviour).
- Filter: none found. Search: none found. Pagination: none found (all rows load; one count request per template, `app/react/V2/api/templates/index.ts:104-134`).
- Entity count: distinct `sharedId` of entities with that template (`app/api/core/infrastructure/mongodb/entity/MongoEntitiesDAO.ts:312-323`).

**9. Propagation**

- Default template changes which template a new entity form preselects (`app/react/Metadata/actions/actions.js:106-109`) and the template used for entities without one (`app/react/Metadata/helpers/comonTemplate.js:13-15`).
- Delete removes the template from Settings > Filters (`ReconcileFiltersOnTemplateChange.ts:36-40`), removes its translation context (Translations page) (`DeleteTemplate.ts:67`), and strips relationship properties in other templates that target it (`DeleteTemplate.ts:50-65`, `Template.ts:220-230`).
- `templatesAtom` feeds every template pill, type chip, entity editor and Copy From picker (`sockets.js:62-79`; consumers e.g. `app/react/V2/Components/UI/TemplatePill.tsx`, `EntityTypeChip.tsx`).

**10. Improvements to layer on**

- UX1, gap row "Search and sort": search row above the table, always mounted; keep column sort.
- UX2, gap rows "Row selection" and "Selected count": selection action bar with a fixed count slot, `BAR_DANGER` Delete, no tint; disabled rows carry the same reasons.
- UX4, gap row "Delete confirm": dialog lists impact (relationship properties removed from other templates, filter entry removed, translation context removed) instead of a bare list.
- UX12, gap row "Phone": list rows with name, colour dot, `Default` badge, entity count.
- Design finding "Default is carbon" (gap row "Name link"): `Default` badge in ink or vellum, not carbon.
- Design list-page pattern (gap row "Edit button"): drop the redundant `Edit` button, row actions on hover with `group-focus-within`.
- Gap row "Delete blocked": block default and in-use templates and say which rule applies, with a way forward (set another default; change entity template).
- Gap row "Empty state": `EmptyState` naming the object plus an `Add template` action.
- Gap row "Outcome feedback": every action appended to the activity log through the notify hook.

**11. Uwazi defects NOT to copy**

- Bulk delete is not atomic (`HttpTemplatesService.ts:14-21`): run the whole selection as one store action, all or nothing.
- After a failed bulk delete the list is not revalidated (`Templates.tsx:52-60`): always refresh.
- `Synced Template` column and the `synced` locks (`TemplatesTableComponents.tsx:122-131`): drop; only the UI enforces them, the server does not (`DeleteTemplate.ts:33-42` has no `synced` check).
- Delete guards are client-only on the row and server-only on the message: show the reason text next to the disabled checkbox and in the blocked-delete message, not only in a tooltip (`RowSelectComponents.tsx:37-41`).
- `Translation` column sorts by the raw `name`, not the displayed translation (`TemplatesTableComponents.tsx:114-119`): sort by displayed text if the column is kept.
- Activity log stores the template id for deletions (`activitylogParser.ts:137`): log the name.
- Error toast detail comes from `prettyMessage`, which for non-AJV errors is built as url + body + query + message (`handleError.js:48-64,215-217`): show only the message (unverified at runtime).
- `GET /api/templates` and `GET /api/v2/entities/count_by_template` have no auth middleware (`routes.ts:10`): not applicable to a prototype; do not model.
- Success copy `Template(s) deleted successfully.` is a pluralisation workaround: use "Template deleted." / "{n} templates deleted."

---

### Template editor (`/settings/templates/new` and `/settings/templates/edit/:templateId`)

Panels that open from this page: property panel = `ConfigPropertyPanel` (right side panel, large, with overlay). Per-type fields: see property dialog brief.

**1. Screen map**

- Routes `Routes.tsx:382-391`, admin only; loader `createTemplatesEditorLoader.ts:18-49` (pages list, templates list, entity count). Unknown `:templateId` silently loads an empty new template with a random colour (`createTemplatesEditorLoader.ts:35-45`).
- Header (`TemplatesEditor.tsx:294-300`, `SettingsContent.tsx:57-86`): breadcrumb link `Templates` to `/settings/templates`, chevron, then the current title, which is the live `template.name` (empty on new, updates as the user types, truncates at `max-w-xs`). Below `lg`, a back chevron with sr-only `Navigate back` goes to `/settings`, not to the list. No description banner (none found).
- While `template.processing.active`: a progress bar in the header row, left text `Updating template properties across {entityCount} entities ...` (the literal ` ...` after the translated word, not an ellipsis character), right text `{percent}%` with two decimals, gray bar (`TemplatesEditor.tsx:268-289`, `ProgressBar.tsx:22-46`, `en.csv:1447,462`).
- Body: one table card with drag and selection on. Card header slot (`TemplateMetadata.tsx:51-101`), left to right:
  1. colour swatch button (sr-only `Template color`) opening a popover
  2. name input, placeholder `Template name`, clear button (sr-only `Clear`) when non-empty
  3. entity view controls: checkbox `Display entity view from page` plus a select (first option `Select page`), or the text `There are no pages enabled for entity view` when no page has entity view on
- Property table columns, in order (`Table.tsx:130-147`, `TemplateEditorTableComponents.tsx:156-183`):

| # | Header (verbatim) | Sortable | Cell | Cite |
|---|---|---|---|---|
| 0 | sr-only `Empty` | no | drag handle button, sr-only `Drag row`; on common rows only sr-only `Empty` | `DnDComponents.tsx:54-60,76,170` |
| 1 | sr-only `Select all` | no | checkbox; disabled on common rows with tooltip `This property can not be deleted` | `RowSelectComponents.tsx:69`, `helpers.ts:83` |
| 2 | `Property` | no (default sort none) | button with the label (lock icon on common rows); opens the property panel | `TemplateEditorTableComponents.tsx:22-47,66,159-164` |
| 3 | `Type` | no | type icon plus translated type name (capitalised by CSS) | `TemplateEditorTableComponents.tsx:49-56,67,165-171` |
| 4 | `Options` | no | pills (list below) | `TemplateEditorTableComponents.tsx:69,72-154,172-176` |
| 5 | `Action` | no | ghost small button `Edit` | `TemplateEditorTableComponents.tsx:58-64,68,177-182` |

- Rows: the three common rows first (`Title`, `Date added`, `Date modified`; lock icon; not draggable; not selectable), then the custom properties in saved array order (`helpers.ts:8-37`, `TemplatesEditor.tsx:158-161`). The table is never empty.
- Type names shown (translation key `property {type}`, `TemplateEditorTableComponents.tsx:53`, `helpers.ts:39-57`): `Text` (`en.csv:1007`), `Rich text` (`en.csv:998`), `Numeric` (`en.csv:1003`), `Date` (`en.csv:992`), `Multiple date` (`en.csv:1000`), `Date range` (`en.csv:993`), `Multiple date range` (`en.csv:1001`), `Select` (`en.csv:1006`), `Multiple select` (`en.csv:1002`), `Relationship` (`en.csv:1005`), `Link` (`en.csv:997`), `Image` (`en.csv:996`), `Preview` (`en.csv:1004`), `Media` (`en.csv:999`), `Geolocation` (`en.csv:995`), `Generated ID` (`en.csv:994`). `property nested` has no `en.csv` entry, so the raw key shows (unverified).
- Options pills, all gray, in this order, each shown only when set (`TemplateEditorTableComponents.tsx:82-151`): `Show in cards`, `No label`, `Use as filter`, `Priority sorting`, `Required`, `Default filter`, `Generated ID`, `Full width`, `Fill` (style cover), `Fit` (style contain), relationship type name, thesaurus or entity template name.
- Footer (`TemplatesEditorFooter.tsx:24-59`), left group:
  - nothing selected: `Add property` (primary), `Add thesaurus` (secondary), `Add relationship type` (secondary)
  - one or more custom rows selected: `Remove` (danger), then `Selected {n}` (no total)
  - right group: `Cancel` (secondary, link to `/settings/templates`), `Save` (success variant)
- `Save` is disabled when there are no pending changes or a save is running (`TemplatesEditor.tsx:339`). `Cancel` is never disabled.
- Overlays: `ConfigPropertyPanel`, `AddThesaurusModal`, `AddRelationshipTypeModal`, `ConfirmNavigationModal`, two `ConfirmationModal`s (`TemplatesEditor.tsx:343-403`).
- Property panel container (`ConfigPropertyPanel.tsx:205-215,298-305`): title `NEW PROPERTY` (text `New property`) or `EDIT PROPERTY` (text `Edit property`), uppercase by CSS, neither string is in `en.csv`; close X (sr-only `Close`, `Sidepanel.tsx:43-45`); footer `Cancel` (secondary) and `Add property` (new) or `Save` (edit), success variant, disabled while `validateMatchingProperties()` is false. Closes on X, `Cancel`, overlay click (`Sidepanel.tsx:226`), Escape (`Sidepanel.tsx:119-127`). Focus is trapped and restored (`Sidepanel.tsx:96-114,134-170`).

**2. Fields**

Template-level and common-property controls only. Per-type fields: see property dialog brief.

| Label | Control | Placeholder | Help / tooltip | Default | Validation rule and error message | Required | Cite |
|---|---|---|---|---|---|---|---|
| sr-only `Template color` | `ColorPicker` popover: 15 swatches in a 5-column grid, each with sr-only hex; `Pick a color` native colour input; text input with `#` prefix and sr-only label `Manually set a color` | none found | none found | new: random one of `#C03B22 #628ccf #ff8282 #ff8a4c #faca15 #16bdca #31c48d #9eb0fd #f17eb8 #ac94fa #9ca3af #2b8a3e #ffb86b #6a5acd #00b894`; edit: saved colour | Client: a value is accepted only if it matches `^#([0-9a-fA-F]{6})$`; partial hex stays in the input and is not saved; no error message ever shows (`colorError` is never set to true). Server: `z.string().optional()`; on update an empty value keeps the old colour | no | `TemplateMetadata.tsx:53-59`, `ColorPicker.tsx:53-58,94,132,144`, `defaultTemplateColors.ts:1-22`, `createTemplatesEditorLoader.ts:29`, `TemplatesEditor.tsx:52,322`, `TemplateDTOs.ts:67`, `Template.ts:275` |
| (no visible label) `Template name` | `InputField` id `template-name`, clear button when non-empty | `Template name` | none found | `''` | Client, on Save only: empty, or equal case-insensitively to another template's name in `templatesAtom` (self excluded). Empty shows the red state with no message. Duplicate (non-empty) shows `Template name already exists`. Error clears as soon as the name is non-empty (`TemplatesEditor.tsx:321`). No trim. Server: `z.string({ message: 'Template name is required' })` (type check only, `''` passes); create rejects an exact-match duplicate with `The following Template has a used Name on the system. Name = {name}` (400); update checks nothing | yes | `TemplateMetadata.tsx:60-72`, `TemplatesEditor.tsx:233-242`, `TemplateDTOs.ts:66`, `CreateTemplate.ts:59-62`, `errors.ts:166-173`, `en.csv:1283-1284` |
| `Display entity view from page` | `Checkbox` `display-as-page`; unchecking clears `entityViewPage`; hidden when no page has entity view | none found | none found | checked iff `entityViewPage` is set | none found | no | `TemplateMetadata.tsx:30-49,79-87` |
| (no visible label) page select | `Select` id `select-page`, label hidden, disabled unless the checkbox is on; options: `Select page` (value `''`, not translated) then pages with `entityView`, labelled by title, value = page `sharedId` | first option `Select page` | none found | `''` | Client: none. Server, create only: `The selected page does not exist` / `The selected page is not enabled for entity view` (AJV, path `.templates`, 422). Not checked on update | no | `TemplateMetadata.tsx:88-97`, `createTemplatesEditorLoader.ts:22-27`, `app/api/pages.v2/v1_layer/LegacyPageService.ts:14-46` |
| (hint text) | plain text replacing both page controls | none found | `There are no pages enabled for entity view` | shown iff no page has entity view | none | n/a | `TemplateMetadata.tsx:74-78`, `en.csv:1313` |
| Common row `Title` | label button; panel fields: Label, Priority sorting, Generated ID | none found | none found | label `Title`, name `title`, type `text` | see rows below | n/a | `helpers.ts:8-13`, `ConfigPropertyPanel.tsx:274-275` |
| Common row `Date added` | panel fields: Label (disabled), Priority sorting | none found | none found | label `Date added`, name `creationDate`, type `date` | none | n/a | `helpers.ts:15-20`, `LabelField.tsx:28` |
| Common row `Date modified` | panel fields: Label (disabled), Priority sorting | none found | none found | label `Date modified`, name `editDate`, type `date` | none | n/a | `helpers.ts:22-27`, `LabelField.tsx:28` |
| `Label *` (common panel) | `InputField` id `property-label`; read-only type box above it (heading `Type`, icon and type name) | `Text` | none found | the row's label | Client (on panel submit): `This field is required` when empty (`Boolean(value)`, whitespace-only passes); `This label already exists in this template` when equal (case/trim-insensitive) to a custom property label (common labels are not compared). Disabled for common `date` rows. Server: `z.string()` | yes | `LabelField.tsx:18-52`, `ConfigPropertyPanel.tsx:222-241`, `TemplateDTOs.ts:55` |
| `Priority sorting` (common) | `Checkbox` plus help icon | none found | `Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting.` | false | none | no | `PrioritySortingField.tsx:8-37`, `ConfigPropertyPanel.tsx:274` |
| `Generated ID` (Title only) | `Checkbox` plus help icon | none found | `A generated ID will be the default title.` | false | none | no | `GeneratedIdField.tsx:8-31`, `ConfigPropertyPanel.tsx:275`, `en.csv:13` |
| Property row checkbox | tanstack selection | none found | tooltip `This property can not be deleted` on the three common rows | unchecked, disabled on common rows | none | n/a | `helpers.ts:78-84`, `RowSelectComponents.tsx:37-41` |

- Common rows have no Hide label, Required, Show in cards, Use as filter, Default filter or same-label table (`ConfigPropertyPanel.tsx:258-261,278`).
- Server persists for common rows only `label`, `type`, `name`, `isCommonProperty`, `prioritySorting`, `generatedId` (`TemplateDTOs.ts:54-62`); all three names must be present or `Template has the missing Property. Type = {title|creationDate|editDate}` (400, `errors.ts:175-182`).
- Server limits (max properties, label length, name length): none found.

**3. Row actions and bulk actions**

| Label | Enabled when | What it does | Cite |
|---|---|---|---|
| Property label button | always (common rows too) | opens the property panel with that row | `TemplateEditorTableComponents.tsx:22-47`, `TemplatesEditor.tsx:263-266` |
| `Edit` | always | same | `TemplateEditorTableComponents.tsx:58-64` |
| Drag handle (sr-only `Drag row`) | custom rows only | vertical drag with mouse, touch or keyboard sensors; order is the array order; dropping on or dragging a common row is ignored; dragging clears any column sort | `Table.tsx:210-243`, `DnDComponents.tsx:54-80` |
| Row checkbox | custom rows only | adds to selection; any change to the property list resets the selection | `Table.tsx:171-179` |
| `Add property` | nothing selected | opens the panel in new mode; submit appends `{...config, rowId}`; local until Save | `TemplatesEditor.tsx:230,338` |
| `Add thesaurus` | nothing selected | opens `AddThesaurusModal` | `TemplatesEditor.tsx:336` |
| `Add relationship type` | nothing selected | opens `AddRelationshipTypeModal` | `TemplatesEditor.tsx:337` |
| `Remove` | 1+ custom rows selected | removes them from local state, no confirmation; deleted on Save | `TemplatesEditor.tsx:259-261` |
| `Cancel` | always | link to `/settings/templates`, passes through the dirty guard | `TemplatesEditorFooter.tsx:50-54` |
| `Save` | pending changes and not saving | see part 6 | `TemplatesEditor.tsx:339` |

**4. Confirm dialogs and modals**

1. Discard changes (`ConfirmNavigationModal.tsx:15-39`, size `md`)
   - Trigger: in-app navigation blocked by the dirty guard.
   - Title `Discard changes?`; body `You have unsaved changes. Do you want to continue?`
   - Buttons in order: X close, `Cancel` (ghost), `Discard changes` (primary).
   - `Cancel` and X hide the modal (blocker is not reset, unverified at runtime). `Discard changes` hides it and calls `blocker.proceed`.
2. Lengthy reindex process (`TemplatesEditor.tsx:361-379`, `helpers.ts:70-75`, size `lg`, danger style)
   - Trigger: Save on an existing template when `entityCount > 3000`, on every save (`TemplatesEditor.tsx:61,244-249`).
   - Title `Lengthy reindex process`; body `The template has changed and the associated entities will be re-indexed, this process may take several minutes, do you want to continue?` (key `Template with a long number of entities`, `en.csv:1287-1288`).
   - Buttons in order: X close, `Cancel` (warm), `Continue` (danger).
   - `Continue` closes and runs `handleSave(true)` (skips only this modal); `Cancel`/X close.
3. Template conflict (`TemplatesEditor.tsx:380-403`, `helpers.ts:59-69`, size `lg`, danger style)
   - Trigger: Save returns HTTP 409 (Elasticsearch mapping error).
   - Title `Template conflict`; body `A reindex of your collection is necessary. The reason may vary -- from certain changes made to a template's property to new fields that need to be populated across entities. This process will not negatively affect the data in your collection. It can last a few minutes and some parts of your collection might take some time to reappear in the Library, but this is temporary. Do you want to continue?` (key `Mapping conflict error`, `en.csv:717-722`).
   - Buttons in order: X close, `Cancel` (warm), `Continue` (danger).
   - `Continue` closes and re-sends the template with `reindex: true`; `Cancel`/X close.
4. Add thesaurus (`AddThesaurusModal.tsx:64-103`, size `md`)
   - Trigger: footer `Add thesaurus`. Title `Add thesaurus`. Field label `Name`, placeholder `Thesaurus name`. Error `Thesaurus name already exists`.
   - Buttons in order: X close, `Cancel` (secondary), `Save` (success; disabled while saving or when the sanitised name is empty).
   - `Save`: duplicate check, case-insensitive, against loaded thesauri after `sanitizeThesaurusName`; on duplicate the error shows and the modal stays open (`:44-51`). Otherwise `POST /api/thesauris {name, values: []}`, appends to `thesauriAtom`, toast `Thesaurus created successfully.`; on failure toast `An error occurred` + detail through `handleUnexpectedError(error, 'Error creating thesaurus')`; the modal closes in `finally` in both cases (`:53-61`, `app/react/V2/shared/errorUtils.tsx:74-79`).
5. Add relationship type (`AddRelationshipTypeModal.tsx:43-78`, size `md`)
   - Trigger: footer `Add relationship type`. Title `Add relationship type`. Field label `Name`, placeholder `Relationship type name`. Error `Relationship type name already exists`.
   - Buttons in order: X close, `Cancel` (secondary), `Save` (success; disabled when trimmed name is empty or saving).
   - `Save`: duplicate (case-insensitive, trimmed) shows the error and keeps the modal open; success toast `Relationship type created successfully.` and closes; error toast `An error occurred` + detail and keeps the modal open (`:24-41`, `app/react/V2/services/useRelationshipTypeMutations.ts:19-39`).
6. Property panel: see part 1 (container) and property dialog brief.
7. Remove properties: no dialog (none found).

**5. Empty / loading / error / notification states**

- Empty property table: cannot occur; three common rows always exist.
- No entity-view pages: `There are no pages enabled for entity view` (`TemplateMetadata.tsx:74-78`).
- Loading: none found for the page; `Save` disabled while the request runs (`TemplatesEditor.tsx:252-256`).
- Processing: header progress bar (part 1). Socket `templateProcessing` updates `{completedJobs, totalJobs}`, emitted every 10th completed job (`TemplatesEditor.tsx:86-99`, `TemplateUpdateDenormalizeEntitiesBatch.ts:134-136` under `app/api/core/application/`). Socket `templateProcessed` revalidates and toasts. The page does not lock editing while processing; the server rejects updates (see part 6).
- Loader error: route error boundary (`createTemplatesEditorLoader.ts:31,42`).
- Notifications (`notify`), verbatim:
  - success `Template saved successfully.` (`TemplatesEditor.tsx:205`, `en.csv:1286`)
  - warning `Template changes are being applied to all related entities.` with details `Processing {entityCount} entities`, details omitted when `entityCount` is 0 (`TemplatesEditor.tsx:63-73`, `en.csv:1277,984,462`); fired after Save when the response has `processing.active`, and again each time the loader returns a template with `processing.active` (`TemplatesEditor.tsx:119-124`)
  - error title `Error saving template.` with details `error.detail ?? error.message` (`TemplatesEditor.tsx:188-193`, `en.csv:480`); same title with no details when the response has no template (`:197-200`)
  - success `Template processing completed.` on socket `templateProcessed` (`TemplatesEditor.tsx:76-84`, `en.csv:1285`)
  - from Add thesaurus: `Thesaurus created successfully.`; from Add relationship type: `Relationship type created successfully.`; both errors `An error occurred` + detail
- Server error texts that appear as toast details (status in brackets):
  - `Template has the missing Property. Type = {type}` (400, `errors.ts:175-182`)
  - `Properties can not be deleted because are being inherited: [properties={names}]` where `{names}` is the property names joined by `,` (400, `errors.ts:112-118`, `handleError.js:142-144`)
  - `template is being processed you can not update it yet` inside a `Validation error` message with the JSON `{"path":"processing", ...}` (422, `Template.ts:255-261`, `app/api/common.v2/validation/ValidationError.ts:6-12`; exact toast text unverified)
  - `Properties cannot swap names` (422, `Template.ts:144`)
  - `The following Template has a used Name on the system. Name = {name}` (400, create only, `errors.ts:166-173`)
  - `The selected page does not exist`, `The selected page is not enabled for entity view` (422, create only, `LegacyPageService.ts:28,42`)
  - the per-type property errors belong to the property dialog brief

**6. Save**

1. Click `Save`. Disabled unless `!isEqual({...loadedTemplate, processing: undefined}, {...current, processing: undefined})` and not saving (`TemplatesEditor.tsx:137-145,339`).
2. Client validation (`TemplatesEditor.tsx:233-242`): name must be non-empty and not equal, case-insensitively, to another template in `templatesAtom`. Failure sets the name error state and stops; no toast.
3. Existing template and `entityCount > 3000`: open `Lengthy reindex process` and stop until `Continue` (`TemplatesEditor.tsx:244-249`).
4. Build the body: loaded template with current name, colour, `entityViewPage`, cleaned common rows then cleaned custom rows (internal `rowId`, `disableRowDnD`, `disableRowSelection` removed), plus `reindex: true` when forced (`TemplatesEditor.tsx:126-135,174-179`, `helpers.ts:92-95`).
5. `POST /api/templates` (`app/react/V2/api/templates/index.ts:40-57`), admin only (`routes.ts:13`). No `_id`: create. With `_id`: update (`TemplateMutationController.ts:14-18`). `default`, `processing`, `__v` are stripped first (`TemplateFacade.ts:34-38,59-61` under `app/api/core/infrastructure/facades/`).
6. Create (`CreateTemplate.ts:28-72`): derive common and custom properties (property `name` is derived from the label), exact-name uniqueness check (59-62), entity-view page check (64), then in one transaction insert the template and create its translation context (keys: template name, title label, every custom label, context type `Entity`). No mapping update, no jobs, `isDefault` false.
7. Update (`UpdateTemplate.ts:37-106`), in order:
   1. build properties; `Template.update` rejects while `processing.active` and on swapped names (64, `Template.ts:255-261`)
   2. diff old and new; deleted properties are those whose id is missing in the new list (`TemplateDiff.ts:45-51`)
   3. refuse if any deleted property is inherited by another template's property (67-72, `MongoTemplatesDataSource.ts:173-194`)
   4. one transaction: write the template, update the translation context (rename keys, delete keys of removed properties), update the search mapping, full reset when `reindex` is true (75-81, `Template.ts:255-261` and `:144` for the rejections)
   5. emit `TemplateUpdatedEvent`: renames the entry in `settings.filters` if the name changed (top level only, `ReconcileFiltersOnTemplateChange.ts:42-49`)
   6. create background jobs for entities, batches of 50, when a property was added as relationship or generated ID, renamed or deleted, or a `filter` flag changed (`UpdateTemplate.ts:99-103`, `TemplatePostProcessService.ts:33` and `TemplateDiff.ts:120-128` (post-process condition), the last under `app/api/core/domain/template/`); jobs rename or delete the metadata of renamed or deleted properties on every entity (data loss, no confirmation) and rebuild denormalised relationship values and generated IDs
8. Server emits socket `templateChange` with the saved template (`TemplateMutationController.ts:20`); `templatesAtom` updates (`sockets.js:62-71`).
9. Server errors: Elasticsearch mapping error becomes HTTP 409 `mapping conflict: ...` (`TemplateMutationController.ts:23-25`).
10. Client after the response (`TemplatesEditor.tsx:181-213`):
    - status 409: open `Template conflict`, stop
    - other error: toast `Error saving template.` + detail, stop
    - `processing.active` in the response: warning toast; otherwise success toast `Template saved successfully.`
    - existing template: `revalidator.revalidate()`, stays on the page, form state rebuilt from the loader (new `rowId`s)
    - new template: `navigate('/settings/templates/edit/{id}', { replace: true })`
11. Later, over the socket: progress updates, then `Template processing completed.` with a revalidate.
12. Activity log: `Created template` for every `POST /api/templates`, create and update alike, named by `name`, id from `_id` (`activitylogParser.ts:68-73`). Nothing else is logged for the editor.

**7. Dirty guard**

- Condition: `useBlocker` blocks any navigation whose target path does not contain `templates/edit` while the current state differs from the loaded template, ignoring `processing` (`TemplatesEditor.tsx:137-150`). Compared: name, colour, entity view page, common rows, custom rows and their order.
- Modal: `Discard changes?` / `You have unsaved changes. Do you want to continue?` / `Cancel`, `Discard changes` (part 4, item 1).
- Exceptions: any target containing `templates/edit` (so edit-to-edit and the redirect after creating a new template are not blocked); no `beforeunload` handler, so reload or tab close loses changes silently (none found in `Templates/`); panel and Add modals have no guard of their own, closing them discards their inputs; `revalidate()` after Save is not a navigation.

**8. Sort, filter, search, pagination**

- Property table: no sort (all columns unsortable), no filter, no search, no pagination (none found). Order is the array order, changed only by drag (`Table.tsx:210-237`). Common rows always first.
- Select for entity view page: static list from the loader, no search.
- Colour popover: scrolls (`max-h-44`) when options overflow (`ColorPicker.tsx:109`).

**9. Propagation**

- `templatesAtom` after save: every consumer (pills, chips, entity editor, Copy From, Dataviz pickers) shows the new name, colour and properties (`sockets.js:62-71`).
- Settings > Filters: template rename updates the filter entry, top level only (`ReconcileFiltersOnTemplateChange.ts:42-49`).
- Settings > Translations: create makes the template's context (`CreateTemplate.ts:66-70`); update renames or removes keys for renamed or removed properties and the template name (`UpdateTemplate.ts:76-79`).
- Entities: renamed or deleted properties change or drop values on every entity of the template in a background job; the Title `Generated ID` flag makes new entity titles auto-generated (`app/react/Metadata/actions/actions.js:95-102`).
- Library facets and cards read the `filter`, `defaultfilter`, `showInCard`, `prioritySorting` flags (see inventory Part 0.2; not re-verified here).
- Add thesaurus appends to `thesauriAtom` (Thesauri page, property dialog picker) (`AddThesaurusModal.tsx:39`); Add relationship type appends to `relationshipTypesAtom` (Relationship types page, property dialog picker) (`useRelationshipTypeMutations.ts:35`).

**10. Improvements to layer on**

- UX1, gap row "Property search": search above the property table (templates with many properties).
- UX2, gap row "Multi-select and bulk remove": selection bar with fixed count slot and `BAR_DANGER` Remove.
- UX4 and UX5, gap rows "Remove properties" and "Inherited property guard": remove from the draft with undo in the Beacon; at Save show "N entities lose this value" and, for inherited properties, name the inheriting templates and properties before Save instead of a server error.
- UX7, gap row "Property to card link": hovering or focusing a property row highlights its place on the card preview; fix the title/label overlap.
- UX9, gap row "Reorder": drag plus up/down buttons.
- UX11, gap row "Last saved": `Saved 2 min ago by admin` in the editor footer, from the activity log.
- UX12, gap row "Phone": property rows with name, type badge and flag icons; property panel as a sheet; fix the property-name column collapsing at 390px.
- Design finding "Add property belongs above the table" (gap row "Add property"): move `Add property` into the table header zone; footer keeps Cancel and Save.
- Design shared editor pattern (gap rows "Dirty guard", "Cancel", "After save"): guard Back, Cancel, rail, navbar and corpus switch including edit-to-edit; Save writes back and returns to the list with the row highlighted; `BAR_GHOST` Cancel.
- Gap row "Template name": message for the empty case as well (`Template name is required`), trim, whitespace-only counts as empty.
- Gap row "Common property rows" and "Date added / modified": three locked rows on top; date labels read-only.
- Gap row "Unknown template id": show `Template not found` and return to the list.
- Gap rows "Reindex confirm" and "Processing state": drop; optional Beacon task after a property delete or rename.
- Gap row "Entity view page": defer until Pages carry an entity-view flag.
- Gap row "Colour": keep the prototype palette; colour must reach Library type dot, cards and facets.
- Gap row "Rename effects": filters hold template ids so groups update too.
- Gap row "Save": dirty compares with the stored value and clears after save; unchanged panel Save does not mark dirty.

**11. Uwazi defects NOT to copy**

- Name check is case-insensitive on the client, case-sensitive on the server, and update never checks: one rule, case-insensitive, on create and update (`TemplatesEditor.tsx:234-238`, `MongoTemplatesDAO.ts:166-175`, `UpdateTemplate.ts`).
- Empty name shows a red field with no text (`TemplateMetadata.tsx:69-71`): show a message.
- No trim on name or label; whitespace-only passes the client (`LabelField.tsx:38`, `TemplatesEditor.tsx:239`): trim and reject.
- Unknown `:templateId` becomes a new template and Save creates it (`createTemplatesEditorLoader.ts:35-45`): show not found.
- Dirty guard skips edit-to-edit and has no `beforeunload` (`TemplatesEditor.tsx:149`): guard every exit available in the prototype.
- Removing a property gives no impact warning, though Save deletes its values on every entity (`TemplatesEditor.tsx:259-261`): show the count at Save.
- Inherited-property deletion is caught only by the server, with names but no template (`UpdateTemplate.ts:67-72`): block in the UI and name the template.
- Status code of that error is 400 in code, so any client mapping it as 422 is wrong (`handleError.js:142-144`).
- Entity view page is validated on create only (`CreateTemplate.ts:64`): validate on update too, or keep a single rule.
- Reindex modal asks on every save above 3000 entities even for a colour change (`TemplatesEditor.tsx:244-249`): drop (no index in the prototype).
- Editing is not locked while processing; the server then rejects with a raw validation message (`Template.ts:255-261`): disable Save with a reason if a processing state is modelled.
- The processing warning toast can fire twice, once from Save and once from the loader effect (`TemplatesEditor.tsx:119-124,202-203`) (unverified at runtime): notify once.
- The `Cancel` or X on `Discard changes?` leaves the blocker state untouched (`ConfirmNavigationModal.tsx:20,26`) (unverified at runtime): reset the guard on cancel.
- Activity log writes `Created template` for updates (`activitylogParser.ts:68-73`): log `Created template` and `Updated template` separately.
- Add thesaurus modal closes on a server error and drops the typed name (`AddThesaurusModal.tsx:56-61`); the relationship type modal keeps it open on error: keep the modal open on error in both.
- Colour input accepts typing but silently ignores invalid hex with no cue (`ColorPicker.tsx:53-58`): show an invalid state.
- Panel title strings `New property` / `Edit property` and the `Select page` option are not in `en.csv`, so they never translate (`ConfigPropertyPanel.tsx:211`, `TemplateMetadata.tsx:91`): add keys.
- Common-property DTO strips `noLabel`, `required`, `showInCard`, so those can never persist for common rows (`TemplateDTOs.ts:54-62`): model only the options the panel offers (Label, Priority sorting, Generated ID).
