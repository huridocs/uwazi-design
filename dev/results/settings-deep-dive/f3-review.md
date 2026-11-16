# Settings F3: adversarial review

Range `218b468f..570c1921` on local `playground` (9 commits, HEAD `570c1921`, clean tree). Static
reading, plus one data check against `public/cejil-data/entities.json`. PLAUSIBLE marks a finding I
did not reproduce in a browser. Paths are relative to `app/src/`.

## Findings, ranked

### 1. Medium. CEJIL usage counts are 0 for the properties and thesauri that matter most

`atoms/settingsUsage.ts:68-81` reads CEJIL and Travesía values from `e.searchFields`. CEJIL's
`searchFieldsOf` (`data/cejil/adapt.ts:298-310`) leaves out `pa_s` and `descriptores` on purpose
(`HOISTED_KEYS`, `:256`, they live in `country`/`descriptors`), and `searchVals` returns "" for
`SKIP_TYPES` (geolocation, media, nested).

Results, on CEJIL with the corpus loaded:
- Thesauri › Descriptores › Delete: the block fires (bound properties), but the "N entities hold
  one of its values" line is missing. Descriptores is the corpus's most-used vocabulary.
- Thesaurus editor › remove a Descriptores value (`components/settings/pages/ThesaurusEditor.tsx`
  `undoNotice` → `valueUsageAtom`): the Beacon says nothing about the entities holding it, so the
  user is told nothing is affected.
- Template editor › remove País (`pa_s`, a relationship on most templates; 2,925 ES records hold it)
  or a `media` / geolocation property: the usage reports **0** entities.

Fix direction: the CEJIL reader should read `metadata[name]` (or `country`/`descriptors` for the two
hoisted keys), not the search index.

Smaller related issue: `utils/settingsUsage.ts:303` splits values on `", "`, so a value whose label
contains ", " never matches.

### 2. Medium. Sample usage ignores session edits and created entities

`atoms/settingsUsage.ts:75-79` reads the Sample's values from `entityMetadataAtom.EN[e.id][p.name]`,
the native seed props. Values written by the edit form, bulk edit, Copy From and Create entity live
in the entity overlay's `records` (`data/entityChanges.ts`), which this reader never consults.

Failure: in the Library, set Status = "Decided" on three Sample cases, open Settings › Thesauri ›
Case status and remove "Decided". The Beacon reports nobody holds it. A created entity is never
counted for property or value usage. (Template counts are right: `byTemplate` applies the overlay.)

### 3. Medium. Settings › Relationship types is still not the registry, so usage and delete drift after any rename or create

`components/settings/pages/RelationTypesPage.tsx` keeps its list in `useState` (`saveType` writes
only there), while usage and delete find the registry entry **by label**
(`atoms/settingsUsage.ts:180-181`, `SettingsDeletes.tsx:140`).

- Rename "Mentions" to "Mentioned in" and save. The registry still says "Mentions", so
  `relationTypeUsageAtom` finds no `registryId`: the row shows **0 references**, the delete dialog
  says "No references or relationship fields use it", and Delete removes only the Settings row. The
  registry keeps the type and every reference keeps it.
- "Add type" in Settings never reaches `relationTypesAtom`, so the panel's Create relationship can't
  use it.
- Delete a type here, which really removes it from the registry, then leave and come back: the row
  is back (the seed), now with 0 references.
- Page briefs G6 says "both go through the one registry". F3 does not do that yet. Recommend the
  D1b dispatch (Settings list = `relationTypesAtom`).

### 4. Medium. Relationship-type move + delete cannot be undone, and nothing says so

`atoms/settingsUsage.ts:205-216` rewrites `referencesAtom`, filters `relationTypesAtom` and mutates
the static registry (`unregisterRelationType`). There is no Undo in the Beacon, and the dialog never
says the move is permanent (`SettingsDeletes.tsx:150-157`). Removing a template property, a
thesaurus value or a filter group all offer Undo, so this outlier reads as undoable.

Correctness of the move itself is fine:
- Every reference of the type is rewritten, hub members included, so a hub stays on one type.
- Anchors (`sourceSelection`/`targetSelection`) are untouched.
- Relationships re-derive at render (`deriveRelationships`).

PLAUSIBLE: a Relationships panel filter on the deleted type id (relation-type facet) stays active and
matches nothing until cleared.

A design point to confirm: page briefs G6 recommended that Settings refuse (Uwazi) and that the
panel modal keep the reassign. The code says "Juan's decision: the references can be moved"
(`utils/settingsUsage.ts:338-340`). If that decision is recorded, fine; it isn't in
`page-briefs.md`.

### 5. Low-medium. "Saved … by …" crosses collections for per-corpus pages

`atoms/activityLog.ts:68-73` keys the line by `domain:targetId`. Filters, Collection and
Customisation use constant ids (`FiltersPage.tsx:281` "filters", `CollectionPage.tsx:129`,
`CustomisationPage.tsx:140`), and per-corpus records such as languages (`"es"`) share ids across
corpora. The log has no corpus field.

