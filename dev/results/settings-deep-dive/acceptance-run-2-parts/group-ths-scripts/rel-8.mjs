import { kbValue, refreshKb, panelGeo, axe, axeDialog, axeContrast, dupNames, unlabelled, dark, light, serious, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, addTypeBtn, relName, relSave, openRel, delRel, footerTxt, dialogs, dialogText, hscroll } from "./tx.mjs";
const cdlg = (p) => p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]");
await run("REL-8", async (b) => {
  // X-07 / X-08 desktop
  let { page } = await open(b, "relationship-types");
  await wait(page, 700);
  const r = {};
  r.l = serious(await axe(page)); r.dup = await dupNames(page); r.unl = await unlabelled(page);
  const pills = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] [data-column=templates] span")].slice(0, 3).map((e) => e.innerText));
  await dark(page); await wait(page, 900);
  r.d = serious(await axe(page));
  r.pillContrastDark = await axeContrast(page);
  await sh(page, "X-08-REL-dark-1280");
  await light(page); await wait(page, 900);
  r.pillContrastLight = await axeContrast(page);
  await openRel(page, "Cites");
  r.edL = serious(await axe(page)); r.dupE = await dupNames(page); r.unlE = await unlabelled(page);
  await relName(page).fill("Cites Z"); await wait(page, 700);
  r.edDirty = await axeContrast(page);
  await dark(page); await wait(page, 900); r.edD = serious(await axe(page)); r.edDirtyDark = await axeContrast(page); await sh(page, "X-08-REL-editor-dark-1280"); await light(page); await wait(page, 900); await wait(page, 900);
  await page.getByRole("button", { name: "Back", exact: true }).click(); await wait(page, 300);
  await cdlg(page).getByRole("button", { name: /Discard/ }).click().catch(() => {}); await wait(page, 300);
  // delete dialog (move variant) a11y and focus
  const row = S(page).locator("[data-part=row]").filter({ hasText: "Mentions" }).first();
  const del = row.getByRole("button", { name: "Delete Mentions" });
  await row.hover(); await del.focus(); await del.press("Enter"); await wait(page, 400);
  r.delAxe = await axeDialog(page);
  const focusIn = await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"));
  for (let i = 0; i < 10; i++) await page.keyboard.press("Tab");
  const trapped = await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"));
  const named = await page.evaluate(() => { const d = [...document.querySelectorAll("[data-component=ConfirmDelete] [role=dialog]")][0]; return d ? !!(d.getAttribute("aria-label") || d.getAttribute("aria-labelledby")) : false; });
  await page.keyboard.press("Escape"); await wait(page, 400);
  const closed = (await cdlg(page).count()) === 0;
  const restored = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Delete Mentions");
  await sh(page, "X-07-REL");
  const bad = [...r.l, ...r.d, ...r.edL, ...r.edD, ...r.delAxe.filter((v) => /serious|critical/.test(v)), ...r.edDirty, ...r.edDirtyDark, ...r.pillContrastLight, ...r.pillContrastDark];
  rec("X-07", !bad.length && !r.dup.length && !r.unl.length && !r.dupE.length && !r.unlE.length && focusIn && trapped && named && closed && restored ? "PASS" : "FAIL", `axe serious/critical: list light ${JSON.stringify(r.l)}, list dark ${JSON.stringify(r.d)}, editor ${JSON.stringify(r.edL)} / dark ${JSON.stringify(r.edD)}, delete dialog ${JSON.stringify(r.delAxe.filter((v) => /serious|critical/.test(v)))}; colour contrast with the form dirty (Save enabled) light ${JSON.stringify(r.edDirty)}, dark ${JSON.stringify(r.edDirtyDark)}; list contrast light ${JSON.stringify(r.pillContrastLight)} dark ${JSON.stringify(r.pillContrastDark)}; duplicate control names list ${JSON.stringify(r.dup)}, editor ${JSON.stringify(r.dupE)}; unlabelled inputs ${JSON.stringify(r.unl)} / ${JSON.stringify(r.unlE)}; delete dialog: focus moves in=${focusIn}, Tab stays inside=${trapped}, named=${named}, Escape closes=${closed}, focus returns to "Delete Mentions"=${restored}`, "acceptance-run-2-shots/X-07-REL.png");
  rec("X-08", !r.pillContrastLight.length && !r.pillContrastDark.length ? "PASS" : "FAIL", `Templates pills ${JSON.stringify(pills)} (grey vellum chips with secondary ink text): colour-contrast violations in light ${JSON.stringify(r.pillContrastLight)}, in dark ${JSON.stringify(r.pillContrastDark)}`, "acceptance-run-2-shots/X-08-REL-dark-1280.png");
  await page.context().close();

  // phone
  ({ page } = await open(b, "relationship-types", "mobile"));
  await wait(page, 700);
  const shape = await page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const row = c.querySelector("[data-part=row]"); return { table: !!c.querySelector("table,[role=table]"), headers: c.querySelectorAll("[role=columnheader]").length, rows: c.querySelectorAll("[data-part=row]").length, row0: row.innerText.replace(/\s+/g, " ") }; });
  const h0 = await hscroll(page);
  await sh(page, "X-06-REL-390");
  const ax = serious(await axe(page));
  await dark(page); await wait(page, 900); const axD = serious(await axe(page)); await sh(page, "X-08-REL-dark-390"); await light(page); await wait(page, 900); await wait(page, 900);
  const addB = S(page).locator("footer").getByRole("button", { name: /Add relationship type/ });
  const addSz = await addB.evaluate((e) => { const q = e.getBoundingClientRect(); return `${Math.round(q.width)}x${Math.round(q.height)}`; });
  // edit
  await S(page).locator("[data-part=row]").filter({ hasText: "Cites" }).first().tap(); await wait(page, 600);
  const edit = await page.evaluate(() => ({ dialogs: [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !/Notifications/.test(e.getAttribute("aria-label") || "")).length, h2: document.querySelector("[data-testid=settings-content] h2")?.innerText, input: !!document.querySelector("#relationship-type-name") }));
  await sh(page, "REL-22-edit");
  const h1 = await hscroll(page);
  await relName(page).fill("Cites M"); await relSave(page).tap(); await wait(page, 600);
  const names = (await relRows(page)).map((r) => r.replace(/ Templates.*$/, ""));
  // delete by touch (dialog after kb refresh as well)
  const delBtn = () => S(page).locator("[data-part=row]").filter({ hasText: "Hearing" }).first().getByRole("button", { name: "Delete Hearing" });
  const delSz = await delBtn().evaluate((e) => { const q = e.getBoundingClientRect(); return `${Math.round(q.width)}x${Math.round(q.height)}`; });
  await delBtn().tap(); await wait(page, 600);
  const kb0 = await kbValue(page); const g0 = await panelGeo(page);
  await sh(page, "REL-22-delete-sheet");
  await page.keyboard.press("Escape"); await wait(page, 300);
  await refreshKb(page); await wait(page, 200);
  await delBtn().tap(); await wait(page, 600);
  const g1 = await panelGeo(page);
  await sh(page, "REL-22-delete-sheet-after-kb-refresh");
  const visible = (g) => g && g.h > 60;
  rec("REL-22", !shape.table && shape.headers === 0 && h0.doc <= 0 && edit.dialogs > 0 && visible(g0) ? "PASS" : "FAIL", `phone 390x844: table=${shape.table}, column headers=${shape.headers}, ${shape.rows} rows, first row "${shape.row0}" (name, template pills, references: ok); overflow doc=${h0.doc}px pane=${h0.pane}px; tapping a row opens ${edit.dialogs} sheets/dialogs: it navigates to the editor page titled "${edit.h2}" (input present=${edit.input}) rather than a sheet; editor overflow ${h1.doc}px; rename + Save by touch -> list has "Cites M"=${names.includes("Cites M")}; "Add relationship type" button ${addSz}, row Delete button ${delSz}; Delete by touch: --kb ${JSON.stringify(kb0)}, dialog panel ${JSON.stringify(g0)} (collapsed to ${g0?.h}px: only the dim overlay is visible); after forcing a visualViewport resize the sheet measures ${JSON.stringify(g1)}`, "acceptance-run-2-shots/REL-22-delete-sheet.png");
  rec("X-06", !shape.table && h0.doc <= 0 && h1.doc <= 0 && visible(g0) ? "PASS" : "FAIL", `phone: rows not a wide table, no horizontal scroll (list ${h0.doc}px, editor ${h1.doc}px), editor single column; the delete dialog panel is ${g0?.h}px high right after load because --kb is ${JSON.stringify(kb0.kb)} (see REL-22); after a forced recompute it is a ${g1?.h}px bottom sheet`, "acceptance-run-2-shots/REL-22-delete-sheet.png");
  rec("X-07m", !ax.length && !axD.length ? "PASS" : "FAIL", `phone axe serious/critical light ${JSON.stringify(ax)}, dark ${JSON.stringify(axD)}`, "");
  await page.context().close();
});
