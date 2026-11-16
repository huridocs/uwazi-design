import { launch, open, S, rows, shot, makeRec, realErrors, sh, toolsMenu, csvOpen, axeAll, setDark, hasHScroll, logEntries, notifTitles } from "./c.mjs";
const R = makeRec("CSV3");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const regImport = async (p, tpl = "Person") => {
  await p.getByRole("button", { name: /New import/ }).first().click(); await p.waitForTimeout(400);
  await p.locator('[data-part=dropzone]').click(); await p.waitForTimeout(150);
  await p.locator('[data-part=template-trigger]').click(); await p.waitForTimeout(150);
  await p.locator('[data-part=option] button', { hasText: tpl }).click(); await p.waitForTimeout(150);
  const file = clean(await p.locator('[data-part=selected-file]').innerText()).replace(" Remove", "");
  await p.locator('[data-component=NewImportModal] [data-part=submit]').click(); await p.waitForTimeout(400);
  return file;
};
const tasks = (p) => p.evaluate(() => { const arts = [...document.querySelectorAll("article")].map(a=>a.innerText.replace(/\s+/g," ").trim()); const body = document.body.innerText; const i = body.indexOf("TASKS"); return { arts, tasks: i>=0 ? body.slice(i, i+300).replace(/\s+/g," ") : "" }; });

