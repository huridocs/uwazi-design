import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { corpus } from "./expect.mjs";
const corp = process.argv[2]; const title = process.argv[3]; const shot = process.argv[4];
const C = corpus(corp);
const pad = (n) => String(n).padStart(2, "0");
const dayS = (t) => { const d = new Date(t * 1000); return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`; };
const yr = (t) => new Date(t * 1000).getUTCFullYear();
const spanText = (s) => s.basis === "reported" ? (() => { const a = dayS(s.from), b = dayS(s.to); if (a === b) return a; return yr(s.from) === yr(s.to) ? `${a}–${b.slice(5)}` : `${yr(s.from)}–${yr(s.to)}`; })() : (yr(s.from) === yr(s.to) ? String(yr(s.from)) : `${yr(s.from)}–${yr(s.to)}`);
const LBL = { depicts: "shows", held_office: "held office at", responded_by: "response by", geolocated_by: "positioned by" };
const labelOf = (t) => LBL[t] ?? t.replace(/_/g, " ");
const { b, p, errs } = await launch();
const out = [];
try {
  await pickCollection(p, corp === "nepal" ? /Nepal protests/ : /Las Vegas/);
  await openByTitle(p, title);
  await p.getByRole("tab", { name: /^Relationships/ }).first().click().catch(() => {}); await p.waitForTimeout(1000);
  const ent = (C.byTitle.get(title) ?? []).find(e => C.refs.some(r => r.from === e.sharedId || r.to === e.sharedId));
  const shown = ent.docs?.[0];
  const refs = C.refs.filter(r => r.from === ent.sharedId || r.to === ent.sharedId);
  const readHeaders = () => p.evaluate(() => [...document.querySelectorAll('button[aria-expanded][aria-label*="reference"]')].map(b => {
    const r = b.getBoundingClientRect(); const wrap = b.closest("[data-component]") ?? b.parentElement;
    const span = b.querySelector('[data-part=span] .relative > span') ?? b.parentElement.querySelector('[data-part=span] .relative > span');
    const root = b.closest("div,section") ;
    const scope = b.parentElement;
    const seg = [...scope.querySelectorAll('[data-part=evidence-mix] > span')].map(s => s.getAttribute("data-status") + ":" + Math.round(parseFloat(s.style.width) * 10) / 10);
    const sp = scope.querySelector('[data-part=span] .relative > span');
    return { label: b.getAttribute("aria-label"), expanded: b.getAttribute("aria-expanded"), h: Math.round((b.closest('[data-component]')?.getBoundingClientRect().height) ?? r.height), btnH: Math.round(r.height), seg, bar: sp ? [sp.style.insetInlineStart, sp.style.width] : null,
      hasMembers: !!scope.querySelector("[data-part=members]"), hasSpan: !!scope.querySelector("[data-part=span]"), hasAnchor: !!scope.querySelector("[data-part=anchor]"), hasMix: !!scope.querySelector("[data-part=evidence-mix]"), hasDir: !!scope.querySelector("[data-part=shape-end] svg"), line: (scope.querySelector("[data-part=shape-line]")?.getBoundingClientRect().height) ?? null };
  }));
  const closed = await readHeaders();
  const rtl = process.env.RTL;
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
  const open = await readHeaders();
  if (shot) await p.screenshot({ path: shot });
  // expected per group
  const groups = new Map();
  for (const r of refs) { const k = labelOf(r.type); groups.set(k, [...(groups.get(k) ?? []), r]); }
  const exp = new Map();
  const spans = [];
  for (const [k, rs] of groups) {
    const status = { confirmed: 0, "single-source": 0, disputed: 0 };
    let hf = Infinity, ht = -Infinity, rf = Infinity, rt = -Infinity, anchored = 0, media = 0, first;
    const dirs = new Set(), tg = new Set();
    for (const r of rs) {
      status[r.verification] = (status[r.verification] ?? 0) + 1;
      tg.add(r.from === ent.sharedId ? r.to : r.from);
      if (r.date) { const { from, to } = r.date; if (from != null) hf = Math.min(hf, from); if (to != null) ht = Math.max(ht, to); if (from != null && to == null) ht = Math.max(ht, from); if (to != null && from == null) hf = Math.min(hf, to); }
      const pubs = (r.sources ?? []).map(s => (C.byId.get(s).metadata.published ?? [{}])[0].value).filter(x => x !== undefined);
      if (pubs.length) { const at = Math.min(...pubs); rf = Math.min(rf, at); rt = Math.max(rt, at); }
      const pg = r.quote && r.file && r.file === shown && r.page ? r.page : undefined;
      if (pg !== undefined) { anchored++; first = first === undefined || pg < first ? pg : first; } else if (r.media) { anchored++; media++; }
      dirs.add(r.from === ent.sharedId ? "outgoing" : "incoming");
    }
    const span = hf <= ht ? { from: hf, to: ht, basis: "held" } : rf <= rt ? { from: rf, to: rt, basis: "reported" } : undefined;
    if (span) spans.push(span);
    const st = ["confirmed", "single-source", "disputed"].filter(v => status[v]).map(v => `${status[v]} ${v === "single-source" ? "single source" : v}`);
    const parts = [`${k}, ${rs.length} ${rs.length === 1 ? "reference" : "references"}`];
    parts.push(`__members__${tg.size}`);
    if (st.length) parts.push(st.join(", "));
    if (span) parts.push(`${span.basis === "held" ? "held" : "reported"} ${spanText(span)}`);
    if (anchored) parts.push(`${anchored === rs.length ? "all" : `${anchored} of ${rs.length}`} anchored${first !== undefined ? `, first on page ${first}` : media ? " in a recording" : ""}`);
    parts.push(dirs.size > 1 ? "both directions" : [...dirs][0]);
    exp.set(k, { parts, span, status, total: rs.length });
  }
  const dom = spans.length ? { from: Math.min(...spans.map(s => s.from)), to: Math.max(...spans.map(s => s.to)) } : null;
  let ok = 0; const bad = [];
  for (const h of open) {
    const k = h.label.split(", ")[0];
    const e = exp.get(k);
    if (!e) { bad.push(["no expected group", h.label]); continue; }
    // normalise members: label has "with A, B, C and N more" or "with A, B"; count distinct
    const got = h.label.split("; ");
    const mem = got.find(x => x.startsWith("with "));
    let nMem = null; if (mem) { const m = mem.match(/and ([\d,]+) more$/); const names = mem.replace(/^with /, "").replace(/ and [\d,]+ more$/, "").split(", ").length; nMem = m ? names + parseInt(m[1].replace(/,/g, "")) : names; }
    const gotNorm = got.map(x => x.startsWith("with ") ? `__members__${nMem}` : x);
    const same = JSON.stringify(gotNorm) === JSON.stringify(e.parts);
    // names can contain ", " so names count may be off; compare loosely when only the member token differs
    const looseSame = gotNorm.filter(x => !x.startsWith("__members__")).join("|") === e.parts.filter(x => !x.startsWith("__members__")).join("|");
    if (looseSame) ok++; else bad.push([h.label, e.parts.join("; ")]);
    // bar position
    if (e.span && dom && h.bar) { const w = Math.max(1, dom.to - dom.from); const left = ((e.span.from - dom.from) / w) * 100; const wid = ((e.span.to - e.span.from) / w) * 100; const gl = parseFloat(h.bar[0]); const gw = parseFloat(h.bar[1].replace("max(0.25rem, ", "")); if (Math.abs(gl - left) > 0.6 || (Math.abs(gw - wid) > 0.6 && wid > 2)) bad.push(["axis", k, "got", h.bar, "want", left.toFixed(1), wid.toFixed(1)]); }
    // evidence mix widths
    const wantSeg = ["confirmed", "single-source", "disputed"].filter(v => e.status[v]).map(v => `${v}:${Math.round((e.status[v] / e.total) * 1000) / 10}`);
    if (JSON.stringify(h.seg) !== JSON.stringify(wantSeg)) bad.push(["mix", k, h.seg, wantSeg]);
  }
  out.push({ groups: open.length, labelsMatchingData: ok, bad: bad.slice(0, 6), badN: bad.length });
  const hs = new Set([...closed, ...open].map(h => h.btnH)); const lines = new Set([...closed, ...open].map(h => h.line));
  out.push({ headerHeightsClosedOrOpen: [...hs], shapeLineHeights: [...lines], closedExpanded: [...new Set(closed.map(h => h.expanded))], openExpanded: [...new Set(open.map(h => h.expanded))] });
  out.push({ parts: { members: open.filter(h => h.hasMembers).length, span: open.filter(h => h.hasSpan).length, anchor: open.filter(h => h.hasAnchor).length, mix: open.filter(h => h.hasMix).length, dir: open.filter(h => h.hasDir).length }, sampleLabel: open[0]?.label });
} catch (e) { out.push({ ERR: e.message.split("\n")[0] }); }
out.push({ errs });
console.log(JSON.stringify(out, null, 1));
await b.close();
