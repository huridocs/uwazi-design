import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, nlist, newNotifs, guardInfo, guardBtn, rail, toSettings, toPanel, panelEdit, panelCreate, panelSave, panelText, notifTitles, logEntries } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const count = async (p, name) => { const r = (await dataRows(p)).find((x) => new RegExp("^" + name + "( |$)").test(x)); return r ? r.match(/(\d[\d,]*|…) references?$/)?.[1] : null; };
const nameIn = (p) => S(p).locator("#relationship-type-name");
const commitBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create relationship type)$/ });

if (want("a")) await run("REL-panel", async (b) => {
  const { page } = await open(b, "relationship-types");
  // REL-03
  const c0 = await count(page, "Cites");
  const txt0 = clean(await S(page).innerText());
  await toPanel(page); await panelEdit(page);
  await panelCreate(page, "Case 12.045", "Cites"); await panelSave(page);
  await toSettings(page, "Relationship types");
  const c1 = await count(page, "Cites");
  await toPanel(page); await panelEdit(page);
  await page.getByRole("button", { name: /Expand all/ }).first().click(); await wait(page, 400);
  await page.getByRole("button", { name: "Delete relationship" }).last().click(); await wait(page, 400);
  const d = await guardInfo(page);
  if (d.length) await guardBtn(page, /^(Delete|Accept)/).last().click(); await wait(page, 400);
  await panelSave(page);
  await toSettings(page, "Relationship types");
  const c2 = await count(page, "Cites");
  const usedText = /\d+ relationships|Used by \d+ connections/.test(txt0);
  rec("REL-03", c1 === String(Number(c0) + 1) && c2 === c0 && !usedText ? "PASS" : "FAIL", `"Cites" References count ${c0} -> ${c1} after adding one reference in the panel -> ${c2} after deleting it (dialog on delete: ${JSON.stringify(d.map((x) => x.name))}); page text contains "N relationships" or "Used by N connections"=${usedText}`, await sh(page, "REL-03"));
  await page.context().close();
});

if (want("b")) await run("REL-rename", async (b) => {
  // REL-07 (+ REL-15 pieces)
  const { page } = await open(b, "relationship-types");
  await lead(page, "Add relationship type").click(); await wait(page, 300);
  await nameIn(page).fill("Supervises"); await commitBtn(page).click(); await wait(page, 500);
  await toPanel(page); await panelEdit(page);
  await panelCreate(page, "Case 12.045", "Supervises"); await panelSave(page);
  await toSettings(page, "Relationship types");
  const c0 = await count(page, "Supervises");
  const bf = await nlist(page);
  await openRow(page, "Supervises");
  await nameIn(page).fill("Oversees"); await wait(page, 150);
  await commitBtn(page).click(); await wait(page, 600);
  const n = await newNotifs(page, bf);
  const rows = await dataRows(page);
  const row = rows.find((r) => /^Oversees/.test(r));
  const c1 = await count(page, "Oversees");
  const hl = await S(page).locator("[role=row]").filter({ hasText: "Oversees" }).first().evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, cls: e.className.slice(0, 80) }));
  const base = await S(page).locator("[role=row]").nth(1).evaluate((e) => getComputedStyle(e).backgroundColor);
  await sh(page, "REL-07");
  await toPanel(page);
  const t = await panelText(page);
  const panelHas = /Oversees/.test(t); const panelOld = /Supervises/.test(t);
  await page.getByRole("button", { name: /Expand all/ }).first().click(); await wait(page, 400);
  const t2 = await panelText(page);
  await sh(page, "REL-07-panel");
  const names = /Supervises/.test(n.join(" ")) && /Oversees/.test(n.join(" "));
  rec("REL-07", row && c1 === c0 && /Oversees/.test(t2) && !/Supervises/.test(t2) && names ? "PASS" : "FAIL", `renamed "Supervises" (${c0} reference) to "Oversees": list row "${row}", count ${c0} -> ${c1}; Beacon entries ${JSON.stringify(n)} (names old and new=${names}); row highlighted after returning (bg ${hl.bg} vs ${base})=${hl.bg !== base}; Relationships panel shows "Oversees"=${/Oversees/.test(t2)} and the old name=${/Supervises/.test(t2)}`, "acceptance-run-1-shots/REL-07.png");
  await page.context().close();
});

