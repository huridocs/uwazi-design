# Relationship Chain Filters — Design Proposal

> Status: proposal (not yet built). Grounds the Miro "Relationship properties UI
> experiments" board against the current prototype filter code. Source design
> doc: HURIDOCS Miro "Relationship properties & inherited properties".

## TL;DR

We already ship a **one-hop traversal filter** — the "inherited" facet. "Nesting
for filters" is generalizing it into an **N-segment chain** over the relationship
graph, where filtering is **path-coupled**: the traversal yields *tuples* (one per
complete path), and a row matches iff at least one of its tuples satisfies every
active segment-constraint **jointly**. That single rule resolves Approaches A vs B,
the depth variants, and the perpetrator/victim split — they're all projections of
one tuple set.

---

## 1. The canonical example (Event-Act model)

A simplified event-act model, common in HR violations documentation:

```
EVENT ──HAS──► ACT ──HAS──► INVOLVEMENT ──► PERSON
                                 (as victim / as perpetrator)
```

| Entity | Properties |
|---|---|
| EVENT | Title, Description, Date, Perpetrators |
| ACT | Type of violation, Victims |
| INVOLVEMENT | Role, Perpetrators |
| PERSON | Name, Date of birth, Gender, Description |

The **Perpetrators** field on EVENT traverses the full chain
`EVENT → ACT → INVOLVEMENT → PERSON`. Users need to:

- See perpetrator names, genders, and involvement degree on the EVENT entity.
- Search the library for: events a particular perpetrator was involved in; events
  with a particular type of violation; events with female perpetrators; events
  where a perpetrator's role was *giving the order*.

That last set is the hard one — it requires combining conditions **on the same
path** (a female person who, on the same involvement, gave the order).

---

## 2. Why the filter must be path-coupled (the core correction)

The naive model exposes one facet per chain segment and ANDs them through the
existing `matchesAll` pipeline. **This is wrong.** Testing `Person ∈ {Pedro}` and
`Role ∈ {gave order}` as two independent facets, an Event linked to
Pedro-as-*material-author* (on Act X) and Andrés-as-*order-giver* (on Act Y)
**falsely matches** "Pedro gave the order." The two conditions must hold on the
**same path**.

So `chains()` returns **tuples**, one per complete path:

```
EVENT yields, per event, a set of tuples:
  (Killing,             material author, Pepe·M)
  (Killing,             gave order,      Andrés·M)
  (Arbitrary Detention, material author, Pedro·M)
  (Arbitrary Detention, material author, Ana·F)
  ...
```

This is literally Section 4 Variant 3 (`killing → material author → Pepe | M`) and
Section 2 Option 1's table. The compound filter options in the board are not a
display nicety — they are the shape of the data.

**Match rule:** a row matches iff **some tuple** satisfies **every** active
segment-constraint. Path-coupling falls out for free, and "Pedro gave the order"
narrows the Person facet to the people who actually gave an order.

---

## 3. Data shape

```ts
interface ChainSegment {
  relationType: string;
  direction: "outgoing" | "incoming" | "any";  // "any" = bi-directional fallback (Q5)
  fromTypeId: string;
  toTypeId: string;
  label?: string;                               // absent → reuse relationType label both ends (Q5)
}

interface ChainPropertyDef {
  id: string;
  label: string;                                // "Perpetrators"
  rootTypeId: string;                           // "event"
  segments: ChainSegment[];                     // EVENT→ACT→INVOLVEMENT→PERSON
  leaf: { property: string; label: string };    // PERSON.name (the value matching the title)

  // Approach B (admin config): which segments are exposed as filter facets
  filterSegments: number[];                     // e.g. [2,3] → Involvement.role + Person.name

  // value projection for display (Q1 / Section 4)
  projection: "leaves" | "relevant" | "full";

  // depth governance (Q2 / Q7) — per property, not global
  maxDepth: number;
  userAdjustable: boolean;                       // end-user may pick segment/projection (Approach A)
}
```

