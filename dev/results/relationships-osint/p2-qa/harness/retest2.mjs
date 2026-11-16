import { launch, phonePickCollection, phoneOpen } from "./lib.mjs";
import fs from "node:fs";
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch({ w: 390, h: 844 });
const log = (...a) => console.log(...a);
const inCard = () => p.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, label: (a?.getAttribute("aria-label") || a?.textContent || "").trim().slice(0, 30), inDialog: !!a?.closest("[role=dialog][aria-modal=true]"), inCard: !!a?.closest('[data-component="RefEvidenceCard"]') }; });
try {
await phonePickCollection(p, /Nepal protests/);
await phoneOpen(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
const chip = p.locator('[data-component="EvidenceStatus"]').nth(5);
await chip.scrollIntoViewIfNeeded(); await chip.tap(); await p.waitForTimeout(800);
log("D1 phone: focus after open", JSON.stringify(await inCard()));
await p.evaluate(AXE);
const ax = await p.evaluate(async () => { const el = document.querySelector('[data-component="RefEvidenceCard"]'); const r = await axe.run(el); return r.violations.map(v => v.id + ":" + v.nodes.length); });
log("   axe phone card:", JSON.stringify(ax));
await p.keyboard.press("Tab"); await p.keyboard.press("Tab");
log("   after 2 Tab:", JSON.stringify(await inCard()));
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("   after Escape: cards", await p.locator('[data-component="RefEvidenceCard"]').count(), "focus on chip", await chip.evaluate(e => document.activeElement === e));
// delete relationship confirm from the sheet
const del = p.getByRole("button", { name: /^Delete relationship/ }).first();
await del.click({ force: true }); await p.waitForTimeout(700);
log("D1 'Delete relationship?' focus:", JSON.stringify(await inCard()), "dialogs:", await p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter(d => d.getBoundingClientRect().top < innerHeight - 5).map(d => (d.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 25))));
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("   after Escape dialogs:", await p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter(d => d.getBoundingClientRect().top < innerHeight - 5).map(d => (d.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 25))), "focus", JSON.stringify(await inCard()));
await p.evaluate(AXE);
// card again, axe + screenshot dark later
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(JSON.stringify(errs));
await b.close();
