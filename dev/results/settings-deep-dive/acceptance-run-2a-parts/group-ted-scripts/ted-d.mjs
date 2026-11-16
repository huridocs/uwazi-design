import { launch, open, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, strip, tipText, errs, pickType, typeOptions, fieldSeq, tickAll, sameCols, pickOpt, rowPills, rowType, rail, dialogs, footerBtn, notifTitles } from "./ted-common.mjs";
const b = await launch();
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const guard = async (id, fn) => { if (ONLY && !ONLY.includes(id)) return; try { await fn(); } catch (e) { console.error(e.stack.split("\n").slice(0, 4).join(" / ").slice(0, 500)); rec(id, "FAIL", "Script error while driving: " + String(e.message).split("\n")[0].slice(0, 300)); } };
const panelSel = "[role=dialog][data-part=panel]:not([inert]):not([inert] *)";
const lab = (d) => d.getByLabel("Label", { exact: true });
const addBtn = (d) => d.getByRole("button", { name: "Add property" });
const table = (p) => dlg(p).locator("[data-part=same-label] tbody tr").evaluateAll(rs => rs.map(r => [...r.querySelectorAll("td")].map(td => ({ t: td.innerText.replace(/\s+/g, " ").trim(), red: /seal-label/.test(td.className) }))));
const alertTxt = async (p) => strip(await dlg(p).locator("p[role=alert]").first().innerText().catch(() => ""));

await guard("TED-85", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("Category");
  const head = strip(await d.locator("[data-part=same-label] h4").innerText().catch(() => ""));
  const t = await table(p); const cols = await sameCols(p);
  const sh = await d.locator("[data-part=same-label]").count();
  await shot(p, "TED-85");
  await pickType(p, "Select"); await pickOpt(p, "Thesaurus", 1);
  const colsSel = await sameCols(p);
  await pickType(p, "Relationship");
  const colsRel = await sameCols(p);
  await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await S(p).getByRole("button", { name: "Edit Case number", exact: true }).click(); await wait(p, 300);
  const sameEdit = await dlg(p).locator("[data-part=same-label] h4").count();
  await dlg(p).getByRole("button", { name: "Cancel" }).click();
  const ok = head === "Properties from other templates in the collection using the same label." && t[0][0].t.includes("(this template)") && t.length === 3 && t.slice(1).map(r => r[0].t).sort().join() === "Right,Violation" && JSON.stringify(cols) === JSON.stringify(["Template", "Type"]) && colsSel.join() === "Template,Type,Thesauri" && colsRel.join() === "Template,Type,Relation type,Entities,Inherit type" && sameEdit === 1;
  rec("TED-85", ok ? "PASS" : "FAIL", `Label "Category" (also in Right and Violation, Text): heading "${head}"; rows ${JSON.stringify(t.map(r => r.map(x => x.t)))}; columns ${JSON.stringify(cols)}, as Select ${JSON.stringify(colsSel)}, as Relationship ${JSON.stringify(colsRel)}. Heading also on an Edit panel for Case number: ${sameEdit}.`, "TED-85");
  await c.ctx.close();
});

await guard("TED-86", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("Category");
  const matchAlert = await alertTxt(p); const matchDisabled = await addBtn(d).isDisabled();
  await pickType(p, "Date");
  const t = await table(p);
  const al = await alertTxt(p);
  const dis = await addBtn(d).isDisabled();
  await addBtn(d).click({ force: true }).catch(() => {}); await wait(p, 300);
  const footAlert = strip(await d.locator("footer [role=alert]").first().innerText().catch(() => "")) || strip(await p.locator(panelSel + " [role=alert]").allInnerTexts().then(a => a.join(" | ")));
  const reds = t.slice(1).map(r => r[1].red);
  await shot(p, "TED-86");
  const stillOpen = await p.locator(panelSel).count();
  rec("TED-86", matchAlert === "" && !matchDisabled && reds.every(x => x) && /Right|Violation/.test(al) && /type/.test(al) && dis && stillOpen === 1 ? "PASS" : "FAIL", `Same type (Text): no alert (${JSON.stringify(matchAlert)}), Add property enabled=${!matchDisabled}. Type changed to Date: other rows' Type cell red=${JSON.stringify(reds)}; role=alert text "${al}"; Add property disabled=${dis}; alerts seen after click ${JSON.stringify(footAlert).slice(0, 300)}; panel stays open=${stillOpen === 1}.`, "TED-86");
  await c.ctx.close();
});

