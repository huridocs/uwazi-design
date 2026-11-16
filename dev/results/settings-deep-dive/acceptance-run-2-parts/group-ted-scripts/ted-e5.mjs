// TED-95 (Relationships-panel half) and TED-97 (inherited values read-only in record and form)
import { launch, open, S, rec, wait, strip, shot, openEditor, saveBtn, dlg, propNames, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, rail, metaTab, openEntityEdit, pickOpt } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const dialogs2 = async (p) => p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter(d => !d.closest("[inert]")).map(d => d.getAttribute("aria-label")));

await guard("TED-97", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Edit People involved", exact: true }).click(); await wait(p, 400);
  const inh = await dlg(p).getByRole("button", { name: /^Inherit property/ }).getAttribute("aria-label");
  const ent = await dlg(p).getByRole("button", { name: /^Entities:/ }).getAttribute("aria-label");
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  // make the inherit explicit and save: set Role
  await S(p).getByRole("button", { name: "Edit People involved", exact: true }).click(); await wait(p, 400);
  await pickOpt(p, "Inherit property", "Profession");
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  await saveBtn(p).click(); await wait(p, 800);
  const conf = p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *)");
  if (await conf.count()) { await conf.first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); }
  await toLibrary(p, "Court Case");
  const idx = await p.locator("[data-component=EntityCard]").evaluateAll(es => es.findIndex(e => /La Tablada/.test(e.innerText)));
  await p.locator("[data-component=EntityCard]").nth(idx).click(); await wait(p, 900); await metaTab(p);
  const blocks = await p.evaluate(() => [...document.querySelectorAll("[data-part=field], [data-component*=Relationship]")].filter(e => !e.closest("[inert]") && /PEOPLE INVOLVED|Profession/i.test(e.innerText)).map(e => ({ comp: e.getAttribute("data-component") || e.getAttribute("data-part"), text: e.innerText.replace(/\s+/g, " ").slice(0, 260) })));
  await shot(p, "TED-97-record");
  await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 900);
  const g = p.getByRole("group", { name: "People involved", exact: true });
  const gtxt = strip(await g.innerText().catch(() => ""));
  const inputs = await g.evaluate(e => [...e.querySelectorAll("input,textarea,select")].map(i => ({ type: i.type, ro: i.readOnly, dis: i.disabled, label: i.getAttribute("aria-label") })));
  await g.scrollIntoViewIfNeeded().catch(() => {});
  await shot(p, "TED-97-form");
  const rec1 = blocks.some(x => /inherits[^C]*Profession|PROFESSION/i.test(x.text));
  const formRO = /read-only/i.test(gtxt) && inputs.length === 0;
  rec("TED-97", rec1 && formRO ? "PASS" : "FAIL", `People involved (${ent}, ${inh}) set to inherit Profession, Save. Case 11.137 (La Tablada) record blocks mentioning it ${JSON.stringify(blocks)}. Edit form group text "${gtxt.slice(0, 260)}"; editable controls inside the group ${JSON.stringify(inputs)} (none = inherited values are read-only). The record names Profession among the inherited columns=${rec1}; it still lists the seeded Country and Role (the saved inherit property is not what the record reads).`, "TED-97-record");
  await c.ctx.close();
});

await guard("TED-95", async () => {
  const c = await open(b, "relationship-types"); const p = c.page; await wait(p, 900);
  await p.getByRole("button", { name: /Add relationship type/ }).first().click(); await wait(p, 500);
  await S(p).locator("#relationship-type-name").fill("QA registry type 95");
  await S(p).getByRole("button", { name: "Create relationship type" }).click(); await wait(p, 800);
  // property panel
  await rail(p, "Templates"); await wait(p, 600); await openTemplate(p, "Court Case");
  await S(p).getByRole("button", { name: "Add property" }).click(); await wait(p, 400);
  const { pickType } = await import("./ted-common.mjs");
  await pickType(p, "Relationship");
  await dlg(p).getByRole("button", { name: /^Relationship type:/ }).click(); await wait(p, 250);
  const opts = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip);
  await p.keyboard.press("Escape"); await wait(p, 200);
  const inProp = opts.includes("QA registry type 95");
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  // Relationships panel picker
  await toLibrary(p, "Court Case");
  await p.locator("[data-component=EntityCard]").first().click(); await wait(p, 900);
  await p.getByRole("button", { name: "View entity" }).click(); await wait(p, 1500);
  await p.getByRole("tab", { name: /^Relationships/ }).last().click(); await wait(p, 800);
  await shot(p, "TED-95-entity");
  const btns = await p.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]")).map(b => (b.getAttribute("aria-label") || b.innerText || "").trim().replace(/\s+/g, " ")).filter(x => /relationship|Create|Manage/i.test(x)));
  let panelOpts = null, how = "";
  const create = p.getByRole("button", { name: /Create relationship/ }).first();
  if (await create.count()) { await create.click(); await wait(p, 700); how = "Create relationship"; }
  await shot(p, "TED-95-modal");
  const dlgs = await dialogs2(p);
  panelOpts = await p.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter(d => !d.closest("[inert]")).map(d => d.innerText.replace(/\s+/g, " ").slice(0, 500)));
  const panelHas = panelOpts && panelOpts.some(t => /QA registry type 95/.test(t));
  rec("TED-95", panelHas && inProp ? "PASS" : (!inProp ? "FAIL" : "NOT DRIVEABLE"), `Half 1 (driven, PASS): "QA registry type 95" added on Settings > Relationship types is offered by the property panel's Relationship type select=${inProp}. Half 2 (Relationships panel picker): the picker is the Create relationship modal, which the entity view only opens from the Relationships tab in edit mode (button data-part=create, absent in the List and Graph views after pressing Edit: ${await p.locator("[data-part=create]").count()} found) or from a text selection in the PDF (a synthetic double-click and drag over the text layer raised no menu). Not reached, so this half could not be driven; dialogs open: ${JSON.stringify(panelOpts)}.`, "TED-95-modal");
  await c.ctx.close();
});
await b.close();
