import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const mode = process.argv[2]; // dark | rtl | darkrtl
const { browser, page, logs } = await launch({ sync: true, dark: mode.includes("dark") });
await page.goto(URL); await page.waitForTimeout(3000);
if (mode.includes("rtl")) {
  await page.locator('[data-library-pane=left]').getByText("EN", { exact: true }).first().click(); await page.waitForTimeout(400);
  await page.getByText("AR", { exact: true }).first().click();
  await page.waitForTimeout(2000);
}
const info = await page.evaluate(() => ({ dir: document.documentElement.dir, dark: document.documentElement.classList.contains("dark") }));
console.log(mode, JSON.stringify(info));
let g = await page.evaluate(geo); console.log("rails", JSON.stringify(g.rails), "sep", g.sep.cx, "brushes", g.brushes);
const rail = page.locator('[data-component=LibraryRail]');
await rail.locator("button").first().click(); await page.waitForTimeout(700);
g = await page.evaluate(geo); console.log("filters", JSON.stringify(g.panels), "sep", g.sep.cx, "trap", g.activeInPanel);
await page.screenshot({ path: OUT + `/synced-${mode}-filters.png` });
await page.keyboard.press("Escape"); await page.waitForTimeout(400);
// drag in rtl
const sb = await page.locator('[role=separator]').boundingBox();
await page.mouse.move(sb.x + sb.width/2, 400); await page.mouse.down(); await page.mouse.move(sb.x + sb.width/2 - 150, 400, { steps: 6 }); g = await page.evaluate(geo); console.log("drag -150: sep", g.sep.cx, "rail", g.rails[0].cx); await page.mouse.up();
await page.locator('[role=separator]').focus(); await page.keyboard.press("Shift+ArrowLeft"); await page.waitForTimeout(200); let g2 = await page.evaluate(geo); console.log("Shift+Left: sep", g2.sep.cx, "rail", g2.rails[0].cx);
await rail.locator("button").nth(3).click(); await page.waitForTimeout(700); g = await page.evaluate(geo); console.log("views panel", JSON.stringify(g.panels), "sep", g.sep.cx);
await page.screenshot({ path: OUT + `/synced-${mode}-views-dragged.png` });
console.log(logs.filter(l => !/atomFamily/.test(l)));
await browser.close();
