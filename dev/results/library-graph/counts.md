# Library graph view: measured counts

Playground `79e565e1`. Read-only measurement: no app changes, no commits. Scripts and raw output are beside this file (`dev/results/library-graph/`); rerun with `node dev/results/library-graph/analyze.mjs`, `full.mjs`, `experiments.mjs`, `layout-time.mjs`. `experiments.mjs` and `layout-time.mjs` load d3-force, graphology, graphology-layout-forceatlas2 and graphology-communities-louvain from a scratch install (the `SP` path at the top of each file); nothing was added to the app's package.json. The Sample is read from `sample-seed.json`, produced by bundling `sample-entry.ts` with esbuild.

## Headline

- **The whole collection is one connected component in every corpus**: CEJIL 4,395 of 4,398 nodes (99.9%), Nepal 1,949 of 2,124 (91.8%), Sample 103 of 104 (99.0%). A graph of the whole Library does not split into many separate clusters by connectivity. It is one dense network, connected mainly through a few very high-degree records (CEJIL's Corte IDH has 2,739 neighbours; Nepal's "Police fire on protesters at Parliament and New Baneshwar" has 197).
- **Filtered sets are small enough**: of 45 filter combinations, 25 (56%) have 100 results or fewer, 37 (82%) have 300 or fewer, 44 (98%) have 1,000 or fewer. The unfiltered Library is 4,398 (CEJIL), 2,124 (Nepal) and 104 (Sample) nodes.
- **They are not dense inside.** In 44 of 45 sets there are more edges to records outside the filter than between results. Median edges per result: CEJIL 0.11 inside vs 5.5 outside; Nepal 0.86 vs 5.0; Sample 0.33 vs 3.0. In CEJIL, 6 of 16 sets have no edge at all between their results and the median set is 93% isolated nodes.
- **Whole-library graph**: draw it on canvas (CEJIL 4,398 nodes and 16,585 edges is past what SVG can hold), lay it out once in a worker or ahead of time (CEJIL: 3.4 s for 300 d3-force ticks in Node), and make filters **dim in place** rather than remove. Details and the numbers behind them are in "Drawing the whole Library" below.
- **Cap**: no node cap for the whole-library canvas up to about 10,000 nodes (assumed, see below). For any mode that removes nodes or runs SVG: 300 on SVG, 1,000 on canvas, above that fall back to dimming.

## What was counted

- **Nodes**: the records the Library lists for each corpus. CEJIL: the 4,398 Spanish records (the other 8,796 are translations of the same shared ids). Nepal: all 2,124. Sample: the 104 entities of `data/entities.ts`; Travesía and the artworks corpora are separate and not measured.
- **Edges**: stored references, grouped the way `deriveRelationships` groups them, but over the whole corpus instead of one focused record. An *edge* below is a distinct unordered pair of records. A *relationship* is a (pair, relationship type), which is what `deriveRelationships` emits per target; the two differ only where the same pair carries two types or both directions (CEJIL 16,585 pairs, 16,998 references; Nepal 4,981 pairs, 5,302 references; Sample 137 pairs, 517 references). Hub membership is flattened to pairs, as the existing graph does (`includeHubMembers: true`). CEJIL hubs are stars (one `from`, N `to`), so no member-to-member edges appear.
- **Inside / outside**: inside means both ends are in the filtered set. Outside means exactly one end is. "Non-hub" outside neighbours exclude the high-degree records (degree ≥ 100 in CEJIL, ≥ 50 in Nepal, ≥ 20 in Sample), which are 31 records in CEJIL, 10 in Nepal and 2 in the Sample, listed under each corpus below.
- **Isolated**: a result with no edge to another result. It may still have links to the outside.
- **Sample**: 33 of its 550 references point at nine ids that are not entities (`e-missing-1…9`). They are dropped here; the Library could not draw them as nodes either.
- **Filter semantics** are approximated from `utils/libraryFilter.ts`: template and property facets are exact matches on the record's data; the date range uses the record's date (CEJIL's `createdOf` rule, geolocated records borrow their case's date; Nepal records overlap by span); search is a folded AND of words over title and all metadata labels, with full-text search off. Search on the real Library also reads quotes and descriptors through `entitySearchFields`, so a few hit counts will differ by a few records. Nothing here depends on those small differences.
- The 45 combinations are my picks of what a researcher would do, not a random sample. They lean toward narrow, single-purpose sets.

## Part 1: filtered sets

### Sample (104 nodes, 137 edges)

