import { launch, open, S, shot } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, modalTxt, lngRows, goto, installLang, rowOf, menuOf, beacon, newBeacon, langCount, activity, openCtx, cell, saveEd } from "./u.mjs";
import { arm } from "./dev.mjs";
const { rec, save } = mk("lng3");
const b = await launch();
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();
const menuPick = async (p, lang, item) => { await p.getByRole("button", { name: `Actions for ${lang}` }).click(); await p.waitForTimeout(200); await p.getByRole("menuitem", { name: item, exact: true }).click(); await p.waitForTimeout(400); };
const defBadgeRows = async (p) => (await lngRows(p)).filter((r) => /Default$/.test(r)).map((r) => r.split(" (")[0]);

// ---------- LNG-11 + LNG-12 + X-04 default, X-09 default
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page); const actBefore = (await activity(page)).length;
  await menuPick(page, "Spanish", "Make default");
  const txt = squash(await D(page).innerText());
  const names = /installed later|source/i.test(txt) && /untranslated/i.test(txt);
  await shot(page, "LNG-11");
  await D(page).getByRole("button", { name: "Cancel", exact: true }).click(); await page.waitForTimeout(300);
  const afterCancel = await defBadgeRows(page); const nbC = await newBeacon(page, before); const actC = (await activity(page)).length;
  await menuPick(page, "Spanish", "Make default");
  await D(page).getByRole("button", { name: "Make default", exact: true }).click(); await page.waitForTimeout(500);
  const afterOk = await defBadgeRows(page);
  const nb = await newBeacon(page, before); const dn = nb.filter((x) => /Default language change success/.test(x));
  const act = await activity(page); const actNew = act.slice(0, act.length - actBefore);
  await shot(page, "LNG-11-after");
  const ok11 = names && afterCancel.join() === "English" && nbC.length === 0 && actC === actBefore && afterOk.join() === "Spanish" && dn.length === 1 && act.length === actBefore + 1;
  rec("LNG-11", ok11 ? "PASS" : "FAIL", `dialog "${txt}"; names effect (later installs and untranslated)=${names}; after Cancel default=${afterCancel}, new Beacon=${nbC.length}, activity entries ${actBefore}->${actC}; after confirm default=${afterOk}; Beacon "Default language change success" entries=${dn.length} (all new: ${JSON.stringify(nb)}); activity log ${actBefore} -> ${act.length}: ${JSON.stringify(act.filter((a) => /default/i.test(a)))}`, "LNG-11-after.png");
  // X-09 line: default change
  rec("X-09/default", /Set .Spanish. as the default language \[admin\]/.test(act.join("|")) || act.some((a) => /default language/.test(a) && /\[.+\]/.test(a) && !/\[\]/.test(a)) ? "PASS" : "FAIL", `activity entries ${JSON.stringify(act.slice(0, 3))}`);
  // LNG-12
  await openCtx(page, "Person");
  const hdr = await S(page).locator("[role=columnheader]").evaluateAll((e) => e.map((x) => ({ t: x.innerText.replace(/\s+/g, " ").trim(), cls: [...x.querySelectorAll("span")].pop()?.className || "" })));
  const ro = await S(page).locator("[data-part=row]").first().evaluate((e) => ({ inputs: [...e.querySelectorAll("input")].map((i) => i.getAttribute("aria-label")), text: e.innerText.replace(/\s+/g, " ").trim() }));
  const srcCols = hdr.filter((h) => /bg-ink/.test(h.cls)).map((h) => h.t);
  const enInputs = await S(page).locator('input[aria-label*=" in English"]').count();
  const enUntr = await S(page).locator('input[aria-label*=" in English"][aria-label$=", untranslated"]').count();
  const esInputs = await S(page).locator('input[aria-label*=" in Spanish"]').count();
  await shot(page, "LNG-12");
  const ok12 = srcCols.length === 1 && /Español|Spanish/.test(srcCols[0]) && esInputs === 0 && enInputs > 0 && hdr[1] && /ES/.test(hdr[1].t);
  rec("LNG-12", ok12 ? "PASS" : "FAIL", `Person editor headers ${JSON.stringify(hdr.map((h) => h.t))}; primary-pill (bg-ink) column(s) ${JSON.stringify(srcCols)}; Spanish inputs=${esInputs} (read-only source); English inputs=${enInputs}, flagged untranslated=${enUntr}; first row "${ro.text}"; Spanish source cell shows the key text (English) not Spanish: ${/Person/.test(ro.text)}`, "LNG-12.png");
  rec("lng3-console-a", "INFO", JSON.stringify(realErr(errors)).slice(0, 500));
  await page.context().close();
}

