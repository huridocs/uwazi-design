# Research and OSINT tooling: gap analysis against the Nepal corpus

Read-only. Written 2026-10-05 against local playground `1b029c03`. Juan's direction: the tool needs more power
(filters, nested filters, tools for research and OSINT), and relationships are complex but not useful.

## 0. Basis and limits

- **Read in the prototype:** `utils/libraryFilter.ts`, `utils/libraryFacets.ts`, `components/library/LibraryFilters.tsx`,
  `components/library/LibraryMapView.tsx`, `atoms/filters.ts` (Relationships panel state), `data/nepal/*`
  (`adapt.ts`, `load.ts`, `profile.ts`, `types.ts`, `templates.json`), `docs/relationship-chain-filters.md`,
  `utils/chainTraversal.ts`.
- **Read in uwazi-ref:** `app/api/relationships.v2/model/{QueryNode,MatchQueryNode,TraversalQueryNode,RelationshipProperty}.ts`,
  `app/api/search/metadataMatchers.js`, `app/api/search/search.js` (the `newRelationship` branch).
- **Corpus counts** come from `dev/results/nepal-seed/data/{entities,references}.json`, which equal the playground's
  `public/nepal-data` (2,124 entities, 5,319 references, same ids). Counts that need the per-property `evidence` come
  from the research files only; that field is not in the app data (see 2.1).
- **"Clicks" and "answers today" are from reading the code, not from driving the app in a browser.** Where a count
  says "N clicks", it is the shortest path I can trace through the components; treat it as an estimate. No browser run
  was made.
- **Field survey (part 2):** WebSearch was exhausted, so this part rests on the product pages I could fetch
  (Timesketch, Neo4j Bloom, Linkurious, Hunchly) and on my knowledge of the other products. I mark which is which.
  The Aleph and Foundry points are from knowledge, not re-fetched; check them before quoting.

## 1. What the prototype can do today, in the terms the questions need

**Library filters (fixed set, ANDed).** `LibraryFilterState` (`libraryFilter.ts:51`) holds Type, document, publish
status, country, descriptor, date range, "inherited" property facets, search and match type. `FacetKey`
(`libraryFilter.ts:88`) lists the same nine. `matchesAll` (`libraryFilter.ts:327`) runs every predicate and ANDs them.
Inside one facet the values are ORed. An AND/OR switch exists for Country and Descriptor only
(`LibraryFilters.tsx:67-69`). There is no NOT, no "missing", no numeric range on a property, no date range on any date
except the record's one `date`, and no groups.

**Property facets from templates.** A property flagged `filter` in the template becomes a flat checkbox facet
(`libraryFacets.ts:37-38`, `withPropertyFacets`). For Nepal that gives, per template, select-type facets such as
event type, phase, claim type, verification status, casualty cause and outcome, media kind and rights
(`data/nepal/templates.json`). Relationship properties are not facets: there is no "Where", "Who" or "Published by"
filter.

**Relationship-chain filters exist but only for CEJIL.** `utils/chainTraversal.ts` and `docs/relationship-chain-filters.md`
implement path-coupled filters over a fixed chain of segments (a row matches only if one traversed path satisfies all
constraints). The state field is commented "CEJIL only; empty otherwise" (`libraryFilter.ts:65`), and the facet
registry is `data/cejil/chainFacets.ts`.

**Relationships panel (per entity).** Views: list, tree, graph, When (`atoms/filters.ts:1-15`). Filters: relation type
(`relTypeFiltersAtom`, `:70`), target entity type (`:73`), anchoring (`:94`), direction (`:98`), country, descriptor,
inherited property, text search. The When view's range is years only (`relWhenYearsAtom`, `:68`). The panel always
shows the neighbours of one entity.

**Nepal adapter drops reference metadata.** `data/nepal/profile.ts:82-95` turns each `NepalReference` into a
prototype `Reference` with only type, direction and the quote. `NepalReference` also carries `verification` (all
5,319), `date` ranges (146) and `file`/`page` (11) (`data/nepal/types.ts:63-77`). The panel therefore cannot show or
filter a link's verification status or an office's dates.

**Nepal facets are one hand-written definition.** `nepalFacetDefs` (`data/nepal/adapt.ts:88`) lists Verification;
other facets come from template flags.

**Map.** `LibraryMapView` plots entities that have a geolocation property of their own (`LibraryMapView.tsx:33-40,214`).
In Nepal that is 93 locations and 34 media items. Events have no geolocation property; their place is the
`occurred_at` relationship.

