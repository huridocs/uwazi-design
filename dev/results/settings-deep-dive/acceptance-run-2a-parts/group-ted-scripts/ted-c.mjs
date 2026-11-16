import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, strip, tipText, errs, pickType, typeOptions, fieldSeq, tickAll, sameCols, pickOpt, rowPills, rowType, rail, dialogs, footerBtn } from "./ted-common.mjs";
const b = await launch();
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const guard = async (id, fn) => { if (ONLY && !ONLY.includes(id)) return; try { await fn(); } catch (e) { { console.error(e.stack.split("\n").slice(0,4).join(" / ").slice(0,500)); rec(id, "FAIL", "Script error while driving: " + String(e.message).split("\n")[0].slice(0, 300)); }; } };
const panelSel = "[role=dialog][data-part=panel]:not([inert]):not([inert] *)";
const lab = (d) => d.getByLabel("Label", { exact: true });
const addBtn = (d) => d.getByRole("button", { name: "Add property" });

// TED-30
await guard("TED-30", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const addBox = await S(p).getByRole("button", { name: "Add property" }).boundingBox();
  const tbl = await propRows(p).first().boundingBox();
  const foot = (await S(p).locator("footer").getByRole("button").allInnerTexts()).map(s => s.trim()).filter(Boolean);
  const extra = await S(p).getByRole("button", { name: /Add thesaurus|Add relationship type/ }).allInnerTexts();
  const extraY = await S(p).getByRole("button", { name: "Add thesaurus" }).boundingBox();
  await shot(p, "TED-30");
  rec("TED-30", addBox.y < tbl.y && JSON.stringify(foot) === JSON.stringify(["Cancel", "Save"]) && extra.length === 2 ? "PASS" : "FAIL", `"Add property" y=${Math.round(addBox.y)} above first row y=${Math.round(tbl.y)}. Footer buttons ${JSON.stringify(foot)} (the footer also carries the last-saved line). "Add thesaurus"/"Add relationship type" reachable in the editor: ${JSON.stringify(extra.map(strip))} below the table (y ${Math.round(extraY.y)}).`, "TED-30");
  await c.ctx.close();
});

// TED-31
await guard("TED-31", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  const opener = S(p).getByRole("button", { name: "Add property" });
  await opener.click(); await wait(p, 400);
  const d = dlg(p);
  out.title = strip(await d.locator("h2,h3").first().innerText().catch(() => ""));
  out.role = await d.getAttribute("role"); out.name = await d.getAttribute("aria-label") || await d.getAttribute("aria-labelledby");
  out.close = await d.getByRole("button", { name: "Close" }).count();
  out.namedDialog = await p.getByRole("dialog", { name: "New property" }).count();
  out.footer = (await d.getByRole("button").allInnerTexts()).map(strip).filter(x => /Cancel|Add property|Save/.test(x));
  out.width = Math.round((await d.boundingBox()).width);
  out.focusIn = await p.evaluate((s) => document.querySelector(s)?.contains(document.activeElement), panelSel);
  const commit = await d.getByRole("button", { name: "Add property" }).evaluate(b => { const c = getComputedStyle(b); return c.backgroundColor + " / " + c.color; });
  out.commit = commit;
  out.ink = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--text-primary"));
  let stay = true;
  for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); if (!(await p.evaluate((s) => document.querySelector(s)?.contains(document.activeElement), panelSel))) { stay = false; break; } }
  out.tabStays = stay;
  await shot(p, "TED-31");
  await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
  out.refocus = await p.evaluate(() => document.activeElement?.innerText?.trim() || document.activeElement?.getAttribute("aria-label"));
  // edit
  const ed = S(p).getByRole("button", { name: "Edit Case number", exact: true });
  await ed.click(); await wait(p, 400);
  const d2 = dlg(p);
  out.title2 = strip(await d2.locator("h2,h3").first().innerText().catch(() => ""));
  out.footer2 = (await d2.getByRole("button").allInnerTexts()).map(strip).filter(x => /Cancel|Add property|Save/.test(x));
  await p.keyboard.press("Escape"); await wait(p, 400);
  out.refocus2 = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  const ok = out.title === "New property" && out.title2 === "Edit property" && JSON.stringify(out.footer) === JSON.stringify(["Cancel", "Add property"]) && JSON.stringify(out.footer2) === JSON.stringify(["Cancel", "Save"]) && out.close === 1 && out.namedDialog === 1 && out.role === "dialog" && !!out.name && out.focusIn && out.tabStays && /Add property/.test(out.refocus) && out.refocus2 === "Edit Case number" && out.width <= 560;
  rec("TED-31", ok ? "PASS" : "FAIL", JSON.stringify(out), "TED-31");
  await c.ctx.close();
});

