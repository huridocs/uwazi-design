// TED-14, 22, 23, 26, 27, 28, 29 : order, priority sorting, removal impact, inherit guard, library follow-through (Sample)
import { launch, S, rec, wait, strip, shot, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, pickType, pickOpt, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, openEntityEdit, labelsIn, openDisplay, menuText, setView, facetTitles, cardsText, metaTab, addProp } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const confirmDlg = (p) => p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
const checkedSort = (p) => p.evaluate(() => { const m = [...document.querySelectorAll("[role=menu]")].find(e => !e.closest("[inert]")); if (!m) return null; return [...m.querySelectorAll("[role^=menuitem]")].filter(x => x.getAttribute("aria-checked") === "true").map(x => x.innerText.replace(/\s+/g, " ").trim()); });
const sortSection = (p) => p.evaluate(() => { const m = [...document.querySelectorAll("[role=menu]")].find(e => !e.closest("[inert]")); const t = m.innerText.replace(/\n+/g, " | "); const a = t.split("SORT BY | ")[1] || ""; return a.split(" | SHOW INFORMATION")[0].split(" | COLUMNS")[0].split(" | ").map(s => s.trim()); });

await guard("TED-14", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const names = await propNames(p);
  const prio0 = []; for (const n of names) if ((await rowPills(p, n)).includes("Priority sorting")) prio0.push(n);
  // baseline in the Library
  await toLibrary(p, "Court Case"); await openDisplay(p);
  const base = { sort: await sortSection(p), checked: await checkedSort(p) };
  await p.keyboard.press("Escape");
  // change: untick Priority sorting on Date filed, add QA Date with filter + priority
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await S(p).getByRole("button", { name: "Edit Date filed", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByRole("checkbox", { name: "Priority sorting" }).uncheck();
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  await addProp(p, { type: "Date", label: "QA Sort date", flags: ["Use as filter", "Priority sorting"] });
  await saveBtn(p).click(); await wait(p, 700);
  if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 700); }
  await openTemplate(p, "Court Case");
  const names1 = await propNames(p);
  const prio1 = []; for (const n of names1) if ((await rowPills(p, n)).includes("Priority sorting")) prio1.push(n);
  await p.getByRole("button", { name: "Cancel" }).last().click().catch(() => {}); await wait(p, 400);
  await toLibrary(p, "Court Case"); await openDisplay(p);
  const after = { sort: await sortSection(p), checked: await checkedSort(p) };
  await shot(p, "TED-14");
  const ok = prio1.every(n => after.sort.includes(n)) && !after.sort.includes("Date filed") === !prio1.includes("Date filed") && after.checked && after.checked.includes(prio1[0]) && !prio1.slice(1).some(n => after.checked.includes(n));
  rec("TED-14", ok ? "PASS" : "FAIL", `Court Case priority-sorting properties in template order before ${JSON.stringify(prio0)} (Library sort menu ${JSON.stringify(base.sort)}, checked ${JSON.stringify(base.checked)}). After unticking Date filed and adding "QA Sort date" (Date, filter + priority) and Save: priority properties ${JSON.stringify(prio1)}; Library single-template sort menu ${JSON.stringify(after.sort)}, checked ${JSON.stringify(after.checked)}; expected default = first priority property "${prio1[0]}".`, "TED-14");
  await c.ctx.close();
});

await guard("TED-22", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const before = await propNames(p);
  await S(p).getByRole("button", { name: "Move Victim down" }).click(); await wait(p, 250);
  await S(p).getByRole("button", { name: "Move Series up" }).click(); await wait(p, 250);
  const draft = await propNames(p);
  await saveBtn(p).click(); await wait(p, 800);
  await p.reload(); await wait(p, 1800);
  await openTemplate(p, "Court Case");
  const after = await propNames(p);
  await shot(p, "TED-22");
  rec("TED-22", JSON.stringify(after) === JSON.stringify(draft) && JSON.stringify(after) !== JSON.stringify(before) ? "PASS" : "FAIL", `Moved Victim down and Series up (draft order changed=${JSON.stringify(draft) !== JSON.stringify(before)}), Save, page reload, reopen Court Case: order equals the saved draft=${JSON.stringify(after) === JSON.stringify(draft)}. Positions: Victim ${before.indexOf("Victim")}->${after.indexOf("Victim")}, Series ${before.indexOf("Series")}->${after.indexOf("Series")}.`, "TED-22");
  await c.ctx.close();
});

