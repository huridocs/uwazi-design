# Template schema M1–M3: adversarial review

Commits `c9a55088` (M1), `73a13827` (M2), `cf4ce3e5` (M3), and `353e5257` on top, on local
`playground`, clean tree. Spec: `template-schema-spec.md`. Static reading, plus data checks against
`public/cejil-data` and `public/travesia-data`. Paths are relative to `app/src/`.

## Findings, ranked

### 1. High. Editing a CEJIL or Travesía multidate or multidaterange saves the new text, but the record keeps showing the old dates

M3 gives list types a second copy of their values: `displayValues: strings`
(`utils/templateProjection.ts:233-246`). The record draws a list from it whenever it holds more than
one value (`components/metadata/items.tsx:73,94-96`). The form edits only `value`:
`updateField` is `{ ...f, value }` (`views/MetadataView.tsx:494,510`), and `mergeScalars` writes that
object into the record (`utils/entityEdit.ts:16-21`). The edited field keeps its old
`displayValues`.

Failure: open a CEJIL Causa with two "Denuncia ante la CIDH" dates, edit the text, Save. The record
still lists the two old dates (from `displayValues`), while search, the card patch and Copy From read
the new `value`. Copy From and click-to-fill write `value` the same way, so they hit the same stale
list.

Fix: drop `displayValues` whenever `value` is written (in `updateField`, `mergeScalars` or the
editor), or derive the list from `value` until the M3b list editors arrive.

### 2. Medium. A signing document lists its judges twice

`data/cejil/profile.ts:343-367` still adds the chain field "Jueces firmantes" (the judges, plus the
inherited País) with `keyAliases: propNamesForRelType(template, "Firmantes")`. M3 removed the old
"skip the promoted group" step because the graph groups are gone, but the record now also projects the
`firmantes` **property** from `metadata[name]` (`buildCejilProfile`, `:466-475`). Both have
connections and both sort to the `firmantes` position (`orderByTemplate`, `:447-452`).

Failure: a Sentencia (407 of 409 have `firmantes`), a Resolución (1,067 of 1,084) or a Voto Separado
shows "Firmantes" and "Jueces firmantes", one after the other, with the same judges. A card's
Firmantes click now matches two fields: the property's `data-field-key` and the chain field's
`data-field-keys`.

Fix: when the chain field exists, drop the `firmantes` property field (or fold the inherited column
into it).

### 3. Medium (behaviour change for Juan to confirm). CEJIL records no longer show incoming or unmodelled connections

M3 replaced the graph-grouped fields (every neighbour by relation type, capped at 15) with the
template's own relationship properties from `metadata[name]` (`templateProjection.ts:160-180`),
which the spec asked for (§4.4, M3a "Juan screenshot review").

Measured on the ES records: outgoing relationship metadata is well covered (for example Causa
`pa_s` 337 of 337, `documentos_de_la_corteidh` 337 of 337, Sentencia `firmantes` 407 of 409). But:
- Templates with no relationship properties now show **no** connections in the record: País, Juez's
  incoming signatures and votes, Instrumento.
- 50 of 4,395 entities that have graph edges carry no relationship metadata at all.
- Properties with no values in the dump (`Nota de envío › firmantes` 0 of 187, `Audiencia › perito`
  0 of 257) show nothing where the graph used to show the connection.

All of these remain on the Relationships tab. Recommend Juan reviews a País, a Juez and a Nota de
envío record before M4.

### 4. Medium-low. The commit says "typed, nothing flattened", but every list or range is still a text field

`templateProjection.ts:233-246` emits `multidate`, `daterange` and `multidaterange` as `type: "text"`
(the value joined with " · "), and geolocation and `numeric` as text. Only `propertyType` carries the
real type. That matches the spec's M3a/M3b split (editors arrive in M3b), but meanwhile:
- the edit form offers a free-text box over a CEJIL date list, a range, or a Travesía coordinate, and
  saves whatever is typed as a string over a typed property;