// TED-32
await guard("TED-32", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p);
  const d = dlg(p);
  await pickType(p, "Select");
  await d.getByRole("button", { name: /^Property type/ }).click(); await wait(p, 300);
  const listOpen0 = await p.locator("[role=listbox]").count();
  await p.keyboard.press("Escape"); await wait(p, 300);
  const listOpen1 = await p.locator("[role=listbox]").count();
  const panel1 = await p.locator(panelSel).count();
  await p.keyboard.press("Escape"); await wait(p, 400);
  const panel2 = await p.locator(panelSel).count();
  // scrim click after typing
  await openAdd(p);
  await lab(dlg(p)).fill("QA scrim"); await wait(p, 200);
  await p.mouse.click(5, 5); await wait(p, 400);
  const afterScrim = await p.locator(panelSel).count();
  const kept = afterScrim ? await lab(dlg(p)).inputValue() : null;
  const dlgs = await dialogs(p);
  await shot(p, "TED-32");
  rec("TED-32", listOpen0 === 1 && listOpen1 === 0 && panel1 === 1 && panel2 === 0 && afterScrim === 1 && kept === "QA scrim" ? "PASS" : "FAIL", `Type select open (listbox ${listOpen0}); first Escape: list ${listOpen1}, panel still open=${panel1}; second Escape: panel open=${panel2}. After typing "QA scrim", click on the backdrop: panel open=${afterScrim}, text kept=${kept}, dialogs ${JSON.stringify(dlgs)} (ignored, no silent close).`, "TED-32");
  await c.ctx.close();
});

// TED-34
await guard("TED-34", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("checkbox", { name: "Status required", exact: true }).click(); await wait(p, 200);
  await saveBtn(p).click(); await wait(p, 700);
  const conf = p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
  if (await conf.count()) { await p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]").getByRole("button", { name: "Save" }).click(); await wait(p, 600); }
  await S(p).locator("[role=row]", { hasText: "Court Case" }).first().click(); await wait(p, 600);
  const dirty0 = await dirtyNow(p);
  await S(p).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(p, 400);
  const d = dlg(p);
  const st = await d.evaluate(e => ({ type: e.querySelector("[data-part=type-box]")?.innerText.replace(/\s+/g, " "), label: [...e.querySelectorAll("input[type=text]")].map(i => i.value)[0], thes: [...e.querySelectorAll("button")].map(b => b.getAttribute("aria-label")).find(x => /^Thesaurus:/.test(x || "")), flags: [...e.querySelectorAll("[data-part=flags] input")].map(i => [i.getAttribute("aria-label"), i.checked].join("=")) }));
  await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  const dirty1 = await dirtyNow(p);
  await S(p).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 400);
  const dirty2 = await dirtyNow(p);
  await shot(p, "TED-34");
  await S(p).getByRole("button", { name: "Edit Country", exact: true }).click(); await wait(p, 400);
  const cty = { saveDisabled: await dlg(p).getByRole("button", { name: "Save" }).isDisabled(), alert: strip(await dlg(p).locator("[role=alert]").first().innerText().catch(() => "")) };
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  const ok = /Select/.test(st.type) && st.label === "Status" && /Case status/.test(st.thes) && st.flags.includes("Required property=true") && st.flags.includes("Show in cards=true") && !dirty0 && !dirty1 && !dirty2;
  rec("TED-34", ok ? "PASS" : "FAIL", `After saving Required on Status and reopening the template: panel shows ${JSON.stringify(st)}. Save enabled after reopen ${dirty0}; after Cancel ${dirty1}; after reopening the panel and clicking Save unchanged ${dirty2} (all expected false). Seed note: the saved Country property (Select) cannot be re-saved unchanged: ${JSON.stringify(cty)} (Person has a Text property labelled Country).`, "TED-34");
  await c.ctx.close();
});

