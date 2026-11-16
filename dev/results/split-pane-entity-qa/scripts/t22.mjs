import { launch, state, OUT } from "./lib2.mjs";
const { browser, page } = await launch({ sync: false }); page.setDefaultTimeout(10000);
const L = page.locator('[data-library-pane=left]');
await L.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
const sep = page.locator('[aria-label="Resize panes"]'); await sep.focus();
const probe = () => page.evaluate(() => { const p = document.querySelector('[data-library-pane=left]'); const d = p.querySelector('[aria-label="Resize panel"]'); const w = Math.round(p.getBoundingClientRect().width); return { paneW: w, drawer: !!d && d.getClientRects().length > 0, drawerW: d ? Number(d.getAttribute("aria-valuenow")) : null, max: d ? Number(d.getAttribute("aria-valuemax")) : null, mainW: d ? Math.round(p.querySelector('[data-part=content]')?.getBoundingClientRect().width) : null }; });
const seen = [];
for (let i = 0; i < 14; i++) { const r = await probe(); seen.push(`${r.paneW}:${r.drawer ? "drawer " + r.drawerW + "/max" + r.max + " main " + r.mainW : "no drawer"}`); await page.keyboard.press("Shift+ArrowRight"); await page.waitForTimeout(250); }
console.log(seen.join("\n"));
await browser.close();
