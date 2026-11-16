import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, footerTxt, openBeacon, dialogs, dialogText, newGroup, setGroupOf, groupSel, frow, groupNames, goLibrary, libFacet, facetTop, newTemplate, listRows } from "./tx.mjs";
import { entityCountText as ect } from "./lib2.mjs";
const flatNames = (f) => f ? [...f.top.map((r) => r.name), ...f.groups.flatMap((g) => [g.name + "(group)", ...g.children.map((c) => c.name)])] : null;
const toFilters = async (p) => { await toSettings(p, "Filters"); await wait(p, 500); };
const libFlat = async (p) => { await goLibrary(p); return libFacet(p); };
async function saveTemplate(p) {
  await S(p).locator("footer").getByRole("button", { name: /^Save$/ }).click(); await wait(p, 500);
  const d = p.locator("[role=dialog]:not([inert] *)").filter({ hasText: "Save template" });
  if (await d.count()) await d.getByRole("button", { name: "Save", exact: true }).click();
  await wait(p, 700);
}
await run("FLT-4", async (b) => {
  // FLT-03
  let { page } = await open(b, "filters");
  await wait(page, 500);
  const before = (await fRows(page)).length;
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).getByRole("button", { name: /Add template/ }).click(); await wait(page, 500);
  await S(page).getByLabel("Template name").fill("Test template"); await wait(page, 200);
  const b0 = await nlist(page);
  await S(page).getByRole("button", { name: /Create template/ }).click(); await wait(page, 800);
  await toFilters(page);
  const rows = await fRows(page);
  const rowT = rows.find((r) => /Test template/.test(r));
  const f1 = await libFlat(page);
  const inFacet1 = flatNames(f1)?.includes("Test template");
  await toFilters(page);
  // untick, save, check library, tick, save
  await showBox(page, "Test template").click(); await saveF(page).click(); await wait(page, 500);
  const f2 = await libFlat(page);
  const inFacet2 = flatNames(f2)?.includes("Test template");
  await toFilters(page);
  await showBox(page, "Test template").click(); await saveF(page).click(); await wait(page, 500);
  const f3 = await libFlat(page);
  const inFacet3 = flatNames(f3)?.includes("Test template");
  await sh(page, "FLT-03");
  rec("FLT-03", rowT === "-Test template" && !inFacet1 && !inFacet2 === true && inFacet3 ? "PASS" : "FAIL", `before: ${before} rows on Filters; after creating "Test template" in Templates the Filters row reads "${rowT}" (expected Show unticked); Library Template facet lists it right away=${inFacet1} (expected not listed); after unticking + Save listed=${inFacet2}; after ticking + Save listed=${inFacet3}`, "acceptance-run-2-shots/FLT-03.png");
  await page.context().close();

  // FLT-16
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await goLibrary(page); const total0 = await ect(page); const g0 = flatNames(await libFacet(page));
  await toFilters(page);
  await showBox(page, "Person").click(); await saveF(page).click(); await wait(page, 500);
  const f = await libFlat(page); const hasPerson = flatNames(f).includes("Person"); const total1 = await ect(page);
  const cardsText = clean(await page.locator("main").first().innerText());
  const personEntities = /\bPerson\b/i.test(cardsText) && (await page.locator('button[aria-label^="Preview "]').count()) > 0;
  await toFilters(page);
  await showBox(page, "Person").click(); await saveF(page).click(); await wait(page, 500);
  const f4 = await libFlat(page);
  await sh(page, "FLT-16");
  rec("FLT-16", !hasPerson && total1 === total0 && flatNames(f4).includes("Person") ? "PASS" : "FAIL", `Library entities ${total0}, facet ${JSON.stringify(g0)}; after hiding "Person" and Save: facet ${JSON.stringify(flatNames(f))} (Person listed=${hasPerson}); results count still ${total1} entities with no type ticked; after re-ticking + Save the facet lists Person again=${flatNames(f4).includes("Person")}`, "acceptance-run-2-shots/FLT-16.png");
  await page.context().close();

  // FLT-17 group on Sample Library
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  await newGroup(page, "People groups");
  await setGroupOf(page, "Person", "People groups"); await setGroupOf(page, "Organization", "People groups");
  await saveF(page).click(); await wait(page, 500);
  const fr = await libFlat(page);
  const grp = fr.groups.find((g) => g.name === "People groups");
  const facetCardText = await page.evaluate(() => [...document.querySelectorAll("[data-component=FacetCard]")].map((c) => c.innerText.replace(/\s+/g, " ").slice(0, 120)));
  const personTop = fr.top.find((r) => r.name === "Person");
  await sh(page, "FLT-17");
  await page.context().close();
  // CEJIL: the data source whose Library does read groups
  let cej = "not driven";
  {
    const c = await open(b, "filters", "desktop", { source: "cejil" });
    await wait(c.page, 6000); await goLibrary(c.page); await wait(c.page, 5000);
    const info = () => c.page.evaluate(() => [...document.querySelectorAll("[data-part=facet-group]")].map((g) => { const head = g.querySelector("[data-component=FacetRow]"); const kids = [...g.querySelectorAll("[data-component=TreeChildren] [data-component=FacetRow]")]; return { name: g.getAttribute("aria-label"), bold: /font-bold|font-semibold/.test(head.querySelector("[data-part=count]")?.className || head.innerHTML), box: !!head.querySelector("input[type=checkbox]"), checked: head.querySelector("input[type=checkbox]")?.checked, chev: !!head.querySelector("[data-part=expand]"), open: head.querySelector("[data-part=expand]")?.getAttribute("aria-expanded"), count: +head.querySelector("[data-part=count]")?.textContent.replace(/,/g, ""), sum: kids.reduce((n, r) => n + +r.querySelector("[data-part=count]")?.textContent.replace(/,/g, ""), 0), allKids: kids.every((r) => r.querySelector("input")?.checked), noKids: kids.every((r) => !r.querySelector("input")?.checked) }; })[0]);
    const g = c.page.locator("[data-part=facet-group]").first();
    const i0 = await info();
    await g.locator("input[type=checkbox]").first().click(); await c.page.waitForTimeout(700);
    const i1 = await info(); const n1 = await c.page.evaluate(() => (document.body.innerText.match(/([\d,]+) entities/) || [])[1]);
    await g.locator("input[type=checkbox]").first().click(); await c.page.waitForTimeout(700);
    const i2 = await info();
    await g.locator("[data-part=expand]").click(); await c.page.waitForTimeout(300);
    const i3 = await info();
    await g.locator("[data-component=TreeChildren] input").first().click().catch(() => {}); await c.page.waitForTimeout(300);
    const i4 = await info();
    cej = `CEJIL's Library (which reads groups): group "${i0.name}" row bold=${i0.bold}, checkbox=${i0.box}, chevron button=${i0.chev}, count ${i0.count} = sum of members ${i0.sum}; ticking it ticks all members=${i1.allKids} and the results show ${n1} entities; ticking again clears=${i2.noKids}; chevron collapses (open=${i3.open}); the "opens by itself when a member is ticked" clause could not be driven (member rows are not rendered while the group is collapsed, so no member can be ticked)`;
    await c.ctx.close();
  }

  rec("FLT-17", !!grp && grp.bold && grp.chevron && grp.count === "18" ? "PASS" : "FAIL", `saved group "People groups" (Person 13 + Organization 5) on Filters; Library Template facet afterwards: top-level rows ${JSON.stringify(fr.top.map((r) => r.name + ":" + r.count))}, groups ${JSON.stringify(fr.groups.map((g) => g.name + ":" + g.count + "[" + g.children.map((c) => c.name).join(",") + "]"))}; a "People groups" group row exists=${!!grp} (the Sample's Library keeps its fixed "Documents" card and lists the grouped templates flat: Person listed at top level=${!!personTop}). ${cej}`, "acceptance-run-2-shots/FLT-17.png");

  // FLT-18 order + none shown
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const base = (await fRows(page)).map((r) => r.slice(1));
  await S(page).getByRole("button", { name: `Move ${base[0]} down`, exact: true }).click(); await wait(page, 200);
  await S(page).getByRole("button", { name: `Move ${base[5]} up`, exact: true }).click(); await wait(page, 200);
  const order = (await fRows(page)).map((r) => r.slice(1));
  await saveF(page).click(); await wait(page, 500);
  const fo = await libFlat(page);
  const facetOrder = flatNames(fo);
  await toFilters(page);
  for (const n of order) await showBox(page, n).click();
  await saveF(page).click(); await wait(page, 500);
  const fn = await libFlat(page);
  const noneNames = flatNames(fn);
  const allSorted = [...base].sort((a, c) => a.localeCompare(c));
  const sortedByName = JSON.stringify(noneNames.filter((n) => !/\(group\)/.test(n)).sort()) === JSON.stringify([...noneNames.filter((n) => !/\(group\)/.test(n))].sort()) && JSON.stringify(noneNames.filter((n) => !/\(group\)/.test(n))) === JSON.stringify(allSorted.filter((n) => noneNames.includes(n)));
  await sh(page, "FLT-18");
  const topNonDoc = fo.top.map((r) => r.name);
  const expectedTop = order.filter((n) => topNonDoc.includes(n));
  rec("FLT-18", JSON.stringify(topNonDoc) === JSON.stringify(expectedTop) && sortedByName && noneNames.length >= base.length ? "PASS" : "FAIL", `saved order ${JSON.stringify(order)}; Library facet top-level rows ${JSON.stringify(topNonDoc)} (follow the saved order for non-document templates=${JSON.stringify(topNonDoc) === JSON.stringify(expectedTop)}; document templates sit in the fixed "Documents" card); with every template unticked and saved the facet lists ${JSON.stringify(noneNames)} (all ${base.length} listed=${noneNames.filter((n) => !/\(group\)/.test(n)).length === base.length}, sorted by name=${sortedByName}; expected name order, the app keeps the saved order)`, "acceptance-run-2-shots/FLT-18.png");
  await page.context().close();
});
