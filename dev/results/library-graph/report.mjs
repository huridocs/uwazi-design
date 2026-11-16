import fs from "node:fs";
const F = JSON.parse(fs.readFileSync(new URL("./filtered.json", import.meta.url)));
const A = JSON.parse(fs.readFileSync(new URL("./full.json", import.meta.url)));
const n = (x) => x.toLocaleString("en-US");
const pc = (x, d = 1) => (x * 100).toFixed(d) + "%";

const filteredTable = (name) => {
  const rows = F[name].filters.map((r) => {
    const share = r.inner + r.outer ? pc(r.inner / (r.inner + r.outer), 0) : "–";
    return `| ${r.label} | ${n(r.n)} | ${n(r.inner)} | ${n(r.innerRels)} | ${n(r.outer)} | ${share} | ${n(r.comps)} (${n(r.nonTrivialComps)}) | ${n(r.isolated)} | ${n(r.largest)} | ${n(r.maxDeg)} | ${n(r.outsideNonHubNbrs)} | ${n(r.closure)} |`;
  });
  return [
    "| Filter | Results | Edges inside | Relationships inside | Edges to outside | Inside share | Components (with ≥2 nodes) | Isolated | Largest component | Max degree inside | Outside non-hub neighbours | Results + all outside neighbours |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...rows,
  ].join("\n");
};
const histTable = (r) => ["| Component size | Components | Nodes |", "|---|---:|---:|", ...r.hist.map((h) => `| ${h.bucket} | ${n(h.comps)} | ${n(h.nodes)} |`)].join("\n");
const typeTable = (r, k = 14) => ["| Relationship type | References | Share | Relationships (target, type) | Nodes touched | Max degree on one node |", "|---|---:|---:|---:|---:|---|", ...r.types.slice(0, k).map((t) => `| ${t.type} | ${n(t.refs)} | ${pc(t.shareOfRefs)} | ${n(t.rels)} | ${n(t.nodes)} | ${n(t.maxDeg)} (${t.maxNode.slice(0, 48)}) |`)].join("\n");
const topTable = (r) => ["| # | Record | Template | Neighbours | References |", "|---:|---|---|---:|---:|", ...r.top.map((t, i) => `| ${i + 1} | ${t.title.slice(0, 70)} | ${t.tpl} | ${n(t.deg)} | ${n(t.refs)} |`)].join("\n");
const tiers = (name) => { const f = F[name].filters; const c = (t) => f.filter((r) => r.n <= t).length; const cl = (t) => f.filter((r) => r.closure <= t).length; return { total: f.length, u100: c(100), u300: c(300), u1000: c(1000), c300: cl(300), c1000: cl(1000), max: Math.max(...f.map((r) => r.n)) }; };
const tS = tiers("Sample"), tC = tiers("CEJIL"), tN = tiers("Nepal");
const sum = (k) => tS[k] + tC[k] + tN[k];
const tot = sum("total");

