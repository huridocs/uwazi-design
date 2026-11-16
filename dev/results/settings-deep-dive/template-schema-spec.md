# Template schema spec: one template model for forms, filters, cards and columns

Status: design only, no code. Written 2026-10-04 against `playground` `f4d0d5b5`.
Decision being implemented (Juan): a template's property list becomes the schema that the entity edit
form, the record, Library filters, Library cards and Library list columns all render, in all four
corpora (Sample, CEJIL, Artworks, Travesía).

Inputs: `settings-architecture-review.md` (B4, B6, D1a, D7), Research's `uwazi-settings-inventory.md`
(Part 0.2 Propagation, Part 3 Template editor, Property-type matrix, Cross-template compatibility,
Server validation, Filters), and the app code. Paths are relative to `app/src/` unless they start with
`app/` or name the Uwazi reference repo.

---

## 1. Where things stand

The template is not a schema today. Each corpus carries its schema in a different place and in a
different form, and every consumer has learned some of them:

| Corpus | Where the "template" lives | Value storage | Key | Losses today |
|---|---|---|---|---|
| Sample | `TYPE_FIELDS` in `data/entityProfiles.ts:180` (prop, editor type, thesaurus), plus the hand-authored field list of `e3` (`data/metadata.ts:129`), the v4 seed fields (`data/sampleSeedV4Fields.ts`) and relationship fields (`data/metadata.ts:463`) | Display strings per language in `data/entityMetadata.ts` (`baseProps` + `localized`) | camelCase prop id (`caseNumber`, `born`) | Dates stored as display text (`born`, `dateFiled` are `text`). `e3`'s fields (`victim`, `country`, `bench`) do not match its own template `court_case` (`caseNumber`, `status`, ...) |
| CEJIL | `cejilTemplates` (`data/cejil/templates.ts`), Uwazi shape without property `_id`, `showInCard`, `filter`, `required` (the importer's `cleanProp` drops them, `app/scripts/import-cejil.cjs:230-236`) | Uwazi metadata `{value, label, ...}[]` per property per language in `public/cejil-data/entities.json`. Relationship values and 315 `inheritedValue`s are present | Uwazi property `name` | `mdFields` (`data/cejil/profile.ts:184`) turns `multidate` into a joined string typed `date`, `multidaterange` into a string, geolocation into text, and skips `nested`, `link`, `image`, `preview` and every relationship property (the record builds connections from the graph instead) |
| Travesía | `travesiaTemplates` (`data/travesia/templates.json`), Uwazi shape **with** `_id`, `showInCard`, `filter` | Uwazi metadata, one language | Uwazi property `name` | `scalarField` (`data/travesia/profile.ts:21`) turns `daterange`/`multidaterange` into text and geolocation into text, and drops `image` |
| Artworks | none. `templateFields()` copies an existing entity's fields and empties them (`utils/createEntity.ts:38-49`) | Typed fields in `data/artworks/artworks.ts`, projected in `data/artworks/profile.ts` | synthetic ids (`wikipedia`, `artist`) | No template to edit at all |

The consumers that need the schema:

- **Edit form, Create entity, Change template, Bulk edit** read `templateFields(typeId, corpus)`
  (`utils/createEntity.ts:31`) for blank forms and `getEntityProfile(id).metadata[lang]` for records.
  Field editors switch on `MetadataField.type` (`data/metadata.ts:10`: `text | date | link | country |
  multiline | file-list | media | select | multiselect`) in `views/MetadataView.tsx` and
  `components/metadata/*`.
- **Record layout** comes from `deriveTemplateStructure(profile)` (`utils/templateStructure.ts:57`).
  It derives the "template" from the entity's own fields. CEJIL orders those fields with
  `orderByTemplate` (`data/cejil/profile.ts:649`).
- **Cards** read `Entity.fields` (`CardField[]`, `data/entities.ts:28`). The adapters precompute it
  from the seed: Travesía uses `showInCard` (`data/travesia/adapt.ts:74`), and CEJIL and Artworks
  choose by hand. `utils/entityEdit.ts:63` (`adapterPatch`) patches the cached lines after an edit.
- **List columns** come from `metaColumn(label)` (`components/library/listColumns.tsx:150`) and are
  keyed by **label** "because it is the only key the corpora share".
- **Filters** are fixed dimensions (`utils/libraryFilter.ts:88`: type, doc, status, country,
  descriptor, date, inherited, search, matchType), plus CEJIL chain facets. Corpus-specific defs come
  from `libraryInheritedDefs` (`utils/libraryFacets.ts:26`). No property's `filter` flag is read.
- **Template list and colours** come from `entityTypesAtom` / `libraryTypesAtom` / `corpusTypes`
  (`atoms/dataSource.ts:112-138`), which hold `{id, name, color}` only.

`kindOfUwaziType` (`utils/propertyKind.ts`) already maps Uwazi types onto renderer kinds. This spec
builds on it.

---

## 2. Property-type vocabulary

One vocabulary: **Uwazi's own property types**, with the same names. Every consumer derives what it
needs (editor, record renderer, card kind, facet kind, column) from the property's `type`.
`MetadataField.type`'s current union becomes a derived view field, then goes away (step M9).

```ts
type PropertyType =
  | "text" | "markdown" | "numeric"
  | "date" | "multidate" | "daterange" | "multidaterange"
  | "select" | "multiselect"
  | "relationship"
  | "link" | "image" | "preview" | "media" | "geolocation"
  | "generatedid"
  | "nested";            // CEJIL only, as in Uwazi (settings.project === "cejil")
// Common properties: title (text), creationDate (date), editDate (date).
```

### 2.1 Type matrix

The "Uwazi flags" columns follow the inventory's property-type matrix (Part 3), which is Uwazi's
`ConfigPropertyPanel.tsx:56-72`. "Ours" is the prototype renderer. "Today" is the code that does it
now, or "new" when nothing does.

| Type | Stored value (`MetadataValue.value`) | Form editor | Record renderer (`items.tsx` kind) | Card kind (`PropertyKind`) | Filter: Uwazi `filter` / `defaultfilter` / `prioritySorting` | Our facet | List column |
|---|---|---|---|---|---|---|---|
| text | `string` | `EditInput` text (today `text`) | short | `text` | yes / yes / yes | text match (contains), new | yes, sortable |
| markdown | `string` (markdown) | textarea (today `multiline`) | long, markdown | `long` | yes / yes / no | text match | no (too long), offered off |
| numeric | `number` | number input, **new** | short | `text` | yes / yes / yes | numeric range, new | yes, sortable, right-aligned |
| date | `number` epoch seconds | date input (today `date`, but on a display string) | short | `date` | yes / yes / yes | date range (reuse `TimeBrush` / date facet) | yes, sortable |
| multidate | `number[]` | date list, **new** | short, "·"-joined | `dateSpan` | yes / yes / no | date range (any value in range) | yes (first + "+N") |
| daterange | `{from: number\|null, to: number\|null}` | from–to pair, **new** | short "from – to" | `dateSpan` | yes / yes / no | date range (overlap) | yes |
| multidaterange | `{from,to}[]` | list of pairs, **new** | short, "·"-joined | `dateSpan` | yes / yes / no | date range (any overlap) | yes (first + "+N") |
| select | thesaurus value id, `label` denormalized | `ThesaurusPicker` single | short | `select` | yes / yes / yes | value list with counts | yes, sortable by label |
| multiselect | value id per item | `ThesaurusPicker` multi | chips | `chips` | yes / yes / no | value list, AND/OR | yes (first + "+N") |
| relationship (link only) | connected `sharedId`, `label` denormalized | `RelationshipFieldEditor` (entity picker filtered by `content`) | `RelationshipFieldCard` | `relationship` | yes / yes / no | value list of connected entity titles | yes (titles) |
| relationship + `inherit` | connected `sharedId`. The inherited value is **resolved at render** (CLAUDE.md), and `inheritedValue` from a dump is only a fallback (§4.4) | same editor, inherited column read-only | connection table with inherited column, `↳ via` trail | the inherited property's kind | yes / yes / no | Facet on the **inherited** value, typed by `inherit.type` (today `inherited` facet) | yes (inherited values) |
| link | `{label: string, url: string}` | label + URL pair (today a bare URL string) | link | `link` | no / no / no | none | yes |
| image | file id / URL | image picker (Files tab attach) | `ImageCard` | none (it is the thumbnail) | no | none | no |
| preview | none (no value) | not in form | not in record. The Document tab and thumbnail use it | none | no | none | no |
| media | `string` raw Uwazi media value (URL[, timelinks JSON]) | `MediaFieldEditor` | `MediaFieldValue` | `media` | no | none | no |
| geolocation | `{lat, lon, label?}` (the dump writes `lon`) | lat/lon + label, **new** (pick on map later) | place text (`formatPlace`) | `place` | no / no / no | none (the Map view reads it) | yes (formatted) |
| generatedid | `string` | text, prefilled on create, editable | short, monospace | `text` | yes / yes / no | text match | yes |
| nested (CEJIL) | Uwazi nested rows | read-only (Uwazi has no UI for `nestedProperties` either) | table | `table` | yes (Uwazi) / no ours | none in this phase | no |

Prototype values that have no Uwazi type, and where they go:

| Today (`MetadataField.type`) | Used by | Becomes | Why |
|---|---|---|---|
| `multiline` | Sample descriptions | `markdown` | Same thing |
| `country` | Sample `e3.country` (with flag) | `select` bound to a new Sample thesaurus "Countries". The flag comes from the label via `utils/countryFlag.ts` | Uwazi has no country type. CEJIL's `pa_s` is a relationship; Sample has a Country template but `e3` names countries as text |
| `file-list` | Sample `e3.bench`, `e3.other-files` | `bench` becomes `markdown` (a list of "Role: Name" lines). `other-files` is dropped from metadata: those files belong to the Files tab | Uwazi has no list-of-pairs type. Turning `bench` into a relationship to Person is the faithful model, but it needs seven judge entities first. Listed as an open question (§9) |
| `text` holding dates (`born`, `dateFiled`, judgment `date`) | Sample `TYPE_FIELDS` | `date` | Converted at seed time (M4) |
| `text` holding coordinates | CEJIL and Travesía geolocation today | `geolocation` | Stop flattening |

### 2.2 Prototype-only extensions on a property

These are kept, and marked as prototype-only so the handoff can tell them apart from Uwazi fields:

- `relationship`: `x.inheritPath`, `x.inheritLeaf`, `x.reduce`, `x.connectionKey`, `x.entityLabel`
  (today on `RelationshipMetadataField`, `data/metadata.ts:56`). `x.connectionKey` is derived as
  `${relationType}:${content}` when absent, as Travesía already does (`data/travesia/profile.ts:96`).
- `origin: "uwazi" | "prototype"`: CEJIL's multi-hop chain fields (`data/cejil/graph.ts`,
  `CEJIL_PERPETRATOR_CHAIN`) are not Uwazi properties. They become `relationship` properties with
  `origin: "prototype"` in the CEJIL template seed, so a template edit shows them and can't
  accidentally hand them off as Uwazi.

