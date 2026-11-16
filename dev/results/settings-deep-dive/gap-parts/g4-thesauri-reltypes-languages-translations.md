## Thesauri (list and editor)

Note: the prototype's thesaurus store (`atoms/thesauri.ts`) is the model D1-generic copies. "Prototype today" for Thesauri is mostly correct; the gaps are validation, usage checks, search/import and the guard.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List table: Label (sortable, name asc), Templates column with pills of templates whose property uses it. `ThesauriList.tsx:14`, `TableComponents.tsx:126` | partial: name and item count; no Templates pills | `1:1` Templates pills from the live template store; add search (improved UX1) | STORE, D1a, PAT | S |
| Add thesaurus (footer) opens empty editor; Edit per row opens editor. `ThesauriList.tsx:72`, `EditThesaurus.tsx:36` | works | `1:1`; footer lead action on the bar ladder | PAT | S |
| Name: required, trimmed, unique (exact, case-sensitive); client shows only a red input, no message. `ThesaurusForm.tsx:84`, `Thesaurus.ts:64` | partial: whitespace-only name accepted, no uniqueness (H3) | improved (Design: form pattern): case-insensitive unique check with an inline message (Uwazi gives none) | DRAFT | S |
| Items: add one or many via side panel; typing in last card adds another; empty cards dropped; labels whitespace-collapsed. `ThesauriValueFormSidepanel.tsx:40` | works: inline inputs, blank rows dropped on save | improved UX6: tree with click-to-edit, Add item inserts at cursor or top, labels sanitised the same way | DRAFT | M |
| Groups: one level, group needs at least one item; edit group via panel; "Empty group. Drop here to add". `ThesauriGroupFormSidepanel.tsx:85`, `DnDComponents.tsx:159` | partial: groups with children work; empty group can be saved (M5) | `1:1` (reject empty group); improved UX6 "move to group" (Uwazi cannot move between groups) | DRAFT | M |
| Reorder by drag (mouse and keyboard sensors); a row stays inside its parent. `Table.tsx:214`, `helpers.ts:53` | partial: drag only; no buttons inside groups | improved UX9: grip plus Move up/down, same parent rule | PAT | M |
| Sort button sorts root values and each group's children by label; result becomes saved order. `helpers.ts:108` | missing | `1:1` (use locale-aware compare; Uwazi uses lodash default) | DRAFT | S |
| Collapse all / Expand all in the editor table header. `Table.tsx:274` | missing | `1:1`; also collapsed by default for groups above ~50 items | - | S |
| Duplicate and blank validation: create rejects duplicate labels per level and empty labels; update skips validation (inferred). `Thesaurus.ts:64`, `Thesaurus.ts:216` | partial: blanks dropped; duplicates accepted (M5); form dedupes by `foldLabel` | improved (Design: validation): enforce on every save, same `foldLabel` rule as `addThesaurusValueAtom`; same label under different groups stays allowed | DRAFT, STORE | S |
| Remove selected values (tick, footer "Remove"); confirm only if used by a template and value is saved; last child removes the group. `EditThesaurus.tsx:105`, `ThesaurusActions.tsx:13` | partial: per-row delete, no confirm, no bulk | improved UX2 and UX4: bulk select with count bar; confirm shows entity count using the value | USAGE, PAT, DATA | M |
| Value delete effect on entities: async job rebuilds entities, removed values dropped (inferred). `DenormalizeThesaurusEntities.ts:22` | no-op: entity values keep the id and print label or raw id | `1:1` drop value from entities on save, after the confirm | STORE, USAGE | M |
| Rename value: same id, new label; entities and per-language translation keys follow. `ThesauriService.ts:68` | works for the edit-form picker (ids, not labels) | `1:1`; also renames the key in the Translations context | STORE, D1c | S |
| Save: one Save for name and values; toasts "Thesauri added." / "Thesauri updated."; new thesaurus stays on editor. `ThesaurusForm.tsx:44` | works: writes the store (session atom) | `1:1`; Save disabled until dirty, dirty compared with stored value | DRAFT, NOTIFY | S |
| Propagation to entity edit form (select and multiselect read the thesaurus). `EditEntity.tsx:60` | works: new value shows in the Case status picker | `1:1` (keep) | STORE | - |
| Propagation to template property dialog (lists live thesauri) and to library filters. `filterableProperties.ts:1` | no-op: dialog uses static `seedThesauri` by name; facets read entity data (B6) | `1:1` dialog lists live thesauri by id and writes `thesaurusBindingsAtom`; library facets defer (facets are built from entity data) | D1a, SCHEMA | M |
| Delete from list: tick rows, bulk "Delete"; checkbox disabled when a template uses it, no tooltip; server refuses with count. `ThesauriList.tsx:34`, `DeleteThesaurus.ts:17` | partial: delete with confirm works; no in-use check; "fall back to free text" claim is false (H2) | improved UX4: refuse while a template uses it and name those templates (Uwazi shows no reason); bulk delete via UX2 bar | USAGE, PAT | M |
| Import CSV: appends values, `-` prefix means child, `,` or `;`, language columns become translations; saves form first, no preview. `importThesauri.ts` | missing (no CSV flow) | improved UX3: Dropzone, preview of values to add and duplicates skipped, then apply; add Export CSV | PAT, DATA, STORE | L |
| Long lists: no search, filter or jump in Uwazi (2,443-value case in prototype). `Table.tsx` | missing: 2,443 inline inputs | improved UX1 and UX6: search, A-Z jump, collapsible groups, virtualised rows | STORE | M |
| Translation pill beside each label when translated name differs. `TableComponents.tsx:11` | missing | defer: show once the Translations store exists | D1c | S |
| Leave with unsaved edits: "Discard changes?" modal; no `beforeunload`; edit-to-edit paths not blocked (Uwazi bug). `EditThesaurus.tsx:78` | missing: Back, Cancel and rail clicks discard silently (B1) | `1:1` through `useDirtyGuard`; also guard edit-to-edit and corpus switch | DRAFT | S |
| Empty and loading: "NO DATA AVAILABLE"; global loading bar, no skeleton. `DefaultNoDataMessage.tsx:6` | partial: "Nothing here yet."; corpus loading reads as empty | improved (Design: list-page empty and loading states): named empty state with Add action, skeleton rows while loading | PAT | S |
| Errors and toasts: "Error updating thesauri.", server details such as in-use and duplicate name. `ThesauriList.tsx:52` | missing: no failure path | `1:1` success and error notifications; simulate in-use and duplicate failures | NOTIFY | S |
| Phone: wide table with drag, checkbox and Edit columns. `ThesaurusForm.tsx:77` | partial: list fits; editor works | improved UX12: value rows with edit sheet, no table | PHONE, PAT | M |

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
|---|---|---|
| Item count column in the list | keep | Quick size cue; derive from `countItems(values)` so it matches the editor (M5: 24 vs 9) |
| Per-corpus overlay and seed (CEJIL, Travesía thesauri) | keep (proto-only) | Prototype has several data sources; Uwazi has one collection |
| Inline text inputs for every value | drop | Replaced by the tree (D6); inputs cause mistyping and slowness at 2,443 rows |

