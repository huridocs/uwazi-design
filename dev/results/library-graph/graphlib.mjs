export function buildIndex(g) {
  // pair = unordered node pair; rel = (pair, type); ref = one stored edge
  const pairs = new Map(); // key -> {a,b,types:Set,refs}
  for (const e of g.edges) {
    if (e.a === e.b) continue;
    const [a, b] = e.a < e.b ? [e.a, e.b] : [e.b, e.a];
    const k = a + "|" + b;
    let p = pairs.get(k);
    if (!p) pairs.set(k, (p = { a, b, types: new Set(), refs: 0 }));
    p.types.add(e.type); p.refs++;
  }
  const adj = new Map();
  for (const id of g.nodes.keys()) adj.set(id, new Set());
  for (const p of pairs.values()) { adj.get(p.a)?.add(p.b); adj.get(p.b)?.add(p.a); }
  return { pairs: [...pairs.values()], adj };
}

export function components(ids, pairs) {
  const parent = new Map(ids.map((i) => [i, i]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const p of pairs) { const ra = find(p.a), rb = find(p.b); if (ra !== rb) parent.set(ra, rb); }
  const sizes = new Map();
  for (const i of ids) { const r = find(i); sizes.set(r, (sizes.get(r) || 0) + 1); }
  return { sizes: [...sizes.values()].sort((x, y) => y - x), root: find };
}

export function measure(g, idx, keep, hubs = new Set()) {
  const S = new Set(); for (const n of g.nodes.values()) if (keep(n)) S.add(n.id);
  const inner = [], outer = [];
  let outerToHub = 0, outerToNonHub = 0; const outsideNonHub = new Set(); const innerNoHub = [];
  const deg = new Map([...S].map((i) => [i, 0])); const outDeg = new Map([...S].map((i) => [i, 0]));
  const outsideNbrs = new Set();
  for (const p of idx.pairs) {
    const ia = S.has(p.a), ib = S.has(p.b);
    if (ia && ib) { inner.push(p); if (!hubs.has(p.a) && !hubs.has(p.b)) innerNoHub.push(p); deg.set(p.a, deg.get(p.a) + 1); deg.set(p.b, deg.get(p.b) + 1); }
    else if (ia || ib) {
      outer.push(p);
      const mine = ia ? p.a : p.b, other = ia ? p.b : p.a;
      if (hubs.has(other)) outerToHub++; else { outerToNonHub++; outsideNonHub.add(other); }
      if (g.nodes.has(other)) { outDeg.set(mine, outDeg.get(mine) + 1); outsideNbrs.add(other); }
    }
  }
  const comp = components([...S], inner);
  const nh = new Set(); for (const p of innerNoHub) { nh.add(p.a); nh.add(p.b); }
  const compNH = components([...S].filter((i) => !hubs.has(i)), innerNoHub);
  const isolated = [...S].filter((i) => deg.get(i) === 0);
  const isolatedButLinkedOut = isolated.filter((i) => outDeg.get(i) > 0).length;
  const types = new Map(); let innerRels = 0;
  for (const p of inner) { for (const t of p.types) { types.set(t, (types.get(t) || 0) + 1); innerRels++; } }
  const topTypes = [...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} ${c}`).join("; ");
  const nonTrivial = comp.sizes.filter((s) => s > 1);
  return {
    n: S.size, inner: inner.length, innerRels, outer: outer.length, outsideNbrs: outsideNbrs.size,
    comps: comp.sizes.length, nonTrivialComps: nonTrivial.length, largest: comp.sizes[0] || 0,
    isolated: isolated.length, isolatedButLinkedOut,
    maxDeg: Math.max(0, ...deg.values()), maxOutDeg: Math.max(0, ...outDeg.values()),
    avgDeg: S.size ? (2 * inner.length) / S.size : 0,
    density: S.size > 1 ? inner.length / ((S.size * (S.size - 1)) / 2) : 0,
    closure: S.size + outsideNbrs.size, topTypes,
    nodesWithEdge: S.size - isolated.length,
    innerNoHub: innerNoHub.length, compsNoHub: compNH.sizes.length, largestNoHub: compNH.sizes[0] || 0, nonTrivialNoHub: compNH.sizes.filter((x) => x > 1).length,
    outerToHub, outerToNonHub, outsideNonHubNbrs: outsideNonHub.size, closureNoHub: S.size + outsideNonHub.size,
    hubsInSet: [...S].filter((i) => hubs.has(i)).length,
  };
}
