// Relationships redesign v5 — clickable prototype. Tree by default; the v4
// lenses sit behind the Advanced switch.
// Two real corpora: CEJIL (public/cejil-data) and Sample (data/references.ts,
// La Tablada's passages). Static files, no framework, edits stay in the tab.
"use strict";

const qs = new URLSearchParams(location.search);
const CORPUS = qs.get("c") === "sample" ? "sample" : "cejil";
const D = CORPUS === "sample" ? window.SAMPLE : window.CEJIL;
const L = { explore: "See connections", open: "Go to entity" };
const HAS_P = !!D.passages;

// ── Indexes ──────────────────────────────────────────────────────────────────
const N = D.ents.length;
const E = D.edges; // mutable: new edges are pushed
const dead = new Set();
const alive = (e) => !dead.has(e);
const sidIdx = new Map(D.ents.map((e, i) => [e[0], i]));
const title = (i) => D.ents[i][1];
const tplOf = (i) => D.ents[i][2];
const tplName = (i) => (tplOf(i) >= 0 ? D.templates[tplOf(i)].n : "No template");
const colorOf = (i) => (tplOf(i) >= 0 ? D.templates[tplOf(i)].c : "#6B7280");
const typeName = (ty) => (ty < 0 ? null : D.types[ty][1]);
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n.toLocaleString("en-US");
const edgeCount = () => E.length / 4;

const adj = Array.from({ length: N }, () => []);
const hubEdges = new Map();
let nextHub = 0;
function indexEdge(e) {
  adj[E[e * 4]].push(e);
  if (E[e * 4 + 1] !== E[e * 4]) adj[E[e * 4 + 1]].push(e);
  const h = E[e * 4 + 3];
  (hubEdges.get(h) || hubEdges.set(h, []).get(h)).push(e);
  if (h >= nextHub) nextHub = h + 1;
}
for (let e = 0; e < edgeCount(); e++) indexEdge(e);

// Passages (Sample only): [edge, anchorEntity, page, text, otherPage, otherText]
const P = D.passages || [];
const deadP = new Set();
const pByEdge = new Map();
const pByAnchor = new Map();
function indexPassage(pi) {
  const [e, a] = P[pi];
  (pByEdge.get(e) || pByEdge.set(e, []).get(e)).push(pi);
  (pByAnchor.get(a) || pByAnchor.set(a, []).get(a)).push(pi);
}
P.forEach((_, pi) => indexPassage(pi));
const livePassages = (list) => (list || []).filter((pi) => !deadP.has(pi) && alive(P[pi][0]));
const pageCount = (i) => (D.pageCount ? D.pageCount[D.ents[i][0]] || 0 : 0);

// Restricted entities (Sample only: CEJIL is all published). As a guest they
// disappear from every row, path and pattern; a derived value reached through one
// says so instead of naming it.
const RESTR = new Set(D.restricted || []);
let GUEST = qs.get("guest") === "1";
const hidden = (i) => GUEST && RESTR.has(i);
const typeOwners = new Map();
D.templates.forEach((t, ti) => t.f.forEach(([, rt]) => { if (rt) (typeOwners.get(rt) || typeOwners.set(rt, new Set()).get(rt)).add(ti); }));
const tyByName = new Map(D.types.map((t, i) => [t[1], i]));

// Hub centre: unique field owner → export `from` among several owners → none.
const hubMemo = new Map();
function hubInfo(h) {
  if (hubMemo.has(h)) return hubMemo.get(h);
  const es = (hubEdges.get(h) || []).filter(alive);
  if (!es.length) { hubMemo.set(h, null); return null; }
  const mem = [...new Set(es.flatMap((e) => [E[e * 4], E[e * 4 + 1]]))];
  const ty = E[es[0] * 4 + 2];
  const from = E[es[0] * 4];
  let centre = null;
  if (ty < 0) centre = mem.length <= 2 ? from : null;
  else {
    const own = typeOwners.get(D.types[ty][0]) || new Set();
    const cand = mem.filter((m) => own.has(tplOf(m)));
    centre = cand.length === 1 ? cand[0] : cand.includes(from) ? from : mem.length <= 2 ? from : null;
  }
  const info = { mem, ty, centre, es };
  hubMemo.set(h, info);
  return info;
}
function fieldOf(tpl, ty) {
  if (ty < 0 || tpl < 0) return null;
  const i = D.templates[tpl].f.findIndex((f) => f[1] === D.types[ty][0]);
  return i < 0 ? null : { label: D.templates[tpl].f[i][0], content: D.templates[tpl].f[i][2], idx: i };
}
const fieldLabel = (tpl, ty) => (ty < 0 ? null : fieldOf(tpl, ty)?.label ?? D.types[ty][1]);

// Traversal through hub centres only.
let nbrs = [];
function rebuildNbrs() {
  nbrs = Array.from({ length: N }, () => []);
  for (const h of hubEdges.keys()) {
    const info = hubInfo(h);
    if (!info || info.centre === null) continue;
    if (hidden(info.centre)) continue;
    for (const m of info.mem) if (m !== info.centre && !hidden(m)) { nbrs[info.centre].push([m, info.ty, h]); nbrs[m].push([info.centre, info.ty, h]); }
  }
}
rebuildNbrs();
const connMemo = new Map();
function changed() { hubMemo.clear(); connMemo.clear(); rebuildNbrs(); }

// ── Connections of an entity ─────────────────────────────────────────────────
function connectionsOf(x) {
  if (connMemo.has(x)) return connMemo.get(x);
  const groups = new Map();
  const get = (key, init) => groups.get(key) || groups.set(key, { key, rows: new Map(), ...init }).get(key);
  const seen = new Set();
  const noFields = tplOf(x) < 0 || D.templates[tplOf(x)].f.length === 0;
  for (const e of adj[x]) {
    if (!alive(e)) continue;
    const h = E[e * 4 + 3];
    if (seen.has(h)) continue;
    seen.add(h);
    const info = hubInfo(h);
    if (!info) continue;
    const { mem, ty, centre, es } = info;
    const others = mem.filter((m) => m !== x && !hidden(m));
    if (!others.length || (centre !== null && centre !== x && hidden(centre))) continue;
    const rowEdges = (o) => es.filter((k) => (E[k * 4] === x && E[k * 4 + 1] === o) || (E[k * 4] === o && E[k * 4 + 1] === x));
    const addRow = (g, o) => {
      const r = g.rows.get(o) || { ent: o, edges: [], hubs: [] };
      r.edges.push(...rowEdges(o)); r.hubs.push(h); g.rows.set(o, r);
    };
    if (ty < 0 && centre !== null) {
      const g = get("none", { kind: "none", name: "Without a relation type", via: "name it in Settings › Relationship types", order: 9000 });
      for (const o of others) addRow(g, o);
    } else if (centre === null) {
      const tn = typeName(ty) || "no relation type";
      const g = get("together:" + tn, { kind: "together", name: "Listed together with", via: tn + " · no member owns this field", order: 8000 });
      const sorted = [...others].sort((a, b) => (tplOf(a) === tplOf(x)) - (tplOf(b) === tplOf(x)));
      g.rows.set("h" + h, { members: sorted, hub: h });
    } else if (centre === x) {
      const f = fieldOf(tplOf(x), ty);
      const label = f ? f.label : D.types[ty][1];
      const g = get("field:" + label, { kind: "field", name: label, ty, content: f?.content ?? null,
        via: f ? "field of " + tplName(x) : noFields ? "relation type" : "relation type · not a field of " + tplName(x), order: f ? f.idx : 500 });
      for (const o of others) addRow(g, o);
    } else {
      const label = fieldLabel(tplOf(centre), ty);
      const g = get("listed:" + label, { kind: "listed", name: `Listed as ${label} in`, via: "other entities’ fields that name this one", order: 1000 });
      const prev = g.rows.get(centre);
      g.rows.set(centre, { ent: centre, with: mem.length - 2, label, n: (prev ? prev.n : 0) + 1, hub: h });
    }
  }
  const list = [...groups.values()].map((g) => ({ ...g, rows: [...g.rows.values()] }));
  for (const d of DERIVED[tplName(x)] || []) {
    const leaves = new Map();
    for (const a of hop(x, d.path[0][0], d.path[0][1], true)) for (const b2 of hop(a, d.path[1][0], d.path[1][1], true)) {
      if (hidden(b2)) continue;
      const r = leaves.get(b2) || { ent: b2, via: [], derived: true };
      r.via.push(a); leaves.set(b2, r);
    }
    if (leaves.size) list.push({ key: "derived:" + d.label, kind: "derived", name: d.label, via: `derived · ${d.path.map((s) => s[0]).join(" → ")}`, order: 700, rows: [...leaves.values()] });
  }
  for (const g of list) {
    if (g.kind === "listed") g.order = 1000 + (100000 - g.rows.length) / 100000;
    g.rows.sort((a, b) => (a.ent !== undefined && b.ent !== undefined ? degree(b.ent) - degree(a.ent) : 0));
  }
  list.sort((a, b) => a.order - b.order);
  connMemo.set(x, list);
  return list;
}
function degree(i) { let n = 0; for (const e of adj[i]) if (alive(e)) n++; return n; }
function connectedCount(x) {
  const s = new Set();
  for (const g of connectionsOf(x)) if (g.kind !== "together") for (const r of g.rows) s.add(r.ent);
  return s.size;
}
const passagesOfRow = (r) => (HAS_P && r.edges ? r.edges.reduce((n, e) => n + livePassages(pByEdge.get(e)).length, 0) : 0);

// ── Shortest paths, folded into layers ───────────────────────────────────────
// Suggested skips = relation types that reach an entity connected to ≥5% of the
// corpus (v2 §1.3). CEJIL: País, Paises, Mecanismo. Sample: the four text-reference
// types, because La Tablada's passages touch every entity in the seed.
const DEFAULT_SKIP = new Set([-1, ...(CORPUS === "sample" ? ["Mentions", "Relates to", "Cites", "Refers to"] : ["País", "Paises", "Mecanismo"]).map((n) => tyByName.get(n)).filter((v) => v !== undefined)]);
function bfs(src, skip, maxD, stop) {
  const dist = new Int16Array(N).fill(-1);
  const cnt = new Float64Array(N);
  dist[src] = 0; cnt[src] = 1;
  let frontier = [src], d = 0;
  while (frontier.length && d < maxD) {
    if (stop !== undefined && dist[stop] >= 0) break;
    const next = [];
    for (const u of frontier) for (const [v, ty] of nbrs[u]) {
      if (skip.has(ty)) continue;
      if (dist[v] === -1) { dist[v] = d + 1; next.push(v); }
      if (dist[v] === d + 1) cnt[v] += cnt[u];
    }
    frontier = next; d++;
  }
  return { dist, cnt };
}
function shortest(a, b, skip, maxD) {
  if (a === b) return null;
  const A = bfs(a, skip, maxD, b);
  const Lh = A.dist[b];
  if (Lh < 0) return null;
  const B = bfs(b, skip, Lh);
  const layers = Array.from({ length: Lh + 1 }, () => []);
  for (let i = 0; i < N; i++) if (A.dist[i] >= 0 && B.dist[i] >= 0 && A.dist[i] + B.dist[i] === Lh) layers[A.dist[i]].push(i);
  const edgesBetween = [];
  for (let d = 0; d < Lh; d++) {
    const next = new Set(layers[d + 1]);
    const labels = new Map(); const types = new Set(); const pairs = [];
    for (const u of layers[d]) for (const [v, ty, hb] of nbrs[u]) {
      if (skip.has(ty) || !next.has(v)) continue;
      const c = hubInfo(hb).centre;
      labels.set((c === u ? "→ " : "← ") + (ty < 0 ? "no relation type" : fieldLabel(tplOf(c), ty)), 1);
      types.add(ty); pairs.push([u, v]);
    }
    edgesBetween.push({ labels: [...labels.keys()].slice(0, 2), types, pairs });
  }
  return { steps: Lh, routes: A.cnt[b], layers, edgesBetween };
}
function shortestVia(a, pin, b, skip, maxD) {
  const p1 = shortest(a, pin, skip, maxD), p2 = shortest(pin, b, skip, maxD);
  if (!p1 || !p2) return null;
  return { steps: p1.steps + p2.steps, routes: p1.routes * p2.routes, layers: [...p1.layers, ...p2.layers.slice(1)], edgesBetween: [...p1.edgesBetween, ...p2.edgesBetween] };
}