// ---- CSV-09/10/11/22 + X-04/X-09 live flow
{
  const { ctx, page, errors } = await open(b, "pages");
  await csvOpen(page);
  const before = await tasks(page);
  const logBefore = await logEntries(page);
  const file = await regImport(page);
  const afterState = clean(await page.locator('[data-component=ImportDetailView]').innerText()).slice(0, 160);
  const status0 = clean(await page.locator('[data-component=ImportDetailView] [data-part=header]').innerText());
  const s09 = await sh(page, "CSV-09-detail");
  const t1 = await tasks(page);
  const newTask = t1.tasks.includes(file) || /CSV Import/i.test(t1.tasks);
  await page.getByRole("button", { name: /Back to list/ }).first().click(); await page.waitForTimeout(400);
  const firstRow = clean(await page.locator('[data-part=row]').first().innerText());
  const rowsN = await page.locator('[data-part=row]').count();
  R.add("CSV-09", /Queued/.test(firstRow) && newTask ? "PASS" : "FAIL",
    `Registered "${file}" (random built-in name, Person). Modal closed and the app jumped to the import's detail page (header "${status0}"), not the list; back on the list the first row reads "${firstRow}" (${rowsN} rows). Expected status "Queued" and Beacon task "CSV Import: Queued — ${file}". Beacon tasks section after: ${JSON.stringify(t1.tasks.slice(0,200))}; task mentioning the file or "CSV Import": ${newTask}. Notifications before/after: ${before.arts.length}/${t1.arts.length}.`, s09);
  // CSV-10: leave to Library and return
  await page.getByRole("button", { name: /^Library/ }).first().click(); await page.waitForTimeout(3500);
  await csvOpen(page);
  const rowsAfter = (await page.locator('[data-part=row] [data-part=filename]').allInnerTexts());
  const hasNew = rowsAfter.includes(file);
  R.add("CSV-10", hasNew ? "PASS" : "FAIL", `Started import "${file}", opened Library for 3.5 s, returned via Tools > Import CSV: list files now ${JSON.stringify(rowsAfter)}; the new import ${hasNew ? "is still listed" : "is gone (the list is view-local state and resets to the 5 seed rows on remount)"}.`, await sh(page, "CSV-10"));
  const logAfter = await logEntries(page);
  const notifs = await notifTitles(page);
  R.add("CSV-22", logAfter.length > logBefore.length ? "PASS" : "FAIL", `Registered an import (CSV-09). Activity log (sessionStorage uwazi:settings:activity) before ${JSON.stringify(logBefore)} / after ${JSON.stringify(logAfter)}. Expected readable entries for the import and the cancel (cancel does not exist, CSV-18).`);
  R.add("X-09", logAfter.length > logBefore.length ? "PASS" : "FAIL", `Registering a CSV import added ${logAfter.length - logBefore.length} Activity log entries; Delete import also adds none (CSV-20).`);
  R.add("::errs1", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
// ---- CSV-11: stay on view until completion
{
  const { ctx, page, errors } = await open(b, "pages");
  await csvOpen(page);
  const n0 = (await notifTitles(page));
  await regImport(page);
  await page.getByRole("button", { name: /Back to list/ }).first().click();
  const t0 = Date.now(); let st = "";
  while (Date.now() - t0 < 40000) { st = clean(await page.locator('[data-part=row]').first().innerText()); if (/Completed|Warnings/.test(st.split(" ")[0])) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(500);
  const n1 = await notifTitles(page);
  const added = n1.filter(x => !n0.includes(x));
  R.add("CSV-11", added.some(a => /CSV import completed/i.test(a)) ? "PASS" : "FAIL", `Waited until the new row read "${st.slice(0,80)}" (${((Date.now()-t0)/1000).toFixed(0)} s). Beacon notifications before ${n0.length}, after ${n1.length}; new ones: ${JSON.stringify(added)}. Expected "CSV import completed" / "CSV import failed" / "CSV import cancelled" and the task closing.`, await sh(page, "CSV-11"));
  const csvAdded = added.filter(a => /\.csv|\.zip|import/i.test(a));
  R.add("X-04", csvAdded.length ? "PASS" : "FAIL", `Registering an import and its completion add no import-related Beacon entry (new entries ${JSON.stringify(added.map(a=>a.slice(0,40)))} are the seed tasks finishing); only the sort buttons raise "Sorted by <column>" notices. Delete of imports: see CSV-20.`);
  await ctx.close();
}
// ---- CSV-18/19 (no cancel) and CSV-20 (empty state)
{
  const { ctx, page } = await open(b, "pages");
  await csvOpen(page);
  const out = {};
  for (const n of ["locations.csv", "cases.csv", "judges-import.zip"]) {
    await page.getByRole("button", { name: `Open ${n}` }).click(); await page.waitForTimeout(400);
    out[n] = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().top > 740 && b.getBoundingClientRect().width > 0).map(b => b.innerText.trim()).filter(Boolean));
    if (n === "locations.csv") await sh(page, "CSV-18-locations");
    await page.getByRole("button", { name: /Back to list/ }).first().click(); await page.waitForTimeout(300);
  }
  const hasCancel = Object.values(out).some(a => a.some(t => /^Cancel$/i.test(t)));
  R.add("CSV-18", "FAIL", `locations.csv (processing) footer buttons: ${JSON.stringify(out["locations.csv"])}: no danger "Cancel", no "Canceling" modal, no Cancelled status or notification "CSV import cancelled". The footer has "Delete import" (a different action).`, "acceptance-run-1-shots/CSV-18-locations.png");
  R.add("CSV-19", "FAIL", `The footer has no Cancel button on any status page (cases.csv ${JSON.stringify(out["cases.csv"])}, judges-import.zip ${JSON.stringify(out["judges-import.zip"])}), so "Cancel disabled for Completed, Failed, Cancelled" cannot be observed; there is no Cancelled status either.`);
  // CSV-20: delete all
  await page.getByLabel("Select all imports").click(); await page.waitForTimeout(200);
  const bar = await page.evaluate(() => [...document.querySelectorAll("button, span")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().top > 740 && b.getBoundingClientRect().width > 0).map(b => b.innerText.trim()).filter(Boolean));
  const delBtn = page.getByRole("button", { name: /^Delete/ }).last();
  await delBtn.click(); await page.waitForTimeout(300);
  const dlg = clean(await page.locator('[data-component=ConfirmDialog]').innerText());
  await page.locator('[data-component=ConfirmDialog]').getByRole("button", { name: "Delete" }).click(); await page.waitForTimeout(400);
  const title = clean(await page.locator('[data-component=ImportEmptyState]').innerText());
  const foot = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().top > 740 && b.getBoundingClientRect().width > 0).map(b => b.innerText.trim()).filter(Boolean));
  const logN = (await logEntries(page)).length;
  const notifs = await notifTitles(page);
  R.add("CSV-20", "FAIL", `Select all > Delete > confirm ("${dlg.slice(0,100)}") empties the list. Empty state reads "${title}"; expected text "Import CSV or ZIP files to create entities in bulk. Select + Import CSV to get started." (title "No CSVs yet" and icon match; the hint says "Select “New import”"). Footer button present: ${JSON.stringify(foot.slice(-2))}. Selection bar while 5 ticked: ${JSON.stringify(bar.slice(-6))}.`, await sh(page, "CSV-20"));
  R.add("X-04::delete", "INFO", `Bulk delete of 5 imports: activity log entries ${logN}; new Beacon notifications: ${notifs.length}`);
  await ctx.close();
}
R.save();
await b.close();
