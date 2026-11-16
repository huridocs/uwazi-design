import { launch, open, S, shot } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, modalTxt, lngRows, goto, installLang, rowOf, menuOf, beacon, newBeacon, langCount, activity } from "./u.mjs";
import { arm } from "./dev.mjs";
const { rec, save } = mk("lng2");
const b = await launch();
const openInstall = async (page, names) => {
  await S(page).getByRole("button", { name: "Install Language(s)" }).click(); await page.waitForTimeout(300);
  const d = page.locator("[role=dialog]:not([inert] *)").last();
  for (const n of names) await d.locator("[data-part=language]").filter({ hasText: n }).first().click();
  await d.getByRole("button", { name: /^Install \(\d+\)/ }).click(); await page.waitForTimeout(300);
};

// ---------- LNG-07 and LNG-08
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page);
  await openInstall(page, ["German", "Korean"]);
  const dlgs = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).length);
  const r1 = await lngRows(page);
  const marks = r1.filter((r) => /Installing/.test(r));
  const nb1 = await newBeacon(page, before);
  const running = nb1.filter((x) => /Installing languages/.test(x));
  await shot(page, "LNG-07-running");
  // LNG-08 while installing
  const mDe = await menuOf(page, "German");
  const mEs = await (async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(150); const m = await menuOf(page, "Spanish"); await page.keyboard.press("Escape"); await page.waitForTimeout(150); return m; })();
  await shot(page, "LNG-08-installing");
  // second install while first runs
  await openInstall(page, ["Italian"]);
  const nb2 = await newBeacon(page, before);
  const running2 = nb2.filter((x) => /Installing languages/.test(x));
  await page.waitForTimeout(4500);
  const r2 = await lngRows(page);
  const nb3 = await newBeacon(page, before);
  const done = nb3.filter((x) => /Languages installed successfully/.test(x));
  const stillRunning = nb3.filter((x) => /Installing languages/.test(x));
  const mDe2 = await menuOf(page, "German"); await page.keyboard.press("Escape");
  await shot(page, "LNG-07-done");
  const ok7 = dlgs === 0 && marks.length === 2 && running.length >= 1 && running2.length >= 2 && !r2.some((r) => /Installing/.test(r)) && done.length === 2 && stillRunning.length === 0;
  rec("LNG-07", ok7 ? "PASS" : "FAIL", `modal closed (open dialogs=${dlgs}); rows with Installing marker: ${JSON.stringify(marks)}; running Beacon entries after install of German+Korean: ${JSON.stringify(running)}; after a second install (Italian) started while the first ran: ${JSON.stringify(running2)}; after 4.5 s markers left=${r2.filter((r) => /Installing/.test(r)).length}; "Languages installed successfully" entries=${done.length} ${JSON.stringify(done)}; still running=${stillRunning.length}`, "LNG-07-done.png");
  const f = (m) => m.map((x) => x.t + (x.dis ? "(disabled)" : "")).join(", ");
  const unDeBusy = mDe.find((x) => x.t === "Uninstall"); const unDeDone = mDe2.find((x) => x.t === "Uninstall");
  const esOk = mEs.every((x) => !x.dis || x.t === "Make default" && false);
  rec("LNG-08", unDeBusy?.dis && unDeDone && !unDeDone.dis && mEs.find((x) => x.t === "Uninstall") && !mEs.find((x) => x.t === "Uninstall").dis ? "PASS" : "FAIL", `German menu while installing: ${f(mDe)}; Spanish menu meanwhile: ${f(mEs)}; German menu after install ended: ${f(mDe2)}`, "LNG-08-installing.png");
  rec("lng2-console-a", "INFO", JSON.stringify(realErr(errors)).slice(0, 600));
  await page.context().close();
}