// TED-35 / 36
await guard("TED-35", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p);
  const d = dlg(p);
  const L16 = ["Text", "Rich text", "Numeric", "Date", "Multiple dates", "Date range", "Multiple date ranges", "Select", "Multiple select", "Relationship", "Link", "Image", "Preview", "Media", "Geolocation", "Generated ID"];
  const def = await d.getByRole("button", { name: /^Property type/ }).getAttribute("aria-label");
  const opts = await typeOptions(p);
  await p.keyboard.press("Escape"); await wait(p, 200);
  const req = await d.evaluate(e => { const l = [...e.querySelectorAll("label")].find(x => /Property type/.test(x.innerText)); return { text: l?.innerText, aria: e.querySelector('[aria-label^="Property type"]')?.getAttribute("aria-required") }; });
  const hasEmpty = opts.some(o => o === "" || /Select\.\.\./.test(o));
  rec("TED-35", JSON.stringify(opts) === JSON.stringify(L16) && /Text$/.test(def) && !opts.includes("Violated articles") && !hasEmpty ? "PASS" : "FAIL", `Property type options (${opts.length}): ${JSON.stringify(opts)}; default "${def}"; no "Violated articles"; no empty option, so a type is always selected (label ${JSON.stringify(req)}).`, "");
  await c.ctx.close();
});
await guard("TED-36", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Edit Country", exact: true }).click(); await wait(p, 400);
  const d = dlg(p);
  const box = await d.locator("[data-part=type-box]").evaluate(e => ({ text: e.innerText.replace(/\s+/g, " "), svg: !!e.querySelector("svg"), tag: e.tagName, interactive: !!e.querySelector("button,select,input") }));
  const sel = await d.getByRole("button", { name: /^Property type/ }).count();
  const tableType = await rowType(p, "Country");
  await shot(p, "TED-36");
  rec("TED-36", /^Type Select$/.test(box.text) && box.svg && !box.interactive && sel === 0 && tableType === "Select" ? "PASS" : "FAIL", `Edit Country: type box "${box.text}", icon=${box.svg}, interactive control inside=${box.interactive}, Property type select present=${sel}; table Type cell "${tableType}".`, "TED-36");
  await c.ctx.close();
});

// TED-37
await guard("TED-37", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p);
  const d = dlg(p);
  await addBtn(d).click(); await wait(p, 300);
  const m1 = strip(await d.innerText()).includes("This field is required");
  const open1 = await p.locator(panelSel).count();
  await lab(d).fill("   "); await addBtn(d).click(); await wait(p, 300);
  const m2 = strip(await d.innerText()).includes("This field is required");
  const inv = await lab(d).getAttribute("aria-invalid");
  await shot(p, "TED-37");
  await lab(d).fill("  Judge  "); await addBtn(d).click(); await wait(p, 400);
  const al = await p.evaluate(() => [...document.querySelectorAll('[data-testid=settings-content] button[aria-label^="Edit "]')].map(b => b.getAttribute("aria-label")).filter(x => /Judge/.test(x)));
  const txt = await propNames(p);
  rec("TED-37", m1 && m2 && open1 === 1 && inv === "true" && al.length === 1 && al[0] === "Edit Judge" ? "PASS" : "FAIL", `Empty label + Add property: "This field is required"=${m1}, panel stayed open=${open1 === 1}. Spaces only: message=${m2}, aria-invalid=${inv}. "  Judge  " stored as aria-label ${JSON.stringify(al)}, row text ${JSON.stringify(txt.filter(x => /Judge/.test(x)))}.`, "TED-37");
  await c.ctx.close();
});

