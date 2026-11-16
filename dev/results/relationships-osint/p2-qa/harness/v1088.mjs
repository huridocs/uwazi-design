import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p, errs } = await launch();
const card = '[data-component="RefEvidenceCard"]';
try {
  await pickCollection(p, /Las Vegas/);
  await openByTitle(p, "LVMPD release 6, item 2 · 22:06:01");
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
  const chips = p.locator('[data-component="EvidenceStatus"]');
  const labels = await chips.evaluateAll(e => e.map(x => x.getAttribute("aria-label")));
  console.log(JSON.stringify(labels));
  const i = labels.findIndex(l => /Disputed/.test(l));
  await chips.nth(i).click(); await p.waitForTimeout(500);
  console.log((await p.locator(card).innerText()).slice(0, 1200));
  console.log("clock marks on rows:", await p.locator('[data-component="ContestedClock"]').count());
  await p.keyboard.press("Escape");
  await p.screenshot({ path: "v1088-rows.png" });
} catch (e) { console.log("ERR", e.message.split("\n")[0]); }
console.log(JSON.stringify(errs));
await b.close();