const md = `# Library graph view: measured counts

Playground \`79e565e1\`. Read-only measurement: no app changes, no commits. Scripts and raw output are beside this file (\`dev/results/library-graph/\`); rerun with \`node dev/results/library-graph/analyze.mjs\`, \`full.mjs\`, \`experiments.mjs\`, \`layout-time.mjs\`. \`experiments.mjs\` and \`layout-time.mjs\` load d3-force, graphology, graphology-layout-forceatlas2 and graphology-communities-louvain from a scratch install (the \`SP\` path at the top of each file); nothing was added to the app's package.json. The Sample is read from \`sample-seed.json\`, produced by bundling \`sample-entry.ts\` with esbuild.

## Headline

- **The whole collection is one connected component in every corpus**: CEJIL 4,395 of 4,398 nodes (99.9%), Nepal 1,949 of 2,124 (91.8%), Sample 103 of 104 (99.0%). A graph of the whole Library does not split into many separate clusters by connectivity. It is one dense network, connected mainly through a few very high-degree records (CEJIL's Corte IDH has 2,739 neighbours; Nepal's "Police fire on protesters at Parliament and New Baneshwar" has 197).
- **Filtered sets are small enough**: of ${tot} filter combinations, ${sum("u100")} (${pc(sum("u100") / tot, 0)}) have 100 results or fewer, ${sum("u300")} (${pc(sum("u300") / tot, 0)}) have 300 or fewer, ${sum("u1000")} (${pc(sum("u1000") / tot, 0)}) have 1,000 or fewer. The unfiltered Library is 4,398 (CEJIL), 2,124 (Nepal) and 104 (Sample) nodes.
- **They are not dense inside.** In ${["Sample", "CEJIL", "Nepal"].reduce((s, k) => s + F[k].filters.filter((r) => r.outer > r.inner).length, 0)} of ${tot} sets there are more edges to records outside the filter than between results. Median edges per result: CEJIL 0.11 inside vs 5.5 outside; Nepal 0.86 vs 5.0; Sample 0.33 vs 3.0. In CEJIL, ${F.CEJIL.filters.filter((r) => r.inner === 0).length} of 16 sets have no edge at all between their results and the median set is 93% isolated nodes.
- **Whole-library graph**: draw it on canvas (CEJIL 4,398 nodes and 16,585 edges is past what SVG can hold), lay it out once in a worker or ahead of time (CEJIL: 3.4 s for 300 d3-force ticks in Node), and make filters **dim in place** rather than remove. Details and the numbers behind them are in "Drawing the whole Library" below.
- **Cap**: no node cap for the whole-library canvas up to about 10,000 nodes (assumed, see below). For any mode that removes nodes or runs SVG: 300 on SVG, 1,000 on canvas, above that fall back to dimming.

## What was counted

- **Nodes**: the records the Library lists for each corpus. CEJIL: the 4,398 Spanish records (the other 8,796 are translations of the same shared ids). Nepal: all 2,124. Sample: the 104 entities of \`data/entities.ts\`; Travesía and the artworks corpora are separate and not measured.
- **Edges**: stored references, grouped the way \`deriveRelationships\` groups them, but over the whole corpus instead of one focused record. An *edge* below is a distinct unordered pair of records. A *relationship* is a (pair, relationship type), which is what \`deriveRelationships\` emits per target; the two differ only where the same pair carries two types or both directions (CEJIL 16,585 pairs, 16,998 references; Nepal 4,981 pairs, 5,302 references; Sample 137 pairs, 517 references). Hub membership is flattened to pairs, as the existing graph does (\`includeHubMembers: true\`). CEJIL hubs are stars (one \`from\`, N \`to\`), so no member-to-member edges appear.
- **Inside / outside**: inside means both ends are in the filtered set. Outside means exactly one end is. "Non-hub" outside neighbours exclude the high-degree records (degree ≥ 100 in CEJIL, ≥ 50 in Nepal, ≥ 20 in Sample), which are 31 records in CEJIL, 10 in Nepal and 2 in the Sample, listed under each corpus below.
- **Isolated**: a result with no edge to another result. It may still have links to the outside.
- **Sample**: 33 of its 550 references point at nine ids that are not entities (\`e-missing-1…9\`). They are dropped here; the Library could not draw them as nodes either.
- **Filter semantics** are approximated from \`utils/libraryFilter.ts\`: template and property facets are exact matches on the record's data; the date range uses the record's date (CEJIL's \`createdOf\` rule, geolocated records borrow their case's date; Nepal records overlap by span); search is a folded AND of words over title and all metadata labels, with full-text search off. Search on the real Library also reads quotes and descriptors through \`entitySearchFields\`, so a few hit counts will differ by a few records. Nothing here depends on those small differences.
- The 45 combinations are my picks of what a researcher would do, not a random sample. They lean toward narrow, single-purpose sets.

## Part 1: filtered sets

### Sample (104 nodes, 137 edges)

${filteredTable("Sample")}

### CEJIL (4,398 nodes, 16,585 edges)

${filteredTable("CEJIL")}

### Nepal (2,124 nodes, 4,981 edges)

${filteredTable("Nepal")}

Column notes. *Inside share* is edges inside ÷ (edges inside + edges to outside). *Max degree inside* counts distinct neighbours among the results only. *Results + all outside neighbours* is the node count if every one-hop neighbour were drawn too.

## Part 2: how many sets fall under each size

| Corpus | Combinations | ≤ 100 results | ≤ 300 | ≤ 1,000 | Largest set |
|---|---:|---:|---:|---:|---:|
| Sample | ${tS.total} | ${tS.u100} | ${tS.u300} | ${tS.u1000} | ${tS.max} |
| CEJIL | ${tC.total} | ${tC.u100} | ${tC.u300} | ${tC.u1000} | ${n(tC.max)} |
| Nepal | ${tN.total} | ${tN.u100} | ${tN.u300} | ${tN.u1000} | ${n(tN.max)} |
| All | ${tot} | ${sum("u100")} (${pc(sum("u100") / tot, 0)}) | ${sum("u300")} (${pc(sum("u300") / tot, 0)}) | ${sum("u1000")} (${pc(sum("u1000") / tot, 0)}) | |

If the outside neighbours were drawn as nodes too (results + one hop), the shares fall: sets at or under 300 nodes are ${tS.c300}/${tS.total} (Sample), ${tC.c300}/${tC.total} (CEJIL), ${tN.c300}/${tN.total} (Nepal); at or under 1,000 they are ${tS.c1000}/${tS.total}, ${tC.c1000}/${tC.total}, ${tN.c1000}/${tN.total}. So a 300-node cap works for the results alone but not for results plus neighbours. The only CEJIL set over 1,000 results is the Resolución template (1,084); the largest Nepal set is Source (922).

## Part 3: are the edges inside the results worth drawing?

Mostly not, with two exceptions.

- **CEJIL**: edges run between templates (Causa to its Sentencias, Resoluciones and Audiencias; documents to Jueces, Países and the two Organismos), almost never within one. Any single-template filter has no edge between its results (Causa, Sentencia, Audiencia: 0 or 1) except Juez (397 edges inside, from judge-to-judge Firmantes links) and Resolución (118, Resolución to Resolución links). The sets with many inside edges are star-shaped: "any template + País Perú" has 1,404 edges inside, but 709 of the 710 results connect to the single Perú record; without the two hub records in the set, 688 edges and 49 components remain. Genuinely structured CEJIL sets are the topical ones: "masacre" (156 results, 137 edges, 22 components, largest 26) and "Mapiripán" (16 results, 15 edges, one component).
- **Nepal**: events chain to each other (\`part_of\`, \`led_to\`): 180 events have 176 edges among them, and the largest component holds 108. Date-range sets are the densest (8–9 Sep 2025: 437 results, 660 edges, largest component 407). These are worth drawing. Claims, sources, casualties and media items, filtered alone, are nearly edgeless (Source 922 results, 1 edge; Casualty 73 results, 0 edges), because they link to events, actions, people and organisations, not to each other.
- **Sample**: inside edges come from sets that contain a hub record (La Tablada or the Commission: Published only 109 edges, a date range 33) or the court case / judgment / person cluster (22 results, 37 edges). Hearings, documents and judgments filtered alone have none.

Across all 45 sets the edges to the outside outnumber the edges inside in ${["Sample", "CEJIL", "Nepal"].reduce((s, k) => s + F[k].filters.filter((r) => r.outer > r.inner).length, 0)} and are at least five times as many in ${["Sample", "CEJIL", "Nepal"].reduce((s, k) => s + F[k].filters.filter((r) => r.outer >= 5 * r.inner).length, 0)}. Most of the structure of a filtered set is its links to records outside the filter. Of those outside links, hub records take a large share in CEJIL (median 2.4 hub links per result against 1.6 non-hub neighbours per result), and a small one in Nepal (0.6 against 2.5).

## Part 4: relationship types

### Sample

${typeTable(A.Sample, 13)}

The four generic types (\`relates_to\`, \`mentions\`, \`cites\`, \`refers_to\`) plus \`no_label\` are 426 of 517 references (82%), and all of them fan out of one record, Case 11.137 (La Tablada), which has 52 neighbours and 432 references. They repeat on the same ~45 pairs, so one line per pair removes the weight: without those five types the Sample has 91 edges instead of 137.

### CEJIL

${typeTable(A.CEJIL, 13)}

Five types are 89% of references: untyped (29.7%), Firmantes (18.2%), País (16.7%), CorteIDH (13.5%), Mecanismo (11.1%). The swamping comes from what the types point at, not from the type name:

- **Mecanismo** (1,885 references, all document → Organismo) and **País** (2,835, document → one of 30 País records) are classification edges. 1,459 Mecanismo edges end at one record (Corte IDH) and 462 País edges at Perú. The *untyped* group has the same shape in part: 1,066 untyped references end at Corte IDH, and 365 + 353 + 291 + 282 are Organismo or País → Resolución/Sentencia.
- 31 records have 100 or more neighbours (2 Organismos, 13 Países, 16 Jueces y/o Comisionados). Together they touch 10,752 of 16,585 edges (65%).
- Taking those out of the picture does not make the graph break up: without all edges of type Mecanismo, País, Paises and "Relacionado a" (4,970 references, 29%) the giant component is still 99.2%; without also the untyped group (another 5,054) it is 81.9%; without also Firmantes, "Firmante Voto separado" and Multi Select it is 4.5% (largest 198) in 817 components. Removing the 32 País and Organismo *nodes* leaves 4,311 of 4,366 connected; also removing the 137 Juez records leaves 391 components with the largest at 258 nodes; also removing the 337 Causa records leaves 2,744 components with the largest at 31.
- Reading: the natural unit of a CEJIL cluster is a Causa and its documents. Mecanismo, País and the judge links are what connect all cases into one network.

Default for CEJIL: **Mecanismo, País, Paises and "Relacionado a" off** (they hold 29% of references and add no case-to-case information that the País and Organismo facets do not already give). Leave the untyped group and Firmantes on: untyped also carries Causa → document links that cannot be told apart by type (the "untyped" label is the corpus's missing type, not one relationship), and Firmantes are the only judge-to-document links.

### Nepal

${typeTable(A.Nepal, 16)}

No single type swamps Nepal: the largest, \`reports_on\` (source → event/action/person), is 27.3% of references, and no type puts more than 63 references on one record. The swamping comes from records, not types: 10 records have 50 or more neighbours (the Parliament shooting 197, the 8 September protests 106, KP Sharma Oli 106, the 9 September arson 87, Kathmandu 76, Nepal Police 65, Sushila Karki 65, Nepali Army 59, Prison breaks 53, the Prime Minister's office 53) and touch 857 of 4,981 edges (17%).

Types that connect only the evidence layer to the rest (\`reports_on\`, \`supports\`, \`disputes\`, \`concerns\`, \`depicts\`, \`claimed_by\`, \`published_in\`, \`documents\`: 3,301 references, 62%) would leave the actor/event structure when off, but also leave sources, claims and media as isolated points (isolated nodes go from 162 to 1,249). Default for Nepal: **all types on**; offer an "Evidence" group toggle (sources, claims, media and their types) rather than switching individual types off.

## Part 5: the whole collection, per corpus

### Sample

- ${A.Sample.nodes} nodes, ${A.Sample.pairs} edges (${A.Sample.refs} references), average degree ${A.Sample.avgDeg.toFixed(1)}, median ${A.Sample.medianDeg}.
- Components: ${A.Sample.comps}. Largest ${A.Sample.largest} (${pc(A.Sample.largestShare)}). Isolated records: ${A.Sample.isolated} (the unlinked memo).

${histTable(A.Sample)}

- Without the two hub records (the Inter-American Commission, 53 neighbours, which carries the 48 hearings; La Tablada, 52): ${A.Sample.noHub.comps} components, ${A.Sample.noHub.isolated} isolated, largest ${A.Sample.noHub.largest} (${pc(A.Sample.noHub.largestShare, 0)}).
- Template pairs (13 of 45 possible connect): ${A.Sample.tplPairs.slice(0, 6).map(([k, c]) => `${k} ${c}`).join("; ")}.
- Louvain communities: 5 (sizes 49, 35, 11, 8, 1).

Top 20 by number of neighbours:

${topTable(A.Sample)}

### CEJIL

- ${n(A.CEJIL.nodes)} nodes, ${n(A.CEJIL.pairs)} edges (${n(A.CEJIL.refs)} references), average degree ${A.CEJIL.avgDeg.toFixed(1)}, median ${A.CEJIL.medianDeg}.
- Components: ${A.CEJIL.comps}. Largest ${n(A.CEJIL.largest)} (${pc(A.CEJIL.largestShare)}). Isolated records: ${A.CEJIL.isolated}.
- Degree: ≥ 10 neighbours for 367 records, ≥ 25 for 71, ≥ 100 for 31, ≥ 500 for 5.

${histTable(A.CEJIL)}

- Removing the 31 records with ≥ 100 neighbours (they hold ${n(A.CEJIL.noHub.hubEdgesRemoved)} edges, ${pc(A.CEJIL.noHub.hubEdgesRemoved / A.CEJIL.pairs, 0)}): ${A.CEJIL.noHub.comps} components, ${A.CEJIL.noHub.isolated} isolated, largest ${n(A.CEJIL.noHub.largest)} (${pc(A.CEJIL.noHub.largestShare, 0)}). The hubs are not the only glue.
- Template pairs: ${A.CEJIL.tplPairCount} of 171 possible (18 templates, counting a template with itself) connect. Largest: ${A.CEJIL.tplPairs.slice(0, 5).map(([k, c]) => `${k} ${n(c)}`).join("; ")}.
- Louvain communities (on all types): 25, 18 of them with 50 or more nodes, sizes 603, 495, 426, 424, 337, 304, 291, 289, 174, 168, 159, 129 …; computed in 17 ms. A community mixes templates (a record's template matches its community's majority template for 27% of records), so a community is a group of related cases and documents, not a template.

Top 20 by number of neighbours:

${topTable(A.CEJIL)}

### Nepal

- ${n(A.Nepal.nodes)} nodes, ${n(A.Nepal.pairs)} edges (${n(A.Nepal.refs)} references), average degree ${A.Nepal.avgDeg.toFixed(1)}, median ${A.Nepal.medianDeg}.
- Components: ${A.Nepal.comps}. Largest ${n(A.Nepal.largest)} (${pc(A.Nepal.largestShare)}). Isolated records: ${A.Nepal.isolated}. Components of 2–5 nodes: 5.
- Degree: ≥ 10 neighbours for 192 records, ≥ 25 for 38, ≥ 50 for 10, ≥ 100 for 3.

${histTable(A.Nepal)}

- Removing the 10 records with ≥ 50 neighbours (857 edges, 17%): ${A.Nepal.noHub.comps} components, ${A.Nepal.noHub.isolated} isolated, largest ${n(A.Nepal.noHub.largest)} (${pc(A.Nepal.noHub.largestShare, 0)}).
- Template pairs: ${A.Nepal.tplPairCount} of 45 possible (9 templates, counting a template with itself) connect. Largest: ${A.Nepal.tplPairs.slice(0, 6).map(([k, c]) => `${k.replaceAll("nepal_", "")} ${n(c)}`).join("; ")}.
- Louvain communities: 190, of which 28 have more than one node and 12 have 50 or more (sizes 248, 246, 230, 163, 156, 153, 136, 94, 83, 66 …); 162 of the 190 are single isolated records. Template match for 44% of records.
- The 162 isolated records are 156 sources (of 922) and 6 organisations: records with no reference to or from any other record.

Top 20 by number of neighbours:

${topTable(A.Nepal)}

## Drawing the whole Library

### What the data says

1. By connectivity there is one cluster per corpus plus a few strays: Sample 1 + 1 isolated; CEJIL 1 + 3 isolated; Nepal 1 + 5 pairs/triples + 162 isolated. A "one mark per connected component" overview would be one big mark plus ${A.Nepal.isolated} single records in Nepal. It does not give an overview.
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

- **SVG**: each node and edge is a DOM element. Pan and zoom stay smooth up to roughly 500 nodes and 2,000 edges; the existing radial graph caps at 150 relationships (\`GRAPH_CAP\`, \`RelationshipsGraphView.tsx:68\`). CEJIL's 16,585 edges are 8× past that, Nepal's 4,981 are 2.5×.
- **Canvas 2D**: no per-element DOM; edges batched into a few strokes by style; picking by a spatial index (a quadtree). Holds 60 fps up to roughly 10,000 nodes and 30,000 edges. **This covers every corpus here (CEJIL is the largest at 4,398 / 16,585).**
- **WebGL** (sigma.js, regl): beyond about 10,000 nodes or 50,000 edges. Not needed for these corpora; relevant only if the real collections are larger. Production Uwazi collections can be larger than CEJIL, so decide this when real sizes are known.
- Labels: draw them only for the top-degree nodes at low zoom and for the visible nodes past a zoom threshold. Never one label per node at all zooms.

### Filters in the whole-Library view: dim in place

Recommendation: **dim non-matching nodes, do not remove them.**

- Positions stay put, so nothing is re-laid-out when a filter changes. Removing nodes means a new layout (0.2–0.6 s for 1,000 results at best; 3.4 s if the set is the whole of CEJIL) and a different picture each time.
- Removal would leave mostly unconnected dots. Median isolated share among results: CEJIL 93%, Sample 58%, Nepal 22%. Median edges per result: inside 0.11 / 0.33 / 0.86, outside 5.5 / 3.0 / 5.0 (CEJIL / Sample / Nepal). Most of a filtered set's edges go to records outside it. Dimming keeps those visible; removal drops them.
- Style: matching nodes at full colour and label; edges with a matching end at normal weight; non-matching nodes at about 10–15% opacity, no label; edges between two non-matching nodes hidden. The masthead readout already carries the one count.
- Offer "Show only matches" as an explicit toggle for sets of up to 1,000 results (44 of 45 combinations measured here). It re-runs the layout on the subset with the hub edges at low weight; it is the only path that needs a layout step.
- The Library filter already compiles to one predicate per record (\`matchesAll\`), so the graph reads the same set the List does.

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
`;
fs.writeFileSync(new URL("./counts.md", import.meta.url), md);
console.log(md.length);
