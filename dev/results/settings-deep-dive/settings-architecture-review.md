# Settings deep dive, phase 1: architecture review

Reviewed: `playground` at `f4d0d5b5` (same as `origin/playground`). Read only; nothing changed.
Scope: `app/src/views/SettingsView.tsx`, `app/src/components/settings/**`, and the atoms and data they
touch (`atoms/thesauri.ts`, `atoms/dataSource.ts`, `atoms/dirtyGuard.ts`, `hooks/useDirtyGuard.ts`,
`atoms/references.ts`, `atoms/sitePages.ts`, `atoms/language.ts`, `data/settings.ts`,
`data/cejil/settingsAdapt.ts`, `data/references.ts`, `data/metadata.ts`), plus the consumers outside
Settings that should read what Settings writes.

All paths below are relative to `app/src/`.

## Summary

Only two settings domains have a store that outlives the page: thesauri (`atoms/thesauri.ts`) and page
code documents (`atoms/sitePages.ts`). Every other page keeps its list in `useState`, seeded from a
static import. That state is lost when the section changes, and nothing outside Settings reads it.
Most editor Save buttons only push a toast. No settings page registers with the dirty guard, so the
guard that `SettingsNav` calls always lets navigation through. Templates and relation types each exist
in two or three unconnected stores. Template properties use a type vocabulary that the edit form does
not use. Deletes never check usage. Several confirm messages describe effects the code does not
perform.

The thesauri store is the right model to copy: seed plus a per-corpus change overlay, stable ids, and
one store shared by Settings, the edit form, bulk edit and batch entry.

---

## Blockers (ranked)

### B1. The dirty guard does not cover Settings

- `hooks/useDirtyGuard.ts:21` `useRegisterDirtyForm` is called in only two places:
  `components/metadata/BulkEditBody.tsx:84` and `views/MetadataView.tsx:806`. No settings page or
  editor registers.
- `components/settings/SettingsNav.tsx:139` wraps the section switch in `guard(...)`. With nothing
  registered, `guardNavigationAtom` (`atoms/dirtyGuard.ts:70`) always runs the navigation immediately.
- Inside a page, list → editor → list is local `editing` state. The back arrow and breadcrumb
  (`SettingsContent.tsx:72-80`, `:102-108`) call `onBack` directly. The mobile drill-out
  (`SettingsContent.tsx:86`) sets `settingsMobileDrilledAtom` directly. None of these goes through the
  guard.
- `views/SettingsView.tsx:86,94` keys the page on `dataSource`, so switching corpus remounts the page
  and drops every local edit without asking.

Failure: edit Template "Court Case", add three properties, click "Thesauri" in the rail. The editor
unmounts, the edits are gone, and no prompt appears. The same happens with the back arrow, a navbar
link, the mobile back chevron or a corpus switch.

### B2. Save buttons that do nothing but toast

Each of these reports success, closes or stays, and writes nothing that anyone reads:

| Page | Line | What Save does |
|---|---|---|
| `RelationTypeEditor.tsx` | 34 | toast, close |
| `UserEditor.tsx` | 46 | toast, close (the "Reset" 2FA button is toast-only too) |
| `GroupEditor.tsx` | 37 | toast, close |
| `MenuLinkEditor.tsx` | 64 | toast, close |
| `TranslationEditor.tsx` | 48 | toast, close |
| `FiltersPage.tsx` | 114 | toast |
| `CollectionPage.tsx` | 57 | toast |
| `CustomisationPage.tsx` | 33 | toast |
| `ExtractorEditor.tsx` | 139 | toast |
| `ParagraphJobEditor.tsx` | 121 | toast |
| `PreserveTokenEditor.tsx` | 126 | toast |
| `LanguagesPage.tsx` | 318 | "Reset" toasts and changes nothing |
| `TranslationsPage.tsx` | 80 | "Import translations (CSV)" toasts |
| `UploadsPage.tsx` | 163 | "Upload file" toasts |
| `AccountPage.tsx` | 150-155 | Username and email inputs have no Save button at all, and the page has no footer |

