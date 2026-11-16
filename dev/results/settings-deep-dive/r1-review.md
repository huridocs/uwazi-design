# Settings R1: adversarial review

Commits `a8f591a9` (usage from real records), `7cbe4201` (one relationship-type registry per
collection), `94c7e577` (Filters and Collection seeded per corpus), `b0ebbde3` (role and store edges).
Base `67df5b47`, local `playground`, clean tree. Static reading. Paths are relative to `app/src/`.

## Findings, ranked

### 1. Medium. Most Sample relationship types can be deleted although a template field uses them, and the case record then disagrees with its Relationships tab

`utils/settingsUsage.ts:75-93` builds the Sample schema from `TYPE_FIELDS` and
`relationshipFieldsByLanguage` only. It leaves out the v4 seed's relationship fields
(`data/sampleSeedV4.ts:173-179`, `V4_FIELDS`: Victims → `victim`, Petitioners → `petitioner`,
Respondent State → `respondent_state`, Judgments → `judgment_of`, Signed by → `signed_by`, …).
`relationTypeUsage` therefore finds no template using those types, so Uwazi's first refusal ("Cannot
delete type being used in templates") never fires for them.

Failure: Settings › Relationship types › delete "Victim", move its references to No label. The
registry drops `victim` and every Victim reference becomes No label. But the Court case record still
shows a "Victims" field with the same people, because `v4RelationshipFields` reads the static
`V4_HUBS` (`data/sampleSeedV4.ts:203-206`), not `referencesAtom`. Fix: add `V4_FIELDS` to
`sampleSchema`.

### 2. Medium. Renamed and created Sample types show stale or raw labels in connection cards and "When"

`utils/inheritance.ts:13` builds `relationLabelById` once, at module load, from the static
`relationTypes`. `renameRelationType` (`data/references.ts`) mutates the array's objects and
`registerRelationType` appends, but the Map is never rebuilt. `relationLabel()` feeds
`resolveRelationshipField` (`:179`), `mergeConnectionRows` (`:346`) and
`components/relationships/when/WhenBody.tsx:43`.

Failure: rename "Relates to" to "Associated with". The record's connection cards and the When view
still say "Relates to". A type created in Settings shows its raw id `rt-…`. The panel rows, chips and
filter slide-over read the array at render time, so they are right once remounted. Fix: look the
label up in the array (or the atom) at call time.

### 3. Medium. On CEJIL, Settings usage reads 0 unless the Library was opened first

The new reader needs raw records (`atoms/settingsUsage.ts` `readerAtom`, `cejilReady ?
heldFromRaw(...) : []`). `useLoadSettingsCorpus` (`hooks/useSettingsCorpus.ts:23-37`) loads only
Travesía. `byTemplate` returns null while the corpus is unloaded, as the comment says ("unknown, not
zero"), but every caller turns it into `[]` (`groups?.get(id) ?? []` in `thesaurusUsageAtom`,
`valueUsageAtom` and `propertyUsageAtom`).

Failure: reload on Settings › Thesauri with CEJIL selected (the stored view), then delete
Descriptores or remove one of its values. The dialog and the Beacon report no entity holding it.
Removing País in the template editor reports 0. Template counts are fine (baked). Fix: load CEJIL in
`useLoadSettingsCorpus`, and show "counting…" or "unknown" while the corpus is null. The swallowed
loader error from P1 #2 is still there (`() => {}`).

### 4. Medium-low. Two writers of the Sample registry, with different rules

