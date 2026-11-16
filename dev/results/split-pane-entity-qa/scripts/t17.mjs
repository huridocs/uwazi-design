import { launch, state, OUT } from "./lib2.mjs";
for (const sync of [false, true]) {
  const { browser, page, logs } = await launch({ sync }); page.setDefaultTimeout(10000);
  const L = page.locator('[data-library-pane=left]'), R = page.locator('[data-library-pane=right]');
  await L.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1500);
  await L.getByRole("button", { name: /^Edit$/ }).first().click(); await page.waitForTimeout(1200);
  const desc = L.locator('textarea').nth(1);
  await L.locator('textarea').first().click(); await page.waitForTimeout(400);
  const armed = () => page.evaluate(() => [...document.querySelectorAll('[data-library-pane]')].map(p => p.querySelectorAll('[data-component=ListeningChip]').length));
  console.log(`sync ${sync ? "ON " : "OFF"}: chips after focusing Title in left:`, JSON.stringify(await armed()));
  await desc.click(); await page.keyboard.type("QA dirty edit"); await page.waitForTimeout(500);
  console.log("   chips after typing in Description:", JSON.stringify(await armed()));
  // Escape with focus in right pane
  await page.mouse.click(1100, 120); await page.waitForTimeout(300);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  console.log("   chips after Escape pressed in right pane (left should stay armed):", JSON.stringify(await armed()));
  // open in right pane while left dirty
  await R.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(1200);
  const dlg = await page.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter(d => d.getClientRects().length && d.dataset.state !== "closed").map(d => d.textContent.slice(0, 160)));
  const st = await state(page);
  console.log("   open in right while left dirty → dialog:", JSON.stringify(dlg), "R open:", st.right.entityOpen);
  await page.screenshot({ path: OUT + `/dirty-guard-sync-${sync ? "on" : "off"}.png` });
  if (dlg.length) {
    // cancel
    const cancel = page.getByRole("button", { name: /^(Cancel|Keep editing|Stay)/ }).last(); await cancel.click().catch(() => console.log("   no cancel btn"));
    await page.waitForTimeout(600);
    const st2 = await state(page); console.log("   after Cancel: R open:", st2.right.entityOpen, "left textarea keeps text:", await L.locator('textarea').nth(1).inputValue().catch(() => "n/a"), "left chips:", JSON.stringify(await armed()));
    // now proceed
    await R.getByRole("button", { name: /^Open$/ }).first().click(); await page.waitForTimeout(800);
    console.log("   buttons in dialog:", await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getClientRects().length && d.dataset.state !== "closed").flatMap(d => [...d.querySelectorAll('button')].map(b => b.textContent.trim()))));
    const go = page.getByRole("button", { name: /Discard|Leave|Continue|Don.t save/ }).last(); await go.click().catch(() => console.log("   no discard btn")); await page.waitForTimeout(1500);
    console.log("   left text after Discard:", await L.locator('textarea').nth(1).inputValue().catch(() => "n/a"), "| Cancel/Save visible in left:", await L.getByRole("button", { name: /^Cancel$/ }).count());
    await L.getByRole("button", { name: "Go back" }).click().catch(() => {}); await page.waitForTimeout(800);
    console.log("   left Back after Discard → dialog again?", await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter(d => d.getClientRects().length && d.dataset.state !== "closed").map(d => d.textContent.slice(0, 40))));
    const st3 = await state(page); console.log("   after Discard: L open", st3.left.entityOpen, "R open", st3.right.entityOpen, "left still editing:", await L.getByRole("button", { name: /^Save$/ }).count());
  }
  console.log(logs);
  await browser.close();
}
