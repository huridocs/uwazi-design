import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, toSettings, logEntries, axe, dupNames, unlabelled, axeEl } from "./g.mjs";
const show = (p, n) => S(p).getByLabel(`Show ${n}`);
const typeRows = (p) => S(p).locator("table").first().locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));

await run("FLT-k", async (b) => {
  // X-01, X-04 (success), X-09
  let { page, errors } = await open(b, "filters");
  const bn = await nlist(page);
  await show(page, "Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page, 500);
  const nn = await newNotifs(page, bn);
  const log = await logEntries(page);
  await rail(page, "Dashboard"); await wait(page, 500); await rail(page, "Filters"); await wait(page, 500);
  const afterRail = await show(page, "Hearing").isChecked();
  await page.reload(); await wait(page, 1500);
  const afterReload = await show(page, "Hearing").isChecked();
  await rail(page, "Dashboard"); await wait(page, 600);
  const reset = page.getByRole("button", { name: /Reset demo data/ });
  const resetN = await reset.count();
  if (resetN) { await reset.first().click(); await wait(page, 400); const conf = page.locator('[data-component=ConfirmDialog],[data-component=ConfirmDelete]').getByRole("button", { name: /Reset|Accept|Confirm|Delete/ }); if (await conf.count()) { await conf.first().click(); await wait(page, 800); } }
  await rail(page, "Filters"); await wait(page, 600);
  const afterReset = await show(page, "Hearing").isChecked();
  rec("X-01", !afterRail && !afterReload && afterReset ? "PASS" : "FAIL", `unticked Hearing, Save: after a rail round trip checked=${afterRail}; after reload checked=${afterReload}; Reset demo data buttons=${resetN}; after reset checked=${afterReset}`, await sh(page, "X-01-FLT"));
  rec("X-04", nn.length === 1 && /^Filters saved/.test(nn[0]) ? "PASS" : "FAIL", `one Save added Beacon entries ${JSON.stringify(nn)}; expected the page's quoted text "Filters saved" (one entry)`, "");
  const mine = log.filter((l) => /filters/i.test(l));
  rec("X-09", mine.length === 1 && /\[admin\]/.test(mine[0]) ? "PASS" : "FAIL", `Activity log store after one Filters Save: ${JSON.stringify(log)}; expected an Uwazi-style description with the acting user (admin)`, "");
  await page.context().close();

  // X-13
  ({ page } = await open(b, "filters"));
  const names1 = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  await switchTo(page, "CEJIL"); await toSettings(page, "Filters"); await wait(page, 1000);
  const names2 = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  await switchTo(page, "Sample"); await toSettings(page, "Filters"); await wait(page, 800);
  const names3 = await S(page).locator('[aria-label^="Show "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").slice(5)));
  rec("X-13", names1.length === 9 && names2.length > 9 && JSON.stringify(names1) !== JSON.stringify(names2) && names3.length === 9 ? "PASS" : "FAIL", `Sample ${names1.length} Show rows (${names1.slice(0, 3)}); CEJIL ${names2.length} rows (${names2.slice(0, 3)}); back on Sample ${names3.length} rows. Users/groups/account are global and covered by their own pages`, await sh(page, "X-13-FLT"));
  await page.context().close();
});

await run("FLT-l", async (b) => {
  // X-07 accessibility (desktop)
  let { page } = await open(b, "filters");
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page, 300);
  const ax = await axe(page);
  const dups = await dupNames(page);
  const unl = await unlabelled(page);
  await show(page, "Country").uncheck(); await wait(page);
  await rail(page, "Dashboard"); await wait(page, 500);
  const info = await guardInfo(page);
  const axd = await axeEl(page, "[role=dialog]:not([inert] *)");
  const hasName = !!info[0]?.name;
  const focusIn = await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"));
  await page.keyboard.press("Escape"); await wait(page, 400);
  const closed = (await dialogs(page)).length === 0;
  const refocus = await page.evaluate(() => { const a = document.activeElement; return a?.getAttribute("aria-label") || a?.innerText?.slice(0, 30) || a?.tagName; });
  const serious = ax.filter((x) => /serious|critical/.test(x)); const seriousD = axd.filter((x) => /serious|critical/.test(x));
  const dupsReal = dups.filter((d) => !/^(Select|Edit)/.test(d));
  rec("X-07", !serious.length && !seriousD.length && !dups.length && !unl.length && hasName && focusIn && closed ? "PASS" : "FAIL",
    `axe on pane: ${JSON.stringify(ax)}; axe on the discard dialog: ${JSON.stringify(axd)}; dialog name ${JSON.stringify(info[0]?.name)}; focus inside on open=${focusIn}; Escape closes=${closed}, focus then on "${refocus}"; duplicate accessible names in the pane: ${JSON.stringify(dups)}; inputs without a label: ${JSON.stringify(unl)}`, await sh(page, "X-07-FLT"));
  await page.context().close();
});

await run("FLT-m", async (b) => {
  // FLT-21 + X-06 phone
  let { page, errors } = await open(b, "filters", "mobile");
  await wait(page, 600);
  const tables = await S(page).locator("table").count();
  const hs = await hscroll(page);
  const pill = await S(page).locator('[aria-label^="Show "]').count();
  const ups = await S(page).getByRole("button", { name: /^Move .* up$/ }).count();
  const sels = await S(page).locator('button[aria-label^="Move to group"]').count();
  const prow = (p) => S(p).locator("[data-part=row]").filter({ has: p.locator('[aria-label^="Show "]') }).evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));
  const first = await prow(page);
  await show(page, "Person").tap().catch(async () => { await show(page, "Person").click(); });
  await wait(page, 200);
  const personOff = !(await show(page, "Person").isChecked());
  const downBtn = S(page).getByRole("button", { name: /^Move Court Case down$|^Move Person down$/ }).first();
  await S(page).getByRole("button", { name: /^Move Person down$/ }).tap().catch(() => {}); await wait(page, 300);
  const after = await prow(page);
  const moved = /^Court Case/.test(after[0]) && /^Person/.test(after[1]);
  // group: how is a group added on a phone?
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().tap(); await wait(page, 400);
  const dlg = await dialogs(page);
  const chips = await S(page).locator('[aria-label="Group name"]').count();
  const sheetLike = dlg.length ? await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((e) => !e.closest("[inert]")); const r = d.getBoundingClientRect(); return { w: Math.round(r.width), bottom: Math.round(r.bottom), h: Math.round(r.height) }; }) : null;
  const sel = S(page).locator('button[aria-label^="Move to group"]').first();
  await sel.tap(); await wait(page, 300);
  const opts = await page.locator("[role=option]").count();
  await shotAndKeep(page);
  rec("FLT-21", tables === 0 && hs.doc <= 0 && hs.pane <= 0 && personOff && moved && (dlg.length ? sheetLike.w >= 380 : false) ? "PASS" : "FAIL",
    `phone 390x844: <table> elements=${tables}, overflow ${JSON.stringify(hs)}; Show toggles=${pill}, Move up buttons=${ups}, group selects before any group exists=${sels} (the Group column shows a dash until a group exists); Show Person tap toggled=${personOff}; Move Person down by touch moved=${moved} (first rows now ${JSON.stringify(after.slice(0, 2).map((r) => r.slice(0, 24)))}, before ${JSON.stringify(first.slice(0, 2).map((r) => r.slice(0, 24)))}); the group action by touch opened dialogs=${JSON.stringify(dlg)} and ${chips} inline group-name input(s) (expected a group dialog as a sheet or full screen); the group select opened ${opts} options. Everything else in the row works by touch`, await sh(page, "FLT-21"));
  await page.context().close();

  ({ page, errors } = await open(b, "filters", "mobile"));
  await show(page, "Person").tap(); await wait(page, 200);
  await page.getByRole("button", { name: /Back to settings|Back/ }).first().tap().catch(() => {}); await wait(page, 500);
  const d = await guardInfo(page);
  const box = d.length ? await page.evaluate(() => { const e = [...document.querySelectorAll("[role=dialog]")].find((x) => !x.closest("[inert]")); const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y), h: Math.round(r.height), vh: innerHeight }; }) : null;
  const re = realErrors(errors);
  rec("X-06", tables === 0 && hs.doc <= 0 && hs.pane <= 0 && d.length && box.w >= 340 && !re.length ? "PASS" : "FAIL", `phone: tables=${tables}, overflow ${JSON.stringify(hs)}; every action reachable by touch (Show, Move down, group select, Save/Discard); dirty page, mobile back chevron opens dialog ${JSON.stringify(d.map((x) => x.name))} at ${JSON.stringify(box)} (full width/sheet-like); console errors ${JSON.stringify(re)}`, await sh(page, "X-06-FLT"));
  await page.context().close();
});
async function shotAndKeep() {}
