## Pages (list + editor)

Cite paths are under `app/react/V2/Routes/Settings/Pages/` unless shown. Prototype files: `PagesPage.tsx`, `site/CodePageEditor.tsx`, `atoms/sitePages.ts`. QA: the most functional Settings page. Review: H5 (list and code docs disagree), B1 (no guard), H2 (no usage check).

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List: table with row checkboxes, title, URL `/page/<id>/<slug>`, View and Edit per row, footer "Add page". `PagesList.tsx:83-126`, `PageListTable.tsx:14-45` | partial: list works, list entry lost on leaving (B3, H5) | `1:1` columns; list title read from the page doc, not a copy (H5); `improved UX1` search box | STORE, PHONE | M |
| Add page: footer link opens an empty editor, title "New page" in every language; nothing is stored until first Save. `pageEditorForm.ts:36-54`, `PageEditor.tsx:196-230` | partial: picker adds the row before saving, Cancel leaves orphan | `improved (Design: Pages finding)`: keep the starter picker, create the page only on first Save | STORE, DRAFT | S |
| Select rows, footer shows "Selected N of M" and "Delete". `PagesList.tsx:83-126` | missing: only per-row trash | `improved UX2`: selection action bar in the footer ladder (`BAR_DANGER` Delete) | PAT, STORE | M |
| Delete confirm lists page titles; server refuses (409) if a template uses it as entity view page; UI shows only "An error occurred" (Uwazi bug). `PagesList.tsx:46-52,128-139` | partial: confirm works, no usage check (H2) | `improved UX4`: dialog lists menu links to `/page/<slug>` and templates using it; do not copy the hidden error | USAGE, STORE, PAT | S |
| Row "View": opens the public page in a new tab; disabled for entity-view pages. `PageListTable.tsx:14-32` | missing: preview exists only inside the editor | `1:1`: opens the published rendering in `PublicPreview` | STORE | S |
| Title field per language; required for the active language, "This field is required". `PageEditor.tsx:345-353` | partial: title saved in doc, list row stays stale | `1:1`; list reads the doc title | STORE, DRAFT | S |
| URL: read-only copy field `/<lang>/page/<sharedId>/<kebab-title>` plus "View page"; slug is display-only, not stored. `PageEditor.tsx:355-374`, `pageUrls.ts:3-12` | partial: editable URL field, value not saved | `1:1`: read-only derived URL with copy; drop the editable slug | STORE | S |
| Language selector shown only with 2 or more languages; HTML, JS and CSS are per language. `PageEditorLanguageSelector.tsx:33` | works: EN/ES/FR/AR switch, fixed constants | `1:1` with installed languages (QA: Languages page does not propagate) | D1c | S |
| Tabs Configuration / HTML / Javascript / CSS in Monaco; HTML banner about embeddable components, JS banner "With great power comes great responsibility!". `PageEditorCodeTabs.tsx:50-132` | works: HTML/CSS/JS textareas, Tab inserts 2 spaces | `1:1` tabs and both banners; no Monaco (plain code area, shared with Customisation, one font size, Design) | PAT | S |
| Entity view toggle (page-wide); blocked while templates use it; disables View and Save and Preview. `PageEditor.tsx:336-343`, `pageSchemaValidator.ts:11-37` | missing | `defer`: needs templates that point at a page and an entity view that renders it | SCHEMA | L |
| Markdown support: hidden flag, deprecation banner, "This page does not need Markdown". `PageEditorComponents.tsx:62-86` | missing | `drop`: deprecated in Uwazi (2027), no legacy pages here | - | S |
| Save writes all languages in one request, no release; first save moves to the edit URL; Save disabled until dirty. `PageEditor.tsx:196-230`, `pageEditorForm.ts:70-98` | works: "Save draft" persists in session atom | `1:1`; draft kept in the pages store, dirty compared to stored value | STORE, DRAFT | S |
| "Save & Preview" saves then opens the draft page in a new tab. `PageEditor.tsx:232-246` | partial: live preview iframe with Draft/Published toggle instead | `keep (proto-only)`: inline preview replaces the new tab | - | S |
| Publish: modal "Publish release", required "Release message"; stores a snapshot (all languages) with version, user, date. `PageReleaseModal.tsx:33-52`, `PublishPageRelease.ts:22-44` | partial: Publish works, no message or version history | `1:1`: `Modal` with required message; releases stored per page | STORE, PAT, DATA | M |
| Restore previous version: modal lists releases of the active language (message, date), single select; overwrites the draft of all languages, no extra confirm. `PageRestoreModal.tsx:29-83`, `Page.ts:151-166` | missing | `improved (Design: Pages finding, destructive overwrite)`: restore as in Uwazi, plus a confirm that all languages are overwritten | STORE, PAT, DATA | M |
| Public site shows the last release, or the draft if never published (so unreleased pages are already public). `pageContent.ts:38-67` | partial: Draft / Published / "Published · edited" status | `improved (Design: Pages finding)`: keep the clearer status; one wording in list and editor; do not copy the "never released is public" quirk | - | S |
| Dirty guard on Back, Cancel, rail: `useBlocker(isDirty && !isSubmitting)`, "Discard changes?". `PageEditor.tsx:166-172,510-515` | missing: back arrow discards silently (B1, H5) | `1:1` | DRAFT | S |
| Cancel and Discard return to the list through the guard. `PageEditor.tsx:458-462` | partial: Discard reverts at once, no confirm | `improved (Design: Pages finding)`: confirm Discard when dirty | DRAFT, PAT | S |
| Empty list "NO DATA AVAILABLE"; editor "Loading" until languages exist. `PagesList.tsx:87-98`, `PageEditor.tsx:316-319` | missing: generic "Nothing here yet." | `improved (Design: list-page empty and loading states)`: named empty state with "Add page" | PAT | S |
| Notifications "Saved successfully.", "Deleted successfully.", "Page published successfully.", "Draft restored from release."; errors show server detail. `PageEditor.tsx:174-186,265,286` | partial: hand-pushed toasts, no error path (M4) | `1:1` via shared notify; add error path | NOTIFY | S |
| Language side effects: adding a language copies the default locale into every page; removing drops it (never the last). `AddLanguageToPages.ts:37`, `RemoveLanguageFromPages.ts:19-33` | missing | `1:1` once languages are a store | D1c, STORE | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Starter template picker (8 site types) | keep | Gives a first page without a blank editor; make creation happen on first Save |
| Insert component palette (`Modal`) | keep | Uwazi only links to docs for embeddable components; palette is the useful version |
| Copy from language (`Modal`) | keep | Translators need it; add a confirm because it overwrites the target draft (Design) |
| Live preview iframe with Draft / Published toggle, phone Code/Preview switch | keep | Replaces Save and Preview; works on phone |
| Status column in the list (Draft / Published / Published · edited) | keep | Uwazi list has no status |
| Editable URL field | drop | Uwazi derives the slug and does not store it |

