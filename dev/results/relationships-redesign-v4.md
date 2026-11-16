# Relationships surface: redesign, round 4

Date: 2026-09-28. Follows `relationships-redesign-v3.md`. This round has two parts:
- **A.** Default entities, plus a Sample seed specification, so that every feature of the lens model can be seen without hunting.
- **B.** A fourth lens for time, "When".

Both parts are clickable in `relationships-redesign/v4/prototype/`: open `index.html` from disk; `?c=sample` switches to Sample.

This was built on `playground` 04d8f506. No app code was changed, and there were no synthetic user tests.

**Files**
- `v4/*.png`: 16 screens, light and dark.
- `v4/data/sample-seed-v4.json`: the Sample seed specification, machine-readable, for Code.
- `v4/data/rank.cjs`, `paths.cjs`: the scripts that measured the CEJIL candidates.
- `v4/data/gen-sample.mjs`: builds the prototype's Sample data from the real seed plus the spec, so the spec is exercised, not just written.

---

## A. Showcase defaults

### A.1 CEJIL default: Blake (Causa)

**How it was chosen.** I measured all 337 Causas with the prototype's own hub model; the script is `data/rank.cjs`. A candidate had to have:
- at least one own-field group with 2+ members;
- a pattern table with at least 6 rows, and at least 3 judges with a País;
- "Listed as … in", "Without a relation type" and "Listed together with" reachable within the first two trail steps;
- between 5 and 30 connected entities, so the default screen isn't a wall.

Fourteen Causas qualified. Ranked by how many dated connected entities, distinct years and pattern leaves they have:

| Rank | Causa | Connected | Dated (self + 1 step) | Distinct years | Pattern rows (judge → País) |
|---|---|---|---|---|---|
| 1 | Loayza Tamayo | 17 | 16 | 14 | 7 → 6 |
| 2 | Baena Ricardo y otros | 16 | 15 | 13 | 6 → 6 |
| 3 | **Blake** | 12 | 11 | 11 | **14 → 13** |
| 4 | Caballero Delgado y Santana | 13 | 12 | 13 | 6 → 6 |
| … | Velásquez Rodríguez (v1–v3 default) | 7 | 6 | 6 | 6 → 3 |

**Why Blake over the top two.**
- Its pattern table is twice as rich: 14 judge rows, 13 with a País.
- Its derived "Jueces firmantes" group has 10 judges.
- Its When lens reads as a clean case history on one screen (section B).
- Its shortest path to La Panel Blanca is 4 steps with 19 routes, differing at 3 steps. That is a good folded result, neither trivial nor overwhelming.

Loayza Tamayo would be a close second choice. Velásquez Rodríguez, the default until now, is thinner on every measure.

**What Blake cannot show, and where to find it.** CEJIL has no hubs without a centre at Blake's own level, no restricted entities, and only 2 anchored passages in the whole corpus.

| Feature | Where it shows in CEJIL |
|---|---|
| Own-field groups, derived group with `↳ via`, 2+ member hub, pattern table, folded Paths | Blake itself |
| "Listed as … in", "Without a relation type" | one step: Blake › Guatemala |
| "Listed together with" | one step: Blake › Blake. Sentencia de 2 de julio de 1996 |
| Big-degree node | Corte Interamericana (2,739), reachable from any Sentencia's "Without a relation type" row |
| 0 relationships | Convención Americana sobre Derechos Humanos (Instrumento) |
| Anchored passages / In the document | not in CEJIL's default. The 2 curated text references are on the Tagaeri y Taromenane documents. Sample covers this. |
| Restricted intermediate | not possible: all 4,398 entities are published. Sample covers this. |

### A.2 Sample default: Case 11.137 (La Tablada)

The entity stays the same. The seed is what changes: today Sample has 0 edges between entities other than La Tablada, so most features can't be shown. The additions below are in `data/sample-seed-v4.json`. The prototype's Sample data (`gen-sample.mjs`) is today's seed plus exactly these additions, and every screen in part A was taken on it.

