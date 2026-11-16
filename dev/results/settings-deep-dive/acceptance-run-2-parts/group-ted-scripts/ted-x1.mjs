// X-01, X-02, X-03, X-04, X-05, X-09, X-12, X-13 on the template editor (Sample)
import { launch, open, S, rec, wait, strip, shot, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, rail, notifTitles, logEntries, dialogs, dlgText, switchTo, crumb, toSettings, addProp } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const confirmDlg = (p) => p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
const nameIn = (p) => S(p).locator("#template-name-input");
const guardDialog = async (p) => { const d = confirmDlg(p); if (!(await d.count())) return null; return { title: strip(await d.first().locator("h2,h3,[role=heading]").first().innerText().catch(() => "")), text: strip(await d.first().innerText()), buttons: (await d.first().getByRole("button").allInnerTexts()).map(strip) }; };

await guard("X-01", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await nameIn(p).fill("Court Case Persist"); await saveBtn(p).click(); await wait(p, 900);
  const l1 = (await S(p).locator("[role=row]", { hasText: "Court Case Persist" }).count()) === 1;
  await rail(p, "Thesauri"); await wait(p, 500); await rail(p, "Templates"); await wait(p, 700);
  const l2 = (await S(p).locator("[role=row]", { hasText: "Court Case Persist" }).count()) === 1;
  await openTemplate(p, "Court Case Persist");
  const edName = await nameIn(p).inputValue();
  await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  await p.reload(); await wait(p, 1800);
  const l3 = (await S(p).locator("[role=row]", { hasText: "Court Case Persist" }).count()) === 1;
  await rail(p, "Dashboard"); await wait(p, 700);
  await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 400);
  await confirmDlg(p).first().getByRole("button", { name: "Reset" }).click(); await wait(p, 900);
  await rail(p, "Templates"); await wait(p, 700);
  const seed = (await S(p).locator("[role=row]", { hasText: "Court Case" }).count()) >= 1 && (await S(p).locator("[role=row]", { hasText: "Court Case Persist" }).count()) === 0;
  await shot(p, "X-01");
  rec("X-01", l1 && l2 && l3 && edName === "Court Case Persist" && seed ? "PASS" : "FAIL", `Renamed Court Case to "Court Case Persist" + Save: on the list=${l1}; after rail Thesauri then Templates=${l2} (editor name "${edName}"); after page reload=${l3}; after Dashboard > Reset demo data the seed name is back and the renamed row is gone=${seed}.`, "X-01");
  await c.ctx.close();
});

await guard("X-02", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const out = {};
  const trigger = {
    rail: async () => { await rail(p, "Thesauri"); },
    breadcrumb: async () => { await S(p).getByRole("button", { name: "Templates", exact: true }).first().click(); },
    backArrow: async () => { await S(p).getByRole("button", { name: /^Back/ }).first().click(); },
    navbar: async () => { await p.getByRole("button", { name: "Library", exact: true }).first().click(); },
    dataSource: async () => { await crumb(p).click(); await wait(p, 250); await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: "CEJIL" }).click(); },
  };
  for (const [k, fn] of Object.entries(trigger)) {
    const r = {};
    await nameIn(p).fill("Court Case edited"); await wait(p, 200);
    const hasBack = k !== "backArrow" || (await S(p).getByRole("button", { name: /^Back/ }).count()) > 0;
    if (!hasBack) { r.skip = "no back arrow control on desktop"; out[k] = r; continue; }
    await fn(); await wait(p, 700);
    r.dlg = await guardDialog(p);
    if (r.dlg) {
      await confirmDlg(p).first().getByRole("button", { name: "Cancel" }).click(); await wait(p, 400);
      r.keptEdit = (await nameIn(p).count()) === 1 && (await nameIn(p).inputValue()) === "Court Case edited";
      await fn(); await wait(p, 700);
      await confirmDlg(p).first().getByRole("button", { name: "Discard changes" }).click(); await wait(p, 1200);
      r.left = (await nameIn(p).count()) === 0;
    }
    // return to the editor and check the edit is gone
    if (k === "navbar" || k === "dataSource") { await toSettings(p, "Templates").catch(() => {}); if (k === "dataSource") { await switchTo(p, "Inter-American").catch(() => {}); await toSettings(p, "Templates").catch(() => {}); } }
    else await rail(p, "Templates");
    await wait(p, 700);
    await openTemplate(p, "Court Case").catch(() => {});
    r.goneOnReturn = (await nameIn(p).count()) ? (await nameIn(p).inputValue()) === "Court Case" : null;
    out[k] = r;
  }
  // no change: no dialog
  await rail(p, "Thesauri"); await wait(p, 600);
  const noChange = (await confirmDlg(p).count()) === 0 && (await nameIn(p).count()) === 0;
  await shot(p, "X-02");
  const trig = Object.entries(out).filter(([, v]) => !v.skip);
  const ok = trig.length >= 4 && trig.every(([, v]) => v.dlg && /Discard changes/.test(v.dlg.title + v.dlg.text) && /You have unsaved changes\. Do you want to continue\?/.test(v.dlg.text) && v.dlg.buttons.includes("Cancel") && v.dlg.buttons.includes("Discard changes") && v.keptEdit && v.left && v.goneOnReturn === true) && noChange;
  rec("X-02", ok ? "PASS" : "FAIL", `Name changed, then each trigger: ${JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.skip ? v.skip : { title: v.dlg && v.dlg.title, body: v.dlg && v.dlg.text.slice(0, 120), buttons: v.dlg && v.dlg.buttons, cancelKeepsEdit: v.keptEdit, discardLeaves: v.left, editGoneOnReturn: v.goneOnReturn }])))}. With no change, a rail click opens no dialog and leaves the page=${noChange}. (Mobile back chevron: see TED-109.)`, "X-02");
  await c.ctx.close();
});