// ── Pattern (CEJIL) ──────────────────────────────────────────────────────────
const PATTERNS = {
  Causa: { name: "Jueces firmantes", steps: [["CorteIDH", "Sentencia de la CorteIDH"], ["Firmantes", "Juez y/o Comisionado"], ["País", "País"]] },
  "Court Case": { name: "Judges' nationality", steps: [["Judgment", "Judgment"], ["Signed by", "Person"], ["Nationality", "Country"]] },
};
// Derived (multi-hop) groups shown in Connections, read-only, with ↳ via.
const DERIVED = {
  Causa: [{ label: "Jueces firmantes", path: [["CorteIDH", "Sentencia de la CorteIDH"], ["Firmantes", "Juez y/o Comisionado"]] }],
  "Court Case": [{ label: "Judges", path: [["Judgment", "Judgment"], ["Signed by", "Person"]] }],
};
function hop(x, relName, toTpl, withHidden) {
  const out = new Set();
  for (const e of adj[x]) {
    if (!alive(e)) continue;
    const ty = E[e * 4 + 2];
    if (ty < 0 || D.types[ty][1] !== relName) continue;
    const v = E[e * 4] === x ? E[e * 4 + 1] : E[e * 4];
    if (tplName(v) === toTpl && (withHidden || !hidden(v))) out.add(v);
  }
  return [...out];
}

// ── State ────────────────────────────────────────────────────────────────────
const idOf = (sid) => (sid && sidIdx.has(sid) ? sidIdx.get(sid) : undefined);
const startPage = idOf(qs.get("e")) ?? (CORPUS === "sample" ? sidIdx.get("e3") : sidIdx.get("xruguwr41jicc8fr"));
const range = (qs.get("pages") || "").split("-").map(Number).filter(Boolean);
const S = {
  page: startPage,
  trail: (qs.get("trail") || "").split(",").map(idOf).filter((v) => v !== undefined),
  lens: qs.get("lens") || null,
  userLens: !!qs.get("lens"),
  overlay: idOf(qs.get("ov")) ?? null,
  panel: qs.get("panel") || null, // "filters"
  peek: idOf(qs.get("peek")) ?? null,
  q: qs.get("q") || "",
  shown: {},
  to: idOf(qs.get("to")) ?? null,
  pin: idOf(qs.get("pin")) ?? null,
  skip: qs.get("skip") === "none" ? new Set() : new Set(DEFAULT_SKIP),
  maxD: +(qs.get("maxd") || 6),
  modal: qs.get("modal") || null, // "to" | "add" | "passage"
  mq: qs.get("mq") || "",
  forks: {},
  view: { connections: ["graph", "map"].includes(qs.get("view")) ? "graph" : "list", paths: qs.get("pview") === "map" ? "graph" : qs.get("pview") || "list", when: qs.get("wview") || "spine" },
  years: (qs.get("years") || "").split("-").map(Number).filter(Boolean).length ? (qs.get("years").split("-").map(Number).concat([0])).slice(0, 2).map((v, i, a) => v || a[0]) : null,
  edit: qs.get("edit") === "1",
  fc: new Map(), // Connections facets, one set per trail step (keyed by the entity at that step)
  f: { document: { tpl: new Set(), rel: new Set() } },
  pages: range.length ? [range[0], range[1] || range[0]] : null,
  outside: false,
  docPage: +(qs.get("dp") || 0) || null,
  activeP: qs.get("ap") !== null ? +qs.get("ap") : null,
  confirm: null,
  add: null, // {mode, ty, content, label, hub, text, page}
  addRel: -1,
  toast: null,
  sel: null, // {text, page, x, y}
  drag: null,
  mapHover: null,
  adv: readAdv(), // Advanced switch: the v4 lenses. Off = tree.
  tx: new Set(), // tree rows expanded to their own connections ("<branch key>|<entity id>")
};
// URL `adv=1` wins; otherwise the session remembers the switch.
function readAdv() {
  if (qs.get("adv") !== null) return qs.get("adv") === "1";
  try { return sessionStorage.getItem("rel.adv") === "1"; } catch { return false; }
}
function setAdv(on) {
  S.adv = on;
  try { sessionStorage.setItem("rel.adv", on ? "1" : "0"); } catch { /* storage blocked: the URL still carries it */ }
  const u = new URL(location.href); u.searchParams.set("adv", on ? "1" : "0"); history.replaceState(null, "", u);
}
if (qs.get("theme") === "dark") document.documentElement.classList.add("dark");
if (qs.get("dir") === "rtl") document.documentElement.setAttribute("dir", "rtl");
// The tree is always rooted at the page; the trail belongs to Advanced.
const current = () => (S.adv && S.trail.length ? S.trail[S.trail.length - 1] : S.page);
function fConn() { const k = current(); if (!S.fc.has(k)) S.fc.set(k, { tpl: new Set(), kind: new Set() }); return S.fc.get(k); }

// Default lens: In the document when the entity has anchored passages inside its
// rendition; otherwise Connections. An explicit choice holds for the session.
function docPassages(x) { return livePassages(pByAnchor.get(x)); }
function hasDocLens(x) { const pc = pageCount(x); return pc > 0 && docPassages(x).some((pi) => P[pi][2] <= pc); }
function lensFor(x) {
  if (S.lens === "document" && !hasDocLens(x)) return "connections";
  if (S.lens) return S.lens;
  return hasDocLens(x) ? "document" : "connections";
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function pill(i, { lg = false, act = "ov" } = {}) {
  const c = colorOf(i);
  return `<button class="pill${lg ? " lg" : ""}" data-act="${act}" data-i="${i}" title="Preview ${esc(title(i))}" dir="auto" style="background:${c}20;border:1px solid ${c}40;color:color-mix(in srgb, ${c} 55%, var(--text-primary))"><i style="background:${c}"></i><span>${esc(title(i))}</span>${RESTR.has(i) ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-label="Restricted"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>` : ""}</button>`;
}
const sq = (i) => `<span class="sq" style="background:${colorOf(i)}"></span>`;
const arrowR = `<span>›</span>`;
function templateSummary(rows) {
  const by = new Map();
  for (const r of rows) if (r.ent !== undefined) by.set(tplName(r.ent), (by.get(tplName(r.ent)) || 0) + 1);
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${esc(k)} ${fmt(v)}`).join(" · ");
}
const trashIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>`;

// ── Connections lens ─────────────────────────────────────────────────────────
function filteredGroups(x, compact) {
  const f = fConn();
  const q = fold(S.q.trim());
  return connectionsOf(x).map((g) => {
    if (!compact && f.kind.size && !f.kind.has(g.kind)) return null;
    let rows = g.rows;
    if (!compact && f.tpl.size) rows = rows.filter((r) => (r.members || [r.ent]).some((m) => f.tpl.has(tplName(m))));
    if (!compact && q) rows = rows.filter((r) => (r.members || [r.ent]).some((m) => fold(title(m)).includes(q)));
    return rows.length ? { ...g, rows } : null;
  }).filter(Boolean);
}
function rowHtml(r, g, { compact }) {
  if (r.members) {
    const shown = r.members.slice(0, compact ? 3 : 4);
    return `<div class="row"><span class="small tert">with</span><span class="line">${shown.map((m) => pill(m)).join("")}${r.members.length > shown.length ? `<bdi class="chip">+${r.members.length - shown.length}</bdi>` : ""}</span>${S.edit && !compact ? `<span class="end small muted">fix in Settings</span>` : ""}</div>`;
  }
  const i = r.ent;
  const sel = S.peek === i && !compact;
  const np = passagesOfRow(r);
  const viaTxt = r.derived ? r.via.map((v) => (hidden(v) ? "1 restricted entity" : title(v))) : null;
  const meta = r.derived ? `↳ via ${esc(viaTxt[0])}${viaTxt.length > 1 ? ` +${viaTxt.length - 1}` : ""}` : r.label !== undefined
    ? `${esc(r.label)}${r.with ? ` · with ${fmt(r.with)} other${r.with > 1 ? "s" : ""}` : ""}`
    : `${esc(tplName(i))} · ${fmt(connectedCount(i))} connections${np ? ` · ${np} passage${np > 1 ? "s" : ""}` : ""}`;
  let html = `<div class="row${sel ? " sel" : ""}">`;
  if (!compact) html += `<button class="peekbtn" data-act="peek" data-i="${i}" aria-expanded="${sel}" aria-label="Show a summary of ${esc(title(i))}"><span class="flip">▸</span></button>`;
  html += `${pill(i)}<span class="meta" dir="auto">${meta}</span>`;
  if (!compact) {
    html += `<span class="end">`;
    if (S.edit && g.kind === "listed") html += `<button class="stepin" data-act="editat" data-i="${i}">Edit in ${esc(tplName(i))} ${arrowR}</button>`;
    else if (S.edit && (g.kind === "field" || g.kind === "none")) html += `<button class="rm" data-act="rmrow" data-i="${i}" data-k="${esc(g.key)}" aria-label="Remove ${esc(title(i))} from ${esc(g.name)}">${trashIcon}<span>Remove</span></button>`;
    else html += `<button class="stepin" data-act="explore" data-i="${i}" aria-label="See the connections of ${esc(title(i))} here"><span class="lbl">${L.explore}</span> ${arrowR}</button>`;
    html += `</span>`;
  }
  html += `</div>`;
  if (sel) html += peekHtml(i);
  return html;
}
function peekHtml(i) {
  const gs = connectionsOf(i).filter((g) => g.kind !== "together").slice(0, 3);
  const lines = gs.map((g) => {
    const ents = g.rows.filter((r) => r.ent !== undefined && r.ent !== current()).slice(0, 3);
    const rest = g.rows.length - ents.length;
    return `<div class="line"><span class="tert small">${esc(g.name)}</span>${ents.map((r) => pill(r.ent)).join("")}${rest > 0 ? `<bdi class="chip">+${fmt(rest)}</bdi>` : ""}</div>`;
  });
  return `<div class="peek">${lines.join("") || `<span class="muted small">No other connections.</span>`}</div>`;
}
function groupsHtml(x, { compact = false } = {}) {
  const all = connectionsOf(x);
  if (!all.length) return `<div class="empty"><span class="h">No connections yet</span><span class="small">Nothing links ${esc(title(x))} to another entity. Relationships added from either side will appear here.</span><button class="warm" data-act="addfree">Add relationship</button></div>`;
  const gs = filteredGroups(x, compact);
  let out = !compact && S.edit ? `<div class="editbar"><span class="small tert">Editing the connections of ${esc(title(x))}. Changes to a “Listed in” row are made in the entity that owns the field.</span><button class="warm" data-act="addfree">+ Add relationship</button></div>` : "";
  for (const g of gs) {
    const key = x + ":" + g.key;
    const rows = g.rows;
    const big = rows.length > 200;
    const open = S.shown[key] !== 0 && !(big && S.shown[key] === undefined);
    const lim = S.shown[key] || (compact ? 3 : 5);
    const addBtn = !compact && S.edit && g.kind === "field" ? `<button class="warm sm" data-act="addfield" data-k="${esc(g.key)}">+ Add to ${esc(g.name)}</button>` : "";
    out += `<div class="group"><div class="ghrow"><button class="gh" data-act="toggle" data-k="${esc(key)}" aria-expanded="${open}"><span class="chev">${open ? "▾" : `<span class="flip">▸</span>`}</span><span class="name">${esc(g.name)}</span><span class="n" title="${rows.length} ${g.kind === "together" ? "groups" : "connected entities"}">${fmt(rows.length)}</span>${compact ? "" : `<span class="via">${esc(g.via)}</span>`}${rows.length > 50 && !compact ? `<span class="summary">${templateSummary(rows)}</span>` : ""}</button>${addBtn}</div>`;
    if (open) {
      out += rows.slice(0, lim).map((r) => rowHtml(r, g, { compact })).join("");
      if (rows.length > lim) out += `<button class="more" data-act="more" data-k="${esc(key)}" data-lim="${lim}">${rows.length - lim <= 25 ? `Show ${fmt(rows.length - lim)} more` : `Show 25 more of ${fmt(rows.length - lim)}`}</button>`;
    }
    out += `</div>`;
  }
  return out || `<div class="empty"><span class="h">No connection matches these filters</span><button class="warm" data-act="fclear">Clear filters</button></div>`;
}

// ── Tree (default view) ──────────────────────────────────────────────────────
// Level 1: one branch per connection group (connectionsOf order). Level 2: one
// row per connected entity. Rows sit on the pane ground; connectors are CSS
// (.tnode), so the tree mirrors under RTL.
const lockIcon = `<svg class="lock" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-label="Restricted"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const chevIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const plural = (n, one, many = one + "s") => `${fmt(n)} ${n === 1 ? one : many}`;
function branchEntities(g) {
  const s = new Set();
  for (const r of g.rows) for (const m of r.members || [r.ent]) s.add(m);
  return s.size;
}
function firstPassage(r) {
  if (!HAS_P || !r.edges) return null;
  const ps = r.edges.flatMap((e) => livePassages(pByEdge.get(e))).filter((pi) => P[pi][1] === S.page);
  return ps.length ? ps.reduce((a, b) => (P[b][2] < P[a][2] ? b : a)) : null;
}
// Level 3: the row entity's own groups, one compact line each, without the root.
function beyondRoot(i) {
  return connectionsOf(i).filter((g) => g.kind !== "together").map((g) => {
    const ents = g.rows.filter((r) => r.ent !== undefined && r.ent !== S.page);
    return ents.length ? { name: g.name, key: g.key, ents } : null;
  }).filter(Boolean);
}
function level3Html(i) {
  return `<ul class="tkids tl3">${beyondRoot(i).map((g) => {
    const shown = g.ents.slice(0, 3);
    const rest = g.ents.length - shown.length;
    return `<li class="tnode"><div class="tl3row"><span class="tl3name" dir="auto">${esc(g.name)}</span><span class="tl3ents">${shown.map((r) => `<button class="tl3ent" data-act="ov" data-i="${r.ent}" title="${esc(title(r.ent))}" dir="auto">${esc(title(r.ent))}</button>`).join(`<span class="tsep">,</span>`)}${rest > 0 ? `<span class="tl3more">+${fmt(rest)}</span>` : ""}</span></div></li>`;
  }).join("")}</ul>`;
}
function treeRowHtml(r, g, oneTpl) {
  if (r.members) {
    const shown = r.members.slice(0, 4);
    return `<div class="trow"><span class="tchev" aria-hidden="true"></span><span class="tmembers">${shown.map((m) => `<span class="sq" style="background:${colorOf(m)}"></span><button class="ttitle" data-act="ov" data-i="${m}" title="${esc(title(m))}" dir="auto">${esc(title(m))}</button>`).join(`<span class="tsep">,</span>`)}${r.members.length > shown.length ? `<span class="tmeta">+${fmt(r.members.length - shown.length)}</span>` : ""}</span></div>`;
  }
  const i = r.ent;
  const pi = firstPassage(r);
  const bits = [];
  if (!oneTpl) bits.push(esc(tplName(i)));
  bits.push(plural(connectedCount(i), "connection"));
  if (r.with) bits.push(`with ${plural(r.with, "other")}`);
  const via = r.derived ? r.via.map((v) => (hidden(v) ? "1 restricted entity" : title(v))) : null;
  // Keyed per branch: the same entity under two branches opens only where clicked.
  const tk = g.key + "|" + i;
  const open = S.tx.has(tk);
  const chev = beyondRoot(i).length
    ? `<button class="tchev tx" data-act="tx" data-i="${i}" data-k="${esc(tk)}" aria-expanded="${open}" aria-label="Show the connections of ${esc(title(i))}">${chevIcon}</button>`
    : `<span class="tchev" aria-hidden="true"></span>`;
  return `<div class="trow${S.overlay === i ? " sel" : ""}${via ? " two" : ""}">${chev}<span class="sq" style="background:${colorOf(i)}"></span><span class="tmain"><span class="tline"><button class="ttitle" data-act="ov" data-i="${i}" title="${esc(title(i))}" dir="auto">${esc(title(i))}</button>${RESTR.has(i) ? lockIcon : ""}${pi !== null ? `<button class="ptag" data-act="jump" data-pi="${pi}" aria-label="Go to page ${P[pi][2]}">p.${P[pi][2]}</button>` : ""}<span class="tmeta" dir="auto">${bits.join(" · ")}</span></span>${via ? `<span class="tvia" dir="auto">↳ via ${esc(via[0])}${via.length > 1 ? ` +${via.length - 1}` : ""}</span>` : ""}</span></div>${open ? level3Html(i) : ""}`;
}
// A long branch that mixes templates splits by template, largest first.
const TPL_SPLIT = 12;
function byTemplate(rows) {
  const by = new Map();
  for (const r of rows) { const t = tplName(r.ent); if (!by.has(t)) by.set(t, []); by.get(t).push(r); }
  return [...by.entries()].sort((a, b) => b[1].length - a[1].length);
}
function moreHtml(key, n, lim) {
  if (n <= lim) return "";
  return `<li class="tnode"><button class="tmore" data-act="more" data-k="${esc(key)}" data-lim="${lim}">${n - lim <= 25 ? `Show ${fmt(n - lim)} more` : `Show 25 more of ${fmt(n - lim)}`}</button></li>`;
}
function treeHtml(x) {
  const all = connectionsOf(x);
  if (!all.length) return `<div class="empty"><span class="h">No connections yet</span><span class="small">Nothing links ${esc(title(x))} to another entity. Relationships\u00a0added from either side will appear here.</span><button class="warm" data-act="addfree">Add relationship</button></div>`;
  const gs = filteredGroups(x, false);
  if (!gs.length) return `<div class="empty"><span class="h">No connection matches</span><button class="warm" data-act="fclear">Clear</button></div>`;
  let out = `<ul class="tree">`;
  for (const g of gs) {
    const key = x + ":" + g.key;
    const rows = g.rows;
    const open = S.shown[key] !== 0 && !(rows.length > 200 && S.shown[key] === undefined);
    const lim = S.shown[key] || 5;
    // Template in the row meta only when the branch mixes templates (unfiltered).
    const full = all.find((a) => a.key === g.key);
    const oneTpl = g.kind !== "together" && new Set(full.rows.map((r) => tplOf(r.ent))).size === 1;
    const n = branchEntities(g);
    out += `<li class="tbranch"><button class="tgh" data-act="toggle" data-k="${esc(key)}" aria-expanded="${open}"><span class="tchev">${chevIcon}</span><span class="name">${esc(g.name)}</span><span class="via" dir="auto">${esc(g.via)}</span><span class="tcount" title="${plural(n, "connected entity", "connected entities")}"><span aria-hidden="true">${fmt(n)}</span><span class="sr">${plural(n, "connected entity", "connected entities")}</span></span></button>`;
    if (open) {
      const subs = g.kind !== "together" && rows.length > TPL_SPLIT ? byTemplate(rows) : null;
      if (subs && subs.length > 1) {
        out += `<ul class="tkids">${subs.map(([t, trs]) => {
          const sk = key + ":tpl:" + t;
          const sOpen = S.shown[sk] !== 0;
          const sLim = S.shown[sk] || 5;
          let li = `<li class="tnode tsubnode"><button class="tgh tsub" data-act="toggle" data-k="${esc(sk)}" aria-expanded="${sOpen}"><span class="tchev">${chevIcon}</span><span class="sq" style="background:${colorOf(trs[0].ent)}"></span><span class="name" dir="auto">${esc(t)}</span><span class="tcount" title="${plural(trs.length, "connected entity", "connected entities")}"><span aria-hidden="true">${fmt(trs.length)}</span><span class="sr">${plural(trs.length, "connected entity", "connected entities")}</span></span></button>`;
          if (sOpen) li += `<ul class="tkids">${trs.slice(0, sLim).map((r) => `<li class="tnode">${treeRowHtml(r, g, true)}</li>`).join("")}${moreHtml(sk, trs.length, sLim)}</ul>`;
          return li + `</li>`;
        }).join("")}</ul>`;
      } else {
        out += `<ul class="tkids">${rows.slice(0, lim).map((r) => `<li class="tnode">${treeRowHtml(r, g, oneTpl)}</li>`).join("")}${moreHtml(key, rows.length, lim)}</ul>`;
      }
    }
    out += `</li>`;
  }
  return out + `</ul>`;
}

