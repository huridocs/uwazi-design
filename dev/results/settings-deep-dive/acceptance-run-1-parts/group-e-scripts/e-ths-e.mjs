import { run, open, openFast, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, commit, nlist, newNotifs, guardInfo, guardBtn, rail, axe, axeEl, dupNames, unlabelled, realErrors, logEntries, switchTo, toSettings, hscroll, newThes } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const rowDelete = async (p, label) => { const r = S(p).locator("[role=row]").filter({ hasText: label }).first(); await r.hover(); await r.getByRole("button", { name: new RegExp("^Delete " + label) }).click(); await wait(p, 400); };

if (want("a")) await run("THS-x1", async (b) => {
  // X-10 empty state
  let { page } = await open(b, "thesauri");
  const blocked = []; const deleted = [];
  for (const name of ["Violation types", "Legal instruments", "Case status", "Document types", "Regions"]) {
    await rowDelete(page, name);
    const info = await guardInfo(page);
    if ((info[0]?.buttons || []).includes("Delete")) { await guardBtn(page, /^Delete$/).click(); deleted.push(name); await wait(page, 400); }
    else { blocked.push(name); await guardBtn(page, /^OK/).click(); await wait(page, 300); }
  }
  const left = await dataRows(page);
  await S(page).locator('input[aria-label="Search thesauri"]').fill("zzzz"); await wait(page, 300);
  const empty = clean(await S(page).innerText());
  const emptyBtn = await S(page).getByRole("button", { name: /Add thesaurus/ }).count();
  rec("X-10", "NOT DRIVEABLE", `a zero-row Thesauri list cannot be reached on the Sample: only ${JSON.stringify(deleted)} could be deleted; ${JSON.stringify(blocked)} are blocked because template properties use them, and unbinding needs the template store (M8). With a search that matches nothing the page shows: "${empty.slice(80, 300)}" ("Add thesaurus" buttons: ${emptyBtn}); the empty-state component itself ("No thesauri yet" + hint + "Add thesaurus") was not seen`, await sh(page, "X-10-THS"));
  await page.context().close();

  // X-11 search
  ({ page } = await open(b, "thesauri"));
  const tb0 = await S(page).locator('[data-component=SettingsToolbar]').boundingBox();
  const inp = S(page).locator('input[aria-label="Search thesauri"]');
  await inp.fill("leg"); await wait(page, 300);
  const f1 = await dataRows(page);
  const tb1 = await S(page).locator('[data-component=SettingsToolbar]').boundingBox();
  await inp.fill("zzzz"); await wait(page, 300);
  const f2 = await dataRows(page);
  const tb2 = await S(page).locator('[data-component=SettingsToolbar]').boundingBox();
  await inp.fill(""); await wait(page, 300);
  const f3 = await dataRows(page);
  rec("X-11", f1.length === 1 && f3.length === 5 && tb0.height === tb1.height && tb1.height === tb2.height ? "PASS" : "FAIL", `list: "leg" -> ${JSON.stringify(f1)}; "zzzz" -> ${f2.length} rows; cleared -> ${f3.length} rows; search row height ${tb0.height}/${tb1.height}/${tb2.height}. Editor value tree has no search (see THS-34)`, await sh(page, "X-11-THS"));
  // X-12 selection bar
  const cbs = await S(page).locator('[role=row] input[type=checkbox], [role=row] [role=checkbox]').count();
  rec("X-12", "FAIL", `the list has no row checkboxes (${cbs}) and no select-all, so the footer never shows "Selected n of total" with bulk actions; the footer holds only "Add thesaurus". Editor value tree: no checkboxes either (THS-20)`, "acceptance-run-1-shots/X-11-THS.png");
  await page.context().close();

  // X-13 corpus scope
  ({ page } = await open(b, "thesauri"));
  const own = await dataRows(page);
  await switchTo(page, "CEJIL"); await toSettings(page, "Thesauri"); await wait(page, 3000);
  const cej = await dataRows(page);
  await switchTo(page, "Sample"); await toSettings(page, "Thesauri"); await wait(page, 1500);
  const back = await dataRows(page);
  rec("X-13", JSON.stringify(own) !== JSON.stringify(cej) && JSON.stringify(own) === JSON.stringify(back) ? "PASS" : "FAIL", `Sample ${own.length} rows (${own.slice(0, 2).map((r) => r.slice(0, 20))}); CEJIL ${cej.length} rows (${cej.slice(0, 2).map((r) => r.slice(0, 20))}); back on Sample ${back.length} rows. (Switching the source returns to the Library; Settings was reopened.)`, await sh(page, "X-13-THS"));
  await page.context().close();
});