---

## 3. Template store

### 3.1 Shapes

```ts
interface PropertyDef {
  id: string;            // stable; Uwazi `_id`, or synthesized (§4.2). Never changes.
  name: string;          // metadata key (§4.1). Stable in the prototype (§5, rename).
  label: string;
  type: PropertyType;
  // Uwazi flags (defaults false, style "cover")
  required?: boolean; noLabel?: boolean; showInCard?: boolean;
  filter?: boolean; defaultfilter?: boolean; prioritySorting?: boolean;
  fullWidth?: boolean; style?: "cover" | "contain";   // image, preview, media
  generatedId?: boolean;                              // title only
  // Pointers
  content?: string;      // select/multiselect: thesaurus id. relationship: target template id ("" = any)
  relationType?: string; // relationship: relation-type id (the runtime registry's id, see B5)
  inherit?: { property: string /* target PropertyDef.id */; type: PropertyType };
  nestedProperties?: string[];
  // Prototype-only (§2.2)
  x?: { inheritPath?: ChainSegment[]; inheritLeaf?: string; reduce?: InheritReduce;
        connectionKey?: string; entityLabel?: string };
  origin?: "uwazi" | "prototype";
}

interface TemplateDef {
  id: string; name: string; color: string; isDefault: boolean;
  commonProperties: PropertyDef[];   // title, creationDate, editDate — always present
  properties: PropertyDef[];         // order = form, record, card and Template-tab order
  entityViewPage?: string;
}
```

