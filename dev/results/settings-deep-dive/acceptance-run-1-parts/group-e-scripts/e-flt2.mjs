import { toSettings, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, logEntries, axe, axeEl, dupNames, unlabelled, guardBtn, guardInfo, rows } from "./g.mjs";
const only = process.argv[2];
const want = (k) => !only || only === k;
if (want("a")) await run("FLT-x", async (b) => {
  // X-07 axe
  let { page, errors } = await open(b, "filters");
  const v = await axe(page);
  const dups = await dupNames(page);
  const unl = await unlabelled(page);
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page);
  await rail(page, "Dashboard"); await wait(page, 500);
  const dv = await axeEl(page, '[data-component=ConfirmDialog]');
  const info = await guardInfo(page);
  const focusIn = await page.evaluate(() => !!document.activeElement.closest("[data-component=ConfirmDialog]"));
  await page.keyboard.press("Escape"); await wait(page, 400);
  const closedByEsc = (await dialogs(page)).length === 0;
  const opener = await page.evaluate(() => document.activeElement?.innerText?.slice(0, 20) || document.activeElement?.tagName);
  const serious = v.filter((x) => /serious|critical/.test(x));
  const dserious = dv.filter((x) => /serious|critical/.test(x));
  rec("X-07", !serious.length && !dserious.length && !dups.length && !unl.length ? "PASS" : "FAIL", `axe on pane: ${JSON.stringify(v)}; axe on the discard dialog: ${JSON.stringify(dv)}; dialog role/name=${JSON.stringify(info.map((i) => i.name))}; focus inside dialog on open=${focusIn}; Escape closes=${closedByEsc}, focus then on "${opener}"; duplicate accessible names among row buttons=${JSON.stringify(dups)}; inputs without label=${JSON.stringify(unl)}`, await sh(page, "X-07-FLT"));
  await page.context().close();

  // X-09 activity log
  ({ page } = await open(b, "filters"));
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page);
  const log = await logEntries(page);
  await rail(page, "Activity log"); await wait(page, 800);
  const r = (await S(page).innerText()).split("\n").filter(Boolean).slice(0, 14).map(clean);
  rec("X-09", log.some((l) => /filters/i.test(l)) ? "PASS" : "FAIL", `after one Filters Save the Activity log store holds: ${JSON.stringify(log.slice(0, 2))}; Activity log page text: ${JSON.stringify(r)}. Expected an Uwazi-style description with the acting user (admin)`, await sh(page, "X-09-FLT"));
  await page.context().close();

  // X-13 corpus scope
  ({ page } = await open(b, "filters"));
  const own = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  await switchTo(page, "CEJIL"); await wait(page, 2500); await toSettings(page, "Filters"); await wait(page, 1500);
  const cej = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  await switchTo(page, "Sample"); await wait(page, 1500); await toSettings(page, "Filters"); await wait(page, 1000);
  const back = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  rec("X-13", JSON.stringify(own) !== JSON.stringify(cej) && JSON.stringify(own) === JSON.stringify(back) ? "PASS" : "FAIL", `Sample ${own.length} Show rows (first: ${own.slice(0, 3)}); CEJIL ${cej.length} rows (first: ${cej.slice(0, 3)}); back on Sample ${back.length} rows. Users/groups/account not driven here (global; covered by their own pages)`, await sh(page, "X-13-FLT"));
  await page.context().close();

  // FLT-23
  ({ page } = await open(b, "filters"));
  const headers = await S(page).locator("table").nth(1).locator("th, [role=columnheader]").allInnerTexts();
  const checks = await S(page).locator("table").nth(1).locator("input[type=checkbox]").count();
  const prow = (await S(page).locator("table").nth(1).locator("tbody tr").first().innerText()).replace(/\s+/g, " ");
  rec("FLT-23", "FAIL", `Properties table columns ${JSON.stringify(headers)}; ${checks} Show checkboxes writable in it (expected a read view with no controls); first row "${prow}" (no template name shown; expected property name and template); the page has a Group column on this table (expected none). Not tied to template flags (rows from sampleFilterProperties)`, await sh(page, "FLT-23"));
  await page.context().close();
});

if (want("b")) await run("FLT-phone", async (b) => {
  let { page, errors } = await open(b, "filters", "mobile");
  await wait(page, 600);
  const hs = await hscroll(page);
  const txt = clean(await S(page).innerText());
  const tableCount = await S(page).locator("table").count();
  const rowsN = await S(page).locator('[role=row], li').count();
  const toggles = await S(page).locator('[aria-label^="Show "]').count();
  const ups = await S(page).getByRole("button", { name: /Move up/ }).count();
  const grp = await S(page).locator('[aria-label^="Move to group"]').count();
  await S(page).getByLabel("Show Person").tap(); await wait(page);
  const after = await S(page).getByLabel("Show Person").isChecked();
  await S(page).getByRole("button", { name: /Move down/ }).first().tap(); await wait(page);
  const moved = clean(await S(page).locator("li, [role=row], [data-part=row]").nth(1).innerText().catch(()=>"?")).slice(0, 25);
  await S(page).getByRole("button", { name: "New group" }).tap(); await wait(page);
  const dlg = await dialogs(page);
  const groupInput = await S(page).locator('[aria-label="Group name"]').count();
  await S(page).locator('[aria-label^="Move to group"]').first().tap(); await wait(page, 300);
  const listbox = await page.locator('[role=listbox]').count();
  const sheet = await page.evaluate(() => { const l = document.querySelector('[role=listbox]'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), bottom: Math.round(r.bottom) }; });
  const clipped = hs.doc > 0 || hs.wide > 0;
  rec("FLT-21", clipped || tableCount ? "FAIL" : "PASS", `phone 390x844: doc scroll overflow=${hs.doc}px, pane overflow=${hs.pane}px, elements past right edge=${hs.wide}; ${tableCount} <table> elements; ${toggles} Show toggles, ${ups} Move up buttons, ${grp} group selects reachable; tapping Show Person toggled it (checked=${after}); tapping Move down moved a row (row 2 now "${moved}"); "New group" tap opened dialogs ${JSON.stringify(dlg)} and added ${groupInput} inline group name input; group select opens listbox (${listbox}) at ${JSON.stringify(sheet)}`, await sh(page, "FLT-21"));
  rec("X-06-hscroll", "INFO", `hscroll ${JSON.stringify(hs)}`);
  // X-06 dirty + back chevron
  await S(page).getByLabel("Show Court Case").tap().catch(()=>{});
  const back = page.getByRole("button", { name: "Back to settings" });
  const bc = await back.count();
  if (bc) { await back.first().tap(); await wait(page, 500); }
  const d = await guardInfo(page);
  await sh(page, "X-02-FLT-phone");
  rec("FLT-15-phone", d.length ? "PASS" : "FAIL", `phone: dirty page, "Back to settings" chevron (count ${bc}) -> dialog ${JSON.stringify(d.map(x=>x.name))}`, "acceptance-run-1-shots/X-02-FLT-phone.png");
  const re = realErrors(errors);
  rec("X-06", (clipped || tableCount) ? "FAIL" : "PASS", `phone: tables=${tableCount} hscroll=${JSON.stringify(hs)}; see FLT-21 (rows, touch actions); console errors ${JSON.stringify(re)}`, "acceptance-run-1-shots/FLT-21.png");
  await page.context().close();
});
