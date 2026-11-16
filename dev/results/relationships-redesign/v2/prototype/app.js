// Relationships redesign v2 — clickable prototype over the real CEJIL corpus.
// Static: data.js (compacted from public/cejil-data) + this file. No framework.
"use strict";

const L = { explore: "See connections", open: "Go to entity" };
const D = window.CEJIL;
const N = D.ents.length;
const E = D.edges;
const M = E.length / 4;
const sidIdx = new Map(D.ents.map((e, i) => [e[0], i]));
const title = (i) => D.ents[i][1];
const tplOf = (i) => D.ents[i][2];
const tplName = (i) => (tplOf(i) >= 0 ? D.templates[tplOf(i)].n : "No template");
const colorOf = (i) => (tplOf(i) >= 0 ? D.templates[tplOf(i)].c : "#6B7280");
const typeName = (ty) => (ty < 0 ? null : D.types[ty][1]);
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n.toLocaleString("en-US");

// ── Graph indexes ────────────────────────────────────────────────────────────
const adj = Array.from({ length: N }, () => []);
const hubEdges = new Map();
for (let e = 0; e < M; e++) {
  adj[E[e * 4]].push(e);
  if (E[e * 4 + 1] !== E[e * 4]) adj[E[e * 4 + 1]].push(e);
  const h = E[e * 4 + 3];
  (hubEdges.get(h) || hubEdges.set(h, []).get(h)).push(e);
}
const typeOwners = new Map();
D.templates.forEach((t, ti) => t.f.forEach(([, rt]) => { if (rt) (typeOwners.get(rt) || typeOwners.set(rt, new Set()).get(rt)).add(ti); }));
const tyByName = new Map(D.types.map((t, i) => [t[1], i]));

// A hub's centre: the one member whose template OWNS the relation type as a
// field; failing that, the export's `from` if it is one of several owners.
// Otherwise there is no honest centre and the hub reads "Listed together with".
const hubMemo = new Map();
function hubInfo(h) {
  if (hubMemo.has(h)) return hubMemo.get(h);
  const es = hubEdges.get(h);
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
  const info = { mem, ty, centre };
  hubMemo.set(h, info);
  return info;
}
// Traversal goes THROUGH a hub's centre: members link to the centre, never to
// each other. Hubs without an honest centre are not traversed (they would
// reintroduce the peer edges this model removes).
const nbrs = Array.from({ length: N }, () => []);
for (const h of hubEdges.keys()) {
  const { mem, ty, centre } = hubInfo(h);
  if (centre === null) continue;
  for (const m of mem) if (m !== centre) { nbrs[centre].push([m, ty, h]); nbrs[m].push([centre, ty, h]); }
}
function fieldLabel(tpl, ty) {
  if (ty < 0) return null;
  const f = tpl >= 0 ? D.templates[tpl].f.find((f) => f[1] === D.types[ty][0]) : null;
  return f ? f[0] : D.types[ty][1];
}

