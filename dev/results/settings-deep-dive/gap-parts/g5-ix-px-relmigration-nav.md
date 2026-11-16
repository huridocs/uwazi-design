## Metadata extraction

Legend for this file: in the Target column `improved D<n>` is Design improvement number n (1-12 in the UX audit). In Depends on, `D1a`, `D1b`, `D1c`, `D1d`, `D2`... are Review dispatches. Repo paths are shortened as in the inventory (`IX/` = IX route folder, `S/` = Settings routes folder). Both extraction pages are lower priority for the demo; the first four rows plus the suggestions table, accept and filters are the demo core, the rest can follow.

### Extractors dashboard

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Route is admin+editor. Rail link needs the `metadata-extraction` flag. All `/api/ixextractors` answer 404 unless `metadataExtraction.url` is set. `Routes.tsx:394-404`, `serviceMiddleware.ts:4-13` | missing: rail item always shown, no role or flag (own code check) | `1:1` through the nav-gating table below. Show it to editors too (Uwazi probably hides it from them, see Feature toggles) | D1d | S |
| Table columns: Extractor Name, Property (type icon + label), Source (PDF, Title or a property), Template(s) pills, "Review" button. `IX/components/TableElements.tsx:329-355` | partial: Property+template, Status, Documents, Accuracy; no name, source or multi-template | `1:1` columns. Keep Status and Accuracy as extra columns (see prototype-only) | STORE, D1a | S |
| Extractor name is required; no uniqueness check, error is a red field with no message. `IX/components/ExtractorModal.tsx:201-211` | missing: no name field, property text acts as the name | `1:1` plus a visible message; also reject duplicate names (Uwazi does not) | DRAFT | S |
| Step 1 "Properties by template": foldable multiselect with search; types text, numeric, date, select, multiselect, relationship, markdown, plus Title. After the first pick only same-named properties stay. `ExtractorModal.tsx:19-94` | partial: template select + free-text property (QA, Design) | `improved (Design: Metadata extraction, property is a select of the template's properties)`, multi-template as in Uwazi | D1a | M |
| Step 2 shows Input and Selected templates, then "Common sources" radio: PDF, Title, or text/markdown property common to all templates. `ExtractorModal.tsx:227-259`, `IX/helpers/helpers.ts:90-165` | missing: no source choice | `1:1` | D1a | M |
| Create and edit use one 2-step modal (Cancel/Next, Back/Create or Update), size xxl. `ExtractorModal.tsx:194-293` | partial: full-page editor mixes config and review | `1:1` as a shared `Modal` (`xl`, full screen on phones); review moves to its own page | PAT, PHONE | S |
| Server checks: at least one template, property exists with an allowed type, source is pdf or an existing property; 422 with English codes. `ixextractors.ts:57-126` | missing | `1:1` as inline field errors; one message per rule, no codes | DRAFT | S |
| "Edit Extractor" appears only when one row is selected. Changing the property deletes all suggestions and recreates blanks; changing templates adds or removes their suggestions. `IXDashboard.tsx:140-144`, `ixextractors.ts:128-157` | partial: pencil opens editor; type always "Text"; save writes nothing (QA, B2) | `improved UX4`: the Edit modal states how many suggestions the change discards (Uwazi gives no warning) | STORE, USAGE, DRAFT | M |
| Footer swaps "Create Extractor" for "Delete" (and "Edit Extractor" when one row) once rows are checked. `IXDashboard.tsx:140-177` | missing: per-row pencil and trash, no selection | `improved UX2`: checkbox column and selection action bar (Edit when 1 selected, Delete, count in a fixed slot) | PAT | M |
| Delete confirm "Delete extractors", bullet list of names, Cancel/Accept (danger); also deletes the extractors' suggestions. `IXDashboard.tsx:163-177`, `ixextractors.ts:159-181` | partial: confirm works, row removed, not stored (B3) | `improved UX4`: confirm names the suggestion count and accepted values that stay on entities | STORE, USAGE, PAT | S |
| Empty table reads "NO DATA AVAILABLE". Success: "Saved successfully.", "Extractor/s deleted". Error: "An error occurred"; the modal closes on failure and loses input. `IXDashboard.tsx:93-115` | partial: toasts only; generic empty text | `improved (Design: shared list pattern, empty state names the object and offers Create)`. Keep the modal open on error (Uwazi bug, not copied) | NOTIFY, PAT | S |
| Dashboard has no search. | missing | `improved UX1` only if the list passes about 10 extractors; otherwise `defer` (few rows) | - | S |
| Phone: table scrolls sideways; Review and checkboxes off screen (inventory silent; QA for prototype). | partial: only Entity and Current visible, actions off screen (QA) | `improved UX12`: list rows with name, property, template chips, status; Review on tap | PHONE | S |

