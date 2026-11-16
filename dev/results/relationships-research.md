# Relationships redesign — supporting research

Date: 2026-09-27. Answers the three questions raised by `relationships-redesign.md` §4 ("What it needs from the data layer and backend") and §6 ("Is the Uwazi 2.0 backend real, and when?"). Findings below either confirm or correct that section — see the verdict at the end of each part.

Method: part 1 and part 3 were researched by two background agents (web search + doc fetches); part 2 was researched directly, by shallow-cloning `huridocs/uwazi` at `production` (commit `7a9ce10`, 2026-09-25) and cross-checking with `gh` against the live repo's PR/issue history. All URLs below were actually opened (by me or by the sub-agent whose findings I'm reporting); anything not opened is flagged as such.

---

## 1. Apache AGE — shortest path / variable-length queries with edge-type filters, and ParadeDB

### Status and versions
Apache AGE's latest release is **v1.7.0** (2026-01-21), which requires **PostgreSQL 18 only**; the prior line (v1.5.0/v1.6.0) covered PG11–PG17. Source: [age.apache.org/release-notes](https://age.apache.org/release-notes/). A 2026 roadmap discussion from the maintainers confirms PG17 support already shipped, PG18 is landing "in the next release cycle," and PG19 support is planned "time permitting," with OpenCypher coverage, performance, and tooling as stated priorities: [github.com/apache/age/discussions/2305](https://github.com/apache/age/discussions/2305).

**Implication for Uwazi:** AGE's PG-version support is narrow and moves fast (one release = one supported major PG version). Whatever PG major version Uwazi's Postgres core work standardizes on (see part 2) constrains which AGE release is usable, and that pairing will need re-checking at implementation time, not assumed from this doc.