// ---------- LNG-09 via Dev panel, then the console hook for comparison
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page);
  const st = await arm(page, "Install or Uninstall", "Disk full", "Languages");
  await openInstall(page, ["German"]);
  await page.waitForTimeout(4200);
  const rs = await lngRows(page);
  const nb = await newBeacon(page, before);
  const err = nb.filter((x) => /An error occurred/.test(x));
  const failedMark = rs.some((r) => /failed/i.test(r)); const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  await shot(page, "LNG-09");
  rec("LNG-09", failedMark && retry && err.length === 1 ? "PASS" : "FAIL", `Dev panel: "${st}". Installed German with the switch armed. After 4.2 s the row reads "${rs.find((r) => /German/.test(r))}", Retry buttons=${retry}, error entries "An error occurred"=${err.length}; new Beacon entries ${JSON.stringify(nb)}. The Dev panel "Install or Uninstall" switch is not read by installLanguages (it checks a module flag set only by window.__failNextLanguageInstall()), so the install succeeded`, "LNG-09.png");
  await page.context().close();
}
{
  // supplement: the console hook
  const { page } = await open(b, "languages");
  const before = await beacon(page);
  await page.evaluate(() => window.__failNextLanguageInstall());
  await openInstall(page, ["German"]);
  await page.waitForTimeout(4200);
  const rs = await lngRows(page);
  const nb = await newBeacon(page, before);
  const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  const failedRow = rs.find((r) => /German/.test(r));
  const err = nb.filter((x) => /An error occurred/.test(x));
  const running = nb.filter((x) => /Installing languages/.test(x));
  if (retry) await S(page).getByRole("button", { name: "Retry" }).click();
  await page.waitForTimeout(400);
  const rs2 = await lngRows(page);
  await page.waitForTimeout(4000);
  const rs3 = await lngRows(page);
  await shot(page, "LNG-09-hook");
  rec("LNG-09-hook(info)", "INFO", `console hook __failNextLanguageInstall(): row "${failedRow}", Retry=${retry}, error entries=${JSON.stringify(err)}, running entries after=${running.length}; after Retry: ${JSON.stringify(rs2.find((r) => /German/.test(r)))} then ${JSON.stringify(rs3.find((r) => /German/.test(r)))}`, "LNG-09-hook.png");
  await page.context().close();
}

// ---------- LNG-10
{
  const { page, errors } = await open(b, "languages");
  const c0 = await langCount(page);
  await goto(page, "Languages");
  await installLang(page, ["German"], 4000);
  const c1 = await langCount(page);
  await goto(page, "Translations");
  await S(page).locator("[data-part=row]").filter({ hasText: "Person" }).first().click(); await page.waitForTimeout(600);
  const hdr = (await S(page).locator("[role=columnheader]").allInnerTexts()).map(squash);
  const deCol = hdr.find((h) => /Deutsch/.test(h));
  const cell = S(page).locator('input[aria-label$=", untranslated"][aria-label*="in German"]').first();
  const nUntr = await S(page).locator('input[aria-label*="in German"][aria-label$=", untranslated"]').count();
  const nAll = await S(page).locator('input[aria-label*="in German"]').count();
  const val = await cell.inputValue();
  const lbl = await cell.getAttribute("aria-label");
  const key = lbl.replace(/ in German.*/, "");
  const enCell = squash(await S(page).locator("[data-part=row]").filter({ hasText: key }).first().innerText());
  const pillCls = await S(page).locator("[role=columnheader]").filter({ hasText: "Deutsch" }).locator("span").last().evaluate((e) => e.className);
  const cellPillCls = await cell.locator("xpath=preceding-sibling::*").first().evaluate((e) => e.className).catch(() => "?");
  const cellPill = await cell.evaluate((e) => e.closest("span.flex")?.querySelector("span")?.className || "?");
  await shot(page, "LNG-10-translations");
  // Pages editor
  await goto(page, "Pages");
  await S(page).locator("[data-part=row]").filter({ hasText: "About this collection" }).first().click(); await page.waitForTimeout(800);
  const pt = squash(await S(page).innerText());
  const pagesHasDe = /German|Deutsch/.test(pt);
  const pagesLangs = await S(page).locator("button").evaluateAll((e) => e.map((x) => x.innerText.trim()).filter((x) => /^(EN|ES|FR|AR|DE|KO)\b/.test(x)));
  await shot(page, "LNG-10-pages");
  const ok = c1 === c0 + 1 && !!deCol && /DE/.test(deCol) && nAll > 0 && nUntr === nAll && pagesHasDe;
  rec("LNG-10", ok ? "PASS" : "FAIL", `Dashboard LANGUAGES ${c0} -> ${c1}; Translations (Person) headers ${JSON.stringify(hdr)}; German cells=${nAll}, untranslated=${nUntr}; first German cell "${val}" for key "${key}" (equals English text: ${val === key}); header pill class "${pillCls.slice(0, 80)}"; cell pill class "${cellPill.slice(0, 80)}"; Pages editor (About this collection) mentions German/Deutsch=${pagesHasDe}, the editor's language buttons are ${JSON.stringify(pagesLangs)} (no DE)`, "LNG-10-pages.png");
  rec("lng2-console-c", "INFO", JSON.stringify(realErr(errors)).slice(0, 600));
  await page.context().close();
}
save(); await b.close();