### Suggestions page (one extractor)

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Breadcrumb "Metadata extraction > name". Table title: property icon, label, "for", template pills. Button "Stats & Filters" with active-filter badge. `IX/IXSuggestions.tsx:334-374` | partial: one editor page, config on top | `1:1` as a separate suggestions view reached by "Review" (list to detail) | STORE | S |
| Columns: Name (link, language), Context (highlighted segment or "No context"), Current Value/Suggestion (green match, amber mismatch, "Error", "(obsolete)"), Use for training, Accept, Open. `TableElements.tsx:98-327` | partial: Entity, Current, Suggested, Score, State, accept/reject; no context (QA) | `1:1`: add Context and "Use for training" toggle; keep State pill (Matches, Empty, Mismatch, Accepted) for scanning | DATA | M |
| 100 rows per page, "Showing a-b of N", server-side sort by column header; no search. `IXSuggestions.tsx:375-396` | missing: 12 mock rows, no sort | `improved UX1`: search by entity name; sort yes; paging `defer` (mock sets stay small) | DATA | S |
| "Stats & Filters" panel: counts and 9 flags (Labeled, Non-labeled, Use for training; Non processed, Obsolete, Error; Match, Mismatch, No context) combined with OR, plus Accuracy with tooltip. `FiltersSidepanel.tsx:99-232` | partial: one segmented filter (All, Pending, Mismatch, Empty, Accepted) and a stats strip | `1:1` as a slide-over; keep the segmented filter as the quick path | STORE | M |
| "Accept" per row sends the value, notify "Suggestions sent", socket later confirms "Suggestions updated". Disabled for rows with no suggestion, obsolete or error. Writes the value to the entity in all languages. `TableElements.tsx:173-217`, `suggestions.ts:181-203` | partial: row flips to Accepted, value not written to any entity (QA) | `1:1`; write the accepted value to the entity overlay (Juan to confirm, see summary). Show the two notify steps via the Beacon | NOTIFY, STORE | M |
| No bulk accept for selected rows; the only bulk accept is "Auto-accept suggestions" in the Process modal. `IXSuggestions.tsx:400-457` | partial: "Accept all" with no confirm (Design) | `improved UX2`: select rows, "Accept selected" in the action bar, confirm shows the count. Deliberately more than Uwazi | PAT | M |
| "Use for training" toggle per row; set automatically when a sidepanel field is edited. `TrainingSetController.ts`, `PDFSidepanel.tsx:118-122` | missing | `1:1` | STORE | S |
| "Open" row action: PDF sidepanel with highlight, "Click to fill", Clear, "Use for training" and Accept; or a property sidepanel for property-source extractors. `PDFSidepanel.tsx:118-186` | missing | `defer`: needs PDF text selection inside the settings drawer. Later reuse `DocumentViewer` and the existing click-to-fill signal | DATA | L |
| "Train model" modal: Training sample radio (marked only, or marked plus labeled), "Find suggestions after training", Amount (default 1000), info banner. `TrainModelModal.tsx:32-146` | missing: only "Find suggestions", which reseeds the same 12 rows | `1:1` as a `Modal`; start a mock task | NOTIFY, PAT | M |
| "Process extractor" / "Process selected" modal: Find (filters Non processed, Obsolete, Error; amount), Auto-accept (source previous or all; overwrite blank only or all). `ProcessExtractorModal.tsx:46-288` | missing | `1:1`. Add a confirm line when Overwrite is "For all entities" (Uwazi has none) | NOTIFY, PAT | M |
| Run status in the footer: "Sending labeled data...", "Training model...", "Finding suggestions..." with processed/total, "Accepting suggestions...", "Canceling...". "Cancel" replaces "Train model" while busy. Beacon tasks. `IXSuggestions.tsx:53-61,142-254`, `taskProgress.ts:26-102` | missing | `1:1` with the existing `tasksAtom` and a timer. Layout stays fixed while status text changes | NOTIFY | M |
| Error states: "Error" row value, server texts (no segments, no labeled files), 409 model not ready, status `failed` shows no text in Uwazi. `ixMaterials.ts:49-71`, `IX/types.ts:72-80` | missing | `improved (Design: Save feedback, add an error path)`: show Error state with a message and Retry; do not copy the `failed` gap | NOTIFY | S |
| Obsolete rows appear when the entity or file changed after the suggestion; shown "(obsolete)" and not acceptable. `getIXSuggestionState.ts:71-110` | missing | `defer`: needs entity-edit listeners; seed one obsolete row for display | DATA | S |
| No confirm on Accept, Train, Process or Cancel. Entity sidepanels discard on Escape; no dirty guard. `IXSuggestions.tsx:124-254`, `Sidepanel.tsx:41` | partial: accept/reject decisions are lost on leave (QA, B1) | `improved (Design: Metadata extraction, confirm bulk actions)`: decisions persist in the store; dirty guard only on the config modal | DRAFT, STORE | S |
| Phone: not covered by Uwazi docs; wide table. | partial: Suggested, Score, State and accept/reject off screen (QA) | `improved UX12`: each suggestion a row (entity, current to suggested, state, Accept button) | PHONE | M |

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| Status pill column on the list (Ready, Training, Processing, Error) | keep (proto-only) | Uwazi shows run state only inside the suggestions page; one glance on the list is useful; derive it from the task state |
| Documents and Accuracy columns on the list | keep (proto-only) | Accuracy exists in Uwazi's Stats panel; both help a demo; compute from the store |
| Score (confidence) column on suggestions | keep (proto-only) | Uwazi has no per-row score; Design asks to define Score, Accuracy and Confidence and use two terms |
| Reject (removes the row, no undo) | drop | Uwazi has no reject; an unaccepted row simply stays. Juan may want it kept, then add Beacon undo (`improved UX5`) |
| "Accept all" | drop | Replaced by "Accept selected" (`improved UX2`) |
| "Find suggestions" single button | drop | Replaced by Train model and Process extractor |
| Property type select in the editor (always "Text") | drop | Type comes from the chosen property |
| Reviewed/pending/accuracy stats strip in the editor | keep (proto-only) | Cheap summary above the table; Uwazi puts accuracy in the filters panel |