Failure: save Filters on the Sample, switch to CEJIL, open Filters. It reads "Saved just now by
admin". Fix: add the corpus to the entry and the key for per-corpus domains (CLAUDE.md › Settings
stores).

### 6. Low-medium. Saves that still don't persist are now logged as real changes

`useSettingsNotify.record` appends to the Activity log for every save, but several of those saves
still write nothing that survives (review B2/B3, F1 finding 1):
- Collection, Customisation and Filters.
- Template property edits (`TemplateEditor` `onSave` takes only name and colour).
- Translations, Languages (local state), Menu and Relationship types (local lists).

The log now says "Updated template “Court Case”" with the save time and user, for edits that are
gone after navigation. That makes the audit trail inaccurate. Either log only store-backed saves,
or land the stores first.

### 7. Low. Undo stays live after Save on pages that stay open

`hooks/useSettingsUndo.ts:28-33` ends an undo only on unmount. FiltersPage stays mounted after Save
(`markSaved`). Remove a group, Save, then press Undo in the Beacon: the group comes back into the
draft and the page is dirty again. The notification still says "Nothing is saved until you save the
filters", which is now false. Fix: clear the owner's undo on save (or have `markSaved` call it).

Everything else in the undo pattern is sound:
- Double Undo returns false; the card shows the reason.
- Undo after the editor unmounts is disabled with "The editor closed…", and the request atom can't
  leak, because `requestSettingsUndoAtom` checks the live op first.
- Ownership is per mount (`useId`).

### 8. Low. Template editor's inherited-property refusal can never fire on the Sample

`TemplateEditor.tsx` `deleteProperty` → `propertyUsageAtom` matches the Sample editor's properties by
label (`utils/settingsUsage.ts:188-194`). The Sample's inherited properties are Person's `country`
and `role` (`relationshipFieldsByLanguage`), but the editor's Person list is "Full name", "Date of
birth", "Nationality", "Photo" (`data/settings.ts` `templatePropertiesByTemplate.person`). Nothing
matches, so removing "Nationality" never shows the refusal. This is review B6, which the template
schema work resolves. On CEJIL the rule works: ids are `${templateId}-${name}`
(`data/cejil/settingsAdapt.ts:68`), and the geolocation inheritance resolves.

### 9. Low. Smaller items

- `ActivityLogPage.tsx`: seed rows l2, l6 and l7 now carry `domain`, so the "Request (example)"
  block is hidden for them. The page's comment says seed rows have no domain.
- `atoms/activityLog.ts:62`: the log grows without a cap in sessionStorage, and every append
  rewrites the whole array. About 250 bytes an entry, so this is harmless for a demo. A cap (500)
  would end the question.
- `lastSavedAtom` and the usage `atomFamily`s (`atoms/settingsUsage.ts`) never `remove` params;
  object-keyed families with `areEqual` scan all prior params on each lookup. This is fine at Settings
  scale.
- Page briefs G4 recommends dropping the self-disable 2FA button. `6fd53472` added a confirm to it
  instead. Confirm which one Juan wants.

## Checked and clean

- **ConfirmDelete** (`components/shared/ConfirmDelete.tsx`):
  - It is a `Modal`, so it has the focus trap, focus restore, Escape and the overlay layer stack,
    and `dismissOnScrim={false}`.
  - A blocked delete swaps the message for the rule and offers only OK.
  - The confirm is `aria-disabled`, and inert until it is ready.
  - The typed word is exact (`CONFIRM`, trimmed), as in Uwazi's language uninstall.
  - `aria-describedby` covers the message and the facts.
  - The reassign `Select` claims its own Escape (P1).
- **Refusal rules match the briefs and Uwazi:**
  - The default template and templates with entities are refused.
  - A thesaurus bound to a property is refused (it now counts session bindings too, through
    `boundProperties`).
  - A relationship field using a type is refused.
  - The default language is refused.
  - Self and last admin are refused, and group delete is not refused.
  - A property inherited elsewhere is refused (CEJIL/Travesía).
- **Template counts:** the baked CEJIL counts (`cejilEntityCountByTemplate`, 4,398) equal the live ES
  entities per template exactly. The list doesn't jump when the corpus loads.
- **Performance:**
  - Delete-dialog selectors mount only while the dialog is open.
  - The row counts (`TemplateEntityCount`, `RelationTypeReferenceCount`) share one `byTemplate`
    grouping per corpus, recomputed only on an overlay change.
  - `schemaOf` is cached.
  - Value and property usage run on click through `store.get`, not per render.
- **Notifications:**
  - Non-settings toasts are unchanged. The Beacon only forwards the new optional `detail`/`action`.
  - NotifCard keeps the Library undo's `conflicts` gate and uses it only for `kind: "undo"`.
  - No double notifications: the editors moved from hand-built toasts to `record`, and the remaining
    `notify` calls are transient (copy, 2FA reset, demo reset).
  - Every delete dialog and every editor Save goes through `record`.
