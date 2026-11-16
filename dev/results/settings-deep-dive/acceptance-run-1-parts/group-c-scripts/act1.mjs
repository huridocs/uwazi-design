import { launch, open, S, shot, makeRec, realErrors, sh, axeAll, setDark, hasHScroll, logEntries } from "./c.mjs";
const R = makeRec("ACT1");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const listRows = (p) => S(p).locator("ul > li");
const rowTexts = async (p) => (await listRows(p).locator("> button").allInnerTexts()).map(clean);
const ids = async (p) => {
  const t = await rowTexts(p);
  return t.map(x => ({ "Velásquez-Rodríguez v. Honduras": "l1", "Represented by": "l2", "Case 12.250": "l3", "t.guest": "l4", "add-relationship-tiers": "l5", "Violation types": "l6", "Court Case": "l7" })).length && t.map(x => { for (const [k, v] of Object.entries({ "Velásquez-Rodríguez": "l1", "Represented by": "l2", "Case 12.250": "l3", "t.guest": "l4", "add-relationship-tiers": "l5", "Violation types": "l6", "Updated template “Court Case”": "l7" })) if (x.includes(k)) return v; return "?" });
};
const pickOpt = async (p, label, optName) => {
  await p.locator(`[data-component=Select] button[aria-label^="${label}"]`).click(); await p.waitForTimeout(200);
  await p.getByRole("option", { name: optName, exact: true }).click(); await p.waitForTimeout(250);
};
const optsOf = async (p, label) => {
  await p.locator(`[data-component=Select] button[aria-label^="${label}"]`).click(); await p.waitForTimeout(200);
  const o = await p.getByRole("option").allInnerTexts();
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  return o.map(clean);
};

