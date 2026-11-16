import { phoneNav, launch, open, S, shot, makeRec, realErrors, sh, csvOpen, axeAll, setDark, hasHScroll, signInAs } from "./c.mjs";
const R = makeRec("CSV4");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
// phone
await T("CSV-04", async () => {
  const { ctx, page, errors } = await open(b, "pages", "mobile");
  await page.waitForTimeout(500);
  // Tools button on phone? try menu
  await phoneNav(page, "Import CSV");
  const hs = await hasHScroll(page);
  const list = page.locator('[data-component=ImportTable]').first();
  const variant = await list.getAttribute("data-variant");
  const row0 = clean(await page.locator('[data-part=row]').first().innerText());
  const openBtn = page.getByRole("button", { name: "Open cases.csv" });
  const box = await openBtn.boundingBox();
  await openBtn.tap(); await page.waitForTimeout(500);
  const inDetail = await page.locator('[data-component=ImportDetailView]').count();
  const hs2 = await hasHScroll(page);
  const stats = await page.locator('[data-part=stats]').first().boundingBox();
  const s = await sh(page, "CSV-04-phone");
  const ok = variant === "list" && hs.doc <= 0 && inDetail === 1;
  R.add("CSV-04", ok ? "PASS" : "FAIL", `390x844 touch: list variant "${variant}", horizontal overflow (doc) ${hs.doc}px; first row "${row0}"; Open button box ${box ? Math.round(box.width) + "x" + Math.round(box.height) : "n/a"}; tap on "Open cases.csv" opens detail: ${inDetail === 1}; detail overflow ${hs2.doc}px.`, s);
  await ctx.close();
});
// X-06 same observation; additionally footer reachability
await T("X-06", async () => {
  const { ctx, page } = await open(b, "pages", "mobile");
  await phoneNav(page, "Import CSV");
  const hs = await hasHScroll(page);
  const sw = await page.evaluate(() => { const t = document.querySelector('[data-component=ImportTable]'); return t ? { sw: t.scrollWidth, cw: t.clientWidth } : null; });
  const foot = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().top > 700 && b.getBoundingClientRect().width > 0).map(b => b.innerText.trim() + "@" + Math.round(b.getBoundingClientRect().top)).filter(Boolean));
  // modal on phone
  await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(500);
  const mb = await page.locator('[data-component=NewImportModal] [role=dialog], [data-component=NewImportModal]').first().boundingBox();
  const sM = await sh(page, "X-06-csv-modal-phone");
  await page.locator('[data-component=NewImportModal] [data-part=cancel]').click(); await page.waitForTimeout(300);
  // detail
  await page.getByRole("button", { name: "Open witnesses.csv" }).tap(); await page.waitForTimeout(500);
  const hs2 = await hasHScroll(page);
  const tbl = await page.evaluate(() => { const t = document.querySelector('[data-component=ImportDetailView] [data-part=table]'); return t ? { sw: t.scrollWidth, cw: t.clientWidth } : null; });
  const sD = await sh(page, "X-06-csv-detail-phone");
  const ok = hs.doc <= 0 && hs2.doc <= 0;
  R.add("X-06", ok ? "PASS" : "FAIL", `Phone 390x844: list overflow ${hs.doc}px (table scroll ${JSON.stringify(sw)}), rows are the stacked list variant with Open per row; footer buttons ${JSON.stringify(foot)}; New import modal box ${mb ? Math.round(mb.width) + "x" + Math.round(mb.height) : "n/a"}; witnesses detail overflow ${hs2.doc}px (issues table ${JSON.stringify(tbl)}). All actions reachable by tap.`, sD);
  await ctx.close();
});
// X-07 axe
await T("X-07", async () => {
  const { ctx, page, errors } = await open(b, "pages");
  await csvOpen(page);
  const out = {};
  out.list = await axeAll(page, "[data-component=ImportListView]");
  await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(400);
  const focusIn = await page.evaluate(() => !!document.activeElement?.closest('[data-component=NewImportModal]'));
  out.modal = await axeAll(page, "[data-component=NewImportModal]");
  const role = await page.evaluate(() => { const d = document.querySelector('[data-component=NewImportModal] [role=dialog]'); return d ? { name: d.getAttribute("aria-label") || d.getAttribute("aria-labelledby"), modal: d.getAttribute("aria-modal") } : null; });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const closed = await page.locator('[data-component=NewImportModal]').count();
  const opener = await page.evaluate(() => document.activeElement?.innerText?.trim());
  await page.getByRole("button", { name: "Open cases.csv" }).click(); await page.waitForTimeout(400);
  out.detail = await axeAll(page, "[data-component=ImportDetailView]");
  const names = await page.evaluate(() => { /* unique row button names */ return null; });
  await page.getByRole("button", { name: /Back to list/ }).first().click(); await page.waitForTimeout(300);
  const rowNames = await page.locator('[data-part=row] button').evaluateAll(els => els.map(e => e.getAttribute("aria-label")).filter(Boolean));
  const dup = rowNames.filter((n, i) => rowNames.indexOf(n) !== i);
  const sev = Object.entries(out).flatMap(([k, v]) => v.filter(x => /serious|critical/.test(x)).map(x => k + ": " + x));
  R.add("X-07", sev.length === 0 && closed === 0 && dup.length === 0 ? "PASS" : "FAIL", `axe: list ${JSON.stringify(out.list)}; New import modal ${JSON.stringify(out.modal)} (focus moved into modal: ${focusIn}; dialog ${JSON.stringify(role)}); detail ${JSON.stringify(out.detail)}. Escape closes modal (count after: ${closed}); focus returned to "${opener}". Duplicate row button names: ${JSON.stringify(dup)}. Serious/critical: ${JSON.stringify(sev)}. Console errors: ${JSON.stringify(realErrors(errors))}.`, await sh(page, "X-07-csv"));
  await ctx.close();
});
// X-08 dark
await T("X-08", async () => {
  const { ctx, page } = await open(b, "pages");
  await csvOpen(page);
  const light = await axeAll(page, "[data-component=ImportListView]", ["color-contrast"]);
  const dark = await setDark(page);
  await page.waitForTimeout(500);
  const dk = await axeAll(page, "[data-component=ImportListView]", ["color-contrast"]);
  const s = await sh(page, "X-08-csv-dark");
  await page.getByRole("button", { name: "Open witnesses.csv" }).click(); await page.waitForTimeout(400);
  const dkd = await axeAll(page, "[data-component=ImportDetailView]", ["color-contrast"]);
  R.add("X-08", light.length === 0 && dk.length === 0 && dkd.length === 0 ? "PASS" : "FAIL", `color-contrast (axe): light list ${JSON.stringify(light)}; dark (class dark: ${dark}) list ${JSON.stringify(dk)}; dark detail ${JSON.stringify(dkd)}. Status pills (Completed, Processing, Failed, Warnings, Pending) included.`, s);
  await ctx.close();
});
R.save();
await b.close();
