import { launch, state, setView, OUT } from "./lib2.mjs";
const sync = process.argv[2] === "on";
const { browser, page, logs } = await launch({ sync });
const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
await L.getByPlaceholder(/Search title/).fill("reparaciones"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500);
if (!sync) { await R.getByPlaceholder(/Search title/).fill("reparaciones"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500); }
await setView(page, "left", "Adv. Search"); await setView(page, "right", "Adv. Search"); await page.waitForTimeout(1500);
await L.getByRole("button", { name: /^Page 23, / }).first().click(); await page.waitForTimeout(3500);
await R.getByRole("button", { name: /^Page 120, / }).first().click(); await page.waitForTimeout(3500);
const ctr = () => page.evaluate(() => [...document.querySelectorAll('[data-library-pane]')].map(p => { const vis = p.innerText.match(/(\d+) \/ (\d+)\s*\n?\s*Previous/); const pg = p.innerText.match(/Previous\s*\n?\s*(\d+) \/ (\d+)/); return { hits: vis ? vis[1] + "/" + vis[2] : null, page: pg ? pg[1] + "/" + pg[2] : null }; }));
const show = async (l) => console.log(l.padEnd(46), JSON.stringify(await ctr()));
await show("start (L 23/34 R 120/177 expected)");
// focus left pane's document
const lb = await L.locator('[data-part=viewer], canvas').first().boundingBox();
await page.mouse.click(320, 500); await page.waitForTimeout(300);
await page.keyboard.press("F3"); await page.waitForTimeout(1200); await show("F3 with focus in left");
await page.keyboard.press("Meta+g"); await page.waitForTimeout(1200); await show("Meta+G with focus in left");
await page.keyboard.press("Control+g"); await page.waitForTimeout(1200); await show("Ctrl+G with focus in left");
await page.keyboard.press("Shift+F3"); await page.waitForTimeout(1200); await show("Shift+F3 with focus in left");
await page.mouse.click(1040, 500); await page.waitForTimeout(300);
await page.keyboard.press("F3"); await page.waitForTimeout(1200); await show("F3 with focus in right");
await page.keyboard.press("Meta+g"); await page.waitForTimeout(1200); await show("Meta+G with focus in right");
// focus on body (neither), pointer over left
await page.evaluate(() => document.activeElement?.blur()); await page.mouse.move(320, 500); await page.keyboard.press("F3"); await page.waitForTimeout(1200); await show("F3 focus on body, pointer over left");
await page.mouse.move(1040, 500); await page.keyboard.press("F3"); await page.waitForTimeout(1200); await show("F3 focus on body, pointer over right");
await page.screenshot({ path: OUT + `/two-docs-keys-sync-${sync ? "on" : "off"}.png` });
console.log(logs);
await browser.close();
