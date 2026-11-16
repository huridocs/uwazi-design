import { launch, open, S, shot, rec, wait, notifTitles, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rows, footerBtn, dialogs, strip, tipText, errs, cardFields, pickType, typeOptions } from "./ted-common.mjs";
const b = await launch();
const guard = async (id, fn) => { try { await fn(); } catch (e) { { console.error(e.stack.split("\n").slice(0,4).join(" / ").slice(0,500)); rec(id, "FAIL", "Script error while driving: " + String(e.message).split("\n")[0].slice(0, 300)); }; } };

// TED-01
await guard("TED-01", async () => {
  const c = await openEditor(b, "new"); const page = c.page;
  const input = S(page).locator("#template-name-input");
  const disabled0 = await saveBtn(page).isDisabled();
  await input.fill("   "); await wait(page, 200);
  const en = !(await saveBtn(page).isDisabled());
  if (en) await saveBtn(page).click();
  await wait(page, 400);
  const txt = strip(await S(page).innerText());
  const m = txt.match(/Template name is required/);
  const aria = await input.getAttribute("aria-invalid");
  const still = (await S(page).locator("#template-name-input").count()) > 0;
  const redText = await S(page).getByText("Template name is required").first().evaluate(e => getComputedStyle(e).color).catch(() => "");
  await shot(page, "TED-01");
  rec("TED-01", m && aria === "true" && still ? "PASS" : "FAIL", `Name empty: Create template disabled=${disabled0}. Typed 3 spaces: Create enabled=${en}; clicked: message ${JSON.stringify(m && m[0])}, aria-invalid=${aria}, message colour ${redText}; editor still open=${still} (no template created).`, "TED-01");
  const rl = await (async () => { await page.keyboard.press("Escape"); return null; })();
  await c.ctx.close();
});

// TED-02
await guard("TED-02", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const input = S(page).locator("#template-name-input");
  const out = {};
  await input.fill("COUNTRY"); await wait(page, 200);
  out.crumb = strip(await S(page).locator("h2").first().innerText());
  await saveBtn(page).click(); await wait(page, 500);
  out.stillEditor = (await S(page).locator("#template-name-input").count()) > 0;
  out.msg1 = /Template name already exists/.test(strip(await S(page).innerText()));
  await shot(page, "TED-02");
  await input.fill("COURT CASE"); await wait(page, 250);
  out.ownMsg = /already exists/.test(strip(await S(page).innerText()));
  await input.fill("Court Case QA"); await wait(page, 250);
  out.clears = !/already exists/.test(strip(await S(page).innerText()));
  out.crumb2 = strip(await S(page).locator("h2").first().innerText());
  // edit of other template, duplicate with different case on create
  await saveBtn(page).click(); await wait(page, 500);
  out.savedAndLeft = (await S(page).locator("#template-name-input").count()) === 0;
  // create: duplicate
  await page.getByRole("button", { name: "Add template" }).first().click(); await wait(page, 400);
  await S(page).locator("#template-name-input").fill("country"); await wait(page, 200);
  await saveBtn(page).click(); await wait(page, 400);
  out.createDup = /Template name already exists/.test(strip(await S(page).innerText()));
  const ok = out.stillEditor && out.msg1 && !out.ownMsg && out.clears && out.crumb2 === "Court Case QA" && out.crumb === "COUNTRY" && out.createDup;
  rec("TED-02", ok ? "PASS" : "FAIL", `Court Case, typed "COUNTRY" + Save: breadcrumb title "${out.crumb}", editor stayed=${out.stillEditor}, "Template name already exists" shown=${out.msg1}. Own name "COURT CASE": error=${out.ownMsg}. Unique "Court Case QA": error cleared=${out.clears}, title "${out.crumb2}", Save then left the editor=${out.savedAndLeft}. New template "country": duplicate error=${out.createDup}.`, "TED-02");
  await c.ctx.close();
});

