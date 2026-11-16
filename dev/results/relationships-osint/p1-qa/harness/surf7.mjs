import { launch, pickCollection, openByTitle } from "./lib.mjs";
import { expandAll } from "./cmp.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch();
await pickCollection(p, /Nepal protests/);
await openByTitle(p, T);
await expandAll(p);
const chip = p.locator('[data-component="EvidenceStatus"]').nth(5);
const focusInfo = () => p.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, label: a?.getAttribute("aria-label"), isChip: a?.getAttribute("data-component") === "EvidenceStatus" }; });
// (a) × button
await chip.click(); await p.waitForTimeout(300);
await p.locator('[data-component="RefEvidenceCard"] button[aria-label="Close"]').click().catch(async () => console.log("no aria-label=Close; buttons:", await p.locator('[data-component="RefEvidenceCard"] button').evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")))));
await p.waitForTimeout(300);
console.log("× close -> card", await p.locator('[data-component="RefEvidenceCard"]').count(), JSON.stringify(await focusInfo()));
// (b) backdrop click, drawer
await chip.click(); await p.waitForTimeout(300);
await p.mouse.click(300, 700); await p.waitForTimeout(400);
console.log("backdrop (drawer view) -> card", await p.locator('[data-component="RefEvidenceCard"]').count(), JSON.stringify(await focusInfo()));
// (c) Escape
await chip.click(); await p.waitForTimeout(300);
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
console.log("Esc -> card", await p.locator('[data-component="RefEvidenceCard"]').count(), JSON.stringify(await focusInfo()));
// (d) open a source record: card closes, preview opens?
await chip.click(); await p.waitForTimeout(300);
const rec = p.locator('[data-component="RefEvidenceCard"] [data-part=source] button').first();
const recName = (await rec.innerText()).trim();
await rec.click(); await p.waitForTimeout(1200);
console.log("source record click:", recName, "card", await p.locator('[data-component="RefEvidenceCard"]').count(), "slide-overs", await p.locator('[data-component="EntityPreviewSlideOver"]:not([inert])').evaluateAll(els=>els.map(e=>e.getAttribute("aria-label"))));
await p.screenshot({ path: "surf7-source-open.png" });
console.log(errs);
await b.close();
