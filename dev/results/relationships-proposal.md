# Relationships views: proposal

Date: 2026-09-27. Driven on `playground` 8b5695bb (dev server on :1433, 1512×793, light theme only; dark was not checked). Entities used: Sample › Case 11.137 (La Tablada), 456 references; Sample › Pedro Cabrera in the overlay; CEJIL › Velásquez Rodríguez (Causa), 7 relationships, and one of its Sentencias in the overlay.

This is a proposal. Nothing in the code was changed. Screenshots are in `relationships-proposal/`.

Sources: CLAUDE.md "Connections panel" and "Reference vs Relationship" (including its known gaps), `dev/results/uwazi-2-post.md`, `data/references.ts`, `atoms/references.ts`, `atoms/filters.ts`, `utils/relationships.ts`, `utils/chainTraversal.ts`, `data/cejil/graph.ts`, `data/cejil/chainFacets.ts`, `data/cejil/profile.ts`, `public/cejil-data/relationships.json`.

---

## 1. Current state and top friction

### What exists

- One surface, three views over one filter pipeline (`useFilteredReferences`): **list** (one row per reference, grouped by relation type by default, with a "Then by" level), **tree** (relation type → aggregate target → its references), **graph** (radial, one hop, spokes per group, capped at 150 nodes).
- Filters drawer: relation type, target entity type, target country, descriptors, inherited properties (Role, Region).
- Display menu: Group by, Then by, Sort (appearance / A–Z / Z–A / none), Density.
- The entity overlay and the Library drawer render the same `EntityDetailBody`, so a connected entity's Relationships tab is the same surface again.
- A chain engine already walks multiple hops: `chains()` in `utils/chainTraversal.ts`, bound to CEJIL by `cejilChainGraph()`. Today it feeds Library chain facets and the Metadata "Jueces firmantes" field (Causa → Sentencia → Juez → País). The Relationships views don't use it.
- The document viewer's right rail already shows where references concentrate (numbered cluster markers per page).

### What the Uwazi 2.0 post promises, and where we are

| Post goal | Today |
|---|---|
| "follow relationships across multiple steps" | One hop in every view. Hop two exists only inside Metadata's inherited fields. |
| Shortest path between two entities | Not present. `chains()` enumerates paths along a fixed segment list; there is no search between two given entities. |
| Hierarchical exploration | The tree has one fixed shape (type → target → refs). A target can't be opened into its own connections. |
| "grouping related information by relationship type" | Present (default group-by). Template relationship properties ("People involved", "Jueces firmantes") are not a grouping axis. |
| "where references are most concentrated" | Present on the document rail. Inside the Relationships panel, only as a "Source page" group-by. |

### Top friction, observed

**F1. The main seed entity relates to itself.** In La Tablada's list, "Case 11.137 (La Tablada)" appears as a target under Relates to (`02-list-self-loop.jpg`, fourth row; also in the tree, `03-tree.jpg`). Cause: `referencesFor()` returns the whole corpus unchanged for `MAIN_ENTITY_ID`, so the six `ref-xs-*` rows (source = another entity, target = e3) never get `fromPerspective()` and render e3 → e3.

**F2. Most CEJIL rows are labelled HUB, with "1 parties".** Every CEJIL edge carries a hub id, so every row renders as a hub (`08-cejil-tree-hubs.jpg`). In `relationships.json`, 10,608 of 12,087 hubs have one member. A one-member hub is a plain relationship, and "1 parties" is also a grammar bug (`HubRow.tsx:127`).

**F3. The overlay inherits the host's filters and view.** On Velásquez Rodríguez I ticked Relation type = CorteIDH, then opened one of its Sentencias. The overlay's Relationships tab shows 1 of the Sentencia's 9 relationships, with the host's CorteIDH chip in its search box (`11-overlay-filter-leak.jpg`). The 8 hidden rows are the signing judges, which is exactly the next hop a reader opened the overlay to find. The facet atoms and `viewAtom` are global; only the references are scoped by `EntityScopeProvider`. Clearing the chip in the overlay also clears it on the host. The same applies to the view: the overlay opened straight into graph because the host was in graph.

