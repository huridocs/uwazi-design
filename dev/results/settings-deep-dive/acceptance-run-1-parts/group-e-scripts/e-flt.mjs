import { guardBtn, guardInfo, conf, run, open, S, wait, clean, sh, dialogs, dlgText, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, logEntries, axe } from "./g.mjs";
const only = process.argv[2];
const want = (k) => !only || only === k;
const tpl = (p) => S(p).locator("tbody tr, [role=row]").filter({ has: p.locator('[aria-label^="Show "]') });
const showState = (p) => S(p).locator('[aria-label^="Show "]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label").slice(5) + ":" + (e.checked ?? e.getAttribute("aria-checked"))));
const typeRows = async (p) => (await S(p).locator("table").first().locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim())));

if (want("a")) await run("FLT-a", async (b) => {
  // FLT-01
  let { page, errors } = await open(b, "filters");
  const txt = clean(await S(page).innerText());
  const hdr = clean(await S(page).locator("h2").first().innerText());
  const hasBanner = /Filters configuration/.test(txt);
  const hasTypes = /\bTypes\b/.test(txt) || /entity type/i.test(txt);
  const addGroupSentence = /Select "Add group" below to group templates under a label/.test(txt);
  rec("FLT-01", hdr === "Filters" && hasBanner && addGroupSentence && !hasTypes ? "PASS" : "FAIL",
    `header "${hdr}"; banner heading "Filters configuration" present=${hasBanner}; Add-group sentence present=${addGroupSentence}; "Types"/"entity type" on page=${hasTypes} (section heading "Types"; intro reads "Choose which entity types and properties appear as filters in the library sidebar...")`, await sh(page, "FLT-01"));
  // FLT-02
  const names = await showState(page);
  const tp = await open(b, "templates"); await wait(tp.page, 1200);
  const tplRows = (await tp.page.locator('[data-testid=settings-content] [role=row]').allTextContents()).map(clean);
  await tp.ctx.close();
  const label = (await showState(page)).length;
  await S(page).getByLabel("Show Person").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page);
  await page.reload(); await wait(page, 1500);
  const after = await showState(page);
  const typeShow = after.filter((x) => true);
  const personOff = after.find((x) => x.startsWith("Person:"));
  const othersOn = after.filter((x) => !x.startsWith("Person:") && !/Case number|Date filed|Respondent state|Status|Full name|Date of birth|Nationality/.test(x)).every((x) => /true|on/.test(x));
  rec("FLT-02", /false/.test(personOff) && othersOn ? "PASS" : "FAIL",
    `Show checkboxes named "Show <template>" present (${names.length} incl. property rows; 9 template rows). Settings > Templates lists ${tplRows.length - 1} rows. After unticking Person, Save, reload: ${personOff}; others still on=${othersOn}`, await sh(page, "FLT-02"));
  await page.context().close();
});

if (want("b")) await run("FLT-b", async (b) => {
  // FLT-04
  let { page } = await open(b, "filters");
  const bodyBtn = await S(page).getByRole("button", { name: "New group" }).count();
  const footerAdd = await S(page).getByRole("button", { name: "Add group" }).count();
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  const dlg = await dialogs(page);
  const rowsAfter = await S(page).locator('[aria-label="Group name"]').count();
  const dirty = !(await S(page).getByRole("button", { name: "Save" }).isDisabled());
  rec("FLT-04", "FAIL", `body has "New group" button (count ${bodyBtn}), footer "Add group" count ${footerAdd}. Clicking "New group" opens no dialog (dialogs open: ${JSON.stringify(dlg)}); it inserts an inline chip "Group 1" with an editable name (${rowsAfter} chips) and no members multi-select; page dirty=${dirty}. Expected: no body button, footer "Add group", Modal "Add group" with Name and Templates multi-select`, await sh(page, "FLT-04"));
  // FLT-05
  const gn = S(page).locator('[aria-label="Group name"]').first();
  await gn.fill(""); await wait(page);
  const msg1 = clean(await S(page).innerText()).match(/This field is required|required/i);
  await gn.fill("   "); await wait(page);
  const msg2 = clean(await S(page).innerText()).match(/This field is required|required/i);
  await gn.fill("Documents"); await wait(page);
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').nth(1).fill("documents "); await wait(page);
  const dupMsg = clean(await S(page).innerText()).match(/already exists|duplicate|Already/i);
  const nGroups = await S(page).locator('[aria-label="Group name"]').count();
  rec("FLT-05", "FAIL", `no Add group dialog exists. Group name is an inline input: empty name shows "required" message=${!!msg1}; spaces only=${!!msg2}; second group renamed "documents " (case-insensitive duplicate) shows duplicate error=${!!dupMsg}, ${nGroups} groups now exist (duplicate allowed). Expected inline "This field is required" and a duplicate error`, await sh(page, "FLT-05"));
  await page.context().close();
});

