import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, listRows, openThes, newThes, nameInput, commitBtn, cancelBtn, vrows, addVals, saveThes, label, rowOf, footerTxt, saveClick, guardInfo, make, tick, openBeacon, dialogs, dialogText, rowDelete, logEntries } from "./tx.mjs";

const optionTexts = (p) => p.evaluate(() => [...document.querySelectorAll("[role=option], [role=listbox] *")].filter((e) => e.offsetParent && !e.closest("[inert]") && e.getAttribute("role") === "option").map((e) => e.innerText.trim()));
async function saveTemplate(p) {
  await S(p).locator("footer").getByRole("button", { name: /^Save$/ }).click(); await wait(p, 500);
  const d = p.locator("[role=dialog]:not([inert] *)").filter({ hasText: "Save template" });
  if (await d.count()) await d.getByRole("button", { name: "Save", exact: true }).click();
  await wait(p, 700);
}
async function openStatusDialog(p) {
  await toSettings(p, "Templates"); await wait(p, 600);
  await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(p, 800);
  await S(p).getByText("Status", { exact: true }).first().click(); await wait(p, 800);
}
await run("THS-7", async (b) => {
  let { page } = await open(b, "thesauri");
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  const em = errMark(page);
  // THS-26 + THS-02 bind
  await openStatusDialog(page);
  await page.locator('button[aria-label^="Thesaurus:"]').click(); await wait(page, 400);
  const o1 = await optionTexts(page);
  await sh(page, "THS-26");
  await page.getByRole("option", { name: "Fruits", exact: true }).click(); await wait(page, 300);
  await page.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(page, 500);
  await saveTemplate(page);
  await rail(page, "Thesauri"); await wait(page, 600);
  const listBound = await listRows(page);
  const fruitsRow = listBound.find((r) => /^Fruits/.test(r));
  const caseRow = listBound.find((r) => /^Case status/.test(r));
  // rename Fruits
  await openThes(page, "Fruits");
  await page.getByLabel("Thesaurus name").fill("Fruits 2"); await wait(page, 150);
  await saveClick(page); await wait(page, 600);
  await openStatusDialog(page);
  const boundLabel = await page.locator('button[aria-label^="Thesaurus:"]').getAttribute("aria-label");
  await page.locator('button[aria-label^="Thesaurus:"]').click(); await wait(page, 400);
  const o2 = await optionTexts(page);
  await page.keyboard.press("Escape"); await wait(page, 200);
  const sorted = (a) => { const x = a.filter((t) => !/^Select/.test(t)); return JSON.stringify(x) === JSON.stringify([...x].sort((p, q) => p.localeCompare(q))); };
  const e26 = errNew(page, em);
  rec("THS-26", !e26.length && /^Select/.test(o1[0] || "") && sorted(o1) && o1.includes("Fruits") && o2.includes("Fruits 2") && !o2.includes("Fruits") && /Fruits 2/.test(boundLabel) ? "PASS" : "FAIL", `property dialog thesaurus select options ${JSON.stringify(o1)} (first option "${o1[0]}", sorted by label=${sorted(o1)}, new "Fruits" present=${o1.includes("Fruits")}); after binding Status to Fruits and renaming the thesaurus to "Fruits 2" without a reload: options ${JSON.stringify(o2)}; the bound property reads "${boundLabel}". Console errors during the check: ${JSON.stringify(e26)}`, "acceptance-run-2-shots/THS-26.png");
  rec("THS-02", /Court Case/.test(fruitsRow || "") ? "PASS" : "FAIL", `after binding Court Case "Status" to the new "Fruits" thesaurus and saving the template, the Thesauri list rows are "${fruitsRow}" and "${caseRow}": no Templates column or pill appears on any row (the list has only Thesaurus, Items, Actions), so neither bind nor unbind can change a pill`, await sh(page, "THS-02"));
  await page.context().close();

  // THS-27 delete unused
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  const rowsBefore = await listRows(page);
  const ticks = await S(page).locator("[role=checkbox], input[type=checkbox]").count();
  const b0 = await nlist(page);
  await rowDelete(page, "Fruits");
  const dl = await dialogText(page);
  await sh(page, "THS-27");
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const stillThere = (await listRows(page)).some((r) => /^Fruits/.test(r));
  await rowDelete(page, "Fruits");
  const acc = page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Accept|Delete/ }).last();
  const accLabel = await acc.innerText();
  await acc.click(); await wait(page, 600);
  const n3 = await fresh(page, b0);
  const gone = !(await listRows(page)).some((r) => /^Fruits/.test(r));
  rec("THS-27", ticks > 0 && /Selected 1 of \d+/.test(await footerTxt(page)) ? "PASS" : "FAIL", `list rows carry no checkbox (checkboxes=${ticks}) so "Fruits" cannot be ticked and the footer shows no "Selected 1 of m" bar; each row has a Delete action instead. Row delete dialog reads "${dl}" (expected header "Delete", "Are you sure you want to delete this item?"); Cancel keeps the row=${stillThere}; confirm button "${accLabel}"; Beacon new ${JSON.stringify(n3)} (expected "Thesauri deleted"); row gone=${gone}`, "acceptance-run-2-shots/THS-27.png");
  await page.context().close();

  // THS-28
  ({ page } = await open(b, "thesauri"));
  const b1 = await nlist(page);
  await rowDelete(page, "Case status");
  const dl2 = await dialogText(page);
  const btns = await page.locator("[data-component=ConfirmDelete] button").allInnerTexts();
  const acc2 = page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Accept|Delete/ }).last();
  const disabled = await acc2.isDisabled().catch(() => null);
  await sh(page, "THS-28");
  if (disabled === false) await acc2.click({ force: true }); await wait(page, 500);
  const stays = (await listRows(page)).some((r) => /^Case status/.test(r));
  const n4 = await fresh(page, b1);
  rec("THS-28", /Cannot delete thesaurus with 1 associated templates\. Please remove the related templates first\./.test(dl2) && /Court Case/.test(dl2) && stays && n4.length <= 1 ? "PASS" : "FAIL", `Delete on "Case status" (used by a template): dialog "${dl2}" buttons ${JSON.stringify(btns)}, confirm disabled=${disabled}; thesaurus stays=${stays}; new Beacon entries ${JSON.stringify(n4)}`, "acceptance-run-2-shots/THS-28.png");
  await page.context().close();

  // THS-40
  ({ page } = await open(b, "thesauri"));
  await make(page, "Fruits", ["Apple", "Fig", "Kiwi"]);
  const c0 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  await openThes(page, "Fruits");
  const total0 = clean(await S(page).locator("h3").first().innerText().catch(() => ""));
  await addVals(page, ["Pear", "Plum"]);
  await saveClick(page); await wait(page, 600);
  const c1 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  await openThes(page, "Fruits");
  const total1 = clean(await S(page).innerText()).match(/Values \((\d+)\)/)?.[1];
  await page.reload(); await wait(page, 1500);
  const c2 = (await listRows(page)).find((r) => /^Fruits/.test(r));
  rec("THS-40", /3$/.test(c0 || "") && /5$/.test(c1 || "") && String(total1) === "5" && /5$/.test(c2 || "") ? "PASS" : "FAIL", `list "${c0}" -> after adding 2 values and Save "${c1}"; editor total "Values (${total1})"; after reloading the tab the list row is "${c2}"`, "");
  await page.context().close();
});
