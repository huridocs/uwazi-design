// TED-76 (CEJIL), TED-77 (Travesia), TED-27 chain half (CEJIL)
import { launch, open, S, rec, wait, strip, shot, saveBtn, dlg, propNames, propRows, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, metaTab, rail, switchTo } from "./ted-lib.mjs";
const b = await launch(); const _np = b.newContext.bind(b); b.newContext = async (...a) => { const c = await _np(...a); c.setDefaultTimeout(10000); return c; };
const guard = guardFor(rec, ONLY); const L = (...a) => console.log("[dbg]", ...a);
const typesOf = (p) => propRows(p).evaluateAll(rs => rs.map(r => ({ name: r.querySelector("button[aria-label^='Edit ']")?.getAttribute("aria-label").replace(/^Edit /, ""), type: r.querySelectorAll("td")[3]?.innerText.trim() })));
const norm = (t) => t.replace(/\s+/g, " ").trim().toUpperCase();
const fieldTexts = (p, labels) => p.evaluate(({ labels }) => { const N = (t) => t.normalize("NFC").replace(/\s+/g, " ").trim().toUpperCase(); const want = labels.map(N); return [...document.querySelectorAll("[data-part=field]")].map(f => { const lines = f.innerText.split("\n").map(x => x.trim()).filter(Boolean); return { label: N(lines[0] || ""), rest: lines.slice(1).join(" | "), list: f.querySelectorAll("li").length }; }).filter(x => want.includes(x.label)).map(x => ({ text: x.label + " : " + x.rest, rest: x.rest, list: x.list })); }, { labels });
const scanRecords = async (p, tplName, labels, max = 15) => {
  await toLibrary(p, null); await wait(p, 2500);
  for (const cbx of await p.locator("[data-component=LibraryFilters] [data-component=FacetRow] [role=checkbox][aria-checked=true], [data-component=LibraryFilters] [data-component=FacetRow] input[type=checkbox]:checked").all()) await cbx.uncheck().catch(() => {});
  await wait(p, 500);
  const row = p.locator("[data-component=LibraryFilters] [data-component=FacetRow]").filter({ hasText: new RegExp("^\\s*" + tplName.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"), "i") }).first();
  const cb = row.getByRole("checkbox").first();
  if (await cb.count()) { if (!(await cb.isChecked())) await cb.check(); await wait(p, 1500); }
  const n = Math.min(max, await p.locator("[data-component=EntityCard]").count());
  for (let i = 0; i < n; i++) {
    await p.locator("[data-component=EntityCard]").nth(i).click(); await wait(p, 700);
    const tab = p.getByRole("tab", { name: /^Metadata/ }); if (await tab.count()) { await tab.click(); await wait(p, 500); }
    const f = await fieldTexts(p, labels);
    if (f.some(x => x.rest && x.rest !== "—")) { return { index: i, fields: f, title: await p.evaluate(() => [...document.querySelectorAll("h2,h1")].filter(e => !e.closest("[inert]")).map(e => e.innerText).slice(-1)[0]) }; }
  }
  return null;
};

await guard("TED-76", async () => {
  const c = await open(b, "templates", "desktop", { source: "cejil" }); const p = c.page; await wait(p, 4000);
  await openTemplate(p, "Juez y/o Comisionado");
  const ty = await typesOf(p);
  const mr = ty.filter(t => /Mandatos/.test(t.name));
  const dateRange = ty.filter(t => /^Date range$/.test(t.type));
  await shot(p, "TED-76-settings");
  const typeBoxes = [];
  for (const t of mr) { await S(p).getByRole("button", { name: "Edit " + t.name, exact: true }).click(); await wait(p, 400); typeBoxes.push(strip(await dlg(p).locator("[data-part=type-box]").innerText())); await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 250); }
  const r = await scanRecords(p, "Juez y/o Comisionado", mr.map(t => t.name));
  await shot(p, "TED-76-record");
  const ok = mr.length > 0 && mr.every(t => t.type === "Multiple date ranges") && r && r.fields.some(f => f.list >= 1 || /–|-/.test(f.text));
  const flat = r && r.fields.every(f => !/^[^0-9]*\d{4}[\/-]\d{2}[\/-]\d{2}\s*$/.test(f.text));
  rec("TED-76", ok ? "PASS" : "FAIL", `CEJIL "Juez y/o Comisionado" (the only CEJIL templates with a multiple date range are this one and "Geolocalización de los hechos del caso"; no CEJIL template carries a plain Date range property: types in this one ${JSON.stringify(ty.map(t => t.name + ":" + t.type).slice(3))}). Settings type of the mandate properties ${JSON.stringify(mr)}, panel type boxes ${JSON.stringify(typeBoxes)}. Record scan: ${JSON.stringify(r && { index: r.index, title: r.title, fields: r.fields.map(f => ({ text: f.text, listItems: f.list })) })}.`, "TED-76-record");
  await c.ctx.close();
});

await guard("TED-77", async () => {
  const c = await open(b, "templates", "desktop", { source: "travesia" }); const p = c.page; await wait(p, 4000);
  const out = {};
  for (const tpl of ["VIOLENCIAS", "REGULARIZACIÓN MIGRATORIA", "DESAPARICIÓN"]) {
    await toSettingsTemplates(p); await wait(p, 600);
    await openTemplate(p, tpl);
    const ty = await typesOf(p);
    const sel = ty.filter(t => /^(Date range|Multiple date ranges|Geolocation)$/.test(t.type));
    out[tpl] = { types: sel };
    await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  }
  const recs = {};
  await c.ctx.close();
  for (const tpl of Object.keys(out)) {
    const cc = await open(b, "templates", "desktop", { source: "travesia" }); const pp = cc.page; await wait(pp, 3500);
    const labels = out[tpl].types.map(t => t.name);
    recs[tpl] = await scanRecords(pp, tpl, labels, 15);
    if (recs[tpl]) await shot(pp, "TED-77-" + tpl.split(" ")[0]);
    await cc.ctx.close();
  }
  const summary = Object.fromEntries(Object.entries(recs).map(([k, v]) => [k, v && v.fields.map(f => f.text.slice(0, 110))]));
  const dr = ["REGULARIZACIÓN MIGRATORIA", "DESAPARICIÓN"].some(k => recs[k] && recs[k].fields.some(f => /\d{4}[\/-]\d{2}[\/-]\d{2}\s*[–-]\s*\d{4}[\/-]\d{2}[\/-]\d{2}/.test(f.text))) && recs["VIOLENCIAS"] && recs["VIOLENCIAS"].fields.some(f => /\d{4}[\/-]\d{2}[\/-]\d{2}\s*[–-]/.test(f.text));
  const geo = !!(recs["VIOLENCIAS"] && recs["VIOLENCIAS"].fields.some(f => /GEOLOCALIZACI/.test(f.text) && /[A-Za-zÁ-ú]{4,}/.test(f.rest)));
  rec("TED-77", dr && geo ? "PASS" : "FAIL", `Travesia: no single template has a date range and a geolocation; VIOLENCIAS has Multiple date ranges + Geolocation, REGULARIZACIÓN MIGRATORIA and DESAPARICIÓN have Date range. Settings types ${JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.types.map(t => t.name + ":" + t.type)])))}. First record with values per template: ${JSON.stringify(summary)}.`, "TED-77-VIOLENCIAS");
});

await guard("TED-27c", async () => {
  const c = await open(b, "templates", "desktop", { source: "cejil" }); const p = c.page; await wait(p, 4000);
  // Causa is a template whose chain field projects a Pais property; try removing the leaf in the target template
  const res = {};
  for (const tpl of ["País", "Pais"]) {
    if (!(await S(p).locator("[role=row]", { hasText: tpl }).count())) continue;
    await openTemplate(p, tpl);
    const names = (await propNames(p)).slice(3);
    for (const n of names) {
      const cb = S(p).getByRole("checkbox", { name: "Select " + n, exact: true });
      await cb.check();
      await S(p).locator("footer").getByRole("button", { name: "Remove" }).click(); await wait(p, 350);
      const d = p.locator("[data-component=ConfirmDelete]:not([inert]):not([inert] *),[data-component=ConfirmDialog]:not([inert]):not([inert] *)");
      if (await d.count()) { res[n] = strip(await d.first().innerText()); await d.first().getByRole("button").first().click(); await wait(p, 300); }
      else { res[n] = "(removed)"; await p.locator("article", { hasText: n + " removed" }).getByRole("button", { name: /Undo/ }).evaluate(x => x.click()).catch(() => {}); await wait(p, 300); }
      await cb.uncheck().catch(() => {});
    }
    break;
  }
  const blocked = Object.entries(res).filter(([, v]) => v !== "(removed)");
  rec("TED-27c", blocked.length ? "PASS" : "FAIL", `CEJIL País properties removed one at a time: ${JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.slice(0, 200)])))}.`, "");
  await c.ctx.close();
});
await b.close();
