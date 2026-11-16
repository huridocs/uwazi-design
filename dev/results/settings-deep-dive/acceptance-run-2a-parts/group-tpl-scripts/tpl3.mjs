import { watch, launch, open, S, rows, wait, shot, init, rec, realErrors, names, rowsData, goLibrary, libTypeFacet, toSettingsItem, axe, notifTitles, addTemplate, openRow, addRelProp, activityRows, beaconTexts, tooltipText, tickRow, devArm, devReturn, devEmpty, DIR } from "./common.mjs";
init("tpl3");
const b = await launch();
const dlgText = (p) => p.locator("[data-component=ConfirmDelete]").innerText().then((t) => t.replace(/\s+/g, " ").trim());
const hasTpl = async (p, n) => (await names(p)).includes(n);
const selSlot = (p) => S(p).locator("footer").innerText().then((t) => t.replace(/\s+/g, " "));
const runningTasks = (p) => p.evaluate(() => [...document.querySelectorAll("article")].filter((a) => /Running/.test(a.innerText)).length);

{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  for (const n of ["QA Unused A", "QA Unused B", "QA Target", "QA Via"]) await addTemplate(page, n);
  await openRow(page, "QA Via"); await addRelProp(page, "Via to Target", "QA Target");
  await openRow(page, "Court Case"); await addRelProp(page, "Related QA", "QA Target");
  await openRow(page, "Court Case"); await addRelProp(page, "Through Via", "QA Via", "Via to Target");
  await wait(page, 300); mon.skip();
  // TPL-17
  await tickRow(page, "QA Unused A");
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 400);
  const d1 = await dlgText(page);
  const diag = await page.evaluate(() => { const d = document.querySelector("[data-component=ConfirmDelete] [role=dialog]"); return d ? { name: d.getAttribute("aria-label") || d.querySelector("h2,h3")?.textContent, buttons: [...d.querySelectorAll("button")].map((x) => (x.getAttribute("aria-label") || x.innerText).trim()) } : null; });
  await shot(page, "TPL-17");
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const afterCancel = await selSlot(page);
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 300);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Close" }).click(); await wait(page, 300);
  const afterX = await selSlot(page);
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 300);
  await page.keyboard.press("Escape"); await wait(page, 300);
  const afterEsc = { slot: await selSlot(page), dialogOpen: await page.locator("[data-component=ConfirmDelete]").count(), onList: (await S(page).locator("h2").first().innerText()) };
  const t17 = /Delete/.test(d1) && d1.includes("Do you want to delete the following items?") && d1.includes("QA Unused A") && diag && diag.buttons.includes("Cancel") && diag.buttons.includes("Delete") && /Selected 1 of/.test(afterCancel) && /Selected 1 of/.test(afterX) && /Selected 1 of/.test(afterEsc.slot) && afterEsc.dialogOpen === 0 && afterEsc.onList === "Templates";
  rec("TPL-17", t17 ? "PASS" : "FAIL", `dialog "${d1}"; dialog name/buttons ${JSON.stringify(diag)}; selection after Cancel "${afterCancel}", after X "${afterX}", after Escape "${afterEsc.slot}" (dialog open ${afterEsc.dialogOpen}, page still ${afterEsc.onList})`, "TPL-17");
  await S(page).getByRole("button", { name: /Clear/ }).click(); await wait(page, 200);

  // TPL-18: impact before delete. Baseline: Library facet offers QA Target
  await goLibrary(page); const facBefore = (await libTypeFacet(page)).map((f) => f.name);
  await toSettingsItem(page, "Templates");
  await tickRow(page, "QA Target");
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 400);
  const d18 = await dlgText(page);
  await shot(page, "TPL-18");
  const hasProp = /Court Case[^.]*“Related QA”/.test(d18); const hasFilter = /Filters[^.]*QA Target/.test(d18);
  const hasInherit = /inherit|Through Via/i.test(d18);
  const viaProp = /QA Via[^.]*“Via to Target”/.test(d18);
  rec("TPL-18", hasProp && viaProp && hasFilter && hasInherit ? "PASS" : "FAIL", `QA Target is pointed to by Court Case "Related QA" and QA Via "Via to Target", and Court Case "Through Via" inherits "Via to Target" through QA Via; QA Target has a Filters entry. Dialog reads: "${d18}". Lists relationship properties=${hasProp && viaProp}, Filters entry=${hasFilter}, inherit path through T=${hasInherit}`, "TPL-18");
  // TPL-19 confirm
  const beaconBefore = await beaconTexts(page);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 600);
  const gone = !(await hasTpl(page, "QA Target"));
  const slotAfter = await selSlot(page);
  const beaconNew = (await beaconTexts(page)).filter((t) => !beaconBefore.includes(t) && !/Running/.test(t));
  const act19 = (await activityRows(page)).slice(0, 2);
  await toSettingsItem(page, "Templates");
  await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const goneReload = !(await hasTpl(page, "QA Target"));
  rec("TPL-19", gone && goneReload && !/Selected/.test(slotAfter) && beaconNew.length === 1 && /Template deleted\./.test(beaconNew[0]) && /Deleted template “QA Target”/.test(act19[0]) && /admin/.test(act19[0]) ? "PASS" : "FAIL", `row gone=${gone}; footer after "${slotAfter}"; new Beacon entries ${JSON.stringify(beaconNew)}; Activity log top rows ${JSON.stringify(act19)}; after reload still gone=${goneReload}`, await shot(page, "TPL-19"));
  rec("X-09-delete", /Deleted template “QA Target”/.test(act19[0]) && /admin/.test(act19[0]) ? "PASS" : "FAIL", `Activity log row ${JSON.stringify(act19[0])}`, "");
  // TPL-20
  await toSettingsItem(page, "Filters");
  const filtTxt = await S(page).innerText();
  await toSettingsItem(page, "Templates");
  await openRow(page, "Court Case");
  const ccProps = (await S(page).locator("table[aria-label=Properties]").innerText()).replace(/\s+/g, " ");
  await S(page).getByRole("button", { name: "Templates" }).first().click(); await wait(page, 400);
  await openRow(page, "QA Via");
  const viaProps = (await S(page).locator("table[aria-label=Properties]").innerText()).replace(/\s+/g, " ");
  await S(page).getByRole("button", { name: "Templates" }).first().click(); await wait(page, 400);
  await goLibrary(page); const facAfter = (await libTypeFacet(page)).map((f) => f.name);
  rec("TPL-20", !filtTxt.includes("QA Target") && !/Related QA/.test(ccProps) && !/Via to Target/.test(viaProps) && !facAfter.includes("QA Target") ? "PASS" : "FAIL", `Filters mentions QA Target: ${filtTxt.includes("QA Target")}; Court Case properties still list "Related QA": ${/Related QA/.test(ccProps)} (and "Through Via" which inherits through the removed property: ${/Through Via/.test(ccProps)}); QA Via still lists "Via to Target": ${/Via to Target/.test(viaProps)}; Library Type facet before delete had QA Target: ${facBefore.includes("QA Target")} (list ${JSON.stringify(facBefore)}), after: ${facAfter.includes("QA Target")}`, "TPL-19");
  await toSettingsItem(page, "Templates");
  // X-04 failure half: Delete scope
  const status = await devArm(page, "Delete", "The server did not answer in time.");
  await devReturn(page, "Templates");
  const tasksBefore = await runningTasks(page); const bb = await beaconTexts(page);
  await tickRow(page, "QA Via");
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 300);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 800);
  const bn = (await beaconTexts(page)).filter((t) => !bb.includes(t) && !/Running/.test(t));
  const stillThere = await hasTpl(page, "QA Via");
  const slotF = await selSlot(page);
  const tasksAfter = await runningTasks(page);
  await shot(page, "X-04-fail-delete");
  const errEntries = bn.filter((t) => /An error occurred/.test(t));
  rec("X-04-fail-delete", status.startsWith("Armed") && errEntries.length === 1 && bn.length === 1 && /did not answer in time/.test(errEntries[0]) && stillThere && tasksAfter === tasksBefore ? "PASS" : "FAIL", `Dev panel status "${status}"; after confirming Delete on QA Via: new Beacon entries ${JSON.stringify(bn)}; row still present=${stillThere}; footer "${slotF}"; running tasks ${tasksBefore} -> ${tasksAfter}`, "X-04-fail-delete");
  // The delete went through, so the switch is still armed: disarm it (Dev panel) before the Save test.
  const armedAfter = await (async () => { await (await import("./common.mjs")).devOpen(page); const t = (await page.locator("[data-component=DevPanel]").first().locator("[role=status]").first().innerText()).trim(); const dis = page.locator("[data-component=DevPanel]").first().getByRole("button", { name: "Disarm" }); if (await dis.count()) await dis.click(); return t; })();
  rec("X-04-fail-delete-still-armed", /^Armed/.test(armedAfter) ? "FAIL" : "PASS", `Dev panel after the delete attempt reads "${armedAfter}" (a consumed switch reads "Not armed.")`, "");
  // Save-scope failure: arm first, then edit and save a template
  const st2 = await devArm(page, "Save", "Disk quota exceeded.");
  await devReturn(page, "Templates");
  await openRow(page, "QA Unused B");
  await S(page).getByPlaceholder("Template name").fill("QA Unused B edited"); await wait(page, 200);
  const bb2 = await beaconTexts(page); const tk0 = await runningTasks(page);
  await S(page).getByRole("button", { name: /^(Save|Create template)/ }).first().click(); await wait(page, 800);
  const dlgSave = page.locator("[role=dialog]:not([inert] *)").getByRole("button", { name: /^Save/ });
  if (await dlgSave.count()) { await dlgSave.first().click(); await wait(page, 800); }
  const bn2 = (await beaconTexts(page)).filter((t) => !bb2.includes(t) && !/Running/.test(t));
  const kept = await S(page).getByPlaceholder("Template name").inputValue().catch(() => null);
  const tk1 = await runningTasks(page);
  await shot(page, "X-04-fail-save");
  const err2 = bn2.filter((t) => /An error occurred/.test(t));
  rec("X-04-fail-save", err2.length === 1 && bn2.length === 1 && /Disk quota exceeded/.test(err2[0]) && kept === "QA Unused B edited" && tk0 === tk1 ? "PASS" : "FAIL", `armed: "${st2}"; saving the edited template -> new Beacon entries ${JSON.stringify(bn2)}; editor still open with name "${kept}"; running tasks ${tk0} -> ${tk1}`, "X-04-fail-save");
  await page.context().close();
}
await b.close();
