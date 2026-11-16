import fs from "node:fs";
const ROOT = "/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/83e1d675-6b8d-488f-b43d-6d6c15600155/scratchpad/wt2/app/public/";
const cache = {};
export function corpus(c) {
  if (cache[c]) return cache[c];
  const ents = JSON.parse(fs.readFileSync(`${ROOT}${c}-data/entities.json`, "utf8"));
  const refs = JSON.parse(fs.readFileSync(`${ROOT}${c}-data/relationships.json`, "utf8"));
  const byId = new Map(ents.map((e) => [e.sharedId, e]));
  const byTitle = new Map();
  for (const e of ents) { if (!byTitle.has(e.title)) byTitle.set(e.title, []); byTitle.get(e.title).push(e); }
  const byFrom = new Map();
  for (const r of refs) { if (!byFrom.has(r.from)) byFrom.set(r.from, []); byFrom.get(r.from).push(r); }
  return (cache[c] = { ents, refs, byId, byTitle, byFrom });
}
const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pad = (n) => String(n).padStart(2, "0");
export function fmtDay(sec, prec = "day") {
  const d = new Date(sec * 1000);
  const y = d.getUTCFullYear();
  if (prec === "year") return String(y);
  if (prec === "month") return `${y}/${pad(d.getUTCMonth() + 1)}`;
  return `${y}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
}
const g = (e, k) => (e.metadata[k] ?? [])[0] ?? {};
export function srcInfo(C, id) {
  const e = C.byId.get(id);
  const u = g(e, "url").value;
  return { id, title: e.title, pub: g(e, "publisher").value, ptype: g(e, "publisher_type").label ?? g(e, "publisher_type").value, syn: g(e, "syndicated_from").value, url: u && typeof u === "object" ? u.url : u, published: g(e, "published").value, accessed: g(e, "accessed").value, prec: e.datePrecision };
}
const origin = (s) => norm(s.syn) || norm(s.pub) || undefined;
/** The card a set of stored refs should draw, from the JSON alone. `shownDoc`: docs[0] of the focused record. */
export function expectCard(C, refs, shownDoc, corp) {
  const byId = new Map();
  for (const r of refs) for (const s of r.sources ?? []) byId.set(s, srcInfo(C, s));
  const sources = [...byId.values()].sort((a, b) => (a.published ?? Infinity) - (b.published ?? Infinity) || (a.pub ?? a.title).localeCompare(b.pub ?? b.title));
  const ind = new Set(sources.map(origin).filter(Boolean)).size;
  const withOrigin = sources.filter(origin).length;
  const dated = sources.map((s) => s.published).filter((x) => x !== undefined);
  const n = sources.length;
  const facts = [n ? `${n} ${n === 1 ? "source" : "sources"}` : "", n ? `${ind} independent ${ind === 1 ? "publisher" : "publishers"}` : "", withOrigin - ind ? `${withOrigin - ind} from a publisher already counted` : "", refs.length > 1 ? `${refs.length} references` : ""].filter(Boolean);
  let reported = "";
  if (dated.length) { const a = Math.min(...dated), b = Math.max(...dated); reported = fmtDay(a) === fmtDay(b) ? `Reported ${fmtDay(a)}` : `Reported ${fmtDay(a)} to ${fmtDay(b)}`; }
  const undated = sources.length - dated.length;
  const factsLine = [...facts, reported, undated ? `${undated} with no publication date` : ""].filter(Boolean).join(" · ");
  const statuses = [...new Set(refs.map((r) => r.verification))];
  const notes = [...new Set(refs.map((r) => r.note).filter(Boolean))];
  const sourceIds = new Set(sources.map((s) => s.id));
  const quotesBy = new Map(); const loose = [];
  const add = (id, q) => { const a = quotesBy.get(id) ?? []; if (!a.some((x) => x.text === q.text)) a.push(q); quotesBy.set(id, a); };
  for (const r of refs) {
    if (r.quote) {
      const q = { text: r.quote, page: r.file && r.file === shownDoc && r.page ? r.page : undefined };
      if (sourceIds.has(r.from)) add(r.from, q); else if (!loose.some((x) => x.text === q.text)) loose.push({ from: r.from, ...q });
    }
    // the sources' own quotes about either end
    const seen = new Set(r.quote ? [r.quote] : []);
    for (const sid of r.sources ?? []) for (const x of C.byFrom.get(sid) ?? []) {
      if (x.from !== sid || !x.quote || seen.has(x.quote)) continue;
      if (x.to !== r.from && x.to !== r.to) continue;
      seen.add(x.quote);
      add(sid, { text: x.quote, page: x.file && x.file === shownDoc && x.page ? x.page : undefined });
    }
  }
  return { sources, ind, factsLine, statuses, notes, quotesBy, loose, hasAnchor: refs.some((r) => r.media) };
}
export function basis(status, ind) {
  if (status === "disputed") return "Recorded as disputed: the sources, or other records, conflict.";
  if (status === "confirmed" && ind >= 2) return `Confirmed: ${ind} independent publishers report it. A wire copy counts once.`;
  if (status === "single-source" && ind === 1) return "Single source: one independent publisher reports it.";
  return status === "confirmed" ? "Recorded as confirmed." : "Recorded as single source.";
}
