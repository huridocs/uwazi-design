import { launch, state, OUT } from "./lib2.mjs";
for (const sync of [false, true]) {
  const { browser, page, logs } = await launch({ sync }); page.setDefaultTimeout(10000);
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  for (const P of [L, R]) { await P.getByRole("button", { name: /^Open$/ }).first().click({ force: true }); await page.waitForTimeout(1200); await P.getByRole("tab", { name: /Relationships/ }).first().click(); await page.waitForTimeout(900); await P.getByRole("button", { name: /^Filters$/ }).first().click(); await page.waitForTimeout(900); }
  const open = () => page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getClientRects().length && d.dataset.state !== "closed" && !d.hasAttribute("inert") && getComputedStyle(d).visibility !== "hidden" && /Direction|Anchoring|Type/i.test(d.textContent)).map(d => d.closest('[data-library-pane]')?.dataset.libraryPane ?? "portal:" + Math.round(d.getBoundingClientRect().left)));
  console.log("sync", sync, "both filters panels:", JSON.stringify(await open()));
  await page.screenshot({ path: OUT + `/rel-filters-both-panes-sync-${sync ? "on" : "off"}.png` });
  // focus inside left panel, Escape
  await page.mouse.click(300, 400); await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  console.log("   Escape (focus left) →", JSON.stringify(await open()));
  await page.mouse.click(1100, 400); await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  console.log("   Escape (focus right) →", JSON.stringify(await open()));
  console.log(logs);
  await browser.close();
}