**Time.** The Library's date facet and timeline read one `date` per entity (`data/nepal/adapt.ts:184`), the event's
start, with a month or day precision flag. End dates, ranges and hours are not filterable.

**Search.** Library search has AND/OR/NOT and wildcards (`utils/queryTokens.ts`, `searchQuery.ts`), reads metadata
and the OCR text of the 23 bundled documents (`docs.json` loads with the corpus, `data/nepal/load.ts:36-39`), and
returns passages.

## 2. Part 1: twenty questions, as the researcher would ask them

Answer codes: **Yes** (answerable on one surface in a handful of steps), **Partial** (answerable by hand, or only a
slice), **No**. "Data" says whether the Nepal corpus could answer it if the tool could; figures are from the corpus.

| # | Question as asked | Today | How, and why it falls short | Data check |
|---|---|---|---|---|
| 1 | "Which offices did Sushila Karki hold, and when?" | Partial | Person record, Relationships tab, group "held office at": rows list the organisations, no dates (`profile.ts:82-95` drops `date`). About 3 clicks plus guessing. | 138 `held_office`; 99 dated, 64 with both ends; 69 of 112 persons have one. |
| 2 | "Who was Home Minister on 9 September 2025?" | No | Needs an as-of date and an office filter. Today: open the Ministry of Home Affairs, read incoming `held_office` rows with no dates. | Answerable for the 64 closed and 35 open-ended tenures; 39 undated would return "unknown". |
| 3 | "Which sources support claim X and which dispute it, and what do they say?" | Yes | Claim record, Relationships tab, groups `supports` and `disputes` (incoming from sources) with the quote anchors. About 3 clicks. Source independence and verification are not shown in the rows. | 418 `supports`, 247 `disputes`; 119 of 289 claims have both; 12 have neither. |
| 4 | "Which links about event E rest on a single source?" | Partial | Library Verification facet filters entities, not an event's links. The link-level status is dropped by the adapter, and per-property evidence is not in the app data. | 3,687 of 5,319 references are single-source; 3,944 explicit evidence entries exist only in the research files. |
| 5 | "List all disputed claims about the death toll." | Yes | Library, Type = Claim, facets Claim type = casualty figure and Verification = disputed. About 4 clicks. | 100 casualty-figure claims; 160 of 289 claims disputed. |
| 6 | "How did the reported death toll change over time, by whom?" | Partial | Same list as 5, read by eye. The figure is text inside the statement, not a property, so no sort, chart or comparison. | 210 claim statements contain digits; only 8 events have the numeric `reported_fatalities`. Needs a structured figure. |
| 7 | "What happened at Parliament between 12:00 on 8 Sept and 18:00 on 9 Sept?" | Partial | Location record, Relationships, incoming `occurred_at` events. Only events tied to that exact place, no hour window (When view is by year), no events at child places. | `occurred_at` on 136 of 180 events; hour precision on 15; day on 158; `located_in` 96 edges, so roll-up is possible. |
| 8 | "Show every event in Kathmandu district on 9 September on a map." | No | Library: Type = Event plus the date facet works; there is no place facet, and the map plots no events. | 129 of 180 events sit at a place with coordinates; 158 are day-precision. |
| 9 | "What connects Oli to Lekhak?" | Partial | No path query. Open one entity, read its Relationships, open the next, repeat; the graph view shows one entity's neighbours. About 6 clicks for a 2-hop path and no way to see alternatives. | Non-source graph: 1,189 nodes, 2,804 edges, 1,180 in one component. Oli to Lekhak is 2 hops; Sudan Gurung to Oli, 2. |
| 10 | "Who or what was involved in both event A and event B?" | No | Needs set intersection across two entities' neighbours. Today: two panels, compare by eye. | `involved` 398 and `organised_by` 11 edges; events average several actors. |
| 11 | "Which footage is misattributed, and what did it claim?" | Yes | Library, Type = Media, Verification = Misattributed (2 clicks); media record, Relationships, `documents` shows the claim (about 3 more). | 17 misattributed, all 17 linked to a claim, with fact-check anchors. |
| 12 | "Where and when was this video really filmed, and how do we know?" | Yes | The media record shows coordinates, `location_method`, `verified_by`; the map plots geolocated media. | 34 media with coordinates; 24 have a `geolocated_by` source. |
| 13 | "What official actions followed event E, in order, and who issued them?" | Partial | Event record, Relationships, `in_response_to` actions (one hop) with the issuer one click further. Second-order chains (action, then the event it led to) need manual hopping. | `in_response_to` 145, `led_to` 86 edges, longest `led_to` chain 15. |
| 14 | "Casualties by cause and verification." | Yes | Library, Type = Casualty, facets Cause, Outcome, Verification show counts. No cross-tab. | Cause is "not reported" for 45 of 73; gender 68 of 73 unreported; age on 20. The data is thin, not the tool. |
| 15 | "Who was treated at hospital H, or died at place P, per day?" | Partial | Hospital or place record, Relationships, incoming `treated_at` or `incident_at`. One place at a time, no day grouping, no combination with cause. | `treated_at` 30, `incident_at` 39 of 73; `occurred` date on 37. |
| 16 | "Which claims did person or organisation X make, and how did each turn out?" | Partial | Person record, Relationships, incoming `claimed_by` group: titles only. Each claim's status needs opening. | 243 of 289 claims have a claimant. |
| 17 | "How many independent publishers covered event E, by publisher type and language?" | No | Event record, Relationships, incoming `reports_on` from sources (197 links on the 8 Sept shooting). The panel filters by target entity type only, not by a source's publisher type, language or wire origin. | Event 8 Sept shooting has degree 197; `publisher_type` and `language` set on all sources; `syndicated_from` on 89 of 922. |
| 18 | "Disputed claims about arson events in Kathmandu in September 2025 that a fact-checker source supports." | No | A nested, cross-entity condition: claim, `concerns`, event (type, place, date), and source (publisher type) via `supports`. The Library cannot express a clause on a linked entity. | `concerns` 495, fact-check sources 43, arson events 39; all conditions are on existing links. |
| 19 | "Where in the bundled government documents does this phrase appear, and which action does the page record?" | Partial | Library search reads the OCR text and returns passages. Nepali OCR errors and no Nepali stemming mean exact-phrase only; the link from a passage to the action it records is by the document's Source. | 23 documents, 106 pages, 11 page-anchored references; text unreviewed OCR. |
| 20 | "Save this investigation (filters, entities, notes) and export it with citations." | No | Filter state is session state; there is a CSV export of the list (`utils/exportCsv.ts`) without source URLs or quotes, and no saved view, notes or case. | Every record has a URL, publisher and date; every link a status; 1,999 carry a quote. |

