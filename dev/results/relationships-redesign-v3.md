# Relationships surface: redesign, round 3

Date: 2026-09-28. Follows `relationships-redesign-v2.md`. This round covers editing, the Map, filters per lens, a clickable "In the document" lens, the backend reality from `relationships-research.md`, and an implementation plan. Juan's prototype feedback has not arrived yet; section 8 is kept for it.

No app code was changed. Everything below was checked against CEJIL (`public/cejil-data`) and Sample (`data/references.ts`) on `playground` 6a810482.

Files in `relationships-redesign/v3/`:
- 14 screens × light/dark PNG (listed where they are discussed).
- `prototype/`: the v2 prototype extended with Sample data, editing, Map and Filters. Open `prototype/index.html` from disk. `?c=sample` switches to the Sample collection, as does the collection crumb in the nav.
- `mockup-src/`: the screenshot and smoke-test scripts.

**Sample numbers are corrected.** 33 of the 456 Sample references point at entities that do not exist (`e-missing-*`, seeded on purpose to test "Unknown entity"). v2 counted them. Without them, La Tablada has 52 connected entities (v2 said 61) and 402 passages (435), of which 162 are inside its 39 pages and 240 point at pages 40–120 (174 / 261).

---

## 1. Editing in the lens model

### 1.1 Rules

- **Only the owner of a field edits it.** A row in one of the entity's own field groups can be added or removed here. A "Listed as … in" row belongs to another entity's field, so in Edit mode it shows **"Edit in <template> ›"**. That button follows the trail to the owning entity with Edit mode kept on, so the reader sees whose field they are changing.
- **Adding to a field adds a member to that field's hub.** In Uwazi V1, a hub is a set of `connections` rows sharing a `hub` id (`relationships-research.md` §2). "+ Add to Firmantes" on a Sentencia writes one more row into the Sentencia's existing Firmantes hub. It does not create a new pair.
  - The picker is limited to the field's target template (`content`); here only "Juez y/o Comisionado".
  - The Modal says what will happen: "Adds a member to the existing Firmantes group (6 now)".
  - When the entity has no hub for that field yet, the first add creates one.
- **"Listed together" rows are not edited here.** They have no centre that owns them. In Edit mode they read "fix in Settings", which lists them as data-quality items (v2 §1.2).
- **Delete stays behind hover.** In Edit mode, Remove appears on row hover or focus, as today. It is the only destructive control, and it is seal-coloured.
- **Paths is read-only.** Its Edit button is disabled, with the reason in the tooltip.
- **Every destructive action goes through `ConfirmDialog`** (`components/shared/ConfirmDialog.tsx`, `variant="danger"`). The message states the consequence in the reader's terms:
  - **Removing a hub member:** "Remove Rafael Nieto Navia from the Firmantes of Velásquez Rodríguez. Sentencia de 21 de julio de 1989? The other 5 stay in the group." (`conn-remove-*`)
  - **Deleting a pair:** "Delete the relationship between X and Y? It has 3 passages; they are deleted with it."
  - **Deleting a passage:** "The connection to Juan Carlos Abella stays: it has 2 other passages." Or: "It is the only passage for …, so that connection goes too." (`doc-delete-*`)
- **Undo.** After any add or delete, a toast carries Undo (`conn-undo-*`). In the app this is the Beacon flash, which already drains `toastsAtom`, so no new toast component is needed.

### 1.2 Edit mode per lens

| Lens | Entering Edit mode shows | Add | Remove |
|---|---|---|---|
| Connections | A dashed edit bar at the top with "+ Add relationship", and "+ Add to <field>" on each own-field group header (`conn-edit-*`) | Per field, with the picker limited to the field's template and the hub-member note (`conn-add-member-*`). "+ Add relationship" is for a relation type that is not a field. | Hover Remove on own-field and unlabelled rows. "Edit in …" on "Listed in" rows. |
| In the document | An edit bar: "Select text in the document to connect a passage." | Always available, even outside Edit mode, the way `FloatingMenu`'s "Create relationship" works today: select text, then "Connect passage…" (`doc-select-*`), then a Modal with the quote, relation type and entity (`doc-connect-*`) | Hover Delete on each passage |
| Paths | Disabled: "Paths are read-only" | — | — |

