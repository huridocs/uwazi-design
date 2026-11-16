import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, hscroll, saveBtn, rail, switchTo, toSettings, logEntries, axe, dupNames, unlabelled } from "./g.mjs";
import { goLibrary, libFacet, newTemplate, backFilters, facetTop, facetGroups, entityCountText } from "./lib2.mjs";
const typeRows = (p) => S(p).locator("table").first().locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));
const show = (p, n) => S(p).getByLabel(`Show ${n}`);
const pickGroup = async (p, rowIdx, group) => { await S(p).locator('button[aria-label^="Move to group"]').nth(rowIdx).click(); await wait(p, 200); await p.locator('[role=option]').filter({ hasText: group }).first().click(); await wait(p); };
const addGroup = async (p, name) => { await S(p).getByRole("button", { name: /New group|Add group/ }).first().click(); await wait(p, 300); await S(p).locator('[aria-label="Group name"]').last().fill(name); await wait(p, 150); };

await run("FLT-h", async (b) => {
  // FLT-03: a new template on Filters and in the Library
  let { page } = await open(b, "templates");
  await newTemplate(page, "Test template");
  await rail(page, "Filters"); await wait(page, 500);
  const hasRow = await show(page, "Test template").count();
  const tickedNew = hasRow ? await show(page, "Test template").isChecked() : null;
  await goLibrary(page);
  const f1 = await libFacet(page);
  const inFacet1 = facetTop(f1).includes("Test template");
  await backFilters(page);
  let afterUntick = null, afterTick = null;
  if (hasRow) {
    await show(page, "Test template").uncheck(); await saveBtn(page).click(); await wait(page);
    await goLibrary(page); afterUntick = facetTop(await libFacet(page)).includes("Test template");
    await backFilters(page);
    await show(page, "Test template").check(); await saveBtn(page).click(); await wait(page);
    await goLibrary(page); afterTick = facetTop(await libFacet(page)).includes("Test template");
  }
  rec("FLT-03", hasRow && tickedNew === false && inFacet1 === false && afterTick === true ? "PASS" : "FAIL",
    `after creating "Test template" (Settings > Templates): row on Filters=${hasRow}, Show ticked=${tickedNew} (expected unticked); Library Type facet lists it=${inFacet1} (expected not); after unticking and Save facet lists it=${afterUntick}; after ticking and Save facet lists it=${afterTick}`, await sh(page, "FLT-03"));
  await page.context().close();

  // FLT-16: hide Person
  ({ page } = await open(b, "filters"));
  await goLibrary(page);
  const n0 = await entityCountText(page); const f0 = await libFacet(page);
  await backFilters(page);
  await show(page, "Person").uncheck(); await saveBtn(page).click(); await wait(page);
  await goLibrary(page);
  const n1 = await entityCountText(page); const f1b = await libFacet(page);
  // entities still appear with no type ticked: search for a person name
  const resultsHavePerson = await page.evaluate(() => document.body.innerText.includes("Person") ? "Person text on page" : "no Person text");
  await backFilters(page);
  await show(page, "Person").check(); await saveBtn(page).click(); await wait(page);
  await goLibrary(page);
  const f2 = await libFacet(page);
  rec("FLT-16", !facetTop(f1b).includes("Person") && n1 === n0 && facetTop(f2).includes("Person") ? "PASS" : "FAIL",
    `before: facet ${JSON.stringify(facetTop(f0))}, ${n0} entities; Person unticked and saved: facet ${JSON.stringify(facetTop(f1b))} (Person listed=${facetTop(f1b).includes("Person")}), results show ${n1} entities (unchanged=${n1 === n0}); re-ticked and saved: Person back in facet=${facetTop(f2).includes("Person")}`, await sh(page, "FLT-16"));
  await page.context().close();

  // FLT-17: groups on Filters reach the Library
  ({ page } = await open(b, "filters"));
  await addGroup(page, "People");
  const names = (await typeRows(page)).map((r) => r.split(" ")[0] === "Court" ? "Court Case" : r.split(" ")[0]);
  await pickGroup(page, names.indexOf("Person"), "People");
  await pickGroup(page, names.indexOf("Organization"), "People");
  await addGroup(page, "Documents");
  await pickGroup(page, names.indexOf("Court Case"), "Documents");
  await pickGroup(page, names.indexOf("Judgment"), "Documents");
  await saveBtn(page).click(); await wait(page);
  await goLibrary(page);
  const fg = await libFacet(page);
  const gp = fg.groups.find((g) => g.name === "People");
  const gd = fg.groups.find((g) => g.name === "Documents");
  let tickInfo = "People group absent";
  if (gp) {
    const grp = page.locator('[data-component=FacetRow] input[aria-label="People"]');
    await grp.check(); await wait(page, 500);
    const t1 = await libFacet(page); const c1 = await entityCountText(page);
    await grp.uncheck(); await wait(page, 500);
    const t2 = await libFacet(page); const c2 = await entityCountText(page);
    tickInfo = `tick: members ${JSON.stringify(t1.groups.find((g) => g.name === "People").children.map((c) => c.name + ":" + c.checked))}, results ${c1}; tick again: members ${JSON.stringify(t2.groups.find((g) => g.name === "People").children.map((c) => c.checked))}, results ${c2}`;
  }
  rec("FLT-17", gp && gd && gd.count === "9" && gp.count === "18" && gp.bold && gp.chevron ? "PASS" : "FAIL",
    `Filters groups "People" (Person, Organization) and "Documents" (Court Case, Judgment) saved. Library groups: ${JSON.stringify(facetGroups(fg))}; top-level rows ${JSON.stringify(facetTop(fg))}. Expected People(18) with Person:13 and Organization:5, and Documents(9) with 2 members. ${tickInfo}`, await sh(page, "FLT-17"));
  await page.context().close();

  // FLT-18: order, and nothing shown
  ({ page } = await open(b, "filters"));
  const grip = S(page).locator("table").first().locator("[data-component=ReorderGrip]").nth(8);
  await grip.focus(); await page.keyboard.press("Home"); await wait(page);
  const order1 = (await typeRows(page)).map((r) => r.split(" row ")[0]);
  await saveBtn(page).click(); await wait(page);
  await goLibrary(page);
  const fo = await libFacet(page);
  await backFilters(page);
  for (const n of ["Hearing", "Person", "Court Case", "Country", "Judgment", "Violation", "Right", "Organization", "Document"]) { const c = show(page, n); if (await c.isChecked()) await c.uncheck(); }
  await saveBtn(page).click(); await wait(page);
  await goLibrary(page);
  const fn = await libFacet(page);
  const allNames = [...facetTop(fn), ...fn.groups.flatMap((g) => g.children.map((c) => c.name))];
  const sorted = [...allNames].sort((a, c) => a.localeCompare(c));
  rec("FLT-18", facetTop(fo)[0] === "Hearing" && allNames.length === 9 && JSON.stringify(allNames) === JSON.stringify(sorted) ? "PASS" : "FAIL",
    `Hearing moved to first on Filters (${JSON.stringify(order1.slice(0, 3))}) and saved: Library facet top rows ${JSON.stringify(facetTop(fo))} (first is Hearing=${facetTop(fo)[0] === "Hearing"}). All unticked and saved: Library lists top ${JSON.stringify(facetTop(fn))} + groups ${JSON.stringify(facetGroups(fn))}; every template listed=${allNames.length === 9}, sorted by name=${JSON.stringify(allNames) === JSON.stringify(sorted)} (order seen ${JSON.stringify(allNames)})`, await sh(page, "FLT-18"));
  await page.context().close();
});

