# Relationships surface: redesign proposal

Date: 2026-09-27. Builds on `relationships-proposal.md` (incremental; its Phase 1 shipped on `playground` 6a810482: correct rows, per-scope panel state, "Most evidence" sort, one-line rows, Anchoring and Direction facets).

Driven on `playground` 6a810482, dev server on :1433, 1512×793, light theme. Entities: CEJIL › Rafael Nieto Navia (Juez), CEJIL › Velásquez Rodríguez (Causa) and its Sentencias, plus the Sample figures from the previous pass (La Tablada). Mockups are HTML built on the app's own `tokens.css`, rendered in light and dark with Playwright. Mockup sources are in `relationships-redesign/mockup-src/` and can be re-rendered with `node render.cjs <outdir> a-connections:1440:900 …`.

No app code was changed.

A note on sources: `dev/results/uwazi-2-post.md` covers multi-step traversal, grouping by relationship type, and reference concentration. It does not mention PostgreSQL or Apache AGE. The graph-query backend in section 4 is taken from the brief, not from the post. Confirm it with the Uwazi team before planning on it.

---

## 1. What is wrong with the current structure

These are structural problems. Polish is out of scope here; the incremental proposal covered it.

### 1.1 The toggle changes the unit and the picture at the same time

List shows **references**: one row per piece of evidence. Tree and graph show **connections**: one row or node per connected entity. So the list / tree / graph control changes two things at once: what is being counted, and how it is drawn. That is why the same group read 123 in the list and 51 in the tree. Phase 1 labelled the units in tooltips, but the control still mixes the two. A reader who wants to know which entities are connected has to learn that the list is the wrong place to look, even though it is the default.

### 1.2 The two corpora are opposites, and one surface serves both badly

| | Sample (La Tablada) | CEJIL (whole corpus) |
|---|---|---|
| References / edges | 456 | 16,998 |
| Anchored in text | 435 (95%) | 2 (curated) |
| Edges without a relation type | 41 | 5,054 (30%) |
| Reach beyond the focal entity | 0 edges between other entities | real depth: Causa → Sentencia → Juez → País |

Sample is text references around one document. CEJIL is an entity graph with almost no passages. The surface gives both the same controls: page tags, the Anchoring facet and "source page" grouping apply to Sample; depth applies to CEJIL. Every CEJIL entity pays for text-reference controls it cannot use, and multi-step features have nothing to show on Sample.

### 1.3 Hubs are flattened into pairs, which invents relationships

Uwazi groups connections in hubs. The CEJIL export stores each hub as a star: one `from`, several `to`. `cejilReferencesFor` turns every edge into a pair seen from the focal entity. For a member of a hub, the other members disappear, and when the star's centre is the wrong entity, peers appear as if directly related.

Measured: 433 of 1,479 multi-member CEJIL hubs have a centre with the same template as one of its members. On Rafael Nieto Navia, 16 of his 25 "Firmantes" connections are other judges (`now-judge-list.jpg`, `now-judge-tree.jpg`). He did not "sign" Pedro Nikken; they signed the same Sentencia, and the Sentencia is the one thing the row doesn't show. Héctor Fix Zamudio has 29 judge peers out of 57. No ordering or grouping can fix this, because the unit being displayed is wrong.

### 1.4 Labels are read from one side

"Firmantes" means "signed by" when read from a Sentencia. On a judge's page, the group header still says "Firmantes", which reads as if the judge's signers were listed. There are no inverse labels (a known gap). The template does carry the meaning, though: the field lives on the Sentencia. So "listed in the Firmantes field of X" is always a correct sentence, from either side.

### 1.5 Template fields and the Relationships tab describe the same connections in different words

Metadata lays out relationship fields in template order: "Documentos de la CorteIDH", "Jueces firmantes (via Sentencia, inherits País)". The Relationships tab groups the same connections by raw edge label, including "related" and "No label". The template is the instance's own statement of what each connection means. The surface built to show connections ignores it, and the derived multi-hop fields exist only in Metadata.

### 1.6 Everything is one hop from the page's entity

Every view is an ego list. Multi-step traversal, paths and hierarchy have no place in this structure; each would have to be added as a new expander on a row. The only way to reach hop two today is the overlay and then "Open entity", which drops the entity you started from.

### 1.7 Every host renders the full surface

The main pane, the entity drawer, the overlay (about 28rem) and the Library drawer preview all render the same search, three views, Display menu and Filters. The overlay's job is to answer "what is this and how does it relate to what I'm reading", but it opens on a full relationships panel of its own that doesn't mention the page's entity.

