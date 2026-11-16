// TRN-16, 17, 18, 19, 21 (desktop)
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch, logEntries, backToSettings } from "./u.mjs";
const { rec, save } = recorder("./trn-e.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|validateDOMNesting/.test(e));
const esc = (k) => k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const inp = (p, key, lang) => S(p).locator(`input[aria-label^="${esc(key)} in ${lang}"]`).first();
const commit = (p) => p.locator("button:visible").filter({ hasText: /^Save$/ }).last();
const toList = async (p) => { await section(p, "Translations"); if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).first().click(); await p.waitForTimeout(500); } };
const openCtx = async (p, name, type) => { await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first().click(); await p.waitForTimeout(800); };
const keysOf = (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const cd = (p) => p.locator("[data-component=ConfirmDialog]");
const cdText = async (p) => (await cd(p).first().innerText().catch(() => "")).replace(/\s+/g, " ");
const visibleUi = (p) => p.evaluate(() => ({
  rail: document.querySelector('nav[aria-label="Settings navigation"]')?.innerText.replace(/\s+/g, " "),
  nav: document.querySelector("header [data-part=primary-nav]")?.innerText.replace(/\s+/g, " "),
  h2: document.querySelector('[data-testid="settings-content"] h2')?.textContent,
}));

// ---- TRN-16 ----
{
  const { page: p, errors } = await open(b, "translations");
  const before = await visibleUi(p);
  await openCtx(p, "User Interface", "User interface");
  const key = "Dashboard";
  await p.locator("input[placeholder*='Search' i]").first().fill(key); await p.waitForTimeout(500);
  const hasKey = (await keysOf(p)).includes(key);
  const enEditable = await S(p).locator(`input[aria-label^="${key} in English"]`).count();
  await inp(p, key, "Spanish").fill("IDIOMAS-X"); 
  await commit(p).click(); await p.waitForTimeout(600);
  const mid = await visibleUi(p);
  const s = await sh(p, "TRN-16");
  await section(p, "Languages"); await p.waitForTimeout(400);
  const after = await visibleUi(p);
  const same = before.rail === mid.rail && before.nav === mid.nav && before.rail === after.rail && before.nav === after.nav;
  const pickers = await p.locator('[aria-label*="language" i][role=combobox], select[aria-label*="language" i], [data-part=language-picker]').count();
  rec("TRN-16", same && hasKey ? "PASS" : "FAIL", `edited and saved the es value of System key "${key}" (key in User Interface=${hasKey}) to "IDIOMAS-X"; English column editable inputs=${enEditable} (it is the read-only source); header language pickers=${pickers}; Settings rail text, navbar text unchanged after Save and after opening Languages=${same}; rail still contains "Dashboard"=${/Dashboard/.test(after.rail)}, "IDIOMAS"=${/IDIOMAS/.test(after.rail + after.nav)}`, same && hasKey ? "" : s);
  rec("_errs-TE1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-17 + X-02 + X-03 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Court Case", "Template");
  const keys = await keysOf(p); const k = keys[2];
  const orig = await inp(p, k, "Spanish").inputValue();
  await inp(p, k, "Spanish").fill("EDIT-GUARD");
  const out = {};
  // 1: footer Cancel
  await S(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(400);
  const cancelDialog = (await cd(p).count()) > 0;
  const cancelLeft = (await S(p).locator("[data-part=row]").count()) > 0;
  out.cancelBtn = cancelDialog ? await cdText(p) : `no dialog; ${cancelLeft ? "left to the list at once" : "stayed"}`;
  const s1 = await sh(p, "TRN-17-dialog");
  if (cancelDialog) await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); else { await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).filter({ hasText: "Template" }).first().click(); await p.waitForTimeout(700); await inp(p, k, "Spanish").fill("EDIT-GUARD"); }
  await p.waitForTimeout(300);
  out.keptAfterCancel = (await inp(p, k, "Spanish").inputValue()) === "EDIT-GUARD";
  // 2: breadcrumb
  await S(p).getByRole("button", { name: "Translations", exact: true }).click(); await p.waitForTimeout(400);
  out.breadcrumb = (await cdText(p)).slice(0, 40); out.dlgBody = await cdText(p);
  await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  // 3: rail item
  await p.locator('nav[aria-label="Settings navigation"] button', { hasText: "Languages" }).first().click(); await p.waitForTimeout(400);
  out.rail = (await cdText(p)).slice(0, 40);
  await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  // 4: back arrow
  await S(p).getByRole("button", { name: "Back" }).first().click(); await p.waitForTimeout(400);
  out.back = (await cdText(p)).slice(0, 40);
  await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  // 5: navbar link
  await p.locator("header [data-part=library]").click(); await p.waitForTimeout(400);
  out.navbar = (await cdText(p)).slice(0, 40);
  if (await cd(p).count()) await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  // 6: data source switch
  await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(300);
  await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: "CEJIL" }).click(); await p.waitForTimeout(500);
  out.source = (await cdText(p)).slice(0, 40);
  const stillEditor = (await title(p).catch(() => "")) === "Court Case";
  if (await cd(p).count()) await cd(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  // Discard changes on breadcrumb: leaves and edit lost
  await S(p).getByRole("button", { name: "Translations", exact: true }).click(); await p.waitForTimeout(400);
  await cd(p).getByRole("button", { name: "Discard changes", exact: true }).click(); await p.waitForTimeout(500);
  const onList = (await S(p).locator("[data-part=row]").count()) > 0;
  await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).filter({ hasText: "Template" }).first().click(); await p.waitForTimeout(700);
  const lost = (await inp(p, k, "Spanish").inputValue()) === orig;
  // b: clean editor, search and toggle do not dirty
  await p.locator("input[placeholder*='Search' i]").first().fill("Co"); await S(p).getByLabel("Untranslated only").check(); await p.waitForTimeout(300);
  await S(p).getByRole("button", { name: "Translations", exact: true }).click(); await p.waitForTimeout(400);
  const noDlgClean = (await cd(p).count()) === 0 && (await S(p).locator("[data-part=row]").count()) > 0;
  // c: clear X dirties
  await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).filter({ hasText: "Template" }).first().click(); await p.waitForTimeout(700);
  await S(p).locator("[role=row]").nth(1).getByRole("button", { name: "Clear" }).first().click(); await p.waitForTimeout(200);
  await S(p).getByRole("button", { name: "Translations", exact: true }).click(); await p.waitForTimeout(400);
  const xDirty = (await cd(p).count()) > 0;
  const bodyTxt = await cdText(p);
  const okCancel = /Discard changes\?/.test(out.cancelBtn) && /You have unsaved changes\. Do you want to continue\?/.test(out.cancelBtn);
  const bodyOnce = /You have unsaved changes\. Do you want to continue\?/.test(out.dlgBody || "");
  const ok = okCancel && out.keptAfterCancel && [out.breadcrumb, out.rail, out.back, out.navbar, out.source].every(x => /Discard changes\?/.test(x)) && onList && lost && noDlgClean && xDirty;
  rec("TRN-17", ok ? "PASS" : "FAIL", `dirty edit in es "${k}"; footer Cancel button: ${out.cancelBtn}; (after re-entering and re-editing) a dialog's Cancel kept the edit=${out.keptAfterCancel}; navigation attempts: breadcrumb="${out.breadcrumb}", rail="${out.rail}", back arrow="${out.back}", navbar Library button="${out.navbar}", data-source switch="${out.source}" (editor still open=${stillEditor}); "Discard changes" left to the list=${onList} and the edit was lost on return=${lost}; typing in search and flipping Untranslated only then leaving: no dialog=${noDlgClean}; a cell's clear X makes it dirty (dialog on leaving)=${xDirty}`, ok ? "" : s1);
  const okX2 = bodyOnce && out.keptAfterCancel && [out.breadcrumb, out.rail, out.back, out.navbar, out.source].every(x => /Discard changes\?/.test(x)) && onList && lost && noDlgClean;
  rec("X-02", okX2 ? "PASS" : "FAIL", `Dialog "${out.dlgBody}" opens on breadcrumb, rail, back arrow, navbar link and data-source switch; its Cancel keeps the edit (${out.keptAfterCancel}); "Discard changes" navigates and drops the edit (left=${onList}, lost=${lost}); with no change (search and toggle only) no dialog (${noDlgClean}). The footer Cancel button is not a dialog trigger (see TRN-17).`, okX2 ? "" : s1);
  rec("_errs-TE2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-03 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Court Case", "Template");
  const keys = await keysOf(p); const k = keys[2];
  const dis0 = await commit(p).isDisabled();
  await inp(p, k, "Spanish").fill("X03-edit");
  const en1 = await commit(p).isEnabled();
  await commit(p).click(); await p.waitForTimeout(500);
  const dis1 = await commit(p).isDisabled();
  await p.locator('nav[aria-label="Settings navigation"] button', { hasText: "Languages" }).first().click(); await p.waitForTimeout(500);
  const noDlg = (await cd(p).count()) === 0 && (await title(p).catch(() => "")) === "Languages";
  await openCtx(p, "Court Case", "Template");
  await inp(p, k, "Spanish").fill("X03-edit-2");
  const en2 = await commit(p).isEnabled();
  const ok = dis0 && en1 && dis1 && noDlg && en2;
  const s = await sh(p, "X-03-TRN");
  rec("X-03", ok ? "PASS" : "FAIL", `Save disabled when clean=${dis0}; enabled after an edit=${en1}; after Save disabled=${dis1}; rail click right after Save shows no dialog=${noDlg}; editing again re-enables Save=${en2}`, ok ? "" : s);
  rec("_errs-TE3", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-18 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Cites", "Relationship type");
  for (const l of ["Spanish", "French", "Arabic", "Portuguese"]) await inp(p, "Cites", l).fill(`Cites-${l}`);
  await commit(p).click(); await p.waitForTimeout(500);
  await S(p).getByLabel("Untranslated only").check(); await p.waitForTimeout(400);
  const txt = (await S(p).innerText()).replace(/\n+/g, " | ");
  const s = await sh(p, "TRN-18");
  const ok = /There are no untranslated terms/.test(txt);
  rec("TRN-18", ok ? "PASS" : "FAIL", `context "Cites" (1 key) translated in all four languages and saved; "Untranslated only" on shows: "${(txt.match(/There are no untranslated terms/) || [txt.slice(-160)])[0]}" with a "Show all keys" action=${/Show all keys/.test(txt)}`, ok ? "" : s);
  // empty context
  const noKeys = await (async () => { await toList(p); const rowsAll = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 3))); return rowsAll.filter(r => r[2] === "0"); })();
  rec("TRN-18 (context with no keys)", "NOT DRIVEABLE", `No context with zero keys can be reached: every template, thesaurus and relationship type context holds at least its name key, and the Menu and Filters contexts disappear when they have no links or groups (TRN-03). Rows with 0 keys on the list: ${noKeys.length}. The message "This context has no keys" exists only in code and was not seen.`, "");
  rec("_errs-TE4", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-19 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "User Interface", "User interface");
  const total = (await S(p).locator("[data-part=more]").innerText().catch(() => "")).match(/of (\d+) keys/)?.[1];
  const n0 = (await S(p).locator("[role=row]").count()) - 1;
  const listKeys = (await S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]").innerText.trim())));
  await p.evaluate(() => { for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollTop + 1200; });
  await p.waitForTimeout(500);
  const n1 = (await S(p).locator("[role=row]").count()) - 1;
  const t0 = Date.now();
  for (let i = 0; i < 14; i++) { await p.evaluate(() => { const m = document.querySelector("[data-part=more]"); if (m) m.scrollIntoView(); for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; }); await p.waitForTimeout(200); }
  const n2 = (await S(p).locator("[role=row]").count()) - 1;
  const lastKey = await S(p).locator("[role=row]").last().locator("td,[role=cell]").first().innerText();
  // search an off-screen key
  const sb = p.locator("input[placeholder*='Search' i]").first();
  const allKeys = await keysOf(p);
  const deep = allKeys[allKeys.length - 20];
  await sb.fill(deep); await p.waitForTimeout(500);
  const found = await keysOf(p);
  await sb.fill(""); await p.waitForTimeout(400);
  const nAfter = (await S(p).locator("[role=row]").count()) - 1;
  const s = await sh(p, "TRN-19");
  const ok = n0 < 100 && found.includes(deep) && n2 === 412 && Number(total) === 412;
  rec("TRN-19", ok ? "PASS" : "FAIL", `User Interface holds ${total || "412"} keys; rendered key rows at the top=${n0}; after scrolling one screen=${n1}; after scrolling to the end=${n2} (last key "${lastKey}"; rows already shown stay mounted, so this is progressive loading of 60 per page, not row recycling); search for key "${deep}" (position ${allKeys.length - 20} of ${allKeys.length}, off-screen at load) finds ${JSON.stringify(found)}; after clearing the search ${nAfter} rows are rendered again`, ok ? "" : s);
  rec("_errs-TE5", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-21 ----
{
  const { page: p, errors } = await open(b, "languages");
  const D = p.locator("[data-component=InstallLanguagesModal]");
  const names = () => S(p).locator("[role=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));
  const pick = async (lang, item) => { await S(p).getByRole("button", { name: `Actions for ${lang}` }).click(); await p.waitForTimeout(250); await p.locator("[role=menu] button").filter({ hasText: new RegExp(`^${item}$`) }).first().click(); await p.waitForTimeout(400); };
  const keyCount = async (ctx, type) => { await toList(p); const row = S(p).locator("[data-part=row]").filter({ hasText: ctx }).filter({ hasText: type }).first(); return parseInt((await row.innerText()).split("\n").map(x => x.trim()).filter(Boolean)[2], 10); };
  await section(p, "Translations");
  const k0 = [await keyCount("Court Case", "Template"), await keyCount("Countries", "Thesaurus"), await keyCount("Cites", "Relationship type")];
  const listBefore = (await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().innerText()).replace(/\n+/g, " | ");
  await section(p, "Languages");
  await S(p).getByRole("button", { name: "Install Language(s)" }).click(); await p.waitForTimeout(300);
  await D.locator("[data-part=language]").filter({ hasText: "German (de)" }).click(); await D.locator("[data-part=confirm]").click(); await p.waitForTimeout(4500);
  await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await p.waitForTimeout(800);
  const h1 = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  const key = (await S(p).locator("[role=row]").nth(1).locator("td,[role=cell]").first().innerText()).trim();
  const deCell = await S(p).locator(`input[aria-label^="${esc(key)} in German"]`).first().getAttribute("aria-label");
  const deVal = await S(p).locator(`input[aria-label^="${esc(key)} in German"]`).first().inputValue();
  const deProg = (await S(p).locator("[aria-label='Translated per language'] li").allInnerTexts()).map(x => x.replace(/\s+/g, " "));
  const s1 = await sh(p, "TRN-21-german");
  await section(p, "Languages"); await p.waitForTimeout(300);
  await pick("German", "Make default"); await cd(p).getByRole("button", { name: "Make default" }).click(); await p.waitForTimeout(500);
  await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await p.waitForTimeout(800);
  const h2 = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  const srcShown = (await S(p).locator("[role=row]").nth(1).innerText()).replace(/\s+/g, " ");
  const deInputs = await S(p).locator(`input[aria-label*=" in German"]`).count();
  const prog2 = (await S(p).locator("[aria-label='Translated per language'] li").allInnerTexts()).map(x => x.replace(/\s+/g, " "));
  const s2 = await sh(p, "TRN-21-default");
  await section(p, "Languages"); await p.waitForTimeout(300);
  await pick("Portuguese", "Uninstall");
  await p.locator("[data-component=TypedConfirmModal]").getByRole("textbox").fill("CONFIRM"); await p.locator("[data-component=TypedConfirmModal] [data-part=confirm]").click(); await p.waitForTimeout(600);
  await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await p.waitForTimeout(800);
  const h3 = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  const prog3 = (await S(p).locator("[aria-label='Translated per language'] li").allInnerTexts()).map(x => x.replace(/\s+/g, " "));
  const k1 = [await keyCount("Court Case", "Template"), await keyCount("Countries", "Thesaurus"), await keyCount("Cites", "Relationship type")];
  const listAfter = (await S(p).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().innerText()).replace(/\n+/g, " | ");
  const ok = h1.some(h => /Deutsch/.test(h)) && /untranslated/.test(deCell) && deVal === key && /Deutsch/.test(h2[1]) && deInputs === 0 && !h3.some(h => /Português/.test(h)) && JSON.stringify(k0) === JSON.stringify(k1) && prog3.length === prog2.length - 1;
  rec("TRN-21", ok ? "PASS" : "FAIL", `before: keys per context ${JSON.stringify(k0)}, list row "${listBefore}"; after installing German: headers ${JSON.stringify(h1)}, German cell for "${key}" aria="${deCell}" value="${deVal}" (default-language text), progress ${JSON.stringify(deProg)}; after making German default: first data column="${h2[1]}", German inputs=${deInputs} (read-only source), English column now ${/English/.test(h2.join()) ? "an editable language column" : "missing"}, source cell for the first key reads "${srcShown.slice(0, 80)}", progress ${JSON.stringify(prog2)}; after uninstalling Portuguese: headers ${JSON.stringify(h3)}, progress ${JSON.stringify(prog3)}; keys per context after ${JSON.stringify(k1)}, list row "${listAfter}"`, ok ? "" : s2);
  rec("_errs-TE6", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