// ── Graph (Connections) ──────────────────────────────────────────────────────
function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function graphHtml(x) {
  const gs = filteredGroups(x, false).filter((g) => g.kind !== "together");
  const ents = new Map();
  for (const g of gs) for (const r of g.rows) if (!ents.has(r.ent)) ents.set(r.ent, g.key);
  if (ents.size > 500) {
    const by = new Map();
    for (const e of ents.keys()) by.set(tplName(e), (by.get(tplName(e)) || 0) + 1);
    const rows = [...by.entries()].sort((a, b) => b[1] - a[1]);
    const max = rows[0][1];
    return `<div class="card mapcard"><div class="hd"><span class="name">Too many to draw</span><span class="small muted">${fmt(ents.size)} connected entities. The graph draws up to 500; here is what they are.</span></div><div class="q">${rows.map(([k, v]) => `<div class="barrow"><span class="small">${esc(k)}</span><span class="barwrap"><span class="bar2" style="width:${(v / max) * 100}%"></span></span><span class="small tert">${fmt(v)}</span></div>`).join("")}</div></div>`;
  }
  const W = 1000, H = 640;
  const trailIds = [S.page, ...S.trail].slice(0, -1);
  const hasTrail = trailIds.length > 0;
  const cx = hasTrail ? 560 : W / 2, cy = H / 2;
  const a0 = hasTrail ? -150 : -180, a1 = hasTrail ? 150 : 180;
  const span = a1 - a0;
  const total = [...ents.keys()].length || 1;
  const topNamed = new Set([...ents.keys()].sort((a, b) => degree(b) - degree(a)).slice(0, 16));
  let svg = "", nodesSvg = "", pillsSvg = "";
  let ang = a0, maxR = 150;
  const gap = gs.length > 1 ? 6 : 0;
  const named = [];
  for (const g of gs) {
    const members = g.rows.map((r) => r.ent).filter((e) => ents.get(e) === g.key);
    if (!members.length) continue;
    const share = Math.max(18, (span - gap * gs.length) * (members.length / total));
    const s0 = ang + gap / 2, s1 = Math.min(a1, s0 + share);
    ang = s1 + gap / 2;
    const cap = 36;
    const shown = members.slice(0, cap);
    let ring = 0, placed = 0;
    while (placed < shown.length) {
      const r = 150 + ring * 44;
      maxR = Math.max(maxR, r);
      const arc = ((s1 - s0) * Math.PI / 180) * r;
      const n = Math.min(Math.max(1, Math.floor(arc / 24)), shown.length - placed);
      for (let k = 0; k < n; k++) {
        const e = shown[placed + k];
        const rad = (s0 + (s1 - s0) * ((k + 0.5) / n)) * Math.PI / 180;
        const px = cx + Math.cos(rad) * r, py = cy + Math.sin(rad) * r;
        const rr = 5 + Math.min(6, Math.log2(1 + degree(e)) * 0.9);
        svg += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="var(--border-soft)" stroke-width="1"/>`;
        nodesSvg += `<g class="mnode" data-act="ov" data-i="${e}" tabindex="0" role="button" aria-label="Preview ${esc(title(e))}"><title>${esc(title(e))} · ${esc(tplName(e))}</title><circle cx="${px}" cy="${py}" r="${rr}" fill="${colorOf(e)}" stroke="var(--text-primary)" stroke-width="1"/></g>`;
        if (topNamed.has(e) || members.length <= 6) named.push({ e, px, py, rr, right: Math.cos(rad) >= 0 });
      }
      placed += n; ring++;
    }
    const mid = ((s0 + s1) / 2) * Math.PI / 180;
    if (members.length > cap) {
      const r = 150 + ring * 44;
      nodesSvg += `<text x="${cx + Math.cos(mid) * r}" y="${cy + Math.sin(mid) * r}" text-anchor="middle" class="mlabel muted">+${fmt(members.length - cap)} more</text>`;
    }
    const lx = cx + Math.cos(mid) * 112, ly = cy + Math.sin(mid) * 112;
    const lab = trunc(g.name, 24);
    const lw = lab.length * 6.3 + 16;
    pillsSvg += `<g><rect x="${lx - lw / 2}" y="${ly - 11}" width="${lw}" height="22" rx="6" fill="var(--bg-surface)" stroke="var(--border-primary)"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" class="mgroup">${esc(lab)}</text></g>`;
  }
  // Names go in two columns outside the rings, spread so they never overlap,
  // each tied to its dot by a leader line.
  for (const side of [true, false]) {
    const list = named.filter((n) => n.right === side).sort((a, b) => a.py - b.py);
    const colX = side ? Math.min(W - 180, cx + maxR + 40) : Math.max(170, cx - maxR - 40);
    let y = 16;
    for (const n of list) { n.ly = Math.max(n.py, y); y = n.ly + 17; }
    const over = y - 17 - (H - 12);
    if (over > 0) for (const n of list) n.ly -= over;
    for (let k = list.length - 2; k >= 0; k--) if (list[k].ly > list[k + 1].ly - 17) list[k].ly = list[k + 1].ly - 17;
    for (const n of list) {
      svg += `<polyline points="${n.px + (side ? n.rr : -n.rr)},${n.py} ${colX + (side ? -6 : 6)},${n.ly}" fill="none" stroke="var(--border-soft)" stroke-width="1"/>`;
      nodesSvg += `<text x="${colX}" y="${n.ly + 4}" text-anchor="${side ? "start" : "end"}" class="mlabel" data-act="ov" data-i="${n.e}">${esc(trunc(title(n.e), 30))}</text>`;
    }
  }
  svg += nodesSvg + pillsSvg;
  // Trail spine: the steps that led here, entering from the start side.
  if (hasTrail) {
    const n = trailIds.length;
    const xs = trailIds.map((_, k) => 70 + k * Math.min(150, (cx - 200) / Math.max(1, n)));
    trailIds.forEach((t, k) => {
      const x2 = k + 1 < n ? xs[k + 1] : cx - 34;
      svg += `<line x1="${xs[k]}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="var(--text-tertiary)" stroke-width="2" stroke-dasharray="${k + 1 < n ? "0" : "4 3"}"/>`;
      svg += `<g class="mnode" data-act="crumb" data-k="${k}" tabindex="0" role="button" aria-label="Back to ${esc(title(t))}"><circle cx="${xs[k]}" cy="${cy}" r="7" fill="${colorOf(t)}" stroke="var(--text-primary)" opacity="0.8"/><text x="${xs[k]}" y="${cy + 24}" text-anchor="middle" class="mlabel tert">${esc(trunc(title(t), 18))}</text></g>`;
    });
  }
  svg += `<circle cx="${cx}" cy="${cy}" r="26" fill="${colorOf(x)}" stroke="var(--text-primary)" stroke-width="1.5"/><text x="${cx}" y="${cy + 46}" text-anchor="middle" class="mcentre">${esc(trunc(title(x), 34))}</text>`;
  return `<div class="card mapcard"><svg viewBox="0 0 ${W} ${H}" width="100%" role="group" aria-label="Graph of the connections of ${esc(title(x))}">${svg}</svg><div class="maplegend small tert"><span>${hasTrail ? "The line on the start side is the trail that led here. " : ""}Names show for the 14 most connected entities; hover or focus a dot for the rest. Click a dot to preview it.</span></div></div>`;
}

// ── Paths ────────────────────────────────────────────────────────────────────
function chainHtml(res) {
  let h = "";
  res.layers.forEach((layer, d) => {
    if (d > 0) h += `<span>${esc(res.edgesBetween[d - 1].labels.join(" / "))}</span>`;
    h += layer.length === 1 ? pill(layer[0]) : `<span class="chip">any of ${fmt(layer.length)} ${esc(tplName(layer[0]))}</span>`;
  });
  return h;
}
function pathListHtml(res) {
  let h = `<ol class="path">`;
  res.layers.forEach((layer, d) => {
    if (d > 0) h += `<li class="edge">${esc(res.edgesBetween[d - 1].labels.join(" / "))}</li>`;
    const end = d === 0 || d === res.layers.length - 1;
    if (layer.length === 1) h += `<li class="node${end ? " end" : ""}">${pill(layer[0])}<span class="small muted">${esc(tplName(layer[0]))}</span>${S.pin === layer[0] && !end ? `<button class="chip" data-act="unpin">pinned ×</button>` : ""}</li>`;
    else {
      const show = S.forks[d] ? layer.slice(0, 40) : layer.slice(0, 3);
      h += `<li class="node fork"><span class="small tert">any of ${fmt(layer.length)}</span>${show.map((m) => pill(m, { act: "pin" })).join("")}${layer.length > show.length ? `<button class="chip" data-act="fork" data-d="${d}"><bdi>+${fmt(layer.length - show.length)}</bdi></button>` : ""}</li>`;
    }
  });
  return h + `</ol>`;
}
function pathGraphHtml(res) {
  const W = 1600, H = 360, cols = res.layers.length;
  const xs = res.layers.map((_, d) => 70 + d * ((W - 140) / (cols - 1)));
  const pos = new Map();
  let svg = "";
  res.layers.forEach((layer, d) => {
    const show = layer.slice(0, 7);
    show.forEach((e, k) => pos.set(e, [xs[d], H / 2 + (k - (show.length - 1) / 2) * 34]));
  });
  res.edgesBetween.forEach((b, d) => {
    for (const [u, v] of b.pairs) { const p = pos.get(u), q = pos.get(v); if (p && q) svg += `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="var(--border-soft)" stroke-width="1.5"/>`; }
    svg += `<text x="${(xs[d] + xs[d + 1]) / 2}" y="26" text-anchor="middle" class="mlabel tert">${esc(trunc(b.labels[0] || "", 26))}</text>`;
  });
  res.layers.forEach((layer, d) => {
    const show = layer.slice(0, 7);
    show.forEach((e) => { const [x, y] = pos.get(e); const end = d === 0 || d === cols - 1; svg += `<g class="mnode" data-act="${layer.length > 1 ? "pin" : "ov"}" data-i="${e}" tabindex="0" role="button" aria-label="${esc(title(e))}"><title>${esc(title(e))}</title><circle cx="${x}" cy="${y}" r="${end ? 11 : 7}" fill="${colorOf(e)}" stroke="var(--text-primary)"/></g>`; });
    const lab = layer.length === 1 ? trunc(title(layer[0]), 22) : `any of ${fmt(layer.length)}`;
    svg += `<text x="${xs[d]}" y="${H - 24}" text-anchor="middle" class="mlabel">${esc(lab)}</text>`;
    if (layer.length > 7) svg += `<text x="${xs[d]}" y="${H / 2 + 4 * 34 + 6}" text-anchor="middle" class="mlabel tert">+${layer.length - 7}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="group" aria-label="Graph of the shortest connection">${svg}</svg>`;
}
function pathsView() {
  const a = current();
  const skipChips = [...S.skip].map((ty) => `<button class="chip" data-act="unskip" data-ty="${ty}">${esc(ty < 0 ? "Without a relation type" : D.types[ty][1])} ×</button>`).join("");
  const addable = D.types.map((t, i) => i).filter((i) => !S.skip.has(i));
  let h = `<div class="body host" id="body"><div class="card"><div class="q">
    <div class="field"><span class="k">From</span>${pill(a, { lg: true })}${S.trail.length ? `<span class="small muted">the entity you are following</span>` : ""}</div>
    <div class="field"><span class="k">To</span>${S.to !== null ? `${pill(S.to, { lg: true })}<button class="chip" data-act="pickmodal">Change</button>` : `<button class="warm" data-act="pickmodal">Choose an entity…</button>`}</div>
    <div class="field"><span class="k">Skip</span>${skipChips}${S.skip.has(-1) ? "" : `<button class="chip add" data-act="skipadd" data-ty="-1">+ Without a relation type</button>`}<select class="chip add" data-act="skipsel" aria-label="Skip another relation type"><option value="">+ Relation type</option>${addable.map((i) => `<option value="${i}">${esc(D.types[i][1])}</option>`).join("")}</select><span class="small muted">applies to the steps between, never to From and To</span></div>
    <div class="field"><span class="k">Up to</span><select class="btn" data-act="maxd" aria-label="Maximum steps">${[3, 4, 5, 6, 7, 8].map((n) => `<option ${n === S.maxD ? "selected" : ""}>${n}</option>`).join("")}</select><span class="small muted">steps</span></div>
  </div></div>`;
  if (S.to === null) {
    h += `<div class="card"><div class="empty"><span class="h">How does ${esc(title(a))} connect to something else?</span><span class="small">Choose a second entity. The shortest connection is shown step by step, with every route that is equally short folded into one line.</span></div></div>`;
  } else {
    const res = S.pin !== null ? shortestVia(a, S.pin, S.to, S.skip, S.maxD) : shortest(a, S.to, S.skip, S.maxD);
    if (!res) {
      const loose = shortest(a, S.to, new Set(), 8);
      h += `<div class="card"><div class="hd"><span class="name">No connection within ${S.maxD} steps</span><span class="small muted">with the skipped types left out</span></div>`;
      if (loose) h += `<div class="notice"><span>Through the skipped types they connect in ${loose.steps} step${loose.steps > 1 ? "s" : ""}:</span><span class="chain">${chainHtml(loose)}</span></div>`;
      else h += `<div class="empty"><span class="small">Not connected within 8 steps, even through skipped types.</span></div>`;
      h += `<div class="q"><div class="field">${S.maxD < 8 ? `<button class="warm" data-act="maxd+">Allow ${S.maxD + 2} steps</button>` : ""}${loose ? `<button class="btn" data-act="noskip">Include skipped types</button>` : ""}</div></div></div>`;
    } else {
      const forks = res.layers.filter((l) => l.length > 1).length;
      h += `<div class="card"><div class="hd"><span class="name">Shortest connection</span><span class="small muted">${res.steps} step${res.steps > 1 ? "s" : ""} · ${fmt(res.routes)} route${res.routes > 1 ? "s" : ""}${forks ? `, differing at ${forks} step${forks > 1 ? "s" : ""}` : ""}</span><span class="grow"></span><div class="seg" role="group" aria-label="Show as"><button data-act="pview" data-v="list" aria-pressed="${S.view.paths === "list"}">List</button><button data-act="pview" data-v="graph" aria-pressed="${S.view.paths === "graph"}">Graph</button><button data-act="pview" data-v="time" aria-pressed="${S.view.paths === "time"}">Time</button></div></div>`;
      if (res.routes > 50) h += `<div class="notice"><span><b>${fmt(res.routes)} equally short routes.</b> The “any of” steps are where they differ.</span><span class="small tert">Pick an entity in one of those steps to pin the route, or skip the relation type that makes a step wide.</span></div>`;
      else if (forks) h += `<div class="q small tert" style="padding-bottom:0">Routes differ at the “any of” steps. Pick an entity there to pin the route through it.</div>`;
      h += (S.view.paths === "graph" ? pathGraphHtml(res) : S.view.paths === "time" ? pathTimeHtml(res) : pathListHtml(res)) + `</div>`;
    }
  }
  const pat = PATTERNS[tplName(a)];
  if (pat) {
    const sents = hop(a, pat.steps[0][0], pat.steps[0][1], true);
    let rows = "";
    for (const s of sents.slice(0, 4)) {
      const js = hop(s, pat.steps[1][0], pat.steps[1][1]);
      const list = js.length ? js : [null];
      list.forEach((j, k) => {
        const p = j !== null ? hop(j, pat.steps[2][0], pat.steps[2][1]) : [];
        rows += `<tr>${k === 0 ? `<td rowspan="${list.length}">${hidden(s) ? `<span class="small muted">1 restricted entity</span>` : pill(s)}</td>` : ""}<td>${j !== null ? pill(j) : `<span class="muted">—</span>`}</td><td>${p.length ? p.map((x) => pill(x)).join(" ") : `<span class="muted">—</span>`}</td></tr>`;
      });
    }
    h += `<div class="card"><div class="hd"><span class="name">Along a pattern</span><span class="small muted">“${esc(pat.name)}”, defined by the ${esc(tplName(a))} template</span></div><table><thead><tr><th>${esc(pat.steps[0][1])}</th><th>${esc(pat.steps[1][1])}</th><th>${esc(pat.steps[2][1])}</th></tr></thead><tbody>${rows || `<tr><td colspan="3" class="muted">Nothing reached along this pattern.</td></tr>`}</tbody></table></div>`;
  }
  return h + `</div>`;
}

// ── In the document ──────────────────────────────────────────────────────────
function docRows(x) {
  const f = S.f.document;
  const q = fold(S.q.trim());
  return docPassages(x).map((pi) => {
    const e = P[pi][0];
    const other = E[e * 4] === x ? E[e * 4 + 1] : E[e * 4];
    return { pi, e, other, page: P[pi][2], text: P[pi][3], ty: E[e * 4 + 2] };
  }).filter((r) => (!f.tpl.size || f.tpl.has(tplName(r.other))) && (!f.rel.size || f.rel.has(r.ty < 0 ? "none" : D.types[r.ty][1])) && (!q || fold(r.text + " " + title(r.other)).includes(q)));
}
function documentView() {
  const x = S.page;
  const pc = pageCount(x);
  const rows = docRows(x);
  const inR = rows.filter((r) => r.page <= pc);
  const outR = rows.filter((r) => r.page > pc);
  const per = Array(pc + 1).fill(0);
  for (const r of inR) per[r.page]++;
  const max = Math.max(1, ...per);
  const [ra, rb] = S.pages || [0, 0];
  const inSel = (p) => S.pages && p >= ra && p <= rb;
  const selCount = S.pages ? inR.filter((r) => inSel(r.page)).length : 0;
  let h = `<div class="strip2" aria-label="Passages by page"><div class="line" style="margin-bottom:.4rem"><span class="small tert">Passages by page</span><span class="grow"></span>${S.pages ? `<button class="chip" data-act="clearpages">p.${ra}${rb !== ra ? `–p.${rb}` : ""} · ${selCount} passage${selCount === 1 ? "" : "s"} ×</button>` : `<span class="small muted">Click a page, or drag across pages, to narrow the list</span>`}</div>
    <div class="bars" id="bars">${per.slice(1).map((n, k) => `<button class="bar${inSel(k + 1) ? " on" : ""}${S.docPage === k + 1 ? " here" : ""}" data-act="bar" data-p="${k + 1}" style="height:${0.35 + (n / max) * 2}rem" aria-label="Page ${k + 1}: ${n} passage${n === 1 ? "" : "s"}" title="p.${k + 1} · ${n}"></button>`).join("")}</div>
    <div class="axis"><span>p.1</span><span>p.${Math.round(pc / 4)}</span><span>p.${Math.round(pc / 2)}</span><span>p.${Math.round((3 * pc) / 4)}</span><span>p.${pc}</span></div>
    ${outR.length ? `<div class="outside"><span>${outR.length} passage${outR.length > 1 ? "s" : ""} point at pages ${Math.min(...outR.map((r) => r.page))}–${Math.max(...outR.map((r) => r.page))}, which this ${pc}-page rendition does not have.</span><span class="grow"></span><button class="link" data-act="outside">${S.outside ? "Hide them" : "List them"}</button></div>` : ""}</div>`;
  const list = (S.pages ? inR.filter((r) => inSel(r.page)) : inR).concat(S.outside ? outR : []);
  const byPage = new Map();
  for (const r of list) (byPage.get(r.page) || byPage.set(r.page, []).get(r.page)).push(r);
  const pages = [...byPage.keys()].sort((a, b) => a - b);
  const pageLim = S.shown["doc:pages"] || 4;
  if (S.edit) h += `<div class="editbar"><span class="small tert">Select text in the document to connect a passage. Each passage can be removed here.</span></div>`;
  for (const p of pages.slice(0, S.pages ? 99 : pageLim)) {
    const rs = byPage.get(p);
    const key = "doc:" + p;
    const lim = S.shown[key] || 5;
    h += `<div class="group"><div class="ph"><span class="name">Page ${p}</span><span class="n">${rs.length}</span>${p > pc ? `<span class="small muted">not in this rendition</span>` : ""}</div>`;
    for (const r of rs.slice(0, lim)) {
      h += `<div class="prow${S.activeP === r.pi ? " sel" : ""}"><div class="line">${pill(r.other)}<span class="small tert">${esc(r.ty < 0 ? "no relation type" : D.types[r.ty][1].toLowerCase())}</span><span class="grow"></span>${S.edit ? `<button class="rm" data-act="rmpassage" data-pi="${r.pi}" aria-label="Delete this passage">${trashIcon}<span>Delete</span></button>` : ""}<button class="ptag" data-act="jump" data-pi="${r.pi}" aria-label="Go to page ${p}"${p > pc ? " disabled" : ""}>p.${p}</button></div><div class="quote" dir="auto">“${esc(r.text)}”</div></div>`;
    }
    if (rs.length > lim) h += `<button class="more" data-act="more" data-k="${key}" data-lim="${lim}">Show ${rs.length - lim} more on page ${p}</button>`;
    h += `</div>`;
  }
  if (!S.pages && pages.length > pageLim) h += `<button class="more card" data-act="more" data-k="doc:pages" data-lim="${pageLim}">Show ${Math.min(6, pages.length - pageLim)} more pages of ${pages.length - pageLim}</button>`;
  if (!pages.length) h += `<div class="empty"><span class="h">No passage matches</span><button class="warm" data-act="fclear">Clear filters</button></div>`;
  return `<div class="body host" id="body">${h}</div>`;
}
const FILLER = ["The Commission received the petition and transmitted its pertinent parts to the State.", "The parties submitted observations within the time limits set by the Commission.", "In the following paragraphs the Commission sets out the facts it considers established.", "The State did not dispute this point in its observations on the merits.", "Several witnesses gave consistent accounts of the events that followed."];
function docPaneHtml() {
  const x = S.page;
  const pc = pageCount(x);
  if (!pc) return `<div class="docpane"><div class="top"><span class="strip"><span class="on">Document</span></span></div><div class="sheet"><div class="h"></div><div class="h" style="width:40%"></div>${'<div class="l"></div>'.repeat(14)}</div></div>`;
  const page = S.docPage || (S.pages ? S.pages[0] : 1);
  const ps = docPassages(x).filter((pi) => P[pi][2] === page);
  let body = `<p class="pageno">— ${page} —</p>`;
  ps.forEach((pi, k) => {
    body += `<p>${FILLER[(page + k) % FILLER.length]} <mark class="${S.activeP === pi ? "act" : ""}" data-act="markclick" data-pi="${pi}">${esc(P[pi][3])}</mark> ${FILLER[(page + k + 2) % FILLER.length]}</p>`;
  });
  body += `<p>${FILLER[(page + 3) % FILLER.length]} ${FILLER[(page + 4) % FILLER.length]}</p>`;
  return `<div class="docpane"><div class="top"><span class="strip"><span class="on">Document</span></span><span class="small muted">Select text to connect a passage</span></div><div class="page" id="page" data-page="${page}">${body}</div><div class="footer"><span>OCR PDF</span><span class="grow"></span><button class="link" data-act="docpg" data-d="-1" ${page <= 1 ? "disabled" : ""}>Previous</button><span>${page} / ${pc}</span><button class="link" data-act="docpg" data-d="1" ${page >= pc ? "disabled" : ""}>Next</button></div>${S.sel ? `<button class="floatmenu" data-act="connectsel" style="left:${S.sel.x}px;top:${S.sel.y}px">Connect passage…</button>` : ""}</div>`;
}

// ── When (time lens) ─────────────────────────────────────────────────────────
// Unit: a dated EVENT — one date property of the entity you are on, or of an
// entity connected to it. Relationships carry no dates of their own, so a
// connection is placed at the dates of the entity at its other end; the field
// it came through is the event's lane/group. Layout mirrors TimeSpine
// (components/library/TimeSpine.tsx): proportional scale, silences elided with
// an "N later" break, collisions pushed down with a leader back to the instant.
const YEAR_MS = 365.2425 * 86_400_000;
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MON3[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const elapsedTxt = (ms) => { const y = ms / YEAR_MS; if (y >= 1.5) return `${Math.round(y)} years later`; const m = Math.round(ms / (YEAR_MS / 12)); if (m >= 12) return "1 year later"; return m >= 2 ? `${m} months later` : `${Math.max(1, Math.round(ms / 86_400_000))} days later`; };
const dateLabel = (k) => (D.dateLabels ? D.dateLabels[k] : "Date");

function eventsOf(x) {
  const ev = [], undated = [];
  const byEnt = new Map(); // one event per (entity, date); groups are joined
  const push = (e, group, own) => {
    if (byEnt.has(e)) { const g = byEnt.get(e); if (!g.includes(group)) g.push(group); return; }
    byEnt.set(e, [group]);
    const ds = D.dates && D.dates[e];
    if (!ds || !ds.length) { if (!own) undated.push({ e, group }); return; }
    for (const [lab, a, b] of ds) ev.push({ e, groups: byEnt.get(e), get group() { return this.groups[0]; }, own, label: dateLabel(lab), t: a * 1000, t2: b ? b * 1000 : 0 });
  };
  push(x, "This entity", true);
  const seen = new Set([x]);
  for (const g of connectionsOf(x)) {
    // Direct connections only: a derived group is two hops away and its dates
    // (a judge's whole mandate) swamp the entity's own sequence.
    if (g.kind === "derived") continue;
    for (const r of g.rows) for (const m of r.members || [r.ent]) {
      if (seen.has(g.key + ":" + m)) continue; seen.add(g.key + ":" + m);
      push(m, g.kind === "listed" ? g.name.replace(/^Listed as (.*) in$/, "Listed in · $1") : g.name, false);
    }
  }
  return { ev: ev.sort((a, b) => a.t - b.t), undated };
}

// Vertical spine. rows: [{t, t2?, html, color, own}]
function spineHtml(rows, { rowH = 26 } = {}) {
  if (!rows.length) return `<div class="empty"><span class="small">Nothing dated here.</span></div>`;
  const MAX_GAP = 88, GAP_H = 32, PAD = 14;
  const min = rows[0].t, max = rows[rows.length - 1].t;
  const spanYears = Math.max((max - min) / YEAR_MS, 1 / 365);
  const scale = Math.min(Math.max((rows.length * rowH * 1.35) / spanYears, 190), 40000);
  const raw = (t) => PAD + ((t - min) / YEAR_MS) * scale;
  const cuts = []; let accum = 0, prevRaw = raw(min), prevT = min, cursor = 0, prevY = 0;
  const gaps = [];
  const placed = rows.map((row) => {
    const r = raw(row.t); const delta = r - prevRaw; let broke = 0;
    if (delta > MAX_GAP) { const cut = delta - MAX_GAP; cuts.push({ fromRaw: prevRaw, atRaw: r, cut }); accum += cut; broke = row.t - prevT; }
    prevRaw = r; prevT = row.t;
    const ideal = r - accum;
    const y = Math.max(ideal, broke ? cursor + GAP_H : cursor);
    if (broke) gaps.push({ y: (prevY + y) / 2 + 1, ms: broke });
    prevY = y; cursor = y + rowH;
    return { row, y, ideal };
  });
  const at = (t) => { const r = raw(t); let a = 0; for (const c of cuts) { if (c.atRaw <= r) a += c.cut; else if (c.fromRaw < r) { const span = c.atRaw - c.fromRaw; return c.fromRaw - a + ((r - c.fromRaw) / span) * (span - c.cut); } } return r - a; };
  const H = cursor + PAD + 12;
  // year marks on the axis, skipping ones that fall inside an elided stretch
  let marks = "";
  const y0 = new Date(min).getUTCFullYear(), y1 = new Date(max).getUTCFullYear();
  const step = y1 - y0 > 30 ? 5 : y1 - y0 > 12 ? 2 : 1;
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    const t = Date.UTC(y, 0, 1); if (t < min) continue;
    const inCut = cuts.some((c) => raw(t) > c.fromRaw + 8 && raw(t) < c.atRaw - 8);
    if (!inCut) marks += `<div class="ymark" style="top:${at(t)}px"><span>${y}</span></div>`;
  }
  const spans = placed.filter((p) => p.row.t2).map((p) => `<div class="span" style="top:${p.ideal}px;height:${Math.max(4, at(p.row.t2) - p.ideal)}px;background:${p.row.color}"></div>`).join("");
  const body = placed.map((p) => {
    const lead = Math.abs(p.y - p.ideal) > 1 ? `<svg class="lead" style="top:${Math.min(p.ideal, p.y + rowH / 2)}px;height:${Math.abs(p.y + rowH / 2 - p.ideal) + 1}px" preserveAspectRatio="none" viewBox="0 0 22 10"><path d="M0 ${p.y + rowH / 2 > p.ideal ? 10 : 0} L22 ${p.y + rowH / 2 > p.ideal ? 0 : 10}" vector-effect="non-scaling-stroke"/></svg>` : "";
    return `<div class="srow${p.row.own ? " own" : ""}" style="top:${p.y}px;height:${rowH}px">${p.row.html}</div>${lead}<i class="dot${p.row.own ? " own" : ""}" style="top:${p.ideal}px;background:${p.row.color}"></i>`;
  }).join("");
  const gapHtml = gaps.map((g) => `<div class="gap" style="top:${g.y}px"><span>${elapsedTxt(g.ms)}</span></div>`).join("");
  return `<div class="spine" style="height:${H}px"><div class="axis"></div>${marks}${spans}${gapHtml}${body}</div>`;
}

function densityHtml(ev) {
  if (!ev.length) return "";
  const by = new Map();
  for (const e of ev) { const y = new Date(e.t).getUTCFullYear(); by.set(y, (by.get(y) || 0) + 1); }
  const y0 = Math.min(...by.keys()), y1 = Math.max(...by.keys());
  const max = Math.max(...by.values());
  let bars = "";
  for (let y = y0; y <= y1; y++) { const n = by.get(y) || 0; const on = S.years && y >= S.years[0] && y <= S.years[1]; bars += `<button class="bar${on ? " on" : ""}" data-act="year" data-y="${y}" style="height:${n ? 0.3 + (n / max) * 1.9 : 0.12}rem" aria-label="${y}: ${n} event${n === 1 ? "" : "s"}" title="${y} · ${n}"></button>`; }
  return `<div class="strip2"><div class="line" style="margin-bottom:.35rem"><span class="small tert">Events by year</span><span class="grow"></span>${S.years ? `<button class="chip" data-act="clearyears">${S.years[0]}${S.years[1] !== S.years[0] ? `–${S.years[1]}` : ""} ×</button>` : `<span class="small muted">Click a year, or shift-click to extend</span>`}</div><div class="bars">${bars}</div><div class="axis2"><span>${y0}</span><span>${Math.round((y0 + y1) / 2)}</span><span>${y1}</span></div></div>`;
}

function evRow(e) {
  return `<span class="sdate">${e.t2 ? `${new Date(e.t).getUTCFullYear()}–${new Date(e.t2).getUTCFullYear()}` : fmtDay(e.t)}</span>${e.own ? `<span class="small" style="font-weight:500">${esc(e.label)}</span>` : `${pill(e.e)}<span class="small tert" dir="auto">${esc(e.label)} · ${esc(e.groups[0])}${e.groups.length > 1 ? ` <bdi>+${e.groups.length - 1}</bdi>` : ""}</span>`}`;
}

function whenView() {
  const x = current();
  const { ev: all, undated } = eventsOf(x);
  let ev = all;
  const f = fConn();
  if (f.tpl.size) ev = ev.filter((e) => e.own || f.tpl.has(tplName(e.e)));
  if (S.years) ev = ev.filter((e) => { const y = new Date(e.t).getUTCFullYear(); return e.own || (y >= S.years[0] && y <= S.years[1]); });
  let h = densityHtml(all);
  const big = ev.length > 240 && !S.years;
  if (S.view.when === "lanes" && innerWidth >= 768) h += `<div class="card mapcard">${lanesHtml(ev, x)}</div>`;
  else if (big) {
    // Aggregate when zoomed out: one row per year; a year opens the spine.
    const by = new Map(); for (const e of ev) { const y = new Date(e.t).getUTCFullYear(); (by.get(y) || by.set(y, []).get(y)).push(e); }
    h += `<div class="card"><div class="hd"><span class="name">${fmt(ev.length)} dated events</span><span class="small muted">too many to lay out one by one; pick a year above or below</span></div>${[...by.entries()].map(([y, es]) => `<button class="yrow" data-act="year" data-y="${y}"><span class="sdate">${y}</span><span class="small">${fmt(es.length)} event${es.length > 1 ? "s" : ""}</span><span class="small tert">${esc(templateSummary(es.map((e) => ({ ent: e.e }))).replace(/&amp;/g, "&"))}</span></button>`).join("")}</div>`;
  } else h += `<div class="card"><div class="hd"><span class="name">${fmt(ev.length)} dated event${ev.length === 1 ? "" : "s"}</span><span class="small muted">around ${esc(title(x))}</span></div>${spineHtml(ev.map((e) => ({ t: e.t, t2: e.t2, own: e.own, color: e.own ? "var(--text-primary)" : colorOf(e.e), html: evRow(e) })))}</div>`;
  if (undated.length) h += `<div class="card"><div class="hd"><span class="name">Without a date</span><span class="n">${undated.length}</span><span class="small muted">connected, but nothing on either end has a date</span></div><div class="q"><div class="line">${undated.slice(0, 12).map((u) => pill(u.e)).join("")}${undated.length > 12 ? `<bdi class="chip">+${undated.length - 12}</bdi>` : ""}</div></div></div>`;
  return `<div class="body host" id="body">${h}</div>`;
}

// Lanes: one row per group, shared horizontal axis. Considered, not recommended.
function lanesHtml(ev, x) {
  if (!ev.length) return "";
  const groups = []; for (const e of ev) if (!groups.includes(e.group)) groups.push(e.group);
  const min = ev[0].t, max = Math.max(...ev.map((e) => e.t2 || e.t));
  const W = 1000, LW = 190, LH = 30, H = groups.length * LH + 40;
  const X = (t) => LW + 10 + ((t - min) / Math.max(1, max - min)) * (W - LW - 30);
  let svg = "";
  const y0 = new Date(min).getUTCFullYear(), y1 = new Date(max).getUTCFullYear(); const step = y1 - y0 > 30 ? 10 : y1 - y0 > 12 ? 5 : 1;
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const xx = X(Date.UTC(y, 0, 1)); svg += `<line x1="${xx}" y1="16" x2="${xx}" y2="${H - 10}" stroke="var(--border-primary)"/><text x="${xx}" y="12" text-anchor="middle" class="mlabel tert">${y}</text>`; }
  groups.forEach((g, k) => { const yy = 30 + k * LH; svg += `<text x="${LW}" y="${yy + 4}" text-anchor="end" class="mlabel">${esc(trunc(g, 28))}</text><line x1="${LW + 6}" y1="${yy}" x2="${W - 10}" y2="${yy}" stroke="var(--border-soft)" stroke-dasharray="2 3"/>`; });
  for (const e of ev) { const yy = 30 + groups.indexOf(e.group) * LH; const xx = X(e.t); if (e.t2) svg += `<rect x="${xx}" y="${yy - 3}" width="${Math.max(3, X(e.t2) - xx)}" height="6" rx="3" fill="${colorOf(e.e)}" opacity="0.55"/>`; svg += `<g class="mnode" data-act="ov" data-i="${e.e}" tabindex="0" role="button" aria-label="${esc(title(e.e))}, ${fmtDay(e.t)}"><title>${esc(title(e.e))} · ${esc(e.label)} · ${fmtDay(e.t)}</title><circle cx="${xx}" cy="${yy}" r="${e.own ? 6 : 4.5}" fill="${e.own ? "var(--text-primary)" : colorOf(e.e)}" stroke="var(--bg-surface)" stroke-width="1.5"/></g>`; }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="group" aria-label="Events by group over time">${svg}</svg>`;
}

// A path laid on time: every entity on the shortest connection, at its dates.
function pathTimeHtml(res) {
  const rows = [];
  res.layers.forEach((layer, d) => layer.slice(0, 12).forEach((e) => {
    const ds = D.dates && D.dates[e];
    if (!ds) return;
    const [lab, a, b] = ds[0];
    rows.push({ t: a * 1000, t2: b ? b * 1000 : 0, own: d === 0 || d === res.layers.length - 1, color: colorOf(e), html: `<span class="sdate">${fmtDay(a * 1000)}</span><span class="stepno">${d}</span>${pill(e)}<span class="small tert">${esc(dateLabel(lab))}</span>` });
  }));
  rows.sort((p, q) => p.t - q.t);
  const undatedN = res.layers.reduce((n, l) => n + l.slice(0, 12).filter((e) => !(D.dates && D.dates[e])).length, 0);
  return `<div class="q small tert" style="padding-bottom:0">Each entity on the route, placed at its own date. Step numbers follow the route; the axis follows time. ${undatedN ? `${undatedN} on the route have no date.` : ""}</div>${spineHtml(rows)}`;
}

// ── Chrome: trail, overlay, filters, modals ──────────────────────────────────
function trailHtml() {
  if (!S.trail.length && !connectionsOf(S.page).length) return "";
  if (!S.trail.length) return `<div class="trail idle"><span>“See connections” on a row follows it here, one step at a time. You stay on ${esc(title(S.page))}.</span></div>`;
  const chain = [S.page, ...S.trail];
  const crumb = (c, k) => `<button class="link" data-act="crumb" data-k="${k}" dir="auto">${esc(title(c))}</button><span class="sep">${arrowR}</span>`;
  const prev = chain.slice(0, -1);
  const crumbs = prev.length <= 2 ? prev.map(crumb).join("")
    : crumb(prev[0], 0) + `<button class="link" data-act="crumb" data-k="${prev.length - 2}" title="${esc(prev.slice(1, -1).map(title).join(" › "))}">… ${prev.length - 2} more</button><span class="sep">${arrowR}</span>` + crumb(prev[prev.length - 1], prev.length - 1);
  const here = chain[chain.length - 1];
  return `<div class="trail"><button class="warm" data-act="back" aria-label="Back to ${esc(title(chain[chain.length - 2]))}">‹ Back</button><span class="lbl">Following from</span><span class="crumbs">${crumbs}<span class="here">${sq(here)}<span dir="auto">${esc(title(here))}</span></span></span><span class="small muted desk">step ${S.trail.length}</span><button class="btn" data-act="goto" data-i="${here}">${L.open} <span class="flip">→</span></button></div>`;
}
function overlayHtml() {
  const x = S.overlay;
  const from = lensFor(S.page) === "document" ? S.page : current();
  let how = "";
  const direct = from !== x ? connectionsOf(from).find((g) => g.rows.some((r) => r.ent === x || (r.members && r.members.includes(x)))) : null;
  if (direct) {
    const np = HAS_P ? direct.rows.filter((r) => r.ent === x).reduce((n, r) => n + passagesOfRow(r), 0) : 0;
    how = `<span class="chain">${pill(from)}<span>${esc(direct.name)}</span><span style="color:var(--text-primary)">this ${esc(tplName(x))}</span></span><span class="small muted">Directly, 1 step${np ? ` · ${np} passage${np > 1 ? "s" : ""} in ${esc(title(from))}` : ""}.</span>`;
  } else if (from !== x) {
    const res = shortest(from, x, S.skip.size ? S.skip : DEFAULT_SKIP, 6);
    if (res) how = `<span class="chain">${chainHtml(res)}</span><span class="small muted">${res.steps} steps${res.routes > 1 ? ` · ${fmt(res.routes)} routes` : ""}</span>`;
    else {
      const loose = shortest(from, x, new Set(), 6);
      how = loose ? `<span class="small">No connection within 6 steps without the skipped types.</span><span class="chain">${chainHtml(loose)}</span>` : `<span class="small">Not connected to ${esc(title(from))} within 6 steps.</span>`;
    }
  }
  if (how) how = `<div class="how"><span class="hl">How this connects to ${esc(title(from))}</span>${how}</div>`;
  return `<aside class="overlay" role="dialog" aria-label="${esc(title(x))}">
    <div class="ovhead"><div><div class="kicker">${sq(x)}${esc(tplName(x))}</div><div class="title" dir="auto">${esc(title(x))}</div></div><button data-act="close" aria-label="Close" class="tert">✕</button></div>
    ${how}
    <div class="host" style="padding-top:.6rem"><div class="strip"><span>Metadata</span><span class="on">Relationships <em class="cnt">${fmt(connectedCount(x))}</em></span></div></div>
    <div class="ovbody">${groupsHtml(x, { compact: true })}</div>
    <div class="footer"><span class="grow"></span><button class="warm" data-act="explore" data-i="${x}">${L.explore}</button><button class="ink" data-act="goto" data-i="${x}">${L.open} <span class="flip">→</span></button></div>
  </aside>`;
}
function facetBlock(title_, key, counts, sel) {
  return `<div class="facet"><div class="fh">${esc(title_)}</div>${counts.map(([k, n, lab]) => `<label class="fo"><input type="checkbox" data-act="facet" data-f="${key}" data-v="${esc(k)}" ${sel.has(k) ? "checked" : ""}><span>${esc(lab || k)}</span><span class="grow"></span><span class="small tert">${fmt(n)}</span></label>`).join("")}</div>`;
}
function filtersHtml() {
  const lens = S.adv ? lensFor(S.page) : "connections";
  let body = "";
  if (lens === "connections" || lens === "when") {
    const x = current();
    const gs = connectionsOf(x);
    const tc = new Map(), kc = new Map();
    const KL = { field: "Its own fields", listed: "Listed in other entities’ fields", together: "Listed together (no centre)", none: "Without a relation type" };
    for (const g of gs) { kc.set(g.kind, (kc.get(g.kind) || 0) + g.rows.length); for (const r of g.rows) for (const m of r.members || [r.ent]) tc.set(tplName(m), (tc.get(tplName(m)) || 0) + 1); }
    body = facetBlock("Entity type", "c.tpl", [...tc.entries()].sort((a, b) => b[1] - a[1]), fConn().tpl)
      + facetBlock("Kind of connection", "c.kind", [...kc.entries()].map(([k, n]) => [k, n, KL[k]]), fConn().kind)
      + `<p class="small muted fnote">Filters apply to this step (${esc(title(x))}). The next step starts unfiltered; Back returns to this one with these filters. Paths has no filters: it takes Skip chips, which act on the steps between two entities.</p>`;
  } else {
    const tc = new Map(), rc = new Map();
    for (const pi of docPassages(S.page)) { const e = P[pi][0]; const o = E[e * 4] === S.page ? E[e * 4 + 1] : E[e * 4]; const ty = E[e * 4 + 2]; tc.set(tplName(o), (tc.get(tplName(o)) || 0) + 1); const k = ty < 0 ? "none" : D.types[ty][1]; rc.set(k, (rc.get(k) || 0) + 1); }
    body = facetBlock("Connected entity type", "d.tpl", [...tc.entries()].sort((a, b) => b[1] - a[1]), S.f.document.tpl)
      + facetBlock("Relation type", "d.rel", [...rc.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n, k === "none" ? "No relation type" : k]), S.f.document.rel)
      + `<p class="small muted fnote">Pages are narrowed with the strip above the list, not here. These filters and the page range combine.</p>`;
  }
  return `<aside class="overlay" role="dialog" aria-label="Filters"><div class="ovhead"><div class="title">Filters</div><button data-act="close" aria-label="Close" class="tert">✕</button></div><div class="ovbody">${body}</div><div class="footer"><button class="link" data-act="fclear">Clear all</button><span class="grow"></span><button class="ink" data-act="close">Done</button></div></aside>`;
}
function activeChips() {
  const lens = S.adv ? lensFor(S.page) : "connections";
  const f = lens === "connections" ? [["c.tpl", fConn().tpl], ["c.kind", fConn().kind]] : lens === "document" ? [["d.tpl", S.f.document.tpl], ["d.rel", S.f.document.rel]] : [];
  return f.flatMap(([k, set]) => [...set].map((v) => `<button class="chip" data-act="unfacet" data-f="${k}" data-v="${esc(v)}">${esc(v === "none" ? "No relation type" : v === "field" ? "Own fields" : v === "listed" ? "Listed in" : v)} ×</button>`)).join("");
}
function activeCount() { return fConn().tpl.size + fConn().kind.size + S.f.document.tpl.size + S.f.document.rel.size; }

function searchResults(q, restrictTpl) {
  const out = [];
  if (fold(q.trim()).length < 2) return out;
  const f = fold(q.trim());
  for (let i = 0; i < N && out.length < 300; i++) {
    if (restrictTpl && tplName(i) !== restrictTpl) continue;
    const t = fold(title(i)); if (t.includes(f)) out.push([t.startsWith(f) ? 0 : 1, i]);
  }
  out.sort((a, b) => a[0] - b[0] || degree(b[1]) - degree(a[1]));
  return out.slice(0, 8).map((r) => r[1]);
}
function modalShell(titleTxt, body, foot, sub) {
  return `<div class="modalwrap" data-act="mscrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="mh"><div><div class="title" id="mt" style="margin:0">${titleTxt}</div>${sub ? `<div class="small muted">${sub}</div>` : ""}</div><button data-act="mclose" aria-label="Close" class="tert">✕</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ""}</div></div>`;
}
function pickerModalHtml() {
  const res = searchResults(S.mq);
  const body = `<div class="search"><span class="muted">⌕</span><input id="mq" placeholder="Search any entity by title" value="${esc(S.mq)}" autocomplete="off"></div><div id="mres">${res.length ? res.map((i, k) => `<button class="result${k === 0 ? " act" : ""}" data-act="pickto" data-i="${i}">${sq(i)}<span dir="auto">${esc(title(i))}</span><span class="meta">${esc(tplName(i))}</span></button>`).join("") : `<div class="small muted" style="padding:.4rem .5rem">${fold(S.mq).length < 2 ? "Type at least two letters." : `No entity matches “${esc(S.mq)}”.`}</div>`}</div>`;
  return modalShell(`Connect ${esc(title(current()))} to…`, body, "");
}
function addModalHtml() {
  const a = S.add;
  const tplRestrict = a.contentName || null;
  const res = searchResults(S.mq, tplRestrict).filter((i) => i !== current());
  const chosen = a.target ?? null;
  const relSel = a.mode === "field" ? `<div class="field"><span class="k">Field</span><span class="chip">${esc(a.label)}</span><span class="small muted">relation type “${esc(D.types[a.ty][1])}”${tplRestrict ? ` · only ${esc(tplRestrict)}` : ""}</span></div>`
    : `<div class="field"><span class="k">Relation</span><select class="btn" data-act="addrel" aria-label="Relation type"><option value="-1" ${S.addRel === -1 ? "selected" : ""}>No relation type</option>${D.types.map((t, i) => `<option value="${i}" ${S.addRel === i ? "selected" : ""}>${esc(t[1])}</option>`).join("")}</select></div>`;
  const quote = a.mode === "passage" ? `<div class="field"><span class="k">Passage</span><span class="quote" dir="auto">“${esc(trunc(a.text, 160))}” <span class="ptag">p.${a.page}</span></span></div>` : "";
  const hubNote = a.mode === "field" && a.hubMembers ? `<div class="small tert">Adds a member to the existing ${esc(a.label)} group (${a.hubMembers} now). Uwazi stores it as one more row in the same hub.</div>` : "";
  const body = `${quote}${relSel}<div class="field"><span class="k">Entity</span>${chosen !== null ? `${pill(chosen, { lg: true, act: "none" })}<button class="chip" data-act="addclear">Change</button>` : `<div class="search grow"><span class="muted">⌕</span><input id="mq" placeholder="${tplRestrict ? `Search ${esc(tplRestrict)}` : "Search any entity"}" value="${esc(S.mq)}" autocomplete="off"></div>`}</div>${chosen === null ? `<div id="mres">${res.map((i, k) => `<button class="result${k === 0 ? " act" : ""}" data-act="addpick" data-i="${i}">${sq(i)}<span dir="auto">${esc(title(i))}</span><span class="meta">${esc(tplName(i))}</span></button>`).join("") || `<div class="small muted" style="padding:.4rem .5rem">Type at least two letters.</div>`}</div>` : ""}${hubNote}`;
  const t = a.mode === "field" ? `Add to ${esc(a.label)}` : a.mode === "passage" ? "Connect passage" : "Add relationship";
  const foot = `<button class="btn" data-act="mclose">Cancel</button><button class="ink" data-act="addcommit" ${chosen === null ? "disabled" : ""}>${a.mode === "passage" ? "Connect" : "Add"}</button>`;
  return modalShell(t, body, foot, `from ${esc(title(current()))}`);
}
function confirmHtml() {
  const c = S.confirm;
  return modalShell(esc(c.title), `<p class="small" style="color:var(--text-secondary)">${c.msg}</p>`, `<button class="btn" data-act="mclose">Cancel</button><button class="danger" data-act="confirmgo">${esc(c.label)}</button>`);
}

// ── Mutations (in-tab only) ──────────────────────────────────────────────────
function addEdge(a, b, ty, hub) { const e = edgeCount(); E.push(a, b, ty, hub); indexEdge(e); changed(); return e; }
function toast(msg, undo) { S.toast = { msg, undo }; clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = null; render(); }, 6000); }
function removeRow(x, key, o) {
  const g = connectionsOf(x).find((g) => g.key === key);
  const r = g && g.rows.find((r) => r.ent === o);
  if (!r) return;
  const hubInfo0 = hubInfo(r.hubs[0]);
  const stay = g.kind === "field" && hubInfo0 ? hubInfo0.mem.length - 2 : 0;
  const np = passagesOfRow(r);
  S.confirm = {
    title: g.kind === "field" && hubInfo0 && hubInfo0.mem.length > 2 ? `Remove from ${g.name}` : "Delete relationship",
    msg: g.kind === "field" && hubInfo0 && hubInfo0.mem.length > 2
      ? `Remove <b>${esc(title(o))}</b> from the ${esc(g.name)} of <b>${esc(title(x))}</b>? The other ${stay} stay in the group.`
      : `Delete the relationship between <b>${esc(title(x))}</b> and <b>${esc(title(o))}</b>?${np ? ` It has ${np} passage${np > 1 ? "s" : ""}; they are deleted with it.` : ""}`,
    label: g.kind === "field" && hubInfo0 && hubInfo0.mem.length > 2 ? "Remove" : "Delete",
    run: () => { const es = [...r.edges]; es.forEach((e) => dead.add(e)); changed(); toast(`${esc(title(o))} removed from ${esc(g.name)}`, () => { es.forEach((e) => dead.delete(e)); changed(); }); },
  };
}
function removePassage(pi) {
  const e = P[pi][0];
  const x = S.page;
  const o = E[e * 4] === x ? E[e * 4 + 1] : E[e * 4];
  const others = livePassages(pByEdge.get(e)).filter((q) => q !== pi).length;
  const sibling = connectionsOf(x).flatMap((g) => g.rows).filter((r) => r.ent === o).reduce((n, r) => n + passagesOfRow(r), 0) - 1;
  S.confirm = {
    title: "Delete passage",
    msg: `Delete this passage on page ${P[pi][2]}?<br><i>“${esc(trunc(P[pi][3], 140))}”</i><br>${others || sibling > 0 ? `The connection to <b>${esc(title(o))}</b> stays: it has ${Math.max(others, sibling)} other passage${Math.max(others, sibling) > 1 ? "s" : ""}.` : `It is the only passage for <b>${esc(title(o))}</b>, so that connection goes too.`}`,
    label: "Delete",
    run: () => { deadP.add(pi); const killEdge = !others; if (killEdge) dead.add(e); changed(); if (S.activeP === pi) S.activeP = null; toast("Passage deleted", () => { deadP.delete(pi); if (killEdge) dead.delete(e); changed(); }); },
  };
}
function commitAdd() {
  const a = S.add, x = current(), o = a.target;
  if (o === null || o === undefined) return;
  if (a.mode === "field") {
    const hub = a.hub ?? nextHub;
    const e = addEdge(x, o, a.ty, hub);
    toast(`${esc(title(o))} added to ${esc(a.label)}`, () => { dead.add(e); changed(); });
  } else if (a.mode === "free") {
    const e = addEdge(x, o, S.addRel, nextHub);
    toast(`Relationship to ${esc(title(o))} added`, () => { dead.add(e); changed(); });
  } else {
    const e = addEdge(S.page, o, S.addRel, nextHub);
    const pi = P.length; P.push([e, S.page, a.page, a.text, null, null]); indexPassage(pi);
    S.activeP = pi; S.docPage = a.page;
    toast(`Passage connected to ${esc(title(o))}`, () => { deadP.add(pi); dead.add(e); changed(); });
  }
  S.add = null; S.modal = null; S.mq = "";
}

// ── Render ───────────────────────────────────────────────────────────────────
function advSwitch() {
  return `<button class="advsw" role="switch" aria-checked="${S.adv}" data-act="adv"><span>Advanced</span><span class="track" aria-hidden="true"><span class="thumb"></span></span></button>`;
}
function render() {
  const x = current();
  const lens = lensFor(S.page);
  const docOK = hasDocLens(S.page);
  const pathsOK = connectionsOf(S.page).length > 0;
  const showDoc = !S.adv || lens !== "paths";
  const view = lens === "connections" ? S.view.connections : "list";
  const hint = S.adv && lens === "document" && !S.userLens ? `<span class="small muted desk">Opened here because this document has passages.</span>` : "";
  document.getElementById("app").innerHTML = `
  <div class="nav"><span class="logo"><b>:</b>uwazi</span><a class="crumb hide-m" href="?c=${CORPUS === "cejil" ? "sample" : "cejil"}" title="Switch collection">${CORPUS === "cejil" ? "CEJIL" : "Sample"} ▾</a><span class="muted hide-m">›</span><span class="crumb on" dir="auto">${esc(title(S.page))}</span><span class="grow"></span>
    ${RESTR.size ? `<button class="navbtn" data-act="guest" aria-pressed="${GUEST}">${GUEST ? "Viewing as guest" : "Viewing as admin"}</button>` : ""}<button class="navbtn" data-act="dir">${document.documentElement.dir === "rtl" ? "LTR" : "RTL"}</button><button class="navbtn" data-act="theme">${document.documentElement.classList.contains("dark") ? "Light" : "Dark"}</button><span class="navbtn hide-m">Ask Bert</span></div>
  <div class="split${S.adv && lens === "paths" ? " wide" : ""}">
    <div class="pane">
      <div class="host">
        <div class="tabs"><div class="strip" role="tablist"><span class="desk">Document</span><span>Metadata</span><span class="on">Relationships <em class="cnt" title="${connectedCount(S.page)} connected entities${HAS_P ? ` · ${docPassages(S.page).length} passages` : ""}">${fmt(connectedCount(S.page))}</em></span><span class="desk">Files</span></div><span class="btn desk">${CORPUS === "cejil" ? "Español" : "English"} ▾</span></div>
        <div class="docmeta"><div class="kicker">${sq(S.page)}${esc(tplName(S.page))}</div><div class="title" dir="auto">${esc(title(S.page))}</div></div>
        ${!S.adv ? `<div class="toolbar lensrow"><div class="search">${activeChips()}<span class="muted">⌕</span><input id="q" placeholder="Search connections" value="${esc(S.q)}" aria-label="Search connections"></div><button class="btn" data-act="filters">Filters${activeCount() ? ` <span class="badge">${activeCount()}</span>` : ""}</button>${advSwitch()}</div>` : `<div class="toolbar lensrow"><div class="lens" role="group" aria-label="Question">
          <button data-act="lens" data-l="connections" aria-pressed="${lens === "connections"}">Connections</button>
          <button data-act="lens" data-l="paths" aria-pressed="${lens === "paths"}" ${pathsOK ? "" : `disabled title="A path needs at least one connection to start from"`}>Paths</button>
          <button data-act="lens" data-l="document" aria-pressed="${lens === "document"}" ${docOK ? "" : `disabled title="No passages are anchored in this entity’s document"`}>In the document</button>
          <button data-act="lens" data-l="when" aria-pressed="${lens === "when"}">When</button></div>
          ${lens === "when" ? `<span class="grow"></span><div class="seg desk" role="group" aria-label="Show as"><button data-act="wview" data-v="spine" aria-pressed="${S.view.when === "spine"}">Spine</button><button data-act="wview" data-v="lanes" aria-pressed="${S.view.when === "lanes"}">Lanes</button></div><button class="btn desk" data-act="filters">Filters${activeCount() ? ` <span class="badge">${activeCount()}</span>` : ""}</button>` : ""}
          ${lens !== "paths" && lens !== "when" ? `<div class="search desk">${activeChips()}<span class="muted">⌕</span><input id="q" placeholder="${lens === "document" ? "Search passages" : "Search connections"}" value="${esc(S.q)}"></div>${lens === "connections" ? `<div class="seg desk" role="group" aria-label="Show as"><button data-act="cview" data-v="list" aria-pressed="${view === "list"}">List</button><button data-act="cview" data-v="graph" aria-pressed="${view === "graph"}">Graph</button></div>` : ""}<button class="btn desk" data-act="filters">Filters${activeCount() ? ` <span class="badge">${activeCount()}</span>` : ""}</button>` : ""}
          ${lens === "paths" ? `<span class="grow"></span>` : ""}${advSwitch()}
        </div>`}
        <div class="trailslot${S.adv ? "" : " off"}">${S.adv && lens !== "document" ? trailHtml() : ""}</div>
      </div>
      ${!S.adv ? `<div class="body host tree" id="body">${treeHtml(x)}</div>` : lens === "paths" ? pathsView() : lens === "when" ? whenView() : lens === "document" ? documentView() : view === "graph" ? `<div class="body host" id="body">${graphHtml(x)}</div>` : `<div class="body host" id="body">${groupsHtml(x)}</div>`}
      <div class="footer">${S.adv && lens === "paths" ? `<button class="link" disabled title="Paths are read-only">Edit</button><span class="small muted">Paths are read-only</span>` : `<button class="${S.edit ? "ink" : "link"}" data-act="edit">${S.edit ? "Done" : "✎ Edit"}</button>${S.edit && CORPUS === "cejil" ? `<span class="small muted">Prototype: CEJIL is read-only in the app; edits here stay in this tab.</span>` : ""}`}<span class="grow"></span>${hint}</div>
    </div>
    ${showDoc ? `<div class="divider"></div>${docPaneHtml()}` : ""}
  </div>
  ${S.overlay !== null || S.panel ? `<div class="scrim" data-act="close"></div>` : ""}
  ${S.overlay !== null ? overlayHtml() : S.panel === "filters" ? filtersHtml() : ""}
  ${S.modal === "to" ? pickerModalHtml() : S.modal === "add" ? addModalHtml() : ""}
  ${S.confirm ? confirmHtml() : ""}
  ${S.toast ? `<div class="toast" role="status">${S.toast.msg}${S.toast.undo ? ` <button class="link" data-act="undo">Undo</button>` : ""}</div>` : ""}`;
  const m = document.getElementById("mq"); if (m) { m.focus(); m.setSelectionRange(m.value.length, m.value.length); }
  if (S.confirm) document.querySelector("[data-act=confirmgo]")?.focus();
  const hereBar = document.querySelector(".mark.act, mark.act"); if (hereBar) hereBar.scrollIntoView({ block: "center" });
}

// ── Events ───────────────────────────────────────────────────────────────────
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act]");
  if (!t || t.disabled) return;
  const i = t.dataset.i !== undefined ? +t.dataset.i : undefined;
  const act = t.dataset.act;
  if (act === "mscrim" && ev.target !== t) return;
  if (act === "bar" || act === "facet") return; // handled elsewhere
  switch (act) {
    case "adv": setAdv(!S.adv); S.panel = null; S.peek = null; break;
    case "lens": S.lens = t.dataset.l; S.userLens = true; S.peek = null; S.panel = null; break;
    case "ov": S.overlay = i; S.panel = null; break;
    case "none": return;
    case "close": S.overlay = null; S.panel = null; break;
    case "filters": S.panel = S.panel ? null : "filters"; S.overlay = null; break;
    case "peek": S.peek = S.peek === i ? null : i; break;
    case "tx": { const k = t.dataset.k; S.tx.has(k) ? S.tx.delete(k) : S.tx.add(k); break; }
    case "explore": if (!S.adv) setAdv(true); if (i !== current()) S.trail.push(i); S.overlay = null; S.peek = null; S.q = ""; S.pin = null; if (lensFor(S.page) === "document") { S.lens = "connections"; S.userLens = true; } break;
    case "editat": if (i !== current()) S.trail.push(i); S.peek = null; break;
    case "back": S.trail.pop(); S.peek = null; S.pin = null; break;
    case "crumb": S.trail = S.trail.slice(0, +t.dataset.k); S.peek = null; S.pin = null; break;
    case "goto": S.page = i; S.trail = []; S.overlay = null; S.peek = null; S.to = null; S.pin = null; S.pages = null; S.docPage = null; S.activeP = null; break;
    case "toggle": { const k = t.dataset.k; S.shown[k] = t.getAttribute("aria-expanded") === "true" ? 0 : 5; break; }
    case "more": S.shown[t.dataset.k] = +t.dataset.lim + (t.dataset.k === "doc:pages" ? 6 : 25); break;
    case "pickmodal": S.modal = "to"; S.mq = ""; break;
    case "mclose": case "mscrim": S.modal = null; S.add = null; S.confirm = null; S.mq = ""; break;
    case "pickto": S.to = i; S.modal = null; S.pin = null; S.forks = {}; break;
    case "unskip": S.skip.delete(+t.dataset.ty); S.pin = null; break;
    case "skipadd": S.skip.add(+t.dataset.ty); S.pin = null; break;
    case "noskip": S.skip = new Set(); break;
    case "maxd+": S.maxD = Math.min(8, S.maxD + 2); break;
    case "pin": S.pin = i; S.forks = {}; break;
    case "unpin": S.pin = null; break;
    case "fork": S.forks[+t.dataset.d] = true; break;
    case "cview": S.view.connections = t.dataset.v; break;
    case "wview": S.view.when = t.dataset.v; break;
    case "year": { const y = +t.dataset.y; S.years = ev.shiftKey && S.years ? [Math.min(S.years[0], y), Math.max(S.years[1], y)] : S.years && S.years[0] === y && S.years[1] === y ? null : [y, y]; break; }
    case "clearyears": S.years = null; break;
    case "guest": GUEST = !GUEST; changed(); S.overlay = null; break;
    case "pview": S.view.paths = t.dataset.v; break;
    case "theme": document.documentElement.classList.toggle("dark"); break;
    case "dir": document.documentElement.dir = document.documentElement.dir === "rtl" ? "ltr" : "rtl"; break;
    case "edit": S.edit = !S.edit; break;
    case "unfacet": { const [l, k] = t.dataset.f.split("."); (l === "c" ? fConn() : S.f.document)[k].delete(t.dataset.v); break; }
    case "fclear": S.fc.delete(current()); S.f = { document: { tpl: new Set(), rel: new Set() } }; S.q = ""; S.pages = null; break;
    case "clearpages": S.pages = null; break;
    case "outside": S.outside = !S.outside; break;
    case "jump": case "markclick": { const pi = +t.dataset.pi; S.activeP = pi; if (P[pi][2] <= pageCount(S.page)) S.docPage = P[pi][2]; break; }
    case "docpg": S.docPage = Math.max(1, (S.docPage || 1) + +t.dataset.d); S.activeP = null; break;
    case "addfree": S.add = { mode: "free", target: null }; S.modal = "add"; S.mq = ""; break;
    case "addfield": {
      const g = connectionsOf(current()).find((g) => g.key === t.dataset.k);
      const hub = g.rows[0]?.hubs?.find((h) => hubInfo(h)?.centre === current());
      const contentName = g.content ? (D.templates.find((tt, ti) => (tt.id || CEJIL_TPL_IDS[ti]) === g.content)?.n ?? null) : null;
      S.add = { mode: "field", ty: g.ty, label: g.name, hub, hubMembers: hub !== undefined ? hubInfo(hub).mem.length - 1 : 0, contentName, target: null };
      S.modal = "add"; S.mq = ""; break;
    }
    case "addpick": S.add.target = i; break;
    case "addclear": S.add.target = null; S.mq = ""; break;
    case "addcommit": commitAdd(); break;
    case "rmrow": removeRow(current(), t.dataset.k, i); break;
    case "rmpassage": removePassage(+t.dataset.pi); break;
    case "confirmgo": { const run = S.confirm.run; S.confirm = null; run(); break; }
    case "undo": if (S.toast?.undo) S.toast.undo(); S.toast = null; break;
    case "connectsel": S.add = { mode: "passage", text: S.sel.text, page: S.sel.page, target: null }; S.sel = null; S.modal = "add"; S.mq = ""; window.getSelection().removeAllRanges(); break;
    default: return;
  }
  render();
  // The switch is re-rendered; keep keyboard focus on it.
  if (act === "adv") document.querySelector(".advsw")?.focus();
  if (act === "tx") document.querySelector(`.tx[data-k="${CSS.escape(t.dataset.k)}"]`)?.focus();
  if (act === "toggle" || act === "more") document.querySelector(`.tree [data-act="toggle"][data-k="${CSS.escape(t.dataset.k)}"]`)?.focus();
});
// Template ids for CEJIL field `content` (target template) — the compact data keeps
// names only, so resolve by the order the templates were exported in.
const CEJIL_TPL_IDS = (window.CEJIL_TPL_IDS || []);
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.dataset.act === "skipsel" && t.value !== "") { S.skip.add(+t.value); S.pin = null; render(); }
  if (t.dataset.act === "maxd") { S.maxD = +t.value; render(); }
  if (t.dataset.act === "addrel") { S.addRel = +t.value; }
  if (t.dataset.act === "facet") { const [l, k] = t.dataset.f.split("."); const set = (l === "c" ? fConn() : S.f.document)[k]; t.checked ? set.add(t.dataset.v) : set.delete(t.dataset.v); render(); }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "q") {
    S.q = ev.target.value;
    const lens = S.adv ? lensFor(S.page) : "tree";
    const b = document.getElementById("body");
    if (lens === "tree") b.innerHTML = treeHtml(current());
    else if (lens === "document") { const tmp = document.createElement("div"); tmp.innerHTML = documentView(); b.replaceWith(tmp.firstElementChild); }
    else b.innerHTML = S.view.connections === "graph" ? graphHtml(current()) : groupsHtml(current());
  }
  if (ev.target.id === "mq") { S.mq = ev.target.value; const pos = ev.target.selectionStart; render(); const m = document.getElementById("mq"); if (m) m.setSelectionRange(pos, pos); }
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { if (S.confirm || S.modal) { S.confirm = null; S.modal = null; S.add = null; } else if (S.overlay !== null || S.panel) { S.overlay = null; S.panel = null; } else if (S.sel) S.sel = null; else return; render(); }
  if (ev.key === "Enter" && ev.target.id === "mq") { const f = document.querySelector("#mres .result"); if (f) f.click(); }
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList?.contains("mnode")) { ev.preventDefault(); ev.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
});
// Page strip: click one page, shift-click to extend, or drag across pages.
document.addEventListener("mousedown", (ev) => {
  const b = ev.target.closest("[data-act=bar]");
  if (!b) return;
  const p = +b.dataset.p;
  if (ev.shiftKey && S.pages) S.pages = [Math.min(S.pages[0], p), Math.max(S.pages[1], p)];
  else { S.drag = p; S.pages = [p, p]; }
  S.docPage = S.pages[0]; S.activeP = null;
  render(); ev.preventDefault();
});
document.addEventListener("mouseover", (ev) => {
  if (S.drag === null) return;
  const b = ev.target.closest("[data-act=bar]");
  if (!b) return;
  const p = +b.dataset.p;
  const next = [Math.min(S.drag, p), Math.max(S.drag, p)];
  if (next[0] !== S.pages[0] || next[1] !== S.pages[1]) { S.pages = next; render(); }
});
document.addEventListener("mouseup", (ev) => {
  if (S.drag !== null) { S.drag = null; return; }
  const page = ev.target.closest("#page");
  if (!page) { if (S.sel && !ev.target.closest(".floatmenu")) { S.sel = null; render(); } return; }
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : "";
  if (text.length < 6) { if (S.sel) { S.sel = null; render(); } return; }
  const r = sel.getRangeAt(0).getBoundingClientRect();
  const host = page.closest(".docpane").getBoundingClientRect();
  S.sel = { text, page: +page.dataset.page, x: r.left - host.left + r.width / 2 - 60, y: r.bottom - host.top + 6 };
  const keep = sel.getRangeAt(0).cloneRange();
  render();
  const s2 = window.getSelection(); s2.removeAllRanges();
  try { s2.addRange(keep); } catch { /* the node was re-rendered; the menu still carries the text */ }
});
render();
