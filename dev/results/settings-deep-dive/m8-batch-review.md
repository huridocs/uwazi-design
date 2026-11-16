# Template editor M8 and Code's batch: adversarial review

M8: `09083aac` (list), `ab44e4f4` (editor), `bcaccb93` (propagation). Batch `4d235480..a009e643`
(Translations per corpus, Dashboard, role reasons, Pages failures, Dev panel, locked users, SD-6,
SD-7, Menu context). Local `playground` at `a009e643`, clean tree. Static reading. Paths are
relative to `app/src/`.

## Findings, ranked

### 1. High. While CEJIL or Travesía is loading, or after it fails to load, every template reads "0 entities" and can be deleted, and the editor says nothing is lost

- `components/settings/pages/TemplatesPage.tsx:57,71-75` counts entities from `libraryEntitiesAtom`.
  For CEJIL and Travesía that is `[]` until `cejilReadyAtom` or `travesiaReadyAtom` flips
  (`atoms/dataSource.ts` `seedFor`).
- `deleteBlock` (`:40-49`) then sees `entities === 0`, so the "in use by existing entities" refusal
  is off. CEJIL's records are about 26 MB, fetched when Templates opens (`hooks/useSettingsCorpus.ts`),
  so the window is seconds long. If the fetch fails, it stays open.
- The baked `entityCount` fallback the old usage selector had (`templateUsageAtom`) is gone.

Failure: reload on Settings › Templates with CEJIL selected, tick "Resolución de la CorteIDH" (1,084
entities) before the corpus arrives, Delete. The template is deleted. Its entities keep a `typeId`
with no template, so their records project nothing (`recordFieldsFor(undefined, …)` returns `[]`).

The same gap is in the editor: `TemplateEditor.tsx` `impactLines` (`:231-288`) reads the same list,
so removing a property says "No entity holds a value for it, so nothing is lost", which is false.

Fix: use the baked counts (`cejilEntityCountByTemplate`) while the corpus is not ready, and refuse
deletes (or show "counting…") until it is. Do the same for impact.

### 2. High. Created or edited entities don't follow template edits

`data/entityProfiles.ts:193-211` `profileFromRecord` returns the overlay record's saved `metadata`
as is. Every entity created or edited in the session has such a record, a snapshot of the fields at
save time. M8's propagation (`bcaccb93`) re-reads only display flags (`noLabel`, `fullWidth`,
`style`) at render (`MetadataRecord.tsx:179-210`).

After a template edit, those entities:
- still show and edit a **deleted** property, with its value;
- don't get a **new** property in their record or their edit form, so it can't be filled for them;
- keep the **old label** after a rename (the name is kept per S4, but the label is copied into the
  record);
- keep the old order.

Entities never edited do follow, because their profile is a fresh projection and the cache
invalidates. So two entities of one template show different fields.

Fix: project overlay records through the template too (the record supplies values by name; the
template supplies the field list, labels and order).

### 3. Medium. A relationship property added in the editor creates no field anywhere

`blankField` returns null for relationship (`utils/templateProjection.ts`, `LEGACY_TYPE.relationship
= null`), so the edit form never offers it. Records only show relationship fields that already
exist in the data: the Sample builds them from the authored or v4 seed (`data/sample/values.ts`
`rels` map), and CEJIL and Travesía from `metadata[name]`, read-only.

Failure: add "Witnesses" (relationship → Person) to Court Case and save. No entity can be connected
through it: there is no picker in the form, and no empty connection field on the record. The
template editor implies the property exists. Fix: blank relationship fields for the Sample
(`RelationshipFieldEditor` with empty `connectedEntityIds`), or say in the panel that relationship
properties are shown, not created, in this prototype.

### 4. Medium. Re-adding a deleted property's label brings its old values back, under a new type

`utils/templateRules.ts` `newPropertyName` derives the key from the label and checks only the draft
for clashes. A property deleted earlier keeps its values in records and raw metadata (spec §5: soft
removal). Re-adding the same label later, even with a different type, gets the same `name`, and the
projection reads the old values through the new type (`displayStrings(newType, raw)` for CEJIL and
Travesía; native props for the Sample).

