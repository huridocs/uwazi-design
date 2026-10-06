# Uwazi 2026 — data seams: prototype shapes ↔ Uwazi v2 model

For devs porting the prototype's Relationships / Metadata surfaces into
`huridocs/uwazi`. The prototype runs on mock data, but its **shapes are
deliberate**: they mirror the seams Uwazi v2 keeps in its data layer, minus a
few documented simplifications. This file says which is which — what to treat
as spec, and what is demo scaffolding you should NOT reproduce.

Companion files: [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md) (styles),
`PATTERNS.md` (a11y/motion). Prototype sources of truth:
`app/src/data/references.ts`, `app/src/utils/relationships.ts`,
`app/src/data/metadata.ts`, `app/src/utils/{inheritance,chainTraversal}.ts`,
`app/src/data/templates/types.ts`, `app/src/utils/templateProjection.ts`.

## 1. The stored record and the two derived shapes

Uwazi v2's model is a single `Relationship { from, to, type }` where each
pointer may carry a text anchor (`{ file, selections[], text }`). There is no
separate "references" collection: a text reference and an entity-to-entity
edge are the same record. The prototype stores one record, `Reference`, and
derives two shapes from it at render time. CLAUDE.md's "Reference vs
Relationship" section describes the first two rows; hubs are the third:

| Layer | Prototype shape | Stored? | Uwazi v2 equivalent |
|---|---|---|---|
| Record | `Reference` | yes (`data/references.ts`) | `Relationship {from, to, type}` |
| Aggregate | `Relationship` | **no — derived** (`deriveRelationships(refs)`) | client-side grouping (no v2 counterpart stored) |
| N-ary container | `Hub` | **no — derived** (`deriveHubs(refs)`) | v1-style hub / v2 n-ary group |

**The invariant to preserve when porting:** aggregates and hubs are *never*
persisted. Every UI surface derives them from the flat record list at render
time, through one shared filter pipeline (`useFilteredReferences`). If you
store an aggregate, the list/tree/graph counts will eventually disagree.

## 2. `Reference` — the stored record

```ts
interface Reference {
  id: string;
  sourceEntityId: string;        // v2: from.entity
  targetEntityId: string;        // v2: to.entity
  relationType: RelationType;    // v2: type (free-form id; "no_label" = canonical fallback)
  direction?: Direction;         // "outgoing" | "incoming", default "outgoing"
  sourceSelection?: TextSelection; // v2: from.selections — ABSENT = pure entity link, no anchor
  targetSelection?: TextSelection; // v2: to.selections — symmetric target-side anchor
  hubId?: string;                // membership in an n-ary hub
  createdAt: string;
}

interface TextSelection {
  text: string;
  page: number;
  top: number; left: number; width: number; height: number; // 0-1, page-relative
}
```

Seam notes:

- **A row is "text-anchored" iff either endpoint has a selection.** Both
  optional — a manual entity link with no quote is representable (both
  anchors absent), mirroring v2.
- **`direction` is a prototype convenience, not a v2 field.** In v2 the
  direction *is* which pointer is `from` vs `to`. The prototype pins
  `sourceEntityId` to the current doc and stores direction as a flag instead.
  When porting, translate: `outgoing` → current entity is `from`;
  `incoming` → current entity is `to`.
- `relationType` ids are free-form and user-extensible at runtime; deleting a
  type reassigns its orphans to `no_label`. Rows with `no_label` sort last in
  grouped views.
- `TextSelection` geometry is **page-relative 0–1 fractions**, not PDF units —
  chosen so highlight overlays survive zoom without recompute.

## 3. `Relationship` — the derived aggregate

`deriveRelationships(refs)` collapses by **`(targetEntityId, relationType)`**
— note: *direction is not part of the key*. An incoming and an outgoing edge
to the same target with the same type merge into one bidirectional row:

```ts
interface Relationship {
  id: string;                 // `${targetEntityId}::${relationType}`
  targetEntityId: string;
  relationType: RelationType;
  direction: Direction;       // first seen — only meaningful when directions.length === 1
  directions: Direction[];    // length 2 ⇒ bidirectional glyph
  evidenceCount: number;      // refIds.length
  firstPage?: number;         // min page over anchored refs; undefined if none anchored
  refIds: string[];           // the backing records
}
```

- Hub members (`hubId` set) are **skipped** by default; pass
  `{ includeHubMembers: true }` only when the consumer renders one node per
  member (the graph view does — it has no "hub container" node).
- `firstPage` is `undefined` when every backing ref is entity-level. UI treats
  that as "no page tag", not page 0.

## 4. `Hub` — the n-ary container

Refs sharing a `hubId` collapse into
`Hub { id, relationType, members: {entityId, refIds[]}[], firstPage?, refIds[] }`.

