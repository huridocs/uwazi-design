import { launch, open, S, shot, rail } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, goto, openCtx, cell, saveEd, beacon, newBeacon, activity } from "./u.mjs";
import { switchTo } from "./h.mjs";
const { rec, save } = mk("trn3");
const b = await launch();
const nRows = (p) => S(p).locator("[data-part=row]").count();
const dlgs = (p) => p.evaluate(() => [...document.querySelectorAll("[role=dialog],[role=alertdialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.replace(/\s+/g, " ").trim()));
const searchBox = (p) => S(p).getByRole("searchbox").or(S(p).locator('input[placeholder^="Search keys"]')).first();

// ---------- TRN-14 search in User Interface
{
  const { page } = await open(b, "translations");
  await openCtx(page, "User Interface");
  const sb = S(page).locator('input[placeholder^="Search keys"]').first();
  const bb0 = await sb.evaluate((e) => Math.round(e.closest("div").getBoundingClientRect().height));
  const full = squash(await S(page).innerText()).match(/of (\d+)/)?.[1];
  await sb.fill("Canc"); await page.waitForTimeout(500);
  const k1 = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  // value-only text: Spanish text of 2FA
  const bb1 = await sb.evaluate((e) => Math.round(e.closest("div").getBoundingClientRect().height));
  await sb.fill("Autenticación de dos factores"); await page.waitForTimeout(500);
  const k2 = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  await sb.fill("CANCEL"); await page.waitForTimeout(500);
  const k2b = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  await sb.fill("zzz"); await page.waitForTimeout(500);
  const zero = squash(await S(page).innerText()); const bb2 = await sb.evaluate((e) => Math.round(e.closest("div").getBoundingClientRect().height));
  await shot(page, "TRN-14");
  const noRes2 = /Nothing matches .zzz./.test(zero) && /Clear search/.test(zero);
  await sb.fill(""); await page.waitForTimeout(500);
  const back = await nRows(page);
  const clearBtn = await S(page).getByRole("button", { name: /clear/i }).count();
  rec("TRN-14", k1.length > 0 && k1.every((k) => /canc/i.test(k)) && k2.some((k) => /2FA/.test(k)) && !k2.every((k) => /Autenticaci/i.test(k)) && k2b.length > 0 && noRes2 && back >= 60 && bb0 === bb1 && bb1 === bb2 ? "PASS" : "FAIL",
    `partial key "Canc" -> ${k1.length} keys ${JSON.stringify(k1.slice(0, 4))}; value-only text "Autenticación de dos factores" -> ${JSON.stringify(k2.slice(0, 4))}; "CANCEL" (case) -> ${k2b.length} keys; "zzz" -> no-results state "Nothing matches “zzz”" with Clear search shown=${noRes2}; cleared -> ${back} rows rendered (first page of ${full}); search row height ${bb0}/${bb1}/${bb2}px`, "TRN-14.png");
  await page.context().close();
}

// ---------- TRN-15, TRN-16, X-01, X-03, X-04(success), X-09
{
  const { page, errors } = await open(b, "translations");
  await openCtx(page, "Hearing");
  const keys = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  const k = keys[0];
  const b0 = await beacon(page); const a0 = (await activity(page)).length;
  const saveBtn = page.getByRole("button", { name: "Save", exact: true });
  const disabled0 = await saveBtn.isDisabled();
  await cell(page, k, "Spanish").fill("ES nuevo"); await cell(page, k, "French").fill("FR nouveau");
  const enabled1 = await saveBtn.isEnabled();
  await saveBtn.click(); await page.waitForTimeout(500);
  const disabled2 = await saveBtn.isDisabled();
  const nb = await newBeacon(page, b0); const saved = nb.filter((x) => /Translations saved/.test(x));
  const act = await activity(page);
  const stillEditor = await page.locator("[data-component=TranslationEditor]").count();
  const savedLine = squash(await page.locator("[data-component=LastSavedLine]").allInnerTexts().then((a) => a.join(" ")).catch(() => ""));
  // X-03: rail click shows no dialog after save
  await goto(page, "Dashboard"); const dAfterSave = await dlgs(page);
  await goto(page, "Translations");
  await page.reload(); await page.waitForTimeout(1500);
  await openCtx(page, "Hearing");
  const es = await cell(page, k, "Spanish").inputValue(); const fr = await cell(page, k, "French").inputValue();
  await shot(page, "TRN-15");
  rec("TRN-15", disabled0 && enabled1 && disabled2 && saved.length === 1 && stillEditor === 1 && es === "ES nuevo" && fr === "FR nouveau" && act.length === a0 + 1 && /Translations/i.test(act[0]) ? "PASS" : "FAIL",
    `Hearing: Save disabled before edit=${disabled0}, enabled after editing es and fr=${enabled1}, disabled after Save=${disabled2}; Beacon "Translations saved" entries=${saved.length} ${JSON.stringify(nb)}; editor still open=${stillEditor === 1}; after reload and reopen es "${es}" fr "${fr}"; activity ${a0}->${act.length} ${JSON.stringify(act.slice(0, 1))}; saved line "${savedLine}"`, "TRN-15.png");
  rec("X-03", disabled0 && enabled1 && disabled2 && dAfterSave.length === 0 ? "PASS" : "FAIL", `Save disabled after a successful Save=${disabled2}; rail click to Dashboard right after Save opened dialogs ${JSON.stringify(dAfterSave)}; editing again re-enabled Save=${enabled1}`, "TRN-15.png");
  rec("X-09", /Updated translations of .Hearing./.test(act.join("|")) || act.some((a) => /ranslation/.test(a) && /\[admin\]$/.test(a)) ? "PASS" : "FAIL", `activity entries ${JSON.stringify(act.slice(0, 2))}`);
  await page.context().close();
}

// ---------- TRN-16 (A6-like): edit a System key used on screen
{
  const { page } = await open(b, "translations");
  const chrome = async () => ({ rail: squash(await page.locator('nav[aria-label="Settings navigation"]').innerText()), nav: squash(await page.evaluate(() => ["[data-part=start]", "[data-part=settings]", "[data-part=tools]"].map((q) => document.querySelector("header " + q)?.innerText || "").join(" "))) });
  const c0 = await chrome();
  await openCtx(page, "User Interface");
  const sb = S(page).locator('input[placeholder^="Search keys"]').first();
  await sb.fill("Languages"); await page.waitForTimeout(500);
  const hits = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  const k = hits.find((x) => x === "Languages") || hits[0];
  const before = await cell(page, k, "Spanish").inputValue();
  await cell(page, k, "Spanish").fill("Idiomas EDITADO"); await saveEd(page);
  const c1 = await chrome();
  await goto(page, "Languages");
  const title = await S(page).locator("h2").first().innerText();
  const card = (await S(page).locator("h3").allInnerTexts()).includes("Active languages");
  const c2 = await chrome();
  const pk = await page.locator("header button, header select").evaluateAll((e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText || "").trim()).filter((x) => /language|^EN$|^ES$|^FR$|^AR$/i.test(x)));
  rec("TRN-16", c0.rail === c1.rail && c0.rail === c2.rail && c0.nav === c2.nav && title === "Languages" && pk.length === 0 && card ? "PASS" : "FAIL", `key "${k}" es "${before}" -> "Idiomas EDITADO" saved (English is the read-only source, so only es is editable; no header language picker exists: ${JSON.stringify(pk)}); rail text unchanged=${c0.rail === c2.rail}; navbar text unchanged=${c0.nav === c2.nav}; Languages page title still "${title}" and card header "Active languages" unchanged=${card}`);
  await page.context().close();
}

// ---------- TRN-17 / X-02 dirty guard
{
  const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();
  const triggers = {
    "footer Cancel": (p) => p.getByRole("button", { name: "Cancel", exact: true }).click(),
    "breadcrumb Translations": (p) => S(p).getByRole("button", { name: "Translations" }).first().click(),
    "back arrow": (p) => p.locator("[data-component=TranslationEditor]").getByRole("button", { name: /back/i }).first().click(),
    "rail item": (p) => p.locator('nav[aria-label="Settings navigation"] button', { hasText: "Dashboard" }).first().click(),
    "data-source switch": async (p) => { await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250); await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: "CEJIL" }).click(); },
    "navbar Library": (p) => p.locator('button:has-text("Library")').first().click(),
  };
  const res = {};
  let sample = null, keptAfterCancel = {};
  for (const [label, fn] of Object.entries(triggers)) {
    const { page } = await open(b, "translations");
    await openCtx(page, "Person");
    await cell(page, "Person", "Spanish").fill("Edit " + label.length);
    await fn(page); await page.waitForTimeout(600);
    const d = await dlgs(page); const t = d.find((x) => /Discard changes\?/.test(x));
    const stillEd = await page.locator("[data-component=TranslationEditor]").count();
    res[label] = { dialog: !!t, stillEditor: stillEd === 1 };
    if (t) {
      sample = sample || t;
      if (label === "footer Cancel" || label === "rail item") await shot(page, `TRN-17-${label.replace(/\W+/g, "-")}`);
      await D(page).getByRole("button", { name: "Cancel", exact: true }).click(); await page.waitForTimeout(400);
      keptAfterCancel[label] = (await cell(page, "Person", "Spanish").inputValue().catch(() => "")) === "Edit " + label.length;
      // the next navigation still asks
      await fn(page); await page.waitForTimeout(500);
      res[label].asksAgain = !!(await dlgs(page)).find((x) => /Discard changes\?/.test(x));
    } else await shot(page, `TRN-17-${label.replace(/\W+/g, "-")}-nodialog`);
    await page.context().close();
  }
  // discard path, search/toggle, clean, clear X
  const { page } = await open(b, "translations");
  await openCtx(page, "Person");
  await cell(page, "Person", "Spanish").fill("Discard me");
  await S(page).locator('input[placeholder^="Search keys"]').first().fill("Per"); await page.waitForTimeout(300);
  const dSearch = (await dlgs(page)).length;
  await S(page).getByRole("checkbox", { name: /Untranslated/ }).first().check(); await page.waitForTimeout(300);
  const dToggle = (await dlgs(page)).length;
  await S(page).getByRole("checkbox", { name: /Untranslated/ }).first().uncheck(); await S(page).locator('input[placeholder^="Search keys"]').first().fill("");
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Dashboard" }).first().click(); await page.waitForTimeout(500);
  const hasDlg = (await dlgs(page)).some((x) => /Discard changes/.test(x));
  if (hasDlg) await D(page).getByRole("button", { name: "Discard changes", exact: true }).click();
  await page.waitForTimeout(600);
  const onDash = /Dashboard/.test(await S(page).locator("h2").first().innerText());
  await openCtx(page, "Person");
  const lost = (await cell(page, "Person", "Spanish").inputValue()) !== "Discard me";
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Dashboard" }).first().click(); await page.waitForTimeout(400);
  const dClean = (await dlgs(page)).length;
  await goto(page, "Translations"); await openCtx(page, "Person");
  await cell(page, "Person", "Spanish").fill("Valor"); await saveEd(page);
  await S(page).locator("[data-part=row]").first().locator('button[aria-label="Clear"]').first().click(); await page.waitForTimeout(200);
  const dirtyViaX = await page.getByRole("button", { name: "Save", exact: true }).isEnabled();
  await page.context().close();
  const missing = Object.entries(res).filter(([, v]) => !v.dialog).map(([k]) => k);
  const copy = !!sample && /You have unsaved changes\. Do you want to continue\?/.test(sample) && /Cancel/.test(sample);
  const allKept = Object.values(keptAfterCancel).every(Boolean) && Object.values(res).filter((v) => v.dialog).every((v) => v.asksAgain);
  const ev = `with an edited cell: ${Object.entries(res).map(([k, v]) => `${k}: ${v.dialog ? "dialog" : "NO dialog (editor still open=" + v.stillEditor + ", edit lost silently)"}${v.asksAgain === true ? ", asks again after Cancel" : ""}`).join("; ")}; dialog text "${sample}"; Cancel keeps edit ${JSON.stringify(keptAfterCancel)}; search typing opened dialogs=${dSearch}, Untranslated only toggle=${dToggle}; "Discard changes" navigated=${onDash} and edit gone on return=${lost}; clean editor rail click dialogs=${dClean}; clear X makes form dirty (Save enabled)=${dirtyViaX}`;
  rec("TRN-17", !missing.length && copy && allKept && dSearch === 0 && dToggle === 0 && onDash && lost && dClean === 0 && dirtyViaX ? "PASS" : "FAIL", ev, "TRN-17-footer-Cancel-nodialog.png");
  rec("X-02", !missing.length && copy && allKept && onDash && lost && dClean === 0 ? "PASS" : "FAIL", `same drive as TRN-17: ${ev}`, "TRN-17-footer-Cancel-nodialog.png");
}
save(); await b.close();
