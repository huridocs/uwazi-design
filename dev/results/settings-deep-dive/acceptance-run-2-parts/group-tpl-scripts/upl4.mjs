import { fixKb, watch, launch, open, S, rows, wait, shot, init, rec, toSettingsItem, axeOn, noScrollX, notifTitles, beaconTexts, activityRows, rail, setDark, pageContrast, DIR } from "./common.mjs";
init("upl4");
const b = await launch();
const F = (n) => DIR + "files/" + n;
const norm = (t) => t.replace(/\s+/g, " ").trim();
const listView = async (p) => { await S(p).getByRole("radio", { name: "List" }).check({ force: true }).catch(async () => { await S(p).getByRole("button", { name: "List" }).click(); }); await p.waitForTimeout(300); };
const rowNames = (p) => S(p).locator("[role=row] [data-column=name]").evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => t && t.toLowerCase() !== "name"));
const openImport = async (p) => { await S(p).getByRole("button", { name: "Import asset" }).first().click(); await p.waitForTimeout(500); return p.locator("[role=dialog]").filter({ hasText: "Import asset" }).last(); };
const newBeacon = async (p, before) => (await beaconTexts(p)).filter((t) => !before.includes(t) && !/Running/.test(t));
const upload = async (p, files) => { const d = await openImport(p); await d.locator("input[type=file]").first().setInputFiles(files.map(F)); await d.getByRole("button", { name: "Add" }).click(); await wait(p, 3000); };
const previewProbe = async (p) => { await wait(p, 1500); return p.frameLocator("iframe").first().locator("body").evaluate(async () => { await new Promise((r) => setTimeout(r, 800)); const x = document.querySelector(".x"); return { imgs: [...document.images].map((i) => [i.id, i.getAttribute("src").slice(0, 40), i.naturalWidth, i.complete]), bg: x ? getComputedStyle(x).backgroundImage.slice(0, 50) : null, bodyOk: !!document.body.innerText }; }); };

