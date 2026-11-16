import { toSettings, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, dialogs, setDark, axeAll } from "./c.mjs";
const R = makeRec("PAG2");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rowEls = (p) => S(p).locator('[role="row"]');
const dataRows = async (p) => (await rowEls(p).allInnerTexts()).map(clean).slice(1);
const foot = (p) => p.locator("footer").last();
const fbtn = (p, n) => foot(p).getByRole("button", { name: n });
const edTitle = (p) => S(p).getByLabel(/^Title/);
const ta = (p) => S(p).locator("textarea");
const openEd = async (p, name) => { await rowEls(p).filter({ hasText: name }).first().click(); await p.waitForTimeout(1300); };
const frame = (p) => p.frames().find(f => f !== p.mainFrame());
const prev = async (p) => { await p.waitForTimeout(700); const f = frame(p); return f ? clean(await f.evaluate(() => document.body.innerText)) : "(no frame)"; };
const newN = async (p, base) => { const a = await notifTitles(p); const c = {}; base.forEach(x => c[x] = (c[x] || 0) + 1); return a.filter(x => { if (c[x]) { c[x]--; return false; } return !/Running|Finishing|%/.test(x); }); };
const leave = async (p) => { await S(p).getByRole("button", { name: "Back", exact: true }).first().click(); await p.waitForTimeout(400); const cd = p.locator("[data-component=ConfirmDialog]"); if (await cd.count()) { await cd.getByRole("button", { name: /^Discard/ }).click(); await p.waitForTimeout(400); } };
const tab = (p, n) => S(p).getByRole("tab", { name: n });
const newPage = async (p, title) => {
  await p.getByRole("button", { name: "Add page" }).click(); await p.waitForTimeout(400);
  await p.locator("[data-component=TemplatePickerModal] [role=radio]").first().click();
  await p.locator("[data-component=TemplatePickerModal]").getByRole("button", { name: "Create page" }).click(); await p.waitForTimeout(900);
  if (title) await edTitle(p).fill(title);
};