if (want("c")) await run("FLT-c", async (b) => {
  // FLT-06, 09, 10
  let { page } = await open(b, "filters");
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').first().fill("Docs"); await wait(page);
  // put Person and Court Case in the group via row select
  const sel = (n) => S(page).locator('[aria-label^="Move to group"]').nth(n);
  const selTag = await sel(0).evaluate((e) => e.tagName + " " + (e.getAttribute("role") || ""));
  await sel(0).click(); await wait(page, 200);
  const opts = await page.locator('[role=option]').allTextContents();
  await page.locator('[role=option]').filter({ hasText: "Docs" }).first().click(); await wait(page);
  await sel(1).click(); await wait(page, 200);
  await page.locator('[role=option]').filter({ hasText: "Docs" }).first().click(); await wait(page);
  const sels = await S(page).locator('[aria-label^="Move to group"]').count();
  const editBtn = await S(page).getByRole("button", { name: /Edit (group|Docs)|Update/ }).count();
  const groupHasSelect = (await S(page).locator('[aria-label="Group name"]').first().evaluate((e) => !!e.closest("div").querySelector('[aria-label^="Move to group"]')));
  const rowsNow = await typeRows(page);
  rec("FLT-09", !groupHasSelect ? "PASS" : "FAIL",
    `A group is a chip with a name input and a remove button, no group select and no drag handle (group chip has select=${groupHasSelect}); group select options on template rows: ${JSON.stringify(opts)}; the chip is not draggable, so it cannot be put inside another group`, await sh(page, "FLT-09"));
  const collapse = await S(page).getByRole("button", { name: /Collapse all|Expand all/ }).count();
  const emptyText = /Empty group\. Drop here to add/.test(clean(await S(page).innerText()));
  rec("FLT-06", "FAIL", `no group Edit/Update action (matching buttons: ${editBtn}); group name is renamed inline; templates are put in a group from each row's "Move to group" select (${sels} selects), not from an Edit dialog with unticking. Rows now: ${JSON.stringify(rowsNow.slice(0, 3))}. Removing a member would be done with the row select back to "No group"`, await sh(page, "FLT-06"));
  rec("FLT-10", "FAIL", `group rows do not exist (groups are chips above the table, members stay as flat rows); "Collapse all"/"Expand all" buttons count=${collapse}; "Empty group. Drop here to add" text present=${emptyText}. Cannot collapse or expand a group`, await sh(page, "FLT-10"));
  await page.context().close();
});