## Paragraph extraction

Uwazi has three screens (extractors, entities of one extractor, paragraphs of one entity) and no edit flow. The prototype has two (list, one job editor) and a different model (one template per job, segmentation settings). Target is Uwazi's model.

### Extractors dashboard

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Route admin+editor. Rail link needs the `paragraphExtraction` tenant flag. All 7 API endpoints 403 without it. `Routes.tsx:414-423`, `PXRoutes.ts:15-62` | missing: always shown, no role or flag | `1:1` through the nav-gating table | D1d | S |
| Table: Source Template pill, Target Template pill, Entities (count plus "N New" pill), "View". `PX/components/extractors/TableElements/columns.tsx:11-40` | partial: Template, Status, Paragraphs; one template per job | `1:1`: a job becomes source template, target template, entity count, new count | STORE, D1a | S |
| Add extractor wizard, 3 steps. Step 1 target template: only templates with a rich text and a numeric property. `steps/TargetTemplate/*`, `filterPXQualifiedTemplates.ts:3-5` | partial: form with one template select; "Start extraction" no-op (QA) | `1:1` as a `Modal` wizard (`xl`, steps shown as dots) | D1a, PAT | M |
| Step 2 source template: any template except the target and except templates already a source elsewhere. `steps/SourceTemplate/Body.tsx:18-27` | missing | `1:1` | D1a | S |
| Step 3: paragraph text property (rich text), paragraph number property (numeric), target and source relationship types (each excludes the other). `steps/ExtractionConfiguration/Body.tsx:69-142` | missing | `1:1`; relationship types from the single registry (the label typo "Paragrap" is not copied) | D1a, D1b | M |
| Server checks: same source and target relationship type, extractor already exists for the source, wrong property types. 422 English messages. `PXCreateExtractor.ts` | missing | `1:1` as inline step errors | DRAFT | S |
| Empty template lists show nothing; the "No qualified templates" messages exist but are not used. `Dialog.tsx:31` | missing | `improved (Design: shared list pattern, empty state)`: say which property types a target template needs | PAT | S |
| No edit flow: only create and delete. `ParagraphExtraction.tsx` (inventory 2a Save model) | partial: job editor opens, Save toasts | `1:1`: no edit; row opens the entities page | - | S |
| Delete bulk: "Are you sure?", "Only the extractor will be deleted, all created entities will remain on the library.", No, cancel / Delete. `DeleteDialog/index.tsx:45-57` | missing: no delete control (QA) | `improved UX4`: confirm also gives the status rows removed and paragraph entities that stay; selection bar `improved UX2` | STORE, USAGE, PAT | S |
| Empty "NO EXTRACTORS."; success "Paragraph Extractor added", "Extractor/s deleted"; failure "An error occurred". `NoDataCell.tsx:4-8`, `Footer.tsx:35-54` | partial: toasts, generic empty | `improved (Design: shared list pattern)` | NOTIFY | S |
| Phone: not described for Uwazi. | works: only page with a phone layout (QA) | `keep`; reuse as the phone pattern for `improved UX12` | PHONE | S |