Tally: **Yes 5** (3, 5, 11, 12, 14), **Partial 9** (1, 4, 6, 7, 9, 13, 15, 16, 19), **No 6** (2, 8, 10, 17, 18, 20).
Question 14 is a Yes for the tool and thin on data (cause is not reported for most casualties).

Why the 15 non-Yes questions fall short (a question can have more than one reason):
- link metadata is lost in the adapter or never shipped (1, 2, 4, 16, 17);
- no filter or clause on a linked entity, so place, actor, claimant or publisher cannot be used as a filter
  (7, 8, 15, 16, 17, 18);
- events have no place of their own for the map, and no roll-up from a building to its district (7, 8);
- no path or set query across entities (9, 10);
- a fact held only as text, so it cannot be compared (6);
- time filtered by one date per entity and by day or year at best (7, 8);
- no saved or exportable investigation (20);
- Nepali OCR is unreviewed, so phrase search is exact-match only (19).

### 2.1 Findings from the data check

- **The app data carries less provenance than the research data.** `public/nepal-data/entities.json` has keys
  `sharedId, template, title, date, datePrecision, metadata`; the per-property `evidence[]` (3,944 explicit entries
  with sources and status) is not shipped. Per-link `verification` and `date` are shipped and then dropped by
  `data/nepal/profile.ts:82-95`.
- **Events have a place and no coordinates of their own.** 129 of 180 sit at a place with coordinates. The map shows 0
  of them.
- **The corpus is connected enough for path queries.** 1,180 of 1,189 non-source nodes are in one component; the
  median entity has 3 neighbours, the top ones 100 to 200 (the 8 Sept shooting event 197, Oli 106).
- **Time is mostly day precision.** 158 of 180 events are day, 15 hour, 7 month. Hour-level windows work for 15.
- **Facts that should be values are text.** Claims about numbers (210 with digits) cannot be compared.

## 3. Part 2: what the field uses

Each entry says what it does for the questions above and what is worth borrowing. "Fetched" means I read the
product page this session; "knowledge" means I did not.