**Uwazi things the prototype lacks entirely**: none beyond the rows above.

## Relationship types

Note: Uwazi stores only `id` and `name` per type (`RelationshipType.ts:1`). The prototype has three registries (B5); D1b moves Settings onto `relationTypesAtom`.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List table: Label (translated name plus raw name in brackets), Templates pills, sortable by label; rows sorted by translated name. `RelationshipTypes.tsx:57`, `TableComponents.tsx:26` | partial: seed rows with fake usage count (B5) | `1:1` from `relationTypesAtom`; show raw name only when it differs from the translation | STORE, D1b | S |
| Templates column: templates with a relationship property using the type (client side from templates). `RelationshipTypes.tsx:40` | missing: shows seed "N relationships" | `1:1` pills from the template store; add a references count column (Design: vocabulary says "references") | D1a, USAGE | S |
| Add relationship type: panel with Name; footer lead action. `RelationshipTypes.tsx:70` | no-op: Create toasts, type not listed (B2) | `1:1` write to the registry via `registerRelationType`; label "Add relationship type" on the bar, "Add" as commit | D1b, DRAFT, PAT | S |
| Name rules: required; client "Already exists" is case-sensitive and untrimmed; server is case-insensitive and trimmed and returns HTTP 500 on case-only duplicate (bug). `Form.tsx:29`, `CreateRelationshipType.ts:19` | missing: no validation | improved (Design: validation): check trimmed, case-insensitive on the client; do not copy the 500 | DRAFT | S |
| Edit name: renames the type and its translation key; ids unchanged so nothing else is rewritten. `UpdateRelationshipType.ts:18` | no-op: list shows old name | `1:1` rename in registry; references and template properties follow by id | D1b, STORE | S |
| Inverse name: not in Uwazi (model is `id` and `name`); CLAUDE.md lists "no inverse labels" as a known gap. `RelationshipType.ts:1` | partial: field exists, never stored, blank for seeds | drop (proposal): nothing reads it, so it repeats the fake-save problem. Decision for Juan: if kept, it must be stored on the type and read by the Relationships panel | D1b | S |
| Delete: tick rows, "Delete"; checkbox disabled when a template uses it. Server also refuses if used by relationships or saved queries. `DeleteRelationshipType.ts:21`, `RelationshipTypes.tsx:54` | partial: row removed locally; reference types stay (B5) | improved UX4: refuse when a template property uses it and name the templates; when only references use it show the count and offer "Delete and set those references to no label" (the panel modal's behaviour). Decision for Juan: Uwazi refuses both cases | USAGE, D1b, PAT | M |
| Delete confirm: "Do you want to delete the following items?" with bullet list. `RelationshipTypes.tsx:180` | partial: ConfirmDialog, text describes a reassign the code does not do (H2) | improved UX4: dialog states counts and the exact effect, rewritten to match the code | USAGE, PAT | S |
| Multi-select with "Selected N of M" bar and bulk delete. `RelationshipTypes.tsx:54` | missing | improved UX2 (same bar as other lists) | PAT | S |
| Search and sort: Uwazi has sort only. `RelationshipTypes.tsx:57` | missing | improved UX1: search row (small list, low priority) | PAT | S |
| Save model: panel Save and Cancel per type, toast "Updated", no dirty guard; loader revalidates. `RelationshipTypes.tsx:75` | partial: toast and close, no write-back (B2) | `1:1` write then return to list with row highlighted; add dirty guard on Cancel and Back (improved over Uwazi) | DRAFT, NOTIFY | S |
| Type name translated in context "Relationship Type"; translating happens in Translations. `RelationshipTypeTranslationService.ts:18` | missing | defer: appears automatically as a Translations context once D1c derives contexts | D1c | S |
| Create inline from the template property dialog ("Add relationship type" modal) and from entity view. `AddRelationshipTypeModal.tsx:12` | partial: panel has a manage modal; template dialog uses static seeds | `1:1` one registry shared by Settings, panel modal and template dialog | D1b, D1a | M |
| Empty state "NO DATA AVAILABLE"; error toast "An error occurred" with server detail. `RelationshipTypes.tsx:111` | missing | improved (Design: list-page empty state) with Add action; error path for in-use delete | PAT, NOTIFY | S |
| No socket: other sessions see changes on next load. `sockets.js` | n/a | drop: single-user prototype | - | - |
| Phone: three-column table with Edit. `RelationshipTypes.tsx:17` | partial: 440px table; editor fine | improved UX12: list rows with name and usage, edit in a sheet | PHONE | S |

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
|---|---|---|
| Inverse name field | drop (proposal) | Not in Uwazi v2; no reader; Juan to confirm |
| "Usage" column with seed counts | drop, replace | Seed numbers match no reference; replace with real counts |
| `no_label` and V4 types in the panel registry | keep (hidden, not deletable) | Fallback when a type is deleted; Uwazi has no such type |
| "Manage relationship types" modal in the Relationships panel | keep | Already does real CRUD; must share the registry with Settings |

**Uwazi things the prototype lacks entirely**: none beyond the rows above.

## Languages

Note: Uwazi writes languages through dedicated endpoints and has no form, so every action is immediate after its modal. Install and uninstall run background jobs.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List "Active languages": `<label> (<key>)`, sortable, plus Default, Reset, Uninstall columns. `LanguagesList.tsx:37`, `toTableLanguages.ts:5` | works: native name repeats ("English English"), 4 action columns | improved (Design: Languages finding): one row menu (Make default, Reset, Uninstall), Default shown as badge | D1c, PAT | S |
| Install modal: size lg, search (English label), multi-select, `*` marks available default translation, legend, "Install (N)" disabled until one ticked. `InstallLanguagesModal.tsx:22` | partial: hand-rolled dialog, adds one row per click, no focus trap (M1) | `1:1` on `Modal` with `ModalSearchRow` and `ModalList`; multi-select, "Install (N)", closes on commit | PAT, D1c | M |
| Note in modal: "This action may take some time while we add the extra language to the entire collection." `InstallLanguagesModal.tsx:22` | missing | `1:1` | - | S |
| Catalog: about 186 installable languages; 11 have a predefined UI file (ar, el, en, es, fr, ko, my, ru, th, tr, uk). `availableLanguages.ts`, `defaultTranslations.ts:21` | partial: 32 languages, no "has translation" flag | `1:1` for the flag with the same 11; keep 32-language catalog (defer the rest: no extra value in a prototype) | DATA | S |
| Install effect: language marked `installing`; translations cloned from the default language (untranslated); predefined System strings loaded; entities cloned by job. `AddLanguage.ts:23`, `CloneLanguageEntitiesJob.ts:45` | no-op: row added at 0%; Translations has no column for it (B7) | `1:1` for translations: new column starts as a copy of the default; entity cloning defer (prototype renditions are fixed to 4 languages) | D1c, DATA | M |
| Installing state: task "Installing languages", toast "Languages installed successfully"; table shows no installing state; Uninstall on it returns 409. `LanguagesList.tsx`, `sockets.js:139` | missing | improved (Design: states): row shows "Installing" with a task in the Beacon for a few seconds (mock), Uninstall disabled meanwhile; add the error end state Uwazi never emits | D1c, NOTIFY | M |
| Set default: star button, no confirmation; moves `default` flag only; default is clone source and reference for "untranslated". `SetDefaultLanguage.ts:23` | partial: badge moves; Library default unchanged | improved (Design: confirm on default change): confirm dialog naming the effect; Translations reads the new default | D1c, PAT | S |
| Default language drives visible UI (header and interface pickers). `atoms/language.ts:3` | no-op: pickers use fixed EN/ES/FR/AR constants (B7) | defer: decision for Juan (pickers tied to the 4 renditions); Settings list and Translations use the store | D1c | M |
| Reset: only shown when a predefined file exists; overwrites existing System keys with non-empty CSV text; toast "Language reset success". `PopulateTranslationsController.ts:8` | no-op: toast only | `1:1` against seeded System strings (mock "predefined" set); only System context changes | D1c, DATA | M |
| Reset and Uninstall confirm: "Are you sure?", red "Other users will be affected by this action!", type `CONFIRM`, accept disabled until typed. `LanguagesList.tsx:68`, `ConfirmationModal.tsx:67` | partial: uninstall has plain confirm; reset has none | `1:1` type-the-word variant on `Modal`; improved UX4: show content counts in the dialog | PAT, USAGE | M |
| Uninstall: hidden for default; refused while installing; deletes translations and, by job, entities and pages; task "Uninstalling language". `DeleteLanguage.ts:20` | partial: row removed, default has no button | `1:1` removes the language column in Translations and per-language data; entity deletion defer with the clone | D1c, NOTIFY | M |
| Per-language content counts before delete (Uwazi shows none). `DeleteLanguage.ts:20` | missing | improved UX4: dialog lists records and translated keys in that language | USAGE | S |
| Toasts: "Default language change success", "Language reset success", "Language uninstalled successfully", error "An error occurred". `useApiCaller.ts:18` | partial: hand-rolled toasts | `1:1` through `useSettingsNotify`; log to Activity log | NOTIFY | S |
| Save model: no form, no dirty guard; each action immediate. `LanguagesList.tsx` | works | `1:1` | - | - |
| Propagation: language list feeds Translations columns, Dashboard count, Pages. `sockets.js:82` | no-op: Dashboard and Translations read `seedLanguages` (B7) | `1:1` one languages store read by Translations, Dashboard and Pages | D1c, STORE | M |
| Phone: 704px table with Reset and Uninstall off screen. `LanguagesList.tsx` | partial: sideways scroll, actions hidden | improved UX12: list rows with badge and row menu | PHONE, PAT | S |

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
|---|---|---|
| Translated-percentage column (0% on install) | keep | Matches Design item 8 (per-language progress); derive from the Translations store, no stored number |
| "Set" text button and separate Default badge | drop | Replaced by the row menu and badge |
| Per-language native name next to English name | keep | Helps pick a language; hide when equal |

**Uwazi things the prototype lacks entirely**: "Uninstall blocked while installing (HTTP 409)" is covered in the Installing row; nothing else.

## Translations (list and editor)

Note: Uwazi cannot add or delete keys here. Keys come from the sources (templates, thesauri, relationship types, menu, filters, System CSV), so the prototype must derive contexts, not store them.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| List in two tables: "System translations" (User Interface, Menu, Filters) and "Content translations" (templates, thesauri, relationship types). Name sortable, Type pill, "Translate". `TranslationsList.tsx:35` | partial: one list with seed contexts and fake counts | `1:1` two groups, built from real stores; Type pill warm for all (Design: "System" carbon is off) | D1c, D1a, D1b, D1d | M |
| Contexts with no keys are skipped; a context missing from the first language is hidden (inferred). `TranslationsList.tsx:35` | no-op: contexts show generated "<name> term N" rows | `1:1` skip empty contexts; drop generated rows | D1c | S |
| Template context keys: template name, title label, each property label. `TemplateTranslationService.ts:11` | missing: no link to templates | `1:1` derived from template store; property labels depend on the UX7 decision | D1a, SCHEMA | M |
| Thesaurus context keys: thesaurus name and every value label; created on create, kept in sync on save. `ThesaurusTranslationService.ts:59` | missing: no link to thesauri | `1:1` derived from thesaurus store; renamed value keeps other-language text | STORE, D1c | M |
| Relationship type context: one key, the name. Menu context: link titles. Filters context: group names. `SettingsTranslationService.ts:78`, `RelationshipTypeTranslationService.ts:18` | missing | `1:1` derived from registry, menu and filters stores | D1b, D1d, D1c | M |
| System ("User Interface") keys: from repo CSVs, hundreds of keys; code strings absent from CSV never appear. `updateTranslationsDB.js:46` | partial: seed list capped at 10 generated rows | `1:1` seed 100-200 real UI strings from the prototype's `t()` dictionary as System keys | DATA | M |
| Editor: one table per key, rows are languages (autonym, code pill, value input with clear-X). `EditTranslations.tsx:351` | works as form: term by language grid, source column read-only | keep (proto-only layout: grid is better for scanning, Design agrees); add search, sticky header | D1c | M |
| Value rules: required, "This field is required"; any string accepted; no length rule. `EditTranslations.tsx:351` | missing | `1:1` required per cell; Save blocked with a count of empty cells | DRAFT | S |
| Language pill status: default (primary), untranslated (yellow, value equals default text), translated (gray). `LanguagePill.tsx:11` | missing | `1:1` status per cell; improved UX8: per-language progress in the header (a proper noun counts as untranslated in Uwazi; allow "same as source" mark instead) | D1c | S |
| Toggle "Untranslated Terms": shows keys where some language is untranslated; hides all keys with one language. `EditTranslations.tsx:174` | missing | improved UX8: toggle plus per-language filter and counts | D1c | S |
| Search by key: none in Uwazi. `EditTranslations.tsx` | missing | improved UX1: search keys and values | D1c | S |
| Save: one Save per context, N per-language requests in parallel (partial save possible); then loader revalidates. `EditTranslations.tsx:253`, `SaveLocaleTranslations.ts:23` | no-op: toast, edits lost on reopen (B2) | `1:1` one Save for the context, applied all at once (do not copy the partial save); toast "Translations saved" only after the write | STORE, DRAFT, NOTIFY | M |
| Dirty guard: `useBlocker(isDirty && !submitting)`, "Discard changes?"; no `beforeunload`. `EditTranslations.tsx:219` | missing (B1) | `1:1` through `useDirtyGuard` for Back, Cancel, rail and corpus switch | DRAFT | S |
| Save propagates: thesaurus context edits re-label entity values in that language (async). `PropagateThesaurusTranslationService.ts:43` | missing: UI strings not read from here (B7) | defer: needs entity display per language. Decision for Juan: should System edits change the live `t()` strings for the 4 UI languages | D1c | L |
| Import CSV (System only): `Key` column plus language-name columns; only existing keys with non-empty cells; no confirm, no dirty check. `csvLoader.ts:61`, `EditTranslations.tsx:393` | no-op: toast, no file picker | improved UX3: Dropzone and preview of changed cells before applying; available for every context | PAT, DATA, STORE | L |
| Export CSV: none in Uwazi. `routes.ts` | missing | improved UX3: export a context to CSV (translators work in spreadsheets) | PAT | M |
| Live translate: header language menu, admin only, modal edits one key across languages. `TranslateModal.tsx:27` | missing | defer: outside Settings; needs click targets on every `t()` string | D1c | L |
| Empty editor: info box "There are no untranslated terms" (also when no keys). `EditTranslations.tsx:379` | missing | `1:1` with two distinct messages for "no keys" and "all translated" | - | S |
| Large contexts rendered lazily (`RenderIfVisible`). `EditTranslations.tsx` | partial: 10 rows only | `1:1` virtualised rows for the System context | - | S |
| Phone: grid of key tables. `EditTranslations.tsx` | partial: grid shows Term and English only, sideways scroll | improved UX12: one card per key, language rows stacked, status dot per row | PHONE | M |

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
|---|---|---|
| Key count and "Keys" column in the list | keep | Useful size cue; derive from contexts; add per-language progress (D8). Editor calls them "Term": use "key" in both |
| "Translate" button beside a clickable row | drop | Duplicates the row target (Design); Uwazi has the button, prototype row click is enough |
| Term by language grid (one table) | keep | Faster to scan than Uwazi's one table per key |
| Generated "<name> term N" rows, 10 max | drop | Fabricated data; replaced by derived keys |

**Uwazi things the prototype lacks entirely**: Machine translation is not on this page in Uwazi (entity editor only, behind a feature flag), so out of scope here.
