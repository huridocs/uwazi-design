# Relationships surface: redesign, round 2

Date: 2026-09-27. Follows `relationships-redesign.md` (v1). Everything here was checked against the real corpora: CEJIL (`public/cejil-data`, 4,398 entities, 16,998 edges) and Sample (`data/references.ts`, 456 references), on `playground` 6a810482. No app code was changed.

Files in `relationships-redesign/v2/`:
- 13 screens, each as `<name>-light.png` and `<name>-dark.png` (listed in section 2).
- `prototype/`: a clickable static prototype over the full CEJIL corpus (section 3).
- `mockup-src/`: the static "In the document" mockup and the two screenshot scripts.

---

## 1. Positions on v1's open questions

### 1.1 Default lens per entity

**Position.** The Relationships tab opens on **In the document** when the entity has at least one anchored passage inside its rendition's page range. Otherwise it opens on **Connections**.

- The reader's explicit choice holds for the rest of the session, across entities. This is the same rule the Library uses when a search opens Results.
- If the chosen lens is unavailable on the next entity, the tab opens on Connections for that entity only. The choice is kept for entities where the lens exists.
- The drawer beside the Document tab always opens on In the document when it is available, because it sits next to the page it describes.

**What this means for the data.** La Tablada opens on In the document (174 anchored passages inside its 39 pages). 4,396 of 4,398 CEJIL entities open on Connections; the two exceptions are the entities with curated text↔text references.

**Why.** For an entity with a document, "where in the document" is the first question. For a court, a judge or a country it has no answer. A single fixed default would be wrong for one of the two corpora on every visit.

### 1.2 Hubs without a clear centre

**Position.** A hub's centre is decided by two rules. Anything they don't resolve is shown as a group, never guessed.

1. **Field ownership.** If exactly one member's template owns a relationship field with the hub's relation type, that member is the centre. This resolves 981 of 1,478 multi-member CEJIL hubs.
2. **Export centre.** If several members own the field and the export's `from` is one of them, `from` is the centre. This resolves 161 more.

That leaves 336 hubs: 110 typed ones where no member owns the field, and 226 without a relation type. Each shows as one **"Listed together with"** row:

- The members are listed as pills. Members of a different template come first, because in a mixed hub that is usually the record that joins the rest, for example a Resolución among its judges (`hub-together-*.png`).
- Paths never traverses these hubs. Doing so would put back the judge-to-judge edges this model removes.
- Settings › Relationship types lists them as a data-quality item, so an admin can fix the relation type or the field.

### 1.3 Skip defaults for Paths: admin setting or heuristic

**Position.** An admin setting, pre-filled once from a heuristic, and always visible to the reader.

- **Setting.** Settings › Relationship types gets a per-type toggle, "Skip in paths by default".
- **Heuristic.** When an instance first gets Paths, the toggle is pre-set for relation types that reach an entity connected to 5% or more of the corpus. For CEJIL that means País (Perú, 711 connections), Paises, Mecanismo (Corte IDH, 2,739), and edges without a relation type. That is exactly the list used by hand in v1.
- **Visibility.** The reader sees the skipped types as chips on every query and can remove one for that query.
- Nothing is cut silently at query time. A path that only exists through skipped types is shown as such, with the reason (`paths-no-result-*.png`, `overlay-no-path-*.png`).

**Why not a live heuristic.** A degree cutoff applied at query time changes as the corpus grows, and a reader can't see why a route was avoided. An admin setting with a suggested default is predictable and can be explained on screen.

### 1.4 Labels: "Explore" vs "Open entity"

**Position.**
- Row button and overlay footer: **"See connections"**.
- Navigation: **"Go to entity"** (overlay footer and the trail).
- Trail label: **"Following from …"**.
- The pill's tooltip: "Preview <title>".
- Recommended separately: rename the Library drawer's "View entity" to "Go to entity", so one action has one name across the app.

**The quick label test.** 12 synthetic first-time readers (Haiku subagents), 3 per option. Each saw one label pair and a description of the screen, and predicted what each button does. This is a proxy, not a user test.

| Option | Row button | Footer | Row read as | Footer read as | "Could do the same thing" |
|---|---|---|---|---|---|
| A | Explore › | Open entity → | preview or expand details (3/3) | full page (3/3) | 1/3 |
| B | See connections › | Go to entity → | shows that record's connections (3/3) | full page (3/3) | 3/3 |
| C | Step in › | Open → | navigate to the record (3/3) | full page (3/3) | 3/3 |
| D | Explore › | Go to entity → | navigate, or show evidence (3/3) | full page (3/3) | 2/3 |

