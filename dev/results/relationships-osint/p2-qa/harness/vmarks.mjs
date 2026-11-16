import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p, errs } = await launch({ dark: true });
try {
  await pickCollection(p, /Las Vegas/);
  await openByTitle(p, "Taxi dash video · 22:09:50");
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
  const marks = await p.locator('[data-component="ContestedClock"]').evaluateAll(e => e.map(x => ({ text: x.textContent.replace(/\s+/g, " ").trim(), title: x.getAttribute("title"), row: x.closest('[data-component="ReferenceRow"]')?.innerText.replace(/\s+/g, " ").slice(0, 80) })));
  console.log("marks", JSON.stringify(marks, null, 1));
  await p.screenshot({ path: "p2-vegas-sync-outliers-1440-dark.png" });
  // contested filter on the tab
  await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(500);
  const panel = p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"]');
  await panel.getByLabel(/^Disputed, and the links they contest, \d+$/).first().check(); await p.waitForTimeout(500);
  await p.screenshot({ path: "p2-vegas-contested-filter-1440-dark.png" });
  console.log("chips", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-component="ActiveFilterChip"]')].map(e => e.textContent.trim()))), "filters buttons", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("button")].filter(b => /^Filters/.test(b.textContent.trim())).map(b => b.textContent.trim()))));
  // Clear
  await p.getByRole("button", { name: /^Clear$/ }).last().click(); await p.waitForTimeout(400);
  console.log("after clear chips", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-component="ActiveFilterChip"]')].map(e => e.textContent.trim()))));
} catch (e) { console.log("ERR", e.message.split("\n")[0]); }
console.log(JSON.stringify(errs));
await b.close();
