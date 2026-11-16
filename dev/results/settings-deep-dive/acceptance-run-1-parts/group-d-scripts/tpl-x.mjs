import { launch, open, S, shot, rows, title, dialogs, conf, crumb, switchTo, rec, realErrors, wait, axe, notifTitles, logEntries, rail, toSettings } from "./common.mjs";
const b = await launch();
const names = async (p) => (await S(p).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim())));
const lum = (c) => { const [r,g,bb] = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*bb; };
const ratio = (a, c) => { const x = lum(a), y = lum(c); return ((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)).toFixed(2); };
// X-01 / X-03(n/a) persistence via rename + save
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  const n0 = await notifTitles(page);
  await S(page).locator('[role=row]', { hasText: "Judgment" }).first().click(); await wait(page, 400);
  await S(page).locator("#template-name-input").fill("Judgment QA"); await wait(page, 200);
  await page.locator("footer").getByRole("button", { name: "Save" }).click(); await wait(page, 500);
  const afterSave = await names(page);
  const notifs = await notifTitles(page);
  const log = await logEntries(page);
  await rail(page, "Thesauri"); await wait(page, 400);
  await rail(page, "Templates"); await wait(page, 500);
  const afterNav = await names(page);
  await page.reload(); await wait(page, 1500);
  const afterReload = await names(page);
  await shot(page, "X-01-TPL");
  rec("TPL:X-01", afterReload.includes("Judgment QA") ? "PASS" : "FAIL", `Renamed Judgment to "Judgment QA" and saved. List right after save: has new name=${afterSave.includes("Judgment QA")}; after rail Thesauri -> Templates: has new name=${afterNav.includes("Judgment QA")}, names ${JSON.stringify(afterNav)}; after reload: has new name=${afterReload.includes("Judgment QA")}.`, "X-01-TPL");
  const nt = notifs.filter(t=>!n0.includes(t) && !/Running|Finishing/.test(t));
  rec("TPL:X-04", "FAIL", `New Beacon entries after a save (ignoring task progress rows): ${JSON.stringify(nt)}. Activity-log entries in session: ${JSON.stringify(log)}. Expected one entry reading "Template saved successfully." (TED-100) for an editor Save. Failure path ("An error occurred") not reachable without an induced error, not driven.`, "");
  rec("TPL:X-09", log.some(l => /template/i.test(l)) ? "PASS" : "FAIL", `Activity log (session store) after Save on Judgment: ${JSON.stringify(log)}. Expected an Uwazi-style entry (e.g. "Updated template") naming the template and user.`, "");
  await page.close();
}
// Create + delete a 0-entity template (X-04 delete text, X-05 unused, X-09 delete)
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  await page.getByRole("button", { name: "Add template" }).first().click(); await wait(page, 400);
  await S(page).locator("#template-name-input").fill("QA delete me"); await wait(page, 200);
  await page.locator("footer").getByRole("button", { name: /Create template|Save/ }).click(); await wait(page, 500);
  const afterCreate = await names(page);
  const nA = await notifTitles(page); const notifs1 = nA.filter(t=>!/Running|Finishing/.test(t)).slice(0,3);
  await S(page).locator('[role=row]', { hasText: "QA delete me" }).first().hover();
  await page.getByRole("button", { name: "Delete QA delete me" }).click(); await wait(page, 400);
  const dlg = (await page.locator('[data-component=ConfirmDelete] [role=dialog]').first().innerText()).replace(/\s+/g, " ");
  const axeRes = await axe(page);
  await shot(page, "X-05-unused-delete");
  const dlgAxe = await page.evaluate(async (src) => { const r = await window.axe.run(document.querySelector('[data-component=ConfirmDelete] [role=dialog]'), { resultTypes: ["violations"] }); return r.violations.map(v => v.id + " " + v.impact); }, null);
  await page.locator('[data-component=ConfirmDelete]').getByRole("button", { name: "Delete" }).last().click();
  await wait(page, 500);
  const afterDel = await names(page);
  const nB = await notifTitles(page); const notifs2 = nB.filter(t=>!/Running|Finishing/.test(t)).slice(0,3);
  const log = await logEntries(page);
  rec("TPL:X-05", /nothing else|No entities|no entities|not used|No.*use/i.test(dlg) ? "PASS" : "FAIL", `Unused template dialog: "${dlg}". (Used-template dialogs seen in TPL-21/22: "13 entities use this template. Move or delete them first. Relationship properties in Court Case and Judgment link to it. They are not changed.", "Used by 5 entities." for the default.)`, "X-05-unused-delete");
  rec("TPL:X-07", axeRes.length === 0 && dlgAxe.length === 0 ? "PASS" : "FAIL", `axe on Templates page: ${JSON.stringify(axeRes)}; axe on delete dialog: ${JSON.stringify(dlgAxe)}. Dialog trap/restore/Escape: see below.`, "");
  console.log("created", afterCreate.includes("QA delete me"), "afterDel", afterDel.includes("QA delete me"), JSON.stringify(notifs1), JSON.stringify(notifs2), JSON.stringify(log));
  rec("TPL:X-04b", "INFO", `Create notif ${JSON.stringify(notifs1)}; delete notifs ${JSON.stringify(notifs2)}; log ${JSON.stringify(log)}; created listed=${afterCreate.includes("QA delete me")}, removed=${!afterDel.includes("QA delete me")}`);
  await page.close();
}
// focus management of the delete dialog
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const row = S(page).locator('[role=row]', { hasText: "Hearing" }).first();
  await row.hover();
  const opener = page.getByRole("button", { name: "Delete Hearing" });
  await opener.focus(); await page.keyboard.press("Enter"); await wait(page, 400);
  const inside = await page.evaluate(() => !!document.activeElement.closest('[data-component=ConfirmDelete]'));
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() => !!document.activeElement.closest('[data-component=ConfirmDelete]'));
  await page.keyboard.press("Escape"); await wait(page, 400);
  const closed = (await dialogs(page)).length === 0;
  const restored = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  rec("TPL:X-07b", "INFO", `delete dialog: focus inside on open=${inside}; after 6 Tabs inside=${stillInside}; Escape closes=${closed}; focus restored to "${restored}"`);
  await page.close();
}
// X-08 contrast
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const r = await page.evaluate(() => { const out = []; for (const dark of [false, true]) { document.documentElement.classList.toggle("dark", dark); const e = [...document.querySelectorAll('[data-testid=settings-content] span')].find(x => x.textContent.trim() === "Default"); const c = getComputedStyle(e); out.push([c.color, c.backgroundColor]); } document.documentElement.classList.remove("dark"); return out; });
  const rl = ratio(r[0][0], r[0][1]), rd = ratio(r[1][0], r[1][1]);
  await shot(page, "X-08-TPL");
  rec("TPL:X-08", parseFloat(rl) >= 4.5 && parseFloat(rd) >= 4.5 ? "PASS" : "FAIL", `Default badge contrast light ${rl}:1 (${r[0][0]} on ${r[0][1]}), dark ${rd}:1 (${r[1][0]} on ${r[1][1]}); needs 4.5:1 in both.`, "X-08-TPL");
  await page.close();
}
// X-06 phone delete reach
{
  const { page } = await open(b, "templates", "mobile");
  await wait(page, 800);
  const del = page.getByRole("button", { name: "Delete Hearing" });
  const vis = await del.isVisible();
  await del.tap(); await wait(page, 500);
  const bb = await page.evaluate(() => { const d = document.querySelector('[data-component=ConfirmDelete] [role=dialog]'); const r = d?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) } : null; });
  await shot(page, "X-06-TPL");
  rec("TPL:X-06", "FAIL", `Phone: Delete button visible ${vis}; delete dialog box ${JSON.stringify(bb)}; no horizontal scroll and rows are shown as stacked label/value blocks (no table), but TPL-26's star and selection checkbox do not exist (see TPL-26).`, "X-06-TPL");
  await page.close();
}
// X-10 / X-11 / X-12
rec("TPL:X-10", "NOT DRIVEABLE", `A zero-row Templates list cannot be reached: every seed template has entities and Delete is refused for them (dialog "N entities use this template. Move or delete them first."), so "No templates yet" is not shown. A search miss shows "Nothing matches “zzzz”" with "Clear search" (generic wording, see TPL-24).`);
rec("TPL:X-11", "PASS", `Search field "Search templates" in a row of constant height (32px before and after typing "zzzz", TPL-24); typing "court" leaves Court Case, clearing restores 9 rows (TPL-25).`);
rec("TPL:X-12", "FAIL", `No selection on Templates (no row or header checkboxes, TPL-14..16), so no fixed "Selected n of N" slot and no footer bulk Delete.`);
// X-13 corpus scope
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const out = {};
  out.mock = (await names(page)).length;
  for (const [label, key] of [["CEJIL","cejil"],["Red Trav","travesia"],["Best Artworks","artworks"]]) {
    await switchTo(page, label); await wait(page, 1500); await toSettings(page, "Templates"); await wait(page, 2500);
    const ns = await names(page);
    out[key] = ns.slice(0, 5).join(", ") + ` (${ns.length})`;
  }
  await shot(page, "X-13-TPL");
  rec("TPL:X-13", "FAIL", `Templates rows per data source after switching in the navbar: Sample ${out.mock} rows; CEJIL ${out.cejil}; Travesia ${out.travesia}; Artworks ${out.artworks}. Expect each corpus's own templates (Artworks: Artwork and Artist).`, "X-13-TPL");
  await page.close();
}
rec("TPL:X-02", "N/A", "Templates list has no form (page's Applies line).");
rec("TPL:X-03", "N/A", "Templates list has no form (page's Applies line).");
await b.close();