### Entities and paragraphs

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Entities table: Entity, Language(s) pills, Paragraphs count, Status pill, "View"; 30 per page; "Showing a-b of N". `PX/PXEntities.tsx:27-158`, `entities/TableElements/columns.tsx:11-42` | partial: per-document table generated, not the job's documents (QA) | `1:1` using real entities of the source template; `improved UX1` adds a title search | DATA | M |
| Status pills: New, Processing, Obsolete, Error, Processed (check). Filters panel by status with counts. `PXEntityStatus.tsx:7-34`, `EntityFilterSidepanel.tsx:48-110` | partial: Done, Queued, Skipped; filter exists; "Processing" pill fails contrast (QA) | `1:1` vocabulary; fix pill colours | DATA | S |
| "Extract new paragraphs" (all `new` entities, not only the loaded page) with an "N New" pill; with rows selected "Extract paragraphs". `PXEntities.tsx:40-70,120-153` | no-op: Run extraction and per-row re-run only toast (QA) | `1:1` with a mock task; status moves New to Processing to Processed. Count across all pages (Uwazi counts only the loaded page) | NOTIFY, DATA | M |
| Confirm before re-extract: "All of the previously created paragraphs will be deleted and recreated after the process." No, cancel / Continue. `ExtractEntitiesDialog/index.tsx:72-83` | missing | `1:1` | PAT | S |
| Status re-read every 25 s; only row statuses patched in place. Errors from the call can still show a success toast. `PXEntities.tsx:25,93-101` | missing | `1:1` with a mock timer; toast on success only (Uwazi bug not copied); an Error row offers Retry | NOTIFY | S |
| Paragraphs page, read only: grouped rows (main language row, sub-rows for other languages), Paragraph #, Language, Text cut at 200 characters. `PX/PXParagraphs.tsx:14-70`, `paragraphs/Table.tsx:51-67` | missing: job editor shows snippets per document, no paragraph page | `1:1` with seeded paragraphs for two or three entities | DATA | M |
| "View" slide panel: entity and template pill, language, document name, paragraph number, text, "View entity". `ViewParagraph.tsx:24-47` | missing | `1:1` as a slide-over | PAT | S |
| "Open PDF" panel shows the main-language PDF. `PDFSidepanel.tsx:14-45` | missing | `defer`: reuse `DocumentViewer` once paragraph seeds exist | DATA | M |
| Paragraphs become entities of the target template, linked to the source with the two chosen relationship types. `PXCreateParagraphsBatch.ts:111-124` | missing | `defer`: mock shows the paragraph table only; creating entities and references is out of scope for the demo | DATA | L |
| No paragraph delete: dialog exists but is unused and its API is a stub. `DeleteDialog` (inventory 2b) | missing | `drop`: not in Uwazi | - | - |

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| Segmentation select (By paragraph, By page, By heading) | drop | Uwazi segmentation is done by an external service, not a setting here |
| Min characters field | drop | Not in Uwazi |
| "Run extraction" in the body and "Re-run" in the footer for one action | drop | Duplicate (Design); replaced by "Extract paragraphs" |
| Per-row re-run on the document table | drop | Replaced by row selection plus "Extract paragraphs" |
| Job stats strip (documents, paragraphs) | keep (proto-only) | Derived from entity and paragraph counts; Uwazi shows counts in the table and filter panel |
| "Last run" (hardcoded) | drop | Not in Uwazi; fake data (Design) |