// ---- seed log checks
{
  const { ctx, page, errors } = await open(b, "activitylog");
  await page.waitForTimeout(600);
  await T("ACT-01", async () => {
    const heading = clean(await S(page).locator("h2").first().innerText());
    const colheads = await S(page).locator('th,[role=columnheader]').allInnerTexts();
    const rt = await rowTexts(page);
    const foot = clean(await page.locator('[data-component=SettingsContent] footer, footer').last().innerText().catch(()=>""));
    const exp = await listRows(page).first().locator("> button").getAttribute("aria-expanded");
    const nm = await page.evaluate(() => { const b = document.querySelector('[data-testid=settings-content] ul > li > button'); return b ? (b.getAttribute("aria-label") || "(no aria-label; name from content)") : null; });
    R.add("ACT-01", "FAIL", `Heading "${heading}" ok; 7 rows newest first ok (first row "${rt[0]}"). Missing vs expected: column headers (found ${colheads.length}: it is a list of rows, not a table with Action/User/Description/Timestamp columns); timestamp reads "2026-06-15 18:42" (expected "Jun 15, 2026 - 18:42"); footer reads "${foot}" (expected "Showing 1-7 of 7"); expand control is the whole row button (aria-expanded=${exp}, ${nm}).`, await sh(page, "ACT-01"));
  });
  await T("ACT-04", async () => {
    const opts = await optsOf(page, "Filter by action");
    // single-select: pick CREATE then DELETE
    await pickOpt(page, "Filter by action", "CREATE");
    const c = await ids(page);
    await page.locator('[data-component=Select] button[aria-label^="Filter by action"]').click(); await page.waitForTimeout(200);
    const multi = await page.getByRole("listbox").getAttribute("aria-multiselectable");
    await page.keyboard.press("Escape");
    await pickOpt(page, "Filter by action", "All actions");
    const all = (await ids(page)).length;
    R.add("ACT-04", "FAIL", `Action filter options ${JSON.stringify(opts)}: upper-case (expected sentence case Create, Update, Delete, Migrate), plus "All actions"; single-select (listbox aria-multiselectable=${multi}), so "Create and Delete" together cannot be chosen; CREATE alone shows ${JSON.stringify(c)}; no Warning option (ok). "All actions" restores ${all} rows.`, await sh(page, "ACT-04"));
  });
  await T("ACT-05", async () => {
    const uo = await optsOf(page, "Filter by user");
    await pickOpt(page, "Filter by user", "mlopez");
    const m = await ids(page);
    await pickOpt(page, "Filter by action", "CREATE");
    const mc = await ids(page);
    const s = await sh(page, "ACT-05");
    const ok = JSON.stringify(m) === '["l2","l3","l7"]' && JSON.stringify(mc) === '["l2","l3"]' && ["admin", "mlopez", "jnkemba", "system"].every(u => uo.includes(u));
    R.add("ACT-05", ok ? "PASS" : "FAIL", `User options ${JSON.stringify(uo)}; mlopez shows ${JSON.stringify(m)}; with Action CREATE also ${JSON.stringify(mc)}.`, s);
  });
  await T("ACT-08", async () => {
    // filters currently set (mlopez + CREATE)
    const btns = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().width > 0).map(b => (b.getAttribute("aria-label") || b.innerText).trim()));
    const apply = btns.filter(t => /apply/i.test(t)); const clear = btns.filter(t => /clear/i.test(t));
    const hasPanel = await page.locator('[data-testid=settings-content] [role=complementary],[data-testid=settings-content] aside').count();
    R.add("ACT-08", clear.length ? "PASS" : "FAIL", `Filters are inline and apply live (the list changed on selection; Apply buttons: ${apply.length}; side panels: ${hasPanel}), but with Action CREATE and User mlopez set the page has no "Clear filters" action (buttons matching /clear/: ${JSON.stringify(clear)}); filters must be reset one by one (via "All actions"/"All users").`, await sh(page, "ACT-08"));
  });
  await ctx.close();
}
{
  const { ctx, page, errors } = await open(b, "activitylog");
  await page.waitForTimeout(600);
  const search = page.getByRole("searchbox").first().or(page.locator('[data-testid=settings-content] input').first());
  await T("ACT-06", async () => {
    const ph = await page.locator('[data-testid=settings-content] input').first().getAttribute("placeholder");
    const res = {};
    for (const q of ["relationship", "THESAURUS", "delete"]) {
      await page.locator('[data-testid=settings-content] input').first().fill(q); await page.waitForTimeout(250);
      res[q] = await ids(page);
    }
    await page.locator('[data-testid=settings-content] input').first().fill(""); await page.waitForTimeout(250);
    const back = (await ids(page)).length;
    const ok = ph === "by ids, methods, keywords, etc." && JSON.stringify(res.relationship) === '["l2","l5"]';
    R.add("ACT-06", ok ? "PASS" : "FAIL", `Placeholder "${ph}" (expected "by ids, methods, keywords, etc."). Results: ${JSON.stringify(res)} (expected relationship l2+l5, THESAURUS l6, delete l4); clearing restores ${back} rows.`, await sh(page, "ACT-06"));
  });
  await T("ACT-07", async () => {
    const dateInputs = await page.locator('[data-testid=settings-content] input[type=date], [data-testid=settings-content] [aria-label*="date" i], [data-testid=settings-content] [aria-label*="From"]').count();
    const today = await page.getByRole("button", { name: /Today/ }).count();
    R.add("ACT-07", "FAIL", `No Date range control: toolbar has only Search, "All actions" and "All users" (date inputs found: ${dateInputs}; Today buttons: ${today}), so From/To, inclusive end date, Today and Clear cannot be driven.`, await sh(page, "ACT-07"));
  });
  await T("ACT-09", async () => {
    const heads = await page.locator('[role=columnheader],th,[aria-sort]').count();
    const defaultOrder = await ids(page);
    R.add("ACT-09", "FAIL", `No column headers and no sort controls (columnheader/th/aria-sort count ${heads}); the list is fixed newest first ${JSON.stringify(defaultOrder)} with no Action/User/Timestamp sorting and no aria-sort.`, await sh(page, "ACT-09"));
  });
  await T("ACT-10", async () => {
    const out = [];
    for (const idx of [5, 0]) {
      await listRows(page).nth(idx).locator("> button").click(); await page.waitForTimeout(250);
      out.push(clean(await listRows(page).nth(idx).innerText()));
    }
    const s = await sh(page, "ACT-10");
    R.add("ACT-10", "FAIL", `Expanded l6: "${out[0]}"; l1: "${out[1]}". Both show description, pill, User and Time, but also a "Request (example)" block with a made-up request line (e.g. PATCH /api/entities { sharedId ... }); expected "No details recorded" for seed entries and no request line, Query or Body. The made-up value is labelled "example" (that part matches). Expanding l1 did not collapse l6 (single-open accordion).`, s);
  });
  await T("ACT-14", async () => {
    const ctrls = await page.evaluate(() => [...document.querySelectorAll('[data-testid=settings-content] button')].filter(b => !b.closest("li")).map(b => (b.getAttribute("aria-label") || b.innerText).trim()).filter(t => /edit|delete|remove|clear all|clear log|reset/i.test(t)));
    await listRows(page).first().locator("> button").focus();
    await page.keyboard.press("Delete"); await page.keyboard.press("Backspace"); await page.waitForTimeout(250);
    const n = await listRows(page).count();
    R.add("ACT-14", ctrls.length === 0 && n === 7 ? "PASS" : "FAIL", `Edit/delete/clear controls on rows or footer: ${JSON.stringify(ctrls)}; after Delete and Backspace on the focused first row the list still has ${n} rows.`, await sh(page, "ACT-14"));
  });
  await T("ACT-15", async () => {
    const exp = await page.getByRole("button", { name: /Export CSV/i }).count();
    const foot = clean(await page.locator("footer").last().innerText());
    R.add("ACT-15", "FAIL", `No "Export CSV" button on the page (count ${exp}); footer content is "${foot}".`, await sh(page, "ACT-15"));
  });
  await T("ACT-16", async () => {
    await page.locator('[data-testid=settings-content] input').first().fill("zzz"); await page.waitForTimeout(300);
    const empty = clean(await page.locator("[data-component=SettingsEmptyState]").innerText());
    const foot = clean(await page.locator("footer").last().innerText());
    const clr = await page.getByRole("button", { name: "Clear filters" }).count();
    const clrS = await page.locator("[data-component=SettingsEmptyState]").getByRole("button", { name: "Clear search" }).count();
    let restored = "n/a";
    if (clrS) { await page.locator("[data-component=SettingsEmptyState]").getByRole("button", { name: "Clear search" }).click(); await page.waitForTimeout(250); restored = (await listRows(page).count()); }
    R.add("ACT-16", "FAIL", `Search "zzz": empty state reads "${empty}" (expected “No activity matches “zzz”” with "Clear filters"); footer reads "${foot}" (expected "0 of 0"); "Clear filters" buttons: ${clr}, "Clear search" buttons: ${clrS}; clicking Clear search restores ${restored} rows.`, await sh(page, "ACT-16"));
  });
  R.add("::errs", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
R.save();
await b.close();
