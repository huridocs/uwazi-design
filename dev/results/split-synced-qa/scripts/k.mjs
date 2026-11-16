import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const { browser, page, logs } = await launch({ sync: true });
await page.goto(URL); await page.waitForTimeout(3000);
await page.getByRole("button", { name: /CEJIL/ }).first().click(); await page.waitForTimeout(400);
console.log(await page.evaluate(() => [...document.querySelectorAll('[role=option],[role=menuitem],[role=menuitemradio]')].map(b => b.textContent.trim().slice(0,30))));
await page.getByText(/Las Vegas/).first().click(); await page.waitForTimeout(5000);
const slot = () => page.evaluate(() => { const s = document.querySelector('[data-part=split-brush]'); const b = s?.getBoundingClientRect(); return { h: b && Math.round(b.height), brushes: document.querySelectorAll('[data-component=TimeBrush]').length, panes: [...document.querySelectorAll('[data-library-pane]')].map(p => Math.round(p.getBoundingClientRect().bottom)) }; });
console.log("both default views", JSON.stringify(await slot()));
const setView = async (side, name) => { await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^View: / }).click(); await page.waitForTimeout(300); const o = page.getByRole("option", { name: new RegExp("^" + name) }); if (!(await o.count())) { console.log("no option", name, await page.getByRole("option").allTextContents()); await page.keyboard.press("Escape"); return false; } await o.first().click(); await page.waitForTimeout(2500); return true; };
if (await setView("left", "Sync")) {
  console.log("left=Sync right=?", JSON.stringify(await slot()));
  await page.screenshot({ path: OUT + "/synced-vegas-left-sync.png" });
  if (await setView("right", "Sync")) { console.log("both Sync", JSON.stringify(await slot())); await page.screenshot({ path: OUT + "/synced-vegas-both-sync.png" }); }
  await setView("left", "Cards"); console.log("left=Cards right=Sync", JSON.stringify(await slot()));
}
console.log(logs.filter(l => !/atomFamily/.test(l)).slice(0, 8));
await browser.close();
