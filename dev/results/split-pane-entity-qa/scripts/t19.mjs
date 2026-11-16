import { launch, state, OUT } from "./lib2.mjs";
for (const sync of [false, true]) {
  const { browser, page, logs } = await launch({ sync }); page.setDefaultTimeout(10000);
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  await L.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  await R.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Settings" }).click(); await page.getByRole("button", { name: /System settings/ }).first().click(); await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Reset demo data" }).click(); await page.waitForTimeout(800);
  const dlg = await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getClientRects().length && d.dataset.state !== "closed").map(d => d.textContent.slice(0, 120) + "|" + [...d.querySelectorAll("button")].map(b => b.textContent.trim()).join("/")));
  console.log("sync", sync, "dialog:", JSON.stringify(dlg));
  const confirm = page.getByRole("button", { name: /^Reset( demo data)?$/ }).last(); await confirm.click().catch(() => console.log("no confirm")); await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /^Library/ }).first().click(); await page.waitForTimeout(2500);
  const st = await state(page); console.log("   back to Library after reset:", JSON.stringify({ split: st.split, L: st.left?.entityOpen, R: st.right?.entityOpen, panes: !!st.left }));
  await page.screenshot({ path: OUT + `/after-reset-sync-${sync ? "on" : "off"}.png` });
  // does opening work afterwards
  if (st.left) { await L.getByRole("button", { name: /^Open$/ }).first().click({ trial: false }).catch(() => {}); await page.waitForTimeout(1200); const s2 = await state(page); console.log("   open after reset: L", s2.left?.entityOpen, "R", s2.right?.entityOpen); }
  console.log(logs);
  await browser.close();
}