Selection state (mirrors the existing `*InheritedFiltersAtom`, keyed by segment):

```ts
chainSelectionsAtom: Record<chainId, Record<segmentIndex, Record<value, boolean>>>
chainDepthAtom:      Record<chainId, number>   // user's depth within [1, maxDepth]
```

Traversal + predicate:

```ts
// per root entity: all complete paths along segments
// tuple = [node@seg0, node@seg1, …, leaf]
function chains(rootId, segments, lang): ChainTuple[]

// keep row if SOME tuple satisfies EVERY active segment-constraint
chain: (e, s) => {
  const sel = s.chainSelections[def.id];        // Record<segmentIndex, Set<value>>
  return chains(e.id, def.segments, s.language).some(t =>
    Object.entries(sel).every(([seg, vals]) =>
      vals.size === 0 || vals.has(valueAt(t, +seg, def))));
}
```

Faceted counts continue to come from `matchesAll(e, s, "chain:<id>")` (the existing
`except` pattern). The option list a facet shows is **projected from the surviving
tuples**, so picking "gave order" narrows the Person facet to Andrés.

---

## 4. Decisions (Section 8 of the board)

| # | Question | Recommendation |
|---|---|---|
| 1 | Which segment is "the value"? | Per-def `projection`, **default `leaves`**. The tuple retains the full path so hover (§7) can show `killing → gave order → Andrés`. Display ≠ evaluation. |
| 2 | Who configures depth/segment? | **Hybrid.** Admin sets `filterSegments` + `maxDepth` (Approach B — the combinable default). `userAdjustable` lets the end-user collapse to a single-segment dropdown (Approach A) as a projection over the *same tuples*. A and B stop being exclusive. |
| 3 | Table rendering of multi-inheritance | **Option 1** (all columns, cell-merge) for the main panel — the readable superset. Option 3 (leaves only) when a facet is projected to leaves. Extends `ConnectionGroupCard` (already entity-rows × inherited-columns). This is a **read-view** deliverable, separate from the filter. |
| 4 | "Persons involved" = perpetrators + victims | **Categorize by connection type** (Option B). The relation type *is* segment 0 of the tuple, so grouping the option list by `tuple[0].relationType` is free. Plain list = same data, ungrouped. |
| 5 | Missing label / direction | `direction:"any"` + optional `label` on `ChainSegment` → bi-directional walk, same label both ends. No extra code path. |
| 6 | Block inline edit of chain fields | **Out of scope for filters.** An edit concern; the `segments` model is what a future pop-up relationship-tree editor would drive, but not built here. |
| 7 | Depth: per-property or global? | **Per-property** (`maxDepth` on the def). "Role" wants depth 1; "deciding court's country" wants 2. |

### Approach A vs B, reconciled

- **Approach A** — end-user picks the segment to filter via a dropdown; one block;
  simple but **cannot combine** ("female perpetrators who gave the order").
- **Approach B** — admin pre-configures multiple named blocks (one per segment);
  **can combine**, because the tuple predicate couples them on a shared path.

Both are projections of the same tuple set. B is the default (combinable); A is a
single-segment projection the end-user can switch to when `userAdjustable`.

### Section 4 depth variants → `projection`

- Variant 1 (leaves only) → `projection: "leaves"`
- Variant 2 (relevant part, user-selectable) → `projection: "relevant"` + `userAdjustable`
- Variant 3 (full chain) → `projection: "full"`

---

## 5. Read-view rendering (Section 2)

The four table options render the inherited columns of one chain property on the
entity panel:

- **Option 1 — all columns, cell-merge** *(recommended)*: `Type of violation | Role
  | Name | Gender`, repeated values merged vertically. The readable superset.
- **Option 2 — reverse (leaves first)**: same columns, leaf-major ordering.
- **Option 3 — only leaves**: `Name | Gender`. Matches a facet projected to leaves.
- **Option 4 — only root**: closest to current behavior; breaks for fan-out chains.

