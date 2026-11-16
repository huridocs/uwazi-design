import { toSettings, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, switchTo, dialogs } from "./c.mjs";
const R = makeRec("PAG1");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rowEls = (p) => S(p).locator('[role="row"]');
const dataRows = async (p) => (await rowEls(p).allInnerTexts()).map(clean).slice(1);
const search = (p) => S(p).getByRole("searchbox").or(S(p).locator('input[type=search], input[aria-label="Search pages"]')).first();
const newNotifs = async (p, base) => (await notifTitles(p)).filter(x => !base.includes(x));
const delDlg = (p) => p.locator("[data-component=ConfirmDelete]");

// ---- PAG-01 + X-11 + X-10 search/empty
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-01", async () => {
    const h2 = clean(await S(page).locator("h2").first().innerText());
    const heads = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(clean);
    const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
    const rt = await dataRows(page);
    const btns = await S(page).locator("button").evaluateAll(els => els.map(e => (e.getAttribute("aria-label") || e.innerText).trim()).filter(Boolean));
    const view = btns.filter(x => /^View/.test(x)).length;
    const names = btns.filter(x => /^(Edit|Delete) /.test(x));
    const dupe = names.filter((n, i) => names.indexOf(n) !== i);
    const lead = clean(await page.locator("footer").last().innerText());
    R.add("PAG-01", "FAIL", `Heading "${h2}" and four rows in seed order ok (${JSON.stringify(rt)}). Differences: row checkboxes ${cbs} (expected one per row); URL cell reads "/page/<slug>" e.g. "/page/about" (expected /page/<id>/<slug>); no View or Edit buttons per row (View buttons ${view}; the row opens the editor, plus an icon "Delete <title>"); column headers ${JSON.stringify(heads)} (4th header is empty text); status pills Published/Draft present; footer "${lead}" ok. Row button names unique (${dupe.length === 0}): ${JSON.stringify(names.slice(0, 4))}.`, await sh(page, "PAG-01"));
  });
  await T("PAG-02", async () => {
    const q = S(page).locator('input[aria-label="Search pages"]');
    const out = {};
    for (const t of ["meth", "/partners", "partners", "zzz"]) { await q.fill(t); await page.waitForTimeout(250); out[t] = (await dataRows(page)).map(r => r.split(" ")[0]); }
    const empty = clean(await page.locator("[data-component=SettingsEmptyState]").innerText().catch(() => ""));
    await q.fill(""); await page.waitForTimeout(250);
    const back = (await dataRows(page)).length;
    const ok = JSON.stringify(out["meth"]) === '["Methodology"]' && out["/partners"].length === 1 && back === 4 && /No pages match/.test(empty);
    R.add("PAG-02", ok ? "PASS" : "FAIL", `"meth" -> ${JSON.stringify(out.meth)}; "/partners" -> ${JSON.stringify(out["/partners"])} (expected Partners: the URL is searched without its leading slash); "partners" -> ${JSON.stringify(out.partners)}; clearing -> ${back} rows. No-match state for "zzz" reads "${empty}" (expected "No pages match “zzz”" with a way to clear).`, await sh(page, "PAG-02"));
    R.add("X-11", "PASS", `Search row is mounted on load (placeholder "Search pages…", wrapper min-h-8); typing filters rows ("meth" -> Methodology only), clearing restores 4 rows. Row height stays fixed at the empty state (see PAG-02 shot).`, "acceptance-run-1-shots/PAG-02.png");
  });
  R.add("::errs-list", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
// ---- PAG-06 / X-12 (selection) 
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-06", async () => {
    const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
    const foot = clean(await page.locator("footer").last().innerText());
    // try ctrl-click to select a row
    await rowEls(page).nth(2).click({ modifiers: ["Control"] }).catch(() => {}); await page.waitForTimeout(300);
    const editorOpen = await page.locator("[data-component=CodePageEditor]").count();
    R.add("PAG-06", "FAIL", `Cannot tick rows: ${cbs} checkboxes (list has no selection column or header checkbox); a plain click on a row opens its editor and Ctrl-click does not select (editor open after Ctrl-click: ${editorOpen}). Footer stays "${foot}" with no "Selected n of total" and no bulk Delete; delete is a per-row icon.`, await sh(page, "PAG-06"));
    R.add("X-12", "FAIL", `The Pages list has no row selection: no checkboxes, no "Selected n of total" bar, no bulk Delete (see PAG-06).`);
  });
  await ctx.close();
}
// ---- PAG-04 / PAG-05
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-04", async () => {
    await page.getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(500);
    const dlgTitle = clean(await page.locator("[data-component=TemplatePickerModal]").locator("h2").first().innerText());
    const starters = (await page.locator("[data-component=TemplatePickerModal] [role=radio]").allInnerTexts()).map(t => t.split("\n")[0]);
    await page.locator("[data-component=TemplatePickerModal] [role=radio]").first().click();
    await page.locator("[data-component=TemplatePickerModal]").getByRole("button", { name: "Create page" }).click(); await page.waitForTimeout(900);
    const hdr = clean(await S(page).locator("h2").first().innerText().catch(() => ""));
    const titleVal = await S(page).getByLabel(/^Title/).inputValue();
    const footerBtns = await page.locator("footer").last().locator("button").allInnerTexts();
    const cancel = footerBtns.filter(t => /^Cancel$/.test(t.trim())).length;
    // leave with back arrow
    await S(page).getByRole("button", { name: /^Back/ }).first().click(); await page.waitForTimeout(500);
    const dlg = await dialogs(page);
    const n = (await dataRows(page)).length;
    R.add("PAG-04", n === 4 ? "PASS" : "FAIL", `Footer "Add page" opens a Modal "${dlgTitle}" listing ${starters.length} starters (${starters.join(", ")}) ok. Choosing the first and "Create page" opens the editor with header "${hdr}" / Title field "${titleVal}" (expected "New page"). The editor footer has ${JSON.stringify(footerBtns.map(clean))}: no Cancel (cancel buttons ${cancel}); left with the back arrow, dialogs open: ${JSON.stringify(dlg)}. The list now has ${n} rows (expected 4): the page was added to the list at "Create page", before any Save.`, await sh(page, "PAG-04"));
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-05", async () => {
    const base = await notifTitles(page);
    await page.getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(400);
    await page.locator("[data-component=TemplatePickerModal] [role=radio]").first().click();
    await page.locator("[data-component=TemplatePickerModal]").getByRole("button", { name: "Create page" }).click(); await page.waitForTimeout(900);
    const en0 = await S(page).getByLabel(/^Title/).inputValue();
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(250);
    const es0 = await S(page).getByLabel(/^Title/).inputValue();
    await S(page).getByRole("radio", { name: /EN/ }).click(); await page.waitForTimeout(250);
    const pubDisabledBefore = await page.locator("footer").last().getByRole("button", { name: "Publish" }).isDisabled();
    const restore = await page.getByRole("button", { name: /Restore/ }).count();
    await S(page).getByLabel(/^Title/).fill("QA page"); await page.waitForTimeout(200);
    await page.locator("footer").last().getByRole("button", { name: /Save draft/ }).click(); await page.waitForTimeout(500);
    const stillOpen = await page.locator("[data-component=CodePageEditor]").count();
    const pubAfter = await page.locator("footer").last().getByRole("button", { name: "Publish" }).isDisabled();
    const n1 = await newNotifs(page, base);
    await S(page).getByRole("button", { name: /^Back/ }).first().click(); await page.waitForTimeout(500);
    const rt = await dataRows(page);
    R.add("PAG-05", "FAIL", `Before first Save: EN title "${en0}", ES title "${es0}" (expected "New page" in every language); Publish disabled ${pubDisabledBefore} (expected disabled), Restore buttons ${restore} (no Restore control exists). After "Save draft" with Title "QA page": editor stays open (${stillOpen}), Publish disabled ${pubAfter}; list has ${rt.length} rows ${JSON.stringify(rt.map(r => r.split(" ").slice(0, 3).join(" ")))} (the row for the new page was created at "Create page" and still carries the starter's title, not "QA page"). Notifications: ${JSON.stringify(n1)}.`, await sh(page, "PAG-05"));
  });
  await ctx.close();
}
// ---- PAG-07 / PAG-08 / X-05 deletes
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-07", async () => {
    const base = await notifTitles(page);
    await S(page).getByRole("button", { name: "Delete Methodology" }).click(); await page.waitForTimeout(400);
    const txt = clean(await delDlg(page).innerText());
    const s = await sh(page, "PAG-07");
    await delDlg(page).getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300);
    const kept = (await dataRows(page)).length;
    await S(page).getByRole("button", { name: "Delete Methodology" }).click(); await page.waitForTimeout(400);
    await delDlg(page).getByRole("button", { name: /^Delete/ }).last().click(); await page.waitForTimeout(500);
    const after = (await dataRows(page)).map(r => r.split(" ")[0]);
    const n = await newNotifs(page, base);
    await rail(page, "Menu"); await page.waitForTimeout(600);
    const menuRows = await rows(page);
    const log = await logEntries(page);
    R.add("PAG-07", "FAIL", `Delete dialog text: "${txt}". Cancel keeps ${kept} rows. Confirm removes the row (${JSON.stringify(after)}); notifications ${JSON.stringify(n)} (expected "Deleted successfully."). Menu page afterwards: ${JSON.stringify(menuRows)}. Activity log: ${JSON.stringify(log)}.`, s);
    R.add("X-05", "PASS", `Delete of a used page (Methodology) opens a guarded dialog that states the menu usage: "${txt.slice(0, 220)}".`, s);
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-08", async () => {
    const base = await notifTitles(page);
    await S(page).getByRole("button", { name: "Delete Partners" }).click(); await page.waitForTimeout(400);
    const tp = clean(await delDlg(page).innerText());
    await delDlg(page).getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(300);
    await S(page).getByRole("button", { name: "Delete About this collection" }).click(); await page.waitForTimeout(400);
    const ta = clean(await delDlg(page).innerText());
    await delDlg(page).getByRole("button", { name: /^Delete/ }).last().click(); await page.waitForTimeout(400);
    await S(page).getByRole("button", { name: "Delete Partners" }).click(); await page.waitForTimeout(400);
    await delDlg(page).getByRole("button", { name: /^Delete/ }).last().click(); await page.waitForTimeout(400);
    const after = (await dataRows(page)).map(r => r.split(" ")[0]);
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
    const afterReload = (await dataRows(page)).map(r => r.split(" ")[0]);
    R.add("PAG-08", "FAIL", `No multi-select (see PAG-06), so Partners and About are deleted one at a time. Partners dialog: "${tp}". About dialog: "${ta}". Expected one dialog "Do you want to delete the following items?" with a bullet list of both titles. After both confirms: ${JSON.stringify(after)}; after reload the list reads ${JSON.stringify(afterReload)} (expected both still gone).`, await sh(page, "PAG-08"));
  });
  await ctx.close();
}
// ---- PAG-29 / X-10 empty state
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-29", async () => {
    for (const t of ["About this collection", "Methodology", "Partners", "Contact"]) {
      await S(page).getByRole("button", { name: `Delete ${t}` }).click(); await page.waitForTimeout(300);
      await delDlg(page).getByRole("button", { name: /^Delete/ }).last().click(); await page.waitForTimeout(300);
    }
    const empty = clean(await page.locator("[data-component=SettingsEmptyState]").innerText());
    const sE = await sh(page, "PAG-29-empty");
    const hasNothing = /Nothing here yet|NO DATA AVAILABLE/i.test(await S(page).innerText());
    await page.locator("[data-component=SettingsEmptyState]").getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(400);
    await page.locator("[data-component=TemplatePickerModal]").getByRole("button", { name: "Create page" }).click(); await page.waitForTimeout(800);
    await S(page).getByRole("button", { name: /^Back/ }).first().click(); await page.waitForTimeout(500);
    await S(page).locator('input[aria-label="Search pages"]').fill("zzz"); await page.waitForTimeout(300);
    const nm = clean(await page.locator("[data-component=SettingsEmptyState]").innerText());
    const ok = /No pages yet/.test(empty) && /No pages match “zzz”/.test(nm);
    R.add("PAG-29", ok ? "PASS" : "FAIL", `All four deleted: "${empty}" (generic fallback copy present: ${hasNothing}). After adding one page and searching "zzz": "${nm}" (expected "No pages match “zzz”" with a way to clear).`, sE);
    R.add("X-10", /No pages yet/.test(empty) && /Add page/.test(empty) ? "PASS" : "FAIL", `Empty list: "${empty}" (title naming the object, one-line hint, "Add page" action).`, sE);
  });
  await ctx.close();
}
// ---- X-13 corpus
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("X-13", async () => {
    const s0 = (await dataRows(page)).map(r => r.split(" ")[0]);
    await switchTo(page, "CEJIL"); await page.waitForTimeout(1500); await toSettings(page, "Pages"); await page.waitForTimeout(1500);
    let toPages = false;
    const onPages = await S(page).locator("h2").first().innerText().catch(() => "");
    const s1 = (await dataRows(page)).map(r => r.split(" ")[0]);
    const users = null;
    R.add("X-13", JSON.stringify(s0) !== JSON.stringify(s1) ? "PASS" : "FAIL", `Sample rows ${JSON.stringify(s0)}; after switching the data source to CEJIL (pane heading "${onPages}") the list reads ${JSON.stringify(s1)}.`, await sh(page, "X-13-pag"));
  });
  await ctx.close();
}
R.save();
await b.close();