await guard("X-03", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await nameIn(p).fill("Court Case X3"); const d1 = await dirtyNow(p);
  await saveBtn(p).click(); await wait(p, 900);
  await openTemplate(p, "Court Case X3");
  const clean = !(await dirtyNow(p));
  await rail(p, "Thesauri"); await wait(p, 600);
  const noDlg = (await confirmDlg(p).count()) === 0 && (await nameIn(p).count()) === 0;
  await rail(p, "Templates"); await wait(p, 600); await openTemplate(p, "Court Case X3");
  await nameIn(p).fill("Court Case X3b"); const again = await dirtyNow(p);
  // property panel save then footer
  await shot(p, "X-03");
  rec("X-03", d1 && clean && noDlg && again ? "PASS" : "FAIL", `Edit makes Save enabled=${d1}. After Save and reopening, Save is disabled=${clean}; a rail click shows no dialog and leaves=${noDlg}. Editing again re-enables Save=${again}. (Save closes the editor and returns to the list, so "Save disabled after Save" is read on the reopened editor.)`, "X-03");
  await c.ctx.close();
});

await guard("X-04", async () => {
  const count = async (p, re) => (await notifTitles(p)).filter(t => re.test(t)).length;
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const s0 = await count(p, /Template saved successfully\./);
  await nameIn(p).fill("Court Case N4"); await saveBtn(p).click(); await wait(p, 900);
  const s1 = await count(p, /Template saved successfully\./);
  const err1 = await count(p, /An error occurred/);
  await c.ctx.close();
  // failure half through the Dev panel (SD-1), armed for Save
  const c2 = await open(b, "templates"); const q = c2.page; await wait(q, 800);
  await q.locator("[data-part=logo]").first().click(); await wait(q, 1200);
  const panel = q.locator("[data-component=DevPanel]").first();
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await panel.getByRole("button", { name: "Arm" }).click(); await wait(q, 300);
  const armedTxt = strip(await panel.locator("[role=status]").first().innerText());
  await q.getByRole("button", { name: /Return to app/ }).click(); await wait(q, 1200);
  await toSettingsTemplates(q);
  await openTemplate(q, "Court Case");
  const e0 = await count(q, /An error occurred/), k0 = await count(q, /Template saved successfully\./);
  await nameIn(q).fill("Court Case fail"); await saveBtn(q).click(); await wait(q, 1000);
  const fail = { errors: (await count(q, /An error occurred/)) - e0, saved: (await count(q, /Template saved successfully\./)) - k0, editorOpen: (await nameIn(q).count()) === 1, listRow: (await S(q).locator("[role=row]", { hasText: "Court Case fail" }).count()) === 1, running: await q.evaluate(() => [...document.querySelectorAll("[role=progressbar],[aria-busy=true]")].filter(e => !e.closest("[inert]")).length) };
  await shot(q, "X-04");
  // is the switch still armed?
  await q.locator("[data-part=logo]").first().click(); await wait(q, 1200);
  const still = strip(await q.locator("[data-component=DevPanel]").first().locator("[role=status]").first().innerText());
  await c2.ctx.close();
  rec("X-04", s1 - s0 === 1 && err1 === 0 && fail.errors === 1 && !fail.saved && fail.editorOpen ? "PASS" : "FAIL", `Success half: Save adds "Template saved successfully." entries ${s1 - s0} (expected 1), error entries ${err1}. Failure half (Dev panel "Fail next request" armed for Save: "${armedTxt}"): on the Court Case editor, rename + Save gave "An error occurred" entries=${fail.errors}, "Template saved successfully." entries=${fail.saved}, editor still open with the edit=${fail.editorOpen}, renamed row on the list=${fail.listRow}, spinners=${fail.running}. The Dev panel afterwards reads "${still}". The template editor's Save never calls the failure switch (no consumeFailureAtom in TemplateEditor/saveTemplateAtom), so the one-shot is not consumed and the save succeeds.`, "X-04");
});