The Modal is the shared `Modal` with its 3rem header and footer ladder: Cancel, then the ink commit, or the seal commit for a destructive action. It traps focus, and Escape closes it.

### 1.3 What CEJIL editing means

CEJIL is read-only in the app (`writeReferencesFor` returns the corpus unchanged). The prototype lets you edit it in the tab, with a footer note saying so, because CEJIL is where the hubs are and hub-member add has to be shown on real hubs. The app keeps CEJIL read-only.

---

## 2. Map, redesigned for the lens model

The Map is a rendering of Connections or of a Paths result. Toggling List/Map never changes the unit or the numbers.

**Connections Map** (`map-trail-*`, `map-sample-*`)
- **One node per entity.** The same entity never appears twice. Node size grows with the log of the entity's degree.
- **Sectors follow the groups** (the fields, "Listed as … in", "Without a relation type"), each labelled with a pill.
- **Names are always on screen** for the 16 most connected entities, and for every entity in a group of six or fewer. Names sit in two columns outside the rings, spread so they never overlap, each tied to its dot by a leader line. That fixes the v1 problem of anonymous dots, and the overlapping labels in my own first attempt this round.
- **The trail is drawn.** The steps that led here sit on a line entering from the start side. Each earlier step is a button that goes back to it, and the sectors leave that side free.
- **Clicking a dot opens the overlay**, as a pill does. Dots are focusable, with an accessible name and a carbon focus ring.
- **Size limit.** A group draws at most 36 nodes, then "+N more". Above 500 connected entities there is no Map; a per-template bar summary replaces it (`map-court-*`, Corte IDH with 2,739).

**Paths Map** (`map-paths-*`)
- Columns are the steps; each column holds the entities of that step (up to 7, then "+N").
- Lines are drawn only between entities that are actually linked. That shows which judge goes with which Sentencia, which the folded "any of" list cannot.
- The field label for each step sits above its gap. Clicking a node in an "any of" column pins the route through it.

---

## 3. Filters per lens

