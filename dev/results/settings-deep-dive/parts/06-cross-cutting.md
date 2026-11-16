# Part 0: Cross-cutting behaviour

Everything here was read in code (VERIFIED) unless tagged. Page-specific detail is in Parts 1 to 5.

## 0.1 The settings document and who can read or write it

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

## 0.2 Propagation: what a change in one page does elsewhere

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

## 0.3 Collection settings and the first screen

- Index route logic is `getIndexDescriptor` (`app/react/getIndexElement.tsx:27-93`). `home_page` is split on `/`. Empty or invalid (`validateHomePageRoute`) means the library with `defaultLibraryView` (`cards` default, `table`, `map`). A path containing `page` goes to that Page (`/page/:id`), `entity` to that entity, `library` to the library with the query string carried over (`?q=...` or rison), anything else to a plain redirect.
- With library V2 on, library paths redirect to `library`, and custom `map` or `table` homes go to `legacy-library/*` (`Routes.tsx:136-177`).
- `private: true` on the instance means "not a public instance": the library, entity and page routes use `privateRoute`, which requires login (`app/react/ProtectedRoute.tsx:30-31`). The Collection form shows this inverted as "Public instance" (Part 1 note).
- `allowcustomJS` switches the nav label between "Global CSS" and "Global CSS & JS" but, per Part 2, does not gate Page-level JavaScript.
- `dateFormat` is read by the metadata date display and the date pickers (`app/react/V2/Components/Metadata/display/formatMetadataTimestamp.ts`, `Forms/DatePicker/*`).

## 0.4 Save models in one table

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

## 0.5 Notifications

- Settings pages report outcomes with `notify(type, title, message?, details?)` from `useRequestStatus` (`app/react/V2/atoms/requestStatusAtom.ts:144-154`). Types: `success`, `warning`, `error`, `info`. There is no inline toast: notifications are appended to the notification list and shown through the header status control (`RequestStatus` / Beacon) which flashes the title, and opens a panel that lists notifications (unread until the panel is opened) and tasks (`app/react/V2/Components/UI/Notifications/RequestStatus.tsx`, `NotificationsPanel.tsx`, `TaskItem.tsx`).
- Long-running work is modelled as **tasks** with `registerTask(id, label, setupListeners, initialProgress)`, `updateTask`, `endTask`, `removeTask`. Used for CSV import, IX train/process and similar, driven by sockets (`CsvImportTasksSubscriber.tsx`, `IX/taskProgress.ts`).
- The header status also has a loading state with a 1000 ms minimum (`MIN_LOADING_MS`, `requestStatusAtom.ts:23`) and a disconnected state (`isConnected`, `DisconnectWarning.tsx`).
- `apiClient` has a global error policy: any error except 401, 404 and cancelled requests raises "An error occurred" with the server detail, and 409 becomes a warning; a 401 redirects to `/login`. Pages that also call `notify` on the same error produce two entries (Account, Users, Thesauri, Languages, Relationship types; VERIFIED in code, not run) (`app/react/V2/api/policies.ts:39-83`). Collection and Menu use the older `api` client and are not affected.
- Server error text: `ApiError.detail = prettyMessage ?? message ?? error ?? statusText`; DomainErrors return 400 with a verbose `prettyMessage` that includes the request URL and body (passwords masked) (`app/shared/apiClient/normalizeError.ts:85-96`, `app/api/utils/handleError.js`). Validation errors return 422 with `validations[]`; unknown errors 500 "A server side error has occurred".
- The activity log records every non-GET `/api/*` request except a short ignore list and 404s (`app/api/activitylog/activitylogMiddleware.ts`), so every save in this document appears there (Part 2). It keeps entries for one year (TTL index from migration 29).

## 0.6 Page frame and shared UI

- Frame: `SettingsContent` with `Header` (breadcrumb path plus title, translated in the `System` context unless a `contextId` is given), `Body` (`grow px-4`) and a sticky `Footer` with a top border and optional highlighted tint (`app/react/V2/Components/Layouts/SettingsContent.tsx:22-113`).
- Tables: shared `Table` with sorting, selection and optional drag (`app/react/V2/Components/UI/Table/`). Side forms: `Sidepanel`. Dialogs: `Modal`, `ConfirmationModal`.
- Every user-facing string goes through `Translate`/`t('System', ...)`. New strings must exist in the UI translations or fall back to the key text; the Translations page lets an admin change them per language (Part 4).
- Loaders: pages load data in React Router loaders (server-rendered on first load) and refresh by `useRevalidator().revalidate()` after each action. There is no optimistic update on any settings page; the list re-renders after the loader returns.

## 0.7 Role model

- Roles: `admin`, `editor`, `collaborator` (`app/api/auth/authMiddleware.ts`, `app/react/V2/Components/UI/NeedAuthorization.tsx`). Only admin reaches most settings pages; editor reaches Account, Metadata extraction and Paragraph extraction (and at API level also the entity/file/relationship routes outside Settings). A collaborator reaches only Account.
- Client check is a redirect to `/login`, not a 403 page. Server check is HTTP 401 `{error:'Unauthorized'}`, which `apiClient` turns into `window.location.assign('/login')`.
- Anomalies at API level reported in the parts (all VERIFIED in code, none run): `GET /api/templates` and `GET /api/v2/entities/count_by_template` have no auth (Part 3); `GET /api/page(s)` has no auth so drafts are readable on public instances, `POST /api/preserve` has no role check, page-level JS ignores `allowcustomJS`, and `GET /api/settings` exposes `customCSS`/`customJS` (Part 2); the relationship-migration route has no role guard and `/api/v2/relationships` CRUD only checks the feature flag (Part 5).

## 0.8 Findings a designer is likely to hit

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
