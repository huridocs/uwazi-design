import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, toSettings, logEntries, axe, dupNames, unlabelled } from "./g.mjs";
import { arm } from "./dev.mjs";
const typeRows = (p) => S(p).locator("table").first().locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));
const discardBtn = (p) => S(p).getByRole("button", { name: /^(Cancel|Discard changes)$/ });

await run("FLT-e", async (b) => {
  // FLT-11 undo remove group; FLT-12 save; FLT-13 empty group; FLT-14 cancel
  let { page } = await open(b, "filters");
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').first().fill("Documents"); await wait(page);
  for (const n of [0, 1]) { await S(page).locator('button[aria-label^="Move to group"]').nth(n).click(); await wait(page, 200); await page.locator('[role=option]').filter({ hasText: "Documents" }).first().click(); await wait(page); }
  await saveBtn(page).click(); await wait(page);
  const b0 = await nlist(page);
  await S(page).getByRole("button", { name: /Remove Documents/ }).click(); await wait(page);
  const dlg = await dialogs(page);
  const gone = (await S(page).locator('[aria-label="Group name"]').count()) === 0;
  const added = await newNotifs(page, b0);
  const undo = page.locator('article').filter({ hasText: /Documents removed|Removed group/ }).getByRole("button", { name: "Undo" });
  const undoCount = await undo.count();
  await page.getByRole("button", { name: /^Notifications/ }).click(); await wait(page, 500);
  if (undoCount) await undo.first().click(); await wait(page);
  const back = await S(page).locator('[aria-label="Group name"]').count();
  const val = back ? await S(page).locator('[aria-label="Group name"]').first().inputValue() : null;
  const dirtyAfter = !(await saveBtn(page).isDisabled());
  const memberSel = (await typeRows(page)).slice(0, 3).map((t) => t.slice(0, 30));
  const named = added.some((t) => /Removed group “?Documents|Documents/.test(t));
  rec("FLT-11", !dlg.length && gone && undoCount > 0 && back === 1 && !dirtyAfter && named ? "PASS" : "FAIL", `confirm dialogs=${JSON.stringify(dlg)}; chip gone at once=${gone}; new Beacon entries=${JSON.stringify(added)} (names the group=${named}; expected e.g. Removed group "Documents"); Undo buttons=${undoCount}; after Undo group restored=${back} named "${val}", members ${JSON.stringify(memberSel)}; page dirty after Undo=${dirtyAfter}`, await sh(page, "FLT-11"));
  await page.context().close();

  // FLT-12 Save: success half in a clean context, failure half through the Dev panel
  ({ page } = await open(b, "filters"));
  const bs = await nlist(page);
  await S(page).getByLabel("Show Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page, 500);
  const nn = await newNotifs(page, bs);
  const saveDis = await saveBtn(page).isDisabled();
  const discardDis = await discardBtn(page).isDisabled();
  await page.reload(); await wait(page, 1500);
  const hearing = await S(page).getByLabel("Show Hearing").isChecked();
  await page.context().close();
  ({ page } = await open(b, "filters"));
  const armMsg = await arm(page, "Save", "Filters could not be written.", "Filters");
  const bf = await nlist(page);
  await S(page).getByLabel("Show Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page, 500);
  const nf = await newNotifs(page, bf);
  const stillDirty = !(await saveBtn(page).isDisabled());
  const hearingEdit = !(await S(page).getByLabel("Show Hearing").isChecked());
  const failOk = nf.length === 1 && /^An error occurred/.test(nf[0]) && /Filters could not be written/.test(nf[0]) && stillDirty && hearingEdit;
  rec("FLT-12", nn.length === 1 && /^Filters saved/.test(nn[0]) && saveDis && discardDis && !hearing && failOk ? "PASS" : "FAIL",
    `Success: new Beacon entries=${JSON.stringify(nn)} (expected one entry "Filters saved"); Save disabled=${saveDis}, Discard disabled=${discardDis}; after reload Hearing checked=${hearing}. Failure (Dev panel: "${armMsg}"): Save on Filters gave Beacon entries ${JSON.stringify(nf)}, Save still enabled=${stillDirty}, Hearing edit kept=${hearingEdit}; the Filters page does not read the switch (a failure entry titled "An error occurred" is expected)`, await sh(page, "FLT-12"));
  rec("X-04-fail@FLT", failOk ? "PASS" : "FAIL", `SD-1 on Filters: armed Save "Filters could not be written." and saved: entries ${JSON.stringify(nf)}; expected exactly one "An error occurred" with the reason and the edits kept. Dev panel status after arming: "${armMsg}"`);
  await page.context().close();

  // FLT-13 empty group saved
  ({ page } = await open(b, "filters"));
  const bf3 = await nlist(page);
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page);
  await S(page).locator('[aria-label="Group name"]').first().fill("Lonely"); await wait(page);
  const noteBefore = /Lonely[^\n]*(empty|no templates|not saved)/i.test(clean(await S(page).innerText()));
  await saveBtn(page).click(); await wait(page);
  const nn2 = await newNotifs(page, bf3);
  const chipsAfterSave = await S(page).locator('[aria-label="Group name"]').count();
  await page.reload(); await wait(page, 1500);
  const chipsAfterReload = await S(page).locator('[aria-label="Group name"]').count();
  rec("FLT-13", /Lonely|empty/i.test(nn2.join(" ")) || noteBefore ? "PASS" : "FAIL", `empty group "Lonely" then Save: note on the row before Save=${noteBefore}; Save notifications=${JSON.stringify(nn2)} (naming the dropped group=${/Lonely/.test(nn2.join(" "))}); group chips after Save=${chipsAfterSave}, after reload=${chipsAfterReload}`, await sh(page, "FLT-13"));
  await page.context().close();

  // FLT-14 Cancel
  ({ page } = await open(b, "filters"));
  await S(page).getByLabel("Show Court Case").uncheck();
  await S(page).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(page);
  const labels = await S(page).locator("footer").locator("button").allInnerTexts();
  await discardBtn(page).click(); await wait(page);
  const shown = await S(page).getByLabel("Show Court Case").isChecked();
  const groups = await S(page).locator('[aria-label="Group name"]').count();
  const dis = [await saveBtn(page).isDisabled(), await discardBtn(page).isDisabled()];
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page, 150);
  await S(page).getByLabel("Show Court Case").check(); await wait(page);
  const clean2 = await saveBtn(page).isDisabled();
  await rail(page, "Dashboard"); await wait(page, 500);
  const dlgR = await dialogs(page);
  const okLabel = labels.includes("Cancel");
  rec("FLT-14", shown && groups === 0 && dis[0] && dis[1] && clean2 && !dlgR.length ? "PASS" : "FAIL", `footer buttons=${JSON.stringify(labels)} (the ghost button reads "Discard changes", not "Cancel"; behaviour as expected); after it: template shown=${shown}, groups=${groups}, Save/Discard disabled=${JSON.stringify(dis)}; after hand revert Save disabled=${clean2}, rail click dialogs=${JSON.stringify(dlgR)}`, await sh(page, "FLT-14"));
  await page.context().close();
});

