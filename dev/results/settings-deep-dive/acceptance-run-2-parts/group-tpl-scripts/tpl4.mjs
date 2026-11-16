import { fixKb, watch, launch, open, S, rows, wait, shot, init, rec, realErrors, names, rowsData, toSettingsItem, notifTitles, addTemplate, openRow, activityRows, beaconTexts, tickRow, devEmpty, devReturn, axeOn, noScrollX } from "./common.mjs";
import { switchTo } from "./h.mjs";
init("tpl4");
const b = await launch();
const selSlot = (p) => S(p).locator("footer").innerText().then((t) => t.replace(/\s+/g, " "));
const toolbarH = (p) => S(p).locator("[data-component=SettingsToolbar]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
const norm = (t) => t.replace(/\s+/g, " ").trim();

// TPL-23 + X-07 dialog (desktop)
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  await addTemplate(page, "QA Unused A"); await addTemplate(page, "QA Unused B"); mon.skip();
  // X-07 on the page
  const pageAxe = await axeOn(page, null);
  const btnNames = await S(page).locator("[role=row] button").evaluateAll((bs) => bs.map((b) => (b.getAttribute("aria-label") || b.innerText).trim()));
  const dup = Object.entries(btnNames.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {})).filter(([, c]) => c > 1);
  // dialog
  await tickRow(page, "QA Unused A");
  const opener = S(page).getByRole("button", { name: "Delete" });
  await opener.focus(); await opener.click(); await wait(page, 400);
  const dlgAxe = await axeOn(page, "[data-component=ConfirmDelete] [role=dialog]");
  const dlgInfo = await page.evaluate(() => { const d = document.querySelector("[data-component=ConfirmDelete] [role=dialog]"); return { role: d?.getAttribute("role"), name: d?.getAttribute("aria-label") || (d?.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby"))?.textContent) || null, modal: d?.getAttribute("aria-modal") }; });
  const trapped = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); trapped.push(await page.evaluate(() => !!document.activeElement?.closest("[data-component=ConfirmDelete]"))); }
  await page.keyboard.press("Escape"); await wait(page, 300);
  const restored = await page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 30) : null; });
  const stillOnPage = (await S(page).locator("h2").first().innerText()) === "Templates";
  await shot(page, "X-07");
  const axeSerious = [...pageAxe, ...dlgAxe].filter((v) => /serious|critical/.test(v));
  const dupStars = dup.filter(([n]) => n === "Set as default");
  rec("X-07", axeSerious.length === 0 && dlgInfo.role === "dialog" && dlgInfo.name && trapped.every(Boolean) && restored === "Delete" && stillOnPage && dup.length === 0 ? "PASS" : "FAIL", `axe page violations ${JSON.stringify(pageAxe)}; axe delete dialog ${JSON.stringify(dlgAxe)}; dialog role/name ${JSON.stringify(dlgInfo)}; Tab x8 stayed inside dialog: ${trapped.every(Boolean)}; Escape closed dialog only (page still Templates=${stillOnPage}); focus restored to "${restored}" (opener: Delete); duplicate row-button names ${JSON.stringify(dup)} (the star's accessible name is "Set as default" on every row, which TPL-09 specifies, but X-07 asks for unique names)`, "X-07");
  await page.keyboard.press("Escape");
  // TPL-23: both unused rows
  await S(page).getByRole("button", { name: /Clear/ }).click().catch(() => {});
  await tickRow(page, "QA Unused A"); await tickRow(page, "QA Unused B");
  const before = await beaconTexts(page);
  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 300);
  const dtxt = norm(await page.locator("[data-component=ConfirmDelete]").innerText());
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 600);
  const goneNow = !(await names(page)).some((n) => /QA Unused/.test(n));
  const bn = (await beaconTexts(page)).filter((t) => !before.includes(t) && !/Running/.test(t));
  await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const goneReload = !(await names(page)).some((n) => /QA Unused/.test(n));
  rec("TPL-23", goneNow && goneReload && bn.length === 1 && /2 templates deleted\./.test(bn[0]) ? "PASS" : "FAIL", `dialog "${dtxt}"; both rows gone=${goneNow}; new Beacon entries ${JSON.stringify(bn)}; after reload both gone=${goneReload}`, await shot(page, "TPL-23"));
  rec("X-05", /Do you want to delete the following items\?/.test(dtxt) && /Removed from Filters|Nothing else changes/.test(dtxt) ? "PASS" : "FAIL", `unused templates: dialog states what changes ("${dtxt}"); templates in use are blocked with the Uwazi reason and the entity count ("48 entities use it") on the disabled checkbox, and a template pointed to by other templates lists those properties (see TPL-14, TPL-18)`, "TPL-17");
  await page.context().close();
}
// X-10 empty state (Dev panel)
{
  const { page, errors } = await open(b, "dashboard");
  const mon = watch(errors);
  await wait(page, 800);
  const st = await devEmpty(page, "Empty templates");
  await devReturn(page, "Templates");
  const txt = norm(await S(page).innerText());
  const addBtns = await S(page).getByRole("button", { name: "Add template" }).count();
  const s = await shot(page, "X-10");
  rec("X-10", /No templates yet/.test(txt) && /A template lists the properties an entity of one type carries\./.test(txt) && addBtns >= 1 && !/Nothing here yet/.test(txt) ? "PASS" : "FAIL", `Dev panel "${st}"; Templates page reads "${txt}"; "Add template" buttons ${addBtns}`, s);
  await page.context().close();
}
// TPL-24, 25, X-11, X-13
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const search = S(page).getByRole("textbox", { name: /Search templates/ });
  const h0 = await toolbarH(page);
  await search.fill("zzzz"); await wait(page, 300);
  const h1 = await toolbarH(page);
  const body = norm(await S(page).innerText());
  const dataRows = (await rowsData(page)).length;
  const addCount = await S(page).getByRole("button", { name: "Add template" }).count();
  const s24 = await shot(page, "TPL-24");
  rec("TPL-24", dataRows === 0 && /zzzz/.test(body) && !/Nothing here yet/.test(body) && /No templates/.test(body) && addCount >= 1 && h0 === h1 ? "PASS" : "FAIL", `rows ${dataRows}; body "${body}"; Add template buttons ${addCount}; search row height ${h0} -> ${h1}`, s24);
  await search.fill("court"); await wait(page, 300);
  const c1 = await names(page);
  // sort kept: set Entities header then search "o"
  await search.fill(""); await wait(page, 200);
  const th = S(page).locator("[role=columnheader]", { hasText: "Entities" }).first().locator("button");
  await th.click(); await wait(page, 200);
  await search.fill("o"); await wait(page, 300);
  const c2 = (await rowsData(page)).map((r) => Number(r.entities));
  const sortKept = c2.every((v, i) => i === 0 || c2[i - 1] >= v);
  await search.fill(""); await wait(page, 300);
  const c3 = await names(page);
  rec("TPL-25", JSON.stringify(c1) === JSON.stringify(["Court Case"]) && sortKept && c3.length === 9 ? "PASS" : "FAIL", `"court" -> ${JSON.stringify(c1)}; with Entities sort active, "o" keeps order ${JSON.stringify(c2)} (descending=${sortKept}); after clearing ${c3.length} rows`, await shot(page, "TPL-25"));
  // X-11 : fixed height, filter, restore
  const h2 = await toolbarH(page);
  rec("X-11", h0 === h1 && h1 === h2 && c1.length === 1 && c3.length === 9 ? "PASS" : "FAIL", `search row height ${h0}px empty field, ${h1}px with zero results, ${h2}px cleared; typing "court" left ${c1.length} row, clearing restored ${c3.length}`, "TPL-24");
  // X-13 corpus scope: users before / after switching to Artworks
  await toSettingsItem(page, "Users");
  const usersBefore = norm(await S(page).innerText());
  await switchTo(page, "Best Artworks");
  await toSettingsItem(page, "Templates");
  const art = await rowsData(page);
  const sA = await shot(page, "X-13");
  await toSettingsItem(page, "Users");
  const usersAfter = norm(await S(page).innerText());
  rec("X-13", art.map((r) => r.name).join(",") === "Artist,Artwork" && usersBefore === usersAfter ? "PASS" : "FAIL", `after switching the data source to Best Artworks Templates lists ${JSON.stringify(art)}; Users list text identical before/after: ${usersBefore === usersAfter}`, sA);
  await page.context().close();
}
// TPL-27
{
  const { page, errors } = await open(b, "templates", "desktop", { source: "artworks" });
  const mon = watch(errors);
  await wait(page, 1500);
  const art = await rowsData(page);
  rec("TPL-27", JSON.stringify(art.map((r) => [r.name, r.entities])) === JSON.stringify([["Artist", "22"], ["Artwork", "60"]]) ? "PASS" : "FAIL", `Artworks data source Templates rows ${JSON.stringify(art.map((r) => [r.name, r.entities, r.def ? "Default" : ""]))}; none of Hearing/Court Case/Person/CEJIL names present: ${!art.some((r) => /Hearing|Court Case|Causa/.test(r.name))}`, await shot(page, "TPL-27"));
  await page.context().close();
}
// TPL-26 + X-06 phone
{
  const { page, errors } = await open(b, "templates", "mobile");
  const mon = watch(errors);
  await wait(page, 1200);
  const kbBefore = await fixKb(page);
  // one unused template so a checkbox is enabled
  await S(page).getByRole("button", { name: "Add template" }).tap(); await wait(page, 600);
  await S(page).getByPlaceholder("Template name").fill("QA Phone"); await wait(page, 200);
  const ed = await page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); return { w: c.getBoundingClientRect().width, docW: document.documentElement.scrollWidth }; });
  await shot(page, "X-06-editor");
  await S(page).getByRole("button", { name: /^(Save|Create template)/ }).first().tap(); await wait(page, 800);
  mon.skip();
  const info = await page.evaluate(() => {
    const list = document.querySelector("[data-component=SettingsTable][data-layout=list]");
    const table = document.querySelector("[data-testid=settings-content] table");
    const rows = list ? [...list.querySelectorAll("[data-part=row]")] : [];
    return { list: !!list, table: !!table, n: rows.length, rows: rows.map((r) => { const dot = [...r.querySelectorAll("span")].find((x) => x.style.backgroundColor); const star = r.querySelector("button[aria-label='Set as default']"); const cb = r.querySelector("input[type=checkbox]"); const bb = (e) => { const b = e?.getBoundingClientRect(); return b ? [Math.round(b.left), Math.round(b.right), Math.round(b.width), Math.round(b.height)] : null; }; return { text: r.innerText.replace(/\s+/g, " ").slice(0, 80), dot: !!dot, badge: /Default/.test(r.innerText), starName: star?.getAttribute("aria-label"), starBox: bb(star), cbName: cb?.getAttribute("aria-label"), cbBox: bb(cb) }; }) };
  });
  const sx = await noScrollX(page);
  const s26 = await shot(page, "TPL-26");
  const all = info.rows.every((r) => r.dot && r.starName === "Set as default" && /^Select /.test(r.cbName || "") && r.starBox && r.starBox[1] <= 390 && r.cbBox && r.cbBox[1] <= 390);
  const defRows = info.rows.filter((r) => r.badge);
  await S(page).locator("[data-part=row]").filter({ hasText: "Hearing" }).first().locator("button[aria-label='Set as default']").tap(); await wait(page, 300);
  const nowDef = (await S(page).locator("[data-part=row]").filter({ hasText: "Default" }).allInnerTexts()).map(norm);
  await S(page).locator('input[aria-label="Select QA Phone"]').tap(); await wait(page, 300);
  const footerText = await selSlot(page);
  rec("TPL-26", info.list && !info.table && info.n === 10 && all && defRows.length === 1 && sx.doc <= sx.win && nowDef.length === 1 && /Hearing/.test(nowDef[0]) && /Selected 1 of 10|Actions/.test(footerText) ? "PASS" : "FAIL", `list layout=${info.list}, table=${info.table}, rows ${info.n} (9 seed + QA Phone), each row has colour dot / star named "Set as default" / checkbox named "Select <name>" inside the 390px viewport: ${all}; Default badge rows: ${defRows.length} (${JSON.stringify(defRows[0]?.text)}); page scroll width ${sx.doc} vs window ${sx.win}, pane ${JSON.stringify(sx.pane)}; tap on the Hearing star -> default rows ${JSON.stringify(nowDef)}; tap on the QA Phone checkbox -> footer "${footerText}"`, s26);
  const actionsBtn = S(page).getByRole("button", { name: "Actions" });
  const hasActions = await actionsBtn.count();
  if (hasActions) { await actionsBtn.tap(); await wait(page, 400); }
  await shot(page, "X-06-actions");
  const sheetInfo = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((d) => { const r = d.getBoundingClientRect(); return { name: d.getAttribute("aria-label") || d.querySelector("h2,h3")?.textContent, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), text: d.innerText.replace(/\s+/g, " ").slice(0, 80) }; }));
  await page.getByRole("button", { name: "Delete" }).last().tap(); await wait(page, 500);
  const dlgInfo = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((d) => { const r = d.getBoundingClientRect(); return { name: d.getAttribute("aria-label") || d.querySelector("h2,h3")?.textContent, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; }));
  await shot(page, "X-06-dialog");
  const confirm = page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true });
  if (await confirm.count()) { await confirm.tap(); await wait(page, 500); }
  const gone = !(await names(page).catch(() => [])).includes("QA Phone");
  const sx2 = await noScrollX(page);
  rec("X-06", info.list && !info.table && sx.doc <= sx.win && sx2.doc <= sx2.win && hasActions && dlgInfo.length > 0 && dlgInfo.every((d) => d.w >= 350 || d.top > 300) && gone ? "PASS" : "FAIL", `list rows not table; no horizontal scroll (doc ${sx.doc}/${sx.win}, after dialogs ${sx2.doc}/${sx2.win}); new-template editor pane width ${ed.w} (doc ${ed.docW}, single column); selection bar "Actions" button ${hasActions}; Actions sheet ${JSON.stringify(sheetInfo)}; delete dialog ${JSON.stringify(dlgInfo)} (viewport 390x844; note --kb read ${kbBefore} at load, re-measured to 0 before driving, see Notes); delete completed by touch: ${gone}`, "X-06-dialog");
  await page.context().close();
}
await b.close();
