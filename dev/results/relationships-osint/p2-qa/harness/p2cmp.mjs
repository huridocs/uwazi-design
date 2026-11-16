import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { oracle } from "./contest-oracle.mjs";
const corp = process.argv[2];
const titles = process.argv.slice(3);
const O = oracle(corp);
const LBL = { depicts: "shows", held_office: "held office at", responded_by: "response by", geolocated_by: "positioned by" };
const labelOf = (t) => LBL[t] ?? t.replace(/_/g, " ");
const { b, p, errs } = await launch();
const card = '[data-component="RefEvidenceCard"]';
const res = [];
try {
  await pickCollection(p, corp === "nepal" ? /Nepal protests/ : /Las Vegas/);
  for (const title of titles) {
    await p.getByRole("button", { name: "Library", exact: true }).first().click().catch(() => {}); await p.waitForTimeout(400);
    await openByTitle(p, title);
    await p.getByRole("tab", { name: /^Relationships/ }).first().click().catch(() => {}); await p.waitForTimeout(900);
    for (let k = 0; k < 20; k++) { const m = p.getByRole("button", { name: /^Load \d+ more$/ }); if (!(await m.count())) break; await m.first().click(); await p.waitForTimeout(150); }
    const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
    const ent = (O.C.byTitle.get(title) ?? []).find(e => O.refsOf(e.sharedId).length);
    const refs = O.refsOf(ent.sharedId);
    // expected multiset
    const expAll = refs.filter(r => O.C.refs.includes(r));
    const expContested = refs.filter((r) => O.isContested(r));
    const tuple = (r) => { const c = O.contestOf(r); const other = r.from === ent.sharedId ? r.to : r.from; return [labelOf(r.type), O.C.byId.get(other).title, r.verification, c.has ? (c.claimInherited ? "Claim contested" : c.disputed ? "Contested by" : "Disputed by") : "-", c.opposing, c.paired, c.figures, c.competing, c.missing ? "missing" : "", c.has && c.note ? "note" : ""].join("|"); };
    // observed
    const chips = p.locator('[data-component="EvidenceStatus"]');
    const n = await chips.count();
    const obs = [];
    for (let i = 0; i < n; i++) {
      await chips.nth(i).scrollIntoViewIfNeeded(); await chips.nth(i).click(); await p.waitForSelector(card, { timeout: 3000 });
      const o = await p.evaluate(() => {
        const c = document.querySelector('[data-component="RefEvidenceCard"]');
        const lines = c.innerText.split("\n").map(s => s.trim()).filter(Boolean);
        const sub = lines[1] ?? "";
        const st = c.querySelector("[data-part=status]");
        const chipsT = [...(st?.querySelectorAll(":scope > div > *") ?? [])].map(x => x.textContent.trim());
        const ct = c.querySelector("[data-part=contest]");
        const sides = {};
        if (ct) for (const s of ct.querySelectorAll("[data-part=contest-side]")) sides[s.querySelector("p").textContent.trim()] = s.querySelectorAll("ul > li").length;
        return { sub, status: chipsT[0], heading: ct ? ct.querySelector("p, h2, h3, div")?.textContent.trim() : null, headingAria: ct?.getAttribute("aria-label"), opp: sides["Other side"] ?? 0, pair: sides["Same side"] ?? 0, fig: ct ? ct.querySelectorAll("[data-part=contest-figures]").length : 0, comp: ct ? ct.querySelectorAll("[data-part=contest-competing] li").length : 0, missing: ct ? !!ct.querySelector("[data-part=contest-missing]") : false, clocks: ct ? ct.querySelectorAll("[data-part=contest-clock]").length : 0, succ: c.querySelectorAll("[data-part=succession] li").length, chipLabel: null };
      });
      o.chipLabel = await chips.nth(i).getAttribute("aria-label");
      obs.push(o);
      await p.keyboard.press("Escape"); await p.waitForTimeout(80);
    }
    const STATUS = { confirmed: "Confirmed", "single-source": "Single source", disputed: "Disputed" };
    const obsKeys = obs.map((o) => { const lab = o.sub.split(" · ")[0]; const tgt = o.sub.split(" · ").slice(1).join(" · "); const st = Object.entries(STATUS).find(([, v]) => v === o.status)?.[0]; return [lab, tgt, st, o.heading ?? "-", o.opp, o.pair, o.fig, o.comp, o.missing ? "missing" : "", o.heading && /note|./.test("") ? "" : ""].join("|"); });
    // expected keys without the note flag (note text is not a separate element)
    const expKeys = expAll.map((r) => { const c = O.contestOf(r); const other = r.from === ent.sharedId ? r.to : r.from; return [labelOf(r.type), O.C.byId.get(other).title, r.verification, c.has ? (c.claimInherited ? "Claim contested" : c.disputed ? "Contested by" : "Disputed by") : "-", c.opposing, c.paired, c.figures, c.competing, c.missing ? "missing" : "", ""].join("|"); });
    // chips only exist where hasEvidence (all Nepal/Vegas refs have sources) so compare full multisets
    const cnt = (a) => a.reduce((m, k) => (m.set(k, (m.get(k) ?? 0) + 1), m), new Map());
    const A = cnt(obsKeys), B = cnt(expKeys);
    const onlyObs = [], onlyExp = [];
    for (const [k, v] of A) if ((B.get(k) ?? 0) < v) onlyObs.push([k, v - (B.get(k) ?? 0)]);
    for (const [k, v] of B) if ((A.get(k) ?? 0) < v) onlyExp.push([k, v - (A.get(k) ?? 0)]);
    // contested filter
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(500);
    const panel = p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"]');
    const cb = panel.getByLabel(/^Disputed, and the links they contest, \d+$/);
    const has = await cb.count();
    let uiCount = null, rowsAfter = null;
    if (has) { uiCount = +(await cb.first().getAttribute("aria-label")).match(/(\d+)$/)[1]; await cb.first().check(); await p.waitForTimeout(500);
      const exa = p.getByRole("button", { name: "Expand all" }).first(); if (await exa.count() && await exa.isEnabled()) { await exa.click(); await p.waitForTimeout(500); }
      rowsAfter = await p.evaluate(() => document.querySelectorAll('[data-component="ReferenceRow"]').length);
      await cb.first().uncheck(); await p.waitForTimeout(300); }
    res.push({ title: title.slice(0, 50), rows: n, expRows: expAll.length, onlyObs: onlyObs.slice(0, 4), onlyExp: onlyExp.slice(0, 4), nMismatch: onlyObs.length + onlyExp.length, filterShown: !!has, uiCount, rowsAfter, expectedContested: expContested.length, sup: obs.filter(o => o.succ).length });
  }
} catch (e) { res.push({ ERR: e.message.split("\n")[0] }); }
console.log(JSON.stringify(res, null, 1));
console.log("errs", JSON.stringify(errs));
await b.close();