---

## Data visualizations

No prototype page exists. Cite paths are under `app/react/V2/Dataviz/` (`DV/`) and `Routes/Settings/Dataviz/` (`S/`), server `DZ/`. Every row below is **missing**; targets assume a build.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List: Name, Chart, Refresh (Live / Snapshot), Last updated, Edit; checkboxes; footer "Create visualization". `DatavizList.tsx:90-128`, `TableComponents.tsx:23-67` | missing: no page | `1:1` list on the list-page pattern, with `improved UX1` search | STORE, PAT, PHONE | M |
| Bulk and editor Delete, confirm "This action cannot be undone"; does not check pages embedding the chart. `DatavizList.tsx:129-142`, `DeleteDataviz.ts:17-26` | missing | `improved UX4`: dialog lists pages that embed `<Dataviz id>`; `improved UX2` selection bar | USAGE, PAT, STORE | S |
| Editor layout: config panel (Info / Data / Chart / Appearance / Refresh) beside preview (Preview / Advanced / Data / Query). `DatavizEditor.tsx:103-163` | missing | `1:1` two-pane editor; phone: config in a sheet, preview above (`improved UX12`) | PHONE, PAT | L |
| Name: required, unique across charts (409), error jumps to Info tab. `InfoTab.tsx:13-28`, `CreateDataviz.ts:33-36` | missing | `1:1` | STORE, DRAFT | S |
| Embed snippets: `<Dataviz id height="320"/>` and external iframe; "Allow public embedding" on private instances. `EmbedPanel.tsx:38-104` | missing | `defer`: needs the Pages editor to render the tag and a public site | STORE, D1d | M |
| Input type Query or Manual; Manual = pasted chart JSON with "Load example", live parse error. `DataSourceKindSection.tsx:10-62`, `ManualDataEditor.tsx:17-88` | missing | `1:1` for Manual (only source that needs no entity query) | DATA | M |
| Entity scope: all entities or only public. `EntityScopeSection.tsx:14-60` | missing | `defer`: needs a publish flag on entities | DATA | S |
| Data sources: one or more templates (searchable modal), alias from 2 sources, join mode compare/union. `sources/*.tsx`, `JoinModeSection.tsx:11-47` | missing | `defer`: query builder over real entities | D1a, DATA | L |
| Filters: property, operator by type (eq, in, between, contains), value. `data/filters/*.tsx`, `filterOperators.ts:6-34` | missing | `defer` with the query builder | D1a, SCHEMA | L |
| Primary and second dimension, aggregation (sum/avg/min/max/count), date interval, max buckets. `DimensionSection.tsx:23-240` | missing | `defer` with the query builder | D1a, SCHEMA | L |
| Chart type grid: pie, donut, bar, horizontal bar, stacked bar, line, area, list, gauge, metric, scatter, heatmap; unsupported types disabled with reason. `ChartTab.tsx:49-90` | missing | `1:1` for the types the chart library supports; `improved (Design: dataviz skill palette)` | DATA | L |
| Chart options: legend, tooltip, labels, empty values, exclude zero, empty label, pie slices and "Others" label. `ChartTab.tsx:92-213` | missing | `1:1` | - | M |
| ECharts override JSON ("Advanced" tab). `ChartAdvancedSection.tsx:74-107` | missing | `drop`: prototype has no ECharts | - | S |
| Colour mode (palette, template colours, custom per value) and theme (transparent, background, foreground). `ColorModeSelect.tsx:9-79`, `ThemeColorsSection.tsx:12-57` | missing | `improved (Design: tokens)`: palette from tokens, dark-mode safe; custom colours kept | - | M |
| Refresh mode Live / Snapshot manual / Snapshot scheduled; Live blocked by joins, 2 dimensions, over 10,000 entities; silently falls back. `RefreshTab.tsx:173-282`, `useLiveRefreshGuard.ts:35-42` | missing | `drop`: no backend; show every chart as live | - | S |
| Schedule (daily / weekly / monthly, time in UTC) and "Update from collection". `RefreshTab.tsx:43-171,284-324` | missing | `drop`: no jobs in the prototype | - | S |
| Preview debounced 300 ms; spinner, error, "Configure data source and dimension to see a preview."; footer "N entities · generated <datetime>". `useDatavizPreview.ts:13`, `DatavizPreviewPanel.tsx:72-101` | missing | `1:1` states | PAT | M |
| Preview "Data", "Query" tabs and copy buttons for JSON. `JsonCopyPanel.tsx` | missing | `defer`: only useful with the query builder | - | S |
| Save runs the query and stores a snapshot; first save moves to edit URL; "Saving" label. `CreateDataviz.ts:30-74`, `httpDatavizApi.ts:26-31` | missing | `1:1` without snapshots (store the definition) | STORE, DRAFT | S |
| No dirty guard; Cancel discards silently (Uwazi gap). `DatavizEditor.tsx:74-80` | missing | `improved UX2`: register with the dirty guard; do not copy the gap | DRAFT | S |
| Empty list "NO DATA AVAILABLE"; errors "An error occurred" with no code. `DatavizList.tsx:30-33`, `mapDatavizHttpErrors.ts:11-38` | missing | `improved (Design: list-page empty state)` | PAT, NOTIFY | S |

