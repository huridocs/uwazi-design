// TED-06, 07, 11, 12 : colour, Title label, Generated ID reach the list, Library and forms (Sample, Court Case)
import { launch, S, rec, wait, strip, shot, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, rowPills, errs, notifTitles, logEntries, guardFor, ONLY, colorsOf, toLibrary, reopenSettings, openEntityEdit, labelsIn, createEntity, openTemplate, toSettingsTemplates } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const cardsTextAny = (p) => p.locator("[data-component=EntityCard]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()));
const GREEN = "rgb(43, 138, 62)";
const rowDot = (p, name) => colorsOf(S(p).locator("[role=row]", { hasText: name }).first());

await guard("TED-06", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const btn = S(p).getByRole("button", { name: "Template color" });
  await btn.click(); await wait(p, 250);
  await p.getByLabel("Manually set a color").fill("#2b8a3e"); await wait(p, 250);
  await p.keyboard.press("Escape"); await wait(p, 250);
  await saveBtn(p).click(); await wait(p, 800);
  const onList = (await rowDot(p, "Court Case")).includes(GREEN);
  const noDialog = !(await S(p).locator("#template-name-input").count());
  await p.reload(); await wait(p, 1800);
  const afterReload = (await rowDot(p, "Court Case")).includes(GREEN);
  await toLibrary(p, "Court Case"); await wait(p, 800);
  const facetRow = p.locator("[data-component=FacetRow]", { hasText: "Court Case" }).first();
  const facet = (await colorsOf(facetRow)).includes(GREEN);
  const chip = (await colorsOf(p.locator("[data-component=LibraryFilters]").getByText("Court Case").last().locator("xpath=ancestor::*[self::span or self::div or self::button][1]"))).includes(GREEN);
  const card = (await colorsOf(p.locator("[data-component=EntityCard]").first())).includes(GREEN);
  await shot(p, "TED-06");
  const dotsNow = await p.evaluate(() => { const g = (el) => [...el.querySelectorAll("*")].filter(x => { const r = x.getBoundingClientRect(); return r.width > 4 && r.width < 14 && r.height < 14 && getComputedStyle(x).backgroundColor !== "rgba(0, 0, 0, 0)"; }).map(x => getComputedStyle(x).backgroundColor); return { card: g(document.querySelector("[data-component=EntityCard]")), facet: g([...document.querySelectorAll("[data-component=FacetRow]")].find(e => /Court Case/.test(e.innerText))), chip: g([...document.querySelectorAll("[data-component=LibraryFilters] button")].find(e => /Remove filter: Court Case/.test(e.getAttribute("aria-label")||""))?.parentElement || document.body).slice(0,2) }; });
  const e = errs(c.errors).filter(x => !/same key/.test(x));
  rec("TED-06", onList && afterReload && facet && card && chip ? "PASS" : "FAIL", `Court Case colour set to #2b8a3e with the hex input, Save (back on the list=${noDialog}): list row dot green=${onList}; after page reload ${afterReload}; Library Type facet row dot=${facet}; active-filter chip=${chip}; card type chip=${card}. Colours actually drawn in the Library (small dots): ${JSON.stringify(dotsNow)} (new colour is ${GREEN}). console ${JSON.stringify(e)}`, "TED-06");
  // TED-07 : card dot + facet marker (same session)
  const cardDot = await p.locator("[data-component=EntityCard]").first().evaluate(el => { const out = []; for (const x of el.querySelectorAll("*")) { const c = getComputedStyle(x); if (c.backgroundColor === "rgb(43, 138, 62)" && x.getBoundingClientRect().width < 20) out.push(x.tagName + " " + Math.round(x.getBoundingClientRect().width) + "px"); } return out; });
  const facetMarker = await facetRow.evaluate(el => { const out = []; for (const x of el.querySelectorAll("*")) { const c = getComputedStyle(x); if (c.backgroundColor === "rgb(43, 138, 62)" || c.borderTopColor === "rgb(43, 138, 62)" || c.accentColor === "rgb(43, 138, 62)") out.push(x.tagName + " " + Math.round(x.getBoundingClientRect().width) + "px"); } return out; });
  rec("TED-07", cardDot.length > 0 && facetMarker.length > 0 ? "PASS" : "FAIL", `After Save of the new colour #2b8a3e: Library Court Case card type dot elements in the new colour ${JSON.stringify(cardDot)}; Type facet row marker elements in the new colour ${JSON.stringify(facetMarker)}.`, "TED-06");
  await c.ctx.close();
});

await guard("TED-11", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Edit Title", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByLabel("Label", { exact: true }).fill("Name");
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 400);
  await saveBtn(p).click(); await wait(p, 800);
  await openTemplate(p, "Court Case");
  const names = await propNames(p);
  const cell = names[0];
  await p.getByRole("button", { name: "Cancel" }).last().click().catch(()=>{}); await wait(p, 400);
  await toLibrary(p, "Court Case");
  await openEntityEdit(p);
  const labels = await labelsIn(p);
  await shot(p, "TED-11");
  const hasName = labels.some(l => /^Name\*?$/.test(l)); const hasTitle = labels.some(l => /^Title\*?$/.test(l));
  rec("TED-11", cell === "Name" && hasName && !hasTitle ? "PASS" : "FAIL", `Title row label changed to "Name" in the panel and Saved: reopened editor first row Property cell reads "${cell}". Entity edit form (Library, Court Case, Edit) labels begin ${JSON.stringify(labels.slice(0, 4))}; "Name" field present=${hasName}, "Title" still present=${hasTitle}.`, "TED-11");
  await c.ctx.close();
});

await guard("TED-12", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await S(p).getByRole("button", { name: "Edit Title", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByRole("checkbox", { name: "Generated ID" }).check();
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 400);
  await saveBtn(p).click(); await wait(p, 800);
  await toLibrary(p, "Court Case");
  await createEntity(p, "Court Case");
  const t1 = await p.getByLabel(/^Title\*?$/).first().inputValue();
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  await shot(p, "TED-12");
  // edit the generated title, save, check kept
  await p.getByLabel(/^Title\*?$/).first().fill(t1 + "x"); 
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  const kept = (await cardsTextAny(p)).some(t => t.includes(t1 + "x"));
  // untick and create again
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await S(p).getByRole("button", { name: "Edit Title", exact: true }).click(); await wait(p, 400);
  await dlg(p).getByRole("checkbox", { name: "Generated ID" }).uncheck();
  await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 400);
  await saveBtn(p).click(); await wait(p, 800);
  await toLibrary(p, "Court Case");
  await createEntity(p, "Court Case");
  const t2 = await p.getByLabel(/^Title\*?$/).first().inputValue();
  rec("TED-12", t1 && /\S/.test(t1) && t2 === "" && kept ? "PASS" : "FAIL", `Title Generated ID ticked + Save: new Court Case form Title prefilled "${t1}" (edited to "${t1}x" and saved: shown on a card=${kept}). Unticked + Save: new form Title "${t2}" (expected empty).`, "TED-12");
  await c.ctx.close();
});
await b.close();