**New template (1)**
- `hearing` "Hearing", colour `#0D9488`.

**New entities (51)**
- e54 "Uruguay" (country) and e55 "El Salvador" (country): respondent states for Gelman and Ellacuría.
- e56 "Unlinked memo (draft)" (document): deliberately has 0 relationships.
- e60–e107: 48 Hearing entities, in 5 sessions. Titles follow "Hearing N, March 2019 session"; dates are in the table below.

**New relation types (8)**

| id | Label |
|---|---|
| `victim` | Victim |
| `petitioner` | Petitioner |
| `respondent_state` | Respondent State |
| `judgment_of` | Judgment |
| `signed_by` | Signed by |
| `nationality` | Nationality |
| `member_of` | Member of |
| `hearing_of` | Hearing |

**New relationship fields** on the templates:

| Template | Field (relation type → target template) |
|---|---|
| Court case | Victims (victim → person), Petitioners (petitioner → organization), Respondent State (respondent_state → country), Judgments (judgment_of → judgment) |
| Judgment | Signed by (signed_by → person) |
| Person | Nationality (nationality → country), Member of (member_of → organization) |
| Organization | Hearings (hearing_of → hearing) |

**New derived fields** on Court case:
- "Judges": Judgments → Signed by.
- "Judges' nationality": Judgments → Signed by → Nationality.
Both follow the existing `inheritPath` shape.

**New hubs (33).** Each edge is a `references.ts` row with no `sourceSelection`, `sourceEntityId` = the centre, and one shared `hubId` per hub. That is 94 references in total.

| Centre | Field | Members |
|---|---|---|
| e3 La Tablada | Victims | e1 (restricted), e11, e12 (restricted), e16 |
| e3 | Petitioners | e8, e43 |
| e3 | Respondent State | e2 |
| e3 | Judgments | e7 (restricted) |
| e7 / e38 / e39 / e40 (judgments) | Signed by | e21 e22 e23 / e22 e24 e25 / e22 e23 e24 / e21 e25 |
| e13 / e33 / e32 | Judgments | e38 / e39 / e40 |
| e13 / e33 / e32 / e31 | Respondent State | e26 / e27 / e54 / e55 |
| e33 | Victims | e19, e20 |
| e32 | Petitioners | e8, e44 |
| e21–e25, e1, e11, e12, e16 | Nationality | one country each |
| e16, e17 / e19 / e20 | Member of | e43 / e44 / e8 |
| none, no type | — | e8, e41, e42: a joint statement, which becomes "Listed together with" |
| e3, no type | — | e52: an untyped pair, which becomes "Without a relation type" |
| e8 Inter-American Commission | Hearings | all 48 hearings: the big-degree node |

**Dates (68 entities).** Stored as date properties in each entity's metadata, not in `createdAt`:
- **Cases:** e3 has four (the attack 1989-01-23, petition filed 1989-03-15, admissibility 1995-10-12, report 1997-11-18). e13, e31, e32 and e33 have petition and submission dates.
- **Judgments:** e38 1988-07-29, e39 2000-11-25, e40 2011-02-24, e7 1997-11-18.
- **Documents:** e48–e53 carry their adoption dates (1948–2003).
- **Judges e21–e25:** mandates as date ranges (1986–2015).
- **Hearings:** 5 sessions (Mar 2019, Oct 2019, Mar 2021, Oct 2022, Mar 2024), 6–12 hearings each. These give the When lens a real burst pattern.

**Keep as is.**
- The 402 passages; since 92c22dee they all stay within La Tablada's 39 pages.
- The 3 text↔text references.
- The 12 seeded-restricted entities (the `hash(id·pub) % 5` rule).
- The 33 references to deliberately missing entities.