**Prototype-only (not in Uwazi):** none.

**Recommendation: defer, size L** (new component family: chart renderer, editor, manual-data path; the query builder needs template and entity stores, so build it only after D1a). If Juan wants a demo slice later: Manual data + chart type + options + preview, also L.

---

## Global CSS & JS (Customisation)

Cite paths are under `app/react/V2/Routes/Settings/Customization/` unless shown. Prototype: `CustomisationPage.tsx`. QA: Save is a toast, CSS not injected, JS not run, textarea has no accessible name (axe critical). Review: B2, H3. Design: gutter fails, Reset is a raw button.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Title and nav label "Global CSS & JS" when `allowcustomJS` is on, else "Global CSS" and no JS tab. `Customization.tsx:59`, `SettingsNavigation.tsx:111-120` | partial: fixed label, JS tab always shown | `1:1`; flag is the Collection toggle "Global JS"; Design: use one name for page and file | D1d | S |
| Custom CSS editor (Monaco), prefilled from settings; no validation, no help text. `Customization.tsx:68-79,98-108` | partial: textarea with line count; no accessible name | `1:1` with a labelled code area (shared with Pages); no Monaco | PAT | S |
| Custom JS editor (Monaco), tab only when flag on; both editors stay mounted. `Customization.tsx:81-92` | partial: same as CSS | `1:1` | PAT, D1d | S |
| Save: disabled until changed; sends only edited slices in one request. `Customization.tsx:40-54` | no-op: toast only, text reverts on leaving (B2) | `1:1`; stored in the settings singleton | D1d, STORE | S |
| After save the baseline resets, Save disables again. `Customization.tsx:48-52` | partial: Save stays enabled (H3) | `1:1` | DRAFT | S |
| Dirty guard: `useBlocker(hasChanges)`, "Discard changes?". `Customization.tsx:31-38,120-122` | missing (B1) | `1:1` | DRAFT | S |
| Applied site-wide: CSS in `<style>` in the head of every page; JS in `<script>` only when the flag is on. `Root.jsx:145-166` | no-op: CSS not injected, JS not run | `improved (decision)`: inject CSS only into `PublicPreview` and the Pages preview, not the admin shell; store JS and do not run it | D1d, STORE | M |
| Notifications: "Saved successfully."; error "An error occurred" with server detail. `Customization.tsx:47-51` | partial: success toast, no error path | `1:1` | NOTIFY | S |
| Activity log stores the whole request body, so full CSS and JS text. `activitylogMiddleware.ts:42-58` | missing: nothing logged | `improved`: log "Updated custom CSS" with line counts, not the text (do not copy) | NOTIFY | S |
| Public read: CSS, JS and flag are readable by anyone through `GET /api/settings`. `publicSettings.ts:7-35` | n/a | `drop`: no server | - | S |
| Monaco failure renders an empty div; a failed load returns `{}` and a save would overwrite (assumed). `CodeEditorComponent.tsx:142-144` | n/a | `drop`: no Monaco, store always has a value | - | S |
| Layout: editor box starts at 28px against a 16px host gutter; code text `text-sm` against `text-[12px]` on Pages (Design) | partial: fails `window.__gutter()` | `improved (Design: Customisation finding)`: one shared code area on the gutter | PAT | S |
| Phone: editor works, 20rem min height. QA | works | `1:1` | PHONE | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Reset per tab (raw button, immediate) | keep, with confirm and on the bar ladder | Handy; Design: no confirm, off the ladder |
| Line count and tinted toolbar | keep | Cheap orientation aid |
| Cascading-styles warning line | keep | Design: good, should stay |

