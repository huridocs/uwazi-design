# Relationships tab for OSINT: synthesis

Date: 2026-10-12. Research lane. Read-only: no code changed. Basis: `playground` d6a9557b (the app), the static
prototypes v1 to v5 in `dev/results/relationships-redesign/`, the seeds in `dev/results/nepal-seed` and
`dev/results/vegas-seed`, and a local clone of `huridocs/uwazi` at 731145c (2026-10-02).

Convention: **verified** means I read the file or ran a count this session. **Assumed** means inferred and not
checked. Practice-scan findings are in `practice-scan.md` (same folder), with the URLs that were opened.

---

## 0. Short answer

- The v1 to v5 work redesigned how the tab is **navigated** (lenses, hubs, trail, tree). It has not been built in
  the app. The app tab is still List / Tree / Graph / When, plus work that landed on 5 to 6 October for
  **evidence** (link status, tenure, claim matrix, Connect to…, field evidence).
- What an investigator needs from a link is **evidence about the link**: which sources, which passage, how it was
  verified, when it held and when it was reported, what contradicts it, how it was captured, who changed it. The
  navigation redesign does not address those, and Juan's 5 October note ("relationships are complex but not
  useful") points at the same gap.
- Most of that evidence already exists in the seeds and is dropped before it reaches the tab. The first phase
  needs no backend and no new research data.
- Uwazi v2 stores `{_id, from, to, type}` and text anchors. It has no place for link-level evidence, no
  timestamps and no author on a relationship. Anything beyond the unit "claim entity + source entities + stance
  relationship types" (what Nepal already does) needs a backend decision.

---

## 1. What v1 to v5 established, decided and left open

### 1.1 Timeline

| Date | Document | What it did |
|---|---|---|
| 09-27 | `relationships-research.md` | Backend reality check. Comparable tools. |
| 09-27 | `relationships-proposal.md` | Incremental fixes F1 to F9, eight changes, three phases. Phase 1 shipped on playground (6a810482). |
| 09-27 | `relationships-redesign.md` (v1) | Three lenses: Connections, Paths, In the document. Hub centres. Trail ("Explore"). |
| 09-27 | `-v2.md` | Positions on the five open questions. Clickable prototype over all of CEJIL. |
| 09-28 | `-v3.md` | Editing rules, Map, filters per lens, API shapes, 17 frontend and 7 backend tickets. |
| 09-28 | `-v4.md` | Showcase defaults (Blake, Sample seed spec). Fourth lens, When. |
| 09-29 | `v5-tree-audit.md` | Tree as default; the four lenses behind an "Advanced" switch. Steps 1 to 6 built in the static prototype. |
| 10-05 | `research-tools/relationships-concept/` | Design lane: summary-first tab, link metadata, time and place together. |
| 10-05 | `research-tools/gap-analysis.md` | Research lane: 20 investigator questions, 7 ranked features. |
| 10-05/06 | app commits (bfe3b2f0, 3f6879a2, 254b98ee, 01f15ce9, 3a7c6349, 864fa7eb, 0fe30e89, 48e7545c) | Built in the app: link status and tenure, Verification facet, As of, field evidence, Connect to…, claim matrix, figures, Notebook, saved views, Filters as drawer tab. |

### 1.2 Established (measured or verified)

**Backend.** (`relationships-research.md`, re-checked against the clone)
- Uwazi v2's `Relationship` is `{_id, from, to, type}`. Each end is an entity, a file, or a text reference with
  `selections[]` and `text`. Nothing else: no author, no timestamp, no properties
  (`app/api/relationships.v2/model/Relationship.ts`, verified again).