await run("FLT-i", async (b) => {
  // FLT-19: rename a grouped template; delete a group's only template
  let { page } = await open(b, "filters");
  await addGroup(page, "Cases");
  const names = (await typeRows(page)).map((r) => r.split(" row ")[0]);
  await pickGroup(page, names.indexOf("Court Case"), "Cases");
  await pickGroup(page, names.indexOf("Judgment"), "Cases");
  await saveBtn(page).click(); await wait(page);
  await toSettings(page, "Templates");
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 700);
  await S(page).getByLabel("Template name").fill("Court Case 2"); await wait(page, 200);
  await S(page).getByRole("button", { name: /^Save$/ }).click(); await wait(page, 700);
  await rail(page, "Filters"); await wait(page, 500);
  const rows = await typeRows(page);
  const gSel = await S(page).locator("table").first().innerText();
  const renamedOnFilters = rows.some((r) => /^Court Case 2/.test(r) && /Cases/.test(r));
  await goLibrary(page);
  const fr = await libFacet(page);
  const renamedInFacet = fr.groups.some((g) => g.children.some((c) => c.name === "Court Case 2")) || facetTop(fr).includes("Court Case 2");
  // delete the only member of a group
  await newTemplate(page, "Solo");
  await rail(page, "Filters"); await wait(page, 500);
  await addGroup(page, "Lone");
  const names2 = (await typeRows(page)).map((r) => r.split(" row ")[0]);
  await pickGroup(page, names2.indexOf("Solo"), "Lone");
  await saveBtn(page).click(); await wait(page);
  const groupsBefore = await S(page).locator('[aria-label="Group name"]').evaluateAll((e) => e.map((x) => x.value));
  await toSettings(page, "Templates");
  const solo = S(page).locator("[data-part=row]").filter({ hasText: "Solo" }).first();
  const rowBtns = await solo.locator("button").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label") || x.innerText));
  await S(page).getByRole("checkbox", { name: /Select Solo/ }).check().catch(() => {});
  await wait(page, 300);
  const bar = clean(await S(page).locator("footer").innerText());
  await S(page).locator("footer").getByRole("button", { name: /^Delete/ }).click().catch(() => {}); await wait(page, 500);
  const dtxt = (await dialogs(page));
  const conf = page.locator('[data-component=ConfirmDelete],[data-component=ConfirmDialog]').getByRole("button", { name: /^(Delete|Accept)/ });
  if (await conf.count()) { await conf.first().click(); await wait(page, 700); }
  const gone = (await S(page).locator("[data-part=row]").filter({ hasText: "Solo" }).count()) === 0;
  await rail(page, "Filters"); await wait(page, 500);
  const groupsAfter = await S(page).locator('[aria-label="Group name"]').evaluateAll((e) => e.map((x) => x.value));
  await goLibrary(page);
  const fl = await libFacet(page);
  rec("FLT-19", renamedOnFilters && renamedInFacet && gone && !groupsAfter.includes("Lone") && !fl.groups.some((g) => g.name === "Lone") ? "PASS" : "FAIL",
    `rename Court Case -> "Court Case 2" (member of group Cases): on Filters in group=${renamedOnFilters}; in Library facet=${renamedInFacet} (groups ${JSON.stringify(facetGroups(fr))}). Template "Solo" alone in group "Lone" (groups before ${JSON.stringify(groupsBefore)}), template row buttons ${JSON.stringify(rowBtns)}, bar "${bar.slice(0, 40)}", delete dialogs ${JSON.stringify(dtxt)}; template gone=${gone}; Filters groups after ${JSON.stringify(groupsAfter)}; Library groups ${JSON.stringify(facetGroups(fl))}`, await sh(page, "FLT-19"));
  await page.context().close();
});