| Filter | Results | Edges inside | Relationships inside | Edges to outside | Inside share | Components (with ≥2 nodes) | Isolated | Largest component | Max degree inside | Outside non-hub neighbours | Results + all outside neighbours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Template: Hearing | 48 | 0 | 0 | 48 | 0% | 48 (0) | 48 | 1 | 0 | 0 | 49 |
| Template: Person | 13 | 0 | 0 | 39 | 0% | 13 (0) | 13 | 1 | 0 | 13 | 28 |
| Template: Court case | 5 | 4 | 13 | 59 | 6% | 1 (1) | 0 | 5 | 4 | 49 | 55 |
| Template: Judgment | 4 | 0 | 0 | 18 | 0% | 4 (0) | 4 | 1 | 0 | 8 | 13 |
| Template: Document | 7 | 0 | 0 | 6 | 0% | 7 (0) | 7 | 1 | 0 | 0 | 8 |
| Court case + Judgment + Person | 22 | 37 | 98 | 50 | 43% | 1 (1) | 0 | 22 | 21 | 32 | 55 |
| Person + Organization | 18 | 6 | 6 | 90 | 6% | 12 (3) | 9 | 4 | 3 | 60 | 79 |
| Published only | 92 | 109 | 230 | 25 | 81% | 2 (1) | 1 | 91 | 51 | 12 | 104 |
| Restricted only | 12 | 3 | 3 | 25 | 11% | 9 (2) | 7 | 3 | 2 | 8 | 22 |
| Date 2023-06-01 – 2023-08-31 | 34 | 33 | 103 | 86 | 28% | 4 (1) | 3 | 31 | 20 | 70 | 104 |
| Search: "Argentina" | 1 | 0 | 0 | 5 | 0% | 1 (0) | 1 | 1 | 0 | 4 | 6 |
| Search: "Tablada" | 3 | 2 | 11 | 53 | 4% | 1 (1) | 0 | 3 | 2 | 49 | 53 |

### CEJIL (4,398 nodes, 16,585 edges)

| Filter | Results | Edges inside | Relationships inside | Edges to outside | Inside share | Components (with ≥2 nodes) | Isolated | Largest component | Max degree inside | Outside non-hub neighbours | Results + all outside neighbours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Template: Causa | 337 | 0 | 0 | 3,092 | 0% | 337 (0) | 337 | 1 | 0 | 2,661 | 3,011 |
| Template: Sentencia de la CorteIDH | 409 | 0 | 0 | 2,181 | 0% | 409 (0) | 409 | 1 | 0 | 551 | 990 |
| Template: Resolución de la CorteIDH | 1,084 | 118 | 118 | 5,337 | 2% | 966 (29) | 937 | 20 | 10 | 533 | 1,647 |
| Template: Juez y/o Comisionado | 137 | 397 | 498 | 4,615 | 8% | 39 (1) | 38 | 99 | 28 | 2,699 | 2,849 |
| Template: Audiencia | 257 | 1 | 1 | 778 | 0% | 256 (1) | 255 | 2 | 1 | 183 | 455 |
| Causa + País Colombia | 29 | 0 | 0 | 313 | 0% | 29 (0) | 29 | 1 | 0 | 275 | 305 |
| Sentencia + País Guatemala | 48 | 0 | 0 | 266 | 0% | 48 (0) | 48 | 1 | 0 | 71 | 137 |
| Any template + País Perú | 710 | 1,404 | 1,404 | 1,739 | 45% | 1 (1) | 0 | 710 | 709 | 438 | 1,165 |
| Causa + Sentencia + País Perú | 148 | 91 | 91 | 847 | 10% | 57 (50) | 7 | 5 | 4 | 437 | 601 |
| Date 2010–2014, any template | 966 | 627 | 628 | 3,851 | 14% | 429 (75) | 354 | 40 | 39 | 871 | 1,862 |
| Sentencia + date 2005–2012 | 136 | 0 | 0 | 724 | 0% | 136 (0) | 136 | 1 | 0 | 218 | 381 |
| Descriptor: Desaparición forzada | 56 | 2 | 2 | 562 | 0% | 54 (2) | 52 | 2 | 1 | 486 | 553 |
| Causa + descriptor Ejecución extrajudicial | 56 | 0 | 0 | 562 | 0% | 56 (0) | 56 | 1 | 0 | 481 | 549 |
| Search: "desaparicion forzada" | 84 | 11 | 11 | 752 | 1% | 73 (11) | 62 | 2 | 1 | 642 | 737 |
| Search: "masacre" | 156 | 137 | 137 | 559 | 20% | 22 (12) | 10 | 26 | 19 | 148 | 326 |
| Search: "Mapiripán" | 16 | 15 | 15 | 49 | 23% | 1 (1) | 0 | 16 | 9 | 3 | 32 |

### Nepal (2,124 nodes, 4,981 edges)