// TED-38
await guard("TED-38", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  for (const l of ["status", " STATUS "]) {
    await openAdd(p); const d = dlg(p);
    await lab(d).fill(l); await addBtn(d).click(); await wait(p, 300);
    out[l] = strip(await d.innerText()).includes("This label already exists in this template");
    if (l === "status") await shot(p, "TED-38");
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  }
  await S(p).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(p, 400);
  const d = dlg(p);
  await d.getByRole("checkbox", { name: "Hide label" }).check();
  await d.getByRole("button", { name: "Save" }).click(); await wait(p, 400);
  const open = await p.locator(panelSel).count();
  const pills = await rowPills(p, "Status");
  rec("TED-38", out["status"] && out[" STATUS "] && open === 0 && pills.includes("No label") ? "PASS" : "FAIL", `Add "status": rejected=${out["status"]}; add " STATUS ": rejected=${out[" STATUS "]} (message "This label already exists in this template"). Editing existing "Status" with its own label kept and Hide label ticked saved: panel closed=${open === 0}, pills ${JSON.stringify(pills)}.`, "TED-38");
  await c.ctx.close();
});

// TED-39
await guard("TED-39", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  const ph = await lab(d).getAttribute("placeholder"); const v0 = await lab(d).inputValue();
  await lab(d).fill("Judge");
  await d.getByRole("checkbox", { name: "Use as filter" }).check();
  await d.getByRole("checkbox", { name: "Priority sorting" }).check();
  await d.getByRole("checkbox", { name: "Required property" }).check();
  await d.getByRole("checkbox", { name: "Show in cards" }).check();
  await pickType(p, "Date");
  const a = { label: await lab(d).inputValue(), ph: await lab(d).getAttribute("placeholder"), flags: await d.locator("[data-part=flags] input:checked").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label"))) };
  await pickType(p, "Link");
  const l = { label: await lab(d).inputValue(), ph: await lab(d).getAttribute("placeholder"), flags: await d.locator("[data-part=flags] input:checked").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label"))), filterShown: await d.getByRole("checkbox", { name: "Use as filter" }).count() };
  await pickType(p, "Geolocation");
  const g = { flags: await d.locator("[data-part=flags] input:checked").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label"))) };
  await shot(p, "TED-39");
  const ok = v0 === "" && ph === "Text" && a.label === "Judge" && a.ph === "Date" && a.flags.includes("Priority sorting") && a.flags.includes("Use as filter") && a.flags.includes("Required property") && l.label === "Judge" && l.ph === "Link" && !l.flags.includes("Use as filter") && !l.flags.includes("Priority sorting") && l.flags.includes("Required property") && l.flags.includes("Show in cards");
  rec("TED-39", ok ? "PASS" : "FAIL", `Initial Label value "${v0}" placeholder "${ph}". After typing "Judge", ticking filter/priority/required/cards and switching to Date: label "${a.label}", placeholder "${a.ph}", flags kept ${JSON.stringify(a.flags)}. Switch to Link: label "${l.label}", placeholder "${l.ph}", flags ${JSON.stringify(l.flags)} (filter and priority cleared, required and cards kept). Geolocation: ${JSON.stringify(g.flags)}.`, "TED-39");
  await c.ctx.close();
});

// TED-40
await guard("TED-40", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  for (const l of ["Title", "Date added", "Date modified"]) {
    await openAdd(p); const d = dlg(p);
    await lab(d).fill(l); await addBtn(d).click(); await wait(p, 300);
    out[l] = strip(await d.innerText()).includes("This label already exists in this template");
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  }
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("Año"); await addBtn(d).click(); await wait(p, 400);
  const names = await propNames(p);
  await shot(p, "TED-40");
  rec("TED-40", Object.values(out).every(x => x) && names.includes("Año") ? "PASS" : "FAIL", `Rejected with "This label already exists in this template": ${JSON.stringify(out)}. "Año" accepted and shown as ${JSON.stringify(names.filter(n => /A.o/.test(n)))}.`, "TED-40");
  await c.ctx.close();
});

// TED-41
await guard("TED-41", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await d.getByRole("checkbox", { name: "Use as filter" }).check();
  const T = { "Hide label": "This property will be shown without the label", "Required property": "You won't be able to save an entity if this property is empty.", "Show in cards": "This property will appear in the library cards as part of the basic info.", "Use as filter": "This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering.", "Default filter": "This property will be the default filter in the library for this template." };
  const res = {};
  for (const [k, v] of Object.entries(T)) {
    const btn = d.getByRole("button", { name: "About " + k, exact: true });
    const h = await tipText(p, btn); const f = await tipText(p, btn, "focus");
    res[k] = h.includes(v) && f.includes(v);
    if (!res[k]) res[k + "_got"] = [h, f];
  }
  const txt = await d.innerText();
  const vis = { filter: txt.includes(T["Use as filter"]), prio: txt.includes("Properties marked as priority sorting will be used as default sorting criteria.") };
  const noVisible = !txt.includes(T["Hide label"]) && !txt.includes(T["Required property"]);
  rec("TED-41", Object.entries(res).filter(([k]) => !k.endsWith("_got")).every(([, v]) => v) && vis.filter && vis.prio ? "PASS" : "FAIL", `Tooltip text on hover and keyboard focus equals the Uwazi text for ${JSON.stringify(Object.fromEntries(Object.entries(res).filter(([k]) => !k.endsWith("_got"))))}. Visible help lines: Use as filter=${vis.filter}, Priority sorting=${vis.prio}; others tooltip-only=${noVisible}. ${JSON.stringify(Object.fromEntries(Object.entries(res).filter(([k]) => k.endsWith("_got")))).slice(0, 300)}`, "");
  await c.ctx.close();
});

