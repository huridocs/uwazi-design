import { launch, open, S, rows, shot, dialogs, axe } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, modalTxt, lngRows, goto, installLang, rowOf, menuOf } from "./u.mjs";
const { rec, save } = mk("lng1");
const b = await launch();

// ---------- LNG-01, LNG-PO1, LNG-PO2, LNG-02
{
  const { page, errors } = await open(b, "languages");
  const t = squash(await S(page).innerText());
  const h2 = await S(page).locator("h2").first().innerText();
  const cardHdr = await S(page).locator("h3").allInnerTexts();
  const colHdrs = (await S(page).locator("[role=columnheader]").allInnerTexts()).map(squash);
  const r0 = await lngRows(page);
  const sorted0 = [...r0].map((x) => x.split(" (")[0]);
  const asc = JSON.stringify(sorted0) === JSON.stringify([...sorted0].sort((a, b) => a.localeCompare(b)));
  const fmtOk = r0.every((x) => /^[A-Za-z]+ \([a-z]{2}\)/.test(x));
  await S(page).locator("[role=columnheader] button[data-part=sort]").first().click(); await page.waitForTimeout(250);
  const r1 = (await lngRows(page)).map((x) => x.split(" (")[0]);
  const toggled = JSON.stringify(r1) === JSON.stringify([...sorted0].reverse());
  await S(page).locator("[role=columnheader] button[data-part=sort]").first().click(); await page.waitForTimeout(250);
  const badges = await S(page).locator("[data-part=default]").count();
  const btn = S(page).getByRole("button", { name: "Install Language(s)" });
  const btnCount = await btn.count(); const btnEnabled = btnCount ? await btn.first().isEnabled() : false;
  const nBtn = await S(page).locator("button").filter({ hasText: /Install|Uninstall|Reset/ }).count();
  await shot(page, "LNG-01");
  const ok = h2 === "Languages" && cardHdr.includes("Active languages") && colHdrs.length === 2 && /Language/i.test(colHdrs[0]) && asc && toggled && fmtOk && badges === 1 && btnCount === 1 && btnEnabled;
  rec("LNG-01", ok ? "PASS" : "FAIL", `title "${h2}"; h3 ${JSON.stringify(cardHdr)}; column headers ${JSON.stringify(colHdrs)} (second is sr-only Actions); rows ${JSON.stringify(r0)}; ascending by English name=${asc}; header click reverses=${toggled}; "<name> (<key>)" format=${fmtOk}; Default badges=${badges}; "Install Language(s)" buttons=${btnCount} enabled=${btnEnabled}; stray Reset/Uninstall/Install buttons outside the footer button=${nBtn - btnCount}`, "LNG-01.png");

  // PO2
  const es = r0.find((r) => /^Spanish/.test(r)), en = r0.find((r) => /^English/.test(r));
  rec("LNG-PO2", /Español/.test(es) && !/English \(en\) ?English/.test(en) && en === "English (en)Default" ? "PASS" : "FAIL", `Spanish row "${es}"; English row "${en}"`, "LNG-01.png");
  // PO1
  const pct = r0.filter((r) => /\d+\s?%/.test(r));
  rec("LNG-PO1", pct.length ? "PASS" : "FAIL", `percentages found in rows: ${pct.length}. Row text ${JSON.stringify(r0)}; page text "${t.slice(0, 200)}". Spec: each row shows a translated percentage derived from the Translations store`, "LNG-01.png");

  // LNG-02: install German first so a language without a predefined file exists
  await installLang(page, ["German"], 3800);
  const state = {};
  state.en = await menuOf(page, "English"); await shot(page, "LNG-02-english");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  const focusEn = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const menuClosed = (await page.locator("[role=menuitem]").count()) === 0;
  state.es = await menuOf(page, "Spanish"); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  state.de = await menuOf(page, "German"); await shot(page, "LNG-02-german");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const focusDe = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const f = (m) => m.map((x) => x.t + (x.dis ? "(disabled)" : "")).join(", ");
  const enOk = state.en.some((x) => x.t === "Make default" && x.dis) && !state.en.some((x) => x.t === "Uninstall") && state.en.some((x) => x.t === "Reset");
  const esOk = ["Make default", "Reset", "Uninstall"].every((n) => state.es.some((x) => x.t === n && !x.dis));
  const deOk = state.de.length === 2 && state.de.some((x) => x.t === "Make default") && state.de.some((x) => x.t === "Uninstall") && !state.de.some((x) => x.t === "Reset");
  rec("LNG-02", enOk && esOk && deOk && menuClosed && /Actions for English/.test(focusEn) && /Actions for German/.test(focusDe) ? "PASS" : "FAIL",
    `English menu: ${f(state.en)}; Spanish: ${f(state.es)}; German (no predefined file, installed in this run): ${f(state.de)}; Escape closes=${menuClosed}; focus after Escape "${focusEn}" / "${focusDe}"`, "LNG-02-german.png");
  rec("X-13/Lang-console", realErr(errors).length ? "INFO" : "INFO", JSON.stringify(realErr(errors)).slice(0, 600));
  await page.context().close();
}

