import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, dialogText, addGroup, arm, devButton, switchTo, logEntries, hscroll, rowDelete } from "./tx.mjs";
const FX = new URL("./fixtures/", import.meta.url).pathname;
const errEntries = (n) => n.filter((t) => /error/i.test(t));
await run("THS-10", async (b) => {
  let { page } = await open(b, "thesauri");
  await make(page, "Temp", ["a"]);
  // save failure
  const st1 = await arm(page, "Save", "The server did not answer in time.", "Thesauri");
  await openThes(page, "Case status");
  await addVals(page, ["Zed"]);
  const b0 = await nlist(page); const lg0 = (await logEntries(page)).length;
  await saveClick(page); await wait(page, 800);
  const n1 = await fresh(page, b0);
  const kept1 = (await nameInput(page).count()) === 1 && (await vrows(page)).includes("Zed");
  const lg1 = (await logEntries(page)).length;
  await sh(page, "THS-37-save");
  // the switch: still armed?
  // delete failure
  await cancelBtnClick(page);
  const st2 = await arm(page, "Delete", "Could not delete: it is in use.", "Thesauri");
  const b2 = await nlist(page);
  await rowDelete(page, "Temp");
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Delete|Accept/ }).last().click(); await wait(page, 700);
  const n2 = await fresh(page, b2);
  const still = (await listRows(page)).some((r) => /^Temp/.test(r));
  await sh(page, "THS-37-delete");
  // import failure
  const st3 = await arm(page, "Import or Upload", "The file could not be read.", "Thesauri");
  await newThes(page, "Imp");
  await S(page).locator("footer").getByRole("button", { name: /Import CSV/ }).click(); await wait(page, 400);
  const b3 = await nlist(page);
  await page.locator("input[type=file]").setInputFiles(FX + "fruit.csv"); await wait(page, 700);
  const dlgT = clean(await page.locator("[data-component=ThesaurusImportModal]").last().innerText());
  await page.locator("[data-component=ThesaurusImportModal] [data-part=submit]").click().catch(() => {}); await wait(page, 600);
  const n3 = await fresh(page, b3);
  const draft3 = await vrows(page);
  await sh(page, "THS-37-import");
  const failedOk = (n) => errEntries(n).length === 1 && /An error occurred/.test(n.join(" "));
  rec("THS-37", failedOk(n1) && kept1 && failedOk(n2) && still && /Error adding thesauri\./.test(n3.join(" ")) ? "PASS" : "FAIL", `Dev panel armed (${st1}): editing "Case status" and pressing Save gave Beacon ${JSON.stringify(n1)} (expected exactly one "An error occurred" with the reason), editor kept edits=${kept1}, saved anyway=${n1.some((t) => /Thesauri updated/.test(t))}; armed Delete (${st2}): deleting the unused "Temp" gave ${JSON.stringify(n2)}, row still listed=${still} (expected one "An error occurred" and the thesaurus kept); armed Import (${st3}): importing fruit.csv gave ${JSON.stringify(n3)} (expected "Error adding thesauri." once), draft after ${JSON.stringify(draft3)}`, "acceptance-run-2-shots/THS-37-save.png");
  rec("X-04", failedOk(n1) ? "PASS" : "FAIL", `success half: Save gives "Thesauri updated.", create gives "Thesauri updated.", delete gives "Thesauri deleted" (seen in THS-09/THS-27 runs). Failure half: with "Fail next request" armed for Save the Save produced ${JSON.stringify(n1)} and the Activity log grew by ${lg1 - lg0} entries; for Delete ${JSON.stringify(n2)}; for Import ${JSON.stringify(n3)}. The Dev panel switches are consumed only by Pages (see code), not Thesauri`, "acceptance-run-2-shots/THS-37-save.png");
  await page.context().close();
});
async function cancelBtnClick(page) { if (await cancelBtn(page).count()) { await cancelBtn(page).click(); await wait(page, 400); } }