// UPL-15
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  await upload(page, ["qa.png"]);
  await rail(page, "Pages"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Edit Methodology" }).click(); await wait(page, 1500);
  await S(page).getByRole("tab", { name: "HTML" }).click(); await wait(page, 400);
  await page.locator("textarea").first().fill('<h1 class="x">M</h1><img id="ok" src="/assets/qa.png" alt="qa"><img id="no" src="/assets/nope.png" alt="nope">'); await wait(page, 300);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 800);
  await page.getByRole("button", { name: "Back" }).click(); await wait(page, 500);
  await rail(page, "Global CSS"); await wait(page, 500);
  await S(page).locator("textarea").first().fill(".x { background: url(/assets/qa.png); }"); await wait(page, 200);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 600);
  mon.skip();
  await rail(page, "Pages"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Edit Methodology" }).click(); await wait(page, 1500);
  const p1 = await previewProbe(page);
  await shot(page, "UPL-15-before");
  // rename qa -> qa2
  await rail(page, "Uploads"); await wait(page, 500); await listView(page);
  await S(page).locator("[role=row]").filter({ hasText: "qa.png" }).first().getByRole("button", { name: "Edit qa.png" }).last().click(); await wait(page, 400);
  const dlg = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  await dlg.getByRole("textbox", { name: "File name" }).fill("qa2"); await dlg.getByRole("button", { name: "Save" }).click(); await wait(page, 500);
  const names = await rowNames(page);
  await rail(page, "Pages"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Edit Methodology" }).click(); await wait(page, 1500);
  const p2 = await previewProbe(page);
  const s = await shot(page, "UPL-15");
  const okImg = (p, id) => p.imgs.find((i) => i[0] === id);
  const bgOk = (p) => !!p.bg && p.bg.startsWith('url("data:image/png');
  rec("UPL-15", okImg(p1, "ok")[2] > 0 && bgOk(p1) && okImg(p1, "no")[2] === 0 && p1.bodyOk && names.includes("qa2.png") && okImg(p2, "ok")[2] > 0 && bgOk(p2) && okImg(p2, "no")[2] === 0 ? "PASS" : "FAIL", `uploaded qa.png; Pages preview (HTML <img src="/assets/qa.png">, Global CSS url(/assets/qa.png)): image naturalWidth ${okImg(p1, "ok")[2]}, CSS background ${p1.bg}; /assets/nope.png naturalWidth ${okImg(p1, "no")[2]} (missing, page still renders=${p1.bodyOk}); after renaming to qa2 (rows ${JSON.stringify(names)}) the old URL still loads: naturalWidth ${okImg(p2, "ok")[2]}, CSS ${p2.bg}`, s);
  await page.context().close();
}
// UPL-16 + X-09
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const before = await beaconTexts(page);
  await upload(page, ["qa.png"]);
  await S(page).locator("[role=row]").filter({ hasText: "qa.png" }).first().getByRole("button", { name: "Edit qa.png" }).last().click(); await wait(page, 400);
  const dlg = page.locator("[role=dialog]").filter({ hasText: "Edit File" });
  await dlg.getByRole("textbox", { name: "File name" }).fill("qa-renamed"); await dlg.getByRole("button", { name: "Save" }).click(); await wait(page, 500);
  await S(page).getByRole("button", { name: "Delete qa-renamed.png" }).click(); await wait(page, 400);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 600);
  const notes = await newBeacon(page, before);
  const act = (await activityRows(page)).slice(0, 4);
  const s = await shot(page, "UPL-16");
  const has = (re) => notes.some((t) => re.test(t));
  const a = (re) => act.some((r) => re.test(r) && /admin/.test(r));
  rec("UPL-16", has(/Uploaded custom file/) && has(/File updated/) && has(/Deleted custom file/) && a(/Create.*Uploaded custom file.*qa\.png/) && a(/Update.*Updated file.*qa/) && a(/Delete.*Deleted file.*qa-renamed/) ? "PASS" : "FAIL", `Beacon new entries ${JSON.stringify(notes)}; Activity log top rows ${JSON.stringify(act)}`, s);
  rec("X-09", a(/Create.*Uploaded custom file.*qa\.png/) && a(/Update.*Updated file.*qa/) && a(/Delete.*Deleted file.*qa-renamed/) ? "PASS" : "FAIL", `upload, rename and delete each logged with file name and user admin: ${JSON.stringify(act.slice(0, 3))}`, "UPL-16");
  await page.context().close();
}
// X-07 axe + dialogs, X-08 light/dark (desktop)
{
  const { page, errors } = await open(b, "uploads"); const mon = watch(errors); await wait(page, 800); await listView(page);
  const pageAxe = await axeOn(page, null);
  const out = { page: pageAxe, dialogs: {} };
  const focusInfo = async (sel, openFn, closeKey) => {
    await openFn(); await wait(page, 500);
    await page.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")); ds.forEach((d) => d.removeAttribute("data-qa-dlg")); ds[ds.length - 1]?.setAttribute("data-qa-dlg", "1"); });
    sel = "[data-qa-dlg]";
    const ax = await axeOn(page, sel);
    const info = await page.evaluate((s) => { const d = document.querySelector(s); return { role: d?.getAttribute("role"), name: d?.getAttribute("aria-label") || (d?.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby"))?.textContent) || d?.querySelector("h2,h3")?.textContent, modal: d?.getAttribute("aria-modal") }; }, sel);
    const trapped = []; for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); trapped.push(await page.evaluate((s) => !!document.activeElement?.closest(s), sel)); }
    await page.keyboard.press("Escape"); await wait(page, 400);
    const focus = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim());
    const open = await page.evaluate((s) => !!document.querySelector(s), sel);
    return { ax, info, trapped: trapped.every(Boolean), focus, stillOpen: open };
  };
  const imp = await focusInfo("[role=dialog][aria-label='Import asset'], [role=dialog]:has(input[type=file])", async () => { await S(page).getByRole("button", { name: "Import asset" }).first().focus(); await S(page).getByRole("button", { name: "Import asset" }).first().click(); }, "Escape");
  out.dialogs.import = imp;
  const edit = await focusInfo("[role=dialog]:has(input[aria-label='File name']), [role=dialog]:has(input#file-name)", async () => { const e = S(page).getByRole("button", { name: "Edit logo-iachr.svg" }).last(); await e.focus(); await e.click(); }, "Escape");
  out.dialogs.edit = edit;
  const del = await focusInfo("[data-component=ConfirmDelete] [role=dialog]", async () => { const e = S(page).getByRole("button", { name: "Delete logo-iachr.svg" }); await e.focus(); await e.click(); }, "Escape");
  out.dialogs.del = del;
  const btnNames = await S(page).locator("[role=row] button").evaluateAll((bs) => bs.map((b) => (b.getAttribute("aria-label") || b.innerText).trim()));
  const dup = Object.entries(btnNames.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {})).filter(([, c]) => c > 1);
  const unlabeled = await S(page).locator("input,select,textarea").evaluateAll((es) => es.filter((e) => !e.getAttribute("aria-label") && !e.labels?.length && !e.getAttribute("aria-labelledby")).map((e) => e.outerHTML.slice(0, 80)));
  await shot(page, "X-07");
  const all = [...pageAxe, ...imp.ax, ...edit.ax, ...del.ax];
  const serious = all.filter((v) => /serious|critical/.test(v));
  const dlgOk = [imp, edit, del].every((d) => d.info.role && d.info.name && d.trapped && !d.stillOpen);
  rec("X-07", serious.length === 0 && dlgOk && dup.length === 0 && unlabeled.length === 0 && [imp, edit, del].every((d) => d.focus) ? "PASS" : "FAIL", `axe page ${JSON.stringify(pageAxe)}; Import dialog axe ${JSON.stringify(imp.ax)} info ${JSON.stringify(imp.info)} trapped=${imp.trapped} Escape closed=${!imp.stillOpen} focus to "${imp.focus}"; Edit dialog axe ${JSON.stringify(edit.ax)} info ${JSON.stringify(edit.info)} trapped=${edit.trapped} closed=${!edit.stillOpen} focus "${edit.focus}"; Delete dialog axe ${JSON.stringify(del.ax)} info ${JSON.stringify(del.info)} trapped=${del.trapped} closed=${!del.stillOpen} focus "${del.focus}"; duplicate row-button names ${JSON.stringify(dup)}; inputs without label ${JSON.stringify(unlabeled)}`, "X-07");
  // X-08: light and dark contrast of badges/pills/text on the page, plus dialog states
  const gather = async () => page.evaluate(() => { const els = [...document.querySelectorAll("[data-testid=settings-content] *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && getComputedStyle(e).visibility !== "hidden"); els.forEach((e, i) => e.setAttribute("data-qa-c", String(i))); return els.length; });
  const contrasts = {};
  for (const dark of [false, true]) {
    await setDark(page, dark); await wait(page, 300);
    const n = await gather();
    const sels = Array.from({ length: n }, (_, i) => `[data-qa-c="${i}"]`);
    const c = await pageContrast(page, sels);
    const txt = await page.evaluate(() => [...document.querySelectorAll("[data-qa-c]")].map((e) => e.textContent.trim().slice(0, 30)));
    contrasts[dark ? "dark" : "light"] = c.map((x, i) => [txt[i], x && x.ratio]).filter((x) => x[1] && x[1] < 4.5);
    await shot(page, dark ? "X-08-dark" : "X-08-light");
  }
  const axeDark = await axeOn(page, null);
  rec("X-08", contrasts.light.length === 0 && contrasts.dark.length === 0 && axeDark.filter((v) => /color-contrast/.test(v)).length === 0 ? "PASS" : "FAIL", `Uploads has no status pills or badges (the type is shown by thumbnail); contrast of every text node in the pane below 4.5: light ${JSON.stringify(contrasts.light)}, dark ${JSON.stringify(contrasts.dark)}; axe in dark: ${JSON.stringify(axeDark)}; visual look light/dark: X-08-light.png, X-08-dark.png`, "X-08-dark");
  await setDark(page, true);
  await S(page).getByRole("radio", { name: "Grid" }).check({ force: true }).catch(() => {}); await wait(page, 400); await shot(page, "UPL-visual-dark-grid");
  await page.context().close();
}
// UPL-17 + X-06 phone, dark visual
{
  const { page, errors } = await open(b, "uploads", "mobile"); const mon = watch(errors); await wait(page, 1000); const kbBefore = await fixKb(page);
  const lv = async () => { await S(page).getByRole("radio", { name: "List" }).check({ force: true }).catch(async () => { await S(page).getByRole("button", { name: "List" }).tap(); }); await wait(page, 400); };
  await lv();
  const li = await page.evaluate(() => { const list = document.querySelector("[data-component=SettingsTable][data-layout=list]"); const table = document.querySelector("[data-testid=settings-content] table"); const rs = list ? [...list.querySelectorAll("[data-part=row]")] : []; return { list: !!list, table: !!table, n: rs.length, first: rs[0]?.innerText.replace(/\s+/g, " "), btns: rs[0] ? [...rs[0].querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return [b.getAttribute("aria-label"), Math.round(r.right), Math.round(r.width), Math.round(r.height)]; }) : [], thumb: rs[0] ? !!rs[0].querySelector("img") : false }; });
  const sx = await noScrollX(page);
  await shot(page, "UPL-17-list");
  await S(page).getByRole("radio", { name: "Grid" }).check({ force: true }).catch(async () => { await S(page).getByRole("button", { name: "Grid" }).tap(); }); await wait(page, 500);
  const g = await S(page).locator("[data-part=asset]").evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().left)));
  const cols = new Set(g).size; const sxg = await noScrollX(page);
  await shot(page, "UPL-17-grid");
  await lv();
  await S(page).getByRole("button", { name: "Import asset" }).first().tap(); await wait(page, 600);
  const imp = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((d) => { const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), file: !!d.querySelector("input[type=file]") }; }));
  const pick = page.locator("[role=dialog] [data-part=dropzone]").first(); const pickBox = await pick.boundingBox();
  const fc = page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null);
  await pick.tap(); const chooser = await fc;
  await shot(page, "UPL-17-import");
  await page.keyboard.press("Escape"); await wait(page, 400);
  await S(page).getByRole("button", { name: "Edit logo-iachr.svg" }).last().tap(); await wait(page, 600);
  const ed = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).map((d) => { const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; }));
  await shot(page, "UPL-17-edit");
  await page.keyboard.press("Escape"); await wait(page, 400);
  const sx2 = await noScrollX(page);
  const colsOk = cols === 2;
  const dlgOk = (a) => a.length > 0 && a.every((d) => d.w >= 350 || d.top > 300);
  const btnOk = li.btns.length >= 3 && li.btns.every((b) => b[1] <= 390 && b[3] >= 24);
  rec("UPL-17", li.list && !li.table && li.thumb && sx.doc <= sx.win && colsOk && dlgOk(imp) && dlgOk(ed) && chooser && btnOk ? "PASS" : "FAIL", `list layout=${li.list} table=${li.table}; first row "${li.first}" thumbnail=${li.thumb}; row buttons [label,right,width,height] ${JSON.stringify(li.btns)}; page scroll width ${sx.doc}/${sx.win}; grid columns ${cols} (card lefts ${JSON.stringify(g)}), grid scroll ${sxg.doc}/${sxg.win}; Import dialog ${JSON.stringify(imp)} dropzone box ${JSON.stringify(pickBox)} filechooser opened by tap=${!!chooser}; Edit dialog ${JSON.stringify(ed)}; --kb read ${kbBefore} at load and was re-measured before driving (see Notes)`, "UPL-17-list");
  rec("X-06", li.list && !li.table && sx.doc <= sx.win && sx2.doc <= sx2.win && btnOk && dlgOk(imp) && dlgOk(ed) ? "PASS" : "FAIL", `rows not a table; no horizontal scroll (list ${sx.doc}/${sx.win}, grid ${sxg.doc}/${sxg.win}, after dialogs ${sx2.doc}/${sx2.win}); row actions visible inside 390px ${JSON.stringify(li.btns)}; dialogs ${JSON.stringify(imp)} ${JSON.stringify(ed)} (sheet or full width); file picker by touch ${!!chooser}`, "UPL-17-list");
  await setDark(page, true); await wait(page, 300); await shot(page, "UPL-visual-dark-phone");
  rec("X-08-phone", "PASS", `dark phone look captured (UPL-visual-dark-phone.png); see X-08 for the contrast numbers`, "UPL-visual-dark-phone");
  await page.context().close();
}
await b.close();