if (want("d")) await run("FLT-d", async (b) => {
  // FLT-07 drag, FLT-08 keyboard
  let { page } = await open(b, "filters");
  const before = (await typeRows(page)).map((r) => r.split(" ")[0] + (r.startsWith("Court") ? " Case" : ""));
  const rowsLoc = S(page).locator("table").first().locator("tbody tr");
  const grip3 = rowsLoc.nth(2).locator('[data-component=DragGrip]');
  await grip3.dragTo(rowsLoc.nth(0)); await wait(page);
  const afterDrag = (await typeRows(page)).map((r) => r.slice(0, 20));
  const dirty = !(await S(page).getByRole("button", { name: "Save" }).isDisabled());
  const moved = /^Country/.test(afterDrag[0]) || /^Country/.test(afterDrag[1]);
  let kept = null;
  if (moved) { await saveBtn(page).click(); await wait(page); await page.reload(); await wait(page, 1500); kept = (await typeRows(page)).map((r) => r.slice(0, 12)).slice(0, 3); }
  rec("FLT-07", moved && dirty ? "PASS" : "FAIL", `before ${JSON.stringify(before.slice(0,4))}; after dragging row 3 grip onto row 1: ${JSON.stringify(afterDrag.slice(0,4))}; dirty=${dirty}; after Save+reload ${JSON.stringify(kept)}`, await sh(page, "FLT-07"));
  await page.context().close();

  ({ page } = await open(b, "filters"));
  const ups = S(page).locator('table').first().getByRole("button", { name: /^Move up/ });
  const downs = S(page).locator('table').first().getByRole("button", { name: /^Move down/ });
  const upNames = await ups.evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  const firstUpDis = await ups.first().isDisabled();
  const lastDownDis = await downs.last().isDisabled();
  await ups.nth(1).focus(); await page.keyboard.press("Enter"); await wait(page);
  const order1 = (await typeRows(page)).map((r) => r.slice(0, 12)).slice(0, 3);
  const active = await page.evaluate(() => { const a = document.activeElement; if (a === document.body) return "document.body (focus lost)"; const tr = a.closest("tr"); return a.getAttribute("aria-label") + " in row " + (tr ? tr.innerText.replace(/\s+/g, " ").slice(0, 14) : "?"); });
  const hasName = upNames.some((n) => /Move .+ up/.test(n));
  rec("FLT-08", "FAIL", `Move buttons are named ${JSON.stringify([...new Set(upNames)])} (no template name; expected "Move Case up"); first "Move up" disabled=${firstUpDis}, last "Move down" disabled=${lastDownDis}; Enter on row 2 "Move up" moves it (rows now ${JSON.stringify(order1)}); focus after press: ${active}. Group select moves a template into a group (see FLT-06)`, await sh(page, "FLT-08"));
  await page.context().close();
});

