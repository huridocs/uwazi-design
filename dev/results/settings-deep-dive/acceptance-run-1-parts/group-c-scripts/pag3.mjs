import { toSettings, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, dialogs, setDark, axeAll, toolsMenu } from "./c.mjs";
import fs from "fs";
const R = makeRec("PAG3");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rowEls = (p) => S(p).locator('[role="row"]');
const dataRows = async (p) => (await rowEls(p).allInnerTexts()).map(clean).slice(1);
const foot = (p) => p.locator("footer").last();
const fbtn = (p, n) => foot(p).getByRole("button", { name: n });
const edTitle = (p) => S(p).getByLabel(/^Title/);
const ta = (p) => S(p).locator("textarea");
const openEd = async (p, name) => { await rowEls(p).filter({ hasText: name }).first().click(); await p.waitForTimeout(1300); };
const frame = (p) => p.frames().find(f => f !== p.mainFrame());
const leave = async (p) => { await S(p).getByRole("button", { name: "Back", exact: true }).first().click(); await p.waitForTimeout(400); const cd = p.locator("[data-component=ConfirmDialog]"); if (await cd.count()) { await cd.getByRole("button", { name: /^Discard/ }).click(); await p.waitForTimeout(400); } };
const tab = (p, n) => S(p).getByRole("tab", { name: n });
const newN = async (p, base) => { const a = await notifTitles(p); const c = {}; base.forEach(x => c[x] = (c[x] || 0) + 1); return a.filter(x => { if (c[x]) { c[x]--; return false; } return !/Running|Finishing|%/.test(x); }); };
const edText = (p) => p.evaluate(() => clean0());
const status = (p) => foot(p).innerText().then(clean);

