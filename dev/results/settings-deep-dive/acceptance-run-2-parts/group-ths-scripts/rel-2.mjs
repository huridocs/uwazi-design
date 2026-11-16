import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, relPills, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries, toPanel, panelEdit, panelCreate, panelSave, panelText } from "./tx.mjs";
const refCount = async (p, name) => { const t = await S(p).locator("[data-part=row]").filter({ has: p.locator("[data-column=name]", { hasText: new RegExp("^" + name + "$") }) }).first().locator("[data-column=usage]").innerText(); return t.replace(/\s+/g, " ").trim(); };
async function saveTemplate(p) {
  await S(p).locator("footer").getByRole("button", { name: /^Save$/ }).click(); await wait(p, 500);
  const d = p.locator("[role=dialog]:not([inert] *)").filter({ hasText: "Save template" });
  if (await d.count()) await d.getByRole("button", { name: "Save", exact: true }).click();
  await wait(p, 800);
}
async function setPropType(p, prop, type) {
  await toSettings(p, "Templates"); await wait(p, 500);
  await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(p, 900);
  await S(p).getByText(prop, { exact: true }).first().click(); await wait(p, 700);
  await p.locator('button[aria-label^="Relationship type:"]').click(); await wait(p, 300);
  await p.getByRole("option", { name: type, exact: true }).click(); await wait(p, 300);
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 500);
  await saveTemplate(p);
}
const addRef = async (p, target, type) => { await toPanel(p); await panelEdit(p); await panelCreate(p, target, type); await panelSave(p); };

await run("REL-2", async (b) => {
  // REL-03 count from real references (Mentions 100)
  let { page } = await open(b, "relationship-types");
  await wait(page, 600);
  const c0 = await refCount(page, "Mentions");
  await addRef(page, "Mexico", "Mentions");
  await toSettings(page, "Relationship types"); await wait(page, 600);
  const c1 = await refCount(page, "Mentions");
  await toPanel(page); await page.getByRole("button", { name: /^Mentions 1/ }).click(); await wait(page, 500); await panelEdit(page);
  await page.getByRole("button", { name: "Delete relationship" }).first().click(); await wait(page, 400);
  await page.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 400); await panelSave(page);
  await toSettings(page, "Relationship types"); await wait(page, 600);
  const c2 = await refCount(page, "Mentions");
  const txt = clean(await S(page).innerText());
  rec("REL-03", /^100 /.test(c0) && /^101 /.test(c1) && /^100 /.test(c2) && !/relationships|connections/i.test(txt.replace(/Relationship types|The labels available when connecting entities\.|Add relationship type|Search relationship types/g, "")) ? "PASS" : "FAIL", `Mentions: "${c0}" -> after adding a reference with that type in the Relationships panel "${c1}" -> after deleting it "${c2}"; page text contains "N relationships"/"Used by N connections"=${/relationships|connections/i.test(txt.replace(/Relationship types|The labels available when connecting entities\.|Add relationship type|Search relationship types/g, ""))}`, "");
  await page.context().close();

  // REL-07 + X-04/X-09 + REL-08 (Cites rename)
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  await addRelType(page, "Supervises");
  await addRef(page, "Mexico", "Supervises");
  await toSettings(page, "Relationship types"); await wait(page, 600);
  const cs0 = await refCount(page, "Supervises");
  await openRel(page, "Supervises");
  const usageLine = clean(await S(page).innerText()).match(/(\d+ references?[^.]*\.|No references[^.]*\.)/)?.[0];
  await relName(page).fill("Oversees"); await wait(page, 150);
  const b0 = await nlist(page);
  await relSave(page).click(); await wait(page, 600);
  const n7 = await fresh(page, b0);
  const rows7 = await relNames(page);
  const cs1 = await refCount(page, "Oversees").catch(() => null);
  await toPanel(page);
  const panelHas = /Oversees/.test(await panelText(page)) && !/Supervises/.test(await panelText(page));
  await sh(page, "REL-07");
  rec("REL-07", n7.length === 1 && /Supervises/.test(n7[0]) && /Oversees/.test(n7[0]) && panelHas && cs0 === cs1 ? "PASS" : "FAIL", `"Supervises" with ${cs0}, edit form usage line "${usageLine}", renamed to "Oversees": Beacon new ${JSON.stringify(n7)} (expected an entry naming old and new name); list rows now ${JSON.stringify(rows7.slice(-2))}, References "${cs1}"; Relationships panel on that entity shows "Oversees" and no "Supervises"=${panelHas}`, "acceptance-run-2-shots/REL-07.png");
  await page.context().close();

  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  await openRel(page, "Cites");
  await relName(page).fill("Cites 2"); await relSave(page).click(); await wait(page, 600);
  const em = errMark(page);
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 900);
  const tableRow = clean(await S(page).locator("tr, [role=row]").filter({ hasText: "Related cases" }).first().innerText());
  await S(page).getByText("Related cases", { exact: true }).first().click(); await wait(page, 700);
  const sel = await page.locator('button[aria-label^="Relationship type:"]').getAttribute("aria-label");
  const e8 = errNew(page, em);
  await sh(page, "REL-08");
  rec("REL-08", /Cites 2/.test(sel) && /Cites 2/.test(tableRow) && !e8.length ? "PASS" : "FAIL", `renamed "Cites" to "Cites 2" in Settings: Court Case property table row "${tableRow}"; property dialog select reads "${sel}". Console errors during the check: ${JSON.stringify(e8)}`, "acceptance-run-2-shots/REL-08.png");
  await page.context().close();

  // REL-02 pills
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const p0 = [await relPills(page, "Mentions"), await relPills(page, "Victim")];
  const em2 = errMark(page);
  await setPropType(page, "Victims", "Mentions");
  await toSettings(page, "Relationship types"); await wait(page, 600);
  const p1 = [await relPills(page, "Mentions"), await relPills(page, "Victim")];
  await setPropType(page, "Victims", "Victim");
  await toSettings(page, "Relationship types"); await wait(page, 600);
  const p2 = [await relPills(page, "Mentions"), await relPills(page, "Victim")];
  const e2 = errNew(page, em2);
  rec("REL-02", /Court Case/.test(p0[1]) && !p0[0] && /Court Case/.test(p1[0]) && !/Court Case/.test(p1[1]) && p2[0] === p0[0] && !e2.length ? "PASS" : "FAIL", `Templates cell before: Mentions "${p0[0]}", Victim "${p0[1]}"; after rebinding Court Case "Victims" to Mentions (no reload): Mentions "${p1[0]}", Victim "${p1[1]}"; after binding it back: Mentions "${p2[0]}", Victim "${p2[1]}". Console errors during the check (template editor): ${JSON.stringify(e2)}`, "");
  await page.context().close();
});
