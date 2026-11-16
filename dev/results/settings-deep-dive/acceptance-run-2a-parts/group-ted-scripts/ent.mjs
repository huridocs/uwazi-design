import { S, wait, strip, shot, rail, dlg, openAdd, pickType, pickOpt, tickAll, saveBtn, propNames, rowPills, openEditor } from "./ted-common.mjs";
const lab = (d) => d.getByLabel("Label", { exact: true });
// Add a property to the open template editor (new panel), fill via `fill(d)` after the type is set, then Add property.
export async function addProp(p, { type = "Text", label, fill, flags = [] }) {
  await openAdd(p); const d = dlg(p);
  if (type !== "Text") await pickType(p, type);
  await lab(d).fill(label);
  if (fill) await fill(d);
  for (const f of flags) await d.getByRole("checkbox", { name: f, exact: true }).check();
  await d.getByRole("button", { name: "Add property" }).click(); await wait(p, 350);
}
// Save the template editor; confirm an impact dialog if one opens.
export async function saveTemplate(p) {
  await saveBtn(p).click(); await wait(p, 700);
  const conf = p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
  let impact = null;
  if (await conf.count()) { impact = strip(await conf.first().innerText()); await conf.first().getByRole("button", { name: "Save" }).click(); await wait(p, 700); }
  return impact;
}
export async function toLibrary(p, tpl) {
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await wait(p, 1500);
  if (tpl) { const cb = p.getByRole("checkbox", { name: tpl, exact: true }).first(); if (!(await cb.isChecked())) await cb.check(); await wait(p, 800); }
}
export async function toSettingsTemplates(p) {
  await p.getByRole("button", { name: "Settings", exact: true }).first().click(); await wait(p, 500);
  await p.getByRole("button", { name: /System settings/ }).click().catch(() => {}); await wait(p, 600);
  await rail(p, "Templates"); await wait(p, 600);
}
export async function openTemplate(p, name) {
  await S(p).locator("[role=row]", { hasText: name }).first().click(); await wait(p, 600);
}
export async function createEntity(p, tpl) {
  await p.getByRole("button", { name: "Create " + tpl, exact: true }).click(); await wait(p, 1200);
}
export const field = (p, label) => p.getByLabel(label, { exact: true });
