import { launch, URL, OUT } from "./lib.mjs";
import { geo } from "./common.mjs";
const { browser, page, logs } = await launch({ sync: true });
await page.goto(URL); await page.waitForTimeout(3000);
const rail = () => page.locator('[data-component=LibraryRail]');
const G = async (l) => { await page.waitForTimeout(700); const g = await page.evaluate(geo); console.log(l.padEnd(40), "rails", g.rails.length, "panels", JSON.stringify(g.panels.map(p => p.title?.slice(0,20) + "@" + p.cx)), "sep", g.sep?.cx, "brush", g.brushes); return g; };
// 1 divider hit-test with panel open
await rail().getByRole("button", { name: "Filters" }).click(); await G("Filters open");
console.log("elementFromPoint at divider y=100/200/289/747:", await page.evaluate(() => [100, 200, 289, 747].map(y => { const e = document.elementFromPoint(720, y); return (e?.getAttribute('role') || e?.tagName) + (e?.closest('[data-component=LibraryRail]') ? '(rail)' : e?.closest('[role=dialog]') ? '(panel)' : ''); })));
const sep = await page.locator('[role=separator]').boundingBox();
await page.mouse.move(720, 100); await page.mouse.down(); await page.mouse.move(560, 100, { steps: 6 }); let g = await G("dragging at y=100, panel open"); await page.mouse.up(); g = await G("after drag, panel open");
await page.screenshot({ path: OUT + "/synced-filters-dragged.png" });
// 2 toggle sync off with panel open
await page.getByText("Sync filters").click(); g = await G("sync OFF with Filters open");
await page.screenshot({ path: OUT + "/toggle-off-with-panel.png" });
await page.getByText("Sync filters").click(); g = await G("sync ON again");
// 3 rapid clicks
const f = rail().getByRole("button", { name: "Filters" });
for (let i = 0; i < 9; i++) await f.click({ delay: 0 });
g = await G("9 rapid Filters clicks (odd → open)");
const v = rail().getByRole("button", { name: "Views and history" }); const r = rail().getByRole("button", { name: "Results" });
for (let i = 0; i < 6; i++) { await v.click(); await r.click(); }
g = await G("12 rapid Views/Results alternations");
await page.keyboard.press("Escape"); g = await G("Esc");
// close button
await f.click(); await page.waitForTimeout(500); await page.getByRole("button", { name: "Close Filters" }).click(); g = await G("X close"); console.log("focus after X:", g.active);
// 4 1024 wide
await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(800);
await f.click(); g = await G("1024: Filters"); console.log(JSON.stringify(g.panels), JSON.stringify(g.rails));
await page.screenshot({ path: OUT + "/synced-1024-filters.png" });
await page.keyboard.press("Escape");
// back to unsynced via toggle w/o panel
await page.getByText("Sync filters").click(); g = await G("sync OFF 1024");
console.log(logs.filter(l => !/atomFamily/.test(l)).slice(0, 8));
await browser.close();