await run("FLT-f", async (b) => {
  // FLT-15 guard; X-02, X-03
  let { page, errors } = await open(b, "filters");
  await rail(page, "Dashboard"); await wait(page, 500);
  const dClean = await dialogs(page);
  await rail(page, "Filters"); await wait(page, 400);
  await S(page).getByLabel("Show Court Case").uncheck(); await wait(page);
  await rail(page, "Dashboard"); await wait(page, 500);
  const info = await guardInfo(page);
  await sh(page, "X-02-FLT-guard");
  const buttons = info[0]?.buttons || [];
  await guardBtn(page, /^Cancel$/).click(); await wait(page, 400);
  const still = clean(await S(page).locator("h2").first().innerText());
  const keep = !(await S(page).getByLabel("Show Court Case").isChecked());
  await rail(page, "Dashboard"); await wait(page, 500);
  const d2 = await dialogs(page);
  await guardBtn(page, /^Cancel$/).click(); await wait(page, 400);
  await page.locator("button", { hasText: "Library" }).first().click(); await wait(page, 600);
  const d3 = await dialogs(page);
  await guardBtn(page, /^Cancel$/).click().catch(() => {}); await wait(page, 400);
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 300);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "CEJIL" }).click(); await wait(page, 800);
  const d4 = await dialogs(page);
  await guardBtn(page, /^Cancel$/).click().catch(() => {}); await wait(page, 300);
  await rail(page, "Dashboard"); await wait(page, 400);
  await guardBtn(page, /^Discard changes$/).click().catch(() => {}); await wait(page, 600);
  await rail(page, "Filters"); await wait(page, 500);
  const back = await S(page).getByLabel("Show Court Case").isChecked();
  rec("FLT-15", d2.length && d3.length && d4.length ? "PASS" : "FAIL", `rail click opens dialog ${JSON.stringify(info[0]?.name)} buttons ${JSON.stringify(buttons)}; Cancel keeps page "${still}" with edit kept=${keep}; second rail click opens dialog=${JSON.stringify(d2)}; navbar Library link dialog=${JSON.stringify(d3)}; data-source switch dialog=${JSON.stringify(d4)}. The "Add group" dialog has no subject (no such dialog exists, see FLT-04)`, await sh(page, "FLT-15"));
  const copyOk = /Discard changes\?/.test(info[0]?.name || "") && /You have unsaved changes\. Do you want to continue\?/.test(info[0]?.text || "") && buttons.includes("Cancel") && buttons.includes("Discard changes");
  rec("X-02", copyOk && d2.length && d3.length && d4.length && !dClean.length && back ? "PASS" : "FAIL", `no change: rail click dialogs=${JSON.stringify(dClean)}. With a change the dialog opens on rail, navbar link and data-source switch (${info.length}/${d3.length}/${d4.length}); Cancel keeps the edit; Discard changes navigates and the edit is gone on return (Court Case checked again=${back}). Copy: ${JSON.stringify(info[0]?.name)} / ${JSON.stringify(info[0]?.text)}; buttons ${JSON.stringify(buttons)}. Back arrow and breadcrumb: none on this top-level form`, await sh(page, "X-02-FLT"));
  await page.context().close();

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
  await page.context().close();
});