// ---------- LNG-13 reset dialog
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page);
  await menuPick(page, "Spanish", "Reset");
  const d = D(page);
  const title = await d.evaluate((e) => { const id = e.getAttribute("aria-labelledby"); return (id && document.getElementById(id)?.textContent) || e.getAttribute("aria-label") || e.querySelector("h2")?.textContent; });
  const band = squash(await d.locator("[data-part=warning]").innerText().catch(() => ""));
  const bandBg = await d.locator("[data-part=warning]").evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => "");
  const msg = squash(await d.locator("[data-part=message]").innerText().catch(() => ""));
  const impact = (await d.locator("[data-part=impact] li").allInnerTexts()).map(squash);
  const label = squash(await d.locator("label").first().innerText());
  const box = await d.boundingBox();
  const btns = (await d.locator("footer button, [data-part=footer] button").allInnerTexts()).map(squash);
  const allBtns = (await d.getByRole("button").allInnerTexts()).map(squash);
  const conf = d.locator("[data-part=confirm]"); const inp = d.locator("input[type=text], input:not([type])").first();
  const g = {}; for (const v of ["", "confirm", "CONFIRM ", "CONFIRM"]) { await inp.fill(v); g[JSON.stringify(v)] = !(await conf.isDisabled()); }
  await shot(page, "LNG-13");
  await inp.fill("CONFIRM");
  // close with the X, reopen: empty
  await d.getByRole("button", { name: /close/i }).first().click(); await page.waitForTimeout(300);
  const nbX = await newBeacon(page, before);
  await menuPick(page, "Spanish", "Reset");
  const emptyAfterX = (await D(page).locator("input").first().inputValue()) === "";
  await D(page).locator("input").first().fill("CONFIRM");
  await D(page).locator("[data-part=cancel]").click(); await page.waitForTimeout(300);
  const nbN = await newBeacon(page, before);
  await menuPick(page, "Spanish", "Reset");
  const emptyAfterNo = (await D(page).locator("input").first().inputValue()) === "";
  await D(page).locator("[data-part=cancel]").click(); await page.waitForTimeout(200);
  const ok = title === "Are you sure?" && /Other users will be affected by this action!/.test(band) && /seal|rgb/.test(bandBg || "x") && msg === "You are about to reset a language." && label === "Please type in CONFIRM:" && allBtns.some((x) => x === "No, cancel") && allBtns.some((x) => x === "Reset") && g['""'] === false && g['"confirm"'] === false && g['"CONFIRM "'] === false && g['"CONFIRM"'] === true && impact.some((x) => /System/.test(x) && /\d+ keys?/.test(x)) && emptyAfterX && emptyAfterNo && nbX.length === 0 && nbN.length === 0 && box.width > 480 && box.width < 540;
  rec("LNG-13", ok ? "PASS" : "FAIL", `title "${title}"; band "${band}" (bg ${bandBg}); body "${msg}"; impact ${JSON.stringify(impact)}; label "${label}"; buttons ${JSON.stringify(allBtns)}; Reset enabled by input: ${JSON.stringify(g)}; width ${Math.round(box.width)}px (md = 512); X closes and reopening is empty=${emptyAfterX}; "No, cancel" closes and reopening is empty=${emptyAfterNo}; Beacon entries after X/cancel ${nbX.length}/${nbN.length}`, "LNG-13.png");
  await page.context().close();
}

// ---------- LNG-14 uninstall dialog
{
  const { page } = await open(b, "languages");
  const before = await beacon(page);
  await menuPick(page, "French", "Uninstall");
  const d = D(page);
  const title = await d.evaluate((e) => { const id = e.getAttribute("aria-labelledby"); return (id && document.getElementById(id)?.textContent) || e.querySelector("h2")?.textContent; });
  const band = squash(await d.locator("[data-part=warning]").innerText());
  const msg = squash(await d.locator("[data-part=message]").innerText());
  const impact = (await d.locator("[data-part=impact] li").allInnerTexts()).map(squash);
  const label = squash(await d.locator("label").first().innerText());
  const btns = (await d.getByRole("button").allInnerTexts()).map(squash);
  const conf = d.locator("[data-part=confirm]"); const inp = d.locator("input").first();
  const g = {}; for (const v of ["", "confirm", "CONFIRM ", "CONFIRM"]) { await inp.fill(v); g[JSON.stringify(v)] = !(await conf.isDisabled()); }
  await shot(page, "LNG-14");
  await inp.fill("");
  await d.getByRole("button", { name: /close/i }).first().click(); await page.waitForTimeout(300);
  const rowsX = await lngRows(page);
  await menuPick(page, "French", "Uninstall"); await D(page).locator("[data-part=cancel]").click(); await page.waitForTimeout(300);
  const rowsN = await lngRows(page); const nb = await newBeacon(page, before);
  const ok = title === "Are you sure?" && /Other users will be affected by this action!/.test(band) && msg === "You are about to uninstall a language." && label === "Please type in CONFIRM:" && btns.includes("Uninstall") && btns.includes("No, cancel") && !g['""'] && !g['"confirm"'] && !g['"CONFIRM "'] && g['"CONFIRM"'] && impact.length >= 2 && impact.some((x) => /entit|record|version/i.test(x)) && impact.some((x) => /translated key/i.test(x)) && rowsX.some((r) => /French/.test(r)) && rowsN.some((r) => /French/.test(r)) && nb.length === 0;
  rec("LNG-14", ok ? "PASS" : "FAIL", `title "${title}"; band "${band}"; body "${msg}"; content counts ${JSON.stringify(impact)}; label "${label}"; buttons ${JSON.stringify(btns)}; accept enabled by input ${JSON.stringify(g)}; after X and after "No, cancel" French still listed (${rowsX.some((r) => /French/.test(r))}/${rowsN.some((r) => /French/.test(r))}), new Beacon entries=${nb.length}`, "LNG-14.png");
  await page.context().close();
}
save(); await b.close();
