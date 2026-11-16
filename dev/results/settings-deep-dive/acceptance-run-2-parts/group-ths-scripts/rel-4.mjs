import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, relPills, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries, toPanel, panelEdit, panelCreate, panelSave, panelText } from "./tx.mjs";
const refCount = async (p, name) => { const t = await S(p).locator("[data-part=row]").filter({ has: p.locator("[data-column=name]", { hasText: new RegExp("^" + name + "$") }) }).first().locator("[data-column=usage]").innerText(); return t.replace(/\s+/g, " ").trim(); };
const manage = async (p) => { await p.getByRole("button", { name: "Manage types" }).click(); await wait(p, 500); return p.locator("[role=dialog]:not([inert] *)").last(); };
const modalTypes = async (p) => { const t = clean(await p.locator("[role=dialog]:not([inert] *)").last().innerText()); return t; };
const pickerTypes = async (p) => { await p.locator("[data-part=create]").click(); await wait(p, 500); await p.getByPlaceholder(/Search entities/).fill("Mexico"); await wait(p, 500); await p.locator("[data-part=entity]").filter({ hasText: "Mexico" }).first().click(); await wait(p, 400); const t = clean(await p.locator("[data-part=relation-types]").innerText()); await p.locator("[data-component=CreateRelationshipModal]").getByRole("button", { name: /^(Cancel|Close)$/ }).first().click(); await wait(p, 400); return t; };
async function saveTemplate(p) {
  await S(p).locator("footer").getByRole("button", { name: /^Save$/ }).click(); await wait(p, 500);
  const d = p.locator("[role=dialog]:not([inert] *)").filter({ hasText: "Save template" });
  if (await d.count()) await d.getByRole("button", { name: "Save", exact: true }).click();
  await wait(p, 800);
}
const leavePanel = async (p) => { await p.keyboard.press("Escape"); await wait(p, 200); await p.locator("[data-part=cancel]").last().click({ timeout: 2000 }).catch(() => {}); await wait(p, 400); const c = p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]"); if (await c.count()) { console.log("guard:", await dialogText(p)); await c.getByRole("button", { name: /Discard|Leave|Delete|Continue/ }).last().click().catch(() => {}); await wait(p, 400); } };
const propSelectOptions = async (p) => { await toSettings(p, "Templates"); await wait(p, 500); await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(p, 900); await S(p).getByText("Victims", { exact: true }).first().click(); await wait(p, 700); await p.locator('button[aria-label^="Relationship type:"]').click(); await wait(p, 300); const o = await p.getByRole("option").allInnerTexts(); await p.keyboard.press("Escape"); await wait(p, 200); await p.keyboard.press("Escape"); await wait(p, 300); return o; };

await run("REL-4a", async (b) => {
  let { page } = await open(b, "relationship-types");
  await wait(page, 600);
  // REL-16
  await addRelType(page, "Mentors");
  const em = errMark(page); 
  await toPanel(page); await panelEdit(page);
  await manage(page); 
  const mt = await modalTypes(page);
  await page.keyboard.press("Escape"); await wait(page, 300);
   const pt = await pickerTypes(page); 
  await page.keyboard.press("Escape"); await wait(page, 200);
  await page.locator("[data-part=cancel]").click().catch(() => {}); await wait(page, 400);
   const po = await propSelectOptions(page); 
  const sortedPo = po.filter((x) => !/^Select/.test(x)); const sortedOk = JSON.stringify(sortedPo) === JSON.stringify([...sortedPo].sort((a, c) => a.localeCompare(c)));
  // rename in Settings
  await toSettings(page, "Relationship types"); await wait(page, 500);
  await openRel(page, "Mentors"); await relName(page).fill("Mentors 2"); await relSave(page).click(); await wait(page, 600);
  await toPanel(page); await panelEdit(page);
  await manage(page); const mt2 = await modalTypes(page); await page.keyboard.press("Escape"); await wait(page, 300);
  const pt2 = await pickerTypes(page);
  await leavePanel(page);
  const po2 = await propSelectOptions(page);
  const e16 = errNew(page, em);
  await sh(page, "REL-16");
  const ok16 = /Mentors/.test(mt) && /Mentors/.test(pt) && po.includes("Mentors") && /^Select/.test(po[0]) && sortedOk && /Mentors 2/.test(mt2) && /Mentors 2/.test(pt2) && po2.includes("Mentors 2") && !po2.includes("Mentors") && !e16.length;
  rec("REL-16", ok16 ? "PASS" : "FAIL", `"Mentors" added in Settings: panel "Manage types" modal lists it=${/Mentors/.test(mt)}; the new-reference type picker lists it=${/Mentors/.test(pt)}; the template property select lists it=${po.includes("Mentors")} (first option "${po[0]}", sorted=${sortedOk}); after renaming to "Mentors 2" in Settings: modal ${/Mentors 2/.test(mt2)}, picker ${/Mentors 2/.test(pt2)}, template select ${po2.includes("Mentors 2")}. Console errors during the check (template editor): ${JSON.stringify(e16)}`, "acceptance-run-2-shots/REL-16.png");
  await page.context().close();

});
