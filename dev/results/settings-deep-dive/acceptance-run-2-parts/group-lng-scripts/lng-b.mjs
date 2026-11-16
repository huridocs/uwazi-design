// LNG-07, 08, 10, PO1, PO3 (install flow and propagation), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifTitles, notifMatch, beacon } from "./u.mjs";
const { rec, save } = recorder("./lng-b.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated/.test(e));
const names = (p) => S(p).locator("[role=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));
const D = (p) => p.locator("[data-component=InstallLanguagesModal]");
async function install(p, labels) {
  await S(p).getByRole("button", { name: "Install Language(s)" }).click();
  await p.waitForTimeout(300);
  for (const l of labels) await D(p).locator("[data-part=language]").filter({ hasText: l }).click();
  await D(p).locator("[data-part=confirm]").click();
}
const menuItems = async (p, name) => {
  await S(p).getByRole("button", { name: `Actions for ${name}` }).click();
  await p.waitForTimeout(250);
  const items = await p.evaluate(() => [...document.querySelectorAll("[role=menuitem],[role=menu] button")].filter(e => !e.closest("[inert]")).map(e => e.textContent.trim() + (e.disabled || e.getAttribute("aria-disabled") === "true" ? " [disabled]" : "")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  return items;
};
const articles = (p, re) => notifMatch(p, re);

// ---- LNG-07 + LNG-08 ----
{
  const { page: p, errors } = await open(b, "languages");
  await install(p, ["German (de)", "Korean (ko)"]);
  await p.waitForTimeout(500);
  const modalGone = (await p.getByRole("dialog", { name: "Install Language(s)" }).count()) === 0;
  const r1 = await names(p);
  const markers = r1.filter(x => /Installing/.test(x));
  const tasks1 = await articles(p, /Installing languages/);
  const bc1 = await beacon(p);
  const s7 = await sh(p, "LNG-07-installing");
  // LNG-08 while installing
  const mi_de = await menuItems(p, "German");
  const mi_ar = await menuItems(p, "Arabic");
  const mi_pt = await menuItems(p, "Portuguese");
  // second install while running
  await install(p, ["Dutch (nl)"]);
  await p.waitForTimeout(400);
  const tasks2 = await articles(p, /Installing languages/);
  await p.waitForTimeout(4200);
  const r2 = await names(p);
  const done = await articles(p, /Languages installed successfully/);
  const tasksLeft = await articles(p, /Installing languages/);
  const mi_de2 = await menuItems(p, "German");
  const s7b = await sh(p, "LNG-07-done");
  const ok7 = modalGone && markers.length === 2 && tasks1.length >= 1 && tasks2.length >= 2 && !r2.some(x => /Installing/.test(x)) && done.length >= 1 && tasksLeft.length === 0;
  rec("LNG-07", ok7 ? "PASS" : "FAIL", `modal closed=${modalGone}; rows with Installing marker=${JSON.stringify(markers)}; Beacon task articles while installing: ${JSON.stringify(tasks1)}; after a 2nd install (Dutch) while the first ran: ${tasks2.length} running 'Installing languages' tasks ${JSON.stringify(tasks2)}; after ~4s markers left=${r2.filter(x => /Installing/.test(x)).length}; success entries "Languages installed successfully"=${JSON.stringify(done)} (one per install job: ${done.length}); leftover running tasks=${tasksLeft.length}`, ok7 ? "" : s7);
  const ok8 = /Uninstall.*\[disabled\]/.test(mi_de.join("|")) && /Make default.*\[disabled\]/.test(mi_de.join("|")) && mi_ar.includes("Uninstall") && !mi_ar.some(x => /Uninstall.*disabled/.test(x)) && mi_pt.includes("Uninstall") && mi_de2.includes("Uninstall");
  rec("LNG-08", ok8 ? "PASS" : "FAIL", `while installing: German menu=${JSON.stringify(mi_de)}; Arabic menu=${JSON.stringify(mi_ar)}; Portuguese menu=${JSON.stringify(mi_pt)}; after install finished German menu=${JSON.stringify(mi_de2)}`, ok8 ? "" : s7);
  rec("_errs-B1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-10 ----
{
  const { page: p, errors } = await open(b, "languages");
  await install(p, ["German (de)", "Korean (ko)"]);
  await p.waitForTimeout(4500);
  await section(p, "Translations");
  await p.waitForTimeout(500);
  await S(p).locator("[data-part=row]").filter({ hasText: "User Interface" }).first().click();
  await p.waitForTimeout(800);
  const heads = await S(p).locator("[role=columnheader]").allInnerTexts();
  const cellInfo = await S(p).locator("[role=row]").nth(1).evaluate(r => [...r.querySelectorAll("input")].map(i => i.getAttribute("aria-label") + " => " + i.value));
  const firstRowSrc = await S(p).locator("[role=row]").nth(1).innerText();
  // all German inputs equal source, flagged untranslated
  const deCells = await S(p).locator('input[aria-label*=" in German"]').evaluateAll(es => es.slice(0, 40).map(e => ({ l: e.getAttribute("aria-label"), v: e.value })));
  const deOk = deCells.length > 0 && deCells.every(c => /untranslated/.test(c.l) && c.l.startsWith(c.v + " in German") );
  const koCells = await S(p).locator('input[aria-label*=" in Korean"]').evaluateAll(es => es.slice(0, 40).map(e => ({ l: e.getAttribute("aria-label"), v: e.value })));
  const koTr = koCells.filter(c => !/untranslated/.test(c.l)).length;
  const s10 = await sh(p, "LNG-10-translations");
  // template context too
  await S(p).getByRole("button", { name: "Back" }).click().catch(() => {}); await p.waitForTimeout(400);
  // Dashboard
  await section(p, "Dashboard"); await p.waitForTimeout(600);
  const dash = (await S(p).innerText()).replace(/\n+/g, " | ");
  const dashLang = /(^|\| )LANGUAGES? \| \d+/i.test(dash);
  const s10d = await sh(p, "LNG-10-dashboard");
  // Pages editor
  await section(p, "Pages"); await p.waitForTimeout(500);
  await S(p).getByRole("button", { name: /^Edit/ }).first().click(); await p.waitForTimeout(1000);
  await p.getByRole("button", { name: /Page language/ }).click(); await p.waitForTimeout(300);
  const opts = await p.evaluate(() => [...document.querySelectorAll("[role=option]")].filter(e => !e.closest("[inert]")).map(e => e.textContent.trim()));
  const s10p = await sh(p, "LNG-10-pages");
  const pagesHas = opts.some(o => /German|Deutsch/.test(o)) && opts.some(o => /Korean|한국어/.test(o));
  const headsOk = heads.some(h => /Deutsch/.test(h)) && heads.some(h => /DE/.test(h));
  const ok10 = headsOk && deOk && dashLang && pagesHas;
  rec("LNG-10", ok10 ? "PASS" : "FAIL",
    `Translations (User Interface) headers=${JSON.stringify(heads)}; German cells (first ${deCells.length}) all equal source and flagged untranslated=${deOk} e.g. ${JSON.stringify(deCells.slice(0, 2))}; Korean cells translated (predefined)=${koTr}/${koCells.length}; Dashboard shows a language count=${dashLang} (dashboard text: ${dash.slice(0, 160)}...); Pages editor language options=${JSON.stringify(opts)}`,
    ok10 ? "" : (dashLang ? s10 : s10d));
  rec("_errs-B2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
