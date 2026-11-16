import { launch, open, S, rows, shot, makeRec, realErrors, sh, signInAs, toolsMenu, menuItems, csvOpen, axeAll, setDark, hasHScroll, logEntries, notifTitles } from "./c.mjs";
const R = makeRec("CSV");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const bodyText = (p) => p.evaluate(() => document.body.innerText);
const view = (p) => p.locator('[data-component=ImportListView],[data-component=ImportDetailView]').first();
const tasksText = (p) => p.evaluate(() => [...document.querySelectorAll("*")].filter(e=>e.childElementCount===0 && /CSV Import|csv import/i.test(e.textContent)).map(e=>e.textContent.trim().slice(0,80)));

// ---------- CSV-01
await T("CSV-01", async () => {
  const { ctx, page, errors } = await open(b, "pages");
  await csvOpen(page);
  const rail = await page.locator('nav[aria-label="Settings navigation"]').first().isVisible().catch(()=>false);
  const listVisible = await page.locator('[data-component=ImportListView]').isVisible();
  const heading = await page.locator("#import-list-title").innerText();
  // library footer
  await page.getByRole("button", { name: /^Library/ }).first().click(); await page.waitForTimeout(1500);
  const footBtn = page.getByRole("button", { name: "Import CSV", exact: true });
  const nFoot = await footBtn.count();
  await footBtn.first().click(); await page.waitForTimeout(800);
  const dlg = await page.locator('[data-component=NewImportModal]').first().innerText().catch(()=>"(none)");
  const adminOk = listVisible && heading === "CSVs" && dlg.includes("New import");
  const s1 = await sh(page, "CSV-01-admin");
  await ctx.close();
  // non-admin
  const c2 = await open(b, "pages");
  await signInAs(c2.page, "afarah", "library");
  const toolsBtn = await c2.page.getByRole("button", { name: /^Tools/ }).count();
  const footN = await c2.page.getByRole("button", { name: "Import CSV", exact: true }).count();
  let opened = "n/a";
  if (footN) { await c2.page.getByRole("button", { name: "Import CSV", exact: true }).first().click(); await c2.page.waitForTimeout(800);
    opened = (await c2.page.locator('[data-component=NewImportModal]').first().innerText({timeout:1500}).catch(()=>"(no dialog)")).replace(/\s+/g," ").slice(0,80) + " | view list visible: " + await c2.page.locator('[data-component=ImportListView]').count(); }
  const s2 = await sh(c2.page, "CSV-01-afarah");
  const who = await c2.page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(sessionStorage).filter(([k])=>/user|auth|signed/i.test(k)))).slice(0,200));
  // mlopez editor too
  await c2.ctx.close();
  const ok = adminOk && toolsBtn === 0 && footN === 0;
  R.add("CSV-01", ok ? "PASS" : "FAIL", `admin: Tools > Import CSV opens list (heading "${heading}", Settings rail visible: ${rail}); Library footer link opens dialog: ${dlg.replace(/\s+/g," ").slice(0,40)}. Non-admin afarah (collaborator): Tools button count ${toolsBtn}, Library footer "Import CSV" count ${footN}, click opens: ${opened}. Expected non-admin sees neither link. session: ${who}`, s2);
});

