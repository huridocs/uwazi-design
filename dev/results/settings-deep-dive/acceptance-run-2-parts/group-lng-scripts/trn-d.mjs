// TRN-09..TRN-15 (editor behaviour), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch, logEntries } from "./u.mjs";
const { rec, save } = recorder("./trn-d.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|validateDOMNesting/.test(e));
const esc = (k) => k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const inp = (p, key, lang) => S(p).locator(`input[aria-label^="${esc(key)} in ${lang}"]`).first();
const commit = (p) => p.locator("button:visible").filter({ hasText: /^Save$/ }).last();
const toList = async (p) => { await section(p, "Translations"); if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).first().click(); await p.waitForTimeout(500); } };
const openCtx = async (p, name, type) => { await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first().click(); await p.waitForTimeout(800); };
const keysOf = (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const progress = (p) => S(p).locator("[aria-label='Translated per language'] li").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
const pillOf = (p, key, lang) => S(p).locator("[role=row]").filter({ has: p.locator(`input[aria-label^="${esc(key)} in ${lang}"]`) }).first().locator("span.uppercase").first().evaluate(e => ({ t: e.textContent, c: (e.className.match(/bg-[a-z-]+/) || [""])[0] }));
const searchBox = (p) => S(p).locator("input[placeholder*='Search' i]").first();

// ---- TRN-09 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "User Interface", "User interface");
  const crumbTxt = (await S(p).locator("header, [data-part=header]").first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const topTxt = (await S(p).innerText()).split("\n").slice(0, 3).join(" | ");
  const heads = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  const crumbLink = await S(p).getByRole("button", { name: "Translations" }).count() + await S(p).getByRole("link", { name: "Translations" }).count();
  const ttl = await title(p).catch(() => "");
  const srcInput = await S(p).locator("[role=row]").nth(1).locator("input[aria-label*=' in English']").count();
  const hasClear = await S(p).locator("[role=row]").nth(1).getByRole("button", { name: "Clear" }).count();
  const cellBox = await S(p).locator("[role=row]").nth(1).locator("input").first().evaluate(e => ({ type: e.type }));
  // sticky: scroll the body and measure header top
  const top0 = await S(p).locator("[role=columnheader]").first().evaluate(e => Math.round(e.getBoundingClientRect().top));
  await p.evaluate(() => { for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 1500; });
  await p.waitForTimeout(400);
  const top1 = await S(p).locator("[role=columnheader]").first().evaluate(e => Math.round(e.getBoundingClientRect().top));
  const visible = await S(p).locator("[role=columnheader]").first().isVisible();
  const lastRowKey = await S(p).locator("[role=row]").last().locator("td,[role=cell]").first().innerText();
  const footerBtns = await p.evaluate(() => [...document.querySelectorAll("button")].filter(e => !e.closest("[inert]") && e.getBoundingClientRect().top > 740).map(e => e.textContent.trim()).filter(x => /^(Save|Cancel)$/.test(x)));
  const termWord = /\bterm\b/i.test(await S(p).innerText());
  await p.evaluate(() => { for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 1500; });
  const s = await sh(p, "TRN-09");
  const pills = await S(p).locator("[role=columnheader] span.uppercase").evaluateAll(es => es.map(e => e.textContent));
  const ok = ttl === "User Interface" && crumbLink >= 1 && /^KEY$/i.test(heads[0]) && heads.some(h => /Español/.test(h)) && heads[1].startsWith("English") && srcInput === 0 && hasClear >= 0 && top1 >= 0 && top1 < 200 && visible && footerBtns.includes("Save") && footerBtns.includes("Cancel") && !termWord;
  rec("TRN-09", ok ? "PASS" : "FAIL", `breadcrumb button/link "Translations"=${crumbLink}, title="${ttl}"; column headers=${JSON.stringify(heads)} (autonym + code pill ${JSON.stringify(pills)}); source (English) column has no input=${srcInput === 0}; sample row has a Clear X on filled cells=${hasClear}; header top before/after scrolling the grid by 1500px (a sticky header stays within 0-200px): ${top0}px/${top1}px (visible=${visible}, last key rendered "${lastRowKey}"); footer buttons=${JSON.stringify(footerBtns)}; word "term" on the editor=${termWord}`, ok ? "" : s);
  rec("_errs-TD1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-10 + TRN-11 + TRN-12 + TRN-13 on Countries (thesaurus, 23 keys) ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Countries", "Thesaurus");
  const keys = await keysOf(p);
  const prog0 = await progress(p);
  // TRN-10
  const filled = await S(p).locator("input[aria-label*=' in Spanish']").evaluateAll(es => { const e = es.find(x => !/untranslated/.test(x.getAttribute("aria-label"))); return e ? e.getAttribute("aria-label").replace(/ in Spanish.*$/, "") : null; });
  const notes0 = await notifMatch(p, /Translations saved/);
  const clearBtn = S(p).locator("[role=row]").filter({ has: p.locator(`input[aria-label^="${esc(filled)} in Spanish"]`) }).first().locator("input[aria-label*=' in Spanish'] ~ button, button[aria-label=Clear]").first();
  await S(p).locator("[role=row]").filter({ has: p.locator(`input[aria-label^="${esc(filled)} in Spanish"]`) }).first().locator("span.relative").nth(0).getByRole("button", { name: "Clear" }).first().click().catch(async () => { await clearBtn.click(); });
  await p.waitForTimeout(200);
  const emptyVal = await inp(p, filled, "Spanish").inputValue();
  await commit(p).click(); await p.waitForTimeout(500);
  const err = (await S(p).innerText()).match(/This field is required/g)?.length || 0;
  const footerTxt = (await p.locator("[role=alert]:visible").allInnerTexts()).join(" | ");
  const notes1 = await notifMatch(p, /Translations saved/);
  const s10 = await sh(p, "TRN-10");
  await inp(p, filled, "Spanish").fill("Valor"); await p.waitForTimeout(300);
  const err2 = (await S(p).innerText()).match(/This field is required/g)?.length || 0;
  const footer2 = (await p.locator("[role=alert]:visible").allInnerTexts()).join(" | ");
  const ok10 = emptyVal === "" && err >= 1 && /\b1 empty cell blocks saving\b/.test(footerTxt) && notes1.length === notes0.length && err2 === 0 && footer2 === "";
  rec("TRN-10", ok10 ? "PASS" : "FAIL", `cleared the Spanish cell of "${filled}" with its X (value now "${emptyVal}"); Save -> "This field is required" shown ${err} time(s); footer alert="${footerTxt}"; "Translations saved" entries before/after=${notes0.length}/${notes1.length} (no write); after typing "Valor": errors=${err2}, footer alert="${footer2}"`, ok10 ? "" : s10);
  // revert the edit for the later checks
  await inp(p, filled, "Spanish").fill("");
  await S(p).getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(400);
  const dd = await dialogs(p);
  if (dd.length) { await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Discard changes" }).click(); await p.waitForTimeout(500); }
  await p.context().close();
}

// ---- TRN-11 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Countries", "Thesaurus");
  const key = "Brazil";
  const srcTxt = await inp(p, key, "English").inputValue().catch(() => null);
  const src = await S(p).locator("[role=row]").filter({ has: p.locator(`input[aria-label^="${key} in Spanish"]`) }).first().locator("td,[role=cell]").nth(1).innerText();
  const pill0 = await pillOf(p, key, "Spanish");
  const srcPill = await S(p).locator("[role=columnheader] span.uppercase").first().evaluate(e => ({ t: e.textContent, c: (e.className.match(/bg-[a-z-]+/) || [""])[0] }));
  const label0 = await inp(p, key, "Spanish").getAttribute("aria-label");
  await inp(p, key, "Spanish").fill("Brasil-XYZ"); await p.waitForTimeout(250);
  const pill1 = await pillOf(p, key, "Spanish"); const label1 = await inp(p, key, "Spanish").getAttribute("aria-label");
  await inp(p, key, "Spanish").fill(src.trim()); await p.waitForTimeout(250);
  const pill2 = await pillOf(p, key, "Spanish"); const label2 = await inp(p, key, "Spanish").getAttribute("aria-label");
  const markCtl = await S(p).evaluate(e => [...e.querySelectorAll("*")].filter(x => /same as (the )?source/i.test((x.getAttribute("aria-label") || "") + (x.getAttribute("title") || "") + (x.children.length ? "" : x.textContent))).length);
  const s = await sh(p, "TRN-11");
  const ok = /bg-ink/.test(srcPill.c) && /bg-vellum/.test(pill1.c) && /bg-warning/.test(pill2.c) && !/untranslated/.test(label1) && /untranslated/.test(label2) && markCtl > 0;
  rec("TRN-11", ok ? "PASS" : "FAIL", `source (default English) header pill class=${srcPill.c}; Spanish cell for "${key}" initially pill ${pill0.c} (${label0}); after typing "Brasil-XYZ" before Save: pill ${pill1.c}, label "${label1}"; after typing the exact source text "${src.trim()}" back: pill ${pill2.c}, label "${label2}"; a "same as source" mark/control on a cell (so an identical value can count as translated): ${markCtl} found, and the cell stays untranslated`, ok ? "" : s);
  rec("_errs-TD2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-12 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Countries", "Thesaurus");
  const prog0 = await progress(p);
  const untr = await S(p).locator("input[aria-label*=' in Spanish, untranslated']").evaluateAll(es => es.slice(0, 2).map(e => e.getAttribute("aria-label").replace(/ in Spanish.*$/, "")));
  await inp(p, untr[0], "Spanish").fill("Traducido uno"); await p.waitForTimeout(250);
  const prog1 = await progress(p);
  await inp(p, untr[1], "Spanish").fill("Traducido dos"); await p.waitForTimeout(250);
  const prog2 = await progress(p);
  const s = await sh(p, "TRN-12");
  await commit(p).click(); await p.waitForTimeout(500);
  await toList(p);
  const listRow = (await S(p).locator("[data-part=row]").filter({ hasText: "Countries" }).first().innerText()).replace(/\n+/g, " | ");
  const es = (a) => a.find(x => /^Spanish/.test(x));
  const n = (x) => parseInt((x || "").match(/(\d+) of/)?.[1] || "-1", 10);
  const ok = prog0.length === 4 && n(es(prog1)) === n(es(prog0)) + 1 && n(es(prog2)) === n(es(prog0)) + 2 && /ES 4\d%|ES 3\d%/.test(listRow);
  rec("TRN-12", ok ? "PASS" : "FAIL", `editor head progress (one cell per target language, as built): ${JSON.stringify(prog0)}; after translating "${untr[0]}": ${es(prog1)}; after "${untr[1]}": ${es(prog2)}; after Save the list row reads "${listRow}"`, ok ? "" : s);
  rec("_errs-TD3", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-13 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Countries", "Thesaurus");
  const toggle = S(p).getByLabel("Untranslated only");
  const off0 = !(await toggle.isChecked());
  const all = (await keysOf(p)).length;
  // key: es untranslated, ar translated
  const hidKey = await S(p).locator("[role=row]").evaluateAll(es => { const r = es.slice(1).find(r => { const ins = [...r.querySelectorAll("input")]; const es_ = ins.find(i => / in Spanish/.test(i.getAttribute("aria-label"))); const ar = ins.find(i => / in Arabic/.test(i.getAttribute("aria-label"))); return es_ && /untranslated/.test(es_.getAttribute("aria-label")) && ar && !/untranslated/.test(ar.getAttribute("aria-label")); }); return r ? r.querySelector("td,[role=cell]").innerText.trim() : null; });
  await inp(p, hidKey, "Spanish").fill("Valor oculto");
  await toggle.check(); await p.waitForTimeout(400);
  const on = await keysOf(p);
  const onAllUntranslated = await S(p).locator("[role=row]").evaluateAll(es => es.slice(1).every(r => [...r.querySelectorAll("input")].some(i => /untranslated/.test(i.getAttribute("aria-label")))));
  const stillThere = on.includes(hidKey);
  await S(p).getByRole("button", { name: /^Language:/ }).click();
  await p.waitForTimeout(200);
  const opts = await p.evaluate(() => [...document.querySelectorAll("[role=option]")].map(e => e.textContent.trim()));
  await p.getByRole("option", { name: "العربية" }).click(); await p.waitForTimeout(400);
  const arKeys = await keysOf(p);
  const arCols = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  const hiddenNow = !arKeys.includes(hidKey);
  const s = await sh(p, "TRN-13");
  await commit(p).click(); await p.waitForTimeout(500);
  const savedNotes = await notifMatch(p, /Translations saved/);
  await S(p).getByRole("button", { name: /^Language:/ }).click();
  await p.getByRole("option", { name: "All languages" }).click(); await p.waitForTimeout(300);
  await toggle.uncheck(); await p.waitForTimeout(400);
  const back = (await keysOf(p)).length;
  const kept = await inp(p, hidKey, "Spanish").inputValue();
  const countShown = (await S(p).innerText()).match(/\d+ (untranslated|keys?)/gi) || [];
  const ok = off0 && all === 23 && onAllUntranslated && stillThere && hiddenNow && arKeys.length < on.length && back === all && kept === "Valor oculto" && savedNotes.length === 1;
  rec("TRN-13", ok ? "PASS" : "FAIL", `toggle "Untranslated only" off by default=${off0}; ${all} keys; typed "Valor oculto" into es of key "${hidKey}" (es untranslated, ar translated); toggle on: ${on.length} of ${all} keys remain (Portuguese is untranslated everywhere, so every key has a non-translated language), each has an untranslated cell=${onAllUntranslated}; language select options ${JSON.stringify(opts)}; picking Arabic leaves ${arKeys.length} key(s) with columns ${JSON.stringify(arCols)}, "${hidKey}" hidden=${hiddenNow}; Save while hidden -> "Translations saved" x${savedNotes.length}; All languages + toggle off: ${back} keys, hidden cell value after Save="${kept}"; explicit remaining-key count text on screen=${JSON.stringify(countShown)} (per-language "x of y" progress is shown)`, ok ? "" : s);
  rec("_errs-TD4", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-14 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "User Interface", "User interface");
  const box = searchBox(p);
  const h = async () => box.evaluate(e => Math.round(e.closest("div")?.parentElement?.getBoundingClientRect().height || 0));
  const h0 = await h();
  await box.fill("Account loc"); await p.waitForTimeout(400);
  const k1 = await keysOf(p);
  const h1 = await h();
  // value-only text: find a Spanish value that is not a key substring
  await box.fill(""); await p.waitForTimeout(400);
  const spanishVal = await inp(p, "Account", "Spanish").inputValue();
  await box.fill(spanishVal.toLowerCase()); await p.waitForTimeout(400);
  const k2 = await keysOf(p);
  await box.fill("zzz"); await p.waitForTimeout(400);
  const none = (await S(p).innerText()).replace(/\n+/g, " | ").slice(-200);
  const h2 = await h();
  const s = await sh(p, "TRN-14");
  await box.fill(""); await p.waitForTimeout(500);
  const back = (await keysOf(p)).length;
  const ok = k1.length >= 1 && k1.every(k => /account loc/i.test(k)) && k2.length >= 1 && /Nothing matches|No keys match/.test(none) && back >= 60 && h0 === h1 && h1 === h2;
  rec("TRN-14", ok ? "PASS" : "FAIL", `"Account loc" -> ${JSON.stringify(k1)}; value-only text "${spanishVal}" (Spanish value of key Account) -> ${k2.length} key(s) ${JSON.stringify(k2.slice(0, 4))}; "zzz" -> "${none}"; cleared -> ${back} rendered rows; search row height ${h0}/${h1}/${h2}px`, ok ? "" : s);
  rec("_errs-TD5", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-15 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Court Case", "Template");
  const keys = await keysOf(p);
  const k1 = keys[0], k2 = keys[1];
  await inp(p, k1, "Spanish").fill("ES-edit"); await inp(p, k2, "French").fill("FR-edit");
  const saveEnabledBefore = await commit(p).isEnabled();
  await commit(p).click();
  const notesAt0 = await notifMatch(p, /Translations saved/);
  await p.waitForTimeout(600);
  const notes = await notifMatch(p, /Translations saved/);
  const saveDisabled = await commit(p).isDisabled();
  const stillOpen = (await title(p).catch(() => "")) === "Court Case";
  const last = (await S(p).innerText()).match(/Last saved[^\n]*|Saved[^\n]*/)?.[0] || "";
  await p.reload(); await p.waitForTimeout(1500);
  await openCtx(p, "Court Case", "Template");
  const v1 = await inp(p, k1, "Spanish").inputValue(); const v2 = await inp(p, k2, "French").inputValue();
  await section(p, "Activity log"); await p.waitForTimeout(600);
  const act = (await S(p).innerText()).split("\n").map(x => x.replace(/\s+/g, " ").trim()).filter(x => /ranslation/.test(x));
  const s = await sh(p, "TRN-15");
  const ok = saveEnabledBefore && notes.length === 1 && saveDisabled && stillOpen && v1 === "ES-edit" && v2 === "FR-edit" && act.length >= 1;
  rec("TRN-15", ok ? "PASS" : "FAIL", `edited es "${k1}" and fr "${k2}", one Save: Beacon "Translations saved" entries=${notes.length} (immediately after click: ${notesAt0.length}); editor stayed open=${stillOpen}, Save disabled afterwards=${saveDisabled}, footer line="${last}"; after reload and reopen es="${v1}" fr="${v2}"; Activity log lines=${JSON.stringify(act.slice(0, 3))}`, ok ? "" : s);
  rec("_errs-TD6", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
