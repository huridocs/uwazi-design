import { toSettingsSafe, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, relPills, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries, toPanel, panelEdit, panelCreate, panelSave, panelText } from "./tx.mjs";
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

await run("REL-5b", async (b) => {
  let page;
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  await addRelType(page, "Mentors"); 
  for (const t of ["Mexico", "Argentina", "Chile"]) { await toPanel(page); await panelEdit(page); await panelCreate(page, t, "Mentors"); await panelSave(page); await toSettingsSafe(page, "Relationship types"); }
  await wait(page, 600);
  const mc = await refCount(page, "Mentors");
  // REL-19
  await toPanel(page);  await panelEdit(page);
  const d2 = await manage(page);
  await d2.getByRole("button", { name: "Delete Mentors" }).click(); await wait(page, 400);
  const dl19 = clean(await page.locator("[role=dialog]:not([inert] *)").last().innerText());
  await sh(page, "REL-19");
  const nl0 = (dl19.match(/No label (\d+) refs/) || [])[1]; await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: "Delete & reassign", exact: true }).click(); await wait(page, 600);
  const afterTxt = clean(await page.locator("[role=dialog]:not([inert] *)").last().innerText());
  const bodyAfter = clean(await page.locator("body").innerText());
  await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: "Close" }).click(); await wait(page, 400);
  const panelGroups = clean(await page.locator("body").innerText());
  await panelSave(page); await wait(page, 500);
  await panelEdit(page);
  const d3 = await manage(page); const afterSave = clean(await d3.innerText()); await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: "Close" }).click(); await wait(page, 300);
  const nl1 = (afterSave.match(/No label (\d+) refs/) || [])[1];
  const stillThere = /Mentors \d+ refs/.test(afterSave);
  await toSettingsSafe(page, "Relationship types"); await wait(page, 600);
  const names19 = await relNames(page);
  rec("REL-19", /no label/i.test(dl19.replace(/No label \d+ refs/, "")) && !names19.includes("Mentors") && +nl1 === +nl0 + 3 ? "PASS" : "FAIL", `Mentors had "${mc}"; panel delete modal after pressing Delete on its row reads "${dl19.slice(0, 700)}" (the row button reads "Delete & reassign"; text saying the references are set to no label=${/no label/i.test(dl19.replace(/No label \d+ refs/, ""))}); after pressing "Delete & reassign" and saving the panel, the modal lists Mentors=${stillThere} and the "No label" fallback row goes from ${nl0} to ${nl1} refs (3 references moved to No label=${+nl1 === +nl0 + 3}); "Mentors" gone from Settings=${!names19.includes("Mentors")}; after Accept "Mentors" is gone from Settings=${!names19.includes("Mentors")}`, "acceptance-run-2-shots/REL-19.png");
  await page.context().close();

});