### 3.2 Per-corpus store

`atoms/templates.ts`, built on the D1-generic collection helper from the architecture review and
following `atoms/thesauri.ts`:

```ts
templatesAtom(corpus): Atom<TemplateDef[]>         // seed + overlay
templateAtom(corpus, id): Atom<TemplateDef | undefined>
overlay per corpus: { created: TemplateDef[]; replaced: Record<id, TemplateDef>; deleted: string[] }
writers: saveTemplateAtom (whole-template replace, like saveThesaurusAtom), deleteTemplateAtom,
         setDefaultTemplateAtom
```

- Whole-template replace on save, as Uwazi's editor saves a whole template. Undo is "put the previous
  value back", the same as the entity overlay (`data/entityChanges.ts` header).
- Reads outside React (profiles, `templateFields`, `getEntityProfile`) go through a mirror kept in
  step by the atom's one write path, as `overlayMirror()` does for entities.
- `entityTypesAtom`, `libraryTypesAtom` and `corpusTypes` become projections:
  `templates.map(t => ({id, name, color}))`. Colours: CEJIL's `null` colours keep their palette
  fallback (`data/cejil/typesAdapter.ts`).
- The Settings `SettingsTemplate` list (`data/settings.ts:62`) becomes a projection too:
  `propertyCount = properties.length`, and `entityCount` comes from the D3 usage query.

### 3.3 Seeds