// ── Connections of an entity (the Connections lens unit) ─────────────────────
const connMemo = new Map();
function connectionsOf(x) {
  if (connMemo.has(x)) return connMemo.get(x);
  const groups = new Map();
  const get = (key, init) => groups.get(key) || groups.set(key, { key, rows: new Map(), ...init }).get(key);
  const seen = new Set();
  for (const e of adj[x]) {
    const h = E[e * 4 + 3];
    if (seen.has(h)) continue;
    seen.add(h);
    const { mem, ty, centre } = hubInfo(h);
    const others = mem.filter((m) => m !== x);
    if (ty < 0 && centre !== null) {
      const g = get("none", { kind: "none", name: "Without a relation type", via: "fix in Settings › Relationship types", order: 9000 });
      for (const o of others) g.rows.set(o, { ent: o });
    } else if (centre === null) {
      const tn = typeName(ty) || "no relation type";
      const g = get("together:" + tn, { kind: "together", name: "Listed together with", via: tn + " · no member owns this field", order: 8000 });
      // Members of another template first: in a mixed hub that is usually the
      // record that joins the rest (a Resolución among its judges).
      const sorted = [...others].sort((a, b) => (tplOf(a) === tplOf(x)) - (tplOf(b) === tplOf(x)));
      g.rows.set("h" + h, { members: sorted, hub: h });
    } else if (centre === x) {
      const label = fieldLabel(tplOf(x), ty);
      const fi = tplOf(x) >= 0 ? D.templates[tplOf(x)].f.findIndex((f) => f[1] === D.types[ty][0]) : -1;
      const g = get("field:" + label, { kind: "field", name: label, via: fi >= 0 ? "field of " + tplName(x) : "relation type · not a field of " + tplName(x), order: fi >= 0 ? fi : 500 });
      for (const o of others) g.rows.set(o, { ent: o });
    } else {
      const label = fieldLabel(tplOf(centre), ty);
      const g = get("listed:" + label, { kind: "listed", name: `Listed as ${label} in`, via: "other entities’ fields that name this one", order: 1000 });
      const prev = g.rows.get(centre);
      g.rows.set(centre, { ent: centre, with: mem.length - 2, label, n: (prev ? prev.n : 0) + 1 });
    }
  }
  const list = [...groups.values()].map((g) => ({ ...g, rows: [...g.rows.values()] }));
  for (const g of list) {
    if (g.kind === "listed") g.order = 1000 + (100000 - g.rows.length) / 100000;
    g.rows.sort((a, b) => (a.ent !== undefined && b.ent !== undefined ? adj[b.ent].length - adj[a.ent].length : 0));
  }
  list.sort((a, b) => a.order - b.order);
  connMemo.set(x, list);
  return list;
}
function connectedCount(x) {
  const s = new Set();
  for (const g of connectionsOf(x)) if (g.kind !== "together") for (const r of g.rows) s.add(r.ent);
  return s.size;
}

// ── Shortest paths, folded into layers ───────────────────────────────────────
const DEFAULT_SKIP = new Set([-1, ...["País", "Paises", "Mecanismo"].map((n) => tyByName.get(n)).filter((v) => v !== undefined)]);
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
    const labels = new Map(); const types = new Set();
    for (const u of layers[d]) for (const [v, ty, hb] of nbrs[u]) {
      if (skip.has(ty) || !next.has(v)) continue;
      const c = hubInfo(hb).centre;
      const lab = ty < 0 ? "no relation type" : fieldLabel(tplOf(c), ty);
      labels.set((c === u ? "→ " : "← ") + lab, 1); types.add(ty);
    }
    edgesBetween.push({ labels: [...labels.keys()].slice(0, 2), types });
  }
  return { steps: Lh, routes: A.cnt[b], layers, edgesBetween };
}
function shortestVia(a, pin, b, skip, maxD) {
  const p1 = shortest(a, pin, skip, maxD), p2 = shortest(pin, b, skip, maxD);
  if (!p1 || !p2) return null;
  return { steps: p1.steps + p2.steps, routes: p1.routes * p2.routes, layers: [...p1.layers, ...p2.layers.slice(1)], edgesBetween: [...p1.edgesBetween, ...p2.edgesBetween], pinned: pin };
}

// ── Pattern (template-defined multi-hop) ─────────────────────────────────────
const PATTERNS = {
  Causa: { name: "Jueces firmantes", steps: [["CorteIDH", "Sentencia de la CorteIDH"], ["Firmantes", "Juez y/o Comisionado"], ["País", "País"]] },
};
function hop(x, relName, toTpl) {
  const out = new Set();
  for (const e of adj[x]) {
    const ty = E[e * 4 + 2];
    if (ty < 0 || D.types[ty][1] !== relName) continue;
    const v = E[e * 4] === x ? E[e * 4 + 1] : E[e * 4];
    if (tplName(v) === toTpl) out.add(v);
  }
  return [...out];
}

// ── State ────────────────────────────────────────────────────────────────────
const qs = new URLSearchParams(location.search);
const idOf = (sid) => (sid && sidIdx.has(sid) ? sidIdx.get(sid) : undefined);
const S = {
  page: idOf(qs.get("e")) ?? sidIdx.get("lwm4n1kchypq4cxr"),
  trail: (qs.get("trail") || "").split(",").map(idOf).filter((v) => v !== undefined),
  lens: qs.get("lens") || "connections",
  overlay: idOf(qs.get("ov")) ?? null,
  peek: idOf(qs.get("peek")) ?? null,
  q: qs.get("q") || "",
  shown: {},
  to: idOf(qs.get("to")) ?? null,
  pin: idOf(qs.get("pin")) ?? null,
  skip: qs.get("skip") === "none" ? new Set() : new Set(DEFAULT_SKIP),
  maxD: +(qs.get("maxd") || 6),
  modal: qs.get("modal") === "1",
  mq: qs.get("mq") || "",
  forks: {},
};
if (qs.get("theme") === "dark") document.documentElement.classList.add("dark");
if (qs.get("dir") === "rtl") document.documentElement.setAttribute("dir", "rtl");
const current = () => (S.trail.length ? S.trail[S.trail.length - 1] : S.page);

