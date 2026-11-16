import { launch, phonePickCollection, phoneOpen } from "./lib.mjs";
const T = "Sushila Karki sworn in as interim prime minister";
const { b, p, errs } = await launch({ w: 390, h: 844 });
const log = (...a) => console.log(...a);
const act = () => p.evaluate(() => { const a = document.activeElement; return (a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "").trim().slice(0, 50) + " in=" + (a?.closest('[role=dialog]')?.getAttribute("data-component") || a?.closest('[data-component=RefEvidenceCard]') ? "card" : "-"); });
try {
await phonePickCollection(p, /Nepal protests/);
await phoneOpen(p, T);
await p.getByRole("tab", { name: /^Relationships/ }).first().click();
await p.waitForTimeout(1000);
const ex = p.getByRole("button", { name: "Expand all" }).first();
if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(600); }
const chip = p.locator('[data-component="EvidenceStatus"]').nth(5);
await chip.scrollIntoViewIfNeeded();
// tap vs click
await chip.click(); await p.waitForTimeout(700);
log("click-open: active", await act());
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("  Esc after click-open -> card", await p.locator('[data-component="RefEvidenceCard"]').count());
if (await p.locator('[data-component="RefEvidenceCard"]').count()) {
  await p.getByRole("button", { name: /^Back to / }).first().click(); await p.waitForTimeout(500);
  log("  Back arrow -> card", await p.locator('[data-component="RefEvidenceCard"]').count(), "chip focused", await chip.evaluate(e => document.activeElement === e));
}
// keyboard open
await chip.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
log("kbd-open: active", await act());
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("  Esc after kbd-open -> card", await p.locator('[data-component="RefEvidenceCard"]').count());
} catch (e) { log("ERR", e.message.split("\n")[0]); }
log(errs);
await b.close();