| Facet | Connections | In the document | Paths |
|---|---|---|---|
| Entity type (template of the connected entity) | yes | yes | — |
| Kind of connection (own fields / listed in / listed together / without a relation type) | yes | — | — |
| Relation type | only when grouped by relation type (redundant with field groups otherwise) | yes | — |
| Country, descriptors, inherited properties (today's facets) | yes, on the connected entity | yes, on the connected entity | — |
| Page range | — | the page strip in the body, not the drawer | — |
| Direction (Phase 1) | retired: field ownership says who points at whom | — | — |
| Anchoring (Phase 1) | retired: the lens split answers it | — | — |
| Search box | titles | passage text and titles | — |
| Skip chips | — | — | yes |

**Rules**
- **Facets filter what is shown; Skip chips change what a path may pass through.** Skip never applies to From or To. Facets never change traversal. The two never share state.
- **Connections facets belong to a trail step.** Stepping to the next entity starts unfiltered; Back returns to the previous step with its filters. This keeps filtering and depth predictable, the failure the research note found in Obsidian's filtered graph (`filters-connections-*`, where the panel says so).
- **In the document facets combine with the page range** (`filters-document-*`).
- **Active facets show as chips** in the search box, and the Filters button carries the active count, as `FiltersButton` does today. That count is filter state, not a total for the surface, so the no-count-in-toolbar rule still holds.
- **Filters and the overlay share the right-hand region.** Opening one closes the other, as today.

---

## 4. In the document, clickable on Sample

`?c=sample` opens La Tablada, which lands on In the document because it has passages (v2 §1.1; the footer says why).

- **Page strip.** One bar per page, 1–39. Click a page, shift-click to extend, or drag across bars. The selected range becomes a chip ("p.3–p.5 · 28 passages ×"), and the document jumps to the first page (`doc-lens-*`).
- **Passages outside the document.** "240 passages point at pages 40–120, which this 39-page rendition does not have", with "List them". Those passages are shown with a disabled page tag, because there is no page to go to.
- **Passages** are grouped by page, 5 per page, then "Show N more on page 3".
  - The pill opens the overlay, which says "Directly, 1 step · N passages in Case 11.137".
  - The `p.N` tag goes to the page, highlights the passage and marks the row `bg-parchment`.
  - Clicking a highlight in the document does the same from the other side.
- **Connect.** Select text in the document to connect a new passage (section 1.2).

---

## 5. Backend: what exists and what the UI needs

### 5.1 What the research established

- Relationships are stored as the V1 `connections` table, now also in Postgres (PR #9776): `connections(_id, tenant_id, entity, hub, template, file, reference, range, …)`. It is indexed on `(tenant_id, entity)` and `(tenant_id, hub)`.
- A hub is the set of rows sharing `hub`. There is no centre or role column.
- There is no graph engine and none is planned. Apache AGE's shortest path is unconfirmed, and its only published numbers degrade sharply past 4 hops.
- `relationships.v2` has a fixed-shape traversal tree (`MatchQueryNode`), used internally for denormalisation. It is the closest existing piece to "patterns".
- Inheritance is single-hop and denormalised at write time.

**What follows for the design.**
- **Hub centres:** derived server-side and cached.
- **Paths:** an app-level breadth-first search over `connections` rows, with visible caps.
- **Patterns:** compiled with the existing `MatchQueryNode` machinery.
- **Multi-hop derived fields** (the prototype's `inheritPath`) are new backend work. They are not a port of anything that exists.

### 5.2 Hub centres (server-side)

A table `hub_centres(tenant_id, hub, centre_entity, relation_type, property, member_count)`, refreshed by the async job pipeline that already denormalises relationships (PR #9760) whenever a hub's rows change. The rules are the same as v2 §1.2:
1. The member whose template owns a relationship property with the hub's relation type, when exactly one does.
2. Otherwise, the row stored with `template = null`, if exactly one. **Unverified:** in V1 the entity that created a hub is, I believe, stored with a null template. This would be the export's `from` that rule 2 relies on, and needs checking against real rows.
3. Otherwise no centre (`centre_entity = null`). The UI shows these as "Listed together with".

A second table, `entity_degree(tenant_id, entity, connected_count)`, feeds the "N connections" on every row and the tab count without a count query per row.

### 5.3 API shapes

All endpoints are tenant- and permission-scoped. Every step of every query must drop entities the user cannot read; a path must never reveal a restricted entity. Titles come back in the requested language.

**Neighbours, grouped** (Connections lens, overlay, peek)

```http
GET /api/entities/i0qbrq3n93utmx6r/connections?language=es&perGroup=5
```
```json
{
  "entity": { "sharedId": "i0qbrq3n93utmx6r", "title": "Velásquez Rodríguez. Sentencia de 21 de julio de 1989", "template": "58b2f3a35d59f31e1345b4ac" },
  "connectedCount": 9,
  "groups": [
    { "key": "field:firmantes", "kind": "field", "label": "Firmantes", "property": "firmantes",
      "relationType": "5ab920b3163b080aaa44310f", "content": "58b2f3a35d59f31e1345b4b6",
      "hub": "5ab92161163b080aaa45c52e", "total": 6,
      "rows": [ { "entity": { "sharedId": "yf6pycvdkj4i", "title": "Rafael Nieto Navia", "template": "58b2f3a35d59f31e1345b4b6" },
                  "connectedCount": 19, "connectionIds": ["…"], "passages": 0 } ],
      "next": "eyJvZmZzZXQiOjV9" },
    { "key": "listed:documentos_de_la_corteidh", "kind": "listed", "label": "Documentos de la CorteIDH", "total": 1,
      "rows": [ { "entity": { "sharedId": "lwm4n1kchypq4cxr", "title": "Velásquez Rodríguez", "template": "58b2f3a35d59f31e1345b48a" },
                  "hub": "…", "otherMembers": 3 } ] },
    { "key": "none", "kind": "none", "label": null, "total": 1, "rows": [ "…" ] }
  ],
  "templateSummary": null
}
```
- `templateSummary` is filled for groups over 200 rows, which then come back without rows.
- `GET …/connections/groups/{key}?cursor=…&limit=25` pages one group.
- Facets are query parameters: `template=`, `kind=`.

**Passages** (In the document lens)

```http
GET /api/entities/e3/passages?language=en&pages=3-5&template=person
```
```json
{
  "file": { "_id": "…", "totalPages": 39 },
  "histogram": [ { "page": 1, "count": 7 }, { "page": 2, "count": 3 }, { "page": 3, "count": 11 } ],
  "outsideRendition": { "count": 240, "from": 40, "to": 120 },
  "passages": [
    { "connectionId": "…", "hub": "…", "page": 3,
      "text": "Juan Carlos Abella and other persons were detained on January 23, 1989, …",
      "rects": [ { "top": 0.18, "left": 0.08, "width": 0.84, "height": 0.04, "page": 3 } ],
      "other": { "sharedId": "e1", "title": "Juan Carlos Abella", "template": "person" },
      "relationType": "mentions" }
  ]
}
```
The histogram is always for the whole file, so the strip does not change while a range is selected.

**Paths**

```http
POST /api/paths
```
```json
{ "from": "lwm4n1kchypq4cxr", "to": "tw59015lhlpzxgvi",
  "skip": ["5ab920b2163b080aaa4430fa", "5ab920b0163b080aaa4430ec", "5ab920b2163b080aaa4430fc", "untyped"],
  "maxDepth": 6, "pin": null, "language": "es" }
```
```json
{
  "status": "found",
  "steps": 6,
  "routes": 146,
  "layers": [ [ { "sharedId": "lwm4n1kchypq4cxr", "title": "Velásquez Rodríguez", "template": "…" } ],
              [ "… 3 Sentencias …" ], [ "… 3 judges …" ], [ "… 22 Sentencias …" ], [ "… 3 …" ], [ "… 2 …" ],
              [ { "sharedId": "tw59015lhlpzxgvi", "title": "Masacre de Mapiripán", "template": "…" } ] ],
  "gaps": [ { "labels": [ { "direction": "forward", "property": "documentos_de_la_corteidh", "relationType": "58b2f3a35d59f31e1345b53f" } ],
              "pairs": [ ["lwm4n1kchypq4cxr", "i0qbrq3n93utmx6r"], "…" ] } ],
  "limits": { "maxDepth": 6, "maxVisited": 20000, "visited": 3187, "timeMs": 41 },
  "throughSkipped": null
}
```
- `status` is one of `found`, `none` (`throughSkipped` then carries the result without skips, capped at 8 steps) or `truncated` (a cap stopped the search; the UI says "No path found within the limits" and names the cap).
- `routes` is counted, not listed.
- `pairs` feed the Map's lines.

The server algorithm:
- Bidirectional breadth-first search over hub centres. Per level, one query fetches the next frontier:
  ```sql
  SELECT c.entity, h.centre_entity, h.relation_type, c.hub
  FROM hub_centres h
  JOIN connections c ON c.tenant_id = h.tenant_id AND c.hub = h.hub
  WHERE h.tenant_id = $1
    AND (c.entity = ANY($2) OR h.centre_entity = ANY($2))
    AND h.relation_type <> ALL($3)
  ```
  Both existing indexes are used. Members connect to the centre, and never to each other.
- **Caps:** `maxDepth` ≤ 8, `maxVisited` ≤ 20,000 entities, 2 s wall time. Every cap that stopped the search is reported back.
- **Parallel routes** fold into layers the way the prototype does: the nodes whose distances from both ends add up to the path length, plus path counts carried forward during the search.

**Patterns**

```http
GET  /api/templates/58b2f3a35d59f31e1345b48a/patterns
POST /api/patterns/run
```
```json
{ "pattern": "causa-sentencia-juez-pais", "root": "lwm4n1kchypq4cxr", "limit": 200, "language": "es" }
```
```json
{ "columns": ["Sentencia de la CorteIDH", "Juez y/o Comisionado", "País"],
  "rows": [ [ { "sharedId": "i0qbrq3n93utmx6r", "title": "…" }, { "sharedId": "yf6pycvdkj4i", "title": "Rafael Nieto Navia" }, { "sharedId": "o6z7bn0y03aw0zfr", "title": "Colombia" } ] ],
  "truncated": false }
```
A pattern is a `MatchQueryNode` tree, which the Mongo compiler already runs. The Postgres side needs its own compiler, one join per step. The UI merges cells when it renders.

**Edits** (existing V1 endpoint)

```http
POST /api/relationships/bulk
```
```json
{ "save":   [ { "entity": "vy4zxk3…", "hub": "5ab92161163b080aaa45c52e", "template": "5ab920b3163b080aaa44310f" } ],
  "delete": [ { "_id": "…" } ] }
```
- **Adding a hub member** is one saved row with the existing `hub`.
- **A new pair** is two rows with a new hub id.
- **A passage** is a row with `reference: { text, selectionRectangles }` and `file`.
- `hub_centres` and `entity_degree` refresh through the job pipeline. The UI updates optimistically and reconciles.

**Settings**
- `relationtypes` gets `skipInPaths: boolean`, pre-filled from the 5% heuristic (v2 §1.3) when Paths is first enabled.
- `GET /api/relationships/quality` lists hubs without a centre and edges without a relation type, for Settings.

---

## 6. Implementation plan (this repo)

The tickets below implement the model in the prototype app (`app/src`). Backend tickets for `huridocs/uwazi` follow in 6.2; this repo mocks their responses from the local data.

**Every ticket's acceptance includes:**
- `npx tsc --noEmit` and `npm run build` are green.
- The Storybook a11y addon reports no violations on the new stories.
- `window.__gutter()` passes on every host the ticket touches.
- Light and dark have been checked.
- No count appears in the toolbar.

Effort: S ≈ 1 day, M ≈ 2–4 days, L ≈ a week.

### 6.1 Frontend tickets

| # | Ticket | Scope | Files touched | Acceptance checks | Size |
|---|---|---|---|---|---|
| F1 | Hub model | `hubInfo` with the two centre rules; traversal adjacency through centres; `connectionsOf(x)` returning field / listed / together / none groups | new `utils/hubs.ts`, new `utils/connectionsOf.ts`; `utils/relationships.ts` (`deriveHubs` retired); `data/cejil/graph.ts` (neighbours through centres); `data/cejil/profile.ts` (`cejilReferencesFor`) | Rafael Nieto Navia has no judge-to-judge rows; "Listed as Firmantes in" 17; "Listed together with" 6; unit tests for both rules on hand-made hubs | M |
| F2 | Seed fix | Bound generated anchors to the document's page count; keep the `e-missing-*` refs but count them apart | `data/references.ts` (`generateBulkReferences`) | La Tablada: 0 passages beyond p.39 after the fix, or the outside line shows the real number if the bound is left for demo purposes | S |
| F3 | Lens control | Replace list/tree/graph with Connections / Paths / In the document; per-scope lens atom; default lens rule; session override | new `components/relationships/LensControl.tsx` (replaces `ViewControls.tsx`); `atoms/filters.ts` (`lensAtom` via `relAtomFor`); `RelationshipsToolbar.tsx`; `RelationshipsPanelBody.tsx`; `views/RelationshipsView.tsx`; `RelationshipsDrawerSection.tsx`; remove `ZoomControl.tsx` | La Tablada opens on In the document, a CEJIL Causa on Connections; a choice holds across entities in the session; disabled lenses carry their reason | M |
| F4 | Connections body | Groups in template order; rows with pill, meta, peek, "See connections"; big groups collapsed with template summary; paging | new `components/relationships/connections/{ConnectionsBody,ConnectionGroup,ConnectionRow,PeekPanel}.tsx`, reusing `rows/RowShell.tsx` and `rows/RowParts.tsx`; retire `RelationshipsTreeView.tsx`, `TreeBranch.tsx`, `rows/HubRow.tsx`, `rows/AggregateRow.tsx` | Corte IDH: 3 groups, the two big ones collapsed with summaries; peek uses `bg-parchment`; row targets are only the pill, the peek chevron and "See connections" | L |
| F5 | Tab count | Distinct connected entities; tooltip with unit and passage count | `views/EntityView.tsx`; `components/layout/MainTabs.tsx` (tooltip) | La Tablada 52, Velásquez Rodríguez 7, Rafael Nieto Navia 19, Corte IDH 2,739 | S |
| F6 | Trail | Panel-local trail per scope, Back, crumbs with fold past depth 2, "Go to entity", always-mounted hint row | new `components/relationships/TrailBar.tsx`; `atoms/filters.ts` (`trailAtom` via `relAtomFor`); `hooks/useEntityScope.tsx` | Following three steps changes neither the page title, the tab count nor the document; Back and crumbs restore exact state, including per-step filters | M |
| F7 | Overlay | "How this connects to …" block (direct / path / only through skipped / none); footer "See connections" and "Go to entity" | `components/relationships/EntityOverlay.tsx`; `components/entity/EntityDetailBody.tsx` | Colombia from Velásquez Rodríguez shows the skipped-only state; Honduras shows "Directly, 1 step" | S |
| F8 | Paths util | `shortestPaths(graph, a, b, {skip, maxDepth, maxVisited, pin})` → layers, route count, gap labels and pairs, limits hit | `utils/chainTraversal.ts` | Velásquez Rodríguez → Godínez Cruz: 4 steps, 18 routes; → Mapiripán: 6 steps, 146 routes; → Colombia: none, with 3 steps through skipped types | M |
| F9 | Paths lens | Query card, entity picker Modal, Skip chips, empty / none / too-many states, pin, List/Map | new `components/relationships/paths/{PathsBody,PathQuery,PathList,EntityPickerModal}.tsx`; `components/shared/Modal.tsx` (reuse) | Escape closes the picker and focus returns to "Choose an entity…"; Skip never removes From or To | L |
| F10 | Patterns | Pattern table from template specs (`inheritPath` fields and `CEJIL_PERPETRATOR_CHAIN`) | new `components/relationships/paths/PatternTable.tsx`; `data/cejil/graph.ts`; `data/metadata.ts` (read specs) | A Causa shows Sentencia × Juez × País with merged cells; "—" where a judge has no País | M |
| F11 | In the document lens | Page strip (click, shift, drag, keyboard); outside-rendition line; passages by page; tag → page; highlight → row | new `components/relationships/document/{PassagesBody,PageStrip}.tsx`; reuse `rows/ReferenceRow.tsx`; `components/relationships/ReferencePanel.tsx` (drawer uses this body); `atoms/filters.ts` (`pageRangeAtom` replaces `activeClusterRefIdsAtom`) | p.3–p.5 gives 28 passages; the rail and the strip agree on counts; every bar is a button with "Page N: M passages" | M |
| F12 | Map | Connections Map (per entity, side labels, trail spine, 500 cap with summary) and Paths Map (columns, real links, pin) | rewrite `components/relationships/RelationshipsGraphView.tsx` → `ConnectionsMap.tsx`; new `PathMap.tsx`; keep the native non-passive wheel listener and HTML tooltips | No duplicate entities; no overlapping labels on Rafael Nieto Navia or La Tablada; dots focusable with a carbon ring | L |
| F13 | Filters per lens | Facet sets per lens, per trail step; Direction and Anchoring facets retired; chips in the search box | `components/relationships/RelationshipsFilterDrawer.tsx`; `useFilteredReferences.ts` (split into `useConnectionsFilter` and `usePassagesFilter`); `ActiveFilterChips.tsx`; `atoms/filters.ts` | A filter set at step 2 is gone at step 3 and back after Back; Paths shows no Filters button | M |
| F14 | Editing | Edit bar; "+ Add to <field>" (hub member); "+ Add relationship"; hover Remove; "Edit in …" for listed rows; passage connect from selection; delete passage; confirms; undo through the Beacon | `RelationshipsActionBar.tsx`; `CreateRelationshipModal.tsx` (field-restricted and passage variants); `components/viewer/FloatingMenu.tsx` ("Connect passage…"); `ConfirmDialog.tsx` (messages only); `atoms/references.ts` (`writeReferencesFor` becomes hub-aware) | Adding Cançado Trindade to Firmantes gives 7 judges in the same hub (was 6); removing a judge keeps the other 5; deleting the last passage of a pair deletes the pair and the confirm said so | L |
| F15 | Settings | "Skip in paths by default" per relation type, with the suggested set marked; data-quality list | `components/settings/pages/RelationTypesPage.tsx`, `RelationTypeEditor.tsx`; `atoms/settings.ts` | CEJIL suggests País, Paises, Mecanismo and untyped; the list shows 110 typed and 226 untyped centre-less hubs | M |
| F16 | Mobile and RTL | Full-width lens control; trail collapsed to Back and the current step; no Map under 768px; RTL glyph rules | `components/layout/MobileBottomSheet.tsx` (host); `DirectionGlyph.tsx`; `TrailBar.tsx`; `LensControl.tsx` | At 390px no horizontal scroll; under `dir=rtl`, ‹ › are not CSS-flipped, → is, and "+3" reads "+3" | M |
| F17 | Stories, catalog, handoff | Stories (generic names) and CatalogEntries for LensControl, TrailBar, PageStrip, PathList, ConnectionsMap, PatternTable | `stories/*.stories.tsx`; `views/ComponentCatalog.tsx`; `handoff/DATA-SEAMS.md`; `CLAUDE.md` (Connections panel section) | Every new primitive has a story and a catalog entry; the docs describe the hub model and the lenses | M |

**Order.** F1 → F2 → F3 → F4 + F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F13 → F14 → F15 → F16 → F17. The first usable cut is F1–F7: the model is right and the trail works. Paths (F8–F10) is the second cut; editing (F14) the third.

### 6.2 Backend tickets (huridocs/uwazi)

| # | Ticket | Size |
|---|---|---|
| B1 | `hub_centres` and `entity_degree` tables, refreshed by the relationship denormalisation jobs (PR #9760 pipeline); verify rule 2 (null-template row) against production rows first | M |
| B2 | `GET /api/entities/:id/connections` (+ group paging, facets) | M |
| B3 | `GET /api/entities/:id/passages` (+ histogram, outside-rendition count) | S |
| B4 | `POST /api/paths`: bidirectional breadth-first search with caps, permission filtering at every step, folded layers | L |
| B5 | Patterns: list from templates; Postgres compiler for `MatchQueryNode`; `POST /api/patterns/run` | L |
| B6 | `relationtypes.skipInPaths` and the quality endpoint | S |
| B7 | Spike: B4 at 17k edges (CEJIL) and at a synthetic 1M, to set the real caps | M |

---

## 7. Design rules kept

- `bg-parchment` for selected and peeked rows and the active passage.
- Row targets are the pill (preview) and the `p.N` tag. "See connections", peek, Remove and "Edit in …" are separate, named buttons.
- No count for the surface in the toolbar. Group headers, the page strip chip and path results carry their own counts, with units.
- Gutter hosts: all bodies sit in the pane's `gutter-host`, and rows carry no side padding of their own.
- The shared `Modal` and `ConfirmDialog`, with focus trap, Escape, and the seal commit only for destructive actions.
- One right-hand region: the overlay and Filters replace each other.
- Delete behind hover. Warm buttons on paper use the inset edge.
- Type colours through `typeLabelColor`.

## 8. Juan's prototype feedback

Not received yet. When it arrives it goes here, with what changed as a result.

## 9. Changelog since v2

**Corrections**
- Sample numbers exclude the 33 references to missing entities (52 / 402 / 162 / 240).

**New in the prototype**
- Sample data, so La Tablada's In the document is clickable: page strip, passages, jump, overlay.
- Editing: hub-member add, pair add, hover Remove, "Edit in …", passage connect and delete, confirms, undo.
- Map for Connections and Paths.
- Filters per lens, per trail step.

**Design decisions**
- **Map:** names in side columns with leader lines; the trail drawn as a spine; bar summary above 500.
- **Facets:** reset per trail step. The v2 prototype let them follow the trail, which hid everything at the next step whenever the next entity had no rows of the filtered type.
- **Facets retired:** Direction and Anchoring.

**Backend**
- Rewritten against the research. No graph engine: Paths is app-level breadth-first search over `connections` rows; hub centres are derived server-side; patterns reuse `MatchQueryNode`.
- One unverified assumption is flagged: the null-template row as the hub's creator.

**Plan**
- 17 frontend tickets and 7 backend tickets, with files, checks and sizes.
