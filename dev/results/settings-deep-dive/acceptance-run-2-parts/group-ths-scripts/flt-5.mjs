import { errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, saveF, discardF, showBox, fRows, footerTxt, openBeacon, dialogs, dialogText, newGroup, setGroupOf, groupSel, frow, groupNames, goLibrary, libFacet, listRows } from "./tx.mjs";
const flatNames = (f) => f ? [...f.top.map((r) => r.name), ...f.groups.flatMap((g) => [g.name + "(group)", ...g.children.map((c) => c.name)])] : null;
const toFilters = async (p) => { await toSettings(p, "Filters"); await wait(p, 500); };
async function saveTemplate(p) {
  await S(p).locator("footer").getByRole("button", { name: /^Save$/ }).click(); await wait(p, 500);
  const d = p.locator("[role=dialog]:not([inert] *)").filter({ hasText: "Save template" });
  if (await d.count()) await d.getByRole("button", { name: "Save", exact: true }).click();
  await wait(p, 800);
}
const propRows = (p) => p.evaluate(() => { const t = [...document.querySelectorAll("[data-testid=settings-content] table")][1]; return t ? [...t.querySelectorAll("[data-part=row]")].map((r) => r.innerText.replace(/\s+/g, " ").trim()) : null; });
await run("FLT-5", async (b) => {
  // FLT-19
  let { page } = await open(b, "filters");
  await wait(page, 500);
  await newGroup(page, "Docs");
  await setGroupOf(page, "Court Case", "Docs"); await setGroupOf(page, "Judgment", "Docs");
  await saveF(page).click(); await wait(page, 500);
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 800);
  await S(page).getByLabel("Template name").fill("Court Case 2"); await wait(page, 200);
  await saveTemplate(page);
  await toFilters(page);
  const rows1 = await fRows(page);
  const sel = await groupSel(page, "Court Case 2").getAttribute("aria-label").catch(() => null);
  await goLibrary(page); const lf = flatNames(await libFacet(page));
  // second part: delete the only member of a group
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).getByRole("button", { name: /Add template/ }).click(); await wait(page, 500);
  await S(page).getByLabel("Template name").fill("Solo"); await S(page).getByRole("button", { name: /Create template/ }).click(); await wait(page, 800);
  await toFilters(page);
  await newGroup(page, "Lonely");
  await setGroupOf(page, "Solo", "Lonely");
  await saveF(page).click(); await wait(page, 500);
  const gBefore = await groupNames(page);
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).getByRole("checkbox", { name: "Select Solo" }).check(); await wait(page, 300);
  await S(page).locator("footer").getByRole("button", { name: /Delete/ }).click(); await wait(page, 400);
  const dl = await dialogText(page);
  await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: /Accept|Delete/ }).last().click(); await wait(page, 700);
  await toFilters(page);
  const gAfter = await groupNames(page); const rowsAfter = await fRows(page);
  await goLibrary(page); const lf2 = await libFacet(page);
  await sh(page, "FLT-19");
  rec("FLT-19", rows1.some((r) => /Court Case 2/.test(r)) && /Docs/.test(sel || "") && lf.includes("Court Case 2") && !gAfter.includes("Lonely") ? "PASS" : "FAIL", `renamed "Court Case" to "Court Case 2" in Templates and saved: Filters rows now include ${JSON.stringify(rows1.filter((r) => /Court/.test(r)))} and its group select reads "${sel}"; Library facet lists "Court Case 2"=${lf.includes("Court Case 2")}. Deleting "Solo" (the only member of group "Lonely"; groups before ${JSON.stringify(gBefore)}; delete dialog "${dl.slice(0, 120)}"): Filters groups afterwards ${JSON.stringify(gAfter)} (group removed=${!gAfter.includes("Lonely")}), "Solo" row gone=${!rowsAfter.some((r) => /Solo/.test(r))}; Library groups ${JSON.stringify(lf2.groups.map((g) => g.name))} (no empty "Lonely" group)`, "acceptance-run-2-shots/FLT-19.png");
  await page.context().close();

  // FLT-24
  ({ page } = await open(b, "filters"));
  await wait(page, 500);
  const p0 = await propRows(page);
  const em = errMark(page);
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 800);
  await S(page).getByRole("checkbox", { name: "Victim use as filter" }).check(); await wait(page, 300);
  await saveTemplate(page);
  await toFilters(page);
  const p1 = await propRows(page);
  await toSettings(page, "Templates"); await wait(page, 500);
  await S(page).locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(page, 800);
  await S(page).getByRole("checkbox", { name: "Victim use as filter" }).uncheck(); await wait(page, 300);
  await saveTemplate(page);
  await toFilters(page);
  const p2 = await propRows(page);
  const e24 = errNew(page, em);
  const hasV = (r) => r.some((x) => /^Victim/.test(x));
  await sh(page, "FLT-24");
  rec("FLT-24", !hasV(p0) && hasV(p1) && !hasV(p2) && !e24.length ? "PASS" : "FAIL", `Properties table before: ${p0.length} rows (Victim listed=${hasV(p0)}); after turning "Use as filter" on for Court Case "Victim" and saving the template: ${p1.length} rows, Victim listed=${hasV(p1)} ("${p1.find((x) => /^Victim/.test(x)) || ""}"); after turning it off: ${p2.length} rows, listed=${hasV(p2)}. Console errors during the check (Court Case template editor): ${JSON.stringify(e24)}`, "acceptance-run-2-shots/FLT-24.png");
  await page.context().close();
});
