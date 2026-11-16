import { launch, pickCollection, openByTitle } from "./lib.mjs";
import fs from "node:fs";
const outFile = process.argv[2];
const results = {};
const { b, p, errs } = await launch();
async function snapshot(label) {
  const r = {};
  await p.getByRole("tab", { name: /^Relationships/ }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  r.tabCount = await p.getByRole("tab", { name: /^Relationships/ }).first().innerText().then(t => t.replace(/\s+/g, " ")).catch(() => null);
  // view toggles
  r.views = await p.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].filter(b => ["List", "Tree", "Graph", "When"].includes((b.getAttribute("aria-label") || b.textContent).trim())).map(b => (b.getAttribute("aria-label") || b.textContent).trim() + "=" + b.getAttribute("aria-pressed")));
  // display menu
  await p.getByRole("button", { name: "Display options" }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  r.display = await p.evaluate(() => { const m = document.querySelector('[role=menu], [data-component="RelationshipsDisplayMenu"], [role=dialog][aria-label*="Display"]'); return m ? m.innerText.replace(/\n+/g, " | ").slice(0, 700) : null; });
  r.displayChecked = await p.evaluate(() => [...document.querySelectorAll('[role=menuitemradio][aria-checked="true"], [role=menuitemcheckbox][aria-checked="true"], [role=radio][aria-checked="true"], [aria-pressed="true"][data-part]')].map(e => e.textContent.trim().slice(0, 30)));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.mouse.click(430, 134); await p.waitForTimeout(300);
  // groups
  r.groupHeaders = await p.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')].filter(b => b.closest('[data-component="RelationshipsPanelBody"], main, section') || true).map(b => b.textContent.trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean).slice(0, 14));
  const ex = p.getByRole("button", { name: "Expand all" }).first();
  if (await ex.count() && await ex.isEnabled()) { await ex.click({ force: true }); await p.waitForTimeout(500); }
  r.rows = await p.evaluate(() => document.querySelectorAll('[data-component="ReferenceRow"]').length);
  r.firstRows = await p.evaluate(() => [...document.querySelectorAll('[data-component="ReferenceRow"]')].slice(0, 6).map(e => e.innerText.replace(/\s+/g, " ").slice(0, 110)));
  r.chipRects = await p.evaluate(() => [...document.querySelectorAll('[data-component="ReferenceRow"]')].slice(0, 4).map(row => { const c = row.querySelector('[data-component="RefStatus"], [data-component="EvidenceStatus"]'); if (!c) return null; const x = c.getBoundingClientRect(); const rr = row.getBoundingClientRect(); return [Math.round(x.width), Math.round(x.height), Math.round(rr.height)]; }));
  // facets
  await p.getByRole("button", { name: /^Filters/ }).first().click().catch(() => {}); await p.waitForTimeout(600);
  r.facetTitles = await p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"] h2').allInnerTexts().catch(() => []);
  r.facetEntries = await p.evaluate(() => [...document.querySelectorAll('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"] [data-component=FilterListCard]')].map(c => c.querySelector("h2").textContent + ": " + [...c.querySelectorAll("[data-part=option]")].slice(0, 6).map(o => o.innerText.replace(/\s+/g, " ")).join(" ; ")));
  r.sort = await p.evaluate(() => [...document.querySelectorAll("button")].map(b => b.getAttribute("aria-label") || "").filter(l => /^Sort/.test(l)));
  results[label] = r;
}
const pickCard = async (title) => { await p.getByRole("button", { name: "Library", exact: true }).first().click().catch(() => {}); await p.waitForTimeout(600); await openByTitle(p, title); };
try {
  await pickCollection(p, /Nepal protests/);
  await openByTitle(p, "Sushila Karki sworn in as interim prime minister");
  await snapshot("nepal-karki-tab");
  await p.getByRole("button", { name: "Tree", exact: true }).last().click(); await p.waitForTimeout(600);
  const exT = p.getByRole("button", { name: "Expand all" }).first(); if (await exT.count() && await exT.isEnabled()) await exT.click();
  results["nepal-karki-tree-rows"] = await p.evaluate(() => [...document.querySelectorAll("[data-component=ReferenceRow], [data-component=AggregateRow]")].length);
  results["nepal-karki-tree-first"] = await p.evaluate(() => [...document.querySelectorAll("[data-component=AggregateRow]")].slice(0, 5).map(e => e.innerText.replace(/\s+/g, " ").slice(0, 100)));
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(600);
  await pickCollection(p, /Las Vegas/);
  await openByTitle(p, "Volley 5 · 22:09:47");
  await snapshot("vegas-volley5");
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(600);
  // CEJIL & Sample: first record with relationships
  for (const [label, re, q] of [["cejil", /CEJIL/, "Corte"], ["sample", /Inter-American Human Rights Archive/, ""]]) {
    await p.getByRole("button", { name: /^Collection: / }).click();
    await p.locator("[role=menuitem],[role=option],[role=menuitemradio]").filter({ hasText: re }).first().click();
    await p.waitForTimeout(2500);
    if (q) { await p.getByPlaceholder(/Search title/).fill(q); await p.keyboard.press("Enter"); await p.waitForTimeout(1500); } else { await p.getByRole("button", { name: "Browse the collection" }).click().catch(() => {}); await p.waitForTimeout(1500); }
    const opens = p.getByRole("button", { name: "Open", exact: true });
    for (let i = 0; i < 12; i++) {
      await opens.nth(i).click(); await p.waitForTimeout(1500);
      const t = await p.getByRole("tab", { name: /^Relationships/ }).first().innerText().catch(() => "");
      const m = t.match(/(\d+)/);
      if (m && +m[1] > 3) { results[label + "-record"] = await p.locator("h1,h2").first().innerText().catch(() => ""); await snapshot(label); break; }
      await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(700);
    }
    await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(700);
  }
} catch (e) { results.error = e.message.split("\n").slice(0,4).join(" / ") + " @ " + (e.stack.split("\n").find(l => /defaults.mjs/.test(l)) || ""); }
results.errs = errs;
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log("wrote", outFile, Object.keys(results));
await b.close();
