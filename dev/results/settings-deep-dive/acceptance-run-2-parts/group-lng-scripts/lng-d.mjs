// LNG-11..16, PO1, PO3 (default change, reset, uninstall, propagation), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch, notifTitles, logEntries } from "./u.mjs";
const { rec, save } = recorder("./lng-d.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|React does not recognize the `%s` prop/.test(e));
const names = (p) => S(p).locator("[role=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));
const pickMenu = async (p, name, label) => { await S(p).getByRole("button", { name: `Actions for ${name}` }).click(); await p.waitForTimeout(200); await p.locator("[role=menu] button, [role=menuitem]").filter({ hasText: new RegExp(`^${label}$`) }).first().click(); await p.waitForTimeout(400); };
const openCtx = async (p, name) => { await section(p, "Translations"); await S(p).locator("[data-part=row]").filter({ hasText: name }).first().click(); await p.waitForTimeout(700); };
const headers = (p) => S(p).locator("[role=columnheader]").allInnerTexts();
const esc = (k) => k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const inp = (p, key, lang) => S(p).locator(`input[aria-label^="${esc(key)} in ${lang}"]`).first();
const setCell = async (p, key, lang, value) => { await inp(p, key, lang).fill(value); };
const cellVal = async (p, key, lang) => inp(p, key, lang).inputValue();
const saveCtx = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(500); };

// ---- LNG-11 + LNG-12 ----
{
  const { page: p, errors } = await open(b, "languages");
  await pickMenu(p, "Spanish", "Make default");
  const dlgs = await dialogs(p);
  const dlgTxt = (await p.locator("[data-component=ConfirmDialog]").first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const s11a = await sh(p, "LNG-11-confirm");
  // Cancel changes nothing
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300);
  const afterCancel = await names(p); const nCancel = await notifMatch(p, /Default language change success/);
  await pickMenu(p, "Spanish", "Make default");
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Make default" }).click(); await p.waitForTimeout(600);
  const after = await names(p);
  const n = await notifMatch(p, /Default language change success/);
  const log = (await logEntries(p)).filter(x => /default/i.test(x));
  // Activity log page
  await section(p, "Activity log"); await p.waitForTimeout(600);
  const actRows = (await S(p).innerText()).split("\n").map(t => t.replace(/\s+/g, " ").trim()).filter(t => /default language/i.test(t));
  const effect = /source for later installs|later|reference|untranslated/i.test(dlgTxt) && /untranslated/i.test(dlgTxt);
  const ok11 = dlgs.length >= 1 && effect && afterCancel.some(x => /English.*Default/.test(x)) && nCancel.length === 0 && after.some(x => /Spanish.*Default/.test(x)) && !after.some(x => /English.*Default/.test(x)) && n.length === 1 && log.length === 1 && actRows.length >= 1;
  rec("LNG-11", ok11 ? "PASS" : "FAIL", `confirm dialog="${dlgTxt}"; after Cancel default still English=${afterCancel.some(x => /English.*Default/.test(x))}, notices=${nCancel.length}; after confirm Default badge on Spanish=${after.some(x => /Spanish.*Default/.test(x))}, English badge gone=${!after.some(x => /English.*Default/.test(x))}; Beacon entries "Default language change success"=${n.length}; session activity entries=${JSON.stringify(log)}; Activity log page rows=${JSON.stringify(actRows)}`, ok11 ? "" : s11a);
  // LNG-12
  await openCtx(p, "User Interface");
  const hd = await headers(p);
  const srcCell = await S(p).locator("[role=row]").nth(1).evaluate(r => ({ inputs: [...r.querySelectorAll("input")].map(i => i.getAttribute("aria-label")), text: r.innerText.replace(/\s+/g, " ").slice(0, 120) }));
  const pillCls = await S(p).locator("[role=columnheader] span.uppercase").evaluateAll(es => es.map(e => e.textContent + ":" + (e.className.match(/bg-[a-z-]+/) || [""])[0]));
  const enCells = await S(p).locator('input[aria-label*=" in English"]').evaluateAll(es => es.slice(0, 5).map(e => e.getAttribute("aria-label")));
  const rowTxt = (await S(p).locator("[role=row]").nth(2).innerText()).replace(/\s+/g, " ");
  const s12 = await sh(p, "LNG-12");
  const srcShowsSpanish = !/the status/.test(rowTxt.split(" in ")[0] || "") && /el estado/.test(rowTxt);
  const ok12 = srcShowsSpanish && /Español/.test(hd[1] || "") && !srcCell.inputs.some(a => / in Spanish/.test(a || "")) && pillCls.some(x => /^ES:bg-ink/.test(x)) && enCells.length > 0;
  rec("LNG-12", ok12 ? "PASS" : "FAIL", `headers=${JSON.stringify(hd)}; first row inputs=${JSON.stringify(srcCell.inputs)} (Spanish has no input => read-only source); pill classes=${JSON.stringify(pillCls)}; English cells now inputs=${JSON.stringify(enCells.slice(0, 2))}; second key row text="${rowTxt}" (Spanish predefined text for this key is "el estado"~5; the Español source column ${srcShowsSpanish ? "shows it" : "does not show it"})`, ok12 ? "" : s12);
  rec("_errs-D1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-13: Reset dialog ----
{
  const { page: p, errors } = await open(b, "languages");
  await pickMenu(p, "Spanish", "Reset");
  const dlg = p.getByRole("dialog");
  const D = p.locator("[data-component=TypedConfirmModal]");
  const txt = (await D.innerText()).replace(/\s+/g, " ");
  const name = await dlg.first().getAttribute("aria-label").catch(() => null);
  const hdr = await D.locator("h2, h3").first().innerText().catch(() => "");
  const closeX = await D.getByRole("button", { name: /Close/ }).count();
  const input = D.getByRole("textbox");
  const label = await D.locator("label").evaluateAll(es => es.map(e => e.textContent.replace(/\u00a0/g, " ")));
  const btn = D.locator("[data-part=confirm]");
  const w = await D.locator("[role=dialog]").first().evaluate(e => Math.round(e.getBoundingClientRect().width)).catch(() => null);
  const dis0 = await btn.isDisabled();
  const tries = {};
  for (const v of ["confirm", "CONFIRM ", " CONFIRM", "CONFIRM"]) { await input.fill(v); await p.waitForTimeout(100); tries[JSON.stringify(v)] = await btn.isDisabled(); }
  const s13 = await sh(p, "LNG-13");
  // close with No, cancel, reopen: empty
  await D.locator("[data-part=cancel]").click(); await p.waitForTimeout(300);
  await pickMenu(p, "Spanish", "Reset");
  const v2 = await D.getByRole("textbox").inputValue();
  // close via X
  await D.getByRole("button", { name: /Close/ }).first().click().catch(async () => { await p.keyboard.press("Escape"); }); await p.waitForTimeout(300);
  const closedByX = (await p.locator("[data-component=TypedConfirmModal]").count()) === 0;
  const rowsA = await names(p); const notes = await notifMatch(p, /Language reset success/);
  const parts13 = [/Are you sure\?/.test(txt), /Other users will be affected by this action!/.test(txt), /You are about to reset a language\./.test(txt), label.some(l => /Please type in CONFIRM:/.test(l)), /No, cancel/.test(txt), dis0, tries['"confirm"'], tries['"CONFIRM "'], !tries['"CONFIRM"'], /System/.test(txt), /\d+ keys?/.test(txt), v2 === "", closedByX, notes.length === 0]; console.log("parts13", JSON.stringify(parts13));
  const ok13 = /Are you sure\?/.test(txt) && /Other users will be affected by this action!/.test(txt) && /You are about to reset a language\./.test(txt) && label.some(l => /Please type in CONFIRM:/.test(l)) && /No, cancel/.test(txt) && dis0 && tries['"confirm"'] && tries['"CONFIRM "'] && !tries['"CONFIRM"'] && /System/.test(txt) && /\d+ keys?/.test(txt) && v2 === "" && closedByX && notes.length === 0;
  rec("LNG-13", ok13 ? "PASS" : "FAIL", `dialog text="${txt}"; label=${JSON.stringify(label)}; width=${w}; close X buttons=${closeX}; Reset disabled at start=${dis0}; disabled for ${JSON.stringify(tries)}; reopened input value="${v2}"; X/Escape closed=${closedByX}; no reset notice=${notes.length === 0}`, ok13 ? "" : s13);
  rec("_errs-D2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-14: Uninstall dialog ----
{
  const { page: p, errors } = await open(b, "languages");
  await pickMenu(p, "French", "Uninstall");
  const D = p.locator("[data-component=TypedConfirmModal]");
  const txt = (await D.innerText()).replace(/\s+/g, " ");
  const label = await D.locator("label").evaluateAll(es => es.map(e => e.textContent.replace(/\u00a0/g, " ")));
  const btn = D.locator("[data-part=confirm]");
  const dis0 = await btn.isDisabled();
  await D.getByRole("textbox").fill("confirm"); const disLower = await btn.isDisabled();
  await D.getByRole("textbox").fill("CONFIRM"); const disOk = await btn.isDisabled();
  const confirmText = (await btn.innerText()).trim();
  const s14 = await sh(p, "LNG-14");
  await D.locator("[data-part=cancel]").click(); await p.waitForTimeout(300);
  const rowsA = await names(p);
  const parts14 = {a:/Are you sure\?/.test(txt), b:/You are about to uninstall a language\./.test(txt), c:confirmText === "Uninstall", d:dis0, e:disLower, f:!disOk, g:/Please type in CONFIRM:/.test(label.join(" ")), h:/entit|record|version/i.test(txt), i:/translated key/i.test(txt), j:rowsA.some(x => /French/.test(x))}; console.log("parts14", JSON.stringify(parts14));
  const ok14 = /Are you sure\?/.test(txt) && /You are about to uninstall a language\./.test(txt) && confirmText === "Uninstall" && dis0 && disLower && !disOk && /Please type in CONFIRM:/.test(label.join(" ")) && /entit|record|version/i.test(txt) && /translated key/i.test(txt) && rowsA.some(x => /French/.test(x));
  rec("LNG-14", ok14 ? "PASS" : "FAIL", `dialog text="${txt}"; accept="${confirmText}" disabled initially=${dis0}, "confirm"=${disLower}, "CONFIRM"=${disOk}; after No, cancel French still listed=${rowsA.some(x => /French/.test(x))}`, ok14 ? "" : s14);
  rec("_errs-D3", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-15: Reset es after edits ----
{
  const { page: p, errors } = await open(b, "languages");
  await openCtx(p, "User Interface");
  const sysKey = await S(p).locator("[role=row]").nth(1).locator("input").first().getAttribute("aria-label");
  // choose a key with a predefined Spanish text: find first Spanish input whose aria-label has no ", untranslated"
  const target = await S(p).locator('input[aria-label*=" in Spanish"]').evaluateAll(es => { const e = es.find(x => !/untranslated/.test(x.getAttribute("aria-label"))); return e ? { label: e.getAttribute("aria-label"), v: e.value } : null; });
  const keyName = target.label.replace(/ in Spanish.*$/, "");
  await inp(p, keyName, "Spanish").fill("EDITADO-SISTEMA");
  await saveCtx(p);
  const sysEdited = await cellVal(p, keyName, "Spanish");
  // template context key
  await section(p, "Translations");
  const tplRows = await S(p).locator("[data-part=row]").allInnerTexts();
  const tplName = tplRows.map(t => t.split("\n")[0].trim()).find(t => !["User Interface", "Menu", "Filters"].includes(t));
  await S(p).locator("[data-part=row]").filter({ hasText: tplName }).first().click(); await p.waitForTimeout(600);
  const tplKeyLabel = await S(p).locator("[role=row]").nth(1).locator("input").first().getAttribute("aria-label");
  const tplKey = tplKeyLabel.replace(/ in .*$/, "");
  await inp(p, tplKey, "Spanish").fill("EDITADO-TEMPLATE");
  await saveCtx(p);
  const before = await names(p).catch(() => []);
  await section(p, "Languages"); await p.waitForTimeout(400);
  const langRowsBefore = await names(p);
  await pickMenu(p, "Spanish", "Reset");
  const D = p.locator("[data-component=TypedConfirmModal]");
  await D.getByRole("textbox").fill("CONFIRM"); await D.locator("[data-part=confirm]").click(); await p.waitForTimeout(600);
  const notes = await notifMatch(p, /Language reset success/);
  const langRowsAfter = await names(p);
  const act = (await logEntries(p)).filter(x => /Reset/i.test(x));
  await openCtx(p, "User Interface");
  const sysAfter = await cellVal(p, keyName, "Spanish");
  const s15 = await sh(p, "LNG-15");
  await section(p, "Translations");
  await S(p).locator("[data-part=row]").filter({ hasText: tplName }).first().click(); await p.waitForTimeout(600);
  const tplAfter = await cellVal(p, tplKey, "Spanish");
  const ok15 = notes.length === 1 && sysAfter === target.v && tplAfter === "EDITADO-TEMPLATE" && JSON.stringify(langRowsBefore) === JSON.stringify(langRowsAfter) && act.length >= 1;
  rec("LNG-15", ok15 ? "PASS" : "FAIL", `System key "${keyName}" predefined es text="${target.v}", edited to "${sysEdited}" and saved; template context "${tplName}" key "${tplKey}" edited to EDITADO-TEMPLATE and saved; Reset es confirmed; Beacon "Language reset success" entries=${notes.length}; System key after Reset="${sysAfter}" (expected "${target.v}"); template key after Reset="${tplAfter}" (expected unchanged); Languages table unchanged=${JSON.stringify(langRowsBefore) === JSON.stringify(langRowsAfter)}; activity entries=${JSON.stringify(act)}`, ok15 ? "" : s15);
  rec("_errs-D4", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-16: uninstall with edit, then reinstall ----
{
  const { page: p, errors } = await open(b, "languages");
  await openCtx(p, "User Interface");
  const keyLabel = await S(p).locator("[role=row]").nth(1).locator("input").first().getAttribute("aria-label");
  const keyName = keyLabel.replace(/ in .*$/, "");
  await inp(p, keyName, "Portuguese").fill("EDITADO-PT");
  await saveCtx(p);
  await section(p, "Languages");
  await pickMenu(p, "Portuguese", "Uninstall");
  const D = p.locator("[data-component=TypedConfirmModal]");
  await D.getByRole("textbox").fill("CONFIRM"); await D.locator("[data-part=confirm]").click(); await p.waitForTimeout(400);
  const rowsA = await names(p);
  const pend = await notifMatch(p, /Uninstalling language/);
  let done = [];
  for (let i = 0; i < 12 && !done.length; i++) { await p.waitForTimeout(700); done = await notifMatch(p, /Language uninstalled successfully/); }
  await p.waitForTimeout(500);
  const pendAfter = await notifMatch(p, /Uninstalling language/);
  await openCtx(p, "User Interface");
  const hd = await headers(p);
  const gone = !hd.some(h => /Português/.test(h));
  await section(p, "Languages");
  // reinstall
  await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await p.waitForTimeout(300);
  await p.locator("[data-component=InstallLanguagesModal] [data-part=language]").filter({ hasText: "Portuguese (pt)" }).click();
  await p.locator("[data-component=InstallLanguagesModal] [data-part=confirm]").click();
  await p.waitForTimeout(4500);
  await openCtx(p, "User Interface");
  const re = await cellVal(p, keyName, "Portuguese");
  const s16 = await sh(p, "LNG-16");
  const ok16 = !rowsA.some(x => /Portuguese/.test(x)) && pend.length >= 1 && done.length >= 1 && gone && re === keyName;
  rec("LNG-16", ok16 ? "PASS" : "FAIL", `edited pt cell "${keyName}" -> EDITADO-PT, saved; uninstalled pt: row gone=${!rowsA.some(x => /Portuguese/.test(x))}; task "Uninstalling language" while pending=${pend.length}; "Language uninstalled successfully" entries=${done.length}; Translations User Interface lost pt column=${gone}; Dashboard language count: no Dashboard language count exists; after reinstalling pt the cell reads "${re}" (expected the default text "${keyName}", not the old edit)`, ok16 ? "" : s16);
  rec("_errs-D5", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-PO1 ----
{
  const { page: p, errors } = await open(b, "languages");
  const r1 = await names(p);
  const pct1 = r1.map(x => (x.match(/(\d+)\s?%/) || [])[0] || null);
  await openCtx(p, "User Interface");
  const target = await S(p).locator('input[aria-label*=" in French"]').evaluateAll(es => { const e = es.find(x => /untranslated/.test(x.getAttribute("aria-label"))); return e.getAttribute("aria-label").replace(/ in French.*$/, ""); });
  await setCell(p, target, "French", "EDITADO-FR"); await saveCtx(p);
  await section(p, "Languages"); await p.waitForTimeout(400);
  const r2 = await names(p);
  const pct2 = r2.map(x => (x.match(/(\d+)\s?%/) || [])[0] || null);
  const s = await sh(p, "LNG-PO1");
  const ok = pct1.every(Boolean) && JSON.stringify(pct1) !== JSON.stringify(pct2);
  rec("LNG-PO1", ok ? "PASS" : "FAIL", `rows before an edit: ${JSON.stringify(r1)}; percentages read=${JSON.stringify(pct1)}; after saving a French cell in Translations and returning: ${JSON.stringify(r2)} percentages=${JSON.stringify(pct2)}`, ok ? "" : s);
  rec("_errs-D6", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-PO3 (A6) ----
{
  const { page: p, errors } = await open(b, "languages");
  const ui = () => p.evaluate(() => ({
    rail: document.querySelector('nav[aria-label="Settings navigation"]')?.innerText.replace(/\s+/g, " "),
    nav: document.querySelector("header [data-part=primary-nav]")?.innerText.replace(/\s+/g, " "),
    h2: document.querySelector('[data-testid="settings-content"] h2')?.textContent,
  }));
  const before = await ui();
  const pickers = await p.locator('[aria-label*="language" i][role=combobox], select[aria-label*="language" i], [data-part=language-picker]').count();
  await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await p.waitForTimeout(300);
  await p.locator("[data-component=InstallLanguagesModal] [data-part=language]").filter({ hasText: "German (de)" }).click();
  await p.locator("[data-component=InstallLanguagesModal] [data-part=confirm]").click();
  await p.waitForTimeout(4500);
  await pickMenu(p, "German", "Make default");
  await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Make default" }).click(); await p.waitForTimeout(500);
  const langs = await names(p);
  await openCtx(p, "User Interface");
  const hd = await headers(p);
  const sysKey = await S(p).locator("[role=row]").nth(2).locator("input").first().getAttribute("aria-label");
  const keyName = sysKey.replace(/ in .*$/, "");
  const lang1 = sysKey.replace(/^.* in /, "").replace(/,.*/, "");
  await inp(p, keyName, lang1).fill("EDITADO-UI");
  await saveCtx(p);
  const mid = await ui();
  await section(p, "Languages");
  const after = await ui();
  const s = await sh(p, "LNG-PO3");
  const same = before.rail === after.rail && before.nav === after.nav && before.h2 === after.h2 && mid.nav === before.nav;
  const follows = langs.some(x => /German.*Default/.test(x)) && /Deutsch/.test(hd[1] || "");
  const ok = same && follows;
  rec("LNG-PO3", ok ? "PASS" : "FAIL", `language pickers found=${pickers}; German installed and made default: Languages list=${JSON.stringify(langs)}; Translations source column header="${hd[1]}"; edited "${keyName}" (${lang1}) and saved; rail text, navbar text and page title unchanged=${same}${same ? "" : " BEFORE=" + JSON.stringify(before) + " AFTER=" + JSON.stringify(after)}`, ok ? "" : s);
  rec("_errs-D7", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