`TemplateEditor.tsx:146` saves a partial result. `onSave` receives only `{ name, color }`. Property
edits (add, delete, reorder, required, filter, cards, type config) are dropped.
`TemplatesPage.tsx:24-43` never updates `propertyCount`. Reopening the template reloads the seed
properties (`TemplateEditor.tsx:78-82`).

Failure: open Court Case, untick "Required" on Case number, Save. The toast reads "Court Case saved".
Reopen the template and Case number is required again.

### B3. Lists held in component state are lost on navigation

`useState` seeded from a static import: `TemplatesPage.tsx:18`, `RelationTypesPage.tsx:18`,
`UsersPage.tsx:29-30`, `LanguagesPage.tsx:55`, `MenuPage.tsx:18`, `PagesPage.tsx:23`,
`UploadsPage.tsx:34`, `MetadataExtractionPage.tsx:16`, `PreservePage.tsx:15`, `AccountPage.tsx:69`
(API keys), `FiltersPage.tsx:77-83`, `CollectionPage.tsx:41-47`, `CustomisationPage.tsx:20-21`.
`ParagraphExtractionPage.tsx:53` renders `seedParagraphJobs` directly and has no setter.

`App.tsx:92-93` mounts `SettingsView` only while `appView === "settings"`, and `SettingsView.tsx:38-79`
mounts one page at a time, so leaving the section or the view resets all of it.

Failure: delete user "afarah", switch to Languages and back. afarah is listed again.

### B4. Templates: Settings and the rest of the app use different stores

- Settings lists `seedTemplates` (`data/settings.ts:71`, a module-load snapshot of `entityTypes`) or
  `cejilSettingsTemplates` (`data/cejil/settingsAdapt.ts:46`), held in local state.
- Library, cards, facets and colours read `libraryTypesAtom` (`atoms/dataSource.ts:120`), which reads
  `entityTypesAtom` (`atoms/entities.ts:9`) or the corpus adapters. The edit form's template picker
  uses `corpusTypes(corpus, entityTypesAtom)` (`views/MetadataView.tsx:1449`). `CreateRelationshipModal`
  reads `entityTypesAtom` (`components/relationships/CreateRelationshipModal.tsx:37`).
- Nothing writes `entityTypesAtom`.

Failure: rename "Person" to "Individual", or change its colour. The Library, cards, facets and the
form's template picker still show "Person" in the old colour. A template added in Settings cannot be
chosen when creating an entity.

### B5. Relation types: three registries, and the Settings one matches no reference

1. Settings: `seedRelationTypes` (`data/settings.ts:238`): ids `r1..r5`, hard-coded `usageCount`
   (142, 87, ...), or `cejilSettingsRelationTypes`, held in local state.
2. Runtime: `relationTypesAtom` (`atoms/references.ts:109`), ids `mentions`, `relates_to`, ...
3. The static array `relationTypes` (`data/references.ts:1084`), read directly by `ReferenceRow`,
   `AggregateRow`, `HubRow`, `ActiveFilterChips`, `RelationshipsFilterSlideOver`, `connectionGrouping`,
   `inheritance` and `AgentModal`. It is mutated only through `registerRelationType` /
   `unregisterRelationType`.

`components/relationships/ManageRelationTypesModal.tsx` already does real CRUD on 2 and 3. It counts
usage from `referencesAtom` (`:31-37`) and reassigns orphans to `no_label` on delete. Settings ›
Relationship types does none of this. Its delete message (`RelationTypesPage.tsx:75`, "Its N
relationships lose their type and become unlabeled") describes the modal's behaviour, but the page
only removes a row from local state (`:80`).

Failure: delete "Mentions" in Settings. Every Mentions reference keeps its type, the Relationships
panel still labels them "Mentions", and the type comes back when the page is revisited.

### B6. The template property model cannot drive the edit form

- Settings `PropertyType` (`data/settings.ts:80`): `text | select | relationship | date | numeric |
  markdown | geolocation | image`.
- Form `MetadataField.type` (`data/metadata.ts:10`): `text | date | link | country | multiline |
  file-list | media | select | multiselect`, plus `RelationshipMetadataField`.
- The form builds its fields from each entity's own metadata (`data/metadata.ts`,
  `atoms/entityMetadata.ts:14`), not from a template schema. There is no template-schema store for the
  form to read.
