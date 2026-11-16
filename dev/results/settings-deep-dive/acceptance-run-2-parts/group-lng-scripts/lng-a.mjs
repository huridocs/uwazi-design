// LNG-01..06, LNG-18, LNG-PO2 (read / modal checks), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, logo, section } from "./u.mjs";
const { rec, save } = recorder("./lng-a.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated/.test(e));
const names = (p) => S(p).locator("[role=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));

// ---- LNG-01, LNG-PO2, LNG-02 ----
{
  const { page: p, errors } = await open(b, "languages");
  const t = await title(p);
  const sec = await S(p).locator("h3").allTextContents();
  const hdrs = await S(p).locator("[role=columnheader]").allInnerTexts();
  const list = await names(p);
  const defaults = await S(p).locator("[data-part=default]").count();
  const foot = S(p).getByRole("button", { name: "Install Language(s)" });
  const footN = await p.getByRole("button", { name: "Install Language(s)" }).count();
  const enabled = await foot.isEnabled();
  const sorted = [...list].map(x => x.split(" (")[0]);
  const asc = JSON.stringify(sorted) === JSON.stringify([...sorted].sort());
  const ariaSort = await S(p).locator("[role=columnheader][aria-sort]").first().getAttribute("aria-sort").catch(() => null);
  await S(p).locator("[data-part=sort]").filter({ hasText: "Language" }).first().click();
  await p.waitForTimeout(200);
  const list2 = (await names(p)).map(x => x.split(" (")[0]);
  const desc = JSON.stringify(list2) === JSON.stringify([...sorted].sort().reverse());
  await S(p).locator("[data-part=sort]").filter({ hasText: "Language" }).first().click();
  await p.waitForTimeout(200);
  const list3 = (await names(p)).map(x => x.split(" (")[0]);
  const back = JSON.stringify(list3) === JSON.stringify([...sorted].sort());
  const s1 = await sh(p, "LNG-01");
  const okRows = list.every(x => /^[A-Za-z]+ \([a-z]{2}\)/.test(x));
  const ok = t === "Languages" && sec.includes("Active languages") && hdrs.some(h => /^Language$/i.test(h.trim())) && asc && desc && back && okRows && defaults === 1 && footN === 1 && enabled && hdrs.length <= 2;
  rec("LNG-01", ok ? "PASS" : "FAIL", `title=${t}; h3=${JSON.stringify(sec)}; headers=${JSON.stringify(hdrs)}; aria-sort=${ariaSort}; rows=${JSON.stringify(list)}; asc=${asc} toggledDesc=${desc} backAsc=${back}; Default badges=${defaults}; footer buttons "Install Language(s)"=${footN} enabled=${enabled}`, ok ? "" : s1);
  const list0 = await names(p);
  const es = list0.find(x => /^Spanish/.test(x));
  const en = list0.find(x => /^English/.test(x));
  const po2ok = /Español/.test(es || "") && !/English English/.test(en || "") && /^English \(en\) ?Default$/.test((en||"").replace(/\s+/g," ").trim());
  rec("LNG-PO2", po2ok ? "PASS" : "FAIL", `Spanish row="${es}"; English row="${en}"`, po2ok ? "" : s1);

  // LNG-02
  const menu = async (name) => {
    await S(p).getByRole("button", { name: `Actions for ${name}` }).click();
    await p.waitForTimeout(250);
    const items = await p.evaluate(() => [...document.querySelectorAll("[role=menuitem],[role=menu] button")].filter(e => !e.closest("[inert]")).map(e => e.textContent.trim() + (e.disabled || e.getAttribute("aria-disabled") === "true" ? " [disabled]" : "")));
    return items;
  };
  const m_en = await menu("English"); const s2 = await sh(p, "LNG-02-menu-default");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const closed1 = (await p.evaluate(() => [...document.querySelectorAll("[role=menuitem],[role=menu] button")].filter(e => !e.closest("[inert]")).length)) === 0;
  const foc1 = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const m_es = await menu("Spanish"); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const m_pt = await menu("Portuguese"); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const foc2 = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const enOk = m_en.some(x => /^Make default \[disabled\]/.test(x)) && !m_en.some(x => /Uninstall/.test(x)) && m_en.some(x => /^Reset/.test(x));
  const esOk = JSON.stringify(m_es.map(x => x.replace(/ \[disabled\]/, ""))) === JSON.stringify(["Make default", "Reset", "Uninstall"]) && !m_es.some(x => /disabled/.test(x));
  const ptOk = JSON.stringify(m_pt) === JSON.stringify(["Make default", "Uninstall"]);
  const ok2 = enOk && esOk && ptOk && closed1 && foc1 === "Actions for English" && foc2 === "Actions for Portuguese";
  rec("LNG-02", ok2 ? "PASS" : "FAIL", `default(en)=${JSON.stringify(m_en)}; es=${JSON.stringify(m_es)}; pt=${JSON.stringify(m_pt)}; menu closes on Escape=${closed1}; focus after Escape=${foc1} / ${foc2}`, ok2 ? "" : s2);
  rec("_errs-A1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-03, 04, 05, 06 (modal) ----
{
  const { page: p, errors } = await open(b, "languages");
  const opener = S(p).getByRole("button", { name: "Install Language(s)" });
  await opener.click(); await p.waitForTimeout(500);
  const dlg = p.getByRole("dialog", { name: "Install Language(s)" });
  const D = p.locator("[data-component=InstallLanguagesModal]");
  const dn = await dlg.count();
  const txt = (await D.innerText()).replace(/\s+/g, " ");
  const closeX = await dlg.getByRole("button", { name: /Close/ }).count();
  const ph = await dlg.getByPlaceholder("Search").count();
  const radios = await dlg.getByRole("radio").evaluateAll(es => es.map(e => (e.closest("label")?.innerText || "").trim() + (e.disabled ? "[disabled]" : "") + (e.checked ? "[checked]" : "")));
  const cancel = await dlg.getByRole("button", { name: "Cancel", exact: true }).count();
  const install = dlg.getByRole("button", { name: "Install", exact: true });
  const instDis = await install.isDisabled();
  const size = await dlg.evaluate(e => Math.round(e.getBoundingClientRect().width));
  // focus trap: tab 30 times, active must stay in dialog
  let escaped = false;
  for (let i = 0; i < 40; i++) { await p.keyboard.press("Tab"); const inside = await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")); if (!inside) { escaped = true; break; } }
  const s3 = await sh(p, "LNG-03");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const focusBack = await p.evaluate(() => document.activeElement?.textContent.trim());
  const ok3 = dn === 1 && /This action may take some time while we add the extra language to the entire collection\./.test(txt) && closeX >= 1 && ph === 1 && radios.length === 2 && /^All/.test(radios[0]) && /Selected \(0\)\[disabled\]/.test(radios[1]) && /\* Available default translation/.test(txt) && cancel === 1 && instDis && !escaped && /Install Language/.test(focusBack);
  rec("LNG-03", ok3 ? "PASS" : "FAIL", `dialog named "Install Language(s)" count=${dn}, width=${size}px; close X=${closeX}; search placeholder=${ph}; radios=${JSON.stringify(radios)}; legend present=${/\* Available default translation/.test(txt)}; Cancel=${cancel}; Install disabled=${instDis}; focus escaped dialog in 40 Tabs=${escaped}; focus after Escape on="${focusBack}"`, ok3 ? "" : s3);

  await opener.click(); await p.waitForTimeout(400);
  const items = async () => D.locator("[data-part=language]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
  let it = await items(); if (!it.length) it = await D.locator("li").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const labels = it.map(x => x.replace(/ Select(ed)?$/, ""));
  const star = new Set(["ar", "el", "en", "es", "fr", "ko", "my", "ru", "th", "tr", "uk"]);
  const installed = ["ar", "en", "es", "fr", "pt"];
  const keyOf = (x) => x.match(/\(([a-z]{2})\)/)[1];
  const nameOf = (x) => x.replace(/^\* /, "").split(" (")[0];
  const alpha = JSON.stringify(labels.map(nameOf)) === JSON.stringify([...labels.map(nameOf)].sort());
  const noInst = labels.every(x => !installed.includes(keyOf(x)));
  const starOk = labels.every(x => (x.startsWith("* ") === star.has(keyOf(x))));
  const starKeys = labels.filter(x => x.startsWith("* ")).map(keyOf);
  const expectedStar = [...star].filter(k => !installed.includes(k)).sort();
  const s4 = await sh(p, "LNG-04");
  const ok4 = labels.length === 27 && alpha && noInst && starOk && JSON.stringify(starKeys.sort()) === JSON.stringify(expectedStar);
  rec("LNG-04", ok4 ? "PASS" : "FAIL", `rows=${labels.length} (expected 27); alphabetical=${alpha}; installed listed=${!noInst}; star rows=${JSON.stringify(starKeys)}, expected ${JSON.stringify(expectedStar)}`, ok4 ? "" : s4);

  // LNG-05
  const search = D.getByPlaceholder("Search");
  const count = async () => (await items()).length || D.locator("li").count();
  const lbl = async () => (await D.locator("[data-part=language]").allInnerTexts()).map(x => x.replace(/\s+/g, " ").trim());
  await search.fill("ger"); await p.waitForTimeout(200); const a = await lbl();
  await search.fill(""); await p.waitForTimeout(100);
  await search.fill("GERMAN"); await p.waitForTimeout(200); const bb = await lbl();
  await search.fill("de"); await p.waitForTimeout(200); const c = await lbl();
  await search.fill("zzz"); await p.waitForTimeout(200); const dtxt = (await D.innerText()).replace(/\s+/g, " ");
  const clr = D.getByRole("button", { name: "Clear" });
  const clrN = await clr.count();
  const s5 = await sh(p, "LNG-05");
  if (clrN) await clr.first().click(); await p.waitForTimeout(200);
  const val = await search.inputValue(); const full = (await lbl()).length;
  // search "de": only names including "de" in the English name
  const cOk = c.every(x => /de/i.test(x.replace(/\([a-z]{2}\)/, "").replace(/^\* /, ""))) ;
  const ok5 = a.length === 1 && /German/.test(a[0]) && bb.length === 1 && /German/.test(bb[0]) && cOk && /No items available/.test(dtxt) && clrN >= 1 && val === "" && full === 27;
  rec("LNG-05", ok5 ? "PASS" : "FAIL", `"ger"=${JSON.stringify(a)}; "GERMAN"=${JSON.stringify(bb)}; "de"=${JSON.stringify(c)} (only names containing 'de'? ${cOk}); "zzz" shows 'No items available'=${/No items available/.test(dtxt)}; clear X count=${clrN}, after clear value="${val}" rows=${full}`, ok5 ? "" : s5);

  // LNG-06
  await D.locator("[data-part=language]").filter({ hasText: "German (de)" }).click();
  await D.locator("[data-part=language]").filter({ hasText: "Korean (ko)" }).click();
  await p.waitForTimeout(200);
  const german = (await D.locator("[data-part=language]").filter({ hasText: "German (de)" }).innerText()).replace(/\s+/g, " ");
  const btn = (await D.locator("[data-part=confirm]").innerText()).trim();
  const btnEn = await D.locator("[data-part=confirm]").isEnabled();
  await D.getByRole("radio", { name: /Selected \(2\)/ }).check(); await p.waitForTimeout(200);
  const selList = await lbl();
  await D.locator("[data-part=language]").filter({ hasText: "German (de)" }).click(); await p.waitForTimeout(200);
  const after1 = await lbl(); const rad1 = await D.getByRole("radio", { name: /Selected \(1\)/ }).count();
  const btn1 = (await D.locator("[data-part=confirm]").innerText()).trim();
  await D.locator("[data-part=language]").filter({ hasText: "Korean (ko)" }).click(); await p.waitForTimeout(200);
  const btn0 = (await D.locator("[data-part=confirm]").innerText()).trim(); const dis0 = await D.locator("[data-part=confirm]").isDisabled();
  const back = (await lbl()).length;
  const s6 = await sh(p, "LNG-06");
  // reselect one, cancel, reopen
  await D.locator("[data-part=language]").filter({ hasText: "German (de)" }).click();
  await D.getByRole("button", { name: "Cancel", exact: true }).click(); await p.waitForTimeout(300);
  const closed = (await p.getByRole("dialog", { name: "Install Language(s)" }).count()) === 0;
  const rowsAfter = await names(p);
  await opener.click(); await p.waitForTimeout(400);
  const reSel = await D.getByRole("radio", { name: /Selected \(0\)/ }).count();
  const reBtn = (await D.locator("[data-part=confirm]").innerText()).trim();
  const ok6 = /Selected/.test(german) && btn === "Install (2)" && btnEn && selList.length === 2 && after1.length === 1 && rad1 === 1 && btn0 === "Install" && dis0 && back === 27 && closed && !rowsAfter.some(x => /German/.test(x)) && reSel === 1 && reBtn === "Install";
  rec("LNG-06", ok6 ? "PASS" : "FAIL", `German row after click="${german}"; button="${btn}" enabled=${btnEn}; Selected (2) view lists ${JSON.stringify(selList)}; after deselecting one: ${after1.length} row, radio 'Selected (1)'=${rad1}, button="${btn1}"; at 0: button="${btn0}" disabled=${dis0}, view returns to All with ${back} rows; Cancel closed=${closed}, nothing installed=${!rowsAfter.some(x => /German/.test(x))}; reopened: Selected (0)=${reSel}, button="${reBtn}"`, ok6 ? "" : s6);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);

  // LNG-18: select a row, Escape; install; navigate; no dialog / no Save
  await opener.click(); await p.waitForTimeout(300);
  await D.locator("[data-part=language]").filter({ hasText: "Dutch (nl)" }).click();
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const dlgs1 = await dialogs(p);
  await opener.click(); await p.waitForTimeout(300);
  await D.locator("[data-part=language]").filter({ hasText: "Dutch (nl)" }).click();
  await D.locator("[data-part=confirm]").click(); await p.waitForTimeout(400);
  await section(p, "Collection"); await p.waitForTimeout(500);
  const dlgs2 = await dialogs(p);
  const onColl = (await title(p).catch(() => "")) ;
  await section(p, "Languages"); await p.waitForTimeout(500);
  const rowsL = await names(p);
  const saveBtn = await S(p).getByRole("button", { name: /^Save$/ }).count();
  await opener.click(); await p.waitForTimeout(300);
  const reOpen = (await D.getByRole("radio", { name: /Selected \(0\)/ }).count());
  await p.keyboard.press("Escape");
  const ok18 = dlgs1.length === 0 && dlgs2.length === 0 && onColl !== "Languages" && rowsL.some(x => /Dutch/.test(x)) && saveBtn === 0 && reOpen === 1;
  const s18 = await sh(p, "LNG-18");
  rec("LNG-18", ok18 ? "PASS" : "FAIL", `dialogs after Escape on a selection=${JSON.stringify(dlgs1)}; after install + rail click to "${onColl}" dialogs=${JSON.stringify(dlgs2)}; Dutch row present on return=${rowsL.some(x => /Dutch/.test(x))}; Save buttons on page=${saveBtn}; reopened modal selection empty=${reOpen === 1}`, ok18 ? "" : s18);
  rec("_errs-A2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