// TED-03 / 04
await guard("TED-03", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const btn = S(page).getByRole("button", { name: "Template color" });
  const n = await btn.count();
  const before = strip(await btn.innerText());
  const dirty0 = await dirtyNow(page);
  await btn.click(); await wait(page, 250);
  const dialogOpen = await page.locator('[role=dialog][aria-label="Template color"]').count();
  const swatches = await page.locator('button[aria-label^="Colour #"]').count();
  const hex = await page.getByLabel("Manually set a color").count();
  await page.locator('button[aria-label="Colour #7C3AED"]').click(); await wait(page, 250);
  const after = strip(await btn.innerText());
  const dirty1 = await dirtyNow(page);
  await shot(page, "TED-03");
  rec("TED-03", n === 1 && dialogOpen && swatches >= 6 && hex && after !== before && !dirty0 && dirty1 ? "PASS" : "FAIL", `Button "Template color" count=${n}; opens a dialog with ${swatches} swatches and hex input (label "Manually set a color", count ${hex}). Choosing #7C3AED: button text "${before}" -> "${after}"; Save enabled ${dirty0} -> ${dirty1}.`, "TED-03");
  // TED-04
  const inp = page.getByLabel("Manually set a color");
  await inp.fill("#12"); await wait(page, 250);
  const inv = await inp.getAttribute("aria-invalid");
  const msg = strip(await page.locator('[role=dialog][aria-label="Template color"]').innerText());
  const mid = strip(await btn.innerText());
  await shot(page, "TED-04");
  await inp.fill("#2b8a3e"); await wait(page, 250);
  const fin = strip(await btn.innerText());
  const inv2 = await inp.getAttribute("aria-invalid");
  rec("TED-04", inv === "true" && mid === after && /2B8A3E/i.test(fin) && !inv2 ? "PASS" : "FAIL", `"#12": aria-invalid=${inv}, text in dialog "${msg.slice(0, 120)}", button stays "${mid}" (not applied). "#2b8a3e": button "${fin}", aria-invalid=${inv2}.`, "TED-04");
  await c.ctx.close();
});