**Check after seeding** (measured on the prototype's copy):
- La Tablada has 52 connected entities.
- The Commission (e8) has 51, including 48 hearings.
- e56 has 0.
- A guest sees 40 on La Tablada: restricted people and the restricted judgment drop out. Its "Judges" derived group then reads "↳ via 1 restricted entity", because e7 is restricted.

### A.3 Feature → where it shows → today → seed change

| Feature | CEJIL (Blake) | Sample (La Tablada) | Sample today | Seed change needed |
|---|---|---|---|---|
| Own-field groups | Blake: País, Documentos de la CorteIDH, Geolocalización | La Tablada: Victims, Petitioners, Respondent State, Judgments | no (only text-reference types) | fields + 4 hubs on e3 |
| "Listed as … in" | Blake › Guatemala | La Tablada › Argentina ("Listed as Nationality in 4") | no | nationality hubs |
| "Listed together with" | Blake › Sentencia 2 jul 1996 | La Tablada › Inter-American Commission | no | hub-v4-31 |
| Without a relation type | Blake › Guatemala | La Tablada | partly (`no_label` refs) | hub-v4-32 |
| Hub with 2+ members | Blake: Documentos de la CorteIDH (9) | La Tablada: Victims (4) | 2 hubs, not field-backed | victim/petitioner hubs |
| Derived multi-hop with `↳ via` | Blake: Jueces firmantes (10) | La Tablada: Judges, via La Tablada Attack | no | judgment_of + signed_by + derived fields |
| Restricted intermediate | not possible (all published) | La Tablada as guest: Judges "↳ via 1 restricted entity" | restricted entities exist but nothing passes through them | judgment e7 stays restricted |
| Anchored passages, page strip | not possible (2 curated) | La Tablada, In the document (402 passages, 39 pages) | yes | none |
| Text↔text references | Tagaeri documents only | La Tablada (3) | yes | none |
| Paths, folded multi-route | Blake → La Panel Blanca: 4 steps, 19 routes | La Tablada → Bámaca Velásquez: 3 steps, 2 routes via 2 judges | no (everything is 1 step from e3) | signed_by hubs sharing judges |
| Pattern table | Blake: Jueces firmantes, 14 rows | La Tablada: Judges' nationality | no | nationality + derived |
| Big-degree node | Corte IDH (2,739) | Inter-American Commission (51, incl. 48 hearings) | no | hearings |
| 0 relationships | Convención Americana | e56 Unlinked memo | no | e56 |
| When lens with bursts | Blake (1993–2014) and Corte IDH | La Tablada (1948–2024), Commission (hearing sessions) | no dates beyond `createdAt` | dates table |

Screens: `a1-cejil-default-blake`, `a2-sample-default-connections`, `a3-sample-guest-restricted`, `a4-sample-commission`, `a5-sample-paths-pattern`, `a6-sample-in-document`, `a7-sample-zero`, `a8-cejil-paths-folded`.

**Ticket for Code (seed only):**
- Implement `sample-seed-v4.json` in `app/src/data/entities.ts` (the 51 entities), `data/references.ts` (the 94 references and the 8 relation types), `data/metadata.ts` (the fields, the derived fields and the dates) and the templates.
- Acceptance: the "Check after seeding" numbers above, plus every row of the A.3 table visible without hunting.
- Size M.

The Sample skip defaults in the prototype are Mentions, Relates to, Cites and Refers to, because La Tablada's passages touch every entity. That falls out of the same 5% heuristic as CEJIL's País and Mecanismo.

---

## B. A fourth lens: When

### B.1 The question and the unit

**Question:** in what order did things happen around this entity, and where are the gaps and bursts?
- Blake: complaint 1993, submission to the Court 1995, provisional measures, then judgments 1996–1999, then supervision resolutions to 2014.
- The Commission: five hearing sessions, with a two-year gap after 2019.

**Unit: a dated event.** One date property on the entity you are on, or on an entity directly connected to it. Each event row shows:
- the date;
- the connected entity's pill (preview, as everywhere);
- the date's label ("Fecha", "Presentación ante la CorteIDH", "Mandate");
- the field it came through.

An entity connected through several fields is one event, not several. The first field is named and the rest counted ("Mentions +6").

**Relationships have no dates.** A connection is placed at the dates of the entity at its other end. In Uwazi's `connections` table a relationship has no timestamp and no date of its own. The data layer lacks:
1. **A date on the relationship itself** ("was a member of X from 1995 to 2003"). The judges' mandate ranges show what this would look like, but a mandate is a property of the person, not of the link to a specific Sentencia.
2. **A date on a passage.** Anchored references could take the date of the document they sit in; this needs the file's own date, which `files` doesn't store today.
3. **Creation and edit dates of relationships**, for an audit view.

Until then, the lens says what it is doing. Its header reads "N dated events around X". Connected entities with no date are listed apart under "Without a date: connected, but nothing on either end has a date". The lens is honest about coverage instead of dropping rows silently. Blake has 2 such entities; La Tablada has 20.

Derived (two-step) groups are left out of the When lens on purpose. Their dates are someone else's timeline: when a judge's mandates were added, Blake's case history drowned in 1986–2009 mandate ranges. Trail step-in (below) is how you see the next hop's dates.

**Coverage today.**
- CEJIL: 3,490 of 4,398 entities have at least one real date, 10 date properties in all. The most common are Fecha 2,898, Denuncia 336, Presentación 336 and MP dates 368; mandate ranges exist for 109 judges.
- Sample: only the seeded `createdAt` today, which is not a real event date. The A.2 dates table fixes this.

### B.2 Three directions

**Direction 1 — Spine (recommended).** A vertical chronology, in list form.
- **Reuses TimeSpine.** `components/library/TimeSpine.tsx` is the Library's proportional spine, and this reuses it rather than adding a chronology engine. Its rules:
  - an adaptive scale (at least 190px per year);
  - silences over 88px elided into an "N years later" break;
  - rows pushed down on collision, with a leader line back to their true instant;
  - year marks on the axis;
  - a dot per instant in the entity's type colour; the entity's own dates are ink and larger.
- **Date ranges** (mandates) draw as a thin bar along the axis.
- **Density strip.** Above the spine, an "Events by year" strip that works like the page strip in In the document. Click a year or shift-click to extend; the range becomes a chip and filters the spine.
- **Tested on:** Blake (14 events, 1993–2014), La Tablada (26 events, 1948–2024) and the Commission's hearing sessions.
- Screens: `t1-spine-blake`, `t1-spine-sample-latablada`, `t1-spine-sample-commission`.

**Direction 2 — Lanes.** One horizontal lane per field ("This entity", "Documentos de la CorteIDH", "Medidas de Protección"), on a shared time axis. It is closest to the investigation-tool pattern in the Cambridge Intelligence article.
- **Good for:** comparing when each kind of connection was active.
- **Weak:**
  - names only appear on hover;
  - labels can't sit on the axis without colliding;
  - it needs horizontal space, so it doesn't work on a phone;
  - the lane set changes with every trail step, so the layout jumps.
- Kept as a desktop-only "Lanes" rendering toggle, the way Map is for Connections. Not the default.
- Screen: `t2-lanes-blake`.

**Direction 3 — A path laid on time.** Paths gets a third rendering beside List and Map: "Time". Every entity on the shortest connection sits at its own date, with its step number beside it.
- It answers "did the route happen in order?" For Blake → La Panel Blanca, the judges' mandates (1986–1995) precede the Sentencias they signed (1996–1998), which precede the target's judgment.
- It is a rendering of Paths, not a separate lens.
- Screen: `t3-path-on-time`.

**Recommendation.** Direction 1 as the When lens's default rendering, Direction 2 as its desktop toggle, and Direction 3 inside Paths. All three share the same event data and the same spine or axis code.

### B.3 How it composes

- **Trail.** When follows the trail like Connections does. "See connections" on a Sentencia and then When shows that Sentencia's timeline. Stepping in is how you see a second hop's dates without drowning the first.
- **Filters.** When uses the Connections facets (entity type, kind of connection), per trail step, plus the year range from its own strip. It has no search box: the strip and facets narrow, and the spine is short enough to read.
- **Overlay.** Clicking a pill opens the entity preview, as everywhere.
- **Big degree.** Above 240 events, the spine becomes one row per year with a count and a template breakdown, instead of drawing every row. Corte IDH shows 2,231 events this way. Clicking a year opens that year's spine; `t4-bigdegree-court`, `t4-bigdegree-court-year`. This is the aggregation-when-zoomed-out idea, done as a list.
- **Mobile.**
  - The spine is already a vertical list, so it works at 390px.
  - The date column narrows to 4.6rem, and the date label drops out; the pill keeps the entity name.
  - Lanes are hidden under 768px.
  - The lens control wraps to its own line.
  - Screen: `t5-mobile-spine-blake`.
  - Known limitation: two different entities with the same title (Blake the Causa, Blake the Medida Provisional) look identical at this width without the label; the type colour is the only cue.
- **RTL.** The spine uses logical insets, so the axis moves to the left and leaders mirror.
- **Tab count.** Unchanged. When counts events in its own header, never in the toolbar.

### B.4 What it needs (beyond the prototype)

| Need | Today | Proposal |
|---|---|---|
| Real date properties in Sample | only seeded `createdAt` | A.2 dates table |
| Event extraction from any date property | CEJIL: `adapt.ts` maps date, multidate and multidaterange to text | one `datesOf(entity) → {label, t, t2?}[]` util, used by the lens and the Library |
| TimeSpine reuse | Library-only, rows are entities | make the row generic (it already takes `SpineRow<T>` and `renderRow`); the When lens passes events |
| Dates on relationships | none | backend: optional `date` / `dateRange` on a hub (V1 `connections`) |
| Dates on files / passages | none | backend: `files.date` (document date) so passages can be placed |
| API | — | `GET /api/entities/:id/events?language&from&to` → `{ events: [{entity, label, t, t2, via: {group, kind}}], undated: [...], histogram: [{year, count}] }`; above 240 events it returns the histogram and per-year counts only |

**Tickets (frontend, this repo):**
- **W1** `utils/entityDates.ts` (`datesOf`) plus tests against CEJIL date types. S.
- **W2** Generalise `TimeSpine` rows to events (no behaviour change for the Library). S.
- **W3** When lens: `components/relationships/when/{WhenBody,EventRow,YearStrip}.tsx`, added to `LensControl` from v3 F3; facets and year range via `relAtomFor`. M.
- **W4** Lanes rendering (desktop only). M.
- **W5** Paths "Time" rendering. S.
- **W6** Big-degree year aggregation plus mobile layout. S.
- Depends on the v3 F1–F6 lens and trail work and on the Sample seed ticket above.

---

## Design rules kept

- The pill opens the preview; `bg-parchment` for selected rows.
- No count in the toolbar.
- The gutter host owns the side padding.
- The strip chip (the year range) mirrors the page strip.
- Dates are in the mono meta size, which is 11px, the minimum.
- No new colours: event dots use the type colour and own events use ink; ranges are the type colour at 30%.

## Changelog since v3

- **Defaults:** CEJIL's default entity becomes Blake, measured. Sample gets a full seed specification with 33 hubs, 94 references and 68 dated entities, and a guest toggle for the restricted cases.
- **Prototype:** derived groups with `↳ via`, restricted handling, the Sample pattern table, the fourth lens (When, with Spine and Lanes), and Paths "Time".
- **Skip defaults:** Sample's skip defaults now come from the same heuristic as CEJIL's.