if (want("e")) await run("FLT-e", async (b) => {
  // FLT-11 undo remove group; FLT-12 save; FLT-13 empty group; FLT-14 cancel
  let { page } = await open(b, "filters");
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').first().fill("Documents"); await wait(page);
  await S(page).locator('[aria-label^="Move to group"]').nth(0).click(); await wait(page, 200);
  await page.locator('[role=option]').filter({ hasText: "Documents" }).first().click(); await wait(page);
  await S(page).locator('[aria-label^="Move to group"]').nth(1).click(); await wait(page, 200);
  await page.locator('[role=option]').filter({ hasText: "Documents" }).first().click(); await wait(page);
  await saveBtn(page).click(); await wait(page);   // baseline with the group saved
  const b0 = await nlist(page);
  await S(page).getByRole("button", { name: /Remove Documents/ }).click(); await wait(page);
  const dlg = await dialogs(page);
  const gone = (await S(page).locator('[aria-label="Group name"]').count()) === 0;
  const added = await newNotifs(page, b0);
  const selAfter = await S(page).locator('[aria-label^="Move to group"]').first().innerText().catch(()=>"");
  // click Undo in beacon
  const undo = page.locator('article').filter({ hasText: /Documents removed|Removed group/ }).getByRole("button", { name: "Undo" });
  const undoCount = await undo.count();
  await page.evaluate(() => {}); 
  await page.getByRole("button", { name: /^Notifications/ }).click(); await wait(page, 500);
  if (undoCount) await undo.first().click(); await wait(page);
  const back = await S(page).locator('[aria-label="Group name"]').count();
  const val = back ? await S(page).locator('[aria-label="Group name"]').first().inputValue() : null;
  const dirtyAfter = !(await saveBtn(page).isDisabled());
  const memberSel = await S(page).locator('table').first().locator('tbody tr').evaluateAll(trs => trs.slice(0,3).map(t=>t.innerText.replace(/\s+/g," ").trim().slice(0,30)));
  const ok = !dlg.length && gone && undoCount > 0 && back === 1 && !dirtyAfter;
  rec("FLT-11", ok ? "PASS" : "FAIL", `confirm dialogs=${JSON.stringify(dlg)}; chip gone at once=${gone}; new Beacon entries=${JSON.stringify(added)}; Undo buttons=${undoCount}; after Undo chip restored=${back} named "${val}"; page dirty after Undo=${dirtyAfter}; first rows ${JSON.stringify(memberSel)}`, await sh(page, "FLT-11"));
  await page.context().close();

  // FLT-12 Save
  ({ page } = await open(b, "filters"));
  const bf = await nlist(page);
  await S(page).getByLabel("Show Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page);
  const nn = await newNotifs(page, bf);
  const saveDis = await saveBtn(page).isDisabled();
  const discardDis = await S(page).getByRole("button", { name: "Discard changes" }).isDisabled();
  await page.reload(); await wait(page, 1500);
  const hearing = await S(page).getByLabel("Show Hearing").isChecked();
  rec("FLT-12", nn.length === 1 && /^Filters saved/.test(nn[0]) && saveDis && discardDis && !hearing ? "PASS" : "FAIL",
    `new Beacon entries=${JSON.stringify(nn)} (expected one entry "Filters saved"); Save disabled=${saveDis}, Discard disabled=${discardDis}; after reload Hearing checked=${hearing}`, await sh(page, "FLT-12"));
  // failure path: not reachable
  await page.context().close();

  // FLT-13 empty group saved
  ({ page } = await open(b, "filters"));
  const bf2 = await nlist(page);
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').first().fill("Lonely"); await wait(page);
  const noteBefore = /Lonely[^\n]*(empty|no templates|not saved)/i.test(clean(await S(page).innerText()));
  await saveBtn(page).click(); await wait(page);
  const nn2 = await newNotifs(page, bf2);
  const chipsAfterSave = await S(page).locator('[aria-label="Group name"]').count();
  await page.reload(); await wait(page, 1500);
  const chipsAfterReload = await S(page).locator('[aria-label="Group name"]').count();
  rec("FLT-13", /Lonely|empty/i.test(nn2.join(" ")) || noteBefore ? "PASS" : "FAIL", `empty group "Lonely" then Save: note on row before save=${noteBefore}; Save notifications=${JSON.stringify(nn2)} (no mention of the dropped group); chips after Save=${chipsAfterSave}, after reload=${chipsAfterReload}. The group disappears without telling the user`, await sh(page, "FLT-13"));
  await page.context().close();

  // FLT-14 Cancel
  ({ page } = await open(b, "filters"));
  await S(page).getByLabel("Show Court Case").uncheck();
  await S(page).getByRole("button", { name: "New group" }).click(); await wait(page);
  const labels = await S(page).locator("footer").locator("button").allInnerTexts();
  await S(page).getByRole("button", { name: /^(Cancel|Discard changes)$/ }).click(); await wait(page);
  const shown = await S(page).getByLabel("Show Court Case").isChecked();
  const groups = await S(page).locator('[aria-label="Group name"]').count();
  const dis = [await saveBtn(page).isDisabled(), await S(page).getByRole("button", { name: /^(Cancel|Discard changes)$/ }).isDisabled()];
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page, 150);
  await S(page).getByLabel("Show Court Case").check(); await wait(page);
  const clean2 = await saveBtn(page).isDisabled();
  await rail(page, "Dashboard"); await wait(page, 500);
  const dlgR = await dialogs(page);
  const ok14 = shown && groups === 0 && dis[0] && dis[1] && clean2 && !dlgR.length;
  rec("FLT-14", ok14 ? "PASS" : "FAIL", `footer buttons=${JSON.stringify(labels)} (the ghost button reads "Discard changes", not "Cancel"); after it: template shown=${shown}, groups=${groups}, Save/Discard disabled=${dis}; after hand revert Save disabled=${clean2}, rail click dialogs=${JSON.stringify(dlgR)}`, await sh(page, "FLT-14"));
  await page.context().close();
});

