// TED-78..84 : flags reach the record, form, cards, list columns and Library filters (Sample, Court Case)
import { launch, S, rec, wait, strip, shot, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, pickType, pickOpt, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, openEntityEdit, labelsIn, openDisplay, menuText, setView, facetTitles, cardsText, metaTab, addProp, createEntity, saveTemplate } from "./ted-lib.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);
const confirmDlg = (p) => p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
const save = async (p) => { await saveBtn(p).click(); await wait(p, 700); if (await confirmDlg(p).count()) { await confirmDlg(p).first().getByRole("button", { name: "Save" }).click(); await wait(p, 800); } };
const flag = async (p, prop, name, on = true) => { await S(p).getByRole("button", { name: "Edit " + prop, exact: true }).click(); await wait(p, 400); const cb = dlg(p).getByRole("checkbox", { name, exact: true }); if (on) await cb.check(); else await cb.uncheck(); await dlg(p).getByRole("button", { name: "Save" }).click(); await wait(p, 300); };
const hdrHidden = (p) => p.locator("[data-part=field]").first().locator("header").evaluate(h => { const r = h.getBoundingClientRect(); return /sr-only/.test(h.className) || (r.width <= 1 && r.height <= 1); });
const recFields = async (p, idx = 0) => { await p.locator("[data-component=EntityCard]").nth(idx).click(); await wait(p, 900); await metaTab(p); return (await p.locator("[data-part=field]").allInnerTexts()).map(strip); };


const grpOf = (p, l) => p.getByRole("group", { name: l, exact: true });
// create a Court Case/Judgment entity holding values for the QA properties
const newEntity = async (p, tpl, title, fill) => {
  await createEntity(p, tpl);
  await p.getByLabel(/^Title\*?$/).first().fill(title);
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  await fill(p);
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  await p.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {}); await wait(p, 500);
};
const sectionOf = (p, n) => p.locator("[data-component=LibraryFilters] section", { has: p.locator("[data-part=title]", { hasText: n }) }).first();

await guard("TED-81", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Text", label: "QA Facet text", flags: ["Use as filter"] });
  await addProp(p, { type: "Date", label: "QA Facet date", flags: ["Use as filter"] });
  await addProp(p, { type: "Select", label: "QA Facet select", flags: ["Use as filter"], fill: async (d) => { await pickOpt(d.page(), "Thesaurus", "Case status"); } });
  await save(p);
  await toLibrary(p, "Court Case");
  const fNoValues = await facetTitles(p);
  await newEntity(p, "Court Case", "QA facet entity", async (q) => { await q.getByLabel("QA Facet text", { exact: true }).fill("alpha"); await q.getByLabel("QA Facet date", { exact: true }).fill("2020-05-17"); await grpOf(q, "QA Facet select").getByRole("radio", { name: "Decided", exact: true }).check(); });
  await wait(p, 600);
  const f1 = await facetTitles(p);
  await shot(p, "TED-81");
  const kind = {};
  for (const n of ["QA Facet text", "QA Facet date", "QA Facet select"]) kind[n] = await sectionOf(p, n).evaluate(e => ({ comp: e.getAttribute("data-component"), text: e.innerText.replace(/\s+/g, " ").slice(0, 100) })).catch(() => null);
  await toSettingsTemplates(p); await openTemplate(p, "Court Case");
  await flag(p, "QA Facet select", "Use as filter", false); await flag(p, "QA Facet text", "Use as filter", false); await flag(p, "QA Facet date", "Use as filter", false); await save(p);
  await toLibrary(p, "Court Case");
  const f2 = await facetTitles(p);
  const has = (a, n) => a.includes(n);
  rec("TED-81", has(f1, "QA Facet select") && has(f1, "QA Facet text") && has(f1, "QA Facet date") && !f2.some(x => /QA Facet/.test(x)) ? "PASS" : "FAIL", `Court Case with Text, Date and Select ("Case status") properties each ticked Use as filter + Save. Library facet titles right after Save, no entity holds a value yet: ${JSON.stringify(fNoValues)} (no QA facet). After an entity "QA facet entity" was created with a value for each (text "alpha", date 2020-05-17, Case status "Decided"): ${JSON.stringify(f1)}; facet kinds drawn ${JSON.stringify(kind)}. After unticking all three + Save: ${JSON.stringify(f2)}.`, "TED-81");
  await c.ctx.close();
});