### 1.8 The graph is a rendering of the ego list, not a graph

It is radial, one hop, capped at 150 nodes, and nodes have no names until hovered (`now-judge-graph.jpg`). It shows the same thing as the tree and adds no question the tree cannot answer.

---

## 2. Proposed model and information architecture

### 2.1 Organise by the reader's question

Three **lenses** replace list / tree / graph. Each lens has one unit, so a count always means one thing.

| Lens | Question | Unit | Present when |
|---|---|---|---|
| **Connections** | Who or what is connected to this, and through what? | connected entity | always |
| **Paths** | How do these two connect? What does a template pattern reach? | path | always (CEJIL); after the data work in §4 for Sample |
| **In the document** | Where does the document talk about connected things, and where is that concentrated? | passage (reference with an anchor) | the entity has anchored references; otherwise shown disabled, with a reason on hover |

"Derived" is not a lens. Derived connections (inherited multi-hop fields) appear in Connections as their own group, marked "via …", and their definition appears in Paths as a pattern. A fourth lens would split one fact across two places.

List and Map become **renderings** inside Connections (and Paths), not peers of the lenses. Map is the current radial graph, redrawn per entity with names. It never changes the unit.

### 2.2 Connections

- **Grouping follows the template.** Groups are the focal entity's relationship fields in template order, labelled with the field name ("Firmantes", "País", "Documentos de la CorteIDH"). Group by relation type or by entity type stays available in the Display menu.
- **"Listed in"** collects hubs whose centre is another entity: the other entities' fields that name this one. The row shows the centre entity and the field, for example "Velásquez Rodríguez · Documentos de la CorteIDH · with 3 other Sentencias". This replaces the invented peer rows (1.3) and removes the need for inverse labels (1.4).
- **Derived groups** ("Jueces firmantes, via Sentencia") sit at their template position. Rows are read-only and carry the `↳ via …` provenance line.
- **Unlabelled edges** get their own group, "Without a relation type", at the bottom, with a pointer to Settings › Relationship types. They are not hidden, and they are not spread across the other groups.
- **One row per entity.** Evidence count and direction sit on the row. A row can expand in place one level (a peek: that entity's own key fields and connections), and never deeper. Anything deeper goes through Explore.
- **Explore (multi-step).** Every row has an Explore button. It re-centres the Connections lens on that entity, and a trail at the top records the steps ("Exploring from Velásquez Rodríguez › Sentencia de 21 de julio de 1989"). The page's entity, its tab count, its document and the app's focused entity stay the same; the trail is local to the panel. "Back" pops one step, each crumb jumps back to its step, and "Open entity" makes the explored entity the page. This follows the rule that the overlay must not change the host's entity.
- **Scale.** Groups show the heaviest 5 rows, then "N more". Countries and courts (Corte IDH has 2,739 edges, Perú 711) start collapsed, with a one-line summary by template, for example "214 Causas · 97 Sentencias".

### 2.3 Paths

- **Between two entities.** "From" is the entity being explored (or the page's entity); "To" uses the existing entity picker. The Skip chips default to relation types that connect almost everything. For CEJIL these are País, Paises, Mecanismo and untyped edges. Without them, Velásquez Rodríguez → Godínez Cruz is 2 steps through Honduras; with them it is 6 steps through a judge.
- **Parallel routes fold into one path.** That query has 6 shortest routes, and they differ only in which of the Sentencia's 6 signing judges they pass through. The result is one path whose third step reads "any of 6 judges". Showing six nearly identical paths would bury the answer.
- **Along a pattern.** The template's own multi-hop specs (the `inheritPath` behind "Jueces firmantes", the Library chain facet `CEJIL_PERPETRATOR_CHAIN`) are listed as patterns, and running one gives a table: one column per step, cells merged the way `ConnectionGroupCard` already merges them. One definition then drives Metadata, the Library filter and this view.
- Paths are read-only. "Ask Bert about this path" passes the path to Bert as context.

### 2.4 In the document

- This lens is today's list, restricted to anchored references and ordered by page. At its top is a page strip, one bar per page, sized by the number of passages. Selecting a range sets the existing cluster filter (`activeClusterRefIdsAtom`).
- Rows keep the pill and the `p.N` page tag. Text↔text references show both quotes, as today.
- Entity-level references (no anchor) are not listed here; they are Connections.

### 2.5 Hosts

| Host | Lenses | Rendering | Notes |
|---|---|---|---|
| Relationships tab (main pane) | all three | List, Map | trail and Explore. In Connections and In the document the right pane keeps the page's document. In Paths it collapses (the existing split handle), because a path spans several documents and the query, result and pattern need the width. |
| Drawer beside the Document tab | In the document first; Connections | List | sits next to the page it describes |
| Entity overlay | none; a fixed block and a compact list | List | opens with **"How this connects to [page entity]"**: the path from the page's entity (or from the explored entity, when opened from a trail) to this one. Below it, the entity's Connections, compact, with no toolbar. Footer: "Explore from here" (warm) and "Open entity" (ink). |
| Library drawer preview | Connections, compact | List | no path block, because there is no page entity |
| Mobile (<768) | all three, as a full-width segmented control | List only | Map is not offered. The trail collapses to a back button and the current step. Rows wrap: pill on the first line, metadata on the second. |

---

## 3. Key screens

The screens use real CEJIL data. Numbers are computed from `relationships.json`, with the judge counts excluding the invented peers from 1.3.

**A. Connections, while exploring.** The page is the Causa; the reader has stepped into one of its Sentencias. Groups follow the Sentencia template. Rafael Nieto Navia's row is peeked (`bg-parchment`). "Listed in" shows the Causa field that names this Sentencia.
`relationships-redesign/a-connections-light.png` · `a-connections-dark.png`

**B. Paths.** Velásquez Rodríguez → Godínez Cruz with the default skips. It shows the folded 6-way judge step, the template pattern table, and the path drawn as a map.
`b-paths-light.png` · `b-paths-dark.png`

**C. Overlay.** Opened on Rafael Nieto Navia from a peek on the Causa's Connections. "How this connects" comes first. His relationships read "Listed as Firmante in 9" (6 Sentencias, 3 Resoluciones) instead of 25 mixed rows. The tab count drops from 31 to 15 once the invented peers are gone.
`c-overlay-light.png` · `c-overlay-dark.png`

**D. Mobile.** Connections while exploring the Sentencia, at 390px.
`d-mobile-light.png` · `d-mobile-dark.png`

Current state for comparison: `now-judge-list.jpg`, `now-judge-tree.jpg`, `now-judge-graph.jpg`.

---

## 4. What it needs from the data layer and backend

| Need | Today | Prototype step | Backend (Uwazi 2.0) |
|---|---|---|---|
| Hubs as n-ary records with a centre and members | CEJIL: star edges with an arbitrary centre in 433 of 1,479 multi-member hubs; Sample: 2 hubs | Derive `Hub { centre, field, members[] }` from `relationships.json` by hub id; take the centre from the template field that owns the relation type, and fall back to the export's `from` | Model a hub as its own vertex, with member edges that carry the role. Don't store pairs. |
| Field ownership of a relation type | Template properties carry `relationType` and `content` (target template) | Map `(template, relationType) → field` from `cejilTemplates` and `data/metadata.ts` | Already in Uwazi templates |
| Neighbours of any entity, paged | `referencesFor(id)`, all in memory | Same, plus a per-group cap | `neighbours(id, {field, template, page})` |
| Shortest paths with skips | none. `chains()` walks a fixed segment list only | Add `shortestPaths(graph, a, b, {skipTypes, maxDepth, maxVisited})` to `utils/chainTraversal.ts`: breadth-first, keeping all parents at each depth so parallel routes can be folded. Fast in the browser at 17k edges. | A Cypher shortest path over a variable-length match, filtered on edge type. Apache AGE supports variable-length matches; check its shortest-path support and cost on a real instance before relying on it. |
| Patterns | `ChainSegment[]` specs in `graph.ts` and on inherited fields | List the specs per template; run `chains()` | A Cypher pattern match, one per spec |
| A graph adapter for every corpus | CEJIL only (`cejilChainGraph`) | One generic `ChainGraph` over `referencesAtom` for Sample and Travesía | n/a |
| Sample depth | 0 edges between entities other than La Tablada | Seed 40–60 edges between Sample entities (people ↔ organisations ↔ cases), entity-level | n/a |
| Relation types on all edges | 5,054 CEJIL edges untyped | Show them as their own group | A data-quality task for the instance owner |
| Inverse labels | none | Not needed with field-based wording ("Listed in …") | Optional later |
| Weights / confidence | none | "Shortest" means fewest steps; skip high-degree nodes by type, not by weight | Open |

---

## 5. Migration from today's views

Each step ships on its own and leaves the surface working.

1. **Lenses, same data.** Replace list / tree / graph with Connections (today's tree) and In the document (today's list, anchored rows only, page order). Graph becomes Map inside Connections. `viewAtom` maps list → document, tree → connections, graph → connections plus Map. Entity-level rows leave the list. Delete `ZoomControl` if Density covers it.
2. **Hubs and fields.** Add the hub derivation and field ownership from §4. Connections groups by template field, gains "Listed in", and gets the "Without a relation type" group. On CEJIL this removes the invented peers.
3. **Explore and trail.** Add a panel-local trail state under the existing per-scope atoms (`relAtomFor`). Add the Explore button, peek, Back and crumbs. The overlay gains "How this connects" (a one- or two-step path, computed with the same function as step 4) and "Explore from here".
4. **Paths.** Add `shortestPaths`, route folding, the Skip defaults per instance (a setting under Relationship types), the pattern list and tables, and the path map.
5. **Page strip.** Add the page strip to In the document, wired to the existing cluster filter.
6. **Mobile and host variants.** Add the full-width lens control, the collapsed trail and wrapping rows. The Library drawer preview becomes compact Connections.
7. **Data.** The Sample seed edges and the generic adapter can land any time before step 3 is demonstrated on Sample.

Removed on the way: the list / tree / graph control, the tree's fixed type → target → refs shape, "Then by" (patterns and fields cover the second level), and the 150-node graph cap as a global rule (Map expands per group instead).

---

## 6. Risks and open questions

- **Relearning.** People who know Uwazi's connections list will look for "list". The In the document lens is that list for entities that have a document, but it is not first. Should the Relationships tab open on In the document when the entity has anchored references, and on Connections otherwise? I recommend yes. It is per entity, so no layout change happens while reading.
- **Centre choice for bad hubs.** The 433 CEJIL hubs with an ambiguous centre need a rule. Field ownership resolves most of them, because the field sits on the Sentencia template, not on the judge. Any hub it can't resolve should show as "Listed together with …" rather than be guessed.
- **Is the Uwazi 2.0 backend real, and when?** Paths and patterns at real-instance scale depend on a server-side graph query. The prototype can run them in memory on CEJIL (17k edges), but a large instance cannot. The post in `dev/results` doesn't mention AGE; that premise needs confirming.
- **Skip defaults are instance-specific.** "País connects everything" holds for CEJIL. Who sets the defaults: an admin under Relationship types, or a heuristic based on degree? A degree heuristic is automatic but invisible, and a reader should always be able to see why a path went where it did.
- **Explore vs Open entity.** Two ways to move to another entity. The difference (stay on this page vs go to that page) needs to be clear from the labels alone. Worth a quick hallway test.
- **Editing.** Creating and deleting relationships stays in Connections and In the document, through Edit, as today. Paths and derived groups are read-only. Creating a relationship from a path step ("connect these two directly") is out of scope.
- **Tab count.** It stays the page entity's count, and it changes once invented peers are removed (Rafael Nieto Navia 31 → 15). The count is not a lens total, and it does not follow the trail.
- **Bert.** "Ask Bert about this path" is a natural hand-off, but Bert's replies are mocked. It is listed here only as the place the integration would go.

---

## 7. What stays from the current design rules

- **Selected state is `bg-parchment`.** Peeked rows and the folded path step use it; no new selected colour.
- **Row targets are the entity pill and the `p.N` page tag.** No row-wide click. Explore, peek chevrons and "Show more" are separate, named buttons. Delete stays behind hover in Edit mode.
- **No count in the toolbar.** The tab count is the only number for the surface. Group headers and path results carry their own counts, labelled with their unit.
- **Gutter hosts.** The main pane and the overlay stay `gutter-host` (12px); rows carry no side padding of their own. The trail and the "How this connects" block are rows inside the host.
- **Modal and overlay patterns.** The entity picker for Paths uses the existing picker inside a Modal with a focus trap. The overlay keeps `inert` while closed, the focus trap, Escape, and one right-hand region shared with Filters.
- **One filter pipeline.** `useFilteredReferences` stays the only filter path. Facets apply to Connections and In the document; Paths takes Skip chips instead of facets.
- **Per-scope panel state** (`relAtomFor`), from Phase 1. The trail is one more atom in the same scheme.
- **Type colours.** Pills and dots use `typeLabelColor` (label mixed 55% toward ink), as in the mockups.
- **Provenance idiom.** `↳ via …` for derived rows and explored steps, rendered through `ProvenanceLine`.
- **Warm buttons** on paper bars use `WARM_BUTTON` / `WARM_EDGE`; the primary action is the ink button.