### Variable-length paths and shortest path
Variable-length edge syntax is documented and supported: `(u)-[*2]->(v)`, `(u)-[*3..5]->(v)`, `(u)-[*3..]->(v)`, `(u)-[*..5]->(v)`, `(u)-[*]->(v)`. Source: [age.apache.org/age-manual — MATCH clause](https://age.apache.org/age-manual/master/clauses/match.html) (official docs, fetched directly).

`shortestPath()` / `allShortestPaths()` are referenced in third-party tutorials, but **the official MATCH docs page does not document either function** — it only documents `relationships(p)` to extract edges from an already-matched path. Treat "AGE has shortestPath()" as **unconfirmed from a primary source**.

Separately, and more concretely: Apache AGE does **not** support the newer, standardized `SHORTEST` keyword (`MATCH p = SHORTEST 1 (a)-[...]-(b)`, the GQL-standard successor to Neo4j's older `shortestPath()`). This is an **open bug**, filed 2025-04-16, still open with no maintainer response as of the research date: [github.com/apache/age/issues/2162](https://github.com/apache/age/issues/2162) (verified via `gh` — state and dates confirmed against the live issue).

**Verdict on shortest path:** genuinely unclear. Do not plan on `SHORTEST`. Do not assume the legacy-style `shortestPath()` function works without testing it against a real AGE instance first — it may be a holdover from AGE's origin as a Cypher-on-Postgres fork, or it may simply not exist. This directly bears on the redesign's Paths lens (§2.3, §4): the fallback if AGE can't do this natively is to implement `shortestPaths()` as an app-level BFS over rows fetched from Postgres (same algorithm the prototype already sketches for the browser, ported server-side), not a single Cypher query.

### Edge-type filtering mid-traversal
Label/type filtering combines with variable-length patterns: `(actor)-[:ACTED_IN*2]-(co_actor)` is documented syntax (same MATCH page). This covers the redesign's "skip these relation types" requirement for a *fixed* set of hops, but:

- Whether you can filter by edge or vertex **properties** mid-traversal (not just label, and not just at the two endpoints) is **not documented** on that page, and no primary source confirming per-hop property predicates inside a variable-length pattern was found. This is likely unsupported natively (would need post-filtering the whole path with `WHERE`), but this is inferred, not verified.
- The redesign's "Skip chips" (§2.3: skip País, Mecanismo, untyped edges — i.e., exclude these types from the traversal, not require them) is a **negative** filter. The documented syntax above is a positive label filter (`:ACTED_IN`). Whether AGE supports an edge-label *exclusion* inside a variable-length pattern is unverified; if not, the workaround is a post-filter or a rewritten positive-list.

### Performance limits (10k–10M edges)
Public benchmark data is thin, and what exists is old and inconsistent with a "current, load-bearing" claim:

- **Bulk insert, not query:** one user reported importing the Panama Papers dataset (674,103 edges) at only ~2,600 edges per 2 hours via Cypher `CREATE`; the maintainer-recommended workaround was inserting directly into AGE's underlying edge table, claimed "1000x faster." Discussion is old (2020-era): [github.com/apache/age/discussions/130](https://github.com/apache/age/discussions/130).
- **Variable-length query at 1.2M edges:** a closed issue (filed and closed in 2022, closed without resolution, labeled "question") reported: 4-hop query = 7s, 5-hop = 3.5 min, 6-hop = ~7 min, 10-hop = hangs indefinitely: [github.com/apache/incubator-age/issues/195](https://github.com/apache/incubator-age/issues/195) (verified via `gh` — closed 2022-04-11). This is the single clearest number found for "performance limits," and it is **four years old** (v0.x-era AGE), with no evidence it still holds on v1.7.0.
- **10M+ edges:** no benchmark data at all was found, old or new.

**Verdict:** there is no trustworthy, current evidence that AGE performs acceptably for shortest-path/variable-length queries at the scales §4 cares about (CEJIL today: ~17k edges; "a large instance" cited in §6 as the real risk). The 2022 numbers, if still representative, suggest deep (6+ hop) variable-length queries degrade sharply well before 10M edges. This is a real risk to flag upward, not a settled premise to build a UI on — matches the redesign doc's own caveat in §6 ("that premise needs confirming") and hardens it: it needs confirming *and* the confirmation will likely be unfavorable at 5+ hops without careful indexing/limits.

### ParadeDB's role
ParadeDB is a Postgres extension suite for **full-text search** (`pg_search`, BM25/Elasticsearch-style scoring) and was building an OLAP/analytics extension (`pg_analytics`, DuckDB/Arrow-based) that is now **archived/discontinued and folded into `pg_search`**. Sources: [docs.paradedb.com](https://docs.paradedb.com/welcome/introduction), [github.com/paradedb/pg_analytics](https://github.com/paradedb/pg_analytics) (archived status corroborated, not independently re-verified beyond the search snippet).

A GitHub code search of `paradedb/paradedb` for the string "graph" returned **zero results** (`gh api search/code -f q='graph+repo:paradedb/paradedb'`, run live). **Conclusion: ParadeDB has no relationship to Apache AGE or graph queries.** It is a search/analytics extension that could coexist in the same Postgres instance as AGE (search via pg_search, graph via AGE, both as Postgres extensions), but nothing indicates this pairing is documented, tested, or used anywhere. If ParadeDB appears in Uwazi 2.0 planning at all, it is almost certainly about full-text search parity/replacement for Elasticsearch, unrelated to the Relationships redesign.

**Scope caveat from the sub-agent that did this research:** none of this was tested against a live AGE instance; everything is doc/issue-thread research, several of the most concrete numbers are stale (2020–2022). Any go/no-go decision on AGE for the redesign needs a hands-on spike, not this document.

---

## 2. huridocs/uwazi (production branch) — what the real data model and backend work actually look like

Cloned `huridocs/uwazi` at `production`, HEAD `7a9ce10` (2026-09-25) via `gh repo clone`.

### The relationship model today (V1, still primary)
The **legacy V1 model** is what's live: a `connections` collection/table where each row is one `HubConnection` — `{ _id, hub, entity, template, file?, reference?, sharedId?, filename? }` (`app/shared/contracts/RelationshipsV1DataSource.ts:44-53`). A "hub" is a plain grouping id shared by rows, **with no centre/member-role field anywhere in the type** — confirming the redesign doc's §1.3 diagnosis exactly: hubs are stored as a flat set of rows, not as an n-ary record with a distinguished centre, so any "who is the centre of this hub" logic has to be reconstructed at read time (e.g. from which template owns the relation-type field), which is precisely what the redesign's `Hub { centre, field, members[] }` derivation (§4) proposes to do.

Grouping/rendering of these rows for the current relations panel groups by **relation type → target template → refs** (`app/api/relationships/groupByRelationships.js:4-56`) — this is the exact "fixed type → target → refs shape" the redesign proposes retiring (§5, "Removed on the way").

Relationship *type* definitions (`RelationshipType { id, name }`) are a separate, simpler domain — no `properties`, no inheritance spec. Property-level inheritance (the redesign's "derived groups") lives instead on the **template property**, not the relationship type: the legacy `relationship` template property carries `relationType`, optional `content` (target template constraint), and optional `inherit` (single-hop property inheritance) — `app/api/core/domain/template/V1RelationshipProperty.ts:23-51`, documented in `AI Contexts/RelationshipMetadata_V1.md:19-33`. Denormalization copies the inherited value at write time into `metadata[property].inheritedValue` (`AI Contexts/RelationshipMetadata_V1.md:115-130, 275-307`); it is **not** resolved live at render time the way the prototype's `resolveInherited()` does. There is **no multi-hop inheritance path** in the real backend (nothing matching the prototype's `inheritPath`/`ChainSegment[]` multi-hop projection) — V1 inheritance is a single native-property lookup only, same limitation the prototype's docs call "the classic single-level only" case.

### V2 relationships module — a real multi-hop query engine already exists, but it is fixed-shape, not variable-length
`app/api/relationships.v2/` is a full hexagonal module (domain/application/infrastructure) with its own `Relationship { _id, from, to, type }` model (`app/api/relationships.v2/model/Relationship.ts:157-181`, matching Uwazi 2.0's documented `from`/`to`/`type` shape almost exactly) and pointer types (`EntityPointer`, `FilePointer`, `TextReferencePointer` with `selections[]` — the same from/to-with-optional-anchor shape the redesign's "Reference vs Relationship" section describes).

The interesting piece is `MatchQueryNode` / `TraversalQueryNode` (`app/api/relationships.v2/model/{MatchQueryNode,TraversalQueryNode}.ts`): a **tree of alternating "match this entity" / "traverse this relationship type in this direction" nodes**, built up front by the caller, that supports `chainsDecomposition()`, path inversion (`inverse()`), and "does this query reach this entity/relationship" checks (`reachesEntity`, `reachesRelationship`). It is compiled into a MongoDB aggregation pipeline — one `$lookup` stage per tree level, tracking a `visited` array to block cycles — by `app/api/relationships.v2/database/MongoGraphQueryCompiler.ts:46-120`, and executed through `RelationshipsDataSource.getByQuery(query: MatchQueryNode, language): ResultSet<Entity>` (`app/api/relationships.v2/contracts/RelationshipsDataSource.ts:17`, implemented at `MongoRelationshipsDataSource.ts:93-97`).

This is functionally the server-side twin of the prototype's `chains()`/`ChainSegment[]` (both are **fixed-depth, caller-specified traversal trees**, not variable-length/wildcard patterns) — it is used today only for `DenormalizationService` (`app/api/relationships.v2/services/DenormalizationService.ts:65`, refreshing denormalized data when a relationship changes) and `EntityRelationshipsUpdateService.ts:78`, not for any user-facing "how do these connect" query. **There is no `shortestPaths()`, no BFS, no variable-length traversal anywhere in the codebase** — confirmed by grepping the full checkout for "shortest", "BFS", "variable.length", cypher-adjacent terms: none found outside this research doc's own copy. The redesign's proposed `shortestPaths(graph, a, b, {skipTypes, maxDepth, maxVisited})` (§4) has **no existing backend equivalent to build on**; it would be new work, and `MatchQueryNode`'s tree-of-lookups approach is the closest existing pattern to imitate for a Mongo-backed implementation (build the tree breadth-first up to `maxDepth`, same `visited`-array cycle guard), rather than something reusable as-is.

### Postgres migration — real, active, but not a graph database
This is the most load-bearing finding for §6's open question ("Is the Uwazi 2.0 backend real, and when?"): **Postgres work on relationships is real, active, and merged into `production` in the last 3 days before this research** — but it is a plain relational port, not a graph engine, and it targets the **legacy V1 model**, not the v2 `relationships.v2` module described above.

- PR **[#9776 "Migrate V1 relationships persistence to Postgres"](https://github.com/huridocs/uwazi/pull/9776)**, merged 2026-09-24 (one day before the cloned HEAD), adds `PostgresRelationshipsV1DataSource.ts` (630 lines) implementing the same `RelationshipsV1DataSource` contract Mongo does, gated behind a `postgresCore` feature flag, with both backends selected at runtime by a factory (PR body, verified via `gh pr view`).
- Its schema, `app/api/core/infrastructure/postgresql/schema_migrations/022-create-connections-table.sql` (fetched from the repo), is a **flat table**: `connections(_id, tenant_id, entity, hub, template, file, metadata JSONB, reference JSONB, sharedId, filename, range JSONB)`, indexed on `(tenant_id)`, `(tenant_id, entity)`, `(tenant_id, hub)`, `(tenant_id, template)`, with row-level-security for tenant isolation. This is a one-to-one port of the Mongo `connections` shape (same `hub`/`entity`/`template` fields as `HubConnection` above) — **no graph extension, no recursive CTE** (`grep -n "RECURSIVE" PostgresRelationshipsV1DataSource.ts` → no matches), no adjacency-list-with-traversal design. Hub membership is still "rows that share a `hub` id," queried with a plain indexed `WHERE hub = ...`, not a graph structure.
- A same-day follow-up fix, PR **[#9777 "Fix PG relationships: undefined-binding crash and wasted raw full-scans"](https://github.com/huridocs/uwazi/pull/9777)** (merged 2026-09-24), and PR **[#9760 "Denormalize relationships through the async job pipeline (Mongo + Postgres)"](https://github.com/huridocs/uwazi/pull/9760)** (merged 2026-09-22), show this is being actively hardened, not a one-off proof of concept.
- Related, earlier: PR **[#9465 "relationship types postgres"](https://github.com/huridocs/uwazi/pull/9465)** (merged 2026-07-31) did the equivalent move for relationship **type definitions** (the `relationtypes`/`RelationshipType{id,name}` domain), documented in-repo at `AI Contexts/Relationship Types/relationship-types-postgres.md` and `relationship-types-v2-migration.md`. That document is explicit and unambiguous: **it never mentions Apache AGE, Cypher, or graph queries anywhere** — it is a straightforward "move this small table from Mongo to Postgres behind a feature flag, following the Templates/Thesauri/Files pattern" migration (RLS via `tenant_id` + Postgres policies, one-time data copy, sync via Mongo `updatelogs` for compatibility). It explicitly treats relationship *types* as data with **no relational/graph structure of its own** ("Domain fields: `id`, `name` only").
- A repo-wide search for "apache.age", "apache_age", "cypher", "pg_search", "paradedb" across `.md`/`.ts`/`.sql` files returned **zero matches**. A `gh pr`/`gh issue` search across the whole repo for "apache age", "cypher", "graph database" returned no relevant results (only dependency-bump PRs with "graph" incidentally in an unrelated package name).

**Verdict on §6's open question:** the Postgres migration is real and is happening now (this week, relative to this research), but it is **entity/template/relationship-*type*/relationship-*row* storage moving off MongoDB and onto Postgres tables with RLS for multi-tenancy** — the same pattern already used for templates, thesauri, and files (see `relationship-types-postgres.md`'s own comparison table). It is **not** a move to a graph database, and nothing in the codebase, docs, or PR history suggests Apache AGE, Cypher, or any graph-query engine is planned or in progress. `dev/results/uwazi-2-post.md`'s silence on Postgres/AGE (noted by the redesign doc itself) is consistent with this: the real backend team is doing a relational migration, and any AGE-based traversal engine the redesign's §4 sketches is **not on their roadmap as observed** — it would be new work Uwazi doesn't currently have, layered on top of (or instead of) tables shaped exactly like today's flat `connections`/`hub` rows.

This also sharpens the redesign's own §4 "Hubs as n-ary records" row: the real backend is moving the *exact* flat-hub-row shape the redesign wants to move away from into Postgres, unchanged. If a future graph layer is ever built, it would need to be built from these flat rows (via `hub` id grouping, exactly as `HubDataSource`/`MongoHubsDataSource` do today at `app/api/relationships.v2/database/MongoHubsDataSource.ts` and `app/api/relationships.v2/contracts/HubDataSource.ts:8-13`, whose entire interface is `create/drop/insertIds/all` — no centre, no roles, no query surface at all yet), not inherited for free from the Postgres migration in flight.

### Relevant files (for anyone picking this up)
| Concern | Path |
|---|---|
| V1 hub/connection row shape | `app/shared/contracts/RelationshipsV1DataSource.ts:44-53, 124-193` |
| V1 property with `inherit` (single-hop only) | `app/api/core/domain/template/V1RelationshipProperty.ts:23-51` |
| V1 inheritance behavior write-up | `AI Contexts/RelationshipMetadata_V1.md` |
| Current relations-panel grouping (type → template → refs) | `app/api/relationships/groupByRelationships.js` |
| V2 relationship model (`from`/`to`/`type` + pointer/anchor) | `app/api/relationships.v2/model/Relationship.ts` |
| Fixed-shape multi-hop query tree | `app/api/relationships.v2/model/MatchQueryNode.ts`, `TraversalQueryNode.ts` |
| Mongo compiler for that tree ($lookup chain, cycle-guarded) | `app/api/relationships.v2/database/MongoGraphQueryCompiler.ts` |
| Hub datasource (no centre/role concept) | `app/api/relationships.v2/contracts/HubDataSource.ts`, `database/MongoHubsDataSource.ts` |
| Postgres relationships (V1 port, flat table) | `app/api/core/infrastructure/postgresql/relationships/PostgresRelationshipsV1DataSource.ts`, schema `022-create-connections-table.sql` |
| Relationship-types Postgres migration write-up (no AGE mention) | `AI Contexts/Relationship Types/relationship-types-postgres.md`, `relationship-types-v2-migration.md` |
| PRs | [#9776](https://github.com/huridocs/uwazi/pull/9776), [#9777](https://github.com/huridocs/uwazi/pull/9777), [#9760](https://github.com/huridocs/uwazi/pull/9760), [#9465](https://github.com/huridocs/uwazi/pull/9465) |

---

## 3. How comparable tools present multi-step relationships and paths

Researched: Neo4j Bloom, Linkurious, Aleph (OCCRP), Kumu, Obsidian graph view.

### Per-tool findings

**Neo4j Bloom**
- **Perspectives**: a saved, domain-specific view — which node/relationship types are visible and how they're styled — so one database supports several tailored views for different audiences. [Perspectives docs](https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/bloom-perspectives/)
- **Search phrases**: saved natural-language-style aliases for pre-built Cypher, so non-technical users type a phrase instead of writing a query. [Search phrases](https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/search-phrases-advanced/)
- **Expand-on-click**: click/right-click a node to reveal its immediate neighbors, capped by a configurable node-query limit; an "Advanced Expansion" dialog narrows by relationship type/direction/node type. [Scene interactions](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/)
- **Shortest Path**: select two nodes → right-click → "Shortest Path." Verified constraint (same page): "Bloom searches for shortest paths within 20 hops and shows the first shortest path found by the database" — **one path, not all parallel routes**, hard-capped at 20 hops.

**Linkurious**
- **Path finding**: a parameterized query template using `allShortestPaths`, with a "Maximum path length" (default 4, range 1–10) and a max-paths-returned control (default 5, up to 50) — it can surface **several** shortest paths at once, capped, not just one. [User manual](https://doc.linkurious.com/user-manual/latest/page.html)
- **Investigation workflow**: canned graph queries exposed as forms/buttons, so analysts run pre-built investigative queries without writing a query language — same shape as Bloom's search phrases. [Graph visualization tools](https://linkurious.com/blog/graph-visualization-tools/)
- Density-handling claims (grouping, multiple layouts) come from marketing/blog pages, not the manual itself, which is thin on this — flagged as directional, not confirmed feature detail.

**Aleph (OCCRP)**
- "Network diagrams" are **manually built** — a user adds entities and manually draws links; there is no automatic path-finding or multi-hop traversal feature. Diagram entities/links fold back into the investigation's searchable dataset. [Network diagrams](https://docs.aleph.occrp.org/users/investigations/network-diagrams/)
- Underlying model (Follow-The-Money ontology): typed entities and typed relationships (family, ownership, directorship, sanctions, payments) — structurally close to Uwazi's template + relationType model. [Mixed graphs](https://docs.aleph.occrp.org/developers/mixed-graphs/)
- No evidence found (in docs, not the source) of automated multi-hop or "similar entities" traversal — Aleph's relationship exploration leans on search plus manual diagramming. The `alephdata/aleph` source itself was not checked directly; this is a docs-only finding.

**Kumu**
- **Loops**: a first-class, named, savable primitive — a labeled cycle of 2+ connections ("if I follow the arrows, can I get trapped?"), shown directly on the map. This is the closest analogue found to the redesign's "named Pattern" idea — a path as a kept, labeled object, not a disposable query result. [Loops](https://docs.kumu.io/guides/what-are-loops)
- **Views**: saved sets of visual-decoration rules (color/size/filter) that re-skin the same underlying map for different audiences/questions. [Kumu overview](https://docs.kumu.io/overview/)

**Obsidian graph view**
- **Depth slider** on the local graph: each depth level reveals notes connected to the previous level's notes — an incremental, explorable expansion rather than one dense render. [Graph view help](https://obsidian.md/help/plugins/graph)
- Filters (search term, tag/attachment toggles), "existing files only," and color-coded groups (first matching group wins).
- **Verified limitation**: "when the graph view filter is activated, only connections between files that match the filter are shown, and there's no way to see any depth to filtered results" — filtering and depth don't compose (same help page).
- **Verified third-party criticism**: depth 1–2 is useful, "depth three is where it becomes a hairball again — there is no vault size where depth three is readable"; the graph shows only note-to-note links, missing anything that isn't itself a note. [Obsidian Graph View: How to Make It Actually Useful](https://typefire.app/blog/obsidian-graph-view)

### Patterns worth borrowing
1. **Named, saved multi-hop queries as first-class, reusable objects** — Bloom's Search Phrases/Perspectives, Linkurious's forms/buttons, Kumu's Loops. This is exactly the redesign's "Patterns" idea (§2.3: `ChainSegment[]` specs, named, driving Metadata + Library + this view from one definition) — all three real tools independently converge on "don't make the user re-type the traversal every time."
2. **A bounded, explicit result for parallel routes, not a silent single pick or an unbounded list** — Linkurious returns several shortest paths up to a cap (default 5, max 50); Bloom returns exactly one. The redesign's "fold parallel routes into one path" (§2.3, the 6-judge example) is a third, arguably better option than either — worth being deliberate that it's a genuine third design, not just picking one of these two.
3. **Surface the caps to the reader, don't just enforce them silently** — Bloom's 20-hop shortest-path cap and configurable expansion limit are stated in its own UI/docs. The redesign's `maxDepth`/`maxVisited` params (§4) should be visible in the result ("no path found within N hops"), not a silent failure.
4. **Depth as an incremental, user-driven step, not an all-at-once dense render** — Obsidian's depth slider matches the redesign's Explore/trail model (peek one hop, then explicitly step deeper) far better than rendering a full multi-hop graph at once.
5. **Perspectives/Views: re-skin the same data per audience or per corpus, not per dataset** — Bloom Perspectives and Kumu Views both separate "what's visible/how it's styled" from "what the data is." This directly supports the redesign's §1.2 concern (Sample vs. CEJIL need different controls) — the fix implied by these tools is corpus-aware *display rules*, not two different underlying models.

### Patterns worth avoiding
1. **Letting filtering and depth/traversal interact unpredictably** — Obsidian's filtered local graph shows only connections between already-matching files, with no way to explore deeper into the filtered set. The redesign's Paths lens (skip-type chips + depth) needs filters and traversal to compose by construction, not as an afterthought.
2. **Relying on raw node-link position as the primary signal at real scale** — the sourced Obsidian critique ("depth three is where it becomes a hairball again — there is no vault size where depth three is readable") directly supports the redesign's move away from an open-ended radial/force graph and toward table-like path results with merged cells (§2.3).
3. **Manual diagramming as the only way to see how two things connect** — Aleph's network diagrams require a human to add every entity/link by hand; there's no automatic "how do these connect" query. For a redesign explicitly adding computed Paths, this is the regression to avoid falling back to under time pressure.

**Confidence note (from the researching agent):** Linkurious's clustering/density claims came from blog/marketing pages rather than its user manual — treat as directional. Aleph's source (`alephdata/aleph` on GitHub) was not checked directly, only its docs site; if Aleph's actual traversal behavior matters later, that repo is the next place to look.

---

## Summary against the redesign's open questions (§6)

- **"Is the Uwazi 2.0 backend real, and when?"** — Postgres migration: real, active, merged days before this research (part 2). Graph-query engine (AGE or otherwise): **no evidence it exists or is planned**; the in-flight work moves the same flat hub/row model to Postgres tables, unchanged in shape. Anything path/traversal-shaped in the redesign is new work against a backend that currently has no graph query surface beyond the fixed-depth `MatchQueryNode` tree used internally for denormalization.
- **AGE's viability, if chosen**: variable-length + label filtering is real and documented; `shortestPath()`/`SHORTEST` is unconfirmed-to-broken; performance data is old, thin, and concerning at 5+ hops well under the 10M-edge scale §4 worries about. A hands-on spike against a real AGE instance, at CEJIL's actual scale (~17k edges) and then at a larger synthetic scale, is a prerequisite to relying on it — this doc cannot settle that.
- **Comparable-tools patterns** converge on: named/saved traversals, bounded multi-path results, visible caps, incremental depth, and corpus-aware display rules — all directly applicable to the redesign's Paths and Connections lenses, and none of them require a graph database to implement (Obsidian and Kumu, notably, don't use one).