// ---------- LNG-03, LNG-04, LNG-05, LNG-06
{
  const { page, errors } = await open(b, "languages");
  const trigger = S(page).getByRole("button", { name: "Install Language(s)" });
  await trigger.click(); await page.waitForTimeout(400);
  const d = page.locator("[role=dialog]:not([inert] *)").last();
  const name = await d.getAttribute("aria-label") || await d.evaluate((e) => { const id = e.getAttribute("aria-labelledby"); return id ? document.getElementById(id)?.textContent : e.querySelector("h2")?.textContent; });
  const mt = squash(await d.innerText());
  const box = await d.boundingBox();
  const closeX = await d.getByRole("button", { name: /close/i }).count();
  const placeholder = await d.locator("input[type=text],input:not([type])").first().getAttribute("placeholder");
  const radios = await d.locator("input[type=radio]").evaluateAll((e) => e.map((x) => ({ l: x.closest("label")?.innerText.trim(), dis: x.disabled, chk: x.checked })));
  const btnTxts = await d.locator("footer button, [data-part=footer] button").allInnerTexts().catch(() => []);
    const instDisabled = await d.locator("[data-part=confirm]").isDisabled();
  await shot(page, "LNG-03");
  // focus trap
  let outside = false;
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); const inside = await page.evaluate(() => { const a = document.activeElement; const dd = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).pop(); return !!(dd && a && dd.contains(a)); }); if (!inside) { outside = true; break; } }
  // close via Escape then focus
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const f1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await trigger.click(); await page.waitForTimeout(300);
  await page.locator("[role=dialog]:not([inert] *)").last().getByRole("button", { name: "Cancel", exact: true }).click(); await page.waitForTimeout(300);
  const f2 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const okNote = /This action may take some time while we add the extra language to the entire collection\./.test(mt);
  const ok = name === "Install Language(s)" && box && box.width > 560 && box.width <= 660 && closeX >= 1 && okNote && placeholder === "Search" && radios.length === 2 && /^All$/.test(radios[0].l) && radios[1].l === "Selected (0)" && radios[1].dis && /\* Available default translation/.test(mt) && instDisabled && !outside && /Install Language/.test(f1) && /Install Language/.test(f2);
  rec("LNG-03", ok ? "PASS" : "FAIL", `dialog name "${name}"; width ${box && Math.round(box.width)}px (size lg = 640); close X buttons=${closeX}; note present=${okNote}; search placeholder "${placeholder}"; radios ${JSON.stringify(radios)}; legend present=${/\* Available default translation/.test(mt)}; Install disabled=${instDisabled}; Tab x40 left the dialog=${outside}; focus after Escape "${f1}", after Cancel "${f2}"`, "LNG-03.png");

  // LNG-04
  await trigger.click(); await page.waitForTimeout(400);
  const dd = page.locator("[role=dialog]:not([inert] *)").last();
  const items = (await dd.locator("[data-part=language]").allInnerTexts()).map(squash);
  const star = items.filter((x) => x.startsWith("*")).map((x) => x.replace(/^\*\s*/, "").replace(/\s*Select$/, ""));
  const labels = items.map((x) => x.replace(/^\*\s*/, "").replace(/\s*Select(ed)?$/, ""));
  const names = labels.map((x) => x.split(" (")[0]);
  const alpha = JSON.stringify(names) === JSON.stringify([...names].sort((a, b) => a.localeCompare(b)));
  const fmt = labels.every((x) => /^[A-Za-z]+ \([a-z]{2}\)$/.test(x));
  const inst = ["Arabic", "English", "French", "Spanish"].filter((n) => names.includes(n));
  const wantStar = ["Greek", "Korean", "Burmese", "Russian", "Thai", "Turkish", "Ukrainian"].sort();
  const gotStar = star.map((x) => x.split(" (")[0]).sort();
  rec("LNG-04", items.length === 28 && !inst.length && alpha && fmt && JSON.stringify(gotStar) === JSON.stringify(wantStar) ? "PASS" : "FAIL",
    `${items.length} rows (32 catalog minus 4 installed = 28); installed languages listed: ${JSON.stringify(inst)}; alphabetical=${alpha}; "<name> (<key>)" format=${fmt}; starred rows ${JSON.stringify(gotStar)} expected ${JSON.stringify(wantStar)} (el, ko, my, ru, th, tr, uk); first rows ${JSON.stringify(items.slice(0, 4))}`, "LNG-03.png");

  // LNG-05
  const input = dd.getByRole("textbox").first();
  const list = async () => (await dd.locator("[data-part=language]").allInnerTexts()).map(squash);
  const nm = (a) => a.map((x) => x.replace(/^\*\s*/, "").replace(/\s*Select(ed)?$/, ""));
  await input.fill("ger"); await page.waitForTimeout(500); const g1 = nm(await list());
  await input.fill(""); await page.waitForTimeout(400); const all1 = (await list()).length;
  await input.fill("GERMAN"); await page.waitForTimeout(500); const g2 = nm(await list());
  await input.fill("de"); await page.waitForTimeout(500); const g3 = nm(await list());
  await input.fill("zzz"); await page.waitForTimeout(500); const g4 = squash(await dd.locator("[role=list],ul").last().innerText()); const g4n = (await list()).length; const g4txt = /No items available/.test(await dd.innerText());
  const clearBtn = dd.getByRole("button", { name: /^clear$/i });
  const clearCount = await clearBtn.count();
  if (clearCount) await clearBtn.first().click(); await page.waitForTimeout(500);
  const afterClear = (await list()).length; const val = await input.inputValue();
  await shot(page, "LNG-05");
  const ok5 = g1.length === 1 && /German/.test(g1[0]) && g2.length === 1 && /German/.test(g2[0]) && !g3.some((x) => /German/.test(x)) && g4n === 0 && g4txt && clearCount >= 1 && afterClear === 28 && val === "";
  rec("LNG-05", ok5 ? "PASS" : "FAIL", `"ger" -> ${JSON.stringify(g1)}; "GERMAN" -> ${JSON.stringify(g2)}; "de" -> ${JSON.stringify(g3)} (German, key de, must not be listed: ${!g3.some((x) => /German/.test(x))}); "zzz" rows=${g4n}, text has "No items available"=${g4txt}; clear X buttons=${clearCount}, after clear rows=${afterClear}, field="${val}"`, "LNG-05.png");

  // LNG-06
  await input.fill(""); await page.waitForTimeout(400);
  const rowDe = dd.locator("[data-part=language]").filter({ hasText: "German" }).first();
  const rowKo = dd.locator("[data-part=language]").filter({ hasText: "Korean" }).first();
  await rowDe.click(); await rowKo.click(); await page.waitForTimeout(250);
  const rdSel = await dd.locator("input[type=radio]").evaluateAll((e) => e.map((x) => ({ l: x.closest("label")?.innerText.trim(), dis: x.disabled })));
  const deTxt = squash(await rowDe.innerText());
  const instBtn = await dd.locator("[data-part=confirm]").innerText(); const instEn = await dd.locator("[data-part=confirm]").isEnabled();
  await dd.getByText("Selected (2)").click(); await page.waitForTimeout(300);
  const selList = nm(await list());
  await dd.locator("[data-part=language]").filter({ hasText: "German" }).first().click(); await page.waitForTimeout(250);
  const afterOne = nm(await list()); const lab1 = await dd.locator("input[type=radio]").nth(1).evaluate((e) => e.closest("label").innerText.trim());
  const btn1 = await dd.locator("[data-part=confirm]").innerText();
  await dd.locator("[data-part=language]").filter({ hasText: "Korean" }).first().click(); await page.waitForTimeout(250);
  const zeroDis = await dd.locator("[data-part=confirm]").isDisabled(); const zeroAll = await dd.locator("input[type=radio]").first().isChecked(); const zeroRows = (await list()).length;
  await rowDe.click().catch(() => {}); await page.waitForTimeout(200);
  await dd.getByRole("button", { name: "Cancel", exact: true }).click(); await page.waitForTimeout(300);
  const after = await lngRows(page);
  await trigger.click(); await page.waitForTimeout(400);
  const d3 = page.locator("[role=dialog]:not([inert] *)").last();
  const radios3 = await d3.locator("input[type=radio]").evaluateAll((e) => e.map((x) => x.closest("label").innerText.trim()));
  const sel3 = (await d3.locator("[data-part=language]").allInnerTexts()).filter((x) => /Selected$/.test(squash(x))).length;
  await shot(page, "LNG-06");
  const ok6 = /Selected$/.test(deTxt) && instBtn === "Install (2)" && instEn && rdSel[1].l === "Selected (2)" && !rdSel[1].dis && selList.length === 2 && afterOne.length === 1 && lab1 === "Selected (1)" && btn1 === "Install (1)" && zeroDis && zeroAll && !after.some((r) => /German|Korean/.test(r)) && radios3[1] === "Selected (0)" && sel3 === 0;
  rec("LNG-06", ok6 ? "PASS" : "FAIL", `after two clicks German row "${deTxt}"; button "${instBtn}" enabled=${instEn}; radios ${JSON.stringify(rdSel)}; Selected view lists ${JSON.stringify(selList)}; deselect one -> list ${JSON.stringify(afterOne)}, radio "${lab1}", button "${btn1}"; at 0: Install disabled=${zeroDis}, back to All=${zeroAll}; Cancel installed nothing (rows ${after.length}); reopen: radio "${radios3[1]}", selected rows=${sel3}`, "LNG-06.png");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  rec("console-lng1b", realErr(errors).length ? "INFO" : "INFO", JSON.stringify(realErr(errors)).slice(0, 800));
  await page.context().close();
}
save(); await b.close();