// TED-05
await guard("TED-05", async () => {
  const cols = [];
  const c0 = await open(b, "templates");
  for (let i = 0; i < 8; i++) {
    const p = await c0.ctx.newPage(); await p.goto("http://localhost:1438/"); await wait(p, 1000);
    await p.getByRole("button", { name: "Add template" }).first().click(); await wait(p, 300);
    cols.push(strip(await S(p).getByRole("button", { name: "Template color" }).innerText()));
    await p.close();
  }
  const distinct = new Set(cols);
  rec("TED-05", distinct.size > 1 && cols.every(x => /^#[0-9A-F]{6}$/.test(x)) ? "PASS" : "FAIL", `Add template opened 8 times: starting colours ${JSON.stringify(cols)} (${distinct.size} distinct, all hex from the palette).`, "");
  await c0.ctx.close();
});

// TED-08 common rows
await guard("TED-08", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const names = await propNames(page);
  const first3 = [0, 1, 2];
  const info = [];
  for (const i of first3) {
    const r = propRows(page).nth(i);
    info.push(await r.evaluate(e => ({ lock: !!e.querySelector("svg.lucide-lock"), grip: !!e.querySelector('[data-component=ReorderGrip]'), draggable: !!e.querySelector('[draggable=true]'), cb: (() => { const x = e.querySelector("input[type=checkbox]"); return x ? { disabled: x.getAttribute("aria-disabled"), checked: x.checked } : null; })(), common: e.dataset.common })));
  }
  const tipT = await tipText(page, propRows(page).nth(0).locator("input[type=checkbox]"));
  const tipF = await tipText(page, propRows(page).nth(1).locator("input[type=checkbox]"), "focus");
  // click the common checkbox
  await propRows(page).nth(0).locator("input[type=checkbox]").click({ force: true }).catch(() => {});
  await wait(page, 200);
  const stillUnchecked = !(await propRows(page).nth(0).locator("input[type=checkbox]").isChecked());
  // drag custom row above commons
  const before = await propNames(page);
  const src = propRows(page).nth(5).locator('[data-component=ReorderGrip]');
  await src.dragTo(propRows(page).nth(0)); await wait(page, 300);
  const after = await propNames(page);
  const dirty = await dirtyNow(page);
  await shot(page, "TED-08");
  const ok = JSON.stringify(names.slice(0, 3)) === JSON.stringify(["Title", "Date added", "Date modified"]) && info.every(x => x.lock && !x.grip && !x.draggable && x.cb && x.cb.disabled === "true") && tipT.some(t => /This property can not be deleted/.test(t)) && JSON.stringify(after.slice(0, 3)) === JSON.stringify(["Title", "Date added", "Date modified"]);
  rec("TED-08", ok ? "PASS" : "FAIL", `First rows ${JSON.stringify(names.slice(0, 3))}; per row lock/grip/draggable/checkbox ${JSON.stringify(info)}. Checkbox tooltip on hover ${JSON.stringify(tipT)}, on keyboard focus ${JSON.stringify(tipF)}; click leaves it unticked=${stillUnchecked}. Dragging custom row 6 onto Title: first three after ${JSON.stringify(after.slice(0, 3))}, full order changed=${JSON.stringify(before) !== JSON.stringify(after)}, dirty=${dirty}.`, "TED-08");
  await c.ctx.close();
});

// TED-09 / 10 / 13 (common panels)
await guard("TED-09", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  await S(page).getByRole("button", { name: "Edit Title", exact: true }).click(); await wait(page, 400);
  const d = dlg(page);
  const txt = strip(await d.innerText());
  const typeBox = strip(await d.locator('[data-part=type-box]').innerText().catch(() => ""));
  const label = d.getByLabel("Label", { exact: true });
  const labelDisabled = await label.isDisabled();
  const cbs = await d.getByRole("checkbox").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label")));
  const gen = await tipText(page, d.getByRole("button", { name: "About Generated ID" }));
  const same = await d.locator('[data-part=same-label]').count();
  await shot(page, "TED-09");
  const ok = /Text/.test(typeBox) && !labelDisabled && JSON.stringify(cbs) === JSON.stringify(["Generated ID", "Priority sorting"].sort((a, b) => 0)) || (cbs.includes("Priority sorting") && cbs.includes("Generated ID") && cbs.length === 2);
  rec("TED-09", ok && gen.some(t => /A generated ID will be the default title\./.test(t)) && !same ? "PASS" : "FAIL", `Title panel: type box "${typeBox}", Label disabled=${labelDisabled}, checkboxes ${JSON.stringify(cbs)}, Generated ID tooltip ${JSON.stringify(gen)}, same-label table count ${same}. Panel text: "${txt.slice(0, 300)}"`, "TED-09");
  await c.ctx.close();
});
await guard("TED-10", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const out = [];
  for (const nm of ["Date added", "Date modified"]) {
    await S(page).getByRole("button", { name: "Edit " + nm, exact: true }).click(); await wait(page, 400);
    const d = dlg(page);
    const dis = await d.getByLabel("Label", { exact: true }).isDisabled();
    const cbs = await d.getByRole("checkbox").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label")));
    const same = await d.locator('[data-part=same-label]').count();
    const typeBox = strip(await d.locator('[data-part=type-box]').innerText().catch(() => ""));
    out.push({ nm, labelDisabled: dis, cbs, same, typeBox });
    if (nm === "Date added") await shot(page, "TED-10");
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  }
  const ok = out.every(o => o.labelDisabled && o.cbs.length === 1 && o.cbs[0] === "Priority sorting" && !o.same);
  rec("TED-10", ok ? "PASS" : "FAIL", JSON.stringify(out), "TED-10");
  await c.ctx.close();
});
await guard("TED-13", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const want = "Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting.";
  const out = {};
  // Text with filter (Series? need text prop with filter): use Add property text + filter
  await openAdd(page);
  const d = dlg(page);
  await d.getByLabel("Label", { exact: true }).fill("QA T13");
  out.beforeFilter = await d.getByRole("checkbox", { name: "Priority sorting" }).count();
  await d.getByRole("checkbox", { name: "Use as filter" }).check(); await wait(page, 200);
  out.textWith = await d.getByRole("checkbox", { name: "Priority sorting" }).count();
  out.textTip = await tipText(page, d.getByRole("button", { name: "About Priority sorting" }));
  out.textTipFocus = await tipText(page, d.getByRole("button", { name: "About Priority sorting" }), "focus");
  out.visible = (await d.innerText()).includes(want);
  const typeCounts = {};
  for (const t of ["Numeric", "Date", "Select", "Link", "Multiple select", "Rich text", "Multiple dates"]) {
    await pickType(page, t);
    const fl = d.getByRole("checkbox", { name: "Use as filter" });
    if (await fl.count()) { if (!(await fl.isChecked())) await fl.check(); }
    await wait(page, 150);
    typeCounts[t] = await d.getByRole("checkbox", { name: "Priority sorting" }).count();
  }
  out.typeCounts = typeCounts;
  await shot(page, "TED-13");
  await d.getByRole("button", { name: "Cancel" }).click(); await wait(page, 250);
  // common rows
  const commons = {};
  for (const nm of ["Title", "Date added", "Date modified"]) {
    await S(page).getByRole("button", { name: "Edit " + nm, exact: true }).click(); await wait(page, 300);
    commons[nm] = await dlg(page).getByRole("checkbox", { name: "Priority sorting" }).count();
    await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 250);
  }
  out.commons = commons;
  const tc = out.typeCounts;
  const ok = out.beforeFilter === 0 && out.textWith === 1 && out.textTip.some(t => t === want) && out.textTipFocus.some(t => t === want) && tc.Numeric === 1 && tc.Date === 1 && tc.Select === 1 && tc.Link === 0 && tc["Multiple select"] === 0 && Object.values(commons).every(v => v === 1);
  rec("TED-13", ok ? "PASS" : "FAIL", `Priority sorting present before ticking filter (Text)=${out.beforeFilter}, after=${out.textWith}. Tooltip on hover/focus equals the Uwazi text: ${out.textTip.some(t => t === want)}/${out.textTipFocus.some(t => t === want)}; visible help line=${out.visible}. Option by type with filter on ${JSON.stringify(tc)} (Link has no filter box); common rows ${JSON.stringify(commons)}. Tooltip read: ${JSON.stringify(out.textTip).slice(0, 200)}`, "TED-13");
  await c.ctx.close();
});

