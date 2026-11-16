import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const { browser, page, logs } = await launch({ sync: true });
await page.goto(URL); await page.waitForTimeout(3000);
const g0 = await page.evaluate(geo); console.log("start", JSON.stringify(g0));
// drag the divider
const sep = page.locator('[role=separator]');
const sb = await sep.boundingBox();
await page.mouse.move(sb.x + sb.width/2, 400); await page.mouse.down();
for (const x of [650, 600, 560, 520]) { await page.mouse.move(x, 400, { steps: 4 }); await page.waitForTimeout(80); const g = await page.evaluate(geo); console.log("drag", x, "sep", g.sep.cx, "rail", g.rails[0]?.cx); }
await page.mouse.up(); await page.waitForTimeout(300);
await page.screenshot({ path: OUT + "/synced-after-drag.png" });
let g = await page.evaluate(geo); console.log("after drag", g.sep.cx, g.rails[0].cx, g.sepNow);
// drag right
await page.mouse.move(g.sep.cx, 400); await page.mouse.down(); await page.mouse.move(900, 400, { steps: 8 }); let g2 = await page.evaluate(geo); console.log("drag->900", g2.sep.cx, g2.rails[0].cx); await page.mouse.up();
// keyboard
await sep.focus();
for (const k of ["ArrowLeft", "Shift+ArrowLeft", "Shift+ArrowLeft", "Shift+ArrowRight", "ArrowRight", "Home", "End"]) { await page.keyboard.press(k); await page.waitForTimeout(200); const gg = await page.evaluate(geo); console.log("key", k, "sep", gg.sep.cx, "rail", gg.rails[0]?.cx, gg.sepNow); }
await page.keyboard.press("Enter"); // nothing
await sep.dblclick(); await page.waitForTimeout(300); g = await page.evaluate(geo); console.log("dblclick reset", g.sep.cx, g.rails[0].cx);
console.log(logs.filter(l => !/atomFamily/.test(l)));
await browser.close();