await guard("TED-87", async () => {
  const c = await openEditor(b, "Judgment"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("Type"); await pickType(p, "Select");
  const o = await pickOpt(p, "Thesaurus", "Violation types");
  const t1 = await table(p); const al1 = await alertTxt(p); const dis1 = await addBtn(d).isDisabled();
  await shot(p, "TED-87-select");
  // match: choose the thesaurus of Document's Type: Document types
  await pickOpt(p, "Thesaurus", "Document types");
  const t2 = await table(p); const al2 = await alertTxt(p); const dis2 = await addBtn(d).isDisabled();
  const check = (t) => t.slice(1).map(r => { const diff = r[1].t !== t[0][1].t || r[2]?.t !== t[0][2]?.t; return { tpl: r[0].t, cells: r.slice(1).map(x => x.t + (x.red ? "[red]" : "")), redIffDiff: (r[1].red === (r[1].t !== t[0][1].t)) && ((r[2]?.red ?? false) === (r[2]?.t !== t[0][2]?.t)) }; });
  const c1 = check(t1), c2 = check(t2);
  // relationship
  await pickType(p, "Relationship");
  await lab(d).fill("Nationality");
  await pickOpt(p, "Relationship type", "Cites");
  await pickOpt(p, "Entities", "Right");
  const t3 = await table(p); const al3 = await alertTxt(p); const dis3 = await addBtn(d).isDisabled();
  await shot(p, "TED-87-rel");
  const rel = t3.slice(1).map(r => ({ tpl: r[0].t, cells: r.slice(1).map(x => x.t + (x.red ? "[red]" : "")) }));
  const redCols3 = t3.slice(1).flatMap(r => r.map((x, i) => x.red ? i : -1).filter(i => i > 0));
  // now match Person's Nationality: relation type + entities of that row
  const ownRow = t3[0].map(x => x.t);
  const ok = c1.every(x => x.redIffDiff) && c2.every(x => x.redIffDiff) && c1.some(x => x.cells.some(y => /red/.test(y))) && dis1 && /thesaurus|type/.test(al1) && t3.length > 1 && redCols3.length > 0 && dis3 && /Nationality/.test(al3);
  rec("TED-87", ok ? "PASS" : "FAIL", `Judgment editor, Select "Type" bound to Violation types: rows ${JSON.stringify(c1)}; alert "${al1}"; Add disabled=${dis1}. After choosing Document types: rows ${JSON.stringify(c2)}; alert "${al2}"; Add disabled=${dis2}. Relationship "Nationality" (type Cites, Entities Right): own row ${JSON.stringify(ownRow)}; others ${JSON.stringify(rel)}; alert "${al3}"; Add disabled=${dis3}. Red cell shown only where a value differs from the own row.`, "TED-87");
  await c.ctx.close();
});

await guard("TED-88", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  // before rename: label taken
  await openAdd(p); let d = dlg(p);
  await lab(d).fill("Case number"); await addBtn(d).click(); await wait(p, 300);
  const dupBefore = strip(await d.innerText()).includes("This label already exists in this template");
  await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  // rename in draft
  await S(p).getByRole("button", { name: "Edit Case number", exact: true }).click(); await wait(p, 300);
  await lab(dlg(p)).fill("Case no"); await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  const dirty = await dirtyNow(p);
  await openAdd(p); d = dlg(p);
  await lab(d).fill("Case number");
  const t = await table(p);
  const al = await alertTxt(p);
  const dupAfter = strip(await d.innerText()).includes("This label already exists in this template");
  await shot(p, "TED-88");
  rec("TED-88", dupBefore && dirty && t.length === 1 && !dupAfter && al === "" ? "PASS" : "FAIL", `Before the rename "Case number" is refused as a duplicate=${dupBefore}. Renamed to "Case no" in the draft (not saved, Save enabled=${dirty}); add "Case number": same-label rows ${JSON.stringify(t.map(r => r[0].t))} (own row only: the saved copy is not listed), duplicate message=${dupAfter}, conflict alert "${al}".`, "TED-88");
  await c.ctx.close();
});