// ── Render helpers ───────────────────────────────────────────────────────────
function pill(i, { lg = false, act = "ov" } = {}) {
  const c = colorOf(i);
  return `<button class="pill${lg ? " lg" : ""}" data-act="${act}" data-i="${i}" title="Preview ${esc(title(i))}" dir="auto" style="background:${c}20;border:1px solid ${c}40;color:color-mix(in srgb, ${c} 55%, var(--text-primary))"><i style="background:${c}"></i><span>${esc(title(i))}</span></button>`;
}
const sq = (i) => `<span class="sq" style="background:${colorOf(i)}"></span>`;
// ‹ › are bidi-mirrored characters: the browser flips them under RTL already.
// Flipping them again (as → needs) points them the wrong way.
const arrowR = `<span>›</span>`;

function templateSummary(rows) {
  const by = new Map();
  for (const r of rows) if (r.ent !== undefined) by.set(tplName(r.ent), (by.get(tplName(r.ent)) || 0) + 1);
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${esc(k)} ${fmt(v)}`).join(" · ");
}

function rowHtml(r, g, { compact }) {
  if (r.members) {
    const shown = r.members.slice(0, compact ? 3 : 4);
    return `<div class="row"><span class="small tert">with</span><span class="line">${shown.map((m) => pill(m)).join("")}${r.members.length > shown.length ? `<bdi class="chip">+${r.members.length - shown.length}</bdi>` : ""}</span></div>`;
  }
  const i = r.ent;
  const sel = S.peek === i && !compact;
  const meta = r.label !== undefined
    ? `${esc(r.label)}${r.with ? ` · with ${fmt(r.with)} other${r.with > 1 ? "s" : ""}` : ""}`
    : `${esc(tplName(i))} · ${fmt(connectedCount(i))} connections`;
  let html = `<div class="row${sel ? " sel" : ""}">`;
  if (!compact) html += `<button class="peekbtn" data-act="peek" data-i="${i}" aria-expanded="${sel}" aria-label="Show a summary of ${esc(title(i))}"><span class="flip">▸</span></button>`;
  html += `${pill(i)}<span class="meta" dir="auto">${meta}</span>`;
  if (!compact) html += `<span class="end"><button class="stepin" data-act="explore" data-i="${i}" aria-label="See the connections of ${esc(title(i))} here"><span class="lbl">${L.explore}</span> ${arrowR}</button></span>`;
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
  const q = fold(S.q.trim());
  const gs = connectionsOf(x);
  if (!gs.length) return `<div class="empty"><span class="h">No connections yet</span><span class="small">Nothing links ${esc(title(x))} to another entity. Relationships added from either side will appear here.</span><button class="warm">Add relationship</button></div>`;
  let out = "";
  for (const g of gs) {
    let rows = g.rows;
    if (q) rows = rows.filter((r) => (r.members || [r.ent]).some((m) => fold(title(m)).includes(q)));
    if (!rows.length) continue;
    const key = x + ":" + g.key;
    const big = rows.length > 200;
    const open = S.shown[key] !== 0 && !(big && S.shown[key] === undefined);
    const lim = S.shown[key] || (compact ? 3 : 5);
    out += `<div class="group"><button class="gh" data-act="toggle" data-k="${esc(key)}" aria-expanded="${open}"><span class="chev">${open ? "▾" : `<span class="flip">▸</span>`}</span><span class="name">${esc(g.name)}</span><span class="n" title="${rows.length} ${g.kind === "together" ? "groups" : "connected entities"}">${fmt(rows.length)}</span>${compact ? "" : `<span class="via">${esc(g.via)}</span>`}${rows.length > 50 && !compact ? `<span class="summary">${templateSummary(rows)}</span>` : ""}</button>`;
    if (open) {
      out += rows.slice(0, lim).map((r) => rowHtml(r, g, { compact })).join("");
      if (rows.length > lim) out += `<button class="more" data-act="more" data-k="${esc(key)}" data-lim="${lim}">${rows.length - lim <= 25 ? `Show ${fmt(rows.length - lim)} more` : `Show 25 more of ${fmt(rows.length - lim)}`}</button>`;
    }
    out += `</div>`;
  }
  return out || `<div class="empty"><span class="h">No connection matches “${esc(S.q)}”</span></div>`;
}

function chainHtml(res, { compactLayers = false } = {}) {
  let h = "";
  res.layers.forEach((layer, d) => {
    if (d > 0) h += `<span>${esc(res.edgesBetween[d - 1].labels.join(" / "))}</span>`;
    if (layer.length === 1) h += pill(layer[0]);
    else h += `<span class="chip">any of ${fmt(layer.length)} ${esc(tplName(layer[0]))}</span>`;
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
      const open = S.forks[d];
      const show = open ? layer.slice(0, 40) : layer.slice(0, 3);
      h += `<li class="node fork"><span class="small tert">any of ${fmt(layer.length)}</span>${show.map((m) => pill(m, { act: "pin" })).join("")}${layer.length > show.length ? `<button class="chip" data-act="fork" data-d="${d}"><bdi>+${fmt(layer.length - show.length)}</bdi></button>` : ""}</li>`;
    }
  });
  return h + `</ol>`;
}

// ── Views ────────────────────────────────────────────────────────────────────
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

function connectionsView() {
  return `<div class="body host" id="body">${groupsHtml(current())}</div>`;
}

function pathsView() {
  const a = current();
  const skipChips = [...S.skip].map((ty) => `<button class="chip" data-act="unskip" data-ty="${ty}">${esc(ty < 0 ? "Without a relation type" : D.types[ty][1])} ×</button>`).join("");
  const addable = D.types.map((t, i) => i).filter((i) => !S.skip.has(i));
  let h = `<div class="body host" id="body"><div class="card"><div class="q">
    <div class="field"><span class="k">From</span>${pill(a, { lg: true })}${S.trail.length ? `<span class="small muted">the entity you are exploring</span>` : ""}</div>
    <div class="field"><span class="k">To</span>${S.to !== null ? `${pill(S.to, { lg: true })}<button class="chip" data-act="clearto">Change</button>` : `<button class="warm" data-act="modal">Choose an entity…</button>`}</div>
    <div class="field"><span class="k">Skip</span>${skipChips}${S.skip.has(-1) ? "" : `<button class="chip add" data-act="skipadd" data-ty="-1">+ Without a relation type</button>`}<select class="chip add" data-act="skipsel" aria-label="Skip another relation type"><option value="">+ Relation type</option>${addable.map((i) => `<option value="${i}">${esc(D.types[i][1])}</option>`).join("")}</select></div>
    <div class="field"><span class="k">Up to</span><select class="btn" data-act="maxd" aria-label="Maximum steps">${[3, 4, 5, 6, 7, 8].map((n) => `<option ${n === S.maxD ? "selected" : ""}>${n}</option>`).join("")}</select><span class="small muted">steps</span></div>
  </div></div>`;
  if (S.to === null) {
    h += `<div class="card"><div class="empty"><span class="h">How does ${esc(title(a))} connect to something else?</span><span class="small">Choose a second entity. The shortest connection is shown step by step, with every route that is equally short folded into one line.</span></div></div>`;
  } else {
    const res = S.pin !== null ? shortestVia(a, S.pin, S.to, S.skip, S.maxD) : shortest(a, S.to, S.skip, S.maxD);
    if (!res) {
      const loose = shortest(a, S.to, new Set(), 8);
      h += `<div class="card"><div class="hd"><span class="name">No connection within ${S.maxD} steps</span><span class="small muted">with the skipped types left out</span></div>`;
      if (loose) h += `<div class="notice"><span>Through the skipped types they connect in ${loose.steps} step${loose.steps > 1 ? "s" : ""}:</span><span class="chain">${chainHtml(loose)}</span><span class="small tert">It runs through ${esc([...new Set(loose.edgesBetween.flatMap((b) => [...b.types]))].filter((t) => DEFAULT_SKIP.has(t)).map((t) => (t < 0 ? "unlabelled links" : D.types[t][1])).join(" and "))} links, which connect most of the corpus, so it says little about how these two relate.</span></div>`;
      else h += `<div class="empty"><span class="small">They are not connected within 8 steps, even through skipped types.</span></div>`;
      h += `<div class="q"><div class="field">${S.maxD < 8 ? `<button class="warm" data-act="maxd+">Allow ${S.maxD + 2} steps</button>` : ""}${loose ? `<button class="btn" data-act="noskip">Include skipped types</button>` : ""}</div></div></div>`;
    } else {
      const forks = res.layers.filter((l) => l.length > 1).length;
      h += `<div class="card"><div class="hd"><span class="name">Shortest connection</span><span class="small muted">${res.steps} step${res.steps > 1 ? "s" : ""} · ${fmt(res.routes)} route${res.routes > 1 ? "s" : ""}${forks ? `, differing at ${forks} step${forks > 1 ? "s" : ""}` : ""}</span></div>`;
      if (res.routes > 50) h += `<div class="notice"><span><b>${fmt(res.routes)} equally short routes.</b> They are folded below; the “any of” steps are where they differ.</span><span class="small tert">Pick an entity in an “any of” step to pin the route through it, or skip the relation type that makes a step wide.</span></div>`;
      else if (forks) h += `<div class="q small tert" style="padding-bottom:0">Routes differ at the “any of” steps. Pick an entity there to pin the route through it.</div>`;
      h += pathListHtml(res) + `</div>`;
    }
  }
  const pat = PATTERNS[tplName(a)];
  if (pat) {
    const sents = hop(a, pat.steps[0][0], pat.steps[0][1]);
    let rows = "";
    for (const s of sents.slice(0, 4)) {
      const js = hop(s, pat.steps[1][0], pat.steps[1][1]);
      const list = js.length ? js : [null];
      list.forEach((j, k) => {
        const p = j !== null ? hop(j, pat.steps[2][0], pat.steps[2][1]) : [];
        rows += `<tr>${k === 0 ? `<td rowspan="${list.length}">${pill(s)}</td>` : ""}<td>${j !== null ? pill(j) : `<span class="muted">—</span>`}</td><td>${p.length ? p.map((x) => pill(x)).join(" ") : `<span class="muted">—</span>`}</td></tr>`;
      });
    }
    h += `<div class="card"><div class="hd"><span class="name">Along a pattern</span><span class="small muted">“${esc(pat.name)}”, defined by the ${esc(tplName(a))} template</span></div><div class="q"><div class="field small tert">${esc(tplName(a))} → ${pat.steps.map((s) => `${esc(s[0])} → <span class="chip">${esc(s[1])}</span>`).join(" → ")}</div></div><table><thead><tr><th>${esc(pat.steps[0][1])}</th><th>${esc(pat.steps[1][1])}</th><th>${esc(pat.steps[2][1])}</th></tr></thead><tbody>${rows || `<tr><td colspan="3" class="muted">Nothing reached along this pattern.</td></tr>`}</tbody></table>${sents.length > 4 ? `<div class="more">${sents.length - 4} more ${esc(pat.steps[0][1])}</div>` : ""}</div>`;
  }
  return h + `</div>`;
}

function overlayHtml() {
  const x = S.overlay;
  const from = current();
  let how = "";
  const direct = from !== x ? connectionsOf(from).find((g) => g.rows.some((r) => r.ent === x || (r.members && r.members.includes(x)))) : null;
  if (direct) {
    how = `<div class="how"><span class="hl">How this connects to ${esc(title(from))}</span><span class="chain">${pill(from)}<span>${esc(direct.name)}</span><span style="color:var(--text-primary)">this ${esc(tplName(x))}</span></span><span class="small muted">Directly, 1 step.</span></div>`;
  } else if (from !== x) {
    const res = shortest(from, x, S.skip.size ? S.skip : DEFAULT_SKIP, 6);
    if (res) how = `<span class="chain">${chainHtml(res)}</span><span class="small muted">${res.steps} step${res.steps > 1 ? "s" : ""}${res.routes > 1 ? ` · ${fmt(res.routes)} routes` : ""}</span>`;
    else {
      const loose = shortest(from, x, new Set(), 6);
      how = loose
        ? `<span class="small">No connection within 6 steps without the skipped types.</span><span class="chain">${chainHtml(loose)}</span><span class="small muted">Only through ${esc([...new Set(loose.edgesBetween.flatMap((b) => [...b.types]))].filter((t) => DEFAULT_SKIP.has(t)).map((t) => (t < 0 ? "unlabelled links" : D.types[t][1])).join(", "))}, which are skipped by default because they connect almost everything.</span>`
        : `<span class="small">Not connected to ${esc(title(from))} within 6 steps.</span>`;
    }
    how = `<div class="how"><span class="hl">How this connects to ${esc(title(from))}</span>${how}</div>`;
  }
  return `<div class="scrim" data-act="close"></div><aside class="overlay" role="dialog" aria-label="${esc(title(x))}">
    <div class="ovhead"><div><div class="kicker">${sq(x)}${esc(tplName(x))}</div><div class="title" dir="auto">${esc(title(x))}</div></div><button data-act="close" aria-label="Close" class="tert">✕</button></div>
    ${how}
    <div class="host" style="padding-top:.6rem"><div class="strip"><span>Metadata</span><span class="on">Relationships <em class="cnt">${fmt(connectedCount(x))}</em></span></div></div>
    <div class="ovbody">${groupsHtml(x, { compact: true })}</div>
    <div class="footer"><span class="grow"></span><button class="warm" data-act="explore" data-i="${x}">${L.explore}</button><button class="ink" data-act="goto" data-i="${x}">${L.open} <span class="flip">→</span></button></div>
  </aside>`;
}

function modalHtml() {
  const q = fold(S.mq.trim());
  let res = [];
  if (q.length >= 2) {
    for (let i = 0; i < N && res.length < 200; i++) { const t = fold(title(i)); if (t.includes(q)) res.push([t.startsWith(q) ? 0 : 1, i]); }
    res.sort((a, b) => a[0] - b[0] || adj[b[1]].length - adj[a[1]].length);
    res = res.slice(0, 10).map((r) => r[1]);
  }
  return `<div class="modalwrap" data-act="mclose"><div class="modal" role="dialog" aria-modal="true" aria-label="Choose an entity" data-stop="1">
    <div class="mh"><span class="title" style="margin:0">Connect ${esc(title(current()))} to…</span><button data-act="mclose" aria-label="Close" class="tert">✕</button></div>
    <div class="mb"><div class="search"><span class="muted">⌕</span><input id="mq" placeholder="Search any entity by title" value="${esc(S.mq)}" autocomplete="off"></div>
    <div id="mres">${q.length < 2 ? `<div class="small muted" style="padding:.4rem .5rem">Type at least two letters. Recent: ${[sidIdx.get("1edxwnq66ytx1or"), sidIdx.get("lwm4n1kchypq4cxr")].filter((i) => i !== undefined && i !== current()).map((i) => pill(i, { act: "pickto" })).join(" ")}</div>` : res.length ? res.map((i, k) => `<button class="result${k === 0 ? " act" : ""}" data-act="pickto" data-i="${i}">${sq(i)}<span dir="auto">${esc(title(i))}</span><span class="meta">${esc(tplName(i))}</span></button>`).join("") : `<div class="small muted" style="padding:.4rem .5rem">No entity matches “${esc(S.mq)}”.</div>`}</div></div>
  </div></div>`;
}

function render() {
  const x = current();
  const hasDoc = false; // CEJIL: 2 anchored refs in 17k edges — the lens is shown disabled with its reason.
  document.getElementById("app").innerHTML = `
  <div class="nav"><span class="logo"><b>:</b>uwazi</span><span class="crumb hide-m">Library</span><span class="muted hide-m">›</span><span class="crumb on" dir="auto">${esc(title(S.page))}</span><span class="grow"></span>
    <button class="navbtn" data-act="dir">${document.documentElement.dir === "rtl" ? "LTR" : "RTL"}</button><button class="navbtn" data-act="theme">${document.documentElement.classList.contains("dark") ? "Light" : "Dark"}</button><span class="navbtn hide-m">Ask Bert</span></div>
  <div class="split${S.lens === "paths" ? " wide" : ""}">
    <div class="pane">
      <div class="host">
        <div class="tabs"><div class="strip" role="tablist"><span class="desk">Document</span><span>Metadata</span><span class="on">Relationships <em class="cnt" title="${connectedCount(S.page)} connected entities">${fmt(connectedCount(S.page))}</em></span><span class="desk">Files</span></div><span class="btn desk">Español ▾</span></div>
        <div class="docmeta"><div class="kicker">${sq(S.page)}${esc(tplName(S.page))}</div><div class="title" dir="auto">${esc(title(S.page))}</div></div>
        <div class="toolbar lensrow"><div class="lens" role="group" aria-label="Question">
          <button data-act="lens" data-l="connections" aria-pressed="${S.lens === "connections"}">Connections</button>
          <button data-act="lens" data-l="paths" aria-pressed="${S.lens === "paths"}" ${connectionsOf(S.page).length ? "" : `disabled title="A path needs at least one connection to start from"`}>Paths</button>
          <button disabled title="No passages are anchored in this entity’s document" aria-pressed="false">In the document</button></div>
          ${S.lens === "connections" ? `<div class="search desk"><span class="muted">⌕</span><input id="q" placeholder="Search connections" value="${esc(S.q)}"></div><span class="btn desk">Filters</span>` : ""}
        </div>
        ${S.lens === "connections" ? `<div class="toolbar" style="display:none"></div>` : ""}
        ${trailHtml()}
      </div>
      ${S.lens === "paths" ? pathsView() : connectionsView()}
    </div>
    <div class="divider"></div>
    <div class="docpane"><div class="top"><span class="strip"><span class="on">Document</span></span></div><div class="sheet"><div class="h"></div><div class="h" style="width:40%"></div>${'<div class="l"></div>'.repeat(14)}</div></div>
  </div>
  ${S.overlay !== null ? overlayHtml() : ""}
  ${S.modal ? modalHtml() : ""}`;
  if (S.modal) { const i = document.getElementById("mq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

// ── Events ───────────────────────────────────────────────────────────────────
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  if (t.dataset.stop && ev.target.closest("[data-act]") === t) return;
  const i = t.dataset.i !== undefined ? +t.dataset.i : undefined;
  switch (t.dataset.act) {
    case "lens": S.lens = t.dataset.l; S.peek = null; break;
    case "ov": S.overlay = i; break;
    case "close": S.overlay = null; break;
    case "peek": S.peek = S.peek === i ? null : i; break;
    case "explore": if (i !== current()) S.trail.push(i); S.overlay = null; S.peek = null; S.q = ""; S.pin = null; break;
    case "back": S.trail.pop(); S.peek = null; S.pin = null; break;
    case "crumb": S.trail = S.trail.slice(0, +t.dataset.k); S.peek = null; S.pin = null; break;
    case "goto": S.page = i; S.trail = []; S.overlay = null; S.peek = null; S.to = null; S.pin = null; break;
    case "toggle": { const k = t.dataset.k; const open = t.getAttribute("aria-expanded") === "true"; S.shown[k] = open ? 0 : 5; break; }
    case "more": S.shown[t.dataset.k] = +t.dataset.lim + 25; break;
    case "modal": S.modal = true; S.mq = ""; break;
    case "mclose": if (ev.target === t || t.tagName === "BUTTON") S.modal = false; else return; break;
    case "pickto": S.to = i; S.modal = false; S.pin = null; S.forks = {}; break;
    case "clearto": S.modal = true; S.mq = ""; break;
    case "unskip": S.skip.delete(+t.dataset.ty); S.pin = null; break;
    case "skipadd": S.skip.add(+t.dataset.ty); S.pin = null; break;
    case "noskip": S.skip = new Set(); break;
    case "maxd+": S.maxD = Math.min(8, S.maxD + 2); break;
    case "pin": S.pin = i; S.forks = {}; break;
    case "unpin": S.pin = null; break;
    case "fork": S.forks[+t.dataset.d] = true; break;
    case "theme": document.documentElement.classList.toggle("dark"); break;
    case "dir": document.documentElement.dir = document.documentElement.dir === "rtl" ? "ltr" : "rtl"; break;
    default: return;
  }
  render();
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.dataset.act === "skipsel" && t.value !== "") { S.skip.add(+t.value); S.pin = null; render(); }
  if (t.dataset.act === "maxd") { S.maxD = +t.value; render(); }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "q") { S.q = ev.target.value; document.getElementById("body").innerHTML = groupsHtml(current()); }
  if (ev.target.id === "mq") { S.mq = ev.target.value; const m = document.createElement("div"); m.innerHTML = modalHtml(); document.getElementById("mres").replaceWith(m.querySelector("#mres")); }
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { if (S.modal) S.modal = false; else if (S.overlay !== null) S.overlay = null; else return; render(); }
  if (ev.key === "Enter" && ev.target.id === "mq") { const f = document.querySelector("#mres .result"); if (f) f.click(); }
});
render();
