import { launch, pickCollection, openByTitle } from "./lib.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
try {
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(1000);
const expandIn = async (root) => { const ex = root.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(400); } };
const rowsIn = (root) => root.evaluate((el) => el.querySelectorAll('[data-component="ReferenceRow"]').length);
const main = p.locator("body");
await expandIn(p);
await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(500);
const tabPanel = p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"]');
await tabPanel.getByLabel("Al Jazeera, 12", { exact: true }).check(); await p.waitForTimeout(500);
// open a pill -> slide-over
// the left pane list: click entity pill "Sudan Gurung" (involved)
const pillBtn = p.locator('[data-component="ReferenceRow"]').first().getByRole("button", { name: /^Open / }).first();
const pillName = (await pillBtn.getAttribute("aria-label")).replace(/^Open /, "");
log("pill:", pillName);
await pillBtn.click();
await p.waitForTimeout(1500);
const so = p.locator('[data-component="EntityPreviewSlideOver"]').filter({ hasText: "Open entity" }).first();
log("slide-over present", await so.count());
await so.getByText(/^Relationships/).first().click(); await p.waitForTimeout(800);
await expandIn(so);
log("slide-over rows (own scope, expect all):", await rowsIn(so));
const soFilters = so.getByRole("button", { name: /^Filters/ }).first();
log("slide-over Filters button text:", (await soFilters.innerText()).trim());
await soFilters.click(); await p.waitForTimeout(700);
const soPanel = so.locator('[data-component="RelationshipsFilters"]');
log("slide-over panels", await soPanel.count(), "has Publisher card", await soPanel.getByText("Publisher", { exact: true }).count(), "has Reported by", await soPanel.getByText("Reported by", { exact: true }).count());
await p.screenshot({ path: "filt6-slideover-filters.png" });
// tick a publisher in slide-over
const first = soPanel.locator('[data-component=FilterListCard]').filter({ has: p.getByText("Publisher", { exact: true }) }).locator('input[type=checkbox]').first();
const firstName = await first.getAttribute("aria-label");
await first.check(); await p.waitForTimeout(500);
log("ticked in slide-over:", firstName);
const chipsBy = () => p.evaluate(() => { const inSo = [], outSo = []; for (const e of document.querySelectorAll('[data-component="ActiveFilterChip"]')) (e.closest('[data-component="EntityPreviewSlideOver"]') ? inSo : outSo).push(e.textContent.trim()); return { slideOver: inSo, main: outSo }; });
log("chips after slide-over tick:", JSON.stringify(await chipsBy()));
const soRows = async () => { await so.getByRole("button", { name: /^Close filters|^Back/ }).first().click().catch(() => {}); return null; };
// main tab rows still 12 ?
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("slide-over open after 2 Esc:", await p.locator('[data-component="EntityPreviewSlideOver"]:not([inert])').count());
const exm = p.getByRole("button", { name: "Expand all" }).first(); if (await exm.isEnabled()) await exm.click(); await p.waitForTimeout(400);
log("main rows now:", await p.evaluate(() => [...document.querySelectorAll('[data-component="ReferenceRow"]')].filter(r => !r.closest('[data-component="EntityPreviewSlideOver"]')).length), "main chips", JSON.stringify((await chipsBy()).main));
// reopen slide-over: state should reset
await p.locator('[data-component="ReferenceRow"]').first().getByRole("button", { name: /^Open / }).first().click(); await p.waitForTimeout(1200);
await so.getByText(/^Relationships/).first().click(); await p.waitForTimeout(600);
log("after reopen: chips", JSON.stringify(await chipsBy()));

await b.close();
} catch (e) { log("ERR", e.message.split("\n")[0]); await b.close(); }
log(JSON.stringify(errs));