- V1 `connections` rows are `{hub, entity, template, file, reference}`; a hub is a shared id with no centre and
  no member role. The Postgres port (PR #9776, merged 2026-09-24) copies that shape into a flat table. No graph
  engine and none planned as observed. A `gh` search on 2026-10-12 found no merged PR with "relationship" and
  "postgres" in the title after #9776 (a title search only; not a full review of the repo).
- The only multi-hop machinery in Uwazi is `MatchQueryNode` / `TraversalQueryNode`: fixed-depth trees used for
  denormalisation. Shortest paths would be new work. Apache AGE's `shortestPath` is unconfirmed and its only
  published timings (4 hops at 1.2M edges, 7 s) are four years old.

**Model.**
- A unit per view makes counts mean one thing. List counted references, Tree counted aggregates; the same group
  read 123 and 51.
- Hubs in CEJIL are stars with an arbitrary centre. 433 of 1,479 multi-member hubs have a centre of the same
  template as a member. Rafael Nieto Navia "signed with" 16 judges who only shared a Sentencia. Field ownership
  resolves 981; the export's `from` resolves 161 more; 336 stay unresolved and are shown as "Listed together
  with", never guessed.
- Path search must walk through hub centres, not raw edges. On raw edges v1's Velásquez Rodríguez to Godínez
  Cruz result was 6 steps, 6 routes; through centres it is 4 steps, 18 routes.
- Parallel routes fold to "any of N" per step. 146 routes between Velásquez Rodríguez and Mapiripán stay
  readable.
- Skip defaults (types that connect everything) are an admin setting pre-filled by a 5% degree heuristic, and the
  reader always sees the chips. Threshold was set from CEJIL alone.
- Relationships have no dates of their own. A connection is placed at the dates of the entity at the other end.
  The When lens says so and lists undated entities apart.
- Editing: only the owner of a field edits it; adding to a field adds a hub member; delete behind a confirm that
  states the consequence; undo through the Beacon.
- Filters belong to a trail step and reset when you step in (Obsidian's filter-and-depth failure, avoided).

**Data in the app.**
- The Sample had 0 edges between entities other than La Tablada until the v4 seed spec (51 entities, 33 hubs,
  94 references, 68 dated). That spec is built (`data/sampleSeedV4.ts`).

### 1.3 Decided

| Decision | Where | Status |
|---|---|---|
| Default lens: In the document when the entity has anchored passages, else Connections | v2 §1.1 | Prototype only. Superseded by v5 (tree default). |
| Hub centre: two rules, no guessing | v2 §1.2 | Prototype only. App still groups by `hubId`. |
| Tab count = distinct connected entities | v2 §1.5 | Not built. App tab count is `references.length` (`views/EntityView.tsx:74`). |
| Labels: "See connections", "Go to entity", "Following from" | v2 §1.4 | Based on 12 synthetic readers, a proxy. Hallway test not run. |
| Tree is the default; v4 lenses become "Advanced" | v5 audit | Static prototype only, steps 1 to 6 of 12. |
| Juan chose the static prototype, not the app tab | operator handoff 09-29 | Recorded. |
| Skip defaults per instance as an admin setting | v2 §1.3 | Not built. App has `pathSkipFor(corpus)` in code. |
| Backend shape: `hub_centres`, `entity_degree`, `POST /api/paths`, patterns, B1 to B7 | v3 §5 to 6 | Proposal. No backend work started. |

### 1.4 Juan's feedback: what is on record

I found four statements, all second-hand through handoffs and lane notes. There is no recorded verdict on the
three-lens model itself.

1. 09-28/29: keep the tree as the default for quick discovery; the v4 flow becomes "Advanced"; the tree "needs
   UI/UX enhancements", unspecified.
2. 09-29: chose the static prototype over the app tab. After v5 steps 1 to 6: "needs a bit of redesign", no
   specifics.
3. 10-05 (gap analysis header): the tool needs more power, with filters, nested filters and tools for research
   and OSINT; "relationships are complex but not useful".
4. 10-08 handoff: proposed next OSINT items 1 (annotate at the playhead in Sync), 3 (camera view cones over
   time), 5 (contradiction finder queue). Not started.

v3 §8 ("Juan's prototype feedback") was left as a placeholder and never filled.

### 1.5 Left open

| Open item | Source | Why it matters here |
|---|---|---|
| Two directions disagree: v5 makes Tree the default and keeps the four lenses behind Advanced; the 10-05 concept cuts Tree and Graph, adds a summary, and cuts Display, Density, Then by and Direction | v5 audit vs `concept.md` | One of them has to win before anything is built in the app. |
| Label test with 5 people | v2 §6 | The Explore / Open entity confusion is untested with real readers. |
| Restricted intermediates vs Uwazi's permission model | v2 §6, §4.3 | An OSINT tool that leaks a restricted record through a path is a failure. Needs a check with the Uwazi team. |
| The null-template row as hub creator (rule 2 of the centre rules) | v3 §5.2 | Unverified; B1 needs it. |
| AGE or app-level BFS at scale | v3 B7 | Spike not run. CEJIL (17k edges) is fine in memory; a large instance is unknown. |
| v5 steps 7 to 12; Design's four open questions (phone rows, meta far from title, CEJIL titles with literal " ...", count sharing a column) | v5 | Prototype is half done. |
| Tab count vs branch count disagree (31 vs 21) | v5 §1 point 4 | Investigators will read the mismatch as an error. |
| Evidence and contradiction were out of scope for v1 to v5 | all | See §3. |

---

## 2. What the app tab does today, against the prototype

Verified in code at `playground` d6a9557b.

### 2.1 App tab today

| Area | Today | File |
|---|---|---|
| Views | List (default for a new record), Tree, Graph, When | `ViewControls.tsx`, `atoms/filters.ts:10` |
| Group by | 8 axes plus a second level ("Then by") | `atoms/filters.ts` |
| One filter pipeline | cluster, relation type, anchoring, verification, As of, direction, target type, country, descriptor, inherited, search, then sort | `useFilteredReferences.ts` |
| Filters | drawer tab on Metadata, Relationships and Document views; slide-over for scoped surfaces; sheet on phones | `RelationshipsFiltersTab.tsx` |
| Link status | chip (confirmed / single source / disputed) and tenure years on each reference row; aggregates show "mixed" | `rows/RefStatus.tsx` |
| As of | filters `period` on the link; undated links stay | `utils/relationships.ts` `refHoldsAt` |
| Why we believe this | per-field source rows (sources, status, note, inferred) in the card head; Nepal only; lazy | `data/fieldEvidence.ts` |
| Claim evidence | publishers against supports / disputes / reports on, wire copies folded, strength bar, structured figure, conflicting figures | `ClaimEvidence.tsx`, `data/nepal/claimEvidence.ts` |
| Connect to… | shortest paths up to 4 hops or common neighbours; skip groups per corpus; each hop shows relation, status, quote; drawn in Graph | `ConnectToModal.tsx`, `utils/pathFinding.ts` |
| When | dated entities connected to this one on the Library's TimeSpine, year strip | `when/WhenBody.tsx` |
| Anchors | text quote with page tag; media time tag (Vegas) | `ReferenceRow.tsx`, `TimeTag` |
| Hubs | grouped by `hubId` with 2+ members; no centre | `utils/relationships.ts` `deriveHubs` |
| Notebook | pin from a row or pill; citation list (title, address, publisher, date, status, quote, page or time, stance) | `utils/notebookCitations.ts` |
| Network view | edge tooltips with type, quote, status (`pairEvidence`) | `data/network/graph.ts:237` |

### 2.2 Prototype (v1 to v5) vs app

| Feature | Static prototype | App |
|---|---|---|
| Lens model (Connections / Paths / In the document / When) | yes (v4, behind "Advanced" in v5) | no. When exists as a view; Paths exists as a modal |
| Tree default with Advanced switch | v5 steps 1 to 6 | no. Default is List |
| Hub centres, "Listed as … in", "Listed together with" | yes | no |
| Grouping by template field, derived groups with `↳ via` | yes | in Metadata only |
| Trail ("See connections"), peek, overlay "How this connects" | yes | no |
| Paths with skip chips, fold, pin | yes | partial: BFS with skip groups, no fold, no pin, no admin setting |
| Page strip for passages | yes (v2 to v3) | no (only a year strip in When) |
| Tab count as connected entities | yes | no (`references.length`) |
| Editing rules (hub-member add, owner edits, undo) | yes | no |
| Link status, tenure, As of, claim matrix, figures | not in the static prototype | yes |
| Notebook, saved views, citations export | not in the static prototype | yes |

**Reading.** The two lines of work did not meet. The static prototype fixed structure on CEJIL data; the app
gained evidence features on Nepal and Vegas data. v5's tree has no status chip, no tenure, no source list and no
quote display beyond what v4 showed; the app has all of them but still shows CEJIL's invented judge peers.

### 2.3 What reaches the tab from the data

Counts from the shipped corpora (`app/public/*-data/relationships.json`) and the Nepal seed.

| | Nepal | Vegas |
|---|---|---|
| References shipped | 5,302 | 1,655 |
| `verification` | all (1,102 confirmed, 3,663 single-source, 537 disputed) | all (697 / 954 / 4) |
| Verbatim quote or media anchor | 2,010 quotes; 11 with file and page | 871 media anchors with clock time |
| `date` / period | 131 shipped (169 in seed) | 0 |
| `sources[]` (which sources back the link) | in seed for all 5,302 (1 to 10 each; 1,384 have 2 or more); **not shipped** | n/a: provenance is separate references (`synced_by` 195, `geolocated_by` 374, `derived_from` 140, `published_in` 79) |
| `note` (how the sources were read) | in seed for 986; **not shipped** | n/a |
| Source `archived_url` | 0 of 922 filled | links only, nothing stored |
| Source `published` / `accessed` | 688 / 304 of 922 | n/a |
| `syndicated_from` | 89 of 922 | n/a |

What the app `Reference` carries beyond the ends: `relationType`, `direction`, `sourceSelection`,
`targetSelection`, `hubId`, `verification`, `period`, `mediaAnchor`, `createdAt` (`data/references.ts`).

---

## 3. Gaps for OSINT work, ranked by investigator value

### 3.1 What practitioners do that this tab does not

From `practice-scan.md` (pages opened; the file lists what could not be verified).

- **Evidence is a separate object from the claim.** FollowTheMoney (Aleph) keeps `proof` (a source document
  entity), `sourceUrl`, `publisher` and `recordId` on the link. Berkeley Protocol para 155 sets a collection
  record per item: URL, HTML source, full-page capture (the court minimum), embedded media and metadata,
  collector, time stamp, hash. Nobody stores the evidence only as text on the link.
- **Three clocks are kept apart:** when the relationship held (FtM `startDate`/`endDate`), when the source was
  published or uploaded, and when it was captured or first seen (`retrievedAt`, `first_seen`, Auto Archiver's
  "archive process timestamp"). The prototype's `period` is the first only.
- **Source and information are rated separately.** Admiralty: source A to F, information 1 to 6. Berkeley:
  source, item and content are three checks, and credibility, reliability and veracity are three terms. One
  verification state per link merges them.
- **Integrity is done at capture, per item,** with hash plus a signed or time-stamped record. Hunchly and
  Bellingcat both say a hash alone is not forensic proof.
- **Contradiction is a method, not a field.** ACH and Berkeley's corroboration test are procedures. No data model
  I opened has a "disputes" relation between a source and a link. A contradiction view in Uwazi would have no
  model to copy.
- **Graph tools keep link fields thin** (Maltego, Kumu, Graph Commons): type, direction, label, description,
  weight, free properties. Source, date and verification are user-made custom fields at best.
- **Audit is narrow:** Hunchly's `deletion.log`, Kumu's Activity feed on Pro, nomenklatura's merge judgements
  with `user` and `created_at`. Berkeley asks for user-action logging as an organisational control, with no
  schema.

### 3.2 Ranked gaps

Ranking is my judgement of how often an investigator meets the question and how costly a wrong answer is
(misattribution, an unsupported claim in a report). Feasibility is a separate column.

| # | Gap | Why it matters | Today in the app | Data | Backend |
|---|---|---|---|---|---|
| 1 | **Evidence behind a link is not inspectable.** A chip says "Confirmed" and the row shows one quote. The sources behind it cannot be opened. | An assertion without its sources cannot be checked or cited. FtM `proof`, Berkeley para 155. | Status chip, one quote (the `from` end's). `sources[]` and `note` dropped by the adapter. | In seed: 1 to 10 sources on all 5,302 references; 1,384 have 2 or more; 986 have a note | None needed for the prototype |
| 2 | **Contested links are not paired with what contests them.** "Disputed" says something conflicts, not with what. | Corroboration and contradiction are the core assessment (Berkeley 193 to 194, ACH). | Claim records have the matrix. Elsewhere a disputed chip and a facet. | 537 disputed references; only 63 have a note; 324 have a quote. 119 of 289 claims have both supports and disputes. Vegas: 4 disputed, 3 `contradicts` | None for claims. A link-to-link relation for non-claims needs a model decision |
| 3 | **Verification shows no basis, and source reliability is absent.** The rule (two independent publishers, wire copies once) lives in the build script and the claim matrix. | Berkeley separates source, item and content; Admiralty rates source and information apart. | Three states. Independence only in the claim matrix. `publisher_type` on all 922 sources, unused as a reliability signal. | Derivable from `sources[]`, `publisher`, `syndicated_from` (89) | None |
| 4 | **One clock.** Only `period` (169 references, all office tenure). No "what was reported by 9 September 18:00". | Chronolocation and "what was known when" are routine (Berkeley 191). | As of filters `period`. | 4,716 of 5,302 references have every source dated; 688 of 922 sources have `published`, 304 have `accessed` only | None |
| 5 | **No capture or custody record.** | The court minimum is URL, source and full-page capture with time (para 155). Living pages change. | Nothing on a source: 0 of 922 have `archived_url`. Vegas stores nothing. Files have no checksum. | None. 23 PDFs and 29 images are bundled unaltered, so a hash can be computed at build | File checksum, capture fields as Source properties (supported today as ordinary properties) |
| 6 | **Links can be wrong by construction in V1 data.** Hub stars with an arbitrary centre read as peers who "signed with" each other. | A false link in a report. Real Uwazi instances are V1 hubs. Nepal and Vegas carry no hub ids, so the defect does not show there. | `deriveHubs` by `hubId`, no centre. | CEJIL: 433 of 1,479 multi-member hubs | Centre derivation (v3 B1); null-template row unverified |
| 7 | **No per-link audit.** Who created the link, who set the status, when. | A second analyst or a court needs it (Berkeley 168 to 169; Hunchly deletion log). | `createdAt` exists on `Reference` and is `""` for every Nepal and Vegas reference (`data/nepal/profile.ts:102`, `data/vegas/profile.ts:144`). No author. | None | `Relationship` has no author or timestamp. Activity log records `POST /api/relationships/bulk` and `/api/references` per request with user and time, admin-only |
| 8 | **Analyst-added links carry no basis or rationale.** | An inference ("same person") is not a sourced assertion. | Edit mode adds a reference with a type. | n/a | Same as 7 |
| 9 | **Paths do not carry evidence strength or time.** Weakest link, time order, fold and pin are missing; skip groups are code. | A chain is as weak as its weakest link; a route that is out of order in time is not a route. | Connect to… lists status and quote per hop. | Enough | None (app-level BFS) |
| 10 | **No pivot with set algebra** ("who is in both A and B's links", save the result). | Maltego and Foundry make this the main verb. | Common neighbours inside Connect to…. Library chain facets. | Enough | None |

Ranks 1 to 4 need no backend and no new research data. Ranks 5, 7 and 8 do. Rank 6 is the only item from v1 to v5
that is a correctness problem for investigators; the rest of that work is navigation.

### 3.3 Where the app is already ahead of the field

Not a gap, but it limits what to copy: the claim matrix with wire copies folded, structured figures with an as-of
and conflicts between figures, quotes with page or clip offset, and the Notebook's citation export with stance.
The practice scan found no tool that does the first three on a link set.

---

## 4. Data-model needs

### 4.1 What a reference needs

Optional fields, in the style of `verification` and `period` (the Nepal README's precedent: prototype extensions,
not Uwazi fields).

| Field | Purpose | In seed | In app type | Uwazi v2 today |
|---|---|---|---|---|
| `sources: string[]` (Source entity ids) | Which records back the link (FtM `proof`) | Nepal: all 5,302. Vegas: as separate references (`synced_by` 195, `geolocated_by` 374, `derived_from` 140, `published_in` 79) | No | No home on a relationship |
| `note` | How the sources were read (FtM `summary`) | Nepal: 986 | No | No |
| status basis (derived, not stored) | Publishers, independent count, wire folds | Derivable | Partly, for claims (`claimEvidence.ts`) | n/a |
| `verifiedBy`, `verifiedAt`, `verifyNote` | Analyst override, who and when | None | No | No |
| `basis`: sourced / inferred / analyst | Separates assertion from inference | None | No | No |
| contradiction | Pairs a link with what contests it | Claims: stance relation types, `conflicts_with` (Nepal registry), `contradicts` and `supersedes` (Vegas) | Via claim matrix only | Stance can be a relationship type; a link cannot be the target of a link |
| `period` | When it held | 169 (Nepal) | Yes | No |
| reported-at, captured-at (derived from sources) | Second and third clock | Source `published` 688, `accessed` 304 | No | Entity properties, yes |
| `createdAt/By`, `editedAt/By` | Audit | None (`createdAt` is empty) | `createdAt` (string, empty for Nepal and Vegas) | Entities have `user`, `creationDate`, `editDate`; relationships have none |
| anchors | Where in the source | text quotes 2,010; media 871 | Yes | Text selections yes; media no |

### 4.2 What a Source record needs

These are ordinary template properties. Uwazi supports them today without backend work.

| Property | Seed | Note |
|---|---|---|
| `published`, `accessed`, `url`, `publisher`, `publisher_type`, `language`, `syndicated_from` | filled | `publisher_type` has 10 values (national-media 378, other 211, international-media 143, ngo 52, fact-check 43, wire 38 ...) |
| `archived_url` | 0 of 922 | Defined in the schema, never filled |
| `captured_at`, `content_hash`, `captured_by`, `capture_tool` | not defined | Berkeley 155(g to h); Auto Archiver: SHA-256 plus RFC 3161 token |
| `source_reliability` (select) | not defined | Optional. Only worth adding if someone will rate. |
| `access_status` (live / removed) | not defined | 171 living pages have no `published`, only `accessed` |

Uwazi's file record has `url`, `creationDate`, `size` and `mimetype`, and no checksum (`fileSchema.ts`, verified).

### 4.3 Blocked on data

| Need | State | Who |
|---|---|---|
| Counterparts and notes for disputed links | About 470 of 537 disputed references have no note | Research pass, Nepal |
| Archive copies and hashes for sources | 0 of 922. A capture pass is serial, third-party servers, caps apply (as with `recover-cejil-docs.cjs`) | Research, with Juan's go-ahead |
| Source reliability ratings | No scheme, no rater | Decision first |
| Dates on Vegas links | 0 | Probably not needed: media anchors carry clock to the second |
| Collector, capture time | Preserve (Juan's browser extension for tamper-evident capture, per the vault hub note) is the natural source. I did not look at its implementation. | Ask Juan |

### 4.4 What the Uwazi v2 backend can support

| Capability | Status |
|---|---|
| Source entities with any property; stance as relationship type with text anchor | Supported now (what Nepal does) |
| Filter a claim by a linked entity's property (`newRelationship` with `denormalizedProperty`) | Supported (from gap analysis, read in the clone) |
| Link-level fields | **No.** `Relationship` is `{_id, from, to, type}` plus pointers. V1 rows have a `metadata` JSON blob in the Mongo model and the Postgres table that is not in the validated connection schema. I found no API that writes link properties through it. Unverified. |
| Relationship author and timestamps | **No** |
| Request-level audit of link changes | Yes: activity log, admin page |
| File checksum | **No** |
| Hub centre | **No** (derive and cache: v3 B1) |
| Shortest path | **No.** App-level BFS (v3 B4). No newer relationship work in the repo as of 2026-10-12 (title search). |
| Reify a link (attach evidence to a link) | **No.** A relationship cannot be the target of a relationship. The only route is a Claim entity. |

### 4.5 Options for the evidence home in real Uwazi

| Option | What | Trade-off |
|---|---|---|
| A. Claim entities and Source entities | Nepal's model. Each evidenced assertion is a Claim; sources are linked by stance relationship types | Works today, no backend change. A `held_office` or `part_of` link has no entity to attach to; 5,302 links would become claims. |
| B. Side table keyed by relationship id | `{relationship_id, sources[], status, basis, note, verified_by, verified_at}` | Fits the Postgres port and the denormalisation job pipeline. New backend surface, needs permission and audit rules. |
| C. Properties on the relationship | Extend `Relationship` with a properties bag like entities | Most uniform. Largest change: relationship types have `{id, name}` only today. |

**Recommendation:** A for claims (already working), B for everything else, and keep the app's `Reference` fields
optional so the prototype does not decide it. This is a question for the Uwazi team; I did not ask them.

---

## 5. Phased path

Sizes follow v3: S about a day, M two to four days, L a week or more. Each phase leaves the tab working.

### Phase 1. Evidence behind every link (M)

Delivers: a link's evidence can be opened.
- Carry `sources[]` and `note` through `nepalReferencesFor` and the build into `Reference`.
- An evidence card from the status chip: each source (publisher, type, published or accessed date, link, quote
  with page or clip offset), the independent publisher count with wire copies folded (generalise
  `claimEvidence.ts` from claims to any reference), the note, the period.
- "Reported by" date filter beside As of, from the sources' published dates. References whose sources are
  undated stay and are counted, as As of does.
- Source facets on the link list (publisher type, language).
- Vegas: the card lists the link's `synced_by`, `geolocated_by`, `derived_from` references and the media anchor.
- Check before showing a derivation sentence: 14 confirmed references have fewer than two distinct publisher
  names, and 29 single-source references have two or more. Compare with `merge.py`'s rule first.

Depends on: nothing. Backend: none. Design: the row needs a slot for status, source count and date; v5's tree row
has none.

### Phase 2. Contested and corroborated (M, plus a Research pass)

Delivers: what is contested about an entity, and why.
- A "Contested" group or filter on the tab: disputed links paired with the opposite-stance sources, conflicting
  figures (existing), and `supersedes` (Vegas 58 to 60).
- The Library Evidence view's logic applied to any entity's claims, not only the claim record.
- Optional `source_reliability` on Source, shown on the card next to the corroboration count, kept apart.
- Vegas: sync outliers (more than 2 s from the moment's median, from `syncAnalysis.ts`) as contested anchors.
  This is the 10-08 "contradiction finder" item.

Depends on: Phase 1 card. Data: Research pass for about 470 disputed references. Backend: none for claims.

### Phase 3. The v1 to v5 structure, in the app (L, three parts)

- **3a Correctness (M):** hub centres, "Listed together with", tab count as connected entities (v3 F1, F5).
  Do this first within the phase; it is a correctness fix.
- **3b Navigation (L):** tree default, level 3, trail, Advanced switch (v5 steps 7 to 12, then app tickets F3 to
  F7). The tree row is redesigned against the Phase 1 card.
- **3c Paths (M):** weakest-link status along a path, time ordering (v4 direction 3), fold and pin, skip defaults
  as a visible setting.

Depends on: Juan's call on direction (decision 1). Backend: none for the prototype; v3 B1 to B7 for real
instances.

### Phase 4. Custody, audit and analyst links (M prototype, L with backend)

- Build-time SHA-256 and size for the 23 bundled PDFs and 29 images, shown with their provenance.
- Source template gains `archived_url`, `captured_at`, `content_hash`, `access_status`.
- Analyst-added links carry `basis`, a rationale, and need a source to rise above single-source; the card shows
  who and when. The Settings activity log (`atoms/activityLog.ts`) extends to links.
- Backend request: author and timestamps on relationships, link evidence (option B), file checksum.

Depends on: decisions 5 to 7. Data: a capture pass is a project of its own.

### Order, and why

1 then 2 then 3, with 4 starting in parallel as a data and backend conversation. Evidence first because the
data exists, no backend is needed, and Phase 3's tree row should be designed with the evidence slot already
known. If Juan wants CEJIL correctness first, 3a can move ahead of Phase 2 at no cost to Phase 1.

---

## 6. Decisions for Juan

| # | Decision | Recommendation |
|---|---|---|
| 1 | Tab direction: v5 (tree default, v4 lenses behind Advanced) or the 10-05 concept (summary first; cut Tree, Graph, Display) | Keep the tree default as he said. Put status, source count and date on the row, and the evidence card behind the chip. Do not put evidence behind Advanced. |
| 2 | Build in the app or in the static prototype | The app. The evidence data (Nepal, Vegas) is in the app; the static prototypes carry CEJIL and Sample only. |
| 3 | Order: evidence before structure | Yes (§5). |
| 4 | Verification vocabulary | Keep confirmed / single source / disputed. Show the basis. Add an optional source-reliability select only if someone will rate. Do not adopt a 6 by 6 grid. |
| 5 | Capture and custody: run a capture pass; relation to Preserve | Compute hashes on bundled files now. Ask whether Preserve records can carry hash, time and collector into Uwazi files before any capture pass. |
| 6 | Where link evidence lives in real Uwazi | Option B (§4.5) for non-claims. Ask the Uwazi team; keep fields optional meanwhile. |
| 7 | Who may set or override a link's status, and whether an analyst status can exceed the derived one | Record who and when always. Analyst status may not exceed the derived one without a note. Needs his call on roles. |
| 8 | Vocabulary: add "evidence" (the sources behind a reference) and "reported by" to the CLAUDE.md table; the card shows counts, so the "tab count is the only number" rule needs an exception for the card, as the 10-05 concept already noted | Yes to both. |

---

## 7. Not verified

- I did not run the app or open the static prototypes in a browser this session. App behaviour is from code at
  d6a9557b and from the shipped JSON.
- Seed and shipped counts differ: the Nepal README says 5,319 references; `references.json` and the shipped file
  have 5,302. Counts here use the files.
- v1 to v5 figures (433 / 1,479 hubs, 981 / 161 / 336, route counts) are from the documents, not re-measured.
- The 14 and 29 derivation mismatches use distinct publisher-name strings, not `merge.py`'s full rule.
- Uwazi's permission model for restricted intermediates, the null-template hub creator, the `metadata` blob on V1
  rows, AGE behaviour, and Preserve's implementation were not checked.
- The practice scan could not open i2 or Palantir provenance pages, and the Hunchly guide is from 2018. See
  `practice-scan.md`.
