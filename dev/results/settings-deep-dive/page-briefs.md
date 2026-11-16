# Settings page briefs: what Code needs to match Uwazi 1:1

Read only. Research, 2026-10-04. Reference: `huridocs/uwazi` `production` v1.229.224 at `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All cites are `uwazi-ref` repo-relative `path:line`. Strings are copied from the code or from `contents/ui-translations/en.csv`; `(unverified)` marks anything not confirmed in code.

Companion files in this folder: `uwazi-settings-inventory.md` (behaviour), `gap-matrix.md` (row-level gaps and the build order), `settings-ux-audit.md` (UX1 to UX12), `template-schema-spec.md` (template as schema), `prototype-settings-state.md`.

## How to use a brief

Each page section has the same eleven parts: screen map, fields, row and bulk actions, dialogs, empty/loading/error states, save sequence, dirty guard, sort/filter/search, propagation, improvements to layer on, and Uwazi defects not to copy. Build the 1:1 behaviour first (parts 1 to 9), then layer the improvements (part 10), then check the list in part 11 so a Uwazi defect is not copied. A "UX<n>" tag is a Design improvement from `settings-ux-audit.md` (1 search, 2 bulk selection, 3 CSV import/export, 4 impact before delete, 5 undo in the Beacon, 6 thesaurus tree, 7 property-to-card link, 8 untranslated-only, 9 keyboard reorder, 10 rail grouping, 11 last-saved line, 12 phone rows and sheets).

Already decided elsewhere and not repeated per page: settings stores per corpus for content and global for people (CLAUDE.md "Settings stores"); the template property list is the schema the entity form renders (Juan, `template-schema-spec.md`); the commit button is solid ink and the lead action is `BAR_LEAD` (see decision 2).

## Decisions

Resolving the 15 open questions in `gap-matrix.md` and the 5 in `template-schema-spec.md`. Operator adopts these unless Juan overrides. A recommendation is the answer to the question as asked.

### From gap-matrix.md

| # | Question | Recommendation | Reason |
|---|---|---|---|
| G1 | Does a template's property list become the entity form's schema? | Yes (already Juan's call). Build in the `template-schema-spec.md` order M1 to M9; the Settings editor is M8 | One vocabulary (Uwazi's types) removes B6 and makes every Template editor row buildable |
| G2 | Commit colour; rail active state; rail scope | Commit in ink (`COMMIT_FILL`), green nowhere; rail active `bg-warm text-ink`; all rail groups visible | Matches `Modal`, Figma's Dialog and CLAUDE.md ("Active sidebar item: `bg-warm text-ink`"); one rail removes the trip back to the navbar |
| G3 | Per-corpus or global store per settings domain | Content per corpus (templates, thesauri, relation types, filters, menu, pages, translations, languages); people global (users, groups, account) | Already written in CLAUDE.md "Settings stores" |
| G4 | Account API keys and self-disable of 2FA | Keep API keys as a prototype-only block (full key shown once, confirm on Revoke, real clipboard copy); drop the self-disable 2FA button | Keys are built and cheap; Uwazi has neither, so mark keys prototype-only in the handoff. Uwazi 2FA is turned off only by an admin reset |
| G5 | Relationship type inverse name | Drop it from Settings | Uwazi v2 stores one `type`; CLAUDE.md lists "no inverse relationship-type labels" as a known gap; nothing reads it |
| G6 | Delete a relationship type that references use | Settings refuses with the count (Uwazi); the Relationships panel's "Manage relationship types" modal keeps "reassign to no_label" and says so in its confirm | Settings matches Uwazi; the panel modal already exists and is the explicit migration path. Both go through the one registry |
| G7 | CSV import/export for thesauri and translations | Thesaurus value import: yes (Uwazi has it). Translations CSV: defer | Uwazi's Translations page has no import or export; only Reset (System context) |
| G8 | Do installed languages and Translations edits change the live language pickers and `t()` strings | No. Settings drives the language list and the Translations grid only | The header picker is tied to the four renditions (Review B7); revisit when UI strings come from the store |
| G9 | Preserve capture-sources list | Drop; token card only | Not in Uwazi; sources open blank today (QA). Preserve is not a demo page |
| G10 | Where custom CSS applies | Pages preview and public preview only; JS stored, never run; never injected into the admin shell | Injecting into the admin shell can break the app being demonstrated |
| G11 | Menu save model | One footer Save for the whole tree (Uwazi), with a dirty guard | Matches Uwazi and the shared editor pattern |
| G12 | Extractors: what Accept does; Reject, segmentation, min characters | Accept writes the entity overlay; drop Reject, segmentation and min-characters fields; replace "Accept all" with "Accept selected" | Not in Uwazi (its only accept-all is the Process modal's auto-accept); not a demo page |
| G13 | Filters Properties table | Keep as a read view over the template `filter` / `defaultfilter` flags; drop the empty Group column | One source of truth: the template flags |
| G14 | Data visualizations; New Relationships Migration | Defer Data visualizations (21 rows, 5 L); drop the migration page | Neither is a demo page; the migration page is a one-off admin tool behind a feature flag |
| G15 | Mock the current-password modal | Yes, on user create/edit, password change and bulk user actions | It is Uwazi's real flow (`Authorization: Basic`, 403 "Password error") |

### From template-schema-spec.md (section 9)

| # | Question | Recommendation | Reason |
|---|---|---|---|
| S1 | CEJIL flags: re-import from the dump, or keep heuristics | Keep the heuristic flags now; re-import when the dump is available | M3a should not wait; the flags are data, so replacing them later does not change code |
| S2 | Sample `bench` | Markdown text now | Seven judge entities do not exist; converting to a relationship later is a data change |
| S3 | Sample `country` on `e3` | Select bound to a new Countries thesaurus | Keeps the flag and needs no connections (the spec's recommendation) |
| S4 | Rename keeps the property `name` | Accept the divergence: the `name` stays stable on rename | Stable names keep entity values valid; Uwazi re-derives the name and migrates values in a job, which the prototype does not have |
| S5 | Template labels per language | Out of scope for the template store: English labels in the seed; per-language labels belong to Translations (L2) | Keeps the template model single-language until Translations exists |


## Corrections to earlier research found while writing the briefs

- Add thesaurus and Add relationship type are buttons in the Template editor page footer, not inside the property panel (`TemplatesEditorFooter.tsx:31-36`, `TemplatesEditor.tsx:336-349`). The gap-matrix row "create inline from the property dialog" does not match Uwazi; the property panel only lists existing thesauri and relationship types.
- Templates bulk delete runs every DELETE in parallel and reports the first failure in input order; earlier successes stay deleted (`HttpTemplatesService.ts:14-21`). The inventory said it aborts on the first error.
- Both template confirm modals list `Cancel` before `Continue` or the accept button (the inventory had them reversed).
- Uwazi's Global CSS & JS page has no warning line. The cascading-styles warning in the prototype is prototype-only; keep it (Design) and mark it so.
- `newNameGeneration` runs inside the settings save request and is awaited, not a queued job (`SaveSettings.ts:28-33`). Only the settings broadcast is a job.
- Collection: Map layers cannot be emptied in the UI (the last checked layer is disabled), so its error never shows; Google and Matomo analytics load only when the cookie policy is on and consent is accepted.
- Relationship types: the third refusal, "Cannot delete type being used in relationship queries", cannot fire (the check iterates an empty list).
- Languages: the install and uninstall error socket events have listeners but no emitter, so a failed job never shows an error.
- Thesauri: delete and save failures notify twice (API policy plus the component); the editor's "Selected N of M" can show N larger than M because M counts root rows only; there is no help text for the CSV format, no file type or size limit and no specific error for a non-CSV or empty file.

## Page briefs

The sections below are in demo order: Templates (list and editor), the property dialog, Thesauri, Users & Groups with Account, Collection with Global CSS, Filters, Relationship types, Languages, Translations.

---

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


---

### Template property dialog (per type)

Source: `huridocs/uwazi` `production` v1.229.224 (`uwazi-ref`). Every citation is a repo-relative `path:line`, shortened with the keys below. Strings in code quotes are copied from code. "EN" = `contents/ui-translations/en.csv`. (unverified) = derived from reading code, not run.

Path keys:
- `CPP` = `app/react/V2/Routes/Settings/Templates/components/ConfigPropertyPanel.tsx`
- `F/` = `app/react/V2/Routes/Settings/Templates/components/fields/`
- `MPT` = `app/react/V2/Routes/Settings/Templates/components/MatchingPropertiesTable.tsx`
- `ATM` = `app/react/V2/Routes/Settings/Templates/components/AddThesaurusModal.tsx`
- `ARM` = `app/react/V2/Routes/Settings/Templates/components/AddRelationshipTypeModal.tsx`
- `TEF` = `app/react/V2/Routes/Settings/Templates/components/TemplatesEditorFooter.tsx`
- `TE` = `app/react/V2/Routes/Settings/Templates/TemplatesEditor.tsx`
- `HLP` = `app/react/V2/Routes/Settings/Templates/helpers.ts`
- `SP` = `app/react/V2/Components/UI/Sidepanel.tsx`
- `MOD` = `app/react/V2/Components/UI/Modal.tsx`
- `SEL` = `app/react/V2/Components/Forms/Select.tsx`
- `ERR` = `app/api/core/domain/template/errors.ts`
- `DTO` = `app/api/core/application/TemplateDTOs.ts`
- `DOM/` = `app/api/core/domain/template/`
- `HE` = `app/api/utils/handleError.js`
- `RTM` = `app/react/V2/services/useRelationshipTypeMutations.ts`

Scope facts that change how to build it:
- The panel edits a local draft. Nothing is sent until the editor page's Save (`TE:218-232`, `TE:339`).
- Add thesaurus and Add relationship type do NOT open from inside the panel. They are footer buttons of the editor page (`TEF:31-36`, `TE:336-337`, `TE:346-349`). The panel has no "create new" control. (The gap-matrix row "Create inline from the template property dialog" does not match Uwazi.)
- The form has no name, id or description field. The server derives the property `name` from the label.

---

#### 1. Panel chrome

| Item | Behaviour | Cite |
|---|---|---|
| Container | Right `Sidepanel`, `withOverlay`, `size="large"`: 600px at md, 40% width at lg, full width below md. Slides in from the right (left in RTL). | `CPP:205-208`, `SP:80-84` |
| Title, new | `New property` (rendered uppercase by CSS class `uppercase`: "NEW PROPERTY") | `CPP:210-212` |
| Title, edit | `Edit property` (rendered "EDIT PROPERTY") | `CPP:211` |
| Title translation | Neither string exists in EN (they fall back to the key). | EN (searched, absent) |
| Close control | X button, `data-testid="close-sidepanel"`, sr-only text `Close` | `SP:37-47`, EN:220 |
| Body | `Sidepanel.Body` (`grow p-4`): form fields, then the same-label block (not for common properties) | `CPP:219-297` |
| Footer buttons, in order | 1. `Cancel` (secondary, `type="button"`, calls `onClose`). 2. Submit: `Add property` when new, `Save` when editing (variant `success` = green). | `CPP:298-305` |
| Footer layout | `flex justify-end gap-2 p-4 border-t` | `CPP:298` |
| Submit disabled | `disabled={!validateMatchingProperties()}`: true when a same-label property in another template is incompatible (section 6). No other disable rule: an empty label is caught on submit, not by disabling. | `CPP:302`, `CPP:153-191` |
| Submit action | RHF `handleSubmit(submitForm)`. Blocks if `errors` is non-empty or matching check fails; otherwise `onSubmit(data)` then `onClose()`. Enter inside an input submits (the footer is inside the `<form>`). | `CPP:193-202`, `CPP:218` |
| After submit | New: appended to the draft property list with a new `rowId`. Edit: merged over the row. Edit of a common property goes to the common list. | `TE:215-231` |
| Opens | `Add property` footer button (`TE:338`), or the row's property-label button or `Edit` button (`TE:263-266`, `app/react/V2/Routes/Settings/Templates/components/TemplateEditorTableComponents.tsx:22-64,57-62`). Common-property rows open it too (label button, lock icon). | |
| Closes | Cancel, X, overlay click, Escape. All discard the panel's edits silently. No dirty confirmation. On close the page clears `propertyToEdit`; the form resets to the empty property whenever `isOpen` becomes false. | `CPP:139-143`, `TE:354-357`, `SP:116-127,159-164,226` |
| Overlay | Full-width fixed layer under the page header, `bg` overlay colour; click closes. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` title. | `SP:209-246` |
| Focus | On open: focus first focusable element. Tab and Shift+Tab are trapped inside the panel. On close: focus returns to the element that was focused before. | `SP:93-114,166-195` |
| Type select vs box | New: type `Select`. Edit: read-only box (section 2). | `CPP:222-243` |

---

#### 2. Property type select

New property only. Control: `Select` id `property-type`, label `Property type` + `*` (required), rules `{ required: true }`. No placeholder. Default `text`. Cites: `F/PropertyTypeField.tsx:16-33,41-58`, label EN:1008.

| # | Label (verbatim, value) | Conditional |
|---|---|---|
| 1 | `Text` (`text`) | |
| 2 | `Rich text` (`markdown`) | |
| 3 | `Numeric` (`numeric`) | |
| 4 | `Date` (`date`) | |
| 5 | `Multiple dates` (`multidate`) | |
| 6 | `Date range` (`daterange`) | |
| 7 | `Multiple date ranges` (`multidaterange`) | |
| 8 | `Select` (`select`) | |
| 9 | `Multiple select` (`multiselect`) | |
| 10 | `Relationship` (`relationship`) | |
| 11 | `Link` (`link`) | |
| 12 | `Image` (`image`) | |
| 13 | `Preview` (`preview`) | |
| 14 | `Media` (`media`) | |
| 15 | `Geolocation` (`geolocation`) | |
| 16 | `Generated ID` (`generatedid`) | |
| 17 | `Violated articles` (`nested`) | Only when `settings.project === 'cejil'` (`F/PropertyTypeField.tsx:36-38`). Server refuses it otherwise (section 9). |

Notes:
- Option labels are raw English strings, not passed through translation (`F/PropertyTypeField.tsx:16-33`, rendered by `SEL:83-89`).
- Order is fixed, not sorted.
- Read-only box on edit: caption `Type` (EN:1419), then the type icon and `t('System', translationsKeys[type] || type)` (`CPP:222-240`). Those labels come from the keys in `HLP:39-57`, whose EN values differ from the select labels:
  - `property markdown` = `Rich text` (EN:998)
  - `property multidate` = `Multiple date` (EN:1000) vs select `Multiple dates`
  - `property multidaterange` = `Multiple date range` (EN:1001) vs select `Multiple date ranges`
  - `property nested` has no EN entry (the key text would show)
- Changing the type of a saved property is impossible in the UI; the server also refuses it (`ERR:287`).

---

#### 3. Field-by-type matrix

Legend: Y = shown. Blank = not shown. Order on screen is in section 4. "Fixed" columns apply to every non-common type.

Conditions from `CPP`: image/preview/media = `fullWidthTypes` (`CPP:72`); filterable list = `filterableTypes` (`CPP:56-69`); priority list = `prioritySortingTypes` (`CPP:71`); non-common (`!isCommonProperty`) gates Hide label, Required, Show in cards, Use as filter and the same-label block (`CPP:258-261,278`).

| Type | Label | Style | Full width | Thesaurus | Relationship type | Entities | Inherit property | Hide label | Required property | Show in cards | Use as filter | Default filter (needs filter on) | Priority sorting (needs filter on) | Same-label table (extra columns) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| text | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| markdown | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| numeric | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| date | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| multidate | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| daterange | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| multidaterange | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| select | Y | | | Y | | | | Y | Y | Y | Y | Y | Y | + Thesauri |
| multiselect | Y | | | Y | | | | Y | Y | Y | Y | Y | | + Thesauri |
| relationship | Y | | | | Y | Y | Y (only when an entity template is picked) | Y | Y | Y | Y | Y | | + Relation type, Entities, Inherit type |
| link | Y | | | | | | | Y | Y | Y | | | | Template, Type |
| image | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| preview | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| media | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| geolocation | Y | | | | | | | Y | Y | Y | | | | Template, Type |
| generatedid | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| nested (cejil) | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |

Cites by column: Style `CPP:250`; Full width `CPP:257`; Thesaurus `CPP:252`; Relationship type, Entities `CPP:253-255`; Inherit property `F/RelationshipFields.tsx:121`; Hide label `CPP:258`; Required `CPP:259`; Show in cards `CPP:260`; Use as filter `CPP:261-263`; Default filter `CPP:264-266`; Priority sorting `CPP:267-269`; same-label block `CPP:278-295`; extra columns `MPT:201-233`.

Common properties (edit only; they have no Add path):

| Common property | Type box | Label | Hide label / Required / Show in cards / Use as filter / Default filter | Priority sorting | Generated ID | Same-label block |
|---|---|---|---|---|---|---|
| Title (`name` `title`, type `text`) | Y | Y, editable | not shown | Y, always | Y | not shown |
| Date added (`creationDate`, type `date`) | Y | Y, but `disabled` | not shown | Y, always | | not shown |
| Date modified (`editDate`, type `date`) | Y | Y, but `disabled` | not shown | Y, always | | not shown |

Cites: `CPP:119-120,258-261,274-275,278`, label disabled `F/LabelField.tsx:28`, default labels `HLP:8-27` (`Title`, `Date added`, `Date modified`).

Server persists (not UI-visible): Filterable classes store `filter`, `defaultfilter`, `prioritySorting` (`DOM/FilterableProperty.ts:19-21`); link, geolocation, image, preview, media do not extend it (`DOM/LinkProperty.ts:29`, `DOM/GeoLocationProperty.ts:28`, `DOM/AbstractImageProperty.ts:14`). Image, preview, media store `style` and `fullWidth` (`DOM/AbstractImageProperty.ts:21-22`). Text also stores `generatedId` (`DOM/TextProperty.ts:24-28`), no UI for it on custom text properties.

---

#### 4. Every field, in on-screen order

Order (non-common): Property type (or Type box) / Label / Style / Thesaurus or Relationship fields / checkbox group (Full width, Hide label, Required property, Show in cards, Use as filter, Default filter, Priority sorting) / same-label heading and table (`CPP:221-295`).

Default (new) = value in `emptyProperty` (`CPP:39-54`): `type 'text'`, `label 'Text'`, every boolean `false`, `style 'cover'`, `content/relationType/inherit undefined`.

| # | Label (verbatim) | Control | Placeholder | Help / tooltip (verbatim) | Default (new) | When shown | Validation and message | Cite |
|---|---|---|---|---|---|---|---|---|
| 1 | `Property type` + `*` | Select `property-type` | none | none | `text` | New only | `required` (no message shown) | `F/PropertyTypeField.tsx:41-58`, `CPP:241-243` |
| 1b | `Type` (caption) | Read-only box: icon + type name | n/a | none | n/a | Edit only | n/a | `CPP:222-240` |
| 2 | `Label` + `*` | `InputField` `property-label`, text | `Text` | none | `Text`, then the capitalised type key after a type pick (section 5) | Always. `disabled` for the common date properties. | Client: `required` -> `This field is required`; `duplicateLabel` -> `This label already exists in this template`. Shown under the input as red text. Server: none on label content (section 9). | `F/LabelField.tsx:18-52`, EN:644,1341,1353 |
| 3 | `Style` (legend) | Radio group, horizontal: `Fill` (`cover`), `Fit` (`contain`) | n/a | `Fill` tooltip: `Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur.` `Fit` tooltip: `Will show the entire media inside the container.` | `Fill` (`cover`) | image, preview, media | Server: only `cover`/`contain` | `F/StyleField.tsx:13-60`, EN:1242,521,537,1520,1522 |
| 4 | `Thesaurus` + `*` | Select `property-thesaurus` | first option `Select...` (value empty) | none | empty | select, multiselect | Client: `required: true`, no message rendered. Server: section 9. | `F/ThesaurusField.tsx:40-58`, EN:1323,1166 |
| 5 | `Relationship type` + `*` | Select `property-relation-type` | first option `Select...` | none | empty (`setValue('relationType','')` on type pick) | relationship | Client: `required: true`, no message rendered. Server: section 9. | `F/RelationshipFields.tsx:82-100`, `CPP:129-132`, EN:1051 |
| 6 | `Entities` | Select `property-entity` | first option `Any entity` (empty value) | none | empty = `Any entity` | relationship | `required: false` | `F/RelationshipFields.tsx:102-119`, EN:461,121 |
| 7 | `Inherit property` | Select `property-inherit` | first option `Select...` | none | none | relationship and an entity template is selected | none client; server section 9 | `F/RelationshipFields.tsx:121-144`, EN:619 |
| 8 | `Full width` | Checkbox `fullWidth` | n/a | `This property will be shown using all the width available.` | off | image, preview, media | none | `F/FullWidthField.tsx:13-33`, EN:550,1360 |
| 9 | `Hide label` | Checkbox `noLabel` | n/a | `This property will be shown without the label` | off | non-common, all types | none | `F/HideLabelField.tsx:13-27`, EN:581,1361 |
| 10 | `Required property` | Checkbox `required` | n/a | `You won't be able to save an entity if this property is empty.` | off | non-common, all types | none (enforced when entities are saved) | `F/RequiredField.tsx:13-32`, EN:1078,1540 |
| 11 | `Show in cards` | Checkbox `showInCard` | n/a | `This property will appear in the library cards as part of the basic info.` | off | non-common, all types | none | `F/ShowInCardsField.tsx:13-33`, EN:1198,1359 |
| 12 | `Use as filter` | Checkbox `filter` | n/a | `This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering.` (tooltip `max-w-xs`) | off | non-common and type in the filterable list | none. Unchecking forces Default filter and Priority sorting to off (`CPP:145-150`). | `F/FilterField.tsx:13-33`, EN:1464,1363 |
| 13 | `Default filter` | Checkbox `defaultfilter` | n/a | `This property will be the default filter in the library for this template.` | off | `filter` checked | none | `F/DefaultFilterField.tsx:13-33`, EN:360,1362 |
| 14 | `Priority sorting` | Checkbox `prioritySorting` | n/a | `Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting.` (tooltip `max-w-xs`) | off | Custom: `filter` checked and type text, numeric, select or date. Common: always. | none | `F/PrioritySortingField.tsx:13-34`, `CPP:267-269,274`, EN:975,989 |
| 15 | `Generated ID` | Checkbox `generatedId` | n/a | `A generated ID will be the default title.` | off | Title common property only | none | `F/GeneratedIdField.tsx:13-28`, `CPP:275`, EN:554,13 |
| 16 | Heading `Properties from other templates in the collection using the same label.` then table | Read-only `Table` | n/a | none | n/a | Non-common | Section 6 | `CPP:278-295`, EN:988 |

Notes:
- The tooltip icon is a 20px question-mark circle after each checkbox label, placement `right` (`F/*.tsx` label blocks). Hover trigger (Flowbite default); keyboard behaviour (unverified).
- The checkboxes sit in one column, `gap-2`, under a `mt-2` block (`CPP:256`).
- Type-dependent unchecking: while `filter` is false and the property is not common, `defaultfilter` and `prioritySorting` are forced to false on every change (`CPP:145-150`).
- Relationship `content` ids, `relationType` ids and `inherit.property` ids are database ids; `inherit` is stored as `{property, type}` where `type` is the target property's type (`F/RelationshipFields.tsx:131-139`).

---

#### 5. Label rules

