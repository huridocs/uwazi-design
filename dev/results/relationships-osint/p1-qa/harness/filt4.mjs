import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { corpus, srcInfo } from "./expect.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const C = corpus("nepal");
const id = "event:2025-09-12-karki-sworn-in-as-interim-prime-minister";
const refs = C.refs.filter((r) => r.from === id || r.to === id);
const pubOf = (r) => new Set((r.sources ?? []).map((s) => { const i = srcInfo(C, s); return i.pub ?? i.title; }));
const typeOf = (r) => new Set((r.sources ?? []).map((s) => srcInfo(C, s).ptype).filter(Boolean));
const repAt = (r) => { const d = (r.sources ?? []).map((s) => srcInfo(C, s).published).filter((x) => x !== undefined); return d.length ? Math.min(...d) : undefined; };
const day = Date.parse("2025-09-12") / 1000;
const repOk = (r) => { const a = repAt(r); return a === undefined || a < day + 86400; };
const E = {
  alj: refs.filter((r) => pubOf(r).has("Al Jazeera")).length,
  aljAgency: refs.filter((r) => pubOf(r).has("Al Jazeera") && typeOf(r).has("News agency")).length,
  rep: refs.filter(repOk).length,
  all3: refs.filter((r) => pubOf(r).has("Al Jazeera") && typeOf(r).has("News agency") && repOk(r)).length,
};
console.log("EXPECTED", JSON.stringify(E));
const { b, p, errs } = await launch();
const out = [];
const log = (...a) => { out.push(a.join(" ")); console.log(...a); };
try {
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(1000);
await p.getByRole("button", { name: "Expand all" }).first().click(); await p.waitForTimeout(500);
const rowCount = async () => { const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(400); } return p.evaluate(() => document.querySelectorAll('[data-component="ReferenceRow"]').length); };
log("baseline rows", await rowCount());
await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(600);
const panel = p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"]');
const badge = () => p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter(b => /^Filters/.test((b.getAttribute("aria-label") || b.textContent).trim())); return bs.map(b => (b.getAttribute("aria-label") || "") + "|" + b.textContent.trim()); });
log("filters buttons baseline", JSON.stringify(await badge()));
await panel.getByLabel("Al Jazeera, 12", { exact: true }).check(); await p.waitForTimeout(500);
log("A Al Jazeera -> rows", await rowCount(), "exp", E.alj, "| buttons", JSON.stringify(await badge()));
const chips = () => p.evaluate(() => [...document.querySelectorAll('[data-component="ActiveFilterChip"]')].map(e => e.textContent.trim()));
log("   chips", JSON.stringify(await chips()));
await p.screenshot({ path: "filt4-a.png" });
await panel.getByLabel(/^News agency, /).check(); await p.waitForTimeout(500);
log("B +News agency -> rows", await rowCount(), "exp", E.aljAgency, "chips", JSON.stringify(await chips()), "| buttons", JSON.stringify(await badge()));
const inp = panel.locator('[data-component="ReportedByCard"] input').first();
log("   reported-by input value/placeholder", JSON.stringify(await inp.evaluate(e => [e.value, e.placeholder, e.type])));
await inp.fill("2025/09/12"); await inp.press("Enter"); await p.waitForTimeout(600);
log("C +Reported by 2025/09/12 -> rows", await rowCount(), "exp", E.all3, "chips", JSON.stringify(await chips()), "| buttons", JSON.stringify(await badge()));
await p.screenshot({ path: "filt4-c.png" });
// clear all
const footerClear = p.locator('[data-component="RelationshipsFiltersTab"]').getByRole("button", { name: /^Clear$/ });
const allClear = await p.getByRole("button", { name: /^Clear$/ }).evaluateAll(els => els.map(e => e.closest("[data-component]")?.getAttribute("data-component")));
log("   Clear buttons by host", JSON.stringify(allClear));
await p.getByRole("button", { name: /^Clear$/ }).last().click(); await p.waitForTimeout(500);
log("D footer Clear -> rows", await rowCount(), "chips", JSON.stringify(await chips()), "| buttons", JSON.stringify(await badge()), "input", JSON.stringify(await inp.inputValue()), "pubChecked", await panel.locator("input[type=checkbox]:checked").count());
// reported by alone
await inp.fill("2025/09/12"); await inp.press("Enter"); await p.waitForTimeout(600);
log("E Reported by only -> rows", await rowCount(), "exp", E.rep, "chips", JSON.stringify(await chips()));
// clear via chip x
const x = p.locator('[data-component="ActiveFilterChip"] button').first();
await x.click(); await p.waitForTimeout(500);
log("F chip x -> rows", await rowCount(), "input", await inp.inputValue());
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
