Legend. `improved D<n>` in the Target column means Design improvement n from the UX audit list (1 search, 2 bulk selection, 3 CSV, 4 impact before delete, 5 undo in Beacon, 6 thesaurus tree, 7 property-to-card link, 8 untranslated filter, 9 keyboard reorder, 10 rail grouping, 11 last-saved line, 12 phone sheets/rows). It is not the foundation dispatch of the same number. Each Uwazi cell starts with a bold row label, which the "Display-level subset" block at the end of the Template editor section refers to.

## Templates list

Note: Uwazi has no inputs on this page. It is one table with row actions and a footer. The prototype list lives in `TemplatesPage.tsx` (local state, B3) and the Review's B4 (templates in three stores) applies to every row that reads or writes the list.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| **Template table.** One table, default sort by name asc, columns Name, Translation, Entities, Set as default, Action. `Templates.tsx:69-81` | partial: lists seed, lost on leave (B3, B4) | 1:1, read from the template store that Library also reads | STORE, D1a | S |
| **Name link.** Name opens the editor; blue "Default" pill on the default template. `TemplatesTableComponents.tsx:13-31` | works: row click opens editor | 1:1; render the Default badge in ink/vellum, not carbon (improved (Design: Templates list finding "Default is carbon")) | PAT | S |
| **Translation column.** Template name in the current UI language, sortable. `TemplatesTableComponents.tsx:33-35` | missing: no link to translation contexts (B7) | defer: needs template translation contexts; add the column once they exist | D1c | S |
| **Entities column.** Distinct entity count per template, abbreviated 1.2k, sortable. `MongoEntitiesDAO.ts:313-323` | missing: shows property count only (H2) | 1:1, counted from the entity overlay; the same count feeds the delete guard | D1a, USAGE | S |
| **Set as default (star).** Moves the single default flag; disabled on the current default. Toast "Default template set successfully." `SetTemplateAsDefault.ts:18-34` | partial: `isDefault` exists, no set action reported (H2) | 1:1; one default at all times; star also pre-selects the template in new-entity creation (assumed Uwazi effect: default template used for new entities, not in inventory) | D1a, NOTIFY | S |
| **Edit button.** Ghost "Edit" next to the name link; both go to the editor. `TemplatesTableComponents.tsx:71-77` | partial: pencil duplicates the row target (QA 8) | improved (Design: list-page pattern, hover-only row actions, drop the redundant pencil) | PAT | S |
| **Add template.** Footer button, visible only with no selection, opens `/templates/new`. `Templates.tsx:85-91` | partial: adds a row; id collision (H1) | 1:1: opens the editor in new mode with a random preset colour; footer lead on `BAR_LEAD` (no edge) | D1a, PAT | S |
| **Row selection.** Checkbox per row; disabled with tooltip reasons: default / has entities / synced. `RowSelectComponents.tsx:19-41` | missing: no selection anywhere in Settings | improved UX2: selection action bar with fixed count slot; disabled rows carry the same two reasons | USAGE, PAT | M |
| **Selected count.** Footer "Selected n of total"; Add template is replaced by Delete. `Templates.tsx:92-100` | missing | improved UX2: count in a fixed slot, `BAR_DANGER` Delete, no tint | PAT | S |
| **Delete confirm.** Danger modal "Do you want to delete the following items?" with name list; buttons Delete / Cancel. `DeleteTemplatesConfirmationModal.tsx:22-37` | partial: single ConfirmDialog, no usage check (H2) | improved UX4: dialog lists the impact (other templates losing a relationship property, filter entries removed) instead of a bare list | USAGE, PAT | M |
| **Delete blocked.** Server refuses the default template and any template with entities (HTTP 400, messages in `errors.ts:261-277`). `DeleteTemplate.ts:33-42` | missing: default template can be deleted (H2) | 1:1: block both, and say which rule applies; the in-app message names the rule | USAGE | S |
| **Delete side effects.** Removes relationship properties in other templates that point at it, its translation context, and its entry in `settings.filters`. `DeleteTemplate.ts:27-95` | missing: nothing happens outside the page (B4) | 1:1 against the store: strip relationship properties pointing to it, drop its filter entry, drop its translation context | D1a, D1d, D1c, USAGE | M |
| **Bulk delete atomicity.** One DELETE per id in parallel; first error aborts, earlier deletions are not rolled back. `HttpTemplatesService.ts:14-21` | missing | drop: Uwazi gap, not worth copying; run the whole selection as one store action, all-or-nothing | STORE | S |
| **Synced template.** "Synced Template" column, plain-text name, disabled actions; only the UI blocks it, server does not. `TemplatesTableComponents.tsx:122-131` | missing | drop: no sync feature in the prototype | - | S |
| **Empty state.** "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx` | partial: generic "Nothing here yet" | improved (Design: list-page EmptyState naming the object plus an "Add template" action) | PAT | S |
| **Outcome feedback.** Toasts "Template(s) deleted successfully." and error "An error occurred" with detail; activity log "Deleted template", "Set default template". `activitylogParser.ts:132` | partial: hand-rolled toasts, no log entry (M4) | 1:1 through the notify hook, each action appended to the activity log | NOTIFY | S |
| **Search and sort.** No search on this page (Uwazi); columns sort. `Templates.tsx:72-81` | missing: no search, no column sort reported | improved UX1: search row above the table (always mounted); column sort kept | PAT | S |
| **Phone.** Not specified in Uwazi (desktop table). | partial: 548px table scrolls sideways | improved UX12: list rows with name, colour dot, default badge, entity count | PHONE | S |

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| Property count column | keep | Useful at a glance, but derive it from the store (list says 8, editor shows 4: Review B6) |
| Carbon "Default" badge | drop (restyle) | Carbon is the data accent; ink or vellum for status (Design) |
| Pencil and trash visible on every row | drop (move to hover/overflow) | Twelve icons on screen; row target already opens the editor |

