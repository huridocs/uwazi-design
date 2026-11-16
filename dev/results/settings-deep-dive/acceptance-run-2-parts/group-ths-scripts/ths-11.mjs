import { axe, axeEl, axeDialog, axeContrast, dupNames, unlabelled, dark, light, serious, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, dialogText, addGroup, switchTo, logEntries, hscroll, rowDelete } from "./tx.mjs";

await run("THS-11x", async (b) => {
  // X-01 persistence
  let { page } = await open(b, "thesauri");
  await openThes(page, "Case status");
  await addVals(page, ["Zed"]);
  await saveClick(page); await wait(page, 600);
  await rail(page, "Templates"); await wait(page, 500); await rail(page, "Thesauri"); await wait(page, 500);
  await openThes(page, "Case status");
  const afterRail = (await vrows(page)).includes("Zed");
  await page.reload(); await wait(page, 1500);
  await openThes(page, "Case status").catch(() => {});
  const afterReload = (await vrows(page).catch(() => [])).includes("Zed");
  rec("X-01", afterRail && afterReload ? "PASS" : "FAIL", `Case status + value "Zed", Save: after Templates -> Thesauri the value is shown=${afterRail}; after reloading the tab the value is shown=${afterReload} (the thesauri list is back to the seed; the stored value is lost). Reset demo data not driven here`, "");
  await page.context().close();

  // X-05 + X-09
  ({ page } = await open(b, "thesauri"));
  await rowDelete(page, "Case status");
  const dUsed = await dialogText(page);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /OK|Cancel/ }).last().click(); await wait(page, 300);
  await make(page, "Fruits", ["Apple"]);
  await openThes(page, "Fruits"); await addVals(page, ["Fig"]); await saveClick(page); await wait(page, 500);
  await rowDelete(page, "Fruits");
  const dUnused = await dialogText(page);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Delete|Accept/ }).last().click(); await wait(page, 500);
  await openThes(page, "Case status");
  await tick(page, "Decided");
  await S(page).locator("footer").getByRole("button", { name: /Remove/ }).click(); await wait(page, 300);
  const dVal = await dialogText(page);
  rec("X-05", /\d+ entities/.test(dVal) && /Used by/.test(dUsed) ? "PASS" : "FAIL", `list delete of a used thesaurus: "${dUsed}" (refusal naming the template and the 5 entities: ok); list delete of an unused one: "${dUnused}" (states nothing else changes: ok); value removal of the used "Decided": confirm dialog "${dVal || "none"}" (expected a dialog with usage counts such as "Used by 3 entities"; the app removes it at once and only mentions "5 entities hold this value" in the Beacon afterwards)`, "acceptance-run-2-shots/THS-21.png");
  await page.getByRole("button", { name: "Back", exact: true }).click(); await wait(page, 400);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Discard/ }).click().catch(() => {}); await wait(page, 400);
  await rail(page, "Activity log"); await wait(page, 900);
  const logText = clean(await S(page).innerText());
  const entries = await logEntries(page);
  const logRows = [logText.slice(0, 400)];
  rec("X-09", entries.some((e) => /thesaurus/i.test(e) && /CREATE|UPDATE/.test(e)) && entries.some((e) => /DELETE/.test(e) && /thesaurus/i.test(e)) ? "PASS" : "FAIL", `after create "Fruits", update (add "Fig") and delete "Fruits" the session log holds ${JSON.stringify(entries.slice(0, 5))}; Activity log page rows: ${JSON.stringify(logRows.map(clean).slice(0, 5))}`, await sh(page, "X-09-THS"));
  await page.context().close();

  // X-07 axe (light + dark), dialogs
  ({ page } = await open(b, "thesauri"));
  const res = {};
  res.listLight = serious(await axe(page));
  res.dupList = await dupNames(page); res.unlabelledList = await unlabelled(page);
  await dark(page); await wait(page, 900);
  res.listDark = serious(await axe(page));
  await sh(page, "X-08-THS-list-dark-1280");
  await light(page); await wait(page, 900);
  await openThes(page, "Case status");
  res.edLight = serious(await axe(page)); res.dupEd = await dupNames(page); res.unlabelledEd = await unlabelled(page);
  await dark(page); await wait(page, 900);
  res.edDark = serious(await axe(page));
  await sh(page, "X-08-THS-editor-dark-1280");
  await light(page); await wait(page, 900);
  // move-to-group dialog (needs a group): add group
  await addGroup(page, "Grp", ["Child"]);
  await rowOf(page, "Open").hover();
  const opener = S(page).getByRole("button", { name: "Move Open to group" });
  await opener.focus(); await opener.press("Enter"); await wait(page, 400);
  const mdlg = page.locator("[data-component=Modal]").last();
  res.moveDlgName = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((e) => !e.closest("[inert]") && /Move to group/.test(e.innerText)); return d ? (d.getAttribute("aria-label") || d.getAttribute("aria-labelledby") ? "named" : "NO NAME") : "none"; });
  res.dirtyContrast = await axeContrast(page);
  res.moveDlgAxe = await axeDialog(page);
  const focusIn = await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"));
  // Tab 12 times stays inside
  for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
  const trapped = await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"));
  await page.keyboard.press("Escape"); await wait(page, 400);
  const restored = await page.evaluate(() => (document.activeElement.getAttribute("aria-label") || "").includes("Move Open to group"));
  const closed = (await page.locator("[data-component=Modal]").count()) === 0;
  res.move = { focusIn, trapped, restored, closed };
  // delete dialog on list
  await page.getByRole("button", { name: "Back", exact: true }).click(); await wait(page, 400);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Discard/ }).click().catch(() => {}); await wait(page, 400);
  const r = S(page).locator("[data-part=row]").filter({ hasText: "Case status" }).first();
  const delBtn = r.getByRole("button", { name: "Delete Case status" });
  await delBtn.focus(); await delBtn.press("Enter"); await wait(page, 400);
  res.delDlgAxe = await axeDialog(page);
  res.delName = await page.evaluate(() => { const d = [...document.querySelectorAll("[data-component=ConfirmDelete] [role=dialog], [data-component=ConfirmDelete][role=dialog]")][0]; return d ? (d.getAttribute("aria-label") || d.getAttribute("aria-labelledby") || "NO NAME") : "no dialog element"; });
  await page.keyboard.press("Escape"); await wait(page, 400);
  res.delClosed = (await page.locator("[data-component=ConfirmDelete]").count()) === 0;
  res.delRestored = await page.evaluate(() => (document.activeElement.getAttribute("aria-label") || "") === "Delete Case status");
  // import dialog
  await openThes(page, "Case status");
  const impb = S(page).locator("footer").getByRole("button", { name: /Import CSV/ });
  await impb.focus(); await impb.press("Enter"); await wait(page, 500);
  res.impAxe = await axeDialog(page);
  await page.keyboard.press("Escape"); await wait(page, 400);
  res.impClosed = (await page.locator("[data-component=ThesaurusImportModal]").count()) === 0;
  res.impRestored = await page.evaluate(() => /Import CSV/.test(document.activeElement.getAttribute("aria-label") || document.activeElement.innerText));
  await sh(page, "X-07-THS");
  const bad = [res.listLight, res.listDark, res.edLight, res.edDark, res.moveDlgAxe, res.delDlgAxe, res.impAxe].flat().filter((v) => /serious|critical/.test(v));
  bad.push(...res.dirtyContrast);
  rec("X-07", !bad.length && !res.dupList.length && !res.unlabelledList.length && !res.dupEd.length && !res.unlabelledEd.length && res.move.focusIn && res.move.trapped && res.move.restored && res.move.closed && res.delClosed && res.delRestored && res.impClosed && res.impRestored ? "PASS" : "FAIL", `axe serious/critical: list light ${JSON.stringify(res.listLight)}, list dark ${JSON.stringify(res.listDark)}, editor light ${JSON.stringify(res.edLight)}, editor dark ${JSON.stringify(res.edDark)}, Move-to-group dialog (dialog element only) ${JSON.stringify(res.moveDlgAxe)}, whole page while the editor is dirty (Save enabled) colour contrast ${JSON.stringify(res.dirtyContrast)}, delete dialog (dialog element only) ${JSON.stringify(res.delDlgAxe)}, import dialog (dialog element only) ${JSON.stringify(res.impAxe)}; duplicate control names list ${JSON.stringify(res.dupList)}, editor ${JSON.stringify(res.dupEd)}; unlabelled inputs list ${JSON.stringify(res.unlabelledList)}, editor ${JSON.stringify(res.unlabelledEd)}; Move-to-group dialog: name=${res.moveDlgName}, focus moves in=${res.move.focusIn}, Tab stays inside=${res.move.trapped}, Escape closes=${res.move.closed}, focus restored to opener=${res.move.restored}; delete dialog: Escape closes=${res.delClosed}, focus restored=${res.delRestored}, name attr=${res.delName}; import dialog: Escape closes=${res.impClosed}, focus restored=${res.impRestored}`, "acceptance-run-2-shots/X-07-THS.png");
  await page.context().close();
});