**F4. The graph shows the same entity several times and names nothing.** Graph nodes are keyed per aggregate (`target::type`), so an entity connected by three relation types is three dots. Pedro Cabrera's overlay graph has three dots, all La Tablada (`06-overlay-graph.jpg`). On La Tablada the graph shows 150 of 224 unlabelled dots; a name appears only on hover (`04-graph-cap.jpg`, `05-graph-hover.png`).

**F5. Hop two is visible in Metadata but not in Relationships.** Velásquez Rodríguez's Metadata tab lists the signing judges and their countries, "via Firmantes, all inherited via Sentencia de 21 de julio de 1989" (`10-cejil-metadata-judges.jpg`). Its Relationships tab, graph and tree, stop at the four Sentencias (`08`, `09`). The surface named Relationships shows less of the network than the record does.

**F6. Four different numbers for one group.** For La Tablada, Relates to reads 123 in the list (references), 51 in the tree (aggregates plus hubs), and the graph reports 224 relationships overall against the tab's 456. Each number is correct for its projection, but nothing on screen says which unit is being counted.

**F7. Rows repeat what the group already says.** Grouped by relation type, every list row still prints its relation type under the pill ("Relates To" under Relates to, `02`). In the tree, the direction glyph sits alone on a second line, so each target costs two lines; about ten targets fit on a 793px screen (`03`).

**F8. No sort by weight.** Sort offers appearance / A–Z / Z–A / none. There is no "most evidence first", which is the first question for an entity with 224 connections. The graph already ranks by evidence internally when it truncates; the reader can't ask for the same order in the list or tree.

**F9. The data has one hop in the seed.** Of the Sample corpus, every generated reference is sourced from e3 except the six `ref-xs-*` rows. Opening any Sample entity's connections leads back to La Tablada. Any multi-step feature can only be demonstrated on CEJIL (and possibly Travesía) until the seed grows edges between other entities.

---

## 2. Improvements

Effort: S = a day or less, M = a few days, L = a week or more.

### 2.1 Correct rows: perspective and single-member hubs

- **Problem.** F1 and F2. Rows that show an entity related to itself, and 88% of CEJIL hubs rendered as n-ary containers with one member.
- **Change.** (a) Run `fromPerspective()` for `MAIN_ENTITY_ID` too, instead of returning `all` unchanged. (b) In `deriveHubs`, a hub with one member is emitted as an ordinary aggregate, not a Hub. The HUB label and the "N parties" footer then only appear for 2+ members. (c) Pluralise "party / parties".
- **Views.** All three, the drawer section, the overlay.
- **Data.** Nothing new.
- **Effort.** S.
- **Mock.**

```
before                                         after
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│ ▪ Honduras                 HUB  ⇔ 1  │       │ ▪ Honduras                     ⇔ 1   │
│ 1 parties                            │       │ → País                               │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

### 2.2 The overlay gets its own filters and view

- **Problem.** F3. A filter set on the host hides most of the connected entity's relationships, which defeats the reason for opening it.
- **Change.** Key the facet atoms, the search query and `viewAtom` by entity scope, the way `scopedFiltersOpenAtom` already keys the filters-open flag. The overlay opens on its own defaults (list, grouped by relation type, no filters) every time, and its chips only affect its own body. The host keeps its state untouched underneath.
- **Views.** EntityOverlay, the Library drawer preview. The main view and `RelationshipsDrawerSection` keep sharing one state, since they show the same entity.
- **Data.** Nothing new. `useFilteredReferences` reads the scoped atoms through the existing `useEntityScopeId()`.
- **Effort.** M. Mostly plumbing, but every consumer of the facet atoms needs to go through the scope hook, and `clearRelFiltersAtom` / `resetRelFacetsAtom` need a scoped variant.
- **Mock.** Host keeps "CorteIDH ×"; the overlay search box is empty and shows 9.

### 2.3 Graph: one node per entity, names on screen

- **Problem.** F4. Duplicate nodes per relation type; nodes are anonymous dots.
- **Change.** (a) One node per target entity. When an entity is connected by several types, it sits on the spoke of its heaviest type and carries a small "+2 types" mark; hovering lists the types. (b) Print the title beside the top nodes by evidence count (for example the 12 heaviest, and every node once a spoke is expanded to fewer than about 20), truncated with `FadeTruncate` rules; others keep the hover tooltip. (c) Keep the 150 cap, but let the reader expand one spoke to show all its nodes, instead of cutting by global evidence rank.
- **Views.** Graph, in the main pane and the overlay.
- **Data.** Nothing new. Needs a per-entity derivation next to `deriveRelationships` (group by `targetEntityId` only, keep `relationTypes[]`).
- **Effort.** M.
- **Mock.**

```
            Cites
         ●  ●  ● Pedro Cabrera  +2 types
          \ | /
 Relates to ─(La Tablada)─ Mentions
          / | \
   Case 12.045 ●  ●  ● Argentina