await guard("TED-23", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  // move Status up past Country and Region so card/form order differs from the seed
  for (let i = 0; i < 4; i++) await S(p).getByRole("button", { name: "Move Status up" }).click();
  await wait(p, 300);
  const order = await propNames(p);
  const pills = {}; for (const n of order) pills[n] = await rowPills(p, n);
  const cardProps = order.filter(n => pills[n].includes("Show in cards"));
  await saveBtn(p).click(); await wait(p, 800);
  await toLibrary(p, "Court Case");
  const card = await p.locator("[data-component=EntityCard]").first().evaluate(e => ({ text: e.innerText.replace(/\s+/g, " ").trim(), lines: e.innerText.split("\n").map(x => x.trim()) }));
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
  const allLabels = uniq(order).map(n => n.toUpperCase());
  const cardSeq = uniq(card.lines.filter(l => allLabels.includes(l)));
  const expectSeq = uniq(cardProps.map(n => n.toUpperCase())).filter(n => cardSeq.includes(n));
  const cardOrdered = JSON.stringify(cardSeq) === JSON.stringify(expectSeq) && cardSeq.length >= 4;
  await openEntityEdit(p);
  const labels = (await labelsIn(p)).map(l => l.replace(/\*$/, ""));
  const names23 = uniq(order).filter(n => !["Title", "Date added", "Date modified"].includes(n));
  const formSeq = uniq(labels.filter(l => names23.includes(l)));
  const expectForm = names23.filter(n => formSeq.includes(n));
  const formOrdered = JSON.stringify(formSeq) === JSON.stringify(expectForm) && formSeq.length >= 10;
  await shot(p, "TED-23");
  rec("TED-23", cardOrdered && formOrdered && order.indexOf("Status") < order.indexOf("Country") ? "PASS" : "FAIL", `Moved Status up x4 (now before Country: order ${JSON.stringify(order.slice(3, 12))}), Save. Library card (first Court Case) lines in the order of the template's Show-in-cards properties=${cardOrdered} (card label sequence ${JSON.stringify(cardSeq)}, expected ${JSON.stringify(expectSeq)}); entity edit form labels follow property order=${formOrdered} (form property sequence ${JSON.stringify(formSeq.slice(0, 14))}, expected ${JSON.stringify(expectForm.slice(0, 14))}; the seed has two properties labelled "Respondent State", counted once).`, "TED-23");
  await c.ctx.close();
});