- The CEJIL adapter loses information (`data/cejil/settingsAdapt.ts:25-39`): `multiselect` becomes
  `select`, and `multidate`, `daterange` and `datasection` become `date`. Saving a CEJIL template back
  would change the property types.
- Type config for existing properties is never loaded. `config` starts empty
  (`TemplateEditor.tsx:83`), so the dialog defaults to the first option
  (`TemplateEditor.tsx:366-368`). Editing a CEJIL `select` bound to "Tipo" shows the first Sample
  thesaurus, "Violation types", and Save writes that.
- The option lists are static Sample data addressed by **name**, not id (`TemplateEditor.tsx:34-36`):
  thesauri from `seedThesauri` (so a thesaurus created in Settings is missing, and CEJIL shows Sample
  thesauri), target templates from `seedTemplates`, and relation types from `seedRelationTypes` (ids
  `r1..`, not the `mentions` ids that `RelationshipMetadataField.relationType` uses, see
  `data/metadata.ts:465`).
- Choosing a thesaurus in Settings never writes `thesaurusBindingsAtom`, which is what the form
  resolves (`views/MetadataView.tsx:1320`, `components/metadata/BulkEditBody.tsx:91`).

This needs a product decision before any build-out: is the template the schema the edit form renders
(Uwazi's model), or a display-only list? See D7.

### B7. Other consumers read static seeds, not Settings

| Domain | Consumer | Reads |
|---|---|---|
| Users | `views/LoginView.tsx:45`, `components/share/ShareEntityModal.tsx:45`, `atoms/entityChanges.ts:206` | `seedUsers`, `seedGroups` |
| Languages | `atoms/language.ts:3,8` | fixed `EN/ES/FR/AR`. Settings keys are lowercase and include `pt`, so they share no key |
| Languages | `TranslationEditor.tsx:63`, `DashboardPage.tsx:61` | `seedLanguages`, not the Languages page list, and not CEJIL's |
| Filters | `components/library/LibraryFilters.tsx:55-72` | hard-coded facets and `cejilSettings`. Nothing reads the Filters page or the template `filterable` / `showInCard` flags (only Travesía's own JSON drives cards, `data/travesia/adapt.ts:79`) |
| Menu | none | no navbar or site surface reads the menu |
| Collection | none | name, landing page, default view and access flags are read by nobody |
| Translations | `TranslationsPage.tsx:72` | static `seedTranslationContexts`. A new template or thesaurus gets no context. The UI's `t()` dictionary (`utils/i18n`) is separate |
| Dashboard | `DashboardPage.tsx:5,27,57-61` | the static `entities` seed (ignores the entity overlay and the corpus), and a "Relationships" figure summed from the fake `usageCount` |
| Activity log | `ActivityLogPage.tsx:60-65` | static `seedActivityLog`. No Settings action is logged |

---

## High

### H1. Ids that collide

- `TemplatesPage.tsx:29`: `tpl-${prev.length}-${patch.name.length}`. With 8 templates, add "Alpha"
  (`tpl-8-5`), delete any template (8 left), add "Gamma": it also gets `tpl-8-5`. The two rows share a
  React key, and the edit patch (`:40`) changes both.
- `TemplateEditor.tsx:122`: `np-${props.length}-${name.length}-${label.length}`. Add property "Date",
  delete another property, add "Year": same id. `patchProp` and `deleteProperty` then act on both rows,
  and `config` is overwritten.
- `FiltersPage.tsx:106`: `g-${prev.length}-${rows.length}`. Add two groups (`g-0-N`, `g-1-N`), remove
  the first, add one: `g-1-N` again. Both chips rename together, and a row assigned to one is shown in
  both.
- Users belong to groups by **name** (`data/settings.ts:30`, `UserEditor.tsx:42`,
  `GroupEditor.tsx:25`). Renaming a group, once Save works, would drop every member.
- Toast ids are `Date.now().toString()` in about 15 settings files. `hooks/useNotify.ts:14` adds a
  sequence number and is used only by `TranslationsPage`.

### H2. Deletes never check usage, and confirm messages describe effects that don't happen

| Delete | Where | Missing |
|---|---|---|
| Template | `TemplatesPage.tsx:110` | Entity count per template. The default template (`isDefault`) can be deleted. The message ("will lose this template's properties", `:105`) is not what happens: nothing happens outside the page |
| Thesaurus | `ThesauriPage.tsx:77` → `atoms/thesauri.ts:211` | Properties and `bindings` that point at it, and entity values that use it. Bindings to the deleted id stay in the overlay. The message ("fall back to free text", `:72`) is not verified |
| Thesaurus value | `ThesaurusEditor.tsx:92,105` | Entities holding the value. CEJIL records keep the value id, which then resolves through `cejilValueLabels` or prints the raw id (`atoms/thesauri.ts:284`) |
| Relation type | `RelationTypesPage.tsx:80` | Reference count. `ManageRelationTypesModal` has the logic, see B5 |
| Language | `LanguagesPage.tsx:316` | Content in that language. EN/ES/FR/AR carry metadata and renditions |
| Group | `UsersPage.tsx:212` | Members. Deleting "Research" leaves "Research" chips on jnkemba and afarah, and `UserEditor` still offers it (it reads `seedGroups`) |
| User | `UsersPage.tsx:197` | The signed-in account and the last admin can both be deleted |
| Page | `PagesPage.tsx:127` | Menu links to `/page/<slug>`. The message says they "will break" and does not list them |
| Upload | `UploadsPage.tsx:177` | References from pages and CSS |

### H3. Dirty flags that are wrong

- `TemplateEditor.tsx:105`: `Object.keys(config).length > 0`. Open any property's dialog and press
  Save with no change. `commitProperty` writes a config entry (`:127`), the template reads as dirty,
  and Save is enabled for an unchanged template.
- `FiltersPage.tsx:89-92`, `CollectionPage.tsx:49-55`, `CustomisationPage.tsx:28`: the baseline is a
  constant, so after Save the page is still dirty and Save stays enabled. Once these register with the
  guard, it would prompt after a successful save.
- `ThesaurusEditor.tsx:246` and the other editors accept a whitespace-only name ("   " passes
  `!name`). The save then falls back to the old name or "Untitled".

### H4. Each page handles the corpus differently

- Templates, Relation types, Languages, Menu, Pages, Collection, Filters and Dashboard check only
  `dataSource === "cejil"`. On `artworks` and `travesia` they show the Sample seed, while the Library
  shows that corpus's own types (`atoms/dataSource.ts:120-138`).
- Thesauri handle `travesia` (`atoms/thesauri.ts:54`) and map `artworks` to the Sample.
- Users, Uploads, Extraction, Preserve, Account and Customisation ignore the corpus.
- Settings is collection-level in Uwazi. The prototype treats it as per-corpus for some pages and
  global for others, with no rule for which.

Failure: with the Library on Travesía, Settings › Templates lists Court Case and Person, which are not
Travesía templates. Settings › Thesauri lists Travesía's thesauri.

### H5. Pages: the list and the code documents disagree

- `PagesPage.tsx:23` keeps the list in local state, but `CodePageEditor` commits to the global
  `codeDocsAtom` (`site/CodePageEditor.tsx:77-78`). A page made with "Add page" disappears from the
  list on navigation, and its document stays in `codeDocsAtom` with nothing listing it.
- The list prints `SettingsPage.title` (`PagesPage.tsx:70`). The editor edits `draft.en.title`. A
  renamed page keeps its old title in the list.
- The editor's back arrow (`CodePageEditor.tsx:224`) discards an unsaved draft without asking, even
  though `unsaved` is computed at `:69`.

---

## Medium

### M1. Two dialogs are not `Modal`

CLAUDE.md requires every dialog to use `components/shared/Modal.tsx`.

- `TemplateEditor.tsx:389` `PropertyDialog`: a hand-rolled overlay with no `role="dialog"`, no focus
  trap, no focus restore and no sheet-layer registration. Its window `keydown` Escape handler
  (`:372-376`) ignores the layer stack (`8386bcfd`) and `preventDefault`, so pressing Escape in its
  `Select` dropdown closes the whole dialog.
- `LanguagesPage.tsx:219` install dialog: `role="dialog"` but no `aria-modal`, no focus trap, and the
  same window Escape listener (`:67-74`). It should use `ModalSearchRow` / `ModalList`.

`ConfirmDialog` and the `site/` modals use `Modal` correctly.

### M2. Settings buttons do not follow the bar ladder

- `SettingsButton.tsx:24` `success` is a green fill and is every editor's commit. The ladder's commit
  is solid ink (`COMMIT_FILL`, `warmButton.ts:19`).
- `SettingsButton.tsx:19-20` `primary` and `secondary` are both `WARM_BUTTON`, which includes
  `WARM_EDGE`. Every footer lead action ("Add template", "Add user", ...) therefore has an edge in an
  action bar, which the ladder forbids. That slot should use `BAR_LEAD` when there is no commit.
- `danger` is a solid seal fill. The bar ladder uses `BAR_DANGER` text.
- Disabled is a vellum chip, unlike any other bar.

### M3. Row actions are inconsistent

- `UsersPage.tsx:103-116,137-150` hand-rolls pencil and trash buttons instead of `RowActions`.
- `UploadsPage.tsx:70` passes `copyUrl` as `onEdit`, so the list view shows a pencil labelled "Edit
  logo-iachr.svg" that copies a URL.
- Languages has Set, Reset and Uninstall as separate columns. AccountPage has Copy and Revoke as text
  buttons.

### M4. No shared notification or audit path

Toasts are pushed by hand through `toastsAtom` in about 15 files, plus `useNotify`. No page ever
reports an error, because there is no validation or failure path besides `TemplateEditor`'s name
check. Nothing appends to the activity log.

### M5. The Thesaurus editor disagrees with the shared store's rules

- Duplicate labels are accepted. The form's `addThesaurusValueAtom` deduplicates by `foldLabel`
  (`atoms/thesauri.ts:136-137`). Settings can save "Torture" twice in one group.
- The list's count (`atoms/thesauri.ts:76`, seed `itemCount` plus the delta) differs from the editor
  header's `countItems(items)` (`ThesaurusEditor.tsx:164`). Violation types shows 24 in the list and
  9 in the editor.
- A group can be saved with no children (`toValues`, `:36-42`), which leaves a group with nothing to
  select.

### M6. The User and Group editors read seeds, not the page

`GroupEditor.tsx:25,30,62` lists and counts `seedUsers`. `UserEditor` lists `seedGroups`. Deleted
users and groups still appear. `memberCount` is stored (`data/settings.ts:45`) rather than derived.

### M7. The menu model is flat

`SettingsMenuLink` has no parent (`data/settings.ts:328`). Every group opens with the same
`SAMPLE_SUBLINKS` (`MenuLinkEditor.tsx:23,45`), whatever the group is.

---

## Checked and clean

- Gutters: `SettingsContent` is a `gutter-host-main` host with `bleed` header, body and footer
  (`SettingsContent.tsx:36-44`), and `SettingsNav` is `gutter-host-rail`. Both match the CLAUDE.md
  table.
- `SettingsTable` wraps `DataTable`. Clickable rows get the stretched-button target, and every list
  with `onRowClick` passes `rowAriaLabel`.
- `ConfirmDialog` is built on `Modal` and is used by every list delete.
- The `site/` modals (`TemplatePickerModal`, `CopyFromLanguageModal`, `PaletteModal`) use `Modal`.
- The thesauri store (`atoms/thesauri.ts`): per-corpus overlay, stable `newId`, value ids rather than
  labels, and one store shared by Settings, `MetadataView`, `BulkEditBody` and `BatchEntryModal`. It is
  only missing usage checks (H2) and persistence across reload.
- `codeDocsAtom` keeps a draft and a published version per page, and survives navigation.
- `SettingsNav` calls the guard correctly. The problem is that nothing registers with it (B1).

---

## Proposed foundation, sized as Code dispatches

Order: D7 (a decision) blocks the template part of D1a. D1-generic and D2 come before any domain
work. D3 and D4 can run in parallel after D1-generic. The domain dispatches follow.

**D1-generic: settings collection store helper (Code, about 1 session).**
Extract the pattern in `atoms/thesauri.ts` into `atoms/settingsCollection.ts`:
`createSettingsCollection<T extends {id}>({ seedOf(corpus), corpusScoped })` returning
`listAtom(corpus)`, `createAtom`, `patchAtom`, `deleteAtom` (overlay `created / patched / deleted`,
sequence-based `newId`). Decide once whether a domain is per-corpus or global (H4), and record it in
CLAUDE.md. Optionally persist the overlay to sessionStorage. Port Users and Groups first as the proof:
ids, not names, for membership, and `memberCount` derived.

**D1a: templates store, including properties (Code, 1-2 sessions; blocked by D7).**
One template store per corpus that `libraryTypesAtom`, `corpusTypes`, `CreateRelationshipModal` and
Settings all read. `TemplateEditor` saves properties. The property dialog loads existing config and
offers live thesauri, templates and relation types by id. Choosing a thesaurus writes
`thesaurusBindingsAtom`. Fix the id generators (H1) and the dirty flag (H3).

**D1b: one relation-type registry (Code, under 1 session).**
Settings › Relationship types reads and writes `relationTypesAtom` through the code path
`ManageRelationTypesModal` already uses (`registerRelationType`, reassign to `no_label`, usage from
`referencesAtom`). Delete `seedRelationTypes` and the fake `usageCount`. Decide whether the inverse
name is in scope; v2 stores one `type` (CLAUDE.md, Known gaps).

**D1c: languages and translations (Code, 1 session).**
A languages store keyed by the same codes as `atoms/language.ts`. `TranslationEditor` columns come
from it, translation contexts are derived from templates and thesauri, and edits are stored. Decide
whether the installed languages also change the header picker, which is tied to the four renditions.

**D1d: singleton settings (Code, 1 session).**
Collection, Filters, Menu (with a parent id), Customisation, Uploads and Account profile as stores.
Wire the readers: `LibraryFilters` reads the filter config, and the navbar or site reads the menu and
collection name. Fix H5 by putting the Pages list in a store and taking the list title from the doc.

**D2: edit-session hook (Code, about 1 session).**
`useSettingsDraft({ id, label, base })` returns `{ draft, set, dirty, save, discard }`. `dirty` is
compared with the **stored** value, so it clears after save. It calls `useRegisterDirtyForm`.
Route the editor back arrow, breadcrumb, mobile drill-out and the corpus-switch remount through
`useDirtyGuard`. Cancel stays an explicit discard. Every editor moves onto it. This fixes B1 and H3.

**D3: usage queries and a guarded delete (Code, about 1 session).**
`utils/settingsUsage.ts` with one function per domain: template → entity count (overlay applied);
thesaurus → properties, bindings and entity values; value → entities; relation type → references;
language → records with content; group → members; user → the signed-in user and the last admin;
page → menu links. Add a `DeleteWithUsageDialog` on `Modal` that shows the counts and either blocks
the delete or states the reassignment that will happen. Rewrite the confirm messages so they describe
what the code does (H2).

**D4: settings notify and audit (Code, under 1 session).**
`useSettingsNotify` wraps `useNotify` (sequence ids, success and error) and appends to an
`activityLogAtom` that `ActivityLogPage` and `DashboardPage` read. Remove the hand-rolled `toastsAtom`
pushes.

**D5: pattern pass (Code, under 1 session; Design to confirm the ladder mapping).**
Move `PropertyDialog` and the install dialog to `Modal` and `ModalParts`. Map `SettingsButton` to the
ladder: commit = `COMMIT_FILL`, footer lead = `BAR_LEAD`, others = `BAR_GHOST`, delete =
`BAR_DANGER`, no edge in footers. Move `UsersPage` to `RowActions`, and give Uploads a "Copy URL"
action of its own. This is visible on every settings page, so check it with Juan first.

**D7: decision for Juan (Operator to raise).**
Should a template's property list become the schema the edit form renders, which would unify the two
type vocabularies (B6) and make Settings › Templates functional? Or should it stay a display-level
editor (name, colour, card and filter flags) while the form keeps per-entity fields? D1a's size
depends on the answer: about 1 session for display-level, and 3 or more for schema-driven forms
across the four corpora.