- `link` loses Travesía's label (only `url` is kept, `:145-147`).

Until M3b, those fields should be read-only in the form (as relationship fields are), or the commit
and CLAUDE.md should say "displayed typed, edited as text".

### 5. Low-medium. Profile cache never invalidates on template changes (an M8 trap)

`data/entityProfiles.ts:249-267` caches every built profile (`lightweightCache`) by id, forever.
Records are now a projection of the template (`templateMirror` in `buildCejilProfile` and
`buildTravesiaProfile`). Once M8 writes the template store (rename a label, reorder, add a property),
every profile already built keeps the old shape until reload. Key the cache by template identity, or
clear it when `templatesAtom(corpus)` changes. This is harmless in M1–M3 because nothing writes
templates yet.

### 6. Low. Smaller items

- The Sample's default template is `document` in the store (`data/sample/templates.ts`,
  `isDefault: t.id === "document"`), matching `uploadTemplateId`. But Settings › Templates still
  lists `seedTemplates` with Court Case as default, and its delete refusal reads that. The two will
  disagree until M8.
- Change template on CEJIL: a geolocation property is in the record (as text) but not in the blank
  form (`LEGACY_TYPE.geolocation = null`), so `planTemplateChange` counts it as an *undeclared*
  dropped value even when the target template has the same property. This predates M3 (the old blank
  fields skipped geolocation too). M3b's geolocation editor will close it.
- The CEJIL prop reader (`data/cejil/profile.ts` `registerEntityPropReader`) reads only the ES
  record. An inherited column in English shows Spanish thesaurus labels. This is the same as the
  record's own FR/AR fallback.

## Checked and clean

- **Value keying:**
  - `MetadataField.id === property.name` in `blankField` and `recordFieldsFor` (every branch) and
    in the relationship fields.
  - `fillTarget`, Copy From (`field.id`), bulk edit (`BulkField.id`), `adapterPatch` and card focus
    (`CardField.key` = name) all still match.
- **Inheritance:**
  - The projection maps `inherit.property` (id) to the target's property `name`
    (`templateProjection.ts:163-176`).
  - The CEJIL seed resolves the stripped id with the unique-type rule (`cejil/templatesSeed.ts:32-39`;
    Causa → `ubicaci_n_geogr_fica_geolocation`), or marks it `inheritUnresolved`.
  - Travesía uses real `_id`s.
  - The new CEJIL prop reader renders the inherited value by type, so the place column prints
    `formatPlace`.
- **keyAliases:** the place property gets `[PLACE_INHERITED_KEY]`, so the card's place line still
  lands (`profile.ts:474`). The chain field's aliases are kept (but see finding 2).
- **Dates:** both dumps store epoch seconds (checked: Travesía `date` 1662336950,
  `daterange.from` 1666286004), so `fmtDate` is correct for both.
- **Relationship fields:**
  - Read-only.
  - `relationType` carries the dump name, so Settings renames reach them through `relationLabel`.
  - `connectionKey` defaults to `relationType:content`; CEJIL siblings stay apart (perito vs
    mecanismo differ by `content`).
  - `connectedLabels` names a connected entity outside the sample.
- **Search, snippets, cards, columns, facets:** unchanged for users. They read the adapters'
  `searchFields` and `fields` and the facet definitions, none of which M1–M3 touched. Library type
  lists are a projection of the store (`templateTypesAtom`, cached per list, so identity-keyed memos
  stay stable).
- **Performance:**
  - Profiles are built once per entity and cached.
  - The projection is linear in a template's properties.
  - Nothing new runs per Library render or keystroke on CEJIL (4,398) or Travesía.
- **Blank forms (M2):** `templateFields` → `blankFieldsFor` in every corpus.
  - Relationship, geolocation and image are left out, as before.
  - Multidate and multidaterange are marked `list`, so bulk edit still excludes them.
  - Artworks now has a real template instead of a peer's emptied record.
- **Import CSV:** untouched. It names templates by display name (`data/imports.ts`) and has no header
  mapping to break.
