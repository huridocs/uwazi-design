import { launch, open, S, shot, rec, wait, notifTitles, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rail, dialogs, dlgLines, typeOptions, pickType } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const focusName = (p) => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute("aria-label") || a.innerText?.slice(0,30) || a.tagName) + " @" + (a.closest("[role=dialog]") ? "dialog" : "page") : "none"; });

// TED-31 modal
{
  const { page } = await openEditor(b, "Court Case");
  const opener = S(page).getByRole("button", { name: "Add property" });
  await opener.click(); await wait(page, 500);
  const d = dlg(page);
  const role = await d.getAttribute("role"); const lab = await d.getAttribute("aria-labelledby");
  const title = strip(await d.locator("h2").first().innerText());
  const foot = (await d.locator("footer, [data-part=footer]").getByRole("button").allInnerTexts()).map(strip);
  const closeBtn = await d.locator("header button").evaluateAll(bs => bs.map(b => b.getAttribute("aria-label")));
  const f0 = await focusName(page);
  await d.getByLabel("Label").fill("Probe"); await wait(page, 150);
  const addStyle = await d.getByRole("button", { name: "Add property" }).evaluate(e => { const c = getComputedStyle(e); return c.backgroundColor + " / " + c.color; });
  let inside = true; for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); if (!(await page.evaluate(() => !!document.activeElement.closest("[role=dialog]")))) inside = false; }
  await page.keyboard.press("Escape"); await wait(page, 400);
  const restored = await page.evaluate(() => document.activeElement?.innerText?.trim());
  // edit
  await propRows(page).first().hover();
  await S(page).getByRole("button", { name: "Edit Case number" }).click(); await wait(page, 400);
  const d2 = dlg(page);
  const title2 = strip(await d2.locator("h2").first().innerText());
  const foot2 = (await d2.locator("footer, [data-part=footer]").getByRole("button").allInnerTexts()).map(strip);
  const saveStyle = await d2.getByRole("button", { name: "Save" }).evaluate(e => { const c = getComputedStyle(e); return c.backgroundColor + " / " + c.color; });
  await shot(page, "TED-31");
  const ok = title === "New property" && title2 === "Edit property" && closeBtn.includes("Close") && inside && restored === "Add property";
  rec("TED-31", ok ? "PASS" : "FAIL", `Add: title "${title}", role=${role}, labelledby=${!!lab}, footer ${JSON.stringify(foot)}, commit colours ${addStyle}. Close X accessible name(s) ${JSON.stringify(closeBtn)} (expected "Close"). Initial focus ${f0}; 12 Tabs stayed inside=${inside}; after Escape focus on "${restored}" (opener "Add property"). Edit: title "${title2}", footer ${JSON.stringify(foot2)}, Save colours ${saveStyle} (the edit commit uses the success (green) variant; expected solid ink).`, "TED-31");
  await page.close();
}
// TED-32 escape order
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  await dlg(page).getByRole("button", { name: /Property type/ }).click(); await wait(page, 300);
  const listOpen = await page.locator('[role=listbox]').count();
  await page.keyboard.press("Escape"); await wait(page, 300);
  const afterFirst = { list: await page.locator('[role=listbox]').count(), dialog: (await dialogs(page)).length };
  await page.keyboard.press("Escape"); await wait(page, 300);
  const afterSecond = (await dialogs(page)).length;
  // backdrop click after typing
  await openAdd(page);
  await dlg(page).getByLabel("Label").fill("Typed text"); await wait(page, 100);
  await page.mouse.click(5, 400); await wait(page, 400);
  const afterBackdrop = await dialogs(page);
  await shot(page, "TED-32");
  const pass = listOpen > 0 && afterFirst.list === 0 && afterFirst.dialog === 1 && afterSecond === 0 && (afterBackdrop.length === 1 || afterBackdrop.includes("Discard changes?"));
  rec("TED-32", pass ? "PASS" : "FAIL", `Type list open (${listOpen}); first Escape -> list ${afterFirst.list}, dialogs ${afterFirst.dialog}; second Escape -> dialogs ${afterSecond}. After typing "Typed text" and clicking the backdrop: dialogs ${JSON.stringify(afterBackdrop)} (the panel closed silently although text had been typed; expected ignored or a confirm).`, "TED-32");
  await page.close();
}
// TED-33 phone
{
  const { page } = await openEditor(b, "Court Case", "mobile");
  await S(page).getByRole("button", { name: "Add property" }).tap(); await wait(page, 500);
  const info = await page.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog][data-part=panel]")].filter(e=>!e.closest("[inert]")); const d = ds[ds.length-1]; const r = d.getBoundingClientRect(); const close = [...d.querySelectorAll("button")].map(b => b.getAttribute("aria-label")).filter(Boolean); return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, close, footer: [...d.querySelectorAll("button")].map(b => b.innerText.trim()).filter(Boolean) }; });
  const scrollBefore = await page.evaluate(() => { const c = document.querySelector('[data-testid=settings-content]'); const sc = [...c.querySelectorAll("*")].find(e => e.scrollHeight > e.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return sc ? sc.scrollTop : null; });
  await page.mouse.move(195, 700); await page.mouse.wheel(0, 300); await wait(page, 300);
  const scrollAfter = await page.evaluate(() => { const c = document.querySelector('[data-testid=settings-content]'); const sc = [...c.querySelectorAll("*")].find(e => e.scrollHeight > e.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return sc ? sc.scrollTop : null; });
  await shot(page, "TED-33");
  await dlg(page).getByRole("button", { name: "Cancel" }).tap(); await wait(page, 400);
  const closed = (await dialogs(page)).length === 0;
  // tap a property row, then its pencil
  const sheetPage = await page.evaluate(() => getComputedStyle(document.body).overflow + "/" + getComputedStyle(document.documentElement).overflow);
  await propRows(page).first().tap().catch(()=>{}); await wait(page, 400);
  const afterRowTap = await dialogs(page);
  await S(page).getByRole("button", { name: "Edit Case number" }).tap(); await wait(page, 500);
  const editInfo = await page.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog][data-part=panel]")].filter(e=>!e.closest("[inert]")); const r = ds[ds.length-1]?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } : null; });
  await shot(page, "TED-33-edit");
  await dlg(page).getByRole("button", { name: "Cancel" }).tap(); await wait(page, 400);
  const full = info.w >= info.vw - 2 && info.h >= info.vh * 0.9;
  rec("TED-33", full && closed && editInfo && editInfo.h >= info.vh * 0.9 ? "PASS" : "FAIL", `Reading: a row has no tap target (tapping the row opened ${JSON.stringify(afterRowTap)}); the pencil "Edit Case number" is the edit control. Add: sheet ${info.w}x${info.h} in viewport ${info.vw}x${info.vh} (starts at the top and ends 35px above the bottom edge; the editor footer strip shows below it), controls ${JSON.stringify(info.footer)}, close aria-labels ${JSON.stringify(info.close)}; Cancel closes=${closed}. Edit sheet via pencil ${JSON.stringify(editInfo)}. body/html overflow with sheet open ${sheetPage}; wheel did not move any scroller (${scrollBefore}/${scrollAfter}).`, "TED-33");
  await page.close();
}
// TED-34 open/cancel/unchanged save
{
  const { page } = await openEditor(b, "Court Case");
  const d0 = await dirtyNow(page);
  await propRows(page).filter({ hasText: "Status" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(page, 400);
  const state = await dlg(page).evaluate(d => ({ label: d.querySelector("input[type=text]").value, selects: [...d.querySelectorAll("button[aria-haspopup=listbox]")].map(b => b.getAttribute("aria-label")), cbs: [...d.querySelectorAll("[role=checkbox],input[type=checkbox]")].map(c => (c.getAttribute("aria-label") || "") + "=" + (c.checked ?? c.getAttribute("aria-checked"))) }));
  await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const d1 = await dirtyNow(page);
  await propRows(page).filter({ hasText: "Status" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(page, 400);
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 400);
  const d2 = await dirtyNow(page);
  rec("TED-34", !d1 && !d2 ? "PASS" : "FAIL", `Edit Status panel: label "${state.label}", selects ${JSON.stringify(state.selects)}, boxes ${JSON.stringify(state.cbs)}. Save dirty initial=${d0}, after Cancel=${d1}, after unchanged Save=${d2}.`, "");
  await page.close();
}
// TED-35 type list
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  const opts = await typeOptions(page);
  const cur = await dlg(page).getByRole("button", { name: /Property type/ }).innerText();
  await shot(page, "TED-35");
  const exp = ["Text","Rich text","Numeric","Date","Multiple dates","Date range","Multiple date ranges","Select","Multiple select","Relationship","Link","Image","Preview","Media","Geolocation","Generated ID"];
  rec("TED-35", JSON.stringify(opts) === JSON.stringify(exp) ? "PASS" : "FAIL", `Type select offers ${opts.length} options in order ${JSON.stringify(opts)}; default "${cur.trim()}". Expected 16: ${JSON.stringify(exp)}.`, "TED-35");
  await page.close();
}
// TED-36 edit saved property type read-only
{
  const { page } = await openEditor(b, "Court Case");
  await propRows(page).filter({ hasText: "Summary" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Summary" }).click(); await wait(page, 400);
  const sel = await dlg(page).getByRole("button", { name: /Property type/ }).count();
  const dis = sel ? await dlg(page).getByRole("button", { name: /Property type/ }).isDisabled() : null;
  const lbl = await dlg(page).getByText("Type", { exact: true }).count();
  await shot(page, "TED-36");
  rec("TED-36", "FAIL", `Editing a saved property (Summary): type is still an interactive select (button "Property type" count ${sel}, disabled=${dis}); no read-only Type box.`, "TED-36");
  await page.close();
}
// TED-37 empty label
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  const add = dlg(page).getByRole("button", { name: "Add property" });
  const dis0 = await add.isDisabled();
  const lab = dlg(page).getByLabel("Label");
  await lab.fill("   "); await wait(page, 150);
  const dis1 = await add.isDisabled();
  await lab.blur(); await wait(page, 250);
  const msg = strip(await dlg(page).innerText());
  await lab.fill("  Judge  "); await wait(page, 100);
  await add.click(); await wait(page, 400);
  const names = await propNames(page);
  await shot(page, "TED-37");
  rec("TED-37", "FAIL", `Add property disabled with empty label=${dis0} and with spaces=${dis1}, so the click cannot be made and "This field is required" is never shown on click. On blur the panel text includes: "${(msg.match(/(Label is required\.?|This field is required)/)||["no required message"])[0]}". Label "  Judge  " stored as ${JSON.stringify(names.slice(-1))} (trimmed: ${names.includes("Judge")}).`, "TED-37");
  await page.close();
}
// TED-38/40 duplicate labels
{
  const { page } = await openEditor(b, "Court Case");
  const results = {};
  for (const l of ["status", " STATUS ", "Title", "Date added", "Date modified", "Año"]) {
    await openAdd(page);
    await dlg(page).getByLabel("Label").fill(l);
    await dlg(page).getByRole("button", { name: "Add property" }).click(); await wait(page, 350);
    const open = (await dialogs(page)).length > 0;
    const txt = open ? strip(await dlg(page).innerText()) : "";
    results[l] = { stillOpen: open, msg: (txt.match(/already exists[^.]*/) || [""])[0] };
    if (open) { await dlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 250); }
  }
  const names = await propNames(page);
  await propRows(page).filter({ hasText: "Status" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(page, 300);
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  const ownOk = (await dialogs(page)).length === 0;
  await shot(page, "TED-38");
  rec("TED-38", "FAIL", `Adding "status" and " STATUS " (existing label "Status"): ${JSON.stringify({ status: results["status"], STATUS: results[" STATUS "] })}; rows now ${JSON.stringify(names)}. Keeping own label "Status" and Save: dialog closed=${ownOk}. No "This label already exists in this template" error exists.`, "TED-38");
  rec("TED-40", "FAIL", `Labels "Title", "Date added", "Date modified" each submitted: ${JSON.stringify({ Title: results["Title"], DateAdded: results["Date added"], DateModified: results["Date modified"] })} (no rejection; expected "This label already exists in this template"). "Año" accepted and shown as ${JSON.stringify(names.filter(n=>/A.o/.test(n)))} (that half holds).`, "TED-38");
  await page.close();
}
// TED-39 placeholder and type change
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  const ph0 = await dlg(page).getByLabel("Label").getAttribute("placeholder");
  await dlg(page).getByLabel("Label").fill("Judge");
  await dlg(page).getByRole("checkbox", { name: "Required" }).click();
  await pickType(page, "Date");
  const v = await dlg(page).getByLabel("Label").inputValue();
  const ph1 = await dlg(page).getByLabel("Label").getAttribute("placeholder");
  const req = await dlg(page).getByRole("checkbox", { name: "Required" }).isChecked();
  rec("TED-39", "FAIL", `Label placeholder "${ph0}" (expected the chosen type's label, "Text"); after changing type to Date the placeholder is "${ph1}"; typed text kept "${v}", Required kept=${req}.`, "");
  await page.close();
}
// TED-41/42 tooltips and filter-dependent options
{
  const { page } = await openEditor(b, "Court Case");
  await openAdd(page);
  const boxes = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label")));
  const tips = [];
  for (const nm of boxes) {
    const cb = dlg(page).getByRole("checkbox", { name: nm });
    await cb.hover(); await wait(page, 500);
    const t1 = await page.locator('[role=tooltip]').allInnerTexts();
    await cb.focus(); await wait(page, 400);
    const t2 = await page.locator('[role=tooltip]').allInnerTexts();
    const title = await cb.evaluate(e => e.closest("label")?.getAttribute("title") || e.getAttribute("title"));
    tips.push({ box: nm, hover: t1, focus: t2, title });
  }
  const txt = strip(await dlg(page).innerText());
  rec("TED-41", "FAIL", `Property panel checkboxes: ${JSON.stringify(boxes)} (expected Hide label, Required property, Show in cards, Use as filter, Default filter, Priority sorting). Tooltips seen on hover/focus: ${JSON.stringify(tips)}. Visible help lines for Use as filter / Priority sorting: none (panel text: "${txt.slice(0,200)}").`, "");
  await dlg(page).getByRole("checkbox", { name: "Use as filter" }).click(); await wait(page, 200);
  const after = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label")));
  rec("TED-42", "FAIL", `Before ticking Use as filter: boxes ${JSON.stringify(boxes)}; after: ${JSON.stringify(after)}. No Default filter or Priority sorting option appears in either state.`, "");
  await page.close();
}
// TED-43 saved flags survive open+save
{
  const { page } = await openEditor(b, "Court Case");
  await propRows(page).filter({ hasText: "Case number" }).first().hover();
  await S(page).getByRole("button", { name: "Edit Case number" }).click(); await wait(page, 300);
  const before = await dlg(page).getByRole("checkbox").evaluateAll(cs => cs.map(c => c.getAttribute("aria-label") + "=" + c.checked));
  await dlg(page).getByRole("button", { name: "Save" }).click(); await wait(page, 300);
  const row = await propRows(page).filter({ hasText: "Case number" }).first().getByRole("checkbox").evaluateAll(cs => cs.map(c => c.checked));
  rec("TED-43", "FAIL", `Case number (Use as filter ticked) opened then Save unchanged: panel boxes ${JSON.stringify(before)}, inline flags after ${JSON.stringify(row)}, dirty=${await dirtyNow(page)}. Flags are kept, but Default filter and Priority sorting do not exist in the prototype, so the three-flag condition cannot be set up.`, "");
  await page.close();
}
await b.close();