| Corpus | Seed module | Source | Notes |
|---|---|---|---|
| Sample | `data/sample/templates.ts`, new and hand-authored | `entityTypes` + `TYPE_FIELDS` + `e3`'s fields + v4 seed fields + `relationshipFieldsByLanguage` | `court_case` gets the union of what `e3` and the other cases carry, in a reviewed order. Labels are English. Per-language labels remain a Translations concern (out of scope, §9) |
| CEJIL | `data/cejil/templatesSeed.ts` | `cejilTemplates` | Property ids synthesized (§4.2). Flags seeded as §4.3. The chain fields are added with `origin: "prototype"` |
| Travesía | `data/travesia/templatesSeed.ts` | `travesiaTemplates` | Direct: has `_id`, `showInCard`, `filter`. `inherit.property` is already a target `_id` |
| Artworks | `data/artworks/templates.ts`, new | the two types in `data/artworks/typesAdapter.ts` and the fields `data/artworks/profile.ts` emits | Artwork: artist (relationship → Artist), genres (multiselect on a new "Genres" thesaurus), nationalities (multiselect), dataset number (numeric), image (image). Artist: born and died (date), genres, nationalities, wikipedia (link), paintings (numeric), works (relationship → Artwork) |

---

## 4. Entity values

### 4.1 Key: the property `name`

Entity values are stored in Uwazi's shape, keyed by property `name`:

```ts
interface MetadataValue { value: unknown; label?: string; inheritedValue?: MetadataValue[]; inheritedType?: PropertyType }
type EntityValues = Record<Language, Record<string /* property name */, MetadataValue[]>>;
```

Why `name` and not `id`:
- CEJIL and Travesía records are already keyed by `name`, so neither needs a data migration.
- Every key-based feature already uses it as `MetadataField.id`: click-to-fill (`fillRequestAtom
  {fieldId}`), Copy From (`field.id`), card focus (`data-field-key`, `CardField.key`),
  `adapterPatch`, `changedFieldIds`, and bulk edit (`BulkField.id`). Keeping `name` as the key keeps
  `MetadataField.id === name`, so none of them changes.
- Uwazi itself keys by `name`.

`PropertyDef.id` is the stable identity that Settings uses for rename detection, `inherit.property`
and Copy From's content pointer. Values never key on it.

### 4.2 Property ids per corpus

- Travesía: Uwazi `_id`.
- CEJIL: the dump in the repo has no property `_id`. Synthesize `${templateId}:${name}`. That is
  stable and unique, and the same synthesis must be used everywhere.
- Sample and Artworks: `${templateId}:${name}`, the same rule.

CEJIL's one `inherit` (`Causa.geolocalizaci_n_de_los_hechos`, `data/cejil/templates.ts`) names target
property `_id` `5bda135079c9836e9331e3d2`, which the stripped dump cannot resolve. Resolution rule
for seeds: if the target template has exactly one property of `inherit.type`, use it (here
`ubicaci_n_geogr_fica_geolocation`). Otherwise leave it unresolved and mark the property
`x.inheritUnresolved`, so the form shows the connection without an inherited column. This replaces
the name-matching in `inheritedPlaceRelName` (`data/cejil/profile.ts:150`, `data/cejil/adapt.ts:427`).

### 4.3 CEJIL flags the dump lost

`cleanProp` keeps only `name`, `label`, `type`, `relationType`, `content` and `inherit`. Two options:

1. **Re-import with the flags (preferred).** Extend `cleanProp` to keep `_id`, `showInCard`,
   `filter`, `defaultfilter`, `prioritySorting`, `required`, `noLabel`, `style` and `fullWidth`, then
   re-run `app/scripts/import-cejil.cjs`. The dump is **not** at `CEJIL_DUMP_DIR` (`/tmp/cejil`
   is absent on this machine), so Juan has to provide it. This is a local file read, not a call to
   CEJIL's server, so the `recover-cejil-docs.cjs` caps don't apply.
2. **Seed heuristics (fallback).** `filter = showInCard = thesaurus-backed select/multiselect`, which
   is `isThesaurusBacked` (`data/cejil/settingsAdapt.ts:56`). In addition, `pa_s` (relationship) is
   `filter: true` because today's Country facet hoists it (`data/cejil/adapt.ts:256`). `required`
   is false everywhere.

The spec works with either. M1 uses option 2 and records it in the seed module. Option 1 replaces it
later in place.

### 4.4 How each adapter maps into values without loss

| Corpus | Read path | What changes |
|---|---|---|
| CEJIL | `entity.metadata` (per language record) **as is** | `mdFields` stops converting types. `multidate` stays `number[]`, `daterange`/`multidaterange` stay `{from,to}`, geolocation stays `{lat, lon}`. Relationship properties are read from `metadata[name]` (they are present: 2,925 of 13,194 records carry `pa_s`). `inheritedValue` (315 in the dump) is used only when the connected entity is not in the sampled corpus, so the inherited cell is not left empty |
| Travesía | `entity.metadata` as is | Dates are epoch **ms** (`data/travesia/types.ts:59`). Normalize to seconds in the adapter so every corpus shares one date unit. `daterange` stays a pair |
| Sample | `data/sample/values.ts`, generated once from `entityMetadata.baseProps` + `localized`, `metadataFieldsByLanguage` (e3) and the v4 seed | Dates are parsed to epoch seconds. Select and multiselect labels are matched to Sample thesaurus ids by label (seed `t1..t5` plus the new Countries thesaurus); a label with no match becomes a `label:` pseudo-key (`atoms/thesauri.ts:260`). Values stay per language, because the Sample is translated |
| Artworks | `data/artworks/values.ts`, derived from `artworks.ts` at module load | Typed values, one language list shared by all four (as today) |

