import { launch, open, S, rows, shot, makeRec, realErrors, sh, signInAs, toolsMenu, csvOpen, axeAll, setDark, hasHScroll, logEntries, notifTitles, rail } from "./c.mjs";
import fs from "fs";
const R = makeRec("CSV2");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const detail = (p) => p.locator('[data-component=ImportDetailView]');
const modal = (p) => p.locator('[data-component=NewImportModal]');
const openDetail = async (p, name) => { await p.getByRole("button", { name: `Open ${name}` }).click(); await p.waitForTimeout(500); };
const back = async (p) => { await p.getByRole("button", { name: /Back to list/ }).first().click(); await p.waitForTimeout(300); };
const regImport = async (p, tpl = "Person") => {
  await p.getByRole("button", { name: /New import/ }).first().click(); await p.waitForTimeout(400);
  await p.locator('[data-part=dropzone]').click(); await p.waitForTimeout(150);
  await p.locator('[data-part=template-trigger]').click(); await p.waitForTimeout(150);
  await p.locator('[data-part=option] button', { hasText: tpl }).click(); await p.waitForTimeout(150);
  const file = clean(await p.locator('[data-part=selected-file]').innerText()).replace(" Remove", "");
  await p.locator('[data-component=NewImportModal] [data-part=submit]').click(); await p.waitForTimeout(500);
  return file;
};

// ---- CSV-07: template options vs Settings > Templates
await T("CSV-07", async () => {
  const { ctx, page } = await open(b, "templates");
  await page.waitForTimeout(600);
  const settingsRows = (await rows(page)).slice(1).map(r => r.replace(/\d.*$/, "").replace("Default", "").trim());
  // create QA tpl
  await page.getByRole("button", { name: /Add template/ }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel("Template name").fill("QA tpl"); await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Create template" }).click(); await page.waitForTimeout(800);
  const after = (await rows(page)).slice(1).map(r => r.replace(/\d.*$/, "").replace("Default", "").trim());
  await csvOpen(page);
  await page.getByRole("button", { name: /New import/ }).first().click(); await page.waitForTimeout(400);
  await page.locator('[data-part=template-trigger]').click(); await page.waitForTimeout(200);
  const opts = await page.locator('[data-part=option]').allInnerTexts();
  const s = await sh(page, "CSV-07");
  R.add("CSV-07", opts.includes("QA tpl") && JSON.stringify(opts.slice(0,settingsRows.length))===JSON.stringify(settingsRows) ? "PASS" : "FAIL",
    `Settings > Templates (Sample) lists ${JSON.stringify(settingsRows)}; after creating "QA tpl" it lists ${JSON.stringify(after)}. The New import Template select offers ${JSON.stringify(opts)}: the fixed list in data/imports.ts (no Hearing, different order, no "QA tpl").`, s);
  await ctx.close();
});

// ---- CSV-12..19 seeds on detail pages
const { ctx, page, errors } = await open(b, "pages");
await csvOpen(page);
const seedInfo = {};
for (const n of ["hearings-2026.csv", "locations.csv", "cases.csv", "judges-import.zip", "witnesses.csv"]) {
  await T("CSV-12:" + n, async () => {
    const btn = page.getByRole("button", { name: `Open ${n}` });
    const dis = await btn.isDisabled();
    if (dis) { seedInfo[n] = { disabled: true }; return; }
    await btn.click(); await page.waitForTimeout(500);
    const d = detail(page);
    const status = clean(await d.locator('[data-part=header] [data-component=StatusBadge]').innerText());
    const full = clean(await d.innerText());
    const stepper = await d.locator('[data-part=stepper]').count() ? clean(await d.locator('[data-part=stepper]').innerText()) : null;
    const footer = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.closest("[inert]") && b.getBoundingClientRect().top > 740).map(b => b.innerText.trim()).filter(Boolean));
    const cards = await d.locator('[data-part=stat] dt').allInnerTexts();
    const hasDesc = /waiting in queue|currently processing rows|finished successfully|Import failed\. Review|finished with errors/i.test(full);
    const dlBtn = await page.getByRole("button", { name: /Download failed rows/ }).count();
    const failureCard = /Failure details|Retryable/.test(full);
    seedInfo[n] = { status, stepper, footer: footer.slice(-3), cards, hasDesc, dlBtn, failureCard, banner: (await d.locator('[role=alert],[data-component=AlertBanner]').allInnerTexts()).map(clean), meta: clean(await d.locator('[data-part=meta]').innerText()), progress: clean(await d.locator('[data-part=progress]').innerText()), headings: (await d.locator("h3").allInnerTexts()).map(clean), tableHeads: (await d.locator("th").allInnerTexts()).map(clean).slice(0, 6), cancelBtn: await page.getByRole("button", { name: /^Cancel/ }).count() };
    if (n === "cases.csv") await sh(page, "CSV-13-cases");
    if (n === "judges-import.zip") await sh(page, "CSV-15-judges");
    if (n === "witnesses.csv") await sh(page, "CSV-16-witnesses");
    await back(page);
  });
}
fs.writeFileSync("seedinfo.json", JSON.stringify(seedInfo, null, 1));
console.log(JSON.stringify(seedInfo, null, 1).slice(0, 5000));
await ctx.close();
R.save();
await b.close();