```

### 2.4 Open a connection into its own connections (hierarchical, multi-step)

- **Problem.** F5 and the post's "follow relationships across multiple steps". Today a reader follows a chain by opening an overlay, and then "Open entity", losing the entity they started from.
- **Change.**
  - **Tree:** an aggregate row gets a second chevron level, "Its connections", which lists that entity's relationships, grouped by relation type, excluding the edge back to where the reader came from. Each level indents once. A path line at the top of an expanded branch reads `Velásquez Rodríguez → Sentencia de 21 de julio de 1989 → …` using the existing `ProvenanceLine` idiom, so there is one "how did I get here" style in the app.
  - **Graph:** clicking a node's expand control (not the node, which keeps opening the overlay) draws a second ring of that node's neighbours on its outer side. A breadcrumb above the canvas lists the expanded path; each crumb collapses back to that point.
  - **Row targets do not change.** The pill still opens the overlay, the page tag still jumps to the passage. Expanding is the chevron's job only, and it is a separate button with its own name ("Show connections of Sentencia de 21 de julio de 1989").
  - Caps: each expansion shows at most 50 neighbours, heaviest first, with a "Show all N" control. Country and court nodes (CEJIL's Corte IDH has 2,739 edges, Perú 711) start collapsed.
- **Views.** Tree, graph. The overlay and drawer section get the tree behaviour for free.
- **Data.** Available for CEJIL via `cejilChainGraph().neighbors()` or `cejilReferencesFor(id)`, which already give real depth (Causa → Sentencia → Juez → País). **Gap:** the Sample seed has almost no edges that don't touch e3 (F9), so on Sample the second level would only lead back to La Tablada. Either seed a few dozen entity-to-entity references between Sample entities, or demo this on CEJIL only. **Gap:** there is no `ChainGraph` adapter for the Sample or Travesía corpora; one generic adapter over `referencesAtom` would cover both.
- **Effort.** M for the tree, L for the graph (layout of a second ring inside the existing sector model, plus the breadcrumb).
- **Mock (tree).**

```
▾ CorteIDH
  ▾ ▪ Velásquez Rodríguez. Sentencia de 21 de julio de 1989          ⇔ 1
      ↳ via Velásquez Rodríguez → Sentencia de 21 de julio de 1989
      ▾ Firmantes                                                      7
          ▪ Rafael Nieto Navia                                        ⇔ 1   ▸
          ▪ Héctor Fix-Zamudio                                        ⇔ 1   ▸
          ▪ Rodolfo Piza Escalante                                    ⇔ 1   ▸
      ▸ País                                                           1
