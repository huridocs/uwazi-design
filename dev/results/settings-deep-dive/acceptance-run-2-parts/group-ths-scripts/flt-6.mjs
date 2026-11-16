import { axe, axeDialog, axeContrast, dupNames, unlabelled, dark, light, serious, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, footerTxt, openBeacon, dialogs, dialogText, newGroup, setGroupOf, groupSel, frow, groupNames, goLibrary, libFacet, listRows, switchTo, logEntries, hscroll, actName } from "./tx.mjs";
await run("FLT-6", async (b) => {
  // X-13
  let { page } = await open(b, "filters");
  await wait(page, 500);
  const s = (await fRows(page)).map((r) => r.slice(1));
  await switchTo(page, "Red Trav"); await toSettings(page, "Filters"); await wait(page, 2000);
  const t = (await fRows(page)).map((r) => r.slice(1));
  await sh(page, "X-13-FLT");
  await switchTo(page, "Sample"); await toSettings(page, "Filters"); await wait(page, 1500);
  const s2 = (await fRows(page)).map((r) => r.slice(1));
  rec("X-13", s.length !== t.length && JSON.stringify(s) === JSON.stringify(s2) && t.length > 10 ? "PASS" : "FAIL", `Sample ${s.length} templates (${s.slice(0, 3)}), Red Trav ${t.length} (${t.slice(0, 3)}), back on Sample ${s2.length}; the page follows the data source`, "acceptance-run-2-shots/X-13-FLT.png");
  await page.context().close();

  // X-03 + X-09
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await showBox(page, "Hearing").click();
  const en1 = !(await saveF(page).isDisabled());
  await saveF(page).click(); await wait(page, 500);
  const dis = await saveF(page).isDisabled();
  await rail(page, "Templates"); await wait(page, 500);
  const noDlg = (await dialogText(page)) === "";
  await rail(page, "Filters"); await wait(page, 500);
  await showBox(page, "Hearing").click();
  const en2 = !(await saveF(page).isDisabled());
  rec("X-03", en1 && dis && noDlg && en2 ? "PASS" : "FAIL", `edit -> Save enabled=${en1}; after Save: Save disabled=${dis}, rail click opens no dialog=${noDlg}; editing again re-enables Save=${en2}`, "");
  await saveF(page).click(); await wait(page, 500);
  const entries = await logEntries(page);
  await rail(page, "Activity log"); await wait(page, 800);
  const txt = clean(await S(page).innerText());
  rec("X-09", entries.some((e) => /filters|Library filters/i.test(e)) ? "PASS" : "FAIL", `two Saves of Filters: session log ${JSON.stringify(entries.slice(0, 3))}; Activity log page shows "${(txt.match(/Update admin[^]*?Oct \\d+, 2026 - [\\d:]+/) || [txt.slice(150, 330)])[0].slice(0, 120)}"`, await sh(page, "X-09-FLT"));
  await page.context().close();

  // X-07 light/dark, dupNames, dialogs
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const r = {};
  r.l = serious(await axe(page)); r.dup = await dupNames(page); r.unl = await unlabelled(page);
  await dark(page); await wait(page, 900); r.d = serious(await axe(page)); await sh(page, "X-08-FLT-dark-1280"); await light(page); await wait(page, 900);
  await newGroup(page, "Docs");
  r.dirtyContrast = await axeContrast(page);
  r.dup2 = await dupNames(page); r.unl2 = await unlabelled(page);
  await groupSel(page, "Person").click(); await wait(page, 300);
  r.listbox = serious(await axe(page));
  await page.keyboard.press("Escape"); await wait(page, 300);
  const bad = [...r.l, ...r.d, ...r.listbox, ...r.dirtyContrast];
  rec("X-07", !bad.length && !r.dup.length && !r.unl.length && !r.dup2.length && !r.unl2.length ? "PASS" : "FAIL", `axe serious/critical: light ${JSON.stringify(r.l)}, dark ${JSON.stringify(r.d)}, with a group added and Save enabled (colour contrast) ${JSON.stringify(r.dirtyContrast)}, with the group listbox open ${JSON.stringify(r.listbox)}; duplicate control names on the page ${JSON.stringify(r.dup)} then with a group ${JSON.stringify(r.dup2)} (the nine row selects share one name "Move to group: No group"); inputs without a label ${JSON.stringify(r.unl)} / ${JSON.stringify(r.unl2)}. Filters has no dialog of its own (no Add group modal, FLT-04)`, await sh(page, "X-07-FLT"));
  await page.context().close();
});