await guard("TED-89", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Edit Status", exact: true }).click(); await wait(p, 300);
  const t = await table(p); const own = (await dlg(p).locator("[data-part=same-label] tbody tr").count());
  const al = await alertTxt(p);
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await openAdd(p); const d = dlg(p);
  await lab(d).fill("Definition");
  const t2 = await table(p);
  const al2 = await alertTxt(p); const dis2 = await addBtn(d).isDisabled();
  await shot(p, "TED-89");
  const reds = t2.slice(1).map(r => ({ tpl: r[0].t, type: r[1].t, red: r[1].red }));
  rec("TED-89", t.length === 1 && t[0][0].t.includes("(this template)") && al === "" && reds.length === 1 && reds[0].red && /Rich text/.test(reds[0].type) && dis2 ? "PASS" : "FAIL", `Edit existing Status keeping its label: same-label rows ${JSON.stringify(t.map(r => r.map(x => x.t)))} (own row only, no "other" copy), alert "${al}". Add "Definition" as Text vs Rich text in Violation: rows ${JSON.stringify(reds)}; alert "${al2}"; Add property disabled=${dis2} (strict exact-type rule).`, "TED-89");
  await c.ctx.close();
});

// TED-90
await guard("TED-90", async () => {
  const c0 = await open(b, "thesauri"); await wait(c0.page, 800);
  const thes = (await S(c0.page).locator("[role=row]").allInnerTexts()).slice(1).map(s => strip(s).replace(/\s+\d+$/, ""));
  await c0.ctx.close();
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await pickType(p, "Select");
  await lab(d).fill("QA T90");
  const opts = await (async () => { await d.getByRole("button", { name: /^Thesaurus:/ }).click(); await wait(p, 250); const o = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; })();
  const dis = await p.locator("[role=listbox] [role=option][aria-disabled=true]").count();
  const sorted = [...opts.slice(1)].sort((a, b) => a.localeCompare(b));
  await addBtn(d).click(); await wait(p, 300);
  const msg = strip(await d.innerText()).includes("This field is required");
  const stillOpen = await p.locator(panelSel).count();
  await shot(p, "TED-90");
  const sameSet = JSON.stringify([...opts.slice(1)].sort()) === JSON.stringify([...thes].sort());
  rec("TED-90", opts[0] === "Select..." && JSON.stringify(sorted) === JSON.stringify(opts.slice(1)) && sameSet && msg && stillOpen === 1 ? "PASS" : "FAIL", `Thesaurus options ${JSON.stringify(opts)} (first "Select...", sorted by label=${JSON.stringify(sorted) === JSON.stringify(opts.slice(1))}); Settings > Thesauri lists ${JSON.stringify(thes)} (same set, no template-backed entries=${sameSet}). Add property with nothing chosen: "This field is required" shown=${msg}, panel open=${stillOpen === 1}.`, "TED-90");
  await c.ctx.close();
});

// TED-91 thesaurus created in Settings
await guard("TED-91", async () => {
  const c = await open(b, "thesauri"); const p = c.page; await wait(p, 800);
  await p.getByRole("button", { name: "Add thesaurus" }).first().click(); await wait(p, 500);
  await S(p).locator("input[placeholder='e.g. Violation types']").fill("QA list");
  await S(p).getByRole("button", { name: "Create thesaurus" }).click(); await wait(p, 700);
  await rail(p, "Templates"); await wait(p, 600);
  await S(p).locator("[role=row]", { hasText: "Court Case" }).first().click(); await wait(p, 600);
  await openAdd(p); const d = dlg(p);
  await pickType(p, "Select"); await lab(d).fill("QA T91");
  await d.getByRole("button", { name: /^Thesaurus:/ }).click(); await wait(p, 250);
  const opts = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip);
  await p.locator("[role=listbox] [role=option]", { hasText: "QA list" }).click(); await wait(p, 200);
  await addBtn(d).click(); await wait(p, 400);
  const pills = await rowPills(p, "QA T91");
  await shot(p, "TED-91");
  rec("TED-91", opts.includes("QA list") && pills.includes("QA list") ? "PASS" : "FAIL", `Created "QA list" on Settings > Thesauri, then Court Case > Add property > Select: options ${JSON.stringify(opts)}; picked it and added: row pills ${JSON.stringify(pills)}.`, "TED-91");
  await c.ctx.close();
});