---

## Uploads

Cite paths are under `app/react/V2/Routes/Settings/CustomUploads/` unless shown. Prototype: `UploadsPage.tsx`. QA: upload is a no-op, Edit copies the URL, thumbnails are icons. Review: B2, M3, H2.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Table: Preview (icon or image thumbnail), Name (sortable), URL `/assets/<filename>`, Action. `UploadsTable.tsx:57-87` | partial: grid and list work; icons only, URL prefix `/uploads/` | `1:1` with real image thumbnails and `/assets/` URL | STORE, DATA, PHONE | M |
| "Import asset": modal with multi-file dropzone, Cancel / Add. `DropzoneModal.tsx:42-78` | no-op: toast, no file input | `improved (Design: Uploads finding)`: real file input plus drag-and-drop onto the page and the modal | STORE, PAT | M |
| Files upload one at a time with per-file progress line "Uploading... file N% (M remaining files)". `DropzoneModal.tsx:29-40`, `UploadService.ts:39-86` | missing | `1:1` as a Beacon task | NOTIFY | S |
| No client or server size or type limit (assumed proxy limit). `UploadMiddleware.ts:70` | missing | `keep (proto-only)`: cap per file (for example 2 MB), because files live in browser memory | STORE | S |
| URL cell is plain text, no copy. `UploadsTable.tsx` | works: Copy URL puts the path on the clipboard | `keep (proto-only)`: copy is better than Uwazi; give it its own action (UX5) | PAT | S |
| Row "Edit": side panel "Edit File", "File name" required, extension re-appended, URL unchanged. `EditFileSidepanel.tsx:20-82` | missing: list pencil copies the URL (M3) | `1:1` as a `Modal`; remove the mislabelled pencil | STORE, PAT | S |
| Delete (row and footer bulk): confirm lists file names, Cancel / Accept. `CustomUploads.tsx:157-166` | partial: confirm works, no usage check | `improved UX4`: dialog lists pages and CSS that reference the file | USAGE, STORE | S |
| Row checkboxes, footer shows "Delete" when rows are selected. `CustomUploads.tsx:107-148` | missing | `improved UX2`: selection action bar | PAT | S |
| Notifications "Uploaded custom file", "File updated", "Deleted custom file"; mixed results give both success and error. `CustomUploads.tsx:68-83` | partial: toasts, no error path | `1:1` | NOTIFY | S |
| Leaving during an upload asks "Discard changes?" (guard reads a non-reactive value, assumed flaky). `CustomUploads.tsx:56-66` | missing | `drop`: mock uploads finish in the session; revisit if progress is kept across navigation | - | S |
| Empty table "NO DATA AVAILABLE". `CustomUploads.tsx` | partial: "No assets match your search." even with zero files (Design) | `improved (Design: list-page empty state)`: separate "no uploads yet" and "no match" | PAT | S |
| Assets are usable from Pages and CSS through `/assets/<filename>` (public, no auth). `routes.ts:20` | missing: nothing reads uploads | `1:1`: preview and Pages resolve `/assets/<name>` to the stored file | STORE, D1d | M |
| Phone: grid 2-up works, list view table scrolls sideways. QA | partial | `improved UX12`: list rows, not a wide table | PHONE | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Grid / List toggle | keep | Grid is the useful view for images |
| Search by name or URL, type filter | keep | `improved UX1`; Uwazi has none; use `TextInput` as Activity log does (Design) |
| Copy URL action | keep | See row above |