// TED-15 / 16
await guard("TED-15", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const hdr = (await S(page).locator('[role=columnheader]').allInnerTexts()).map(strip);
  const types = await propRows(page).evaluateAll(rs => rs.map(r => r.querySelectorAll("td")[3]?.innerText.trim()));
  const iconCount = await propRows(page).evaluateAll(rs => rs.filter(r => r.querySelectorAll("td")[3]?.querySelector("svg")).length);
  const total = await propRows(page).count();
  const L16 = ["Text", "Rich text", "Numeric", "Date", "Multiple dates", "Date range", "Multiple date ranges", "Select", "Multiple select", "Relationship", "Link", "Image", "Preview", "Media", "Geolocation", "Generated ID"];
  const outside = [...new Set(types)].filter(t => !L16.includes(t));
  await openAdd(page);
  const opts = await typeOptions(page);
  await page.keyboard.press("Escape"); await wait(page, 200);
  await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 200);
  await S(page).getByRole("button", { name: "Edit Country", exact: true }).click(); await wait(page, 300);
  const box = strip(await dlg(page).locator('[data-part=type-box]').innerText());
  await dlg(page).getByRole("button", { name: "Cancel" }).click();
  await shot(page, "TED-15");
  const first5 = hdr.slice(0, 5).map(h => h.toLowerCase());
  const ok = JSON.stringify(first5) === JSON.stringify(["drag", "select", "property", "type", "options"]) && outside.length === 0 && iconCount === total && JSON.stringify(opts) === JSON.stringify(L16) && /Select$/.test(box);
  rec("TED-15", ok ? "PASS" : "FAIL", `Headers ${JSON.stringify(hdr)} (first five are drag, select, Property, Type, Options; Required / Filter / Cards / Order follow as the [PO] inline controls, TED-17). Type cells carry icon on ${iconCount}/${total} rows, labels outside the 16: ${JSON.stringify(outside)}. Type select options ${JSON.stringify(opts)}; read-only box for Country "${box}".`, "TED-15");
  await c.ctx.close();
});