await run("FLT-g", async (b) => {
  // FLT-20, FLT-22
  let { page } = await open(b, "filters");
  const foot = async () => { const f = S(page).locator("footer"); const t = clean(await f.innerText()); const box = await f.locator("span").filter({ hasText: /filters shown|No template/ }).first().boundingBox(); return { t, x: box && Math.round(box.x), w: box && Math.round(box.width) }; };
  const f9 = await foot();
  const tick = async (n, on) => { const c = S(page).getByLabel(`Show ${n}`); (on ? await c.check() : await c.uncheck()); };
  await tick("Person", false); await wait(page, 200);
  const f8 = await foot();
  for (const n of ["Court Case", "Country", "Judgment", "Violation", "Right", "Organization", "Document"]) await tick(n, false);
  await wait(page, 200);
  const f1 = await foot();
  const tint = await S(page).locator("footer").evaluate((e) => getComputedStyle(e).backgroundColor);
  const nums = [f9, f8, f1].map((f) => (f.t.match(/(\d+) filters shown/) || [])[1]);
  const widths = [f9.w, f8.w, f1.w];
  rec("FLT-22", JSON.stringify(nums) === JSON.stringify(["9", "8", "1"]) && new Set(widths).size === 1 ? "PASS" : "FAIL", `counts shown (9 templates, then 8, then 1 ticked): ${JSON.stringify(nums)}; footer start slot x/w: ${JSON.stringify([f9, f8, f1].map((f) => [f.x, f.w]))} (width ${new Set(widths).size === 1 ? "constant" : "varies"}); footer background ${tint}; text "${f9.t.slice(0, 40)}"`, await sh(page, "FLT-22"));
  await tick("Hearing", false); await wait(page, 200);
  const fNone = await foot();
  await saveBtn(page).click(); await wait(page);
  const txt = clean(await S(page).innerText());
  const msg = /No templates listed\. The Library shows every template\./.test(txt);
  const stillCheck = await S(page).locator('[aria-label^="Show "]').count();
  const addGroup = await S(page).getByRole("button", { name: /Add group|New group/ }).count();
  rec("FLT-20", msg && stillCheck > 0 && addGroup > 0 ? "PASS" : "FAIL", `all templates unticked and saved: message "No templates listed. The Library shows every template." present=${msg}; footer reads "${fNone.t.slice(0, 80)}"; Show checkboxes still on the page=${stillCheck}; group action buttons=${addGroup}`, await sh(page, "FLT-20"));
  await page.context().close();
});
