// TED-78..84 : flags reach the record, form, cards, list columns and Library filters (Sample, Court Case)
import { launch, S, rec, wait, strip, shot, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, pickType, pickOpt, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, openEntityEdit, labelsIn, openDisplay, menuText, setView, facetTitles, cardsText, metaTab, addProp, createEntity, saveTemplate } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const confirmDlg = (p) => p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
const save = async (p) => { await saveBtn(p).click(); await wait(p, 700); if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); } };
const flag = async (p, prop, name, on = true) => { await S(p).getByRole("button", { name: "Edit " + prop, exact: true }).click(); await wait(p, 400); const cb = dlg(p).getByRole("checkbox", { name, exact: true }); if (on) await cb.check(); else await cb.uncheck(); await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300); };
const hdrHidden = (p) => p.locator("[data-part=field]").first().locator("header").evaluate(h => { const r = h.getBoundingClientRect(); return /sr-only/.test(h.className) || (r.width <= 1 && r.height <= 1); });
const recFields = async (p, idx = 0) => { await p.locator("[data-component=EntityCard]").nth(idx).click(); await wait(p, 900); await metaTab(p); return (await p.locator("[data-part=field]").allInnerTexts()).map(strip); };

await guard("TED-78", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await flag(p, "Case number", "Hide label"); await save(p);
  await toLibrary(p, "Court Case");
  const f1 = await recFields(p);
  const hdr1 = await hdrHidden(p);
  await shot(p, "TED-78");
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await flag(p, "Case number", "Hide label", false); await save(p);
  await toLibrary(p, "Court Case");
  const f2 = await recFields(p);
  const hdr2 = await hdrHidden(p);
  const first1 = f1[0], first2 = f2[0];
  const hidden = /11\.481/.test(first1) && hdr1 === true;
  const back = /CASE NUMBER/i.test(first2) && /11\.481/.test(first2) && hdr2 === false;
  rec("TED-78", hidden && back ? "PASS" : "FAIL", `Case number with Hide label ticked and Save: first record field: value "11.481" shown, its label header is screen-reader-only (visually hidden)=${hdr1} (text content "${first1.replace(/\n/g, " ")}" includes the sr-only name). Unticked and Save: label visible again=${!hdr2} ("${first2.replace(/\n/g, " ")}").`, "TED-78");
  await c.ctx.close();
});

await guard("TED-79", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await flag(p, "Victim", "Required property");
  await saveBtn(p).click(); await wait(p, 700);
  const note = (await confirmDlg(p).count()) ? strip(await confirmDlg(p).first().innerText()) : "(no confirm shown)";
  if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); }
  await openTemplate(p, "Court Case");
  const pills = await rowPills(p, "Victim");
  await p.getByRole("button", { name: "Cancel" }).last().click().catch(() => {}); await wait(p, 400);
  await toLibrary(p, "Court Case");
  await createEntity(p, "Court Case");
  const star = (await labelsIn(p)).filter(l => /^Victim/.test(l));
  await p.getByLabel(/^Title\*?$/).first().fill("QA required entity");
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1200);
  const stillEditing = await p.getByLabel("Victim", { exact: false }).count();
  const msgs = (await p.locator("[role=alert],[role=status],[data-component=FieldMessage]").allInnerTexts()).map(strip).filter(Boolean);
  const invalid = stillEditing ? await p.getByLabel("Victim", { exact: false }).first().getAttribute("aria-invalid") : null;
  await shot(p, "TED-79");
  let after = "n/a";
  if (stillEditing) { await p.getByLabel("Victim", { exact: false }).first().fill("Some victim"); await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1200); after = (await p.getByLabel("Victim", { exact: false }).count()) === 0 ? "saved" : "still open"; }
  const ok = /\d+ entit(y|ies) will need a value/.test(note) && stillEditing > 0 && (invalid === "true" || msgs.some(m => /Victim/.test(m))) && after === "saved";
  rec("TED-79", ok ? "PASS" : "FAIL", `Victim ticked Required (pills after save ${JSON.stringify(pills)}) + Save: confirm note "${note.slice(0, 260)}". New Court Case form: Victim label shown as ${JSON.stringify(star)} (an asterisk would mark it required). Title and Description filled, Victim left empty, Save: form still open=${stillEditing > 0}; aria-invalid=${invalid}; messages ${JSON.stringify(msgs.slice(0, 3))}. After filling Victim and Save: ${after}.`, "TED-79");
  await c.ctx.close();
});

