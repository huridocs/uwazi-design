import { launch, open, S, shot } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, modalTxt, lngRows, goto, installLang, rowOf, menuOf, beacon, newBeacon, langCount, activity, openCtx, cell, saveEd } from "./u.mjs";
import { arm } from "./dev.mjs";
const { rec, save } = mk("lng4");
const b = await launch();
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();
const menuPick = async (p, lang, item) => { await p.getByRole("button", { name: `Actions for ${lang}` }).click(); await p.waitForTimeout(200); await p.getByRole("menuitem", { name: item, exact: true }).click(); await p.waitForTimeout(400); };
const typed = async (p, btn) => { const d = D(p); await d.locator("input").first().fill("CONFIRM"); await d.locator("[data-part=confirm]").click(); await p.waitForTimeout(500); };

// ---------- LNG-15
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page);
  const rows0 = await lngRows(page);
  await openCtx(page, "User Interface");
  const trInp = S(page).locator('input[aria-label*=" in Spanish"]:not([aria-label$=", untranslated"])').first();
  const lab = await trInp.getAttribute("aria-label"); const key = lab.replace(/ in Spanish.*/, ""); const orig = await trInp.inputValue();
  await trInp.fill(orig + " EDITED"); await saveEd(page);
  await openCtx(page, "Person");
  const tInp = cell(page, "Person", "Spanish"); await tInp.fill("Persona EDITED"); await saveEd(page);
  const savedUi = await (async () => { await openCtx(page, "User Interface"); return cell(page, key, "Spanish").inputValue(); })();
  const nb0 = (await newBeacon(page, before)).length;
  await goto(page, "Languages");
  const b2 = await beacon(page);
  await menuPick(page, "Spanish", "Reset"); await typed(page);
  const nb = await newBeacon(page, b2); const rs = nb.filter((x) => /Language reset success/.test(x));
  const rows1 = await lngRows(page);
  await openCtx(page, "User Interface");
  const afterUi = await cell(page, key, "Spanish").inputValue();
  await openCtx(page, "Person");
  const afterT = await cell(page, "Person", "Spanish").inputValue();
  const act = await activity(page);
  await shot(page, "LNG-15");
  const ok = rs.length === 1 && afterUi === orig && afterT === "Persona EDITED" && JSON.stringify(rows0) === JSON.stringify(rows1) && act.some((a) => /Reset language/.test(a));
  rec("LNG-15", ok ? "PASS" : "FAIL", `edited System key "${key}" es "${orig}" -> "${savedUi}" (saved); Person "Person" es -> "Persona EDITED"; after Reset es + CONFIRM: Beacon "Language reset success" entries=${rs.length} ${JSON.stringify(nb)}; System key now "${afterUi}" (expected predefined "${orig}"); template key now "${afterT}" (expected unchanged "Persona EDITED"); Languages table unchanged=${JSON.stringify(rows0) === JSON.stringify(rows1)}; activity ${JSON.stringify(act.filter((a) => /eset/.test(a)))}`, "LNG-15.png");
  rec("lng4-console-a", "INFO", JSON.stringify(realErr(errors)).slice(0, 400));
  await page.context().close();
}

// ---------- LNG-16
{
  const { page, errors } = await open(b, "languages");
  const before = await beacon(page);
  await openCtx(page, "Person");
  await cell(page, "Person", "French").fill("Personne EDITED"); await saveEd(page);
  const c0 = await langCount(page);
  await goto(page, "Languages");
  await menuPick(page, "French", "Uninstall"); await typed(page);
  const gone = !(await lngRows(page)).some((r) => /French/.test(r));
  const nbNow = await newBeacon(page, before);
  const pend = nbNow.filter((x) => /Uninstalling language/.test(x));
  await page.waitForTimeout(2200);
  const nbLater = await newBeacon(page, before);
  const doneN = nbLater.filter((x) => /Language uninstalled successfully/.test(x)); const stillPend = nbLater.filter((x) => /Uninstalling language/.test(x));
  await openCtx(page, "Person");
  const hdr = (await S(page).locator("[role=columnheader]").allInnerTexts()).map(squash);
  await goto(page, "Translations");
  const listTxt = squash(await S(page).innerText());
  const c1 = await langCount(page);
  await goto(page, "Languages");
  await installLang(page, ["French"], 4000);
  await openCtx(page, "Person");
  const back = await cell(page, "Person", "French").inputValue();
  const hdr2 = (await S(page).locator("[role=columnheader]").allInnerTexts()).map(squash);
  await shot(page, "LNG-16");
  const ok = gone && pend.length === 1 && doneN.length === 1 && stillPend.length === 0 && !hdr.some((h) => /Fran/.test(h)) && !/\bfr \d+%/.test(listTxt) && c1 === c0 - 1 && back === "Person";
  rec("LNG-16", ok ? "PASS" : "FAIL", `fr cell edited to "Personne EDITED" and saved; after Uninstall + CONFIRM: row gone=${gone}; Beacon while pending ${JSON.stringify(pend)}; after 2.2 s "Language uninstalled successfully" entries=${doneN.length}, still pending=${stillPend.length}; Person editor headers ${JSON.stringify(hdr)}; Translations list shows fr progress=${/\bfr \d+%/.test(listTxt)}; Dashboard language count ${c0} -> ${c1}; after reinstalling French the Person fr cell reads "${back}" (expected default text "Person"); headers ${JSON.stringify(hdr2)}`, "LNG-16.png");
  await page.context().close();
}

