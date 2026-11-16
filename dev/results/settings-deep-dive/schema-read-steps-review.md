# Template schema read steps: adversarial review

Commits `f6230e40` (typed editors, spec M3b), `efcda5e1` (Sample and Artworks onto templates, spec
M4), `657e6045` (cards from `showInCard`, M5), `2ddeec87` (list columns by name, M6), `cf01f6ef`
(filters from template flags, M7) and `66961cb5` (Filters › Properties read view), on local
`playground` at `66961cb5`, clean tree. Static reading, plus data counts and Uwazi's own code in
`uwazi-ref`. Paths are relative to `app/src/`.

## Earlier findings (schema-m1-m3-review.md)

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | `displayValues` stale after edit | **Closed** | `MetadataView.tsx` `updateField` drops `displayValues` on a plain write; typed editors recompute `value` and `displayValues` (`utils/typedValues.ts`); Copy From carries `sourceTyped` with every typed key (`utils/copyFrom.ts` `typedPart`) |
| 2 | Judges listed twice | **Closed** | `data/cejil/profile.ts` `buildCejilProfile`: a relationship property covered by a chain field's `keyAliases` is dropped |
| 3 | Incoming connections gone from CEJIL records | Unchanged (a decision for Juan, not a defect) | |
| 4 | Typed fields edited as free text | **Closed** | `components/metadata/TypedFieldEditors.tsx` covers numeric, generated id, date list, range, range list, link, place and image. Relationship stays read-only on CEJIL and Travesía |
| 4b | Travesía link label lost | **Closed** | `templateProjection.ts` `typedOf` keeps `{label, url}`; the record shows the label and opens the URL |
| 5 | Profile cache never invalidates | **Closed** | `data/entityProfiles.ts` `invalidateOnTemplateChange` clears the cache when any corpus's template list changes |
| 6 | CEJIL inherited values Spanish only | **Closed** | The prop reader reads the reading language's record |

## New findings, ranked

### 1. High. Travesía's Library sidebar now lists 158 property facets, where Uwazi would list none, and they are recounted on every keystroke

`utils/libraryFacets.ts` `withPropertyFacets` adds one facet per `filter` property that is a select,
multiselect or relationship. Travesía has **158** such property names. `LibraryFilters.tsx:82-91`
shows them all when no Type is selected, and with a Type selection shows any facet that **one** of
the selected templates has.

Uwazi does neither (verified in `uwazi-ref`):
- `app/react/Library/helpers/libraryFilters.js:29-31`: with no types it uses
  `comonProperties.defaultFilters`, which is only properties flagged `filter && defaultfilter`.
- With types it uses `comonFilters`, the properties **every** selected template has
  (`app/shared/commonProperties.js:30-58`, `allTemplatesHaveIt`).

Travesía has 0 `defaultfilter` properties, so Uwazi shows no property facets until a type is chosen.

Cost: `inheritedCounts` (`LibraryFilters.tsx:172-182`) counts **all** definitions (not just
`shownDefs`) for every entity on every filter-state change, including each deferred keystroke:
589 × about 160 `entityPropertyValues` calls, each allocating a `${lang}|${name}` key, plus the
render of the shown sections.

Fix: apply Uwazi's two rules (no types → `defaultfilter` only; types → the intersection), and count
only the shown definitions. Spec §6.4 left this "to confirm in uwazi-ref"; it is now confirmed.

### 2. Medium. Sample and Artworks facets and property sorts go stale after an edit

`utils/propertyValues.ts:20-31` caches values in a `WeakMap` keyed by the **Entity object**. A
single-entity save writes only the record (`atoms/entityChanges.ts:443`). On the Sample and Artworks,
`adapterPatch` returns `{}`, so `applyOverlay` (`data/entityChanges.ts:148-158`) hands back the same
Entity object, and the cached values stay.

Failure: in the Sample Library, filter by a property facet (for example Status = Open) or sort by
"Date filed", then change that entity's Status or Date filed in the edit form and Save. The facet
counts, the filter match and the sort order keep the old value until reload. CEJIL and Travesía are
mostly safe because their saves patch `searchFields`, which makes a new object.

Fix: key the cache by `overlayRecord(id)` identity too, or clear an entity's entries on a record
write.

### 3. Medium-low. The Display menu offers 260 column toggles on Travesía

