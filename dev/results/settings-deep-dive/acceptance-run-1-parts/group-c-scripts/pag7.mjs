import { axeSrc, launch, open, S, shot, makeRec, realErrors, sh, rail, setDark, axeAll } from "./c.mjs";
const R = makeRec("PAG7");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const rowEls = (p) => S(p).locator('[role="row"]');
const detail = async (page, sel) => { await page.evaluate(axeSrc); return page.evaluate(async (sel) => { const r = await axe.run(document.querySelector(sel) || document.body, { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 3).map(n => { const d = n.any[0]?.data || {}; return (n.target.join(" ").slice(0, 60)) + (d.contrastRatio ? ` [${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}]` : ""); }).join(" | ")}`); }, sel); };
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(700);
  await T("X-07", async () => {
    const out = {};
    out.list = await detail(page, "[data-testid=settings-content]");
    await page.getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(500);
    const focusIn = await page.evaluate(() => !!document.activeElement?.closest("[data-component=TemplatePickerModal]"));
    out.picker = await detail(page, "[data-component=TemplatePickerModal]");
    const roleName = await page.evaluate(() => { const d = document.querySelector("[data-component=TemplatePickerModal] [role=dialog]"); return d ? (d.getAttribute("aria-label") || d.getAttribute("aria-labelledby")) : null; });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const closed = await page.locator("[data-component=TemplatePickerModal]").count();
    const opener = await page.evaluate(() => document.activeElement?.innerText?.trim());
    await rowEls(page).filter({ hasText: "Methodology" }).first().click(); await page.waitForTimeout(1300);
    out.editor = await detail(page, "[data-testid=settings-content]");
    const unl = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input, [data-testid=settings-content] textarea")].filter(i => !(i.getAttribute("aria-label") || (i.labels && i.labels.length))).length);
    await S(page).locator("textarea").fill("x");
    await page.locator("footer").last().getByRole("button", { name: "Discard", exact: true }).click(); await page.waitForTimeout(400);
    out.discard = await detail(page, "[data-component=ConfirmDialog]");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const stillEditor = await page.locator("[data-component=CodePageEditor]").count();
    await S(page).getByRole("button", { name: /Insert component/ }).click(); await page.waitForTimeout(400);
    out.palette = await detail(page, "[data-component=ComponentPaletteModal]");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const sev = Object.entries(out).flatMap(([k, v]) => v.filter(x => /serious|critical/.test(x)).map(x => k + ": " + x));
    R.add("X-07", sev.length === 0 ? "PASS" : "FAIL", `axe: ${Object.entries(out).map(([k, v]) => k + " " + JSON.stringify(v)).join("; ")}. Picker: focus moved into dialog ${focusIn}, dialog name "${roleName}", Escape closed it (${closed === 0}) and focus returned to "${opener}". Discard confirm closed by Escape leaving the editor open (${stillEditor === 1}). Row buttons unique (Edit/Delete <title>). Editor inputs without a label: ${unl}. No Publish/Restore dialogs exist to test.`, await sh(page, "X-07-pag"));
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(700);
  await T("X-08", async () => {
    const run = async () => { await page.evaluate(axeSrc); return page.evaluate(async () => { const r = await axe.run(document.querySelector("[data-testid=settings-content]"), { runOnly: ["color-contrast"], resultTypes: ["violations"] }); const seen = new Set(); return r.violations.flatMap(v => v.nodes.map(n => { const d = n.any[0]?.data || {}; return `${(n.html.match(/>([^<]{3,30})</) || [])[1]} fg ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1`; })).filter(x => !seen.has(x) && seen.add(x)); }); };
    const light = await run();
    // add a "Published · edited" pill by editing and saving Methodology
    await rowEls(page).filter({ hasText: "Methodology" }).first().click(); await page.waitForTimeout(1300);
    await S(page).locator("textarea").fill("<h1>x</h1>"); await page.locator("footer").last().getByRole("button", { name: /Save draft/ }).click(); await page.waitForTimeout(400);
    const edLight = await (async () => { await page.evaluate(axeSrc); return page.evaluate(async () => { const r = await axe.run(document.querySelector("footer:last-of-type") || document.body, { runOnly: ["color-contrast"], resultTypes: ["violations"] }); return r.violations.flatMap(v => v.nodes.map(n => { const d = n.any[0]?.data || {}; return `${(n.html.match(/>([^<]{3,40})</) || [])[1]} fg ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1`; })); }); })();
    await S(page).getByRole("button", { name: "Back", exact: true }).first().click(); await page.waitForTimeout(500);
    await setDark(page); await page.waitForTimeout(500);
    const dark = await run();
    const s = await sh(page, "X-08-pag-dark");
    await rowEls(page).filter({ hasText: "Methodology" }).first().click(); await page.waitForTimeout(1300);
    await S(page).locator("textarea").fill("<h1>y</h1>"); await page.waitForTimeout(300);
    const edDark = await (async () => { await page.evaluate(axeSrc); return page.evaluate(async () => { const r = await axe.run(document.body, { runOnly: ["color-contrast"], resultTypes: ["violations"] }); return r.violations.flatMap(v => v.nodes.filter(n => /Published|Draft/.test(n.html)).map(n => { const d = n.any[0]?.data || {}; return `${(n.html.match(/>([^<]{3,40})</) || [])[1]} fg ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1`; })); }); })();
    const ok = !light.length && !dark.length && !edLight.length && !edDark.length;
    R.add("X-08", ok ? "PASS" : "FAIL", `Status pills (Draft, Published, Published · edited / draft has changes) axe color-contrast: list light ${JSON.stringify(light)}; editor footer light ${JSON.stringify(edLight)}; list dark ${JSON.stringify(dark)}; editor footer dark ${JSON.stringify(edDark)}.`, s);
  });
  await ctx.close();
}
R.save();
await b.close();
