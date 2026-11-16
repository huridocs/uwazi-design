import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const { browser, page, logs } = await launch({ sync: true });
await page.goto(URL); await page.waitForTimeout(3000);
const btns = await page.evaluate(() => [...document.querySelectorAll('[data-component=LibraryRail] button')].map(b => b.getAttribute('aria-label') || b.title || b.textContent));
console.log("rail buttons", btns);
const rail = page.locator('[data-component=LibraryRail]');
for (const name of btns) {
  const btn = rail.locator('button').nth(btns.indexOf(name));
  await btn.click(); await page.waitForTimeout(600);
  let g = await page.evaluate(geo);
  console.log(name, "→ panels", JSON.stringify(g.panels), "sep", g.sep.cx, "focusInPanel", g.activeInPanel, "active:", g.active);
  if (name === "Filters" || btns.indexOf(name) === 0) await page.screenshot({ path: OUT + "/synced-filters-panel.png" });
  // tab trap: 40 tabs, all stay inside
  let outside = 0;
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); const inP = await page.evaluate(() => { const p = document.querySelector('[role=dialog][data-state=open]'); return p?.contains(document.activeElement); }); if (!inP) outside++; }
  for (let i = 0; i < 10; i++) { await page.keyboard.press("Shift+Tab"); const inP = await page.evaluate(() => { const p = document.querySelector('[role=dialog][data-state=open]'); return p?.contains(document.activeElement); }); if (!inP) outside++; }
  console.log("  tab escapes:", outside);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  g = await page.evaluate(geo); console.log("  after Esc panels", g.panels.length, "active", g.active);
}
console.log(logs.filter(l => !/atomFamily/.test(l)));
await browser.close();