| Filter | Results | Edges inside | Relationships inside | Edges to outside | Inside share | Components (with ≥2 nodes) | Isolated | Largest component | Max degree inside | Outside non-hub neighbours | Results + all outside neighbours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Template: Event | 180 | 176 | 179 | 1,808 | 9% | 43 (12) | 31 | 108 | 23 | 1,072 | 1,258 |
| Template: Casualty | 73 | 0 | 0 | 308 | 0% | 73 (0) | 73 | 1 | 0 | 48 | 124 |
| Template: Claim | 289 | 22 | 31 | 1,374 | 2% | 267 (18) | 249 | 4 | 3 | 572 | 871 |
| Template: Action | 184 | 44 | 51 | 887 | 5% | 140 (21) | 119 | 8 | 5 | 466 | 660 |
| Template: Source | 922 | 1 | 1 | 2,167 | 0% | 921 (1) | 920 | 2 | 1 | 983 | 1,915 |
| Template: Media item | 104 | 0 | 0 | 440 | 0% | 104 (0) | 104 | 1 | 0 | 261 | 374 |
| Event + Verification: Confirmed | 96 | 83 | 84 | 1,103 | 7% | 25 (6) | 19 | 63 | 16 | 719 | 823 |
| Claim + Verification: Disputed | 140 | 17 | 26 | 696 | 2% | 123 (14) | 109 | 4 | 3 | 343 | 492 |
| Verification: Disputed, any template | 189 | 124 | 135 | 1,179 | 10% | 78 (22) | 56 | 74 | 37 | 628 | 825 |
| Casualty + district contains Kathmandu | 12 | 0 | 0 | 68 | 0% | 12 (0) | 12 | 1 | 0 | 23 | 37 |
| Event + type Arson or vandalism | 39 | 44 | 44 | 356 | 11% | 3 (1) | 2 | 37 | 20 | 279 | 326 |
| Event + date 8–9 Sep 2025 | 92 | 111 | 112 | 1,067 | 9% | 10 (1) | 9 | 83 | 23 | 747 | 844 |
| Any template + date 8–9 Sep 2025 | 437 | 660 | 717 | 1,228 | 35% | 23 (8) | 15 | 407 | 87 | 616 | 1,058 |
| Any template + date 10 Sep–31 Dec 2025 | 518 | 487 | 578 | 1,208 | 29% | 171 (56) | 115 | 199 | 26 | 418 | 946 |
| Event + Action + date Sep 2025 | 226 | 257 | 286 | 1,695 | 13% | 29 (2) | 27 | 197 | 37 | 944 | 1,176 |
| Search: "curfew" | 89 | 123 | 127 | 426 | 22% | 7 (4) | 3 | 70 | 14 | 270 | 367 |
| Search: "Singha Durbar" | 46 | 46 | 49 | 322 | 13% | 8 (1) | 7 | 39 | 17 | 255 | 309 |

Column notes. *Inside share* is edges inside ÷ (edges inside + edges to outside). *Max degree inside* counts distinct neighbours among the results only. *Results + all outside neighbours* is the node count if every one-hop neighbour were drawn too.

## Part 2: how many sets fall under each size

| Corpus | Combinations | ≤ 100 results | ≤ 300 | ≤ 1,000 | Largest set |
|---|---:|---:|---:|---:|---:|
| Sample | 12 | 12 | 12 | 12 | 92 |
| CEJIL | 16 | 6 | 11 | 15 | 1,084 |
| Nepal | 17 | 7 | 14 | 17 | 922 |
| All | 45 | 25 (56%) | 37 (82%) | 44 (98%) | |

If the outside neighbours were drawn as nodes too (results + one hop), the shares fall: sets at or under 300 nodes are 12/12 (Sample), 2/16 (CEJIL), 2/17 (Nepal); at or under 1,000 they are 12/12, 11/16, 13/17. So a 300-node cap works for the results alone but not for results plus neighbours. The only CEJIL set over 1,000 results is the Resolución template (1,084); the largest Nepal set is Source (922).

## Part 3: are the edges inside the results worth drawing?

Mostly not, with two exceptions.

- **CEJIL**: edges run between templates (Causa to its Sentencias, Resoluciones and Audiencias; documents to Jueces, Países and the two Organismos), almost never within one. Any single-template filter has no edge between its results (Causa, Sentencia, Audiencia: 0 or 1) except Juez (397 edges inside, from judge-to-judge Firmantes links) and Resolución (118, Resolución to Resolución links). The sets with many inside edges are star-shaped: "any template + País Perú" has 1,404 edges inside, but 709 of the 710 results connect to the single Perú record; without the two hub records in the set, 688 edges and 49 components remain. Genuinely structured CEJIL sets are the topical ones: "masacre" (156 results, 137 edges, 22 components, largest 26) and "Mapiripán" (16 results, 15 edges, one component).
- **Nepal**: events chain to each other (`part_of`, `led_to`): 180 events have 176 edges among them, and the largest component holds 108. Date-range sets are the densest (8–9 Sep 2025: 437 results, 660 edges, largest component 407). These are worth drawing. Claims, sources, casualties and media items, filtered alone, are nearly edgeless (Source 922 results, 1 edge; Casualty 73 results, 0 edges), because they link to events, actions, people and organisations, not to each other.
- **Sample**: inside edges come from sets that contain a hub record (La Tablada or the Commission: Published only 109 edges, a date range 33) or the court case / judgment / person cluster (22 results, 37 edges). Hearings, documents and judgments filtered alone have none.

Across all 45 sets the edges to the outside outnumber the edges inside in 44 and are at least five times as many in 36. Most of the structure of a filtered set is its links to records outside the filter. Of those outside links, hub records take a large share in CEJIL (median 2.4 hub links per result against 1.6 non-hub neighbours per result), and a small one in Nepal (0.6 against 2.5).

