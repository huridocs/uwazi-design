import { launch, state, OUT } from "./lib2.mjs";
const port = Number(process.argv[2]);
const owners = (page) => page.evaluate(() => [...document.querySelectorAll('[role=dialog][data-state=open]')].map(d => (d.closest('[data-library-pane]')?.dataset.libraryPane || d.dataset.libraryPaneOwner || "?") + ":" + (d.getAttribute('aria-label') || d.textContent.slice(0, 14))));
const focusIn = (page) => page.evaluate(() => { const a = document.activeElement; return a?.closest('[data-library-pane]')?.dataset.libraryPane + ":" + (a?.getAttribute("aria-label") || a?.tagName); });
for (const sync of [false]) {
  const { browser, page } = await launch({ sync, port });
  const rail = (side) => page.locator(`[data-library-pane=${side}] [data-component=LibraryRail]`);
  await rail("left").getByRole("button", { name: "Filters" }).click(); await page.waitForTimeout(600);
  await page.mouse.click(1200, 240); await page.waitForTimeout(900); // right card -> preview in right pane
  console.log("both open:", JSON.stringify(await owners(page)), "focus", await focusIn(page));
  // click inside left panel (title text) to focus it
  const left = page.locator('[data-library-pane=left] [role=dialog][data-state=open]'); await left.getByText("Template").first().click({ force: true }); await page.waitForTimeout(300);
  console.log("after clicking inside left Filters panel: focus", await focusIn(page));
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  console.log("after Esc (focus in left panel):", JSON.stringify(await owners(page)));
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  console.log("after 2nd Esc:", JSON.stringify(await owners(page)));
  await page.screenshot({ path: OUT + "/escape-stuck-" + port + ".png" });
  await browser.close();
}
