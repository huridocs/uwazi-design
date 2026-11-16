import { toSettings, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, dialogs, setDark, axeAll, toolsMenu, switchTo } from "./c.mjs";
import fs from "fs";
const R = makeRec("PAG4");
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
const newN = async (p, base) => { const a = await notifTitles(p); const c = {}; base.forEach(x => c[x] = (c[x] || 0) + 1); return a.filter(x => { if (c[x]) { c[x]--; return false; } return !/Running|Finishing|%|Processing PDFs|Uploading document batch/.test(x); }); };
const status = (p) => foot(p).innerText().then(clean);
const cdText = async (p) => { const d = p.locator("[data-component=ConfirmDialog]"); if (!(await d.count())) return null; return { text: clean(await d.innerText()), buttons: (await d.getByRole("button").allInnerTexts()).map(clean) }; };
const prevHtml = async (p) => { await p.waitForTimeout(700); const f = frame(p); return f; };
const fcss = async (p, sel, prop) => { const f = await prevHtml(p); return f.evaluate(([s, pr]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[pr] : "(none)"; }, [sel, prop]); };

// ---- PAG-18 / PAG-19: global CSS and JS
{
  const { ctx, page } = await open(b, "customisation");
  await page.waitForTimeout(800);
  await T("PAG-18", async () => {
    await S(page).getByRole("tab", { name: "CSS", exact: true }).click();
    await S(page).locator("textarea").fill("body { background: rgb(255, 255, 204); } h1 { color: rgb(200, 0, 0); }");
    await S(page).getByRole("tab", { name: "JS", exact: true }).click();
    await S(page).locator("textarea").fill("window.__globalJs = 1;");
    await S(page).getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(600);
    const shellBg0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await toolsMenu(page); await page.getByRole("button", { name: "Preserve", exact: true }).first().click(); await page.waitForTimeout(400);
    await toolsMenu(page); await page.getByRole("button", { name: "Global CSS & JS", exact: true }).first().click(); await page.waitForTimeout(600);
    await S(page).getByRole("tab", { name: "CSS", exact: true }).click(); const storedCss = await S(page).locator("textarea").inputValue();
    await S(page).getByRole("tab", { name: "JS", exact: true }).click(); const storedJs = await S(page).locator("textarea").inputValue();
    await rail(page, "Pages"); await page.waitForTimeout(500);
    await openEd(page, "Methodology");
    await ta(page).fill("<h1>Hi</h1>"); await page.waitForTimeout(500);
    const dBg = await fcss(page, "body", "backgroundColor"); const dH1 = await fcss(page, "h1", "color");
    const shellBg1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const styleInShell = await page.evaluate(() => [...document.querySelectorAll("style")].some(s => s.textContent.includes("255, 255, 204")));
    const gj = await page.evaluate(() => typeof window.__globalJs);
    const gjFrame = await (await prevHtml(page)).evaluate(() => typeof window.__globalJs);
    await S(page).getByRole("button", { name: "Published", exact: true }).first().click(); await page.waitForTimeout(500);
    const pBg = await fcss(page, "body", "backgroundColor"); const pH1 = await fcss(page, "h1", "color");
    const ok = dBg === "rgb(255, 255, 204)" && dH1 === "rgb(200, 0, 0)" && !styleInShell && gj === "undefined";
    R.add("PAG-18", ok ? "PASS" : "FAIL", `Saved Global CSS & JS (reopened: CSS "${storedCss.slice(0, 40)}...", JS "${storedJs}"). Methodology preview, Draft: body ${dBg}, h1 ${dH1}; Published: body ${pBg}, h1 ${pH1} (expected cream and red). Shell body background ${shellBg0} -> ${shellBg1} (unchanged), <style> with that CSS in the shell: ${styleInShell}. typeof window.__globalJs in shell: ${gj}; in preview frame: ${gjFrame}. The list has no View.`, await sh(page, "PAG-18"));
  });
  await ctx.close();
}
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-19", async () => {
    await openEd(page, "Methodology");
    await ta(page).fill("<h1>Hi</h1>");
    await tab(page, "CSS").click(); await ta(page).fill("h1 { font-style: italic; }");
    await tab(page, "JavaScript").click(); await ta(page).fill("window.__pageJs = 1;");
    await page.waitForTimeout(700);
    const st = await fcss(page, "h1", "fontStyle");
    const pj = await (await prevHtml(page)).evaluate(() => typeof window.__pageJs);
    const pjShell = await page.evaluate(() => typeof window.__pageJs);
    R.add("PAG-19", st === "italic" && pj === "undefined" ? "PASS" : "FAIL", `Page CSS "h1 { font-style: italic; }": preview h1 font-style = ${st} (ok). Page JS "window.__pageJs = 1;": typeof window.__pageJs in the preview frame = ${pj} (expected "undefined": stored, never run; the editor says the preview "runs it sandboxed"), in the shell = ${pjShell}.`, await sh(page, "PAG-19"));
  });
  await ctx.close();
}
// ---- PAG-20..24 publish flow (Partners)
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-20", async () => {
    await openEd(page, "Partners");
    const base = await notifTitles(page);
    await fbtn(page, /^Publish$/).click(); await page.waitForTimeout(600);
    const dl = await dialogs(page);
    const modal = await page.locator("[data-component=Modal],[role=dialog]").evaluateAll(els => els.filter(e => !e.closest("[inert]")).map(e => e.getAttribute("aria-label") || e.innerText.slice(0, 60)));
    const ta2 = await page.getByLabel("Release message").count();
    const n = await newN(page, base);
    const st = await status(page);
    R.add("PAG-20", "FAIL", `Clicked Publish on Partners (clean): no "Publish release" modal and no "Release message" field (dialogs open ${JSON.stringify(dl)}, release message fields ${ta2}); the page was published at once (notifications ${JSON.stringify(n)}; footer now "${st}"). Expected a modal with a Release message textarea and Cancel/Publish. On a new unsaved page Publish is also enabled (PAG-05).`, await sh(page, "PAG-20"));
    R.add("PAG-21::n", "INFO", `${JSON.stringify(n)}`);
  });
  await T("PAG-21", async () => {
    // unsaved ES edit then publish again
    await S(page).getByRole("radio", { name: /ES/ }).click(); await page.waitForTimeout(200);
    await ta(page).fill("<p>borrador ES</p>"); await page.waitForTimeout(200);
    const base = await notifTitles(page);
    const pubDis = await fbtn(page, /^Publish$/).isDisabled();
    await fbtn(page, /^Publish$/).click(); await page.waitForTimeout(600);
    const n = await newN(page, base);
    const st = await status(page);
    const unsavedAfter = await fbtn(page, /Save draft/).isDisabled();
    await S(page).getByRole("button", { name: "Published", exact: true }).first().click(); await page.waitForTimeout(500);
    const f = frame(page); const pv = clean(await f.evaluate(() => document.body.innerText));
    const sP = await sh(page, "PAG-21");
    await leave(page);
    const list = (await dataRows(page)).filter(r => /Partners/.test(r));
    const restore = await page.getByRole("button", { name: /Restore/ }).count();
    R.add("PAG-21", "FAIL", `Publish with an unsaved ES edit and no message step: notifications ${JSON.stringify(n)} (expected "Page published successfully."); the unsaved ES edit was saved with it (Save draft disabled afterwards: ${unsavedAfter}), footer "${st}", list row ${JSON.stringify(list)}; Published preview shows "${pv.slice(0, 80)}". No release message and no Restore list (Restore controls ${restore}), so the release with "First release" and today's date cannot be listed.`, sP);
    R.add("PAG-23", "FAIL", `No Restore button on the editor or list after two publishes of Partners (Restore controls: ${restore}); "Restore previous version" modal, release list with message/date, "No releases yet" and the one-row selection rule cannot be driven.`);
    R.add("PAG-24", "FAIL", `No Restore flow exists (Restore controls: ${restore}), so the confirm text "every language's draft will be overwritten", Cancel, Confirm and "Draft restored from release." cannot be driven.`);
  });
  await T("PAG-22", async () => {
    // Partners published; now edit and save draft, compare list and editor
    await openEd(page, "Partners");
    await tab(page, "HTML").click();
    await S(page).getByRole("radio", { name: /EN/ }).click();
    const h = await ta(page).inputValue();
    await ta(page).fill(h + "\n<p>later edit</p>"); await page.waitForTimeout(200);
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(500);
    const ed = await status(page);
    // preview published vs draft
    await S(page).getByRole("button", { name: "Published", exact: true }).first().click(); await page.waitForTimeout(600);
    const pub = clean(await frame(page).evaluate(() => document.body.innerText));
    await S(page).getByRole("button", { name: "Draft", exact: true }).first().click(); await page.waitForTimeout(600);
    const drf = clean(await frame(page).evaluate(() => document.body.innerText));
    await leave(page);
    const list = (await dataRows(page)).filter(r => /Partners/.test(r))[0];
    const never = (await dataRows(page)).filter(r => /Draft/.test(r));
    R.add("PAG-22", "FAIL", `After a Publish and a later edit + Save draft: the editor reads "${ed.split("Discard")[0].trim()}" and the list reads "${list}" (expected the same wording in both; they differ: "Published · draft has changes" vs "Published · edited"). Published preview keeps the release (contains "later edit": ${/later edit/.test(pub)}), Draft preview shows the edit (${/later edit/.test(drf)}). Before its first publish Partners read "Draft" in the list (PAG-01) and "Draft · not published" in the editor; no View control exists.`, await sh(page, "PAG-22"));
  });
  R.add("::errs-pag20", "INFO", JSON.stringify(realErrors(errors)));
  await ctx.close();
}
// ---- PAG-25 sequence + X-04 + X-09
{
  const { ctx, page } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-25", async () => {
    const base = await notifTitles(page);
    const seq = [];
    const step = async (label, fn) => { const b0 = await notifTitles(page); await fn(); await page.waitForTimeout(500); seq.push([label, await newN(page, b0)]); };
    await page.getByRole("button", { name: "Add page" }).click(); await page.waitForTimeout(400);
    await page.locator("[data-component=TemplatePickerModal] [role=radio]").first().click();
    await page.locator("[data-component=TemplatePickerModal]").getByRole("button", { name: "Create page" }).click(); await page.waitForTimeout(900);
    await edTitle(page).fill("QA page");
    await step("Save", async () => { await fbtn(page, /Save draft/).click(); });
    await ta(page).fill("<h1>QA 2</h1>");
    await step("Save again", async () => { await fbtn(page, /Save draft/).click(); });
    await step("Publish", async () => { await fbtn(page, /^Publish$/).click(); });
    const restore = await page.getByRole("button", { name: /Restore/ }).count();
    await leave(page);
    await step("Delete", async () => { await S(page).getByRole("button", { name: /^Delete (QA page|.*)/ }).last().click(); await page.waitForTimeout(300); await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /^Delete/ }).last().click(); });
    const log = await logEntries(page);
    R.add("PAG-25", "FAIL", `Sequence of Beacon notifications: ${JSON.stringify(seq)} (expected "Saved successfully.", "Saved successfully.", "Page published successfully.", "Draft restored from release.", "Deleted successfully."; Restore controls ${restore}, so the restore step cannot run). Activity log entries (summary, newest first): ${JSON.stringify(log)} (expected "Created page", "Updated page", "Published page release", "Restored page draft from release", "Deleted page"; the delete is not logged: DELETE passes log:false in PageDelete).`, await sh(page, "PAG-25"));
    R.add("X-04", "FAIL", `Each save/publish/delete adds one Beacon entry, but the wording differs from the quoted Uwazi text (${JSON.stringify(seq.map(s => s[1][0]))}); a failure adds no "An error occurred" entry (see PAG-26).`);
    R.add("X-09", "FAIL", `Log after create/save/publish/delete of a page: ${JSON.stringify(log)}: every Save and Publish logs "Updated page “QA page”" (the first save is not "Created page", Publish is not "Published page release"), the delete is not logged at all.`);
  });
  await ctx.close();
}
// ---- PAG-26 forced failure
{
  const { ctx, page, errors } = await open(b, "pages");
  await page.waitForTimeout(600);
  await T("PAG-26", async () => {
    await openEd(page, "Methodology");
    await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException("quota exceeded", "QuotaExceededError"); }; });
    const base = await notifTitles(page);
    const e0 = errors.length;
    await ta(page).fill("<h1>fail</h1>"); await page.waitForTimeout(200);
    await fbtn(page, /Save draft/).click(); await page.waitForTimeout(600);
    const nSave = await newN(page, base);
    const dirtyAfter = !(await fbtn(page, /Save draft/).isDisabled());
    const b1 = await notifTitles(page);
    await fbtn(page, /^Publish$/).click(); await page.waitForTimeout(600);
    const nPub = await newN(page, b1);
    await leave(page);
    const b2 = await notifTitles(page);
    await S(page).getByRole("button", { name: "Delete Contact" }).click(); await page.waitForTimeout(300);
    await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /^Delete/ }).last().click(); await page.waitForTimeout(600);
    const nDel = await newN(page, b2);
    const rowsAfter = (await dataRows(page)).length;
    const err = errors.slice(e0).filter(e => !/atomFamily|sandboxed/.test(e));
    const anyErr = [...nSave, ...nPub, ...nDel].filter(x => /An error occurred/.test(x));
    R.add("PAG-26", anyErr.length >= 3 ? "PASS" : "FAIL", `Forced every storage write to throw (Storage.setItem patched to throw QuotaExceededError). Save draft: notifications ${JSON.stringify(nSave)}, editor still dirty afterwards: ${dirtyAfter}. Publish: ${JSON.stringify(nPub)}. Delete Contact: ${JSON.stringify(nDel)}, rows left ${rowsAfter}. Entries titled "An error occurred": ${anyErr.length}. Uncaught/console errors: ${JSON.stringify(err)}.`, await sh(page, "PAG-26"));
  });
  await ctx.close();
}
R.save();
await b.close();
