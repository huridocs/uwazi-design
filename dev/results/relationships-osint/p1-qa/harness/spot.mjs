import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { corpus, expectCard, basis, fmtDay } from "./expect.mjs";
import { scrapeCard } from "./scrape.mjs";
const picks = [
  { corp: "nepal", entity: "Hami Nepal organised the 8 September protest", find: (r) => r.verification === "disputed" },
  { corp: "nepal", entity: "Decisions of the Council of Ministers, Bhadra 2082 (Nepali; meetings of Bhadra 2, 9, 13, 23 and 30)", find: (r) => r.file && r.page === 4 },
  { corp: "nepal", entity: "Death toll: 75 (photo agency caption, about October 2025)", find: (r, C) => (r.sources ?? []).some(s => C.byId.get(s).datePrecision === "month") },
  { corp: "vegas", entity: "Taxi dash video · 22:09:50", find: (r) => r.verification === "disputed" },
];
const { b, p, errs } = await launch();
const out = [];
let cur = null;
try {
  for (const pk of picks) {
    const C = corpus(pk.corp);
    if (cur !== pk.corp) { await p.getByRole("button", { name: /^Collection: / }).click(); await p.locator("[role=menuitem],[role=option],[role=menuitemradio]").filter({ hasText: pk.corp === "nepal" ? /Nepal protests/ : /Las Vegas/ }).first().click(); await p.waitForTimeout(2500); cur = pk.corp; }
    await openByTitle(p, pk.entity);
    const tabs = p.getByRole("tab", { name: /^Relationships/ });
    if (await p.locator('[data-component="EvidenceStatus"]').count() === 0) { await tabs.last().click(); await p.waitForTimeout(800); }
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
    const ent = (C.byTitle.get(pk.entity) ?? []).find(e => C.refs.some(r => r.from === e.sharedId || r.to === e.sharedId));
    const mine = C.refs.filter(r => r.from === ent.sharedId || r.to === ent.sharedId);
    const ref = pk.refId ? mine.find(r => r.id === pk.refId) : mine.find(r => pk.find(r, C));
    const exp = expectCard(C, [ref], C.byId.get(ent.sharedId)?.docs?.[0]);
    const other = ref.from === ent.sharedId ? ref.to : ref.from;
    const otherTitle = C.byId.get(other).title;
    // find the chip with this target & source set
    const chips = p.locator('[data-component="EvidenceStatus"]');
    const n = await chips.count();
    let got = null;
    for (let i = 0; i < n; i++) {
      await chips.nth(i).click(); await p.waitForTimeout(200);
      const g = await scrapeCard(p);
      const lines = g.text.split("\n").map(s => s.trim()).filter(Boolean);
      const sub = lines[1] ?? "";
      const same = JSON.stringify(g.sources.map(s => s.title).sort()) === JSON.stringify(exp.sources.map(s => s.title).sort());
      const noteOk = JSON.stringify(g.notes) === JSON.stringify(exp.notes);
      await p.keyboard.press("Escape"); await p.waitForTimeout(120);
      if (sub.endsWith(otherTitle) && same && noteOk) { got = g; break; }
    }
    out.push({ ref: ref.id, entity: pk.entity.slice(0, 50), target: otherTitle.slice(0, 60), status: ref.verification,
      expected: { facts: exp.factsLine, basis: basis(exp.statuses[0], exp.ind), sources: exp.sources.map(s => `${s.pub ?? s.title}${s.ptype ? " [" + s.ptype + "]" : ""} ${s.published !== undefined ? fmtDay(s.published, s.prec ?? "day") : "undated"}${s.syn && s.syn.toLowerCase() !== (s.pub ?? "").toLowerCase() ? " (syn: " + s.syn + ")" : ""}`), quotes: [...exp.quotesBy.values()].flat().length + exp.loose.length, note: exp.notes[0]?.slice(0, 80), pages: [...exp.quotesBy.values()].flat().filter(q => q.page).map(q => q.page) },
      got: got ? { facts: got.facts, basis: got.statusPs[0], sources: got.sources.map(s => `${s.publisherLine} ${s.date}${s.synd ? " (" + s.synd + ")" : ""}`), quotes: got.sources.reduce((a, s) => a + s.quotes.length, 0) + got.loose.filter(l => l.quote).length, note: got.notes[0]?.slice(0, 80), pages: got.sources.flatMap(s => s.quotes.map(q => q.page)).filter(Boolean) } : null });
    await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(700);
  }
} catch (e) { out.push({ ERR: e.message.split("\n")[0] }); }
console.log(JSON.stringify(out, null, 1));
await b.close();