---

## Preserve

Cite paths are under `app/react/V2/Routes/Settings/Preserve/` and `app/api/preserve/`. **The Uwazi page is a single card with one extension token, not a list.** The prototype builds a list of capture sources with schedule and authentication, which the inventory does not show in Uwazi. Prototype: `PreservePage.tsx`, `PreserveTokenEditor.tsx`. QA: New token and Save are no-ops, no token is generated, existing sources open blank.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Nav link shown only with `features.preserve.host`; route itself is not gated. `SettingsNavigation.tsx:92-100` | n/a: page always shown | `drop`: no feature flags in the prototype | - | S |
| Card "Preserve Extension": step 1 install the extension, step 2 request and copy the token into the extension settings; no link to the extension. `Preserve.tsx:30-79` | missing: page is a list of tokens | `1:1` card at the top of the page. The shipped CSV text for step 2 may differ from the inline text (assumed) | - | S |
| "Extension Token": read-only field with copy button, the current user's token. `Preserve.tsx:21-28,62-66` | partial: list "Copy token" shows a toast, copies nothing | `1:1` with a working clipboard copy | D1d | S |
| "Request token" (only when no token): calls the Preserve host for a token and stores it per user. `Preserve.tsx:15-19`, `preserve.ts:16-43` | no-op: not listed, no token generated | `1:1` mocked: generate a token, store it per user; second call returns the same token | D1d, STORE | S |
| First token creates a "Preserve" thesaurus and a "Preserve" template with Url (link) and Source (select). `preserve.ts:45-101` | missing | `defer`: needs the templates and thesauri stores | D1a, D1d, SCHEMA | M |
| Failed request (no config 402, host unreachable, bad master token) is an unhandled rejection; no loading or error UI. `Preserve.tsx:15-19` | missing | `improved (Design: shared states)`: busy state on the button and an error notification (do not copy the gap) | NOTIFY | S |
| No confirmation, not a form, no dirty guard. `Preserve.tsx` | partial: editor has Save and Cancel with no guard (B1) | `1:1` for the token card; guard only if the sources editor stays | DRAFT | S |
| Token and masterToken exposed to all admin sessions (Uwazi quirk). `publicSettings.ts:38-47` | n/a | `drop`: do not show other users' tokens | - | S |
| Captured pages become entities of the "Preserve" template (extension-side). `preserve.ts:78-101` | missing | `defer` with the template row | D1a, DATA | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Source list (name, URL, schedule, last run, status) and Source editor (name, URL, authentication, schedule) | decision for Juan: keep below the token card, or drop | Not in the inventory; Uwazi has no source or schedule UI. QA: existing sources open blank (Review finding 9) |
| Capture now, captures table, View / Re-capture, filter | same as above | Mock only |
| Revoke token (confirm) | keep as proposal | Uwazi has no revoke or regenerate; needs server support, so flag as a proposal |
| "New token" / "New capture source" / "Add source" wording | drop | Design: one noun; use "source" only if the list stays |