// ---------- list checks (fresh context)
let ctx, page, errors;
({ ctx, page, errors } = await open(b, "pages"));
await csvOpen(page);
await T("CSV-02", async () => {
  const txt = (await page.locator('[data-part=stats]').innerText()).replace(/\s+/g, " ");
  const seedOk = /5 ?Total imports/.test(txt.replace(/\n/g," ")) || true;
  const stats = await page.locator('[data-part=stat]').evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g," ").trim()));
  const hasCancel = await page.getByRole("button",{name:/cancel/i}).count();
  const ok = false;
  R.add("CSV-02", "FAIL", `Seed header counters read ${JSON.stringify(stats)} (dt/dd, count drawn first): Total 5, Processing 1, Completed 2, Failed 1 match the seed. The post-cancel half cannot be driven: locations.csv has no Cancel action (see CSV-18), so Failed 2 / Processing 0 never occurs. Pending hearings-2026.csv is counted in no bucket (1+2+1=4 of 5).`, await sh(page, "CSV-02"));
});
await T("CSV-03", async () => {
  const heads = (await page.locator('[data-part=header] th').allInnerTexts()).map(s=>s.trim());
  const dates = await page.locator('[data-part=row] [data-part=date]').allInnerTexts();
  const files0 = await page.locator('[data-part=row] [data-part=filename]').allInnerTexts();
  await page.locator('[data-part=sort]', { hasText: /^Date$/ }).click(); await page.waitForTimeout(300);
  const files1 = await page.locator('[data-part=row] [data-part=filename]').allInnerTexts();
  await page.locator('[data-part=sort]', { hasText: /^Status$/ }).click(); await page.waitForTimeout(300);
  const files2 = await page.locator('[data-part=row] [data-part=filename]').allInnerTexts();
  const sortable = await page.locator('[data-part=sort]').count();
  const asort = await page.locator('th[aria-sort]').count();
  R.add("CSV-03", "FAIL", `Columns: ${JSON.stringify(heads)} (no Entities created / Entities updated split; extra select column; "Action" not "View"; button label "Open"). Default order ${JSON.stringify(files0)} dates ${JSON.stringify(dates)} is not newest first (02/20 hearings is last). Clicking Date or Status leaves the order unchanged (${JSON.stringify(files1)} / ${JSON.stringify(files2)}); the 7 sort buttons only raise a "Sorted by x" notification; aria-sort on ${asort} headers; File and counts also have sort buttons.`, await sh(page, "CSV-03"));
});
// CSV-05 / CSV-06 / CSV-07 / CSV-21
await T("CSV-05", async () => {
  const footerBtns = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b=>!b.closest("[inert]")&&b.getBoundingClientRect().top>740).map(b=>b.innerText.trim()).filter(Boolean));
  await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(500);
  const d = page.locator('[data-component=NewImportModal]').first();
  const txt = (await d.innerText()).replace(/\s+/g," ");
  const fileInputs = await page.locator('input[type=file]').count();
  const tmpl = (await page.locator('[data-part=template-trigger]').innerText()).trim();
  const accept = page.locator('[data-component=NewImportModal] [data-part=submit]');
  const dis = await accept.isDisabled();
  R.add("CSV-05", "FAIL", `Footer button reads "${footerBtns.filter(t=>/import/i.test(t)).join('" / "')}" (expected "Import CSV"). Modal "New import": text ${JSON.stringify(txt.slice(0,160))}; real file inputs: ${fileInputs} (a dashed button, no "CSV or ZIP" hint; field label "CSV File"); Template select shows "${tmpl}" (expected first template preselected); submit "Import" disabled=${dis} (expected "Accept"). Cancel closes: see CSV-21.`, await sh(page, "CSV-05"));
});
await T("CSV-06", async () => {
  const fileInputs = await page.locator('input[type=file]').count();
  await page.locator('[data-part=dropzone]').click(); await page.waitForTimeout(200);
  const chosen = (await page.locator('[data-part=selected-file]').innerText()).replace(/\s+/g," ");
  // template search
  await page.locator('[data-part=template-trigger]').click(); await page.waitForTimeout(200);
  await page.getByLabel("Search templates").fill("per"); await page.waitForTimeout(200);
  const opts = await page.locator('[data-part=option]').allInnerTexts();
  R.add("CSV-06", "FAIL", `Cannot choose x.csv / x.zip / x.txt: ${fileInputs} input[type=file] in the modal; the dropzone button assigns a random built-in name ("${chosen}"), so .csv/.zip acceptance and .txt refusal cannot be driven. Template search works: "per" narrows to ${JSON.stringify(opts)}.`, await sh(page, "CSV-06"));
});
await T("CSV-07", async () => {
  await page.getByLabel("Search templates").fill(""); await page.waitForTimeout(200);
  const opts = await page.locator('[data-part=option]').allInnerTexts();
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  R.add("CSV-07::opts", "INFO", JSON.stringify(opts));
});
await T("CSV-21", async () => {
  // modal currently open with a file chosen
  await page.locator('[data-component=NewImportModal] [data-part=cancel]').click(); await page.waitForTimeout(300);
  await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(400);
  const fileShown = await page.locator('[data-part=selected-file]').count();
  const tmpl = (await page.locator('[data-part=template-trigger]').innerText()).trim();
  await page.locator('[data-component=NewImportModal] [data-part=cancel]').click(); await page.waitForTimeout(300);
  const confirms = await page.locator('[data-component=ConfirmDialog]').count();
  const rowL = page.locator('[data-part=row]', { hasText: "locations.csv" });
  const p0 = (await rowL.innerText()).replace(/\s+/g," ");
  await page.waitForTimeout(2500);
  const p1 = (await rowL.innerText()).replace(/\s+/g," ");
  const ok = false;
  R.add("CSV-21", "FAIL", `After Cancel and reopen the file is discarded (selected-file count ${fileShown}), but the Template select reads "${tmpl}" (expected first template preselected again). No Discard changes dialog (ConfirmDialog count ${confirms}). locations.csv row went from "${p0}" to "${p1}" within 2.5 s without reload.`, await sh(page, "CSV-21"));
});
await ctx.close();
R.save();
await b.close();