// TED-16 options pills
await guard("TED-16", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const pills = (n) => propRows(page).filter({ has: page.locator(`button[aria-label="Edit ${n}"]`) }).first().evaluate(r => [...r.querySelectorAll("td")[4].querySelectorAll("span")].map(s => s.innerText.trim()));
  const out = {};
  for (const n of ["Date filed", "Country", "Place of the incident", "Judgments", "Title"]) out[n] = await pills(n);
  const keyErr = c.errors.filter(e => /same key/.test(e)).length;
  // full flag order in the panel with a Select
  await openAdd(page);
  const d = dlg(page);
  await d.getByLabel("Label", { exact: true }).fill("QA T16");
  await pickType(page, "Select");
  await d.getByRole("button", { name: "Thesaurus" }).click(); await wait(page, 200);
  await page.locator('[role=listbox] [role=option]').nth(1).click(); await wait(page, 200);
  await d.getByRole("checkbox", { name: "Use as filter" }).check();
  for (const n of ["Hide label", "Required property", "Show in cards", "Default filter", "Priority sorting"]) await d.getByRole("checkbox", { name: n }).check();
  await d.getByRole("button", { name: "Add property" }).click(); await wait(page, 400);
  out.full = await pills("QA T16");
  // image with fullwidth+fit
  await openAdd(page);
  const d2 = dlg(page);
  await d2.getByLabel("Label", { exact: true }).fill("QA T16 img");
  await pickType(page, "Image");
  await d2.getByRole("checkbox", { name: "Full width" }).check();
  await d2.getByRole("radio", { name: "Fit" }).check();
  await d2.getByRole("checkbox", { name: "Show in cards" }).check();
  await d2.getByRole("button", { name: "Add property" }).click(); await wait(page, 400);
  out.img = await pills("QA T16 img");
  // Title with generated id
  await S(page).getByRole("button", { name: "Edit Title", exact: true }).click(); await wait(page, 300);
  await dlg(page).getByRole("checkbox", { name: "Generated ID" }).check();
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  out.titleGen = await pills("Title");
  await shot(page, "TED-16");
  const exp = ["Show in cards", "No label", "Use as filter", "Priority sorting", "Required", "Default filter"];
  const fullOk = JSON.stringify(out.full.slice(0, 6)) === JSON.stringify(exp) && out.full.length === 7;
  const ok = JSON.stringify(out["Date filed"]) === JSON.stringify(["Show in cards", "Use as filter", "Priority sorting"]) && out["Place of the incident"].length === 0 && fullOk && JSON.stringify(out.img) === JSON.stringify(["Show in cards", "Full width", "Fit"]) && out.titleGen.join() === "Generated ID" && out.Judgments.length === 2 && keyErr === 0;
  rec("TED-16", ok ? "PASS" : "FAIL", `Pills (read-only, in order): Date filed ${JSON.stringify(out["Date filed"])}; Country ${JSON.stringify(out.Country)}; Place of the incident ${JSON.stringify(out["Place of the incident"])} (empty); Judgments ${JSON.stringify(out.Judgments)}; all-flags select ${JSON.stringify(out.full)}; image ${JSON.stringify(out.img)}; Title with Generated ID ${JSON.stringify(out.titleGen)}. Console: opening the Court Case editor logs ${keyErr} React error(s) "Encountered two children with the same key ... Judgment" from the option pills (the Judgments relationship row: relationship type "Judgment" and target template "Judgment" share a key).`, "TED-16");
  await c.ctx.close();
});

// TED-17
await guard("TED-17", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const nm = "Place of the incident";
  const row = propRows(page).filter({ has: page.locator(`button[aria-label="Edit ${nm}"]`) }).first();
  await S(page).getByRole("checkbox", { name: `${nm} required`, exact: true }).click();
  await S(page).getByRole("checkbox", { name: `${nm} use as filter`, exact: true }).click();
  await S(page).getByRole("checkbox", { name: `${nm} show in cards`, exact: true }).click();
  await wait(page, 250);
  const dirty = await dirtyNow(page);
  const pills = await row.evaluate(r => [...r.querySelectorAll("td")[4].querySelectorAll("span")].map(s => s.innerText.trim()));
  await S(page).getByRole("button", { name: "Edit " + nm, exact: true }).click(); await wait(page, 300);
  const panel = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.map(c => [c.getAttribute("aria-label"), c.checked]));
  for (const n of ["Required property", "Show in cards", "Use as filter"]) await dlg(page).getByRole("checkbox", { name: n }).uncheck();
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  const after = await row.getByRole("checkbox").evaluateAll(cs => cs.map(c => c.checked));
  const pills2 = await row.evaluate(r => [...r.querySelectorAll("td")[4].querySelectorAll("span")].map(s => s.innerText.trim()));
  await shot(page, "TED-17");
  const t = panel.filter(x => ["Required property", "Show in cards", "Use as filter"].includes(x[0]));
  const ok = dirty && ["Required", "Use as filter", "Show in cards"].every(x => pills.includes(x)) && t.length === 3 && t.every(x => x[1]) && after.every(x => !x) && pills2.length === 0;
  rec("TED-17", ok ? "PASS" : "FAIL", `Ticked inline Required/Filter/Cards on "${nm}": dirty=${dirty}, pills ${JSON.stringify(pills)}. Panel boxes ${JSON.stringify(panel)}. After unticking in the panel and Save: inline boxes ${JSON.stringify(after)}, pills ${JSON.stringify(pills2)}.`, "TED-17");
  await c.ctx.close();
});