**Uwazi itself (read in uwazi-ref).**
- v1 filters (`api/search/metadataMatchers.js`): per property, a text term, a `range` for numeric and date values, a
  multiselect with `any`, `missing` and an `and` flag (all values), and daterange matching on either end. Filters on
  different properties are ANDed. There is no NOT and no OR across properties. The "nested" property type has its own
  path.
- Relationships v2: a relationship property of type `newRelationship` stores a `query`, a chain of traversals rooted
  in a template. A traversal is `{direction: in | out, types: [relationship type ids]}` and each step ends in a
  match `{templates: [...] | sharedId}` (`MatchQueryNode.ts`, `TraversalQueryNode.ts`, `RelationshipProperty.ts`). The
  property can name a `denormalizedProperty` of the target; the traversal result is then indexed on the entity
  (`search.js` `newRelationship` branch, `RelationshipPropertyMappingFactory.ts` maps it to the target property's
  type). Inverse queries must be chains (`NonChainQueryError`), which is how an entity is re-indexed when a link
  changes.
- What this means: Uwazi does not offer ad-hoc graph queries. A relationship query is declared once in the template,
  indexed, and then behaves like any filterable, sortable property. That is the pattern to copy: relationships become
  filters and columns, not only a panel.

**OCCRP Aleph (knowledge).** Lucene-style query string search over entities and documents with facets and counts
(schema, country, date, language, publisher-like fields); a cross-reference job that matches entities across
datasets; investigations as workspaces; entity sets (lists, network diagrams, timelines) a user builds by hand.
Borrow: facets with counts on linked properties, cross-reference, and entity sets as the saved unit.

**Maltego (knowledge).** Pivoting by transform: select entities, run a typed transform ("from person to organisation"),
and the results join the graph; entity types carry properties; link labels; investigations saved as graphs and
exported as reports. Borrow: the pivot as one action on a selection ("show their organisations") with typed
results, instead of opening records one at a time.

**Linkurious Enterprise (fetched).** The manual lists search for nodes and edges with an advanced search, a query
builder for pattern queries, a filter panel with a timeline, expand-from-node, alerts, a geographic map view, saved
visualizations and AI-assisted query creation. I could not confirm path finding from the page I fetched. Borrow: the
query builder as a form (node, edge, node), and the timeline inside the filter panel.

**Neo4j Bloom (fetched).** The search bar takes search phrases (saved, parameterised graph queries), graph patterns
written in a near-natural-language grammar built from node labels, relationship types and property keys, full-text
search, and actions. Borrow: pattern search typed in words ("claims disputed by fact-checkers about arson") that
compiles to a structured query the user can then edit.

**Bellingcat tooling (knowledge).** Small single-purpose tools (an auto-archiver that stores a page with a hash, sun and
shadow calculators for chronolocation, map-query tools, imagery comparison) and written methods. The pattern is a
documented method per verification, not a database feature. Borrow: the method field (already `location_method`) as a
first-class, filterable record, and archived copies with hashes for cited pages.

**Hunchly (fetched).** Captures pages with URL, timestamp and hash, organises them with tags and notes, searches across
captures, and assembles a report with an audit trail. Borrow: provenance as a view ("why we believe this": source,
retrieval time, hash, who) and a report export.

**Timesketch (fetched).** Explore with a query and filters over timelines; saved views; several timelines overlaid in
one sketch; stars and labels on events; stories (annotated outlines built from selected events); comments; a search
history kept as a tree with branching; context queries ("find events around this one"); analyzers. Borrow: saved
views, the story as the unit of a write-up, the search history tree, and the context query (events within a window
of this one).

**Palantir Foundry object explorer, Gotham-style tools (knowledge).** Typed objects with property filters that take
operators; "search around" to pivot from a set of objects along a link type to the linked set; set operations
(union, intersect, subtract) on object sets; saved explorations; a map with a time slider; time-series views.
Borrow: object sets with set algebra, and search-around as the one primitive behind pivot, filter-by-linked and
"what do these have in common".

**Patterns that recur, and where each shows up in the questions:**