await run("FLT-j", async (b) => {
  // FLT-23, FLT-24
  let { page } = await open(b, "filters");
  const sections = await S(page).locator("section").allInnerTexts();
  const propTable = S(page).locator("table").nth(1);
  const heads = await propTable.locator("th").allInnerTexts();
  const prow = await propTable.locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim()));
  const controls = await propTable.locator("input, button, select, [role=checkbox], [role=combobox]").count();
  const hasGroupCol = heads.some((h) => /group/i.test(h));
  const courtRows = prow.filter((r) => /Court Case/.test(r));
  const hasTpl = prow.every((r) => /[A-Za-z]+ [A-Z]/.test(r));
  rec("FLT-23", heads.length && !hasGroupCol && controls === 0 && courtRows.length >= 2 && prow.length >= 2 ? "PASS" : "FAIL",
    `Properties table headers ${JSON.stringify(heads)} (Group column=${hasGroupCol}); rows ${JSON.stringify(prow)}; Court Case rows=${courtRows.length}; interactive controls in the table=${controls}`, await sh(page, "FLT-23"));
  const beforeRows = prow.length;
  await toSettings(page, "Templates");
  const openCC = async () => { await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 700); };
  await openCC();
  await S(page).getByLabel("Case number use as filter").check(); await wait(page, 200);
  await S(page).getByRole("button", { name: /^Save$/ }).click(); await wait(page, 700);
  await rail(page, "Filters"); await wait(page, 500);
  const withRow = (await S(page).locator("table").nth(1).locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim())));
  const has = withRow.some((r) => /^Case number/.test(r) && /Court Case/.test(r));
  await toSettings(page, "Templates"); await openCC();
  await S(page).getByLabel("Case number use as filter").uncheck(); await wait(page, 200);
  await S(page).getByRole("button", { name: /^Save$/ }).click(); await wait(page, 700);
  await rail(page, "Filters"); await wait(page, 500);
  const withoutRow = (await S(page).locator("table").nth(1).locator("tbody tr").evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ").trim())));
  const gone = !withoutRow.some((r) => /^Case number/.test(r));
  rec("FLT-24", has && gone && withoutRow.length === beforeRows ? "PASS" : "FAIL", `Case number "use as filter" on + Save in Templates: row on Filters=${has} (${withRow.length} rows vs ${beforeRows}); off + Save: row gone=${gone} (${withoutRow.length} rows)`, await sh(page, "FLT-24"));
  await page.context().close();
});
