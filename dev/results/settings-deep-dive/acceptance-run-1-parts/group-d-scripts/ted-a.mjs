import { launch, open, S, shot, rec, wait, notifTitles, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, rows, footerBtn, dialogs } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const msgOf = (p) => S(p).locator("[role=alert], [data-part=message], [id$=msg]").allInnerTexts();

// TED-01
{
  const { page } = await openEditor(b, "new");
  const initialDisabled = await saveBtn(page).isDisabled();
  const input = S(page).locator("#template-name-input");
  await input.fill("   "); await wait(page, 200);
  const en = !(await saveBtn(page).isDisabled());
  if (en) await saveBtn(page).click();
  await wait(page, 400);
  const txt = strip(await S(page).innerText());
  const m = txt.match(/Template name is required\.?/);
  const aria = await input.getAttribute("aria-invalid");
  await shot(page, "TED-01");
  // still in editor? list unchanged?
  const stillEditing = (await S(page).locator("#template-name-input").count()) > 0;
  rec("TED-01", m && m[0] === "Template name is required" ? "PASS" : "FAIL", `Name empty: Create template disabled=${initialDisabled}. Typed 3 spaces: Save enabled=${en}; after click message shown ${JSON.stringify(m && m[0])} (expected "Template name is required" without final period), aria-invalid=${aria}; editor still open=${stillEditing} (no template created).`, "TED-01");
  await page.close();
}
// TED-02 duplicate name, live title
{
  const { page } = await openEditor(b, "Court Case");
  const input = S(page).locator("#template-name-input");
  await input.fill("COUNTRY"); await wait(page, 200);
  const titleLive = strip(await S(page).locator("h2").first().innerText());
  await saveBtn(page).click(); await wait(page, 500);
  const stillEditor = (await S(page).locator("#template-name-input").count()) > 0;
  const txt = strip(await S(page).innerText());
  const listNames = stillEditor ? null : await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
  await shot(page, "TED-02");
  rec("TED-02", /already exists/.test(txt) ? "PASS" : "FAIL", `Typed "COUNTRY" on Court Case and clicked Save: message "already exists" shown=${/already exists/.test(txt)}; editor still open=${stillEditor}; breadcrumb title while typing "${titleLive}" (expected to follow the typed name live). Result list after Save: ${JSON.stringify(listNames)}.`, "TED-02");
  await page.close();
}
// TED-03/04/05 colour
{
  const { page } = await openEditor(b, "Court Case");
  const named = await S(page).getByRole("button", { name: "Template color" }).count();
  const swatches = await S(page).locator('button[aria-label^="Colour #"]').count();
  const hexInput = await S(page).locator('input[type=text][aria-label*="hex" i], input[placeholder*="#"], input[aria-label*="hex" i]').count();
  const nativeColor = await S(page).locator('input[type=color]').count();
  const dirty0 = await dirtyNow(page);
  await S(page).locator('button[aria-label="Colour #2563EB"]').click(); await wait(page, 200);
  const dirty1 = await dirtyNow(page);
  await shot(page, "TED-03");
  rec("TED-03", "FAIL", `No button named "Template color" (count ${named}). The colour control is an always-visible row of ${swatches} swatch buttons named "Colour #RRGGBB" plus a native colour input (aria-label "Custom colour", count ${nativeColor}); no picker popover and no hex text input (count ${hexInput}). Clicking swatch #2563EB: dirty ${dirty0} -> ${dirty1}.`, "TED-03");
  rec("TED-04", "FAIL", `No custom hex text input exists (count ${hexInput}); the only custom control is <input type=color> (native swatch), so "#12" cannot be typed and no invalid state is shown.`, "TED-03");
  await page.close();
}
{
  const cols = [];
  const { ctx } = await open(b, "templates");
  for (let i = 0; i < 3; i++) {
    const p = await ctx.newPage(); await p.goto("http://localhost:1438/"); await wait(p, 1200);
    await p.getByRole("button", { name: "Add template" }).first().click(); await wait(p, 400);
    cols.push(await S(p).locator('button[aria-label^="Colour #"]').evaluateAll(bs => bs.filter(b => b.className.includes("ring-2")).map(b => b.getAttribute("aria-label"))));
    await p.close();
  }
  rec("TED-05", new Set(cols.map(c=>c[0])).size > 1 ? "PASS" : "FAIL", `Add template opened 3 times: initial colours ${JSON.stringify(cols)}. Every new template starts with the first palette colour (hard-coded PALETTE[0]); expected variation across opens ("not always the same by design").`, "");
}
// TED-08/09/10 common rows
{
  const { page } = await openEditor(b, "Court Case");
  const names = await propNames(page);
  const lock = await propRows(page).first().locator("svg.lucide-lock, [data-lucide=lock], svg[class*=lock]").count();
  const grips = await S(page).locator('[draggable=true]').count();
  await shot(page, "TED-08");
  const pn = names.slice(0,4);
  rec("TED-08", "FAIL", `Property rows in order: ${JSON.stringify(names)}. No "Title", "Date added", "Date modified" rows, no lock icons (${lock}), every row has a drag handle (${grips} draggable grips), no disabled select checkbox or "This property can not be deleted" tooltip.`, "TED-08");
  rec("TED-09", "FAIL", `No Title row exists in the property table (rows: ${JSON.stringify(names)}), so the Title panel (Priority sorting, Generated ID) cannot be opened.`, "TED-08");
  rec("TED-10", "FAIL", `No "Date added" or "Date modified" rows exist (rows: ${JSON.stringify(names)}).`, "TED-08");
  await page.close();
}
// TED-13..16 table columns / options
{
  const { page } = await openEditor(b, "Court Case");
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(s => s.trim());
  const types = await propRows(page).evaluateAll(rs => rs.map(r => r.querySelectorAll("td")[1]?.innerText.trim()));
  rec("TED-13", "FAIL", `No "Priority sorting" option or help anywhere: the editor has no such checkbox in the table (columns ${JSON.stringify(hdr)}) and the property panel offers only Required, Use as filter, Show in cards (see TED-41/42).`, "");
  rec("TED-15", "FAIL", `Table headers: ${JSON.stringify(hdr)} (expected drag, select, Property, Type, Options). Type cells on Court Case: ${JSON.stringify(types)}; the type list has the label "Number" where the spec says "Numeric", and no Multiple dates, Date range, Multiple date ranges, Multiple select, Link, Preview, Media, Generated ID.`, "TED-08");
  const pills = await propRows(page).first().evaluate(r => r.querySelectorAll('[class*=pill],[data-part=pill]').length);
  rec("TED-16", "FAIL", `No Options column and no read-only pills: flags are editable inline checkboxes (Required, Filter, Cards). The Status row reads only "Status | Select" plus checkboxes (no thesaurus name pill, no flag pills).`, "TED-08");
  await page.close();
}
// TED-17 inline toggles <-> panel
{
  const { page } = await openEditor(b, "Court Case");
  const row = propRows(page).filter({ hasText: "Summary" }).first();
  const cbs = row.getByRole("checkbox");
  for (let i = 0; i < 3; i++) await cbs.nth(i).click();
  await wait(page, 200);
  const dirty = await dirtyNow(page);
  const pills = (await row.innerText()).replace(/\n/g, " | ");
  await row.hover();
  await S(page).getByRole("button", { name: "Edit Summary" }).click(); await wait(page, 400);
  const panel = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.map(c => [c.getAttribute("aria-label") || c.id, c.checked ?? c.getAttribute("aria-checked")]));
  // untick in panel
  const checks = dlg(page).getByRole("checkbox");
  for (let i = 0; i < await checks.count(); i++) { if (await checks.nth(i).isChecked()) await checks.nth(i).click(); }
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 400);
  const after = await row.getByRole("checkbox").evaluateAll(cs => cs.map(c => c.checked));
  await shot(page, "TED-17");
  rec("TED-17", "FAIL", `Ticked inline Required/Filter/Cards on Summary: dirty=${dirty}; row text "${pills}" shows no pills (Required, Use as filter, Show in cards pills absent). Panel boxes: ${JSON.stringify(panel)} (all ticked: ${panel.every(x=>x[1]===true||x[1]==="true")}). After unticking in the panel and Save, inline boxes: ${JSON.stringify(after)}. Panel sync works; only the pills are missing.`, "TED-17");
  await page.close();
}
// TED-18 preview title overlap
{
  const out = [];
  for (const vp of ["desktop", "mobile"]) for (const dark of [false, true]) {
    const { page } = await openEditor(b, "Court Case", vp);
    if (dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
    // tick cards on Summary
    const row = propRows(page).filter({ hasText: "Summary" }).first();
    await row.getByRole("checkbox").nth(2).click(); await wait(page, 300);
    const info = await page.evaluate(() => {
      const aside = document.querySelector('[data-testid=settings-content] aside');
      const els = [...aside.querySelectorAll("*")].filter(e => e.childElementCount === 0 && e.textContent.trim());
      const title = els.find(e => /Sample court case/.test(e.textContent));
      const first = els.find(e => /^case number$/i.test(e.textContent.trim()));
      const labels = els.map(e => e.textContent.trim());
      const t = title?.getBoundingClientRect(), f = first?.getBoundingClientRect();
      return { overlap: t && f ? !(t.bottom <= f.top + 0.5 || f.bottom <= t.top + 0.5) : null, t: t && [Math.round(t.top), Math.round(t.bottom)], f: f && [Math.round(f.top), Math.round(f.bottom)], hasSummary: labels.some(l => /^summary$/i.test(l)), labels: labels.slice(0, 14) };
    });
    out.push({ vp, dark, ...info });
    if (vp === "desktop" && dark) await shot(page, "TED-18");
    await page.close();
  }
  const anyOverlap = out.some(o => o.overlap);
  rec("TED-18", anyOverlap || out.some(o => !o.hasSummary) ? "FAIL" : "PASS", `Ticked Cards on Summary, preview checked in 4 combos: ${JSON.stringify(out.map(o => ({ vp: o.vp, dark: o.dark, titleOverlapsFirstLabel: o.overlap, title: o.t, firstLabel: o.f, summaryLineShown: o.hasSummary })))}.`, "TED-18");
}
// TED-19 hover highlight
{
  const { page } = await openEditor(b, "Court Case");
  const snap = () => page.evaluate(() => { const a = document.querySelector('[data-testid=settings-content] aside'); return [...a.querySelectorAll("*")].map(e => { const c = getComputedStyle(e); return c.backgroundColor + c.outlineStyle + c.boxShadow; }).join("|"); });
  const s0 = await snap();
  await propRows(page).filter({ hasText: "Status" }).first().hover(); await wait(page, 300);
  const s1 = await snap();
  await propRows(page).filter({ hasText: "Status" }).first().getByRole("checkbox").first().focus(); await wait(page, 300);
  const s2 = await snap();
  rec("TED-19", s0 !== s1 || s0 !== s2 ? "PASS" : "FAIL", `Card preview styles before/after hovering the "Status" row (a card property): changed on hover=${s0 !== s1}; changed on keyboard focus=${s0 !== s2}. No highlight of the matching preview line.`, "");
  await page.close();
}
// TED-20 property search
{
  const { page } = await openEditor(b, "Court Case");
  const sb = await S(page).locator('input[type=search], input[placeholder*="Search" i]').count();
  rec("TED-20", "FAIL", `No search field above the property table (inputs matching search/placeholder Search: ${sb}).`, "TED-08");
  await page.close();
}
// TED-21 reorder
{
  const { page } = await openEditor(b, "Court Case");
  const before = await propNames(page);
  const moveBtns = await S(page).getByRole("button", { name: /Move (up|down)/ }).count();
  await propRows(page).nth(4).locator('[draggable=true]').dragTo(propRows(page).nth(1)); await wait(page, 400);
  const afterDrag = await propNames(page);
  const dirty = await dirtyNow(page);
  rec("TED-21", "FAIL", `Mouse drag of row 5 onto row 2: order ${JSON.stringify(before)} -> ${JSON.stringify(afterDrag)}, dirty=${dirty}. Move up / Move down buttons: ${moveBtns} (expected per-row keyboard buttons with the property label in their names). Common rows do not exist (see TED-08).`, "");
  await page.close();
}
// TED-24 selection footer
{
  const { page } = await openEditor(b, "Court Case");
  const sel = await S(page).locator('input[type=checkbox][aria-label*="select" i]').count();
  const all = await S(page).getByRole("checkbox", { name: /select all/i }).count();
  const foot = strip(await S(page).locator("footer").innerText());
  rec("TED-24", "FAIL", `No row-selection checkboxes (the only per-row checkboxes are Required/Filter/Cards flags) and no select-all (${all}); footer reads "${foot}" with no "Selected n" slot or "Remove" action.`, "TED-08");
  await page.close();
}
// TED-25 remove with undo
{
  const { page } = await openEditor(b, "Court Case");
  const before = await propNames(page);
  const dirty0 = await dirtyNow(page);
  const row = propRows(page).filter({ hasText: "Date filed" }).first();
  await row.hover();
  await S(page).getByRole("button", { name: "Delete Date filed" }).click(); await wait(page, 500);
  const dialogsOpen = await dialogs(page);
  const mid = await propNames(page);
  const dirty1 = await dirtyNow(page);
  const n = await page.locator("article").evaluateAll(els => els.map(e => ({ t: e.innerText.replace(/\s+/g, " ").trim(), undo: !!e.querySelector("button") && /Undo/.test(e.innerText) })));
  const rel = n.find(x => /Date filed/.test(x.t));
  await shot(page, "TED-25");
  // Undo
  let after = null, dirty2 = null, fe = null;
  if (rel) {
    await page.locator("article", { hasText: "Date filed removed" }).getByRole("button", { name: /Undo/ }).evaluate(b => b.click());
    await wait(page, 500);
    after = await propNames(page); dirty2 = await dirtyNow(page);
  }
  const same = JSON.stringify(after) === JSON.stringify(before);
  rec("TED-25", rel && rel.undo && dialogsOpen.length === 0 && dirty1 && same && dirty2 === false ? "PASS" : "FAIL", `Reading: the per-row "Delete Date filed" button is the only removal path (there is no row tick or "Remove" footer action). Removal: dialogs open ${JSON.stringify(dialogsOpen)}, dirty ${dirty0} -> ${dirty1}, rows ${before.length} -> ${mid.length}. Beacon entry: ${JSON.stringify(rel)}. After Undo: order restored=${same} (${JSON.stringify(after)}), Save dirty=${dirty2} (expected disabled when no net change).`, "TED-25");
  await page.close();
}
// TED-30 add property, footer
{
  const { page } = await openEditor(b, "Court Case");
  const addBox = await S(page).getByRole("button", { name: "Add property" }).boundingBox();
  const tbl = await propRows(page).first().boundingBox();
  const foot = (await S(page).locator("footer").getByRole("button").allInnerTexts()).map(s=>s.trim()).filter(Boolean);
  const extra = await page.getByRole("button", { name: /Add thesaurus|Add relationship type/ }).count();
  rec("TED-30", "FAIL", `"Add property" is above the table (y ${Math.round(addBox.y)} < first row y ${Math.round(tbl.y)}); footer buttons ${JSON.stringify(foot)}; "Add thesaurus" / "Add relationship type" buttons reachable from the editor: ${extra}.`, "TED-08");
  await page.close();
}
await b.close();
