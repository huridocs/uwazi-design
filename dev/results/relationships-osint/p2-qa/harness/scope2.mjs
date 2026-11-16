import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
const T = "Sushila Karki sworn in as interim prime minister";
try {
  await pickCollection(p, /Nepal protests/);
  await openByTitle(p, T);
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(900);
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
  await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(500);
  const tabPanel = p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"]');
  await tabPanel.getByLabel(/^Disputed, and the links they contest, \d+$/).first().check(); await p.waitForTimeout(500);
  const rows = () => p.evaluate(() => [...document.querySelectorAll('[data-component="ReferenceRow"]')].filter(r => !r.closest('[data-component="EntityPreviewSlideOver"]')).length);
  log("main rows with Contested ticked:", await rows());
  // pill -> slide-over
  const pill = p.locator('[data-component="ReferenceRow"]').first().getByRole("button", { name: /^Open / }).first();
  await pill.click(); await p.waitForTimeout(1500);
  const so = p.locator('[data-component="EntityPreviewSlideOver"]').filter({ hasText: "Open entity" }).first();
  await so.getByText(/^Relationships/).first().click(); await p.waitForTimeout(800);
  const exs = so.getByRole("button", { name: "Expand all" }).first(); if (await exs.count() && await exs.isEnabled()) { await exs.click(); await p.waitForTimeout(400); }
  const soRows = () => so.evaluate((el) => el.querySelectorAll('[data-component="ReferenceRow"]').length);
  const before = await soRows();
  await so.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(600);
  const soPanel = so.locator('[data-component="RelationshipsFilters"]');
  const cb = soPanel.getByLabel(/^Disputed, and the links they contest, \d+$/).first();
  log("slide-over: contested card shown", await soPanel.getByLabel(/^Disputed, and the links they contest/).count(), "checked at open:", await cb.isChecked());
  await cb.check(); await p.waitForTimeout(500);
  log("slide-over chips:", JSON.stringify(await so.evaluate(el => [...el.querySelectorAll('[data-component="ActiveFilterChip"]')].map(e => e.textContent.trim()))), "main chips:", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-component="ActiveFilterChip"]')].filter(e => !e.closest('[data-component="EntityPreviewSlideOver"]')).map(e => e.textContent.trim()))));
  log("main rows still:", await rows(), "(slide-over rows before", before + ")");
  await p.screenshot({ path: "p2-slideover-contested-1440.png" });
  // group header inside slide-over
  log("slide-over header sample:", await so.evaluate(el => el.querySelector('button[aria-expanded][aria-label*="reference"]')?.getAttribute("aria-label")?.slice(0, 160)));
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