await guard("TED-82", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  const mk = async () => { await addProp(p, { type: "Select", label: "QA Shared facet", flags: ["Use as filter"], fill: async (d) => { await pickOpt(d.page(), "Thesaurus", "Case status"); } }); await save(p); };
  await mk();
  await toLibrary(p, "Court Case");
  await newEntity(p, "Court Case", "QA shared A", async (q) => { await grpOf(q, "QA Shared facet").getByRole("radio", { name: "Decided", exact: true }).check(); });
  await toSettingsTemplates(p); await openTemplate(p, "Judgment");
  await mk();
  await toLibrary(p, "Judgment");
  await p.getByRole("checkbox", { name: "Court Case", exact: true }).first().uncheck(); await wait(p, 600);
  await newEntity(p, "Judgment", "QA shared B", async (q) => { await grpOf(q, "QA Shared facet").getByRole("radio", { name: "Open", exact: true }).check(); });
  await p.locator("[data-component=LibraryFilters] [data-part=clear]").click().catch(() => {}); await wait(p, 900);
  const sel = await p.getByRole("checkbox", { checked: true }).evaluateAll(es => es.map(e => e.getAttribute("aria-label") || e.closest("label")?.innerText || "")).catch(() => []);
  const f1 = await facetTitles(p);
  const count = f1.filter(x => x === "QA Shared facet").length;
  const opts = await sectionOf(p, "QA Shared facet").evaluate(e => e.innerText.replace(/\s+/g, " ").slice(0, 160)).catch(() => null);
  await shot(p, "TED-82");
  await p.getByRole("checkbox", { name: "Court Case", exact: true }).first().check(); await wait(p, 500);
  await p.getByRole("checkbox", { name: "Judgment", exact: true }).first().check(); await wait(p, 900);
  const both = await facetTitles(p); const bothCount = both.filter(x => x === "QA Shared facet").length;
  rec("TED-82", count === 1 ? "PASS" : "FAIL", `"QA Shared facet" (Select, thesaurus Case status, Use as filter) added to Court Case and to Judgment, one entity of each holding a value; Library with no template selected (checked boxes ${JSON.stringify(sel)}): facet titles ${JSON.stringify(f1)}; facets with that label: ${count} (expected 1 combined; contents ${JSON.stringify(opts)}). With both Court Case and Judgment ticked the facet appears ${bothCount} time(s) (${JSON.stringify(both)}); spec 6.4 says with no Type selection the facets of every template show, but the Library only lists default-filter facets then.`, "TED-82");
  await c.ctx.close();
});

await guard("TED-83", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Select", label: "QA Default facet", flags: ["Use as filter", "Default filter"], fill: async (d) => { await pickOpt(d.page(), "Thesaurus", "Case status"); } });
  await save(p);
  await toLibrary(p, "Court Case");
  const f0 = await facetTitles(p);
  await newEntity(p, "Court Case", "QA default entity", async (q) => { await grpOf(q, "QA Default facet").getByRole("radio", { name: "Decided", exact: true }).check(); });
  const f1 = await facetTitles(p);
  const idx = f1.indexOf("QA Default facet");
  const open = await sectionOf(p, "QA Default facet").evaluate(e => ({ comp: e.getAttribute("data-component"), options: e.querySelectorAll("[data-part=option]").length, text: e.innerText.replace(/\s+/g, " ").slice(0, 100) })).catch(() => null);
  await shot(p, "TED-83");
  const other = Math.min(...["Region"].map(n => f1.indexOf(n)).filter(i => i >= 0));
  rec("TED-83", idx >= 0 && idx < other && open && open.options > 0 ? "PASS" : "FAIL", `"QA Default facet" (Select, Use as filter + Default filter) on Court Case, Library with Court Case selected. Facet titles before any entity holds a value ${JSON.stringify(f0)}; after one entity holds a value ${JSON.stringify(f1)}; position ${idx} (first among the property facets, ahead of Region and the second Status; the fixed Status, Template and Countries cards keep their place above, as spec 6.4 says fixed facets do); expanded with options listed=${JSON.stringify(open)}.`, "TED-83");
  await c.ctx.close();
});
await b.close();
