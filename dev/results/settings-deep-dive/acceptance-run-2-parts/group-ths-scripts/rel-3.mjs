import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, relPills, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries, toPanel, panelEdit, panelCreate, panelSave, panelText } from "./tx.mjs";
const refCount = async (p, name) => { const t = await S(p).locator("[data-part=row]").filter({ has: p.locator("[data-column=name]", { hasText: new RegExp("^" + name + "$") }) }).first().locator("[data-column=usage]").innerText(); return t.replace(/\s+/g, " ").trim(); };
const cdlg = (p) => p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]");
await run("REL-3", async (b) => {
  // REL-09 unused type
  let { page } = await open(b, "relationship-types");
  await wait(page, 600);
  await addRelType(page, "Unused type");
  const ticks = await S(page).locator("[role=checkbox], input[type=checkbox]").count();
  const b0 = await nlist(page);
  await delRel(page, "Unused type");
  const dl = await dialogText(page);
  await sh(page, "REL-09");
  const confirmBtn = cdlg(page).getByRole("button", { name: /Delete|Accept/ }).last();
  const label = await confirmBtn.innerText();
  await confirmBtn.click(); await wait(page, 600);
  const n9 = await fresh(page, b0);
  const gone = !(await relNames(page)).includes("Unused type");
  rec("REL-09", ticks > 0 && /Selected 1 of \d+/.test(await footerTxt(page)) ? "PASS" : "FAIL", `list rows have no checkboxes (${ticks}) so there is no "Selected 1 of m" bar; each row has its own Delete. Row Delete on the unused "Unused type": dialog "${dl}" (expected header "Delete" listing "Unused type" and saying no template or reference changes: the app says "No references or relationship fields use it."), confirm "${label}", Beacon new ${JSON.stringify(n9)} (expected an entry naming the type), row gone=${gone}`, "acceptance-run-2-shots/REL-09.png");
  rec("X-05", /No references or relationship fields use it/.test(dl) ? "PASS" : "FAIL", `unused type delete states nothing else changes ("${dl}"); used-type behaviour: see REL-10 and REL-11 (counts and the move target are shown)`, "acceptance-run-2-shots/REL-09.png");
  await page.context().close();

  // REL-10 used by template property
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const b1 = await nlist(page);
  await delRel(page, "Victim");
  const dl10 = await dialogText(page);
  const btns = await cdlg(page).locator("button").allInnerTexts();
  await sh(page, "REL-10");
  const disabled = await cdlg(page).getByRole("button", { name: /Delete|Move and delete|Accept/ }).last().isDisabled().catch(() => null);
  await page.keyboard.press("Escape"); await wait(page, 300);
  const still = (await relNames(page)).includes("Victim");
  const n10 = await fresh(page, b1);
  rec("REL-10", /Cannot delete type being used in templates: Court Case/.test(dl10) && still && n10.length === 0 ? "PASS" : "FAIL", `Delete on "Victim" (used by Court Case property "Victims", 6 references): dialog "${dl10}" with buttons ${JSON.stringify(btns)} (the refusal text matches Uwazi's "Cannot delete type being used in templates: <names>", with usage added); type stays after Escape=${still}; Beacon new ${JSON.stringify(n10)}`, "acceptance-run-2-shots/REL-10.png");
  await page.context().close();

  // REL-11 (A1)
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const before = await relNames(page);
  const mentionsCount = await refCount(page, "Mentions");
  const b2 = await nlist(page);
  await delRel(page, "Mentions");
  const t1 = await dialogText(page);
  const confirm = cdlg(page).getByRole("button", { name: /Move and delete|Delete/ }).last();
  const confirmLabel = await confirm.innerText();
  const disBefore = await confirm.isDisabled();
  await sh(page, "REL-11");
  const sel = cdlg(page).locator('button[aria-label^="Move references to"]');
  await sel.click(); await wait(page, 300);
  const opts = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape"); await wait(page, 200);
  // cancel changes nothing
  await cdlg(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300);
  const afterCancel = await relNames(page);
  const countAfterCancel = await refCount(page, "Mentions");
  // choose target
  await delRel(page, "Mentions");
  await cdlg(page).locator('button[aria-label^="Move references to"]').click(); await wait(page, 250);
  await page.getByRole("option", { name: "Relates to", exact: true }).click(); await wait(page, 250);
  const disAfter = await cdlg(page).getByRole("button", { name: /Move and delete|Delete/ }).last().isDisabled();
  const relatesBefore = await refCount(page, "Relates to").catch(() => "?");
  await cdlg(page).getByRole("button", { name: /Move and delete|Delete/ }).last().click(); await wait(page, 700);
  const n11 = await fresh(page, b2);
  const rowsAfter = await relNames(page);
  const relatesAfter = await refCount(page, "Relates to");
  // Undo
  const undo = page.locator("article").filter({ hasText: /references moved to/ }).getByRole("button", { name: "Undo" });
  const undoN = await undo.count();
  await openBeacon(page);
  if (undoN) await undo.first().click(); await wait(page, 600);
  const rowsUndo = await relNames(page);
  const mentionsUndo = (await relNames(page)).includes("Mentions") ? await refCount(page, "Mentions") : null;
  const relatesUndo = await refCount(page, "Relates to");
  const ok = /Delete relationship type/.test(t1) && /100 references/.test(t1) && disBefore && !opts.includes("Mentions") && opts.includes("No label") && opts.includes("Relates to") && JSON.stringify(afterCancel) === JSON.stringify(before) && !disAfter && !rowsAfter.includes("Mentions") && n11.length === 1 && /Relates to/.test(n11[0]) && /100 references/.test(n11[0]) && undoN === 1 && rowsUndo.includes("Mentions") && mentionsUndo === mentionsCount && relatesUndo === relatesBefore;
  rec("REL-11", ok ? "PASS" : "FAIL", `Delete on "Mentions" (${mentionsCount}): dialog "${t1}"; confirm button "${confirmLabel}" disabled before choosing a target=${disBefore}; "Move references to" options ${JSON.stringify(opts)} (never the type itself=${!opts.includes("Mentions")}, "No label" offered=${opts.includes("No label")}); Cancel changes nothing=${JSON.stringify(afterCancel) === JSON.stringify(before) && countAfterCancel === mentionsCount}; target "Relates to" chosen -> confirm enabled=${!disAfter}; after confirm: Mentions gone=${!rowsAfter.includes("Mentions")}, "Relates to" ${relatesBefore} -> ${relatesAfter}, Beacon new ${JSON.stringify(n11)} (carries the count and the target; it does not repeat the deleted type's name, accepted under A1); Undo buttons=${undoN}; after Undo Mentions back=${rowsUndo.includes("Mentions")} with "${mentionsUndo}" and "Relates to" "${relatesUndo}" (expected ${relatesBefore})`, "acceptance-run-2-shots/REL-11.png");
  await page.context().close();

  // REL-12 / REL-13 selection
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const boxes = await S(page).locator("[role=checkbox], input[type=checkbox]").count();
  const foot = await footerTxt(page);
  rec("REL-12", boxes > 0 ? "PASS" : "FAIL", `rows have no checkboxes (${boxes}) and the footer shows only "${foot}"; two types cannot be ticked, so a mixed delete dialog listing each type's status cannot be opened (single-row Delete only)`, "acceptance-run-2-shots/REL-01.png");
  rec("REL-13", boxes > 0 && /Selected \d+ of \d+/.test(foot) ? "PASS" : "FAIL", `no row checkboxes (${boxes}), no header select-all, no "Selected n of ${(await relNames(page)).length}" readout; the footer keeps "${foot}"`, "acceptance-run-2-shots/REL-01.png");
  rec("X-12", boxes > 0 ? "PASS" : "FAIL", `the list has no selection: no row checkboxes (${boxes}), the footer never shows "Selected n of total"`, "acceptance-run-2-shots/REL-01.png");
  await page.context().close();

  // REL-21 / X-10 empty
  ({ page } = await open(b, "relationship-types"));
  const { devButton, backToSettings } = await import("./dev.mjs");
  await devButton(page, "Empty relationship types"); await backToSettings(page, "Relationship types");
  const t = clean(await S(page).innerText());
  const adds = await S(page).getByRole("button", { name: "Add relationship type" }).count();
  await sh(page, "X-10-REL");
  const okE = /No relationship types yet/.test(t) && /label on a connection between two entities/.test(t) && adds >= 1 && !/Nothing here yet|NO DATA AVAILABLE/i.test(t);
  rec("REL-21", okE ? "PASS" : "FAIL", `after Dev panel "Empty relationship types": page text "${t.slice(0, 220)}"; "Add relationship type" buttons=${adds}; the generic "Nothing here yet."/"NO DATA AVAILABLE" absent=${!/Nothing here yet|NO DATA AVAILABLE/i.test(t)}. (The delete path through REL-19 is not needed: the Dev panel empties the store)`, "acceptance-run-2-shots/X-10-REL.png");
  rec("X-10", okE ? "PASS" : "FAIL", `empty relationship types: title "No relationship types yet", hint, "Add relationship type" action present (${adds})`, "acceptance-run-2-shots/X-10-REL.png");
  await page.context().close();
});
