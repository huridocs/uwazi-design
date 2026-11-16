import { launch, state, sig, setView, other, OUT } from "./lib2.mjs";
const paths = {
  mapOpen: async (page, side) => { await setView(page, side, "Map"); await page.waitForTimeout(2000); const p = page.locator(`[data-library-pane=${side}]`); await p.locator('.leaflet-marker-icon').nth(0).click({ force: true }); await page.waitForTimeout(1200); await p.getByRole("button", { name: /^Open$/ }).first().click(); },
  mapRowPreview: async (page, side) => { await setView(page, side, "Map"); await page.waitForTimeout(2000); const p = page.locator(`[data-library-pane=${side}]`); await p.locator('.leaflet-marker-icon').nth(0).click({ force: true }); await page.waitForTimeout(1200); await page.getByText("Estados Unidos").first().click(); await page.waitForTimeout(900); await page.getByRole("button", { name: /View entity/ }).first().click(); },
  network: async (page, side) => { await setView(page, side, "Network"); await page.waitForTimeout(3500); const p = page.locator(`[data-library-pane=${side}]`); const n = await page.evaluate(() => window.__network.visible(3)); const box = await p.locator("canvas").first().boundingBox(); await page.mouse.click(n[0][1] + box.x, n[0][2] + box.y); await page.waitForTimeout(1200); console.log("   node", JSON.stringify(n[0]), "panels", JSON.stringify((await state(page)).panels)); await page.getByRole("button", { name: /View entity|Open entity/ }).first().click(); },
};
const only = process.argv[2];
for (const [name, fn] of Object.entries(paths)) { if (only && only !== name) continue; for (const sync of [false, true]) for (const side of ["left", "right"]) {
  const { browser, page, logs } = await launch({ sync });
  const before = await sig(page, other(side));
  try { await fn(page, side); } catch (e) { console.log(name, sync, side, "ERR", e.message.split("\n")[0]); }
  await page.waitForTimeout(2500);
  const st = await state(page); const after = await sig(page, other(side));
  console.log(name.padEnd(14), "sync", sync ? "ON " : "OFF", side.padEnd(5), JSON.stringify({ split: st.split, L: st.left?.entityOpen, R: st.right?.entityOpen, title: st[side]?.h?.slice(0, 28), otherSame: before.h === after.h, scrollX: st.scrollX }), logs.length ? logs : "");
  await browser.close();
} }
