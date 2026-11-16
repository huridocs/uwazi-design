import { launch, state, OUT } from "./lib2.mjs";
for (const sync of [false, true]) {
  const { browser, page, logs } = await launch({ sync });
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  await L.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  await R.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  let st = await state(page); console.log("sync", sync, "both open:", st.left.entityOpen, st.right.entityOpen);
  await page.getByRole("button", { name: /CEJIL/ }).first().click(); await page.waitForTimeout(400);
  await page.getByText(/Nepal protests/).first().click(); await page.waitForTimeout(5000);
  st = await state(page); console.log("   after switch to Nepal:", JSON.stringify({ L: st.left?.entityOpen, R: st.right?.entityOpen, split: st.split }), "text:", await page.evaluate(() => document.body.innerText.match(/[\d,]+ entities/)?.[0]));
  await page.screenshot({ path: OUT + `/collection-switch-sync-${sync ? "on" : "off"}.png` });
  // reopen in Nepal to be sure panes still function
  await L.getByRole("button", { name: /^Open$/ }).first().click().catch(() => {}); await page.waitForTimeout(1500);
  st = await state(page); console.log("   open in Nepal left:", st.left?.entityOpen, "title:", st.left?.h, "R:", st.right?.entityOpen);
  console.log(logs);
  await browser.close();
}
