import { launch, open, S, shot, rows, dialogs, rec, realErrors, wait, axe, notifTitles, logEntries, rail, switchTo, toSettings } from "./common.mjs";
export * from "./common.mjs";
export const openEditor = async (b, name = "Court Case", vp = "desktop", opts = {}) => {
  const c = await open(b, "templates", vp, opts);
  await wait(c.page, 700);
  if (name === "new") await c.page.getByRole("button", { name: "Add template" }).first().click();
  else if (vp === "mobile") await S(c.page).getByText(name, { exact: true }).first().click();
  else await S(c.page).locator('[role=row]', { hasText: name }).first().click();
  await wait(c.page, 500);
  return c;
};
export const footerBtn = (p, name) => S(p).locator("footer").getByRole("button", { name });
export const saveBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create template)$/ });
export const dirtyNow = async (p) => !(await saveBtn(p).isDisabled());
export const propRows = (p) => S(p).locator('[data-part=property]');
export const propNames = async (p) => propRows(p).evaluateAll(rs => rs.map(r => r.querySelector('button[aria-label^="Edit "]')?.innerText.trim()));
export const dlg = (p) => p.locator("[role=dialog][data-part=panel]:not([inert]):not([inert] *)").last();
export const openAdd = async (p) => { await S(p).getByRole("button", { name: "Add property" }).click(); await wait(p, 400); };
export const dlgLines = async (p) => (await dlg(p).innerText()).split("\n").map(s => s.trim()).filter(Boolean);
export const typeOptions = async (p) => { await dlg(p).getByRole("button", { name: /Property type/ }).click(); await wait(p, 250); const o = await p.locator('[role=listbox] [role=option]').allInnerTexts(); return o.map(s=>s.trim()); };
export const pickType = async (p, label) => { await dlg(p).getByRole("button", { name: /Property type/ }).click(); await wait(p, 250); const o = p.locator('[role=listbox] [role=option]').filter({ hasText: new RegExp("^\\s*" + label + "\\s*$") }); if (!(await o.count())) { await p.keyboard.press("Escape"); await wait(p, 200); return false; } await o.first().click(); await wait(p, 250); return true; };
export const strip = (s) => s.replace(/\s+/g, " ").trim();
export const tipText = async (p, loc, how = "hover") => {
  if (how === "hover") { await loc.hover(); } else { await loc.focus(); }
  await wait(p, 350);
  const t = await p.locator('[role=tooltip]').allInnerTexts();
  if (how === "hover") await p.mouse.move(0, 0); else await loc.blur();
  await wait(p, 150);
  return t.map(strip);
};
export const hasKeyErr = (errors) => errors.some((e) => /same key/.test(e));
// console errors other than the baseline atomFamily warning and the Judgments duplicate-key warning (recorded once, on TED-16)
export const errs = (errors) => realErrors(errors).filter((e) => !/same key/.test(e));
export const openBeacon = async (p) => { await p.getByRole("button", { name: /^Notifications/ }).first().click(); await wait(p, 400); };
export const cardFields = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid=settings-content] aside [data-field]')].map(e => e.innerText.replace(/\s+/g, " ").trim()));
export const saveVariant = (p) => saveBtn(p).evaluate(b => { const c = getComputedStyle(b); return { bg: c.backgroundColor, color: c.color, cls: b.className.slice(0, 200) }; });
export const FIELD_NAMES = ["Property type", "Type", "Label", "Style", "Full width", "Thesaurus", "Relationship type", "Entities", "Inherit property", "Hide label", "Required property", "Show in cards", "Use as filter", "Default filter", "Priority sorting", "Generated ID"];
export const fieldSeq = async (p) => {
  const t = await dlg(p).innerText();
  const cut = t.split("Properties from other templates")[0];
  const lines = cut.split("\n").map(s => s.trim());
  const seq = [];
  for (const l of lines) if (FIELD_NAMES.includes(l) && !seq.includes(l)) seq.push(l);
  const i = seq.indexOf("Label");
  return seq.slice(i < 0 ? 0 : i);
};
export const tickAll = async (p) => {
  for (let i = 0; i < 6; i++) {
    const un = dlg(p).locator('[data-part=flags] input[type=checkbox]:not(:checked)');
    if (!(await un.count())) break;
    await un.first().check(); await wait(p, 150);
  }
};
export const sameCols = (p) => dlg(p).locator('[data-part=same-label] th').allTextContents().then(a => a.map(s => s.trim()));
export const pickOpt = async (p, trigger, idxOrText) => {
  await dlg(p).getByRole("button", { name: new RegExp("^" + trigger + ":") }).click(); await wait(p, 200);
  const opts = p.locator('[role=listbox] [role=option]');
  const texts = (await opts.allInnerTexts()).map(s => s.trim());
  const i = typeof idxOrText === "number" ? idxOrText : texts.findIndex(t => t === idxOrText);
  await opts.nth(i).click(); await wait(p, 200);
  return texts;
};
export const rowPills = (p, label) => propRows(p).filter({ has: p.locator(`button[aria-label="Edit ${label}"]`) }).first().evaluate(r => [...r.querySelectorAll("td")[4].querySelectorAll("span")].map(s => s.innerText.trim()));
export const rowType = (p, label) => propRows(p).filter({ has: p.locator(`button[aria-label="Edit ${label}"]`) }).first().evaluate(r => r.querySelectorAll("td")[3].innerText.trim());