await guard("TED-26", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  // property with values: Status
  await S(p).getByRole("checkbox", { name: "Select Status", exact: true }).check();
  await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 400);
  await saveBtn(p).click(); await wait(p, 700);
  out.withValues = confirmDlg(p).count ? strip(await confirmDlg(p).first().innerText().catch(() => "")) : "";
  await shot(p, "TED-26");
  // Cancel keeps the draft
  await confirmDlg(p).first().getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
  out.afterCancelEditor = (await S(p).locator("#template-name-input").count()) === 1;
  out.afterCancelHasStatus = (await propNames(p)).includes("Status");
  // Confirm saves
  await saveBtn(p).click(); await wait(p, 700);
  await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800);
  await openTemplate(p, "Court Case");
  out.savedGone = !(await propNames(p)).includes("Status");
  await c.ctx.close();
  // property without values: a property added and saved with no entity values, then removed
  const c2 = await openEditor(b, "Court Case"); const q = c2.page;
  await addProp(q, { type: "Text", label: "QA Empty" });
  await saveBtn(q).click(); await wait(q, 800);
  await openTemplate(q, "Court Case");
  await S(q).getByRole("checkbox", { name: "Select QA Empty", exact: true }).check();
  await S(q).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(q, 300);
  await saveBtn(q).click(); await wait(q, 700);
  out.noValues = (await confirmDlg(q).count()) ? strip(await confirmDlg(q).first().innerText()) : "(no confirm shown)";
  await shot(q, "TED-26-novalues");
  const w = out.withValues;
  const nv = /No entity holds a value for it, so nothing is lost/.test(out.noValues);
  const ok = nv && /Removes .?Status.? from \d+ entit(y|ies) \(\d+ values?\)/.test(w) && /filter/.test(w) && /cards/.test(w) && /column/.test(w) && out.afterCancelEditor && !out.afterCancelHasStatus && out.savedGone;
  rec("TED-26", ok ? "PASS" : "FAIL", `Removed Status (has values) and clicked Save: confirm text "${w.slice(0, 400)}". Cancel keeps the editor open=${out.afterCancelEditor} and the draft without Status=${!out.afterCancelHasStatus}. Confirm Save: Status gone after reopening=${out.savedGone}. Property saved with no values ("QA Empty") then removed and Save: confirm "${out.noValues.slice(0, 300)}".`, "TED-26");
  await c2.ctx.close();
});

await guard("TED-27", async () => {
  const c = await openEditor(b, "Person"); const p = c.page;
  const names = (await propNames(p)).slice(3);
  const res = {};
  for (const n of names) {
    const cb = S(p).getByRole("checkbox", { name: "Select " + n, exact: true });
    if (!(await cb.count())) continue;
    await cb.check();
    await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 350);
    const d = confirmDlg(p);
    if (await d.count()) { res[n] = strip(await d.first().innerText()); if (!res.first) { res.first = n; await shot(p, "TED-27"); } await d.first().getByRole("button", { name: /Cancel|OK|Close|Remove/ }).first().click(); await wait(p, 300); }
    else { res[n] = "(removed)"; await p.locator("article", { hasText: n + " removed" }).getByRole("button", { name: /Undo/ }).evaluate(x => x.click()).catch(() => {}); await wait(p, 300); }
    // untick leftovers
    await cb.uncheck().catch(() => {});
  }
  const blocked = Object.entries(res).filter(([k, v]) => k !== "first" && v !== "(removed)");
  const free = Object.entries(res).filter(([k, v]) => k !== "first" && v === "(removed)");
  const msg = blocked[0] ? blocked[0][1] : "";
  const ok = blocked.length > 0 && /Properties can not be deleted because are being inherited: \[properties=/.test(msg) && /Court Case/.test(msg) && free.length > 0;
  rec("TED-27", ok ? "PASS" : "FAIL", `Person editor, each custom property ticked and Remove pressed: blocked ${JSON.stringify(blocked.map(([k, v]) => [k, v.slice(0, 330)]))}; removed freely (nobody inherits) ${JSON.stringify(free.map(x => x[0]))}. Chain-inherit half (a prototype-chain field's inheritPath) NOT DRIVEABLE: the only inheritPath fields, the Sample's "Judges' nationality" and CEJIL's Judge to País chain, project the target's Title, a common property that cannot be removed; in CEJIL every property of País (Código, Localización, Info Pais) was removable because nothing inherits them (ted-g.mjs).`, "TED-27");
  await c.ctx.close();
});