// TED-42 / 43
await guard("TED-42", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("QA T42");
  const n = async (x) => d.getByRole("checkbox", { name: x }).count();
  const before = { def: await n("Default filter"), pri: await n("Priority sorting") };
  await d.getByRole("checkbox", { name: "Use as filter" }).check();
  const after = { def: await n("Default filter"), pri: await n("Priority sorting"), defOn: await d.getByRole("checkbox", { name: "Default filter" }).isChecked(), priOn: await d.getByRole("checkbox", { name: "Priority sorting" }).isChecked() };
  await d.getByRole("checkbox", { name: "Default filter" }).check(); await d.getByRole("checkbox", { name: "Priority sorting" }).check();
  await d.getByRole("checkbox", { name: "Use as filter" }).uncheck(); await wait(p, 200);
  const off = { def: await n("Default filter"), pri: await n("Priority sorting") };
  await d.getByRole("checkbox", { name: "Use as filter" }).check();
  const back = { defOn: await d.getByRole("checkbox", { name: "Default filter" }).isChecked(), priOn: await d.getByRole("checkbox", { name: "Priority sorting" }).isChecked() };
  await d.getByRole("checkbox", { name: "Use as filter" }).uncheck();
  await addBtn(d).click(); await wait(p, 400);
  const pills = await rowPills(p, "QA T42");
  rec("TED-42", before.def === 0 && before.pri === 0 && after.def === 1 && after.pri === 1 && !after.defOn && !after.priOn && off.def === 0 && off.pri === 0 && !back.defOn && !back.priOn && pills.length === 0 ? "PASS" : "FAIL", `Before ticking Use as filter: Default filter/Priority sorting present ${JSON.stringify(before)}. After: ${JSON.stringify(after)} (both unticked). Ticked both, then unticked Use as filter: ${JSON.stringify(off)}; re-ticking filter shows them cleared ${JSON.stringify(back)}. Added row pills ${JSON.stringify(pills)}.`, "");
  await c.ctx.close();
});
await guard("TED-43", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  // Date filed has filter + priority sorting; add default filter first
  await S(p).getByRole("button", { name: "Edit Date filed", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByRole("checkbox", { name: "Default filter" }).check();
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  const p0 = await rowPills(p, "Date filed");
  await S(p).getByRole("button", { name: "Edit Date filed", exact: true }).click(); await wait(p, 400);
  const flags = await dlg(p).locator("[data-part=flags] input").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label") + "=" + c.checked));
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  const p1 = await rowPills(p, "Date filed");
  rec("TED-43", ["Use as filter", "Default filter", "Priority sorting"].every(x => p0.includes(x) && p1.includes(x)) && flags.includes("Use as filter=true") && flags.includes("Default filter=true") && flags.includes("Priority sorting=true") ? "PASS" : "FAIL", `Date filed with all three flags: pills before reopening ${JSON.stringify(p0)}; panel on reopen ${JSON.stringify(flags)}; pills after Save unchanged ${JSON.stringify(p1)}.`, "");
  await c.ctx.close();
});
await b.close();