## Template editor

Note: Uwazi saves the whole template in one request and then runs a background job over entities. The prototype has no search index or job queue, so rows about reindexing are `drop` or `defer`. Rows tagged SCHEMA only matter if the template property list becomes the schema the entity edit form renders (Review B6/D7).

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| **Template name.** Required; unique case-insensitive on client; empty shows red state with no message. `TemplateMetadata.tsx:60-72` | partial: required-name error only (QA) | 1:1 with a message for the empty case too (improved over Uwazi's silent state); trim; whitespace-only counts as empty (H3) | D1a, DRAFT | S |
| **Colour.** 15 preset swatches plus custom colour; new template gets a random preset; no validation. `TemplateMetadata.tsx:53-59` | works: 11 swatches plus custom; list row only (B4) | 1:1 behaviour, keep the prototype palette; colour must reach Library type dot, cards and facets | D1a | S |
| **Entity view page.** Checkbox plus Select of pages flagged `entityView`; unchecking clears it; hint when no page qualifies. `TemplateMetadata.tsx:74-99` | missing (Design) | defer: pages have no entity-view flag, and entity detail has no page-render path; revisit with the Pages store | D1d, DATA | M |
| **Common property rows.** Title, Date added, Date modified always present, lock icon, not draggable or removable, always on top. `helpers.ts:78-84` | missing: no common rows (Design) | 1:1: three locked rows at the top of the table | D1a | S |
| **Title options.** Label editable; Generated ID checkbox ("A generated ID will be the default title"). `GeneratedIdField.tsx` | missing | 1:1: label editable; generated-ID only if the entity form can auto-fill the title, so SCHEMA | D1a, SCHEMA | M |
| **Date added / modified.** Label input disabled; only Priority sorting editable. `LabelField.tsx:28` | missing | 1:1 (read-only label, sorting flag only) | D1a | S |
| **Priority sorting.** Custom: only with filter on and type text, numeric, select or date; common: always. Tooltip copy in inventory. `PrioritySortingField.tsx` | missing | 1:1 flag in the store; Library default sort reads it (Library has its own sort today, so wiring is part of the row) | D1a, DATA | M |
| **Property table.** Columns drag, checkbox, Property, Type, Options; options shown as read-only pills (Show in cards, Required, Fill/Fit, thesaurus name). `TemplateEditorTableComponents.tsx:82-151` | partial: inline required/filter/cards checkboxes; names collapse on phone | 1:1 pills for the full option set; keep inline checkboxes as a fast path (proto-only) | D1a, PHONE | M |
| **Add property.** Footer button opens the panel in new mode; local until Save. `TemplatesEditor.tsx:230,338` | partial: footer warm button; ids collide (H1) | improved (Design: Templates editor finding "Add property belongs above the table, not in the bar"); stable ids | D1a, PAT | S |
| **Edit property.** Row button or label click opens the panel with the row; commit merges into the row. `TemplatesEditor.tsx:263-266` | partial: dialog opens with defaults, not the saved config (B6) | 1:1: panel loads the property's real type config; unchanged Save does not mark dirty (H3) | D1a, DRAFT | M |
| **Property panel container.** Large right sidepanel with overlay; "NEW PROPERTY"/"EDIT PROPERTY"; Cancel and Add property/Save. `ConfigPropertyPanel.tsx` | partial: hand-rolled dialog, no focus trap or role (M1) | improved UX12: shared `Modal` (md), full-screen sheet on phone; Escape in a Select closes only the Select | PAT, PHONE | M |
| **Remove properties.** Footer Remove on selection, no confirmation; on Save the missing properties are deleted with all their values on every entity. `TemplatesEditor.tsx:259-261`, `TemplateDiff.ts:112-130` | partial: immediate delete, no confirm (Design 3) | improved UX5 and UX4: remove from draft with undo in the Beacon; at Save show "N entities lose this value" | USAGE, DRAFT, NOTIFY, SCHEMA | M |
| **Inherited property guard.** Deleting a property that another template inherits is refused with the property names. `UpdateTemplate.ts:66-73` | missing | 1:1: block removal and name the template(s) that inherit it | USAGE, D1a | S |
| **Reorder.** Drag handle; order = array order; common rows stay on top. `Table.tsx:215-217` | partial: reorder works as form state, drag only | improved UX9: drag plus up/down buttons (the Filters pattern) | PAT | S |
| **Multi-select and bulk remove.** Checkbox column, "Selected n" in footer replaces the add buttons. `TemplatesEditorFooter.tsx:24-59` | missing | improved UX2: selection bar with count slot and `BAR_DANGER` Remove | PAT | S |
| **Property search.** None in Uwazi. | missing | improved UX1: search above the property table (templates with many properties) | PAT | S |
| **Property to card link.** None in Uwazi (cards read `showInCard`). `cardModel.ts:153-202` | partial: live card preview, no row link; text overlaps (Design) | improved UX7: hover or focus a property row highlights its place on the card preview; fix the overlap | D1a | M |
| **Property type select.** 16 types (17 with Violated articles); read-only box on edit, so type never changes after create. `PropertyTypeField.tsx:16-38` | partial: 8 types with its own vocabulary (B6) | 1:1 list of 16, type locked after create; one vocabulary shared with the entity form | D1a, SCHEMA | L |
| **Label.** Required; unique per template (case/trim-insensitive); default text is the capitalised type name; changing type resets the label. `LabelField.tsx:36-50`, `ConfigPropertyPanel.tsx:126-133` | partial: form works, uniqueness not reported | 1:1 required and unique; deviate: empty default (Uwazi default collides with an existing "Text"), and a type change keeps typed text | D1a | S |
| **Text, Rich text, Numeric.** Plain value types; filter and default filter allowed; priority sorting for text and numeric only. `ConfigPropertyPanel.tsx:56-72` | partial: text, numeric, markdown exist | 1:1 | D1a, SCHEMA | S |
| **Date, Multiple dates, Date range, Multiple date ranges.** Four date types; filter allowed; priority sorting for date only. | partial: only date; CEJIL adapter flattens the others to date (B6) | 1:1: add the three missing types; stop the adapter collapsing them | D1a, SCHEMA, DATA | M |
| **Select.** Thesaurus picker, required; options are thesauri of type not-template, sorted by label. `ThesaurusField.tsx` | partial: static seed list by name; no binding written (B6) | 1:1 against the live thesauri store; picking one writes the binding the entity form resolves | D1a, STORE | M |
| **Multiple select.** Same thesaurus picker; filter allowed, no priority sorting. | missing (Design: most used missing type) | 1:1; form renders multiselect for it | D1a, SCHEMA | M |
| **Relationship.** Relationship type (required), Entities (any template except this one, default "Any entity"), Inherit property (only when a template is chosen). `RelationshipFields.tsx:38-144` | partial: related template and type from static seeds; no inherit control (B5, B6) | 1:1 against the single relation-type registry and live templates; inherit picker lists the target's custom properties; do not copy the likely inherit-clearing defect on open (assumed) | D1a, D1b, SCHEMA | L |
| **Link.** Plain value type, no filter or style options. `ExpressTemplateMapper.ts:51-93` | missing | 1:1 | D1a, SCHEMA | S |
| **Image, Preview, Media.** Style Fill/Fit radio (tooltips in inventory), Full width checkbox; no filter. `StyleField.tsx`, `FullWidthField.tsx` | partial: image only; no style or full width | 1:1: add Preview and Media, Fill/Fit and Full width, rendered by the entity view | D1a, SCHEMA | M |
| **Geolocation.** Plain value type, no filter. | partial: type exists | 1:1 | D1a, SCHEMA | S |
| **Generated ID.** Type that auto-fills a short id; filter allowed. `GenerateIdProperty` | missing | 1:1: id is generated on entity create, only if the form reads the schema | D1a, SCHEMA | M |
| **Violated articles (nested).** Offered only for project `cejil`; server refuses elsewhere; sub-properties have no UI. `PropertyTypeField.tsx:36-38` | missing | drop: single-project type with no editor UI; the CEJIL corpus keeps its own display | - | S |
| **Hide label.** Checkbox `noLabel` for non-common properties. `HideLabelField.tsx` | missing | 1:1: record view hides the label | D1a, SCHEMA | S |
| **Required.** Checkbox; entity save is refused when empty. `RequiredField.tsx` | partial: checkbox works as form state, not persisted | 1:1: edit form refuses an empty value and marks the field | D1a, SCHEMA | M |
| **Show in cards.** Checkbox; Library cards read it. `ShowInCardsField.tsx` | partial: checkbox and card preview work; Library ignores it (B7) | 1:1: Library cards show flagged properties | D1a, DATA | M |
| **Use as filter.** Checkbox for filterable types only; unchecking forces Default filter and Priority sorting off. `FilterField.tsx`, `ConfigPropertyPanel.tsx:145-150` | partial: checkbox works as form state | 1:1: Library facets read it; same-name same-type properties combine into one facet (Uwazi tooltip) | D1a, D1d | M |
| **Default filter.** Checkbox shown only when Use as filter is on. `DefaultFilterField.tsx` | missing | 1:1 | D1a | S |
| **Per-type option matrix.** Which controls appear per type (link, image, preview, media, geolocation get no filter; only text, numeric, select, date get priority sorting). `ConfigPropertyPanel.tsx:56-72` | partial: partial type set | 1:1 as one constant table that drives the panel | D1a | S |
| **Same-label table.** Read-only table of same-label properties in other templates; mismatch cells red and Save disabled with no text. `MatchingPropertiesTable.tsx` | missing | 1:1 with a visible error line (Uwazi shows red cells only); use the stricter client rule (exact type, same thesaurus/relation) and drop the server's compatible-type pairs | D1a | M |
| **Reserved and derived names.** `name` is derived from the label on every save; non-ASCII letters become `_`; label "Title" collides with the common property. `propertyNameGeneration.ts:5-15` | missing | drop name derivation (stable property ids); reject labels equal to a common property label (Uwazi checks only `title`, assumed) | D1a | S |
| **Add thesaurus modal.** Name field, duplicate check, creates an empty thesaurus and adds it to the list. `AddThesaurusModal.tsx:30-51` | missing | 1:1 on the thesauri store; modal stays open on a duplicate name | STORE, PAT | S |
| **Add relationship type modal.** Same shape; creates a type and adds it to the picker. `AddRelationshipTypeModal.tsx` | missing | 1:1 into the single registry | D1b, PAT | S |
| **Save.** Disabled without changes; writes the whole template; toasts "Template saved successfully."; error "Error saving template."; activity log entry. `TemplatesEditor.tsx:339` | partial: saves name and colour only; dirty flag wrong (B2, H3) | 1:1 full save from the draft; dirty compares with the stored value and clears after save | D1a, DRAFT, NOTIFY | M |
| **Dirty guard.** Blocks navigation except edit-to-edit; no `beforeunload`. `TemplatesEditor.tsx:147-150` | missing: none in Settings (B1) | improved (Design: shared editor pattern): guard Back, Cancel, rail, navbar, corpus switch, including edit-to-edit; no `beforeunload` (state is in memory only) | DRAFT | S |
| **Cancel.** Link to the list, blocked by the guard when changed. `TemplatesEditorFooter.tsx` | partial: discards silently | 1:1 through the guard; `BAR_GHOST` | DRAFT, PAT | S |
| **After save.** New template navigates to its edit page; existing stays. `TemplatesEditor.tsx:208-212` | partial: toasts then closes | improved (Design: editor pattern, save writes back and returns to the list with the row highlighted) | D1a | S |
| **Rename effects.** Template and property label renames update translation keys and the filter entry (top-level only; a template inside a group keeps its old name). `ReconcileFiltersOnTemplateChange.ts:42-49` | missing: rename reaches nothing (B4) | 1:1 plus fix: filters hold template ids, names read from the store, so groups update too | D1a, D1d, SCHEMA | M |
| **Reindex confirm.** Over 3000 entities every save asks "Lengthy reindex process"; HTTP 409 opens "Template conflict" with a full reindex option. `TemplatesEditor.tsx:244-249` | missing | drop: no search index in the prototype; revisit only if a mock job is added | - | S |
| **Processing state.** Header progress bar "Updating template properties across n entities..."; edits refused while processing. `Template.ts:255-260` | missing | drop: store updates are instant; if needed show a task in the Beacon after a property delete or rename | NOTIFY | M |
| **Unknown template id.** Loader falls back to an empty new template, and Save creates it. `createTemplatesEditorLoader.ts:35-45` | missing | drop (Uwazi defect): show "Template not found" and return to the list | - | S |
| **Last saved.** None in Uwazi (activity log keeps "Created template"). | missing | improved UX11: "Saved 2 min ago by admin" in the editor footer, fed by the activity log | NOTIFY | S |
| **Phone.** Not specified in Uwazi. | partial: Property column collapses to 0 (QA, Design 4) | improved UX12: property rows with name, type badge and flag icons; panel as a sheet | PHONE, PAT | M |

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| Live card preview beside the properties | keep | Shows `showInCard` effect; becomes the target of D7; fix the title/label overlap |
| Inline Required / Filter / Cards checkboxes in the property table | keep | Quick toggle without opening the panel; must write the same store fields |
| Static thesaurus, template and relation-type option lists (`THESAURUS_OPTIONS`, `RELATION_OPTIONS`) | drop | Replace with live stores (B6) |
| Name-validation `role=alert` summary | keep | Accessible error line; reuse for all validations |
| Footer "Add property" as a warm button | drop (move above the table) | Design: belongs to the section, not the bar |

### Display-level subset

Can be built without the SCHEMA decision (template is a display record: name, colour, flags, lists):
- Template name, Colour, Template table (list side), Common property rows (display), Date added/modified rows, Priority sorting (flag only), Property table and Options pills, Add property, Edit property, Property panel container, Reorder, Multi-select and bulk remove (without data-loss claims), Property search, Property to card link, Label, Same-label table, Select (thesaurus binding via `thesaurusBindingsAtom`), Show in cards, Use as filter, Default filter, Per-type option matrix, Reserved and derived names (stable ids), Add thesaurus modal, Add relationship type modal, Save, Dirty guard, Cancel, After save, Last saved, Phone, Inherited property guard.
- Relationship picks (type and target template from live stores) can also be built at display level; the Inherit property step is display-only until the form reads it.

Need SCHEMA (useful only when the property list drives the entity form):
- Title options (generated ID), Remove properties (the "entities lose values" impact), Property type select (shared 16-type vocabulary), Text/Rich text/Numeric, the four date types, Multiple select, Relationship (with inherit), Link, Image/Preview/Media, Geolocation, Generated ID, Hide label, Required, Rename effects (property rename migrating values).
- Not tagged SCHEMA but gated on other work: Entity view page (pages store, DATA), Translation column (D1c).

## Filters

Note: Uwazi's `settings.filters` is an ordered list of templates and groups, edited locally and written by one Save. It only sets which templates and groups appear in the Library "Type" facet; it does not filter search results server-side. `FiltersTable.tsx:121`

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| **Page intro.** Banner "Filters configuration" explains order by drag and grouping by "Add group". `FiltersTable.tsx:164-189` | works: description text present | 1:1 meaning; use "templates", not "types" or "entity types" (vocabulary table) | - | S |
| **Template rows.** Ordered list of templates in `settings.filters`; templates not listed disappear from the Type facet once any filter exists. `libraryTypeFilters.ts:12-44` | partial: all types listed with show/hide; form state only | keep the show/hide model (hidden = absent); a new template starts hidden, which makes the Uwazi gotcha visible | D1d, D1a | M |
| **Add entity type modal.** Multiselect with search of templates not yet used; Add disabled when empty. `AddTemplatesModal.tsx` | missing (show checkbox replaces it) | drop: the show/hide checkbox covers it | - | S |
| **Add group.** Sidepanel with Name (required) and Entity types multiselect; group appended at the end. `FiltersSidepanel.tsx:94-139` | partial: "New group" button top-right, inline rename | 1:1 outcome; move the create action to the footer (improved (Design: Filters finding "New group sits in the body")) | D1d, PAT | S |
| **Edit group.** Edit button on the group row; members removed return to the pool, not re-added at top level. `helpers.ts:49-65` | partial: rename and group select per row, form state | 1:1: rename plus members; removed members become hidden templates | D1d | S |
| **Group name validation.** Required, "This field is required". `FiltersSidepanel.tsx:94-105` | partial: whitespace-only name accepted (H3) | 1:1 with trim; same message | DRAFT | S |
| **Reorder and nest.** Drag to reorder; drop onto a group to nest; drag out; a group cannot go inside a group. `Table/helpers.ts:26-110` | partial: drag grip, Move up/down, group select | improved UX9: keep Move up/down and group select as the keyboard path; forbid group-in-group | D1d, PAT | S |
| **Group rows.** Collapsible group with its members; empty group shows "Empty group. Drop here to add". `DnDComponents.tsx:148-163` | partial: groups as chips and a select | 1:1 empty-group hint; group rows collapsible | D1d | S |
| **Delete.** Checked rows (templates or groups with members) removed locally, no confirm. `FiltersTable.tsx:98-116` | partial: remove group is immediate (Design 3) | improved UX5: remove with undo in the Beacon, since changes stay local until Save | NOTIFY, DRAFT | S |
| **Save.** `POST` settings with only `filters`; empty groups dropped; toast "Filters saved"; error toast. `FiltersTable.tsx:121`, `helpers.ts:88-108` | no-op: toast only, stays enabled (B2, H3) | 1:1: write the filters store, drop empty groups, reset dirty after save, error path | D1d, DRAFT, NOTIFY | M |
| **Cancel.** Footer Cancel reverts to the loaded filters. `FiltersTable.tsx:87-91` | missing: no baseline to revert to (H3) | 1:1 (`BAR_GHOST`) | DRAFT, PAT | S |
| **Dirty guard.** `useBlocker(hasChanges)` blocks all navigation; modal "Discard changes?". `FiltersTable.tsx:54` | missing (B1) | 1:1 through the shared guard | DRAFT | S |
| **Library Type facet.** Facet built from `settings.filters`; group rows expand, group count is the sum of members, ticking a group toggles all; empty config falls back to all templates by name. `TypeFacet.tsx:36-107` | no-op: Library facets hard-coded; Person still shows after hiding; "My group" never appears (B7, QA) | 1:1: `LibraryFilters` reads the store; seed it from the Library's own "Documents" group | D1d, D1a, DATA | L |
| **Template rename and delete.** Rename updates top-level entries only (a template inside a group keeps its old name); delete removes it recursively but leaves empty groups until next Save. `settingsTree.ts:50-71` | missing: nothing reaches the page (B4) | 1:1 with fix: filters store template ids and reads names from the template store; empty groups dropped on delete | D1a, D1d | S |
| **Group label translation.** Group names live in the "Filters" translation context, reconciled on Save. `SettingsTranslationService.ts:104-125` | missing | defer: needs the translations store | D1c | S |
| **Empty state.** "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx` | partial: generic line | improved (Design: list-page EmptyState with an action) | PAT | S |
| **Search.** None in Uwazi (Add modal has search). | missing | defer: list is short; Add-modal search not needed with the show/hide model | - | S |
| **Phone.** Not specified in Uwazi. | partial: 580px table scrolls sideways | improved UX12: list rows with show toggle, group chip and move buttons | PHONE | S |

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| Properties table (show/hide, Move up/down per property) | keep, decision needed | Uwazi sets property filters in the Template editor (`filter` flag) and has no order control; keep only as a view over the template `filter`/`defaultfilter` flags (one source), or drop |
| "Group" column on Properties (always "—") | drop | Placeholder; no data behind it (QA, Design) |
| Footer count "13 filters shown" | keep | Fixed-slot count, the right pattern (Design) |
| Show/hide checkbox per template | keep | Replaces Uwazi's Add entity type modal and Delete |
| Move up/down buttons | keep | Keyboard path for reorder (Design 9); needed on touch |
| "Types" label | drop (rename to "Templates") | Vocabulary table |