`components/relationships/ManageRelationTypesModal.tsx` (the panel's Manage types) still writes
`relationTypesAtom` itself:
- Add checks only the slug id. "Victim of" can be added there although Settings already has
  "Victim of" (`rt-…` id), so the duplicate-name rule (`relationTypeNameIssue`) is bypassed.
  Conversely, a name whose slug matches a renamed type's old id is refused with "already exists"
  while no type of that name is visible.
- Delete reassigns to No label without checking template fields, without Undo and without an
  Activity log entry. Settings refuses the same delete, or offers a move with Undo.

Page briefs G6 asked that both go through one registry *and* one set of rules. Route the modal
through `saveRelationTypeAtom`, `deleteRelationTypeAtom` and `restoreRelationTypeAtom`.

### 5. Medium-low. Persistence and reset differ across the relationship-type registries

- The Sample registry (`relationTypesAtom` plus the static mirror) is in memory and is **not**
  registered with Reset demo data (`atoms/relationTypes.ts` registers only `cejilStore`). Reset
  clears the log, users, filters and CEJIL's types, but leaves Sample renames, creates, deletes and
  moved references.
- The CEJIL store persists in sessionStorage, while the Sample registry is lost on reload. The
  Activity log (persisted) keeps "Created relationship type X" for a type that is gone after reload.

Register a reset for the Sample registry, and say in CLAUDE.md that the Sample registry is
visit-only, as references are.

### 6. Medium-low. "Per collection" covers CEJIL only; Travesía and Artworks edit the Sample's registry

`atoms/relationTypes.ts:37` maps every non-CEJIL source to `mock`. On Travesía, Settings ›
Relationship types lists and deletes the Sample's types and moves the Sample's references, while the
Library shows Travesía, whose own types (`data/travesia/schema` `travesiaRelTypeName`) are not
listed. Page briefs G3 makes relation types per corpus. At least label the page with the collection
it edits, or give Travesía its seed (as CEJIL has).

Related: CEJIL's store is read only by Settings. CEJIL references and record fields label types by
`typeName` from the dump (`data/cejil/profile.ts` `cejilReferencesFor`), so a CEJIL rename changes
nothing outside Settings, and Create relationship on a CEJIL entity offers the Sample's types. The
commit message claims the panel and fields read it by id; for CEJIL they don't.

### 7. Low. Small edges

- `atoms/filters.ts:60` `relTypeFiltersAtom` keeps an active filter on a deleted type id. The panel
  shows a filter count and matches nothing until cleared. Clear it on delete (restore it on Undo).
- `components/library/LibraryFilters.tsx` (`94c7e577`): `shownTypes = matched.length ? matched :
  types`. If an admin unticks every template in Filters, the facet shows every template. That is
  Uwazi's rule for an *empty* `settings.filters`, not for "all hidden".
- `FiltersPage` save drops Library type filters on hidden templates (only for hidden rows, by id,
  through `libraryTypeFiltersAtom`). That is correct. It does not run on Reset demo data, which
  re-shows everything, so it doesn't need to.
- `views/SettingsView.tsx` now writes the fallback section into the persisted `settingsSectionAtom`.
  When a collaborator is bumped to Account and an admin later signs in, the admin lands on Account,
  not their last section. This is harmless.
- `AccountPage` 2FA toggles now go through `saveUserAtom`. If the signed-in record already violates
  the identity rule (a duplicate left from an earlier build), the toggle silently does nothing.
  This is unlikely.

## Checked and clean

- **Registry by id:**
  - Settings list, editor and delete use `settingsRelationTypesAtom` and ids.
  - The template editor's relationship-type select offers ids from the registry, with "Select…"
    first, so a type added or renamed in Settings shows at once.
  - The move targets are every other type plus No label.
  - `no_label` is never listed in Settings and stays last on create.
- **Rename:**
  - The id never changes.
  - The Sample atom and the static mirror are both updated.
  - Panel rows, chips, filter slide-over, `connectionGrouping` and Bert read the mirror at render or
    call time.
- **Delete, move and Undo (Sample):**
  - Only references on the type are moved; hubs stay on one type and anchors are untouched.
  - Undo restores the type at its index (atom and mirror) and moves back only references still on
    the target.
  - CEJIL delete goes through the store and `restoreAtom` (a seed id leaves `deleted`; a created
    record is re-created).
  - CEJIL refuses when references use the type ("Cannot delete type being used in relationships",
    Uwazi's wording).
- **Duplicate names** are trimmed and refused case-insensitively (`relationTypeNameIssue`), which is
  stricter than Uwazi's case-sensitive client.
- **Usage cost:**
  - Dialog selectors run only while open or on click.
  - List rows read `relationTypeUsageAtom(id)` (one `referencesAtom` filter per type, recomputed only
    when references change; CEJIL from baked counts).
  - The CEJIL reader is a map lookup per entity (`cejilEsBySid`).
  - No per-render corpus scans.
- **Usage values:** matched by id first (thesaurus value ids, entity ids), label only when a record
  has no id (Sample native props). Group ids include their children. Session records (edit form,
  bulk, Copy From, Create) are read before the corpus record.
- **Filters seeding:** each corpus's own types, all active. The Sample shows every type again.
  Travesía and Artworks have their facet back. Each collection has its own name in the window title.
- **Role edges:**
  - Self-demotion asks first.
  - The stored section follows the fallback, so the rail marks Account.
  - Import CSV is gated (redirects and doesn't render).
  - Account goes through `saveUserAtom`.
  - `hasId` is now a function declaration (the TDZ trap is closed).
  - Unversioned v1 keys are cleared once; the regex keeps `uwazi:settingsSection` and the activity
    log.