**Simplification vs real Uwazi:** in v1/v2 each hub member can carry its own
relation role; the prototype uses **one shared label per hub** (taken from the
first ref). If per-member roles matter for the port, the data layer grows a
`role` on the member — the UI shell (`RelationshipRow kind="hub"`) already
renders members individually and won't need restructuring.

## 5. Where each shape appears in the UI

| Surface | Consumes | Detail |
|---|---|---|
| List view rows | `Reference[]` | one row per evidence: snippet + page tag |
| Tree view leaves | `Relationship[]` | aggregate cards, inline-expand → backing refs |
| Graph nodes | `Relationship[]` | with `includeHubMembers: true` |
| Tab count | `references.length` | the Relationships tab is the only place this surface prints a number |
| Evidence badge | `relationship.evidenceCount` | |
| Target-side quote | `ref.targetSelection` | second warm/italic snippet ("target p.N") |

All views filter through **one hook** (`useFilteredReferences`:
cluster → facets → search → sort). Never re-implement filtering per view — a
facet that silently applies in one mode and not another is the failure mode
this guards against.

## 6. Relationship metadata & inheritance

The Metadata surface has its own seam: fields whose value comes from a
relationship (Uwazi's "relationship properties" + inherit).

```ts
interface RelationshipMetadataField {
  type: "relationship";
  relationType: RelationType;
  targetTypeId: string;
  connectedEntityIds: string[];     // ⚠ SIMPLIFICATION — see below
  connectionKey?: string;           // siblings sharing one connection = multi-inheritance
  // inheritance — ONE spec, two shapes:
  inheritProperty?: string;         // single-hop: native scalar on the connected entity (Uwazi's model)
  inheritPath?: ChainSegment[];     // multi-hop: traverse FROM each connected entity…
  inheritLeaf?: string;             // …and project this leaf prop (default "title")
  inheritLabel?: string;
  reduce?: "list"|"distinct"|"count"|"min"|"max"|"first"; // rollup chip (Notion/Airtable "calculation")
  entityLabel?: string;
  connectionProvenance?: Record<string, ProvenanceStep[]>; // "via …" trail per connected entity
  totalConnected?: number;          // when connectedEntityIds is a capped slice
  readOnly?: boolean;               // derived/graph fields: read card, not editor
}
```

Design decisions that ARE spec:

- **One resolver.** `resolveInherited(connectedEntityId, spec, lang, getProp)`
  handles both shapes; `inheritProperty` is the degenerate zero-segment case of
  `inheritPath`. Don't fork single-hop and multi-hop code paths.
- **Chain values resolve live at render, never pre-baked.** A pre-baked
  registry existed and was deliberately deleted — stored derived values go
  stale the moment an intermediate edge changes.
- **The graph is injected** (`registerInheritanceGraph(provider)`), so the
  resolver stays data-source-agnostic. In the real repo the provider wraps
  the v2 relationships API instead of the mock graph.
- **Provenance travels with the value.** Multi-hop values carry the
  intermediary nodes they were reached through, rendered as a clickable
  `↳ via …` trail (hoisted to one line when every row shares it). Users must
  be able to see *why* an inherited value appears.
- **`connectionKey` siblings edit as one connection** — several inherited
  columns off one entity picker, kept in sync.
- **`ChainSegment.toTypeId` is required in practice** for overloaded relation
  types — without pinning the far end's template, hops cross-contaminate
  (e.g. a `País` edge reachable from three templates). Traversal is bounded
  (`maxPaths`, default 500) and reports `truncated` so the UI says
  "showing first N" instead of implying completeness.

**The one big simplification (⚠ do not port as-is):** connections live as an
explicit `connectedEntityIds` array on the field. Real Uwazi derives them from
the relationships collection, which is where direction/inverse handling comes
back in. Porting plan: keep the resolver and UI contracts, replace
`connectedEntityIds` with a query over relationships filtered by
`relationType` + `targetTypeId`.

## 7. Known gaps — intentional, don't paper over

| Gap | Status | If you need it |
|---|---|---|
| Inverse relation labels ("source rel type vs target rel type") | not modeled — one `type` per record, like v2 | needs v2-side schema work first |
| `createdBy` / `sourceKind` (manual vs IX-suggested) / confidence | not on `Reference` | data layer grows first, then filters |
| Jump-to-target-passage navigation | target quotes render; navigation doesn't | open UX work |
| Grouping/filtering by target-side text | not implemented | open |
| Per-member hub roles | single shared label per hub | add `role` to hub member |
| IX suggestions surface | built but unmounted (atoms/data/component live) | remount = 2 imports + 1 prop |

## 8. Library search — the snippets seam

The Library's Results tab mirrors v2's search response so the UI ports 1:1.
The prototype computes client-side what production gets from Elasticsearch —
every "replace with ES" row below is a deletion, not a rewrite.

**Shape** (`utils/librarySnippets.ts`, mirrors `SnippetsSearchResponse` from
`/api/search` — verified against a live instance):

```ts
EntitySnippets {
  count: number;                        // metadata groups + fullText hits
  metadata: { field, fieldKey, texts[] }[];  // per-field excerpts
  fullText: { page: number | null, text, hits }[];
}
```

Two fields carry decisions worth keeping.

**`fieldKey`** is what makes a hit clickable back to its source. A snippet's
display label is localized and therefore useless as an identity; the key is the
template property id where one exists (mock profiles) and a slugged label where
it doesn't (adapter fields). Porting to v2, this becomes the real property name
from the template — the click target for "open this entity's metadata, focused
on the field that matched".

**`page: null` is deliberate, not missing data.** Our mock corpus shares one
rendition across every doc-bearing entity, so a page number computed from it
points at a page of a *different* document. Those snippets return `page: null`
and render excerpt-only — no tag, no jump. Only the CEJIL corpus, which carries
genuine per-page text, claims a page. In production ES returns real page
offsets, so this collapses to "always a page" — but keep the null branch: an
entity whose file has no extracted text must degrade to excerpt-only rather than
print a tag pointing nowhere.

**One tokenizer, three consumers** (`utils/queryTokens.ts`): the filter
predicate, the snippet builder, and the `<mark>` highlighter all tokenize the
same way (quoted phrases as units, `AND/OR/NOT` as operators). This is the
invariant to preserve when porting: what matches, what snips, and what marks
must never drift — in v2 that means driving all three from the same ES query.

| Prototype piece | In the real repo |
|---|---|
| Client substring/token matcher | ES `simple_query_string` (free: `*` `?` `~N` booleans, stemming) |
| `buildSnippetsFor` excerpt windows | ES highlighter (`<b>` marks — sanitize, parse to nodes, never innerHTML) |
| Diacritic folding in the matcher | ES `asciifolding` analyzer |
| Relevance ranking | ES `_score` (the prototype fakes it; production gets it free) |
| Per-card full-text cap | lazy `/api/search_snippets?id=` per entity |
| `HighlightedText` re-marking plain text | keep — it renders API `<b>` output safely |

UI seams that carry over regardless of backend: results are a drawer tab
sibling to Filters (auto-switches with the query), hits group under
**Properties** (click → the entity's metadata, field focused) and **Document**
(click → the doc at that page), and the match mark is layout-neutral
(`px-0.5 -mx-0.5`, weight inherited) so highlighting never re-wraps a line.

### Both search surfaces use one snippet builder

The same snippet builder feeds both search surfaces. Keep it that way, so the
two can't disagree about what matched:

| Surface | Prototype | v2 counterpart |
|---|---|---|
| Library — where did this term hit across the corpus? | Results drawer tab (`components/library/ResultsSnippets/`) | library search + `/api/search` snippets |
| Entity — where does this term appear in *this* document? | drawer Search tab (`components/search/DocumentSearchBody.tsx`) | `V2/Routes/Entity/Components/search/*` |

Both render the same row treatment and page spine, differing only in scope, so
in the real repo they should call the same snippet component with a different
query scope — not grow two implementations. Note v2's `scopeResultsToDocument`
filters snippets by filename: an entity with several files searches across all
of them and narrows to the open one. Our entities also carry multiple files, so
that scoping decision has to be made explicitly rather than inherited by
accident.

**Still open here** (don't assume it works): jumping to a page does not yet
paint the matched term in the PDF. The viewer renders react-pdf's text layer, so
`customTextRenderer` is the intended route — mark hits inside the text layer
using the same `highlightTerms` tokens the snippet rows used, so page marks and
row marks can't disagree.

## 9. Templates are the schema

A template (`TemplateDef`, `app/src/data/templates/types.ts`) uses Uwazi's own
property types and flags. It is the one source for what an entity's form,
record, Library card, list columns, facets and sort offer. One store per
collection (`app/src/atoms/templates.ts`) holds the seed plus the session's
edits from Settings › Templates; code outside React reads the same value
through `data/templates/mirror.ts`.

```ts
interface PropertyDef {
  id: string;        // Uwazi's _id, or `${templateId}:${name}` where the data has none
  name: string;      // the key values are stored under; stable on rename (below)
  label: string;     // English; other languages are Translations' job
  type: PropertyType;            // Uwazi's 16 types (+ CEJIL's nested)
  required?, noLabel?, showInCard?, filter?, defaultfilter?, prioritySorting?,
  fullWidth?, style?, generatedId?;
  content?: string;              // select: thesaurus id; relationship: target template id
  relationType?: string;         // relationship: registry id
  inherit?: { property: string; type: PropertyType };  // by property id, as Uwazi
  x?: { inheritPath?, inheritLeaf?, reduce?, connectionKey?, entityLabel? };  // ⚠ prototype-only
  origin?: "uwazi" | "prototype";                                             // ⚠ prototype-only
}
```

How each surface reads it (`utils/templateProjection.ts` and the readers named):

| Surface | Reads | Rule |
|---|---|---|
| Edit form, Create entity, Change template, bulk edit | `blankFieldsFor`, `recordFieldsFor` | one field per property, in template order; editors switch on `propertyType` |
| Record | the profile's fields + `noLabel`, `fullWidth`, `style` | a connection with nothing connected is not drawn |
| Library card | `entityCardFields` | `showInCard` properties in template order; never image, preview or markdown |
| List columns | `propertyColumns` | one per property `name`; same name and compatible type across templates share a column |
| Facets | `libraryInheritedDefs` | Uwazi's rule: no Type selected → `defaultfilter` properties only; Types selected → what every selected template filters on |
| Sort | `prioritySorting` | the property most templates in view share; dates newest first |

Decisions that ARE spec:

- **Values are read through the template as it is now.** A record saved
  earlier is laid over the current template (`projectRecordFields`): the
  template gives fields, order and labels; the record gives values by `name`.
  A template edit reaches every entity at once.
- **Delete a template:** refused for the default one and for one in use (and
  while the collection's records are still loading, when "in use" is not
  known). Otherwise other templates lose their relationship properties that
  target it, unless something inherits one (refused, as a direct removal is).
- **Delete a property:** refused when another template inherits it, or a
  chain field ends on it. Save first states what is lost.
- **Same label across templates:** the type must match exactly (Uwazi's
  client rule), and the thesaurus, relationship type, target and inherit too.

Divergences from Uwazi (⚠ decide before porting):

| Prototype | Uwazi | Why |
|---|---|---|
| A rename changes the label only; `name` is kept | `name` is re-derived from the label and a job migrates every entity's values | the seeds are static; every key-based reader (records, columns, facets, translations) keeps working |
| Removing a property keeps its values in the records; re-adding the same label of the **same** type reads them again, of another type gets a new name (`status_2`) | the values are deleted by a job | soft removal makes Undo possible; the suffix stops old values being read through a new type |
| A property without an `_id` gets `${templateId}:${name}` | every property has an `_id` | CEJIL's dump dropped them; inheritance needs a stable id |

Value units (the record's `MetadataField`, not Uwazi's stored value):

| Type | Prototype field | Uwazi stores |
|---|---|---|
| date | `value` dd/mm/yyyy | epoch seconds |
| multidate | `dates[]` dd/mm/yyyy, `displayValues` | epoch seconds[] |
| daterange / multidaterange | `ranges[{from,to}]` dd/mm/yyyy | `{from,to}` epoch seconds |
| select / multiselect | `value`/`values` labels + `valueIds` | the thesaurus value id; label denormalized |
| link | `link {label, url}` | `{label, url}` |
| geolocation | `geo {lat, lon, label?}` | `{lat, lon, label}` |
| image | the file's id | the file's URL |
| generatedid | `value` string, drawn once per new entity | string |

Prototype-only, don't port as spec: the `x.*` fields and `origin` above; the
legacy `MetadataField.type` editor union (`text | multiline | date | …`),
which sits beside `propertyType` until the editors switch on the template
type alone; and `keyAliases` on CEJIL connection fields, which group
properties of one relation type so a judge is not listed twice.

## 10. Porting checklist

1. Map `Reference` → v2 `Relationship` rows (`direction` flag → from/to
   position; selections carry over per-endpoint).
2. Reimplement `deriveRelationships` / `deriveHubs` over the v2 API response —
   keep them pure functions over the flat list; keep the `(target, type)`
   key and the `directions[]` merge.
3. Port `useFilteredReferences` as the single filter pipeline; wire every view
   (list/tree/graph) through it.
4. Keep `resolveInherited` + `registerInheritanceGraph`; swap the provider to
   a v2-backed graph. Delete nothing else — provenance and reduce ride along.
5. Replace `connectedEntityIds` with a relationships query (§6 warning).
6. Counter parity check: header count must equal tree-leaf count in every
   filter state — it's the regression test for the whole seam.
7. Templates: read the form, record, cards, columns, facets and sort from the
   template (§9). Decide the two divergences in §9's table first: rename
   (keep `name` or migrate values) and soft removal.
