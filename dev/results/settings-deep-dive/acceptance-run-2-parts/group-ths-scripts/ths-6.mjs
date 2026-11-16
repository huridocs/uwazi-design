import { run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, goLibrary, caseCard, openCaseEdit, dialogText, rowDelete, guardBtn } from "./tx.mjs";

await run("THS-6", async (b) => {
  // THS-21: remove a used value
  let { page } = await open(b, "thesauri");
  await openThes(page, "Case status");
  const v0 = await vrows(page);
  await tick(page, "Decided");
  const b0 = await nlist(page);
  await S(page).locator("footer").getByRole("button", { name: /Remove/ }).click(); await wait(page, 400);
  const dl = await dialogs(page); const dt = await dialogText(page);
  const nn = await fresh(page, b0);
  await sh(page, "THS-21");
  rec("THS-21", dl.length > 0 && /Changes in the thesaurus will impact all the entities using these values\./.test(dt) && /Used by \d+ entities/.test(dt) ? "PASS" : "FAIL", `Case status, tick the used value "Decided", Remove: dialogs opened ${JSON.stringify(dl)} (expected a confirm with "Changes in the thesaurus will impact all the entities using these values." and "Used by 3 entities"); the value left the draft at once (rows ${JSON.stringify(await vrows(page))}); Beacon new entry ${JSON.stringify(nn)}`, "acceptance-run-2-shots/THS-21.png");
  await page.context().close();

  // THS-23: remove Decided, Save
  ({ page } = await open(b, "thesauri"));
  await goLibrary(page); const c0 = await caseCard(page);
  await toSettings(page, "Thesauri");
  await openThes(page, "Case status");
  await tick(page, "Decided");
  await S(page).locator("footer").getByRole("button", { name: /Remove/ }).click(); await wait(page, 300);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Accept|Remove|Confirm/ }).click({ timeout: 1500 }).catch(() => {});
  const b1 = await nlist(page);
  await saveClick(page); await wait(page, 700);
  const n1 = await fresh(page, b1);
  await goLibrary(page); const c1 = await caseCard(page);
  await toSettings(page, "Thesauri"); await openThes(page, "Case status");
  const vrm = await vrows(page);
  await sh(page, "THS-23");
  rec("THS-23", /^Thesauri updated\./.test(n1[0] || "") && /\d+ entit/.test(n1.join(" ")) && c1 && !/Decided/.test(c1) ? "PASS" : "FAIL", `Case 10.488 card before: "${(c0 || "").slice(0, 150)}"; removed "Decided", Save: Beacon new ${JSON.stringify(n1)} (expected "Thesauri updated." plus how many entities were updated); card after: "${(c1 || "").slice(0, 150)}" (still shows "Decided"=${/Decided/.test(c1 || "")}); thesaurus values now ${JSON.stringify(vrm)}`, "acceptance-run-2-shots/THS-23.png");
  await page.context().close();

  // THS-24: rename
  ({ page } = await open(b, "thesauri"));
  await openThes(page, "Case status");
  await label(page, "Decided").click(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type("Resolved"); await page.keyboard.press("Enter"); await wait(page, 200);
  const b2 = await nlist(page);
  await saveClick(page); await wait(page, 700);
  const n2 = await fresh(page, b2);
  await goLibrary(page); const c2 = await caseCard(page);
  await openCaseEdit(page);
  const form = clean(await page.locator("body").innerText());
  const picker = /Resolved/.test(form) && !/Decided/.test(form);
  await sh(page, "THS-24");
  rec("THS-24", /re-?labell?ed|\d+ entit/i.test(n2.join(" ")) && /Resolved/.test(c2 || "") && picker ? "PASS" : "FAIL", `renamed value "Decided" to "Resolved", Save: Beacon new ${JSON.stringify(n2)} (expected a count of re-labelled entities); Case 10.488 card now "${(c2 || "").slice(0, 160)}" (shows "Resolved"=${/Resolved/.test(c2 || "")}); its edit form lists "Resolved"=${/Resolved/.test(form)}, still lists "Decided"=${/Decided/.test(form)}`, "acceptance-run-2-shots/THS-24.png");
  await page.context().close();

  // THS-25: new value in picker
  ({ page } = await open(b, "thesauri"));
  await openThes(page, "Case status");
  await addVals(page, ["Pending review"]);
  await saveClick(page); await wait(page, 700);
  await goLibrary(page);
  await openCaseEdit(page);
  const form2 = clean(await page.locator("body").innerText());
  const has = /Pending review/.test(form2);
  await sh(page, "THS-25");
  let saved = "not attempted";
  if (has) {
    await page.getByRole("radio", { name: "Pending review" }).check(); await wait(page, 300);
    await page.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(page, 1200);
    const after = clean(await page.locator("body").innerText());
    saved = `after picking it and saving the entity the record page shows "Pending review"=${/Pending review/.test(after)}`;
    saved += /Pending review/.test(after) ? "" : ` (page text starts "${after.slice(0, 80)}")`;
  }
  rec("THS-25", has && /Pending review"=true/.test(saved) ? "PASS" : "FAIL", `added "Pending review" to Case status, saved the thesaurus, opened Case 10.488 edit form without reloading: picker lists it=${has}; ${saved}`, "acceptance-run-2-shots/THS-25.png");
  await page.context().close();
});
