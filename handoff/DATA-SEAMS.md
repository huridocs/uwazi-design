# Uwazi 2026 — data seams: prototype shapes ↔ Uwazi v2 model

For devs porting the prototype's Relationships / Metadata surfaces into
`huridocs/uwazi`. The prototype runs on mock data, but its **shapes are
deliberate**: they mirror the seams Uwazi v2 keeps in its data layer, minus a
few documented simplifications. This file says which is which — what to treat
as spec, and what is demo scaffolding you should NOT reproduce.

Companion files: [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md) (styles),
`PATTERNS.md` (a11y/motion). Prototype sources of truth:
`app/src/data/references.ts`, `app/src/utils/relationships.ts`,
`app/src/data/metadata.ts`, `app/src/utils/{inheritance,chainTraversal}.ts`.

## 1. One record, three projections

Uwazi v2's model is a single `Relationship { from, to, type }` where each
pointer may carry a text anchor (`{ file, selections[], text }`). There is no
separate "references" collection — a text reference and an entity-to-entity
edge are **the same record, viewed differently**. The prototype keeps that
principle and derives everything else at runtime:

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

## 5. Where each projection surfaces in the UI

| Surface | Consumes | Detail |
|---|---|---|
| List view rows | `Reference[]` | one row per evidence: snippet + page tag |
| Tree view leaves | `Relationship[]` | aggregate cards, inline-expand → backing refs |
| Graph nodes | `Relationship[]` | with `includeHubMembers: true` |
| Header counter | `deriveRelationships(filtered).length` | so list and tree numbers agree |
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

### Two surfaces, one engine

The same snippet engine feeds **both** search surfaces, which is the part worth
preserving:

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

## 9. Porting checklist

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
