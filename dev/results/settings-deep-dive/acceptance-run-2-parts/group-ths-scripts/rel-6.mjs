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

await run("REL-6", async (b) => {
  let page;
  // REL-18
  ({ page } = await open(b, "templates"));
  await wait(page, 600);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 900);
  const em18 = errMark(page);
  const addB = S(page).getByRole("button", { name: /Add relationship type/ });
  const nAdd = await addB.count();
  let r18 = "no Add relationship type button in the template editor";
  let ok18 = false;
  if (nAdd) {
    await addB.first().click(); await wait(page, 500);
    const dt = await dialogText(page);
    const input = page.locator("[role=dialog]:not([inert] *)").last().getByLabel("Name");
    const ph = await input.getAttribute("placeholder");
    await input.fill("Reports to");
    await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: /^(Add|Create|Save)/ }).last().click(); await wait(page, 700);
    const nn = await nlist(page);
    const created = nn.some((t) => /Relationship type created successfully\./.test(t));
    await addB.first().click(); await wait(page, 500);
    const input2 = page.locator("[role=dialog]:not([inert] *)").last().getByLabel("Name");
    await input2.fill("reports to "); await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: /^(Add|Create|Save)/ }).last().click(); await wait(page, 500);
    const dup = clean(await page.locator("[role=dialog]:not([inert] *)").last().innerText());
    await sh(page, "REL-18");
    await page.keyboard.press("Escape"); await wait(page, 300);
    await toSettings(page, "Relationship types"); await wait(page, 600);
    const inList = (await relNames(page)).includes("Reports to");
    ok18 = /Relationship type name already exists/.test(dup) && created && inList && ph === "Relationship type name";
    r18 = `button "Add relationship type" found (${nAdd}); modal "${dt.slice(0, 80)}", input placeholder "${ph}"; create toast "Relationship type created successfully." in Beacon=${created}; "reports to " duplicate message: "${dup.slice(0, 120)}"; new type in Settings list=${inList}`;
  }
  const e18 = errNew(page, em18);
  rec("REL-18", ok18 && !e18.length ? "PASS" : "FAIL", `${r18}. Console errors while the Court Case template editor was open: ${JSON.stringify(e18)}`, "acceptance-run-2-shots/REL-18.png");
  await page.context().close();
});