---

## Import CSV

Not a Settings page in the prototype: a separate top-level view (`views/ImportCSVView.tsx`, `components/import-csv/*`, seed in `data/imports.ts`), reached from the Tools menu and the Library "Import CSV". **QA did not drive it; the "Prototype today" column is from reading the code.** It keeps its list in `useState` and a `setInterval` that simulates progress inside the view, so leaving the view loses the list and stops the simulation. No entities are written. Cite paths are under `app/react/V2/Routes/Settings/CSVUpload/` (`S/CSV`) and `app/api/csv.v2/`.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Admin-only; nav "Import CSV" in Tools and a link in the Library footer. `SettingsNavigation.tsx:124-126` | works: Tools link and Library link (opens New import) | `keep (proto-only)`: separate view, not a Settings page | - | S |
| List header counters: Total, Processing, Completed, Failed (Failed includes Cancelled). `ImportsTable.tsx:307-363` | partial: Total, Processing, Completed shown; no Failed | `1:1` add Failed | - | S |
| Columns: Status, File, Template, Progress current/total, Entities created, Entities updated, Failed, Date, View; default sort Date descending. `ImportsTable.tsx:118-160` | partial: no "updated" column; phone list layout exists | `1:1` add Updated | DATA, PHONE | S |
| "Import CSV" opens a modal: one file (CSV or ZIP), Template select (first template preselected); Accept disabled without a file. `UploadFileModal.tsx:71-131` | partial: file is simulated (no real picker), template picker with search, none preselected | `1:1` with a real file input and ZIP accepted; keep the searchable picker | PAT | S |
| Template list comes from the templates cache; a deleted template shows its raw id. `ImportsTable.tsx:162-166` | partial: static `templates` from `data/imports.ts` | `1:1` read the templates store | D1a | S |
| Registering the import creates a task in the header Beacon ("CSV Import: Queued — file") and a notification on completed, failed, cancelled; user can leave the page. `CsvImportTasksSubscriber.tsx:86-168` | missing: no Beacon task; progress runs only while the view is open | `1:1` through the tasks store; move the simulation out of the view | NOTIFY, STORE | M |
| Pipeline stages with titles: Queued, Validating, Extracting files, Scanning, Creating thesauri, Creating relationships, Creating entities, Retrying, Completed, Failed, Cancelled, Completed with errors. `statusMessages.ts:9-82` | partial: uploading / processing / pending / completed (+ warnings, errors) and a short Stepper | `1:1` stage names and descriptions in the Stepper | - | S |
| Status page: file name, status pill, "Template / Date / Last updated". `UploadStatus.tsx:90-275` | works: title, status badge, source kind, created by, time | `1:1` | - | S |
| Six stat cards: Entities created, Entities updated, Rows processed, Rows failed, Thesauri values created, Related entities created ("-" for zero). `UploadStatus.tsx` | partial: Entities created and more, seed has thesauri and relationship counts | `1:1` full six | DATA | S |
| "Failure details" card (message, Stage, Code, Retryable) only when Failed. `UploadStatus.tsx` | partial: failed state shows a note, no stage, code or retryable | `1:1` | DATA | S |
| Row error table: Row (spreadsheet row number), Property, Message. `ErrorsTable.tsx:12-48` | partial: Issues table has field, issue, type, date; no row number | `1:1` add Row column | DATA | S |
| "Download failed rows" streams a CSV of failed rows. `DownloadCsvImportFailedRowsCsvController.ts:14-49` | missing | `1:1`: generate the CSV from the issues | - | S |
| Cancel import: modal "Canceling", text says created entities stay; button disabled for terminal states; task relabelled "Cancelled". `CancelProcessModal.tsx:42-76` | missing: only Delete exists | `1:1` with `Modal` and `BAR_DANGER` | PAT, NOTIFY | S |
| Empty state "No CSVs yet" with the hint to select Import CSV. `ImportsTable.tsx:279-304` | works: `ImportEmptyState` | `1:1` | - | S |
| Header rules: `id` column updates an existing entity; language columns `title__es`; messages such as `Column "X" does not exist in template "T".` `CsvHeaderAnalyzer.ts:5,74-186` | missing: no parsing | `defer`: needs templates schema and an entity write path; simulate with seeded issues | SCHEMA, D1a | L |
| Created entities appear in the Library. `CsvImportEntitiesJob.ts:102-125` | missing: no entity is written (code read) | `defer`: needs a write path to the entity overlay | STORE, DATA | M |
| Not a form; closing the modal discards the file; no guard. Live status updates by socket. `UploadFileModal.tsx`, `ImportsTable.tsx:211-277` | works: modal state resets; timer updates rows | `1:1` | - | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Delete selected and Delete current (confirm, removes the list entry only) | keep | Uwazi keeps an import history with no delete; list hygiene is useful. Make clear that created entities stay |
| Row checkboxes and select all | keep | Needed for the delete above |
| "Completed with warnings" status and warning-type issues | keep | Uwazi has only "Completed with errors"; warnings cover truncation notices |
| Created-entities table in the detail view (names generated from a pool) | keep only with real data, else drop | Uwazi has none; fabricated names must not look real in an evidence product |
| `ToolsActionBar` list and detail modes | keep | Matches Figma ToolsActionBar |