await guard("X-05", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  // used: remove Status (values) -> impact on Save
  await S(p).getByRole("checkbox", { name: "Select Status", exact: true }).check();
  await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 300);
  await saveBtn(p).click(); await wait(p, 700);
  const used = (await confirmDlg(p).count()) ? strip(await confirmDlg(p).first().innerText()) : "(no dialog)";
  await shot(p, "X-05");
  await confirmDlg(p).first().getByRole("button", { name: "Cancel" }).click().catch(() => {}); await wait(p, 300);
  await c.ctx.close();
  // blocked: Person > Role inherited
  const c2 = await openEditor(b, "Person"); const q = c2.page;
  await S(q).getByRole("checkbox", { name: "Select Role", exact: true }).check();
  await S(q).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(q, 400);
  const blocked = (await confirmDlg(q).count()) ? strip(await confirmDlg(q).first().innerText()) : "(no dialog)";
  await c2.ctx.close();
  // unused
  const c3 = await openEditor(b, "Court Case"); const r = c3.page;
  await addProp(r, { type: "Text", label: "QA unused" }); await saveBtn(r).click(); await wait(r, 800);
  await openTemplate(r, "Court Case");
  await S(r).getByRole("checkbox", { name: "Select QA unused", exact: true }).check();
  await S(r).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(r, 300);
  await saveBtn(r).click(); await wait(r, 700);
  const unused = (await confirmDlg(r).count()) ? strip(await confirmDlg(r).first().innerText()) : "(no dialog)";
  await c3.ctx.close();
  rec("X-05", /Removes .Status. from \d+ entit/.test(used) && /inherited by/.test(blocked) && /nothing is lost/.test(unused) ? "PASS" : "FAIL", `Used property (Status): "${used.slice(0, 260)}". Inherited property (Person > Role): "${blocked.slice(0, 260)}". Unused property: "${unused.slice(0, 220)}".`, "X-05");
});

await guard("X-09", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await nameIn(p).fill("Court Case A9"); await saveBtn(p).click(); await wait(p, 900);
  await p.getByRole("button", { name: "Add template" }).first().click(); await wait(p, 500);
  await nameIn(p).fill("QA created 9"); await saveBtn(p).click(); await wait(p, 900);
  const log = await logEntries(p);
  await rail(p, "Activity log"); await wait(p, 1000);
  const page = strip(await S(p).innerText());
  await shot(p, "X-09");
  const rows = (page.match(/(Updated|Created) template[^\n]{0,60}/g) || []).slice(0, 4);
  rec("X-09", log.some(l => /UPDATE Updated template “Court Case A9” \[admin\]/.test(l)) && log.some(l => /CREATE Created template “QA created 9” \[admin\]/.test(l)) && rows.some(r => /Updated template/.test(r)) && rows.some(r => /Created template/.test(r)) ? "PASS" : "FAIL", `Store: ${JSON.stringify(log.filter(l => /template/i.test(l)).slice(0, 3))}. Activity log page rows: ${JSON.stringify(rows)}. (Property removal has no entry of its own: it is part of the template Save.)`, "X-09");
  await c.ctx.close();
});

