import { launch, pickCollection, openByTitle } from "./lib.mjs";
import fs from "node:fs";
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch();
const log = (...a) => console.log(...a);
try {
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
await p.getByRole("button", { name: "Settings" }).click(); await p.waitForTimeout(300);
await p.getByRole("button", { name: /Test RTL layout/ }).click(); await p.waitForTimeout(800);
log("dir", await p.evaluate(() => document.documentElement.dir + "|" + document.body.dir));
await p.keyboard.press("Escape");
const ex = p.getByRole("button", { name: "Expand all" }).first();
if (await ex.count() && await ex.isEnabled()) await ex.click(); await p.waitForTimeout(500);
const chips = p.locator('[data-component="EvidenceStatus"]');
await chips.nth(5).scrollIntoViewIfNeeded(); await chips.nth(5).click(); await p.waitForTimeout(600);
await p.screenshot({ path: "rtl-card-1440.png" });
const geo = await p.evaluate(() => {
  const card = document.querySelector('[data-component="RefEvidenceCard"] [role=dialog]');
  const r = card.getBoundingClientRect();
  const src = card.querySelector('[data-part=source]');
  const date = src.querySelector(':scope > div:first-child > span:last-child');
  const pub = src.querySelector(':scope > div:first-child > p');
  const dr = date.getBoundingClientRect(), pr = pub.getBoundingClientRect();
  const q = card.querySelector('[data-part=quote]');
  return { dir: getComputedStyle(card).direction, card: [r.left, r.right], dateLeftOfPublisher: dr.left < pr.left, hOverflow: card.scrollWidth > card.clientWidth, closeLeft: (() => { const x = card.querySelector('button[aria-label="Close"]'); const xr = x.getBoundingClientRect(); return xr.left < (r.left + r.right) / 2; })() };
});
log("RTL geometry", JSON.stringify(geo));
await p.evaluate(AXE);
const ax = await p.evaluate(async () => { const el = document.querySelector('[data-component="RefEvidenceCard"]'); const r = await axe.run(el); return r.violations.map(v => v.id + ":" + v.nodes.length); });
log("AXE rtl", JSON.stringify(ax));
await p.keyboard.press("Escape");
// filters in RTL: open Filters tab, screenshot
await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(600);
await p.screenshot({ path: "rtl-filters-1440.png" });
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
