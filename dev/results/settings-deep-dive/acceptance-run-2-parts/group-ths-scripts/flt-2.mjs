import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, footerTxt, openBeacon, dialogs, dialogText, newGroup, setGroupOf, groupSel, frow, groupNames, actName, arm, guardInfo } from "./tx.mjs";
const pageText = async (p) => clean(await S(p).innerText());
const guardTxt = async (p) => { await wait(p, 400); const t = await dialogText(p); return t ? t.replace(/^.*?(Discard changes\?)/, "$1").slice(0, 140) : "no dialog"; };
const cancelGuard = async (p) => { const c = p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Cancel" }); if (await c.count()) { await c.click(); await wait(p, 300); } };

await run("FLT-2", async (b) => {
  // FLT-04 / 05 / 06 / 09
  let { page } = await open(b, "filters");
  await wait(page, 500);
  const bodyBtn = await S(page).getByRole("button", { name: "New group" }).count();
  const footAdd = await S(page).locator("footer").getByRole("button", { name: /Add group/ }).count();
  const dirty0 = !(await saveF(page).isDisabled());
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page, 300);
  const dlgOpened = (await dialogText(page)).length > 0;
  const names1 = await groupNames(page);
  const dirty1 = !(await saveF(page).isDisabled());
  await groupNames(page);
  await sh(page, "FLT-04");
  rec("FLT-04", bodyBtn === 0 && footAdd === 1 && dlgOpened ? "PASS" : "FAIL", `"New group" button in the page body (Types section header)=${bodyBtn} (expected none); footer "Add group" buttons=${footAdd} (footer holds the filter count and Discard changes/Save); clicking "New group" opens a dialog=${dlgOpened} (no "Add group" Modal with Name and a Templates multi-select); instead a group chip named ${JSON.stringify(names1)} is appended at once, page dirty=${dirty1}; members are assigned afterwards through each row's Group select`, "acceptance-run-2-shots/FLT-04.png");
  // FLT-05 validation on chip name
  const nameInp = S(page).locator('input[aria-label="Group name"]').last();
  await setGroupOf(page, "Person", names1[0]);
  await nameInp.fill(""); await wait(page, 200);
  const empty = { text: (await pageText(page)).includes("This field is required"), alerts: await S(page).locator("[role=alert]").allInnerTexts() };
  await saveF(page).click({ force: true }).catch(() => {}); await wait(page, 400);
  const afterEmptySave = await groupNames(page);
  const emptyNote = await nlist(page);
  await nameInp.fill("   "); await wait(page, 150);
  const spaces = (await pageText(page)).includes("This field is required");
  await nameInp.fill("Documents"); await wait(page, 150);
  await newGroup(page, "documents "); await wait(page, 250);
  const dup = { text: /already|duplicate|exists/i.test(await pageText(page)), alerts: await S(page).locator("[role=alert]").allInnerTexts(), groups: await groupNames(page) };
  await sh(page, "FLT-05");
  rec("FLT-05", empty.text && spaces && dup.text && dup.groups.length === 1 ? "PASS" : "FAIL", `no "Add" dialog exists, so the rules were tried on the chip name field: cleared name -> message "This field is required" shown=${empty.text} (group stays as an unnamed chip; alerts ${JSON.stringify(empty.alerts)}); 3 spaces -> message shown=${spaces}; second group named "documents " next to "Documents" -> duplicate message shown=${dup.text} and both exist ${JSON.stringify(dup.groups)} (expected inline errors in the dialog and no second group)`, "acceptance-run-2-shots/FLT-05.png");
  await page.context().close();

  // FLT-06 / FLT-09 / FLT-10 / FLT-11
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await newGroup(page, "Documents");
  await setGroupOf(page, "Person", "Documents"); await setGroupOf(page, "Court Case", "Documents");
  await saveF(page).click(); await wait(page, 500);
  const editAct = await S(page).getByRole("button", { name: /^Edit/ }).count();
  const chipControls = await S(page).locator('input[aria-label="Group name"]').first().evaluate((i) => [...i.parentElement.querySelectorAll("button, select, input")].map((e) => e.getAttribute("aria-label") || e.innerText));
  await S(page).locator('input[aria-label="Group name"]').first().fill("Docs"); await wait(page, 150);
  await setGroupOf(page, "Court Case", "No group");
  const rows6 = await fRows(page);
  const sel6 = await Promise.all(["Person", "Court Case"].map(async (n) => `${n}: ${(await groupSel(page, n).getAttribute("aria-label"))}`));
  await sh(page, "FLT-06");
  rec("FLT-06", editAct > 0 && rows6.includes("-Court Case") ? "PASS" : "FAIL", `no "Edit" action or "Update" button exists (Edit buttons=${editAct}); the group is renamed in place on its chip (now "${(await groupNames(page))[0]}"); moving "Court Case" out through its Group select gives "${sel6[1]}" and its Show checkbox stays ticked (rows ${JSON.stringify(rows6.slice(0, 3))}); expected the removed member to become a hidden top-level row (Show unticked)`, "acceptance-run-2-shots/FLT-06.png");
  const hasGroupSelectOnGroup = chipControls.some((c) => /group$/i.test(c) && !/Group name|Remove/.test(c));
  rec("FLT-09", !hasGroupSelectOnGroup ? "PASS" : "FAIL", `a group is a chip with controls ${JSON.stringify(chipControls)}: no group select and no drag handle on it, and the row Group select lists only one level (options "No group", group names), so a group cannot sit inside a group`, "");
  const hasCollapse = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  const emptyText = /Empty group\. Drop here to add/.test(await pageText(page));
  // empty a group: move both members out
  await setGroupOf(page, "Person", "No group");
  const emptyAfter = /Empty group\. Drop here to add/.test(await pageText(page));
  await sh(page, "FLT-10");
  rec("FLT-10", hasCollapse > 0 && emptyAfter ? "PASS" : "FAIL", `groups are chips, not collapsible rows: "Collapse all"/"Expand all" buttons=${hasCollapse}, group row chevrons=0; after moving both members out the group shows "Empty group. Drop here to add"=${emptyAfter}`, "acceptance-run-2-shots/FLT-10.png");
  await saveF(page).click({ force: true }).catch(() => {});
  await page.context().close();

  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await newGroup(page, "Documents");
  await setGroupOf(page, "Person", "Documents"); await setGroupOf(page, "Court Case", "Documents");
  await saveF(page).click(); await wait(page, 500);
  const b0 = await nlist(page);
  await S(page).getByRole("button", { name: "Remove Documents" }).click(); await wait(page, 400);
  const dl11 = await dialogs(page);
  const gone = (await groupNames(page)).length === 0;
  const n11 = await fresh(page, b0);
  const dirtyAfterRemove = !(await saveF(page).isDisabled());
  const undo = page.locator("article").filter({ hasText: /Documents removed|Removed group/ }).getByRole("button", { name: "Undo" });
  const undoN = await undo.count();
  await openBeacon(page);
  if (undoN) await undo.first().click(); await wait(page, 400);
  const back = await groupNames(page);
  const members = await Promise.all(["Person", "Court Case"].map((n) => groupSel(page, n).getAttribute("aria-label")));
  const dirtyAfterUndo = !(await saveF(page).isDisabled());
  await sh(page, "FLT-11");
  rec("FLT-11", !dl11.length && gone && n11.some((t) => /Removed group "Documents"/.test(t)) && undoN === 1 && back.length === 1 && !dirtyAfterUndo ? "PASS" : "FAIL", `"Remove Documents": dialogs ${JSON.stringify(dl11)}; group gone at once=${gone}; Beacon new ${JSON.stringify(n11)} (expected e.g. Removed group "Documents" — the entry reads "Documents removed" with a detail line); Undo buttons=${undoN}; after Undo groups ${JSON.stringify(back)} with member selects ${JSON.stringify(members)}; page dirty after removing=${dirtyAfterRemove}, after Undo=${dirtyAfterUndo}`, "acceptance-run-2-shots/FLT-11.png");
  await page.context().close();

  // FLT-12 save + failure
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await showBox(page, "Hearing").click();
  const b1 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const n12 = await fresh(page, b1);
  const dis = [await saveF(page).isDisabled(), await discardF(page).isDisabled()];
  await page.reload(); await wait(page, 1500);
  const rl = await fRows(page);
  const st = await arm(page, "Save", "The server did not answer in time.", "Filters");
  await showBox(page, "Hearing").click();
  const b2 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const n12b = await fresh(page, b2);
  const keptEdit = !(await saveF(page).isDisabled());
  await sh(page, "FLT-12");
  rec("FLT-12", n12.length === 1 && /^Filters saved$/.test(n12[0]) && dis[0] && dis[1] && rl.includes("-Hearing") && n12b.length === 1 && /An error occurred/.test(n12b[0]) && keptEdit ? "PASS" : "FAIL", `hid "Hearing", Save: Beacon new ${JSON.stringify(n12)}; Save/Discard disabled after=${JSON.stringify(dis)}; after reload "Hearing" unticked=${rl.includes("-Hearing")}. Failure half (Dev panel armed for Save: ${st}): Save gave Beacon ${JSON.stringify(n12b)} and the edit stayed unsaved=${keptEdit} (expected one "An error occurred" entry and the edit kept)`, "acceptance-run-2-shots/FLT-12.png");
  rec("X-04", n12.length === 1 && n12b.length === 1 && /An error occurred/.test(n12b[0]) ? "PASS" : "FAIL", `success: one entry ${JSON.stringify(n12)}; failure injection for Save: ${JSON.stringify(n12b)} (the switch is not consumed by Filters)`, "acceptance-run-2-shots/FLT-12.png");
  await page.context().close();

  // FLT-13 empty group on save
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await newGroup(page, "Ghost");
  await showBox(page, "Hearing").click(); await showBox(page, "Hearing").click(); // keep dirty with the group only
  const b3 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const n13 = await fresh(page, b3);
  const rowNote = await pageText(page);
  const afterSaveGroups = await groupNames(page);
  const savedBox = clean(await S(page).locator("footer").innerText());
  await page.reload(); await wait(page, 1500);
  const rlGroups = await groupNames(page);
  await sh(page, "FLT-13");
  rec("FLT-13", rlGroups.length === 0 && (n13.some((t) => /Ghost|empty/i.test(t)) || /Ghost.*(no templates|empty|not saved)/i.test(rowNote)) ? "PASS" : "FAIL", `empty group "Ghost" then Save: Beacon ${JSON.stringify(n13)} (names the group or says it was dropped=${n13.some((t) => /Ghost|empty/i.test(t))}); group still on the page right after Save=${JSON.stringify(afterSaveGroups)}; after reload groups ${JSON.stringify(rlGroups)} (not stored); a note on the row before Save mentioning it=${/Ghost.*(no templates|empty|not saved)/i.test(rowNote)}`, "acceptance-run-2-shots/FLT-13.png");
  await page.context().close();

  // FLT-14 cancel / discard
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const cancelBtns = await S(page).locator("footer").getByRole("button", { name: /^Cancel$/ }).count();
  await showBox(page, "Hearing").click();
  await newGroup(page, "G1");
  const dirtyBoth = !(await saveF(page).isDisabled());
  await discardF(page).click(); await wait(page, 300);
  const rowsD = await fRows(page); const gD = await groupNames(page);
  const stD = [await saveF(page).isDisabled(), await discardF(page).isDisabled()];
  await showBox(page, "Hearing").click(); await showBox(page, "Hearing").click(); await wait(page, 200);
  const cleanAfterRevert = await saveF(page).isDisabled();
  await page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first().click(); await wait(page, 500);
  const noDlg = (await dialogText(page)) === "";
  await sh(page, "FLT-14");
  rec("FLT-14", cancelBtns === 1 && rowsD.every((r) => r.startsWith("+")) && gD.length === 0 && stD[0] && stD[1] && cleanAfterRevert && noDlg ? "PASS" : "FAIL", `footer ghost "Cancel" buttons=${cancelBtns} (the footer button is named "Discard changes"); hid Hearing + added a group (dirty=${dirtyBoth}), "Discard changes": all rows shown=${rowsD.every((r) => r.startsWith("+"))}, groups ${JSON.stringify(gD)}, Save/Discard disabled=${JSON.stringify(stD)}; hid and re-showed by hand: Save disabled=${cleanAfterRevert}, rail click opens no dialog=${noDlg}. Behaviour as expected; only the button label differs from "Cancel"`, "acceptance-run-2-shots/FLT-14.png");
  await page.context().close();

  // FLT-15 + X-02
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await showBox(page, "Hearing").click();
  const rl1 = page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first();
  await rl1.click(); const g1 = await guardTxt(page);
  await cancelGuard(page);
  await rl1.click(); const g2 = await guardTxt(page);
  await cancelGuard(page);
  await page.locator("button", { hasText: "Library" }).first().click(); const g3 = await guardTxt(page);
  await cancelGuard(page);
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 250);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Sample" }).click().catch(() => {}); const g4 = await guardTxt(page);
  await cancelGuard(page);
  const stillDirty = !(await saveF(page).isDisabled());
  await sh(page, "FLT-15");
  const ok = [g1, g2, g3, g4].every((g) => /unsaved changes/.test(g));
  rec("FLT-15", ok && stillDirty ? "PASS" : "FAIL", `dirty (Hearing hidden): rail click -> ${g1}; Cancel then rail click again -> ${g2}; navbar Library -> ${g3}; data source switch -> ${g4}; the edit survives Cancel=${stillDirty}. The "Add group" dialog does not exist, so its stale-state clause cannot be driven (the group is added directly). Mobile chevron: see FLT-21`, "acceptance-run-2-shots/FLT-15.png");
  rec("X-02", ok ? "PASS" : "FAIL", `dialog "Discard changes?" with "You have unsaved changes. Do you want to continue?" for rail, navbar link and data-source switch: ${[g1, g2, g3, g4].join(" | ")}; clean page: no dialog (FLT-14 rail click after a hand revert)`, "acceptance-run-2-shots/FLT-15.png");
  await page.context().close();
});