**What it showed.**
- No label, in any option, led a reader to expect the panel to re-centre while the page stays put. Everyone assumed navigation or a preview.
- B was the only option where readers named the right content (that record's connections).
- C was the worst: both buttons read as "open".

**What I did with it.**
- Chose B's words.
- Made the trail row always present. Before first use it reads: "'See connections' on a row follows it here, one step at a time. You stay on <page>." That line teaches the behaviour at the place where it happens.
- The 5-person hallway test from v1 is still worth running before shipping. The script is in section 6.

**Cost.** I ran the test as a 12-agent workflow, which was more than the brief asked for. It used about 880k tokens, because the agents read project files instead of answering from the prompt alone.

### 1.5 Tab count

**Position.** The Relationships tab shows the number of **distinct entities directly connected** to the page's entity, counted after the hub rules above. "Listed together" peers are not counted.

- Its tooltip states the unit, and the passage count where there are passages: "61 connected entities · 435 passages".
- It does not follow the trail. It is never repeated in the toolbar.

**Effect.**

| Entity | Today | v2 | Reason |
|---|---|---|---|
| La Tablada | 456 | 61 | today it counts passages |
| Velásquez Rodríguez (Causa) | 7 | 7 | |
| Rafael Nieto Navia | 31 | 19 | v1 estimated 15; 19 is what the implemented rule gives |
| Corte IDH | 2,739 | 2,739 | every edge reaches a different entity |

**Why.** A count of passages would mean something only on entities that have passages. A count of connected entities means the same thing on every entity in both corpora.

---

## 2. New screens

All screens are 1440×900 (mobile at 390×844), light and dark. Except "In the document", they are screenshots of the prototype on real CEJIL data, so the numbers are what the model actually produces.

| Screen | File | What it shows |
|---|---|---|
| In the document, Sample | `in-the-document-*` | La Tablada. The page strip has one bar per page for pages 1–39, with the range p.3–p.5 selected (28 passages). Passages are grouped by page; the peeked row is `bg-parchment`; highlights sit on the page. Passages on pages the rendition doesn't have are counted on a separate line, not drawn as bars (see 4.5). |
| Paths, empty | `paths-empty-*` | Before a destination is chosen: the query card, one sentence on what Paths does, a "Choose an entity…" in the To field. The template pattern table sits below. |
| Paths, picker Modal | `paths-picker-*` | "Connect Velásquez Rodríguez to…" with a search field. Results show template and title; the first result is active and Enter picks it. Focus stays in the Modal, and Escape closes it. |
| Paths, too many routes | `paths-too-many-*` | Velásquez Rodríguez → Masacre de Mapiripán: 6 steps, 146 equal routes, differing at 5 steps. Each differing step is folded to "any of N". A notice explains how to narrow: pin an entity in an "any of" step, or skip a type. |
| Paths, no result | `paths-no-result-*` | Velásquez Rodríguez → Colombia: nothing within 6 steps without the skipped types. The route that exists through them (3 steps) is shown, with why it says little. Two ways on: "Allow 8 steps" and "Include skipped types". The pattern table below already answers the real question: Colombia is Rafael Nieto Navia's País. |
| Listed together with | `hub-together-*` | Rafael Nieto Navia at step 2: "Listed as Firmantes in 17" (resolved hubs) above "Listed together with 6" (unresolved hubs, the Resolución first in each row). |
| Trail at depth 3 | `trail-depth3-*` | Velásquez Rodríguez › … 1 more › Rafael Nieto Navia › Neira Alegría Sentencia 1991. The middle crumbs fold into "… 1 more", whose tooltip lists them. Back pops one step; "Go to entity" makes the current step the page. |
| Overlay with no direct path | `overlay-no-path-*` | Colombia previewed from Velásquez Rodríguez. "How this connects" states that there is no connection without the skipped types, shows the route through them, and names which types it used. |
| Mobile Paths | `mobile-paths-*` | 390px. The lens control is full width; the query card wraps; the path list is already vertical. Velásquez Rodríguez → Godínez Cruz: 4 steps, 18 routes. |
| Mobile trail | `mobile-trail-*` | The trail collapses to Back plus the current step. Rows wrap: pill first, metadata below. |
| RTL | `rtl-trail-*` | The trail at step 2 with `dir="rtl"` (see 4.4). |
| 0 relationships | `edge-zero-*` | see 4.1 |
| 2,739-edge court | `edge-court-*` | see 4.2 |

---

## 3. Clickable prototype

`relationships-redesign/v2/prototype/index.html`. Open the file in a browser; it runs from `file://` with no server. `data.js` is the whole CEJIL corpus compacted to 652 KB, so every entity and every path is real.

### Walkthrough (about 5 minutes)

1. The page is **Velásquez Rodríguez (Causa)** on **Connections**. Groups follow the Causa template: País, Documentos de la CorteIDH, Geolocalización. "Medidas de Protección" is labelled as a relation type that is not a field of Causa.
2. Press **▸** on "Sentencia de 21 de julio de 1989". A peek opens in place (`bg-parchment`) with that Sentencia's own first groups.
3. Press **See connections** on the same row. The list re-centres on the Sentencia, and the trail reads "Following from Velásquez Rodríguez › Sentencia…". The page title, the tab count and the document do not change.
4. Press **See connections** on **Rafael Nieto Navia**. At step 2, compare "Listed as Firmantes in 17" (the documents he signed) with "Listed together with 6" (hubs with no honest centre). There are no judge-to-judge rows.
5. Go one step further and press **Back**, or a crumb. Past depth 2, the middle crumbs fold into "… N more".
6. Click any **pill**. The overlay opens with "How this connects to <current step>". Direct connections read "Directly, 1 step". Try Colombia from the País row for the case with no path.
7. The overlay footer has **See connections**, which continues the trail from this entity, and **Go to entity**, which makes it the page and clears the trail.
8. Switch to **Paths**. Choose an entity and type "Mapiri", then Enter: 146 routes, folded. Click a pill in an "any of" step to pin the route through it; "pinned ×" undoes it.
9. Change the destination to **Colombia** to see the no-result state and its two ways forward. Remove the **País** chip and the route appears.
10. On a Causa, the **Along a pattern** table runs the "Jueces firmantes" pattern (Causa → Sentencia → Juez → País).
11. **RTL** and **Dark** in the nav switch direction and theme.

For screenshots and review links, the URL takes `?e=<sharedId>&lens=paths&to=<sharedId>&trail=<id,id>&ov=<id>&modal=1&theme=dark&dir=rtl`.

### Not in the prototype

- **Map.** The rendering stays as designed in v1.
- **In the document.** CEJIL has only 2 anchored references, so it is covered by the mockup instead.
- Filters, Edit mode and the Metadata tab.
- Group by relation type or entity type. Only the template-field grouping is built.

### What building it settled

- **Paths must walk through hub centres, not raw edges.** On raw edges, routes jumped judge → judge through the invented "Firmantes" peers. That is also why v1's Velásquez Rodríguez → Godínez Cruz result (6 steps, 6 routes) was wrong. Through centres it is 4 steps and 18 routes.
- **Folding parallel routes works for any number of differing steps, not only one.** At each step, list every entity that lies on some shortest route; the route count comes from the breadth-first search. This stays readable at 146 routes.
- **A direct connection must win over the skip rules in the overlay.** Otherwise Honduras, which is directly País-linked to the case, reads as "no connection".
- **The whole corpus runs in the browser.** Search, peeks, overlay paths and the pattern table respond immediately on a laptop. Real instances larger than CEJIL will still need the server-side query described in v1 §4.

---

## 4. Edge cases

### 4.1 An entity with 0 relationships

CEJIL has 3: the Instrumento "Convención Americana sobre Derechos Humanos", one Geolocalización record and one Perito.

- The tab count shows 0.
- **Connections** shows "No connections yet", one sentence, and "Add relationship" for users who may edit (`edge-zero-*`).
- **Paths** is disabled, with the reason in its tooltip: a path needs a connection to start from.
- **In the document** is disabled as usual.
- The trail row is not shown, since nothing can be followed. Nothing on the page can change that without an edit, so hiding it shifts nothing while the reader works.

### 4.2 A 2,739-edge court (Corte Interamericana)

Three groups (`edge-court-*`): Paises 18 (its own field), Listed as Mecanismo in 1,655, and Without a relation type 1,066.

- **Large groups start collapsed.** Any group over 200 rows opens collapsed, with a one-line template breakdown in its header, for example "Resolución de la CorteIDH 719 · Voto Separado 313 · …".
- **Paging.** Opened, a group shows 5 rows, then pages 25 at a time. The search field filters within the groups.
- **Map** is not offered above 500 connected entities; the template breakdown takes its place.
- **Paths never routes through the court.** Every edge into it has a skipped type, so a path cannot use it as a shortcut.
- **Row metadata in the app.** The "N connections" on every row has to come from a precomputed degree on the server. Computing it per row in the browser, as the prototype does, would not scale.

### 4.3 An entity with only derived connections

In this data, it can't happen. A derived group (an inherited multi-hop field) starts from a direct connection, so an entity with derived connections always has at least one direct one. It can look that way in two cases, and both need a rule:

- **Filters hide every direct group.** Derived groups are filtered on their first hop, so they hide too. The empty state reads "No connection matches these filters" with Clear. A derived group never stays on screen without the connection it depends on.
- **The reader can't see the intermediate entity** (a restricted Sentencia; Sample has 12 restricted entities, CEJIL none). The derived value is shown with "via 1 restricted entity". The hop has no "See connections" and no title, and Paths treats the restricted entity as missing for that reader. Nothing about a restricted entity leaks through a derived value.

### 4.4 RTL and Arabic

Two separate things:

- **Arabic as reading language.** The document rendition is Arabic, and the app already supports this. Quotes in In the document render `dir="auto"` inside the LTR chrome. The page strip keeps p.1 on the left, because it follows the chrome's direction, not the text's.
- **Arabic as UI language.** Real Uwazi has this; the prototype app has en/es/fr only. I checked the prototype with `dir="rtl"` (`rtl-trail-*`). The layout mirrors correctly because it uses logical properties, and three rules came out of it:
  1. **‹ and › must not be flipped with CSS.** They are bidi-mirrored characters, so the browser already flips them under RTL; flipping them again makes Back and the crumb separators point the wrong way. → and ▸ are not mirrored and do need the flip. The app's `DirectionGlyph` and crumb separators should be checked against this rule.
  2. **Metadata beside a pill** (Spanish text in an RTL row) needs `dir="auto"`. Otherwise it truncates on the wrong side ("…antes · with 6 others").
  3. **Counts like "+3"** need `<bdi>`. Otherwise they render as "3+".

Also under RTL: the path list is vertical and is unaffected. The v1 path map should flow right to left. The page strip puts p.1 on the right. Arabic UI strings in any real mockup need a native speaker's review; none are used here.

### 4.5 A data defect found on the way

La Tablada has 435 anchored references. 261 of them point at pages 40–120, and its rendition has 39 pages. The generator in `data/references.ts` (`generateBulkReferences`) is not bounded by the document's page count.

- Today these passages have page tags that go nowhere, and the rail's clusters stop at page 39.
- The v2 page strip counts them on their own line instead of drawing empty bars. The seed should also be fixed.
- Recommended owner: Code.

---

## 5. Changelog since v1

**Decisions**
- All five open questions now have a position: default lens (1.1), hubs (1.2), skip defaults (1.3), labels (1.4), tab count (1.5).
- Labels: "Explore" became "See connections", "Open entity" became "Go to entity", and "Exploring from" became "Following from". Reasons are in 1.4.

**Model**
- **Hub centre.** v1 used "field ownership, else the export's `from`". v2 uses two rules and no guessing; 1,142 of 1,478 multi-member hubs resolve, and 336 become "Listed together with" rows that Paths does not traverse.
- **"Listed in".** v1 had one "Listed in" group. v2 has one group per field ("Listed as Firmantes in", "Listed as País in"), so a country's 338 incoming rows group by the field that names it.
- **Paths engine.** It now walks through hub centres. Corrected numbers: Velásquez Rodríguez → Godínez Cruz is 4 steps and 18 routes (v1 said 6 and 6, computed on raw edges).
- **Folding.** v1 folded a single differing step. v2 folds every differing step and adds pin/unpin to narrow the result.
- **Overlay.** A direct connection is shown as "Directly, 1 step" regardless of skips. No-path and skipped-only states are defined.

**Screens and states**
- Paths takes the full width, as in v1. New: empty state, picker Modal, no result, too many routes.
- **Trail.** The row is always mounted, with a hint before first use. Middle crumbs fold past depth 2. On mobile it collapses to Back plus the current step.
- **In the document.** The page strip is bounded to the rendition's page count; passages outside it are counted separately.
- **Edge cases.** 0 relationships, a 2,739-edge court, derived-only (4.3) and RTL (4.4) are specified.

**Deliverables**
- The clickable prototype over the full CEJIL corpus.
- 13 screens, each in light and dark.

**Unchanged from v1**
- The three lenses and their units, Map as a rendering, and the hosts table.
- The data and backend needs, apart from the hub rules above.
- The migration order and the design rules kept (v1 §7).

---

## 6. Still open

- **Real label test.** Five people, two tasks each:
  1. "Find which judges signed this case's first judgment, then come back to the case."
  2. "Look at one of those judges on their own page."
  Pass if all five do task 1 without leaving the page and finish task 2 in one click from the overlay or the trail. Run it with the prototype.
- **Restricted intermediates** (4.3) need a check against Uwazi's real permission model before the "via 1 restricted entity" wording is final.
- **The 5% threshold** for suggested skips is set from CEJIL alone. Another instance's first run should confirm it produces a sensible list.
- **The PostgreSQL / AGE backend** premise is still unconfirmed (v1 §6).

## 7. Recommended owners (for the coordinator)

- **Code:** the seed page-range bound (4.5), and checking the RTL glyph rules (4.4) in `DirectionGlyph` and the crumb separators.
- **Design:** the label test (section 6), with this prototype.
- **QA:** re-check the tab-count change (1.5) against any stored expectations when the model lands.