---

## Activity log

Cite paths are under `app/react/V2/Routes/Settings/ActivityLog/` unless shown. Prototype: `ActivityLogPage.tsx` on `seedActivityLog`. QA: search, action filter, user filter and row expand work; request line is fabricated; no logging of Settings actions; export, pagination, date filter missing. Review: M4, B7.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Table with footer "Showing X-Y of N" and paginator, 100 per page. `ActivityLog.tsx:75-129`, `ActivityLogLoader.ts:14,62` | missing: no footer, no pagination | `improved (Design: Activity log finding, add a footer)`; paginate when over a page | PAT | S |
| Columns: Action pill, User, Description (tooltip with Query and Body), Timestamp "DATE_MED - TIME_24", View. `TableElements.tsx:114-145` | works: pills fail contrast (carbon, amber); phone hides user and time | `1:1` columns; fix pill token pairs | PAT, PHONE | S |
| Action filter: multi-select CREATE, UPDATE, DELETE, MIGRATE, WARNING; WARNING matches nothing stored (assumed). `FiltersSidePanel.tsx:18-21,65-74`, `activityLogFilter.ts:150-166` | partial: single-select, 4 methods, upper-case labels | `improved (Design: Activity log finding)`: sentence-case labels, multi-select; `drop` WARNING | - | S |
| User filter: text, case-insensitive substring; "anonymous" matches entries with no user. `activityLogFilter.ts:203-214` | works: select from users in the log | `keep (proto-only)`: select instead of free text | - | S |
| Search: placeholder "by ids, methods, keywords, etc."; matches readable descriptions, then method, url, query, body. `activityLogFilter.ts:168-185` | works: matches summary text | `1:1` | - | S |
| Date range From / To with Today and Clear; `to` inclusive. `FiltersSidePanel.tsx:98-140` | missing | `1:1` | - | M |
| Filters in a side panel with Apply and Clear all; state kept in the URL; count pill on the button. `ActivityLog.tsx:42-44` | partial: inline live filters, no URL | `keep (proto-only)`: inline live filters (no router) | - | S |
| Sort by Action (HTTP method), User, Timestamp; default time descending. `ActivityLogLoader.ts:26,47-48` | missing: QA lists no sort | `1:1`; Action sorts by displayed label, not by HTTP method | - | S |
| Row "View" opens the "ACTIVITY" panel: description, pill, User card, raw Query and Body. `ActivityLogSidePanel.tsx:12-76` | partial: expandable row with a synthesised request line | `improved UX4`: expanded row shows what changed (fields, before and after) from the stored entry; any synthetic value labelled "example" | NOTIFY, DATA | M |
| Logs every non-GET `/api/*` request except an ignore list and 404s, including 400/401/500; only `password` is masked. `activitylogMiddleware.ts:33-78` | missing: seed rows only, no Settings action is logged | `improved UX4`: each Settings create, update, delete and import appends an entry (domain events, not HTTP) | NOTIFY | M |
| Descriptions from a lookup ("Updated settings", "Created page", ...); unmapped requests show as RAW `<METHOD> <url>`. `activitylogParser.ts:5-241` | partial: free-text summary per seed row | `1:1` summaries from the notify helper; `drop` RAW rows | NOTIFY | S |
| Dataviz, CSV import, Preserve and menu-link saves have no parsed description (RAW). `activitylogParser.ts` | n/a | `improved`: every logged action gets a summary; no RAW fallback | NOTIFY | S |
| Retention one year by TTL index; migration entries never expire. `activitylogMiddleware.ts:44` | n/a | `drop`: no server | - | S |
| Read-only: entries cannot be edited or deleted. `routes.js:7-18` | works | `1:1` | - | S |
| No export in Uwazi (inventory). | missing | `improved (Design: Activity log finding)`: CSV export in the page footer | PAT | S |
| API error: table is not rendered and no message is shown. `ActivityLogLoader.ts:105-113` | missing | `improved (Design: states)`: visible error with retry (do not copy the gap) | PAT | S |
| Empty result "NO DATA AVAILABLE", footer "Showing 1-0 of 0" (assumed). `PaginationState.tsx:13-24` | partial: count line updates | `improved (Design: list-page empty state)`: names the filters, offers "Clear filters" | PAT | S |
| "Last saved" line in editor footers ("Saved 2 min ago by admin"), read from this log; Dashboard "Recent activity" reads it too (Review D4). | missing | `improved UX11` | NOTIFY, DRAFT | S |
| Phone: user and time columns hidden below breakpoints. QA | works | `improved UX12`: list rows with user and time on a second line | PHONE | S |

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
|---|---|---|
| Synthesised "Request" line (`POST /api/entities { sharedId: "<fake hex>" … }`) | drop | Fabricated data in an evidence product; replace by real changed fields (Design) |
| Inline filter row and expand-in-place detail | keep | Fits the pane pattern; no side panel needed |