## Part 4: relationship types

### Sample

| Relationship type | References | Share | Relationships (target, type) | Nodes touched | Max degree on one node |
|---|---:|---:|---:|---:|---|
| relates_to | 116 | 22.4% | 44 | 45 | 116 (Case 11.137 (La Tablada)) |
| mentions | 97 | 18.8% | 42 | 43 | 97 (Case 11.137 (La Tablada)) |
| cites | 87 | 16.8% | 43 | 44 | 87 (Case 11.137 (La Tablada)) |
| refers_to | 85 | 16.4% | 41 | 42 | 85 (Case 11.137 (La Tablada)) |
| hearing_of | 48 | 9.3% | 48 | 49 | 48 (Inter-American Commission) |
| no_label | 41 | 7.9% | 30 | 30 | 39 (Case 11.137 (La Tablada)) |
| signed_by | 11 | 2.1% | 11 | 9 | 3 (La Tablada Attack) |
| nationality | 9 | 1.7% | 9 | 15 | 4 (Argentina) |
| victim | 6 | 1.2% | 6 | 8 | 4 (Case 11.137 (La Tablada)) |
| respondent_state | 5 | 1.0% | 5 | 10 | 1 (Case 11.137 (La Tablada)) |
| petitioner | 4 | 0.8% | 4 | 5 | 2 (Case 11.137 (La Tablada)) |
| judgment_of | 4 | 0.8% | 4 | 8 | 1 (Case 11.137 (La Tablada)) |
| member_of | 4 | 0.8% | 4 | 7 | 2 (Amnesty International) |

The four generic types (`relates_to`, `mentions`, `cites`, `refers_to`) plus `no_label` are 426 of 517 references (82%), and all of them fan out of one record, Case 11.137 (La Tablada), which has 52 neighbours and 432 references. They repeat on the same ~45 pairs, so one line per pair removes the weight: without those five types the Sample has 91 edges instead of 137.

### CEJIL

| Relationship type | References | Share | Relationships (target, type) | Nodes touched | Max degree on one node |
|---|---:|---:|---:|---:|---|
| (untyped) | 5,054 | 29.7% | 5,054 | 3,035 | 1,066 (Corte Interamericana de Derechos Humanos) |
| Firmantes | 3,099 | 18.2% | 2,868 | 965 | 236 (Eduardo Ferrer Mac-Gregor Poisot) |
| País | 2,835 | 16.7% | 2,835 | 2,857 | 462 (Perú) |
| CorteIDH | 2,302 | 13.5% | 2,302 | 2,608 | 23 (Determinados Centros Penitenciarios) |
| Mecanismo | 1,885 | 11.1% | 1,885 | 1,887 | 1,459 (Corte Interamericana de Derechos Humanos) |
| CIDH | 668 | 3.9% | 668 | 946 | 9 (Diecisiete personas privadas de libertad) |
| Geolocalización de los hechos del caso | 334 | 2.0% | 334 | 655 | 4 (Terrones Silva y otros) |
| Votos separados | 262 | 1.5% | 262 | 429 | 5 (Granier y otros (RCTV). Sentencia de 22 de junio) |
| Relacionado a | 203 | 1.2% | 203 | 210 | 196 (Corte Interamericana de Derechos Humanos) |
| Firmante Voto separado | 171 | 1.0% | 146 | 88 | 47 (Antonio A. Cançado Trindade) |
| Medidas de Protección | 81 | 0.5% | 81 | 159 | 2 (Penal Miguel Castro Castro) |
| Multi Select | 57 | 0.3% | 49 | 21 | 11 (José Jesús Orozco Henríquez) |
| Paises | 47 | 0.3% | 47 | 31 | 29 (Comisión Interamericana de Derechos Humanos) |

Five types are 89% of references: untyped (29.7%), Firmantes (18.2%), País (16.7%), CorteIDH (13.5%), Mecanismo (11.1%). The swamping comes from what the types point at, not from the type name:

- **Mecanismo** (1,885 references, all document → Organismo) and **País** (2,835, document → one of 30 País records) are classification edges. 1,459 Mecanismo edges end at one record (Corte IDH) and 462 País edges at Perú. The *untyped* group has the same shape in part: 1,066 untyped references end at Corte IDH, and 365 + 353 + 291 + 282 are Organismo or País → Resolución/Sentencia.
- 31 records have 100 or more neighbours (2 Organismos, 13 Países, 16 Jueces y/o Comisionados). Together they touch 10,752 of 16,585 edges (65%).
- Taking those out of the picture does not make the graph break up: without all edges of type Mecanismo, País, Paises and "Relacionado a" (4,970 references, 29%) the giant component is still 99.2%; without also the untyped group (another 5,054) it is 81.9%; without also Firmantes, "Firmante Voto separado" and Multi Select it is 4.5% (largest 198) in 817 components. Removing the 32 País and Organismo *nodes* leaves 4,311 of 4,366 connected; also removing the 137 Juez records leaves 391 components with the largest at 258 nodes; also removing the 337 Causa records leaves 2,744 components with the largest at 31.
- Reading: the natural unit of a CEJIL cluster is a Causa and its documents. Mecanismo, País and the judge links are what connect all cases into one network.