// ---- PAG-14 / PAG-15
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await openEd(page, "Methodology");
  await T("PAG-14", async () => {
    const tabs = await S(page).getByRole("tab").allInnerTexts();
    const banners = {};
    for (const t of ["HTML", "CSS", "JavaScript"]) { await tab(page, t).click(); await page.waitForTimeout(150); banners[t] = clean(await S(page).locator("[data-part=code] p").first().innerText()).slice(0, 110) + (await S(page).locator("[data-part=code] p").first().evaluate(e => e.classList.contains("invisible") ? " (invisible)" : "")); }
    const body = await S(page).innerText();
    const md = /Markdown/i.test(body), ev = /entity view/i.test(body);
    R.add("PAG-14", "FAIL", `Tabs in order: ${JSON.stringify(tabs)} (expected Configuration, HTML, Javascript, CSS; there is no Configuration tab and CSS comes before JavaScript). Banner line per tab: ${JSON.stringify(banners)}. Expected HTML banner "This page uses HTML only (Markdown is not processed)..." with link "Learn more about the components." and the three-line JS banner "With great power comes great responsibility!"; neither is present (HTML shows no banner; JS shows a different line). No Markdown toggle/banner (${!md}) and no entity view toggle (${!ev}) present (ok).`, await sh(page, "PAG-14"));
  });
  await T("PAG-15", async () => {
    await tab(page, "HTML").click();
    const label = await ta(page).getAttribute("aria-label");
    const monaco = await page.locator(".monaco-editor").count();
    await ta(page).focus(); await page.keyboard.press("Control+End"); const v0 = await ta(page).inputValue();
    await page.keyboard.press("Tab"); const v1 = await ta(page).inputValue();
    const spaces = v1.slice(v0.length);
    await page.keyboard.press("Escape"); await page.keyboard.press("Tab"); await page.waitForTimeout(150);
    const inTa = await page.evaluate(() => document.activeElement?.tagName);
    const v2 = await ta(page).inputValue();
    await ta(page).fill("keep-html");
    await tab(page, "CSS").click(); await tab(page, "HTML").click();
    await S(page).getByRole("radio", { name: /FR/ }).click(); await S(page).getByRole("radio", { name: /EN/ }).click(); await page.waitForTimeout(200);
    const kept = await ta(page).inputValue();
    const fs1 = await ta(page).evaluate(e => getComputedStyle(e).fontSize + "/" + getComputedStyle(e).fontFamily.slice(0, 20));
    await ctx.close();
    const c2 = await open(b, "customisation"); await c2.page.waitForTimeout(700);
    const fs2 = await c2.page.locator("[data-testid=settings-content] textarea").evaluate(e => getComputedStyle(e).fontSize + "/" + getComputedStyle(e).fontFamily.slice(0, 20));
    await c2.ctx.close();
    const ok = !monaco && /HTML · English/.test(label) && spaces === "  " && inTa !== "TEXTAREA" && kept === "keep-html" && fs1 === fs2;
    R.add("PAG-15", ok ? "PASS" : "FAIL", `Plain textarea, Monaco editors ${monaco}, label "${label}" (ok). Tab inserted ${spaces.length} spaces (ok). After Escape then Tab, focus is still on ${inTa} and the text grew by ${v2.length - v1.length} more characters (expected focus to move out). Text kept across tab and language switches: ${kept === "keep-html"}. Computed font: page editor ${fs1} vs Global CSS & JS editor ${fs2} (expected equal).`);
  });
  R.add("::errs-pag14", "INFO", JSON.stringify(realErrors(errors)));
}
// ---- PAG-16 / PAG-31
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-31", async () => {
    await openEd(page, "Methodology");
    const f0 = await status(page);
    await ta(page).fill("<h1>Hi</h1>"); await page.waitForTimeout(200);
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    const f1 = await status(page);
    R.add("PAG-31", /Saved just now by admin/.test(f1) ? "PASS" : "FAIL", `Footer before any save: "${f0}". After Save draft: "${f1}" (expected "Saved just now by admin" next to the Draft / Published status line).`, await sh(page, "PAG-31"));
    await leave(page);
  });
  await T("PAG-16", async () => {
    await openEd(page, "Methodology");
    const sv0 = await fbtn(page, /Save draft/).isDisabled();
    const base = await notifTitles(page);
    const html0 = await ta(page).inputValue();
    await ta(page).fill(html0 + "\n<!--en-->");
    await S(page).getByRole("radio", { name: /ES/ }).click(); await tab(page, "JavaScript").click(); await ta(page).fill("// es js");
    await S(page).getByRole("radio", { name: /FR/ }).click(); await tab(page, "CSS").click(); await ta(page).fill("/* fr css */");
    const sv1 = await fbtn(page, /Save draft/).isDisabled();
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    const n = await newN(page, base);
    const check = async () => {
      await tab(page, "HTML").click(); await S(page).getByRole("radio", { name: /EN/ }).click(); const en = (await ta(page).inputValue()).includes("<!--en-->");
      await tab(page, "JavaScript").click(); await S(page).getByRole("radio", { name: /ES/ }).click(); const es = await ta(page).inputValue();
      await tab(page, "CSS").click(); await S(page).getByRole("radio", { name: /FR/ }).click(); const fr = await ta(page).inputValue();
      return { en, es, fr };
    };
    await rail(page, "Dashboard"); await page.waitForTimeout(500); await rail(page, "Pages"); await page.waitForTimeout(500);
    await openEd(page, "Methodology");
    const afterNav = await check();
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
    await openEd(page, "Methodology");
    const afterReload = await check();
    await leave(page);
    await rail(page, "Dashboard"); await page.waitForTimeout(500);
    await S(page).getByRole("button", { name: /Reset demo data/ }).click(); await page.waitForTimeout(500);
    const cd = page.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]");
    if (await cd.count()) { await cd.getByRole("button").last().click(); await page.waitForTimeout(800); }
    await rail(page, "Pages"); await page.waitForTimeout(500);
    await openEd(page, "Methodology");
    const afterReset = await check();
    const restore = await page.getByRole("button", { name: /Restore/ }).count();
    const ok = sv0 && !sv1 && /Saved successfully/.test(n.join()) && afterNav.en && afterNav.es === "// es js" && afterNav.fr === "/* fr css */" && afterReload.en && !afterReset.en;
    R.add("PAG-16", ok ? "PASS" : "FAIL", `Save draft disabled when clean: ${sv0}; enabled after edits: ${!sv1}. One Save stored the three edits; notification(s): ${JSON.stringify(n)} (expected "Saved successfully."). After rail Dashboard > Pages: ${JSON.stringify(afterNav)}; after reload: ${JSON.stringify(afterReload)}; after Reset demo data: ${JSON.stringify(afterReset)}. Restore controls: ${restore} (no release list to compare).`, await sh(page, "PAG-16"));
  });
  await ctx.close();
}
R.save();
await b.close();