| Rule | Detail | Cite |
|---|---|---|
| Initial label | Panel opens a new property as `Text` | `CPP:41,100` |
| Label on type pick (new only) | Form is reset to the empty property and the label becomes the raw type key with the first letter capitalised: `Text`, `Markdown`, `Numeric`, `Date`, `Multidate`, `Daterange`, `Multidaterange`, `Select`, `Multiselect`, `Relationship`, `Link`, `Image`, `Preview`, `Media`, `Geolocation`, `Generatedid`, `Nested`. Everything typed or ticked is lost on each type change. | `CPP:126-137` |
| Required | `Boolean(value)`; a whitespace-only value passes. Message `This field is required`. | `F/LabelField.tsx:38` |
| Unique in template | Case-insensitive, trimmed, against this template's custom properties in the draft, excluding the property being edited (`_id` compare). Common property labels (`Title`, `Date added`, `Date modified`) are not compared. Message `This label already exists in this template`. | `F/LabelField.tsx:39-49`, `CPP:244-249` (template passed with draft `properties`: `TE:358`) |
| When errors show | On submit only (RHF default mode). | `CPP:218` |
| Stored value | Not trimmed. | `F/LabelField.tsx:36-51` |
| Disabled | Label of Date added and Date modified. | `F/LabelField.tsx:28` |
| Name derivation | The panel sends no `name`. The server strips unknown keys and derives `name` from the label on every save: `PropertyName.fromLabel(label)` -> `safeName`. Default: `label.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()`, so `Date of birth` -> `date_of_birth` and every non-ASCII letter becomes `_`. | `DOM/PropertyName.ts:11-13`, `DOM/utils/propertyNameGeneration.ts:8-16`, `DTO:24-52` (no `name` key), `DOM/Property.ts:62-64` |
| Name derivation, when the collection setting "Non-latin characters support" is on (`newNameGeneration`) | `generateNewSafeName`: trim, replace `# \ / | * ? " < > = whitespace : . [ ] % ! - & ^ + ( ) { } ~` with `_`, drop one leading ` `, `_`, `-`, `+` or `$`, lowercase. | `DOM/utils/propertyNameGeneration.ts:1-6`, `app/api/core/application/CreateTemplate.ts:34`, `app/api/core/application/settings/saveSettingsInput.ts:204`, EN:866 |
| Rename effect | A changed label changes the derived `name`; the server records `name` and `label` as updated attributes. | `DOM/Property.ts:115-116` |
| Reserved names | No list. The three common names (`title`, `creationDate`, `editDate`) must exist; a custom property whose derived name equals `title` fails with `TemplateWithDuplicatedPropertyError`. `creationDate` and `editDate` cannot be produced because derived names are lower-case. | `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:9-17`, `DOM/templateValidator/TemplateWithMissingCommonPropertyValidator.ts:6` |
| Label vs name collision | Two labels that derive the same name (for example `Año` and `A?o`, or `a-b` and `a b`) pass the client check and fail on Save. | `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:11-17` |
| Labels are shared across templates on purpose | Same label across templates is allowed if types and pickers agree (section 6); library filters combine same name and type (tooltip in row 12). | `F/FilterField.tsx:23` |

---

#### 6. Same-label (matching properties) table

When shown: heading and table appear for every non-common property, new or edit, always with at least one row (`CPP:278-295`, `MPT:168-181,235-239`).

Heading (verbatim): `Properties from other templates in the collection using the same label.` (`CPP:281-283`, EN:988). Table is wrapped in `mt-4` (`MPT:236`).

Rows (`MPT:150-183`):
1. First row: the property being edited, built from the live form values (type, content, relationType, inherit), template name, with the suffix `(this template)` (`MPT:46`).
2. Then one row per property in `templatesAtom` whose label, trimmed and lower-cased, equals the form label and whose `_id` is not the edited property. This includes other properties of the current template as last saved. All templates are searched, using the saved template list, not the draft.

Columns, verbatim, in order (`MPT:51-56,187-233`):

| Type of property | Columns |
|---|---|
| Every type | `Template`, `Type` |
| select, multiselect | + `Thesauri` |
| relationship | + `Relation type`, `Entities`, `Inherit type` |

Cell text:
- `Template` cell: template name (translated, truncated at 30 chars) + `(this template)` on the current template's rows (`MPT:37-49`, EN:1369).
- `Type` cell: type icon and `t('System', 'property {type}')` label, e.g. `Rich text`, `Multiple date` (`MPT:25-35`, `HLP:39-57`).
- `Thesauri` cell: thesaurus name, or `No type` when the id is missing (`MPT:63-72`, EN:854).
- `Relation type` cell: relationship type name, or `No type` (`MPT:99-110`).
- `Entities` cell: template name (translated, truncated at 30), or `Any entity` (`MPT:83-97`, EN:121).
- `Inherit type` cell: icon and type label of `inherit.type`, or `No type` (`MPT:112-127`).

Incompatible cells are drawn in `text-error-600` (red): `Type` when `value !== currentType` (strict); `Thesauri`, `Relation type`, `Entities` when the ids differ (empty and missing count as equal); `Inherit type` when `inherit` differs (`MPT:29-31,71,95,108,117`, `HLP:97-145`).

Client compatibility rules, `validateMatchingProperties` (`CPP:153-191`):
- No same-label property elsewhere: valid.
- Any `prop.type !== type`: invalid (strict equality, no compatible pairs).
- select, multiselect: `content` (thesaurus id) must match (`optionalIdMatches`).
- relationship: `content`, `relationType` and `inherit` (`property` and `type`) must all match (`relationshipConfigMatches`, `HLP:131-145`).

Server compatibility rules (by derived name, not label; section 9): same name needs equal or compatible type. Compatible pairs: text/markdown, date/multidate, daterange/multidaterange, select/multiselect (`DOM/TextProperty.ts:29`, `DOM/MarkdownProperty.ts:25`, `DOM/DateProperty.ts:25`, `DOM/MultiDateProperty.ts:22`, `DOM/DateRangeProperty.ts:48`, `DOM/MultiDateRangeProperty.ts:47`, `DOM/select/SelectProperty.ts:13`, `DOM/select/MultiSelectProperty.ts:13`). The client is stricter, so a text/markdown pair that the server accepts disables Save.

Message when incompatible: none. The only cues are the red cells and the disabled submit button (`CPP:302`). The submit handler also returns silently if the check fails (`CPP:198-201`).

What disables Save (submit button): only `!validateMatchingProperties()`. Not disabled by: empty label, missing thesaurus, missing relationship type (those block the submit silently through RHF validation, section 4 rows 4-5).

---

#### 7. Add thesaurus modal and Add relationship type modal

Both are `Modal size="md"` (`max-w-md`, min 24rem at sm), rendered by the editor page while its flag is true (`TE:346-349`, `MOD:12-31`). `Modal` has no Escape handler and no backdrop click handler; close paths are the header X (`aria-label="Close modal"`, `MOD:97-108`) and Cancel. Neither modal is a `<form>`, so Enter does not submit. Opened from footer buttons `Add thesaurus` and `Add relationship type` (secondary), visible only when no property row is selected (`TEF:26-37`, EN:67,65).

| | Add thesaurus | Add relationship type |
|---|---|---|
| Title (h1, `text-xl font-medium`) | `Add thesaurus` (`ATM:67-69`, EN:67) | `Add relationship type` (`ARM:46-48`, EN:65) |
| Field label | `Name` (`ATM:76`, EN:773) | `Name` (`ARM:55`) |
| Input id | `thesaurus-name` | `relationship-type-name` |
| Placeholder | `Thesaurus name` (`ATM:82`, EN:1325) | `Relationship type name` (`ARM:61`, EN:1053) |
| Buttons, in order | `Cancel` (secondary), `Save` (success), right-aligned, inside the body, no footer (`ATM:88-98`) | same (`ARM:67-74`) |
| Save disabled | `isSaving` or sanitised name empty. Sanitising: newlines to spaces, runs of whitespace to one space, trim (`app/shared/sanitizationUtils.ts:20-37`) (`ATM:92-96`) | `isSaving` or `!name.trim()` (`ARM:71`) |
| Client duplicate check | On Save: case-insensitive equality of the sanitised name against every item in `thesauriAtom` (this atom also holds template-backed entries) (`ATM:44-51`) | On Save: case-insensitive equality of the trimmed name against `relationshipTypesAtom` (`RTM:21-27`) |
| Duplicate message | `Thesaurus name already exists` (EN:1326), shown only when `nameError && name` (`ATM:84-86`) | `Relationship type name already exists` (EN:1054) (`ARM:63-65`) |
| Error clears | On the next keystroke (`ATM:78-81`) | same (`ARM:57-60`) |
| Success | Creates `{name: <sanitised>, values: []}`, appends it to `thesauriAtom` (the Thesaurus select now lists it), toast `Thesaurus created successfully.` (`ATM:30-41`, EN:1324). Modal closes. | Creates `{name: <trimmed>}`, appends to `relationshipTypesAtom`, toast `Relationship type created successfully.` (`ARM:36-37`, `RTM:29-35`, EN:1052). Modal closes. |
| Failure | `handleUnexpectedError(error, 'Error creating thesaurus')` (`ATM:56-58`); modal closes anyway (`finally`, `ATM:58-61`) | Error toast `An error occurred` with the server detail (`error.detail ?? error.message ?? 'An error occurred'`); modal stays open (`ARM:32-35`, `RTM:30-32`, EN:116) |
| Duplicate, modal state | Stays open (early return before `finally`, `ATM:48-51`) | Stays open (`ARM:28-31`) |
| Server | `POST /api/thesauris`, admin. Name schema: `Name is required`, `Name cannot be empty` (`app/api/core/domain/thesaurus/Thesaurus.ts:67-70`). Duplicate is exact-case on `name`: `A thesaurus with name "{name}" already exists` (`app/api/core/domain/thesaurus/errors.ts:17`, `app/api/core/infrastructure/mongodb/thesauri/MongoThesauriDataSource.ts:62`). | `POST /api/relationtypes`, admin (`app/api/core/infrastructure/express/relationshipType/routes.ts:9-19`). `name` is `z.string()` (`RelationshipTypeRouteSchemas.ts:7`). Duplicate (case-insensitive, trimmed) throws plain `Error('duplicated_entry')` (`app/api/core/application/CreateRelationshipType.ts:19-22`, `app/api/core/infrastructure/mongodb/relationshipType/MongoRelationshipTypesDataSource.ts:41-45`). HTTP status for a plain `Error`: (unverified). |
| Does not | select the new item in an open panel (the panel is closed while the modal is open) | same |

---

#### 8. Relationship property

Order: `Relationship type` / `Entities` / `Inherit property` (`F/RelationshipFields.tsx:80-145`).

| Control | Options (in order) | Default | Notes |
|---|---|---|---|
| `Relationship type` + `*` (id `property-relation-type`) | 1. `Select...` (empty value). 2. Every relationship type, labelled `t(type._id, type.name)` (translated), sorted by label (`orderBy` on the label string). | `Select...` | `required: true` with no visible error (`:85`). No create link. (`:26-36`) |
| `Entities` (id `property-entity`) | 1. `Any entity` (empty value). 2. Every template except the one being edited (`template._id !== templateId`), sorted by label. Label = name truncated to 30 chars + `...`; if the translated name differs, `{name} ({translatedName})`. | `Any entity` | `required: false` (`:38-58,102-119`). A relationship cannot point at its own template (`:41`); an unsaved new template has no id, so all templates are listed. |
| `Inherit property` (id `property-inherit`) | 1. `Select...` (empty value). 2. Every custom property (`properties`) of the selected template, no type filter, labelled `t(selectedTemplate._id, prop.label)` truncated at 100, sorted by label. Common properties are not offered. | `Select...` | Shown only when `Entities` is a specific template (`content !== ''` and the template is found, `:60-63,121`). On pick stores `{ property: <property _id>, type: <property type> }`; picking `Select...` stores `undefined` (`:131-139`). |

Behaviour:
- Changing `Entities` clears `Inherit property` (`useEffect` on `content`, `:22-24`).
- On a new relationship property the form is reset with `relationType ''` and `content ''` (`CPP:129-132`).
- Required rules: `Relationship type` is required by RHF; `Entities` and `Inherit property` are optional.
- Server rules in section 9; `inherit` is kept only when `inherit.property` is set (`DOM/V1RelationshipProperty.ts:88-90`).
- Same-label rule for relationships compares `content`, `relationType` and `inherit` (section 6).
- Filter, Default filter allowed; Priority sorting not (section 3).

---

#### 9. Server-side property validation (templates schema)

Transport: `POST /api/templates` (admin), body parsed by zod, then domain classes (`app/api/core/infrastructure/express/template/routes.ts:13`, `app/api/core/infrastructure/facades/TemplateFacade.ts:40,65`). Status mapping (`HE:120-126,142-144`):
- ZodError -> 422, `message` = `util.inspect(error)`, `validations` = issues.
- `ValidationError` (domain) -> 422.
- `DomainError` -> 400.
The editor shows server text only as the detail of the toast `Error saving template.` (`TE:178-186`).

| Rule | Message (verbatim) | Cite |
|---|---|---|
| Template `name` missing | `Template name is required` | `DTO:66` |
| Update without template id | `Template id is required` | `DTO:83` |
| Update common property without id | `Common property id is required` | `DTO:79` |
| Unknown top-level keys | zod strict object (default zod text) (unverified) | `DTO:72,86` |
| `label` not a string | zod default (`Required` / `Expected string, received ...`) (unverified). No min length: an empty label passes the schema. | `DTO:25`, zod ^3.24.1 (`package.json:287`) |
| `type` not one of the 17 | zod union error (unverified) | `DTO:4-22` |
| Unknown type reaching the factory | `The following type was not handled. Type = {type}` | `ERR:294`, `DOM/PropertyFactory.ts:97-98` |
| Image/preview/media `style` not `cover`/`contain` | `The following style type is not valid for Image Property. Type = {type}` (also for preview and media) | `ERR:86`, `DOM/AbstractImageProperty.ts:27-31` |
| select/multiselect without `content` | `The following field is required. Field = content` | `ERR:186`, `DOM/select/AbstractSelectProperty.ts:23-27` |
| Thesaurus id does not exist | `The following Thesaurus does not exist. Thesaurus Id = {thesaurusId}` | `ERR:196`, `app/api/core/application/propertyCreatorService/SelectPropertyCreatorService.ts:26-30` |
| Relationship type id does not exist (also empty) | `The Relationship Type with Id "{relationType}" was not found.` | `ERR:205`, `app/api/core/application/propertyCreatorService/RelationshipPropertyCreatorService.ts:23-29` |
| Inherit: target property missing in the target template | `The provided Target Property with id "{propertyId}" was not found on Template with id "{templateId}"` | `ERR:231`, `RelationshipPropertyCreatorService.ts:36-42` |
| Inherit: type differs from the target property's type | `The provided Target Property type "{providedType}" does not match with the Target Template type "{existingType}"` | `ERR:240`, `RelationshipPropertyCreatorService.ts:44-46` |
| Relationship `content` template existence | Not checked unless `inherit` is set (then `getById(...).getDataOrThrow()`). | `RelationshipPropertyCreatorService.ts:31-34` |
| `nested` outside project `cejil` | `The nested Property type is not available for your organization {props as JSON}` | `ERR:249`, `app/api/core/application/propertyCreatorService/NestedPropertyCreatorService.ts:17-19` |
| Same derived name in another template, incompatible type | `Property with the name "{existingName}" must have type "{existingType}", but type "{attemptedType}" was provided.` | `ERR:131`, `DOM/Property.ts:98-102`, `app/api/core/application/propertyCreatorService/AbstractPropertyCreatorService.ts:24-28` |
| Same name, select/multiselect with another thesaurus | `Property with the name "{name}" has a thesaurus mismatch. It must be linked to {existingContent} thesaurus, but a link to {attemptedContent} thesaurus was provided.` | `ERR:141`, `DOM/select/AbstractSelectProperty.ts:33-39` |
| Same name, relationship inheritance differs | `Property with the name "{name}" has an inheritance mismatch. It must {inherit the property "{type}" or: not inherit any property}, but a configuration to {inherit the property "{type}" or: not inherit any property} was provided.` | `ERR:154-158,149-152`, `DOM/V1RelationshipProperty.ts:117-123` |
| Two properties in one template derive the same name | `Template contains duplicate property name: [name={name}]. Conflicts: "{label1}" ({type1}) and "{label2}" ({type2}).` (label1 is the earlier row) | `ERR:95-100`, `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:11-17` |
| A common property name missing | `Template has the missing Property. Type = {name}` | `ERR:178`, `DOM/templateValidator/TemplateWithMissingCommonPropertyValidator.ts:6-16` |
| Title not type text | `The following type is not valid for {propertyName}. Type = {type}` | `ERR:14`, `DOM/TitleProperty.ts:25-27` |
| Title name not `title` | `The following PropertyName is not valid for TitleProperty. PropertyName = {name}` | `ERR:32`, `DOM/TitleProperty.ts:29-31` |
| Change of a saved property's type | `Can't change property types.` | `ERR:287`, `DOM/Property.ts:106` |
| Delete a property another template inherits | `Properties can not be deleted because are being inherited: [properties={names}]` | `ERR:115`, `app/api/core/application/UpdateTemplate.ts:67-73` |
| Template name taken | `The following Template has a used Name on the system. Name = {name}` | `ERR:169`, `app/api/core/application/CreateTemplate.ts:59-62` |
| Update while background processing | `template is being processed you can not update it yet` (path `processing`) | `DOM/Template.ts:256-259` |

Required, filter and display flags (`required`, `filter`, `defaultfilter`, `noLabel`, `showInCard`, `prioritySorting`, `fullWidth`, `generatedId`) have no cross-field server rule (`DTO:40-47`).

---

#### 10. Improvements to layer on

Row refs are gap-matrix.md "Template editor" rows; UX refs are settings-ux-audit.md "Improvements beyond 1:1 parity" numbers. "no UX#" = a row or Summary item without an UX number.

- Property panel on shared `Modal` (md) with focus trap, full-screen sheet on phones, Escape in an open Select closes only the Select: UX12; rows "Property panel container", "Phone"; audit Summary 7.
- Property rows on phone as name, type badge and flag icons, panel opened as a sheet: UX12; row "Phone".
- Hover or focus a property row (and the Show in cards checkbox) highlights its place on the live card preview: UX7; row "Property to card link".
- Keyboard reorder (up/down buttons beside drag) in the property list that opens the panel: UX9; row "Reorder".
- Property search above the property table: UX1; row "Property search".
- Show "N entities lose this value" when a property is removed and offer undo from the Beacon: UX4, UX5; row "Remove properties".
- Footer on the bar ladder: `Cancel` as ghost, commit solid ink (not green `success`); `Save` on edit may keep green per `warmButton.ts`: audit Summary 6; row "Property panel container" (no UX#).
- One option table per type (section 3) drives which controls render, in one constant: row "Per-type option matrix".
- Label: empty default, a type change keeps typed text: row "Label" (no UX#).
- Visible error line for an incompatible same-label property, using the stricter client rule: row "Same-label table" (no UX#, prototype-only `role=alert` summary is kept).
- Reject labels equal to a common property label (`Title`, `Date added`, `Date modified`) with the existing message; stable ids instead of derived names: row "Reserved and derived names" (no UX#).
- Visible required messages for Thesaurus and Relationship type (`This field is required`): rows "Select", "Relationship" (no UX#).
- Live thesaurus, relation-type and template pickers by id, one relation-type registry shared by Settings, panel and modals: rows "Select", "Relationship", "Add thesaurus modal", "Add relationship type modal" (no UX#).
- Inherit picker lists the target's custom properties and keeps its value on open: row "Relationship" (no UX#).
- Both Add modals stay open on any failure and keep the typed name; keep the Add buttons on the page footer or add an inline `Add new` entry in the pickers, and select the created item: rows "Add thesaurus modal", "Add relationship type modal" (no UX#).
- Impact preview when a label rename or thesaurus change would alter stored values: UX4 (applies to the Edit path); row "Rename effects".

---

#### 11. Uwazi defects NOT to copy

- Default label collides: a new property is `Text` (or the capitalised type key, e.g. `Multidate`, `Generatedid`), and a second new property gets the same label and fails only at submit (`CPP:41,128`, `F/LabelField.tsx:45-47`). Corrected: empty label by default, placeholder only; user-facing type name as placeholder.
- A type change wipes everything typed or ticked, including the label (`CPP:126-137`). Corrected: keep the label and every flag that still applies to the new type; drop only the fields that no longer apply.
- Inherit property is probably cleared on open (unverified): `RelationshipFields` runs `setValue('inherit', undefined)` on mount and whenever `content` changes (`F/RelationshipFields.tsx:22-24`), and `reset(propertyToEdit)` changes `content` from `''` to the saved value after the panel mounted (`CPP:134-136`). No spec covers it (`app/react/V2/Routes/Settings/Templates/specs/TemplatesSettings.cy.tsx` has no inherit case). Corrected: clear `inherit` only when the user changes `Entities`.
- Silent required blocks: `Thesaurus` and `Relationship type` use `rules={{ required: true }}` but their `Select` gets no `hasErrors` or message, so a click on `Add property` does nothing visible (`F/ThesaurusField.tsx:43-57`, `F/RelationshipFields.tsx:85-98`). Corrected: show `This field is required` under the select.
- Whitespace-only label passes `required` (`Boolean(value)`, `F/LabelField.tsx:38`); the label is saved untrimmed; the schema allows an empty string (`DTO:25`). Corrected: trim, then require.
- Save disabled with no text when a same-label property is incompatible (`CPP:302`, `CPP:198-201`). Corrected: a visible error line naming the conflicting template and the field that differs.
- Phantom matches: the matching check reads the saved template list, so a property already removed or renamed in the draft still matches, and the current template's saved copy can match a new property (unverified, `CPP:156-160`, `MPT:152-155`). Corrected: read the draft for the current template.
- Same name pair rules differ between client and server (client strict, server allows four compatible pairs), and only the server catches two labels that derive the same name (`CPP:166-169`, section 5). Corrected: one rule, on ids.
- Type labels disagree: select says `Multiple dates` and `Multiple date ranges`, the read-only box and tables say `Multiple date` and `Multiple date range`; select labels are not translated; `property nested` has no entry (`F/PropertyTypeField.tsx:21,23`, EN:1000-1001, `HLP:56`). Corrected: one constant, one label per type, used in the select, the read-only box, the table and the options column.
- Style radios use `defaultChecked` (uncontrolled), so a form `reset` between image, preview and media leaves the visible radio out of sync with the form value (unverified, `F/StyleField.tsx:19,39`). Corrected: controlled radios.
- Panel closes on overlay click or Escape and drops edits with no confirmation (`SP:116-127,226`). Corrected: ignore the backdrop click when the form is dirty, or confirm.
- The `Add thesaurus` modal closes on a server error and loses the typed name (`ATM:56-61`). Corrected: stay open.
- Tooltips as the only place help text lives, behind an icon with hover trigger (keyboard access unverified). Corrected: visible help text under the field for the flags that change library behaviour (Use as filter, Priority sorting).
- Opening the panel on a property whose `filter` is false silently sets `prioritySorting` and `defaultfilter` to false (unverified, `CPP:145-150`). Corrected: apply the forcing only on user unchecking Use as filter.
- Entities cannot be the template itself (`F/RelationshipFields.tsx:41`). Decide per prototype: self-reference allowed or not; Uwazi's behaviour is "not".
- Label is the only identity users see, but the server renames the stored metadata key when the label changes (`DOM/Property.ts:115-116`, `DTO:24-52`). Corrected: stable property id; a label rename never changes the key.


---

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


---

# Brief part b4: Users & Groups, Account

Source: huridocs/uwazi `production` v1.229.224 at `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All strings and rules were read in code unless marked (unverified). Nothing was run.