Default for CEJIL: **Mecanismo, País, Paises and "Relacionado a" off** (they hold 29% of references and add no case-to-case information that the País and Organismo facets do not already give). Leave the untyped group and Firmantes on: untyped also carries Causa → document links that cannot be told apart by type (the "untyped" label is the corpus's missing type, not one relationship), and Firmantes are the only judge-to-document links.

### Nepal

| Relationship type | References | Share | Relationships (target, type) | Nodes touched | Max degree on one node |
|---|---:|---:|---:|---:|---|
| reports_on | 1,450 | 27.3% | 1,450 | 1,339 | 45 (45 victims of Gen Z protests declared martyrs [W) |
| concerns | 495 | 9.3% | 495 | 453 | 63 (Police fire on protesters at Parliament and New ) |
| supports | 418 | 7.9% | 418 | 486 | 11 (Curfew from 12 30 pm) |
| involved | 398 | 7.5% | 398 | 270 | 26 (KP Sharma Oli) |
| claimed_by | 283 | 5.3% | 283 | 413 | 11 (KP Sharma Oli) |
| targets | 277 | 5.2% | 277 | 270 | 21 (Police fire on protesters at Parliament and New ) |
| disputes | 247 | 4.7% | 247 | 329 | 6 (Rajyalaxmi Chitrakar, wife of former prime minis) |
| depicts | 237 | 4.5% | 237 | 191 | 14 (Federal Parliament building (International Conve) |
| issued_by | 224 | 4.2% | 224 | 270 | 21 (Office of the Prime Minister and Council of Mini) |
| occurred_at | 179 | 3.4% | 179 | 205 | 30 (Kathmandu) |
| in_response_to | 145 | 2.7% | 145 | 175 | 30 (Police fire on protesters at Parliament and New ) |
| held_office | 112 | 2.1% | 97 | 119 | 23 (Office of the Prime Minister and Council of Mini) |
| published_in | 109 | 2.1% | 109 | 211 | 2 (Euronews No Comment: Nepali army lifts curfew as) |
| part_of | 102 | 1.9% | 102 | 102 | 23 (Arson and looting wave across Nepal, 9 September) |
| casualty_of | 102 | 1.9% | 102 | 78 | 50 (Police fire on protesters at Parliament and New ) |
| located_in | 96 | 1.8% | 96 | 94 | 38 (Kathmandu) |

No single type swamps Nepal: the largest, `reports_on` (source → event/action/person), is 27.3% of references, and no type puts more than 63 references on one record. The swamping comes from records, not types: 10 records have 50 or more neighbours (the Parliament shooting 197, the 8 September protests 106, KP Sharma Oli 106, the 9 September arson 87, Kathmandu 76, Nepal Police 65, Sushila Karki 65, Nepali Army 59, Prison breaks 53, the Prime Minister's office 53) and touch 857 of 4,981 edges (17%).

Types that connect only the evidence layer to the rest (`reports_on`, `supports`, `disputes`, `concerns`, `depicts`, `claimed_by`, `published_in`, `documents`: 3,301 references, 62%) would leave the actor/event structure when off, but also leave sources, claims and media as isolated points (isolated nodes go from 162 to 1,249). Default for Nepal: **all types on**; offer an "Evidence" group toggle (sources, claims, media and their types) rather than switching individual types off.

## Part 5: the whole collection, per corpus

### Sample

- 104 nodes, 137 edges (517 references), average degree 2.6, median 1.
- Components: 2. Largest 103 (99.0%). Isolated records: 1 (the unlinked memo).

| Component size | Components | Nodes |
|---|---:|---:|
| 1 | 1 | 1 |
| 2–5 | 0 | 0 |
| 6–50 | 0 | 0 |
| 51–500 | 1 | 103 |
| >500 | 0 | 0 |

- Without the two hub records (the Inter-American Commission, 53 neighbours, which carries the 48 hearings; La Tablada, 52): 73 components, 71 isolated, largest 29 (28%).
- Template pairs (13 of 45 possible connect): hearing — organization 48; court_case — person 15; country — court_case 11; judgment — person 11; country — person 9; court_case — right 7.
- Louvain communities: 5 (sizes 49, 35, 11, 8, 1).

Top 20 by number of neighbours:

| # | Record | Template | Neighbours | References |
|---:|---|---|---:|---:|
| 1 | Inter-American Commission | organization | 53 | 66 |
| 2 | Case 11.137 (La Tablada) | court_case | 52 | 432 |
| 3 | Roberto Cárdenas | person | 5 | 12 |
| 4 | Argentina | country | 5 | 13 |
| 5 | Case 11.481 (Gelman) | court_case | 5 | 9 |
| 6 | Case 12.250 (Bámaca Velásquez) | court_case | 5 | 7 |
| 7 | Velásquez Rodríguez Judgment | judgment | 5 | 9 |
| 8 | Bámaca Velásquez Judgment | judgment | 5 | 11 |
| 9 | Beatriz Morales | person | 4 | 11 |
| 10 | Elena Ríos | person | 4 | 10 |
| 11 | Manuel Ortega | person | 4 | 13 |
| 12 | Sofía Reyes | person | 4 | 10 |
| 13 | La Tablada Attack | judgment | 4 | 15 |
| 14 | Gelman v. Uruguay Ruling | judgment | 4 | 11 |
| 15 | Carlos Mendoza | person | 3 | 12 |
| 16 | Ana Velázquez | person | 3 | 13 |
| 17 | Jorge Fuentes | person | 3 | 6 |
| 18 | Guatemala | country | 3 | 13 |
| 19 | Case 12.045 (Velásquez Rodríguez) | court_case | 3 | 14 |
| 20 | Amnesty International | organization | 3 | 9 |

### CEJIL

- 4,398 nodes, 16,585 edges (16,998 references), average degree 7.5, median 4.
- Components: 4. Largest 4,395 (99.9%). Isolated records: 3.
- Degree: ≥ 10 neighbours for 367 records, ≥ 25 for 71, ≥ 100 for 31, ≥ 500 for 5.

| Component size | Components | Nodes |
|---|---:|---:|
| 1 | 3 | 3 |
| 2–5 | 0 | 0 |
| 6–50 | 0 | 0 |
| 51–500 | 0 | 0 |
| >500 | 1 | 4,395 |

- Removing the 31 records with ≥ 100 neighbours (they hold 10,752 edges, 65%): 147 components, 80 isolated, largest 3,817 (87%). The hubs are not the only glue.
- Template pairs: 67 of 171 possible (18 templates, counting a template with itself) connect. Largest: Juez y/o Comisionado — Resolución de la CorteIDH 1,987; Organismo — Resolución de la CorteIDH 1,084; País — Resolución de la CorteIDH 1,084; Juez y/o Comisionado — Sentencia de la CorteIDH 737; Causa — Resolución de la CorteIDH 668.
- Louvain communities (on all types): 25, 18 of them with 50 or more nodes, sizes 603, 495, 426, 424, 337, 304, 291, 289, 174, 168, 159, 129 …; computed in 17 ms. A community mixes templates (a record's template matches its community's majority template for 27% of records), so a community is a group of related cases and documents, not a template.

Top 20 by number of neighbours:

| # | Record | Template | Neighbours | References |
|---:|---|---|---:|---:|
| 1 | Corte Interamericana de Derechos Humanos | Organismo | 2,739 | 2,739 |
| 2 | Perú | País | 711 | 711 |
| 3 | Comisión Interamericana de Derechos Humanos | Organismo | 704 | 704 |
| 4 | Guatemala | País | 511 | 511 |
| 5 | Colombia | País | 507 | 507 |
| 6 | Eduardo Ferrer Mac-Gregor Poisot | Juez y/o Comisionado | 417 | 440 |
| 7 | Venezuela | País | 385 | 385 |
| 8 | Diego García-Sayán | Juez y/o Comisionado | 360 | 387 |
| 9 | Argentina | País | 339 | 339 |
| 10 | Humberto Antonio Sierra Porto | Juez y/o Comisionado | 325 | 346 |
| 11 | Ecuador | País | 316 | 316 |
| 12 | Sergio García Ramírez | Juez y/o Comisionado | 312 | 349 |
| 13 | Antonio A. Cançado Trindade | Juez y/o Comisionado | 311 | 356 |
| 14 | Manuel E. Ventura Robles | Juez y/o Comisionado | 280 | 307 |
| 15 | Cecilia Medina Quiroga | Juez y/o Comisionado | 217 | 235 |
| 16 | Honduras | País | 200 | 200 |
| 17 | Margarette May Macaulay | Juez y/o Comisionado | 196 | 225 |
| 18 | México | País | 195 | 195 |
| 19 | Brasil | País | 191 | 191 |
| 20 | Roberto de Figueiredo Caldas | Juez y/o Comisionado | 185 | 194 |

### Nepal

- 2,124 nodes, 4,981 edges (5,302 references), average degree 4.7, median 3.
- Components: 168. Largest 1,949 (91.8%). Isolated records: 162. Components of 2–5 nodes: 5.
- Degree: ≥ 10 neighbours for 192 records, ≥ 25 for 38, ≥ 50 for 10, ≥ 100 for 3.

| Component size | Components | Nodes |
|---|---:|---:|
| 1 | 162 | 162 |
| 2–5 | 5 | 13 |
| 6–50 | 0 | 0 |
| 51–500 | 0 | 0 |
| >500 | 1 | 1,949 |

- Removing the 10 records with ≥ 50 neighbours (857 edges, 17%): 193 components, 173 isolated, largest 1,865 (88%).
- Template pairs: 37 of 45 possible (9 templates, counting a template with itself) connect. Largest: claim — source 689; event — source 547; action — source 270; claim — event 263; action — organisation 262; event — organisation 252.
- Louvain communities: 190, of which 28 have more than one node and 12 have 50 or more (sizes 248, 246, 230, 163, 156, 153, 136, 94, 83, 66 …); 162 of the 190 are single isolated records. Template match for 44% of records.
- The 162 isolated records are 156 sources (of 922) and 6 organisations: records with no reference to or from any other record.

Top 20 by number of neighbours:

| # | Record | Template | Neighbours | References |
|---:|---|---|---:|---:|
| 1 | Police fire on protesters at Parliament and New Baneshwar | nepal_event | 197 | 216 |
| 2 | Gen Z protests in Kathmandu and other cities, 8 September 2025 | nepal_event | 106 | 107 |
| 3 | KP Sharma Oli | nepal_person | 106 | 118 |
| 4 | Arson and attacks on state buildings, 9 September 2025 | nepal_event | 87 | 87 |
| 5 | Kathmandu | nepal_location | 76 | 76 |
| 6 | Nepal Police | nepal_organisation | 65 | 67 |
| 7 | Sushila Karki | nepal_person | 65 | 66 |
| 8 | Nepali Army | nepal_organisation | 59 | 61 |
| 9 | Prison breaks | nepal_event | 53 | 54 |
| 10 | Office of the Prime Minister and Council of Ministers | nepal_organisation | 53 | 60 |
| 11 | Arson and looting wave across Nepal, 9 September 2025 | nepal_event | 48 | 50 |
| 12 | 45 victims of Gen Z protests declared martyrs [With Namelist] | nepal_source | 46 | 46 |
| 13 | Nepali Congress | nepal_organisation | 41 | 44 |
| 14 | Ram Chandra Paudel | nepal_person | 41 | 41 |
| 15 | Sudan Gurung | nepal_person | 41 | 42 |
| 16 | Ministry directs NTA to block unregistered platforms | nepal_action | 40 | 40 |
| 17 | Balendra Shah | nepal_person | 40 | 41 |
| 18 | CPN-UML | nepal_organisation | 39 | 43 |
| 19 | Karki commission submits report on 8-9 September events | nepal_event | 38 | 40 |
| 20 | New Baneshwar | nepal_location | 35 | 35 |

## Drawing the whole Library

### What the data says

1. By connectivity there is one cluster per corpus plus a few strays: Sample 1 + 1 isolated; CEJIL 1 + 3 isolated; Nepal 1 + 5 pairs/triples + 162 isolated. A "one mark per connected component" overview would be one big mark plus 162 single records in Nepal. It does not give an overview.
2. Two other groupings do split the graph:
   - **Communities** (Louvain, runs in under 20 ms on CEJIL): CEJIL 25 communities, 18 of at least 50 records; Nepal 12 of at least 50 records plus 28 small ones; Sample 5.
   - **Template**: 18 (CEJIL), 9 (Nepal), 9 (Sample) groups, but almost every template pair is connected (CEJIL 67 of 171 possible template pairs, counting a template with itself; Nepal 37 of 45), so as marks they would be joined by a near-complete graph of bundles. Useful as a legend and a colour key, not as the overview.
3. Removing the hub records or the classification types breaks the CEJIL and Nepal blobs only partly (see Part 4). So a cluster overview should come from communities, with hub edges drawn faint or off, not from components.

### Layout time (measured, Node 26 / V8 on this machine)

d3-force, Barnes-Hut (θ 0.9), link distance 30, 300 ticks; ForceAtlas2 (graphology, Barnes-Hut), 300 iterations. A browser main thread runs the same code at about the same speed (assumed); a Web Worker keeps the page responsive.

| Corpus | Nodes | Edges | d3-force, 300 ticks | d3-force, first 100 ticks | ForceAtlas2, 300 it. |
|---|---:|---:|---:|---:|---:|
| CEJIL (top-degree subset) | 300 | 1,110 | 0.13 s | 0.05 s | 0.12 s |
| CEJIL (top-degree subset) | 1,000 | 4,750 | 0.56 s | 0.19 s | 0.57 s |
| CEJIL (top-degree subset) | 2,000 | 8,771 | 1.49 s | 0.44 s | 1.47 s |
| **CEJIL, all** | **4,398** | **16,585** | **3.40 s** | **1.13 s** | **3.99 s** |
| Nepal (top-degree subset) | 1,000 | 3,331 | 0.55 s | 0.19 s | 0.65 s |
| **Nepal, all** | **2,124** | **4,981** | **1.41 s** | **0.47 s** | **1.65 s** |
| Sample | 104 | 137 | 0.04 s | 0.01 s | 0.03 s |

Cost grows a little faster than linearly (1,000 → 4,398 nodes is 4.4× the nodes and 6× the time). For CEJIL's full size: about 3.4 s for a settled layout, about 1.1 s for a layout that looks right while it keeps settling. Louvain adds 17 ms. Node positions for CEJIL are about 4,400 × 2 numbers (under 100 KB as JSON). Because the corpora are static in the prototype, the layout can be computed once ahead of time and shipped with the data, which removes the cost from the page.

### Renderer (assumed, not measured here)

I did not measure drawing: there is no canvas in Node and I did not open a browser tab. These thresholds come from general experience with these techniques, so check them with a quick prototype before committing.

- **SVG**: each node and edge is a DOM element. Pan and zoom stay smooth up to roughly 500 nodes and 2,000 edges; the existing radial graph caps at 150 relationships (`GRAPH_CAP`, `RelationshipsGraphView.tsx:68`). CEJIL's 16,585 edges are 8× past that, Nepal's 4,981 are 2.5×.
- **Canvas 2D**: no per-element DOM; edges batched into a few strokes by style; picking by a spatial index (a quadtree). Holds 60 fps up to roughly 10,000 nodes and 30,000 edges. **This covers every corpus here (CEJIL is the largest at 4,398 / 16,585).**
- **WebGL** (sigma.js, regl): beyond about 10,000 nodes or 50,000 edges. Not needed for these corpora; relevant only if the real collections are larger. Production Uwazi collections can be larger than CEJIL, so decide this when real sizes are known.
- Labels: draw them only for the top-degree nodes at low zoom and for the visible nodes past a zoom threshold. Never one label per node at all zooms.

### Filters in the whole-Library view: dim in place

Recommendation: **dim non-matching nodes, do not remove them.**

- Positions stay put, so nothing is re-laid-out when a filter changes. Removing nodes means a new layout (0.2–0.6 s for 1,000 results at best; 3.4 s if the set is the whole of CEJIL) and a different picture each time.
- Removal would leave mostly unconnected dots. Median isolated share among results: CEJIL 93%, Sample 58%, Nepal 22%. Median edges per result: inside 0.11 / 0.33 / 0.86, outside 5.5 / 3.0 / 5.0 (CEJIL / Sample / Nepal). Most of a filtered set's edges go to records outside it. Dimming keeps those visible; removal drops them.
- Style: matching nodes at full colour and label; edges with a matching end at normal weight; non-matching nodes at about 10–15% opacity, no label; edges between two non-matching nodes hidden. The masthead readout already carries the one count.
- Offer "Show only matches" as an explicit toggle for sets of up to 1,000 results (44 of 45 combinations measured here). It re-runs the layout on the subset with the hub edges at low weight; it is the only path that needs a layout step.
- The Library filter already compiles to one predicate per record (`matchesAll`), so the graph reads the same set the List does.

## Recommendation

1. **Draw the whole collection, on canvas.** Do not apply a draw cap to the whole-Library graph for CEJIL, Nepal or the Sample (largest is 4,398 nodes / 16,585 edges, inside canvas 2D range). Keep an SVG graph only for focused views, capped at 300 nodes (150 relationships is the existing cap).
2. **Overview by community, not component.** At low zoom draw one mark per Louvain community (CEJIL 18 with ≥ 50 records, Nepal 12), sized by record count and coloured by dominant template; zoom opens a community into nodes. Show the 162 isolated Nepal records as a count chip, not as 162 dots.
3. **Layout once, ahead of time or in a worker.** CEJIL full size: about 3.4 s for 300 d3-force ticks (1.1 s for the first 100), about 4.0 s for ForceAtlas2. Cache the positions with the collection. Visibility toggles (types, hubs, filters) must not trigger a layout.
4. **Draw one edge per pair**, width by relationship count, with type chips. Defaults: CEJIL Mecanismo, País, Paises and "Relacionado a" off; Nepal and Sample all on. In the Sample the five generic types would otherwise dominate (82% of references) but they repeat the same pairs, so one line per pair removes the effect.
5. **Faint, not hidden, hub edges.** In CEJIL 31 records carry 65% of edges. Draw edges incident to records with ≥ 100 neighbours at low opacity by default (threshold ≥ 50 in Nepal, ≥ 20 in the Sample), so the case clusters show.
6. **Filters dim in place.** Matches at full strength, one-hop neighbours of matches at medium, the rest at 10–15%. "Show only matches" is optional and runs only up to 1,000 results (≤ 300 results in 37 of 45 sets, ≤ 1,000 in 44 of 45).
7. **If a result-only graph is built anyway** (remove mode): cap at 300 on SVG and 1,000 on canvas, and handle outside links as stubs, not as nodes. Draw a "+N" badge on each result for its non-hub outside neighbours (median 1.6 per result in CEJIL, 2.5 in Nepal, 2.0 in Sample) and a chip for hub links (CEJIL median 2.4 per result), and expand a node's outside neighbours on click. Showing all one-hop neighbours at once keeps 24 of the 33 CEJIL and Nepal sets under 1,000 nodes but only 4 of 33 under 300, so it needs the canvas.

## Verified and assumed

- **Verified (computed from the data on playground 79e565e1)**: all counts in Parts 1–5, hub and type breakdowns, Louvain community counts and sizes, layout times.
- **Approximated**: filter semantics (see "What was counted"); the Sample's 33 dangling references are excluded; Louvain results vary slightly from run to run (the counts above are one run each).
- **Assumed, not measured**: canvas and SVG frame-rate thresholds, WebGL threshold, that browser layout speed equals Node's, and that Uwazi production collections exceed these corpora.