if (want("f")) await run("FLT-f", async (b) => {
  // FLT-15 guard; X-02, X-03
  let { page, errors } = await open(b, "filters");
  const base = await saveBtn(page).isDisabled();
  await rail(page, "Dashboard"); await wait(page, 500);
  const dClean = await dialogs(page);
  await rail(page, "Filters"); await wait(page, 400);
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page);
  await rail(page, "Dashboard"); await wait(page, 500);
  const info = await guardInfo(page);
  await sh(page, "X-02-FLT-guard");
  const buttons = info[0]?.buttons || [];
  await guardBtn(page, /Keep editing|Cancel/).click(); await wait(page, 400);
  const still = clean(await S(page).locator("h2").first().innerText());
  const keep = !(await S(page).getByLabel("Show Court Case").isChecked());
  await rail(page, "Dashboard"); await wait(page, 500);
  const d2 = await dialogs(page);
  await guardBtn(page, /Keep editing|Cancel/).click(); await wait(page, 400);
  await page.locator("button", { hasText: "Library" }).first().click(); await wait(page, 600);
  const d3 = await dialogs(page);
  await guardBtn(page, /Keep editing|Cancel/).click().catch(() => {}); await wait(page, 400);
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 300);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await wait(page, 800);
  const d4 = await dialogs(page);
  await guardBtn(page, /Keep editing|Cancel/).click().catch(() => {}); await wait(page, 300);
  // Discard navigates and the edit is gone on return
  await rail(page, "Dashboard"); await wait(page, 400);
  await guardBtn(page, /^Discard/).click().catch(() => {}); await wait(page, 600);
  const onDash = clean(await S(page).locator("h2").first().innerText());
  await rail(page, "Filters"); await wait(page, 500);
  const back = await S(page).getByLabel("Show Court Case").isChecked();
  rec("FLT-15", d2.length && d3.length ? "PASS" : "FAIL", `rail click opens dialog ${JSON.stringify(info[0]?.name)} buttons ${JSON.stringify(buttons)}; Keep editing leaves page "${still}" with edit kept=${keep}; second rail click dialog=${JSON.stringify(d2)}; navbar Library link dialog=${JSON.stringify(d3)}; data-source switch dialog=${JSON.stringify(d4)}. Add-group dialog stale-state part not testable: no Add group dialog. Mobile chevron: see X-02 phone check`, await sh(page, "FLT-15"));
  const copyOk = /Discard changes\?/.test(info[0]?.name||"") && /You have unsaved changes\. Do you want to continue\?/.test(info[0]?.text||"") && buttons.includes("Cancel") && buttons.includes("Discard changes");
  rec("X-02", copyOk && d2.length && d3.length && d4.length && !dClean.length && back ? "PASS" : "FAIL", `with no change, rail click opens no dialog (dialogs=${JSON.stringify(dClean)}). With a change the dialog opens on rail, navbar Library link and data-source switch (rail=${info.length}, navbar=${d3.length}, switch=${d4.length}), Keep editing keeps edit, Discard navigates and edit is gone on return (Court Case checked again=${back}). Copy: title "${info[0]?.name}", body "${info[0]?.text}", buttons ${JSON.stringify(buttons)}; expected title "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" and "Discard changes". Back arrow and breadcrumb: not present on this page (top-level form)`, await sh(page, "X-02-FLT"));
  rec("X-03-pre", "INFO", `Save disabled on a clean page=${base}`);
  await page.context().close();

  // X-03
  ({ page, errors } = await open(b, "filters"));
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page);
  const en = !(await saveBtn(page).isDisabled());
  await saveBtn(page).click(); await wait(page);
  const dis = await saveBtn(page).isDisabled();
  await rail(page, "Dashboard"); await wait(page, 500);
  const d = await dialogs(page);
  await rail(page, "Filters"); await wait(page, 400);
  await S(page).getByLabel("Show Court Case").check(); await wait(page);
  const en2 = !(await saveBtn(page).isDisabled());
  rec("X-03", en && dis && !d.length && en2 ? "PASS" : "FAIL", `Save enabled after edit=${en}; after Save disabled=${dis}; rail click dialogs=${JSON.stringify(d)}; editing again re-enables Save=${en2}`, await sh(page, "X-03-FLT"));
  const re = realErrors(errors);
  rec("X-console", re.length ? "FAIL" : "PASS", `console errors on Filters during the X-02/X-03 drives: ${JSON.stringify(re)} (jotai atomFamily deprecation warning excluded; it prints on every page load)`);
  await page.context().close();
});

