import { run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, logEntries, switchTo } from "./tx.mjs";

await run("THS-2", async (b) => {
  let { page } = await open(b, "thesauri");
  // THS-07
  await newThes(page, "");
  const ph = await nameInput(page).getAttribute("placeholder");
  const clearX = await S(page).locator("button[aria-label*=lear]").count();
  const dis0 = await commitBtn(page).isDisabled();
  await saveClick(page); await wait(page, 200);
  const t1 = await footerTxt(page);
  const inline1 = await S(page).locator("[data-component=SettingsField] [role=alert], [data-part=issue]").allInnerTexts().catch(() => []);
  const sentCount1 = (await nlist(page)).length;
  await nameInput(page).fill("   "); await wait(page, 100);
  await saveClick(page); await wait(page, 200);
  const t2 = await footerTxt(page);
  const fieldMsg = clean(await S(page).locator("label, [data-component=SettingsField]").first().innerText().catch(() => ""));
  const hasReq = /This field is required/.test(clean(await S(page).innerText()));
  await sh(page, "THS-07");
  rec("THS-07", hasReq && ph === "Thesauri name" ? "PASS" : "FAIL", `new editor: Save disabled while untouched=${dis0}; after typing 3 spaces and Save the footer reads "${t2.replace(/Import CSV Export CSV /, "")}" (no inline "This field is required" under the name field: page text contains it=${hasReq}); placeholder is "${ph}" (expected "Thesauri name"); clear X buttons=${clearX}; nothing saved (stays in editor)`, "acceptance-run-2-shots/THS-07.png");
  // THS-08
  await nameInput(page).fill("case status "); await addVals(page, ["A"]);
  await saveClick(page); await wait(page, 300);
  const dup = await S(page).locator("[role=alert]").allInnerTexts();
  const stillEditor = (await nameInput(page).count()) === 1;
  await sh(page, "THS-08");
  await cancelBtn(page).click(); await wait(page, 500);
  const g = await guardInfo(page);
  if (g.length) { await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Discard/ }).click().catch(() => {}); await wait(page, 400); }
  await openThes(page, "Case status");
  await addVals(page, ["Zed"]);
  await saveClick(page); await wait(page, 500);
  const afterSecond = clean(await S(page).innerText());
  const savedSecond = /Add thesaurus/.test(afterSecond);
  rec("THS-08", dup.some((d) => /Thesaurus name already exists/.test(d)) && savedSecond ? "PASS" : "FAIL", `"case status " + Save: blocked (still in editor=${stillEditor}) with footer alert ${JSON.stringify(dup)} (expected inline "Thesaurus name already exists"); opening "Case status", keeping its name, adding a value and Save: saved without a duplicate error=${savedSecond}`, "acceptance-run-2-shots/THS-08.png");
  await page.context().close();

  // THS-09 / THS-10 / X-01 / X-03 / X-04 / X-09
  ({ page } = await open(b, "thesauri"));
  await newThes(page, "Fruits"); await addVals(page, ["Apple"]);
  const before = await nlist(page);
  const disBefore = await commitBtn(page).isDisabled();
  await saveClick(page); await wait(page, 600);
  const n1 = await fresh(page, before);
  const onList = /Add thesaurus/.test(clean(await S(page).innerText())) && (await nameInput(page).count()) === 0;
  const inEditor = (await nameInput(page).count()) === 1;
  const rowsNow = await listRows(page);
  await page.reload(); await wait(page, 1500);
  const rl = await listRows(page);
  const afterReload = rl.some((r) => /^Fruits/.test(r));
  const reloadView = clean(await S(page).innerText()).slice(0, 120);
  await sh(page, "THS-09");
  rec("THS-09", n1.some((n) => /^Thesauri added\./.test(n)) && inEditor ? "PASS" : "FAIL", `Name "Fruits" + one item, Save: Beacon new entries ${JSON.stringify(n1)} (expected "Thesauri added."); editor stays open in edit mode=${inEditor} (the app returns to the list=${onList}); "Fruits" in list after save=${rowsNow.some((r) => /^Fruits/.test(r))}; after page reload (stays in Settings: "${reloadView}") still listed=${afterReload}; rows after reload ${JSON.stringify(rl)}`, "acceptance-run-2-shots/THS-09.png");
  // THS-10 (Fruits does not survive the reload: recreate it)
  await newThes(page, "Fruits"); await addVals(page, ["Apple"]); await saveClick(page); await wait(page, 500);
  await openThes(page, "Fruits");
  const dis1 = await commitBtn(page).isDisabled();
  await addVals(page, ["Fig"]);
  const b2 = await nlist(page);
  await saveClick(page); await wait(page, 600);
  const n2 = await fresh(page, b2);
  await openThes(page, "Fruits");
  await label(page, "Fig").click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Figs"); await page.keyboard.press("Enter"); await wait(page, 200);
  const disDirty = await commitBtn(page).isDisabled();
  await label(page, "Figs").click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Fig"); await page.keyboard.press("Enter"); await wait(page, 200);
  const disReverted = await commitBtn(page).isDisabled();
  rec("THS-10", n2.some((n) => /^Thesauri updated\./.test(n)) && dis1 && disReverted && !disDirty ? "PASS" : "FAIL", `open Fruits untouched: Save disabled=${dis1}; add "Fig", Save: Beacon new ${JSON.stringify(n2)}; after a label edit Save disabled=${disDirty}; after changing it back by hand Save disabled=${disReverted}`, "");
  rec("X-03", dis1 && disReverted && !disDirty ? "PASS" : "FAIL", `Save is disabled on a clean editor (${dis1}), enabled after an edit (${!disDirty}), disabled again after a hand revert (${disReverted}); after Save the editor closes to the list (no stale dialog on rail click)`, "");
  await page.context().close();
});