// TED-18 preview
await guard("TED-18", async () => {
  const out = [];
  for (const vp of ["desktop", "mobile"]) for (const dark of [false, true]) {
    const c = await openEditor(b, "Court Case", vp); const page = c.page;
    if (dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
    const nm = "Place of the incident";
    await S(page).getByRole("checkbox", { name: `${nm} show in cards`, exact: true }).click(); await wait(page, 300);
    const info = await page.evaluate((nm) => {
      const aside = document.querySelector('[data-testid=settings-content] aside');
      const fields = [...aside.querySelectorAll("[data-field]")].map(e => e.innerText.replace(/\s+/g, " ").trim());
      const leafs = [...aside.querySelectorAll("*")].filter(e => e.childElementCount === 0 && e.textContent.trim());
      const title = leafs.find(e => /^Sample court case/.test(e.textContent.trim()));
      const first = leafs.find(e => /^case number$/i.test(e.textContent.trim()));
      const t = title?.getBoundingClientRect(), f = first?.getBoundingClientRect();
      return { fields, overlap: t && f ? !(t.bottom <= f.top + 0.5 || f.bottom <= t.top + 0.5) : null, t: t && [Math.round(t.top), Math.round(t.bottom)], f: f && [Math.round(f.top), Math.round(f.bottom)] };
    });
    out.push({ vp, dark, ...info });
    if (vp === "desktop" && dark) await shot(page, "TED-18");
    if (vp === "mobile" && !dark) { await page.evaluate(() => document.querySelector('[data-testid=settings-content] aside').scrollIntoView()); await shot(page, "TED-18-phone"); }
    await c.ctx.close();
  }
  const ok = out.every(o => !o.overlap && o.fields.some(f => /Place of the incident/i.test(f)) && o.fields.findIndex(f => /Case number/i.test(f)) < o.fields.findIndex(f => /Place of the incident/i.test(f)));
  rec("TED-18", ok ? "PASS" : "FAIL", `Ticked Cards on "Place of the incident"; preview fields and title/first-label overlap in 4 combos: ${JSON.stringify(out.map(o => ({ vp: o.vp, dark: o.dark, overlap: o.overlap, title: o.t, firstLabel: o.f, fields: o.fields.map(f => f.slice(0, 40)) })))}`, "TED-18");
});

// TED-19
await guard("TED-19", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const hl = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=settings-content] aside [data-field]')].filter(e => e.classList.contains("bg-parchment")).map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const h0 = await hl();
  await propRows(page).filter({ has: page.locator('button[aria-label="Edit Status"]') }).first().hover(); await wait(page, 300);
  const h1 = await hl();
  await page.mouse.move(0, 0); await wait(page, 200);
  const h2 = await hl();
  await S(page).getByRole("button", { name: "Edit Victim", exact: true }).focus(); await wait(page, 300);
  const h3 = await hl();
  await S(page).getByRole("button", { name: "Edit Place of the incident", exact: true }).focus(); await wait(page, 300);
  const h4 = await hl();
  await propRows(page).filter({ has: page.locator('button[aria-label="Edit Place of the incident"]') }).first().hover(); await wait(page, 300);
  const h5 = await hl();
  await shot(page, "TED-19");
  const errsNow = errs(c.errors);
  const ok = h0.length === 0 && h1.some(x => /STATUS|Status/i.test(x)) && h2.length === 0 && h3.some(x => /Victim/i.test(x)) && h4.length === 0 && h5.length === 0 && errsNow.length === 0;
  rec("TED-19", ok ? "PASS" : "FAIL", `Highlighted preview lines: idle ${JSON.stringify(h0)}; hover Status row ${JSON.stringify(h1)}; after leaving ${JSON.stringify(h2)}; keyboard focus Victim ${JSON.stringify(h3)}; focus and hover on a row without Show in cards (Place of the incident) ${JSON.stringify(h4)} / ${JSON.stringify(h5)}; console errors ${JSON.stringify(errsNow)}`, "TED-19");
  await c.ctx.close();
});