// ---- PAG-03 / X-01
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-03", async () => {
    await openEd(page, "Partners");
    await edTitle(page).fill("Partners and funders"); await page.waitForTimeout(200);
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    const saved = await foot(page).innerText();
    await rail(page, "Pages"); await page.waitForTimeout(500);
    const dlg = await dialogs(page);
    const stayed = await page.locator("[data-component=CodePageEditor]").count();
    await rail(page, "Dashboard"); await page.waitForTimeout(400); await rail(page, "Pages"); await page.waitForTimeout(500);
    const r1 = await dataRows(page);
    await openEd(page, "Partners");
    const tvNav = await edTitle(page).inputValue();
    await leave(page);
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
    const r2 = await dataRows(page);
    await openEd(page, "Partners");
    const tv = await edTitle(page).inputValue();
    R.add("PAG-03", "FAIL", `Edited Partners: Title "Partners and funders" + Save draft (editor Save button reads "Save draft"; there is no Configuration tab, title is above the code area). Clicking "Pages" in the rail while the editor is open leaves the editor open (editor still shown: ${stayed}). After rail > Dashboard > Pages the list row reads ${JSON.stringify(r1.filter(r => /Partners/.test(r)))} (expected "Partners and funders" with a new slug); status stays Draft. Reopening the editor after the rail round trip shows Title "${tvNav}"; after a tab reload the list reads ${JSON.stringify(r2.filter(r => /Partners/.test(r)))} and the editor shows Title "${tv}" (the saved edit is gone after reload). Dialogs on rail click: ${JSON.stringify(dlg)}.`, await sh(page, "PAG-03"));
    R.add("X-01", "FAIL", `Persistence: after Save draft the edited title shows in the reopened editor after a rail round trip ("${tvNav}") but the list row keeps the seed title ${JSON.stringify(r1.filter(r => /Partners/.test(r)))}; after a tab reload both the editor ("${tv}") and the list ${JSON.stringify(r2.filter(r => /Partners/.test(r)))} are back to the seed, so the saved edit does not survive reload (PAG-16 shows the same for HTML/JS/CSS). The Pages list is local state, not the stored record.`);
    R.add("X-03", "PASS", `After "Save draft" the Save draft and Discard buttons are disabled (footer: ${clean(saved)}) and the rail click opened no dialog (dialogs ${JSON.stringify(dlg)}). Editing again re-enables Save draft (see PAG-16).`);
  });
  R.add("::errs-pag03", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
// ---- PAG-09 / PAG-17 preview + published
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-09", async () => {
    const viewBtns = await S(page).getByRole("button", { name: /^View/ }).count();
    await openEd(page, "Methodology");
    await ta(page).fill("<h1>Unsaved draft text</h1>"); await page.waitForTimeout(300);
    await S(page).getByRole("button", { name: "Published", exact: true }).first().click(); await page.waitForTimeout(300);
    const pubTxt = await prev(page);
    const sM = await sh(page, "PAG-09-methodology");
    await leave(page);
    await openEd(page, "Partners");
    await S(page).getByRole("button", { name: /^Published/ }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    const pTxt = await prev(page);
    R.add("PAG-09", "FAIL", `The list has no View button (View buttons ${viewBtns}). In the editor, the Published toggle on Methodology shows the last release, not the unsaved edit: "${pubTxt.slice(0, 160)}" (ok). Partners (never published): Published toggle reads "${pTxt.slice(0, 120)}" (a "never been published" notice, ok). The "Open" next to Preview is a non-interactive span (title "Opens the draft on its own (not in this mock)"). Expected View per list row.`, sM);
  });
  await ctx.close();
}
// ---- PAG-10 / PAG-11 / PAG-12
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-10", async () => {
    await openEd(page, "Methodology");
    const base = await notifTitles(page);
    await edTitle(page).fill(""); await page.waitForTimeout(300);
    const saveDis = await fbtn(page, /Save draft/).isDisabled();
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    const err = (await S(page).innerText()).match(/This field is required/) ? "shown" : "not shown";
    const n1 = await newN(page, base);
    const hdr = clean(await S(page).locator("h2").first().innerText().catch(() => ""));
    const sE = await sh(page, "PAG-10");
    await edTitle(page).fill("Methodology notes");
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(300);
    await edTitle(page).fill("Metodología");
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    await S(page).getByRole("radio", { name: /EN/ }).click(); await page.waitForTimeout(300);
    const enT = await edTitle(page).inputValue();
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(300);
    const esT = await edTitle(page).inputValue();
    R.add("PAG-10", err === "shown" && n1.length === 0 ? "PASS" : "FAIL", `Cleared EN title: "This field is required" ${err}; Save draft was ${saveDis ? "disabled" : "enabled"} and saved the empty title (notifications ${JSON.stringify(n1)}; page header became "${hdr}"). After "Methodology notes" (EN) and "Metodología" (ES) + Save: EN field "${enT}", ES field "${esT}" (stored separately, ok).`, sE);
  });
  await T("PAG-11", async () => {
    await leave(page);
    await openEd(page, "Methodology");
    const url = S(page).getByLabel("URL");
    const v0 = await url.inputValue(); const ro = await url.getAttribute("readonly");
    await url.fill(v0 + "x"); const v1 = await url.inputValue(); await url.fill(v0);
    const copyBtn = await S(page).getByRole("button", { name: /^Copy (URL|link|page)/i }).count();
    const viewLink = await S(page).getByRole("link", { name: /View page/ }).count() + await S(page).getByRole("button", { name: /View page/ }).count();
    await edTitle(page).fill("Method notes"); await page.waitForTimeout(300);
    const v2 = await url.inputValue();
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(300);
    const pathEs = clean(await page.locator("[data-component=PublicPreview] [data-part=bar]").innerText());
    R.add("PAG-11", "FAIL", `URL field value "${v0}" (expected "/en/page/<id>/<kebab-title>"); readonly=${ro}; typing changed it to "${v1}" (expected read-only); copy buttons ${copyBtn}; "View page" link ${viewLink}; after Title "Method notes" the field stays "${v2}" (expected slug to follow the title); with ES selected the preview path reads "${pathEs}".`, await sh(page, "PAG-11"));
  });
  await ctx.close();
}
// ---- PAG-12 / PAG-13
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-12", async () => {
    await openEd(page, "Methodology");
    const grp = S(page).getByRole("radiogroup", { name: "Page language" });
    const box = await grp.boundingBox();
    const en = { t: await edTitle(page).inputValue(), h: (await ta(page).inputValue()).slice(0, 40) };
    await tab(page, "CSS").click(); const enCss0 = await ta(page).inputValue(); await tab(page, "HTML").click();
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(300);
    const es = { t: await edTitle(page).inputValue(), h: (await ta(page).inputValue()).slice(0, 40) };
    await ta(page).fill("<p>solo ES</p>");
    await tab(page, "CSS").click(); await ta(page).fill("/* es css */");
    await tab(page, "JavaScript").click(); await ta(page).fill("// es js");
    await S(page).getByRole("radio", { name: /EN/ }).click(); await page.waitForTimeout(300);
    const enJs = await ta(page).inputValue();
    await tab(page, "HTML").click();
    const enAfter = { t: await edTitle(page).inputValue(), h: (await ta(page).inputValue()).slice(0, 40) };
    await tab(page, "CSS").click(); const enCss = await ta(page).inputValue();
    await tab(page, "HTML").click();
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(300);
    const esBack = (await ta(page).inputValue());
    await tab(page, "CSS").click(); const esCssBack = await ta(page).inputValue();
    const ok = enAfter.h === en.h && enCss === enCss0 && enJs === "" && esBack === "<p>solo ES</p>" && !!box && box.x > 640 && box.y < 250;
    R.add("PAG-12", ok ? "PASS" : "FAIL", `Radio group "Page language" (EN ES FR AR) at x=${box && Math.round(box.x)}, y=${box && Math.round(box.y)} (top right of the form). EN title "${en.t}" / HTML "${en.h}"; ES title "${es.t}" / HTML "${es.h}". Typed ES HTML, CSS and JS; back on EN: title "${enAfter.t}", HTML "${enAfter.h}", JS "${enJs}", CSS unchanged: ${enCss === enCss0}; ES kept HTML "${esBack}" and CSS "${esCssBack}". "Hidden when only one language is installed": see PAG-13.`, await sh(page, "PAG-12"));
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "languages");
  await page.waitForTimeout(800);
  await T("PAG-13", async () => {
    const inst0 = (await rows(page)).map(r => r.slice(0, 20));
    await rail(page, "Pages"); await page.waitForTimeout(500);
    await openEd(page, "Methodology");
    const sel0 = await S(page).getByRole("radiogroup", { name: "Page language" }).getByRole("radio").allInnerTexts();
    await rail(page, "Languages"); await page.waitForTimeout(500);
    for (const l of ["Spanish", "French", "Arabic", "Portuguese"]) {
      await S(page).getByRole("button", { name: `Uninstall ${l}` }).click(); await page.waitForTimeout(400);
      const dl = page.locator("[data-component=ConfirmDelete]");
      await dl.locator("input").fill("CONFIRM"); await dl.getByRole("button", { name: "Uninstall", exact: true }).click(); await page.waitForTimeout(500);
    }
    const left = (await rows(page)).map(r => r.slice(0, 14));
    await rail(page, "Pages"); await page.waitForTimeout(500);
    await openEd(page, "Methodology");
    const sel1 = await S(page).getByRole("radiogroup", { name: "Page language" }).count() ? await S(page).getByRole("radiogroup", { name: "Page language" }).getByRole("radio").allInnerTexts() : "(hidden)";
    R.add("PAG-13", "FAIL", `Languages page (Sample) has English, Spanish, French, Arabic and Portuguese installed. The page editor's selector offers ${JSON.stringify(sel0.map(clean))} (Portuguese missing although installed; the list is a fixed EN/ES/FR/AR). After uninstalling Spanish, French, Arabic and Portuguese (Languages left: ${JSON.stringify(left)}) the editor selector is ${JSON.stringify(sel1)} (expected hidden with one language).`, await sh(page, "PAG-13"));
    R.add("PAG-12::hidden", "INFO", `Selector with one language installed: ${JSON.stringify(sel1)}`);
  });
  await ctx.close();
}
R.save();
await b.close();