```

### 2.5 Group by relationship property, not only by relation type

- **Problem.** The template already names the meaningful connections: "People involved (via Relates to, inherits Country, Role)", "Jueces firmantes (via Firmantes, inherits País)". Metadata shows them; Relationships groups by the raw relation type, where "Relates to" mixes people, countries and courts. The post's "grouping related information by relationship type" is closer to the template field than to the raw edge label.
- **Change.** A new Group by option, "Relationship property". Each group is one template relationship field, in template order, labelled with the field's name. References that match no field fall into "Other connections". Multi-hop inherited fields (Jueces firmantes) appear as their own group, marked "via Sentencia", and their rows are read-only derived rows with the `↳ via …` provenance line.
- **Views.** List and tree. The graph can use it as a spoke axis.
- **Data.** Field definitions come from `deriveTemplateStructure(...).fields` and `groupConnections` (already used by Metadata). **Gap:** a derived multi-hop row is a chain tuple, not a `Reference`; `RelationshipRow` needs a fourth kind (`"derived"`) that renders a tuple with provenance and no delete. **Gap:** in real Uwazi a relationship property matches edges by relation type AND target template; the prototype's `connectedEntityIds` on the field sidesteps that (known simplification in CLAUDE.md), so for Sample entities the grouping would read from the field's explicit list, not from `references[]`.
- **Effort.** M.
- **Mock.**

```
Group by  [Relationship property ▾]

▾ People involved                       via Relates to
    ▪ Juan Carlos Abella    Petitioner · Argentina
    ▪ Carlos Mendoza        Witness · Argentina
▾ Jueces firmantes                      via Sentencia → Firmantes
    ▪ Rafael Nieto Navia    ↳ via Sentencia de 21 de julio de 1989
▸ Other connections
```

### 2.6 Path between two entities

- **Problem.** "How is this case connected to that one?" has no answer in the UI. It is the one multi-step question readers can phrase without knowing the schema.
- **Change.** A "Find a path to…" action in the overlay footer (next to "Open entity") and in the graph's corner controls. The reader picks a second entity with the existing entity search picker. The result is a vertical path in the panel: each node an entity pill (opens the overlay), each edge its relation type and direction glyph. Controls under the result: "Ignore" chips for relation types to skip, pre-set to País, Paises, Mecanismo and untyped edges for CEJIL, and "Show next shortest". On the graph, the path is drawn as a highlighted line through the expanded rings from 2.4.
- **Why the defaults matter.** Measured on `relationships.json`: without exclusions, Velásquez Rodríguez → Godínez Cruz is 2 hops, both via Honduras, which says only "same country". Excluding País, Mecanismo and untyped edges, it becomes 6 hops through the signing judge Rafael Nieto Navia and a joint Sentencia, which is the answer a researcher wants.
- **Views.** Overlay, graph. A small result panel in the drawer section.
- **Data.** **Gap:** `chainTraversal.ts` has `chains()` (paths along a given segment list) but no search between two given entities. Add a breadth-first `shortestPath(graph, from, to, { skipTypes, maxDepth, maxVisited })` to the same module, graph-agnostic like the rest. It is fast enough in the browser: 17k edges, 4.4k entities. **Gap:** no adapter for Sample/Travesía (same as 2.4). **Gap:** edges have no weight or confidence (known gap), so "shortest" means fewest hops only.
- **Effort.** L.
- **Mock.**

```
Path: Velásquez Rodríguez → Godínez Cruz            6 steps
  ▪ Velásquez Rodríguez
  │  → CorteIDH
  ▪ Velásquez Rodríguez. Sentencia de 21 de julio de 1989
  │  → Firmantes
  ▪ Rafael Nieto Navia
  │  ← Firmantes
  ▪ Velásquez Rodríguez, Fairén Garbi y Solís Corrales
  │  ← CorteIDH
  ▪ Godínez Cruz
Ignore: [País ×] [Mecanismo ×] [No label ×]   Show next shortest
```

### 2.7 Where references concentrate, inside the panel

- **Problem.** The document rail shows reference clusters per page, but in the Relationships panel the only link to page position is the "Source page" group-by. A reader filtering relationships can't see which pages carry them, and the Filters drawer covers the document when open.
- **Change.** (a) A **Pages** section at the top of the Filters drawer: a one-line bar strip, one bar per page with anchored references, height by count. Clicking or dragging across bars sets a page range, stored in the existing `activeClusterRefIdsAtom` so the chip and the Filters badge work as they do for rail clusters. (b) An **Anchoring** facet: "Anchored in text" / "Entity-level". (c) A **Direction** facet: outgoing / incoming / both. (d) When grouped by Source page, each group header carries the same small bar so the heavy pages read at a glance.
- **Views.** Filters drawer (all views), list and tree when grouped by source page.
- **Data.** `sourceSelection.page` and `direction` exist. **Gap:** CEJIL has two curated anchored references in total (`textAnchors.ts`); the Pages strip is empty for nearly every CEJIL entity and should self-hide like other empty facets.
- **Effort.** S for the facets, M with the page strip.
- **Mock.**

```
Filters
  Pages                                    anchored refs by page
  ▁▃█▅▂▁▁▃▆▂▁ ▁▂▁▁▃▁▁▁▂ …                  [ p.3–p.9 × ]
  Anchoring   ☐ Anchored in text  ☐ Entity-level
  Direction   ☐ Outgoing  ☐ Incoming  ☐ Both
  Relation type …