// TED-20 search
await guard("TED-20", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const sb = S(page).locator('[data-part=property-search]');
  const h0 = (await sb.boundingBox()).height;
  const all0 = await propNames(page);
  await S(page).getByLabel("Search properties").fill("date"); await wait(page, 300);
  const names = await propNames(page);
  const h1 = (await sb.boundingBox()).height;
  await S(page).getByLabel("Search properties").fill("zzzz"); await wait(page, 300);
  const none = strip(await S(page).locator("[data-part=properties]").innerText());
  const h2 = (await sb.boundingBox()).height;
  await S(page).getByLabel("Clear search").click(); await wait(page, 300);
  const all1 = await propNames(page);
  await shot(page, "TED-20");
  const ok = names.length > 0 && names.every(n => /date/i.test(n)) && names.includes("Date added") && names.includes("Date modified") && h0 === h1 && h1 === h2 && /No property matches/.test(none) && JSON.stringify(all1) === JSON.stringify(all0);
  rec("TED-20", ok ? "PASS" : "FAIL", `Typed "date": rows ${JSON.stringify(names)} (common rows follow the same rule). Search row height ${h0}/${h1}/${h2}. "zzzz": "${none.slice(-40)}". Clear restores ${all1.length}/${all0.length} rows in order=${JSON.stringify(all1) === JSON.stringify(all0)}.`, "TED-20");
  await c.ctx.close();
});

// TED-21 reorder
await guard("TED-21", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const before = await propNames(page);
  await propRows(page).nth(8).locator('[data-component=ReorderGrip]').dragTo(propRows(page).nth(4)); await wait(page, 400);
  const afterDrag = await propNames(page);
  const dirty = await dirtyNow(page);
  const down = S(page).getByRole("button", { name: "Move Victim down" });
  const downN = await down.count();
  await down.click(); await wait(page, 300);
  const focusedAfter = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
  const afterMove = await propNames(page);
  const firstCustom = afterMove[3], lastCustom = afterMove[afterMove.length - 1];
  const upFirst = await S(page).getByRole("button", { name: `Move ${firstCustom} up` }).isDisabled();
  const downLast = await S(page).getByRole("button", { name: `Move ${lastCustom} down` }).isDisabled();
  const commonMoveBtns = await propRows(page).nth(0).getByRole("button", { name: /Move/ }).count();
  await shot(page, "TED-21");
  const dragOk = JSON.stringify(before) !== JSON.stringify(afterDrag) && afterDrag.slice(0, 3).join() === "Title,Date added,Date modified";
  const moved = afterMove.indexOf("Victim") === afterDrag.indexOf("Victim") + 1;
  rec("TED-21", dragOk && dirty && moved && /Move Victim down/.test(focusedAfter || "") && upFirst && downLast && commonMoveBtns === 0 ? "PASS" : "FAIL", `Drag row 9 onto row 5: moved=${JSON.stringify(before) !== JSON.stringify(afterDrag)}, common rows first=${afterDrag.slice(0, 3).join()}, dirty=${dirty}. "Move Victim down" buttons ${downN}; clicked: Victim moved down one=${moved}; focus afterwards on ${JSON.stringify(focusedAfter)}. Up disabled on first custom (${firstCustom})=${upFirst}; Down disabled on last (${lastCustom})=${downLast}; Move buttons on common rows=${commonMoveBtns}.`, "TED-21");
  await c.ctx.close();
});