if (want("b")) await run("THS-x2", async (b) => {
  // X-01 persistence, X-04 notification, X-09 log
  let { page } = await open(b, "thesauri");
  const bf = await nlist(page);
  await openRow(page, "Regions");
  const i = S(page).locator('[aria-label="Item label"]').first(); const orig = await i.inputValue();
  await i.fill(orig + " QA"); await wait(page, 150);
  await commit(page).click(); await wait(page, 500);
  const n = await newNotifs(page, bf);
  const log = await logEntries(page);
  await rail(page, "Filters"); await wait(page, 400); await rail(page, "Thesauri"); await wait(page, 500);
  await openRow(page, "Regions");
  const a = await S(page).locator('[aria-label="Item label"]').first().inputValue();
  await rail(page, "Thesauri"); await wait(page, 300);
  await page.reload(); await wait(page, 1500);
  await openRow(page, "Regions");
  const r = await S(page).locator('[aria-label="Item label"]').first().inputValue();
  rec("X-01", a === orig + " QA" && r === orig + " QA" ? "PASS" : "FAIL", `edited first Regions value "${orig}" -> "${orig} QA", Save: after a rail round trip "${a}"; after a tab reload "${r}" (a thesaurus created in session also vanishes on reload, see THS-09)`, await sh(page, "X-01-THS"));
  rec("X-04", n.some((x) => /^Thesauri updated\./.test(x)) ? "PASS" : "FAIL", `one Save added Beacon entries ${JSON.stringify(n)}; expected the page's quoted text "Thesauri updated." (create expects "Thesauri added.", delete "Thesauri deleted"; actual "Thesaurus created", "<name> saved", "<name> deleted"). Failure path: no failure switch available (NOT DRIVEABLE)`, "acceptance-run-1-shots/X-01-THS.png");
  rec("X-09", log.some((l) => /thesaurus/i.test(l)) ? "PASS" : "FAIL", `Activity log store after Save: ${JSON.stringify(log.slice(0, 2))} (acting user admin); description reads "Updated thesaurus “Regions QA”" style like the seed rows`, "acceptance-run-1-shots/X-01-THS.png");
  await page.context().close();
});

if (want("c")) await run("THS-x3", async (b) => {
  // X-07 axe
  let { page } = await open(b, "thesauri");
  const v = await axe(page); const dups = await dupNames(page); const unl = await unlabelled(page);
  await openRow(page, "Violation types");
  const ve = await axe(page); const dupsE = await dupNames(page); const unlE = await unlabelled(page);
  const unnamed = await S(page).locator("input").evaluateAll((els) => els.length);
  await sh(page, "X-07-THS");
  await S(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  await rowDelete(page, "Case status");
  const dv = await axeEl(page, "[data-component=ConfirmDelete],[data-component=ConfirmDialog]");
  const info = await guardInfo(page);
  await page.keyboard.press("Escape"); await wait(page, 300);
  const closed = (await dialogs(page)).length === 0;
  const all = [...v, ...ve, ...dv].filter((x) => /serious|critical/.test(x));
  rec("X-07", !all.length && !dupsE.length && !unlE.length ? "PASS" : "FAIL", `axe list: ${JSON.stringify(v)}; axe editor (${unnamed} inputs): ${JSON.stringify(ve)}; axe delete dialog: ${JSON.stringify(dv)}; dialog "${info[0]?.name}" Escape closes=${closed}; duplicate accessible names on list ${JSON.stringify(dups)} and editor ${JSON.stringify(dupsE)}; inputs without label list ${JSON.stringify(unl)} editor ${JSON.stringify(unlE)}`, "acceptance-run-1-shots/X-07-THS.png");
  await page.context().close();
});

if (want("d")) await run("THS-phone", async (b) => {
  let { page, errors } = await open(b, "thesauri", "mobile");
  await wait(page, 600);
  const hs = await hscroll(page);
  const tables = await S(page).locator("table").count();
  const rowsT = await dataRows(page);
  const txt = clean(await S(page).innerText());
  await sh(page, "THS-38-list");
  await S(page).locator("[role=row], li").filter({ hasText: "Case status" }).first().tap(); await wait(page, 600);
  const hs2 = await hscroll(page);
  const tbl2 = await S(page).locator("table").count();
  const inputs = await S(page).locator('[aria-label="Item label"]').count();
  const first = S(page).locator('[aria-label="Item label"]').first();
  await first.tap(); await wait(page, 500);
  const dlg = await dialogs(page);
  const sheetText = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 120)));
  const moveToGroup = await page.getByText(/Move to group/).count();
  await sh(page, "THS-38");
  const ok = !tables && !tbl2 && !hs.doc && !hs2.doc && moveToGroup > 0;
  rec("THS-38", ok ? "PASS" : "FAIL", `phone list: ${["Violation types","Legal instruments","Case status","Document types","Regions"].filter((n) => txt.includes(n)).length} rows (name + "Items n", trash icon visible), tables=${tables}, h-scroll ${JSON.stringify(hs)}; list rows show name and count but no template pills (column absent). Editor "Case status": tables=${tbl2}, ${inputs} value inputs, h-scroll ${JSON.stringify(hs2)}; tapping a value only focuses its input; sheet/dialogs opened=${JSON.stringify(sheetText)}; "Move to group"/Move up/down/Remove sheet present=${moveToGroup > 0}`, "acceptance-run-1-shots/THS-38.png");
  // X-06: dialogs are sheets/full screen, actions reachable
  await S(page).getByRole("button", { name: "Cancel" }).tap(); await wait(page, 300);
  const del = page.locator("[role=row], li").filter({ hasText: "Violation types" }).first().getByRole("button", { name: /Delete Violation types/ });
  const delVisible = await del.isVisible().catch(() => false);
  await del.tap().catch(() => {}); await wait(page, 500);
  const info = await guardInfo(page);
  const box = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((e) => !e.closest("[inert]")); if (!d) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  await sh(page, "X-06-THS");
  const re = realErrors(errors);
  rec("X-06", !tables && !tbl2 && !hs.doc && !hs2.doc && delVisible && info.length ? "PASS" : "FAIL", `phone 390x844: no table on list or editor, no horizontal scroll (list ${JSON.stringify(hs)}, editor ${JSON.stringify(hs2)}); row delete button visible without hover=${delVisible}; tapping it opens dialog "${info[0]?.name}" at ${JSON.stringify(box)} (full width/sheet); editor is a single column; console errors ${JSON.stringify(re)}. Value-row sheet is missing (THS-38)`, "acceptance-run-1-shots/X-06-THS.png");
  await page.context().close();
});