Overlay records (`EntityRecord.metadata`, `data/entityChanges.ts`) switch from `AnyMetadataField[]`
per language to `EntityValues`. The overlay is an in-memory atom (`atoms/entityChanges.ts:41`), so
there is no persisted session data to migrate. Every writer changes in the same step (M3b).

### 4.5 One projection

`utils/templateProjection.ts` (new): `fieldsFor(entityId | null, template, values, lang):
AnyMetadataField[]`. It is the only function that turns template plus values into the view model the
record, form, Copy From, bulk edit and Change template already consume.

- One field per property in template order, empty ones included (the form needs them, and the record
  already skips empty values).
- It sets `MetadataField.propertyType` (new, optional during the migration). The legacy `type` is
  derived from it until M9.
- Relationship fields are built from the property (`relationType`, `content` → `targetTypeId`,
  `inherit` → `inheritProperty` = the target property's **name**, looked up through the target
  template) plus `x`.
- It replaces `cejilBlankFields`, `mdFields`, `travesiaBlankFields`, `scalarField`,
  `relationshipField`, `blankTypeFields`, `synthFields` and the artworks field builders.
  `templateFields()` becomes `fieldsFor(null, template, {}, lang)`.
- Values a record holds for undeclared names (CEJIL records have some) are not projected. Change
  template already counts them (`utils/changeTemplate.ts:73-86`).

---

## 5. Changes to a template, and what follows

Uwazi semantics come from the inventory (Part 0.2, Template editor "Effects of an update", Server
validation, Cross-template compatibility). "Ours" is what the prototype does, including the
confirm-with-impact improvement. Impact counts come from the D3 usage queries over the corpus with
the entity overlay applied.

| Change | Uwazi | Ours | Confirm shows |
|---|---|---|---|
| **Add property** | Label required and unique in the template (case- and trim-insensitive). `name` is derived from the label with `safeName` (non `[a-z0-9]` → `_`, lower-case). The same `name` in another template must have the same or a compatible type, the same thesaurus (select) and the same relationType, content and inherit (relationship). The client blocks mismatches silently (red cells); the server returns `PropertyTypeMismatchError` and friends | Same rules, with the reason **in words** beside the disabled Save, and the "same name in other templates" table. Takes effect on template Save. Existing entities hold no value: the form shows the field empty, and cards and filters skip it until values exist | No confirm (nothing is lost). If `required`: a note that "N entities will need a value the next time they are edited" |
| **Rename (label)** | `name` is re-derived from the label. Entity metadata keys are migrated by a background job; translations are re-keyed; filters are renamed (top level only) | **Label only; `name` is kept.** This is a deliberate divergence: seeds are static, and every key-based feature (§4.1) would otherwise need a key migration. Record it in `handoff/DATA-SEAMS.md`. Columns and facets read labels from the template, so the new label shows everywhere at once | None. Settings says once, quietly, "Internal name stays `<name>`" |
| **Retype** | Refused (`PropertyTypeChangeError`). The editor shows the type read-only | Refused, with the type read-only. **Improvement, optional, behind a confirm:** convert within Uwazi's compatible pairs only (select↔multiselect, date↔multidate, daterange↔multidaterange, text↔markdown). Moving to the single form keeps the first value | "N entities hold more than one value; only the first is kept" (multi → single). Single → multi loses nothing |
| **Change thesaurus** (select) | Allowed. Cross-template consistency on `content` | Allowed. Values are re-matched to the new thesaurus by label (`foldLabel`); unmatched ones become `label:` pseudo-keys and show as "not in thesaurus" | "N values of M entities have no match in <thesaurus> and will show as free text" |
| **Change relationship target / type / inherit** | Allowed. Denormalized and inherited values are rebuilt by a background job | Allowed. Inherited values resolve at render, so the change shows at once. Connected entities that are no longer of the target template stay connected and are marked "outside target" in the editor | "N connections point to entities that are not <template>" |
| **Delete property** | Removed on Save, no client confirmation. A background job deletes the values (data loss). **Refused** if another template inherits it (`InheritedPropertyCanNotBeDeleted`) | Same refusal, naming the inheriting templates and properties, and also refused for our `x.inheritPath` chains that end on it. Otherwise removed on Save. The values stay in the overlay but are no longer projected (re-adding the same `name` restores them; undo restores them) | "Removes <label> from N entities (M values). It is also a filter / shown on cards / a list column." Listing filter, card and column use is our addition |
| **Reorder / flag changes** (`showInCard`, `filter`, `defaultfilter`, `prioritySorting`, `required`, `noLabel`, `fullWidth`, `style`) | Saved. A `filter` change triggers a light re-save job | Saved, applied at once. Unticking `filter` clears `defaultfilter` and `prioritySorting`, as in Uwazi (`ConfigPropertyPanel.tsx:145-150`). An active Library filter on a property that stops being filterable is cleared through the same path as `clearLibraryFacetsAtom` | None |
| **Rename template** | Translations re-keyed; filters renamed, top-level only (a known Uwazi gap inside groups) | Name changes everywhere at once (it is one store). Filter entries reference template **ids**, so the Uwazi group gap does not apply | None |
| **Set default template** | One default; set from the list | Same. Create entity lists it first, and Upload uses it (`utils/createEntity.ts:56,65`) | None |
| **Delete template** | **Refused** for the default template and for one with entities. Otherwise: relationship properties in other templates that target it are removed, its translations are removed, and `settings.filters` drops it | Same two refusals, each saying how to proceed: "Set another default first", or "N entities use it → Change their template" (opens the existing `ChangeTemplateDialog` with them selected). Otherwise the confirm lists every relationship property in other templates that targets it (they are removed) and every `x.inheritPath` that passes through it (those properties are removed too) | Entity count, the dependent properties by template, and filter entries |