| Pattern | Seen in | Questions it answers here |
|---|---|---|
| Nested boolean filter builder with operators | Foundry, Linkurious query builder, Bloom patterns, Uwazi `any`/`missing`/`and` | 4, 5, 18 |
| Filter by a linked entity's property (derived property) | Uwazi v2 relationship property + denormalised value | 7, 8, 15, 16, 17, 18 |
| Pivot / search around | Maltego, Foundry, Linkurious expand | 10, 13, 15, 16 |
| Path finding between two entities | Linkurious, Bloom, graph databases | 9, 10 |
| Timeline linked to map and filters | Linkurious, Timesketch, Foundry map | 7, 8 |
| Claim and evidence matrix | not a stock feature of the tools above; closest are Timesketch stories and Aleph diagrams | 3, 6, 17 |
| Saved views, stories, history | Timesketch, Aleph entity sets, Hunchly cases | 20 |
| Provenance and audit trail | Hunchly, Bellingcat auto-archiving | 4, 20 |

## 4. Part 3: a ranked, minimal feature set

Ranked by questions answered per unit of work, in this prototype's terms. Each has a data check against the Nepal corpus
and uses an existing mechanism where one exists. Size: S under a day, M a few days, L a week or more.

### 1. Carry link metadata into the Relationships panel (S)

Pass `verification`, `date` (from, to) and the page-anchor `file`/`page` through `nepalReferencesFor`
(`data/nepal/profile.ts:82-95`) onto the prototype `Reference`; show a status chip and the tenure on each row;
add a Verification facet and an "As of" date to the panel (`atoms/filters.ts`, a new scoped atom like
`relAnchoringFiltersAtom`). Ship the entity-level `evidence[]` and show it as a "Why we believe this" popover on a
field (the Hunchly-style provenance view).
- **Questions:** 1, 2 (with an as-of filter), 4, 16, and better 3, 17.
- **Data check:** all 5,319 links have a status; 146 have a date range; `evidence[]` exists for every filled property
  (3,944 explicit plus 255 inferred) and only needs to be added to the build output.
- **Risk:** the Reference type is shared with CEJIL and the mock; add the fields as optional.

### 2. Relationship-derived facets, declared on the template (M)

The Uwazi v2 pattern: a declared chain becomes an indexed property. Extend the existing chain machinery
(`utils/chainTraversal.ts`, `ActiveChain`, currently CEJIL only, `libraryFilter.ts:65`) to the Nepal graph and
declare about eight chains: Event: "Where" (`occurred_at`, then `located_in` up to province), "Who" (`involved`,
`organised_by`); Claim: "Claimed by", "Supported by publisher type" (`supports` from sources), "Concerns event type";
Casualty: "Treated at", "Event"; Media: "Depicts". Precompute the place ancestors at load, so "Kathmandu district"
includes events at its buildings; chain segments stay fixed length. Facets use the same path-coupled rule, so two
conditions on one chain hold for the same path.
- **Questions:** 7 and 8 (place half), 15, 16, 17, 18, and the nested part of 4.
- **Data check:** `occurred_at` on 136 of 180 events; `located_in` has 96 edges for 109 locations (depth up to 3);
  `claimed_by` on 243 of 289 claims; `supports` from 43 fact-check sources; `treated_at` 30, `incident_at` 39.
- **Risk:** the chain facet UI built for CEJIL assumes its own registry; the work is the registry and labels, not
  the engine.

### 3. Events on the map and on the time brush (S to M)

Give events a derived geolocation from their `occurred_at` place (adapter, `data/nepal/adapt.ts`), so the Library map
plots them, and let the map, the list and the time brush share one filter state (the brush already exists for the
timeline). Add a date-range filter that uses the event's `when` start and end, and hour precision where present.
- **Questions:** 7, 8, and a start for "events around this one" (a Timesketch-style context query).
- **Data check:** 129 of 180 events resolve to coordinates; 158 are day precision, so a brush at day granularity is
  honest; 15 events have hours.
- **Risk:** several events share one point (Parliament, Singha Durbar): the cluster list already handles shared
  points (`LibraryMapView.tsx:33-40`).

### 4. Connect A to B: path finding (M)

A "Connect to…" picker in the Relationships panel header. It runs a breadth-first search over the corpus graph (5,319
edges, fast in memory), ignores source entities as intermediate hops by default (they connect everything), and lists the
shortest paths (up to 3 to 4 hops) as rows `A, relation, X, relation, B`, each edge carrying its status and quote. A
second mode lists common neighbours of two entities (the 2-hop case, question 10). The graph view highlights the chosen
path.
- **Questions:** 9, 10, and part of 13 (a path from an event to a later one).
- **Data check:** 1,180 of 1,189 non-source nodes in one component; Oli to Lekhak and Sudan Gurung to Oli are 2
  hops; Rabi Lamichhane to the Parliament fire is 3. One pair I tried (Balen Shah to the Nepal Army) has no path
  without source hops, which the tool should say.