`utils/entityFields.ts` `propertyColumns` offers one column per property name across the corpus's
templates, except image, preview, nested, media and markdown: 260 on Travesía. Before M6 the options
were the labels present on the entities' card lines (a handful). This follows spec §6.3, but a
260-row menu needs search or grouping by template (or offering only the selected templates'
properties, as Uwazi's table view does).

### 4. Low-medium. Smaller defects in the typed editors and records

- `TypedFieldEditors.tsx` `GeoEditor`: clearing just one coordinate leaves the previous `geo` in
  place (the commit runs only when both are numbers, or both are empty). The inputs show a half-empty
  pair while the record keeps the old point. The `min`/`max` attributes are advisory only, so lat 200
  is saved.
- `ImageEditor`: Artworks stores the file **id** (`f-artwork-…`, `data/artworks/profile.ts:82-85`).
  The picker offers file **URLs**, so the select opens on "Current image", and choosing the same
  picture stores a URL. The record then draws the picture twice: the image card plus an `<img>` field
  (`MetadataRecord.tsx:201`, `items.tsx`).
- Link records render `<a href={f.value}>` with whatever was typed (`components/metadata/items.tsx`).
  `validateValue("link")` accepts any `new URL()`, so `javascript:` URLs pass. This is self-only in a
  prototype, but restrict the anchor to `http(s):` and `mailto:`.
- Generated ID: `templateFields` assigns a fresh random id on every call (`utils/createEntity.ts`), and
  bulk edit doesn't exclude `generatedid`. A bulk write sets one id on many entities.
- Countries thesaurus (`t6`): English labels only. The Sample's translated records (ES, FR, AR)
  match by label through `fieldKeys`, so a country spelled differently in another language becomes a
  `label:` pseudo-key, and `countryFlag` gets no flag for an Arabic label. Every Sample value
  (Argentina … Venezuela) is in the list, so the English reading is fine.

### 5. Low. Parity notes for users (deliberate, worth a screenshot)

- **Sample cards:** Court Case cards now show `CASE_CARD` (case number, victim, respondent, country,
  region, status, date filed, date of judgment) instead of every scalar. Native types show every
  property but markdown, as before.
- **Sample dates:** `born`, `dateFiled`, `date` and `adopted` are typed `date`. The seed values are
  years ("1962"), which `parseDateValue` accepts (`Date.parse`). The date input shows `1962-01-01`,
  and an untouched field keeps "1962".
- **CEJIL cards:** every property except markdown, image, preview, nested and media is `showInCard`.
- **Sorts:** `prop:*` options from `prioritySorting` (Sample date filed and date of judgment, CEJIL
  and Travesía `fecha`). The default sort is unchanged, so the spec's "first prioritySorting is the
  default for a single template" isn't implemented yet.

## Round trips checked

Each type below was traced from editor to record to reopening the editor.

| Type | Editor → record → editor | Copy From | Click-to-fill | Bulk edit |
|---|---|---|---|---|
| numeric | ✓ (string `value`) | ✓ | arms ✓ | included |
| generatedid | ✓ prefilled on create | ✓ | arms ✓ | included (see 4) |
| multidate | ✓ `dates` → `displayValues` and `value` | ✓ typed | doesn't arm ✓ | excluded ✓ |
| daterange / multidaterange | ✓ `ranges` | ✓ typed | doesn't arm ✓ | excluded ✓ |
| geolocation | ✓ `geo` → `value` text (see 4) | ✓ typed | doesn't arm ✓ | excluded ✓ |
| link | ✓ `{label,url}` | ✓ typed | URL arms, through `withLink` ✓ | excluded ✓ |
| image | ✓ (see 4 for Artworks) | excluded ✓ | doesn't arm ✓ | excluded ✓ |
| media | unchanged editor ✓ | excluded ✓ | doesn't arm ✓ | excluded ✓ |
| relationship | read-only on CEJIL and Travesía ✓; Sample editable as before | relationship rules ✓ | n/a | connections as before |

Change template: it compares blank fields, which now include typed fields, so CEJIL coordinates are
no longer counted as undeclared. Import CSV: untouched (no header mapping exists).

## Checked and clean

- `MetadataField.id === property name` holds through the typed editors (`data-fill-id`, `inputId`).
- A typed value is written to every language copy (`updateTyped`).
- Copy From matches on the template type (`typeOf`), so a date list never copies into a text field.
- The Filters › Properties view reads template flags (`66961cb5`). Curated facets (CEJIL Countries
  and Descriptors, the Sample's Role and Region) keep their counts; property facets don't duplicate
  them (`FIXED_FACET_PROPERTIES`).
- Cards read the template at render (`entityCardFields`, `shownNames` cached per template). CEJIL and
  Travesía cards use precomputed lines by `prop`. Travesía now precomputes a line for every property
  (589 entities × about 30): negligible.