// TED-93
await guard("TED-93", async () => {
  const c0 = await open(b, "relationship-types"); await wait(c0.page, 800);
  const regs = (await S(c0.page).locator("[role=row]").allInnerTexts()).slice(1).map(s => strip(s).split(" ")[0] && strip(s));
  const regNames = await S(c0.page).locator("[role=row]").evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
  await c0.ctx.close();
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await pickType(p, "Relationship");
  const relOpts = await (async () => { await d.getByRole("button", { name: /^Relationship type:/ }).click(); await wait(p, 250); const o = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; })();
  const entOpts = await (async () => { await d.getByRole("button", { name: /^Entities:/ }).click(); await wait(p, 250); const o = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; })();
  const inhBefore = await d.getByRole("button", { name: /^Inherit property/ }).count();
  await pickOpt(p, "Entities", "Person");
  const inhOpts = await (async () => { await d.getByRole("button", { name: /^Inherit property/ }).click(); await wait(p, 250); const o = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip); await p.keyboard.press("Escape"); await wait(p, 200); return o; })();
  await lab(d).fill("QA T93");
  await addBtn(d).click(); await wait(p, 300);
  const msg = strip(await d.innerText()).includes("This field is required");
  await shot(p, "TED-93");
  const sortedRel = [...relOpts.slice(1)].sort((a, b) => a.localeCompare(b));
  const tpls = ["Country", "Document", "Hearing", "Judgment", "Organization", "Person", "Right", "Violation"];
  const personProps = ["Country", "Role", "Profession", "Date of birth", "Mandate", "Nationality", "Member of"];
  const ok = relOpts[0] === "Select..." && JSON.stringify(sortedRel) === JSON.stringify(relOpts.slice(1)) && JSON.stringify([...relOpts.slice(1)].sort()) === JSON.stringify([...regNames].sort()) && entOpts[0] === "Any entity" && !entOpts.includes("Court Case") && entOpts.length === 9 && inhBefore === 0 && !inhOpts.some(x => /^(Title|Date added|Date modified)$/.test(x)) && JSON.stringify(inhOpts.slice(1).sort()) === JSON.stringify(personProps.sort()) && msg;
  rec("TED-93", ok ? "PASS" : "FAIL", `Relationship type options ${JSON.stringify(relOpts)} (registry on Settings > Relationship types: ${JSON.stringify(regNames)}). Entities options ${JSON.stringify(entOpts)} (Court Case itself absent=${!entOpts.includes("Court Case")}). Inherit property before choosing Entities: ${inhBefore} controls; after choosing Person: ${JSON.stringify(inhOpts)}. Add with Relationship type empty: "This field is required"=${msg}.`, "TED-93");
  await c.ctx.close();
});

// TED-94
await guard("TED-94", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await openAdd(p); const d = dlg(p);
  await pickType(p, "Relationship"); await lab(d).fill("QA T94");
  await pickOpt(p, "Relationship type", 1); await pickOpt(p, "Entities", "Person"); await pickOpt(p, "Inherit property", "Profession");
  await addBtn(d).click(); await wait(p, 400);
  await S(p).getByRole("button", { name: "Edit QA T94", exact: true }).click(); await wait(p, 400);
  const inh = await dlg(p).getByRole("button", { name: /^Inherit property/ }).getAttribute("aria-label");
  const ent = await dlg(p).getByRole("button", { name: /^Entities:/ }).getAttribute("aria-label");
  await pickOpt(p, "Entities", "Organization");
  const inh2 = await dlg(p).getByRole("button", { name: /^Inherit property/ }).getAttribute("aria-label");
  await shot(p, "TED-94");
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  // property unchanged after cancel
  await S(p).getByRole("button", { name: "Edit QA T94", exact: true }).click(); await wait(p, 400);
  const inh3 = await dlg(p).getByRole("button", { name: /^Inherit property/ }).getAttribute("aria-label");
  rec("TED-94", /Profession/.test(inh) && /Person/.test(ent) && /Select\.\.\./.test(inh2) && /Profession/.test(inh3) ? "PASS" : "FAIL", `Saved (draft) relationship to Person inheriting Profession. Reopened: "${inh}", "${ent}" (inherit kept on open). Changed Entities to Organization: "${inh2}" (cleared by the user's change). Cancelled and reopened: "${inh3}".`, "TED-94");
  await c.ctx.close();
});

