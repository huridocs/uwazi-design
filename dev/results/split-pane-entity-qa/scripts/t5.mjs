import { launch, state, OUT } from "./lib2.mjs";
const res = {};
for (const port of [1437, 1438]) for (const sync of [false, true]) for (const side of ["left", "right"]) {
  const { browser, page, logs } = await launch({ sync, port });
  const rail = sync ? page.locator('[data-component=LibraryRail]').first() : page.locator(`[data-library-pane=${side}] [data-component=LibraryRail]`);
  if (sync && side === "right") { await browser.close(); continue; }
  const out = {};
  for (const [item, n] of [["Filters", "Filters"], ["Results", "Results"], ["Views and history", "Views"]]) {
    await rail.getByRole("button", { name: item }).click(); await page.waitForTimeout(700);
    const open1 = (await state(page)).panels.length;
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    const after = (await state(page)).panels.length;
    // also with focus moved to body/click on panel title
    let after2 = null;
    if (after) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); after2 = (await state(page)).panels.length; }
    out[n] = `open=${open1} afterEsc=${after}${after ? " after2nd=" + after2 : ""}`;
    if (after || after2) { await rail.getByRole("button", { name: item }).click({ force: true }).catch(() => {}); await page.waitForTimeout(600); }
  }
  console.log(`port ${port} sync ${sync ? "ON " : "OFF"} ${side.padEnd(5)}`, JSON.stringify(out));
  await browser.close();
}
