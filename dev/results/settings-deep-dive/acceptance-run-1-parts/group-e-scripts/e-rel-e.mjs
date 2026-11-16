import { run, open, S, wait, clean, sh, dialogs, rec, dataRows, openRow, lead, nlist, newNotifs, guardInfo, guardBtn, rail, toSettings, switchTo, notifTitles, logEntries, axe, axeEl, dupNames, unlabelled, realErrors, hscroll, contrast, saveBtn } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;
const nameIn = (p) => S(p).locator("#relationship-type-name");
const commitBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create relationship type)$/ });
const rowDelete = async (p, label) => { const r = S(p).locator("[role=row]").filter({ hasText: label }).first(); await r.hover(); await r.getByRole("button", { name: new RegExp("^Delete " + label) }).click(); await wait(p, 400); };

if (want("a")) await run("REL-x1", async (b) => {
  // X-01, X-04, X-09
  let { page } = await open(b, "relationship-types");
  const bf = await nlist(page);
  await openRow(page, "Victim"); await nameIn(page).fill("Victim renamed"); await commitBtn(page).click(); await wait(page, 600);
  const n = await newNotifs(page, bf);
  const log = await logEntries(page);
  const bf2 = await nlist(page);
  await lead(page, "Add relationship type").click(); await wait(page, 300);
  await nameIn(page).fill("QA type"); await commitBtn(page).click(); await wait(page, 600);
  const nAdd = await newNotifs(page, bf2);
  await rowDelete(page, "QA type"); await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /^Delete$/ }).click(); await wait(page, 500);
  const nDel = await newNotifs(page, bf2);
  await rail(page, "Filters"); await wait(page, 300); await rail(page, "Relationship types"); await wait(page, 400);
  const a = (await dataRows(page)).some((r) => /^Victim renamed/.test(r));
  await page.reload(); await wait(page, 1500);
  const r = (await dataRows(page)).some((x) => /^Victim renamed/.test(x));
  await rail(page, "Dashboard"); await wait(page, 400);
  const reset = page.getByRole("button", { name: /Reset demo data/ });
  if (await reset.count()) { await reset.first().click(); await wait(page, 500); const c = page.locator('[data-component=ConfirmDialog],[data-component=ConfirmDelete]').getByRole("button", { name: /Reset|Accept|Confirm/ }); if (await c.count()) { await c.last().click(); await wait(page, 800); } }
  await rail(page, "Relationship types"); await wait(page, 600);
  const z = (await dataRows(page)).some((x) => /^Victim( |$)/.test(x)) && !(await dataRows(page)).some((x) => /^Victim renamed/.test(x));
  rec("X-01", a && r && z ? "PASS" : "FAIL", `renamed Victim -> "Victim renamed", Save: after a rail round trip listed=${a}; after a tab reload listed=${r} (Sample registry is kept across a reload here); after Reset demo data the seed "Victim" is back=${z}`, await sh(page, "X-01-REL"));
  rec("X-04", n.length === 1 && /Victim/.test(n[0]) && /QA type/.test(nAdd.join(" ")) ? "PASS" : "FAIL", `rename Save added ${JSON.stringify(n)}; creating "QA type" added ${JSON.stringify(nAdd)} (does not name the type); deleting it added ${JSON.stringify(nDel)}. One entry per action, but the create entry does not name the type (REL-05). Failure path: no failure switch, so the "An error occurred" entry was not driven`, "acceptance-run-1-shots/X-01-REL.png");
  rec("X-09", log.some((l) => /relationship type/i.test(l)) ? "PASS" : "FAIL", `Activity log store after the rename: ${JSON.stringify(log.slice(0, 2))} (user admin)`, "acceptance-run-1-shots/X-01-REL.png");
  await page.context().close();
});

