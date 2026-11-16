# Settings deep dive, part 02: Pages, Data visualizations, Customisation, Uploads, Preserve, Import CSV, Activity log

Reference repo: huridocs/uwazi, branch `production`, v1.229.224 (shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`). All paths are repo-relative. Read-only research; no server was contacted.

Path abbreviations used below:

- `S/` = `app/react/V2/Routes/Settings/`
- `UI/` = `app/react/V2/Components/UI/`
- `DV/` = `app/react/V2/Dataviz/`
- `PG/` = `app/api/pages.v2/`
- `DZ/` = `app/api/dataviz.v2/`
- `CSV/` = `app/api/csv.v2/`

Labels: VERIFIED means the claim was read in code at the cited line. ASSUMED means inferred and not confirmed in code.

## Cross-cutting facts (apply to all seven pages)

| Topic | Fact | Source |
|---|---|---|
| Route guard | Every page here is wrapped in `adminsOnlyRoute`, which is `ProtectedRoute allowedRoles=['admin']`. A non-admin (editor, collaborator, anonymous) is not shown a 403; they are redirected with `<Navigate to="/login" replace />`. VERIFIED | `app/react/ProtectedRoute.tsx:4-28`; `app/react/Routes.tsx:346-515` |
| Parent route | `settings` is `loggedInUsersRoute(<Settings/>)` (any logged-in user). Settings shell = left nav rail + outlet. | `app/react/Routes.tsx:324`; `S/Settings.tsx:9-32` |
| Nav visibility | Nav links for these pages are inside `NeedAuthorization roles={['admin']}`. Preserve is also inside `FeatureToggle feature="preserve.host"`. | `S/SettingsNavigation.tsx:28-41, 89-126` |
| Server permission default | `needsAuthorization(roles = ['admin'])`: with no argument it means admin only. Failure returns HTTP 401 `{error:'Unauthorized', message:'Unauthorized'}`. VERIFIED | `app/api/auth/authMiddleware.ts:13-20` |
| Private instances | `privateInstanceMiddleware` returns 401 for anonymous requests to `/api/`, `/files/`, `/assets/`, `/uploaded_documents/` when settings are private; `embed/` and `/api/public` stay open. | `app/api/core/infrastructure/express/middlewares/PrivateInstanceMiddleware.ts:5-37`; registered `app/server.js:130` |
| Activity log middleware | `activitylogMiddleware` is registered globally and logs every non-GET/OPTIONS/HEAD `/api/` request after the response finishes (any status except 404). See the Activity log section. | `app/api/api.js:17`; `app/api/activitylog/activitylogMiddleware.ts:9-107` |
| Notifications | `notify(type, title, message?, details?)` from `useRequestStatus` adds an item to the notification centre and flashes the title in the header Beacon for about 3.2 s. There are no inline toasts on these pages. | `app/react/V2/atoms/requestStatusAtom.ts:144-154`; `UI/Notifications/RequestStatus.tsx:57-80` |
| Standard dialogs | `ConfirmationModal` (default buttons "Cancel" / "Accept", `dangerStyle` uses a red Accept) and `ConfirmNavigationModal` (header "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" / "Discard changes"). | `UI/ConfirmationModal.tsx:109-180`; `UI/ConfirmNavigationModal.tsx:11-40` |
| Empty table text | Default `Table` empty state is "NO DATA AVAILABLE". | `UI/Table/DefaultNoDataMessage.tsx:5-9` |
| JSON body cap | JSON body parser limit is 5 MB. ASSUMED to apply to every JSON route. | `app/api/utils/routesErrorHandler.ts:14` |

---

### Pages

- **Route / file**:
  - List: `/settings/pages`, loader `pagesListLoader` + component `PagesList`, `S/Pages/PagesList.tsx:26-29, 33` (route `app/react/Routes.tsx:347-348`).
  - New: `/settings/pages/new`, loader `pageEditorLoader` + `PageEditor` (`Routes.tsx:349-353`; `S/Pages/PageEditor.tsx:50-58, 60`).
  - Edit: `/settings/pages/edit/:sharedId?` (`Routes.tsx:354-358`). The `?` makes the id optional: `/settings/pages/edit` with no id loads `{}` (line 57) and behaves as a new page. VERIFIED.
  - Public pages that these editors feed: `/page/:sharedId[/:slug]` and `/page-draft/:sharedId[/:slug]`, no route guard (`Routes.tsx:318-321`), components `app/react/Pages/PageView.jsx`, `PageDraftView.jsx`.
- **Who can see it**:
  - Admin only, client route guard `adminsOnlyRoute` (`Routes.tsx:348, 351, 356`). Nav link `S/SettingsNavigation.tsx:37`.
  - Server permissions (`PG/infrastructure/http/routes.ts:11-31`):

    | Endpoint | Permission |
    |---|---|
    | `POST /api/pages` | `needsAuthorization(['admin'])` |
    | `DELETE /api/pages` | `needsAuthorization()` = admin |
    | `POST /api/pages/release` | admin |
    | `POST /api/pages/restore` | admin |
    | `GET /api/pages` | **no middleware** (public) |
    | `GET /api/page` | **no middleware** (public) |

  - On private instances, anonymous GETs are blocked by `PrivateInstanceMiddleware` (above). On public instances, `GET /api/page?sharedId=X&mode=editor` returns every locale's draft and all releases to anonymous callers (`PG/infrastructure/http/GetPageController.ts:7-15`; `PG/application/services/pageClientLoader.ts:51-68`). VERIFIED by absence of a guard.
  - No feature toggle.
- **Layout**:
  - List (top to bottom): header "Pages" (`SettingsContent.Header`), table with caption "Pages" and row checkboxes, footer bar. Footer shows button "Add page" when nothing is selected; when rows are selected it shows button "Delete" plus text "Selected N of M" (`PagesList.tsx:83-126`).
  - Editor: breadcrumb "Pages" > page title (`PageEditor.tsx:301-304`), language selector top right (only rendered when the collection has 2 or more languages, `S/Pages/components/PageEditorLanguageSelector.tsx:33`), tab strip Configuration / HTML / Javascript / CSS (`PageEditor.tsx:321-452`, `unmountTabs={false}`), footer buttons Cancel / Save & Preview / Save (`456-480`). While `settings.languages` is empty, the body shows "Loading" (`316-319`).
  - Configuration tab, top to bottom: markdown deprecation banner (only for existing pages with `markdownSupport`), toggle "Enable this page to be used as an entity view page:", input "Title", read-only copy field "URL" + link "View page" (only when the page is saved and is not an entity view), buttons "Restore" and "Publish" (`PageEditor.tsx:327-402`).
  - HTML tab: info banner above a Monaco editor (language `html`); Javascript tab: warning banner above Monaco (`javascript`); CSS tab: Monaco (`css`), no banner (`S/Pages/components/PageEditorCodeTabs.tsx:50-132`).
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Title (per language) | `InputField` text, `locales.<lang>.title` | New page: `t('System','New page')` for every language (en.csv:791 "New page"); existing: server value | Client: `required`, only for the active language (only mounted inputs are validated); error "This field is required". Server: `title` string, required key but empty string allowed (`app/shared/types/pageSchema.ts:149-154`) | label "Title" | `PageEditor.tsx:345-353`; `S/Pages/pageEditorForm.ts:5-10, 36-54` |
| Entity view | `ToggleButton` (`entityView`, page-wide, not per language) | `false` | Server: if any template uses the page as its entity view page and `entityView` is switched off, validation fails with "This page is in use by the following templates: <names>" | "Enable this page to be used as an entity view page:" | `PageEditor.tsx:336-343`; `app/shared/types/pageSchemaValidator.ts:11-37` |
| Markdown support | Not a control. Hidden `markdownSupport` boolean, page-wide. Only a banner button clears it | `false` (`=== true` coercion) | Cannot be re-enabled from UI. Dropped from payload for new pages when false | Banner: "Markdown support in custom pages will be discontinued starting in 2027. Upgrade this page when its content no longer relies on Markdown syntax." Button "This page does not need Markdown" | `PageEditorComponents.tsx:62-86`; `PageEditor.tsx:331-335`; `pageEditorForm.ts:60-68, 93-95` |
| Language | `LanguageSelect` dropdown, aria-label "Page language" | Collection default language | n/a; options sorted by localised language name | none | `PageEditorLanguageSelector.tsx:14-52`; `pageEditorForm.ts:25-28` |
| URL (read-only) | `CopyValueInput` value `/<lang>/page/<sharedId>/<kebab-title>` | derived | slug is display-only, not stored or used for lookup | label "URL"; link "View page" (opens new tab) | `PageEditor.tsx:355-374`; `S/Pages/components/pageUrls.ts:3-12` |
| HTML content (per language) | Monaco (`CodeEditor`, lazy chunk), fallback `<textarea>` if Monaco fails | `''` | `string` | Info banner (markdown on): "You can embed advanced components like maps, charts and entity lists in your page." + link "Learn more about the components." Info banner (markdown off): "This page uses HTML only (Markdown is not processed). You can embed maps, charts, entity lists, and other components." + same link | `PageEditorCodeTabs.tsx:50-78`; `PageEditorComponents.tsx:8-60`; `app/react/V2/Components/CodeEditor/CodeEditorComponent.tsx:62-85, 142-144` |
| JS (per language) | Monaco `javascript` | `''` | `string` | Warning banner: "With great power comes great responsibility!" / "This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities." / "It could also very easily break the app. Only write code here if you know exactly what you are doing." | `PageEditorCodeTabs.tsx:80-105`; `PageEditorComponents.tsx:88-112` |
| CSS (per language) | Monaco `css` | `''` | `string` | none | `PageEditorCodeTabs.tsx:107-132` |
| Release message (modal) | `<textarea id="release-message">` | `''` | Publish button disabled while trimmed value is empty. Server: `z.string().trim().min(1)` | label "Release message" | `S/Pages/components/PageReleaseModal.tsx:33-52`; `app/shared/contracts/Pages.ts:4-7` |
| Restore selection (modal) | single-select list of releases of the active language, no checkboxes, no filters | none | Restore button enabled only when exactly one item is selected | rows show message (first 48 chars, or "-") and date `toLocaleDateString()`; empty text "No releases yet" | `S/Pages/components/PageRestoreModal.tsx:29-69, 75-82` |
| sharedId | hidden input | server value | n/a | none | `PageEditor.tsx:329` |

Note: `S/Pages/components/PageEditorConfigTab.tsx` is an older single-title version of the Configuration tab. Nothing imports it (grep for `PageEditorConfigTab` finds only its own file). VERIFIED dead code.

- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| List: "Add page" | `I18NLink` to `/settings/pages/new` (`PagesList.tsx:118-122`) | none |
| List: row "View" | Opens `/page/<sharedId>/<slug>` in a new tab; button and link disabled when `entityView` is true (`PageListTable.tsx:14-32`) | none |
| List: row "Edit" | Link to `/settings/pages/edit/<sharedId>` | `GET /api/page?sharedId=&mode=editor` (`V2/api/pages/index.ts:33-44`) via `GetPageController` (`:7-15`), returns all installed languages' drafts plus `releasesByLocale` |
| List: row checkbox + footer "Delete" | Opens confirmation (below). On accept, one `DELETE` per selected row in `Promise.all`, then `revalidate()` (`PagesList.tsx:40-53`) | `DELETE /api/pages?sharedId=` (`V2/api/pages/index.ts:59-66`) -> `DeletePageController` (`:7-14`) -> `DeletePageUseCase` (`PG/application/useCases/DeletePage.ts:20-36`): loads page (404 `PageNotFoundError` if no locales), refuses with 409 `PageInUseByTemplatesError` if any template uses it as entity view, else in one transaction `deleteMany({sharedId})` on collection `pages` and deletes its releases in `page_releases` (`PG/infrastructure/mongodb/MongoPagesDataSource.ts:41-43`). Returns `{ok:true}` |
| Editor: language selector | `setActiveLocale`; re-keys Monaco instances (`key=html-<lang>-<layoutKey>`) | none |
| Editor: toggle entity view | `setValue('entityView', !v, {shouldDirty:true})` | none until Save |
| Editor: banner "This page does not need Markdown" | `setValue('markdownSupport', false, {shouldDirty:true})` | persisted on next Save |
| Editor: "Save" | `handleSubmit(handleSave)`: merges Monaco values from `editorDraftValuesRef`, builds payload with `buildEditorSavePayload` (all languages), `pagesAPI.save`, notifies, then on first save navigates (replace) to `/settings/pages/edit/<new sharedId>`, otherwise revalidates (`PageEditor.tsx:196-230`; `pageEditorForm.ts:70-98`) | `POST /api/pages` -> `SavePageController` (`:10-28`): body with `sharedId` -> `UpdatePageUseCase` (`PG/application/useCases/UpdatePage.ts:29-68`), else `CreatePageUseCase` (`CreatePage.ts:33-84`). Validation `validatePageEditor` (AJV `PageEditorSchema`, `app/shared/types/pageSchema.ts:132-161`: `locales` required, min 1 key, each locale needs `title`; `additionalProperties:false`). Unknown language keys give 400 `UnknownPageLanguageKeysError`. Create: new `sharedId`, one locale per installed language seeded with the default-language title, `insertOne` into `pages` (`MongoPagesDataSource.ts:27-30`). Update: `$set` of the whole document (`:32-39`). Saving never writes a release. |
| Editor: "Save & Preview" | Same save, then `window.open(<origin>/<activeLang>/page-draft/<sharedId>/<slug>)` (`PageEditor.tsx:232-246`). Disabled when `entityView` is on or the form is submitting (`:464-471`) | same as Save |
| Editor: "Publish" (Configuration tab) | Disabled until the page has a `sharedId`; opens "Publish release" modal (`PageEditor.tsx:388-399`) | see Confirmations |
| Editor: "Restore" (Configuration tab) | Disabled until the page has a `sharedId`; opens "Restore previous version" modal (`:377-387`) | see Confirmations |
| Editor: "Cancel" | `Link` to `/settings/pages` (`:458-462`); goes through the dirty-state blocker | none |
| Editor: "View page" link | New tab to `/<lang>/page/<sharedId>/<slug>` | public `GET /api/page` |

Side effects on languages (not user-triggered here): `LanguageAddedEvent` copies the default-language locale into every page (`PG/application/useCases/AddLanguageToPages.ts:37`, listener `PG/infrastructure/listeners/AddLanguagePagesListener.ts`); `LanguageDeletedEvent` removes that locale from every page and silently skips pages where it would remove the last locale (`RemoveLanguageFromPages.ts:19-33`).

- **Confirmations**:
  - Delete (list): `ConfirmationModal` size lg. Header "Are you sure?", warning text "Do you want to delete the following items?", body = bullet list of selected page titles, buttons "Cancel" / "Accept" (not danger-styled) (`PagesList.tsx:128-139`). Accept deletes; Cancel/close closes.
  - Publish (editor): modal "Publish release" with textarea "Release message", buttons "Cancel" / "Publish" (`PageReleaseModal.tsx:24-56`). Publish = `save(getValues())` (all languages, so unsaved edits are saved first) then `POST /api/pages/release {sharedId, release_message}` (`PageEditor.tsx:248-273`). Server `PublishPageReleaseUseCase` (`PG/application/useCases/PublishPageRelease.ts:22-44`) inserts a snapshot into `page_releases` with `version = max+1`, message, user id, date, and the title and draft (content/script/css) of every installed language (`PG/domain/Page.ts:113-149`). Success notification "Page published successfully."; modal closes, message cleared.
  - Restore (editor): modal "Restore previous version" with the release list, buttons "Cancel" / "Restore" (`PageRestoreModal.tsx:52-83`). `POST /api/pages/restore {sharedId, version}` -> `RestorePageDraftUseCase` (`PG/application/useCases/RestorePageDraft.ts:22-39`) overwrites the draft **title and content/script/css of every installed language present in the snapshot** (not only the language being viewed) (`PG/domain/Page.ts:151-166`), `$set` update. No extra "are you sure" step and no check for unsaved form edits; the loader then re-seeds the form (`PageEditor.tsx:134-152, 275-294`). Success: "Draft restored from release." Missing version: 404 `PageReleaseNotFoundError`.
  - Leave with unsaved changes: `useBlocker(isDirty && !isSubmitting)` -> `ConfirmNavigationModal` ("Discard changes?") (`PageEditor.tsx:166-172, 510-515`).
- **Empty / loading / error / notification states**:
  - Empty list: "NO DATA AVAILABLE" (default table text; `PagesList.tsx:87-98` does not pass a custom one).
  - Editor loading: "Loading" until languages exist (`PageEditor.tsx:316-319`); Monaco shows "Loading ..." while its lazy chunk loads (`CodeEditor.tsx:15-19`).
  - Success: "Saved successfully." (save), "Deleted successfully." (list delete), "Page published successfully.", "Draft restored from release."
  - Error: title "An error occurred", with the server message as details for save/publish/restore (`PageEditor.tsx:174-186, 265, 286`). List delete shows only "An error occurred" with no details, so the 409 "in use by templates" message is not shown to the user (`PagesList.tsx:46-52`). VERIFIED.
  - Field error: "This field is required" under the active-language Title.
- **Save model**: Save button for the whole document (all languages in one request). No autosave. Dirty tracking via react-hook-form `dirtyFields`; Monaco changes call `setValue(..., {shouldDirty:true})`. `useBlocker` guards in-app navigation only; no `beforeunload` handler found in these files (VERIFIED by grep of `S/Pages`). After a successful save: new page navigates to the edit URL (replace), existing page revalidates and the form is reset from server data when the loader signature changes (`PageEditor.tsx:83-94, 134-152`). Publish and Restore are separate server actions with their own modals.
- **V1 vs V2**: V1 settings UI removed. Server: no `app/api/pages` directory exists; only `app/api/pages.v2` (clean-architecture, Mongo collections `pages` and `page_releases`). Client leftovers in `app/react/Pages/`: `EditPage.jsx`, `NewPage.jsx`, `Pages.jsx` import `#app/Pages/components/PageCreator.js` and `PagesList.js`, which do not exist, and nothing imports them (VERIFIED by grep); `actions/pageActions.ts` (redux `savePage`/`deletePage`) has no consumer. Still live from that folder: `PageView.jsx`, `PageDraftView.jsx`, `components/PageViewer.jsx`, `Script.js`, `PageStyle.js`, `utils/getPageAssets.ts` (public rendering) and the `page` Redux reducer (`app/react/reducer.js:4`). The API still accepts the legacy flat payload (`title`, `draft`, `metadata`) in addition to the editor `locales` payload (`PG/application/services/pageProjection.ts:49-79, 166-167`).
- **Notes/gotchas**:
  - Published vs draft on the public site: `/page/...` shows the **last release** if one exists, otherwise falls back to the draft. So a page that was never published is already public with its draft content, and "Publish" only freezes versions (`app/shared/pages/pageContent.ts:38-67`). After the first release, later saves are visible only at `/page-draft/...` until published again. `/page-draft` has no route guard and relies on the unguarded `GET /api/page`.
  - Page JavaScript runs on the public page without checking the `allowcustomJS` setting (`app/react/Pages/components/PageViewer.jsx:91-93, 126-131`). The Global JS toggle only gates the site-wide script (see Customisation). VERIFIED by absence.
  - Release snapshots hold title plus content/script/css of all languages, but the client release object returned to the editor only has content/script/css/message/user/date (`PG/application/services/pageProjection.ts:8-19`). The restore list shows release message and date, not the version number.
  - Restore modal lists releases of the active language only (`PageEditor.tsx:105-113`) but restore affects all languages.
  - Entity-view pages (`entityView: true`): "View" in the list and "Save & Preview" in the editor are disabled; the URL field and "View page" link are hidden.
  - Slug is derived from the title in the UI language of the list loader and is not stored; the URL column shows `/page/<sharedId>/<slug>` without a language prefix (`PageListTable.tsx:42-45`).
  - New pages get the same default title string for every language, because `t('System', ...)` resolves in the current UI language (ASSUMED; the comment at `pageEditorForm.ts:7` suggests per-language intent).
  - Page-embedded charts use the tag `<Dataviz id="<id>" height="320"/>` (see Data visualizations).

---

### Data visualizations

- **Route / file**:
  - List `/settings/dataviz`: loader `datavizListLoader`, component `DatavizList` (`S/Dataviz/DatavizList.tsx:27-35, 39`; route `Routes.tsx:360-365`).
  - New `/settings/dataviz/new`: loader `datavizNewLoader` (`S/Dataviz/DatavizEditorRoute.tsx:17-24`), component `DatavizEditorRoute` (`:36`); route `Routes.tsx:366-371`.
  - Edit `/settings/dataviz/edit/:id`: loader `datavizEditorLoader` (`DatavizEditorRoute.tsx:26-34`); route `Routes.tsx:372-377`.
  - Editor component `DV/editor/DatavizEditor.tsx:25`. External embed route (server HTML): `GET /embed/dataviz/:id` (`DZ/infrastructure/http/routes.ts:15`).
- **Who can see it**:
  - Admin only, `adminsOnlyRoute`. Nav "Data visualizations" `S/SettingsNavigation.tsx:38`. No feature toggle found.
  - Server (`DZ/infrastructure/http/routes.ts:14-42`):

    | Endpoint | Permission |
    |---|---|
    | `GET /api/dataviz` (list) | `needsAuthorization()` = admin |
    | `GET /api/dataviz/:id` | admin |
    | `POST /api/dataviz` | admin |
    | `PUT /api/dataviz/:id` | admin |
    | `DELETE /api/dataviz/:id` | admin |
    | `GET /api/dataviz/:id/data` | admin |
    | `POST /api/dataviz/:id/preview` | admin |
    | `POST /api/dataviz/:id/refresh` | admin |
    | `GET /api/public/dataviz/:id/data`, `GET /embed/dataviz/:id` | none at route level; the use case throws `DatavizUnauthorizedError` (401) when settings are private, the caller is anonymous and the chart's `embedPublic` is false (`DZ/application/useCases/GetPublicDatavizEmbed.ts:33-40`) |

- **Layout**:
  - List: header "Data visualizations"; table captioned "Data visualizations" with checkboxes; footer button "Create visualization" (nothing selected) or "Delete" + "Selected N of M" (`DatavizList.tsx:90-128`). Columns: Name, Chart, Refresh, Last updated, Action ("Edit") (`DV`-side cells in `S/Dataviz/components/TableComponents.tsx:23-67`). Default sort: name ascending (`DatavizList.tsx:107`). Chart column shows the label from `CHART_TYPE_LABELS`; Refresh shows "Live" / "Snapshot (manual)" / "Snapshot (scheduled)" or "Manual data" for manual sources; Last updated is `toLocaleString()` or an em dash.
  - Editor: breadcrumb "Data visualizations" > name (or "Untitled visualization"); body is two panels on a parchment background: left config panel 32 rem wide with tabs Info / Data / Chart / Appearance / Refresh, right preview panel with tabs Preview / Advanced / Data / Query and a corner badge ("Live", "Manual snapshot", "Scheduled" or "Manual data") (`DV/editor/DatavizEditor.tsx:103-163`; `DV/editor/components/layout/DatavizEditorConfigPanel.tsx:44-108`; `DV/editor/components/preview/DatavizPreviewPanel.tsx:192-268`). Footer: Cancel, Delete (saved charts only), Save.
  - Refresh tab is hidden for manual-data charts; Advanced tab is hidden for `list` and `metric`; Query tab is hidden for manual data (`DatavizEditorConfigPanel.tsx:42, 69`; `DatavizPreviewPanel.tsx:207, 229`; effect `DatavizEditor.tsx:47-59`).
  - Initial active tab: Data if the definition already has dimensions, else Info (`DatavizEditor.tsx:40-42`).
- **Fields** (all in one `DatavizDefinition`; labels in this editor are mostly plain string literals, not `Translate` components. ASSUMED that `InputField`/`Select` do not translate string labels; not checked):

| Field | Type/control | Default | Validation | Help text / copy | file:line |
|---|---|---|---|---|---|
| Name | `InputField` text (Info tab) | "Untitled visualization" | Server: trimmed, min 1 ("Dataviz name is required"); unique across all charts (409 `DATAVIZ_DUPLICATE_NAME`); client shows "This data visualization name already exists. Enter a unique name." and jumps to Info tab | label "Name" | `DV/editor/components/tabs/InfoTab.tsx:13-28`; `S/Dataviz/createDraftDatavizInput.ts:5`; `DZ/application/useCases/CreateDataviz.ts:33-36`; `DatavizEditor.tsx:82-85` |
| Embed (Info tab) | Read-only snippets + toggle | n/a | Unsaved chart: "Save the visualization to get embed code." | See Actions | `DV/editor/components/sidebar/EmbedPanel.tsx:38-104` |
| embedPublic | `ToggleButton` "Allow public embedding without login" (only shown when the instance is private) | `false` | boolean | If not allowed: "Enable public embedding to use this chart in external sites on private instances." | `EmbedPanel.tsx:71-101`; `app/shared/embed/canUseExternalEmbed.ts` |
| Input type | Radio cards `dataSource` | Query | `query` or `manual` | "Query: Load data from entity templates." / "Manual: Paste chart-ready JSON."; section title "Input type" | `DV/editor/components/data/DataSourceKindSection.tsx:10-62` |
| Entity scope (query only) | Radio cards `query.includeUnpublished` | Include all entities (`true`) | boolean | "Include all entities: Published and unpublished entities are counted." / "Include only public: Only published entities are counted." | `DV/editor/components/data/EntityScopeSection.tsx:14-60`; default `createDraftDatavizInput.ts:11` |
| Data sources (query only) | List of template selects; "+ Add data source" opens a searchable template modal | New chart: first template from the templates list (`datavizNewLoader`, `DatavizEditorRoute.tsx:20-23`) | At least 1 source (server `min(1)`, "At least one data source is required"); remove button only when more than 1 source; alias field shown from 2 sources, placeholder "e.g. hombres" | Section "Data sources"; modal "Add data source", search label "Search templates", placeholder "Type to filter…", empty "No templates available to add." | `DV/editor/components/data/sources/*.tsx`; `DZ/application/contracts/datavizInputSchemas.ts:5-13` |
| Multi-source mode (2+ sources and a dimension) | Select `query.join` | Compare side by side | `compare` or `union` | "Compare side by side: Each data source becomes its own series on the chart." / "Combine counts: Merge buckets from all sources into a single series." Relationship joins are rejected by the server | `sources/JoinModeSection.tsx:11-47`; `DZ/domain/validators/validateExecutableDatavizQuery.ts:18-20` |
| Filters (query only) | Rows: property select, operator select, value input; "+ Add filter", remove "x" | none | Operators by property type: select eq/ne/in/nin, multiselect in/nin, numeric eq/ne/gte/lte/between, date types gte/lte/between, generatedid eq/ne/contains, text contains/eq/ne | Section "Filters": "Narrow entities before aggregation. With multiple sources, pick the property under the source alias so each filter applies only to that series." Operator labels Equals, Is not, Is any of, Is not any of, From (≥), Up to (≤), Between, Contains | `data/filters/*.tsx`; `DV/utils/filterOperators.ts:6-34` |
| Primary dimension | Select property + conditional Aggregation, Date interval, Max buckets | none | Server: at least one dimension unless the query is a metric count ("At least one dimension is required for this measure"). Max buckets `Number(v) \|\| 10` | Title "Primary dimension (X-axis / categories)"; Aggregation options Sum/Avg/Min/Max/Count (numeric); Date interval Year/Month/Week/Computed years; multi-source note: "Only properties with the same name and configuration in every data source are available for both dimensions." Multi-source adds option "Entity type (template)" | `DV/editor/components/data/DimensionSection.tsx:23-36, 117-240`; `DataTab.tsx:208-217` |
| Second dimension | Same control, option "None" | none | excludes the primary property | Title "Second dimension (series / stacks)"; hints for two categorical dimensions (stacked bar), date/numeric x select (line/area), date/numeric x numeric (scatter, heatmap) | `DataTab.tsx:218-253` |
| Manual data | Monaco `json` editor 20 rem high + "Load example" | `MANUAL_DATA_EXAMPLE` when switching to Manual | Parsed live; parse error text shown in red under the editor; server revalidates (`validateManualData`) | "Provide chart-ready data as JSON. Each series needs id, label, and a points array with label and value per row. Optional key on points helps stable colors." / "Preview updates when the JSON is valid." Modal "Load example" (search "Search chart types", "No chart types match your search.") | `data/ManualDataEditor.tsx:17-88`; `data/LoadManualExampleModal.tsx` |
| Chart type | 3-column grid of buttons with icons; unsupported types disabled with a tooltip reason | Pie | Types: Pie, Donut, Bar, Horizontal bar, Stacked bar, Line, Area, List, Gauge, Metric, Scatter, Heatmap, enabled by `getSupportedChartTypes` for the current dimensions/measures | Title "Chart type"; callout "Supported chart types for this configuration" / "…for manual data" / "Select a dimension to see supported chart types, or use Metric for a total count." | `DV/editor/components/tabs/ChartTab.tsx:49-90`; `DV/types/chartTypes.ts:10-41`; `SupportedChartTypesCallout.tsx` |
| Chart options | Checkboxes: "Show legend", "Show tooltip", "Show labels on chart", "Show empty values (No data)", "Exclude zero values"; text "Empty value label" (default "No data"); pie/donut: Select "Label format" (Percentage / Value / Value and percentage), number "Max number of slices" (10), text "Others label" ("Other") | showLegend/showTooltip/showLabels true; scatter forces showLabels false | visibility per chart type (`getChartOptionVisibility`) | Messages for Metric ("Metric shows a single total count. Select Pie, Bar, or another chart type above to configure categories, labels, and slices. Use the Appearance tab for colors."), List ("List renders as a table. Use the options below to filter empty or zero values."), no-options ("This chart type has no extra options. Select another chart type above if you need legend, labels, or data filters.") | `ChartTab.tsx:92-213`; `DV/utils/getChartOptionVisibility.ts:11-55` |
| ECharts overrides (preview "Advanced" tab) | Monaco `json` | `{}` | Invalid JSON: "Invalid JSON — overrides not applied until fixed." (kept in editor, not applied) | "Advanced ECharts overrides": "Deep-merged onto the generated ECharts option. Use for fine-tuning options not exposed in the Chart tab." plus read-only copyable "Echarts configuration" | `DV/editor/components/tabs/ChartAdvancedSection.tsx:74-107` |
| Color mode | Select | Chart palette (`theme`) | Options filtered: Template colors only for multi-source or entity-type dimension; Custom colors only when the preview has targets; legacy `from_data` is shown as Chart palette | Hints per mode, e.g. "Assigns colors in order from a fixed palette. Repeats when there are more values than colors."; custom map editor shows "Load a preview to map colors to each category or slice." etc. | `DV/editor/components/appearance/ColorModeSelect.tsx:9-79`; `CustomValueColorMapEditor.tsx`; `AppearanceTab.tsx:56-106` |
| Chart theme | Checkbox "Transparent background", color pickers "Background" (#ffffff) and "Foreground" (#1a1a1a) | white / dark | hex | Section "Chart theme" | `appearance/ThemeColorsSection.tsx:12-57` |
| Refresh mode | Radio cards | Live | Live disabled (red-listed with reasons) for relationship joins, multiple sources, two dimensions, more than 10,000 entities, truncated results, queries over 10 s, timeouts, or preview errors. If current mode is live and becomes disallowed, the editor silently switches it to "Snapshot (manual)" | "Live (always up to date)", "Snapshot (manual)", "Snapshot (scheduled)" with descriptions; reason bullets e.g. "Live refresh is not available when multiple data sources are combined." | `DV/editor/components/tabs/RefreshTab.tsx:17-39, 173-282`; `DV/editor/hooks/useLiveRefreshGuard.ts:35-42`; `DV/utils/refreshModeConstraints.ts:23-33`; limits `app/shared/types/datavizSchema.ts:251-253` |
| Schedule (scheduled mode) | Select "Frequency" Daily/Weekly/Monthly; time input "Time (UTC)" with local-time echo | Daily; random 15-minute slot between 01:00 and 08:00 local, stored in UTC | `HH:MM` | "Schedules run in UTC (Coordinated Universal Time)." | `RefreshTab.tsx:43-92, 284-324` |

- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Create visualization" | Link to `/settings/dataviz/new`; loader builds a local draft with id `dv_new` (`DatavizEditorRoute.tsx:17-24`; `createDraftDatavizInput.ts:29-32`) | `GET` templates list only (no chart request) |
| Row "Edit" | Link to edit route | `GET /api/dataviz/:id` -> `GetDatavizDefinitionController` |
| Footer "Delete" (list) / "Delete" (editor footer, saved charts only) | Opens confirm (below); list deletes in `Promise.all`; editor deletes one | `DELETE /api/dataviz/:id` -> `DeleteDatavizUseCase` (`DZ/application/useCases/DeleteDataviz.ts:17-26`): cancels pending scheduled jobs, then in one transaction deletes snapshots (`dataviz_snapshots`) and the definition (`dataviz`). Returns `{id}`. Does not check whether pages embed the chart. |
| "Save" | `api.saveDefinition`: persisted id -> `PUT`, draft id -> `POST` without id/createdAt/updatedAt (`DV/api/httpDatavizApi.ts:26-31`). Button shows "Saving" while in flight. First save navigates (replace) to `/settings/dataviz/edit/<id>` then notifies | `POST /api/dataviz` -> `CreateDatavizUseCase` (`DZ/application/useCases/CreateDataviz.ts:30-74`) or `PUT /api/dataviz/:id` -> `UpdateDatavizUseCase` (`UpdateDataviz.ts:30-96`). Both: zod body check, duplicate-name check, domain validation (name, executable query or manual data, live-refresh allowed), `normalizeDatavizRefresh`, then **execute the query and store a snapshot** in `dataviz_snapshots` (create always; update only when query, chart, appearance, data source or manual data changed), update `refresh.lastRefreshedAt` and `nextScheduledAt`. Scheduled charts (re)schedule a refresh job; update cancels pending jobs first and runs immediately if query/refresh changed without a snapshot change. |
| "Update from collection" (Refresh tab, snapshot modes) | Calls refresh, re-reads the definition, patches `lastRefreshedAt`/`nextScheduledAt` locally. Disabled when unsaved, while running, and for 10 s after the last refresh (`RefreshTab.tsx:94-171, 237-249`) | `POST /api/dataviz/:id/refresh` -> `RefreshDatavizSnapshotJob` (`DZ/infrastructure/http/RefreshDatavizSnapshotController.ts:4-9`) |
| Preview (automatic) | 300 ms debounce after any query change; manual data parsed locally (`DV/editor/hooks/useDatavizPreview.ts:13, 70-113`) | `POST /api/dataviz/:id/preview {query}` -> `GetDatavizDataUseCase` with `draftQuery`; unsaved charts (`dv_new`) run the query without a stored definition (`DZ/application/useCases/GetDatavizData.ts:27-33`) |
| Embed: copy buttons | `CopyValueInput` for "Page embed code" `<Dataviz id="<id>" height="320"/>` and "External iframe code" `<iframe src="<origin>/embed/dataviz/<id>?locale=<default>" width="100%" height="400" frameborder="0" loading="lazy">` (`DV/utils/buildEmbedSnippet.ts:1-18`) | `GET /embed/dataviz/:id` renders HTML (`DZ/infrastructure/http/DatavizEmbedHtmlController.ts:19-36`) |
| Preview panel "Copy" (Data / Query / Echarts configuration) | Copies JSON to clipboard, shows "Copied" for 2 s (`preview/JsonCopyPanel.tsx`) | none |

- **Confirmations**:
  - Delete from list: `ConfirmationModal` danger style, header "Delete", body "Are you sure you want to delete the selected visualizations? This action cannot be undone.", buttons "Cancel" / "Accept" (`DatavizList.tsx:129-142`).
  - Delete from editor: same style, body "Are you sure you want to delete this visualization? This action cannot be undone." (`DatavizEditorRoute.tsx:66-78`). For an unsaved draft the route skips the API and just navigates to the list (`:43-48`).
  - No unsaved-changes confirmation (see Save model).
- **Empty / loading / error / notification states**:
  - Empty list: "NO DATA AVAILABLE". List loader throws if the API call fails (`DatavizList.tsx:30-33`).
  - Preview: spinner (`DatavizLoadingIndicator`); error text in red; "Configure data source and dimension to see a preview." (query) or "Enter valid manual data JSON to see a preview." (manual); "This chart type cannot display the current data. Pick a supported type in the Chart tab."; footer "N entities · generated <datetime>" (`DatavizPreviewPanel.tsx:72-101`).
  - Success toasts: "Saved successfully.", "Deleted successfully.", "Visualization data updated from your collection."
  - Errors: "An error occurred" for any save/delete/refresh failure except duplicate name (which uses the inline name error). Server error codes (`DZ/domain/errors.ts`) are not surfaced: `DATAVIZ_INVALID_QUERY` returns 400, not-found 404, unauthorized 401, processing/snapshot-unavailable 503, duplicate 409 (`DZ/infrastructure/http/mapDatavizHttpErrors.ts:11-38`). `DatavizLiveNotAllowedError` and `DatavizBrokenError` are not mapped there, so they fall through to the generic error handler (ASSUMED 500).
- **Save model**: One Save button for the whole definition; edits are held in a reducer (`DV/editor/hooks/useDatavizEditorState.ts`) and sent on Save. **No dirty-state guard**: no `useBlocker` or `beforeunload` in `DV/` or `S/Dataviz/` (VERIFIED by grep). Cancel is a plain link and discards edits silently. After save the saved definition replaces local state (`DatavizEditor.tsx:74-80`).
- **V1 vs V2**: No V1 implementation; the feature exists only as V2 (`app/api/dataviz.v2`, `app/react/V2/Dataviz`). Storage: Mongo collections `dataviz` and `dataviz_snapshots` (`DZ/infrastructure/mongodb/MongoDatavizDataSource.ts:11`, `MongoDatavizSnapshotsDataSource.ts:16`); query execution reads `entities` (`MongoDatavizQueryExecutor.ts:28`), with a PostgreSQL executor also present (`PostgresDatavizQueryExecutor.ts`; which one is active is not verified).
- **Notes/gotchas**:
  - `GET /api/dataviz/:id/data` and `/api/dataviz` list are admin only, so page embeds do not use them; the markdown `<Dataviz>` component calls the public endpoint `GET /api/public/dataviz/:id/data` (`app/react/V2/api/dataviz/index.ts:98-122`; `app/react/V2/Dataviz/embed/DatavizEmbedById.tsx`; `app/react/Markdown/components/Dataviz.tsx`).
  - Public embeds read the stored snapshot (or run a live query for live charts) with optional `externalFilters` JSON query parameter (invalid JSON -> 400 "Invalid externalFilters JSON", `PublicGetDatavizEmbedController.ts:11-17`).
  - Duplicate-name check is an exact match on `name` (`MongoDatavizDataSource.ts:44-47`), case sensitive.
  - Deleting a chart leaves any `<Dataviz id=...>` tags in pages pointing at a missing chart; the embed renders "No visualization data available." or the error text.
  - The activity log has no parsed entry for `/api/dataviz*`; these actions appear as raw "POST: /api/dataviz" lines (see Activity log).

---

### Customisation (Global CSS & JS)

- **Route / file**: `/settings/customisation`; loader `customisationLoader` (`S/Customization/Customization.tsx:14-23`), component `Customisation` (`:25`); route `app/react/Routes.tsx:487-491`. Folder is spelled `Customization`, route and component `customisation`.
- **Who can see it**:
  - Admin only (`adminsOnlyRoute`). Nav link text depends on the flag: "Global CSS & JS" when `allowcustomJS` is true, otherwise "Global CSS" (`S/SettingsNavigation.tsx:111-120`). Page header title uses the same switch (`Customization.tsx:59`).
  - Server: `POST /api/settings` is `needsAuthorization()` = admin (`app/api/core/infrastructure/express/settings/routes.ts:10`). `GET /api/settings` has no middleware and returns `customCSS`, `allowcustomJS` and `customJS` to everyone, including anonymous users on public instances, because they are in `PUBLIC_ALLOWED_FIELDS` (`app/api/core/application/settings/publicSettings.ts:7-35`). VERIFIED.
  - The flag `allowcustomJS` is edited on the Collection settings page as toggle "Global JS" (`S/Collection/Collection.tsx:284-290`; tip text `collectionSettingsTips.tsx:172-186`, same wording as the Pages JS warning). Server schema `allowcustomJS: z.boolean().optional()` (`saveSettingsInput.ts:187`), stored in the `site_preferences` group (`PostgresSettingsMapper.ts:31`).
- **Layout**:
  - `allowcustomJS` true: header "Global CSS & JS", two tabs "Custom CSS" and "Custom JS", each a full-height Monaco editor; footer right-aligned "Save" (`Customization.tsx:62-93, 113-117`).
  - `allowcustomJS` false: header "Global CSS", a label "Custom CSS" above one Monaco editor, no JS tab (`:94-110`).
- **Fields**:

| Field | Type/control | Default | Validation | Help text | file:line |
|---|---|---|---|---|---|
| Custom CSS | Monaco `css` | current `settings.customCSS` | none client side; server `z.string().optional()` (no size limit other than the 5 MB JSON cap) | none | `Customization.tsx:68-79, 98-108`; `saveSettingsInput.ts:197` |
| Custom JS | Monaco `javascript` (tab only when flag on) | current `settings.customJS` | none; `z.string().optional()` | none on this page | `Customization.tsx:81-92`; `saveSettingsInput.ts:198` |

  Whether the editor falls back to a `<textarea>`: `CodeEditor` is called here without `fallbackElement`, so a Monaco failure renders an empty `<div />` (`CodeEditorComponent.tsx:142-144`). VERIFIED.
- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Save" | Disabled until an editor changes (`hasChanges`). Sends `{customCSS: cssContent, customJS: jsContent}` (an untouched editor sends `undefined`, which JSON drops, so the stored value stays) (`Customization.tsx:40-54`) | `POST /api/settings` -> `SaveSettingsController` (`app/api/core/infrastructure/express/settings/SaveSettingsController.ts:6-13`) -> `SaveSettingsUseCase` (`app/api/core/application/SaveSettings.ts:19-34`): `SettingsService.save` in a transaction, updates the settings row (`custom_css`, `custom_js` columns, `PostgresSettingsMapper.ts:12-13`), emits `SettingsChangedEvent` (`SettingsService.ts:29-31, 52-56`), which a listener turns into a socket event `updateSettings` to the whole tenant (`app/api/core/infrastructure/listeners/BroadcastSettingsChanged.ts:19-30`). Returns the settings payload. |
| Tab switch | `Tabs unmountTabs={false}`: both editors stay mounted | none |

- **Confirmations**: none for saving. Leaving with unsaved edits: `useBlocker(hasChanges)` -> `ConfirmNavigationModal` "Discard changes?" (`Customization.tsx:31-38, 120-122`).
- **Empty / loading / error / notification states**: Success "Saved successfully."; error "An error occurred" with the server message as details (`:47-51`). Monaco loading text "Loading ...". If the loader gets no settings it returns `{}` and both editors start empty (`:17-22`), which would overwrite stored values if saved (ASSUMED edge case).
- **Save model**: Save button, per page (both CSS and JS in one request). Dirty guard via `useBlocker` only. After saving, `hasChanges` resets; no revalidation (`:48-52`).
- **V1 vs V2**: V1 removed for this page. Server side settings moved to `app/api/core` (the old `app/api/settings` directory no longer exists); Settings are stored in PostgreSQL columns/groups per `PostgresSettingsMapper.ts`.
- **Notes/gotchas**:
  - Where it is applied: site-wide CSS is rendered into a `<style>` in the HTML head on every page; site-wide JS is rendered into a `<script>` in the head only when `allowcustomJS` is true (`app/react/App/Root.jsx:130-166`, specifically CSS `:145-149` and JS `:160-166`). VERIFIED. Per-page JS ignores this flag (see Pages).
  - The Monaco `onDidChangeContent` listeners are attached in `onMount`, which runs after the editor is created with its initial value, so initial load does not mark the form dirty (`CodeEditorComponent.tsx:124-139`).
  - Activity log records `POST /api/settings` as "Updated settings" and stores the whole request body (so the full CSS/JS text) in the log entry (`activitylogParser.ts:20`; `activitylogMiddleware.ts:42-58`).

---

### Uploads (custom uploads)

- **Route / file**: `/settings/custom-uploads`; loader `customUploadsLoader` (`S/CustomUploads/CustomUploads.tsx:29-34`), component `CustomUploads` (`:38`); route `app/react/Routes.tsx:497-501`. Header title is "Custom Uploads"; the nav label is "Uploads" (`S/SettingsNavigation.tsx:121`).
- **Who can see it**:
  - Admin only (`adminsOnlyRoute`); nav link admin only; no feature toggle.
  - Server:

    | Endpoint | Permission |
    |---|---|
    | `GET /api/files?type=custom` (list) | `needsAuthorization(['admin','editor','collaborator'])` (`app/api/files/routes.ts:158-184`); no entity filter for custom files |
    | `POST /api/files/upload/custom` | `needsAuthorization(['admin'])` (`app/api/customUploads/infrastructure/http/routes.ts:10-18`) |
    | `POST /api/files` (rename) | route allows admin/editor/collaborator (`files/routes.ts:100-110`), but `UpdateFile` calls `checkWritePermission`, which for a non-entity file returns true only for admin; others get 404 "file not found" (`app/api/core/application/UpdateFile.ts:29-34`; `MongoEntityPermissionChecker.ts:85-98`) |
    | `DELETE /api/files?_id=` | same route roles (`files/routes.ts:152-156`), same admin-only effect through `FileDelete` (`app/api/core/application/FileDelete.ts:32-38`) |
    | `GET /assets/:filename` (public URL of an uploaded asset) | no authentication; non-entity files are readable by anyone, subject to the private-instance middleware (`routes.ts:20`; `DownloadFileController.ts:156-165`) |

- **Layout**: Header "Custom Uploads"; table captioned "Custom Uploads" with row checkboxes; footer (right aligned) with an upload progress line, "Delete" (only when rows are selected) and "Import asset". Columns: Preview (file icon or image thumbnail), Name (`originalname`, sortable), URL (`/assets/<filename>`, not sortable), Action (buttons "Edit" and "Delete") (`CustomUploads.tsx:107-148`; `components/UploadsTable.tsx:57-87`).
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Files to import | `FileDropzone`, multiple | none | none client side; server has no size or type limit in the multer config (`multer({ storage })` only) (`app/api/core/infrastructure/express/middlewares/UploadMiddleware.ts:70`). A reverse proxy limit is possible but not visible here (ASSUMED) | modal header "Import asset"; buttons "Cancel", "Add" | `components/DropzoneModal.tsx:42-78` |
| File name (edit panel) | `InputField` | name without extension | required; extension is preserved and re-appended (`<name>.<ext>`) | panel title "Edit File", card "General Information", label "File name", error "This field is required" (plain string, `EditFileSidepanel.tsx:61`) | `components/EditFileSidepanel.tsx:20-82` |

- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Import asset" | Opens the dropzone modal | none |
| Modal "Add" | Closes modal, uploads the files **one at a time** through the module-level `UploadService('custom')`; per-file progress to the footer line "Uploading... <file> N% (M remaining files)"; revalidates the table after each file; at the end notifies (`DropzoneModal.tsx:29-40`; `V2/api/files/UploadService.ts:39-86`) | `POST /api/files/upload/custom` multipart (`file`, `originalname`) -> multer stores to temp -> `activitylogMiddleware` -> `CustomFileUploadController` -> `CustomFileUpload` use case (`app/api/customUploads/application/CustomFileUpload.ts:25-42`): `fileStorage.storeFile`, in a transaction `filesDS.create` + emits domain `FileCreatedEvent`, then V1 `FileCreatedEvent` on the event bus. Response is the file DTO (`type:'custom'`). |
| Modal "Cancel" / close | Clears selection | none |
| Row "Edit" | Opens the "Edit File" side panel with overlay | see Save |
| Panel "Save" | Sends the file with new `originalname`; closes panel; notifies; revalidates (`EditFileSidepanel.tsx:34-45`) | `POST /api/files` with `_id` -> `MutateFileController` -> `UpdateFileController` (zod: `_id` min 1, `originalname` min 1) -> `UpdateFile` -> `FilesService.bulkUpsert` (`UpdateFile.ts:29-42`). The `filename` (URL) does not change, only the display name. |
| Row "Delete" / footer "Delete" | Opens confirm; multi-delete issues parallel requests | `DELETE /api/files?_id=` -> `FileDeleteController` -> `FileDelete` use case: in a transaction `filesService.delete([file])` and dispatches a `DeleteFileFromStorageJobHandler` job to remove the stored file (`FileDeleteController.ts:45-59`) |
| URL cell | Plain text `/assets/<filename>` (not a link, no copy button) | n/a |

- **Confirmations**: Delete uses `ConfirmationModal` danger style: header "Delete", warning "Do you want to delete the following items?", body = bullet list of original file names, buttons "Cancel" / "Accept" (`CustomUploads.tsx:157-166`). Leaving the page during an upload: `ConfirmNavigationModal` "Discard changes?" / "You have unsaved changes. Do you want to continue?"; confirming aborts running requests (`:56-66, 168-177`).
- **Empty / loading / error / notification states**: empty table "NO DATA AVAILABLE". Success: "Uploaded custom file", "File updated", "Deleted custom file". Failure: "An error occurred" (edit failure adds the server message as details). If some files succeed and some fail, both a success and an error notification appear (`CustomUploads.tsx:68-83`).
- **Save model**: Uploads run immediately after "Add" (no Save step); rename is a side panel with its own Save/Cancel (panel cannot be closed while submitting); delete after confirm. Dirty guard only while an upload is running: `useBlocker(Boolean(uploadService.isUploading()))` evaluates a non-reactive value at render time, so the guard may not be active until the next render after uploads start (ASSUMED risk).
- **V1 vs V2**: V1 UI removed. Server: dedicated module `app/api/customUploads` (V2-style) writes `files` documents of type `custom`; the legacy `files` routes still serve list/update/delete (`app/api/files/routes.ts`). Activity log still has parser entries for the V1 URLs `POST/DELETE /api/customisation/upload` (`activitylogParser.ts:24, 165-169`) although the current client no longer uses them.
- **Notes/gotchas**:
  - The activity log middleware is applied twice on the upload route (global and in the route chain); a guard flag `__activitylogAttached` prevents duplicate entries (`activitylogMiddleware.ts:60-65`).
  - `GET /api/files` list does not filter by uploader; any admin sees all custom files.
  - Non-admin roles that call the rename/delete endpoints directly receive 404, not 401.

---

### Preserve

- **Route / file**: `/settings/preserve`; component `Preserve` (`S/Preserve/Preserve.tsx:10`), **no loader** (`app/react/Routes.tsx:346`).
- **Who can see it**:
  - Client: the route is `adminsOnlyRoute`, so any admin can open the URL directly. The nav link is shown only when `settings.features.preserve.host` is truthy (`FeatureToggle feature="preserve.host"`, `S/SettingsNavigation.tsx:92-100`; `UI/FeatureToggle.tsx:12-16`). The route itself is not gated by the toggle. VERIFIED.
  - Server: `POST /api/preserve/` has **no `needsAuthorization` and no role check** (`app/api/preserve/routes.ts:5-8`). Any authenticated user (including editor or collaborator) can call it; an anonymous caller reaches `Preserve.setup` with `req.user` undefined and fails on `user._id` (500, ASSUMED). On private instances anonymous calls are blocked earlier by the private-instance middleware. VERIFIED by reading the route and `preserve.ts:16-28`.
  - Feature toggle data: `features.preserve = { host, masterToken, config[] }` (`app/shared/types/settingsType.ts:42-49`; zod `saveSettingsInput.ts:68-82`). There is no UI to set `host` or `masterToken`; they must come from DB/provisioning (ASSUMED, no editor found). If `features.preserve` is missing, `setup` throws a 402 error "Preserve configuration not found" (`preserve.ts:20-22`).
- **Layout**: Header "Preserve Extension"; one `Card` titled "Preserve Extension" with the Preserve icon; two numbered instructions; divider; subsection "Configuration" with a read-only copy field "Extension Token" and, only when there is no token, a right-aligned button "Request token" (`Preserve.tsx:30-79`). The wrapper uses `min-h-screen bg-warm`.
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Extension Token | `CopyValueInput` (read-only value + copy button), id `extension-token` | Token of the current user from `settings.features.preserve.config` where `conf.user._id === user._id`, else empty | none | label "Extension Token" | `Preserve.tsx:21-28, 62-66` |

  Instruction copy as written in code: "1. Install the browser extension." and "2. Request and copy the Extension Token bellow and paste it into the preserve extension settings." The second line has `translationKey="Preserve Setup Description"` and the shipped English translation file defines that key as "If you know your Uwazi URL and TOKEN click the link below, and fill the required information." (`contents/ui-translations/en.csv:964`), so the text actually displayed on a fresh instance may be the CSV text rather than the inline default. ASSUMED (depends on how default translations are seeded). There is no link to the extension.
- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Request token" | `e.preventDefault()`, `requestToken()`, `setToken(result)`. No try/catch, no loading state, no notification (`Preserve.tsx:15-19`; `app/react/V2/api/preserve/index.ts:3-6`) | `POST /api/preserve` -> `Preserve.setup(language, user)` (`app/api/preserve/preserve.ts:16-43`): if the user already has a config entry, returns it. Otherwise `createUserConfig` (`:45-61`): for the first config ever it creates an empty thesaurus named "Preserve" (via `CreateThesaurusUseCase`) and a template named "Preserve" with properties `Url` (link) and `Source` (select on that thesaurus) (`:78-101`); for later users it reuses the first config's template. It then calls the **third-party Preserve host** `POST <host>/api/tokens` with `Authorization: <masterToken>` and takes `json.data.token` (`:63-66`). Finally it saves `features.preserve.config` (appending `{template, token, user}`) through `SaveSettingsUseCase` (`:32-41`), which also broadcasts `updateSettings`. Returns `{template, token, user}`. |
| Copy button on token | copies the token | none |

- **Confirmations**: none.
- **Empty / loading / error / notification states**: Empty token shows an empty field and the "Request token" button. No loading or error UI: a failed request (402 no config, host unreachable, bad master token) is an unhandled promise rejection and the page does not change. VERIFIED by reading `Preserve.tsx:15-19`.
- **Save model**: Not a form. One action creates the user's token and persists it server-side immediately. No dirty state, no navigation guard.
- **V1 vs V2**: Single implementation. The page is V2 (`S/Preserve`); the icon component lives in `app/react/Layout/PreserveIcon.tsx`. Server module `app/api/preserve` is flat (not `.v2`) and was adapted to use the new thesaurus and settings use cases.
- **Notes/gotchas**:
  - The token lookup uses `conf?.user?._id` but the server compares `conf.user?.toString()` against the user id and the schema stores `user` as an ObjectId value (`preserve.ts:24`; `saveSettingsInput.ts:76`). If `user` is serialised as a plain id string, `.user._id` is undefined and the stored token is never prefilled; the user then sees "Request token" again and the server returns the same existing token. ASSUMED (depends on serialisation).
  - Admin sessions receive the full `features` object, including `preserve.masterToken` and all users' tokens, because `features` is in `ADMIN_ALLOWED_FIELDS` and no field stripping was found (`app/api/core/application/settings/publicSettings.ts:38-47`; `SettingsQueryService.ts:48-57`). VERIFIED that nothing strips `masterToken`.
  - The template and thesaurus creation is not in the same transaction as the settings save, noted by the authors in a comment (`preserve.ts:68-76`).
  - Anonymous requests that reach the endpoint on a public instance are not blocked by a permission check (see Who can see it).
  - `POST /api/preserve` has no parsed activity log entry; it appears as a raw line.

---

### Import CSV

Covers `/settings/csv` (list and upload modal) and `/settings/csv/:entry` (status).

- **Route / file**:
  - List: `/settings/csv`, loader `csvListLoader` (`S/CSVUpload/Loaders/csvListLoader.ts:8-18`), component `CSVList` (`S/CSVUpload/CSVList.tsx:9`), table `Components/ImportsTable.tsx:168`, upload modal `Components/UploadFileModal.tsx:18` (route `Routes.tsx:508-510`).
  - Status: `/settings/csv/:entry`, loader `uploadStatusLoader` (`Loaders/uploadStatusLoader.ts:6-18`), component `UploadStatus` (`UploadStatus.tsx:20`) (route `Routes.tsx:511-515`).
  - Global task subscriber: `S/CSVUpload/CsvImportTasksSubscriber.tsx:21`, mounted in the header notifications component (`UI/Notifications/RequestStatus.tsx:7, 117`).
- **Who can see it**:
  - Admin only (`adminsOnlyRoute`); nav link "Import CSV" admin only (`S/SettingsNavigation.tsx:124-126`). Also linked from the Library footer (`app/react/Library/components/LibraryFooter.tsx:62`; `app/react/V2/Routes/Library/Components/LibraryResultsFooter.tsx:32`). No feature toggle.
  - Server (`CSV/infrastructure/http/routes.ts:11-44`), all `needsAuthorization(['admin'])`: `POST /api/csvImportEntities`, `GET /api/csvImportEntities/imports`, `GET /api/csvImportEntities/imports/:id`, `POST /api/csvImportEntities/imports/:id/cancel`, `GET /api/csvImportEntities/imports/:id/failed-rows-csv`.
  - Progress sockets go only to tenant admins (`emitToTenantAdmins`, e.g. `CSV/infrastructure/jobHandlers/CsvExtractUploadedZipJobHandler.ts:68`), and the client subscriber only registers when `user.role === 'admin'` (`CsvImportTasksSubscriber.tsx:143-145`).
- **Layout**:
  - List: header "Import CSV"; body is either the blank state or the table with a summary header; footer button "Import CSV" with a plus icon (`CSVList.tsx:18-35`). Table header (`ImportsTable.tsx:307-363`): "CSVs" title and counters "N Total imports", "N Processing", "N Completed", "N Failed" (counts derived by grouping statuses, `:24-56, 179-205`). Columns: Status, File, Template, Progress (progress bar with `current/total`), Entities created, Entities updated, Failed, Date, Action ("View") (`:118-160`). Default sort: Date descending (`:309`). Sortable columns: Status, Template, Date only.
  - Status page: breadcrumb "Import CSV" > file name; file name with a status pill and the status description; line "Template: <name>  Date: <created>  Last updated: <updated>"; six stat cards (Entities created, Entities updated, Rows processed, Rows failed, Thesauri values created, Related entities created; "-" when zero or missing); "Failure details" card (message, Stage, Code, Retryable Yes/No) only when status is Failed; "Progress" bar with "Processed rows: N%"; row error table when there are row errors; footer "Back", "Download failed rows" (only with row errors) and "Cancel" (danger) (`UploadStatus.tsx:90-275`).
- **Fields** (upload modal, `UploadFileModal.tsx:71-131`):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| File | `FileDropzone`, single file | none | client accepts `text/csv` (`.csv`) and `application/zip` (`.zip`). Server does not check type or extension: any name ending `.zip` (case-insensitive) is unzipped, everything else is copied as the CSV (`CSV/application/services/CsvImportFileNormalizer.ts:38-49`) | hint "CSV or ZIP" | `:84-95` |
| Template | `Select` (all templates, label via `t(templateId, name)`) | first template in the list | none client side (Accept requires a file and a template id); server only requires a non-empty string (`CSV/infrastructure/http/RegisterCsvImportController.ts:5-7`). Whether an unknown template id fails at registration or later is not verified | label "Template" | `:56-69, 96-102` |

  There are **no language or option fields in the modal**. The target language is the collection default language, and per-language values come from CSV header suffixes (see below). VERIFIED against `UploadFileModal.tsx` and `CSV/application/jobs/CsvImportEntitiesContextLoader.ts:28-68`.

  File format rules visible in code: a ZIP must contain `import.csv` at its root (otherwise "import.csv not found at zip root"); entries inside folders are skipped (`CsvImportFileNormalizer.ts:82-87, 124-126`). A column named `id` makes the row **update** the entity with that shared id if it belongs to the chosen template, otherwise the row is created (`CSV/application/jobs/CsvImportEntitiesBatchProcessor.ts:18, 130-143, 32-60`; `CsvImportEntitiesRowPersistence.ts:90-100`). Language-specific columns use the suffix `__<language>` (e.g. `title__es`); a property must then provide the default-language column and all other collection languages; mixing suffixed and plain columns for one property is an error (`CSV/application/services/CsvHeaderAnalyzer.ts:5, 74-186`). Header rules and messages: `Column "X" does not exist in template "T".`, `Property "P" does not support languages. Remove the language suffix from the column name.`, `Property "P" uses languages, but does not have the default language column.`, `Property "P" uses languages, but is missing columns for: ...` (`CsvHeaderAnalyzer.ts:86, 108, 116, 132, 155`).
- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Import CSV" (footer) | Opens modal | none |
| Modal "Accept" | Disabled without a file or while uploading. Shows "Uploading... N%" (`UploadFileModal.tsx:36-54, 122-127`). On success registers a task in the header Beacon with label "CSV Import: Queued — <file>"; on failure reports to Sentry and notifies "An error occurred". Always closes the modal afterwards. | `POST /api/csvImportEntities` multipart (`template`, `file`) (`V2/api/csv/index.ts:130-154`) -> `UploadMiddleware.singleUpload()` -> `RegisterCsvImportController` -> `CsvImportEntities` use case (`CSV/CsvImportEntities.ts:33-67`): creates a `CsvImportDomain` (status `queued`), stores the upload at `csv-imports/<id>/<filename>`, in a transaction inserts it into `csv_imports` and dispatches `CsvExtractUploadedZipJobHandler`. Response `{id, status:'queued', message:'Import registered and queued for processing.'}`. |
| Modal "Cancel" / close | Disabled during upload | none |
| Row "View" | Link to `/settings/csv/<id>` (relative link, `ImportsTable.tsx:105-111`) | `GET /api/csvImportEntities/imports/:id` (`GetCsvImportEntitiesImportUseCase.ts:16-26`): returns the import plus `rowErrors` (all row errors) and `rowErrorsSummary` |
| Status "Cancel" | Opens cancel modal (below); disabled when status is Cancelled, Completed, Failed or ImportEntitiesDone (`UploadStatus.tsx:26-31, 254-263`) | `POST /api/csvImportEntities/imports/:id/cancel` -> `CancelCsvImportEntitiesImportUseCase` (`CancelCsvImportEntitiesImportUseCase.ts:34-63`): if already cancelled returns `cancelled:true`; if terminal returns `cancelled:false`; else `csvImportsDS.cancel` sets status `cancelled` and `filesCleanup:'pending'` (only when the current status is not terminal, `MongoCsvImportsDataSource.ts:43-57`) and emits socket `csvImport:import:cancelled` to tenant admins. Running jobs poll `isCancelled` and stop between batches (`CsvExtractUploadedZipJob.ts:130, 198-225`); a cleanup job removes files. Already created entities are not rolled back. |
| Status "Download failed rows" | `<a href="/api/csvImportEntities/imports/<id>/failed-rows-csv" target="_blank">` | `GET .../failed-rows-csv` streams the stored report as `text/csv; charset=UTF-8` attachment; 404 JSON if the import or report does not exist (`DownloadCsvImportFailedRowsCsvController.ts:14-49`; `DownloadCsvImportFailedRowsCsvUseCase.ts:40-63`) |
| Status "Back" | Link to `settings/csv` | none |
| Live updates | List page: socket events `csvImport:import:start`, `extract:start` revalidate immediately; `import:progress` updates progress bars (throttled 3 s); terminal events revalidate (throttled 3 s). Status page revalidates (throttled 3 s) on any stage event for its own import id (`ImportsTable.tsx:211-277`; `UploadStatus.tsx:52-88`) | Event names (`app/react/V2/api/csv/events.ts:1-23`): `csvImport:{import,extract,preflight:scan,preflight:thesauri:create,preflight:relationships:create}:{start,progress,success,error}` and `csvImport:import:cancelled` (same file) |
| Header Beacon tasks | Hydrates from `GET /api/csvImportEntities/imports` on socket connect and on mount, creates a task per active import with stage labels and percentages, closes tasks on terminal status; notifications "CSV import completed", "CSV import failed" (details = error message) and "CSV import cancelled" (`CsvImportTasksSubscriber.tsx:86-168`; `csvImportTaskProgress.ts:105-184`) | `GET /api/csvImportEntities/imports` -> `ListCsvImportEntitiesImportsUseCase` (returns rows without `rowErrors`) |

  Server pipeline and statuses (`CSV/domain/CsvImport.ts:2-20`; `V2/api/csv/index.ts:8-26`): queued -> extracting files (-> done) -> preflight:scan (-> done) -> preflight:thesauri:create (-> done) -> preflight:relationships:create (-> done) -> import:entities (-> done); side states retrying, failed, cancelled, completed, validating, processing. Entities are created or updated in batches of 10 by default (`CsvImportEntitiesJob.ts:53, 66-67`). Stop policy: after 50 warm-up rows the job aborts as a non-retryable failure when the failure ratio exceeds 0.6, 25 consecutive rows fail, or 500 rows fail in total (`CsvImportEntitiesFailurePolicy.ts:1-6`). Retryable job errors set status `retrying`; non-retryable set `failed` with `failure {message, retryable, at, stage}` (`CsvExtractUploadedZipJob.ts:137-155`). Import finishes as `import:entities:done` with stats `entitiesCreated`, `entitiesUpdated`, `rowsProcessed`, `rowsFailed` and schedules cleanup of staged files (`CsvImportEntitiesJob.ts:102-125`). Row errors are written to a row-errors store and a downloadable CSV report (`persistRowErrorsReport`, `CsvImportEntitiesJob.ts:170-178`). Imports are stored in Mongo collection `csv_imports` (`MongoCsvImportsDataSource.ts:20`); the row, thesaurus-value and error stores have both Mongo and PostgreSQL implementations (which is active is not verified).
- **Confirmations**:
  - Cancel import: modal size xl, header "Canceling", body "Cancel the import process. This will stop the creation of new entities. Already created entities will not be affected" (key `cancel csv import`, no trailing period), buttons "Close" and "Cancel" (danger) (`Components/CancelProcessModal.tsx:42-76`). On Cancel: `POST .../cancel`; if the response has `cancelled: true` the task label is updated to "CSV Import: Cancelled — <file>", the task ends as completed and a notification "CSV import cancelled" with the file name is added (`:25-40`); then the page revalidates and the modal closes.
  - No confirmation before Accept in the upload modal.
- **Empty / loading / error / notification states**:
  - Empty list: icon, title "No CSVs yet", description "Import CSV or ZIP files to create entities in bulk. Select **+ Import CSV** to get started." (`ImportsTable.tsx:279-304`; `en.csv:316`).
  - List loader error: returns `{list: []}` silently, so the blank state is shown (`csvListLoader.ts:11-15`).
  - Status page not found: title "Not Found" and an empty body; the loader calls `getById(...)` **without `await`**, so the `instanceof FetchResponseError` check can never be true and the Promise is returned directly; a 404 resolves to a `FetchResponseError` object as loader data, which then renders as an entry with no fields (`uploadStatusLoader.ts:9-14`; `UploadStatus.tsx:25`). VERIFIED the missing `await`; the rendered result is ASSUMED.
  - Status titles and descriptions (exact English), from `Components/statusMessages.ts:9-82`:

    | Status | Title | Description |
    |---|---|---|
    | queued | Queued | This import is waiting in queue. |
    | validating | Validating | Validating file structure and headers. |
    | extracting files | Extracting files | Extracting files from uploaded package. |
    | extracting files:done | Done extracting files | File extraction completed successfully. |
    | preflight:scan | Scanning | Scanning rows before import. |
    | preflight:scan:done | Done scanning | Preflight scan completed. |
    | preflight:thesauri:create | Creating thesauri | Preparing required thesauri values. |
    | ...:done | Done creating thesauri | Required thesauri values were prepared. |
    | preflight:relationships:create | Creating relationships | Preparing required relationships. |
    | ...:done | Done creating relationships | Required relationships were prepared. |
    | import:entities | Creating entities | Import is currently processing rows. |
    | import:entities:done | Done creating entities | Entity creation stage completed. |
    | retrying | Retrying | Import is retrying after an error. |
    | processing | Processing | Import is currently processing rows. |
    | completed | Completed | Import finished successfully. |
    | failed | Failed | Import failed. Review details below. |
    | cancelled | Cancelled | Import was cancelled. |
    | import:entities:done with rowsFailed > 0 | Completed with errors | Import finished with errors. Review details below. |

  - Progress bar colour: grey normally, warning for cancelled or completed with failed rows, error for failed, success for completed without failures (`Components/Progress.tsx:16-34`). List counters treat only Completed/ImportEntitiesDone as "Completed", Failed and Cancelled as "Failed" (`ImportsTable.tsx:31-56`).
  - Row error table: header "Failure details" (same text as the failure card), columns Row (CSV row number: stored index + 2 so it matches spreadsheet rows), Property ("-" when empty), Message (`Components/ErrorsTable.tsx:12-48`). Row error codes (client types): `ROW_EMPTY_OR_MALFORMED`, `HEADER_MISSING_REQUIRED_COLUMN`, `VALUE_INVALID_FORMAT`, `VALUE_UNSUPPORTED_LANGUAGE_COLUMN`, `THESAURUS_VALUE_NOT_FOUND`, `RELATIONSHIP_NOT_FOUND`, `RELATIONSHIP_AMBIGUOUS`, `ID_NOT_FOUND_IN_TEMPLATE`, `FILE_NOT_FOUND`, `FILE_INVALID_REFERENCE`, `INTERNAL_ERROR` (`V2/api/csv/index.ts:28-39`). Code is not displayed, only the message.
  - Dates are formatted with Luxon `DATETIME_SHORT_WITH_SECONDS` in the UI locale (`Components/DateDisplay.tsx`).
- **Save model**: Not a form. Upload is submitted from the modal; there is no dirty-state guard anywhere in this flow and closing the modal discards the selected file. Registration returns immediately (job runs in the background queue); the user can leave the page, and progress remains visible through the header Beacon.
- **V1 vs V2**: V1 import removed from the UI. `app/api/csv/` still exists (`csv.ts`, `csvLoader.ts`, `csvExporter.ts`, `importFile.ts`, `importThesauri.ts`) but no HTTP route registers it; the loader/exporter remain for CLI scripts and migrations (`app/api/csv/index.ts:1-8`; migrations import `#api/csv/csv.js`). The only HTTP surface is `csv.v2`, mounted at `app/api/api.js:60`. The URL prefix `csvImportEntities` is the V2 name.
- **Notes/gotchas**:
  - The list endpoint omits `rowErrors`; per-row errors are fetched only by the status page request, so the list's "Failed" column shows `stats.rowsFailed`.
  - Template names in the list come from `templatesAtom` (client cache); a deleted template shows its raw id (`ImportsTable.tsx:162-166`).
  - Whole upload is held in memory/disk by multer with no size limit configured (see Uploads); very large ZIPs are bounded only by infrastructure.
  - CSV import actions are not parsed in the activity log (`/api/csvImportEntities*` is not in `ParsedActions`) and appear as raw lines.

---

### Activity log

- **Route / file**: `/settings/activitylog`; loader `activityLogLoader(headers, { settings })` (`S/ActivityLog/ActivityLogLoader.ts:95-122`; the `settings` context is accepted but unused, `:98`), component `ActivityLog` (`S/ActivityLog/ActivityLog.tsx:34`); route `app/react/Routes.tsx:492-496`. Backend: `app/api/activitylog/` (JS and TS mix).
- **Who can see it**:
  - Admin only (`adminsOnlyRoute`); nav link "Activity log" (`S/SettingsNavigation.tsx:110`). No feature toggle.
  - Server: `GET /api/activitylog` is `needsAuthorization(['admin'])` with `parseQuery` and AJV `ActivityLogGetRequestSchema` (`app/api/activitylog/routes.js:7-18`; schema `app/shared/types/activityLogApiSchemas.ts:11-54`). The only endpoint; entries cannot be edited or deleted from the UI or API.
- **Layout**: Header "Activity Log"; a right-aligned "Filters" button (funnel icon coloured when filters are active, with a count pill); table captioned "Activity Log"; table footer with "Showing X-Y of N" on the left and a paginator on the right (`ActivityLog.tsx:75-129`). Columns (`components/TableElements.tsx:114-145`): Action (coloured pill), User, Description (default text plus a hover tooltip showing Query and Body), Timestamp (`<DATE_MED> - <TIME_24_SIMPLE>`), and a "View" button column with no header. Two side panels: details ("ACTIVITY") and filters ("FILTERS").
- **Fields** (filters side panel, `components/FiltersSidePanel.tsx`):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Action | `MultiSelect`, options CREATE, UPDATE, DELETE, MIGRATE, WARNING (labels uppercased from System translations) | none | none | label "Action" | `:18-21, 65-74` |
| User | `InputField` with clear button | empty | none; server does a case-insensitive substring match on username; the value `anonymous` also matches entries with no username (`activityLogFilter.ts:203-214`; `activitylog.js:54-58`) | label "User" | `:76-85` |
| Search | `InputField` with clear button | empty | none | label "Search", placeholder "by ids, methods, keywords, etc." | `:86-97` |
| Date range | `DateRangePicker` (From, To; picking one end fills the other with the same date; clear per end) | empty | `to` is made inclusive by adding one day server-side (`activityLogFilter.ts:12-19`) | label key `property daterange` = "Date range" (`en.csv:993`); placeholders "From", "To"; buttons "Today", "Clear" | `:98-140` |
| Sort | Click a sortable column header (Action = `method`, User = `username`, Timestamp = `time`); `url` is allowed by the API but has no column | `time` descending when absent from the URL | server `sortingParams` = method, time, username, url; any other value throws "Invalid sorting parameter" (`activitylog.js:6-14`) | none | `ActivityLogLoader.ts:26, 47-48`; `ActivityLog.tsx:48-60` |
| Page / limit | Paginator; limit is not user-settable in the UI | page 1, limit 100 | API default limit 15 if omitted; client always sends 100 (`ActivityLogLoader.ts:14, 62`; `activitylog.js:16-24`) | none | `ActivityLog.tsx:107-125` |

  All filter state is held in URL search params (`method`, `username`, `search`, `from`, `to`, `sort`, `order`, `page`) and the loader re-runs on every URL change (`ActivityLogLoader.ts:168-188`). The filter-count pill counts only `method`, `username`, `search` and `dateRange` (`ActivityLog.tsx:42-44`).
- **Actions**:

| Control (label) | Client behaviour | Server call and effect |
|---|---|---|
| "Filters" | Opens the filter panel | none |
| Panel "Apply" | `updateSearch` writes params to the URL (page param removed), closes panel | loader calls `GET /api/activityLog` (`V2/api/activityLog/index.ts:15-26`) -> `activitylog.get`: builds a Mongo query (`ActivityLogFilter`), counts, reads the page (sorted by the chosen prop, then time desc, collation locale `en` strength 2), and attaches a computed `semantic` object to each row (`activitylog.js:53-78`). Response `{rows, remainingRows, limit, page, totalRows}` |
| Panel "Clear all" | Resets the form values only; nothing is applied until "Apply" | none |
| Column header click | Updates `sort`/`order` URL params (manual sorting) | same GET |
| Paginator | Navigates to `?...&page=N` URLs built from the applied filters (`buildPageURL`, `ActivityLogLoader.ts:190-207`) | same GET |
| Row "View" | Opens the "ACTIVITY" side panel with overlay | none (data already loaded) |
| Hover on Description | Tooltip with "Query" and "Body" | none |

  Detail panel content (`components/ActivityLogSidePanel.tsx:12-76`): a warm card with the semantic description + name + extra and the action pill (for `RAW` entries: HTTP method and URL instead); a card "User" with the username; "Query" and "Body" boxes with the raw stored strings (the entire request body, up to the 5 MB JSON cap).
- **Confirmations**: none.
- **Empty / loading / error / notification states**:
  - If the API response has a `message` field (error), the loader returns `{error, rows: [], total: 0}` and the table is **not rendered at all**, leaving only the Filters button; no error text is shown (`ActivityLogLoader.ts:105-113`; `ActivityLog.tsx:95-127`). VERIFIED.
  - Empty result: "NO DATA AVAILABLE" in the table; footer would show "Showing 1-0 of 0" (`PaginationState.tsx:13-24`, ASSUMED rendering).
  - No toasts. Action pill colours: CREATE green, UPDATE blue, DELETE red, RAW grey, MIGRATE primary, WARNING yellow (`TableElements.tsx:20-27`).
  - A WARNING row appears when building the description failed: description "The Activity log encountered an error in building the entry" and extra "<METHOD>: <url>" (`activitylogParser.ts:262-268`).
- **Save model**: Read-only; no saves. Filters apply on "Apply" (not live). State lives in the URL, so it survives reloads and can be linked.
- **V1 vs V2**: V1 UI removed (no `app/react/Activitylog`). Backend is still the old module (`activitylog.js`, `activitylogModel.js`, Mongoose) with TypeScript helpers; there is no `.v2` module.
- **What is logged** (VERIFIED, `app/api/activitylog/activitylogMiddleware.ts`):
  - Condition: URL contains `/api/`, method is not GET/OPTIONS/HEAD, URL is not in the ignore list, and for the "body required" endpoints the body is not `{}`; responses with status 404 are skipped; **any other status is logged, including 400/401/500** (`:67-78`, `mustBeLogged :33-40`). Logged after the response finishes (`res.on('finish')`).
  - Ignored endpoints: `/api/login`, `/api/contact`, `/api/unlockaccount`, `/api/resetpassword`, `/api/recoverpassword`, `/api/documents/pdfInfo`, `/api/documents/download`, `/api/attachments/download`, `/api/semantic-search/notify-updates`, `/api/sync`, `/api/sync/upload`, `/api/export` (`:10-23`).
  - Body-required (skipped when body is `{}`): `/api/files/upload/document`, `/api/files/upload/custom`, `/api/attachments/upload`, `/api/public`, `/api/entities`, `/api/users` (`:24-31`).
  - Stored fields: `url` (without query string), `method`, `params`, `query`, `body` as JSON strings, `user` id, `username`, `time`, `expireAt` (`:42-58`). Only `body.password` is masked as `*****`; no other redaction (so Settings saves, which include custom CSS/JS, and files metadata are stored whole). GET requests (reads, downloads) are never logged.
  - Also writes each entry to file storage as `<tenant>_<time>_activity.log` in the `activitylog` store (`:84-92`); no pruning of those files was found (ASSUMED).
  - Migration entries (method `MIGRATE`, username "System", body with `type: 'fieldParseError'`) are inserted by migrations (`app/api/migrations/logger.js:6-30`) and described as `[<migration>] Error parsing property <p> in <title> (<sharedId>)` + "Must fix manually" (`migrationsParser.js:4-12`). They have no `expireAt`.
  - Description text: a lookup table `ParsedActions` maps `<METHOD><url>` to descriptions such as "Updated settings", "Created page", "Published page release", "Restored page draft from release", "Deleted page", "Uploaded custom file", "Deleted file", "Updated file", "Created entity", "Deleted entity", "Added new user", "Updated permissions on entity", "Accepted suggestion on entity", etc. (`activitylogParser.ts:5-241`). Unmapped requests become `RAW` rows ("<METHOD> <url>"). VERIFIED that these have no entries and therefore show as RAW: `/api/dataviz*`, `/api/csvImportEntities*`, `/api/preserve`, `/api/settings/links`.
  - `POST /api/pages` is labelled "Created page" and switched to "Updated page" when the body has a `sharedId` (`activityLogBuilder.ts:81-88`; `activitylogParser.ts:42-47`).
  - Filter caveat: action filters CREATE/UPDATE/DELETE are implemented as regexes on the body and on `method`; CREATE means POST with a body that does not start with `{"_id"` etc.; MIGRATE matches stored method `MIGRATE`; WARNING matches nothing stored (it exists only at read time) (`activityLogFilter.ts:35-64, 150-166`). ASSUMED conclusion for WARNING.
- **Retention**: each entry gets `expireAt = now + 1 year` (`activitylogMiddleware.ts:44`; `date.addYearsToCurrentDate(1)`), and the TTL index `{expireAt:1}, expireAfterSeconds: 0` is created by migration 29, not by the Mongoose schema (`app/api/migrations/migrations/29-activity_log_sanitization/index.js:44-45`; schema `activitylogModel.js:4-19` has regular indexes on method, time, url, username only). So on a database without migration 29 applied there is no expiry (ASSUMED not applicable to current deployments). Migration entries are never expired (no `expireAt`).
- **Notes/gotchas**:
  - Sorting by Action sorts by the raw HTTP method (POST/PUT/DELETE), not by the displayed CREATE/UPDATE/DELETE label.
  - Description search: the free-text filter first tries to match against the readable action descriptions ("Deleted page" etc.) and falls back to regex on method/url/query/body/params (`activityLogFilter.ts:168-185`).
  - Entry data is Mongo collection `activitylogs` (`activitylogModel.js:21`; migration references `activitylogs`).
  - The page layout reserves a "Query" and "Body" box with no truncation; large bodies are shown in full in the side panel.
