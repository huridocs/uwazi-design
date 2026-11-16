import { corpus } from "./expect.mjs";
const STANCE = { supports: "disputes", disputes: "supports" };
const isStance = (t) => t === "supports" || t === "disputes";
const num = (v) => (typeof v === "number" ? v : undefined);
const md = (e, k) => (e?.metadata?.[k] ?? [])[0]?.value;
function figureOf(e) { const f = num(md(e, "figure")), u = md(e, "unit"); if (f === undefined || !u) return undefined; const q = md(e, "qualifier"); const basis = md(e, "as_of_basis"); return { figure: f, unit: u, unitDetail: md(e, "unit_detail"), qualifier: ["exact", "at-least", "about", "more-than"].includes(q) ? q : "exact", scope: md(e, "scope"), asOf: num(md(e, "as_of")), asOfTime: md(e, "as_of_time"), asOfBasis: basis === "publication-date" ? "published" : basis === "official-count" || basis === "report-date" ? "stated" : basis }; }
const key = (f) => (f.asOf === undefined || (f.asOfBasis !== "stated" && f.asOfBasis !== "derived") ? undefined : [f.unit, f.unitDetail ?? "", (f.scope ?? "").toLowerCase(), f.asOf, f.asOfTime ?? ""].join("|"));
const compatible = (a, b) => { if (a.figure === b.figure) return true; const holds = (x, y) => (x.qualifier === "at-least" && y.figure >= x.figure) || (x.qualifier === "about" && Math.abs(y.figure - x.figure) <= x.figure * 0.1); return holds(a, b) || holds(b, a); };
export function oracle(corp) {
  const C = corpus(corp);
  const byEnt = new Map();
  for (const r of C.refs) for (const id of new Set([r.from, r.to])) { if (!byEnt.has(id)) byEnt.set(id, []); byEnt.get(id).push(r); }
  const refsOf = (id) => byEnt.get(id) ?? [];
  const refById = new Map(C.refs.map((r) => [r.id, r]));
  const isClaim = (id) => C.byId.get(id)?.template?.endsWith("_claim");
  const isSource = (id) => C.byId.get(id)?.template?.endsWith("_source");
  // figure index (comparable key)
  const idx = new Map();
  for (const e of C.ents) if (e.template?.endsWith("_claim")) { const f = figureOf(e); const k = f && key(f); if (k) { if (!idx.has(k)) idx.set(k, []); idx.get(k).push(e.sharedId); } }
  const conflictsOf = (claimId) => {
    const out = new Set(); const f = figureOf(C.byId.get(claimId)); const k = f && key(f);
    if (corp === "nepal") {
      if (f && k) for (const id of idx.get(k) ?? []) { if (id === claimId) continue; if (!compatible(f, figureOf(C.byId.get(id)))) out.add(id); }
      for (const r of refsOf(claimId)) if (r.type === "conflicts_with") { const id = r.from === claimId ? r.to : r.from; if (id !== claimId) out.add(id); }
    } else {
      for (const r of refsOf(claimId)) if (r.type === "contradicts") { const id = r.from === claimId ? r.to : r.from; if (id !== claimId) out.add(id); }
    }
    return [...out];
  };
  const claimStatus = (id) => md(C.byId.get(id), "verification_status");
  function contestOf(ref) {
    const opposing = new Map(), paired = new Map();
    const put = (into, r) => { if (r.id === ref.id || opposing.has(r.id) || paired.has(r.id)) return; into.set(r.id, r); };
    const claims = [ref.from, ref.to].filter((id, i, a) => a.indexOf(id) === i && isClaim(id));
    for (const c of claims) {
      const st = { supports: [], disputes: [] };
      for (const r of refsOf(c)) if (r.to === c && isStance(r.type) && !isClaim(r.from)) st[r.type].push(r);
      if (isStance(ref.type) && ref.to === c) {
        if (st[STANCE[ref.type]].length === 0) continue;
        for (const r of st[STANCE[ref.type]]) put(opposing, r);
        for (const r of st[ref.type]) put(paired, r);
      } else if (st.disputes.length > 0) { for (const r of st.disputes) put(opposing, r); for (const r of st.supports) put(paired, r); }
    }
    const figures = [];
    for (const c of claims) { const cf = conflictsOf(c).filter((x) => !figures.some((f) => f.claim === x)); if (cf.length) figures.push({ claim: c, conflicts: cf }); }
    for (const id of ref.dispute?.paired ?? []) { const r = refById.get(id); if (r) put(opposing, r); }
    const conflicting = new Set([...figures.flatMap((f) => f.conflicts), ...(ref.dispute?.conflicting ?? [])]);
    for (const s of ref.dispute?.opposing ?? []) {
      const own = refsOf(s).filter((r) => r.from === s && (r.to === ref.from || r.to === ref.to || conflicting.has(r.to)));
      if (own.length) for (const r of own) put(opposing, r);
      else if (!opposing.has(`source:${s}`)) opposing.set(`source:${s}`, { id: `source:${s}` });
    }
    for (const r of [...refsOf(ref.from), ...refsOf(ref.to)]) if (r.dispute?.paired?.includes(ref.id)) put(opposing, r);
    if (ref.verification === "disputed" && claims.length === 0) {
      for (const end of [ref.from, ref.to]) for (const r of refsOf(end)) {
        const other = r.from === end ? r.to : r.from;
        if ((r.from === ref.from && r.to === ref.to) || (r.from === ref.to && r.to === ref.from)) { if (!r.media && !ref.media) put(paired, r); }
        else if (isClaim(other) && r.type === "concerns" && claimStatus(other) === "disputed") put(paired, r);
      }
    }
    const listed = new Set(figures.flatMap((f) => [f.claim, ...f.conflicts]));
    const competing = (ref.dispute?.conflicting ?? []).filter((id) => !listed.has(id));
    const { note, missing } = ref.dispute ?? {};
    const any = opposing.size || paired.size || figures.length || competing.length || note || missing;
    const contested = any && (opposing.size || figures.length || competing.length || note || missing || ref.verification === "disputed");
    return { has: !!contested, opposing: opposing.size, paired: paired.size, figures: figures.length, competing: competing.length, note: !!note, missing: !!missing, claimInherited: ref.dispute?.basis === "claim-inherited", disputed: ref.verification === "disputed" };
  }
  const supersedes = (claimId) => refsOf(claimId).filter((r) => r.type === "supersedes");
  return { C, refsOf, contestOf, isContested: (r) => r.verification === "disputed" || contestOf(r).has, supersedes, isClaim };
}
