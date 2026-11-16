import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, fHeader, footerTxt, switchTo, listRows, openBeacon, dialogs, dialogText, logEntries } from "./tx.mjs";
const pageText = async (p) => clean(await S(p).innerText());
await run("FLT-1", async (b) => {
  let { page } = await open(b, "filters");
  await wait(page, 500);
  // FLT-01
  const hdr = await fHeader(page);
  const txt = await pageText(page);
  const banner = /Filters configuration/.test(txt);
  const sentence = /Select "Add group" below to group templates under a label, for example "Documents" or "People"\./.test(txt);
  const entityType = /entity type/i.test(txt); const typesWord = /\bTypes\b/.test(txt);
  await sh(page, "FLT-01");
  rec("FLT-01", hdr === "Filters" && banner && sentence && !entityType && !typesWord ? "PASS" : "FAIL", `header "${hdr}"; banner heading "Filters configuration" present=${banner}; the "Select "Add group" below..." sentence present=${sentence}; page text contains "entity type"=${entityType} (intro reads "Choose which entity types and properties appear as filters in the library sidebar, group the types, and set the order of each — exactly how readers will see them."), contains the word "Types"=${typesWord} (section heading "Types")`, "acceptance-run-2-shots/FLT-01.png");
  // FLT-02
  const rows0 = await fRows(page);
  await toSettings(page, "Templates"); await wait(page, 600);
  const tplRows = (await listRows(page)).map((r) => r.replace(/\s+\d+.*$/, "").trim());
  await rail(page, "Filters"); await wait(page, 600);
  const labelled = await S(page).locator('input[type=checkbox][aria-label^="Show "]').count();
  await showBox(page, "Court Case").click(); await wait(page, 200);
  const dirtyA = !(await saveF(page).isDisabled());
  const b0 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const n0 = await fresh(page, b0);
  const afterSave = await fRows(page);
  const btnState = [await saveF(page).isDisabled(), await discardF(page).isDisabled()];
  await page.reload(); await wait(page, 1500);
  const afterReload = await fRows(page);
  rec("FLT-02", rows0.length === tplRows.length && labelled === rows0.length && afterReload.includes("-Court Case") && afterReload.filter((r) => r.startsWith("+")).length === rows0.length - 1 ? "PASS" : "FAIL", `Templates lists ${tplRows.length} (${JSON.stringify(tplRows)}); Filters has ${rows0.length} rows each with a "Show <template>" checkbox (${labelled}); unticked "Court Case", Save (Beacon ${JSON.stringify(n0)}; Save/Discard disabled after: ${JSON.stringify(btnState)}); after tab reload rows ${JSON.stringify(afterReload)}`, "");
  await page.context().close();

  // FLT-22 count
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const foot = async () => page.evaluate(() => { const f = document.querySelector("[data-testid=settings-content] footer"); const sp = [...f.querySelectorAll("span")].find((s) => /filters shown|No template ticked/.test(s.innerText)); const r = sp.getBoundingClientRect(); const fr = f.getBoundingClientRect(); return { text: sp.innerText, x: Math.round(r.left), w: Math.round(r.width), bg: getComputedStyle(f).backgroundColor }; });
  const f9 = await foot();
  const names = (await fRows(page)).map((r) => r.slice(1));
  for (const n of names.slice(1)) await showBox(page, n).click();
  await wait(page, 150);
  const f1 = await foot();
  await showBox(page, names[1]).click(); await showBox(page, names[2]).click(); await wait(page, 100);
  const f3 = await foot();
  for (const n of names.slice(0, 3)) await showBox(page, n).click();
  await wait(page, 100);
  const f0 = await foot();
  await sh(page, "FLT-22");
  await page.context().close();
  // Travesia count
  ({ page } = await open(b, "filters", "desktop", { source: "travesia" }));
  await wait(page, 3000);
  const fT = await foot().catch(() => null);
  const nT = (await fRows(page)).length;
  rec("FLT-22", /^9 filters shown$/.test(f9.text) && /^1 filters? shown$/.test(f1.text) && f9.x === f1.x && f9.w === f1.w ? "PASS" : "FAIL", `Sample: all 9 ticked "${f9.text}" at x=${f9.x} w=${f9.w}; one ticked "${f1.text}" at x=${f1.x} w=${f1.w}; three ticked "${f3.text}" w=${f3.w}; none ticked "${f0.text}" w=${f0.w}; Red Trav (${nT} templates): "${fT?.text}" w=${fT?.w}; footer background ${f9.bg} (untinted white). The text sits at the same x but its width follows the text (81, 83, 88 px), so it is not a fixed-width slot`, "acceptance-run-2-shots/FLT-22.png");
  await page.context().close();

  // FLT-20
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const names2 = (await fRows(page)).map((r) => r.slice(1));
  for (const n of names2) await showBox(page, n).click();
  await wait(page, 150);
  const b1 = await nlist(page);
  await saveF(page).click(); await wait(page, 600);
  const t = await pageText(page);
  const ft = await footerTxt(page);
  const boxes = await S(page).locator('input[type=checkbox][aria-label^="Show "]').count();
  const addGroupBtn = await page.getByRole("button", { name: /Add group|New group/ }).count();
  await sh(page, "FLT-20");
  rec("FLT-20", /No templates listed\. The Library shows every template\./.test(t) && boxes === names2.length && addGroupBtn > 0 ? "PASS" : "FAIL", `all templates unticked and saved: page text contains "No templates listed. The Library shows every template."=${/No templates listed\. The Library shows every template\./.test(t)}; footer reads "${ft}"; Show checkboxes still offered=${boxes}; "Add group"/"New group" buttons=${addGroupBtn}`, "acceptance-run-2-shots/FLT-20.png");
  await page.context().close();

  // FLT-23
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const em = errMark(page);
  const prop = await page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const tables = [...c.querySelectorAll("table, [role=table]")]; const t = tables[1]; return { heads: [...t.querySelectorAll("[role=columnheader], th")].map((e) => e.innerText.trim()), rows: [...t.querySelectorAll("[data-part=row]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()), controls: t.querySelectorAll("button, input, select, [role=checkbox]").length }; });
  await toSettings(page, "Templates"); await wait(page, 600);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 900);
  const flagged = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] tr, [data-testid=settings-content] [role=row]")].filter((r) => /Use as filter/.test(r.innerText)).map((r) => r.innerText.split("\n")[0].trim()));
  const e23 = errNew(page, em);
  rec("FLT-23", !e23.length && prop.heads.length === 2 && !prop.heads.some((h) => /group/i.test(h)) && prop.controls === 0 && flagged.every((n) => prop.rows.some((r) => r.startsWith(n))) ? "PASS" : "FAIL", `Properties table columns ${JSON.stringify(prop.heads)} (no Group column=${!prop.heads.some((h) => /group/i.test(h))}), interactive controls in the table=${prop.controls}; ${prop.rows.length} rows ${JSON.stringify(prop.rows)}; Court Case template editor shows "Use as filter" on ${JSON.stringify(flagged)} (each has a Filters row=${flagged.every((n) => prop.rows.some((r) => r.startsWith(n)))}; Court Case has ${flagged.length} filter properties, the checklist's "two" is out of date). Console errors during the check (from opening the Court Case template editor): ${JSON.stringify(e23)}`, "");
  await page.context().close();
});