Failure: on CEJIL, delete "Estado" (a select) from Causa and save. Later add "Estado" as Numeric.
337 Causas show their old status labels as the "number", and filters and sorts read them.

Fix: when the derived name belonged to a removed property of a different type, suffix it
(`estado_2`). Keep re-use for the same type, which is the Undo-like case the spec intended.

### 5. Low-medium. Dev switches ship in production code paths

The Dev panel is `import.meta.env.DEV` only (`views/catalog/sidebarGroups.ts:173`,
`ComponentCatalog.tsx:2403`). But production code imports and honours its atoms:
- `consumeFailureAtom` in `SettingsDeletes.tsx:271` and `CodePageEditor.tsx:58`;
- `slowLoadingAtom` in `SettingsTable.tsx:156`;
- `slowLoadAtom` in `useSettingsCorpus.ts`;
- `sectionFlagOffAtom` / `featureFlagsAtom` in `atoms/settings.ts` and `SettingsView.tsx`, which
  read `sessionStorage["uwazi:dev:features"]` and `["uwazi:dev:slowLoad"]` in every build.

Nothing in a production build can set them except devtools, so this is not reachable for a user,
but:
- the code ships;
- a feature flag left off in a dev session on the same origin (for example a preview served by
  `vite preview` on the dev port) hides Settings sections with a "switched off" message.

Gate the reads with `import.meta.env.DEV` so production tree-shakes them.

### 6. Low. Smaller items

- `atoms/templateActions.ts:93-105` `deleteTemplatesAtom` removes other templates' relationship
  properties that target the deleted template (Uwazi does), with no inheritor check. A property
  another template inherits through that relationship (`inheritorsOf`) disappears without the
  refusal the editor applies to a direct removal.
- `reconcileLibraryAtom` runs only for the collection the Library shows (`:21-22`). Templates edited
  for another collection leave that collection's stale facet, type and sort selections until it is
  shown, when they apply silently. They are dropped on the next template action there.
- Translations: keys are addressed by id (`atoms/translations.ts:19-24`), so template, property and
  thesaurus renames keep their translations. Clean. A translated property label does not reach the
  Sample record's labels (those come from `lbl`), which is consistent with G8.

## Checked and clean

- **Retype:** locked for saved properties. The type select is offered only for a new property
  (`TemplatePropertyPanel.tsx:194-200`); `withType` keeps only flags the new type offers.
- **Rename:** the label changes and the `name` is kept (S4). Records, filters, cards and columns key
  by name. Translations key by id.
- **Inherited-property refusal:** `inheritorsOf` (direct `inherit.property === prop.id`, and chain
  fields ending on the template). Removal is refused with names (`TemplateEditor.tsx` `removeSelected`).
  It works on the Sample (`propertyIdOf` ids on both sides) and CEJIL.
- **Generated ID:** Title's "Generated ID" seeds new entities' titles (`entityChanges.ts`
  `startDraftAtom`). A `generatedid` property is drawn once for a new entity and left out of bulk
  edit.
- **Template delete:**
  - Default and in-use refusals in Uwazi's words, with the way forward (when counts are known; see
    1).
  - The cascade lists the relationship properties removed and the Filters entries.
  - All-or-nothing bulk delete.
- **Propagation to entities never edited** (forms, records, Library filters, cards, columns) on all
  four corpora:
  - The profile cache clears on a template change.
  - `LibraryFilters` re-derives facets from `templatesAtom`.
  - Cards read `showInCard` at render, columns are keyed by name, and property values re-read after
    a template change (`a1ee3125`).
- **Same-label rule:** visible error naming the template and the differing field
  (`sameLabelIssue`). New properties share another template's name for the same label, so they
  combine in the Library.
- **Impact confirm on Save** (when counts are known): removed properties with holders and values,
  thesaurus re-matches, off-target connections, new required fields.