// TED-95
await guard("TED-95", async () => {
  const c = await open(b, "relationship-types"); const p = c.page; await wait(p, 800);
  await p.getByRole("button", { name: /Add relationship type/ }).first().click(); await wait(p, 500);
  await S(p).locator("#relationship-type-name").fill("QA registry type");
  await S(p).getByRole("button", { name: "Create relationship type" }).click(); await wait(p, 700);
  await rail(p, "Templates"); await wait(p, 600);
  await S(p).locator("[role=row]", { hasText: "Court Case" }).first().click(); await wait(p, 600);
  await openAdd(p); const d = dlg(p);
  await pickType(p, "Relationship");
  await d.getByRole("button", { name: /^Relationship type:/ }).click(); await wait(p, 250);
  const opts = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip);
  await p.keyboard.press("Escape");
  await shot(p, "TED-95");
  rec("TED-95", opts.includes("QA registry type") ? "PASS" : "FAIL", `Type "QA registry type" added on Settings > Relationship types is offered by the property panel: ${opts.includes("QA registry type")} (options ${JSON.stringify(opts)}). The Relationships-panel picker half is recorded in TED-95b below if driven.`, "TED-95");
  await c.ctx.close();
});

// TED-98 / 99
await guard("TED-98", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Add thesaurus" }).click(); await wait(p, 400);
  const d = dlg(p);
  const title = strip(await d.locator("h2,h3").first().innerText());
  const lbl = strip(await d.locator("label").first().innerText());
  const inp = d.locator("input[type=text]").first();
  const ph = await inp.getAttribute("placeholder");
  const saveDis0 = await d.getByRole("button", { name: "Save" }).isDisabled();
  await inp.fill("COUNTRIES"); await d.getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  const dup = strip(await d.innerText()).includes("Thesaurus name already exists");
  const kept = await inp.inputValue(); const still = await p.locator(panelSel).count();
  await shot(p, "TED-98");
  await inp.fill("QA thesaurus 98"); await d.getByRole("button", { name: "Save" }).click(); await wait(p, 500);
  const closed = await p.locator(panelSel).count() === 0;
  const notes = await notifTitles(p);
  await openAdd(p); await pickType(p, "Select"); await dlg(p).getByRole("button", { name: /^Thesaurus:/ }).click(); await wait(p, 250);
  const inPicker = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip).includes("QA thesaurus 98");
  await p.keyboard.press("Escape");
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 200);
  await rail(p, "Thesauri").catch(() => {});
  await wait(p, 700);
  const dlgs = await dialogs(p);
  let listed = null;
  if (dlgs.length) { await p.locator("button", { hasText: "Discard changes" }).last().click(); await wait(p, 500); }
  listed = strip(await S(p).innerText()).includes("QA thesaurus 98");
  rec("TED-98", title === "Add thesaurus" && lbl === "Name" && ph === "Thesaurus name" && saveDis0 && dup && kept === "COUNTRIES" && still === 1 && closed && notes.some(n => /Thesaurus created successfully\./.test(n)) && inPicker && listed ? "PASS" : "FAIL", `Title "${title}", label "${lbl}", placeholder "${ph}", Save disabled when empty=${saveDis0}. "COUNTRIES": duplicate message=${dup}, modal open=${still === 1}, text kept="${kept}". New name: modal closed=${closed}; Beacon has "Thesaurus created successfully."=${notes.some(n => /Thesaurus created successfully\./.test(n))}; in Select picker=${inPicker}; listed on Settings > Thesauri=${listed} (dirty guard dialog on leaving the editor: ${dlgs.length ? "yes, discarded" : "no"}).`, "TED-98");
  await c.ctx.close();
});
await guard("TED-99", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Add relationship type" }).click(); await wait(p, 400);
  const d = dlg(p);
  const title = strip(await d.locator("h2,h3").first().innerText());
  const lbl = strip(await d.locator("label").first().innerText());
  const inp = d.locator("input[type=text]").first();
  const ph = await inp.getAttribute("placeholder");
  const saveDis0 = await d.getByRole("button", { name: "Save" }).isDisabled();
  await inp.fill("CITES"); await d.getByRole("button", { name: "Save" }).click(); await wait(p, 300);
  const dup = strip(await d.innerText()).includes("Relationship type name already exists");
  const kept = await inp.inputValue(); const still = await p.locator(panelSel).count();
  await shot(p, "TED-99");
  await inp.fill("QA type 99"); await d.getByRole("button", { name: "Save" }).click(); await wait(p, 500);
  const closed = await p.locator(panelSel).count() === 0;
  const notes = await notifTitles(p);
  await openAdd(p); await pickType(p, "Relationship"); await dlg(p).getByRole("button", { name: /^Relationship type:/ }).click(); await wait(p, 250);
  const inPicker = (await p.locator("[role=listbox] [role=option]").allInnerTexts()).map(strip).includes("QA type 99");
  await p.keyboard.press("Escape");
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 200);
  await rail(p, "Relationship types"); await wait(p, 700);
  if ((await dialogs(p)).length) { await p.locator("button", { hasText: "Discard changes" }).last().click(); await wait(p, 500); }
  const listed = strip(await S(p).innerText()).includes("QA type 99");
  rec("TED-99", title === "Add relationship type" && lbl === "Name" && ph === "Relationship type name" && saveDis0 && dup && kept === "CITES" && still === 1 && closed && notes.some(n => /Relationship type created successfully\./.test(n)) && inPicker && listed ? "PASS" : "FAIL", `Title "${title}", label "${lbl}", placeholder "${ph}", Save disabled when empty=${saveDis0}. "CITES": duplicate message=${dup}, modal open=${still === 1}, text kept="${kept}". New name: modal closed=${closed}; Beacon "Relationship type created successfully."=${notes.some(n => /Relationship type created successfully\./.test(n))}; in property panel picker=${inPicker}; listed on Settings > Relationship types=${listed}.`, "TED-99");
  await c.ctx.close();
});