await guard("TED-28", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("checkbox", { name: "Select Petition filed", exact: true }).check();
  await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 300);
  await saveBtn(p).click(); await wait(p, 700);
  if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); }
  await toLibrary(p, "Court Case");
  await p.locator("[data-component=EntityCard]").first().click(); await wait(p, 900); await metaTab(p);
  const rec1 = (await p.locator("[data-part=field]").allInnerTexts()).map(strip);
  const inRecord = rec1.some(t => /Petition filed/i.test(t));
  await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 900);
  const labels = await labelsIn(p);
  const inForm = labels.some(l => /^Petition filed\*?$/.test(l));
  await shot(p, "TED-28");
  rec("TED-28", !inRecord && !inForm && labels.some(l => /^Case number/.test(l)) ? "PASS" : "FAIL", `Removed "Petition filed" (entities held values) and saved (confirm accepted). Entity record fields ${JSON.stringify(rec1.map(t => t.slice(0, 18)))} contain "Petition filed"=${inRecord}; edit form labels contain it=${inForm} (form still shows Case number).`, "TED-28");
  await c.ctx.close();
});

await guard("TED-29", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await toLibrary(p, "Court Case");
  // set a Library filter on the Case status facet and show the Status column
  const card = p.locator("[data-component=KeywordFacetCard]", { hasText: "Decided" }).first();
  await card.locator("[data-part=option]", { hasText: "Decided" }).first().click(); await wait(p, 800);
  const chips0 = await p.locator("[data-component=LibraryFilters] button[aria-label^='Remove filter']").evaluateAll(e => e.map(x => x.getAttribute("aria-label")));
  await setView(p, "List"); await openDisplay(p);
  const colsBefore = await menuText(p);
  await p.locator("[role=menuitemcheckbox]", { hasText: /^Status$/ }).first().click(); await wait(p, 400);
  await p.keyboard.press("Escape"); await wait(p, 300);
  const headersBefore = await p.locator("[role=columnheader]").allInnerTexts();
  await setView(p, "Cards"); await wait(p, 400);
  const cardBefore = (await cardsText(p))[0];
  const facetsBefore = await facetTitles(p);
  // remove Status in Settings
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await S(p).getByRole("checkbox", { name: "Select Status", exact: true }).check();
  await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 300);
  await saveBtn(p).click(); await wait(p, 700);
  if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); }
  await toLibrary(p, "Court Case");
  const chips1 = await p.locator("[data-component=LibraryFilters] button[aria-label^='Remove filter']").evaluateAll(e => e.map(x => x.getAttribute("aria-label")));
  const cardAfter = (await cardsText(p))[0];
  const facetsAfter = await facetTitles(p);
  const resultCount = strip(await p.locator("text=/\\d+ of \\d+ entities/").first().innerText().catch(() => ""));
  await setView(p, "List"); await openDisplay(p);
  const colsAfter = await menuText(p);
  const headersAfter = await p.locator("[role=columnheader]").allInnerTexts();
  await shot(p, "TED-29");
  const colGone = !/COLUMNS.*\| Status \|/.test(colsAfter);
  const stale = chips1.filter(x => /Status|Decided|Case status/i.test(x) && !/Court Case/.test(x));
  const ok = !/STATUS Decided/.test(cardAfter) && /STATUS/.test(cardBefore) && facetsBefore.filter(f => f === "Status").length === 2 && facetsAfter.filter(f => f === "Status").length === 1 && colGone && stale.length === 0 && headersBefore.some(h => /status/i.test(h)) && !headersAfter.some(h => /status/i.test(h));
  rec("TED-29", ok ? "PASS" : "FAIL", `Before: Library filter chips ${JSON.stringify(chips0)}, card has STATUS=${/STATUS/.test(cardBefore)}, facet titles ${JSON.stringify(facetsBefore)}, list headers ${JSON.stringify(headersBefore.map(strip))}. Removed Status in Settings + Save. After: card has STATUS=${/STATUS Decided/.test(cardAfter)}, facets ${JSON.stringify(facetsAfter)}, list column picker offers Status=${!colGone}, list headers ${JSON.stringify(headersAfter.map(strip))}, filter chips ${JSON.stringify(chips1)} (stale Status chip: ${JSON.stringify(stale)}), result count "${resultCount}".`, "TED-29");
  await c.ctx.close();
});
await b.close();