```

### 2.8 Denser rows and a weight sort

- **Problem.** F6, F7, F8.
- **Change.** (a) Sort gets "Most evidence" (and it becomes the default in tree and graph, where rows are aggregates). (b) When the group axis is relation type, rows drop their own relation-type line; the direction glyph moves onto the pill line, right after the pill. The tree row becomes one line. (c) Group headers say what they count, with the unit in the accessible name and a tooltip ("123 references", "51 connections"). The tab count stays the only number for the surface, as now; nothing is added to the toolbar.
- **Views.** List, tree.
- **Data.** Nothing new (`evidenceCount` exists).
- **Effort.** S.
- **Mock.**

```
before (tree, 2 lines per target)            after (1 line)
▸ ▪ PERSON Roberto Cárdenas       ⇔ 5        ▸ ▪ PERSON Roberto Cárdenas  ⇄     ⇔ 5
  ⇄                                          ▸ ▪ COURT CASE Case 12.045   ⇄     ⇔ 3
▸ ▪ COURT CASE Case 12.045        ⇔ 3
  ⇄
```

---

## 3. Recommended order

**Phase 1: make what is there correct and readable (S/M, no new data).**
2.1 correct rows, 2.2 overlay scope, 2.8 density and weight sort, 2.7 facets (Anchoring, Direction; page strip if time allows).
These fix things a reader hits today, and 2.2 is a precondition for multi-step work: without it, opening the next hop shows a filtered subset.

**Phase 2: one hop, organised the way the template organises it (M).**
2.3 graph one node per entity with names, 2.5 group by relationship property.
Also in this phase: seed a few dozen Sample entity-to-entity references and write the generic `ChainGraph` adapter over `referencesAtom`, so Phase 3 works on Sample and not only on CEJIL.

**Phase 3: multi-step (M/L).**
2.4 expand into connections (tree first, graph second), then 2.6 path between two entities, which reuses 2.4's rings and breadcrumb for its graph drawing.

Who should build it: Code for the data and state work (2.1, 2.2, the adapter, `shortestPath`); Design for the row, graph and path layouts (2.3, 2.4, 2.6, 2.8) before Code implements them; QA to re-run the overlay filter case in 2.2 and the self-loop in 2.1.

---

## 4. What we deliberately don't change

- **No count in the toolbar or info rows.** The Relationships tab count is the only number for the surface. Group headers keep their per-group counts; 2.8 only labels their unit.
- **Row targets stay the entity pill and the `p.N` page tag.** No row-wide click, no hover eye. New affordances (2.4 expand, 2.6 find path) are separate named buttons.
- **Selected state stays `bg-parchment`.** The path highlight in 2.6 uses the carbon focus halo on nodes and a stronger stroke on edges, not a new fill.
- **One filter pipeline.** Every new facet (2.7) goes into `useFilteredReferences`; no view filters on its own.
- **One right-hand region.** Filters and the overlay still replace each other; 2.7 puts the page strip in the drawer rather than adding a second panel.
- **The graph stays radial for one hop.** No force-directed layout; 2.4 adds rings on the same sector model.
- **The overlay stays Metadata + Relationships.** Document and Files remain behind "Open entity".
- **CEJIL stays read-only.** Derived rows (2.5) and paths (2.6) have no delete or edit.
- **Known data gaps stay visible, not faked:** no inverse relation labels, no `createdBy` / source kind / confidence (so no facets for them, and "shortest" means fewest hops), no jump to the target-side passage.