// TED-24 selection
await guard("TED-24", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const foot0 = strip(await S(page).locator("footer").innerText());
  await S(page).getByRole("checkbox", { name: "Select Victim", exact: true }).check();
  await S(page).getByRole("checkbox", { name: "Select Petitioner", exact: true }).check(); await wait(page, 250);
  const foot = strip(await S(page).locator("footer").innerText());
  const style = await S(page).locator("footer").evaluate(f => { const c = getComputedStyle(f); const bar = f.querySelector("[data-component=SettingsSelectionBar]"); const cb = bar && getComputedStyle(bar); return { footerBg: c.backgroundColor, borderTop: c.borderTopWidth + " " + c.borderTopStyle, barBg: cb?.backgroundColor, barBorder: cb?.borderTopWidth }; });
  const slotW = await S(page).locator("footer [role=status]").first().evaluate(e => e.getBoundingClientRect().width);
  await propRows(page).nth(0).locator("input[type=checkbox]").click({ force: true }).catch(() => {});
  await wait(page, 200);
  const afterCommon = strip(await S(page).locator("footer").innerText());
  await S(page).getByRole("checkbox", { name: "Select all properties", exact: true }).click(); await wait(page, 250);
  const allFoot = strip(await S(page).locator("footer [role=status]").first().innerText());
  const total = (await propNames(page)).length - 3;
  const commonTicked = await propRows(page).evaluateAll(rs => rs.slice(0, 3).map(r => r.querySelector("input[type=checkbox]").checked));
  const dangerBtn = await S(page).locator("footer").getByRole("button", { name: "Remove" }).count();
  await shot(page, "TED-24");
  await S(page).getByRole("checkbox", { name: "Select all properties", exact: true }).click(); await wait(page, 250);
  const foot2 = strip(await S(page).locator("footer").innerText());
  const ok = /Selected 2 of \d+/.test(foot) && dangerBtn === 1 && !commonTicked.some(x => x) && new RegExp(`Selected ${total} of ${total}`).test(allFoot) && /Remove/.test(foot) && !/Selected/.test(foot2) && !/Selected/.test(foot0);
  rec("TED-24", ok ? "PASS" : "FAIL", `Footer idle "${foot0}". Two custom rows ticked: "${foot}" (fixed slot width ${Math.round(slotW)}px; "Selected 2 of N" contains the required "Selected 2"); style ${JSON.stringify(style)}. Ticking a common row: "${afterCommon.slice(0, 60)}" and common boxes ticked=${JSON.stringify(commonTicked)}. Select all: "${allFoot}" (${total} custom rows). Clearing restores footer: "${foot2}".`, "TED-24");
  await c.ctx.close();
});

// TED-25
await guard("TED-25", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  const before = await propNames(page);
  const dirty0 = await dirtyNow(page);
  await S(page).getByRole("checkbox", { name: "Select Series", exact: true }).check(); await wait(page, 200);
  await S(page).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(page, 500);
  const dlgs = await dialogs(page);
  const mid = await propNames(page);
  const dirty1 = await dirtyNow(page);
  const n = await page.locator("article").evaluateAll(els => els.map(e => ({ t: e.innerText.replace(/\s+/g, " ").trim(), undo: /Undo/.test(e.innerText) })));
  const rel = n.find(x => /Series removed/.test(x.t));
  await shot(page, "TED-25");
  await page.locator("article", { hasText: "Series removed" }).getByRole("button", { name: /Undo/ }).evaluate(b => b.click()); await wait(page, 500);
  const after = await propNames(page);
  const dirty2 = await dirtyNow(page);
  const same = JSON.stringify(after) === JSON.stringify(before);
  rec("TED-25", rel && rel.undo && dlgs.length === 0 && dirty1 && mid.length === before.length - 1 && same && !dirty2 ? "PASS" : "FAIL", `Ticked Series, footer Remove: dialogs open ${JSON.stringify(dlgs)}, rows ${before.length} -> ${mid.length}, dirty ${dirty0} -> ${dirty1}. Beacon entry ${JSON.stringify(rel)}. After Undo: order restored=${same}, Save dirty=${dirty2} (expected disabled: no net change).`, "TED-25");
  await c.ctx.close();
});
await b.close();