// ---------- LNG-17
{
  const subs = [];
  const trial = async (label, act, scope, doIt) => {
    const { page } = await open(b, "languages");
    const bf = await beacon(page);
    const st = await arm(page, scope, "Dev panel injected failure", "Languages");
    await doIt(page);
    await page.waitForTimeout(2500);
    const nb = await newBeacon(page, bf); const err = nb.filter((x) => /An error occurred/.test(x));
    await shot(page, `LNG-17-${label}`);
    const o = `${act} with scope "${scope}": ${err.length} "An error occurred" entries; other new Beacon entries ${JSON.stringify(nb.filter((x) => !/An error occurred/.test(x)))}`;
    await page.context().close();
    return { n: err.length, o };
  };
  const r1 = await trial("default", "Make default Spanish", "Save", async (p) => { await menuPick(p, "Spanish", "Make default"); await D(p).getByRole("button", { name: "Make default", exact: true }).click(); });
  const r2 = await trial("reset", "Reset Spanish", "Save", async (p) => { await menuPick(p, "Spanish", "Reset"); await typed(p); });
  const r3 = await trial("reset-iu", "Reset Spanish", "Install or Uninstall", async (p) => { await menuPick(p, "Spanish", "Reset"); await typed(p); });
  const r4 = await trial("uninstall", "Uninstall French", "Install or Uninstall", async (p) => { await menuPick(p, "French", "Uninstall"); await typed(p); });
  rec("LNG-17", [r1, r2, r4].every((r) => r.n === 1) ? "PASS" : "FAIL", `armed through the Dev panel, then: ${[r1, r2, r3, r4].map((r) => r.o).join(" | ")}. (grep of the source: consumeFailureAtom is called only by SettingsDeletes and CodePageEditor, not by the Languages actions)`, "LNG-17-uninstall.png");
}

// ---------- LNG-18
{
  const { page } = await open(b, "languages");
  const saveBtns = await page.getByRole("button", { name: /^save/i }).count();
  await installLang(page, ["German"], 300);
  const dl1 = await page.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).length);
  await goto(page, "Dashboard");
  const dl2 = await page.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).length);
  const t = squash(await S(page).innerText());
  await goto(page, "Languages");
  const german = (await lngRows(page)).some((r) => /German/.test(r));
  await S(page).getByRole("button", { name: "Install Language(s)" }).click(); await page.waitForTimeout(300);
  await D(page).locator("[data-part=language]").filter({ hasText: "Korean" }).first().click();
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const dl3 = await page.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).length);
  const discard = await page.getByText("Discard changes?").count();
  await S(page).getByRole("button", { name: "Install Language(s)" }).click(); await page.waitForTimeout(300);
  const sel = (await D(page).locator("[data-part=language]").allInnerTexts()).filter((x) => /Selected$/.test(squash(x))).length;
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  await goto(page, "Dashboard"); await goto(page, "Languages");
  const dl4 = await page.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).length);
  rec("LNG-18", saveBtns === 0 && dl1 === 0 && dl2 === 0 && dl3 === 0 && !discard && german && sel === 0 && dl4 === 0 ? "PASS" : "FAIL", `Save buttons=${saveBtns}; after install dialogs=${dl1}; rail click to Dashboard dialogs=${dl2}; German row present after returning=${german}; Escape with Korean selected: dialogs=${dl3}, "Discard changes?"=${discard}; reopened: selected rows=${sel}; rail round trip dialogs=${dl4}`);
  await page.context().close();
}

// ---------- LNG-PO3 (A6)
{
  const { page } = await open(b, "languages");
  const chrome = async () => ({
    nav: squash(await page.evaluate(() => ["[data-part=start]", "[data-part=settings]", "[data-part=tools]"].map((q) => document.querySelector("header " + q)?.innerText || "").join(" "))),
    rail: squash(await page.locator('nav[aria-label="Settings navigation"]').innerText()),
    title: squash(await S(page).locator("h2").first().innerText()),
  });
  const pickerBtns = async () => page.locator("header button, header [role=combobox], header select").evaluateAll((e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText || "").trim()).filter((x) => /language|^EN$|^ES$|^FR$|^AR$/i.test(x)));
  const c0 = await chrome(); const pk0 = await pickerBtns();
  await installLang(page, ["German"], 4000);
  await menuPick(page, "German", "Make default");
  await D(page).getByRole("button", { name: "Make default", exact: true }).click(); await page.waitForTimeout(400);
  await openCtx(page, "User Interface");
  const inp = S(page).locator('input[aria-label*=" in Spanish"]:not([aria-label$=", untranslated"])').first();
  const key = (await inp.getAttribute("aria-label")).replace(/ in Spanish.*/, ""); const v = await inp.inputValue();
  await inp.fill(v + " EDITED"); await saveEd(page);
  const c1 = await chrome(); const pk1 = await pickerBtns();
  await goto(page, "Languages");
  const c2 = await chrome();
  const dash = await langCount(page);
  await goto(page, "Languages");
  const rows = await lngRows(page);
  const same = (a, b2) => a.nav === b2.nav && a.rail === b2.rail;
  await shot(page, "LNG-PO3");
  rec("LNG-PO3", same(c0, c1) && same(c0, c2) && c2.title === "Languages" && pk0.length === 0 && pk1.length === 0 && dash === 5 && rows.some((r) => /German.*Default/.test(r)) ? "PASS" : "FAIL", `installed German, made it default (rows ${JSON.stringify(rows)}), edited System key "${key}" in es and saved. Navbar text (Beacon excluded) before/after identical=${c0.nav === c1.nav && c0.nav === c2.nav} [${c0.nav} / ${c1.nav}]; rail text identical=${c0.rail === c1.rail && c0.rail === c2.rail}; Languages title "${c2.title}"; header language pickers before/after ${JSON.stringify(pk0)}/${JSON.stringify(pk1)}; Dashboard language count ${dash} (4 seed + German = 5)`, "LNG-PO3.png");
  await page.context().close();
}
save(); await b.close();