Citation aliases (all repo-relative): `R/` = `app/react/V2/Routes/Settings/`, `C/` = `app/react/V2/Components/`, `API/` = `app/api/core/`, `en.csv` = `contents/ui-translations/en.csv`.
UX numbers = the "Improvements beyond 1:1 parity" list in settings-ux-audit.md: UX1 search, UX2 bulk selection bar, UX3 CSV, UX4 impact before delete, UX5 undo in Beacon, UX6 tree editor, UX7 card link, UX8 untranslated filter, UX9 keyboard reorder, UX10 grouped rail, UX11 last-saved line, UX12 phone list rows. "Design pattern" = settings-ux-audit.md shared patterns 1 to 3. Gap rows are named by their first words in gap-matrix.md.

Shared mechanics used by both pages:
- Header title is a breadcrumb with one item (no path): `R/Users/Users.tsx:115`, `R/Account/Account.tsx:64`; rendered by `C/Layouts/SettingsContent.tsx:57-86`. On phones a back chevron (sr-only `Navigate back`, en.csv:782) goes to `/settings` (`SettingsContent.tsx:62-67`).
- Footer is sticky, `px-4 py-3`, top border (`SettingsContent.tsx:95-113`). Body has `px-4`.
- Nav: Account link for every logged-in user; Users & Groups only for `admin` (`R/SettingsNavigation.tsx:30,34`). Route guards: see Users section item 1.
- Notifications go to the Beacon list via `notify(type, title, message?, details?)` (`app/react/V2/atoms/requestStatusAtom.ts:144-154`). Success = title only. Error = title `An error occurred` + detail.
- Every failed `apiClient` request also raises its own notification `An error occurred` + detail (except status 401/404) and 409 raises a warning titled with the error code (`app/react/V2/api/policies.ts:39-72`, wired at `app/react/V2/api/client.ts:6-10`). Both pages also call `notify` themselves, so one failure yields two entries (code-read, not run).
- Error detail text = `body.prettyMessage ?? body.message ?? body.error ?? statusText` (`app/shared/apiClient/normalizeError.ts:91`). 401 from any request does `window.location.assign('/login')` (`policies.ts:74-83`).
- Server status map: DomainError 400 (`app/api/utils/handleError.js:142-144`), Zod 422 (`:120-127`), UnauthorizedError 401 (`:150-152`), `needsAuthorization` failure 401 `{error:'Unauthorized', message:'Unauthorized'}` (`app/api/auth/authMiddleware.ts:18-19`).
- Password re-entry: the client sends the typed password as `Authorization: Basic base64(password)` (`app/react/V2/api/users/index.ts:20-31`). Middleware returns 403 `{ error: 'Password error', message: 'Forbidden' }` when missing or wrong (`API/infrastructure/express/users/ValidatePasswordMiddleWare.ts:18-32`); the compared account is the logged-in user (`ValidateCurrentPassword.ts:7-18`). The notification detail is `Forbidden`.
- Form styling classes in this repo are the old Uwazi theme; rebuild with prototype tokens. Only structure, copy and rules matter.

---

### Users & Groups

**1. Screen map**

Route `/settings/users`. Admin only: client `adminsOnlyRoute` (`app/react/Routes.tsx:341-345`), rail link hidden for others (`R/SettingsNavigation.tsx:34`); server list below. Non-admin on the route: redirect to `/login` (`app/react/ProtectedRoute.tsx:6-34`).

