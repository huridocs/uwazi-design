# Uwazi settings inventory (real app)

Phase 1 of the settings deep dive. Read-only research; no prototype code changed.

## Source and method

- Source: public repo `huridocs/uwazi`, branch **`production`** (the branch exists, no fallback to the default branch was needed), shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`, HEAD `731145c` (2026-10-02, "Bump version"), `package.json` version **1.229.224**.
- Everything was read from code. Nothing was run and no live server was contacted. Items are tagged VERIFIED (read in code), INFERRED or ASSUMED (read but not run) inside the page sections.
- Paths are repo-relative to `uwazi-ref` (for example `app/react/Routes.tsx:324`). Line numbers refer to HEAD `731145c`.
- The inventory was assembled from five page-group write-ups (Parts 1 to 5, kept in `parts/`) plus the cross-cutting section (Part 0). Page sections use the same ten headings: Route / file, Who can see it, Layout, Fields, Actions, Confirmations, Empty / loading / error / notification states, Save model, V1 vs V2, Notes.

## What the repo looks like today

- All settings pages are **V2** (React Router data routes, Jotai atoms, `apiClient`, Tailwind). No V1 settings UI remains. `app/react/Settings/` holds only `SettingsAPI.ts`, a redux reducer set and `components/relV2MigrationDashboard.tsx`; `app/react/Users`, `Thesauri`, `RelationTypes`, `Templates`, `Pages` hold only API stubs, redux actions or orphaned files. See each page's "V1 vs V2" line.
- The backend was moved into a hexagonal layout: use cases in `app/api/core/application/*.ts`, controllers and routes in `app/api/core/infrastructure/express/*`, domain classes in `app/api/core/domain/*`. `app/api/settings`, `app/api/templates`, `app/api/thesauri` and `app/api/relationtypes` no longer exist as top-level directories. A Postgres datasource exists next to the Mongo one for several modules (`app/api/core/infrastructure/postgresql/`: settings, template, thesaurus, relationshipType, translation, user, page, entity, files and others), selected by the `postgresCore` feature flag (`app/api/core/libs/featureFlags.ts`, `transactionManagerFactories.ts`). Behaviour described in this inventory is the same on both datasources as far as the use cases go; datasource differences were not audited.
- The router mounts everything under `/settings` in one block: `app/react/Routes.tsx:324-516`.

## Public demo instance

- HURIDOCS runs a public demo at **https://demo.uwazi.io/**. It is reached from the "Uwazi demo" page on `https://www.uwazi.io/uwazi-demo/`. Source: HURIDOCS blog post of 5 September 2018 (`https://huridocs.org/?p=1587`) and a search result for `demo.uwazi.io`.
- The demo page publishes three logins, one per role (admin, editor, collaborator), and states that the collection resets to its original state every few hours. The credentials are public on that page; they are not repeated here and nothing was logged in to.
- Consequence for design work: the demo is the only place to see the real Settings UI of an admin without a self-hosted install. Whether the demo runs the latest `production` build was not checked.
- The marketing site (`https://www.uwazi.io/`) links to "Book a demo" and "See how it works", not to a live instance.

## Page index

Route guard column: `admin` = `adminsOnlyRoute`, `admin+editor` = `ProtectedRoute allowedRoles={['admin','editor']}`, `any` = `loggedInUsersRoute` only. All guards redirect to `/login` on failure (`app/react/ProtectedRoute.tsx:6-34`). Server column is the default `needsAuthorization()` role set (`['admin']` unless listed) from `app/api/auth/authMiddleware.ts:14-24`; details per endpoint are in the page sections.

| Page | Route | Nav label (section) | Route guard | Extra gate | Part |
|---|---|---|---|---|---|
| Account | `/settings/account` | Account (Settings) | any | none | 1 |
| Dashboard | `/settings/dashboard` | Dashboard (Settings) | admin | none | 1 |
| Users & Groups | `/settings/users` | Users & Groups (Settings) | admin | none | 1 |
| Collection | `/settings/collection` | Collection (Settings) | admin | `themeCustomization` tenant flag shows the theming controls | 1 |
| Menu | `/settings/navlinks` | Menu (Settings) | admin | none | 1 |
| Pages list, new, edit | `/settings/pages`, `/pages/new`, `/pages/edit/:sharedId?` | Pages (Settings) | admin | none | 2 |
| Data visualizations | `/settings/dataviz`, `/dataviz/new`, `/dataviz/edit/:id` | Data visualizations (Settings) | admin | none | 2 |
| Languages | `/settings/languages` | Languages (Settings) | admin | none | 4 |
| Translations | `/settings/translations`, `/translations/edit/:context` | Translations (Settings) | admin | none | 4 |
| Filters | `/settings/filters` | Filters (Settings) | admin | none | 3 |
| Templates list, editor | `/settings/templates`, `/templates/new`, `/templates/edit/:templateId` | Templates (Metadata) | admin | none | 3 |
| Thesauri list, editor | `/settings/thesauri`, `/thesauri/new`, `/thesauri/edit/:_id` | Thesauri (Metadata) | admin | none | 4 |
| Relationship types | `/settings/relationship-types` | Relationship types (Metadata) | admin | none | 4 |
| Metadata extraction (IX) | `/settings/metadata_extraction`, `/suggestions/:extractorId` | Metadata Extraction (Metadata) | admin+editor | nav link behind `features['metadata-extraction']` | 5 |
| Paragraph extraction | `/settings/paragraph-extraction`, `/:extractorId/entities`, `/:extractorId/entities/:sharedId/paragraphs` | Paragraph Extraction (Metadata) | admin+editor | nav link behind `features.paragraphExtraction` | 5 |
| Preserve | `/settings/preserve` | Preserve (Tools) | admin | nav link behind `features['preserve.host']` | 2 |
| New Relationships Migration | `/settings/newrelmigration` | New Relationships Migration (Tools) | **none** (route only checks the feature key) | `features.newRelationships` | 5 |
| Activity log | `/settings/activitylog` | Activity log (Tools) | admin | none | 2 |
| Global CSS (& JS) | `/settings/customisation` | "Global CSS" or "Global CSS & JS" (Tools) | admin | label depends on `allowcustomJS` | 2 |
| Uploads | `/settings/custom-uploads` | Uploads (Tools) | admin | none | 2 |
| Import CSV | `/settings/csv`, `/settings/csv/:entry` | Import CSV (Tools) | admin | none | 2 |
| Uwazi Docs | external `https://docs.uwazi.io` | Uwazi Docs (Tools) | n/a | opens in a new tab | n/a |

Navigation file: `app/react/V2/Routes/Settings/SettingsNavigation.tsx:21-137`. Notes on the nav:

- Three groups: **Settings**, **Metadata** (heading shown to admin and editor), **Tools**. The "Tools" heading is shown to every logged-in user, because only the links inside it are wrapped in `NeedAuthorization`; an editor or collaborator sees "Tools" with only "Uwazi Docs" under it (SettingsNavigation.tsx:84-136).
- Items hidden by `FeatureToggle` read `settings.features`, which the server sends **to admins only** (`app/api/core/application/settings/publicSettings.ts:34-44`). An editor therefore probably never sees the Metadata Extraction and Paragraph Extraction links even though both routes allow editors (VERIFIED in code, not run).
- The Settings shell is a left rail (`min-w-[250px]`) plus an outlet. Below `md` the rail is the page when no child route is open, and each child page shows a back chevron in its header (`app/react/V2/Routes/Settings/Settings.tsx:11-27`, `app/react/V2/Components/Layouts/SettingsContent.tsx:57-86`).

---

## Part 0: Cross-cutting behaviour

Everything here was read in code (VERIFIED) unless tagged. Page-specific detail is in Parts 1 to 5.

### 0.1 The settings document and who can read or write it

Settings is one document per tenant (Mongo collection or Postgres row). Pages that "configure" something mostly write a different slice of the same document.

| Slice | Written by | Mechanism |
|---|---|---|
| `site_name`, `home_page`, `defaultLibraryView`, `private`, `allowcustomJS`, `cookiepolicy`, `dateFormat`, `contactEmail`, `senderEmail`, `analyticsTrackingId`, `matomoConfig`, `mapApiKey`, `mapLayers`, `mapStartingPoint`, `tilesProvider`, `newNameGeneration`, `themeAssets`, `themeVars`, `favicon`, `site_logo`, `allowedPublicTemplates`, `openPublicEndpoint`, `filterUnauthorizedRelated`, `ocrServiceEnabled` | Collection (whole-document POST) | `POST /api/settings` |
| `links` (menu) | Menu | `POST /api/settings/links` (`app/api/core/infrastructure/express/settings/routes.ts:10-15`) |
| `filters` | Filters | `POST /api/settings` with only `{filters}` (`app/react/V2/Routes/Settings/Filters/FiltersTable.tsx:121`) |
| `languages` | Languages | dedicated endpoints `POST /api/translations/languages`, `DELETE /api/translations/languages`, `POST /api/translations/setasdeafult` (sic), `POST /api/translations/populate`, not `POST /api/settings` (Part 4) |
| `customCSS`, `customJS` | Global CSS & JS | `POST /api/settings` |
| `features.*` | tenant CLI, env flags, DB edit; no UI | not editable from Settings pages (Part 5, section 4a) |

- **Input schema**: `app/api/core/application/settings/saveSettingsInput.ts:114-179` (strict zod object; unknown keys rejected). Cross-field rules: at least one and at most one language marked default (`:182-199`), menu rules via `refineMenuItems`.
- **Write permission**: both `POST /api/settings` and `POST /api/settings/links` use `needsAuthorization()` = admin only (`routes.ts:10-15`).
- **Read permission**: `GET /api/settings` is open to everyone, but the payload depends on the actor. Public projection: `_id, project, site_name, favicon, site_logo, themeAssets, themeVars, home_page, defaultLibraryView, private, cookiepolicy, languages, filters, links, dateFormat, analyticsTrackingId, matomoConfig, mapApiKey, mapLayers, mapStartingPoint, tilesProvider, newNameGeneration, ocrServiceEnabled, allowedPublicTemplates, custom, customCSS, allowcustomJS, customJS`. Admin adds `contactEmail, senderEmail, openPublicEndpoint, mailerConfig, publicFormDestination, features, filterUnauthorizedRelated`. `sync` and secrets never leave the server (`app/api/core/application/settings/publicSettings.ts:6-44`, `SettingsQueryService.ts:31-56`). `customCSS` and `customJS` are public by design (they are injected into every page).
- **Defaults**: the only default applied on read is `mapStartingPoint = [{lon: 6, lat: 46}]` (`settingsDefaults.ts:4-12`). Other defaults live in the form code (Part 1, Collection).
- **Whole-document risk**: Collection posts its full loaded document, so a stale form can overwrite `languages`, `filters` or `features` changed elsewhere since the page loaded (mechanism VERIFIED in Part 1; practical impact ASSUMED).

### 0.2 Propagation: what a change in one page does elsewhere

| Change | Immediate server effect | Where it shows up | Evidence |
|---|---|---|---|
| **Template saved** (edit) | Template row updated; template label translations updated (context = template id); Elasticsearch mapping updated (`updateMapping`, a mapping conflict returns 409 and the editor opens a reindex modal). Then `TemplateUpdatedEvent` and background jobs per batch of 50 entities when the diff has deleted, renamed, new relationship or new generated-id properties; or a lighter re-save when only a property's `filter` flag changed. Deleting a property is refused if another template inherits it. | Socket `templateChange` replaces the template in `templatesAtom` for every open session, which Redux mirrors. Entity edit forms read `templatesAtom`/`thesauriAtom` (`app/react/V2/Components/Metadata/EntityEditor/EditEntity.tsx:60-61`); library filters come from `property.filter` and defaults through `app/react/V2/Routes/Library/filterableProperties.ts:1-12`; library cards read `property.showInCard` (`app/react/V2/Routes/Library/Components/cardModel.ts:153-202`); the Library table columns read `property.filter` (`libraryTableColumns.ts:98`). | `app/api/core/application/UpdateTemplate.ts:34-107`, `TemplatePostProcessService.ts:30-85`, `domain/template/TemplateDiff.ts:112-130`, `express/template/TemplateMutationController.ts:20`, `app/react/App/sockets.js:62-72` |
| **Template renamed** | Template translation key updated. `ReconcileFiltersOnTemplateChange` renames the entry in `settings.filters`, but only for top-level entries; a template inside a filter group keeps its old stored name (the Type facet renders names through `Translate`, which can mask it). | Library Type facet (`TypeFacet.tsx:36`, `libraryTypeFilters.ts`). | `app/api/core/infrastructure/settings/ReconcileFiltersOnTemplateChange.ts:42-49`, `domain/settings/settingsTree.ts:50-59` (Part 3) |
| **Template deleted** | Refused if it is the default or has entities. Otherwise relationship properties in other templates that point to it are removed (with their translation keys), its translation context is deleted, the template is deleted, and `settings.filters` drops it. | Socket `templateDelete`; Filters page; other templates' editors. | `app/api/core/application/DeleteTemplate.ts:27-95`, `ReconcileFiltersOnTemplateChange.ts:35-40` |
| **Thesaurus saved** | Name and values updated; translation context for the thesaurus updated. For changed or removed values a job `denormalizeThesaurus` re-saves the entities of templates using the thesaurus, rebuilding select and multiselect values and relationship properties that inherit from them in all languages. Order-only changes persist without denormalizing. | Socket `thesauriChange`; entity forms (`thesauriAtom`); library filters that use the thesaurus. | `app/api/core/application/ThesauriService.ts:39-90`, `DenormalizeThesaurusEntities.ts:21-70`, `UpdateThesaurusController.ts:89` |
| **Thesaurus deleted** | Refused with `ThesaurusInUseError(count)` while any template uses it; otherwise its translation context and the thesaurus are deleted. | Socket `thesauriDelete`. | `app/api/core/application/DeleteThesaurus.ts:17-37` |
| **Relationship type renamed** | Name updated (duplicate name rejected with `duplicated_entry`); its translation key is updated. Templates and relationships reference it by id, so no entity job runs. | Template editor relationship-type select and relationship properties read `relationshipTypesAtom`; this atom is refreshed from loader data on the Relationship types page, and there is **no socket event** for relationship types, so other open sessions see the change on next load. | `app/api/core/application/UpdateRelationshipType.ts:17-43`, `app/react/V2/Routes/Settings/RelationshipTypes/RelationshipTypes.tsx:61-63`, `app/react/App/sockets.js` (no `relationType` handler) |
| **Relationship type deleted** | Refused with "Cannot delete type being used in templates: <names>", "...used in relationships" or "...used in relationship queries"; otherwise translation and type are deleted. | Same as above. | `app/api/core/application/DeleteRelationshipType.ts:21-60` |
| **Language added** | Language appended with `installing: true`; translations cloned from the default language; entities cloned from the default language by a background job; `LanguageAddedEvent`; predefined translations imported afterwards. | Socket `updateSettings` merges the public projection into `settingsAtom`; sockets `translationsInstallDone`/`translationsInstallError` update the Languages page. Entity forms and library show the new language once the clone job finishes. | `app/api/core/application/AddLanguage.ts:23-62`, `app/react/App/sockets.js:82-86,139-160` |
| **Language deleted** | Refused for the default language. Translations of that language and, by background job, its entities are deleted. | `updateSettings`, `translationsDelete*` sockets. | `app/api/core/application/DeleteLanguage.ts:20-40`, `domain/settings/Settings.ts:82-88` |
| **Default language changed** | Only the `default` flag moves. No entity or translation job. | `updateSettings`. Default language is also the language used as source when new languages are cloned and for template post-processing jobs. | `app/api/core/application/SetDefaultLanguage.ts:23-38` |
| **Language reset** | `POST /api/translations/populate` rewrites the `System` context keys of that language from `contents/ui-translations/<locale>.csv` where the CSV cell is non-empty; edited UI strings for those keys are overwritten. Only offered when a predefined file exists (11 languages at this version). | `translationsChange`. | Part 4 (Languages), `PopulateTranslationsController.ts:8-24` |
| **Menu links saved** | The "Menu" translation context is reconciled: renamed titles become key changes, deleted titles are removed, new titles are added. | Header menu (`app/react/App/Menu.tsx`) and Translations > Menu. | `app/api/core/application/settings/SettingsTranslationService.ts:78-101` |
| **Filters saved** | The "Filters" translation context is reconciled the same way for group names. | Library Type facet. | `SettingsTranslationService.ts:104-125` |
| **Collection settings saved** | Merged into the document; `SettingsChangedEvent` is emitted with the list of changed keys. Switching `newNameGeneration` on starts a template re-save job in the default language to regenerate property names. | Socket `updateSettings` carries the public projection to every open session (`BroadcastSettingsChanged.ts:25-30`); the client merges it with `mergeClientSettings` and drops inline CSS/JS from the atom (`app/react/V2/atoms/mergeClientSettings.ts:4-18`). Home page and default library view are read by `getIndexDescriptor` on the next request to `/` (see 0.3). | `app/api/core/application/SaveSettings.ts:17-34`, `settings/SettingsService.ts:24-33`, `domain/settings/SettingsDiff.ts` |
| **Translations saved** | One request per language, each with its own transaction (not atomic across languages). | Socket `translationsChange` replaces the active locale's translations in the atom; `Translate` components re-render. | Part 4; `SaveTranslationsController.ts:14`, `sockets.js:107-120` |

Socket events relevant to settings (all emitted to the whole tenant): `templateChange`, `templateDelete`, `thesauriChange`, `thesauriDelete`, `updateSettings`, `translationsChange`, `translationKeysChange`, `translationsDelete`, `translationsInstallDone`, `translationsInstallError`, `translationsDeleteDone`, `translationsDeleteError` (`app/react/App/sockets.js:62-189`). Note from Part 4: the two `*Error` install/delete events are listened to but no emitter was found.

### 0.3 Collection settings and the first screen

- Index route logic is `getIndexDescriptor` (`app/react/getIndexElement.tsx:27-93`). `home_page` is split on `/`. Empty or invalid (`validateHomePageRoute`) means the library with `defaultLibraryView` (`cards` default, `table`, `map`). A path containing `page` goes to that Page (`/page/:id`), `entity` to that entity, `library` to the library with the query string carried over (`?q=...` or rison), anything else to a plain redirect.
- With library V2 on, library paths redirect to `library`, and custom `map` or `table` homes go to `legacy-library/*` (`Routes.tsx:136-177`).
- `private: true` on the instance means "not a public instance": the library, entity and page routes use `privateRoute`, which requires login (`app/react/ProtectedRoute.tsx:30-31`). The Collection form shows this inverted as "Public instance" (Part 1 note).
- `allowcustomJS` switches the nav label between "Global CSS" and "Global CSS & JS" but, per Part 2, does not gate Page-level JavaScript.
- `dateFormat` is read by the metadata date display and the date pickers (`app/react/V2/Components/Metadata/display/formatMetadataTimestamp.ts`, `Forms/DatePicker/*`).

### 0.4 Save models in one table

Every settings page falls in one of five patterns. No page autosaves a field.

| Pattern | Pages | Dirty guard |
|---|---|---|
| **Page-level Save button** over the whole document | Collection, Menu, Filters, Global CSS & JS, Template editor, Thesaurus editor, Translations context editor, Page editor, Data visualization editor | Menu, Filters, Global CSS & JS, Template editor, Thesaurus editor, Translations editor, Page editor: `useBlocker`. Collection and Data visualization editor: none |
| **Form plus mandatory password modal** | Account, Users (create/edit) | none |
| **Sidepanel or modal with its own Save/Cancel** (one record at a time) | Users and Groups, Relationship types, IX extractor modal, IX entity sidepanels, PX create wizard, Uploads rename, Filters sidepanel (edits local until page Save), Import CSV upload modal | none (closing discards silently) |
| **Immediate action after confirm** | Templates list (delete, set default), Thesauri list delete, Languages (add, delete, set default, reset), Users bulk actions, Pages list delete, Uploads delete, IX train/process, PX extract, relationship migration plan edits | n/a |
| **Read-only** | Dashboard, Activity log, PX paragraphs | n/a |

Guard details (`useBlocker` call sites; grep for `useBlocker|beforeunload|ConfirmNavigationModal` over `app/react`):

| Page | Condition | Exceptions | File |
|---|---|---|---|
| Filters | `hasChanges` (JSON compare of rows) | none | `Filters/FiltersTable.tsx:54` |
| Menu | tree differs from loaded | none | `MenuConfig/MenuConfig.tsx:43` |
| Global CSS & JS | `hasChanges` | none | `Customization/Customization.tsx:31` |
| Template editor | loaded template differs from state | target path containing `templates/edit` is never blocked, so edit-to-edit navigation drops changes silently | `Templates/TemplatesEditor.tsx:147-150` |
| Thesaurus editor | `checkPendingChanges(nextLocation)` | target containing `edit` passes; a new, untouched thesaurus counts as changed (INFERRED) | `Thesauri/EditThesaurus.tsx:78` |
| Translations editor | `isDirty && !formIsSubmitting` | none | `Translations/EditTranslations.tsx:220` |
| Page editor | `isDirty && !isSubmitting` | none | `Pages/PageEditor.tsx:166` |
| Uploads | `uploadService.isUploading()` evaluated at render time | may not be active until next render (ASSUMED) | `CustomUploads/CustomUploads.tsx:56` |

- **No page registers a `beforeunload` handler**, so reload or closing the tab loses unsaved work on every page, including those that have a router guard.
- Two modals exist for the guard: `ConfirmNavigationModal` used by all settings pages above ("Discard changes?" / "You have unsaved changes. Do you want to continue?" / buttons "Cancel" and "Discard changes"; `app/react/V2/Components/UI/ConfirmNavigationModal.tsx:12-43`) and `DirtyDiscardModal` used by `BlockDirtyNavigation`, which is used by the entity editor, not by settings (`BlockDirtyNavigation.tsx`).
- Destructive confirms use `ConfirmationModal` (`app/react/V2/Components/UI/ConfirmationModal.tsx`), which supports optional type-to-confirm (`confirmWord`, rendered as "Please type in <word>:") and password confirm (`usePassword`), a danger style and a `warningText` block. Exact copy per page is in the page sections.

### 0.5 Notifications

- Settings pages report outcomes with `notify(type, title, message?, details?)` from `useRequestStatus` (`app/react/V2/atoms/requestStatusAtom.ts:144-154`). Types: `success`, `warning`, `error`, `info`. There is no inline toast: notifications are appended to the notification list and shown through the header status control (`RequestStatus` / Beacon) which flashes the title, and opens a panel that lists notifications (unread until the panel is opened) and tasks (`app/react/V2/Components/UI/Notifications/RequestStatus.tsx`, `NotificationsPanel.tsx`, `TaskItem.tsx`).
- Long-running work is modelled as **tasks** with `registerTask(id, label, setupListeners, initialProgress)`, `updateTask`, `endTask`, `removeTask`. Used for CSV import, IX train/process and similar, driven by sockets (`CsvImportTasksSubscriber.tsx`, `IX/taskProgress.ts`).
- The header status also has a loading state with a 1000 ms minimum (`MIN_LOADING_MS`, `requestStatusAtom.ts:23`) and a disconnected state (`isConnected`, `DisconnectWarning.tsx`).
- `apiClient` has a global error policy: any error except 401, 404 and cancelled requests raises "An error occurred" with the server detail, and 409 becomes a warning; a 401 redirects to `/login`. Pages that also call `notify` on the same error produce two entries (Account, Users, Thesauri, Languages, Relationship types; VERIFIED in code, not run) (`app/react/V2/api/policies.ts:39-83`). Collection and Menu use the older `api` client and are not affected.
- Server error text: `ApiError.detail = prettyMessage ?? message ?? error ?? statusText`; DomainErrors return 400 with a verbose `prettyMessage` that includes the request URL and body (passwords masked) (`app/shared/apiClient/normalizeError.ts:85-96`, `app/api/utils/handleError.js`). Validation errors return 422 with `validations[]`; unknown errors 500 "A server side error has occurred".
- The activity log records every non-GET `/api/*` request except a short ignore list and 404s (`app/api/activitylog/activitylogMiddleware.ts`), so every save in this document appears there (Part 2). It keeps entries for one year (TTL index from migration 29).

### 0.6 Page frame and shared UI

- Frame: `SettingsContent` with `Header` (breadcrumb path plus title, translated in the `System` context unless a `contextId` is given), `Body` (`grow px-4`) and a sticky `Footer` with a top border and optional highlighted tint (`app/react/V2/Components/Layouts/SettingsContent.tsx:22-113`).
- Tables: shared `Table` with sorting, selection and optional drag (`app/react/V2/Components/UI/Table/`). Side forms: `Sidepanel`. Dialogs: `Modal`, `ConfirmationModal`.
- Every user-facing string goes through `Translate`/`t('System', ...)`. New strings must exist in the UI translations or fall back to the key text; the Translations page lets an admin change them per language (Part 4).
- Loaders: pages load data in React Router loaders (server-rendered on first load) and refresh by `useRevalidator().revalidate()` after each action. There is no optimistic update on any settings page; the list re-renders after the loader returns.

### 0.7 Role model

- Roles: `admin`, `editor`, `collaborator` (`app/api/auth/authMiddleware.ts`, `app/react/V2/Components/UI/NeedAuthorization.tsx`). Only admin reaches most settings pages; editor reaches Account, Metadata extraction and Paragraph extraction (and at API level also the entity/file/relationship routes outside Settings). A collaborator reaches only Account.
- Client check is a redirect to `/login`, not a 403 page. Server check is HTTP 401 `{error:'Unauthorized'}`, which `apiClient` turns into `window.location.assign('/login')`.
- Anomalies at API level reported in the parts (all VERIFIED in code, none run): `GET /api/templates` and `GET /api/v2/entities/count_by_template` have no auth (Part 3); `GET /api/page(s)` has no auth so drafts are readable on public instances, `POST /api/preserve` has no role check, page-level JS ignores `allowcustomJS`, and `GET /api/settings` exposes `customCSS`/`customJS` (Part 2); the relationship-migration route has no role guard and `/api/v2/relationships` CRUD only checks the feature flag (Part 5).

### 0.8 Findings a designer is likely to hit

Collected from the parts; each is tagged in its page section.

1. Collection posts the whole document, and the "Public instance" switch is stored inverted (`private`). Lat 0 or lon 0 in the map starting point is treated as unset. The "Non-latin characters" switch is one way and has no confirm dialog. No UI exists for `mailerConfig`.
2. Users: the UI does not block deleting yourself, changing your own role, or removing the last admin; these fail only on the server. Client duplicate check is stricter than the server's.
3. Templates: property `name` is re-derived from the label on every save and never accepted from the client; create checks name uniqueness and the entity-view page, update checks neither; deleting properties silently deletes their entity values with no confirmation.
4. Thesauri: update skips domain validation (`clone()` uses `validate=false`); cancelling the CSV file dialog leaves Save and Cancel disabled.
5. Relationship types: a case-only duplicate name reaches the server and returns HTTP 500.
6. Translations: save is N parallel requests (partial save possible); there is no export, search or machine translation on the page.
7. Pages: a list delete blocked because templates use the page shows only "An error occurred". `/page/...` shows the last release, or the draft if never released.
8. Data visualizations: no dirty guard; Cancel discards silently; Save always runs the query and stores a snapshot.
9. Import CSV: the modal has only a file and a template field (no language or option fields).
10. IX: there is no bulk "Accept" for selected rows; the only accept-all is the Process modal's auto-accept "From all suggestions". PX: no edit flow for extractors; the success toast can show after a failed extract.
11. New Relationships Migration page is untranslated, runs synchronously, and "Perform" deletes all v2 relationships first.

---

## Part 1: Account, Users & Groups, Dashboard, Collection, Menu

Source: huridocs/uwazi `production`, v1.229.224 (shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`, HEAD 731145c). All paths are repo-relative. Every claim is VERIFIED (read in code) unless marked ASSUMED.

## Shared mechanics (apply to all five pages)

| Topic | Fact | Source |
|---|---|---|
| Settings shell | Left rail `SettingsNavigation` plus outlet. On <md the rail is the page and the outlet replaces it. A back chevron in the header links to `/settings`. | `app/react/V2/Routes/Settings/Settings.tsx:11-27`, `app/react/V2/Components/Layouts/SettingsContent.tsx:57-86` |
| Page frame | `SettingsContent` = Header (breadcrumb/title), Body (`grow px-4`), Footer (sticky, top border, optional `highlighted` tint). | `SettingsContent.tsx:22-113` |
| Nav visibility | Account link: any logged-in user. Dashboard, Users & Groups, Collection, Menu: inside `NeedAuthorization roles={['admin']}`. | `app/react/V2/Routes/Settings/SettingsNavigation.tsx:30-36` |
| Route guard | `/settings` is wrapped in `loggedInUsersRoute` (any user with an `_id` in the Redux store). Dashboard, navlinks, collection and users add `adminsOnlyRoute` (role `admin`). Failing the guard does `<Navigate to="/login" replace />`. Account has no extra guard. | `app/react/Routes.tsx:324-345`, `app/react/ProtectedRoute.tsx:6-34` |
| SSR guard | Server redirects to `/login` before running loaders when the last matched route element is a `ProtectedRoute` and the role is not allowed. Account is not a `ProtectedRoute` at the leaf, so SSR relies on the loader's 401. | `app/react/entry-server.tsx:460-474` |
| Server role middleware | `needsAuthorization(roles = ['admin'])`: passes if `req.user.role` is in `roles`, else HTTP 401 `{error:'Unauthorized', message:'Unauthorized'}`. | `app/api/auth/authMiddleware.ts:14-24` |
| Password re-entry | Destructive user endpoints require the caller's current password in `Authorization: Basic base64(password)`. Middleware compares with bcrypt; failure returns 403 `{error:'Password error', message:'Forbidden'}`. | `app/react/V2/api/users/index.ts:20-31`, `app/api/core/infrastructure/express/users/ValidatePasswordMiddleWare.ts:18-32`, `app/api/core/application/ValidateCurrentPassword.ts:7-18` |
| Notifications | `notify(type, title, message?, details?)` from `useRequestStatus` appends to a notification list (Beacon/panel), not an inline toast. | `app/react/V2/atoms/requestStatusAtom.ts:144-154` |
| Duplicate error notifications (likely) | The V2 `apiClient` also has a global notification policy: any `request:error` except 401, 404, cancelled raises "An error occurred" with `detail`. Account and Users code also calls `notify` on the same error. Result: two entries for one failed request. 409 becomes a warning titled with the error code. VERIFIED in code; the doubled UI result was not run. Collection and Menu use the legacy `api` client (not `apiClient`), so they are not affected. | `app/react/V2/api/policies.ts:39-72`, `app/react/V2/api/client.ts:8-10` |
| Error text source | `ApiError.detail = body.prettyMessage ?? body.message ?? body.error ?? statusText`. For DomainErrors the server's `prettyMessage` is built by `fallbackPrettifier` and includes `url:`, `body:` (username/password masked) and the message text. Designers should expect verbose multi-line detail in the notification; not run, so ASSUMED for exact layout. | `app/shared/apiClient/normalizeError.ts:85-96`, `app/api/utils/handleError.js:44-64,142-144,214-217,259-271`, `app/api/utils/error_handling_middleware.js:36-38` |
| Server error status map | DomainError 400; Zod/Ajv validation 422 with `validations[]`; `UnauthorizedError` 401; `InvalidCredentials`/`AccountLocked` 401; unknown 500 ("A server side error has occurred"). | `app/api/utils/handleError.js:116-152,185-187,292-298` |
| Auth policy | Any 401 from `apiClient` does `window.location.assign('/login')`. | `app/react/V2/api/policies.ts:74-83` |
| Activity log | Middleware logs every non-GET `/api/*` call except a short ignore list (`/api/login`, `/api/recoverpassword`, `/api/resetpassword`, `/api/unlockaccount`, others). Passwords are masked. Registered globally. | `app/api/api.js:17`, `app/api/activitylog/activitylogMiddleware.ts:6-20,34-47` |
| Dirty guards | Only Menu has one (`useBlocker`). Account, Users, Collection have none (grep for `useBlocker`/`BlockDirtyNavigation` lists Filters, Customization, Translations, Pages, Thesauri, CustomUploads, MenuConfig, Templates only). | grep over `app/react` |
| Backend layout | Backend is under `app/api/core/{application,domain,infrastructure}` (use cases + express controllers), not `app/api/users` or `app/api/settings` (those dirs hold only `users/usersModel.ts`). A Postgres settings datasource also exists next to the Mongo one. | `app/api/core/infrastructure/express/users/routes.ts`, `.../settings/routes.ts`, `app/api/core/infrastructure/postgresql/settings/*` |

---

### Account
- **Route / file**: `/settings/account` (language-prefixed variants exist via `languageLayout`). Route `app/react/Routes.tsx:325`. Loader `createAccountLoader` `app/react/V2/Routes/Settings/Account/createAccountLoader.ts:12-19` (calls `services.users.getCurrent`, throws `throwApiError` on error). Component `app/react/V2/Routes/Settings/Account/Account.tsx:15-232`. 2FA panel `.../Account/Components/TwoFactorSetup.tsx:22-170`. Client: `GET /api/user` (`app/react/V2/api/users/index.ts:163-166`); on SSR the server service reads `ctx.user` directly (`app/react/V2/services/server/ServerUsersService.ts:46-60`).
- **Who can see it**: any logged-in role (admin, editor, collaborator). Client guard: `loggedInUsersRoute` on parent (`Routes.tsx:324`). Server: `GET /api/user` has no `needsAuthorization`; it returns `req.user || {}` (`app/api/auth/routes.js:33`, `.../users/GetCurrentUserController.ts:3-8`). Save: `POST /api/users` with `needsAuthorization(['admin','editor','collaborator'])` + `validatePasswordMiddleWare` (`app/api/core/infrastructure/express/users/routes.ts:20-25`). 2FA: `POST /api/auth2fa-secret` and `/api/auth2fa-enable`, both `needsAuthorization(['admin','editor','collaborator'])` (`app/api/auth2fa/routes.ts:9-19`). No feature toggle. Self-edit rule in the use case: a non-admin may only update their own record, otherwise `UnauthorizedError` (401, which the V2 auth policy turns into a redirect to /login); own role cannot change ("Cannot change own role"); group assignment is applied only when the actor is admin (`app/api/core/application/UpdateUser.ts:42-52,76`).
- **Layout**: Header "Account". Body is one form (`id="account-form"`) with three stacked cards: "General Information" (2-column grid: Username, User Role, Email full width), "Change Password" (2 columns: New password, Confirm new password), "Two-Factor Authentication" (yellow card when off with an Enable button and hint; default-coloured card when on with a disabled green "Activated" button and text). Sticky footer: red-outline "Logout" link (left) and "Update" button. A hidden disabled submit button drives the form. `Account.tsx:61-229`. When 2FA is off, `TwoFactorSetup` sidepanel is mounted (large, with overlay).
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Username | text input, disabled, shows `userAccount.username` | current value | none (read only) | label "Username" | `Account.tsx:75-80` |
| User Role | text input, disabled, raw role string (`admin`/`editor`/`collaborator`, not translated) | current role | none | label "User Role" | `Account.tsx:83-89` |
| Email | text input, react-hook-form `email` | current email | `required: true`; custom `format` = `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; mode `onSubmit`. Server: `z.string().email()`, unique (exact, case-sensitive match) | label "Email"; error "A valid email is required" (both required and format) | `Account.tsx:91-106`, `app/react/V2/shared/formatHelpers.ts:53`, `app/api/core/domain/user/User.ts:37-45`, `app/api/core/infrastructure/mongodb/user/MongoUsersDataSource.ts:52-60` |
| New password | password input, `password` | empty | none client-side. Server: `z.string().min(1).optional()`; empty string is dropped before send (`prepareUser`). No length or strength rule anywhere in the Account path. | label "New password" | `Account.tsx:113-119`, `app/react/V2/api/users/index.ts:7-18`, `UpdateUser.ts:23` |
| Confirm new password | password input, `passwordConfirm` | empty | `validate: val === watch('password')` (runs even when both are empty, which passes) | label "Confirm new password"; error "Passwords do not match" (shown under New password) | `Account.tsx:120-133` |
| Current password (for confirmation) | password input inside confirmation modal, not part of the form | empty | accept enabled when length > 0; server bcrypt compare | label "Enter your current password to confirm" | `Account.tsx:211-227`, `ConfirmationModal.tsx:88-105` |
| Two-factor token (panel) | text input `authenticator-token` | empty | none client-side (no 6-digit mask, Enable only needs non-empty). Server: `otplib.authenticator.verify` | label "Enter the 6-digit verification code generated by your Authenticator app"; error "The token does not validate against the secret key!" | `TwoFactorSetup.tsx:139-155,158`, `EnableTwoFactorAuth.ts:17-31` |
| Secret key (panel) | read-only copy input (`CopyValueInput`) | secret from server | n/a | "You can also enter this secret key into your Authenticator app." / "*please keep this key secret and don't share it.*" | `TwoFactorSetup.tsx:127-138` |

- **Actions**:

| Control | Label | Client behaviour | Server call and effect |
|---|---|---|---|
| Footer link | "Logout" | plain `<a href="/logout">` (full page load) | `GET /logout` -> `LogoutController` (`app/api/auth/routes.js:35`) |
| Footer button | "Update" | disabled while `!isDirty`; click runs `trigger()` and, if valid, opens the confirmation modal; Accept clicks the hidden submit, which calls `usersService.upsert(data, currentPassword)` | `POST /api/users` body = whole profile (username, email, role, groups, using2fa, optional password); `accountLocked`/`failedLogins` stripped. Handler `UpdateUserController` (`.../users/UpdateUserController.ts:16-37`, status 201) -> `UpdateUser` use case: updates profile (validates username/email/role via `User.updateProfile`), checks unique username/email only if changed, re-hashes password if given (bcrypt, 10 rounds), writes in a transaction. |
| Card button | "Enable" (2FA) | opens sidepanel | none until panel loads |
| Panel (on open, once) | (automatic) | `usersService.get2FASecret()` | `POST /api/auth2fa-secret`: use case generates a secret, stores it on the user (`setTwoFactorSecret`), returns `{secret, otpauth}`; `otpauth` uses username and the site name (truncated to 30 chars + "...") (`GenerateTwoFactorSecret.ts:14-29`). Fails with `TwoFactorAlreadyEnabled` if already on. QR is `qrcode.react`, lazy-loaded, 180px. |
| Panel footer | "Cancel" | closes panel (token text is kept in state) | none |
| Panel footer | "Enable" | disabled while token empty; calls `enable2FA(token)` | `POST /api/auth2fa-enable {token}` -> verifies against stored secret, then `enableTwoFactor`. Bad token: `TwoFactorTokenInvalid` 400 ("Two-factor authentication failed."). |
| Panel header close / overlay | (X / click overlay / Escape) | `closePanel` | none |

  There is no control to disable 2FA or to change email without the password modal. A user cannot turn 2FA off here; only an admin can (Users page, "Reset 2FA").
- **Confirmations**: one `ConfirmationModal` (non-danger style) when "Update" passes validation. Header "Confirm", body "Confirm action", password field "Enter your current password to confirm", buttons "Cancel" and "Accept" (defaults). Accept closes the modal and submits. Cancel only closes. (`Account.tsx:211-227`, `ConfirmationModal.tsx:159-195`). Accept is disabled until the password field is non-empty.
- **Empty / loading / error / notification states**:
  - Loader error: `throwApiError` -> route error boundary. Loading: global request-status loader (min 1000 ms animation) (`requestStatusAtom.ts:28-57`).
  - Success toasts: "Account updated" (then revalidate, then password fields reset); "2FA Enabled" (after revalidate and panel close).
  - Error toasts: title "An error occurred", detail = server detail. Wrong current password returns 403 and shows detail "Forbidden". Email/username conflicts return 400 (`The email "x" already exists`, `The username "x" already exists`). Invalid email 422 with `validations`.
  - 2FA token wrong (HTTP 400): inline red text "The token does not validate against the secret key!" only; the generic notification policy likely also raises "An error occurred" (see shared table).
  - 2FA secret load failure: "An error occurred" toast and QR stays empty (`QRCodeSVG value=''`).
- **Save model**: explicit Update button plus password modal; no autosave; no dirty-navigation guard. After success: `revalidator.revalidate()` reloads the loader; `resetField('password')` and `resetField('passwordConfirm')`. `useForm` default values are read once, so `isDirty` is computed against the original defaults and the Update button probably stays enabled after a successful save (ASSUMED from react-hook-form behaviour, not run). 2FA enable is a separate action in a sidepanel (not part of Update); it revalidates and closes.
- **V1 vs V2**: V1 settings UI removed. Remaining legacy pieces: `app/react/Users/UsersAPI.js` (V1 API helper; no non-spec importers found), `app/react/Users/Login.jsx` (login incl. the 2FA token step on HTTP 409), `ResetPassword.jsx`, `UnlockAccount.jsx` (public pages reached by emailed links `/setpassword/:key`, `/unlockaccount/:username/:code`, `Routes.tsx:322-323`).
- **Notes/gotchas**:
  - Email change and password change go through the same Update button and the same password confirmation.
  - A secret is persisted on the user record as soon as the 2FA panel opens, before the token is verified. Re-opening the panel in the same page session does not request a new secret because `secret` state is kept (`TwoFactorSetup.tsx:31-52`).
  - Role is not editable here; if an admin changes their own role through the API the server rejects it.
  - Account password has no minimum length on client or server.

---

### Users & Groups
- **Route / file**: `/settings/users`. Route `app/react/Routes.tsx:341-345`. Loader `createUsersLoader` `app/react/V2/Routes/Settings/Users/createUsersLoader.ts:12-28` (parallel `users.getAll` + `userGroups.getAll`, adds `rowId = _id`). Component `.../Users/Users.tsx:23-277`. Parts: `components/UserFormSidepanel.tsx`, `GroupFormSidepanel.tsx`, `TableComponents.tsx`, `PermissionsListModal.tsx`, `ListOfItems.tsx`. Client API `app/react/V2/api/users/index.ts`.
- **Who can see it**: admin only. Client: `adminsOnlyRoute` (`Routes.tsx:341`), nav link hidden for others (`SettingsNavigation.tsx:34`). Server (all in `app/api/core/infrastructure/express/users/routes.ts` and `.../userGroups/routes.ts`):

| Endpoint | Middleware |
|---|---|
| `GET /api/users` | `needsAuthorization()` (admin) |
| `POST /api/users/new` | admin + `validatePasswordMiddleWare` |
| `POST /api/users` | admin/editor/collaborator + `validatePasswordMiddleWare` (use case enforces self-only for non-admin) |
| `DELETE /api/users` | admin + `validatePasswordMiddleWare` |
| `POST /api/users/unlock` | admin + `validatePasswordMiddleWare` |
| `POST /api/auth2fa-reset` | admin + `validatePasswordMiddleWare` (`app/api/auth2fa/routes.ts:21-26`) |
| `POST /api/recoverpassword` | none (public; allowed on private instances) (`routes.ts:43`, `PrivateInstanceMiddleware.ts:11-16`) |
| `GET/POST/DELETE /api/usergroups` | `needsAuthorization(['admin'])`, no password needed (`userGroups/routes.ts:9-31`) |

  No feature toggles. Note `POST /api/usergroups` routes to create or update depending on `req.body._id` (`userGroups/routes.ts:13-17`).
- **Layout**: Header "Users & Groups". Body: tabs "Users" (default) and "Groups" (`Tabs`, `Users.tsx:118-162`), each a sortable `Table` with row checkboxes and a table header ("Users" / "Groups"). Users columns: Username (sort default asc; red text + lock icon with tooltip "Account locked" when `accountLocked`), Protection (pill "Password" gray or "Password + 2fa" green), Role (pill; `admin` primary, others gray; value rendered through `Translate`), Group (gray pills of group names), unlabeled action column with "Edit" ghost button (`TableComponents.tsx:99-127`). Groups columns: Name (default sort asc), Members (gray username pills, not sortable), Edit (`TableComponents.tsx:129-147`). Sticky footer changes with selection (see Actions). Sidepanel (overlay) holds the user or group form. Switching tab clears both selections and closes the form data (`Users.tsx:122-127`).
- **Fields**: User form (`UserFormSidepanel.tsx`). Title "New user" / "Edit user".

| Field | Type/control | Default | Validation (client) | Copy | file:line |
|---|---|---|---|---|---|
| Username | text, `autoComplete="new-username"` | "" | required; minLength 3; maxLength 50; no whitespace; unique vs loaded users (case-insensitive, trimmed) | label "Username"; errors "Username is required", "Duplicated username", "Username is too long", "Username is too short", "Usernames cannot have spaces" | `UserFormSidepanel.tsx:229-247,57-73` |
| User Role | `Select` with help icon (button, sr-only text "Permission") opening the Permissions modal | `collaborator` | none | label "User Role"; options "Admin", "Editor", "Collaborator" (values `admin`,`editor`,`collaborator`) | `:29-41,110-119,249-263` |
| Email | `type=email`, `autoComplete="new-email"` | "" | required; maxLength 256; format regex (as Account); unique vs loaded users | label "Email"; errors "A valid email is required", "Duplicated email" | `:265-284,75-85` |
| Password | password, `autoComplete="new-password"` | "" | maxLength 50 only. Blank on create = server generates a random password and sends a welcome email; blank on edit = unchanged. | label "Password"; error "Password is too long" (shown for any password error) | `:288-302,87-89` |
| Groups | `MultiSelect` of group names (stored as `{_id,name}`) | none | none | label "Groups"; placeholder "Nothing selected" | `:347-358,51-55` |

  Server rules (the form never shows these): username trimmed, min length 1, no spaces ("Usernames can not contain spaces."), email must be a valid email, role must be one of three (`User.ts:37-45`). Uniqueness is exact-match on `username` and `email` (`MongoUsersDataSource.ts:42-60`): client says duplicates are case-insensitive and also compares a username value against existing emails and vice versa (`isUnique` is used with both fields' value and checks both properties, `UserFormSidepanel.tsx:43-49`), so the client is stricter than the server. Server rejects: updating the system public user (`Cannot modify system user`), own-role change (`Cannot change own role`), demoting the last admin (`Cannot remove the last remaining admin`) (`UpdateUser.ts:36-62`). The UI does not disable the role select for the current admin, so the self-role error surfaces as a notification.

  Group form (`GroupFormSidepanel.tsx`). Title "New group" / "Edit group", card "Group Options".

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Name | text | "" | required; minLength 3; maxLength 50; unique vs loaded groups (case-insensitive, trimmed) | label "Name"; errors "Name is required", "Duplicated name", "Name is too long", "Name is too short" | `GroupFormSidepanel.tsx:118-133,28-41` |
| Members | `MultiSelect` of users (option label = username, value = user id) | none | none | label "Members"; placeholder "Nothing selected" | `:136-157` |

  Server group rules: `name` trimmed, no min/max; case-insensitive uniqueness through a regex built from the raw name (`new RegExp('^'+name+'$','i')`, `MongoUserGroupsDataSource.ts:84-99`), so names with regex metacharacters can misbehave (ASSUMED 500 or false match, not run); duplicate member ids rejected (`UserGroup.ts:21-24`, error "Duplicate member ids: ...", code `usergroup.duplicate_member_ids`); duplicate name error `The group name "x" already exists`.
- **Actions**:

| Control | Label | Client behaviour | Server call and effect |
|---|---|---|---|
| Footer (no selection) | "Add user" (Users tab) / "Add group" (Groups tab) | clears sidepanel data, opens sidepanel | none |
| Row | "Edit" | opens sidepanel with the row | none |
| User sidepanel footer | "Cancel" / "Save" | Save runs `trigger()`, then password modal, then `usersService.upsert` | New: `POST /api/users/new` (`CreateUserController`, 201). Insert user, assign groups (`$addToSet` into `usergroups.members`), send welcome email, all in a transaction (`CreateUser.ts:32-57`). Existing: `POST /api/users` as in Account. Group changes: admin only; `assignGroupsToUser` adds to listed groups and removes from all others (`MongoUserGroupsDataSource.ts:15-34`). |
| User sidepanel | "Reset Password" (ghost, edit mode only) | calls `requestPasswordReset(user)` immediately, no confirmation, no password. Panel stays open. | `POST /api/recoverpassword {email}`: if the email matches, stores a random 32-byte hex key in password recoveries and emails it ("Password recovery", link `/setpassword/<key>`, valid 24 hours). Unknown email returns OK silently (`RecoverPassword.ts:21-37`, `passwordRecoveryEmail.ts`). |
| User sidepanel | "Reset 2FA" (ghost, edit mode only) | opens password modal; Accept calls `reset2FA` | `POST /api/auth2fa-reset {_id}`: sets `using2fa=false, secret=null` (`MongoUsersDataSource.ts:230-235`). Closes panel after. Id must be 24 hex chars. |
| User sidepanel | "Unlock account" (red secondary, only when `accountLocked`) | opens password modal; Accept calls `unlockAccount` | `POST /api/users/unlock {_id}`: unsets `accountLocked`, `accountUnlockCode`, `failedLogins` (`:179-184`). Closes panel. |
| Group sidepanel footer | "Cancel" / "Save" | Save submits form directly (no password) | `POST /api/usergroups`: create (`CreateUserGroupController`) or update when `_id` present (`UpdateUserGroupController`). Writes `usergroups` doc `{name, members:[{refId}]}`. |
| Row checkbox / header checkbox | (select) | Users and Groups keep separate selections | none |
| Footer when >=1 user selected | "Reset Password", "Reset 2FA" (ghost) | open confirmation modal; run per selected user in parallel | `POST /api/recoverpassword` per user; `POST /api/auth2fa-reset` per user (`index.ts:97-137`) |
| Footer when >=1 user or group selected | "Delete" (danger) | opens confirmation modal | Users: `DELETE /api/users?ids=[...]` (`DeleteUserController`): checks, then deletes users and pulls them from all groups in a transaction (`DeleteUsers.ts:23-56`). Groups: `DELETE /api/usergroups?ids=...` (`DeleteUserGroupsUseCase`: deletes the group documents; users are untouched). |
| Role help icon | "?" button (sr-only "Permission") | opens Permissions modal | none |

  Server delete guards (400 DomainError, text from `app/api/core/domain/user/errors.ts`): "Cannot delete system users", "Users cannot delete themselves", "Cannot delete last remaining user", "Cannot remove the last remaining admin". The UI lets you tick yourself; the error appears after confirming. The footer shows "Add ..." only when nothing is selected; the Reset buttons only when users are selected.
- **Confirmations**:

| Trigger | Modal | Copy | On accept |
|---|---|---|---|
| Sidepanel Save (user) | normal `ConfirmationModal` + password | header "Confirm"; body "Confirm action"; field "Enter your current password to confirm"; buttons "Cancel" / "Accept" | `saveUser(getValues(), password)` |
| Sidepanel Reset 2FA, Unlock account | same modal | same copy | `reset2FA` or `unlockAccount`, then revalidate and close panel |
| Footer Reset Password (bulk) | danger `ConfirmationModal`, no password | header "Reset passwords"; red warning band "Do you want reset the password for the following users?"; body = bullet list of usernames; buttons "Cancel" / "Accept" | `requestPasswordReset(selectedUsers)` |
| Footer Reset 2FA (bulk) | danger modal + password | header "Reset 2FA"; warning "Do you want disable 2FA for the following users?"; list; password field | `reset2FA(selectedUsers, password)` |
| Footer Delete | danger modal; password only when users are selected | header "Delete"; warning "Do you want to delete the following items?"; list of usernames or group names; password field for users | delete users (with password) or groups |

  Source: `Users.tsx:254-274`, `ConfirmationModal.tsx:110-157`. After Accept the modal closes and both selections clear, whether the call succeeded or failed (`Users.tsx:264-270`). The sidepanel is made `pointer-events-none` while a confirmation or the Permissions modal is open (`UserFormSidepanel.tsx:209-213`).
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (default `Table` no-data row; `app/react/V2/Components/UI/Table/DefaultNoDataMessage.tsx:4-8`).
  - Success notifications: "Added new user", "User updated", "Group saved", "Group updated", "Deleted user" (also shown for bulk deletes), "Deleted user group", "Instructions to reset the password were sent to the user", "Disabled 2FA", "Account unlocked successfully" (`UserFormSidepanel.tsx:157-163,176-191`, `GroupFormSidepanel.tsx:100-103`, `Users.tsx:73-98`).
  - Error: "An error occurred" with server detail (`notifyMutationError`). Wrong current password: detail "Forbidden". Loader error: route error boundary.
  - Account-locked rows show red name and a lock icon with tooltip "Account locked".
  - Permissions modal (title "Permissions", xxxl width, footer "Close"): table with columns "User Action", Collaborator, Editor, Admin; check icon = full, user-plus icon with tooltip "Permission on entities explicitly shared with the user" = partial, X = none. Rows (action: collaborator/editor/admin): Create new entities and upload documents: full/full/full; Create table of contents: full/full/full; View entities: partial/full/full; Edit metadata of entities: partial/full/full; Delete entities and documents: partial/full/full; Share edit access with other users: partial/full/full; Create relationships and references: partial/full/full; Share entities with the public: none/full/full; Manage site settings and configuration: none/none/full; Add/delete users and assign roles: none/none/full; Configure filters: none/none/full; Add/edit translations: none/none/full; Configure templates: none/none/full; Create and edit thesauri: none/none/full; Create relationship types: none/none/full (`PermissionsListModal.tsx:24-130`). The matrix is hard-coded copy, not derived from server rules.
- **Save model**: users: sidepanel form + mandatory password modal; groups: sidepanel form, no password; bulk actions: footer + confirmation modal. No autosave and no dirty guard (closing the sidepanel, clicking the overlay or switching tab discards edits silently). After each success: `revalidator.revalidate()` (re-runs both loaders), then user/group sidepanels close (`closeSidepanel` resets the form). Bulk Reset Password never closes anything. Group panel is `Cancel`/`Save` with `type="submit"`, so Enter in the name field saves.
- **V1 vs V2**: V1 Users settings UI removed. `app/react/Users/UsersAPI.js` remains (save/new/unlock/currentUser/get/getById/delete) but no non-spec file imports it (grep). The V2 client builds its own requests in `app/react/V2/api/users/index.ts` and injects them through `V2Services` (`HttpUsersService`, `HttpUserGroupsService`); the SSR server variants only implement reads (`getAll`, `getCurrent`) and return `notImplemented` for writes (`ServerUsersService.ts:62-74`, `ServerUserGroupsService.ts:23-25`).
- **Notes/gotchas**:
  - Welcome email is sent on every create (`sendWelcomeEmail` defaults true); the form has no "send email" option and no way to see/copy the generated password. Email subject "Welcome to <site name>"; link `/setpassword/<key>?createAccount=true`, valid 24 hours (`welcomeEmail.ts`). Sending uses the sender address and (hidden) `mailerConfig` from Collection settings (see Collection).
  - Admin deleting a user removes the user from all groups but does not reassign permissions on entities.
  - `GET /api/users` returns username, role, email, groups, using2fa, accountLocked (no password hash) (`GetUsersController.ts:13-21`).
  - Client duplicate check is stricter than server (case-insensitive, username compared against emails).
  - Table sort: Users default Username asc, Groups default Name asc; Protection and Role columns are sortable, Edit and Members are not.
  - UI does not prevent the three server-only blocks (delete self, change own role, remove last admin); they come back as error notifications.

---

### Dashboard
- **Route / file**: `/settings/dashboard`. Route `app/react/Routes.tsx:326-330`. Loader and component both in `app/react/V2/Routes/Settings/Dashboard/Dashboard.tsx:13-90` (`dashboardLoader`, `Dashboard`). Client call `getStats` -> `GET /api/stats` (`app/react/V2/api/settings/index.ts:60-70`).
- **Who can see it**: admin only. Client `adminsOnlyRoute`; nav link only for admin (`SettingsNavigation.tsx:33`). Server: `GET /api/stats` with `needsAuthorization(['admin'])` (`app/api/stats/routes.ts:10`). No feature toggle.
- **Layout**: Header "Dashboard". Body: 2-column grid (1 column on small screens) of four read-only cards: Users, Storage, Entities, Files. No footer, no actions (`Dashboard.tsx:21-88`).
- **Fields** (all read-only, no inputs):

| Card | Content | Copy | Source of number | file:line |
|---|---|---|---|---|
| Users | big number + "total users"; second line "N Admins \| N Editors \| N Collaborators" | "Users", "total users", "Admins", "Editors", "Collaborators" | `users.total` = sum of counts by role; per role counts zero-filled | `Dashboard.tsx:32-49`, `app/api/stats/services/RetrieveStatsService.ts:89-96`, `app/api/core/application/contracts/UserReadModels.ts:19-23` |
| Storage | big number + unit (e.g. "1.5 GB", unit string passes through `Translate`); caption | "Storage", "Files and database usage" | `storage.total` = sum of file sizes (`filesDAO.getTotalFileSize`) + Mongo `db.stats().storageSize` + Elasticsearch `store.size` over all indices (if Elastic fails the total silently omits it). Formatter `formatBytes` uses units Bytes, KB, MB, GB... and 2 decimals. | `Dashboard.tsx:50-60`, `RetrieveStatsService.ts:56-77`, `app/react/V2/shared/formatHelpers.ts:1-7` |
| Entities | big number + "total entities"; caption | "Entities", "total entities", "Entities across all languages" | `entitiesDAO.countDistinctSharedIds()` (distinct shared ids, so one per entity regardless of language, despite the caption wording) | `Dashboard.tsx:61-71`, `RetrieveStatsService.ts:79-83` |
| Files | big number + "total files"; caption | "Files", "total files", "Total files from main documents, supporting files and uploads" | `filesDAO.countDocuments()` | `Dashboard.tsx:72-82`, `RetrieveStatsService.ts:85-87` |

- **Actions**: none found (no buttons, links, or row actions).
- **Confirmations**: none found.
- **Empty / loading / error / notification states**: The loader ignores errors (`const [stats] = await getStats(headers)`), so on failure `stats` is undefined: numbers render empty (React omits `undefined`) and Storage shows "0 Bytes" split into "0" and "Bytes" (`Dashboard.tsx:16,23-24`). No error message, no skeleton; global request loader only. No toasts.
- **Save model**: none (read only). Data is read at navigation; there is no refresh control and no socket updates (ASSUMED, none found in the component).
- **V1 vs V2**: V1 removed (no Redux dashboard component in `app/react/Settings`). Remaining: the stats endpoint, which the V2 client calls with the legacy `api.get('stats')` helper.
- **Notes/gotchas**: Storage caption says "Files and database usage" but the backend also adds Elasticsearch index size. The Users card counts every stored user including any system user not excluded by `countByRole` (scope filter `scoped()` is applied but its content was not read; ASSUMED public user excluded). "Entities across all languages" actually counts distinct sharedIds.

---

### Collection
- **Route / file**: `/settings/collection`. Route `app/react/Routes.tsx:336-340`. Loader `collectionLoader` and component `Collection` in `app/react/V2/Routes/Settings/Collection/Collection.tsx:31-49,89-474`. Helpers: `CollectionOptionToggle.tsx`, `collectionSettingsTips.tsx` (tooltip copy), `Theming/*` (branding, theme sidepanel), `app/react/V2/Components/ThemeSelector/*`, `app/react/V2/theme/*`.
  Loader calls: `GET /api/settings` (settings, admin projection), `GET` templates (`TemplatesAPI.getAll`), `GET /api/files?type=custom` (uploaded custom images). It strips the server's `themeCustomization` flag from settings and passes it separately (`Collection.tsx:34-48`). Template error throws; settings and files errors are swallowed (`SettingsAPI.get` returns `[undefined, e]`; destructuring `raw as ...` would throw on undefined, ASSUMED).
- **Who can see it**: admin only. Client `adminsOnlyRoute` + nav (`SettingsNavigation.tsx:35`). Server: `POST /api/settings` has `needsAuthorization()` (admin) (`app/api/core/infrastructure/express/settings/routes.ts:10`); `GET /api/settings` has no middleware and returns the public projection to anyone, the admin projection (adds contactEmail, senderEmail, openPublicEndpoint, mailerConfig, publicFormDestination, features, filterUnauthorizedRelated) only when `actor.role === 'admin'` (`SettingsQueryService.ts:27-29`, `publicSettings.ts:5-46`). Feature toggles: favicon picker vs theme card by tenant flag `themeCustomization` (`publicSettings.ts:63-66`, `Collection.tsx:198-222`); "Services" card only when `features.ocr.url` is set (`Collection.tsx:335`); "Non-latin characters support" hidden once enabled (`:292`).
- **Layout**: Header "Collection". Body: one form (`id="collection-form"`) with cards in this order: "General" (2-column grid), "Analytics" (title carries help tooltip), "Services" (conditional), "Forms and email configuration", "Map". Sticky footer: single "Save" button submitting the form (`Collection.tsx:182-472`). Toggles are rendered as full-width rows (`col-span-2`): switch + label + help icon with tooltip (placement right). No tabs. The theme editor is a large sidepanel with overlay opened from the General card.
- **Fields**:

| Field | Type/control | Default | Validation | Help text/placeholder/label copy | file:line |
|---|---|---|---|---|---|
| Collection name (`site_name`) | text | stored value | client `required: true`; server `z.string().optional()` (no max). Used in page title, 2FA otpauth label (30 chars), email "from" name and welcome email subject. | label "Collection Name" | `Collection.tsx:191-196` |
| Custom favicon (`favicon`) | image picker (hidden input + modal), shown when `themeCustomization` is false | none (Uwazi logo) | image from Custom Uploads only; size rule strict: square, 16x16 to 512x512 px; wrong size is an error and cannot be picked | label "Custom Favicon" + tooltip (customFavIcon: "A favicon is a small icon that represents your collection in browser tabs and bookmarks. The default favicon is the Uwazi logo. To use your own: 1. Upload your icon in Custom Uploads if needed. 2. Open the favicon picker and pick a file (images from Custom Uploads only). 3. Reload the page to see your favicon in action."); button "Select favicon image" (modal title); "Recommended: 16x16 to 512x512 px (square)"; buttons "Choose"/"Change", "Clear" | `Collection.tsx:198-211`, `collectionSettingsTips.tsx:20-28`, `Theming/brandImageUploadRules.ts:3-11` |
| Theme and branding (`themeVars`, `themeAssets`, plus `site_logo`/`favicon`), shown when `themeCustomization` is true | summary card + "Edit theme" button opening sidepanel | `themeVars {}`, `themeAssets {}` | `themeVars` = record of strings <=512 chars; `themeAssets.preset` in `default`/`legacy`; see Theming below | "Theme and branding", chip with preset name (e.g. "Uwazi Design"), chip "Customized" when overrides exist, two swatches (light, dark accent) | `Collection.tsx:212-222`, `Theming/ThemeSelectionCard.tsx:22-119`, `saveSettingsInput.ts:161-181` |
| Default view (`defaultLibraryView`) | select | stored (`cards` if unset is ASSUMED: `getLibraryDefault` treats anything but `table`/`map` as cards) | server `z.string().optional()` (not an enum) | label "Default View"; options "Cards", "Map", "Table" (values `cards`,`map`,`table`) | `Collection.tsx:224-234`, `app/react/Routes.tsx:143-163` |
| Default date format (`dateFormat`) | select | stored | server string | label "Default date format"; options built from today's date: `yyyy/MM/dd`, `dd/MM/yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`, `dd-MM-yyyy`, `MM-dd-yyyy`, each labelled like "2026/10/04 (Year/Month/Day)" | `Collection.tsx:51-87,235-242` |
| Custom landing page (`home_page`) | text with prefix text "https://yourdomain" | stored | none client side. Runtime: `validateHomePageRoute` decides if it is usable; invalid or empty falls back to the library; supports `page/<id>`, `entity/<id>`, `library/...` paths | label "Custom landing page" + tooltip (landingPageTip: "The landing page is the first page that visitors see when they come to your collection. The default landing page is your collection's library. You can set a different landing page by adding its relative URL here." then examples `/page/dicxg0oagy3xgr7ixef80k9`, `/library/?searchTerm=test`, `/entity/9htbkgpkyy7j5rk9`, `/entity/4y9i99fadjp833di`, and "Important: You must use relative URLs. These start with a forward slash and do not include the domain name...") | `Collection.tsx:243-253`, `collectionSettingsTips.tsx:5-18`, `app/react/getIndexElement.tsx:26-70` |
| Public instance (`private`, inverted in UI) | toggle | checked = `!private` | UI flips the value on load (`formData.private = !formData.private`, line 101) and back on submit (line 130); server boolean | label "Public instance"; tooltip "Check to make this instance public (non-logged in users can see public documents and entities)" | `Collection.tsx:254-262,101,130`, `collectionSettingsTips.tsx:39-43` |
| Hide restricted relationships from public (`filterUnauthorizedRelated`) | toggle | false | boolean | tooltip "By default, relationships pointing to restricted entities are visible to anonymous users but not linked. When enabled, these relationships are completely hidden, preventing public users from knowing restricted content exists." | `Collection.tsx:263-273`, `collectionSettingsTips.tsx:189-195` |
| Show cookie policy (`cookiepolicy`) | toggle | false | boolean | tooltip "When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted." Effect: cookie popup and footer link (`app/react/App/Cookiepopup.jsx:26`, `Footer.jsx:67`) | `Collection.tsx:274-284`, `collectionSettingsTips.tsx:45-50` |
| Global JS (`allowcustomJS`) | toggle | false | boolean | tooltip "With great power comes great responsibility! / This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities. / It could also very easily break the app. Only write code here if you know exactly what you are doing." Effect: enables the JS part of Settings > Global CSS & JS and injects `customJS` (`Root.jsx:160`, `SettingsNavigation.tsx:111-120`) | `Collection.tsx:285-291`, `collectionSettingsTips.tsx:172-187` |
| Non-latin characters support (`newNameGeneration`) | toggle, rendered only while the stored value is falsy | off | server `z.literal(true)` only; client deletes the key when false. One-way. | label "Non-latin characters support"; tooltip: "This option enhances support for non-Latin languages as the default languages of your collection. Selecting this option will update all template properties automatically. The process could take several minutes. Selecting this option will likely change the URLs of library filters. As a consequence, if you have menus or links using such URLs, they will probably stop working. You will need to update them manually. After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked." followed by bold "This process could take several minutes and will likely change URLs to library filters. If you have menus or links using such URLs, they will probably stop working after the update. You will need to update them manually." and "After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked." | `Collection.tsx:121-123,292-304`, `collectionSettingsTips.tsx:82-108`, `SaveSettings.ts:28-33` |
| Analytics: Google (`analyticsTrackingId`) | text | stored | server string | card title "Analytics" + tooltip "If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo."; label "Google" | `Collection.tsx:307-334` |
| Analytics: Matomo (`matomoConfig`) | text | stored | server string | label "Matomo" | `Collection.tsx:326-332` |
| Document OCR trigger (`ocrServiceEnabled`) | toggle in "Services" card; card visible only if `features.ocr.url` | false | boolean | tooltip "This will enable the Optical Character Recognition (OCR) functionality for PDF documents. This service will recognize text inside images, such as scanned documents and photos, and convert it into machine-readable text data. / When activated, this will enable administrator and editor users to send PDF documents to the OCR service." | `Collection.tsx:335-349`, `collectionSettingsTips.tsx:157-170` |
| Sending email (`senderEmail`) | text | stored (server falls back to `DEFAULT_SENDER_EMAIL` or `no-reply@uwazi.io`) | server string, no email-format check | label "Sending email" + tooltip "This is the email address that will appear as the sender when an email is sent from your Uwazi collection to registered users. The default address is no-reply@uwazi.io. You can set a custom one by including your desired email address here." | `Collection.tsx:353-357`, `collectionSettingsTips.tsx:75-80`, `app/api/config.ts:176` |
| Contact form email (`contactEmail`) | text | stored | server string, no email-format check | label "Contact form email" + tooltip "If you have a contact form, this is the email address that will receive the form's submissions." + link "Learn how to add and configure a contact form on a webpage." (opens docs.uwazi.io) | `Collection.tsx:360-368`, `collectionSettingsTips.tsx:52-68` |
| Public Form submit URL (`publicFormDestination`) | text | stored | server string | label "Public Form submit URL" + tooltip "If you have configured a public form and would like a different Uwazi collection to receive the submissions, enter its URL here." | `Collection.tsx:370-378`, `collectionSettingsTips.tsx:125-128` |
| Allow captcha bypass (`openPublicEndpoint`) | toggle | false | boolean | tooltip "By toggling this on you can allow users to submit to your whitelisted templates without having to fill a CAPTCHA. The form will still present the captcha to end users, but API end-point will allow submissions without CAPTCHA validation if a header `"Bypass-Captcha: true` is sent along. This option is insecure and can be leveraged to flood your instance with spam or malicious content." | `Collection.tsx:379-389`, `collectionSettingsTips.tsx:141-149` |
| Whitelisted templates (`allowedPublicTemplates`) | multi-select of all templates (label = name, value = `_id`) | stored array | server array of strings. The control reads `settings.allowedPublicTemplates` (loader value) as its value and calls `setValue` on change, not the form value | label "Whitelisted templates" + tooltip "If you wish to include Public Forms on your pages, you must white-list the template IDs for which Public Forms are expected." | `Collection.tsx:390-402`, `collectionSettingsTips.tsx:129-132` |
| Map provider (`tilesProvider`) | select | stored | server string | label "Map Provider"; options "Mapbox" (`mapbox`), "Google" (`google`) | `Collection.tsx:408-416` |
| Map API key (`mapApiKey`) | text | stored | client `pattern /^[a-zA-Z0-9._]+$/` (react-hook-form applies `pattern` only to non-empty values, ASSUMED, so an empty key is accepted); server regex `^[a-zA-Z0-9._]*$` (empty accepted) | label "Map API key" + tooltip "An API key is required to use Mapbox or Google Maps." No error text is rendered for a bad pattern; the field gets no `hasErrors` | `Collection.tsx:418-424`, `saveSettingsInput.ts:199-202` |
| Map layers (`mapLayers`) | multi-select, cannot be emptied | stored, or `['Streets']` when empty | client: empty selection sets error `custom` "Map layers cannot be empty" (message is not rendered as text, only `hasErrors` styling and focus); server `array(string).min(1)` | label "Map Layers" + tooltip "Here you can configure the map layers that will be available in the maps."; options "Dark", "Streets", "Satellite", "Hybrid" | `Collection.tsx:161-175,425-446`, `saveSettingsInput.ts:203` |
| Map starting point (`mapStartingPoint`) | `Geolocation`: map (370 px, click to place marker) + Latitude + Longitude number inputs with clear | server default `[{lon:6, lat:46}]` when none stored | lat clamped to -90..90, lon to -180..180; `onChange` only stores when `lat && lon` are both truthy, so a latitude or longitude of exactly 0 clears the point; server `array({label?, lat, lon})` | labels "Latitude", "Longitude" | `Collection.tsx:447-459`, `Geolocation.tsx:35-120`, `app/shared/geolocationCoordinates.ts:1-4`, `app/api/core/application/settings/settingsDefaults.ts:4-12` |

  Not in the UI although accepted by the schema or returned by the API: `mailerConfig` (JSON string passed to nodemailer; absent from every V2 form, default is local sendmail), `customCSS`/`customJS` (edited on Settings > Global CSS & JS), `custom`, `languages`, `filters`, `links`, `features`, `sync`, `project`, `__v` (`saveSettingsInput.ts:153-221`, `NodemailerEmailSender.ts:12-52`). Unused tooltip exports in `collectionSettingsTips.tsx`: `customSiteLogo`, `mapAxis`, `emails[0]`, `publicForm[0]`.

  Theming sidepanel ("Theme and branding", large, overlay, footer button "Done" which only closes; `Theming/ThemeSettingsSidepanel.tsx`):
  - Theme presets row (cards with light/dark accent previews): "Uwazi Design" (default), "Legacy Uwazi", "Custom pair" (`app/react/V2/theme/tokens.ts:374-406`; `ThemePresetSection.tsx`). Selecting a preset replaces `themeVars`; default/legacy also set `themeAssets.preset`.
  - "Live preview" with a Light/Dark segmented switch; amber banner "Accessibility checks need attention" listing failing WCAG AA ratios (Surface text, Secondary text, Primary action, Secondary button text, Secondary button border, Uwazi label, Theme preview label) (`ThemePreviewSection.tsx:19-118`).
  - Collapsible "Advanced colors": button "Import theme instance file" (JSON file; invalid shows error notification "Theme instance file invalid"; success "Theme colors imported"), toggle buttons "Simple mode" / "Full mode". Simple mode: 7 anchor colors (accent primary, accent supporting, accent emphasis, page background, surface background, text primary, border primary) with note "Adjust a few colors; secondary text and muted backgrounds update automatically." Full mode: 13 semantic colors (Primary action, Supporting accent, Emphasis / danger background, Page background, Surface background, Muted background, Success background, Warning background, Text primary/secondary/tertiary/muted, Border primary) plus a "Chrome header" group (Header bar background/hover/active/text/divider, Settings sidebar background, Settings navigation active background), each with "Reset" (`ThemeSelector.tsx`, `ThemeColorsSection.tsx`, `theme/tokens.ts:34-48`, `theme/themeChromeOverrides.ts:15-23`).
  - "Theme logotype" (site logo): two pickers, "Light Theme" and "Dark Theme", recommended "48x16 to 800x256 px", soft size rule (out-of-range is a warning, not blocked); modal title "Select site logo image"; empty hint key "Site logo no images hint".
  - "Theme favicon": Light/Dark pickers, "Select favicon image", recommended "16x16 to 512x512 px (square)", strict rule; empty hint key "Favicon no images hint" (`ThemeSettingsSidepanel.tsx:61-127`, `brandImageUploadRules.ts`).
  - Image picker modal (xxl): dropzone (accepts avif, bmp, gif, ico, jpg, jpeg, png, svg, webp; single file), upload progress "Uploading <name> N%", gallery "Select an existing image" (only images from Custom Uploads that satisfy the size rule), messages "Checking which images fit the requirements", "No uploaded images fit the requirements", size error "Image doesn't match the required size. Actual: WxH px. Expected: <range>"; footer "Cancel" (`CustomUploadImagePickerModal.tsx`, `GallerySection.tsx`, `customUploadImagePickerLib.ts:60-80`).
  - Upload from the picker happens immediately: `POST /api/files/upload/custom` (admin only; `app/api/customUploads/infrastructure/http/routes.ts:10-17`), toasts "Uploaded custom file" or "An error occurred" via `notifyBridge`, then the loader revalidates and the uploaded image is selected (if it passes the rule). This write is independent of the Save button; the file stays uploaded if the form is never saved (`useCustomUploadImagePickerLogic.tsx:100-157`).
  - On Save with `themeCustomization` on, `themeAssets.siteLogo.light` and `themeAssets.favicon.light` are copied into `site_logo` and `favicon` (`Collection.tsx:124-129`).
- **Actions**:

| Control | Label | Client behaviour | Server call and effect |
|---|---|---|---|
| Footer | "Save" | `handleSubmit(submit)`: drop `newNameGeneration` if falsy, copy theme light assets, re-invert `private`, strip `themeCustomization`, send the entire form (all loader fields except `links` and `custom`, including `languages`, `filters`, `features`, `customCSS`, `customJS`) | `POST /api/settings` (`SaveSettingsController`, `needsAuthorization()`): Zod strict parse (unknown keys fail with 422), then `SaveSettingsUseCase` in a transaction: reconciles menu and filter translations, `Object.assign` of every posted key onto stored settings (shallow merge), persists, emits `SettingsChangedEvent`; listener `BroadcastSettingsChanged` pushes the public projection to all clients on socket event `updateSettings`; if `newNameGeneration` just turned on, `TemplateFacade.applyNewNameGeneration(defaultLanguage)` rewrites template property names after the response path (`app/api/core/infrastructure/express/settings/SaveSettingsController.ts:6-13`, `SaveSettings.ts:19-34`, `SettingsService.ts:29-54`, `Settings.ts:137-143`, `BroadcastSettingsChanged.ts:18-29`). Response is the fresh settings payload. Activity log entry "Updated settings" (`activitylogParser.ts:20`). |
| Toggles / selects / inputs | (various) | `setValue(..., {shouldDirty:true})` or register | none until Save |
| Favicon / logo picker | "Choose" / "Change" / "Clear" | opens modal / clears value (`onChange('')`) | upload as above |
| Theme card | "Edit theme" | opens theming sidepanel | none |
| Theme sidepanel | "Done", X, overlay click | closes panel (changes live in form state) | none |
| Whitelisted templates / Map layers / Geolocation | (multi-select, map click, clear X) | `setValue` | none until Save |
| Tooltip icons | "?" | hover tooltip, placement right | none |

- **Confirmations**: none found on this page. The one-way "Non-latin characters support" switch has no confirm dialog; the warning is only in the tooltip.
- **Empty / loading / error / notification states**: Success notification "Settings updated" and settings atom merge (`setSettings(prev => mergeClientSettings(prev, response))`, which also syncs Redux through `syncReduxFromAtoms`). Error: "An error occurred" with `error.message` (legacy `FetchResponseError`, for a Zod 422 this is the request error message, not the field list) (`Collection.tsx:132-143`). `revalidator.revalidate()` runs after both outcomes. Required field: `hasErrors` red styling on Collection Name, no message text. Map layers: styling only. Map API key: no error text and no `hasErrors` binding. Uploads: see above. No empty-state copy. Loading: global loader only.
- **Save model**: single Save button for the whole page; per-field edits are held in react-hook-form (`mode: 'onSubmit'`). Exceptions that persist immediately: image uploads from the picker. No dirty guard and no "unsaved changes" prompt. After Save: atom update, Redux sync, socket broadcast to other sessions, revalidation (does not reset the form defaults). A full reload is suggested for favicon changes by the tooltip ("Reload the page to see your favicon in action").
- **V1 vs V2**: V1 Collection form removed. Left behind: `app/react/Settings/SettingsAPI.ts` (still used by the V2 wrapper `app/react/V2/api/settings/index.ts:10-33`), Redux `settings.collection` reducer and the unused thunk `saveSettings` (`app/react/Settings/actions/settingsActions.js`, `reducers/reducer.js`, no importers outside specs), kept in sync from `settingsAtom` by `app/react/V2/atoms/syncReduxFromAtoms.ts:24,63`. Legacy components (cookie popup, footer, Root JS injection, OCR button) still read Redux `settings.collection`.
- **Notes/gotchas**:
  - The save sends the whole settings document, including `languages`, `filters`, `features`, `customCSS`, `customJS` taken from the loader. If another tab changed those after the loader ran (for example Filters or Languages), this Save overwrites them with stale values (shallow `Object.assign`). ASSUMED real-world impact, mechanism VERIFIED. `links` and `custom` are excluded from the payload so Menu is safe.
  - "Public instance" is the inverse of stored `private`; the label reads as the opposite of the DB field.
  - Whitelisted templates and Map layers controls take their value from the loader (`settings.*`) rather than from form state, so after a failed save the control can show stale data.
  - Geolocation treats latitude 0 or longitude 0 as unset.
  - The OCR card and OCR toggle depend on `features.ocr.url` (infrastructure setting, not editable here).
  - `mailerConfig` has no UI. Emails use sendmail by default; custom SMTP needs a direct DB or API write (`NodemailerEmailSender.ts:12-52`, `shared/types/settingsType.ts:79`).
  - Settings changes broadcast over sockets; open tabs update their atom without reload (`app/react/App/sockets.js:82-85`).

---

### Menu
- **Route / file**: `/settings/navlinks`. Route `app/react/Routes.tsx:331-335`. Loader `menuConfigloader` and component `MenuConfig` in `app/react/V2/Routes/Settings/MenuConfig/MenuConfig.tsx:20-27,29-200`. Form `.../MenuConfig/components/MenuForm.tsx`. Columns `.../components/TableComponents.tsx`. Helpers `.../MenuConfig/shared.ts`. Loader call: `GET /api/settings/links` (`app/react/V2/api/settings/index.ts:35-45`).
- **Who can see it**: admin only on the client (`adminsOnlyRoute`, nav "Menu" `SettingsNavigation.tsx:36`). Server: `GET /api/settings/links` has no middleware (public, returns the menu links of the public projection); `POST /api/settings/links` uses `needsAuthorization()` (admin) (`settings/routes.ts:11-16`). No feature toggle.
- **Layout**: Header "Menu". Body: one `Table` titled "Menu" with checkbox column, drag handle column (dnd-kit), columns "Label" (title, rendered with `Translate context="Menu"`), "URL", and an unlabeled "Edit" button column. Groups appear as expandable rows with their links as sub-rows. Sticky footer has two states: with no selection, left "Add link" and "Add group", right green "Save" (disabled when nothing changed); with a selection, the footer turns highlighted (info tint) and shows red "Delete" and the text "Selected N of M" (`MenuConfig.tsx:131-173`). A sidepanel (medium, overlay) holds the form. The M count is `sum(group ? (subRows.length || 1) + 1 : 1)`, which counts an empty group as 2 (`MenuConfig.tsx:144-146`).
- **Fields**: Sidepanel title is an uppercase concatenation "NEW LINK", "EDIT LINK", "NEW GROUP", "EDIT GROUP" (translated as one string; `MenuConfig.tsx:176-182`). An info band at the top: "Using URLs" / "If it is an external URL, use a fully formed URL. Ie. http://www.uwazi.io." / "If it is an internal URL within this website, be sure to delete the first part (<origin>), leaving only a relative URL starting with a slash character. Ie. /some_url." (`MenuForm.tsx:163-192`).

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Title | text | "" | client `required: true`; server `z.string()` (no min, no uniqueness) | label "Title"; card title "Link" or "Group" | `MenuForm.tsx:204-210` |
| URL (links only) | text | "" | client `required: true`, no format check; server: `type=link` requires `url` ("Links of type link should have url"), `type=group` must not have a url | label "URL" | `:213-219`, `app/api/core/application/settings/menuItems.ts:30-66` |
| Group (links only) | select | current parent or "No Group" | none | label "Group"; first option "No Group"; other options are existing groups by title (translated in context Menu) | `:220-227,110-126` |
| Type | not editable; chosen by which add button was used (`link` / `group`) | n/a | server `enum('link','group')` | n/a | `MenuConfig.tsx:52-60` |

  Server schema (`menuItems.ts:7-28`): link `{id?, title, url?, localId?, sublinks?, type}`; sublink `{id?, title, type:'link', url, localId?}`; strict objects. Rule violations returned by the server: "Links of type link should have url", "Links of type group should not have url", "Links of type link should not have sublinks", "Links of type group should have sublinks" (422).
- **Actions**:

| Control | Label | Client behaviour | Server call and effect |
|---|---|---|---|
| Footer | "Add link" / "Add group" | opens sidepanel with an empty item | none |
| Row | "Edit" | opens sidepanel with the item and its parent group | none |
| Sidepanel footer | "Add" (new) or "Update" (existing, decided by `title` being non-empty) / "Cancel" | Add/Update applies the change to local state (`updateLinks`: new item goes to the end or into the chosen group; edit may move the link between groups or out to top level) and closes the panel | none (local state only) |
| Footer (with selection) | "Delete" | removes selected rows (and sub-rows of selected groups) from local state; no confirmation | none until Save |
| Row drag handle | (drag; keyboard sensor also enabled) | vertical drag only. A link can move between top level and groups (an empty group exposes a drop zone). A group cannot be dropped into another group (move ignored). `onSort` writes the new order to local state. | none until Save |
| Footer | "Save" (green, disabled when `isEqual(linkState, prevLinks)`) | `saveLinks(linkState.map(sanitizeIds))`: removes `rowId`, Mongo `_id`, temporary `tmp_` ids; groups send `sublinks` from `subRows` | `POST /api/settings/links` body = array (`SaveSettingsLinksController`): parse with `SaveMenuItemsInputSchema` (`{links}` strict + `refineMenuItems`), then the same `SaveSettingsUseCase` as Collection with `{links}` only: reconciles the "Menu" translation context (renamed titles update keys, removed titles delete keys, all current titles become values), assigns `id` to items without one (`assignMenuIds`), persists, broadcasts `updateSettings`. Response is the settings payload (`SaveSettingsLinksController.ts:6-13`, `SettingsTranslationService.ts:82-100`, `settingsTree.ts:33-48`). Activity log has no specific parser entry for this URL (`activitylogParser.ts` only has `POST/api/settings`), so it is logged generically (ASSUMED). |

- **Confirmations**: only the unsaved-changes navigation guard. Modal "Discard changes?" with body "You have unsaved changes. Do you want to continue?", buttons "Cancel" and "Discard changes" (and an X). Trigger: any in-app navigation away while the table differs from the loaded data (`useBlocker(!areEqual)`). "Discard changes" calls `blocker.proceed`. Browser tab close and reload are not intercepted (no `beforeunload`). "Cancel" and X only hide the modal and do not call `blocker.reset()`, so the router stays in the blocked state; behaviour of a second navigation attempt is not verified (ASSUMED risk) (`MenuConfig.tsx:43,99-103,195-197`, `ConfirmNavigationModal.tsx:11-40`). No confirmation on Delete.
- **Empty / loading / error / notification states**: Empty table: "NO DATA AVAILABLE" (default). Success notification "Updated" after save + revalidate. Error: "An error occurred" with `error.message`, and local state is kept. Loader error is ignored (`const [links] = await getLinks`), producing an empty table. Form errors: red `hasErrors` on empty Title/URL, no text. Save disabled while clean.
- **Save model**: batch Save button for the whole tree. All edits (add, edit, delete, reorder) are local until Save. Dirty guard via `useBlocker`. After save: `setSettings(mergeClientSettings(...))`, `revalidate()` (the effect on `links` resets `prevLinks` and `linkState`, which re-disables Save), then toast. Because of the ordering, the toast appears after revalidate completes (`MenuConfig.tsx:62-77,105-108`).
- **V1 vs V2**: V1 menu settings UI removed. Remaining legacy: `SettingsAPI` helper and Redux settings (see Collection); the public navbar still reads the links from settings (Redux/atom). Navbar rendering is outside this page.
- **Notes/gotchas**:
  - Groups are one level deep; links inside a group cannot hold sublinks.
  - Link titles are translation keys in the "Menu" context; renaming a link renames the translation key for all languages (existing translations for the old key are carried over via `keyChanges`).
  - The Group dropdown lists groups as they were when the sidepanel opened (the sidepanel unmounts when closed, so it is rebuilt on each open).
  - Save only enables on a deep difference; reordering back to the original order disables it again.
  - New items get temporary ids `tmp_...` until the server assigns persistent `id`s.
  - `GET /api/settings/links` is public by design (the navbar needs it).

---

## Part 2: Pages, Data visualizations, Customisation, Uploads, Preserve, Import CSV, Activity log

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

---

## Part 3: Templates list, Template editor, Filters

Reference repo: huridocs/uwazi, branch `production`, v1.229.224 (shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`). All paths below are repo-relative. Statements are VERIFIED (read in code) unless marked ASSUMED.

## Conventions and where the code lives

- Frontend (V2, Jotai/react-router data routes): `app/react/V2/Routes/Settings/Templates/`, `app/react/V2/Routes/Settings/Filters/`.
- Backend template code is NOT under `app/api/templates` (does not exist). It is in `app/api/core/`:
  - Routes: `app/api/core/infrastructure/express/template/routes.ts:9-21`.
  - Controllers: `.../express/template/{GetTemplatesController,TemplateMutationController,SetTemplateAsDefaultController/,DeleteTemplateController/}`.
  - Facade: `app/api/core/infrastructure/facades/TemplateFacade.ts`.
  - Use cases: `app/api/core/application/{CreateTemplate,UpdateTemplate,DeleteTemplate,SetTemplateAsDefault,TemplatePostProcessService,TemplateUpdateDenormalizeEntitiesBatch,TemplateDTOs}.ts`.
  - Domain: `app/api/core/domain/template/*` (properties, `Template.ts`, `TemplateDiff.ts`, `errors.ts`).
  - Persistence: `app/api/core/infrastructure/mongodb/template/*` (default) or `postgresql/template/*` when tenant flag `postgresCore` is on (`app/api/core/infrastructure/factories/TemplatesDAOFactory.ts:11`).
- Settings code: `app/api/core/infrastructure/express/settings/routes.ts`, `app/api/core/application/{SaveSettings.ts,settings/*}`, `app/api/core/domain/settings/*`.
- Shared types: `app/shared/types/templateType.d.ts`, `app/shared/types/templateSchema.ts` (AJV schema, only used to emit types: no import of `templateSchema` outside its own file, grep), `app/shared/contracts/Template.ts`, `app/shared/types/settingsType.ts`.
- HTTP error mapping (affects all "server error" copy below): `app/api/utils/handleError.js:116-127,142-144`. Zod error and core `ValidationError` become HTTP 422 (the controller wraps them as AJV errors, `app/api/common.v2/infrastructure/AbstractController.ts:24-39`). Any other `DomainError` becomes HTTP 400. The client shows the server message as the toast detail (`error.detail ?? error.message`).
- Auth middleware: `app/api/auth/authMiddleware.ts:13-20`. Default roles `['admin']`; failure returns HTTP 401 `{error:'Unauthorized', message:'Unauthorized'}`.
- Client route guard: `app/react/ProtectedRoute.tsx:6-33`. `adminsOnlyRoute` allows role `admin` only; otherwise `<Navigate to="/login" replace/>`. Reads the Redux store user, so it is a client check only.
- Settings shell: `app/react/Routes.tsx:324` (`loggedInUsersRoute(<Settings/>)`, any logged-in user). Each child route is wrapped in `adminsOnlyRoute`.
- Nav entries: Templates `app/react/V2/Routes/Settings/SettingsNavigation.tsx:55` (inside `NeedAuthorization roles={['admin']}`, lines 53-64); Filters `SettingsNavigation.tsx:41` (inside `NeedAuthorization roles={['admin']}`, lines 36-43). Labels: "Templates", "Filters".

---

### Templates list

- **Route / file**:
  - `/settings/templates` (language-prefixed in practice, `/:lang/settings/templates`). Route `app/react/Routes.tsx:377-383`, `element={adminsOnlyRoute(<Templates/>)}`, `loader={createTemplatesLoader(services)(headers)}`.
  - Loader: `app/react/V2/Routes/Settings/Templates/createTemplatesLoader.ts:14-56`. Component: `.../Templates/Templates.tsx:14-114`. Columns: `.../Templates/components/TemplatesTableComponents.tsx:103-157`. Delete modal: `.../components/DeleteTemplatesConfirmationModal.tsx`.
- **Who can see it**:
  - Client: admin only (`Routes.tsx:379`). Nav link hidden for non-admins.
  - Server: `GET /api/templates` has NO auth middleware (`app/api/core/infrastructure/express/template/routes.ts:10`), so any caller can read all templates. `GET /api/v2/entities/count_by_template` (`app/api/entities.v2/routes/index.ts:7-28`) has no `needsAuthorization` either (it only validates `templateId` as a 24-hex string). `POST /api/templates`, `POST /api/templates/setasdefault`, `DELETE /api/templates` use `needsAuthorization()` = admin (`routes.ts:13-20`).
  - No feature toggle. The column "Synced Template" appears only if any template has `synced: true` (`TemplatesTableComponents.tsx:122`).
- **Layout** (top to bottom): `SettingsContent` (`Templates.tsx:69`); header title "Templates" (`:70`, no breadcrumb); body = one `Table` (`:72-81`, class `bg-paper`, selection checkboxes on, default sort `name` asc, no DnD); footer (`:83-104`).
  - Table columns, in order: checkbox | Name | Translation | [Synced Template] | Entities | Set as default | Action.
- **Fields** (columns; this page has no inputs):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Row checkbox | tanstack row selection | unchecked | Disabled when `disableRowSelection` is set. Tooltip shows the joined reasons. | Reasons (joined with a space): "A default template cannot be deleted." / "This template is in use by existing entities and cannot be deleted." / "Synced templates cannot be deleted." | `createTemplatesLoader.ts:27-46`, `Table/RowSelectComponents.tsx:19-41` |
| Name | link to `/settings/templates/edit/:id` + blue pill "Default" when `default` | sorted asc | Synced templates render plain text (cursor-not-allowed), no link | Header "Name" | `TemplatesTableComponents.tsx:13-31,79` |
| Translation | `Translate context={_id}` of the template name (current UI language) | sortable | none | Header "Translation" | `:33-35,80,114-119` |
| Synced Template | text "Synced template" with tooltip, only when any synced template exists | hidden | none | Tooltip: "The source of this template is a sync." / "All editing options will be disabled." Header "Synced Template" | `:85-101,122-131` |
| Entities | count, abbreviated `1.2k`, `3M` (`formatNumberShort`) | 0 | Count = distinct `sharedId` of entities with that template (`app/api/core/infrastructure/mongodb/entity/MongoEntitiesDAO.ts:313-323`), sortable | Header "Entities" | `:37-49,81,133-140` |
| Set as default | icon button (star), `variant` primary if default else secondary, disabled if `default` or `synced` | n/a | none | sr-only "Set as default"; header "Set as default" | `:51-69,82,141-147` |
| Action | `Edit` ghost button inside a link; disabled if `synced` | n/a | none | "Edit"; header "Action" | `:71-77,83,148-154` |

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add template (footer, shown only when nothing is selected) | Link to `/settings/templates/new` (`Templates.tsx:85-91`) | none |
| Edit (row) / Name link | Link to `/settings/templates/edit/:_id` | none |
| Set as default (star) | `templatesService.setDefault(_id)` then toast then `revalidator.revalidate()` (`Templates.tsx:24-39`). | `POST /api/templates/setasdefault` body `{_id}` (`app/react/V2/api/templates/index.ts:75-94`). Handler `SetTemplateAsDefaultController.ts:5-19` then `SetTemplateAsDefaultUseCase` (`app/api/core/application/SetTemplateAsDefault.ts:18-34`): in one transaction, `Template.setAsDefault` flips `isDefault` on the new and old default and updates both. Throws `DefaultTemplateConflictError` (400) if already default (`Template.ts:202-218`). Emits socket `templateChange` for new and old default. Activity log entry "Set default template" (`activitylogParser.ts:132`). |
| Delete (footer, shown when 1+ rows selected) | Opens confirmation modal (`Templates.tsx:92-101`). On confirm: `templatesService.delete(ids)` runs one `DELETE` per id in parallel via `Promise.all`; on the first error it returns that error and does not roll back deletions that already succeeded (`app/react/V2/services/http/HttpTemplatesService.ts:14-21`). | `DELETE /api/templates?_id=<id>` (`V2/api/templates/index.ts:59-73`). `DeleteTemplateController.ts:5-15` then `TemplateFacade.delete` then `DeleteTemplateUseCase` (`app/api/core/application/DeleteTemplate.ts:27-95`): see Notes. Emits socket `templateDelete`. Activity log "Deleted template". |

- **Confirmations**: Delete modal (`DeleteTemplatesConfirmationModal.tsx:22-37`, danger style). Header "Delete". Warning "Do you want to delete the following items?". Body: bulleted list of template names. Buttons "Delete" / "Cancel". Result: the modal closes before the request (`Templates.tsx:46`). Success clears the selection and toasts "Template(s) deleted successfully." then revalidates.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (`Components/UI/Table/DefaultNoDataMessage.tsx`).
  - Footer when rows are selected: `Selected {n} of {total}` (`Templates.tsx:97-100`).
  - Toasts (via `notify`): error title "An error occurred" with detail `error.detail ?? error.message`; success "Default template set successfully." and "Template(s) deleted successfully.".
  - Loader errors are thrown as route errors (`apiErrorToRequestError`, `createTemplatesLoader.ts:19,25`).
  - Loading: none specific (react-router loader).
- **Save model**: no form. Each action is an immediate request followed by `revalidate()`. No dirty guard.
- **V1 vs V2**: V1 removed. `app/react/Templates/` now holds only `components/ViolatedArticlesNestedProperties.js` and `utils/getFieldLabel.js` (used by Library/metadata rendering), and `app/react/Settings/` holds only the settings API/reducer and the relationships-v2 migration dashboard. No Redux templates list or V1 `TemplateCreator` remains.
- **Notes/gotchas**:
  - Row disabling is client-side only. The server enforces the same two rules (default, in use) in `DeleteTemplateUseCase` (`DeleteTemplate.ts:33-42`) with messages "The default template cannot be deleted. Please set a different template as the default before deleting this one." (`errors.ts:261-268`, HTTP 400) and "Cannot delete a template that has existing entities. Please remove the related entities first." (`errors.ts:270-277`, HTTP 400). Synced templates are NOT protected on the server (no `synced` check in the delete or update path: grep of `app/api/core` for `synced` finds nothing); only the UI blocks them.
  - Entity counts are fetched with one request per template (`V2/api/templates/index.ts:104-134`), so the loader makes N+1 requests.
  - Delete of an unknown id is a no-op that returns `{templateId}` (`DeleteTemplate.ts:28-31`).
  - There is no duplicate/clone action.

---

### Template editor

- **Route / file**:
  - `/settings/templates/new` and `/settings/templates/edit/:templateId` (`app/react/Routes.tsx:384-393`, both `adminsOnlyRoute(<TemplatesEditor/>)`, loader `createTemplatesEditorLoader(services)(headers)`).
  - Loader `app/react/V2/Routes/Settings/Templates/createTemplatesEditorLoader.ts:18-49`. Component `.../Templates/TemplatesEditor.tsx:36-406`. Helpers `.../Templates/helpers.ts`. Panel `.../components/ConfigPropertyPanel.tsx`. Property fields `.../components/fields/*`. Metadata header `.../components/TemplateMetadata.tsx`. Table cells `.../components/TemplateEditorTableComponents.tsx`. Footer `.../components/TemplatesEditorFooter.tsx`. Modals `.../components/{AddThesaurusModal,AddRelationshipTypeModal}.tsx`, `MatchingPropertiesTable.tsx`.
- **Who can see it**:
  - Client: admin only. Server: `POST /api/templates` admin (`routes.ts:13`); `GET /api/templates` open.
  - The property type "Violated articles" (`nested`) is offered only when `settings.project === 'cejil'` (`fields/PropertyTypeField.tsx:36-38`). The server enforces it: `NestedPropertyCreatorService` throws `NestedPropertyNotAvailableError` otherwise (`app/api/core/application/propertyCreatorService/NestedPropertyCreatorService.ts:14-19`, `errors.ts:246-253`, HTTP 400).
  - The loader also calls `pagesAPI.get` (legacy pages API) for the entity-view page list (`createTemplatesEditorLoader.ts:22-27`).
- **Layout** (top to bottom):
  1. Header (`SettingsContent.Header`, `TemplatesEditor.tsx:294-300`): breadcrumb "Templates" (link to `/settings/templates`) then the template name (empty on new). While `template.processing.active` it also shows a progress bar: "Updating template properties across {entityCount} entities ..." with a percentage.
  2. Body: one `Table` (DnD on, selection on). The table `header` slot holds `TemplateMetadata`: `[color swatch] [Template name input] [Display entity view from page checkbox + page Select]` (`TemplateMetadata.tsx:51-101`). Table columns: drag handle | checkbox | Property | Type | Options | Action.
     Rows: the three common properties first (lock icon, not draggable, not selectable), then user properties.
  3. Footer (`TemplatesEditorFooter.tsx:24-59`). Left: with no selection `Add property` (primary), `Add thesaurus`, `Add relationship type` (secondary); with a selection `Remove` (danger) and `Selected {n}`. Right: `Cancel` (link to `/settings/templates`) and `Save` (success variant).
  4. Overlays: `ConfigPropertyPanel` (right sidepanel, large, with overlay), `AddThesaurusModal`, `AddRelationshipTypeModal`, `ConfirmNavigationModal`, two `ConfirmationModal`s.
- **Fields**:

Template-level:

| Field | Type/control | Default | Validation | Help text / copy | file:line |
|---|---|---|---|---|---|
| Color | `ColorPicker` with 15 preset swatches; also "Pick a color" custom input and "Manually set a color" (`ColorPicker.tsx:94,131-144`). sr-only "Template color" | New: random preset from `templateColors` (`defaultTemplateColors.ts:1-22`: `#C03B22 #628ccf #ff8282 #ff8a4c #faca15 #16bdca #31c48d #9eb0fd #f17eb8 #ac94fa #9ca3af #2b8a3e #ffb86b #6a5acd #00b894`) | Client: none (`colorError` is never set true; only cleared, `TemplatesEditor.tsx:52,322`). Server: any string (`z.string().optional()`, `TemplateDTOs.ts:67`); on update an empty value keeps the old color (`props.color \|\| this.color`, `Template.ts:273`) | none | `TemplateMetadata.tsx:53-59`, `createTemplatesEditorLoader.ts:29` |
| Template name | `InputField`, placeholder "Template name", clear (x) action when non-empty | `''` | Client on Save: required and unique case-insensitively against `templatesAtom` excluding self (`TemplatesEditor.tsx:233-242`). Error text "Template name already exists" shown only when name is non-empty and duplicate; an empty name shows the error state with no message (`TemplateMetadata.tsx:68-71`). Server: `z.string({message:'Template name is required'})` (no min length, `TemplateDTOs.ts:66`). Uniqueness only on create and case-sensitive exact match (`CreateTemplate.ts:59-62`, `MongoTemplatesDAO.ts:166-175`); error `TemplateWithDuplicatedNameOnTheSystemError` "The following Template has a used Name on the system. Name = {name}" (HTTP 400, `errors.ts:166-173`). Update does not check uniqueness server-side. | none | `TemplateMetadata.tsx:60-72` |
| Display entity view from page (checkbox) | `Checkbox`, label "Display entity view from page". Unchecking clears `entityViewPage` | checked iff `entityViewPage` set | none | When no page has `entityView`: text "There are no pages enabled for entity view" replaces both controls (`TemplateMetadata.tsx:74-78`) | `:79-99` |
| Entity view page | `Select`, first option "Select page" (value `''`, untranslated literal), then pages where `page.entityView` is true, labelled by title; disabled unless checkbox is on. Value is the page `sharedId` | `''` | Server validates only on create: page must exist ("The selected page does not exist") and be entity-view enabled ("The selected page is not enabled for entity view"), both AJV errors with `instancePath '.templates'` (`app/api/pages.v2/v1_layer/LegacyPageService.ts:14-46`, called from `CreateTemplate.ts:64`). Not checked on update. | none | `TemplateMetadata.tsx:88-97` |
| Default | no control here (set from the list) | false | Client and server strip `default` from create/update bodies (`TemplateFacade.ts:34-38,59-61`) | n/a | |
| Show in cards / common properties | There is no template-level "Show in cards". `showInCard` is a per-property flag. Common properties are rows in the table (below) | | | | |

Common properties (always present: `title`, `creationDate`, `editDate`; created as defaults by `emptyTemplate`, `helpers.ts:8-37`):

| Property | Label default | Editable in panel | Server rules | file:line |
|---|---|---|---|---|
| Title | "Title" | Label (editable), Priority sorting, "Generated ID" (`generatedId`) | `TitleProperty` requires type `text` and name `title` (`TitleProperty.ts:24-32`); persists `prioritySorting`, `generatedId` | `ConfigPropertyPanel.tsx:274-275`, `GeneratedIdField.tsx` |
| Date added (`creationDate`) | "Date added" | Priority sorting only; Label input is disabled (`LabelField.tsx:28`) | type `date`, name `creationDate` (`CreationDateProperty.ts:27-35`) | |
| Date modified (`editDate`) | "Date modified" | Priority sorting only; Label disabled | type `date`, name `editDate` (`ModifiedDateProperty.ts:21-29`) | |

- Common-property rows cannot be dragged (`disableRowDnD`) or removed (`disableRowSelection` tooltip "This property can not be deleted") (`helpers.ts:78-84`). Dropping onto them is ignored (`Table.tsx:215-217`), so custom properties always sit below them.
- Server requires all three names to be present, else `TemplateWithMissingCommonProperty` "Template has the missing Property. Type = {name}" (`app/api/core/domain/template/templateValidator/TemplateWithMissingCommonPropertyValidator.ts`, `errors.ts:175-182`).
- Common properties persist only `type,label,name,isCommonProperty,noLabel,required,showInCard` plus `prioritySorting` (all three) and `generatedId` (title). `ExpressTemplateMapper.ts:20-48`, `MongoTemplateMapper.ts:36-65`.
- The server's common-property DTO strips `noLabel`, `required`, `showInCard` (`TemplateDTOs.ts:54-62` does not declare them), so they always persist as false for common properties.

Property panel (`ConfigPropertyPanel.tsx`, title "NEW PROPERTY" or "EDIT PROPERTY", uppercase; footer buttons "Cancel" and "Add property" (new) / "Save" (edit)):

| Field | Type/control | Default | Validation | Help text / label copy | file:line |
|---|---|---|---|---|---|
| Property type | `Select` id `property-type`, required. On edit it is replaced by a read-only box with icon and the translated type name | `text` | `required` | Label "Property type *". Options (label = value): Text=text, Rich text=markdown, Numeric=numeric, Date=date, Multiple dates=multidate, Date range=daterange, Multiple date ranges=multidaterange, Select=select, Multiple select=multiselect, Relationship=relationship, Link=link, Image=image, Preview=preview, Media=media, Geolocation=geolocation, Generated ID=generatedid; plus "Violated articles"=nested when `settings.project==='cejil'` | `fields/PropertyTypeField.tsx:16-38`, `ConfigPropertyPanel.tsx:222-243` |
| Label | `InputField` id `property-label`, placeholder "Text" | On type pick (new property): the raw type key capitalised, e.g. "Text", "Markdown", "Multidate", "Daterange", "Generatedid" (`ConfigPropertyPanel.tsx:128`). Panel starts as "Text" (`:41`). | Client: required ("This field is required"); unique inside this template's custom properties, case/trim-insensitive, excluding the edited property ("This label already exists in this template") (`fields/LabelField.tsx:36-50`). Not compared with common property labels. Server: `z.string()`; the property `name` is derived from the label (see Server validation), so a label that maps to an existing name fails there. | Label "Label *". Disabled for common date properties. | `LabelField.tsx` |
| Style (image, preview, media only) | `RadioSelect` horizontal: "Fill" (`cover`) / "Fit" (`contain`) | `cover` | Server: only `cover`/`contain`, else `InvalidStyleTypeError` "The following style type is not valid for Image Property. Type = {x}" (`AbstractImageProperty.ts:27-31`, `errors.ts:83-90`) | Legend "Style". Fill tooltip: "Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur." Fit tooltip: "Will show the entire media inside the container." | `fields/StyleField.tsx`, `ConfigPropertyPanel.tsx:250` |
| Thesaurus (select, multiselect only) | `Select` id `property-thesaurus`, required; options = thesauri whose `type !== 'template'`, sorted by translated label, first option "Select..." (`''`) | `''` | Client: `required`. Server: empty `content` throws `FieldIsRequiredError` "The following field is required. Field = content" (`select/AbstractSelectProperty.ts:23-27`); unknown id throws `SelectPropertyWithInvalidThesaurusError` "The following Thesaurus does not exist. Thesaurus Id = {id}" (`SelectPropertyCreatorService.ts:26-30`) | Label "Thesaurus *" | `fields/ThesaurusField.tsx` |
| Relationship type (relationship only) | `Select` id `property-relation-type`, required, options = relationship types sorted by translated label, first "Select..." | `''` | Client `required`. Server: `typesExist([relationType])` else `RelationshipTypeDoesNotExistError` "The Relationship Type with Id "{id}" was not found." (`RelationshipPropertyCreatorService.ts:23-29`) | Label "Relationship type *" | `fields/RelationshipFields.tsx:82-100` |
| Entities (relationship only) | `Select` id `property-entity`; options = every template except the one being edited (`template._id !== templateId`), label truncated at 30 chars as `name` or `name (translated name)`; first option "Any entity" (`''`) | `''` (any entity) | `required:false`. No server check that the template exists for `content`. | Label "Entities" | `RelationshipFields.tsx:38-58,102-119` |
| Inherit property (relationship only, shown only when a specific template is chosen) | `Select` id `property-inherit`; options = that template's custom properties (`properties`, not common ones) labelled by translated label, first "Select..."; stores `{property: <propertyId>, type}`. Changing "Entities" resets it to undefined (`RelationshipFields.tsx:22-24`) | none | Server: if `content` and `inherit` are set, the target property must exist in the target template (`RelationshipTargetPropertyNotFoundError` "The provided Target Property with id "{id}" was not found on Template with id "{id}"") and its type must equal `inherit.type` (`RelationshipTargetTypeMismatchError`) (`RelationshipPropertyCreatorService.ts:31-47`). The stored `inherit` is dropped unless `inherit.property` is set (`V1RelationshipProperty.ts:88-90`). | Label "Inherit property" | `RelationshipFields.tsx:121-144` |
| Hide label | `Checkbox` `noLabel` (not for common properties) | false | none | Tooltip "This property will be shown without the label" | `fields/HideLabelField.tsx` |
| Required property | `Checkbox` `required` (not common) | false | Server: enforced when saving entities (e.g. `V1RelationshipProperty.ts:141`) | Tooltip "You won't be able to save an entity if this property is empty." | `fields/RequiredField.tsx` |
| Show in cards | `Checkbox` `showInCard` (not common) | false | none | Tooltip "This property will appear in the library cards as part of the basic info." | `fields/ShowInCardsField.tsx` |
| Full width (image, preview, media) | `Checkbox` `fullWidth` | false | none | Tooltip "This property will be shown using all the width available." | `fields/FullWidthField.tsx` |
| Use as filter | `Checkbox` `filter`, shown for types in `filterableTypes` (see matrix), not common | false | none | Tooltip "This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering." | `fields/FilterField.tsx`, `ConfigPropertyPanel.tsx:56-69,261-273` |
| Default filter | `Checkbox` `defaultfilter`, shown only when `filter` is on | false | Unchecking `filter` forces `defaultfilter` and `prioritySorting` to false (`ConfigPropertyPanel.tsx:145-150`) | Tooltip "This property will be the default filter in the library for this template." | `fields/DefaultFilterField.tsx` |
| Priority sorting | `Checkbox` `prioritySorting`. Custom properties: only when `filter` is on and type is text, numeric, select or date (`:71`). Common properties: always. | false | none | Tooltip "Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting." | `fields/PrioritySortingField.tsx` |
| Generated ID (title only) | `Checkbox` `generatedId` | false | none | Tooltip "A generated ID will be the default title." | `fields/GeneratedIdField.tsx`, `ConfigPropertyPanel.tsx:275` |
| Same-label table | read-only table "Template / Type / [Thesauri] or [Relation type, Entities, Inherit type]" for properties with the same label in other templates; mismatching cells are red | n/a | See "Server validation" and Notes | Heading "Properties from other templates in the collection using the same label."; cells "No type", "Any entity", "(this template)" | `MatchingPropertiesTable.tsx`, `ConfigPropertyPanel.tsx:278-295` |

No UI exists for: per-property full-text search relevance, "searchable/include in search", `nestedProperties`, `sortable`, `query`, `denormalizedProperty`, `targetTemplates`. None found for "search relevance". `sortable` and the relationship-v2 fields are accepted by the DTO (`TemplateDTOs.ts:24-52`) but never set by this editor.

Options column pills (read-only summary in the table, `TemplateEditorTableComponents.tsx:82-151`): "Show in cards", "No label", "Use as filter", "Priority sorting", "Required", "Default filter", "Generated ID", "Full width", "Fill", "Fit", then the relationship type name and the thesaurus/entity template name.

#### Property-type matrix

"Yes" = control is shown. All types always get Label. Non-common types always get Hide label, Required, Show in cards. Source: `ConfigPropertyPanel.tsx:56-72,250-275`; "Server persists" from `ExpressTemplateMapper.ts:51-93`.

| Type (UI label) | Style | Full width | Thesaurus | Relationship type + Entities + Inherit | Use as filter | Default filter (needs filter) | Priority sorting (needs filter) | Server class / filter fields persisted |
|---|---|---|---|---|---|---|---|---|
| text (Text) | | | | | Yes | Yes | Yes | `TextProperty`, Filterable; also persists `generatedId` (no UI except Title) |
| markdown (Rich text) | | | | | Yes | Yes | No | `MarkdownProperty`, Filterable |
| numeric (Numeric) | | | | | Yes | Yes | Yes | `NumericProperty`, Filterable |
| date (Date) | | | | | Yes | Yes | Yes | `DateProperty`, Filterable |
| multidate (Multiple dates) | | | | | Yes | Yes | No | Filterable |
| daterange (Date range) | | | | | Yes | Yes | No | Filterable |
| multidaterange (Multiple date ranges) | | | | | Yes | Yes | No | Filterable |
| select (Select) | | | Yes | | Yes | Yes | Yes | `SelectProperty`, Filterable + `content` |
| multiselect (Multiple select) | | | Yes | | Yes | Yes | No | `MultiSelectProperty`, Filterable + `content` |
| relationship (Relationship) | | | | Yes | Yes | Yes | No | `V1RelationshipProperty`, Filterable + `content`, `relationType`, `inherit` |
| link (Link) | | | | | No | No | No | `LinkProperty`, plain `Property` (no filter fields persisted) |
| image (Image) | Yes | Yes | | | No | No | No | `ImageProperty`, `AbstractImageProperty` (`style`, `fullWidth`) |
| preview (Preview) | Yes | Yes | | | No | No | No | `PreviewProperty`, AbstractImage |
| media (Media) | Yes | Yes | | | No | No | No | `MediaProperty`, AbstractImage |
| geolocation (Geolocation) | | | | | No | No | No | `GeolocationProperty`, plain `Property` |
| generatedid (Generated ID) | | | | | Yes | Yes | No | `GenerateIdProperty`, Filterable |
| nested (Violated articles, project `cejil`) | | | | | Yes | Yes | No | `NestedProperty`, Filterable + `nestedProperties` (no UI) |
| common: title | | | | | n/a | n/a | Yes (always) | `TitleProperty`: + Generated ID checkbox |
| common: creationDate, editDate | | | | | n/a | n/a | Yes (always) | `CreationDateProperty`, `ModifiedDateProperty` |

Defaults for a new property: `type text, label "Text", noLabel/required/showInCard/filter/defaultfilter/prioritySorting/fullWidth/generatedId false, style "cover", content/relationType/inherit undefined` (`ConfigPropertyPanel.tsx:39-54`). Server-side defaults are all false and style `cover` (`Property.ts:65-67`, `FilterableProperty.ts:19-21`, `AbstractImageProperty.ts:21-22`).

#### Cross-template compatibility (type-change rules)

- The type of an existing property cannot be changed in the UI (read-only box, `ConfigPropertyPanel.tsx:222-240`). Server: same `_id` with another type throws `PropertyTypeChangeError` "Can't change property types." (HTTP 400, `Property.ts:104-107`, `errors.ts:285-289`; reached through `selectUpdatedProperties` in `TemplateTranslationService.updateTemplateTranslation`, `TemplateTranslationService.ts:46-48`).
- Name collisions across templates (server, by derived `name` not label): `AbstractPropertyCreatorService.validate` (`AbstractPropertyCreatorService.ts:24-28`) loads other templates' custom properties with the same name (`MongoTemplatesDataSource.ts:300-312`) and calls `ensurePropertyIsConsistent` (`Property.ts:98-102`):
  - Types must be equal or compatible: text/markdown, date/multidate, daterange/multidaterange, select/multiselect (`compatibleTypes` in each class). Otherwise `PropertyTypeMismatchError` "Property with the name "{name}" must have type "{t1}", but type "{t2}" was provided." (`errors.ts:128-135`).
  - select/multiselect must share the thesaurus: `PropertyThesaurusMismatchError` "Property with the name "{name}" has a thesaurus mismatch. It must be linked to {id} thesaurus, but a link to {id} thesaurus was provided." (`AbstractSelectProperty.ts:33-39`).
  - relationship: if the existing one inherits, the new one must inherit the same type: `PropertyInheritedTypeMismatchError` (`V1RelationshipProperty.ts:117-123`).
- Client check is stricter and keyed on the label (case/trim-insensitive), against `templatesAtom` custom properties (`validateMatchingProperties`, `ConfigPropertyPanel.tsx:153-191`):
  - type must be exactly equal (no compatibility pairs);
  - select/multiselect: `content` must match;
  - relationship: `content`, `relationType` and `inherit` (property and type) must all match.
  - On mismatch the panel's submit button (`Add property`/`Save`) is disabled (`:302`) and no error text is shown: the only cue is the red cells in the same-label table.
- Reserved names: no list. The only server-side reserved name in practice is `title` (the label "Title" yields name `title`, which collides with the common property: `TemplateWithDuplicatedPropertyError`, `templateValidator/TemplateWithDuplicatedPropertyValidator.ts`, checked over `allProperties`). `creationDate`/`editDate` are not reachable from a label because names are lower-cased (`propertyNameGeneration.ts:5,15`). ASSUMED consequence of reading the code; not run.

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add property (footer) | Opens panel in new mode (`TemplatesEditor.tsx:338`). Panel submit appends `{...config, rowId}` to `properties` (`:230`). Local state only. | none until Save |
| Edit (row button) / click the Property label | Opens panel with the row (`:263-266`, `TemplateEditorTableComponents.tsx:22-64`). Submit merges into the row. | none until Save |
| Remove (footer, with selection) | Removes the selected custom properties from local state, no confirmation (`:259-261`). | On Save, the missing properties count as deleted (see Notes) |
| Drag row | `@dnd-kit` vertical drag handle; `handleTableChange` splits rows back into common/custom by `isCommonProperty` (`:163-172`). Order = array order in `properties`. | Persisted on Save as array order |
| Add thesaurus | Modal (below). | `POST /api/thesauris` `{name, values: []}` (`V2/api/thesauri/index.ts:50`) via `AddThesaurusModal.tsx:30-41`. Adds to `thesauriAtom`. |
| Add relationship type | Modal (below). | `POST /api/relationtypes` `{name}` via `useRelationshipTypeMutations.create` (`V2/services/useRelationshipTypeMutations.ts:22-40`). Adds to `relationshipTypesAtom`. |
| Cancel (footer) | Link to `/settings/templates` (blocked by the dirty guard when changed) | none |
| Save | See Save model. Disabled while no pending changes or while saving (`:339`). | `POST /api/templates` (`V2/api/templates/index.ts:40-57`). Handler `TemplateMutationController.ts:9-29`: no `_id` then `TemplateFacade.create`; with `_id` then `TemplateFacade.update`. Emits socket `templateChange` with the saved template. HTTP 409 when Elasticsearch reports a mapping error (`:23-25`). Activity log "Created template" (create). |

Modals:
- Add thesaurus (`AddThesaurusModal.tsx`): title "Add thesaurus"; field "Name", placeholder "Thesaurus name"; error "Thesaurus name already exists" (case-insensitive match against loaded thesauri after `sanitizeThesaurusName`); buttons "Cancel", "Save" (disabled while saving or sanitised name empty); success toast "Thesaurus created successfully."; failure goes to `handleUnexpectedError(error, 'Error creating thesaurus')`. The modal closes in `finally`, including on a duplicate-name early return? No: the duplicate path returns before `finally` (`:48-51`), so the modal stays open there.
- Add relationship type (`AddRelationshipTypeModal.tsx`): title "Add relationship type"; field "Name", placeholder "Relationship type name"; error "Relationship type name already exists"; buttons "Cancel", "Save" (disabled when trimmed name is empty or saving); success toast "Relationship type created successfully."; failure toast "An error occurred" + detail.

- **Confirmations**:

| Trigger | Copy | Result |
|---|---|---|
| Navigate away with unsaved changes (`ConfirmNavigationModal`, `Components/UI/ConfirmNavigationModal.tsx`) | Header "Discard changes?"; body "You have unsaved changes. Do you want to continue?"; buttons "Cancel", "Discard changes" | Cancel stays; Discard proceeds with navigation (`blocker.proceed`) |
| Save on an existing template with more than 3000 entities (`ENTITY_COUNT_THRESHOLD = 3000`, `TemplatesEditor.tsx:61,244-249`), every save, not only property changes | Header "Lengthy reindex process"; body "The template has changed and the associated entities will be re-indexed, this process may take several minutes, do you want to continue?" (translation key "Template with a long number of entities"); buttons "Continue", "Cancel"; danger style (`helpers.ts:70-75`) | Continue runs `handleSave(true)` |
| Server returns HTTP 409 (Elasticsearch mapping conflict) | Header "Template conflict"; body "A reindex of your collection is necessary. The reason may vary -- from certain changes made to a template's property to new fields that need to be populated across entities. This process will not negatively affect the data in your collection. It can last a few minutes and some parts of your collection might take some time to reappear in the Library, but this is temporary. Do you want to continue?" (translation key "Mapping conflict error"); buttons "Continue", "Cancel"; danger style (`helpers.ts:59-69`) | Continue re-sends the template with `reindex: true` (full reindex) |
| Removing properties | none | Immediate local removal |

- **Empty / loading / error / notification states**:
  - Toasts: success "Template saved successfully."; warning "Template changes are being applied to all related entities." with detail "Processing {n} entities" (when the response or the loaded template has `processing.active`); error "Error saving template." with detail `error.detail ?? error.message` (also when the response has no template); success "Template processing completed." (socket `templateProcessed`).
  - Validation messages in the panel: "This field is required", "This label already exists in this template". Name: "Template name already exists".
  - Server errors appear only as toast detail. HTTP 422 (zod, validators, `Template.update` while processing: "template is being processed you can not update it yet" on path `processing`, `Template.ts:255-260`). HTTP 400 for domain errors (list in Server validation).
  - Progress bar in header while `processing.active`: text "Updating template properties across {n} entities ..." and `{percent}%`, driven by socket `templateProcessing` (every 10th completed job, `TemplateUpdateDenormalizeEntitiesBatch.ts:134-136`).
  - Empty property table cannot occur (three common rows always exist).
- **Save model**: explicit Save button; no autosave. Dirty guard: `useBlocker` (`TemplatesEditor.tsx:147-150`) blocks any navigation whose target path does NOT contain `templates/edit` while `!isEqual(loadedTemplate, currentStatus)` (ignoring `processing`). Gotchas: navigating from one template's edit page straight to another's is not blocked; there is no `beforeunload` handler (grep of `Templates/` and `Filters/` finds none) so a browser reload or tab close loses changes silently. Post-save: existing template then `revalidator.revalidate()` (stays on page); new template then `navigate('/settings/templates/edit/{id}', {replace:true})` (`:208-212`). Panel edits are local to the page until Save. Unknown `:templateId`: the loader silently falls back to an empty new template with a random color (`createTemplatesEditorLoader.ts:29,35-45`), and Save then creates a new template.
- **V1 vs V2**: V1 removed (see Templates list). Residual V1-era pieces: Redux mirror of `templatesAtom` (`app/react/V2/atoms/syncReduxFromAtoms.ts`), socket handlers `templateChange`/`templateDelete` that update `templatesAtom` (`app/react/App/sockets.js:62-80`). The V1 AJV validator for templates (`app/shared/types/templateSchema.ts`, with custom keywords such as `requireOrInvalidContentForSelectFields`, `requireRelationTypeForRelationship`) is no longer applied to requests: validation moved to zod + domain classes. A V1-era detail kept in the data model: `nested` property (CEJIL) is rendered by `Templates/components/ViolatedArticlesNestedProperties.js`.
- **Notes/gotchas**:
  - ASSUMED (static reading, not run): on opening Edit for a relationship property that inherits a property, `RelationshipFields` mounts after `reset(propertyToEdit)` and its effect `setValue('inherit', undefined)` (`RelationshipFields.tsx:22-24`) runs on mount, which would clear the stored inheritance from the form; saving then drops `inherit`. No spec covers it (`grep "Inherit property"` finds only this component). Treat as a probable defect to confirm in the running app.
  - Changing the property type in the new-property panel resets every field including the label (`reset({...emptyProperty, type, label})`, `ConfigPropertyPanel.tsx:126-133`).
  - The default label "Text" collides with an existing "Text" property of the same template on first add; the user must rename it.
  - Entity-type picker excludes the template being edited, so a template cannot relate to itself through this UI (`RelationshipFields.tsx:41`).
  - The duplicate-name check on the client is case-insensitive; the server's create check is case-sensitive and skipped on update.
  - Property `_id` is preserved through edits and drives rename/delete detection; a newly added property has no `_id` until the server assigns one.

#### Server validation

Request path on save: `TemplateMutationController` then `TemplateFacade.create|update` then zod DTO then use case.

| Check | Schema / file:line | Error and message | HTTP |
|---|---|---|---|
| Body shape (create) | `CreateTemplateDTOSchema = BaseTemplateSchema`, `.strict()`: allowed keys `name,color,entityViewPage,commonProperties,properties` only (`app/api/core/application/TemplateDTOs.ts:64-72`). `default`, `processing`, `__v` are deleted first (`TemplateFacade.ts:34-38`). | Unknown key (for example `synced`, `_id`, `reindex`) fails zod "Unrecognized key(s)" | 422 |
| Body shape (update) | `UpdateTemplateSchema` strict, adds required `id`; common property `id` required ("Common property id is required"); `reindex` is split off by the facade (`TemplateFacade.ts:56-76`) | zod messages | 422 |
| Property fields | `BasePropertySchema` (`TemplateDTOs.ts:24-52`): `label` string (required), `type` one of 17 literals, booleans optional, `content` string/null, `relationType` string, `inherit` `{property,type}` or `''` or null, `style` string, `nestedProperties` string[]. Not strict: unknown keys are stripped. **`name` is not in the schema, so it is always stripped and re-derived from the label** (except common properties, whose `name` is required, `:54-62`, and nested, which uses `{label}_nested`, `NestedProperty.ts:30-34`). | Invalid `type` literal: zod "Invalid input" | 422 |
| Name derivation | `safeName(label, newNameGeneration)` (`app/api/core/domain/template/utils/propertyNameGeneration.ts:1-18`). Old mode (default): trim, every char outside `[a-z0-9]` (case-insensitive) becomes `_`, lower-case (non-ASCII letters become `_`). New mode (setting `newNameGeneration`, once enabled it cannot be disabled, `saveSettingsInput.ts:204`): trim, replace `# \ / | * ? " < > = whitespace : . [ ] % ! - & ^ + ( ) { } ~` with `_`, drop one leading `_ - + $ space`, lower-case. | Renaming a label renames the property (stored `name` changes, entity metadata is migrated, see Effects) | n/a |
| Duplicate names in template | `TemplateWithDuplicatedPropertyValidator` over common + custom (`Template.ts:89-96`) | `TemplateWithDuplicatedPropertyError`: "Template contains duplicate property name: [name={name}]. Conflicts: "{label}" ({type}) and "{label}" ({type})." | 422 |
| Property swap | `checkForConflictingPropertyNames` (`Template.ts:132-146`) | `ValidationError` "Properties cannot swap names" | 422 |
| Missing common properties | validator above | "Template has the missing Property. Type = {title/creationDate/editDate}" | 400 |
| Per-type domain rules | each property class constructor (`PropertyTypeInvalidTypeError` "The following type is not valid for {Class}. Type = {t}", `errors.ts:11-18`) | | 400 |
| Select thesaurus | see Fields | `FieldIsRequiredError`, `SelectPropertyWithInvalidThesaurusError` | 400 |
| Relationship | see Fields | `RelationshipTypeDoesNotExistError`, `RelationshipTargetPropertyNotFoundError`, `RelationshipTargetTypeMismatchError` | 400 |
| Nested | `settings.project === 'cejil'` | `NestedPropertyNotAvailableError` "The nested Property type is not available for your organization {json}" | 400 |
| Cross-template consistency | see Cross-template compatibility | `PropertyTypeMismatchError`, `PropertyThesaurusMismatchError`, `PropertyInheritedTypeMismatchError` | 400 |
| Delete of inherited property | `UpdateTemplate.ts:66-73` via `getPropertiesBeingInherited` (`MongoTemplatesDataSource.ts:173-194`) | `InheritedPropertyCanNotBeDeleted` "Properties can not be deleted because are being inherited: [properties={names}]" | 422 |
| Template being processed | `Template.update` (`Template.ts:255-260`) | "template is being processed you can not update it yet" | 422 |
| Create: unique name, valid entity-view page | see Fields | see Fields | 400 / 422 |
| Elasticsearch mapping conflict | `TemplateMutationController.ts:23-25` (message regex `mapp(ing\|er)`) | `mapping conflict: ...` | 409 |
| Limits (max properties, label length, name length) | none found | | |

Effects of an update, in order (`app/api/core/application/UpdateTemplate.ts:37-106`):
1. In a transaction: write the template (`templatesDS.update`), update the translation context (`TemplateTranslationService.updateTemplateTranslation`, `templateTranslationService/TemplateTranslationService.ts:40-64`: renames keys for a changed template name and property labels, deletes keys for removed properties, context type "Entity"), then `updateMapping(template, fullReindex)` (`MongoTemplatesDataSource.ts:59-67`): `fullReindex` true means `resetIndex()` then `updateMapping(all templates)`; otherwise only this template's mapping is updated. Elasticsearch rejects incompatible mapping changes (HTTP 409 path).
2. Emit `TemplateUpdatedEvent`. Listeners: rename the template in `settings.filters` if the name changed (`app/api/core/infrastructure/settings/ReconcileFiltersOnTemplateChange.ts:42-49`); clean IX property extractors that reference removed properties when the feature is enabled (`app/api/suggestions/eventListeners.ts:85-92`).
3. `TemplatePostProcessService.createJobsForEntities` (`TemplatePostProcessService.ts:33-81`): if the diff has any "post-process change" (relationship property new or with changed `relationType`/`content`/inherit, new generated-id property, renamed property, or deleted property, `TemplateDiff.ts:120-128`), enqueue batches of 50 entities (`limit = 50`) per template; else if any property's `filter` flag changed, enqueue a "resave for filter change" (touches entities). Sets `processing.active=true` and adds job counts (`addJobsToProcessingCount`, `MongoTemplatesDataSource.ts:257-266`). With `reindex: true` it also enqueues full-text reindex jobs for every other template.
4. Each job (`TemplatePostProcessEntitiesJob.ts`, `TemplateUpdateDenormalizeEntitiesBatch.ts:44-137`): optional reindex; rename metadata keys and file selections for renamed properties; delete metadata and file selections for deleted properties (data loss, no client confirmation); regenerate denormalized relationship values and generated IDs; on the last job `completeProcessing` and emit socket `templateProcessed`; progress through `templateProcessing`.
5. Entity data itself is not migrated for type changes, because type changes are rejected.

Effects of a create (`CreateTemplate.ts:28-72`): derive common and custom properties, check name uniqueness and entity-view page, then in a transaction insert the template and create its translation context (`createTemplateTranslation`: keys = every custom property label, the template name, and the title label; context id = template id, type "Entity"). No mapping update and no jobs on create. `isDefault` is false.

Effects of delete (`DeleteTemplate.ts:27-95`): in a transaction, remove relationship properties in other templates that point to the deleted template (`Template.onTemplateDeleted` keeps properties whose `content` differs, `Template.ts:220-230`) and delete their translation keys; delete the template's translation context; delete the template. Then emit `TemplateDeletedEvent` (removes the template from `settings.filters`, `ReconcileFiltersOnTemplateChange.ts:36-40`; cleans IX extractors), and for each edited template emit `TemplateUpdatedEvent` and enqueue post-process jobs.

---

### Filters

- **Route / file**:
  - `/settings/filters` (`app/react/Routes.tsx:483-487`, `element={adminsOnlyRoute(<FiltersTable/>)}`, `loader={filtersLoader(headers)}`).
  - Loader and page `app/react/V2/Routes/Settings/Filters/FiltersTable.tsx:33-42` (loader), `:44-275` (component). Helpers `.../Filters/components/helpers.ts`. Add modal `.../components/AddTemplatesModal.tsx`. Sidepanel `.../components/FiltersSidepanel.tsx`. Columns `.../components/TableComponents.tsx`. Sidepanel state atom `.../components/sidepanelAtom.ts`.
- **Who can see it**: client admin only; nav link under `NeedAuthorization roles={['admin']}` (`SettingsNavigation.tsx:36-43`). Server: `GET /api/settings` has no auth (`app/api/core/infrastructure/express/settings/routes.ts:9`); `POST /api/settings` uses `needsAuthorization()` (admin, `:10`). No feature toggle.
- **Layout** (top to bottom): header "Filters" (no breadcrumb); info banner (CheckCircle icon, "Filters configuration", then description and two bullets, copy below); `Table` with table header text "Filters", columns Label | (sr-only "Action"), drag handle, checkbox, and group expand button column; when any group exists the table header also shows "Collapse all" / "Expand all" buttons (`Table.tsx:274-287`). Footer.
  - Banner copy (`FiltersTable.tsx:164-189`): "Filters configuration"; "By default, users can filter the entities in the library based on the types you have defined. However, you can configure how these entity types will be displayed:"; bullet 1 "drag and drop each entity type into the window in order to configure their order"; bullet 2 "Select "Add group" below to group filters under a label e.g ("Documents "or "People")" (sic).
  - Group row: a "Group" button (chevron) with sr-only "Open group" (`Table/GroupComponents.tsx`), the label, an "Edit" secondary button (`TableComponents.tsx:19-41`). Template rows have no action. An empty open group shows "Empty group. Drop here to add" (`Table/DnDComponents.tsx:148-163`).
  - Footer (`FiltersTable.tsx:205-244`): with nothing selected: left "Add entity type", "Add group" (primary); right "Cancel", "Save" (secondary/success, both disabled unless there are changes and no save in flight). With any selection: only "Delete" (danger).
- **What it configures**: `settings.filters`, an ordered list of `{id, name}` template entries and `{id, name, items:[{id,name}]}` groups (`app/shared/types/settingsType.ts:22-30`). It controls which entity types appear, in what order and grouping, in the Library "Type" facet. It does not restrict search results server-side (grep of `app/api/search`, `app/api/entities` finds no use of `settings.filters`).
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Add entity type modal: list | `MultiselectList` of templates not already used in any filter or group (`filterAvailableTemplates`, `helpers.ts:19-35`), with search | none selected | "Add" disabled when nothing selected | Title "Add entity type"; buttons "Cancel", "Add" with `(n)` suffix | `AddTemplatesModal.tsx` |
| Group sidepanel: Name | `InputField` id `group-name`, required | `''` | `required`: "This field is required" | Card "General Information", label "Name" | `FiltersSidepanel.tsx:94-105` |
| Group sidepanel: Entity types | `MultiSelect`; options = the group's current members plus templates still available | current members | none (empty allowed) | Card "Entity types", label "Entity types" | `:107-121` |
| Sidepanel buttons | | | | Title "Edit group" (when the atom has a `name`) or "Add group"; "Cancel"; "Update" (existing group id) or "Add" | `:87,127-139` |

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add entity type | Opens modal; on Add appends `{id: templateId, name, rowId}` rows at the end (`createNewFilters`, `helpers.ts:37-47`) | none until Save |
| Add group | Opens sidepanel with an empty form. New group id from `uniqueID()` (`FiltersSidepanel.tsx:74`). Appended at the end, or replaces the group with the same `id` (`updateFilters`, `helpers.ts:49-65`). | none until Save |
| Edit (group row) | Opens sidepanel with that group's name and members; members removed here return to the available pool and are not re-added at top level | none until Save |
| Drag row | `Table` DnD (`dndSortHandler`, `Table/helpers.ts:26-110`). Reorder top level; drag a template onto a template inside a group (or onto the group's "Empty group. Drop here to add" row) to move it into the group; drag out by dropping on a top-level row. Dropping onto a group row itself places the item at top level next to it. A group cannot be dropped into another group (`:97-99`). Expanded groups collapse while dragging. | none until Save |
| Delete | Removes all checked rows (templates or whole groups, with their members) from local state (`FiltersTable.tsx:98-116`, `deleteFilters`, `helpers.ts:67-86`); no confirmation | none until Save |
| Cancel | Reverts to loaded filters (`:87-91`) | none |
| Save | `settingsAPI.save({filters})` where `sanitizeFilters` removes `rowId`, `_id`, nests `subRows` as `items`, and silently drops groups with zero members (`helpers.ts:88-108`). On success merges the response into `settingsAtom`, revalidates, toasts. | `POST /api/settings` body `{filters:[...]}` (`app/react/Settings/SettingsAPI.ts:6-8`). `SaveSettingsController.ts:6-13` parses with `SaveSettingsInputSchema` (`saveSettingsInput.ts:28-42,153-242`: `filters` is `[{ _id?, id?, name?, items?: [{id?, name?}] }]`, all strict, no check that ids are existing templates) then `SaveSettingsUseCase.execute` (`SaveSettings.ts:19-34`): in a transaction `SettingsService.save` (`settings/SettingsService.ts:29-37`): reconcile the translation context "Filters" (type "Uwazi UI") for groups only, i.e. entries that have `items` (`SettingsTranslationService.ts:102-126`: renames/deletes group-name keys), `Object.assign` the new fields into settings, persist, emit `SettingsChangedEvent`. A listener broadcasts socket `updateSettings` to the tenant (`BroadcastSettingsChanged.ts:22-28`), updating `settingsAtom` in other open sessions (`App/sockets.js:80-83`). Response is the full public settings. Activity log "Updated settings" (`activitylogParser.ts:20`). |

- **Confirmations**: `ConfirmNavigationModal` (same copy as the editor: "Discard changes?" / "You have unsaved changes. Do you want to continue?" / "Cancel", "Discard changes") when navigating away with unsaved changes. No confirmation for Delete or Cancel.
- **Empty / loading / error / notification states**: empty table "NO DATA AVAILABLE" (`DefaultNoDataMessage`). Success toast "Filters saved". Error toast "An error occurred" with detail `error.message`. Loader: failure to read templates throws a route error; a failed settings read falls back to an empty filter list (`FiltersTable.tsx:36-37`). Validation: sidepanel "This field is required".
- **Save model**: explicit Save (and Cancel) in the footer; all edits are local until Save. Dirty guard: `useBlocker(hasChanges)` (`FiltersTable.tsx:54`), where `hasChanges` compares JSON of current vs loaded rows. This blocks every navigation, unlike the template editor. No `beforeunload`. Post-save: `setSettings(merge)`, `revalidate()`, toast; selection is not cleared on save.
- **V1 vs V2**: the V1 settings Filters page is removed (`app/react/Settings/components/` holds only `relV2MigrationDashboard.tsx`). The V1 Library still consumes `settings.filters`: `app/react/Library/components/DocumentTypesList.jsx:15-27` (shows configured filters when "FEATURED" is on, otherwise all templates sorted by translated name) and the FEATURED/ALL switcher in `app/react/Library/components/TemplatesFilter.tsx:77-113`, visible to admin, editor and collaborator, shown only when filters exist (`:79-80`).
- **How the library uses `settings.filters`** (V2): `app/react/V2/Routes/Library/libraryTypeFilters.ts:12-44` builds the Type facet from `settings.filters` (id falls back to name; group items without `id` are dropped; item name falls back to id); if the resulting list is empty it falls back to every template sorted by name. `Components/TypeFacet.tsx:36-107` renders groups as expandable rows (group label translated in context "Filters"; template names in context = template id; group count is the sum of children's aggregation counts; checking the group toggles all children). There is no "all types" toggle in V2 `TypeFacet.tsx` (none found).
- **Notes/gotchas**:
  - Template rename propagates only to top-level filter entries: `renameFilterTree` matches `filter.id === templateId` on the first level only (`app/api/core/domain/settings/settingsTree.ts:50-59`), so a renamed template inside a group keeps its old stored name in `items[].name` (V2 `TypeFacet` renders it through `Translate context={child.id}`, so the translation table can mask this; ASSUMED, not run).
  - Template deletion removes the template recursively from the tree but leaves empty groups in settings (`removeTemplateFromFilterTree`, `:61-71`); the next Save from the UI drops empty groups.
  - Templates not listed in any filter or group do not appear in the Library Type facet once at least one filter is configured.
  - The page uses the legacy `settingsAPI`/`templatesAPI` modules directly, not the `V2Services` bundle used by the Templates pages.

---

## Part 4: Thesauri, Relationship types, Languages, Translations

Source: huridocs/uwazi, branch `production`, v1.229.224 (shallow clone, read only). Nothing was executed; every statement comes from reading code and the `AI Contexts` docs. Status tags: **VERIFIED** = read in the cited code. **INFERRED** = follows from code read but not run. **ASSUMED** = not confirmed in code.

Path abbreviations (all repo-relative):

| Short | Expands to |
|---|---|
| `R/` | `app/react/V2/Routes/Settings/` |
| `UI/` | `app/react/V2/Components/UI/` |
| `CORE/` | `app/api/core/` |
| `EXP/` | `app/api/core/infrastructure/express/` |

Cross-cutting facts used by all four pages:

- Route tree: `app/react/Routes.tsx:324` mounts `settings` behind `loggedInUsersRoute`; each page below is wrapped in `adminsOnlyRoute` (`app/react/ProtectedRoute.tsx:26-28`: `ProtectedRoute allowedRoles=['admin']`, otherwise `<Navigate to="/login">`, lines 6-24). VERIFIED.
- Sidebar links are inside `NeedAuthorization roles={['admin']}`: Languages, Translations (`R/SettingsNavigation.tsx:30-41`), Thesauri, Relationship types (`R/SettingsNavigation.tsx:55-62`). No `FeatureToggle` wraps any of the four. VERIFIED.
- Server write endpoints use `needsAuthorization()` with the default `roles = ['admin']` (`app/api/auth/authMiddleware.ts:13-20`; failure answers HTTP 401 `{error:'Unauthorized'}`). VERIFIED.
- Private-instance gate: `app/api/core/infrastructure/express/middlewares/PrivateInstanceMiddleware.ts:16-40` answers 401 on `/api/*` for anonymous users when the collection is private. Public GETs below are subject to it. VERIFIED.
- Global V2 API toast policy: every failed request through `apiClient` (Thesauri, Relationship types) raises a toast "An error occurred" with the server message as details, except 401 and 404 (ignored), cancelled, and 409 (warning with `error.code`) (`app/react/V2/api/policies.ts:39-72`). The Thesauri and Relationship types pages also raise their own toast on the same error, so two toasts can appear for one failure. INFERRED from `wireBrowserPolicies` (`policies.ts:116-121`) plus the page code. Languages and Translations use the legacy `api` client (`app/react/utils/api.js`), not this policy.
- Server error mapping: core `DomainError` -> HTTP 400, core/AJV/Zod validation errors -> 422, plain `Error` -> 500 with `util.inspect(error)` as message, `createError(msg, 400)` -> 400 (`app/api/utils/handleError.js:68-150`). Body shape `{error, prettyMessage, requestId, validations}`; the client shows `prettyMessage ?? message ?? error` as toast details (`app/shared/apiClient/normalizeError.ts:81-97`). VERIFIED.
- All four domains in this part have a Mongo and a Postgres data source chosen per tenant by `tenant.featureFlags.postgresCore` (`CORE/infrastructure/factories/ThesauriDataSourceFactory.ts:16`, `RelationshipTypesDataSourceFactory.ts:18`, `TranslationsDataSourceFactory.ts:17`, `SettingsDataSourceFactory.ts:46`). The `AI Contexts` docs still name per-module flags (`postgresRelationshipTypes`, `postgresTranslations`); the code reads `postgresCore` only. VERIFIED discrepancy.

---

### Thesauri

- **Route / file**:
  - `/settings/thesauri` (list): `app/react/Routes.tsx:451-456`; loader `R/Thesauri/createThesauriLoader.ts:12-19` (`services.thesauri.getAll` -> `GET /api/dictionaries`, `app/react/V2/api/thesauri/index.ts:15-27`); component `R/Thesauri/ThesauriList.tsx:14`.
  - `/settings/thesauri/new` (editor, no loader): `Routes.tsx:457`; `R/Thesauri/EditThesaurus.tsx:36`. `useLoaderData()` is `undefined` here.
  - `/settings/thesauri/edit/:_id`: `Routes.tsx:458-462`; loader `R/Thesauri/createEditThesaurusLoader.ts:12-19` (`GET /api/dictionaries?_id=<id>`, `thesauri/index.ts:29-44`).
  - Editor pieces: `R/Thesauri/ThesaurusForm.tsx` (name + table + submit), `R/Thesauri/components/ThesauriValueFormSidepanel.tsx`, `ThesauriGroupFormSidepanel.tsx`, `ImportButton.tsx`, `ThesaurusActions.tsx`, helpers `R/Thesauri/helpers.ts`.
  - SSR path uses `ThesauriDAOFactory` directly for reads (`app/react/V2/services/server/ServerThesaurusService.ts:13-34`); its upsert/delete/import are `notImplemented`. VERIFIED.
- **Who can see it**:
  - UI: admin only (route guard and nav, see cross-cutting).
  - Server: `GET /api/dictionaries` has no auth middleware (`app/api/core/v1_layer/thesauri/routes.ts:60`, `EXP/thesaurus/GetThesauriController.ts:9-19`), so any user (or anonymous on a public instance) can read all thesauri. `POST /api/thesauris` (create, update, CSV import) and `DELETE /api/thesauris` use `needsAuthorization()` = admin (`routes.ts:14-16, 62`). Also `GET /api/thesauris` (legacy shape: thesauri plus templates as thesauri) is public (`routes.ts:32-58`); not used by this page. VERIFIED.
  - No feature toggle.
- **Layout**:
  - List: `SettingsContent` with header title "Thesauri"; body is one `Table` whose header cell is "Thesauri" and whose columns are Label, Templates, Action (`R/Thesauri/components/TableComponents.tsx:126-146`), default sort name ascending, Label sortable only (`ThesauriTable.tsx:27-42`); footer sticky bar.
  - Label cell: thesaurus name plus a bordered pill with the name translated under context = thesaurus `_id`. The pill is `hidden` unless the translation differs from the name or Live translate is active (`TableComponents.tsx:11-34`). INFERRED from class `has-[span:not(.active)]:hidden`.
  - Templates cell: gray pills of every template whose property `content` equals the thesaurus id (client-side from `templatesAtom`, `ThesauriList.tsx:23-38`).
  - Action cell: ghost button "Edit" (navigates `./edit/<_id>`).
  - Footer, nothing selected: primary "Add thesaurus" (link to `/settings/thesauri/new`). Footer, rows selected: info-tint bar with danger "Delete" and text "Selected N of M" (`ThesauriList.tsx:72-97`).
  - Editor: header breadcrumb "Thesauri" > current name (live from the name input, `EditThesaurus.tsx:125-128`). Body: one bordered `Table` (`ThesaurusForm.tsx:77-107`) whose header cell is the name input; columns Label (with the same translation pill per value) and Action ("Edit" ghost button); a drag handle column (sr-only "Drag row", `UI/Table/DnDComponents.tsx:56-77`); a checkbox column; groups render as expandable parent rows with children, plus "Collapse all" / "Expand all" buttons in the table header (`UI/Table/Table.tsx:274-283`). Empty group row text: "Empty group. Drop here to add" (`DnDComponents.tsx:159`). Table with no rows: "NO DATA AVAILABLE" (`UI/Table/DefaultNoDataMessage.tsx:6`).
  - Editor footer, nothing selected: primary "Add item", ghost "Add group", ghost "Sort", secondary "Import" (left); ghost "Cancel" (link to list) and success "Save" (right) (`EditThesaurus.tsx:154-186`, `ThesaurusActions.tsx:33-44`). Rows selected: danger "Remove" and "Selected N of M" (M counts root rows only, `EditThesaurus.tsx:140-153`).
  - Add/Edit item and Add/Edit group open in a right `Sidepanel` with overlay.
- **Fields**:

| Field | Type/control | Default | Validation | Help text / label copy | file:line |
|---|---|---|---|---|---|
| Thesaurus name | text `InputField` (has clear-X, no-op) in the table header | `''` (new) / current name | client: `required: true`, error only turns the input red, no message; server (create): trimmed, `Name cannot be empty`, unique across thesauri (exact match, case-sensitive) | placeholder "Thesauri name" | `R/Thesauri/ThesaurusForm.tsx:84-91`; `CORE/domain/thesaurus/Thesaurus.ts:64-71`; `CORE/infrastructure/mongodb/thesauri/MongoThesauriDataSource.ts:60-71`; PG unique index `thesauri_name` on (name, tenant_id) `CORE/infrastructure/postgresql/schema_migrations/002-create_thesauri_table.sql:9` |
| Item title (Add item panel) | text, label "Title"; repeats: typing in the last card appends another empty card | one empty card | label run through `sanitizeThesaurusLabel` (newlines to spaces, collapse whitespace, trim); empty cards dropped on submit; no duplicate check client-side | card title "Item" | `components/ThesauriValueFormSidepanel.tsx:40-67, 108-117`; `app/shared/sanitizationUtils.ts:20-27` |
| Item group (Add item panel) | select, label "Group", options "No Group" (hard-coded, untranslated) + existing groups; disabled when editing an existing item | "No Group" | none | - | `ThesauriValueFormSidepanel.tsx:118-134` |
| Group name | text, label "Name" | `''` | `required: true`; message "This field is required" | card title "Group" | `components/ThesauriGroupFormSidepanel.tsx:143-156` |
| Group items | repeating "Title" inputs, card title "Item" | one empty card | all but the last card required; field-array rule `minLength: 2` (at least one real item plus the trailing empty card); shows "This field is required" under the first card when none | - | `ThesauriGroupFormSidepanel.tsx:40-45, 85-102` |
| CSV file | hidden `<input type="file">` (no `accept`) | - | server-side CSV validation (see Actions) | button "Import" | `components/ImportButton.tsx:38-51` |

  - Info banners in empty "add" mode. Item panel: title "Adding items to the thesauri", text "You can add one or many items in this form." and "Once you type the first item name, a new item form will appear underneath it, so you can keep on adding as many as you want." (key `thesauri new item desc`) (`ThesauriValueFormSidepanel.tsx:83-107`). Group panel: title "Adding a group and its items.", same first line, then "Each item created will live inside this group. Once you type the first item name, a new item form will appear underneath it, so you can keep on adding as many as you want." (key `thesauri new group desc`) (`ThesauriGroupFormSidepanel.tsx:117-142`).
  - Panel titles: "Add item" / "Edit item", "Add group" / "Edit group"; submit buttons "Add" / "Edit" (item) and "Add group" / "Edit group" (group); "Cancel" on both.
  - Auto-generated ids: client keeps a throw-away `rowId` (`uniqueID()`) per row, stripped before sending (`helpers.ts:28-35`). Existing values reuse their `id` as `rowId` (`helpers.ts:65-74`). The server mints `uuid.v4()` for every value without `id`, and an ObjectId for the thesaurus (`CORE/domain/thesaurus/Thesaurus.ts:231-250`). The user never sees ids. VERIFIED.
- **Actions**:

| Action (exact label) | Client behaviour | Server call | Effect |
|---|---|---|---|
| Add thesaurus | link to `/settings/thesauri/new` | none | empty editor |
| Edit (row) | navigate to edit route | `GET /api/dictionaries?_id=` (loader) | loads one thesaurus, `EXP/thesaurus/GetThesauriController.ts:9-19` |
| Delete (footer, after ticking rows) | opens confirmation (below); on accept runs one delete per id in parallel and aborts on first failure reported (`app/react/V2/services/http/HttpThesaurusService.ts:11-18`) | `DELETE /api/thesauris?_id=<id>` per id; `needsAuthorization()`; `EXP/thesaurus/DeleteThesaurusController.ts:9-19` via `CORE/application/DeleteThesaurus.ts:17-32` | fails with `ThesaurusInUseError` (400) if any template property uses it (`TemplatesDataSource.countByThesauri`); otherwise in one transaction deletes the translation context (all languages) and the thesaurus; emits socket `thesauriDelete` `{ok,_id}` (`DeleteThesaurusController.ts:17`); client socket handler removes it from `thesauriAtom` (`app/react/App/sockets.js:99-105`). No entity check is needed because only templates reference thesauri. VERIFIED |
| Row checkbox (list) | disabled for any thesaurus used by a template (`disableRowSelection: true`, boolean so no tooltip) | none | `ThesauriList.tsx:34`; `UI/Table/RowSelectComponents.tsx:17-43` |
| Add item | clears form, opens item panel | none | `EditThesaurus.tsx:86-89` |
| Add group | opens group panel with `emptyThesaurus()` (one blank item) | none | `EditThesaurus.tsx:90-93`, `helpers.ts:59-63` |
| Edit (row, editor) | group row opens group panel, value row opens item panel with its `groupId` | none | `EditThesaurus.tsx:94-103` |
| Add / Edit (panel submit) | merges into local state; item with a group id is pushed into that group's `subRows`; editing an existing item only changes its label | none until Save | `helpers.ts:81-92, 125-163` |
| Sort | sorts root values by label and every group's children by label (lodash `orderBy`, ascending, case-sensitive ordering by lodash default); result becomes the persisted order | none until Save | `helpers.ts:108-123` |
| Header "Label" click (editor table) | table sorts and calls `onSort`, which overwrites the values state with the sorted rows | none until Save | `ThesaurusForm.tsx:103-105`, `UI/Table/Table.tsx:188-193`. INFERRED (chevrons are shown unless `enableSorting:false`; the editor does not disable it) |
| Drag row | `@dnd-kit` mouse and keyboard sensors, vertical axis only. With `disableEditingGroups: true` a row can only be dropped inside its own parent: root values and groups reorder at root level, children reorder inside their group; no moving a value between groups, no group inside a group, no dropping into an empty group | none until Save | `ThesaurusForm.tsx:81`, `UI/Table/helpers.ts:53-55, 97-99`, `UI/Table/Table.tsx:214-242` |
| Remove (footer, after ticking rows) | if the thesaurus is used by a template and the first selected row has an `id` (already saved) a confirmation opens; otherwise removes immediately. Removing the last child of a group deletes the group | none until Save | `EditThesaurus.tsx:105-120`, `helpers.ts:94-106` |
| Import | opens file chooser. On file selection sends the current form state (name + all in-memory values, including unsaved edits) and the file as multipart | `POST /api/thesauris` multipart (`thesauri` JSON field + `file`), `needsAuthorization()`, `uploadMiddleware()` (`routes.ts:14-30`; client `thesauri/index.ts:81-93`) | server first creates (no `_id`) or updates the thesaurus with the form values, then `CSVLoader.loadThesauri` appends CSV values and updates per-language translations from extra language columns (details in Notes). Success: sets `_id`, toast "Thesauri updated.", navigates (replace) to `../edit/<id>`. Failure: toast "Error adding thesauri." The button is disabled while the name is empty (`EditThesaurus.tsx:166-182`) |
| Save | submits the form: `POST /api/thesauris` with `{name, values, [_id]}` | create when no `_id` -> `CreateThesaurusController` (`CORE/application/CreateThesaurus.ts:13-23`); update when `_id` present -> `UpdateThesaurusController` (Zod: `_id`, `name`, `values[{label,id?,values?[{label,id?}]}]`) (`EXP/thesaurus/UpdateThesaurusController.ts:11-26`) | see "What save propagates" below. Success toast: "Thesauri added." (new) / "Thesauri updated."; new thesaurus then navigates (replace) to `../edit/<id>`, an existing one revalidates the loader (`ThesaurusForm.tsx:44-69`). Failure toast: "Error updating thesauri." |
| Cancel | link to `/settings/thesauri`; goes through the dirty guard | none | `ThesaurusActions.tsx:35-39` |

  What Save propagates (server, update path), VERIFIED unless marked:
  1. `UpdateThesaurusUseCase` loads the thesaurus, builds the new aggregate, and diffs by value `id` (`CORE/application/UpdateThesaurus.ts:20-36`, `CORE/domain/thesaurus/ThesaurusDiff.ts`).
  2. `ThesauriService.update` (`CORE/application/ThesauriService.ts:68-86`): no change at all -> returns without writing; order-only change -> writes the thesaurus and stops (no translation or entity work); otherwise: if the name changed, checks name uniqueness (`ThesaurusNameAlreadyExistsError`, HTTP 422 `A thesaurus with name "<name>" already exists`); writes the thesaurus; updates the translation context; dispatches entity denormalization for changed value ids.
  3. Translations (`CORE/application/thesaurusTranslationService/ThesaurusTranslationService.ts:59-146, 186-215`), context type `Thesaurus`, context id = thesaurus `_id`, keys = value labels and the thesaurus name:
     - added value (new id, label not in the old thesaurus): new key in every installed language with the label as value (untranslated);
     - removed value: key deleted in every language, unless the same label still exists under another value;
     - renamed value (same id, new label): key renamed; each non-default language keeps its existing text under the new key, the default language gets the new label (`CORE/domain/translation/TranslationContextModel.ts:80-100`); if the old label is still used by another value, the old key stays and the new label is added instead;
     - renamed thesaurus: name key renamed and the context label updated.
  4. Entities: for updated and removed value ids only (not added ones) `Dispatcher.denormalizeThesaurus` deletes any queued job for that thesaurus and enqueues `DenormalizeEntitiesHandler` (`CORE/infrastructure/jobs/DispatcherAdapter.ts:69-77`). The handler finds entities whose properties reference the thesaurus values and splits them in chunks of 100 (`DenormalizeEntitiesHandler.ts:59-72`); each chunk rebuilds the select/multiselect property assignments (and relationship fields inheriting from select) in all languages and updates the entities without authorization checks (`CORE/application/DenormalizeThesaurusEntities.ts:22-79`). Entity updates reindex the modified entities in Elasticsearch on commit (`CORE/infrastructure/mongodb/entity/MongoEntitiesDataSource.ts:54`). The job is asynchronous: the HTTP response returns before entities are rewritten. Behaviour for removed values (dropped from entity metadata) is INFERRED from the rebuild of assignments; the code that drops them was not read.
  5. Templates are not touched (they reference the thesaurus by `_id`).
  6. Socket `thesauriChange` with the saved thesaurus (`UpdateThesaurusController.ts:89`, `CreateThesaurusController.ts:51`); the client replaces/appends it in `thesauriAtom` (`sockets.js:87-97`).
  7. Create path: `ThesauriService.insert` checks name uniqueness, writes the thesaurus and creates a translation context with the name and all labels in every installed language (`ThesauriService.ts:61-66`, `ThesaurusTranslationService.ts:178-184`).
- **Confirmations**:

| Trigger | Header | Warning (red alert box) | Body | Buttons | Result |
|---|---|---|---|---|---|
| Delete from list (`ThesauriList.tsx:99-115`) | "Delete" | "Are you sure you want to delete this item?" | bulleted list of selected thesaurus names | "Cancel" / "Accept" (danger) | runs deletes, toast, revalidates, clears selection |
| Remove in editor when thesaurus is used by a template and the first selected value is saved (`ThesaurusActions.tsx:13-31`) | "Delete" | "Are you sure you want to delete this item?" | "Changes in the thesaurus will impact all the entities using these values." | "Cancel" / "Accept" (danger) | removes rows from local state only; still needs Save |
| Leave the editor with unsaved changes (`UI/ConfirmNavigationModal.tsx:11-40`) | "Discard changes?" | - | "You have unsaved changes. Do you want to continue?" | "Cancel" / "Discard changes" | proceeds with navigation |

- **Empty / loading / error / notification states**:
  - List empty: "NO DATA AVAILABLE". Editor empty: same.
  - Toasts (success): "Thesauri deleted" (list delete, `ThesauriList.tsx:52`); "Thesauri added." / "Thesauri updated." (save, import).
  - Toasts (error): "An error occurred" with details = server message (delete); "Error updating thesauri." (save); "Error adding thesauri." (import). Plus the global policy toast (see cross-cutting).
  - Server messages seen as details: `Cannot delete thesaurus with N associated templates. Please remove the related templates first.` (400); `A thesaurus with name "X" already exists` (422); `The Thesaurus with Id "X" was not found` (400); Zod/AJV details on malformed bodies (422); for create, `Name cannot be empty`, `Label cannot be empty`, and `Thesaurus with Id: "<id>" has duplicated labels: "a" "b"` where nested duplicates print as `Group/label` (`Thesaurus.ts:64-88`).
  - Loading: global request loading bar (`policies.ts:11-37`); no skeletons.
- **Save model**: explicit Save button (submit of form `edit-thesaurus` from the footer). All edits (rename, add, remove, reorder, panels) are local React state until Save. Dirty guard: `useBlocker` compares the loaded thesaurus with the current name + sanitized values (`EditThesaurus.tsx:67-84`, `helpers.ts:165-172`); it does not block navigation to a path containing `edit`, so after the first save of a new thesaurus the redirect passes. No `beforeunload` handler. For `/new` the loaded thesaurus is `undefined`, so `compareThesaurus` reports a change even when nothing was typed: Cancel on a new, untouched thesaurus opens "Discard changes?". INFERRED from `helpers.ts:169-171`. Post-save: stays on the editor (edit route).
- **V1 vs V2**: V1 UI removed. `app/react/Thesauri/` keeps only `ThesauriAPI.js` (`dictionaries`, `thesauris`, `models`, `models/train`), `actions/thesauriActions.js` (`saveThesaurus`, uses `react-redux-form`, toast "Thesaurus saved") and `actions/thesaurisActions.js` (`reloadThesauri`, imported by `app/react/Users/Login.jsx:12` and `app/react/Metadata/actions/actions.js:8`), plus `types/` and `utils/suggestionQuery.ts`. No V1 list/editor components exist. Backend: legacy `app/api/thesauri` is gone; `CORE/v1_layer/thesauri/thesauri.js:67-83` is a thin adapter over the core Create/Update use cases and still hosts `get` (thesauri + templates as thesauri) and `appendValues` (used by CSV import). VERIFIED.
- **Notes/gotchas**:
  - Server validation asymmetry: the Zod/trim/duplicate-label `Schema` runs only in the `Thesaurus` constructor with `validate = true` (create). `clone()` used by `update()` passes `validate = false` (`Thesaurus.ts:216-224`), `MongoThesaurusMapper.toDomain(dbo, false)` too, and the update controller's Zod only checks types (`UpdateThesaurusController.ts:11-26`). So on update, empty/duplicate labels and an untrimmed name appear to be accepted. INFERRED, not run. The client has no duplicate check either; it only strips empty rows in the panels and `sanitizeThesauri`.
  - Duplicate rule on create: compared with exact string equality within root values (groups and plain values together) and within each group's children; the same label under two different groups, or as a root value and a child, is allowed. Because translation keys are labels, equal labels share one translation key.
  - Delete from the list has no server-side race protection beyond the template count; template count in the UI comes from `templatesAtom`, which can be stale (server check is authoritative).
  - `isImporting` is set when "Import" is clicked and cleared only after the upload returns; cancelling the OS file dialog leaves Save and Cancel disabled (`EditThesaurus.tsx:166-184`, `ImportButton.tsx:22-47`). INFERRED. The hidden input's value is reset by `setAttribute('value','')`, which does not clear a file input selection, so re-selecting the same file may not fire `change` (ASSUMED).
  - CSV import format (VERIFIED, `app/api/csv/importThesauri.ts`): delimiter `,` or `;`; header row; each column header is a language name (English label from `availableLanguages`, e.g. "Spanish"); a cell starting with `-` (optionally after spaces) is a child of the previous non-nested row; the first row cannot be nested; all columns of one row must be all nested or all not nested (errors "Invalid csv: nested value need to be under a non-nested value", "Invalid csv: all the values for a row must be either nested or non-nested", HTTP 400). The values column used is the default language, else the request language, else the first column. Existing labels are matched case-insensitively and trimmed, so re-importing does not duplicate (`CORE/v1_layer/thesauri/thesauri.js:20-65`). Other language columns for installed languages become translations through `UpdateEntriesByContext` (`app/api/csv/csvLoader.ts:25-58`).
  - Import on an existing thesaurus first saves the in-memory edits server-side, so "Import" is a save, not a preview.
  - Rename of a value updates the translation keys and entities asynchronously; there is no progress indication in the UI.
  - Loading `/settings/thesauri/edit/<unknown id>`: `getById` returns `undefined` (`thesauri/index.ts:43`), the editor then behaves like the "new" page. What React Router does with an `undefined` loader result was not checked (ASSUMED).
  - Postgres: table `thesauri(_id, name, values JSONB, tenant_id)` with RLS (`002-create_thesauri_table.sql`), selected by `postgresCore`; sync namespace for thesauri is `dictionaries` (per `AI Contexts/Relationship Types/relationship-types-postgres.md` D4; sync handlers `app/api/sync/PostgresThesauriSyncHandler.ts`). No dedicated thesauri Postgres doc exists in `AI Contexts`.

---

### Relationship types

- **Route / file**: `/settings/relationship-types` (index only, no create/edit routes; both happen in a sidepanel) `app/react/Routes.tsx:443-450`; loader `R/RelationshipTypes/createRelationshipTypesLoader.ts:12-19` (`GET /api/relationtypes`, `app/react/V2/api/relationshiptypes/index.ts:30-42`); component `R/RelationshipTypes/RelationshipTypes.tsx:17`; form `R/RelationshipTypes/components/Form.tsx`; columns `components/TableComponents.tsx`. Backend routes `EXP/relationshipType/routes.ts:8-26`.
- **Who can see it**:
  - UI: admin only (guard + nav).
  - Server: `POST /api/relationtypes` and `DELETE /api/relationtypes` use `needsAuthorization()` = admin (`routes.ts:9-25`). `GET /api/relationtypes` has none (public read, `routes.ts:20`). VERIFIED.
  - No feature toggle on the page. The delete guard consults `settings.features.newRelationships` (see Actions).
- **Layout**: header "Relationship types"; one `Table` (header text "Relationship types"; columns Label, Templates, Action; `enableSelections`); sticky footer.
  - Label cell: translated name in indigo, then the raw name in parentheses, e.g. "Supports (Supports)" (`TableComponents.tsx:26-30`). The rows are pre-sorted by translated name with `localeCompare` (`RelationshipTypes.tsx:57`); the Label header is sortable.
  - Templates cell: gray pills for templates having a property with `relationType === type._id` (client side, `RelationshipTypes.tsx:40-47`).
  - Action: ghost "Edit".
  - Footer: nothing selected -> primary "Add relationship type"; rows selected -> danger "Delete" and "Selected N of M". Row checkboxes are disabled when at least one template uses the type (boolean `disableRowSelection`, no tooltip, `RelationshipTypes.tsx:54`).
  - Sidepanel (medium, overlay): title text `Add relationship type` / `Edit relationship type` (translated, rendered uppercase by CSS; Add when `name === ''`) (`RelationshipTypes.tsx:162-172`).
- **Fields**:

| Field | Type/control | Default | Validation | Help text / label copy | file:line |
|---|---|---|---|---|---|
| Name | text `InputField` in a `Card` titled "Relationship Type"; label "Name" | `''` (add) / current name (edit) | client: `required: true` (red input, no message); `alreadyExists`: another type with exactly the same name (case-sensitive, untrimmed) -> message "Already exists". Server: case-insensitive, trimmed uniqueness; no max length, no trim of the stored name | no placeholder | `R/RelationshipTypes/components/Form.tsx:29-50`; server `CORE/application/CreateRelationshipType.ts:19-22`, `UpdateRelationshipType.ts:25-28`, `CORE/infrastructure/mongodb/relationshipType/MongoRelationshipTypesDataSource.ts:41-53` |

  The model has only `id` and `name` (`CORE/domain/relationshipType/RelationshipType.ts:1-10`). Legacy `properties` are accepted by the Zod schema (`.passthrough()`) and ignored (`EXP/relationshipType/RelationshipTypeRouteSchemas.ts:3-9`; `AI Contexts/Relationship Types/relationship-types-v2-migration.md:13-27`). Migration 200 removes `relationtypes.properties` and `connections.metadata`.
- **Actions**:

| Action | Client behaviour | Server call | Effect |
|---|---|---|---|
| Add relationship type | opens panel with `{name:'', rowId:'NEW_REL'}` | none | `RelationshipTypes.tsx:70-73` |
| Edit (row) | opens panel with the row | none | `RelationshipTypes.tsx:65-68` |
| Save (panel) | `handleSubmit(submit)`; strips `rowId`; calls `upsert`; closes panel; revalidates loader | `POST /api/relationtypes` body `{name}` or `{_id, name, ...}`; route picks Create when `_id` missing, Update when present (`routes.ts:9-19`) | Create: duplicate check, new id from `idGenerator`, in one transaction inserts the type and creates a translation context (type `Relationship Type`, id = type id, one key = name, in every installed language) (`CreateRelationshipType.ts:17-33`, `CORE/application/relationshipTypeTranslationService/RelationshipTypeTranslationService.ts:18-27`). Update: loads current, duplicate check excluding itself, updates, renames the translation key and context label, keeps other-language text (`UpdateRelationshipType.ts:18-38`, `RelationshipTypeTranslationService.ts:29-42`). Response `{_id, name}`. No socket emitted, no entity or template rewrite. VERIFIED |
| Cancel (panel) | closes panel | none | - |
| Delete (footer) | opens confirmation; accept deletes each id in parallel via `Promise.all` | `DELETE /api/relationtypes?_id=` per id (`routes.ts:21-25`, `DeleteRelationshipType.ts:48-58`) | Guards in order: (1) any template with a property using the type -> 400 `Cannot delete type being used in templates: <names>`; (2) any legacy connection using it, or (when `newRelationships` is enabled) any new relationship using it -> 400 `Cannot delete type being used in relationships`; (3) when `newRelationships` is enabled, used by a saved relationship query -> 400 `Cannot delete type being used in relationship queries` (`DeleteRelationshipType.ts:21-46`, `app/api/relationships.v2/relationtypes/v2_support.ts:7-28`). Then, in one transaction, deletes the translation context and the type. VERIFIED |

- **Confirmations**: Delete: header "Delete"; red warning "Do you want to delete the following items?"; body bulleted list of selected names; buttons "Cancel" / "Accept" (danger style) (`RelationshipTypes.tsx:180-196`). Opens only after ticking at least one row. No unsaved-changes guard.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE".
  - Success toast for both save and delete: "Updated". Error toast: "An error occurred" with `error.detail ?? error.message` (`RelationshipTypes.tsx:75-111`). Global policy toast also fires.
  - Server messages: the three delete messages above; on duplicate name, `Error('duplicated_entry')` is a plain `Error`, so it is returned as HTTP 500 with the inspected error text (`handleError.js:68-70`; `CreateRelationshipType.ts:21`, `UpdateRelationshipType.ts:27`). The client check normally prevents it, but the client check is case-sensitive while the server's is case-insensitive, so "supports" vs "Supports" reaches the server and fails as 500. INFERRED. Update of a missing id: plain `Error('Relationship type not found')` -> 500.
  - Form error: "Already exists".
- **Save model**: sidepanel with Save / Cancel buttons; explicit save per type. Delete is immediate after confirm. No dirty guard (closing the panel discards). After a save the loader revalidates and `relationshipTypesAtom` is refreshed from loader data (`RelationshipTypes.tsx:61-63`).
- **V1 vs V2**: V1 page removed. `app/react/RelationTypes/` keeps `RelationTypesAPI.js`, Redux `actions/relationTypeActions.js` (`saveRelationType`, toast "RelationType saved") and `actions/relationTypesActions.js`, and `components/AddRelationshipTypeButton.tsx` (a Redux-connected modal button). The button is not imported anywhere else in `app/react` (grep), so it is dead code. `RelationTypesAPI` is still imported by `app/react/Viewer/EntityView.jsx:5` and `app/react/Viewer/actions/routeActions.js:4` (legacy viewer). Backend: `app/api/relationtypes` removed; logic lives in `CORE` (`AI Contexts/Relationship Types/relationship-types-v2-migration.md:112-123`). VERIFIED.
- **Notes/gotchas**:
  - Relation to templates: a template property of type relationship stores `relationType` (id of a relationship type) and a target template list (`R/Templates/components/fields/RelationshipFields.tsx:83-91`, labels "Relationship type", "Entities", "Inherit property"). The Templates editor can create a type inline through `AddRelationshipTypeModal` (`R/Templates/components/AddRelationshipTypeModal.tsx:12-79`): modal "Add relationship type", field "Name" (placeholder "Relationship type name"), Cancel / Save, toast "Relationship type created successfully.", inline error "Relationship type name already exists" (client check lowercase-insensitive on trimmed name, `app/react/V2/services/useRelationshipTypeMutations.ts:19-38`). The entity view also creates and deletes types (`ManageRelationTypesModal`, `RelationTypeStep`). Those paths use the same endpoints. They do not run this page's translation display.
  - The templates "in use" list in the UI uses template properties only; relationship (connection) usage is checked only on the server at delete time, so a type unused by templates but used by relationships looks deletable and then fails with 400.
  - `countByTypes` (`GET /api/references/count_by_relationtype`) exists in the service layer but this page does not call it (`app/react/V2/services/http/HttpRelationshipTypesService.ts:7-9`, `app/api/relationships/routes.js:178-196`).
  - Translations: names are translated under context id = type id, type "Relationship Type"; translating a type is done in Settings > Translations, not here.
  - Postgres: table `relationship_types` with RLS, schema delta `008` (`AI Contexts/Relationship Types/relationship-types-postgres.md:15-26, 221-277`); name is a label, uniqueness stays application-level, case-insensitive and trimmed (no DB unique index); sync namespace and HTTP path stay `relationtypes`; translations stay in the translations store; the flag flip is one way after any Postgres write; open items in that doc: run the name-collision audit on real tenants, and exercise sync manually. Code selects the backend with `postgresCore`, not `postgresRelationshipTypes`.
  - `Keep temporary notify: true in relationship type controller error logs` is listed as an open item in the V2 doc (`relationship-types-v2-migration.md:149`).

---

### Languages

- **Route / file**: `/settings/languages` `app/react/Routes.tsx:465-469`; loader and component both in `R/Languages/LanguagesList.tsx` (`languagesListLoader` lines 31-34 -> `I18NApi.getLanguages` -> `GET /api/languages`; `LanguagesList` line 37). Parts: `R/Languages/toTableLanguages.ts`, `components/TableComponents.tsx`, `components/InstallLanguagesModal.tsx`.
- **Who can see it**: UI admin only. Server: `GET /api/languages` public (`EXP/translation/routes.ts:40-42`); `POST /api/translations/languages`, `DELETE /api/translations/languages`, `POST /api/translations/setasdeafult` (sic), `POST /api/translations/populate` all `needsAuthorization()` = admin (`routes.ts:114-181`). No feature toggle. VERIFIED.
- **Layout**: header "Languages"; one `Table` with header "Active languages", default sort by label ascending; columns: "Language" (sortable, shows `<label> (<key>)`, e.g. "Spanish (es)"), then three sr-only-header action columns (default, reset, uninstall); sticky footer with primary "Install Language(s)". The installed list comes from `settingsAtom.languages` (kept live by the `updateSettings` socket, `sockets.js:82-85`); the loader result is only used for labels and `translationAvailable` (`LanguagesList.tsx:38-48`, `toTableLanguages.ts:5-21`).
  - Default column: a star button on every row, `primary` fill when the row is the default, secondary otherwise; sr-only "Default" (`TableComponents.tsx:9-24`).
  - Reset column: ghost "Reset", shown only when a predefined UI translation file exists for the language (`translationAvailable`).
  - Uninstall column: ghost "Uninstall", hidden for the default language (`TableComponents.tsx:26-50`).
  - Install modal (size lg): title "Install Language(s)"; note "This action may take some time while we add the extra language to the entire collection."; searchable multiselect list (`MultiselectList`, 24rem tall) of every language not yet installed, row label `<label> (<key>)` prefixed with " * " when a default translation exists, search matches the English label; footer legend "* Available default translation"; buttons "Cancel" and "Install (N)" (disabled until at least one is ticked) (`components/InstallLanguagesModal.tsx:22-89`).
- **Fields**:

| Field | Type/control | Default | Validation | Help text | file:line |
|---|---|---|---|---|---|
| Languages to install | multiselect list with search | none selected | at least one (button disabled); server: array of `{key,label}` where `key` must be a valid ISO 639-1 code and `additionalProperties:false` | note quoted above | `InstallLanguagesModal.tsx:32-37, 60-66`; `EXP/translation/routes.ts:154-162`; `app/shared/types/commonSchemas.ts:240-260` |
| Confirmation word (Reset, Uninstall) | text input, label "Please type in" + `CONFIRM`; accept button stays disabled until the exact word (translated) is typed | empty | exact match | - | `LanguagesList.tsx:68-85`, `UI/ConfirmationModal.tsx:67-86` |
| Default language | star button (no form) | the language flagged `default` in settings | server: language must be installed | - | `LanguagesList.tsx:100-107` |

  The list of installable languages is `availableLanguages` (about 186 entries in `app/shared/language/availableLanguages.ts`) with `translationAvailable` computed from files in `contents/ui-translations/` (11 files at this version: ar, el, en, es, fr, ko, my, ru, th, tr, uk) (`CORE/application/translation/AvailableLanguagesQueryService.ts:9-22`, `app/api/i18n/defaultTranslations.ts:21-61`).
- **Actions**:

| Action | Client behaviour | Server call | Effect |
|---|---|---|---|
| Install Language(s) (footer) | opens modal | none | - |
| Install (N) (modal) | closes modal, sends `[{key,label}]` for selected languages; on success registers a "language-install" task labelled "Installing languages"; on error toast "An error occurred" + message | `POST /api/translations/languages` -> `AddLanguageController` (`EXP/language/AddLanguageController.ts:17-58`) -> `AddLanguageUseCase` (`CORE/application/AddLanguage.ts:23-63`) | One transaction: skips keys already installed; marks each new language `installing: true` in settings; clones every translation (all contexts) from the default language into the new language (`translationsDS.cloneForLanguage`, so text starts untranslated in the default language's wording); emits `LanguageAddedEvent` per language (a listener clones pages into the language, `app/api/pages.v2/infrastructure/listeners/AddLanguagePagesListener.ts:11-22`); queues `CloneLanguageEntitiesJob`; emits `SettingsChangedEvent` (broadcast over socket `updateSettings`, `CORE/infrastructure/listeners/BroadcastSettingsChanged.ts:27`). After the transaction, loads the predefined UI CSV into context `System` for that language if a file exists, silently skipping when none (`ImportPredefinedTranslationsService.ts:15-40`). Controller then emits `translationsChange` with the new language's translations and answers 204. The job (lock window 1 h) copies all entities from the default language to the new one, indexes them (`search.indexEntities({language})`), queues preview generation for documents with a ready file in that language, clears `installing`, then emits `translationsInstallDone` (`CORE/infrastructure/jobs/CloneLanguageEntitiesJob.ts:45-94`). On last-attempt failure it only clears `installing` and rethrows. Client reaction to `translationsInstallDone`: ends the task and shows "Languages installed successfully" (`sockets.js:139-147`). VERIFIED |
| Default (star) | `requestAction` with `{key}`; success toast "Default language change success" | `POST /api/translations/setasdeafult` body `{key}` -> `SetDefaultLanguageUseCase` (`CORE/application/SetDefaultLanguage.ts:23-35`) | sets `default` true on that language and false on the others in one settings update; emits `SettingsChangedEvent`; responds with the settings payload. No translation or entity change. The default language is the clone source for future installs and the reference for "untranslated" in the translation editor. 400 `Language not found: <key>` if not installed. VERIFIED |
| Reset (row) | opens confirmation (below); on accept `requestAction` with `{locale}`; success toast "Language reset success" | `POST /api/translations/populate` -> `PopulateTranslationsController` (`EXP/translation/PopulateTranslationsController.ts:8-24`) | reads `contents/ui-translations/<locale>.csv` and, for the `System` context only, overwrites existing keys with the CSV text when the CSV cell is non-empty (`app/api/csv/csvLoader.ts:61-125`); keys not already in the DB and keys in other contexts are untouched. 422 with `Predefined translation for locale <locale> is not available` if no file. No socket event is emitted on this path, so the admin's own translation cache and other sessions are not refreshed until reload. INFERRED from the controller and `loadTranslations` (no emit found) |
| Uninstall (row) | opens confirmation; on accept sends delete; on success registers task "language-uninstall" labelled "Uninstalling language"; on error toast "An error occurred" + message | `DELETE /api/translations/languages?key=<key>` -> `DeleteLanguageController` (`EXP/language/DeleteLanguageController.ts:14-58`) -> `DeleteLanguageUseCase` (`CORE/application/DeleteLanguage.ts:20-38`) | Controller first returns 409 `{error:'Language is still being installed or does not exist'}` if the language is missing or `installing`. Use case: refuses the default language (`Cannot delete the default language.`, 400); in one transaction removes the language from settings, deletes all its translations, emits `LanguageDeletedEvent` (pages listener removes the language's pages) and `SettingsChangedEvent`, and queues `DeleteLanguageEntitiesJob` (deletes the entities of that language and the Elasticsearch language index, then emits `translationsDeleteDone`, `CORE/infrastructure/jobs/DeleteLanguageEntitiesJob.ts:29-42`). Controller emits `translationsDelete` `<key>` immediately (removes the locale from the client store, `sockets.js:159-164`) and answers 204. Client toast on done: "Language uninstalled successfully". VERIFIED |
| Modal close X / Cancel / "No, cancel" | closes without a call | none | - |

- **Confirmations** (both built in `LanguagesList.tsx:68-85`, non-danger layout with a danger-colored accept button because a warning text is present):
  - Header "Are you sure?"; red alert "Other users will be affected by this action!"; body "You are about to reset a language." (Reset) or "You are about to uninstall a language." (Uninstall); text field "Please type in CONFIRM:"; buttons "No, cancel" and "Reset" / "Uninstall". The accept button is disabled until `CONFIRM` is typed. Result: Reset runs populate, Uninstall runs delete.
  - Setting the default language and installing have no confirmation beyond the install modal.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (cannot normally happen: at least the default language exists).
  - Toasts: "Default language change success", "Language reset success" (via `useApiCaller`, `app/react/V2/CustomHooks/useApiCaller.ts:18-48`); "An error occurred" with `prettyMessage` details on failure.
  - Task bar entries: "Installing languages", "Uninstalling language" (`notifyBridge.registerTask`, `app/react/V2/utils/notifyBridge.ts:36-56`); completion toasts "Languages installed successfully", "Language uninstalled successfully".
  - Error socket handlers exist for `translationsInstallError` ("An error has occurred while installing languages:") and `translationsDeleteError` ("An error has occurred while uninstalling a language:") (`sockets.js:149-157, 177-185`) but a grep of `app/` finds no server code that emits either event. So a failed install or uninstall job never ends its task or shows an error toast; the install job only clears `installing` on its last failed attempt. VERIFIED (absence of emit).
  - The table does not show an "installing" state. Clicking Uninstall on a language still installing returns 409 (shown as "An error occurred" with that message). VERIFIED (`LanguageLabel` renders only label and key).
- **Save model**: no form; each action is immediate after its confirmation or modal. No dirty guard needed.
- **V1 vs V2**: V1 page removed. Remaining V1 artifacts: `app/react/I18N/I18NApi.js` (still the client used by this page), Redux `actions/I18NActions.js` (`addLanguage`, `deleteLanguage`, `setDefaultLanguage`, `resetDefaultTranslations`; toasts "New language added", "Language deleted", "Translations reset successfully") re-exported by `app/react/I18N/index.ts:8`; nothing in the Settings route tree uses them. Backend `app/api/i18n` is reduced to `defaultTranslations.ts`; the language logic is in `CORE/application/AddLanguage.ts`, `DeleteLanguage.ts`, `SetDefaultLanguage.ts`. The language endpoints still live under `/api/translations/*`; there is no `/api/languages` write endpoint. VERIFIED.
- **Notes/gotchas**:
  - Endpoint typo `setasdeafult` is part of the stable contract.
  - `DELETE /api/translations/languages` declares its `key` validation at the top level of the request schema, not under `query`, so Express-level validation does not constrain the query; the controller's Zod `QuerySchema` (`key: string`) does (`routes.ts:169-181`, `DeleteLanguageController.ts:8-10`). INFERRED.
  - The delete status check lets `installing` languages be protected, but the install flag is cleared by the clone job, so a stuck job leaves a language that cannot be uninstalled until `installing` is cleared (ASSUMED recovery is manual).
  - Adding a language when `settings.languages` has no default throws `Default language needs to be defined.` (`CORE/domain/settings/errors.ts`).
  - Settings storage is a singleton document per tenant; Postgres table `settings` (schema delta `018`), `languages` stored as JSONB, `rowId` of the UI table = language `key` (`AI Contexts/Settings/settings-v2-and-postgres.md:12-34, 195-214`). The Settings doc mentions `SettingsSyncHandler` syncing only `{_id, languages}` outbound.
  - Menu and Filters translations are reconciled on every settings save, so the language count affects those contexts too (`CORE/application/settings/SettingsTranslationService.ts:57-140`).

---

### Translations

- **Route / file**:
  - `/settings/translations` (list) `app/react/Routes.tsx:469-475`; loader `translationsListLoader` and component `TranslationsList` in `R/Translations/TranslationsList.tsx:22-27, 27`; loader calls `GET /api/translations` (all languages, `app/react/V2/api/translations/index.ts:21-28`).
  - `/settings/translations/edit/:context` `Routes.tsx:476-481`; `EditTranslations` in `R/Translations/EditTranslations.tsx:187`; loader `editTranslationsLoader` (`EditTranslations.tsx:43-64`: `GET /api/translations?context=<id>` plus `GET /api/settings`), action `editTranslationsAction` (`EditTranslations.tsx:66-85`).
  - Helper components: `R/Translations/components/TableComponents.tsx`, `components/LanguagePill.tsx`.
  - There is no per-page route for editing a single language: one context at a time, all languages in the same table. The `:context` param is the translation context id (`System`, `Menu`, `Filters`, a template id, a thesaurus id, a relationship type id).
- **Who can see it**:
  - UI admin only.
  - Server: `GET /api/translations`, `GET /api/languages`, `GET /api/v2/translations` are public (no middleware) because the UI needs them for rendering (`EXP/translation/routes.ts:23-42, 183`); `POST /api/translations`, `POST /api/translations/import`, `POST /api/translations/populate`, `POST /api/v2/translations` use `needsAuthorization()` = admin (`routes.ts:44-217`). VERIFIED.
  - Machine translation endpoint (`POST /api/translationService`) is not used by this page; it requires roles admin/editor/collaborator and tenant feature flag `translationService` plus `featureFlags.translationServiceUrl` (`app/api/translationService/infrastructure/express/TranslationServiceRoutes.ts:6-13`, `.../TranslationServiceFactory.ts:7-9`). It posts to `<url>/translate?text=&language_from=&language_to=` with a 60 s timeout (`ExternalTranslationService.ts:11, 23-33, 49-60`). Its only UI callers are in the entity editor (`app/react/V2/Components/Metadata/EntityEditor/Components/*`). VERIFIED. For this page: machine translation = none found.
- **Layout**:
  - List: header "Translations"; two tables built from the first language's contexts, skipping contexts with no values (`TranslationsList.tsx:35-50`): "System translations" (contexts whose `type` is `Uwazi UI`: User Interface (`System`), `Menu`, `Filters`) and "Content translations" (every other type: `Entity` = templates, `Thesaurus`, `Relationship Type`). Columns: "Name" (context label, sortable), "Type" (gray pill with the raw type string passed through `Translate`), sr-only "Action" with a ghost "Translate" button linking to `edit/<id>`. Default sort label ascending. No footer.
  - Editor: header breadcrumb "Translations" > context label (translated under the context's own id, `app/react/V2/Components/Layouts/SettingsContent.tsx:31-47`). Body: a toggle "Untranslated Terms" (off by default); then one bordered table per key (the key text is the table caption), each with columns "Language" (autonym from `availableLanguages`), sr-only "Language Code" (pill with uppercase key; color: default language = primary, untranslated = yellow, translated = gray, `components/LanguagePill.tsx:11-15`) and "Value" (text input with clear-X). Tables are lazily rendered with `react-render-if-visible`. Keys are sorted with natural sort (`advancedSort`) (`EditTranslations.tsx:49-61`). Footer: left, ghost "Import" (only when `contextId === 'System'`); right, ghost "Cancel" (link to list) and primary "Save".
- **Fields**:

| Field | Type/control | Default | Validation | Help text / label copy | file:line |
|---|---|---|---|---|---|
| Value (one per key per language) | text `InputField`, hidden label, clear-X sets `''` and marks dirty | stored value; for a key never translated the value equals the default-language text | `required: true` on every registered field; message "This field is required"; no length or whitespace rule; server accepts any string (`values` is `additionalProperties:{type:'string'}`) | - | `EditTranslations.tsx:351-368`; `EXP/translation/routes.ts:80-112` |
| Untranslated Terms | `ToggleButton` | off | - | label "Untranslated Terms" | `EditTranslations.tsx:290-300` |
| CSV file (System only) | hidden `<input type="file" accept="text/csv">` | - | server-side (below) | button "Import" | `EditTranslations.tsx:393-411` |

  - "Untranslated" status for a row = value equals the default language's value for that key and the row is not the default language; "defaultLanguage" for the default language's rows; otherwise "translated" (`EditTranslations.tsx:126-140`). So an intentionally identical translation (a proper noun) still shows as untranslated.
  - With the toggle on, each key shows only its non-"translated" rows (default plus untranslated ones); a key where every non-default language is translated is removed; with only one installed language every key disappears (`EditTranslations.tsx:174-185`).
  - Search or filter by key text: none found. Only the Untranslated Terms toggle exists.
- **Actions**:

| Action | Client behaviour | Server call | Effect |
|---|---|---|---|
| Translate (row, list) | link to `edit/<context id>` | `GET /api/translations?context=<id>` (loader) | `EXP/translation/GetTranslationsController.ts:11-21` returns `{rows:[{locale, contexts:[{id,label,type,values}]}]}` for every installed language, restricted to the context |
| Untranslated Terms | local filter | none | see above |
| Clear-X in a value | sets the field to `''` (then fails `required` on Save) | none | `EditTranslations.tsx:356-358` |
| Save | RHF `handleSubmit`; builds one locale document per language (`{...locale, contexts:[{...context, values}]}`), posts it as form-data `intent=form-submit` to the route action, which sends one request per language in parallel (`Promise.all`) | `POST /api/translations` per language, body `{_id, locale, contexts:[{id,label,type,values}]}` (`app/react/V2/api/translations/index.ts:39-51`; `EXP/translation/SaveTranslationsController.ts:6-17`) -> `SaveLocaleTranslationsUseCase` (`CORE/application/SaveLocaleTranslations.ts:23-76`) | per language, in its own transaction: loads the current rows for the context, resolves context type/label (throws `Cannot save translations for context "<id>" without type and label` if unknown), flattens to entries, `saveEntries` splits into new keys (inserted, validated that the key will exist in all installed languages) and existing keys (upserted; error `Process is trying to update missing translation keys: <ctx> - <keys>` for unknown keys) (`CORE/application/translation/TranslationsService.ts:27-107`). Languages not installed are rejected (`LanguageDoesNotExist`). For `Thesaurus` contexts it then finds thesaurus values whose label's translation changed and queues entity denormalization for them (`CORE/application/translation/PropagateThesaurusTranslationService.ts:43-96`), so entity metadata labels in that language are rebuilt asynchronously and reindexed. Controller emits socket `translationsChange` with the whole locale document (all contexts) and returns it. The UI's key set is fixed by the loader; the page can neither add nor delete keys |
| Import (System only) | file chosen -> form-data `intent=file-upload`; action calls `importTranslations(file, 'System')` | `POST /api/translations/import` multipart with `context=System` (`app/react/V2/api/translations/index.ts:71-92`; `EXP/translation/routes.ts:44-78`) | `CSVLoader.loadTranslations` (`app/api/csv/csvLoader.ts:61-125`): CSV needs a `Key` column and one column per language named by its English label (e.g. `Spanish`); only installed languages present in the file are processed; only keys that already exist in the context and whose CSV cell is non-empty are patched; each language saved through `SaveLocaleTranslationsUseCase`. Emits `translationsChange` per language (`routes.ts:70-72`) |
| Cancel | link to list; dirty guard applies | none | - |
| Export CSV | none found | - | no export endpoint or button (the predefined CSVs in `contents/ui-translations/` are developer-maintained) |
| Reset to default | none on this page. The equivalent action is "Reset" on the Languages page (System context only) | `POST /api/translations/populate` | see Languages |
| Live translate (outside this page) | in the header language menu, admin only, switches every `Translate` into a click target; a modal "Translate" edits one key across all languages | `GET /api/translations?context=`, `POST /api/v2/translations` (array of `{language,key,value,context{id,label,type}}`) (`app/react/I18N/TranslateModal.tsx:27-113`, `EXP/translation/SaveTranslationEntriesController.ts:13-23`) | emits `translationKeysChange`; toast "Translations saved"; same thesaurus propagation (`CORE/application/SaveTranslationEntries.ts`) |

- **Confirmations**: only the unsaved-changes dialog on leaving the editor with edits: header "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" / "Discard changes" (`EditTranslations.tsx:425-427`, `UI/ConfirmNavigationModal.tsx`). Import has no confirmation and does not check the dirty state.
- **Empty / loading / error / notification states**:
  - List: empty table text "NO DATA AVAILABLE" per table.
  - Editor with nothing to show (no terms, or the Untranslated toggle leaves none): info box "There are no untranslated terms" (the same text is used when a context has no keys at all) (`EditTranslations.tsx:379-386`).
  - Toasts: "Translations saved" (form submit), "Translations imported." (file upload), error "An error occurred" with `prettyMessage` details when the action returns a `FetchResponseError` (`EditTranslations.tsx:228-251`). The success toast is raised from `fetcher.formData` (when the submission starts), not when the server answers, so a failure after the success toast shows both. INFERRED from the effect dependencies and cases.
  - Inputs and buttons are disabled while `fetcher.state === 'submitting'`.
  - Field error: "This field is required".
  - Server error text for Import: CSV validation errors from `loadTranslations`/`validateFormat` (not enumerated).
- **Save model**: one Save button for the whole context (all keys, all languages) as N parallel per-language requests; not atomic across languages (each request has its own transaction), so a partial save is possible if one language fails. VERIFIED from `post` using `Promise.all` and one transaction per `SaveLocaleTranslationsUseCase`. Dirty guard: `useBlocker(isDirty && !formIsSubmitting)` (`EditTranslations.tsx:219-226`); no `beforeunload`. After save the loader revalidates and the form is reset to server values (`EditTranslations.tsx:253-260`). Stays on the page.
- **V1 vs V2**: V1 UI removed; the page still talks to the legacy "mammoth" API shape (`GET/POST /api/translations`, one document per locale) through `I18NApi`, while the by-item endpoints `GET/POST /api/v2/translations` serve only the inline modal (`AI Contexts/Translations/translations-v2-migration.md:61-135`). Remaining V1: `app/react/I18N/reducer.js`, `inlineEditReducer.js`, `actions/I18NActions.js`, `actions/translationsFormActions.ts` (Redux, `translationsForm`), `components/I18N.jsx`, `components/I18NLink.tsx`, `components/I18NMenu.tsx`. `app/api/i18n` now contains only `defaultTranslations.ts`; there is no `i18n.v2`. The `translationsV2` Mongo collection (one doc per `{language,key,context}`) is the store (`AI Contexts/Translations/translations-v2-migration.md:73-79`); Postgres table `translations` (delta `015`), flag `postgresCore` in code. VERIFIED.
- **Notes/gotchas**:
  - Context types (`CORE/domain/translation/Translation.ts:3`): `Entity` (one per template; keys = template name, title label and each property label; `CORE/application/templateTranslationService/TemplateTranslationService.ts:11-65`), `Thesaurus` (keys = thesaurus name and every value label), `Relationship Type` (key = name), `Uwazi UI` (contexts `System` labelled "User Interface", `Menu` (menu link titles), `Filters` (filter group names) (`CORE/application/settings/SettingsTranslationService.ts:57-140`)). The legacy DTO reports `System`, `Filters`, `Menu` as `Uwazi UI` regardless of stored type (`CORE/application/translation/TranslationsQueryService.ts:10-15`). The list uses `type === 'Uwazi UI'` to split the two tables.
  - How keys are produced: `Translate` (`app/react/I18N/Translate.tsx:42-61`) and `t(contextId, key, text, false)` (`translateFunction.tsx:18-46`) look up `values[translationKey || children]` in the active locale and context (default context `System`) and fall back to the children text; they never create a key. System keys come from the repository: `contents/ui-translations/<locale>.csv` loaded by `yarn update-translations-db` (`scripts/updateTranslationsDB.js:46-120`: inserts missing keys, updates rows whose value still equals the key when the CSV differs, deletes rows not in the CSV; context `{type:'Uwazi UI', label:'User Interface', id:'System'}`) and by per-release tenant migrations `*-add_system_key_translations` (42 migration folders match). `yarn check-translations` compares code strings to the DB (`scripts/checkTranslations.mjs`). A string added in code without a CSV row and migration appears in English everywhere and never in this page. VERIFIED. Content contexts are created by the template, thesaurus, relationship type and settings use cases described in the other sections.
  - "Reset" semantic: see Languages. It writes only existing System keys with non-empty CSV text, so it overwrites custom System translations for that language.
  - Search per key: none found. The editor renders one table per key; for large contexts (System has hundreds of keys) the page relies on `RenderIfVisible`.
  - `GET /api/translations` always returns every installed language, so the list page reads contexts from `translations[0]`; if the first language lacks a context the context is hidden from the list (INFERRED from `TranslationsList.tsx:35`).
  - Language labels in the editor come from the client-side `availableLanguages` list, not from settings (`EditTranslations.tsx:113-116`).
  - Postgres notes for translations: `AI Contexts/Translations/translations-postgres.md:9-35`: by-item table with unique key (tenant, language, key, context id); AddLanguage mixed-store runs under one Mongo transaction with a streamed Postgres clone in batches of 500; `207-backfill-translation-context` makes `context.type` and `context.label` mandatory on writes; sync handler `PostgresTranslationsSyncHandler`, sync namespace `translationsV2`; open: sync not manually exercised.

---

## Part 5: Metadata extraction (IX), Paragraph extraction (PX), New Relationships Migration, feature toggles

Source: huridocs/uwazi `production`, v1.229.224 (`package.json:4`), local shallow clone `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All paths below are repo-relative to that clone. Code was read, not run. "VERIFIED" = read in the cited lines. "ASSUMED" = inferred, not confirmed by running the app or by reading every caller.

Abbreviations for paths: `IX/` = `app/react/V2/Routes/Settings/IX/`, `PX/` = `app/react/V2/Routes/Settings/ParagraphExtraction/`.

## 0. Shared mechanics (apply to every page below)

| Topic | Fact | Evidence |
|---|---|---|
| Settings shell | All `/settings/*` routes sit under `loggedInUsersRoute(<Settings/>)`: any logged-in user passes; each child adds its own guard. | `app/react/Routes.tsx:324`, `app/react/ProtectedRoute.tsx:33` |
| Guard behaviour | `ProtectedRoute allowedRoles={['admin','editor']}` renders children only if the Redux user role is in the list; otherwise `<Navigate to="/login" replace/>`. `adminsOnlyRoute` is the same with `['admin']`. | `app/react/ProtectedRoute.tsx:6-27` |
| Page chrome | Every page uses `SettingsContent` (Header with breadcrumb, Body, sticky Footer). Footer turns tinted (`highlighted`) while rows are selected. Header shows a back chevron below `lg`. | `app/react/V2/Components/Layouts/SettingsContent.tsx:22-113` |
| Notifications | `useRequestStatus().notify(type, title, message?, details?)` appends to the notifications log (header Beacon). The Beacon flashes the newest item for 3.2 s then 0.42 s leave animation, and the notifications panel keeps the log. Types: success, warning, error, info. | `app/react/V2/atoms/requestStatusAtom.ts:144-154`, `app/react/V2/Components/UI/Notifications/RequestStatus.tsx:56-76` |
| Tasks | `registerTask(id,label,setupListeners)` adds a running task with optional progress to the same panel; `fail(details)` keeps the reason. | `requestStatusAtom.ts:124-163` |
| Error toasts, double path | The legacy `api` util (used by all V2 API wrappers here) dispatches its own Redux `notify` toast for 400/422 (validation text), 409 (warning with `error.json.error`), 500, and redirects on 401/404, before the caller's `catch` runs. Callers that then call `handleUnexpectedError` add a second notification "An error occurred" + details. Whether the two toast systems render separately was not run: ASSUMED. | `app/react/utils/api.js:71-131,134-146`; `app/react/V2/shared/errorUtils.tsx:74-79` |
| Status mapping of domain errors | `PXValidationError`, `IXValidationError`, `NonRetryableJobError` answer 422; other `DomainError` 400; `ModelNotReadyError` 409; `SuggestionAcceptanceError` 422. | `app/api/utils/handleError.js:98-103,142-144,165-167,174-176` |
| Confirmation modal defaults | `ConfirmationModal`: default buttons "Cancel" / "Accept". With `dangerStyle` it renders a red-tinted modal with warning icon; without `dangerStyle` and with `warningText` the Accept button is still `variant="danger"`; without `warningText` it is primary. | `app/react/V2/Components/UI/ConfirmationModal.tsx:110-205` |
| Table empty text | Default `Table` empty state is "NO DATA AVAILABLE". | `app/react/V2/Components/UI/Table/DefaultNoDataMessage.tsx:4-8`, `Table.tsx:81` |
| Sidepanel close | `Sidepanel` closes on Escape and on overlay click; none of the sidepanels below has a dirty guard (VERIFIED for IX and PX sidepanels: `closeSidepanelFunction` goes straight to a state reset). | `app/react/V2/Components/UI/Sidepanel.tsx:41,120-127,160-162,226` |
| Socket rooms | IX and PX status events go to room `<tenant>:admins_editors` via `emitToTenantAdminsAndEditors`. | `app/api/socketio/setupSockets.ts:74-81` |
| External services | The worker (queue result listeners for IX `information_extractor` and PX `px_paragraphs_results`) is imported only when `config.externalServices` (env `EXTERNAL_SERVICES=true`). The task manager polls Redis (RSMQ) every 500 ms. | `app/server.js:140-142`, `app/worker.ts:46-47`, `app/api/services/tasksmanager/TaskManager.ts:96-103` |

---

## 1. Metadata extraction (IX)

### 1a. Metadata extraction: extractors dashboard

- **Route / file**: `/settings/metadata_extraction` (index). Route `app/react/Routes.tsx:394-404`; component `IXDashboard` `IX/IXDashboard.tsx:69-190`; loader `IXdashboardLoader` `IX/IXDashboard.tsx:192-199` (GET extractors, then all templates). Extractor create/edit modal: `IX/components/ExtractorModal.tsx:123-299`. Table columns: `IX/components/TableElements.tsx:329-355`.
- **Who can see it**:
  - Route guard `ProtectedRoute allowedRoles={['admin','editor']}` (`Routes.tsx:396-400`).
  - Nav link only shows inside `NeedAuthorization roles={['admin','editor']}` and `FeatureToggle feature="metadata-extraction"` (`app/react/V2/Routes/Settings/SettingsNavigation.tsx:65-73`). The route itself has no feature check.
  - Every `/api/ixextractors` handler runs `serviceMiddleware` first (404 `{}` unless `settings.features.metadataExtraction.url` is set), then `needsAuthorization(['admin','editor'])` (`app/api/suggestions/serviceMiddleware.ts:4-13`, `app/api/suggestions/extractorsRoutes.ts:11-140`). Order matters: an unconfigured instance answers 404 before auth.
  - Two different feature keys are involved; see section 4. ASSUMED consequence (VERIFIED code path, not run): for an `editor` the nav link is not rendered, because `settings.features` is only sent to admins (`app/api/core/application/settings/SettingsQueryService.ts:27-29`, `publicSettings.ts:37-46`) and `metadata-extraction` is read from `settings.features` (`FeatureToggle.tsx:14-17`).
- **Layout**: Header title "Metadata extraction" (no breadcrumb path). Body: `Table` with header text "Extractors", row selection checkboxes, default sort by `name` ascending (`IXDashboard.tsx:123-136`). Columns: "Extractor Name", "Property" (type icon + property label), "Source" ("PDF", "Title" or the source property label), "Template(s)" (gray pills, not sortable), then an unlabeled action column (sr-only "Action") with a secondary "Review" button that links to `suggestions/<extractorId>` (`TableElements.tsx:73-77,229-235,329-355`). Sticky footer: buttons depending on selection (below).
- **Fields** (create/edit modal, 2 steps, `size="xxl"`; header "Add Extractor" or "Edit Extractor" `ExtractorModal.tsx:194-196`):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Extractor name | `InputField` text `id=extractor-name` | extractor name when editing, else empty | Required: empty string on submit sets error style, no message text. No uniqueness check client or server (`Extractors.create` only runs `extractorValidityCheck`). | placeholder "Extractor name" | `ExtractorModal.tsx:134,157-161,201-211`; `app/api/services/informationextraction/ixextractors.ts:182-193` |
| Properties by template (step 1) | `MultiselectList`, checkboxes, foldable groups per template, search, "select all" when something is selected | when editing: one `<templateId>-<property>` per template | At least one value (Next disabled when empty). After the first pick only the same-named property of other templates stays listed. Listed properties: types text, numeric, date, select, multiselect, relationship, markdown, plus "Title" per template. Each row shows icon, label (translated in the template context) and "(type)" lowercase. | none (list only) | `ExtractorModal.tsx:19-27,61-94,213-224,277` |
| Input (step 2, read only) | label + property row | first selected property | n/a | "Input" | `ExtractorModal.tsx:227-230` |
| Selected templates (step 2, read only) | gray pills | selected templates | n/a | "Selected templates" | `ExtractorModal.tsx:231-244` |
| Common sources (step 2) | `RadioSelect` | PDF (value `0`) unless editing a property-source extractor | Options: "PDF"; "Title"; plus every text/markdown property present in all selected templates; the target property itself is removed. If the saved choice disappears from the list it falls back to PDF. | "Common sources" | `ExtractorModal.tsx:145,245-259`; `IX/helpers/helpers.ts:90-165` |

  Server validation on POST and PUT: body requires `name`, `property`, `source`, `templates`; PUT also `_id` (`extractorsRoutes.ts:19-36,57-74`). `extractorValidityCheck`: at least one template; each template exists; property exists in each template and its type is in `ALLOWED_PROPERTY_TYPES` (title, text, numeric, date, select, multiselect, relationship, markdown); source is `pdf` or an existing property of each template. Failures are `IXValidationError` with codes `TEMPLATE_MISSING`, `TEMPLATES_REQUIRED`, `PROPERTY_MISSING`, `PROPERTY_TYPE_NOT_ALLOWED`, `SOURCE_REQUIRED` and English messages such as "an extractor must target at least one template", answered 422 (`ixextractors.ts:32-41,57-126`, `IXValidationError.ts:1-7`).
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| "Create Extractor" (footer, shown when nothing is selected) | opens modal empty (`IXDashboard.tsx:156-158`) | on Create: `POST /api/ixextractors` (`IX/../api/ix/extractors.ts:26-37`; handler `extractorsRoutes.ts:11-47`) -> `Extractors.create`: inserts extractor, then `createBlankSuggestionsForExtractor` (blank suggestion rows per entity of the templates, created in batched queue jobs `CreateBlankStateSuggestionsJob`) (`ixextractors.ts:182-193`, `app/api/suggestions/blankSuggestions.ts:26-60`) |
| "Edit Extractor" (footer, only when exactly 1 row selected) | opens the modal with `selected[0]` (`IXDashboard.tsx:140-144`) | on Update: `PUT /api/ixextractors`. If `property` changed: deletes all suggestions of the extractor and recreates blank ones. Otherwise diffs templates: removed templates delete their suggestions, added templates create blank ones. A rename alone touches no suggestions (`ixextractors.ts:128-157,194-215`) |
| "Delete" (footer, when 1 or more rows selected; replaces "Create Extractor") | opens confirmation (below) | `DELETE /api/ixextractors?ids[]=...` -> `Extractors.delete`: 400 `MissingExtractorError` ("Missing extractor.") if any id is unknown; deletes the extractor documents and `Suggestions.deleteByExtractorIds`. The model document is not touched in this function (`ixextractors.ts:159-163,175-181`) |
| "Next" / "Back" / "Cancel" / "Create" / "Update" (modal footer) | step 1: "Cancel" (ghost) + "Next" with arrow, disabled with no selection; step 2: "Back" + "Create" or "Update" (success variant) (`ExtractorModal.tsx:272-293`) | see rows above |
| Modal close button (X) | `setShowModal(false)` | none |
| "Review" (row) | router `Link` to `suggestions/<id>` | none |
| Row checkboxes | `onSelect` stores selected rows (`IXDashboard.tsx:132-134`) | none |

- **Confirmations**: Delete: `ConfirmationModal` with `header="Delete extractors"`, `warningText="Do you want to delete the following items?"`, body = bulleted list of extractor names, `dangerStyle`, buttons "Cancel" / "Accept" (defaults). Accept calls delete, then closes and clears selection (`IXDashboard.tsx:163-177`; list `IX/components/List.tsx:4-10`). Result: success notification below.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (no custom `noDataMessage`).
  - Save success: notify success "Saved successfully." (`IXDashboard.tsx:107`). Delete success: "Extractor/s deleted" (`:93`).
  - Errors: `handleUnexpectedError(error, 'Error saving extractor')` / `'Error deleting extractors'` produce notify error "An error occurred" with details from `json.prettyMessage` or `json.error` (`errorUtils.tsx:74-79`). The `key` string is sent to Sentry, not shown.
  - Gotcha (VERIFIED): `handleSave` calls `setExtractorModal(false)` after the try/catch/finally, so the modal closes on failure too, losing the user's input (`IXDashboard.tsx:101-115`).
  - Gotcha (VERIFIED): `extractorsAPI.get` catches errors and returns the error object instead of throwing (`app/react/V2/api/ix/extractors.ts:6-14`), so a failed loader passes a non-array to `formatExtractors`.
  - Buttons are disabled while `isSaving`.
- **Save model**: Modal with explicit Create/Update; no autosave; no dirty guard (Cancel and X discard). After save: `revalidator.revalidate()` reloads loader data, notification, modal closes.
- **V1 vs V2**: V1 removed (no `app/react/MetadataExtraction`; no V1 route). Orphan stylesheet `app/react/App/scss/modules/_metadata-extraction.scss` (`.metadata-extraction-table`) is still imported at `app/react/App/scss/styles.scss:55`.
- **Notes/gotchas**:
  - Extractor `source` is `{pdf:true}` or `{property:<name>}`. Property-source extractors read text from another property and show a text panel instead of a PDF.
  - Select/multiselect/relationship properties are extracted from the same source text; relationship extractors store `inheritedProperty` on the loaded extractor (suggestions loader `IXSuggestions.tsx:557-576`).
  - The modal builds `value = "<templateId>-<propertyName>"` and splits on the first `-` (`IX/helpers/sidepanelFunctions.ts:115-119`); this works because ObjectIds contain no hyphen.

### 1b. Metadata extraction: suggestions for one extractor

- **Route / file**: `/settings/metadata_extraction/suggestions/:extractorId` (`Routes.tsx:404-411`). Component `IXSuggestions` `IX/IXSuggestions.tsx:74-504`; loader `IXSuggestionsLoader` `:506-588`. Query params used: `page`, `sort` (JSON `{property,order}`), `filter` (JSON of the 9 filter flags) (`:63-72,276-298,512-533`; `IX/components/FiltersSidepanel.tsx:52-86`). Sub-components: `TrainModelModal.tsx`, `ProcessExtractorModal.tsx`, `FiltersSidepanel.tsx`, `sidepanel/PDFSidepanel.tsx`, `sidepanel/PropertySidepanel.tsx`, `sidepanel/SidepanelForms.tsx`, `TableElements.tsx`, `SuggestedValue.tsx`, `ContextCell.tsx`.
- **Who can see it**: same as 1a (route `Routes.tsx:407-410`). Server: all endpoints below use `serviceMiddleware` then `needsAuthorization(['admin','editor'])` (`app/api/suggestions/routes.ts:41-255`).
- **Layout** (top to bottom):
  1. Header: breadcrumb "Metadata extraction" (link to the dashboard) > extractor name (`IXSuggestions.tsx:334-337`).
  2. Table header (`SuggestionsTitle`): round icon for the property type, property label (template context), italic "for", gray pill per template (`IX/components/SuggestionsTitle.tsx:14-72`). Right side: ghost button "Stats & Filters" with funnel icon (accent colour when filters are active) and a numeric badge of active filters (`IXSuggestions.tsx:362-374`).
  3. Rows (100 per page, `SUGGESTIONS_PER_PAGE`, `:51`). Columns: "Name" (entity title + `(language)`, link `/entity/<sharedId>` in a new tab, `TableElements.tsx:257-263`), "Context" (segment text with highlighted match, or amber "No context", hidden on parent rows, `:265-280`), "Current Value/Suggestion" (two lines: current value muted, suggested value green if equal else amber; obsolete shows italic "(obsolete) <value>"; error shows red "Error"; multi-value parents show "N values | N suggestions | N matching | N mismatching", `TableElements.tsx:98-171`, `SuggestedValue.tsx:84-126`), "Use for training" (icon toggle button, sr-only "Add to training set" / "Remove from training set", `:282-327`), an Accept column (sr-only "Accept"), and an action column (sr-only "Action", button "Open"). Multiselect and relationship properties render one parent row plus one child row per value (`IX/helpers/helpers.ts:15-80`, `IXSuggestions.tsx:309-319`), and child rows carry their own Accept button.
  4. Table footer: "Showing a-b of N" and paginator (`:375-396`).
  5. Sticky footer bar (`:400-457`): "Train model" (primary, small) or, while a run is active, "Cancel" (secondary); "Process extractor" (or "Process selected" when rows are selected), disabled unless status is `ready`; run status text; and, when rows are selected, "Selected <n> of 100". The bar is tinted while rows are selected.
  6. Overlays: filters sidepanel, property sidepanel, PDF sidepanel, train modal, process modal (`:460-501`).
- **Fields**:

Train model modal (`IX/components/TrainModelModal.tsx`):

| Field | Control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Training sample | `RadioSelect` `find.samplePolicy` | `only_marked` | none | label "Training sample :" with tooltip "Choose which data to use for training :" and two bullets "Marked for training only: Uses only entries you marked as "Use for training", including those with empty values" / "Marked for training + all labeled entries: Includes entries marked for training plus any other entries that have values"; options "Marked for training only" (`only_marked`), "Marked for training + all labeled entries" (`marked_plus_labeled`) | `:59-111` |
| Find suggestions after training | `Checkbox` `find.shouldFind` | unchecked | none | "Find suggestions after training" | `:115-125` |
| Amount | number `InputField` `find.amount` | 1000, disabled unless the checkbox is on | none in UI; server `suggestionsToFind` number >= 0; client sends 0 when unchecked or amount <= 0 | "Amount :" | `:32,36,126-146`; `routes.ts:146` |
| Info banner | static | n/a | n/a | "Training machine learning models may take from minutes up to a couple of hours depending on the amount of labeled data and the difficulty of the task." | `:50-55` |

Process modal (`IX/components/ProcessExtractorModal.tsx`; header "Process extractor" or "Process selected" `:341-345`):

| Field | Control | Default | Validation / dependencies | Copy | file:line |
|---|---|---|---|---|---|
| Find suggestions | `Checkbox` `shouldFind` | checked | forced false when none of the three filters is checked (`:46-51`). In selected mode the box is fixed checked and read only | "Find suggestions for" / "Find suggestions for selected" | `:57-68,218-229` |
| Amount | number `amount` | 1000 | `min: 1` rule sets error style, no message; disabled unless Find is on | "Amount :" | `:69-89,301` |
| Filters | 3 checkboxes `filters.nonProcessed/obsolete/error` | all checked; disabled unless Find is on | at least one needed to keep Find on | "Non processed", "Obsolete", "Error" | `:92-137,300` |
| Auto-accept | `Checkbox` `shouldAccept` | unchecked | n/a | "Auto-accept suggestions" | `:141-152` |
| Accept source | `RadioSelect` `acceptFor` | `previous` | "From previous step" disabled unless Find and Auto-accept are on and amount >= 1; "From all suggestions" disabled unless Auto-accept is on. Selected mode shows only "From previous step" | "From previous step", "From all suggestions" | `:154-178,245-263` |
| Overwrite | `RadioSelect` `overwrite` | `blank_only` | disabled unless Auto-accept is on | "For entities with blank values", "For all entities" | `:180-203,265-288` |

  The "Process" submit is disabled while submitting or when both Find and Auto-accept are off (`:367-374`). Server schema: `mode` in `process_extractor|process_selected`; `find.size` coerced int 0 or more, default 1000; with `process_extractor` and Find enabled at least one filter is required, otherwise 422 "At least one filter must be selected when Find is enabled." (`app/api/suggestions/adapters/ProcessSuggestionsController.ts:16-64`, `contracts/ProcessSuggestionsContracts.ts`).

Filters sidepanel (`FiltersSidepanel.tsx`): title "Stats & Filters" (rendered uppercase). Cards and checkboxes, each with a dotted leader and a count from `/api/suggestions/aggregation` (counts do not change with active filters): "All data": "Labeled", "Non-labeled", "Use for training"; "Status": "Non processed", "Obsolete", "Error"; "Processed": "Match", "Mismatch", "No context"; "Statistics": "Accuracy" with an info tooltip "Accuracy is defined by the amount of matches vs mismatches for labeled samples that have been processed." and value `<n>%` (`:99-232`, `IX/components/Tooltip.tsx:13-16`). Selected flags combine with OR (`app/api/suggestions/infrastructure/MongoIXSuggestionsTableQueryService.ts:28-62`). Semantics: Labeled = `state.labeled`; Non processed = no `date`; Obsolete/Error = dated and flagged; Match/Mismatch/No context apply only to dated, non-obsolete, non-error rows.

Entity sidepanels (`PDFSidepanel.tsx`, `PropertySidepanel.tsx`): see Actions.
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| "Accept" (per row; per child row for multi-value) | marks row id green in `acceptedSuggestions` atom, calls accept with `formatAccepted` (adds `addedValues`/`removedValues` for child rows), clears selection, notify info "Suggestions sent" (`TableElements.tsx:173-217`, `IXSuggestions.tsx:124-140`, `IX/helpers/helpers.ts:178-231`). Disabled when the row is red (no suggestion), has no entity, is obsolete or errored | `POST /api/suggestions/accept` body `{suggestions:[{_id,sharedId,entityId,addedValues?,removedValues?}]}`. Answers 202 `{success:true}` at once; `Suggestions.accept` runs in the background and the session socket gets `ACCEPT_SUGGESTION_SUCCESS` or `ACCEPT_SUGGESTION_ERROR(message)` (`routes.ts:203-255`). Effect: writes the value into the entity in every language for numeric/date/select/multiselect (one language otherwise) and writes the file `propertySelections` for text-like properties; rejects mixed extractors, unknown ids, rows with an error, and partial values on non-multi properties (`app/api/suggestions/suggestions.ts:181-203,36-90,96-122`) |
| Use-for-training toggle (per row) | calls `markForTraining([id], !current)`, then revalidates; button disabled while loading | `POST /api/suggestions/training-set` `{extractorId, suggestionIds, useForTraining}`; only ids owned by the extractor are updated; responds `{updated, useForTraining}` (`adapters/TrainingSetController.ts`, `application/MarkSuggestionsUseForTrainingUseCase.ts:15-28`) |
| "Open" (per row) | opens the PDF sidepanel for PDF-source extractors, otherwise the property sidepanel; disabled without an entity (`IXSuggestions.tsx:265-269`, `TableElements.tsx:237-255`) | on save see sidepanel rows below |
| "Stats & Filters" | opens filters sidepanel | none |
| "Clear all" (filters) | deletes `filter` param, closes, resets form | none (URL change reruns loader: `GET /api/suggestions/`) |
| "Apply" (filters) | sets `filter` JSON and `page=1`, closes | `GET /api/suggestions/?filter[extractorId]&filter[customFilter]&page&sort` returns `{suggestions,totalPages,total}` (page size max 500, `routes.ts:41-89`) |
| Column header sort | updates `sort` param; sorting is server side (`manualSorting`) | same GET |
| "Train model" (disabled while rows are selected) | opens train modal; "Train" calls `suggestionsAPI.findSuggestions`, registers a Beacon task "Training model: <name>", sets status `sending_labeled_data` (`IXSuggestions.tsx:142-176`) | `POST /api/suggestions/train` `{extractorId, suggestionsToFind, options:{samplePolicy}}`. `ixmodels.startTraining` claims the model (409 `ModelNotReadyError`, "Model for extractor with ID <id> is not ready." if a run is in flight), stores `samplePolicy`, emits `ix_model_status processing_model`, dispatches queue job `IXTrainModelJob` (lock window 20 min). Responds 202 `{status:'processing_model', message:'Training model'}` (`routes.ts:133-176`; `InformationExtraction.ts:835-861`; `ixmodels.ts:63-74`; `TrainModelJob.ts:33-98`) |
| "Cancel" (replaces "Train model" while status is not `ready`) | `cancelModelTrain`: status becomes `cancel` ("Canceling...") or `ready` if it was in `error`; revalidates; clears accepted set (`:178-193`) | `POST /api/suggestions/stop`: marks model ready, clears the run configuration, marks in-flight suggestions obsolete. The external service cannot be called back, so late results are discarded (`InformationExtraction.ts:940-951,1015-1027`) |
| "Process extractor" / "Process selected" | opens process modal; "Process" calls `processExtractor`, registers a task, shows "Finding suggestions..." with `processed / total` (`:195-254`) | `POST /api/suggestions/process`. Requires a model with status `ready`; if no model exists or it is busy: 409 `ModelNotReadyError`. Stores `processRun` on the model, optionally limits to selected shared ids, computes the total, sends batches (50 PDFs or 1000 property texts) to the external service and starts the results task; with auto-accept dispatches `AcceptSuggestionsJob` in batches after the find phase (`ProcessSuggestions.ts:70-175`; `InformationExtraction.ts:790-810`; `AcceptSuggestionsUseCase.ts`, `jobs/AcceptSuggestionsJob.ts`) |
| Sidepanel "Accept" (PDF / property sidepanel) | see Save model | entity update + optional training-set flag |
| Sidepanel "Clear" | removes highlight and, in the PDF panel, the stored selection for the property | none until Accept |
| Sidepanel "Click to fill" (text, date, numeric, markdown) | copies the selected text into the field; date/numeric are coerced locally with `parseLocalizedDate`, falling back to the API; sets "Use for training" automatically once the field is dirty (`PDFSidepanel.tsx:118-122,156-186`, `sidepanelFunctions.ts:93-113`) | coercion fallback: entities API `coerceValue` |
| "Select & Search" toggle (select, multiselect, relationship) | when on, selected PDF text fills the list search box (`SidepanelForms.tsx:76-81,143-161`) | relationship lists search entities with a Lucene query (`:206-229,268-313`) |

- **Confirmations**: none (no confirm for Accept, Train, Process, Cancel).
- **Empty / loading / error / notification states** (exact copy):
  - Run status in the footer (`ixmessages`, `IXSuggestions.tsx:53-61`): `ready` -> nothing shown (buttons "Train model"/"Process extractor" enabled); `sending_labeled_data` "Sending labeled data..."; `processing_model` "Training model..."; `processing_suggestions` "Finding suggestions..." + `processed / total`; `processing_auto_accept` "Accepting suggestions..." (+ count); `cancel` "Canceling..."; `error` "Error" plus " : <message>".
  - Notifications: "Suggestions sent" (info), "Suggestions updated" (success, on socket success), "An error occurred" with the server message (error, on socket error, on `ix:error_training_model`, and on a `ready` status flagged `{error:true}`, `IX/hooks/useEventHandler.ts:57-82`). Sidepanel save: "Saved successfully." (success) or "An error occurred" + `prettyMessage`.
  - Task panel entries: "Training model: <name>", "Finding suggestions: <name>" with percent, "Accepting suggestions: <name>"; ends complete on `ready`, fails with the message on error (`IX/taskProgress.ts:26-102`).
  - Row-level copy: "Error", "No context", "(obsolete)", "No value" (property panel with no text), "values", "suggestions", "matching", "mismatching". Sidepanel field errors: "This field is required" (sr-only), "Value cannot be transformed to the correct type", "Could not detect the area for the selected text" (`SidepanelForms.tsx:431-434`, `PDFSidepanel.tsx:176,211`).
  - Server error texts surfaced via the `error` event: "There are no Segments for training the model", "There are no labeled Files for training the model", "There are not Entities for training the model", "Documents are not segmented yet. Try again once PDF segmentation has finished." (`ixMaterials.ts:49-71`, `TrainModelForText.ts:34-40`, `InformationExtraction.ts:63-64`).
  - Empty table: "NO DATA AVAILABLE".
- **Save model**: Table actions are immediate. Accept per row is fire-and-forget with socket confirmation. Train/Process are modals with explicit submit. Entity sidepanels are explicit-submit forms: Cancel (ghost) bottom left; bottom right a checkbox "Use for training" and the success-variant "Accept" button. On submit: if the field changed, the entity is saved with `entitiesAPI.update` (PDF panel also sends `propertySelections {fileID, selections}`); for relationship properties the same value is written to the template's other relationship properties with the same `content` (`sidepanelFunctions.ts:56-91`); if the field or training flag changed, `onEntitySave` posts the training flag when it differs, otherwise just revalidates; the panel then closes even if the save failed (`PDFSidepanel.tsx:124-154`, `PropertySidepanel.tsx:94-119`). No dirty guard; Escape or overlay click discards.
- **Run states and polling** (VERIFIED): the loader reads status once via `POST /api/suggestions/status` (returns `ready`, `processing_model`, `cancel`, `failed`, `processing_suggestions` + `{processed,total}`, or `processing_auto_accept`, `InformationExtraction.ts:863-918`). Live changes arrive on socket event `ix_model_status(extractorId, status, message, data)`; the client revalidates on every event and also listens to `ix:error_training_model` and `ACCEPT_SUGGESTION_*` (`IX/events.ts:21-29`, `useEventHandler.ts:28-96`). There is no timed polling on this page. Server side the results come back through Redis queue `<ENV>_information_extraction_results` polled every 500 ms (`TaskManager.ts:62-103`).
- **V1 vs V2**: V1 removed.
- **Notes/gotchas** (VERIFIED by reading unless stated):
  - There is no bulk "Accept" for selected rows. Row selection only feeds "Process selected" and disables "Train model". The only bulk accept is "Auto-accept suggestions" inside the Process modal ("From all suggestions" is the "accept all" path).
  - "Selected <n> of 100" uses the page-size constant, not the total (`IXSuggestions.tsx:441-455`).
  - The server can return model status `failed` (`InformationExtraction.ts:878-880`), but the client enum `ixStatus` has no `failed` value (`IX/types.ts:72-80`). The footer then shows "Cancel" with no status text because `ixmessages['failed']` is undefined.
  - Failure path `handleFailedStatus` for `create_model` emits `ix_model_status` with status `'error'` (`InformationExtraction.ts:195-201`). The hook handles unknown statuses by setting `ready` and showing no notification (`useEventHandler.ts:57-64`), and the task listener ignores it (`taskProgress.ts:61-89`), so the Beacon task can stay "running" (ASSUMED from code reading, not run).
  - Rows with `state.processing` get `disableRowSelection` (`IXSuggestions.tsx:548`).
  - Suggestion `state` flags: labeled, withValue, withSuggestion, match, hasContext, obsolete, processing, error (`app/shared/getIXSuggestionState.ts:71-110`). A row turns obsolete when entity or file data changed after the suggestion was made (listeners `app/api/suggestions/listeners/afterEntityUpdatedListener.ts`, `afterFileCreatedListener.ts`; both skip when `features.metadataExtraction` is falsy).
  - The e2e fixture `database/ix_config.sh:5-9` sets both feature keys plus `segmentation.url`; PDF extractors also need segmented PDFs (`features.segmentation`).

---

## 2. Paragraph extraction (PX)

### 2a. Paragraph extraction: extractors dashboard

- **Route / file**: `/settings/paragraph-extraction` (index) `Routes.tsx:414-423`; component `PX/ParagraphExtraction.tsx:15-73`; loader `ParagraphExtractorLoader` `PX/Loaders.ts:22-27` (GET extractors). Create dialog `PX/components/extractors/CreateDialog/*`; delete dialog `PX/components/extractors/DeleteDialog/index.tsx`; table `PX/components/extractors/Table.tsx`, columns `TableElements/columns.tsx`.
- **Who can see it**: route guard admin+editor (`Routes.tsx:416-421`). Nav: `NeedAuthorization ['admin','editor']` + `FeatureToggle feature="paragraphExtraction"` (`SettingsNavigation.tsx:74-81`). Server: every PX endpoint uses `needsAuthorization(['admin','editor'])` then `featureFlagEnabled('paragraphExtraction')` (403 `{error:'Feature not available'}`) (`app/api/paragraphExtraction/adapters/PXRoutes.ts:15-62`, `app/api/utils/featureFlagEnabledMiddleware.ts`). Note the order: auth first, then the flag. The flag is a tenant feature flag, not a `settings.features` key (section 4).
- **Layout**: Header title "Paragraph Extraction". Table with header "Extractors", selection checkboxes. Columns: "Source Template" (coloured pill), "Target Template" (coloured pill), "Entities" (total count + indigo pill "<n> New" when new > 0), action column (sr-only "Action") with a secondary "View" button linking to `<id>/entities/?page=1` (`columns.tsx:11-40`, `EntityCountCell.tsx`, `ActionCell.tsx`). Sticky footer: "Add extractor" when nothing selected; otherwise a danger "Delete" button and "Selected <n> of <total extractors>" (`ParagraphExtraction.tsx:51-69`).
- **Fields** (create dialog, 3 steps, `Modal size="xxl"`, aria-label "Paragraph extractor wizard", `Dialog.tsx:14`):

| Step / field | Control | Default | Rules | Copy | file:line |
|---|---|---|---|---|---|
| 1 Target template | single-select `MultiselectList`, search | none | only templates with at least one rich text (markdown) and one numeric property are listed | title "Target template"; description "Select the template to store the extracted paragraphs."; hint "Only templates with at least one rich text property and one numeric property are available for selection."; buttons "Cancel", "Next" (disabled until selected) | `steps/TargetTemplate/*`, `utils/filterPXQualifiedTemplates.ts:3-5`, `Dialog.tsx:33-39` |
| 2 Source template | single-select list | none | lists all templates except the chosen target and except templates already used as source by another extractor (this list is not limited to qualified templates) | title "Source template"; description "Select the template with the source documents."; hint "Only templates that are not used as source in any other extractor and are not selected as target in this extractor are available for selection."; buttons "Back", "Next" | `steps/SourceTemplate/Body.tsx:18-27`, `Footer.tsx`, `Dialog.tsx:41-47` |
| 3 Paragraph text property | `Select` | "Select..." | options = target template properties of type markdown, value is the property `_id` | label "Paragraph text extraction property (rich text)" | `steps/ExtractionConfiguration/Body.tsx:69-82` |
| 3 Paragraph number property | `Select` | "Select..." | options = numeric properties | label "Paragrap number extraction property (numeric)" (typo in source: "Paragrap") | `Body.tsx:84-97` |
| 3 Target relationship type | `Select` | "Select..." | options = all relationship types minus the selected source type | label "Target relationship type"; help "Target's role in the relationship Source-Target." | `Body.tsx:100-120` |
| 3 Source relationship type | `Select` | "Select..." | options = all relationship types minus the selected target type | label "Source relationship type"; help "Source's role in the relationship Source-Target." | `Body.tsx:121-142` |

  Step title "Extraction configuration", empty description. Footer: "Back", "Create" (success), disabled until all six values are set (`Footer.tsx:27-33,56-71`). Dots below the body show the step (`Steppers.tsx`). Server validation (`PXCreateExtractor.ts`, `PXExtractor.ts`): both templates exist; both relationship types exist; source type must differ from target type (`SAME_SOURCE_TARGET_RELATIONTYPE`); no extractor may already use that source template (`EXTRACTOR_ALREADY_EXISTS`); paragraph property must exist and be rich text; number property must exist and be numeric; target and source templates must differ. All are `PXValidationError`, answered 422 with English messages (e.g. "Cannot create an Extractor with a source template that already has an Extractor. sourceTemplateId: <id>").
- **Actions**:

| Control | Client behaviour | Server call and effect |
|---|---|---|
| "Add extractor" | opens create dialog (disabled while `isSaving`) | none |
| "Create" (step 3) | `extractorsAPI.save`, closes dialog, revalidates, notify success "Paragraph Extractor added" (`Footer.tsx:35-54`) | `POST /api/paragraphExtraction/extractor` body keys `sourceTemplateId, targetTemplateId, paragraphPropertyId, paragraphNumberPropertyId, sourceRelationshipTypeId, targetRelationshipTypeId`; response `{extractorId}`. In one transaction: inserts into collection `px_extractors` and dispatches job `CreateParagraphExtractionEntityStatusesJob` that creates one `px_entities_status` row per source-template entity: `processed` if paragraph relationships already exist, else `new` (`app/api/paragraphExtraction/application/PXCreateExtractor.ts:96-128`, `PXCreateEntityStatuses.ts:57-105`) |
| "Delete" | opens confirmation | `DELETE /api/paragraphExtraction/extractor?id=<id>` once per selected extractor, in parallel (`PX` API `remove`: `app/react/V2/api/paragraphExtractor/extractors.ts:29-34`). Server deletes the extractor and all its `px_entities_status` rows in a transaction; throws if the id does not exist (`MongoPXExtractorsDataSource.ts:104-120`). Paragraph entities and relationships already created are not deleted |
| "View" (row) | navigates to the entities page | none |
| Dialog "Cancel" / X | `setShowModal(false)` | none |

- **Confirmations**: Delete extractors: `ConfirmationModal` header "Are you sure?"; warning "Only the extractor will be deleted, all created entities will remain on the library."; buttons "No, cancel" / "Delete" (`DeleteDialog/index.tsx:45-57`). Result: notify success "Extractor/s deleted", clears selection; failure notify error "An error occurred" (no details) (`:25-40`).
- **Empty / loading / error / notification states**: Empty: "NO EXTRACTORS." (`TableElements/NoDataCell.tsx:4-8`). Create success "Paragraph Extractor added". Create failure: `handleUnexpectedError` -> "An error occurred" + server `prettyMessage`, only when `isClient` (`Footer.tsx:49-52`). No loading indicator beyond button disabling.
- **Save model**: wizard modal with explicit "Create"; no edit flow (there is no "edit extractor": VERIFIED, only create and delete exist in UI and API). State lives in `CreateExtractorContext`; closing discards it. No dirty guard.
- **V1 vs V2**: V1 removed (no `app/react/ParagraphExtraction`).
- **Notes/gotchas**:
  - `NoQualifiedTemplatesMessage` components exist for both steps (copy "No valid target template available", "A target template needs to have the following properties:", "1 Rich text", "1 Numeric", "A source template must:", ...) but are not imported anywhere (VERIFIED by grep), so an empty template list shows an empty list, with only the step 1 dots dimmed (`Dialog.tsx:31`).
  - Paragraphs are created as entities of the target template and linked with legacy V1 relationships (`relationshipsDS.save`), not the `newRelationships` v2 store (`PXCreateParagraphsBatch.ts:111-124`, `import relationshipsDS from '#api/relationships/relationships.js'`). Interaction with `features.newRelationships` was not checked.
  - Extraction needs `EXTERNAL_SERVICES=true` and `PARAGRAPH_EXTRACTION_URL` (default `http://localhost:5056`) (`app/api/config.ts:227`, `PXExtractionServiceFactory.ts`).

### 2b. Paragraph extraction: entities of one extractor

- **Route / file**: `/settings/paragraph-extraction/:extractorId/entities` (`Routes.tsx:424-432`). Component `PXEntityDashboard` `PX/PXEntities.tsx:27-158`; loader `PXEntityLoader` `PX/Loaders.ts:29-70`. Query params: `page` (default 1, size 30, `PAGE_SIZE` `Loaders.ts:20`), `status` (repeatable).
- **Who can see it**: as 2a (guard `Routes.tsx:428-432`; server `PXRoutes.ts:50-55` for `extractorStatuses`, `:29-41` for extract endpoints).
- **Layout**: Header breadcrumb "Paragraph extraction" > source template name. Table header "Paragraphs for" + coloured source template pill (`PX/components/TableTitle.tsx`); right action "Filters" (funnel, badge counts every query param except `page`, `FilterSidepanelButton.tsx:12`). Columns, none sortable: "Entity" (title), "Language(s)" (uppercase gray pills of languages that have a processed PDF), "Paragraphs" (count), "Status" (pill), action "View" (sr-only "Action") (`entities/TableElements/columns.tsx:11-42`). Footer of table: "Showing a-b of N" and paginator (`PXTableFooter.tsx`). Sticky footer (`PXEntities.tsx:120-153`): with no selection, button "Extract new paragraphs" and an indigo "<n> New" pill; with a selection, button "Extract paragraphs" and "Selected <n> of <totalRows>".
- **Fields**: filter sidepanel (title "Filters", uppercase): section "Status", one checkbox per status with a count and dotted leader: "New", "Processing", "Obsolete", "Error", "Processed" (the `total` key is removed). Buttons "Clear All" (clears the checkboxes only; nothing is applied until "Apply") and "Apply" (success variant) which rewrites `status` params and closes (`PX/components/FilterSidePanel/EntityFilterSidepanel.tsx:48-110`, `Filters.tsx:34-66`). Counts come from `extractor.statusCount`.
- **Actions**:

| Control | Client behaviour | Server call and effect |
|---|---|---|
| "Extract new paragraphs" | disabled when no row on the loaded page has status New or while saving; calls `extractParagraphs(extractorId)`, revalidates twice, notify success (`PXEntities.tsx:40-70,123-128`) | `POST /api/paragraphExtraction/extractNew {extractorId, status:'new'}` -> gets every entity status `new` for the extractor (all pages, not only the loaded one) and runs the extract flow below (`PXExtractParagraphsByEntityStatus.ts:26-33`) |
| "Extract paragraphs" (selected rows) | opens confirmation; Continue calls `extractSelected` (`ExtractEntitiesDialog/index.tsx:27-59`) | `POST /api/paragraphExtraction/extract {extractorId, entitySharedIds[] (min 1)}`. For each id (sequentially): skip if no status row or status is `processing`/`processing_obsolete`; mark `processing`; dispatch `PXExtractParagraphsFromEntityJob` (`PXExtractParagraphFromEntities.ts:27-55`). The job: loads extractor, entity, installed languages; picks the newest processed PDF per installed language; requires a ready segmentation for each; deletes the entity's previously created paragraph entities; posts XML + segment boxes to the external service `/extract_paragraphs` with a key (tenant, user, status id) (`PXExtractParagraphsFromEntity.ts:55-110`). Result comes back through Redis queue `extract_paragraphs`, `PXParagraphsResultListener` dispatches `PXCreateParagraphsJob`, which creates paragraph entities per language in batches of 100 (title `<entity title>.<NN>`, text, number), creates a V1 relationship per paragraph (source entity with the source relationship type, paragraph with the target relationship type), then marks the status `processed`; a non-retriable failure marks `error` (`PXParagraphsResultListener.ts:34-52`, `PXCreateParagraphsJob.ts:35-69`, `PXCreateParagraphs.ts:102`, `PXCreateParagraphsBatch.ts:62-124`) |
| "View" (row) | navigates to `<sharedId>/paragraphs` | none |
| Filters "Apply" / "Clear All" | see Fields | list reloads via `GET /api/paragraphExtraction/extractorStatuses?id&page[number]&page[size]&filter[status][]` |

- **Confirmations**: Extract: header "Are you sure?"; warning "All of the previously created paragraphs will be deleted and recreated after the process."; buttons "No, cancel" / "Continue" (`ExtractEntitiesDialog/index.tsx:72-83`). A `DeleteDialog` for entity paragraphs exists (header "Are you sure?", warning "All of the paragraphs will be deleted", buttons "No, cancel"/"Delete", success toast "Paragraphs deleted") but is not imported by any page (VERIFIED by grep), and its API function is a stub that resolves without calling the server (`app/react/V2/api/paragraphExtractor/entities.ts:60-70`). No server delete-paragraphs endpoint exists in `PXRoutes.ts`.
- **Empty / loading / error / notification states**:
  - Status pills (`PXEntityStatus.tsx:7-34`): New (indigo pill "New"), Processing ("Processing..." gray pill), Processed (green check, sr-only "Processed"), Error (red pill "Error"), Obsolete (blue pill "Obsolete"). Server status `processing_obsolete` is mapped to `processing` for the client (`PXEntityStatusMapper.ts:15-25`).
  - Started: notify success "The process of extracting the paragraphs has successfully started. Check the Status column for updates on the process."
  - Missing extractor: notify error "An error occurred" with details "Cannot find extractor".
  - Failure of the API call: see gotcha (success toast may still show).
  - Empty table: "NO DATA AVAILABLE".
- **Save model**: no forms; actions are immediate. Polling: `revalidator.revalidate()` every 25 s (`POLL_INTERVAL_SECONDS`, `PXEntities.tsx:25,93-101`); on revalidate only each row's status is patched in place, so selection and page stay stable; a page change replaces the rows (`:72-91`). No sockets on PX pages.
- **V1 vs V2**: V1 removed.
- **Notes/gotchas** (VERIFIED):
  - `extractParagraphs` and `extractSelected` catch their own errors and return them instead of throwing (`api/paragraphExtractor/entities.ts:23-34,36-58`), and the callers do not inspect the return value, so the success notification can appear after a failed request (the legacy `api` util may add an error toast at the same time).
  - "New" pill and the enabled state of "Extract new paragraphs" count only rows on the current page (`PXEntities.tsx:38`), while the server extracts all `new` entities.
  - Status `new` is created for entities when the extractor is created, when an entity changes into the source template, and when a ready document with a changed language appears; `obsolete` is set when a document that fed the previous extraction is replaced (`PXEntityUpdatedListener.ts:66-104`, `PXEntityStatusManager.ts:46-140`).
  - Rows are entity titles in the request language (`MongoPXExtractorsQueryService.ts:159-168`).

### 2c. Paragraph extraction: paragraphs of one entity

- **Route / file**: `/settings/paragraph-extraction/:extractorId/entities/:sharedId/paragraphs` (`Routes.tsx:433-441`). Component `PXParagraphDashboard` `PX/PXParagraphs.tsx:14-70`; loader `PXParagraphLoader` `PX/Loaders.ts:90-157` (settings default language, extractors, `GET /api/paragraphExtraction/entityParagraphs`, source entity, templates; page size 30).
- **Who can see it**: as 2a (server `PXRoutes.ts:57-62`).
- **Layout**: Header breadcrumb "Paragraph extraction" > source template name > entity title. Table header "Paragraphs for" + source template pill + language pills; right action "Open PDF" (ghost). Columns, none sortable: "Paragraph #", "Language" (uppercase pill), "Text" (truncated to 200 characters with tooltip), action "View" (sr-only "Action"). Rows are grouped: the first row is the main-language paragraph and the other languages are sub-rows (`groupColumnPosition={3}`, `PX/components/paragraphs/Table.tsx:51-67`; `paragraphs/TableElements/tableBuilder.ts:11-42`). Footer with "Showing a-b of N" and paginator. No row selection and no sticky footer.
- **Fields**: none (read only). "View" side panel (title "Entity", uppercase) shows: entity title with a coloured template pill; "Language: <localized label>"; "Document: <original file name>"; "Paragraph: <number>"; a bordered box "Text" with the paragraph text (`ViewParagraph.tsx:24-47`). Footer button "View entity" (secondary, small) opens `/<language>/entity/<sharedId>` in a new tab (`ViewParagraphSidePanel.tsx:37-45`). "Open PDF" side panel (large): title = entity title, body = the PDF of the main-language document (`/api/files/<filename>`), footer button "Close" (`PDFSidepanel.tsx:14-45`).
- **Actions**: "Open PDF" (client only), "View" (opens side panel, client only), "View entity" (link), "Close". Server: only the GET above; no writes.
- **Confirmations**: none.
- **Empty / loading / error / notification states**: empty "NO DATA AVAILABLE"; if extractor, id or shared id is missing the loader returns empty rows (`Loaders.ts:112`). No toasts.
- **Save model**: read only, no save.
- **V1 vs V2**: V1 removed.
- **Notes/gotchas**: paragraph entities live in the target template and can be edited in the normal entity views; this page has no edit or delete. The language list in the header is derived from the first row only (`Table.tsx:32-47`).

---

## 3. New Relationships Migration

### 3a. New Relationships Migration dashboard

- **Route / file**: `/settings/newrelmigration` (`Routes.tsx:502-507`): `settings?.features?.newRelationships ? <NewRelMigrationDashboard/> : <GeneralError/>`. Component: `app/react/Settings/components/relV2MigrationDashboard.tsx:98-515` (React class component connected to Redux, wrapper export `:527`). API client: `app/react/Entities/V2NewRelationshipsAPI.js`, actions `app/react/Entities/actions/V2NewRelationshipsActions.js`. Backend: `app/api/relationships.v2/routes/routes.ts`.
- **Who can see it**:
  - Route: no role guard of its own; it is inside `loggedInUsersRoute` only (`Routes.tsx:324,502-507`). The gate is the feature key `features.newRelationships`, read from the SSR settings.
  - Nav: `NeedAuthorization roles={['admin']}` + `FeatureToggle feature="newRelationships"`, label "New Relationships Migration" (`SettingsNavigation.tsx:90-109`).
  - Server: migration and plan endpoints use `needsAuthorization()` (default role `['admin']`, `app/api/auth/authMiddleware.ts:16-23`) then `featureRequired` (404 unless `readNewRelationshipsAllowed()` i.e. `settings.features.newRelationships` truthy, `routes.ts:34-43`, `MongoSettingsDataSource.ts:170-172`). The CRUD endpoints `GET/POST/DELETE /api/v2/relationships` have only `featureRequired` and no `needsAuthorization` (`routes.ts:46-65`).
  - ASSUMED consequence (code path verified, not run): because only admins receive `settings.features`, a non-admin who types the URL gets the error page, not the dashboard.
- **Layout**: unstyled legacy markup (classes `settings-content`, `panel panel-default`, `btn`), root div has attribute `no-translate`, so none of its text goes through translations (`:338-340`). Top to bottom: panel heading "Migration Dashboard"; buttons "Dry Run" and "Migrate"; optional confirm block; optional "Migration Summary"; "Current migration plan:" list with per-row buttons; add-row line with three selects and "Add"; "Test One Hub" button + text input + optional test result table; paginated list of unused connections.
- **Fields**:

| Field | Control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| New plan row: source template | `<select>` of all templates sorted by name | first template | none client side | none | `:424-433,149-156` |
| New plan row: relationship type | `<select>` of all relationship types sorted by name | first type | none | none | `:434-443` |
| New plan row: target template | `<select>` of all templates | second template (index 1) | none; "ALL" is shown for plans without a target template but cannot be chosen here | none | `:444-453` |
| Test one hub id | plain `<input type=text>` | empty | none; server requires a string `hubId` | none | `:460-463`; `validators/migration.ts:30-36` |

  Server schema for plan rows: `sourceTemplate, sourceTemplateId, relationType, relationTypeId, targetTemplate` required strings; `targetTemplateId, inferred, ignored` optional (`validators/migration.ts:5-28`).
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| (on mount) | loads plan, indexes templates and relation types, loads first page of unused connections (`:132-159`) | `GET /api/v2/relationshipMigrationFields` -> `getAllCombinedWithInferred`: one "inferred" entry per v1 relationship property found in templates (`infered:true`, flag name spelled `infered` in the API) merged with stored rows (stored `ignored` overrides) (`GetRelationshipMigrationFieldService.ts:37-61`); `GET /api/v2/migrationHubRecords?page&pageSize=10` |
| "Dry Run" | sends plan with `dryRun:true`, shows summary, resets unused page to 1 (`:171-181`) | `POST /api/v2/relationships/migrate {dryRun, migrationPlan}`. Reads all v1 connection hubs, applies the plan matcher (ignored rows excluded), counts total/used/text references/errors, writes unused-hub records to `migrationHubRecords`, creates then drops a temporary hubs collection; writes no relationships. The request is synchronous and the response carries elapsed `time` in ms (`routes.ts:67-89`; `MigrationService.ts:355-375`; `setupDB` deletes previous hub records) |
| "Migrate" | shows the confirm block (`:199-202`) | none |
| "Perform" (in confirm) | sends `dryRun:false`, hides confirm (`:183-187`) | same endpoint with `dryRun:false`: additionally `relationshipsDS.deleteAll()` first (removes every existing v2 relationship), then inserts the transformed relationships in batches of 1000 hubs. Not transactional across batches (VERIFIED order in `MigrationService.migrate`; atomicity not verified) |
| "Cancel" (in confirm) | hides confirm | none |
| "Ignore" / "Unignore" (plan row) | optimistic toggle of `ignored`, reverts on failure (`:209-219`) | `POST /api/v2/relationshipMigrationFields` (upsert by source template + relation type + target template). Stores a row even for inferred entries |
| "Remove" (plan row, only when not inferred) | splices the row after success (`:250-256`) | `DELETE /api/v2/relationshipMigrationFields?sourceTemplate&relationType&targetTemplate` |
| "Add" | appends the created row to the list (`:239-248`) | `PUT /api/v2/relationshipMigrationFields` (create) |
| "Test One Hub" | sends the typed id with the plan, shows result (`:193-197`) | `POST /api/v2/relationships/test_one_hub {hubId, migrationPlan}`: returns counts plus original connections and transformed relationships for that hub; no writes (`routes.ts:91-116`) |
| "←" / "→" (unused connections pager) | changes page, reloads | `GET /api/v2/migrationHubRecords` (server loads all records then slices, `GetMigrationHubRecordsService.ts:13-18`) |

- **Confirmations**: "This will clean all your existing v2 relationships. Are you sure?" with buttons "Perform" and "Cancel" (`:352-362`). Inline block, not a modal.
- **Empty / loading / error / notification states** (exact copy, all untranslated English):
  - Summary: "Migration Summary" (+ " (Dry Run)"), "Time: <ms or s>", "Total: <n>(text references: <n>)", "Used: <n>(<n>)", "Unused: <n>(<n>)", "Errors: <n>" (`:365-388`, `formatTime` `:90-96`).
  - Plan row text: `<source> -> (<relation type>) -> <target or ALL> -- <inferred|user defined>[, ignored]`.
  - Hub test: "Test Result:", "Total", "Used", "Unused", table headers "Original Hub", "Transformed".
  - Unused list: separator line `<index>---------------------------:<hubId>` per hub, rows `(<relation type name>) link <entity title>(<template>)`; pager `<page>/<max>`.
  - No loading indicator, no success or error messages of its own. Errors come only from the legacy `api` util toasts (`api.js:134-146`). The sync migrate call can run long with no progress UI.
- **Save model**: plan edits (Ignore, Remove, Add) are saved immediately per click. Migration runs on explicit button press; "Migrate" requires the inline confirm. No dirty guard (nothing to lose).
- **V1 vs V2**: This page is itself legacy-style UI (class component, Redux `connect`, bootstrap-like classes) for the backend module `app/api/relationships.v2`. It is the only UI that lets an admin convert V1 connections ("hubs") to V2 relationships. Nothing to port: it is a one-off tool.
- **Notes/gotchas** (VERIFIED unless stated):
  - `componentDidMount` reads `templatesNameSorted[1]` and `relationTypesNameSorted[0]` without checks; a collection with fewer than two templates or no relationship types throws on mount (`:149-156`). `mapPlanElementFromApiResponse` also throws if a plan row refers to a deleted template or relation type (`:62-82`).
  - State is held in instance fields with `forceUpdate()` rather than React state.
  - "Test One Hub" with an empty id sends `hubId: undefined`; 422 validation expected (ASSUMED).
  - What the flag also does elsewhere: `entities/v2_support.ts:20-35,102-175` (entity save creates v2 relationships), `search/search.js:189,449,1009`, `relationships.v2/templates/v2_support.ts:43`, Library metadata panel `react/Library/components/ViewMetadataPanel.js:66`. `newRelationships` may also be `{updateStrategy:'OnlineRelationshipPropertyUpdateStrategy'|'QueuedRelationshipPropertyUpdateStrategy'}` (`settingsType.ts:133-139`, `service_factories.ts:97-110`).

---

## 4. Feature toggles and flags

### 4a. How features are defined and where they are set

- **Route / file**: none (no settings page edits features). Definitions: `app/shared/types/settingsType.ts:101-140` (settings.features), `app/api/core/application/settings/saveSettingsInput.ts:84-151` (zod, `.passthrough()` so unknown keys such as `metadata-extraction` are accepted), `app/api/tenants/featureFlags.ts:7-29` (tenant flags), `app/api/config.ts:196-217` (env defaults), `app/react/entry-server.tsx:385-399` (merge for the client), `app/react/V2/Components/UI/FeatureToggle.tsx:6-18` and legacy `app/react/components/Elements/FeatureToggle.tsx:19-22` (UI gates).
- **Who can see it**: not applicable to a page. Who can read: `settings.features` is part of the admin projection only (`publicSettings.ts:37-46`, `SettingsQueryService.ts:27-29,48-57`); non-admins (including editors) get public fields plus the tenant flags that SSR copies in (`entry-server.tsx:385-399`). Who can write: `POST /api/settings` requires `needsAuthorization()` i.e. admin (`app/api/core/infrastructure/express/settings/routes.ts:8-10`). Tenant flags: CLI `yarn uwazi tenants feature-flags` (`apps/cli/tenants/routes/SetFeatureFlagsRoute.ts:10`, merge semantics in `app/api/tenants/application/SetTenantFeatureFlags.ts`: null removes a flag, missing flags stay) or env at process start.
- **Layout / Fields / Actions / Confirmations / Save model**: none found (no UI).
- **Empty / loading / error / notification states**: none found. Backend responses: IX routes 404 `{}` without `metadataExtraction.url`; PX routes 403 `{error:'Feature not available'}` without the tenant flag; v2 relationship routes 404 without `newRelationships`.
- **V1 vs V2**: the legacy Redux `FeatureToggle` reads `settings.collection.features` with the same dotted path syntax (`components/Elements/FeatureToggle.tsx:19-22`); the V2 one reads the Jotai `settingsAtom` (`FeatureToggle.tsx:14-17`). Both treat missing values as off.

Features that gate settings navigation or these pages:

| Key (exact) | Kind and location | Type | Set by | Gates | Evidence |
|---|---|---|---|---|---|
| `metadata-extraction` | `settings.features['metadata-extraction']` (Mongo or Postgres settings document) | boolean (undeclared key, allowed by passthrough) | direct DB write (`database/ix_config.sh:5-9`) or `POST /api/settings` as admin. No code writes it; no UI | nav item "Metadata Extraction" only (`SettingsNavigation.tsx:66`). Not checked by the route nor by the API | `ix_config.sh:7`, `saveSettingsInput.ts:151`, `settingsType.ts:~134` (`[k: string]: unknown`) |
| `metadataExtraction` | `settings.features.metadataExtraction` | `{url: string, templates?: [{template, properties[]}]}` | same as above (`ix_config.sh:8`: `{"url":"http://127.0.0.1:5056"}`) | all IX API routes (404 without `url`), IX external service URL, entity/file listeners that keep suggestions in sync | `serviceMiddleware.ts:4-13`, `InformationExtraction.ts:606-614`, `suggestions/eventListeners.ts:22-23`, `listeners/afterFileCreatedListener.ts:35`, `afterEntityUpdatedListener.ts:34` |
| `paragraphExtraction` | tenant feature flag (not in `settings.features` in the DB); copied into `settings.features` at SSR | boolean | env `FEATURE_FLAG_PARAGRAPH_EXTRACTION=true` for the default tenant (`config.ts:89,201`); per-tenant override through the tenants store/CLI (`featureFlags.ts:12`; merge `tenantContext.ts:73-92`). `ix_config.sh:6` also writes a `paragraphExtraction` key into `settings.features`, which SSR overwrites with the tenant flag (spread order `entry-server.tsx:397-399`) | nav item "Paragraph Extraction" (`SettingsNavigation.tsx:74`), all 7 PX endpoints (403), PX event listeners (`featureFlaggedHandler`) | `PXRoutes.ts:18-60`, `PXEntityUpdatedListener.ts:108`, `PXEntityDeletedListener.ts:43`, `PXFilesDeletedListener.ts:158`, `PXFileUpdatedListener.ts:52` |
| `preserve.host` | `settings.features.preserve = {host, masterToken, config:[{token, template, user?}]}` | object (path checked is `preserve.host`) | DB or `POST /api/settings` (admin) | nav item "Preserve" with icon (`SettingsNavigation.tsx:92-101`). The route `/settings/preserve` is `adminsOnlyRoute` with no feature check (`Routes.tsx:346`). Server reads `features.preserve` in `app/api/preserve/preserve.ts:18` and `app/api/services/preserve/preserveSync.ts:223` | `saveSettingsInput.ts:68-82` |
| `newRelationships` | `settings.features.newRelationships` | boolean or `{updateStrategy}` | DB or `POST /api/settings` (admin) | nav item "New Relationships Migration", the route (error page when off), all `/api/v2/relationship*` and `/api/v2/migrationHubRecords` routes (404) | `SettingsNavigation.tsx:102-109`, `Routes.tsx:502-507`, `routes.ts:34-43`, `saveSettingsInput.ts:120-132` |

Other client-visible flags (tenant flags copied into `settings.features`, none gate settings nav): `ClientFeatureFlags` = `paragraphExtraction, themeCustomization, newHeader, featureFlagEntityViewerv2, featureFlagLibraryV2, aiAssistant, translationService, experimentalFeatures` (`app/react/V2/shared/types.ts:72-81`). Env defaults: `newHeader` is on unless `NEW_HEADER=false`; the others are on only when `FEATURE_FLAG_*` env is `'true'` (`config.ts:201-217`). `featureFlag*` consumers: `featureFlagLibraryV2` -> `Routes.tsx:139,169,226` via `react/utils/libraryPaths.ts:6` and header link `Header.tsx:82`; `featureFlagEntityViewerv2` -> `Routes.tsx:201,285` via `react/utils/entityViewerPaths.ts:21` and SSR redirect `entry-server.tsx:405-412`; `experimentalFeatures` -> PDF word selection `PDF.tsx:123`; `translationService` -> auto-translate in entity editor `useInstalledEntityLanguages.ts:24`; `newHeader` -> `RequestStatus.tsx:27`, `entry-server.tsx:191`.

Server-only tenant flags in the registry (`featureFlags.ts:7-29`): `s3Storage, esReplicas, sync, deactivateTestJob, fileCacheHeaders, testing, postgresCore, postgresPages, postgresCsv, aiAssistantServiceUrl, translationServiceUrl, telemetry{enabled,sampleRate}, prometheus{enabled,sampleRate}` (plus the client flags above).

Other `settings.features` keys declared in the settings type (not gating nav): `tocGeneration{url}`, `topicClassification`, `favorites`, `convertToPdf{active,url}`, `ocr{url}` (Collection page shows an OCR control only when `ocr.url` is set, `Collection.tsx:335`), `segmentation{url}`, `twitterIntegration{...}`, `automaticTranslation{active,templates[]}` (`settingsType.ts:101-140`).

- **Notes/gotchas**:
  - `metadata-extraction` (hyphen, nav only) and `metadataExtraction` (camel case, `{url}`, backend only) are different keys. An instance can show the nav link while the API answers 404, or the reverse.
  - Editors do not receive `settings.features` (admin-only projection), so `FeatureToggle` for settings-DB keys (`metadata-extraction`, `preserve.host`, `newRelationships`) evaluates false for them; `paragraphExtraction` still evaluates true because it comes from the tenant flags. Therefore, for editors, the Metadata Extraction link is hidden even though the route and API allow admin+editor. VERIFIED code path; not confirmed in a running instance.
  - `FeatureToggle` only checks truthiness of the dotted path; `features.newRelationships` as an object (with `updateStrategy`) counts as on.
  - Playwright and Cypress set flags through fixtures or `window.__featureFlags__` (`cypress/e2e/informationExtraction/paragraph-extraction.cy.ts:19-20`, `app/shared/types/index.d.ts:21`); no production code reads `__featureFlags__` (VERIFIED by grep in `app/react`, `app/shared`, `app/api`).
  - The test settings fixture for IX also uses `'metadata-extraction': true` (`app/api/services/informationextraction/specs/fixtures.ts:26`).
