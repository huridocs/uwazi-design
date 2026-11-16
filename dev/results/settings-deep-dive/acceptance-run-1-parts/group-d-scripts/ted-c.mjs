import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, dialogs, typeOptions, pickType } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const SAME = "Properties from other templates in the collection using the same label.";
const T = (base, afterF) => ({ base, afterF });
const TEXTISH = { base: ["Label", "Hide label", "Required property", "Show in cards", "Use as filter"], after: ["Default filter", "Priority sorting"], cols: "Template, Type" };
const matrix = [
  ["TED-44", "Text", "Text", TEXTISH],
  ["TED-45", "Rich text", "Rich text", { ...TEXTISH, after: ["Default filter"] }],
  ["TED-46", "Numeric", "Numeric", TEXTISH, "Number"],
  ["TED-47", "Date", "Date", TEXTISH],
  ["TED-48", "Multiple dates", "Multiple dates", { ...TEXTISH, after: ["Default filter"] }],
  ["TED-49", "Date range", "Date range", { ...TEXTISH, after: ["Default filter"] }],
  ["TED-50", "Multiple date ranges", "Multiple date ranges", { ...TEXTISH, after: ["Default filter"] }],
  ["TED-51", "Select", "Select", { base: ["Label", "Thesaurus", "Hide label", "Required property", "Show in cards", "Use as filter"], after: ["Default filter", "Priority sorting"], cols: "Template, Type, Thesauri" }],
  ["TED-52", "Multiple select", "Multiple select", { base: ["Label", "Thesaurus", "Hide label", "Required property", "Show in cards", "Use as filter"], after: ["Default filter"], cols: "Template, Type, Thesauri" }],
  ["TED-53", "Relationship", "Relationship", { base: ["Label", "Relationship type", "Entities", "Hide label", "Required property", "Show in cards", "Use as filter"], after: ["Default filter"], cols: "Template, Type, Relation type, Entities, Inherit type" }],
  ["TED-54", "Link", "Link", { base: ["Label", "Hide label", "Required property", "Show in cards"], after: [], cols: "Template, Type" }],
  ["TED-55", "Image", "Image", { base: ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], after: [], cols: "Template, Type" }],
  ["TED-56", "Preview", "Preview", { base: ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], after: [], cols: "Template, Type" }],
  ["TED-57", "Media", "Media", { base: ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], after: [], cols: "Template, Type" }],
  ["TED-58", "Geolocation", "Geolocation", { base: ["Label", "Hide label", "Required property", "Show in cards"], after: [], cols: "Template, Type" }],
  ["TED-59", "Generated ID", "Generated ID", { base: ["Label", "Hide label", "Required property", "Show in cards", "Use as filter"], after: ["Default filter"], cols: "Template, Type" }],
];
const fieldLabels = async (p) => (await dlg(p).locator("label").allInnerTexts()).map(strip).filter((t) => t && t !== "Type");
for (const [id, label, typeLabel, exp, alt] of matrix) {
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  let got = await pickType(page, label);
  let usedLabel = label;
  if (!got && alt) { got = await pickType(page, alt); usedLabel = alt; }
  if (!got) {
    const opts = await typeOptions(page);
    rec(id, "FAIL", `Type "${label}" is not offered in the Property type select (8 options: ${JSON.stringify(opts)}), so the property cannot be added and no fields can be compared.`, "");
    await page.close(); continue;
  }
  const qa = "QA " + label;
  await dlg(page).getByLabel("Label").fill(qa);
  const f0 = await fieldLabels(page);
  // tick every checkbox (visible), then re-read
  const cbs = dlg(page).getByRole("checkbox");
  const n0 = await cbs.count();
  for (let i = 0; i < n0; i++) { const c = cbs.nth(i); if (!(await c.isChecked())) await c.click(); }
  await wait(page, 200);
  const f1 = await fieldLabels(page);
  const text = strip(await dlg(page).innerText());
  const hasSame = text.includes("Properties from other templates");
  await shot(page, id);
  const ticked = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.filter(c => c.checked).map(c => c.getAttribute("aria-label")));
  const add = dlg(page).getByRole("button", { name: "Add property" });
  const addDisabled = await add.isDisabled();
  if (!addDisabled) await add.click();
  await wait(page, 400);
  const open = (await dialogs(page)).length > 0;
  let rowTxt = null;
  if (!open) { const r = propRows(page).filter({ hasText: qa }).first(); rowTxt = strip(await r.innerText()); }
  const expAll = [...exp.base];
  const baseOk = JSON.stringify(f0) === JSON.stringify(expAll);
  const norm = (x) => x === "Required" ? "Required property" : x === "Related template" ? "Entities" : x;
  const extras = f0.map(norm).filter((x) => !expAll.includes(x));
  const missing = expAll.filter((x) => !f0.map(norm).includes(x));
  const pass = baseOk && hasSame && usedLabel === label;
  rec(id, pass ? "PASS" : "FAIL", `Type "${usedLabel}"${usedLabel !== label ? ` (spec name "${label}")` : ""}. Panel field order observed ${JSON.stringify(f0)}; expected ${JSON.stringify(expAll)} then after ticking Use as filter ${JSON.stringify(exp.after)}; after ticking every box: ${JSON.stringify(f1)}. Missing vs expected: ${JSON.stringify(missing)}; shown but not expected for this type: ${JSON.stringify(extras)}. Same-label table present=${hasSame} (expected columns ${exp.cols}). Added row text: "${rowTxt}" (pills for ticked flags: none, flags are inline checkboxes; ticked ${JSON.stringify(ticked)}); panel stayed open=${open}.`, id);
  await page.close();
}
await b.close();
