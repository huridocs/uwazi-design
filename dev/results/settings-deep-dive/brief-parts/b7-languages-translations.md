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