## New Relationships Migration

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| One-off admin tool to convert V1 connection hubs to V2 relationships: plan table, "Dry Run", "Migrate" (deletes all V2 relationships first), "Test One Hub". Legacy markup, untranslated. Rail link needs `newRelationships`. `relV2MigrationDashboard.tsx:98-515`, `SettingsNavigation.tsx:102-109` | missing: no page and no rail item | `drop`. The prototype already stores V2-shaped references (`data/references.ts`), so there is nothing to migrate. Keep only the gated rail entry in the nav table below, off by default, if a demo of flag gating needs it | - | - |

Prototype-only (not in Uwazi): none.

## Feature toggles and nav gating

Uwazi has no UI for feature flags. They are set in the settings document, by tenant CLI, or by env (`settingsType.ts:101-140`, `featureFlags.ts:7-29`). Rail source: `S/SettingsNavigation.tsx:21-137`. Uwazi groups: Settings, Metadata, Tools. Prototype today (own check of `atoms/settings.ts` and `components/settings/*`; QA and Review say nothing on roles): groups User, System, Tools (with a "ML tools" subgroup), one group shown at a time, no role field and no flag field on any item, so every item is always visible. Roles exist only on seed users.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Role model: admin, editor, collaborator. Client guard redirects to `/login`; server answers 401. Only Account is open to all; editor adds Metadata and Paragraph extraction. `ProtectedRoute.tsx:6-34`, `authMiddleware.ts:14-24` | missing: no role gating in nav or pages | `1:1` simplified: a current-role value from the signed-in user, a `roles` list per item, hidden items not rendered. A blocked section shows "This page is not available." instead of a login redirect | STORE, D1d | M |
| Account (Settings group): any signed-in role, no flag. `Routes.tsx:324-325` | works: User group; shown to everyone | `1:1`; a collaborator sees only this item | STORE | S |
| Dashboard, Users & Groups, Collection, Menu, Pages (Settings group): admin only, no flag. Collection's `themeCustomization` flag changes page controls, not the nav. `SettingsNavigation.tsx:30-38` | partial: all shown, no gating | `1:1` admin only | STORE | S |
| Data visualizations (Settings group): admin only, no flag. `SettingsNavigation.tsx:38` | missing: no rail item, no page | `defer`: not part of the pages in this table; decide with whoever owns the Dataviz row | - | - |
| Languages, Translations, Filters (Settings group): admin only, no flag. `SettingsNavigation.tsx:30-43` | partial: shown to all | `1:1` admin only | STORE | S |
| Templates, Thesauri, Relationship types (Metadata group): admin only, no flag. `SettingsNavigation.tsx:53-62` | partial: in System, shown to all | `1:1` admin only; group with the extraction items (see grouping row) | STORE | S |
| Metadata Extraction (Metadata group): route admin+editor; rail link behind `metadata-extraction` plus admin+editor; the route and the API check a different key (`metadataExtraction.url`). `SettingsNavigation.tsx:65-73`, `Routes.tsx:394-404` | missing: always shown, under Tools ▸ ML tools | `1:1` gate on one key (not two). Editors see it. Uwazi likely hides it from editors because `features` is sent to admins only (assumed from code, VERIFIED path, not run); not copied | STORE, D1d | S |
| Paragraph Extraction (Metadata group): admin+editor; rail link behind tenant flag `paragraphExtraction`; API 403 without it. `SettingsNavigation.tsx:74-81`, `PXRoutes.ts:15-62` | missing: always shown | `1:1` gate | STORE, D1d | S |
| Preserve (Tools): admin only; rail link behind `preserve.host`; the route itself has no flag check. `SettingsNavigation.tsx:92-101`, `Routes.tsx:346` | missing: always shown | `1:1` rail gate; also gate the page (Uwazi's URL stays open) | STORE, D1d | S |
| New Relationships Migration (Tools): rail link admin plus `newRelationships`; route has only the flag check and shows an error page when off. `SettingsNavigation.tsx:102-109`, `Routes.tsx:502-507` | missing: no item, no page | `drop` the page (see section above). If a flag demo needs it, a disabled-by-default item opening the unavailable page | D1d | S |
| Activity log, Uploads, Import CSV (Tools): admin only, no flag. `SettingsNavigation.tsx:110-126` | partial: shown to all; Import CSV opens its own view | `1:1` admin only | STORE | S |
| Global CSS (Tools): label is "Global CSS & JS" only when `allowcustomJS` is on, else "Global CSS". `SettingsNavigation.tsx:111-120`, `Customization.tsx:59` | partial: label fixed "Global CSS & JS"; no such flag on Collection (QA) | `improved (Design: Navigation, one name for this page)`: keep "Global CSS & JS" and show the JS tab only when the flag is on; flag moves into the Collection page | D1d | S |
| Uwazi Docs (Tools): external link, any role, new tab. | works: "Documentation" pinned at the rail bottom, external icon | `1:1` (check the link target: prototype points to a uwazi.io support page, Uwazi to `docs.uwazi.io`; Juan to confirm) | - | S |
| Group headings are shown to every signed-in user; an editor or collaborator sees "Tools" with only Docs under it. `SettingsNavigation.tsx:84-136` | partial: groups always full | Not copied: hide a group heading when it has no visible item | STORE | S |
| `FeatureToggle` reads dotted paths in `settings.features`; missing means off; an object value counts as on. Two keys for one feature exist (`metadata-extraction`, `metadataExtraction`). `FeatureToggle.tsx:6-18` | missing | `1:1` for the dotted-path check, one boolean per feature; do not copy the duplicate key | D1d | S |
| Features can only be set in the DB, CLI or env, with no settings page. `settingsType.ts:101-140` | missing | `keep (proto-only)` a dev panel in the component catalog to flip each flag and the current role, default all on | D1d | S |
| Rail grouping. Design improvement 10: five groups (Collection, Content model, Languages, People, Tools), all visible in the rail; Figma's ToolsSidebar groups Metadata apart from Tools. UX audit, Navigation | partial: three groups (User, System, Tools); System is a flat list of 11 | `improved UX10`. Put Metadata extraction and Paragraph extraction in Content model next to Templates (Uwazi's Metadata group) and drop the "ML tools" subgroup | - | M |
| Rail scoping (Design finding): the prototype shows only the group you entered through, so Account sits alone in a 250px rail and Users to Uploads needs the navbar Tools menu. Uwazi shows all items in one rail. | partial: one group at a time (Design) | `improved (Design: Navigation, show every group)`. Juan has not decided; recommended yes, together with UX10 | - | S |
| Phone: below `md` the rail is the page and each child shows a back chevron. `Settings.tsx:11-27`, `SettingsContent.tsx:57-86` | works: rail-first drill-in, chevron in header (Design, QA) | `1:1` | PHONE | S |
| A page the user may not open: Uwazi redirects to `/login`, or shows `GeneralError` for `newRelationships`. `ProtectedRoute.tsx:6-34`, `Routes.tsx:502-507` | partial: `PlaceholderPage` with "part of the cloning roadmap" copy (Design) | `improved (Design: Placeholder page)`: "This page is not available." with a link to the first allowed item | PAT | S |

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
|---|---|---|
| "User", "System", "Tools" group labels and three navbar entry points (account menu, Settings, Tools dropdown) | drop | Replaced by `improved UX10` and one Settings entry; Uwazi has one rail |
| "ML tools" subgroup under Tools | drop | Moves to Content model with Templates under D10 |
| Active item `bg-vellum` + semibold | defer | CLAUDE.md says active = `bg-warm text-ink`; Juan to decide (Design question) |
| Import CSV rail item that opens its own view and shares the rail | keep (proto-only) | The Import view reuses the same rail; one list of tools to maintain |
| Rail `badge` support | drop | No item uses it |
| Dev panel for flags and current role (target row above) | keep (proto-only) | Lets a demo show editor and flag-off views without a backend |