Implementation extends `components/metadata/ConnectionGroupCard.tsx`, which already
renders distinct connected entities as rows × inherited properties as columns. The
chain tuples are the rows; the projected segments are the columns.

---

## 6. Label, direction, sorting, hover (Section 7)

- **Labels** — if a relationship label is absent on one end, use the same label for
  both ends. **Direction** — if absent, treat as bi-directional (`direction:"any"`).
- **Sorting** inherited property lists: source-text order of appearance, or
  most-referenced — both grouped by document.
- **Hover / expansion** — expand context, highlight the actual target text, show the
  page; a dialog can page prev/next context without opening the target document. The
  same expansion approach could drive in-document highlights. The tuple already
  carries the full path + ref ids, so the hover dialog has everything it needs.

---

## 7. Build plan

Two cleanly separable deliverables.

**Filter side**
1. `neighbors(id, relType, dir, toType)` + `chains(rootId, segments, lang)` in
   `utils/relationships.ts`. Pure, unit-testable. Cap path count per root; memoize
   `neighbors`; consider a precomputed adjacency index.
2. Replace the special-cased `inherited` predicate in `utils/libraryFilter.ts` with
   the tuple-quantified `chain` predicate (existing depth-1 inherited facets become
   depth-1 `ChainPropertyDef`s — zero behavior change). Do it behind a flag.
3. Bring Relationships to parity: refactor `RelationshipsPanelBody.tsx` off its
   inline flat filtering onto the shared predicate / `except` system.
4. `ChainFacet` component: segment tabs/dropdown for Approach A, stacked blocks for
   B, grouped-by-relation for Q4. Reuse the CEJIL collapsible-group shell + a depth
   stepper when `userAdjustable`.

**Read side**
5. Section 2 Option-1 table, extending `ConnectionGroupCard`.
6. Hover/expansion dialog (Section 7) — path + target-text preview, prev/next
   context without opening the doc.

**Start with Library** (clean predicate base); Relationships needs step 3 first.

---

## 8. Open risks / prerequisites

- **Seed data — RESOLVED: use CEJIL's real graph, no fixture needed.** The mock
  `data/metadata.ts` inherited fields are depth-1 with explicit `connectedEntityIds`,
  but the **CEJIL corpus** (13,194 entities / 16,998 relationships / 13 relation
  types) has genuine multi-hop depth. Demo chain that exists in published data:

  ```
  Causa ──[CorteIDH]──► Sentencia ──[Firmantes]──► Juez ──[País]──► País
  ```

  This maps onto the Event-Act model: Causa = Event, Sentencia = Act, Judge =
  Involvement/Person, País = leaf. Build the feature against CEJIL.

  Three CEJIL-specific implementation facts the traversal must handle:
  - **Hub model.** Relationships carry a `hub` id (a Causa collapses a clique).
    `neighbors()` must resolve hub co-membership, not just follow `from→to`, or it
    misses/over-connects edges. This is the most important detail for `chains()`.
  - **Overloaded relation types.** `País` is used for both *case→country* and
    *judge→nationality*. Each `ChainSegment` must pin `fromTypeId`/`toTypeId` so hops
    don't cross-contaminate (already in the type).
  - **~5,054 null-typed relationships** (a third of all edges). The Section 5/7
    "missing label → bi-directional, same label both ends" fallback is required, not
    optional, to avoid dropping a third of the graph.
  - Only 1 inherited property exists today (Causa → geolocation), so the chain
    feature is genuinely new surface rather than a reskin of the existing facet.
- **Scale.** Tuple enumeration over a deep chain rooted at a high-degree node (the
  2,739-connection País) multiplies across hops. Cap paths per root, memoize, and
  surface a "showing first N paths" note rather than silently truncating.
- **Out of scope here:** the pop-up relationship-tree *editor* (Q6) — the data model
  supports it, but it's a separate build.