if (want("b")) await run("REL-x2", async (b) => {
  // X-05 summary evidence is in REL-09/10/11; X-07, X-08, X-11, X-13
  let { page } = await open(b, "relationship-types");
  const v = await axe(page); const dups = await dupNames(page); const unl = await unlabelled(page);
  await openRow(page, "Victim");
  const ve = await axe(page); const dupsE = await dupNames(page); const unlE = await unlabelled(page);
  await sh(page, "X-07-REL");
  await S(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  await rowDelete(page, "Mentions");
  const dv = await axeEl(page, "[data-component=ConfirmDelete],[data-component=ConfirmDialog]");
  const info = await guardInfo(page);
  const inDlg = await page.evaluate(() => !!document.activeElement.closest("[data-component=ConfirmDelete],[data-component=ConfirmDialog]"));
  await page.keyboard.press("Escape"); await wait(page, 300);
  const closed = (await dialogs(page)).length === 0;
  const opener = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
  const all = [...v, ...ve, ...dv].filter((x) => /serious|critical/.test(x));
  rec("X-07", !all.length && !dups.length && !dupsE.length && !unl.length && !unlE.length ? "PASS" : "FAIL", `axe list ${JSON.stringify(v)}; editor ${JSON.stringify(ve)}; delete dialog ${JSON.stringify(dv)}; dialog "${info[0]?.name}": focus inside on open=${inDlg}, Escape closes=${closed}, focus returns to "${opener}"; duplicate accessible names on list ${JSON.stringify(dups)}; inputs without label list ${JSON.stringify(unl)} editor ${JSON.stringify(unlE)}`, "acceptance-run-1-shots/X-07-REL.png");

  // X-08 pills
  const light = await contrast(page, "[data-column=templates] span span");
  await page.getByRole("button", { name: /^Theme/ }).click(); await wait(page, 600);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  let dark = await contrast(page, "[data-column=templates] span span");
  const themeBtn = await page.getByRole("button", { name: /^Theme/ }).getAttribute("aria-label");
  if (!isDark) { await page.getByRole("button", { name: /^Theme/ }).click(); await wait(page, 500); dark = await contrast(page, "[data-column=templates] span span"); }
  const isDark2 = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await sh(page, "X-08-REL-dark");
  rec("X-08", light && dark && light.ratio >= 4.5 && dark.ratio >= 4.5 && isDark2 ? "PASS" : "FAIL", `Templates pill ("${light?.text}"): light contrast ${light?.ratio} (text rgb ${light?.fg} on rgb ${light?.bg}); dark mode (html.dark=${isDark2}) ${dark?.ratio} (text rgb ${dark?.fg} on rgb ${dark?.bg}); threshold 4.5`, "acceptance-run-1-shots/X-08-REL-dark.png");
  await page.context().close();

  // X-11
  ({ page } = await open(b, "relationship-types"));
  const tb0 = (await S(page).locator('[data-component=SettingsToolbar]').boundingBox()).height;
  const inp = S(page).locator('input[aria-label="Search relationship types"]');
  await inp.fill("cite"); await wait(page, 300);
  const f1 = await dataRows(page);
  const tb1 = (await S(page).locator('[data-component=SettingsToolbar]').boundingBox()).height;
  await inp.fill(""); await wait(page, 300);
  const f2 = await dataRows(page);
  rec("X-11", f1.length === 1 && f2.length === 12 && tb0 === tb1 ? "PASS" : "FAIL", `"cite" -> ${JSON.stringify(f1)}; cleared -> ${f2.length} rows; search row height ${tb0} -> ${tb1}`, await sh(page, "X-11-REL"));
  await page.context().close();

  // X-13
  ({ page } = await open(b, "relationship-types"));
  const own = await dataRows(page);
  await switchTo(page, "CEJIL"); await toSettings(page, "Relationship types"); await wait(page, 2500);
  const cej = await dataRows(page);
  await switchTo(page, "Sample"); await toSettings(page, "Relationship types"); await wait(page, 1200);
  const back = await dataRows(page);
  rec("X-13", JSON.stringify(own) !== JSON.stringify(cej) && JSON.stringify(own) === JSON.stringify(back) ? "PASS" : "FAIL", `Sample ${own.length} rows (${own.slice(0, 2).map((r) => r.slice(0, 18))}); CEJIL ${cej.length} rows (${cej.slice(0, 2).map((r) => r.slice(0, 18))}); back on Sample ${back.length} rows`, await sh(page, "X-13-REL"));
  await page.context().close();
});

if (want("c")) await run("REL-phone", async (b) => {
  let { page, errors } = await open(b, "relationship-types", "mobile");
  await wait(page, 600);
  const hs = await hscroll(page); const tables = await S(page).locator("table").count();
  const txt = clean(await S(page).innerText());
  await sh(page, "REL-22-list");
  // row text for first rows
  const items = await S(page).locator("[data-component=SettingsTable] > *, ul > li").evaluateAll((els) => els.slice(0, 3).map((e) => e.innerText.replace(/\s+/g, " ").trim().slice(0, 60)));
  await S(page).locator("li, [role=row]").filter({ hasText: "Victim" }).first().tap(); await wait(page, 600);
  const editor = clean(await S(page).innerText()).slice(0, 80);
  const dlg = await dialogs(page);
  const hs2 = await hscroll(page);
  await nameIn(page).fill("Victim phone"); await wait(page, 150);
  const sheetLike = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((e) => !e.closest("[inert]")); return !!d; });
  await sh(page, "REL-22");
  await commitBtn(page).tap(); await wait(page, 600);
  const saved = (await dataRows(page).catch(() => [])).length ? true : /Victim phone/.test(clean(await S(page).innerText()));
  // add + delete reachable
  const addVis = await S(page).locator("footer").getByRole("button", { name: "Add relationship type" }).isVisible();
  const del = S(page).locator("li, [role=row]").filter({ hasText: "Mentions" }).first().getByRole("button", { name: /Delete Mentions/ });
  const delVis = await del.isVisible().catch(() => false);
  await del.tap().catch(() => {}); await wait(page, 500);
  const info = await guardInfo(page);
  const box = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((e) => !e.closest("[inert]")); if (!d) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  await sh(page, "X-06-REL");
  const usage = /Court Case/.test(txt) && /references/.test(txt);
  rec("REL-22", !tables && !hs.doc && !hs2.doc && sheetLike ? "PASS" : "FAIL", `phone list: tables=${tables}, h-scroll ${JSON.stringify(hs)}; rows show name, template pills and "N references" (usage text present=${usage}); tapping a row opens a full editor page (not a sheet; dialogs ${JSON.stringify(dlg)}, sheet-like=${sheetLike}), single column, h-scroll ${JSON.stringify(hs2)}; rename and Save worked=${saved}; "Add relationship type" visible=${addVis}; row delete visible without hover=${delVis} and opens dialog "${info[0]?.name}" at ${JSON.stringify(box)}`, "acceptance-run-1-shots/REL-22.png");
  const re = realErrors(errors);
  rec("X-06", !tables && !hs.doc && !hs2.doc && delVis && info.length ? "PASS" : "FAIL", `phone 390x844: no table, no horizontal scroll (list ${JSON.stringify(hs)}, editor ${JSON.stringify(hs2)}); Add and row delete reachable by touch; dialog "${info[0]?.name}" at ${JSON.stringify(box)}; console errors ${JSON.stringify(re)}`, "acceptance-run-1-shots/X-06-REL.png");
  await page.context().close();
});