await guard("TED-80", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  // Place of the incident holds a value for one entity; add a Rich text property with cards and give one entity a value
  await flag(p, "Place of the incident", "Show in cards");
  await addProp(p, { type: "Rich text", label: "QA Rich cards", flags: ["Show in cards"] });
  await save(p);
  await toLibrary(p, "Court Case");
  const texts = await cardsText(p);
  const holder = texts.findIndex(t => /PLACE OF THE INCIDENT/i.test(t));
  const hasQa = texts.some(t => /QA RICH CARDS/i.test(t));
  await createEntity(p, "Court Case");
  await p.getByLabel(/^Title\*?$/).first().fill("QA rich entity");
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  await p.getByLabel("QA Rich cards", { exact: true }).fill("Some **bold** text");
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  await p.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {}); await wait(p, 500);
  const texts2 = await cardsText(p);
  const mine = texts2.find(t => /QA rich entity/.test(t)) || "";
  const richOnCard = /QA RICH CARDS|bold/i.test(mine) || texts2.some(t => /QA RICH CARDS/i.test(t));
  const lineCard = holder >= 0 ? await p.locator("[data-component=EntityCard]").nth(holder).evaluate(e => e.innerText.split("\\n").map(x => x.trim()).filter(Boolean)) : [];
  const before = lineCard.join(" | ");
  await shot(p, "TED-80");
  // untick
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await flag(p, "Place of the incident", "Show in cards", false); await save(p);
  await toLibrary(p, "Court Case");
  const texts3 = await cardsText(p);
  const gone = !texts3.some(t => /PLACE OF THE INCIDENT/i.test(t));
  const orderOk = (() => { const t = lineCard.map(x => x.toUpperCase()); const i = t.indexOf("PLACE OF THE INCIDENT"); const j = t.indexOf("COUNTRY"); const k = t.indexOf("STATUS"); return i > -1 && (k === -1 || i > Math.max(j, 0) - 1); })();
  rec("TED-80", holder >= 0 && !richOnCard && gone ? "PASS" : "FAIL", `"Place of the incident" Show in cards ticked + Save: a Court Case card carries the line=${holder >= 0} (card lines: ${before.slice(0, 260)}). Rich text property "QA Rich cards" with Show in cards, entity "QA rich entity" created with a value and saved (card found=${!!mine}): shown on a card=${richOnCard} (expected never). Untick + Save: line gone=${gone}. Image and Preview never-on-card half: no value can be attached to an Image field from the form here, so only Rich text was driven.`, "TED-80");
  await c.ctx.close();
});

await guard("TED-84", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Select", label: "QA Column select", fill: async (d) => { await pickOpt(d.page(), "Thesaurus", "Case status"); } });
  await addProp(p, { type: "Image", label: "QA Column image" });
  await addProp(p, { type: "Rich text", label: "QA Column rich" });
  await addProp(p, { type: "Preview", label: "QA Column preview" });
  await save(p);
  await toLibrary(p, "Court Case");
  await setView(p, "List"); await openDisplay(p);
  const m = await menuText(p);
  const colsPart = (m.split("COLUMNS | ")[1] || "").split(" | DENSITY")[0].split(" | ").map(strip);
  const offered = colsPart.includes("QA Column select");
  const before = (await p.locator("[role=columnheader]").allInnerTexts()).map(strip);
  const checkedBefore = await p.evaluate(() => [...document.querySelectorAll("[role=menuitemcheckbox]")].filter(e => !e.closest("[inert]")).map(e => [e.innerText.replace(/\\s+/g, " ").trim(), e.getAttribute("aria-checked")]).filter(x => /QA Column/.test(x[0])));
  await p.locator("[role=menuitemcheckbox]", { hasText: /^QA Column select$/ }).first().click(); await wait(p, 400);
  await p.keyboard.press("Escape"); await wait(p, 300);
  const on = (await p.locator("[role=columnheader]").allInnerTexts()).map(strip);
  // persists by name: reload page, Library again
  await p.reload(); await wait(p, 2000);
  await toLibrary(p, "Court Case");
  const view = await p.getByRole("button", { name: /^View: / }).innerText();
  if (!/List/.test(view)) await setView(p, "List");
  const afterReload = (await p.locator("[role=columnheader]").allInnerTexts()).map(strip);
  await shot(p, "TED-84");
  const noRender = !colsPart.some(x => /QA Column (image|rich|preview)/.test(x));
  rec("TED-84", offered && !before.includes("QA COLUMN SELECT") && on.some(x => /QA COLUMN SELECT/i.test(x)) && noRender ? "PASS" : "FAIL", `Court Case + Select "QA Column select" (and Image, Rich text, Preview properties) saved. List view Display menu COLUMNS offers "QA Column select"=${offered}; state before toggling ${JSON.stringify(checkedBefore)} (off by default; headers ${JSON.stringify(before)}); after toggling headers ${JSON.stringify(on)}; after page reload headers ${JSON.stringify(afterReload)}. Image/Rich text/Preview offered as columns: ${!noRender} (columns offered: ${JSON.stringify(colsPart.slice(-14))}).`, "TED-84");
  await c.ctx.close();
});
await b.close();