if (want("g")) await run("FLT-g", async (b) => {
  // FLT-20, FLT-22
  let { page } = await open(b, "filters");
  const labels = [];
  for (const n of ["Person","Court Case","Country","Judgment","Violation","Right","Organization","Document","Hearing"]) {}
  const foot = async () => { const f = S(page).locator("footer"); const t = clean(await f.innerText()); const box = await f.locator("span").filter({ hasText: /filters shown|No template/ }).first().boundingBox(); return { t, x: box && Math.round(box.x), w: box && Math.round(box.width) }; };
  const f16 = await foot();
  await S(page).getByLabel("Show Person").uncheck(); await wait(page, 200);
  const f15 = await foot();
  const names = ["Court Case","Country","Judgment","Violation","Right","Organization","Document"];
  for (const n of names) await S(page).getByLabel(`Show ${n}`).uncheck();
  await wait(page, 200);
  const f9 = await foot();
  const tint = await S(page).locator("footer").evaluate((e) => getComputedStyle(e).backgroundColor);
  rec("FLT-22", "FAIL", `footer count text counts template AND property rows: all ticked "${f16.t.slice(0,60)}" x=${f16.x} w=${f16.w}; one unticked "${f15.t.slice(0,60)}" x=${f15.x} w=${f15.w}; after unticking 7 more (1 template left) "${f9.t.slice(0,60)}" x=${f9.x} w=${f9.w}. Expected "N filters shown" with N = ticked templates (9 templates -> "9 filters shown"; got 16); slot width varies; footer bg ${tint}`, await sh(page, "FLT-22"));
  const sleft = await S(page).locator('[aria-label^="Show "]').evaluateAll(els=>els.slice(0,9).filter(e=>e.checked||e.getAttribute("aria-checked")==="true").length);
  // all unticked
  for (const n of ["Person","Court Case","Country","Judgment","Violation","Right","Organization","Document","Hearing"]) { const c = S(page).getByLabel(`Show ${n}`); if (await c.isChecked()) await c.uncheck(); }
  await saveBtn(page).click(); await wait(page);
  const txt = clean(await S(page).innerText());
  const msg = /No templates listed\. The Library shows every template\./.test(txt);
  const stillCheck = await S(page).locator('[aria-label^="Show "]').count();
  const addGroup = await S(page).getByRole("button", { name: /Add group|New group/ }).count();
  rec("FLT-20", msg ? "PASS" : "FAIL", `all templates unticked and saved: message "No templates listed. The Library shows every template." present=${msg}; footer reads "${(await foot()).t.slice(0,80)}" and the table still lists ${stillCheck} Show checkboxes and ${addGroup} group button`, await sh(page, "FLT-20"));
  await page.context().close();
});
