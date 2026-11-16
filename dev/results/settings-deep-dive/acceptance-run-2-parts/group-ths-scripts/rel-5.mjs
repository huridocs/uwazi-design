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

await run("REL-5a", async (b) => {
  let page;
  // REL-17 + REL-19
  ({ page } = await open(b, "relationship-types")); page.on("crash", () => console.log("PAGE CRASH")); page.on("close", () => console.log("PAGE CLOSE")); b.on("disconnected", () => console.log("BROWSER DISCONNECTED"));
  await wait(page, 600);
  await addRelType(page, "Mentors"); await addRelType(page, "Unused type");
  for (const t of ["Mexico", "Argentina", "Chile"]) { await toPanel(page); await panelEdit(page); await panelCreate(page, t, "Mentors"); await panelSave(page); await toSettingsSafe(page, "Relationship types"); }
  await toSettingsSafe(page, "Relationship types"); await wait(page, 600);
  const mc = await refCount(page, "Mentors");
  await toPanel(page); await panelEdit(page);
  const d = await manage(page);
  await d.getByLabel("New relationship type label").fill("Colleague of"); await d.getByRole("button", { name: "Add", exact: true }).click(); await wait(page, 400);
  const renameCtl = await d.locator('button[aria-label^="Rename"], input[aria-label^="Rename"]').count();
  await d.getByRole("button", { name: "Delete Unused type" }).click(); await wait(page, 400);
  const dlgDel = clean(await page.locator("[role=dialog]:not([inert] *)").last().innerText()).replace(/^.*?(Unused type.*?Cancel).*$/, "$1");
  await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 500);
  const afterModal = await modalTypes(page);
  await page.keyboard.press("Escape"); await wait(page, 300);
  await toSettingsSafe(page, "Relationship types"); await wait(page, 600);
  const names17 = await relNames(page);
  await sh(page, "REL-17");
  rec("REL-17", names17.includes("Colleague of") && !names17.includes("Unused type") && renameCtl > 0 ? "PASS" : "FAIL", `in the panel's "Manage types" modal: added "Colleague of" (listed in Settings without reload=${names17.includes("Colleague of")}); deleted the unused type (dialog "${dlgDel.slice(0, 100)}"; gone from Settings=${!names17.includes("Unused type")}); rename controls in the modal=${renameCtl} (the modal can only add and delete, so "rename Mentors" cannot be done there)`, "acceptance-run-2-shots/REL-17.png");
});