Copy From, bulk edit and Change template keep Uwazi's `sameProperty` rule: same `name`, same or
compatible type, same content pointer, same inherit. With thesaurus ids now on select fields, the
content pointer includes the thesaurus (`utils/copyFrom.ts:129` notes that scalars have no thesaurus
"here"; they will).

---

## 6. How each surface reads the schema

### 6.1 Edit form, record, Create entity, Change template, Bulk edit

- Fields: `fieldsFor(entity, template(entity.typeId), values, lang)` (§4.5). Editors switch on
  `propertyType`. New editors are needed for numeric, multidate, daterange, multidaterange,
  geolocation and link `{label,url}`. Existing editors: `EditInput`, `ThesaurusPicker`,
  `MediaFieldEditor`, `RelationshipFieldEditor`.
- `required` is validated on save, through the same path as `utils/validation.ts`.
- The record and the Template tab use the template directly. `deriveTemplateStructure` reads
  `template.properties` instead of inferring from the profile, and `orderByTemplate` is no longer
  needed.
- Bulk edit: `commonFields` compares properties by `name` + compatible type + content
  (`utils/bulkEdit.ts:46`). `list` types (multidate, multidaterange) stay excluded from bulk edit, as
  now.

### 6.2 Cards (`showInCard`)

A card shows the template's `showInCard` properties in template order, skipping `image`, `preview`
and `markdown` (Travesía's `SKIP_CARD`). Values come from the record through the projection, with a
first value plus "+N" for multi-valued properties, as `CardField` does today.
`Entity.fields` and the card half of `adapterPatch` go away. Cache per `(record identity, template
identity, language)`, because cards render for the whole corpus (CLAUDE.md performance traps; see
§8).

### 6.3 Library list columns

One column per property in the union of the templates in view, keyed by **`name`** instead of
label (`metaColumnId(label)` → `metaColumnId(name)`). Properties with the same `name` and a
compatible type across templates share one column, which is Uwazi's combine rule for filters. Off by
default, as now. A property with `prioritySorting` gets a sort key. Column visibility already
persists by id, so a label rename no longer breaks a saved column choice.

### 6.4 Library filters

- Facets: one per property with `filter: true` in the templates in scope. Properties with the same
  `name` and a compatible type across templates combine into one facet, which is Uwazi's documented
  combine rule (filter tooltip, inventory Part 3). The facet kind comes from the type (§2.1).
- Scope: with no Type facet selection, the facets of every template in the corpus. With types
  selected, only theirs.
- `defaultfilter`: shown expanded, before the others. This follows the Uwazi tooltip ("This property
  will be the default filter in the library for this template"); the exact behaviour with zero or
  several templates selected is to be confirmed in `uwazi-ref` (`app/react/V2/Routes/Library/`)
  before M7.
- `prioritySorting`: adds the property to the Library sort menu. When the view is one template, its
  first `prioritySorting` property is the default sort (Uwazi: "the system will try to pick up the
  best fit").
- Fixed facets that become property facets: CEJIL Country (`pa_s`, hoisted at
  `data/cejil/adapt.ts:256`), CEJIL Descriptors (`descriptores`), the Sample and Travesía inherited
  facets (`libraryInheritedDefs`). They keep their current position and look. Only their source
  changes.
- These stay as they are: Type (driven by `settings.filters`, the Filters page, out of scope here),
  Has document, Published/Restricted, Date added (`creationDate`), and CEJIL chain facets
  (prototype-only, `data/cejil/chainFacets.ts`).

---

## 7. Migration steps (Code dispatches, about 1 session each)

Each step leaves `npx tsc --noEmit && npm run build` green and the app usable on all four corpora.
Steps M1–M2 change no visible behaviour except blank forms. Order is safe-first. Steps marked "∥" can
run in parallel with the one before.

| # | Dispatch | Changes | Visible effect | Verify |
|---|---|---|---|---|
| M0 | **Decision (Operator → Juan)** | CEJIL re-import with flags needs the dump (§4.3). Bench and Countries modelling (§2.1, §9) | none | n/a |
| M1 | **Template types + store + seeds, read-only** | `data/templates/types.ts`; the four seed modules; `atoms/templates.ts` (seed + empty overlay, mirror); `entityTypesAtom`, `libraryTypesAtom` and `corpusTypes` become projections. A dev script `app/scripts/check-template-coverage.ts` reports, per corpus, the record keys no template declares and the declared properties no record uses | none | the coverage report is attached to the PR; tsc and build pass |
| M2 | **Projection for blank forms** | `utils/templateProjection.ts`; `MetadataField.propertyType` (optional); `templateFields()` = projection of empty values. This removes `cejilBlankFields`, `travesiaBlankFields`, `blankTypeFields` and the artworks peer-copy | Create entity, Change template and Bulk edit field lists come from the template (Artworks gets proper fields). Same editors | Create one entity per corpus; Change template's kept/dropped counts are unchanged on CEJIL |
| M3a | **Projection for records, CEJIL + Travesía (read)** | `getEntityProfile` for both corpora builds `metadata` with the projection over raw values. Record renderers for the newly typed values (date lists, ranges, geolocation, link). Relationship properties come from `metadata[name]`; graph-derived connections stay on the Relationships tab | CEJIL records show multidate, daterange and relationship **properties** per property (today they are grouped by relation type, with `keyAliases`); nested shows as a table | Juan screenshot review of a Causa, a Juez and an Audiencia record. Card focus and `focusMetadataFieldAtom` still land |
| M3b | **Typed editors + value writes** | New editors (numeric, date list, range, range list, geolocation, link). `EntityRecord.metadata` becomes `EntityValues`; every writer (MetadataView save, bulk edit, Copy From commit, Create, Change template, click-to-fill commit) writes values | Multidate and range fields become editable instead of read-only strings | Edit, save and reopen a CEJIL multidaterange; undo restores; click-to-fill still arms text fields and not date fields |
| M4 | **Sample + Artworks onto templates** | `data/sample/templates.ts` + `values.ts` (generated once, committed); `data/artworks/templates.ts` + `values.ts`. `TYPE_FIELDS`, `synthFields` and the artworks builders are removed. Countries thesaurus added. `e3` is reconciled with `court_case` | The Sample `court_case` record follows its template; `born`, `dateFiled` and the judgment date become real dates | Velásquez (`e3`) record, Relationships inheritance (`rel-people` Role/Region), Copy From between two Sample cases |
| M5 | **Cards from `showInCard`** | Cards read the projection; `Entity.fields` and the card half of `adapterPatch` removed; per-record cache | Card lines follow the template on all corpora (CEJIL and Artworks change) | Perf: Library on CEJIL, scroll and type in search; compare render time with `f4d0d5b5` (React profiler), no regression over 10% |
| M6 ∥ | **List columns by property name** | `metaColumn(name)`, union with the combine rule, `prioritySorting` sort keys | Column labels follow template labels | Toggle a column, rename the label in Settings (after M8), and the column stays |
| M7 | **Filters from `filter` / `defaultfilter`** | Property facets generated per §6.4; Country, Descriptors and inherited facets re-sourced; sort menu gains `prioritySorting`. `clearLibraryFacetsAtom` covers the new facets | Facets follow the template. Travesía gains its `filter: true` properties | Every current facet still filters to the same counts on CEJIL and Sample (compare before/after) |
| M8 | **Settings › Templates on the store** (was D1a) | Template editor writes `saveTemplateAtom`: property panel per §2.1 matrix, add / rename / delete / reorder / flags, the cross-template name check, and the §5 impact confirms (needs D3 usage queries and D2 draft hook). Template list from the store; delete per §5 | Settings edits reach form, record, cards, columns and filters at once | Add a filterable select to Causa, then fill it on one entity, see it on its card and in its facet; delete it and see the confirm count |
| M9 | **Cleanup + docs** | Remove the legacy `MetadataField.type` union, `data/settings.ts` `PropertyType` / `templatePropertiesByTemplate` / `seedTemplates`, `cejilSettingsTemplates` and `cejilTemplateProperties`. Update `handoff/DATA-SEAMS.md` (rename divergence, value units, prototype-only fields) and CLAUDE.md "Data model" | none | tsc, build, Storybook a11y |

Dependencies: M1 → M2 → M3a → M3b → M4 → M5 → (M6 ∥ M7) → M8 → M9. M8 also needs D2 and D3 from
the architecture review. M0 can be answered any time before M3a; if it isn't, M3a goes ahead on the
heuristic flags.

---

## 8. Risks to existing features

| Feature | Risk | Mitigation |
|---|---|---|
| **Inheritance** (`resolveInherited`, `utils/inheritance.ts:99`) | `inheritProperty` is a property **name** on the connected entity. Uwazi's `inherit.property` is the target property's **id**. Mapping id → name through the target template is new, and a wrong mapping blanks inherited columns. CEJIL's one inherit can't be resolved by id (§4.2). Sample `rel-people` inherits `country`/`role`, which must exist as properties of the Person template | Resolve in the projection, not in `inheritance.ts`, which stays corpus-agnostic. The M1 coverage script lists every `inherit` and whether it resolves. Deleting or renaming an inherited property is blocked (§5) |
| **Multi-hop chains** (CEJIL `inheritPath`) | They are not in any Uwazi template today; they are synthesized in the profile. Moving them into the template seed changes where they come from | `origin: "prototype"` properties in the CEJIL seed (§2.2); M3a checks the perpetrator chain record against a screenshot |
| **CEJIL record layout** | Relationship fields are grouped by relation type today (`keyAliases`, `data/metadata.ts:57-66`). Per-property fields can show the same connections twice where two properties share a relation type (`mecanismo`, `pa_s` on many templates are fine; `documentos_de_la_corteidh` vs the graph). Card focus uses `keyAliases` | Keep `keyAliases` until M3a's review; the record's focus query keeps matching aliases. Juan reviews before merge |
| **Copy From** (`utils/copyFrom.ts`) | Adding the thesaurus to the content pointer reduces matches where two templates' selects use different thesauri (correct by Uwazi, but a visible change). `COPY_EXCLUDED_TYPES` uses legacy types | Switch the exclusion to `propertyType` (media, image, preview, nested) in M3b; the skip reason "different-thesaurus" already exists, so the picker explains it |
| **Click-to-fill** (`atoms/fillTarget.ts`) | Keyed by `fieldId` = `name`, which stays (§4.1). New editors must declare whether they arm. Dates don't (CLAUDE.md); numeric and link should; geolocation and range lists should not | One `armsOnFocus(propertyType)` table in M3b; a story per new editor |
| **Bulk edit** (`utils/bulkEdit.ts`) | `commonFields` reads `templateFields()` (changes in M2) and `same()` compares the legacy type. Compatible pairs would newly match | Compare `propertyType` exactly in M2 (no compatible-pair matching in bulk). Revisit only if asked |
| **Change template** (`utils/changeTemplate.ts`) | Kept/dropped counts change wherever the projection now declares fields the old blank lists didn't (Artworks especially) | Compare plans before/after on one CEJIL and one Sample selection in M2 |
| **Import CSV** (`data/imports.ts`, `views/ImportCSVView.tsx`) | The mock rows name templates by **display name** (`"Court Case"`) and map no columns to properties. A template rename in Settings won't reach them; none of this breaks | Out of scope; note in M8 that Import CSV should map columns to properties by `name` when it is built out |
| **Search and snippets** (`utils/librarySnippets.ts`, `buildSearchIndex`) | CEJIL and Travesía search read precomputed `searchFields`. If M5 removes precomputed lines without a replacement, property search goes empty | Keep `searchFields` until a projection-backed index lands. M5 removes card lines only; the search index moves in its own step if needed (flagged, not scheduled) |
| **Performance** | The projection runs per entity per render; CEJIL Library is 4,398 entities. CLAUDE.md: per-keystroke cost is React re-rendering, `EntityCard` is memoised on the deferred query, and `filterState` is content-keyed | Projection cached by `(record, template, lang)` object identity (WeakMap, like `localizeValues`). Templates change rarely, so the cache stays warm. M5 has a measured gate |
| **Languages** | Sample values are per language; CEJIL FR/AR read ES; Travesía and Artworks have one list. Template labels are single-language in this spec | Labels per language are a Translations concern (§9). The Sample seed keeps English labels and the record's localized labels until Translations are built |
| **Relation-type ids** | `PropertyDef.relationType` must be an id in the runtime registry (`relationTypesAtom`). The Settings page's `r1..r5` are not (architecture review B5) | Requires D1b (one relation-type registry) before M8. Seeds use the registry ids |

---

## 9. Open questions for Juan

1. **CEJIL flags:** re-import from the dump to get real `_id`, `showInCard`, `filter` and `required`
   (needs the dump file), or keep the heuristics (§4.3)?
2. **Sample `bench`:** markdown text now, or a relationship to Person with seven judge entities?
3. **Sample `country` on `e3`:** a select on a new Countries thesaurus (recommended, keeps the flag),
   or a relationship to the Country template (more faithful to CEJIL, but needs connections)?
4. **Rename keeps `name` (§5):** accept the divergence from Uwazi, which re-derives the name?
5. **Template labels per language:** out of scope here (Translations), or should the Sample seed
   carry the four-language labels it has today?