// TED-103
await guard("TED-103", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  // open and cancel the property panel alone: no guard
  await openAdd(p); await lab(dlg(p)).fill("tmp"); await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  out.panelOnlyGuard = (await dialogs(p)).length; out.left = (await S(p).locator("#template-name-input").count()) === 0;
  const c2 = await openEditor(b, "Court Case"); const q = c2.page;
  await S(q).locator("#template-name-input").fill("Court Case X");
  const cancel = S(q).locator("footer").getByRole("button", { name: "Cancel" });
  const ghost = await cancel.evaluate(e => ({ variant: e.getAttribute("data-variant"), bg: getComputedStyle(e).backgroundColor }));
  await cancel.click(); await wait(q, 500);
  out.d1 = await dialogs(q);
  out.leftWithChange = (await S(q).locator("#template-name-input").count()) === 0;
  await shot(q, "TED-103");
  await S(q).locator("[role=row]", { hasText: "Court Case" }).first().click(); await wait(q, 500);
  out.gone = (await S(q).locator("#template-name-input").inputValue()) === "Court Case";
  // the breadcrumb guard, for comparison
  await S(q).locator("#template-name-input").fill("Court Case Y");
  await S(q).getByRole("button", { name: "Templates" }).first().click(); await wait(q, 500);
  out.crumbDialog = await dialogs(q);
  const ok = out.panelOnlyGuard === 0 && out.left && out.d1.some(x => /Discard changes/.test(x)) && !out.leftWithChange && ghost.variant === "ghost";
  rec("TED-103", ok ? "PASS" : "FAIL", `Panel opened and cancelled alone, then page Cancel: no dialog (${out.panelOnlyGuard}), went to list=${out.left} (as expected). With a name change ("Court Case X"), page Cancel (variant ${ghost.variant}): dialogs opened ${JSON.stringify(out.d1)}; editor left straight to the list=${out.leftWithChange}; change gone on reopen=${out.gone}. Expected "Discard changes?" to open on Cancel each time. For comparison the breadcrumb "Templates" with a change opens ${JSON.stringify(out.crumbDialog)}. (SettingsEditor documents Cancel as "the explicit discard, not guarded".)`, "TED-103");
  await c.ctx.close(); await c2.ctx.close();
});
await b.close();