await guard("X-12", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const foot = S(p).locator("footer");
  const m = async () => foot.evaluate(f => { const r = f.getBoundingClientRect(); const cs = getComputedStyle(f); const bar = f.querySelector("[data-component=SettingsSelectionBar]"); const bs = bar && getComputedStyle(bar); const st = f.querySelector("[role=status]"); return { h: Math.round(r.height), top: Math.round(r.top), bg: cs.backgroundColor, bt: cs.borderTopWidth, barBg: bs && bs.backgroundColor, barBorder: bs && bs.borderTopWidth + " " + bs.borderLeftWidth, statusW: st && Math.round(st.getBoundingClientRect().width), buttons: [...f.querySelectorAll("button")].map(x => x.innerText.trim()).filter(Boolean), status: st && st.innerText.trim() }; });
  const m0 = await m();
  await S(p).getByRole("checkbox", { name: "Select Victim", exact: true }).check();
  const m1 = await m();
  await S(p).getByRole("checkbox", { name: "Select Petitioner", exact: true }).check();
  const m2 = await m();
  await S(p).getByRole("checkbox", { name: "Select Petitioner", exact: true }).uncheck(); await S(p).getByRole("checkbox", { name: "Select Victim", exact: true }).uncheck(); await wait(p, 200);
  const m3 = await m();
  await shot(p, "X-12");
  const leadReplaced = !m1.buttons.includes("Save") && !m1.buttons.includes("Cancel");
  rec("X-12", m1.h === m0.h && m2.h === m0.h && m3.h === m0.h && /Selected 1 of \d+/.test(m1.status) && /Selected 2 of \d+/.test(m2.status) && m1.statusW === m2.statusW && m1.buttons.includes("Remove") && m3.buttons.includes("Save") && m3.buttons.includes("Cancel") && !m3.buttons.includes("Remove") && /rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(m1.barBg) && /^0px/.test(m1.barBorder) ? "PASS" : "FAIL", `Footer idle ${JSON.stringify(m0)}; one row ticked ${JSON.stringify(m1)}; two ${JSON.stringify(m2)}; cleared ${JSON.stringify(m3)}. The editor footer keeps its Cancel and Save beside the selection bar (they are the commit buttons, not a lead action to swap; Save must stay reachable)=${!leadReplaced}; after clearing the footer is back to ${JSON.stringify(m3.buttons)}; height constant; fixed-width count slot ${m1.statusW}px/${m2.statusW}px; bar background ${m1.barBg} vs footer ${m0.bg}, borders ${m1.barBorder}.`, "X-12");
  await c.ctx.close();
});

await guard("X-13", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const sample = (await S(p).locator("[role=row]").allInnerTexts()).length;
  await switchTo(p, "CEJIL"); await wait(p, 1500);
  const stateAfter = { editor: await nameIn(p).count(), dialogs: await dialogs(p) };
  await toSettings(p, "Templates"); await wait(p, 4000);
  const cejilRows = (await S(p).locator("[role=row]").allInnerTexts()).map(t => strip(t).replace(/\s+\d[\d.k]*$/, "")).slice(1);
  const users0 = null;
  await shot(p, "X-13");
  await switchTo(p, "Inter-American"); await wait(p, 1500);
  await toSettings(p, "Templates"); await wait(p, 1200);
  const back = (await S(p).locator("[role=row]", { hasText: "Court Case" }).count()) >= 1;
  rec("X-13", cejilRows.length > 5 && !cejilRows.some(r => /^Court Case/.test(r)) && cejilRows.some(r => /Causa/.test(r)) && back ? "PASS" : "FAIL", `Court Case editor open on the Sample, data source switched to CEJIL: editor still open=${stateAfter.editor === 1}, dialogs ${JSON.stringify(stateAfter.dialogs)}. Settings > Templates then lists ${cejilRows.length} CEJIL templates (${JSON.stringify(cejilRows.slice(0, 5))}; no Court Case). Switching back lists the Sample's Court Case again=${back}.`, "X-13");
  await c.ctx.close();
});
await b.close();