if (want("c")) await run("REL-manage", async (b) => {
  // REL-17 and REL-19
  const { page } = await open(b, "relationship-types");
  await lead(page, "Add relationship type").click(); await wait(page, 300);
  await nameIn(page).fill("Mentors"); await commitBtn(page).click(); await wait(page, 500);
  await toPanel(page); await panelEdit(page);
  for (const tgt of ["Case 12.045", "Case 10.488", "Case 11.481"]) await panelCreate(page, tgt, "Mentors");
  await panelSave(page);
  await toSettings(page, "Relationship types");
  const m0 = await count(page, "Mentors");
  await toPanel(page); await panelEdit(page);
  await page.locator('[data-part=manage-types]').click(); await wait(page, 600);
  const modalText = clean(await page.locator("[data-component=ManageRelationTypesModal]").innerText());
  await sh(page, "REL-17-modal");
  const renameCtl = await page.locator("[data-component=ManageRelationTypesModal]").getByRole("button", { name: /Rename|Edit/ }).count();
  const input = page.locator("[data-component=ManageRelationTypesModal] input");
  await input.fill("Colleague of"); await page.locator("[data-component=ManageRelationTypesModal] [data-part=add] button").click(); await wait(page, 500);
  // REL-19: delete Mentors
  const bf = await nlist(page);
  await page.locator('[data-component=ManageRelationTypesModal] [data-part=type]').filter({ hasText: "Mentors" }).locator('[data-part=delete]').click(); await wait(page, 400);
  const confirmText = clean(await page.locator('[data-component=ManageRelationTypesModal] [data-part=type]').filter({ hasText: "Mentors" }).innerText());
  await sh(page, "REL-19-confirm");
  await page.locator('[data-component=ManageRelationTypesModal] [data-part=confirm-delete]').click(); await wait(page, 600);
  const n = await newNotifs(page, bf);
  // delete an unused one: Colleague of
  await page.locator('[data-component=ManageRelationTypesModal] [data-part=type]').filter({ hasText: "Colleague of" }).locator('[data-part=delete]').click(); await wait(page, 300);
  await page.locator('[data-component=ManageRelationTypesModal] [data-part=confirm-delete]').click(); await wait(page, 500);
  // add again so Settings should show it
  await input.fill("Colleague of"); await page.locator("[data-component=ManageRelationTypesModal] [data-part=add] button").click(); await wait(page, 500);
  await page.getByRole("button", { name: "Close" }).last().click(); await wait(page, 300);
  await page.getByRole("button", { name: /Cancel/ }).last().click().catch(() => {}); await wait(page, 400);
  const g = await dialogs(page);
  await page.getByRole("button", { name: /Expand all/ }).first().click().catch(() => {}); await wait(page, 300);
  const t = await panelText(page);
  const noLabel = (t.match(/No label\s*\d*/g) || []);
  await sh(page, "REL-19");
  await toSettings(page, "Relationship types");
  const rows = await dataRows(page);
  const names = rows.map((r) => r.replace(/\s*(\d[\d,]*|…) references?$/, ""));
  const hasCol = names.some((x) => /^Colleague of/.test(x)); const hasMentors = names.some((x) => /^Mentors/.test(x));
  rec("REL-17", hasCol && !hasMentors && renameCtl > 0 ? "PASS" : "FAIL", `Manage types modal (panel): text "${modalText.slice(0, 120)}..."; add "Colleague of" and delete "Mentors" there; no rename control (matches=${renameCtl}), so "rename Mentors" is not possible in the modal; back in Settings without reload "Colleague of" listed=${hasCol}, "Mentors" listed=${hasMentors}`, await sh(page, "REL-17"));
  rec("REL-19", /no label/i.test(confirmText) && !hasMentors ? "PASS" : "FAIL", `"Mentors" had ${m0} references; in the modal the delete asks inline: "${confirmText.slice(-90)}" (button "Delete & reassign", no confirm dialog saying references are set to no label); after confirming: Beacon entries ${JSON.stringify(n)}; panel shows "No label" groups ${JSON.stringify(noLabel.slice(0, 3))}; "Mentors" gone from Settings=${!hasMentors}. Settings delete still moves/deletes instead of refusing (REL-11)`, "acceptance-run-1-shots/REL-19.png");
  await page.context().close();
});