Top to bottom:
1. Header: breadcrumb title `Users & Groups` (`R/Users/Users.tsx:115`, en.csv:1484).
2. Tab strip (2/3 width on md+, full width on phones, `Users.tsx:120`): tab 1 `Users` (default active, `Users.tsx:34,129`, en.csv:1483), tab 2 `Groups` (`Users.tsx:146`, en.csv:568). Inactive tab is unmounted (`C/UI/Tabs/Tabs.tsx:29` default `unmountTabs = true`). Switching tab clears both selections and the sidepanel record (`Users.tsx:122-127`).
3. Table card with its own header row showing the tab name: `Users` or `Groups`, `text-base font-semibold` (`Users.tsx:133-137,150-154`). Rows have a leading checkbox column (`enableSelections`, `Users.tsx:138,155`). Header cells render uppercase through CSS (`C/UI/Table/Table.tsx:302` `uppercase`), so on screen: `USERNAME`, `PROTECTION`, `ROLE`, `GROUP`, and `NAME`, `MEMBERS`. Header checkbox has sr-only `Select all` (en.csv:1149); row checkbox sr-only `Select` (en.csv:1144) (`C/UI/Table/RowSelectComponents.tsx:36,69`).
4. Sticky footer (see item 3 for the exact states).
5. Overlay sidepanel (user or group form, item 4 of this section's fields) and modals.

Users table columns, in order (`R/Users/components/TableComponents.tsx:99-127`):

| # | Header (verbatim) | Sortable | Cell | Cite |
|---|---|---|---|---|
| 1 | checkbox (sr-only `Select all`) | no | row selection | `Table.tsx:131-138` |
| 2 | `Username` (width 1/3) | yes, default sort ascending (`Users.tsx:142`) | username text; when `accountLocked`: text in error colour plus a lock icon with tooltip `Account locked` (en.csv:24) | `TableComponents.tsx:13,69-81,100-104` |
| 3 | `Protection` (en.csv:1009) | yes | green pill `Password + 2fa` (en.csv:934) when `using2fa`, else gray pill `Password` (en.csv:933) | `TableComponents.tsx:15,21-34,105-109` |
| 4 | `Role` (en.csv:1096) | yes | pill, `admin` = primary colour, others gray; text is the raw lowercase role value passed through `Translate`: `admin`, `editor`, `collaborator` (lowercase `admin` and `collaborator` have no en.csv entry, `editor` en.csv:447) | `TableComponents.tsx:16,36-45,110-114` |
| 5 | `Group` (singular, en.csv:561; width 2/3) | yes by default (array value; sort order (unverified)) | gray pills, one per group name | `TableComponents.tsx:17,57-67,115-119` |
| 6 | sr-only `Action` (en.csv:29) | no | ghost button `Edit` (en.csv:435), opens the sidepanel for that row | `TableComponents.tsx:19,83-97,120-126` |

There is no Email column and no search box.

Groups table columns (`TableComponents.tsx:129-147`): checkbox; `Name` (en.csv:773; width 1/4; sortable; default ascending, `Users.tsx:159`); `Members` (en.csv:743; width 3/4; not sortable; gray pill per member username); sr-only `Action` with ghost `Edit`.

User sidepanel (`R/Users/components/UserFormSidepanel.tsx`). Right-docked overlay with a dimmed backdrop, 500px wide on md+, full width on phones (`C/UI/Sidepanel.tsx:71,209-255`). Header: title `New user` (en.csv:798) or `Edit user` (en.csv:444) (`UserFormSidepanel.tsx:218`), close X (sr-only `Close`, en.csv:220). Body, top to bottom:
1. Card `General Information` (en.csv:553): `Username`, `User Role` (select plus "?" help button), `Email`.
2. Card `Security` (en.csv:1143): `Password`; then a row of buttons: `Reset Password`, `Reset 2FA` (edit mode only), `Unlock account` (only when the user is locked). On md+ the buttons sit in one row; on phones they stack (`:304`).
3. Groups block (no card title; a header bar with label `Groups`, en.csv:568, and a plus-circle button with sr-only `Select`, en.csv:1144, that opens a popover of checkboxes, one per group name; chosen groups appear below as gray pills each with an X, sr-only `Remove`, en.csv:1066; when empty it shows `Nothing selected`, en.csv:873) (`:346-359`, `C/Forms/MultiSelect.tsx:99-196`). The plus button is disabled when there are no groups (`MultiSelect.tsx:116`).
4. Footer: `Cancel` (secondary, en.csv:171) and `Save` (primary, en.csv:1105), equal width (`:362-381`).

Group sidepanel (`R/Users/components/GroupFormSidepanel.tsx`), same shell: title `New group` (en.csv:789) / `Edit group` (en.csv:440) (`:113`). Body: card `Group Options` (en.csv:564) with `Name`; then a block with header bar `Members` (en.csv:743) using the same multi-select (options = all users by username, no search), placeholder `Nothing selected` (`:117-157`). Footer: `Cancel`, `Save` (`:160-169`).

Permissions modal (opened by the "?" next to `User Role`, `UserFormSidepanel.tsx:253-256,385`): `Modal` size `xxxl` (max-w-3xl) (`R/Users/components/PermissionsListModal.tsx:195`). Header: title `Permissions` (en.csv:950) and a close X (aria-label `Close modal`, `C/UI/Modal.tsx:105-109`) (`:196-199`). Body: a table, no checkbox column, no sorting (`:201`). Footer: one full-width ghost button `Close` (en.csv:220) (`:203-207`).

Columns (`PermissionsListModal.tsx:132-135,166-191`): `User Action` (en.csv:1474, 2/5 width), `Collaborator` (en.csv:222), `Editor` (en.csv:446), `Admin` (en.csv:90) (1/5 each). Cell icons: full = green check; partial = user-plus icon (amber) with tooltip `Permission on entities explicitly shared with the user` (en.csv:949); none = red X (`:137-159`). Rows (`:24-130`):

| Action (verbatim) | Collaborator | Editor | Admin |
|---|---|---|---|
| `Create new entities and upload documents` | full | full | full |
| `Create table of contents` | full | full | full |
| `View entities` | partial | full | full |
| `Edit metadata of entities` | partial | full | full |
| `Delete entities and documents` | partial | full | full |
| `Share edit access with other users` | partial | full | full |
| `Create relationships and references` | partial | full | full |
| `Share entities with the public` | none | full | full |
| `Manage site settings and configuration` | none | none | full |
| `Add/delete users and assign roles` | none | none | full |
| `Configure filters` | none | none | full |
| `Add/edit translations` | none | none | full |
| `Configure templates ` (code string has a trailing space, `:110`; the key without the space is en.csv:240) | none | none | full |
| `Create and edit thesauri` | none | none | full |
| `Create relationship types` | none | none | full |

The matrix is hard-coded copy, not derived from server rules. Role descriptions beyond this matrix: none found.

**2. Fields**

User form (`UserFormSidepanel.tsx`). Form mode is react-hook-form default (`onSubmit`); errors appear only after `Save` is clicked (`trigger()`, `:370-376`) and re-validate on change afterwards (default RHF behaviour (unverified at runtime)). Error strings are rendered under the field by `InputField` `errorMessage` (the field also takes the error style, `C/Forms/InputField.tsx:107`). Per-field error text is chosen by rule type in `getFieldError` (`:57-92`). RHF reports the first failing rule in this order: `required`, `maxLength`/`minLength`, then `validate` entries in declaration order.

| Label | Control | Placeholder | Help / tooltip | Default | Validation and error (client) | Server (zod/domain) | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Username` (en.csv:1477) | text input, `autoComplete="new-username"`, id `username` | none | none | `""` (new) / row value (edit) | `required` -> `Username is required` (en.csv:1478); `minLength 3` -> `Username is too short` (en.csv:1480); `maxLength 50` -> `Username is too long` (en.csv:1479); `isUnique` -> `Duplicated username` (en.csv:430); `noSpaces` (`/\s/`) -> `Usernames cannot have spaces` (en.csv:1482) | trimmed, min 1, no space character -> `Usernames can not contain spaces.`; empty -> zod default (unverified exact text); no max; unique, exact and case-sensitive -> `The username "{username}" already exists` | yes | `:229-246`; `API/domain/user/User.ts:37-42`; `API/domain/user/errors.ts:6-10`; `API/infrastructure/mongodb/user/MongoUsersDataSource.ts:42-50` |
| `User Role` (en.csv:1475) with a help button (sr-only `Permission`, en.csv:947; icon "?") | `<select>`, id `roles`, no placeholder option | none | the "?" opens the Permissions modal | `collaborator` (new) / row value | none | enum `admin|editor|collaborator`; own role cannot change: `Cannot change own role`; demoting the last admin: `Cannot remove the last remaining admin` | yes (always has a value) | `:29-41,110-119,249-263`; `API/application/UpdateUser.ts:50-52,57-62`; `API/domain/user/errors.ts:37-41` |
| Role options, in order | `Admin` (en.csv:90, value `admin`), `Editor` (en.csv:446, value `editor`), `Collaborator` (en.csv:222, value `collaborator`) | - | no per-option description in the select; descriptions only in the matrix | - | - | - | - | `:29-41` |
| `Email` (en.csv:449) | `type="email"`, `autoComplete="new-email"`, id `email` | none | none | `""` / row value | `required` -> `A valid email is required` (en.csv:16); `validEmailFormat` `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` -> `A valid email is required`; `maxLength 256` has no case in `getFieldError`, so no message shows for it (defect, item 11); `isUnique` -> `Duplicated email` (en.csv:428) | `z.string().email()` (zod default text (unverified)); unique, exact -> `The email "{email}" already exists` | yes | `:265-283`; `app/react/V2/shared/formatHelpers.ts:53`; `API/domain/user/User.ts:44`; `API/domain/user/errors.ts:12-16` |
| `Password` (en.csv:933) | `type="password"`, `autoComplete="new-password"`, id `password` | none | none | `""` | `maxLength 50` -> `Password is too long` (en.csv:936; shown for any password error) | create: blank = random 64-hex password generated, welcome email sent; edit: blank = unchanged (blank is deleted before sending, `app/react/V2/api/users/index.ts:11-13`); non-blank must be non-empty string (`z.string().min(1).optional()`); no minimum length or strength rule anywhere | no | `:288-302`; `API/application/CreateUser.ts:17-21`; `API/application/UpdateUser.ts:23`; `API/domain/user/EncryptedPassword.ts:17-19` |
| `Groups` (en.csv:568) | multi-select of group names (stored as `{_id, name}`) | `Nothing selected` (en.csv:873) | none | none (new) / row groups (edit) | none | assignment applied only if the actor is admin; replaces all memberships: adds to listed groups, removes from all others; omitted `groups` = untouched | no | `:346-359`; `API/application/UpdateUser.ts:76`; `API/infrastructure/mongodb/user/MongoUserGroupsDataSource.ts:15-34` |

Group form (`GroupFormSidepanel.tsx`):

| Label | Control | Placeholder | Help | Default | Validation and error (client) | Server | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Name` (en.csv:773) | text, id `name`, `autoComplete="off"` | none | none | `""` / row name | `required` -> `Name is required` (en.csv:774); `minLength 3` -> `Name is too short` (en.csv:776); `maxLength 50` -> `Name is too long` (en.csv:775); unique among loaded groups, case-insensitive, trimmed (`validate`) -> `Duplicated name` (en.csv:429) | name trimmed; no min/max; unique case-insensitive via regex built from the raw name -> `The group name "{name}" already exists` | yes | `:21-41,120-133`; `API/domain/userGroup/errors.ts:4-8`; `API/infrastructure/mongodb/user/MongoUserGroupsDataSource.ts:84-99` |
| `Members` (en.csv:743) | multi-select of users (label = username, value = user id) | `Nothing selected` | none | none / row members | none | duplicate ids rejected: `Duplicate member ids: {ids}` | no | `:136-157`; `API/domain/userGroup/errors.ts:10-14` |

Role-based visibility of fields: none; the whole page is admin only.

**3. Row actions and bulk actions**

Row actions:
- `Edit` (ghost, every row, both tabs): opens the sidepanel with that row (`TableComponents.tsx:83-97`, `Users.tsx:48-56`). Always enabled.
- No per-row Delete, Reset or Unlock in the table; those are in the sidepanel or the footer.

Sidepanel actions, user in edit mode (`UserFormSidepanel.tsx:305-342`):
- `Reset Password` (en.csv:1085, ghost): enabled in edit mode only (`selectedUser._id`). Sends a recovery email immediately to the stored email of that user: no confirmation, no password. Panel stays open. Success notification `Instructions to reset the password were sent to the user` (en.csv:631).
- `Reset 2FA` (en.csv:1082, ghost): edit mode only. Opens the password modal (item 4). On accept: disables 2FA for the user, success `Disabled 2FA` (en.csv:394), revalidates, closes the panel. Enabled even when the user does not use 2FA.
- `Unlock account` (en.csv:1430, `dangerSecondary` red outline): shown only when `selectedUser.accountLocked`. Opens the password modal. On accept: clears the lock, success `Account unlocked successfully` (en.csv:25), revalidates, closes the panel.
- `Save`, `Cancel`: item 6.
- Group panel: `Save`, `Cancel`.

Footer bulk actions (`Users.tsx:165-231`, one container `flex gap-2`). The footer shows exactly one of these sets:

| Selection state | Buttons, left to right |
|---|---|
| Nothing selected (either tab) | `Add user` (en.csv:75) on the Users tab / `Add group` (en.csv:54) on the Groups tab (primary). Click clears the record and opens the empty sidepanel (`:216-229`). |
| 1 or more users selected (Users tab) | `Reset Password` (ghost), `Reset 2FA` (ghost), `Delete` (danger) (`:167-214`) |
| 1 or more groups selected (Groups tab) | `Delete` (danger) only (`:199-214`) |

- There is no selection count, no "Select N", no `Add to group`, no `Change role`, no bulk email: none found.
- Selection rules: row checkboxes and header "select all" (all rows of the table; all rows are loaded, no pagination); users and groups keep separate selections; changing tab clears both (`Users.tsx:122-127`). No row is disabled for selection (`disableRowSelection` is not set), including the current admin and the system user (see item 11).
- `Reset Password` bulk: opens a danger confirmation without password (item 4); on accept sends one recovery request per selected user in parallel (`app/react/V2/api/users/index.ts:97-115`); success `Instructions to reset the password were sent to the user` (same singular text for many users) (`Users.tsx:85-92`).
- `Reset 2FA` bulk: danger confirmation with password; one request per user in parallel (`index.ts:117-137`); success `Disabled 2FA`.
- `Delete` on users: danger confirmation with password; `DELETE users` with `ids` (`index.ts:51-62`); success `Deleted user` (en.csv:384; singular also for many) (`Users.tsx:73-78`).
- `Delete` on groups: danger confirmation without password; success `Deleted user group` (en.csv:385) (`Users.tsx:79-84`). Deleting a group removes the group document only; the users stay (`API/application/DeleteUserGroups.ts:16`).
- Server effect of user delete: deletes the users, then removes them from every group's `members` in one transaction (`API/application/DeleteUsers.ts:23-37`). Guards, in this order, each a 400: `Cannot delete system users` (public user id), `Users cannot delete themselves`, `Cannot delete last remaining user` (only when exactly 1 user exists), `Cannot remove the last remaining admin` (when every current admin is in the list) (`DeleteUsers.ts:39-56`; `API/domain/user/errors.ts:18-41`).
- After Accept the modal closes and both selections reset to empty whether the call succeeded or failed (`Users.tsx:264-270`); after success the loaders re-run (`:109`).

**4. Confirm dialogs and modals**

Common dialog shell `ConfirmationModal` (`C/UI/ConfirmationModal.tsx`), `Modal` size `md` (max-w-md) (`:46`, `Modal.tsx:29`). Close: header X (aria-label `Close modal`) or Cancel. Escape and backdrop click do not close a `Modal` (no handler in `Modal.tsx`) (code-read).
- Password field (when `usePassword`): label `Enter your current password to confirm` (en.csv:460), `type="password"`, `autoComplete="off"`; Accept stays disabled until the field has at least 1 character (`ConfirmationModal.tsx:51,88-106`). No other check client-side; the server compares with bcrypt.
- Default buttons: `Cancel` (en.csv:171), `Accept` (en.csv:18) (`:143,151,182,191`).

| # | Trigger | Style | Title | Body | Password field | Buttons, in order | Accept does | Cite |
|---|---|---|---|---|---|---|---|---|
| 1 | Sidepanel `Save` (create or edit, after client validation passes) | normal | `Confirm` (en.csv:241) | `Confirm action` (en.csv:243) | yes | `Cancel` (ghost), `Accept` (primary, because there is no warning text) | `usersService.upsert(form values, password)`: create `POST users/new`, edit `POST users`; then see item 6 | `UserFormSidepanel.tsx:386-404`; `ConfirmationModal.tsx:159-195` |
| 2 | Sidepanel `Reset 2FA` | normal | `Confirm` | `Confirm action` | yes | `Cancel`, `Accept` | `reset2FA(user, password)`, revalidate, close panel | `:318-327,386-404` |
| 3 | Sidepanel `Unlock account` | normal | `Confirm` | `Confirm action` | yes | `Cancel`, `Accept` | `unlockAccount(user, password)`, revalidate, close panel | `:331-341` |
| 4 | Footer `Reset Password` (users selected) | danger | `Reset passwords` (en.csv:1086) | warning band (red, `role="alert"`) `Do you want reset the password for the following users?` (en.csv:402), then a bulleted list of the selected usernames | no | `Cancel` (warm), `Accept` (danger red) | `requestPasswordReset(selectedUsers)` | `Users.tsx:172-177,254-274`; `ConfirmationModal.tsx:110-157` |
| 5 | Footer `Reset 2FA` (users selected) | danger | `Reset 2FA` (en.csv:1082) | warning `Do you want disable 2FA for the following users?` (en.csv:401), list of usernames | yes | `Cancel`, `Accept` | `reset2FA(selectedUsers, password)` | `Users.tsx:186-191` |
| 6 | Footer `Delete` (users) | danger | `Delete` (en.csv:366) | warning `Do you want to delete the following items?` (en.csv:403), list of usernames | yes | `Cancel`, `Accept` | `usersService.delete(selectedUsers, password)` | `Users.tsx:203-209` |
| 7 | Footer `Delete` (groups) | danger | `Delete` | warning `Do you want to delete the following items?`, list of group names | no | `Cancel`, `Accept` | `userGroupsService.delete(selectedGroups)` | `Users.tsx:259-263` |

Danger layout: a red-tinted square with a warning triangle, then the title, then the close X; then the warning band; then the list (`flex-wrap`, bullets); then the password field if any; then buttons right-aligned (`ConfirmationModal.tsx:110-157`). While modal 1 to 3 or the Permissions modal is open, the sidepanel gets `pointer-events-none` (`UserFormSidepanel.tsx:209-213`). The modal closes after Accept finishes, success or failure (`:401`, `Users.tsx:267`).
Permissions modal: item 1. No other dialogs; no "discard changes" dialog.

**5. Empty / loading / error / notification states**

- Empty table (either tab): a centred message `NO DATA AVAILABLE` (en.csv:812, gray, `p-10`); the table header row and checkbox header stay (`C/UI/Table/DefaultNoDataMessage.tsx:4-8`, `Table.tsx:322-324`). No create call-to-action in the empty state; the footer `Add user` / `Add group` is the only action.
- Group with no members: empty cell. User with no groups: empty cell.
- Loading: loaders for users and groups run in parallel (`R/Users/createUsersLoader.ts:16-19`); while any request runs the global request-status loader shows with a minimum 1000 ms (`app/react/V2/atoms/requestStatusAtom.ts:26-49`). No skeleton rows.
- Loader error: route error boundary, status and message from the server (`createUsersLoader.ts:21-22`, `app/react/V2/shared/errorUtils.tsx:106-118`).
- Mutation error: Beacon notification, type error, title `An error occurred` (en.csv:116), detail = server text (`Users.tsx:58-65`, `UserFormSidepanel.tsx:140-147`, `GroupFormSidepanel.tsx:90-97`). Wrong admin password: detail `Forbidden`. Network failure: title `Could not reach server. Please try again later.` (en.csv:284) (`policies.ts:40-45`).
- Success notifications (title only): `Added new user` (en.csv:83), `User updated` (en.csv:1476), `Group saved` (en.csv:565), `Group updated` (en.csv:566), `Deleted user` (en.csv:384), `Deleted user group` (en.csv:385), `Instructions to reset the password were sent to the user` (en.csv:631), `Disabled 2FA` (en.csv:394), `Account unlocked successfully` (en.csv:25) (`UserFormSidepanel.tsx:157-162,176-191`, `GroupFormSidepanel.tsx:100-103`, `Users.tsx:73-98`).
- Locked row: red username and lock icon, tooltip `Account locked` (`TableComponents.tsx:69-81`).
- Server error texts that can surface in a notification detail (400 unless noted): `The username "{username}" already exists`, `The email "{email}" already exists`, `Cannot modify system user`, `Cannot change own role`, `Cannot remove the last remaining admin`, `Cannot delete system users`, `Users cannot delete themselves`, `Cannot delete last remaining user`, `User {id} not found`, `The group name "{name}" already exists`, `Duplicate member ids: {ids}`, `User group "{id}" not found` (`API/application/UpdateUser.ts:37,51`; `API/domain/user/errors.ts:6-47`; `API/domain/userGroup/errors.ts:6-19`). Zod failures return 422 with an issue list; exact on-screen text of the detail is (unverified) because `prettyMessage` is built server-side (`handleError.js:120-127`, `:214-217`).

**6. Save**

User create or edit:
1. Click `Save` (`:370-376`). Client runs `trigger()` on all fields. If any rule fails: errors show, nothing else happens (no modal).
2. If valid: password modal 1 opens (`actionType = 'formSubmit'`).
3. `Accept`: `saveUser(getValues(), password)` (`:149-165`). The client strips `rowId`, `password` when blank, `accountLocked`, `failedLogins` (`app/react/V2/api/users/index.ts:7-18`). New user (no `_id`): `POST /api/users/new`; existing: `POST /api/users` (`app/react/V2/services/http/HttpUsersService.ts:7-10`).
4. Server, create (`API/infrastructure/express/users/routes.ts:14-19`): `needsAuthorization()` (admin; else 401 `Unauthorized`) -> `validatePasswordMiddleWare` (403 `Forbidden`) -> `CreateUserController` builds `domain` from the request protocol and tenant domain and maps `groups[]._id` to `assignedGroupIds` (`CreateUserController.ts:9-14`) -> `User.create` validates username, role, email -> checks unique username, then unique email -> hashes the password (random if none) -> one transaction: insert user, add to listed groups, create a recovery key and send the welcome email (always sent, no option) (`API/application/CreateUser.ts:32-57`, `SendWelcomeEmail.ts:21-42`). Response 201 `{user:{_id, username, role, email}}`.
5. Server, edit (`routes.ts:20-25`): roles allowed `admin|editor|collaborator`; body must include username, email, role (`UpdateUserController.ts:10-14`). Use case order: reject the system user -> load account -> non-admin editing someone else = `UnauthorizedError` 401 -> own role change -> profile validation -> last-admin check -> unique username only if changed -> unique email only if changed -> hash password if given -> groups applied only if actor is admin -> transaction update (`UpdateUser.ts:33-85`). Response 201.
6. Success: notification `Added new user` (new) or `User updated` (edit); `revalidator.revalidate()` re-runs both loaders; `closeSidepanel()` resets the form and closes (`:157-164`).
7. Error: notification `An error occurred` + detail; the modal closes, the sidepanel stays open with the values kept; the admin must retype the password on the next `Save`.
8. Welcome email: subject `Welcome to {site name}` (`Uwazi` if empty), link `{domain}/setpassword/{key}?createAccount=true`, valid 24 hours (`API/domain/email/templates/welcomeEmail.ts:11-34`).

Group create or edit:
1. `Save` is a real submit button, so Enter in the name field submits. RHF validates; if invalid, errors show (`GroupFormSidepanel.tsx:115,165`).
2. `POST /api/usergroups` with `{_id?, name, members:[{refId, username}]}` (`:78-88`, `app/react/V2/api/users/index.ts:64-72`). No password. Server: admin only; routes to update when `_id` is present, else create (`API/infrastructure/express/userGroups/routes.ts:9-19`). Create checks unique name then builds the group; update checks unique name excluding itself, loads the group, replaces name and members (`CreateUserGroup.ts:18-26`, `UpdateUserGroup.ts:19-25`).
3. Success: `Group saved` / `Group updated`, revalidate, close panel. Error: `An error occurred` + detail, panel stays open.

Bulk and secondary actions: item 3 and item 4 (confirm, call, notification, revalidate; Reset Password never closes anything).

**7. Dirty guard**

None. No `useBlocker` or `BlockDirtyNavigation` in `R/Users/**` (grep). Close X, Cancel, Escape (document keydown, `C/UI/Sidepanel.tsx:116-127`), backdrop click (`:226`), switching tab, and rail navigation all discard the edit silently. Exceptions: none.

**8. Sort, filter, search, pagination**

- Search: none found. Filters: none found. Pagination: none (all rows rendered, `Table.tsx:325-345`).
- Sort: client-side, TanStack Table, header click toggles (`Table.tsx:302-307`); indicator icons: up chevron ascending, down chevron descending, up-down chevron when unsorted (`C/UI/Table/SortingChevrons.tsx:9-17`). Default: Users by `username` ascending, Groups by `name` ascending. Cycle order (asc -> desc -> off for strings; desc first for the boolean Protection column) is TanStack 8.21.3 default behaviour (unverified at runtime; version `package.json:156`).
- Selection is held in the table and is reset whenever the `data` prop changes (after revalidate) (`Table.tsx:171-178`).
- Row order before sort = server order (unverified).

**9. Propagation**

- After any successful mutation both lists reload (`Users.tsx:109`, `UserFormSidepanel.tsx:163`, `GroupFormSidepanel.tsx:104`).
- Role changes apply on the user's next request: the session user is re-read from the database on each request (`app/api/auth/passport_conf.js:10-25`), and role gates both menu and API (`authMiddleware.ts:13-20`, `R/SettingsNavigation.tsx:30-36`).
- Group membership feeds the session user's `groups`, from which permission ref ids are derived (comment at `passport_conf.js:17-18`).
- `Reset 2FA` sets `using2fa=false` and `secret=null` (`API/infrastructure/mongodb/user/MongoUsersDataSource.ts:230-235`); the user's Account page then shows the "Enable" card and the Users table shows the `Password` pill.
- Deleting a user removes membership from all groups; it does not touch entity permissions (no other call in `DeleteUsers.ts`).
- Activity log: every non-GET `/api/*` call is logged except login/recover/reset/unlock-account paths; passwords are masked (`app/api/activitylog/activitylogMiddleware.ts:6-20,34-47` (per prior inventory, not re-read)).
- Admin-triggered flows reaching public pages:
  - Password recovery email (from `Reset Password`): subject `Password recovery`; body `Your username is: {username}`, `To set your password click on the following link:`, link `{domain}/setpassword/{key}`, `This link will be valid for 24 hours.` (`API/domain/email/templates/passwordRecoveryEmail.ts:10-19`). Unknown email returns OK silently (`API/application/RecoverPassword.ts:23-24`), response `'OK'`; `POST /api/recoverpassword` needs no login.
  - Set-password page `/setpassword/:key` (`app/react/Routes.tsx:322`): optional info banner `To complete the account creation process, please create a password for your account` (when `?createAccount=true`), labels `Password`, `Repeat Password`, button `Save password`, error `Passwords don’t match` (curly apostrophe; also shown for an empty password) (`app/react/Users/ResetPassword.jsx:58-60,68,81,94,100`). On success: password updated, lock fields cleared, key deleted, redirect to `/login` (`API/application/ResetPassword.ts:21-36`).
  - Lock: after 6 failed logins the account is locked (`API/domain/user/Credentials.ts:3,69-71`) and an email `Account locked` is sent with link `{domain}/unlockaccount/{username}/{code}` (`API/domain/email/templates/accountLockedEmail.ts:10-19`); that link shows `Verifying...` then redirects to `/login` (`app/react/Users/UnlockAccount.jsx:33`). Admin `Unlock account` clears `accountLocked`, `accountUnlockCode`, `failedLogins` (`MongoUsersDataSource.ts:179-184`).

**10. Improvements to layer on**

- UX1, gap row "No search or filter in Uwazi": toolbar search (username, email) plus role and group filters; show an email line under the username since the table has no email column.
- UX2, gap row "Bulk footer when users selected": selection action bar with a count in a fixed slot; ladder = ghost `Reset Password`, ghost `Reset 2FA`, add `Add to group` and `Change role` (not in Uwazi), then divider, `Delete` in danger.
- UX4, gap row "Delete users": block self and last admin on the client; dialog states "removed from N groups". Gap row "Delete groups": impact line "N members lose this group".
- UX12, gap row "Table is wide": phone list rows (name, email, role pill).
- Design pattern 1 (list page), gap row "Empty table text": `EmptyState` with the create action instead of `NO DATA AVAILABLE`; loading rows while data loads.
- Design pattern 1, gap row "Row action": `Edit` revealed on hover/focus-within, row target opens the editor.
- Design pattern 3 (editor) + dirty guard, gap row "Closing the panel or switching tab discards": guard on Cancel, close, backdrop, tab switch, rail.
- Design (Users page), gap row "Groups multi-select": searchable multi-select (Uwazi shows every group as a popover checkbox with no search).
- Design, gap row "Group form": member picker gains search and select-all.
- Design, gap row "Users table": Admin pill in ink or vellum, not seal (seal is danger only); locked state needs a seeded locked user.
- Design verbs, gap row "Add user opens form": keep `Add user` on the bar, `New user` as the title, commit labelled per ladder; gap-matrix prototype-only row: drop "Invite user".
- Design destructive-confirm rule, gap row "Edit: Reset Password": add a confirm to the sidepanel `Reset Password` (Uwazi sends at once).
- Gap row "Groups table": correct plural for member counts (`1 member`), derive counts from membership ids; membership by id, not name (H1).
- UX11 (last-saved line) is not applicable to a sidepanel editor; none.

**11. Uwazi defects NOT to copy**

- Self-delete, own-role change and last-admin removal are blocked only by the server (`DeleteUsers.ts:39-56`, `UpdateUser.ts:50-62`). Corrected: untick/disable the current user's row for `Delete` with a tooltip `Users cannot delete themselves`; disable the role select on the current user's own record with the reason `Cannot change own role`; disable `Delete` and demotion that would leave no admin with `Cannot remove the last remaining admin`; never list or allow the system public user.
- Cross-field duplicate check: `isUnique` compares the typed value against both usernames and emails (`UserFormSidepanel.tsx:43-49`), so a username equal to someone's email is rejected with `Duplicated username`. Corrected: username against usernames, email against emails, both trimmed and case-insensitive (the server is stricter in the other direction only for case: exact match).
- `maxLength 256` on Email has no message (`getFieldError` has no case for it, `:75-85`): the field turns red with no text. Corrected: message for max length.
- Selection after a failed bulk action: state clears (`Users.tsx:264-270`) while the table keeps its checkboxes ticked until the data prop changes (`Table.tsx:171-178`), so the footer shows `Add user` over ticked rows (code-read). Corrected: keep the selection on failure; clear on success.
- Escape closes the sidepanel (document-level listener, `Sidepanel.tsx:116-127`) even when the password modal is above it. Corrected: Escape closes only the top layer.
- Groups pills in the user form can revert: `value` is rebuilt every render (`UserFormSidepanel.tsx:356`) and `MultiSelect` resets its state on every `value` change (`MultiSelect.tsx:95-97`), so pills may show the saved groups while the form value holds the change (code-read, not run). Corrected: pills always reflect the form value.
- Bulk success text is singular for many users (`Deleted user`, `Instructions to reset the password were sent to the user`), bulk Reset Password and Reset 2FA report only the first failure and give no per-user result (`index.ts:111-115,133-137`). Corrected: one summary (`N of M ...`) and the failed usernames.
- Duplicate error entries per failure (policy notification plus page `notify`, see shared mechanics). Corrected: one entry.
- Role pill shows the raw lowercase value `admin` while the select shows `Admin` (`TableComponents.tsx:36-45`). Corrected: same label in both (`Admin`, `Editor`, `Collaborator`).
- Ungrammatical confirm copy: `Do you want reset the password for the following users?` and `Do you want disable 2FA for the following users?`. Keep verbatim for parity; flag for a copy decision.
- Duplicate-username and duplicate-email server errors appear only as a notification, not on the field. Corrected: map to the field error (`Duplicated username`, `Duplicated email`).
- Group-name uniqueness on the server uses a regex from the raw name (`MongoUserGroupsDataSource.ts:84-92`); names with regex characters can mismatch (not run). Do not copy; compare normalised strings.
- Permissions row string has a trailing space (`PermissionsListModal.tsx:110`). Trim it.

---

### Account

**1. Screen map**

Route `/settings/account`, loader `GET /api/user` (`R/Account/createAccountLoader.ts:12-19`, `app/react/V2/api/users/index.ts:163-166`). Any logged-in role (admin, editor, collaborator): rail link has no role gate (`R/SettingsNavigation.tsx:30`); route guard is the parent logged-in guard (`app/react/Routes.tsx:324-325`). `GET /api/user` returns the session profile (`API/infrastructure/express/users/GetCurrentUserController.ts:3-8`): `_id, username, role, email, groups, using2fa, accountLocked`, never a password.

Top to bottom (`R/Account/Account.tsx:61-229`):
1. Header: breadcrumb title `Account` (en.csv:23) (`:64`).
2. One form (`id="account-form"`, `:66-71`) with three stacked cards, 1rem apart:
   - Card `General Information` (en.csv:553, default header colour), 2-column grid (1 column on phones): `Username` | `User Role` (both disabled), `Email` full width (`:72-109`).
   - Card `Change Password` (en.csv:187): `New password` | `Confirm new password` (`:110-136`).
   - Card `Two-Factor Authentication` (en.csv:1412). If `using2fa` is false: yellow header colour, a secondary button `Enable` (en.csv:455) on the left, text `You should activate this feature for enhanced account security.` (en.csv:1539) (`:154-175`). If true: default header colour, a disabled green button `Activated` (en.csv:32) and text `Your account's security is enhanced with two-factor authentication.` (en.csv:1542) (`:137-153`).
   - A hidden disabled submit button drives the form (`:177`).
3. Sticky footer (`:180-204`), left to right: red-outline link `Logout` (en.csv:696) (`<a href="/logout">`, full page load) then primary button `Update` (en.csv:1435).
   - `Update` is disabled while the form is not dirty (`disabled={!isDirty}`, `:199`). It is enabled as soon as email or a password field differs from the loaded values.
4. Overlay: 2FA setup sidepanel (mounted only when `using2fa` is false, `:207-209`); password confirmation modal.

2FA setup sidepanel (`R/Account/Components/TwoFactorSetup.tsx`): large size, 600px on md, 40% of the width on lg, with backdrop (`:85-91`, `Sidepanel.tsx:80-84`). Header: title `Two-Factor Authentication` rendered uppercase (`:86`), close X. Body is a 3-column grid (1 column on phones):
1. Card `Using Authenticator` (en.csv:1485), spans 2 columns: numbered list
   1. `Download a third-party authenticator app from your mobile store.` (en.csv:420) followed by non-translated italic muted text `(Google Authenticator, LastPass Authenticator, Microsoft Authenticator, Authy, etc.)` (`:96-105`);
   2. `Add an account to the app by scanning the provided QR code with your mobile device or by inserting the provided key.` (en.csv:42) (`:106-111`);
   then an italic muted paragraph `Instructions on how to achieve this will vary according to the app used, please refer to the app's documentation.` (en.csv:629) (`:113-118`).
2. Card `QR Code` (en.csv:1024), 1 column: QR image 180px, error level Q, black on white, lazy-loaded `qrcode.react`, `title="qr code"`, value = the `otpauth` URL (`:120-133`).
3. Card `Secret keys` (en.csv:1142), spans 3 columns: read-only copy field with label `You can also enter this secret key into your Authenticator app.` (en.csv:1532) and a second italic muted line `*please keep this key secret and don't share it.` (en.csv:4); a clipboard button (sr-only `Copy to clipboard`, en.csv:277; after click a check icon and a tooltip `Copied to clipboard`, en.csv:268, for 2 s) (`:134-149`, `C/UI/CopyValueInput.tsx:46-67`). Below it the token input (item 2) (`:150-167`).
4. Footer: `Cancel` (ghost, en.csv:171) and `Enable` (primary), equal width (`:171-180`).

Password confirmation modal: item 4.

**2. Fields**

Form validation mode `onSubmit` (`Account.tsx:36`). Validation runs when `Update` is clicked (`trigger()`, `:193-198`); the confirm modal opens only if valid.

| Label | Control | Placeholder | Help | Default | Validation and error | Server | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Username` (en.csv:1477) | text input, disabled, id `account-username` | none | none | current username | none (read-only) | cannot change here; the update call re-sends the same value | - | `:75-80` |
| `User Role` (en.csv:1475) | text input, disabled, id `account-role` | none | none | current role, raw lowercase (`admin`, `editor`, `collaborator`) | none | own role cannot change: `Cannot change own role` | - | `:83-89` |
| `Email` (en.csv:449) | text input (not `type="email"`), id `account-email` | none | none | current email | `required` and `validEmailFormat` (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) -> one message for both, in red under the field: `A valid email is required` (en.csv:16) | `z.string().email()` (zod default text (unverified)); unique, exact, checked only if changed -> `The email "{email}" already exists` | yes | `:91-106`; `app/react/V2/shared/formatHelpers.ts:53`; `API/application/UpdateUser.ts:68-70`; `API/domain/user/errors.ts:12-16` |
| `New password` (en.csv:792) | `type="password"`, id `new-password` | none | none | empty | none client-side; red text `Passwords do not match` (en.csv:937) appears under this field when the confirm field fails | non-empty string if present; blank is replaced by the old (undefined) value so it is not sent; no length or strength rule | no | `:113-125`; `app/react/V2/Routes/Settings/Account/Account.tsx:41`; `API/application/UpdateUser.ts:23` |
| `Confirm new password` (en.csv:250) | `type="password"`, id `confirm-new-password` | none | none | empty | `validate: val === watch('password')` -> error flag on both password inputs; message `Passwords do not match` shown under `New password` only. Passes when both are empty. | - | no | `:126-134`, error `:120-124` |
| `Enter your current password to confirm` (en.csv:460) | `type="password"` in the confirmation modal | none | none | empty | Accept disabled until length > 0 | bcrypt compare; wrong or missing -> 403 `Forbidden` | yes (to submit) | `C/UI/ConfirmationModal.tsx:88-106` |
| `Enter the 6-digit verification code generated by your Authenticator app` (en.csv:458), bold | text input, id `authenticator-token`, `autoComplete="off"` | none | none | empty | none; no digit mask or length check; `Enable` disabled only while empty; typing clears the error | `otplib` verify against the stored secret; failure -> 400 `Two-factor authentication failed.` | yes (to enable) | `TwoFactorSetup.tsx:150-162,176`; `API/application/EnableTwoFactorAuth.ts:21-28`; `API/domain/user/errors.ts:79-83` |
| Secret key (label above) | read-only text with copy button, id `authenticator-secret` | none | the two label lines | secret from the server | none | - | - | `:135-149` |

**3. Row actions and bulk actions**

No table. Actions:
- `Logout`: always enabled; navigates to `/logout`; server destroys the session and redirects to `/` (`API/infrastructure/express/users/LogoutController.ts:3-9`, `app/api/auth/routes.js:35`). No confirmation and no dirty check.
- `Update`: item 6. Disabled while not dirty.
- Card `Enable`: opens the 2FA sidepanel. Present only when 2FA is off.
- `Activated`: always disabled, status only.
- Panel `Cancel`: closes the panel (the typed token and error state stay in memory, `:173`). Panel `Enable`: item 6.
- No control exists for a user to turn 2FA off or to change username or role. Only an admin can reset 2FA (Users page). Bulk actions: none.

**4. Confirm dialogs and modals**

- Password modal (`Account.tsx:211-227`, `ConfirmationModal` normal style, size `md`): trigger = `Update` click after client validation passes. Title `Confirm` (en.csv:241). Body `Confirm action` (en.csv:243). Field `Enter your current password to confirm`. Buttons, in order: `Cancel` (ghost; closes the modal, nothing is sent), `Accept` (primary; disabled until the field is non-empty). Accept stores the typed password, clicks the hidden submit (which re-runs form validation), and closes the modal (`:217-225`). Header X = Cancel.
- 2FA setup sidepanel: item 1; no further confirm.
- No dialog for Logout.

**5. Empty / loading / error / notification states**

- Loading: global request loader, minimum 1000 ms (`requestStatusAtom.ts:26-49`). No skeleton.
- Loader error: route error boundary (`createAccountLoader.ts:17`). On the server-rendered path a missing session returns 401 `Unauthorized` (`app/react/V2/services/server/ServerUsersService.ts:47-57`), which leads to login.
- Success notifications: `Account updated` (en.csv:26) (`Account.tsx:53`); `2FA Enabled` (en.csv:10) (`TwoFactorSetup.tsx:81`).
- Error notifications: title `An error occurred` (en.csv:116) + server detail (`Account.tsx:46-51`; 2FA secret load failure `TwoFactorSetup.tsx:37-45`; 2FA enable non-400 `:70-76`). Wrong current password: detail `Forbidden`. Email in use: detail `The email "{email}" already exists`. Own role/other 401: 401 triggers a redirect to `/login` (`policies.ts:74-83`).
- 2FA wrong token (HTTP 400): inline red text `The token does not validate against the secret key!` (en.csv:1301) under the token field and the field takes the error style; no page notification from the component, but the global policy still raises `An error occurred` (code-read) (`TwoFactorSetup.tsx:64-68,163-167`).
- 2FA secret load failure: notification and the QR renders with an empty value, the secret field stays empty (`:37-45`).
- Validation errors: `A valid email is required`, `Passwords do not match` (item 2).

**6. Save**

Profile and password (`Update`):
1. Click `Update` (enabled only when dirty). Client runs `trigger()` on email and the password pair. Invalid: inline errors, stop.
2. Valid: password modal opens. `Cancel`: stop.
3. `Accept`: the hidden submit fires `handleSubmit`; `onSubmit` drops `passwordConfirm`, replaces a blank password with the profile's value (undefined, so it is omitted), then `usersService.upsert(user, currentPassword)` -> `POST /api/users` with the whole profile (`username, email, role, groups, using2fa`, optional `password`); `accountLocked` and `failedLogins` are stripped (`Account.tsx:39-43`, `app/react/V2/api/users/index.ts:7-18,42-49`).
4. Server (`API/infrastructure/express/users/routes.ts:20-25`): `needsAuthorization(['admin','editor','collaborator'])` -> password check (403 `Forbidden`) -> `UpdateUserController` (requires `username`, `email`, `role`; 201) -> use case: self-edit allowed; a non-admin editing another user = 401; role change on self = 400 `Cannot change own role`; validates email; unique-email check only when the email changed; re-hashes the password if present (bcrypt, 10 rounds); groups are applied only for admins and for self they are re-sent unchanged (`UpdateUser.ts:33-85`, `EncryptedPassword.ts:7`).
5. Success: notification `Account updated`; `revalidator.revalidate()` reloads the profile (`:53-54`).
6. Always, success or error: both password fields are reset (`resetField('password')`, `resetField('passwordConfirm')`, `:57-58`). On error the notification `An error occurred` + detail shows and the typed new password is lost.
7. The confirm modal is already closed at step 3 in all cases.

2FA enable:
1. Click `Enable` on the card: sidepanel opens. On first open only, `POST /api/auth2fa-secret` runs (`TwoFactorSetup.tsx:31-52`). Server (needs any of the 3 roles) fails with `Two-factor authentication is already enabled` if on; else generates a secret, stores it on the user immediately, returns `{secret, otpauth}`; the issuer in `otpauth` is the site name cut to 30 characters plus `...` (`API/application/GenerateTwoFactorSecret.ts:11-29`, `app/api/auth2fa/routes.ts:9-13`).
2. Scan or copy the secret; type the code in the token field.
3. Click `Enable` (disabled while the token is empty): `POST /api/auth2fa-enable {token}` (`:61-82`). Server verifies with `otplib`; failure `TwoFactorTokenInvalid` 400 (`EnableTwoFactorAuth.ts:17-31`).
4. 400: inline error, panel stays open. Other error: notification `An error occurred` + detail.
5. Success: revalidate, close the panel, notification `2FA Enabled`; the card flips to the `Activated` state.

**7. Dirty guard**

None: no `useBlocker` or `BlockDirtyNavigation` in `R/Account/**`. Leaving the page, clicking `Logout` or closing the 2FA panel discards edits silently. Exceptions: none. `Update` is disabled until dirty (`:199`); `isDirty` is measured against the defaults loaded at first render (code-read), so it likely stays enabled after a successful email change (unverified).

**8. Sort, filter, search, pagination**

None found.

**9. Propagation**

- Email change: used by password recovery and welcome mail and shown to admins in the Users sidepanel; admin `Reset Password` sends to the stored email (`api/users/index.ts:97-103`).
- `using2fa` flips after 2FA enable; the Users table `Protection` pill reads it (`TableComponents.tsx:21-34`); the next login asks for the token (login 409 branch, `app/api/utils/handleError.js:160-162`).
- Password change takes effect at the next login; other sessions are not signed out (no code does it) (code-read).
- The session user is re-read each request (`app/api/auth/passport_conf.js:10-25`); whether the navbar's own user atom refreshes after `revalidate()` is (unverified).
- Activity log records the `POST /api/users`, `auth2fa-secret` and `auth2fa-enable` calls, passwords masked (per prior inventory, not re-read).

**10. Improvements to layer on**

- Design pattern 2 (form page), gap row "One footer Update": footer commit with ghost `Discard changes`, commit disabled until dirty and reset to the saved value after save (fixes the stale dirty state); UX11 `Saved ...` line in the footer.
- Design pattern 2 + dirty guard, gap row "Dirty guard: none on Account": register the form with the guard (rail, breadcrumb, Logout, corpus switch).
- Design pattern 2 width, gap row "Field width": fields capped near 40rem.
- Gap row "User Role shown read-only": show the translated label (`Admin`, not `admin`).
- Gap row "Update opens a confirm modal": same `Modal`; mock check accepts any non-empty password.
- Gap row "Wrong token shows ...": keep the 6-digit sanitiser (better than Uwazi), same message.
- Gap row "Secret key shown in a copy input": real clipboard write.
- Gap row "Email editable": same message, `type="email"` keyboard on phones.
- Gap row "After enabling, card shows Activated": keep, no self-disable; admin `Reset 2FA` (Users page) clears the flag this card reads.
- Gap prototype-only rows: drop API keys unless Juan keeps them, drop the Disable-2FA button, drop the inline `Update password` button, drop editable Username.
- UX5 (undo in Beacon): not applicable; none.

**11. Uwazi defects NOT to copy**

- Password fields reset even when the save failed (`Account.tsx:57-58` runs after both branches), so a wrong current password loses the new password the user typed. Corrected: reset only on success.
- Email-in-use is a notification only (`The email "{email}" already exists`). Corrected: show it under `Email`.
- 2FA token state survives `Cancel` and close (`TwoFactorSetup.tsx:173`, state at `:24,29`): reopening shows the old code and error. Corrected: clear token and error on close.
- The secret is saved on the user the moment the panel opens, before any code is verified (`GenerateTwoFactorSecret.ts:26`), and is reused for the page session (`TwoFactorSetup.tsx:32`). Corrected in a prototype: generate a mock secret when opened, discard on Cancel, store it only on successful `Enable`.
- Token input accepts any characters and any length (`TwoFactorSetup.tsx:150-162`). Corrected: digits only, 6 characters, `Enable` disabled until 6.
- Wrong token gives two signals (inline text and the generic policy notification). Corrected: inline only.
- Role is shown raw and lowercase (`Account.tsx:86`). Corrected: translated label.
- Password confirm mismatch message sits under `New password` only, though both fields turn red (`:115,129,120-124`). Corrected: show it under `Confirm new password`.
- No minimum password length or strength rule anywhere (`UpdateUser.ts:23`); a note, not a defect to fix without a decision from Juan.
- `Logout` discards unsaved edits with no warning (`:182-189`). Corrected: run through the dirty guard.
- Duplicate error entries per failure (see shared mechanics). Corrected: one entry.
- `Update` can stay enabled after save (RHF default values are read once, `Account.tsx:34-37`) (unverified). Corrected: reset the baseline after a successful save.


---

# B5: Collection settings (`/settings/collection`) and Global CSS & JS (`/settings/customisation`)

Reference: `uwazi-ref` v1.229.224. All paths below are repo-relative to `uwazi-ref`. `C.tsx` = `app/react/V2/Routes/Settings/Collection/Collection.tsx`, `Tips` = `app/react/V2/Routes/Settings/Collection/collectionSettingsTips.tsx`, `Th/` = `app/react/V2/Routes/Settings/Collection/Theming/`, `csv` = `contents/ui-translations/en.csv`. Prior notes (inventory, gap-matrix) were re-checked against the code; differences are flagged.

Translation rule used for all copy: `<Translate>` shows the stored translation for its key when one exists, else its children (`app/react/I18N/Translate.tsx:61`). Text with `*x*` renders italic and `\n` renders a line break (`Translate.tsx:28-32,62-74`). Where `en.csv` differs from the code string, both are given; the csv text is what a fresh install seeds (unverified which one a given instance shows).

### Collection

#### 1. Screen map

Route: `/settings/collection`, admin only (`app/react/Routes.tsx:336-340`, `adminsOnlyRoute`). Loader reads settings, all templates, and uploaded custom files (`C.tsx:31-49`).

Page shell (`app/react/V2/Components/Layouts/SettingsContent.tsx`):
- Header, 3-part row `pt-5 pb-4 px-4`: below `lg` a back chevron to `/settings` with sr-only `Navigate back` (`SettingsContent.tsx:62-67`); breadcrumb with one item, title `Collection` (`C.tsx:185`).
- Body `px-4`, one `<form id="collection-form">` (`C.tsx:187`), five cards stacked, each `mb-4`. A card is a bordered panel: header strip `p-4 text-base font-semibold` with the title, body `p-4` (`app/react/V2/Components/UI/Card.tsx:34-47`). Inside cards the grid is `grid gap-4 sm:grid-cols-2 sm:gap-6`: one column below 640px, two at `sm` and up.
- Sticky footer: `sticky bottom-0 ... border-t px-4 py-3`, one button `Save` (primary variant, `type="submit" form="collection-form"`) (`SettingsContent.tsx:95-113`, `C.tsx:464-470`). Footer is left-aligned (`flex gap-2`).

Cards, top to bottom (L = left column, R = right column, FULL = `col-span-2`):

1. `General` (`C.tsx:188`)
   - Row 1: L `Collection Name` text input. R `Custom Favicon` picker (when the tenant flag `themeCustomization` is off) or, when on, a FULL `Theme and branding` summary card in place of the picker (`C.tsx:198-222`).
   - Row 2: L `Default View` select. R `Default date format` select (`C.tsx:223-242`).
   - Row 3 FULL: `Custom landing page` text input with a `https://yourdomain` prefix addon, "?" tooltip (`C.tsx:243-253`).
   - Rows 4-8, each FULL, one toggle row (switch, label, "?" icon): `Public instance`, `Hide restricted relationships from public`, `Show cookie policy`, `Global JS`, `Non-latin characters support` (last one only while not yet enabled) (`C.tsx:254-304`).
2. `Analytics` (title carries a "?" tooltip, placement right): L `Google`, R `Matomo` (`C.tsx:307-334`).
3. `Services` (rendered only when `settings.features.ocr.url` is set): one toggle `Document OCR trigger` (`C.tsx:335-349`).
4. `Forms and email configuration` (`C.tsx:350-404`):
   - L `Sending email`, R `Contact form email`.
   - FULL `Public Form submit URL`.
   - FULL toggle `Allow captcha bypass`.
   - FULL multi-select `Whitelisted templates`.
5. `Map` (`C.tsx:405-461`):
   - L `Map Provider` select, R `Map API key` input.
   - FULL multi-select `Map Layers`.
   - FULL map-and-coordinates control (370px high map, then `Latitude` and `Longitude` inputs side by side). No section label.

Toggle row anatomy: `flex gap-4 items-center`: 44x24px switch, label (`text-sm font-medium`), 20px `?` circle icon (`text-ink-muted`) with a hover tooltip, placement right (`app/react/V2/Routes/Settings/Collection/CollectionOptionToggle.tsx:24-37`). The switch has no text of its own (`{null}` child).

Label-with-tip anatomy (all non-toggle fields): `<span class="flex gap-4">` label then `?` icon (`C.tsx:147-154`). Tooltip is Flowbite `Tooltip`, light surface, `text-sm font-medium`, `px-3 py-2`, placement right (`app/react/V2/Components/UI/Tooltip.tsx:14-22`). Whether the icon is keyboard focusable is (unverified).

Mobile: under 640px every grid is one column; the map stays 370px high. No other phone behavior is coded.

#### 2. Fields

No field has an HTML `placeholder`. The only hint text is the `https://yourdomain` prefix addon on the landing page field and the multi-select empty text `No options` (`app/react/V2/Components/Forms/MultiSelect.tsx:36,192`, csv:829).

Columns: Control | Placeholder | Help text | Default | Stored as | Validation. "Tip:x" points to the verbatim tooltip block below the table.

**Card General**

| Label (verbatim) | Control | Placeholder | Help / tooltip | Default | Stored as | Validation: client / server | Cite |
|---|---|---|---|---|---|---|---|
| `Collection Name` | text input, label above, id `collection-name` | none | none | `Uwazi` on a fresh install | `site_name` | Client: `required: true`; failure = red border, red label, red-tint fill, no message, submit blocked with focus on the field. Server: `z.string().optional()`, empty string accepted | `C.tsx:191-196`; `app/api/core/application/settings/saveSettingsInput.ts:158`; default: `database/blank_state/uwazi_development/settings.bson` (binary, decoded by hand); error styling `app/react/V2/Components/Forms/InputField.tsx:51-64,107` |
| `Custom Favicon` (flag off) | hidden input plus picker: preview tile 3.5rem square on a checkerboard, buttons, modal (see section 4). Caption `Recommended: 16x16 to 512x512 px (square)` (`Recommended` is translated, rest is a literal) | none | Tip:favicon | empty (Uwazi logo is used) | `favicon` (URL like `/assets/<filename>`) | Client: file must come from Custom Uploads; strict size rule: square, 16 to 512 px each side; a wrong size is an error and cannot be picked. Server: `z.string().optional()` | `C.tsx:198-211`; `Th/CustomUploadImagePicker.tsx:75-114`; `Th/brandImageUploadRules.ts:3-11`; `Th/customUploadImagePickerLib.ts:20-25`; saveSettingsInput.ts:159 |
| `Theme and branding` (flag on; replaces the favicon picker) | summary card: preset chip, optional `Customized` chip, two accent swatches (light, dark), button `Edit theme` | none | none | `themeVars {}`, `themeAssets {}` (preset chip falls back to the default preset) | `themeVars`, `themeAssets`, plus `site_logo` and `favicon` copied on save | Server: `themeVars` is a string record, `themeAssets.preset` in `default`/`legacy` | `C.tsx:212-222`; `Th/ThemeSelectionCard.tsx:49-101`; saveSettingsInput.ts:161-181 |
| `Default View` | native select, id `roles` (duplicate id, see defects) | none | none | unset; select shows `Cards`; runtime treats anything but `table`/`map` as cards | `defaultLibraryView` | none client; server `z.string().optional()` (not an enum) | `C.tsx:224-234`; `app/react/Routes.tsx:143-163`; saveSettingsInput.ts:185 |
| `Default date format` | native select, id `date-format` | none | none | unset; select shows the first option `yyyy/MM/dd` (react-hook-form reads the DOM value on submit: unverified) | `dateFormat` (pattern string) | none client; server `z.string().optional()` | `C.tsx:235-242`; saveSettingsInput.ts:195 |
| `Custom landing page` | text input, id `landing-page`, left addon `https://yourdomain` | none (the addon is a prefix, not placeholder) | Tip:landing | unset = collection library | `home_page` | none client or server (`z.string().optional()`). At runtime the value is used only if it matches `^(/xx)?/(library(/map)?(/table)?/?(\?.*)?\|page/.+\|entity/.+)$`; otherwise the library opens with no message | `C.tsx:243-253`; `app/react/utils/routeHelpers.ts:5-13`; `app/react/getIndexElement.tsx:36-40`; saveSettingsInput.ts:184 |
| `Public instance` | toggle | n/a | `Check to make this instance public (non-logged in users can see public documents and entities)` | on only if `private` is false; a fresh install has `private: true`, so the toggle starts off | `private`, inverted: toggle on = `private: false` | none | `C.tsx:101,130,254-262`; `Tips:39-43` (csv:200); blank state `settings.bson` |
| `Hide restricted relationships from public` | toggle | n/a | Tip:filterUnauthorized | off | `filterUnauthorizedRelated` | none | `C.tsx:263-273`; `Tips:189-195` (csv:523) |
| `Show cookie policy` | toggle | n/a | `When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted.` | off | `cookiepolicy` | none | `C.tsx:274-284`; `Tips:45-50` (csv:1513) |
| `Global JS` | toggle | n/a | Tip:globalJS | off | `allowcustomJS` | none | `C.tsx:285-291`; `Tips:172-187` |
| `Non-latin characters support` | toggle, hidden once the stored value is truthy | n/a | Tip:characterSupport | off; fresh installs already have `newNameGeneration: true`, so the toggle is absent | `newNameGeneration`, only ever `true` (key deleted from the payload when off) | Server: `z.literal(true).optional()` | `C.tsx:121-123,292-304`; `Tips:82-108`; saveSettingsInput.ts:204 |

**Card Analytics** (card title tooltip: `If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo.`, `Tips:110-115`, csv:118)

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Google` | text input, id `google-analytics` | none | card tooltip above | unset | `analyticsTrackingId` | none (`z.string().optional()`) | `C.tsx:320-324`; saveSettingsInput.ts:193 |
| `Matomo` | text input, id `matomo-analytics` | none | card tooltip above | unset | `matomoConfig` (a JSON string `{"id":"...","url":"..."}`; the page gives no format hint) | none client or server; unparseable JSON is ignored silently at runtime | `C.tsx:327-331`; `app/react/V2/Components/Analitycs/Matomo.tsx:54-58`; saveSettingsInput.ts:194 |

**Card Services** (only if `features.ocr.url`)

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Document OCR trigger` | toggle | n/a | Tip:ocr | off | `ocrServiceEnabled` | none | `C.tsx:335-349`; `Tips:157-170` |

**Card Forms and email configuration**

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Sending email` | text input, id `sending-email` | none | `This is the email address that will appear as the sender when an email is sent from your Uwazi collection to registered users. The default address is *no-reply@uwazi.io*. You can set a custom one by including your desired email address here.` (the `*...*` renders italic) | unset (server mail falls back to a default sender) | `senderEmail` | none; no email-format check anywhere | `C.tsx:353-357`; `Tips:75-79` (csv:1175); saveSettingsInput.ts:183 |
| `Contact form email` | text input, id `receiving-email` | none | `If you have a contact form, this is the email address that will receive the form's submissions.` then a non-breaking space and a link `Learn how to add and configure a contact form on a webpage.` to `https://docs.uwazi.io/docs/how-to/managing-your-instance/create-and-manage-pages/#add-a-contact-form-to-a-page` (new tab, underlined) | unset | `contactEmail` | none; no email-format check | `C.tsx:359-368`; `Tips:52-68` (csv:1034,670); saveSettingsInput.ts:182 |
| `Public Form submit URL` | text input, id `public-form-destination` | none | `If you have configured a public form and would like a different Uwazi collection to receive the submissions, enter its URL here.` | unset | `publicFormDestination` | none; no URL check | `C.tsx:369-378`; `Tips:125-128` (csv:1017); saveSettingsInput.ts:191 |
| `Allow captcha bypass` | toggle | n/a | Tip:captcha | off | `openPublicEndpoint` | none | `C.tsx:379-389`; `Tips:141-149` (csv:179) |
| `Whitelisted templates` | multi-select card: 3rem header with label and a `+` button that opens a checkbox popover (options = all templates, label = template name, value = `_id`), then removable pills; empty text `No options` | `No options` (empty state, default prop) | `If you wish to include Public Forms on your pages, you must white-list the template IDs for which Public Forms are expected.` | empty list | `allowedPublicTemplates` (array of template ids) | none; server `z.array(z.string()).optional()`. The control is fed `settings.allowedPublicTemplates` from the loader, not the form value | `C.tsx:156-159,390-402`; `Tips:129-132` (csv:1018); `MultiSelect.tsx:99-197`; saveSettingsInput.ts:192 |

**Card Map**

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Map Provider` | native select, id `roles` (duplicate id) | none | none | unset; select shows `Mapbox`; runtime falls back to `mapbox` | `tilesProvider` | none; server `z.string().optional()` | `C.tsx:408-416`; `app/react/Map/MapContainer.tsx:27`; saveSettingsInput.ts:221 |
| `Map API key` | text input, id `map-key` | none | `An API key is required to use Mapbox or Google Maps.` | unset | `mapApiKey` | Client: `pattern: /^[a-zA-Z0-9._]+$/` with no message and no `hasErrors` binding, so a bad key blocks Save with only focus moving (empty value passes: react-hook-form skips `pattern` on empty, unverified). Server: `z.string().regex(/^[a-zA-Z0-9._]*$/)`, zod default message | `C.tsx:419-423`; `Tips:151-155` (csv:711); saveSettingsInput.ts:199-202 |
| `Map Layers` | multi-select card (same control as above), `canBeEmpty={false}` | `No options` | `Here you can configure the map layers that will be available in the maps.` (csv:713 stores the literal `Map layers description` as the value; unverified which shows) | selected: stored layers, else `Streets`. Fresh install stores `Streets`, `Hybrid`, `Satellite` | `mapLayers` (array of option values) | Client: emptying sets error `Map layers cannot be empty` (hard-coded, not in csv, never rendered as text; only `hasErrors` tint). The control disables the last checked box and the last pill's remove button, so this path is unreachable from the UI. Server: `z.array(z.string()).min(1)` | `C.tsx:161-175,426-445`; `Tips:135-139`; `MultiSelect.tsx:144-147,166`; saveSettingsInput.ts:203; blank state `settings.bson` |
| (no label; `Latitude`, `Longitude` inputs under a 370px map) | map click places a marker; two `type="number"` inputs (`step="any"`, min/max set), each with an X clear button (sr-only `Clear`), both clear the whole point | none | none (`Tips.mapAxis` `Set the default starting point for your geolocation properties.` exists but is not rendered) | server returns `[{ lon: 6, lat: 46 }]` when none is stored | `mapStartingPoint`: `[{ lat, lon }]` or `[]` | Client: lat clamped to -90..90, lon to -180..180, no message; `setValue` runs only if `lat && lon` is truthy, otherwise stores `[]`. Server: array of `{label?, lat: number, lon: number}` | `C.tsx:447-459`; `app/react/V2/Components/Forms/Geolocation.tsx:54-135`; `app/shared/geolocationCoordinates.ts:1-4,25-36`; `app/api/core/application/settings/settingsDefaults.ts:4-12`; saveSettingsInput.ts:212-220 |

Tooltip copy (verbatim from code; line breaks as in source; `Tips` line numbers):

- **Tip:landing** (`Tips:5-18`, csv:649): `The landing page is the first page that visitors see when they come to your collection. The default landing page is your collection's library. You can set a different landing page by adding its relative URL here.` / `For example:` / blank line / `A page: */page/dicxg0oagy3xgr7ixef80k9*` / `A filtered view in Uwazi: */library/?searchTerm=test*` / `An entity: */entity/9htbkgpkyy7j5rk9*` / `A document: */entity/4y9i99fadjp833di*` / blank line / `Important: You must use relative URLs. These start with a forward slash and do not include the domain name. For example: In the address *https://yoursite.com/landingpage*, the relative URL is /landingpage`. csv differs on the document line: `A document: */document/4y9i99fadjp833di*` (csv:654); `/document/...` would not pass the runtime route check.
- **Tip:favicon** (`Tips:20-28`, csv:503): `A favicon is a small icon that represents your collection in browser tabs and bookmarks. The default favicon is the Uwazi logo. To use your own:` / blank / `1. Upload your icon in Custom Uploads if needed.` / `2. Open the favicon picker and pick a file (images from Custom Uploads only).` / `3. Reload the page to see your favicon in action.` csv step 2 reads `Click "Select favicon image" and pick a file (images from Custom Uploads only).`
- **Tip:filterUnauthorized** (`Tips:189-195`, csv:523): `By default, relationships pointing to restricted entities are visible to anonymous users but not linked. When enabled, these relationships are completely hidden, preventing public users from knowing restricted content exists.`
- **Tip:globalJS** (`Tips:172-187`, csv:1524): `With great power comes great responsibility!` / blank / `This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities.` / `It could also very easily break the app. Only write code here if you know exactly what you are doing.`
- **Tip:characterSupport** (`Tips:82-108`, csv:190-194): paragraph 1 `This option enhances support for non-Latin languages as the default languages of your collection. Selecting this option will update all template properties automatically. The process could take several minutes. Selecting this option will likely change the URLs of library filters. As a consequence, if you have menus or links using such URLs, they will probably stop working. You will need to update them manually. After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked.` (the code source has the same sentences, differing only in line wrapping); line break; bold `This process could take several minutes and will likely change URLs to library filters. If you have menus or links using such URLs, they will probably stop working after the update. You will need to update them manually.` (csv:193, shown bold via `<b>`); line break; `After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked.` (csv:194).
- **Tip:captcha** (`Tips:141-149`, csv:179): `By toggling this on you can allow users to submit to your whitelisted templates without having to fill a CAPTCHA. The form will still present the captcha to end users, but API end-point will allow submissions without CAPTCHA validation if a header "Bypass-Captcha: true" is sent along. This option is insecure and can be leveraged to flood your instance with spam or malicious content.` (csv wording; the code source has stray backticks and `&ldquo;` entities around the header name, which is a cosmetic bug).
- **Tip:ocr** (`Tips:157-170`, csv:880-881): `This will enable the Optical Character Recognition (OCR) functionality for PDF documents. This service will recognize text inside images, such as scanned documents and photos, and convert it into machine-readable text data.` / line break / `When activated, this will enable administrator and editor users to send PDF documents to the OCR service.`

Unused tooltip exports in `Tips`: `customSiteLogo`, `mapAxis`, `emails[0]` (`Here you can set up the contact email and the email that appears when Uwazi sends a notification to a user`), `publicForm[0]` (`Here you can configure the public form destination and the whitelisted templates`) (`Tips:30-37,69-74,117-133`).

#### 3. Select option lists

Default View (`C.tsx:227-231`, csv:183,708,1263), label then value:
1. `Cards` (`cards`)
2. `Map` (`map`)
3. `Table` (`table`)

Default date format (`C.tsx:51-87`). Built from today's date; label is `<date> (<Y>/<M>/<D> words)`, where `Year`, `Month`, `Day` are translated (csv:1529,760,354). Example for 2026-10-04:
1. `yyyy/MM/dd`: `2026/10/04 (Year/Month/Day)`
2. `dd/MM/yyyy`: `04/10/2026 (Day/Month/Year)`
3. `MM/dd/yyyy`: `10/04/2026 (Month/Day/Year)`
4. `yyyy-MM-dd`: `2026-10-04 (Year-Month-Day)`
5. `dd-MM-yyyy`: `04-10-2026 (Day-Month-Year)`
6. `MM-dd-yyyy`: `10-04-2026 (Month-Day-Year)`

The stored value is the pattern in the first column; month and day are zero-padded in the labels.

Map Provider (`C.tsx:411-414`, csv:716,558): `Mapbox` (`mapbox`), `Google` (`google`).

Map Layers (`C.tsx:161-175`, csv:336,1240,1104,588). Popover order: `Dark` (`Dark`), `Streets` (`Streets`), `Satellite` (`Satellite`), `Hybrid` (`Hybrid`). Selected layers show as pills in selection order; a map with more than one layer gets a layer switcher bottom-right (`app/react/Map/LMapSetup.ts:46-49`). Provider tiles: Mapbox Streets `mapbox/streets-v12`, Satellite `mapbox/satellite-v9`, Hybrid `mapbox/satellite-streets-v12`, Dark `mapbox/dark-v11`; Google `roadmap`, `satellite`, `hybrid` (`app/react/Map/TilesProviderFactory.ts:9-18`). With provider Google the map drops `Dark` at render, but the setting still lets it be selected (`MapContainer.tsx:31-33`).

Whitelisted templates: options are the collection's templates (`label = name`, `value = _id`), no fixed list.

#### 4. Confirm dialogs and modals

Confirm dialogs on this page: none found. The one-way `Non-latin characters support` switch, the `Public instance` toggle and the Global JS toggle commit with no confirmation.

**Favicon picker modal** (flag off; `Th/CustomUploadImagePickerModal.tsx:39-110`). Opens from the `Choose` / `Change` button. Modal width `xxl` = `max-w-2xl`, min 36rem from `sm` (`app/react/V2/Components/UI/Modal.tsx:32`).
- Title: `Select favicon image` (csv:1151). Close button: icon X with `aria-label="Close modal"` (`Modal.tsx:108`).
- Picker row behind the modal: empty value shows one secondary button with an upload icon and `Choose`; a set value shows the preview tile, an amber/red warning icon button when the current image breaks the size rule (tooltip = the feedback message), the button `Change` and a danger-secondary button `Clear` (clears the value in the form only) (`Th/CustomUploadImagePicker.tsx:59-113`; csv:202,186,207). Button labels are sr-only below `sm`.
- Body, in order:
  1. Dropzone box (single file; accepts `.avif .bmp .gif .ico .jpg .jpeg .png .svg .webp`): cloud icon, bold underlined `Browse files to upload`, then `or drop your files here.` (csv:165,912) (`CustomUploadImagePickerModal.tsx:10-12`; `app/react/V2/Components/Forms/FileDropzone.tsx:78-93`). Dropped files show as chips `<name> - <size>` with an X (sr-only `Delete`); a total line `Size: <n>` (csv:1215) (`FileDropzone.tsx:95-122`).
  2. Progress line while uploading: `Uploading {filename} {progress}%` (csv:1459) (`CustomUploadImagePickerModal.tsx:72-79`).
  3. Feedback paragraph (red for error, amber for warning): `Image doesn't match the required size. Actual: {W}x{H} px. Expected: square 16x16 to 512x512 px` (csv:597; `Th/customUploadImagePickerLib.ts:55-67`). `Actual:` and `Expected:` are literals, not translated.
  4. Gallery (`Th/GallerySection.tsx:8-88`): heading `Select an existing image` (csv:1150) then a grid (1/2/3/4 columns from phone to `lg`) of thumbnail buttons on a checkerboard, each captioned `originalname` or `filename`; the image matching the current value has a primary-colour ring. Only images that already pass the size rule are listed; the check loads every image to read its size.
     - Empty gallery (no image files in Custom Uploads): hint key `Favicon no images hint`. Its csv value is the same text, so the screen shows `Favicon no images hint` (csv:508; a bug).
     - While sizes are checked: `Checking which images fit the requirements` (csv:201 adds `...`).
     - None fit: `No uploaded images fit the requirements` (csv:855 has the longer `No uploaded images match these size requirements. Upload a new image or use an editor to resize an existing file.`).
- Footer: one `Cancel` button (secondary) (csv:171).
- Behavior: picking a thumbnail validates its size; an `error` keeps the modal open and shows the message; otherwise the form value is set and the modal closes (`Th/useCustomUploadImagePickerLogic.tsx:52-64`). Dropping a file validates its size first and uploads only files that pass, immediately and independent of Save, to `POST /api/files/upload/custom` (admin only), then notifies, refreshes the loader data, re-validates and selects the file and closes (`useCustomUploadImagePickerLogic.tsx:117-157`; `app/api/customUploads/infrastructure/http/routes.ts:9-17`). Notifications: success `Uploaded custom file` (csv:1456), error `An error occurred` (csv:116), both through the notification bridge (`useCustomUploadImagePickerLogic.tsx:100-115`). The uploaded file stays uploaded if the form is never saved.

**Theme panel** (flag `themeCustomization` on only; deferred, summary). Env flag `FEATURE_FLAG_THEME_CUSTOMIZATION` (`app/api/config.ts:203`), exposed to the client as `themeCustomization` (`app/api/core/application/settings/publicSettings.ts:63-66`).
- Card in General: title `Theme and branding`, preset chip (`Uwazi Design`, `Legacy Uwazi` or `Custom pair`: `app/react/V2/theme/tokens.ts:377,387,397`), chip `Customized` when any override exists, two accent swatches, button `Edit theme` (`Th/ThemeSelectionCard.tsx:55,79,99`).
- Sidepanel (large, with overlay), title `Theme and branding`, footer button `Done` (primary, only closes; edits live in form state) (`Th/ThemeSettingsSidepanel.tsx:41-46,131-137`).
- Sections in order: `Theme presets` (preset cards); `Live preview` with `Light`/`Dark` switch and an alert `Accessibility checks need attention`; collapsible `Advanced colors` with button `Import theme instance file` (errors `Theme instance file invalid`, success `Theme colors imported`), toggle buttons `Simple mode` / `Full mode`, a `Chrome header` group, `Reset` per group (`app/react/V2/Components/ThemeSelector/ThemePresetSection.tsx:81`, `ThemePreviewSection.tsx:79,99`, `ThemeColorsSection.tsx:78,99,114,122`, `ThemeSelector.tsx:137,142,153`); then `Theme logotype` with pickers `Light Theme` and `Dark Theme` (modal title `Select site logo image`, caption `Recommended: 48x16 to 800x256 px`, soft rule: out-of-range is a warning, not blocked), and `Theme favicon` with the same two pickers (modal title `Select favicon image`, strict rule) (`ThemeSettingsSidepanel.tsx:22-25,64-125`).

#### 5. Empty / loading / error states

- Loading: none on the page. Data arrives through the router loader; the global request indicator is the only feedback. A failed templates request throws to the route error boundary (`C.tsx:41`). A failed settings request is not handled: `const [raw] = await SettingsAPI.get(headers)` then destructures `raw`, which would throw on `undefined` (`C.tsx:34-36`, `app/react/V2/api/settings/index.ts:10-20`).
- Empty states: no copy for the page. Whitelisted templates / Map Layers with no selection show `No options` in muted text (`MultiSelect.tsx:192`). Services card absent without an OCR URL (`C.tsx:335`). Favicon gallery empty: see section 4.
- Field error styling (`InputField.tsx:60-62`, `Label.tsx:42`, `Select.tsx:42-60`, `MultiSelect.tsx:69-77`): red border (`border-emphasis`), `bg-seal-tint`, `text-seal`, label turns `text-seal`. No error message text is rendered anywhere on this page (`errorMessage` is never passed).
  - `Collection Name` empty: red styling, submit blocked, focus on the field.
  - `Map API key`: no styling (no `hasErrors`), submit blocked, only focus moves.
  - `Map Layers`: tint only, and unreachable (section 2).
  - Server errors: only the notification below.
- Save error notification: type `error`, title `An error occurred`, details `error.message`; for a rejected body this is `Request failed with status code 422: ` plus the server's inspected zod error text (`C.tsx:133-139`; `app/shared/JSONRequest.js:150-157`; `app/api/utils/handleError.js:122-126`). Unknown keys fail the whole request (schema is `.strict()`, `saveSettingsInput.ts:222`).
- Success notification: type `success`, title `Settings updated` (code, `C.tsx:142`); csv value is `Settings updated.` with a period (csv:1187). The notification goes to the Beacon flash (title only, truncated to a 10rem width) and the notifications panel (`app/react/V2/Components/UI/Notifications/NotificationFlash.tsx:50-57`).

#### 6. Save

Order of events on `Save` (`C.tsx:119-145`):
1. `handleSubmit` runs client validation (`required` on `site_name`, `pattern` on `mapApiKey`). On failure nothing is sent, nothing is announced, focus goes to the first invalid field (`C.tsx:116,193,422`).
2. Payload = shallow copy of every form value. The form's values are the loader settings minus `links` and `custom`; that includes `_id`, `__v`, `languages`, `filters`, `features`, `customCSS`, `customJS`, `mailerConfig`, `themeVars`, `themeAssets` (`C.tsx:96,110-117`; admin projection `publicSettings.ts:5-46`).
3. If `newNameGeneration` is falsy the key is deleted (server accepts only `true`) (`C.tsx:121-123`).
4. If `themeCustomization`: copy `themeAssets.siteLogo.light` to `site_logo` and `themeAssets.favicon.light` to `favicon`, only when non-empty (`C.tsx:124-129`).
5. Invert `private`: `payload.private = !payload.private` (`C.tsx:130`). The form was seeded inverted at render (`C.tsx:101`).
6. Remove the `themeCustomization` flag (`C.tsx:131`).
7. `POST /api/settings` through `SettingsAPI.save` (`app/react/V2/api/settings/index.ts:22-33`, `app/react/Settings/SettingsAPI.ts:6-8`).
8. Server (`app/api/core/infrastructure/express/settings/routes.ts:10`, `SaveSettingsController.ts:6-13`, `app/api/core/application/SaveSettings.ts:19-34`, `SettingsService.ts:29-37`, `app/api/core/domain/settings/Settings.ts:137-143`):
   - `needsAuthorization()` (admin session).
   - zod strict parse (`saveSettingsInput.ts:153-242`), 422 on failure.
   - In one transaction: reconcile menu-link and filter translations, `Object.assign` every posted key (except `_id`, `__v`) onto the stored settings, persist.
   - Emit `SettingsChangedEvent` with the changed top-level keys (`app/api/core/domain/settings/SettingsDiff.ts:17-26`). Listener `BroadcastSettingsChanged` runs as a queued privileged job and emits socket event `updateSettings` with the public projection to every connected session of the tenant (`app/api/core/infrastructure/listeners/BroadcastSettingsChanged.ts:17-28`).
   - After the transaction, when `newNameGeneration` just went from falsy to true and a default language exists: `TemplateFacade.applyNewNameGeneration(defaultLanguage)` updates every template one by one with `reindex: false`. It runs inside the request, awaited before the response, not as a queued job (`SaveSettings.ts:28-33`; `app/api/core/infrastructure/facades/TemplateFacade.ts:110-116`).
   - Activity log entry `Updated settings` (`app/api/activitylog/activitylogParser.ts:20`).
   - Response: fresh settings (admin projection for an admin actor) (`SettingsQueryService.ts:27-29`).
9. Client, success: merge the response into `settingsAtom` (`mergeClientSettings`; drops CSS/JS from the atom, `app/react/V2/atoms/mergeClientSettings.ts:4-16`), notify `success` / `Settings updated`.
10. Client, error: notify `error` / `An error occurred` + details.
11. Both paths: `revalidator.revalidate()` re-runs the loader (`C.tsx:144`). Form defaults are not reset, so text fields keep what was typed, the multi-selects re-read the loader value, and `Save` stays enabled.
12. Other open sessions receive `updateSettings` and merge it into their atom (`app/react/App/sockets.js:82-85`). The navbar title, nav label for Global CSS & JS and the Library default view update without reload; the favicon needs a reload (tooltip says so).

#### 7. Dirty guard

None on this page. No `useBlocker` / `BlockDirtyNavigation`; leaving with unsaved edits loses them silently (`C.tsx` imports at lines 1-27). The "Global CSS & JS" page has one (see below).

#### 8. Propagation

- `site_name`: browser title suffix `%s • {siteName}` and the navbar logo link text (`app/react/App/SiteName.tsx:80,103`); 2FA label (`app/api/core/application/GenerateTwoFactorSecret.ts:22`); welcome email (`SendWelcomeEmail.ts:36`); contact mail sender data (`SettingsDataSource.ts:5`).
- `favicon`: `<link rel="icon">` in the page head (`SiteName.tsx:82-89`, `app/react/App/Root.jsx:58-97`). The logo (`site_logo`) shows only when the theme flag is on (`SiteName.tsx:70`).
- Landing page and default view at `/`: `getIndexDescriptor` picks page, entity, library with query, redirect, or the library default; an invalid or empty `home_page` falls back to the library (`app/react/getIndexElement.tsx:36-91`; `app/react/Routes.tsx:137-167`). `defaultLibraryView` (`table`, `map`, else cards) decides the library mode at `/`, plus the footer/menu library link (`app/react/App/Menu.tsx:83`, `app/react/App/Footer.jsx:44`, `app/react/V2/Components/UI/Header/Header.tsx:81`).
- `dateFormat`: date inputs in entity forms and library date filters (`app/react/Metadata/components/MetadataFormFields.jsx:231-243`, `app/react/Library/components/FiltersFromProperties.jsx:194`); CSV import and export (`app/api/csv.v2/application/jobs/CsvImportEntitiesContextLoader.ts:69`, `app/api/csv/typeFormatters.ts:41`).
- `private` (true = private): anonymous requests redirect to `/login`, and `/api/`, `/files/`, `/assets/`, `/uploaded_documents/` return 401 (`app/api/core/infrastructure/express/middlewares/PrivateInstanceMiddleware.ts:15-36`); `/` shows the login form (`Routes.tsx:138`); library nav link hidden for anonymous users (`Header.tsx:86`); SSR omits templates, thesauri and relationships for anonymous users (`app/react/entry-server.tsx:196-198`); route guard `privateRoute` (`app/react/ProtectedRoute.tsx:30-31`); dataviz embeds need `embedPublic` (`app/shared/embed/canUseExternalEmbed.ts:7`).
- `cookiepolicy`: shows the consent banner with `accepted` / `essential` / `rejected` choices and a footer link `Cookie preferences` (`app/react/App/Cookiepopup.jsx:26-48`, `Footer.jsx:67-77`). Google and Matomo scripts load only when consent is `accepted` (`app/react/App/cookieConsent.ts:38`, `GoogleAnalytics.jsx:17`, `Matomo.tsx:57`). Consent can be set only through the banner, so with the policy off analytics never load (verified by reading all `setConsent` callers).
- Analytics: gtag script and config for `analyticsTrackingId` (`GoogleAnalytics.jsx:17-38`); Matomo tracker from `matomoConfig` JSON `{id, url}`, combined with a tenant-level Matomo when present (`Matomo.tsx:48-90`).
- Map: provider, key, layers and starting point feed every map: library map, entity geolocation fields and this page's picker (`app/react/Map/MapContainer.tsx:26-33`, `TilesProviderFactory.ts:9-18`).
- `allowcustomJS`: nav label `Global CSS & JS` vs `Global CSS` (`app/react/V2/Routes/Settings/SettingsNavigation.tsx:111-120`), JS tab on the customisation page, `customJS` injected in `<head>` for every page (`Root.jsx:160-164`).
- `filterUnauthorizedRelated`: entity queries drop relationships to restricted entities for public users (`app/api/core/application/EntitiesQueryService.ts:180`).
- `ocrServiceEnabled`: OCR button in the viewer and server-side OCR gating (`app/react/Viewer/components/OCRStatus.tsx:22`, `app/api/services/ocr/OcrManager.ts:44`).
- `openPublicEndpoint`: public form API accepts header `Bypass-Captcha: true` (`app/api/auth/publicAPIMiddleware.ts:6-9`). `allowedPublicTemplates` and `publicFormDestination`: public submission whitelist and proxy target (`app/api/files/jsRoutes.js:52-61,92-94`). `contactEmail`, `senderEmail`: contact form and outgoing mail (`SettingsDataSource.ts:5`).

#### 9. Improvements to layer on

UX numbers are the "Improvements beyond 1:1 parity" list in `settings-ux-audit.md`; "Pattern 2" is its Form page rule; gap-matrix rows are in `gap-matrix.md` (Collection section, lines 229-257).

- Form page shell: form column capped near 40rem, sections as h3 + one-line description + fields; single column on phones. Pattern 2 and UX12; gap-matrix:255.
- One Save in the footer with a ghost `Discard changes` plus the commit, enabled only when dirty, reset after save. Pattern 2; gap-matrix:252.
- Dirty guard on rail and navbar clicks. Pattern 2, audit Summary 1; gap-matrix:252.
- Show the field messages Uwazi omits: required name, bad map key, empty layers, invalid landing page. gap-matrix:235,240,250,253.
- Landing page validation with the same route pattern the runtime uses, and a helper line listing the accepted forms. gap-matrix:240.
- Email-format check on `Sending email` and `Contact form email`. gap-matrix:248.
- Confirm dialog before `Non-latin characters support` with the impact stated (count of templates and properties that will be renamed); keep a read-only enabled status row instead of removing the control. UX4, audit Summary 3; gap-matrix:245.
- Last-saved line in the footer ("Saved 2 min ago by admin"). UX11.
- Tooltip copy becomes keyboard-reachable description text under the field (`SettingsField` description). gap-matrix:254.
- Rail group "Collection" holds this page. UX10; gap-matrix:951.
- Show loading rows or a skeleton while the corpus loads, not empty selects. Audit Summary 8; gap-matrix:229.
- Commit button follows the bar ladder (ink commit, ghost secondary). Audit Summary 6.
- Map starting point accepts 0 and shows a marker on the picker. gap-matrix:251.
- Image upload inside the picker writes immediately through the Uploads store (kept 1:1). gap-matrix:256.

#### 10. Uwazi defects NOT to copy

- Inverted `private`: the form flips the loader copy on render and flips back on submit (`C.tsx:101,130`). Store a positive `public` boolean (or keep one key and convert only at the field boundary), never mutate loader data. Fresh installs are `private: true`, so the toggle starts off.
- Lat/lon 0 treated as unset: `if (lat && lon)` (`C.tsx:451`) stores `[]` for latitude 0 or longitude 0, and clearing either input clears both. Test with `Number.isFinite` on both; keep a half-filled pair in local state and block only on save.
- One-way `Non-latin characters support` switch with no confirm: disappears after enabling, no way back, the only warning is a tooltip (`C.tsx:292-304`). Confirm first; show the enabled state afterwards.
- Whole-document POST: sends `languages`, `filters`, `features`, `customCSS`, `customJS`, `mailerConfig` with every save (`C.tsx:96,119-132`). A concurrent edit of CSS/JS from another session is overwritten. Send only changed keys.
- Silent errors: `site_name` required, `mapApiKey` pattern and `mapLayers` empty render no message; pattern failure has no styling at all (`C.tsx:193,422,435-437`). Render a message under each field and move focus.
- `mapLayers` empty error is unreachable because the last checkbox is disabled (`MultiSelect.tsx:144-147`); the message is hard-coded English, not in csv.
- Server accepts an empty `site_name` (`saveSettingsInput.ts:158`); the guard exists only in the client. Validate in the store too.
- Duplicate DOM id `roles` on `Default View` and `Map Provider` (`C.tsx:226,410`); use unique ids.
- Multi-selects read the loader value, not form state (`C.tsx:400,431`), and the fallback `['Streets']` is a new array every render, which can reset the control (unverified runtime effect). Bind both to form state.
- Theme flag on: clearing the light logo or favicon does not clear `site_logo` / `favicon`, because the copy runs only when non-empty (`C.tsx:125-128`).
- Analytics silently do nothing when `Show cookie policy` is off (see Propagation). Show a note on the Analytics card, or load analytics without the banner when the policy is off.
- Matomo field requires JSON with no format hint (`Matomo.tsx:54-58`); add a format hint and validate.
- `Favicon no images hint` is shown as the raw key (csv:508); write real copy.
- `Settings updated` (code) vs `Settings updated.` (csv): pick one. `Map layers description` csv value is the key itself (csv:713).
- `Dark` stays selectable under provider Google although it is dropped at render (`MapContainer.tsx:31-33`); disable it or note it.
- Invalid landing page is accepted and silently falls back to the library; the document example in the csv tooltip (`/document/...`) does not match the runtime check.
- Save stays enabled and nothing resets after save (`C.tsx:144`); no Discard.

### Global CSS & JS

Route `/settings/customisation` (`app/react/Routes.tsx:487-491`; page `app/react/V2/Routes/Settings/Customization/Customization.tsx`, `Cu.tsx` below). Admin only; nav label is `Global CSS & JS` when `allowcustomJS` is on, else `Global CSS` (`SettingsNavigation.tsx:111-120`, csv:555-556).

- Header title: `Global CSS & JS` when `allowcustomJS`, else `Global CSS` (`Cu.tsx:59`).
- Loader: settings, picks `allowcustomJS`, `customCSS`, `customJS`; on failure returns `{}` (`Cu.tsx:14-23`).
- Layout, flag on: tabs (group id `settings-customization`, both editors stay mounted, tab list `md:w-2/3 w-full`): `Custom CSS` (css editor), `Custom JS` (javascript editor) (`Cu.tsx:63-93`; csv:328,330). Flag off: no tabs; label `Custom CSS` (`font-medium`) above one CSS editor filling the height (`Cu.tsx:94-109`).
- Editor: Monaco, 2-space tabs, monospace font, `dir="ltr"`, bordered box; prefilled with the stored text; no toolbar, no validation, no help text (`app/react/V2/Components/CodeEditor/CodeEditorComponent.tsx:62-83,158`). While the editor chunk loads: `Loading ...` (`CodeEditor.tsx:12-17`, csv:691). If Monaco fails to start the area renders as an empty `div` (`CodeEditorComponent.tsx:140-142`).
- Warning text: none found on this page. The only warning about custom JS is the `Global JS` tooltip on the Collection page (Tip:globalJS above).
- Footer: right-aligned `Save`, `success` (green) variant, disabled until any edit (`Cu.tsx:113-117`). It sends `{ customCSS, customJS }` through `POST /api/settings`; an untouched editor sends `undefined`, which JSON drops, so only edited slices change (`Cu.tsx:40-45`).
- Dirty flag: set by any content change in either editor, cleared only on successful save (`Cu.tsx:30,73-77,86-90,52`). No reset-to-saved control exists.
- Notifications: success title `Saved successfully.` (code `Cu.tsx:50`, csv:1112); error title `An error occurred` with details `error.message` (`Cu.tsx:48`, csv:116). No loader revalidation after save; the atom is not updated (CSS/JS are applied through the server-rendered `<head>`, so a reload is needed to see the effect).
- Dirty guard: yes. `useBlocker(hasChanges)` opens a modal when a navigation is blocked (`Cu.tsx:31-38,120-122`). `ConfirmNavigationModal`, size `md` (`app/react/V2/Components/UI/ConfirmNavigationModal.tsx:15-38`): title `Discard changes?`; body `You have unsaved changes. Do you want to continue?`; footer: ghost `Cancel` (closes the modal, stays on the page, grows to half width) and primary `Discard changes` (proceeds with the navigation); the header X also cancels. csv:396-397,1537,171.
- Applied where: CSS in a `<style>` in the head of every page, JS in a `<script>` only when `allowcustomJS` is true (`app/react/App/Root.jsx:145-166`). CSS/JS are readable by anyone through the public settings payload (`publicSettings.ts:30-33`).
- Defects not to copy: the activity log stores the whole body, so full CSS and JS text (gap-matrix:388); save leaves the loader stale; each render re-registers a content listener because `onMount` is an inline function (`Cu.tsx:72,85`) (unverified effect); no error path when Monaco fails.
- Prototype rows: gap-matrix:374-392 (Global CSS & JS section), audit "Global CSS & JS" findings (gutter, Reset without confirm, Save stays enabled, no Discard), Pattern 2.


---

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


---

# B7 Implementation brief: Languages and Translations (real Uwazi Settings)

Reference: `uwazi-ref` (huridocs/uwazi `production`, v1.229.224). Read-only research, checked against code. Citations are `path:line`; `en.csv:N` = `contents/ui-translations/en.csv:N`.

Path aliases (repo-relative): `LANG/` = `app/react/V2/Routes/Settings/Languages/`; `TRN/` = `app/react/V2/Routes/Settings/Translations/`; `UI/` = `app/react/V2/Components/UI/`; `FORMS/` = `app/react/V2/Components/Forms/`; `RX/` = `app/react/`; `CORE/` = `app/api/core/`; `EXP/` = `app/api/core/infrastructure/express/`.

Conventions in Uwazi that apply to both pages:
- `<Translate>X</Translate>` and `t('System','X')` look up key `X` in the System context of the active UI language; a missing key renders the key text (English). `RX/I18N/Translate.tsx:36-60`, `RX/I18N/translateFunction.tsx:17-48`.
- Page shell: `SettingsContent` (header + body + sticky footer, parchment background). `app/react/V2/Components/Layouts/SettingsContent.tsx:22-113`. Header title strings are translated with the System context unless `contextId` is passed (`:31-47`). Below `lg` the header shows a back chevron to `/settings` with sr-only "Navigate back" (`:62-67`, en.csv:782).
- Table header cells render uppercase (`UI/Table/Table.tsx:302`). A sortable header toggles sort on click and shows chevrons (`:295-314`). Empty table body shows "NO DATA AVAILABLE" (`UI/Table/DefaultNoDataMessage.tsx:6`, en.csv:812).
- Legacy toasts (`notify(message,type,delay=1500)`) also push into the Beacon notification list through `bridgeNotify` (`RX/Notifications/actions/notificationsActions.js:9-21`). New-style notifications come from `useRequestStatus().notify` / `notifyBridge` (`RX/V2/atoms/requestStatusAtom.ts:144-154`, `RX/V2/utils/notifyBridge.ts:15-30`).
- Task panel strings: "Tasks", status labels `Running` / `Completed` / `Failed` (`RX/V2/Components/UI/Notifications/TaskItem.tsx:22-26`, `NotificationsPanel.tsx:115`; "Running" not in en.csv, "Completed" en.csv:235, "Failed" en.csv:499, "Tasks" en.csv:1275).

---

### Languages

Route `/settings/languages`, admin only (`RX/Routes.tsx:464-468`, `adminsOnlyRoute`). Rail link "Languages" (`RX/V2/Routes/Settings/SettingsNavigation.tsx:39`, en.csv:664) inside `NeedAuthorization roles={['admin']}` (`:30-41`). No feature toggle. Loader: `GET /api/languages` (`LANG/LanguagesList.tsx:31-34`, `RX/I18N/I18NApi.js:24-27`; endpoint public, `EXP/translation/routes.ts:40-42`).

#### 1. Screen map

Top to bottom (`LANG/LanguagesList.tsx:149-190`):
1. Header, breadcrumb with one item, title `Languages` (`:152`, en.csv:664). No description line.
2. One table in a white raised card. Card header (left): `Active languages` (`:159-161`, en.csv:34), semibold base text. No search, no filter, no pagination.
3. Footer (sticky, `border-t`, parchment): one primary button `Install Language(s)` (`:167-176`, en.csv:626). Always visible, never disabled. Opens the Install modal.

Table columns, in order (`:122-147`):

| # | Header text (verbatim) | Sortable | Width | Cell |
|---|---|---|---|---|
| 1 | `Language` (`LANG/components/TableComponents.tsx:56`, en.csv:657) | yes; default sort `label` ascending (`:163`) | `w-9/12` | `<label> (<key>)`, e.g. `Spanish (es)` (`TableComponents.tsx:52-54`). `label` is the English name stored in settings. |
| 2 | sr-only `Default language` (`TableComponents.tsx:58`, en.csv:361) | no | `w-1/12`, centered | Star icon button. Row is default: `variant="primary"` (filled), star in foreground colour. Otherwise `variant="secondary"` (outlined), star in primary colour. sr-only text `Default` (`:15`, en.csv:358). Always enabled; clicking the current default still sends the request. (`:9-24`) |
| 3 | sr-only `Reset language` (`:60`, en.csv:1084) | no | `w-1/12`, centered | Ghost button `Reset` (en.csv:1081), rendered only when `translationAvailable` is true for that language (`:39-50`); otherwise empty cell. |
| 4 | sr-only `Uninstall language` (`:62`, en.csv:1425) | no | `w-1/12`, centered | Ghost button `Uninstall` (en.csv:1424), rendered only when the row is not the default (`:26-37`); otherwise empty cell. |

Rows = `settingsAtom.languages` (installed languages) merged with the loader result for `translationAvailable` (`LANG/toTableLanguages.ts:5-21`, `LanguagesList.tsx:38-48`). The atom is kept live by socket `updateSettings` (`RX/App/sockets.js:82-85`). Row order before sorting = settings order.

Install Language(s) modal (`LANG/components/InstallLanguagesModal.tsx:48-90`, `UI/Modal.tsx:27-35` size `lg` = max-w-lg), top to bottom:
1. Header: `<h1>` `Install Language(s)` (`:52`) and a close X (`Modal.CloseButton`, aria-label "Close modal", `UI/Modal.tsx:108`).
2. Note, justified, secondary text: `This action may take some time while we add the extra language to the entire collection.` (`:57-59`, en.csv:1328).
3. Fixed-height (24rem, `h-96`) region with `MultiselectList` (`:60-66`): search input (placeholder `Search`, no visible label; `FORMS/MultiselectList/MultiselectList.tsx:366-379`, en.csv:1120), then a radio row `All` / `Selected (n)` (`:315-352`, en.csv:97, 1167), then the scrolling list.
4. List rows (`MultiselectListButtonItem.tsx:13-37`): full-width button on a warm background; left the label `[ * ]<label> (<key>)`, right a pill `Select` (primary) or `Selected` (green, row gets success border). Languages with `translationAvailable` carry a leading ` * ` in the label (`InstallLanguagesModal.tsx:25`). Rows are the catalog (about 186 languages, `app/shared/language/availableLanguages.ts`, alphabetical by English label) minus installed ones (`LanguagesList.tsx:45-47`). Row click toggles; multi-select; no "Select all" (`allowSelelectAll` not passed).
5. Footer (`:68-88`): legend line `* Available default translation` (muted small text; `*` literal then `<Translate>Available default translation</Translate>`, `:70-72`, en.csv:154), then two equal-width buttons: ghost `Cancel` (en.csv:171), primary `Install` followed by ` (n)` when n is at least 1 (`:77-85`, en.csv:625); `Install` is `disabled` while nothing is selected (`:82`).

Phone: same table, no special layout in code (header chevron only). Modal `lg` is `w-full`, so it fills the width (`UI/Modal.tsx:30`).

#### 2. Fields

No form. Controls on the page and in its modals:

| Label (verbatim) | Control | Placeholder | Help text | Default | Validation and error | Required | Cite |
|---|---|---|---|---|---|---|---|
| (hidden label) Install modal search | text input with clear X (sr-only `Clear`, en.csv:207) | `Search` | none | empty | none. Matches `label` only (not the key), case- and accent-insensitive (NFD, diacritics stripped), substring. Debounced 300 ms. | no | `MultiselectList.tsx:58-90,126,366-379`, `InstallLanguagesModal.tsx:22-30,64` |
| Install modal filter `All` / `Selected (n)` | radio pair | none | none | `All` | `Selected` radio disabled when nothing is selected | no | `MultiselectList.tsx:323-341` |
| Install modal list | multi-select list of rows | none | `* Available default translation` | none selected | `Install` disabled until at least one row is selected. Client sends `{key,label}` per selected row. Server (see Save): body must be an array of objects with required `key` and `label`, `key` in the ISO 639-1 enum, no extra properties. | at least one | `InstallLanguagesModal.tsx:36-40,82`, `EXP/translation/routes.ts:154-162`, `app/shared/types/commonSchemas.ts:240-260`, `EXP/language/AddLanguageController.ts:8-13` |
| `Please type in` `CONFIRM`: (Reset and Uninstall dialogs) | text input `id="confirm-input"` | none | none | empty | Accept stays disabled until the text equals the translated word `CONFIRM` exactly (case-sensitive; the word is `t('System','CONFIRM')`, so it follows the UI language, en.csv:242). No error text. | yes to enable accept | `UI/ConfirmationModal.tsx:67-86`, `LANG/LanguagesList.tsx:79` |

#### 3. Row actions and bulk actions

Bulk actions: none found (no checkboxes).

| Label | Enabled when | What it does |
|---|---|---|
| Star (sr-only `Default`) | always (also on the current default) | `POST /api/translations/setasdeafult` `{key}`; no confirm. On success notification `Default language change success`. (`LanguagesList.tsx:100-107`, `I18NApi.js:20-22`) |
| `Reset` | row has `translationAvailable` (11 languages: ar, el, en, es, fr, ko, my, ru, th, tr, uk; `contents/ui-translations/*.csv`) | Opens the Reset confirm. Accept calls `POST /api/translations/populate` `{locale}` (`LanguagesList.tsx:87-98`). |
| `Uninstall` | row is not the default (the button is absent on the default row). It is not disabled for a language that is still installing. | Opens the Uninstall confirm. Accept calls `DELETE /api/translations/languages?key=` (`:109-120`). |
| `Install Language(s)` (footer) | always | Opens the Install modal. |

#### 4. Confirm dialogs and modals

`ConfirmationModal`, non-danger variant, `size="md"` (max-w-md), used for both Reset and Uninstall (`LANG/LanguagesList.tsx:68-85`, `UI/ConfirmationModal.tsx:159-195`). Layout top to bottom:
1. Header `<h1>` `Are you sure?` (en.csv:139) with close X (calls Cancel handler).
2. Warning band (`role="alert"`, red-tinted, 4px red left edge): `Other users will be affected by this action!` (en.csv:917).
3. Body (secondary text): the confirm message.
4. Confirm field: label `Please type in` + non-breaking space + the word + `:` i.e. `Please type in CONFIRM:` (en.csv:956, 242), then the text input.
5. Footer, two equal-width buttons in order: ghost `No, cancel` (en.csv:861), then danger-variant accept button (disabled until the word matches). Variant is danger because a warning text is set (`ConfirmationModal.tsx:187`).

| Dialog | Trigger | Body text (verbatim) | Accept label | Cancel and close | Accept does |
|---|---|---|---|---|---|
| Reset | `Reset` on a row | `You are about to reset a language.` (`LanguagesList.tsx:89`; not in en.csv, renders as English in every UI language) | `Reset` (en.csv:1081) | `No, cancel` and X close the dialog, nothing sent | Closes the dialog, then `POST /api/translations/populate`; success text `Language reset success` (en.csv:660). |
| Uninstall | `Uninstall` on a row | `You are about to uninstall a language.` (`:110`; not in en.csv) | `Uninstall` (en.csv:1424) | same | Closes the dialog, `DELETE /api/translations/languages?key=<key>`; on 2xx registers task `Uninstalling language` (en.csv:1426); the end of the task comes from socket events (see 5). |
| Install | `Install Language(s)` | see Screen map | `Install (n)` | `Cancel` and X close; selection discarded (the modal unmounts) | Closes the modal first, then `POST /api/translations/languages`. |

The dialog unmounts on close (`LanguagesList.tsx:179-183`), so the typed word resets each time. Set default has no dialog.

#### 5. Empty / loading / error states

- Loading: route loader blocks the navigation until `GET /api/languages` returns (top loading bar from `api.js`); no skeleton. (`LanguagesList.tsx:31-34`, `RX/utils/api.js:148-166`)
- Empty: the table always has at least the default language. If it had none the body would read `NO DATA AVAILABLE`.
- Installing state: the new row appears at once (from `updateSettings`) with no "installing" marker, no disabled buttons. The only signal is the task in the Beacon panel: label `Installing languages` (en.csv:628), status `Running`, no progress number (`InstallLanguagesModal.tsx:44`, `notifyBridge.ts:36-41`).
- Install finished: socket `translationsInstallDone` ends task `language-install` as completed and shows a success toast `Languages installed successfully` (`RX/App/sockets.js:139-147`, en.csv:665).
- Uninstalling: task `Uninstalling language`; socket `translationsDelete` (language key) removes that language from the client translations atom (`sockets.js:160-166`); socket `translationsDeleteDone` ends the task and shows success toast `Language uninstalled successfully` (`:167-175`, en.csv:661).
- Error socket handlers exist but the server never emits them (see 11). Their texts: install `An error has occurred while installing languages:` as an `error` notification (en.csv:114) plus a legacy `danger` toast `An error has occured while installing languages:\n<errorMessage>` (typo in the key, en.csv:111); uninstall `An error has occurred while uninstalling a language:` (en.csv:115) plus legacy toast `An error has occured while deleting a language:\n<errorMessage>` (en.csv:110) (`sockets.js:149-158,177-186`). Both end the task as `Failed`.
- HTTP errors on the three immediate actions:
  - Set default and Reset go through `useApiCaller.requestAction`: any thrown error becomes a notification of type error, title `An error occurred` (en.csv:116), details = server `prettyMessage` (`RX/V2/CustomHooks/useApiCaller.ts:23-27,36-45`). Because `api.js` also dispatches a legacy toast for the same failure, two notifications appear (`RX/utils/api.js:134-146`).
  - Install and Uninstall call the API directly. `api.*` rejects on non-2xx, so the code branch `response instanceof FetchResponseError` (`InstallLanguagesModal.tsx:41-43`, `LanguagesList.tsx:114-116`) is never reached; the user sees only the legacy toast from `api.js` (status 409: warning with the server text; 400/422: danger with validation text; 500: `An error has occurred` plus request id; `api.js:74-100`). Unhandled promise rejection follows (unverified at runtime).
- Server texts that can reach the toast:
  - 409 `Language is still being installed or does not exist` (Uninstall on an installing or missing language; `EXP/language/DeleteLanguageController.ts:14-18,29-37`; not in en.csv).
  - 400 `Cannot delete the default language.` (`CORE/domain/settings/errors.ts:10-14`, mapped by `app/api/utils/handleError.js` DomainError to 400).
  - 400 `Language not found: {key}` (set default or delete of an unknown key; `errors.ts:4-8`).
  - 422 `Predefined translation for locale {locale} is not available` (Reset on a language without a CSV; `app/api/i18n/defaultTranslations.ts:38-40`, `EXP/translation/PopulateTranslationsController.ts:15-17`).
  - 422 request validation (schema failures; `routes.ts:114-181`).

#### 6. Save (per action)

There is no page Save. Each action is immediate. Ordered effects:

**Set default** (`POST /api/translations/setasdeafult`, route name misspelled in the API, `routes.ts:134-152`)
1. Client: `requestAction(I18NApi.setDefaultLanguage, {key}, 'Default language change success')` (`LanguagesList.tsx:100-107`). No dirty check, no confirm.
2. Server validates body `{key}` in the ISO 639-1 enum, admin only (`routes.ts:134-149`).
3. `SetDefaultLanguageUseCase`: `key` must exist (`Language not found: {key}`); sets `default: true` on that row and `false` on all others; one transaction with a `SettingsChangedEvent` (`CORE/application/SetDefaultLanguage.ts:23-35`, `CORE/domain/settings/Settings.ts:81-87`).
4. Event listener broadcasts socket `updateSettings` to the tenant (`CORE/infrastructure/listeners/BroadcastSettingsChanged.ts:20-27`); the table re-renders from `settingsAtom`.
5. Response is the settings JSON (`SetDefaultLanguageController.ts:10-11`). Notification (success): `Default language change success` (en.csv:362).
6. Effect elsewhere: the default is the source language for later installs (`AddLanguage.ts:27,39`) and the reference for "untranslated" in the Translations editor (`TRN/EditTranslations.tsx:199-200`).

**Install** (`POST /api/translations/languages`, body `[{key,label}]`, `routes.ts:154-167`)
1. Client: modal closes, then request; on 2xx `registerTask('language-install','Installing languages')` (`InstallLanguagesModal.tsx:34-46`).
2. Server: schema check (array of language objects, `key` enum), admin only; `AddLanguageController` re-parses with zod `{key,label}[]` (`EXP/language/AddLanguageController.ts:8-22`).
3. `AddLanguageUseCase` (`CORE/application/AddLanguage.ts:24-62`):
   1. Read settings and the current default language key (`:25-27`).
   2. Add each language not already installed; already-installed keys are skipped silently (`:28`, `Settings.ts:89-95`). If nothing is new it returns, the controller still answers 204 and no job runs (`:30`).
   3. Mark each new language `installing: true` (`:32-34`).
   4. One transaction (`:36-55`): save settings; for each new language clone every translation row of the default language into it (all contexts: System, Menu, Filters, templates, thesauri, relationship types), insert-only, so the new column starts as a copy of the default text (`CORE/infrastructure/mongodb/translation/MongoTranslationsDataSource.ts:109-122`); emit `LanguageAddedEvent` (listener adds a locale to every page, copying from the default language: `app/api/pages.v2/application/useCases/AddLanguageToPages.ts:24-40`); dispatch job `cloneLanguageEntities` with pairs `{from: default, to: new}`; emit `SettingsChangedEvent` (socket `updateSettings`).
   5. After the transaction, for each new language import the predefined System UI strings if `contents/ui-translations/<key>.csv` exists, overwriting the cloned System values; a missing CSV is swallowed (`:57-59`, `CORE/application/translation/ImportPredefinedTranslationsService.ts:15-32`, `app/api/i18n/defaultTranslations.ts:25-44`). The CSV must have 2 columns, no empty cells, headers `Key` and the language English label (`:29-33`).
4. Controller emits socket `translationsChange` with each new language's translations, then answers 204 (`AddLanguageController.ts:23-32,49-58`).
5. Background job `CloneLanguageEntitiesJob` (lock window 1 h): per pair, clone all entities of the default language into the new language in batches of 500 (`CORE/infrastructure/mongodb/entity/MongoEntitiesDAO.ts:203-243`), index them in search, queue preview-thumbnail jobs (chunks of 100 shared ids) for entities having a ready document file in that language, then set `installing: false` (`CORE/infrastructure/jobs/CloneLanguageEntitiesJob.ts:52-79`). When all pairs finish it emits socket `translationsInstallDone` (`:91-93`).
6. Post-save UI: task ends, toast `Languages installed successfully`; the language becomes usable in entity editors once `installing` is false (`RX/V2/Components/Metadata/EntityEditor/functions/entityTranslations.ts:20`).
7. Failure: on the last retry the job sets `installing: false` for all pairs and rethrows; no socket event is emitted (`CloneLanguageEntitiesJob.ts:80-89`).

**Uninstall** (`DELETE /api/translations/languages?key=`, `routes.ts:169-181`)
1. Client: confirm accepted, dialog closes, request, on 2xx `registerTask('language-uninstall','Uninstalling language')` (`LanguagesList.tsx:109-120`).
2. Server: `key` must exist and not be `installing`, else 409 (`DeleteLanguageController.ts:20-37`).
3. `DeleteLanguageUseCase` in one transaction: refuse the default (`Cannot delete the default language.`); save settings without the language; delete all translation rows of that language; emit `LanguageDeletedEvent` (listener removes the locale from pages); emit `SettingsChangedEvent`; dispatch job `deleteLanguageEntities` (`CORE/application/DeleteLanguage.ts:21-37`, `Settings.ts:104-110`).
4. Controller emits socket `translationsDelete` (key) then 204 (`DeleteLanguageController.ts:43-44`).
5. Job `DeleteLanguageEntitiesJob`: delete all entities of that language, delete the language from the search index, emit `translationsDeleteDone` (`CORE/infrastructure/jobs/DeleteLanguageEntitiesJob.ts:36-41`).
6. Post-save UI: row disappears when `updateSettings` arrives; task ends; toast `Language uninstalled successfully`.

**Reset** (`POST /api/translations/populate` `{locale}`, `routes.ts:114-132`)
1. Client: `requestAction(I18NApi.populateTranslations, {locale}, 'Language reset success')` (`LanguagesList.tsx:87-98`).
2. Server reads `contents/ui-translations/<locale>.csv` and runs the CSV translation loader with context `System` (`PopulateTranslationsController.ts:10-13`, `ImportPredefinedTranslationsService.ts:15-20`).
3. Loader writes only: installed languages whose English label matches a CSV column header, System context only, only keys that already exist for that language, only non-empty CSV cells. Other keys and all other contexts are untouched (`app/api/csv/csvLoader.ts:61-123`).
4. Response is that language's translations (`PopulateTranslationsController.ts:22`). No socket event is emitted, so other open sessions keep old UI strings until reload (inferred from `grep translationsChange`: emitted only on save, import and install).
5. Post-save UI: notification (success) `Language reset success`. The table does not change.

#### 7. Dirty guard

None found (no form, no `useBlocker` in `LANG/`). Exceptions: n/a. The Install modal discards its selection on close without asking.

#### 8. Sort, filter, search, pagination

- Table: sort on `Language` only (click header toggles; default ascending on `label`, i.e. the English name without the `(key)` suffix). Other columns not sortable (`enableSorting: false`, `LanguagesList.tsx:132,138,144`). No search, filter or pagination; all rows render.
- Install modal: search described in 2; list order = catalog order (alphabetical by English label); the `Selected (n)` radio shows only selected rows (`MultiselectList.tsx:262-277`). No pagination (scroll in a 24rem region).
- Empty search result in the modal: `No items available` (`MultiselectList.tsx:112,410-414`, en.csv:821).

#### 9. Propagation

- `settings.languages` (key, label, default, installing) is the single list used by: this table (`updateSettings` socket), the Translations list and editor columns (`TRN/EditTranslations.tsx:199`), the entity editors (installing languages excluded, `entityTranslations.ts:20`), pages (a locale per language, `AddLanguageToPages.ts`), and route language prefixes (`RX/Routes.tsx:539`).
- Translation contexts and where keys come from (full table in the Translations section): install copies every context from the default language; Reset overwrites System only; uninstall deletes every context row of that language.
- Install clones entities, files' previews and search index entries for the new language; uninstall deletes entities and index entries of that language.
- Set default changes only the `default` flag.

#### 10. Improvements to layer on

- Row menu (Make default, Reset, Uninstall) and Default as a badge instead of three action columns: UX12; gap-matrix Languages "List" row.
- Install modal on the shared `Modal` with `ModalSearchRow` and `ModalList`: shared pattern 7 in settings-ux-audit.md summary; gap-matrix "Install modal" row.
- Show an `Installing` marker on the row, disable Uninstall while installing, add a failed end state: no UX number in settings-ux-audit.md; gap-matrix Languages "Installing state" row (Design: states).
- Confirm before changing the default language, naming the effect: settings-ux-audit.md summary item 3; gap-matrix "Set default" row.
- Per-language counts of records and translated keys inside the Uninstall confirm: UX4; gap-matrix "Per-language content counts" row.
- Type-the-word confirm for Reset and Uninstall as in Uwazi; add counts: UX4; gap-matrix "Reset and Uninstall confirm" row.
- Phone: list rows instead of a 704px table: UX12; gap-matrix "Phone" row.
- Translated-percentage per language (derived from the Translations store): UX8; gap-matrix Languages "Prototype-only" table.
- One languages store read by Translations, Dashboard and Pages: gap-matrix "Propagation" row.

#### 11. Uwazi defects NOT to copy

- Install and uninstall error socket events `translationsInstallError` and `translationsDeleteError` have listeners (`sockets.js:149,177`) and no emitter anywhere in `app/`. A failed job leaves the task `Running` forever. Corrected: always end the task as `Failed` with a reason, and keep the row marked failed with Retry.
- Install with only already-installed keys returns 204, queues no job, and the client still registers `Installing languages`, which never ends (`AddLanguage.ts:28-30`). Corrected: filter installed keys client-side and finish the task when the server reports nothing to do.
- Task id is fixed (`language-install`); a second install replaces the first task and the first `translationsInstallDone` ends both (`InstallLanguagesModal.tsx:44`, `sockets.js:139-141`; inferred). Corrected: one task per language.
- Uninstall is offered on a language that is still installing and answers 409 with an English-only message (`DeleteLanguageController.ts:33-35`). Corrected: disable Uninstall while `installing`.
- Install and Uninstall error branch is dead code because `api.*` rejects; the modal has already closed and the rejection is unhandled (`InstallLanguagesModal.tsx:41-43`, `api.js:148-166`). Corrected: keep the dialog open until the request settles, show the error in it.
- Two notifications for one failure on Set default and Reset (legacy toast from `api.js` plus `useApiCaller` notify). Corrected: one.
- The star on the current default is clickable and shows `Default language change success` with no change (`TableComponents.tsx:9-24`). Corrected: disable it on the default row.
- Reset has no preview and overwrites customised System values for every key present in the CSV; the confirm body does not say which context changes. Corrected: say "System strings only" and offer a count.
- Reset does not broadcast `translationsChange` (`PopulateTranslationsController.ts:21-22`). Corrected: update every open session.
- Confirm bodies `You are about to reset a language.` and `You are about to uninstall a language.` are absent from en.csv, so they cannot be translated. Corrected: add keys.
- Two spellings of the same error text, `occured` and `occurred` (en.csv:110,111,114,115) and the route `setasdeafult`. Corrected: one spelling, one path.
- Install is not atomic across steps: settings and translations are saved in a transaction, entity cloning runs later, predefined strings are imported after the transaction (`AddLanguage.ts:36-59`). A crash between steps leaves a language with copied default text (inferred). Corrected: one state machine per language (installing, ready, failed).

---

### Translations

Routes: list `/settings/translations`, editor `/settings/translations/edit/:context`; both admin only (`RX/Routes.tsx:469-480`). Rail link "Translations" (`SettingsNavigation.tsx:40`, en.csv:1403). Loaders: list `GET /api/translations` (all languages, all contexts; `TRN/TranslationsList.tsx:22-25`, `app/react/V2/api/translations/index.ts:21-28`); editor `GET /api/translations?context=<id>` (all installed languages, that context only) plus settings (`TRN/EditTranslations.tsx:43-64`). The GET endpoint is public (`EXP/translation/routes.ts:23-38`); saves and imports are admin only.

#### 1. Screen map

**List** (`TRN/TranslationsList.tsx:69-101`), top to bottom:
1. Header title `Translations` (`:72`, en.csv:1403). No description, no footer, no toolbar, no search.
2. Table 1, card header `System translations` (en.csv:1262): contexts whose `type` is `Uwazi UI`.
3. Table 2 (1rem top margin, `mt-4`), card header `Content translations` (en.csv:262): every other context.

Both tables use the same columns (`:52-67`, `TRN/components/TableComponents.tsx:9-29`):

| # | Header text | Sortable | Width | Cell |
|---|---|---|---|---|
| 1 | `Name` (`TableComponents.tsx:9`, en.csv:773) | yes; both tables default `label` ascending (`:83,95`) | `w-1/3` | Context `label`, plain text (not translated in the cell). |
| 2 | `Type` (`:10`, en.csv:1419) | yes (no `enableSorting: false`); no default | `w-2/3` | Gray pill containing the type text translated via System context (`:21-27`): `Uwazi UI` (en.csv:1490), `Entity` (en.csv:467), `Thesaurus` (en.csv:1323), `Relationship Type` (en.csv:1050). Pill does not wrap. |
| 3 | sr-only `Action` (`:11`, en.csv:29) | no | auto | Link to `edit/<context id>` wrapping a ghost button `Translate` (`:13-19`, en.csv:1399). |

The row itself is not clickable; only the `Translate` button navigates.

Rows are built from the first language in the response only (`translations[0].contexts`, `TranslationsList.tsx:35`). A context with no non-empty value is dropped (`:41-43`). A table with no rows shows `NO DATA AVAILABLE`.

**Context types and names as shown in the list**

| Context id | Name column (label) | Type pill | Table | Keys (one row of values per key) come from | Created / kept in sync by |
|---|---|---|---|---|---|
| `System` | `User Interface` | `Uwazi UI` | System translations | `Key` column of `contents/ui-translations/en.csv` (one key per UI string; about 1,500 lines) | `scripts/updateTranslationsDB.js:54` (context definition) and release scripts/migrations (`app/api/migrations/migrations/207-backfill-translation-context/index.ts:91`) |
| `Menu` | `Menu` | `Uwazi UI` | System translations | title of each Menu link and sub-link | on Settings save: `CORE/application/settings/SettingsTranslationService.ts:82-100`; renamed titles rename keys, removed titles delete keys (`:16-72`) |
| `Filters` | `Filters` | `Uwazi UI` | System translations | `name` of each filter group (only entries that have `items`) | `SettingsTranslationService.ts:102-126` |
| template id | template name | `Entity` | Content translations | template name, the title property label, every property label (`CORE/application/templateTranslationService/TemplateTranslationService.ts:9-20`) | create `:29-38`; update (name and property-label renames move keys, deleted properties drop keys) `:40-64`; delete `CORE/application/DeleteTemplate.ts:67` |
| thesaurus id | thesaurus name | `Thesaurus` | Content translations | thesaurus name plus every value label, group children included (`CORE/application/thesaurusTranslationService/ThesaurusTranslationService.ts:46-57,178-184`) | create `:178-184`; update `:212-215`; delete `CORE/application/DeleteThesaurus.ts:28` |
| relationship type id | relationship type name | `Relationship Type` | Content translations | one key: the name (`RelationshipTypeTranslationService.ts:18-27`) | create, rename `:29-42`, delete `:44-46` |

`Menu`, `Filters` and `System` are stored with their own type but always reported as `Uwazi UI` (`CORE/application/translation/TranslationsQueryService.ts:10-15`). Allowed stored types: `Entity`, `Relationship Type`, `Uwazi UI`, `Thesaurus` (`CORE/domain/translation/Translation.ts:3`). Keys and contexts cannot be added or deleted from this page.

**Editor** (`TRN/EditTranslations.tsx:281-429`), top to bottom:
1. Header: breadcrumb `Translations` (link to the list) then the context label as title, translated inside the context itself (`SettingsContent.tsx:57-86`, `EditTranslations.tsx:284-288`). Title truncates at 20rem.
2. Toggle row (`:290-301`): switch (off by default) with label `Untranslated Terms` (en.csv:1434).
3. Form `edit-translations` (`:303-387`): one bordered card per key, in key order (case-insensitive `localeCompare` on the key, `advancedSort`, `:48-61`, `RX/utils/advancedSort.js:4`). Cards render lazily (`RenderIfVisible`, `:310`).
   - Caption: the key text, semibold (`:313-317`).
   - Header row (uppercase, small, muted): `Language` (en.csv:657), sr-only `Language Code` (en.csv:658), `Value` (en.csv:1493) (`:318-336`).
   - One row per installed language, in settings order (`TranslationsQueryService.ts:54-67`): column 1 the language autonym from `availableLanguages.localized_label`, e.g. `Español` (`:113-116`); column 2 a pill with the language key uppercased, e.g. `ES` (`TRN/components/LanguagePill.tsx:4-16`): primary for the default language, yellow for an untranslated value, gray for a translated one; column 3 a full-width text input (id `formValues.<languageIndex>.values.<keyIndex>.value`, no label, no placeholder) with a clear X (sr-only `Clear`) that sets the value to an empty string and marks the field dirty (`:351-368`; `InputField.tsx:163`).
   - Empty state (no cards): info box `There are no untranslated terms` (`:379-386`, en.csv:1314).
4. Footer (sticky; `:390-422`): left slot, only when the context id is `System`: ghost `Import` (en.csv:598) plus a hidden `<input type="file" accept="text/csv">` (`:393-411`). Right: ghost `Cancel` (en.csv:171; link to `/settings/translations`), primary `Save` (en.csv:1105; submit for the form). All three disabled while a submit is in flight (`isSubmitting`, `:197`).

There is no language selector, no per-language column picker and no search or filter other than the `Untranslated Terms` toggle. Translation status of a cell is computed from the loaded data, not from the live input (`:126-166`).

Status rule (`:126-140`): language is the default -> `defaultLanguage`; otherwise value equals the default language's value for the same key -> `untranslated`; else `translated`.

`Untranslated Terms` ON (`:174-185`): each key keeps only rows whose status is not `translated`; a key left with a single row (the default language alone) is hidden; if no key remains the info box shows. Hidden inputs keep their values (unverified: relies on react-hook-form `shouldUnregister` default).

#### 2. Fields

| Label (verbatim) | Control | Placeholder | Help text | Default | Validation rule and error message | Required | Cite |
|---|---|---|---|---|---|---|---|
| (hidden label) Value, one per key and language | text input with clear X | none | none | the stored value for that key and language | Client: `required: true`; error `This field is required` (en.csv:1341) under the input, shown after a submit attempt (`mode: 'onSubmit'`); Save sends nothing while any cell is empty. Server: body schema `locale` and `contexts` required, `values` map of strings (`EXP/translation/routes.ts:80-112`); empty strings are dropped, not saved (`CORE/application/translation/localeTranslationDto.ts:37-41`); the language must be installed (`ValidateTranslationsService.ts:44-53`); an existing key must exist (`Process is trying to update missing translation keys: {contextId} - {keys}.`, `TranslationsService.ts:80-84`); a new key must be sent for all installed languages (`the following key/context combination are missing translations\nkey: {key}, context: {contextId}, languages missing: {languages}`, `ValidateTranslationsService.ts:101-108`); a context needs id, type and label (`Cannot save translations for context "{id}" without type and label`, `SaveLocaleTranslations.ts:37-40`); `locale` required (`translation to save should have a locale`, `:27`). Server errors reach the user as notification title `An error occurred` plus `prettyMessage` details. | yes (client) | `TRN/EditTranslations.tsx:339-368,214-217` |
| `Untranslated Terms` | toggle switch | none | none | off | none | no | `:292-299`, `UI/ToggleButton.tsx:13-73` |
| (hidden) Import file | file input, `accept="text/csv"`, opened by `Import` | none | none | none | Client: only the `accept` attribute. Server: multipart upload plus body `context` required (`routes.ts:44-60`); CSV must have a `Key` column and one column per language English label (e.g. `Spanish`); everything else is ignored silently (`csvLoader.ts:61-123`). | no | `TRN/EditTranslations.tsx:270-279,403-409` |

#### 3. Row actions and bulk actions

| Label | Enabled when | What it does |
|---|---|---|
| `Translate` (list row) | always | Navigates to `/settings/translations/edit/<context id>`. (`TableComponents.tsx:13-19`) |
| Clear X (in a value input) | while not submitting | Sets that cell to an empty string and marks it dirty; Save then fails client validation (`required`). (`EditTranslations.tsx:356-358`) |
| `Import` (footer, System only) | not submitting | Opens the file picker; selecting a file uploads it immediately, no confirm (`:270-279`). |
| `Cancel` | not submitting | Link to the list; goes through the dirty guard. |
| `Save` | not submitting; not gated on dirty | Submits all values of the context. |

Bulk actions: none found. Add or delete key: none found (keys come from their sources). Export: none found.

#### 4. Confirm dialogs and modals

Only the dirty-guard modal (`UI/ConfirmNavigationModal.tsx:11-40`, size `md`), opened when `useBlocker(isDirty && !formIsSubmitting)` blocks a navigation (`TRN/EditTranslations.tsx:219-226,425-427`):
1. Header `Discard changes?` (en.csv:397), close X.
2. Body `You have unsaved changes. Do you want to continue?` (en.csv:1537).
3. Footer, two equal buttons: ghost `Cancel` (closes the modal; does not reset the blocker), primary `Discard changes` (en.csv:396; closes the modal and calls `blocker.proceed`, leaving the page).

Import has no confirm. Reset is not on this page (it is on Languages).

#### 5. Empty / loading / error states

- Loading: route loaders block navigation (top loading bar). Import runs `loadingBar.start()/done()` around the upload (`app/react/V2/api/translations/index.ts:75,90`). Save disables the three footer buttons and the inputs while `fetcher.state === 'submitting'` (`EditTranslations.tsx:197,355,398,414,418`).
- Empty list tables: `NO DATA AVAILABLE`.
- Empty editor: `There are no untranslated terms` (same text when the context has no keys and when the toggle hides everything).
- Save error: notification type error, title `An error occurred` (en.csv:116), details = server `prettyMessage` when present (`EditTranslations.tsx:230-237`). The legacy toast from `api.js` appears as well.
- Import error: same notification.
- Socket: `translationsChange` replaces a language's contexts in the client atom and `translationKeysChange` patches single keys (`sockets.js:107-134`); open editors do not refresh from them, only from the loader revalidation after their own action.

#### 6. Save (and Import)

**Save** (button `Save`)
1. Client: react-hook-form validates every registered input as required (`EditTranslations.tsx:367`). Any empty cell blocks the submit and shows `This field is required` on that cell.
2. `formSubmit`: builds one object per language with every key's current value (not only edited cells) from the form state, keeps `_id`, `__v`, `locale`, and the single context of the loader (`:93-109,262-268`). Submits as a router action with intent `form-submit` (`:66-77`).
3. Request: one `POST /api/translations` per language, issued in parallel with `Promise.all` (`app/react/V2/api/translations/index.ts:39-50`, `I18NApi.js:8-10`). Body `{_id, __v, locale, contexts:[{_id,id,label,type,values}]}`.
4. Server, per language (`CORE/application/SaveLocaleTranslations.ts:24-75`, admin only):
   1. Read existing rows of the context for that language to get its type and label and a snapshot of previous values (`:32-50`).
   2. Flatten to entries, dropping empty values (`localeTranslationDto.ts:26-49`).
   3. One transaction per language (`:62-72`): `saveEntries` splits entries into new and existing keys (`TranslationsService.ts:27-107`); existing keys go through language check and upsert, new keys also pass the "present in all languages" check.
   4. Thesaurus propagation, inside the same transaction: when the context type is `Thesaurus`, each changed non-empty value whose key equals a thesaurus value label queues a `denormalizeThesaurus` job for that thesaurus and value ids, which re-labels the value in entities of that language (async; `PropagateThesaurusTranslationService.ts:30-38,43-71,73-96`).
5. Controller emits socket `translationsChange` with that language's updated translations (all contexts) and answers with it (`EXP/translation/SaveTranslationsController.ts:8-16`). Every open client replaces that language in its translations atom, so UI strings change live (`sockets.js:107-119`).
6. Client: the action returns the saved languages filtered to this context (`translations/index.ts:12-19,44-47`). The loader revalidates and the form resets to the returned values (`EditTranslations.tsx:253-260`). The user stays on the editor.
7. Notification: success `Translations saved` (en.csv:1406); error `An error occurred` plus details (`:230-247`).
8. No entity cloning, translation cloning or predefined-translation import happens on this action (those belong to Languages install).

**Import** (`Import` button, System context only)
1. Client: file chosen -> multipart POST with intent `file-upload`, context hard-coded to `System` (`EditTranslations.tsx:79-82`, `translations/index.ts:71-92`).
2. Server `POST /api/translations/import`: admin only, `context` required; runs the CSV loader on the uploaded file, then emits `translationsChange` for each returned language and answers with the list (`routes.ts:44-78`).
3. Loader (`app/api/csv/csvLoader.ts:61-123`): reads rows `Key` plus language-name columns; for each installed language whose English label is a column header, updates only System keys that already exist and where the CSV cell is non-empty; no confirm, no preview, unknown keys and languages ignored.
4. Post-save UI: loader revalidates, form resets to the new values (any unsaved edits are lost), notification success `Translations imported.` (en.csv:1404, `:243-245`).

#### 7. Dirty guard

- Condition: any field dirty in react-hook-form (`dirtyFields` non-empty) and not submitting (`EditTranslations.tsx:219-220`). Clear X counts as dirty (`shouldDirty: true`, `:357`).
- Copy: modal `Discard changes?` / `You have unsaved changes. Do you want to continue?` / `Cancel` / `Discard changes` (section 4).
- Applies to in-app navigation (the footer `Cancel` link, the breadcrumb, rail links, browser back through the router).
- Exceptions: no `beforeunload` prompt (full page reload or tab close is not guarded; unverified by grep in this file). Import is not guarded. The Untranslated toggle does not count. After a successful save the form resets and is clean.

#### 8. Sort, filter, search, pagination

- List: both tables sort by `Name` ascending by default; `Name` and `Type` headers toggle the sort; `Action` does not. No search, no filter, no pagination.
- Editor: keys sorted ascending (case-insensitive, `localeCompare`); no search; one filter, the `Untranslated Terms` toggle; no pagination, lazy rendering by visibility (`RenderIfVisible`).

#### 9. Propagation

What each context's edits change elsewhere:
- `System` (`User Interface`): the UI strings of each language; live in open sessions through `translationsChange`. Reset (Languages page) and Import (this page) overwrite existing System values from a CSV; neither touches other contexts.
- `Menu` and `Filters`: display text of navigation links and filter groups per language (inferred from `Translate context=...` usage). Keys are rewritten when the Menu or Filters settings are saved: renamed titles move the key and keep other-language text, removed titles delete the key (`SettingsTranslationService.ts:16-72`).
- Template id: labels of the template, its title and its properties in that language. Renaming a template or a property label renames the key in every language; deleting a property drops its key; deleting a template deletes the context (`TemplateTranslationService.ts:40-64`, `DeleteTemplate.ts:67`).
- Thesaurus id: value labels per language. Editing a translation re-labels the matching value in entities of that language via a background job (`PropagateThesaurusTranslationService.ts`). Value renames in the thesaurus editor move keys; added values create keys with the label as the value in all languages (`ThesaurusTranslationService.ts:79-166,169-210`).
- Relationship type id: the relationship type name per language; deleting the type deletes the context.
- Languages: installing a language copies all contexts from the default language (so every new cell starts equal to the default text and shows as `untranslated`); uninstalling deletes that language's rows.
- Which language counts as the reference for "untranslated" and for the primary pill: the default language from `settings.languages` (`EditTranslations.tsx:199-200`, fallback `en`).

#### 10. Improvements to layer on

- Search over keys and values in the editor and on the list: UX1; gap-matrix Translations "Search by key" row.
- Untranslated-only toggle plus per-language filter and per-language progress: UX8; gap-matrix "Toggle Untranslated Terms" and "Language pill status" rows.
- CSV import for every context with a preview of changed cells, and CSV export: UX3; gap-matrix "Import CSV" and "Export CSV" rows.
- One Save that applies all languages at once, with the success notice only after the write: gap-matrix "Save" row; shared pattern 3 (Editor) in settings-ux-audit.md.
- Dirty guard on Back, Cancel, rail and corpus switch: shared pattern 3 in settings-ux-audit.md; gap-matrix "Dirty guard" row.
- Two distinct empty messages (no keys, all translated): gap-matrix "Empty editor" row.
- Phone: one card per key with language rows stacked and a status dot per row: UX12; gap-matrix "Phone" row.
- Block Save while cells are empty with a count of empty cells: gap-matrix "Value rules" row.
- Virtualised rows for the System context: gap-matrix "Large contexts" row.
- Use "key" in both the list and the editor (prototype used "Keys" and "Term"): settings-ux-audit.md Translations findings.

#### 11. Uwazi defects NOT to copy

- Non-atomic multi-language save: one POST per language in parallel, one transaction each. If one fails, the others are already written, the error is shown and the form is not reset (`translations/index.ts:44-50`, `SaveLocaleTranslations.ts:62-72`). Corrected: one request for the whole context, all or nothing.
- The success notification can fire before the response: the effect that shows `Translations saved` depends on `fetcher.formData`, which is set while submitting (`EditTranslations.tsx:239-241,251`), so a failed save may show success followed by the error (unverified at runtime). Corrected: notify after the write returns.
- The client demands every cell be non-empty, but the server silently drops empty values (`localeTranslationDto.ts:39`), so API clients cannot blank a value and cannot tell it was ignored. Corrected: one rule on both sides, with an explicit "same as source" choice instead of blank.
- `Cancel` in the discard modal only hides it and never resets the router blocker (`ConfirmNavigationModal.tsx:26`, `EditTranslations.tsx:425-427`), so the next navigation attempt may stay blocked (unverified). Corrected: reset the blocker on Cancel.
- Status pills and the `Untranslated Terms` filter use loaded data, not live input: typing a translation does not change the pill until after Save (`EditTranslations.tsx:142-166`). Corrected: derive status from current input.
- A proper noun that is the same in every language counts as `untranslated`, and the filter hides a key when only the default language is left (`:132-138,177-185`). Corrected: allow "same as source" to count as done.
- The list reads only the first language's contexts and downloads every language and every key just to list names (`TranslationsList.tsx:35`, `translationsAPI.get`). Corrected: list endpoint returns contexts with key counts.
- Type pill shows the internal word `Uwazi UI` for System, Menu and Filters (`TableComponents.tsx:21-27`). Corrected: user-facing names, same pill style for all types.
- Import: System only, silent about ignored keys and languages, no preview, and unsaved editor changes are discarded when the loader revalidates (`EditTranslations.tsx:79-82`, `csvLoader.ts:81-123`, `:253-260`). Corrected: preview and apply per context, warn before discarding edits.
- The `Translate` button duplicates what the row could do and the row has no target of its own: keep one pattern across Settings lists (UX12 and shared pattern 1).
- `Save` stays enabled when nothing changed (`:418`). Corrected: enable only when dirty.

