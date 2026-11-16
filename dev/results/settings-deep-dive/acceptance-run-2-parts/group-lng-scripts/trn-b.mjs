// TRN-04, 05, 06 (keys follow templates and thesauri), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch } from "./u.mjs";
const { rec, save } = recorder("./trn-b.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority/.test(e));
const esc = (k) => k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const inp = (p, key, lang) => S(p).locator(`input[aria-label^="${esc(key)} in ${lang}"]`).first();
const openCtx = async (p, name, type) => { await section(p, "Translations"); const row = S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first(); await row.click(); await p.waitForTimeout(700); };
const keysOf = (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const commit = (p) => p.locator("button:visible").filter({ hasText: /^(Save|Create template)$/ }).last();
const commitC = async (p) => { await commit(p).click(); await p.waitForTimeout(600); const cd = p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]"); if (await cd.count()) { await cd.getByRole("button", { name: /^Save$/ }).click(); await p.waitForTimeout(600); } };
const saveCtx = async (p) => { await commit(p).click(); await p.waitForTimeout(500); };
const cellInfo = (p, key) => S(p).locator("[role=row]").filter({ has: p.locator(`input[aria-label^="${esc(key)} in "]`) }).first().locator("input").evaluateAll(es => es.map(e => `${e.getAttribute("aria-label").replace(/^.* in /, "")}=${e.value}`));

// ---- TRN-04 ----
{
  const { page: p, errors } = await open(b, "templates");
  await S(p).locator("[data-part=row]").filter({ hasText: "Person" }).first().click(); await p.waitForTimeout(900);
  const propNames = await S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.innerText.split("\n")[0].trim()));
  const common = ["Title", "Date added", "Date modified"];
  const props = propNames.filter(n => !common.includes(n));
  const titleLabel = propNames[0];
  await openCtx(p, "Person", "Template");
  const keys = await keysOf(p);
  const expected = ["Person", titleLabel, ...props];
  const sameSet = JSON.stringify([...keys].sort()) === JSON.stringify([...expected].sort());
  const nonEn = await S(p).locator("input[aria-label*=' in ']").evaluateAll(es => es.every(e => /untranslated/.test(e.getAttribute("aria-label"))));
  const s = await sh(p, "TRN-04");
  const ok = sameSet && keys.length === props.length + 2 && nonEn;
  rec("TRN-04", ok ? "PASS" : "FAIL", `Person template editor: title label "${titleLabel}", properties ${JSON.stringify(props)} (${props.length}); Translations context keys ${JSON.stringify(keys)} (${keys.length}, expected properties + 2 = ${props.length + 2}); same set=${sameSet}; every non-English cell flagged untranslated (equal to English)=${nonEn}`, ok ? "" : s);
  rec("_errs-TB1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-05 (M8) ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Hearing", "Template");
  const keys0 = await keysOf(p);
  await inp(p, "Date", "Spanish").fill("Fecha-ES"); await saveCtx(p);
  // rename property label in the template editor
  await section(p, "Templates"); await S(p).locator("[data-part=row]").filter({ hasText: "Hearing" }).first().click(); await p.waitForTimeout(900);
  await S(p).locator("[role=row]").nth(4).getByText("Date", { exact: true }).first().click(); await p.waitForTimeout(600);
  const dlg = p.locator("[role=dialog]").filter({ has: p.locator("button[aria-label=Close], button:has-text('Close')") }).last();
  await p.locator("[role=dialog] input:visible").first().fill("Hearing date");
  await p.locator("[role=dialog]").getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(500);
  await commit(p).click(); await p.waitForTimeout(700);
  await openCtx(p, "Hearing", "Template");
  const keys1 = await keysOf(p);
  const oldGone = !keys1.includes("Date");
  const newKey = keys1.includes("Hearing date");
  const kept = newKey ? await inp(p, "Hearing date", "Spanish").inputValue() : null;
  const s = await sh(p, "TRN-05-rename");
  // delete the property
  await section(p, "Templates"); await S(p).locator("[data-part=row]").filter({ hasText: "Hearing" }).first().click(); await p.waitForTimeout(900);
  await S(p).getByLabel("Select Hearing date").check(); await p.waitForTimeout(300);
  const footerBtns = await p.evaluate(() => [...document.querySelectorAll("button")].filter(e => !e.closest("[inert]") && e.getBoundingClientRect().top > 700).map(e => e.textContent.trim()).filter(Boolean));
  await S(p).getByRole("button", { name: /Delete|Remove/ }).last().click(); await p.waitForTimeout(500);
  const dd = [];
  { const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]"); if (await cd.count()) { dd.push("confirm"); await cd.getByRole("button", { name: /Delete|Remove/ }).last().click(); await p.waitForTimeout(500); } }
  await commitC(p);
  await openCtx(p, "Hearing", "Template");
  const keys2 = await keysOf(p);
  // new template
  await section(p, "Templates"); await S(p).getByRole("button", { name: /Add template/ }).click(); await p.waitForTimeout(800);
  await S(p).getByLabel("Template name").fill("Inquiry");
  await commit(p).click(); await p.waitForTimeout(700);
  await section(p, "Translations");
  const hasNew = (await S(p).locator("[data-part=row]").filter({ hasText: "Inquiry" }).count()) > 0;
  // delete the new template
  await section(p, "Templates");
  await p.waitForTimeout(400);
  const rowsT = await S(p).locator("[data-part=row]").allInnerTexts();
  await S(p).locator("[data-part=row]").filter({ hasText: "Inquiry" }).first().getByRole("checkbox").check().catch(() => {}); await p.waitForTimeout(300);
  await S(p).getByRole("button", { name: /Delete/ }).last().click().catch(() => {}); await p.waitForTimeout(500);
  const dd2 = [];
  { const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]"); if (await cd.count()) { dd2.push(((await cd.innerText()).replace(/\s+/g, " ")).slice(0, 160)); await cd.getByRole("button", { name: /Delete/ }).last().click(); await p.waitForTimeout(700); } }
  await section(p, "Translations");
  const hasAfter = (await S(p).locator("[data-part=row]").filter({ hasText: "Inquiry" }).count()) > 0;
  const ok = oldGone && newKey && kept === "Fecha-ES" && !keys2.includes("Hearing date") && keys2.length === keys0.length - 1 && hasNew && !hasAfter;
  rec("TRN-05", ok ? "PASS" : "FAIL", `Hearing keys before=${JSON.stringify(keys0)}; typed es "Fecha-ES" for key Date and saved; renamed property label Date -> "Hearing date" in Templates and saved; keys now=${JSON.stringify(keys1)}; old key gone=${oldGone}, new key present=${newKey}, es text under new key="${kept}"; after deleting the property keys=${JSON.stringify(keys2)} (dropped=${!keys2.includes("Hearing date")}); new template "Inquiry" adds a context=${hasNew}; after deleting template it is removed=${!hasAfter} (delete dialogs seen: ${JSON.stringify(dd)} / ${JSON.stringify(dd2)})`, ok ? "" : s);
  rec("_errs-TB2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-06 ----
{
  const { page: p, errors } = await open(b, "thesauri");
  await S(p).locator("[data-part=row]").filter({ hasText: "Regions" }).first().click(); await p.waitForTimeout(900);
  const vals = await S(p).locator("input[aria-label^='Select ']").evaluateAll(es => es.map(e => e.getAttribute("aria-label").replace(/^Select /, "")).filter(n => n !== "all"));
  await openCtx(p, "Regions", "Thesaurus");
  const keys = await keysOf(p);
  const expected = ["Regions", ...vals];
  const same = JSON.stringify([...keys].sort()) === JSON.stringify([...expected].sort());
  await inp(p, "Caribbean", "Spanish").fill("Caribe-ES"); await saveCtx(p);
  // add a value
  await section(p, "Thesauri"); await S(p).locator("[data-part=row]").filter({ hasText: "Regions" }).first().click(); await p.waitForTimeout(900);
  await S(p).getByRole("button", { name: "Add value", exact: true }).click(); await p.waitForTimeout(400);
  const ae = await p.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("aria-label") || ""));
  await p.keyboard.type("Oceania"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  const afterAdd = await S(p).locator("input[aria-label^='Select '], input[aria-label=Value]").evaluateAll(es => es.map(e => e.getAttribute("aria-label") + (e.value ? "=" + e.value : "")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  // rename Caribbean
  await S(p).getByRole("button", { name: "Caribbean, rename" }).click(); await p.waitForTimeout(300);
  await p.keyboard.press("Control+A").catch(() => {}); await p.keyboard.press("Meta+A").catch(() => {});
  await p.keyboard.type("The Caribbean"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  const afterRename = await S(p).locator("input[aria-label^='Select ']").evaluateAll(es => es.map(e => e.getAttribute("aria-label")));
  const s0 = await sh(p, "TRN-06-thesaurus");
  await commit(p).click(); await p.waitForTimeout(700);
  await openCtx(p, "Regions", "Thesaurus");
  const keys2 = await keysOf(p);
  const addedCells = keys2.includes("Oceania") ? await cellInfo(p, "Oceania") : null;
  const renamed = keys2.includes("The Caribbean") ? await inp(p, "The Caribbean", "Spanish").inputValue() : null;
  const s = await sh(p, "TRN-06");
  const allSame = addedCells && addedCells.every(c => /=Oceania$/.test(c));
  const ok = same && keys.length === vals.length + 1 && keys2.includes("Oceania") && allSame && !keys2.includes("Caribbean") && renamed === "Caribe-ES";
  rec("TRN-06", ok ? "PASS" : "FAIL", `Regions values in Thesauri editor (${vals.length}, groups and children): ${JSON.stringify(vals)}; context keys (${keys.length}): same set as name + values=${same}; added value via "Add value" focus=${ae}; context now has "Oceania"=${keys2.includes("Oceania")} cells ${JSON.stringify(addedCells)}; Thesauri editor after Add value: ${JSON.stringify(afterAdd.slice(-3))}; after rename: ${JSON.stringify(afterRename.filter(x => /Carib|Oceania/.test(x)))}; renamed Caribbean -> "The Caribbean": old key gone=${!keys2.includes("Caribbean")}, es text kept="${renamed}" (typed "Caribe-ES")`, ok ? "" : s);
  rec("_errs-TB3", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