- **Risk:** hub nodes make paths trivial ("both in Kathmandu"); cap through-degree or let the user exclude node types.

### 5. Filter operators and groups (M)

Replace "checkbox values ORed, facets ANDed" with per-facet modes any / all / none / missing (Uwazi's own `any`,
`missing` and `and` already cover three), a numeric range for numeric properties (age, reported fatalities) and a date
range for every date property (asserted on, recorded, published). Then allow a group: two facets joined by OR, or a
facet negated. Keep the sidebar; add a "Match" row to each facet and a "+ group" for nested conditions.
- **Questions:** 4, 5, 18 (with 2), 6 (range on a value once it exists).
- **Data check:** the template flags already mark `age`, `reported_fatalities`, `asserted_on`, `recorded` and
  `published`; "missing" is meaningful (45 casualties with no cause, 68 with no gender).
- **Risk:** the fixed `PREDICATES` table (`libraryFilter.ts:327`) becomes an expression tree; counts per facet
  ("except me") already work for one dimension and need care for groups.

### 6. Claim and evidence matrix, with structured figures (M)

For one claim, or a filtered set of claims, a table of sources against stance (supports, disputes, reports), showing
publisher, publisher type, date, independence (wire origin from `syndicated_from`), verification and the anchor quote.
For casualty-figure claims, add structured `figure`, `unit` and `as_of` values (a one-time extraction from the
statements, reviewed), so figures can be sorted and charted over time and the contradiction between 19, 72 and 77 is a
column, not a read.
- **Questions:** 3, 6, 17, and the claim side of 16.
- **Data check:** 289 claims, 119 with both support and dispute, 100 casualty-figure claims; 210 statements contain
  digits but not all are figures; extraction needs a manual pass. `syndicated_from` covers 89 of 922 sources.
- **Risk:** the extraction is the cost; the matrix itself is a view over the existing links.

### 7. Saved views and a case with citations (M)

Name and save the Library's filter and view state, a set of pinned entities and free notes; export the set as CSV and
as a citation list (source URL, publisher, date, status, quote, page-anchor). A search history list (the Timesketch
tree, flat at first). Session or local storage only; no accounts.
- **Questions:** 20, and it makes 5 and 18 repeatable.
- **Data check:** every source has URL, publisher and date or access date; 1,999 links carry a quote; 11 carry a page.
- **Risk:** state serialisation of the atoms (Library, scoped relationship state) has to be listed once.

### What this does not need

- A graph database or a query language. The whole corpus is 2,124 entities and 5,319 links, and the Library already
  filters it in memory per render (`CLAUDE.md` performance traps).
- Free-form graph editing. The questions are retrieval and comparison; the evidence is already modelled.

### Coverage by feature (questions answered)

| Feature | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 13 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Link metadata and evidence | x | x | x | x | | | | | | | | | x | x | | | |
| 2 Derived relationship facets | | | | x | | | x | x | | | | x | x | x | x | | |
| 3 Events on map and brush | | | | | | | x | x | | | | | | | | | |
| 4 Path finding | | | | | | | | | x | x | x | | | | | | |
| 5 Operators and groups | | | | x | x | x | | | | | | | | | x | | |
| 6 Claim and evidence matrix | | | x | | | x | | | | | | | x | x | | | |
| 7 Saved views and citations | | | | | x | | | | | | | | | | x | | x |

Questions 12 and 14 work today; 11 works today; 19 needs better OCR or reviewed text rather than a feature.
Features 1, 2 and 3 together reach 1, 2, 4, 7, 8, 15, 16, 17 and 18: five of the nine Partial questions (1, 4, 7, 15, 16) and four of the six No questions (2, 8, 17, 18) are touched by at least one of them.

## 5. Recommended order

1. Feature 1: link metadata and evidence into the panel (days).
2. Feature 3: derived event geolocation and shared time/map/list state.
3. Feature 2: relationship-derived facets (Nepal chains).
4. Feature 4: path finding and common neighbours.
5. Feature 5: operators and groups.
Then 6 and 7.

The first three make the Relationships panel's contents usable as filters, which is the point of Juan's remark: the
links already carry status, time and place; today the panel lists them and nothing can be asked of them.
