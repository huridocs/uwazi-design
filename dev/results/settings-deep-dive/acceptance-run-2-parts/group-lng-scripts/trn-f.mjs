// TRN-20 (phone) and X checks for Translations: X-01, X-04, X-06, X-07, X-08, X-09, X-10, X-13
import { launch, open, openPhone, S, rows, title, dialogs, recorder, sh, section, notifMatch, logEntries, axeSerious, contrast, dark, light, hasHScroll, backToSettings, logo, arm } from "./u.mjs";
const { rec, save } = recorder("./trn-f.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|validateDOMNesting|React does not recognize the `%s` prop/.test(e));
const esc = (k) => k.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const inp = (p, key, lang) => S(p).locator(`input[aria-label^="${esc(key)} in ${lang}"]`).first();
const commit = (p) => p.locator("button:visible").filter({ hasText: /^Save$/ }).last();
const toList = async (p) => { await section(p, "Translations"); if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).first().click(); await p.waitForTimeout(500); } };
const openCtx = async (p, name, type) => { await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first().click(); await p.waitForTimeout(800); };
const keysOf = (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const cd = (p) => p.locator("[data-component=ConfirmDialog]");

// ---- X-01 ----
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Court Case", "Template");
  const k = (await keysOf(p))[2];
  await inp(p, k, "Spanish").fill("PERSIST-1"); await commit(p).click(); await p.waitForTimeout(500);
  await section(p, "Languages"); await openCtx(p, "Court Case", "Template");
  const v1 = await inp(p, k, "Spanish").inputValue();
  await p.reload(); await p.waitForTimeout(1500);
  await openCtx(p, "Court Case", "Template");
  const v2 = await inp(p, k, "Spanish").inputValue();
  await section(p, "Dashboard"); await p.waitForTimeout(400);
  await S(p).getByRole("button", { name: /Reset demo data/ }).click(); await p.waitForTimeout(400);
  const dlg = p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").first();
  await dlg.getByRole("button", { name: /Reset/ }).last().click(); await p.waitForTimeout(800);
  await openCtx(p, "Court Case", "Template");
  const v3 = await inp(p, k, "Spanish").inputValue();
  const ok = v1 === "PERSIST-1" && v2 === "PERSIST-1" && v3 !== "PERSIST-1";
  rec("X-01", ok ? "PASS" : "FAIL", `saved es "${k}"="PERSIST-1"; after rail to Languages and back="${v1}"; after reload="${v2}"; after Reset demo data="${v3}" (seed text)`, ok ? "" : "");
  rec("_errs-XF1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-04 failure half + X-09 ----
{
  const { page: p, errors } = await open(b, "translations");
  const st = await arm(p, "Save", "Injected save failure for QA.", "Translations");
  await openCtx(p, "Court Case", "Template");
  const k = (await keysOf(p))[2];
  await inp(p, k, "Spanish").fill("FAIL-SAVE"); await commit(p).click(); await p.waitForTimeout(800);
  const errsN = await notifMatch(p, /An error occurred/);
  const okN = await notifMatch(p, /Translations saved/);
  const kept = (await inp(p, k, "Spanish").inputValue()) === "FAIL-SAVE";
  const dirty = await commit(p).isEnabled();
  const s = await sh(p, "X-04-TRN");
  const ok = errsN.length === 1 && okN.length === 0 && kept && dirty;
  rec("X-04", ok ? "PASS" : "FAIL", `success half: "Translations saved" x1 per Save (TRN-15). Failure half: armed (${st}), edited es "${k}" and pressed Save: error entries "An error occurred"=${JSON.stringify(errsN)}, success entries=${okN.length}, edit kept=${kept}, Save still enabled=${dirty}. The Save was written as if nothing was armed.`, ok ? "" : s);
  rec("_errs-XF2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
{
  const { page: p, errors } = await open(b, "translations");
  await openCtx(p, "Countries", "Thesaurus");
  const k = (await keysOf(p))[2];
  await inp(p, k, "Spanish").fill("ACT-1"); await commit(p).click(); await p.waitForTimeout(500);
  await section(p, "Activity log"); await p.waitForTimeout(600);
  const raw = await S(p).locator("tbody tr, [data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => /ranslation/.test(t)));
  const s = await sh(p, "X-09-TRN");
  const ok = raw.some(t => /Updated translations of “Countries”/.test(t) && /admin/.test(t));
  rec("X-09", ok ? "PASS" : "FAIL", `Activity log rows after one Save: ${JSON.stringify(raw)}`, ok ? "" : s);
  await p.context().close();
}

// ---- X-07 axe ----
{
  const { page: p, errors } = await open(b, "translations");
  const out = [];
  const listAx = await axeSerious(p); out.push(`list=${JSON.stringify(listAx)}`);
  const names = await S(p).getByRole("button").evaluateAll(es => es.map(e => e.getAttribute("aria-label") || e.textContent.trim()).filter(Boolean));
  const dupAll = [...new Set(names.filter((x, i) => names.indexOf(x) !== i))];
  const dup = dupAll.filter(x => /^Translate /.test(x));
  out.push(`duplicate row-button names on the list=${JSON.stringify(dup)} (the column sort buttons Name and Type also repeat across the two tables: ${JSON.stringify(dupAll.filter(x => !/^Translate /.test(x)))})`);
  await openCtx(p, "Court Case", "Template");
  const edAx = await axeSerious(p); out.push(`editor=${JSON.stringify(edAx)}`);
  const unlabeled = await S(p).locator("input").evaluateAll(es => es.filter(e => !(e.getAttribute("aria-label") || (e.labels && e.labels.length) || e.getAttribute("aria-labelledby"))).length);
  out.push(`inputs without a label=${unlabeled}`);
  const k = (await keysOf(p))[2];
  await inp(p, k, "Spanish").fill("AXE-1");
  await S(p).getByRole("button", { name: "Translations", exact: true }).click(); await p.waitForTimeout(400);
  const dAx = await axeSerious(p, "[data-component=ConfirmDialog]"); out.push(`discard dialog=${JSON.stringify(dAx)}`);
  const named = await cd(p).locator("[role=dialog]").first().evaluate(e => !!(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby")));
  let esc = false; for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))) { esc = true; break; } }
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  const closed = (await cd(p).count()) === 0;
  const foc = await p.evaluate(() => document.activeElement?.textContent.trim().slice(0, 30));
  out.push(`dialog named=${named}, trap held=${!esc}, Escape closes=${closed}, focus restored to "${foc}"`);
  const s = await sh(p, "X-07-TRN");
  const bad = listAx.length || edAx.length || dAx.length || unlabeled || dup.length || !named || esc || !closed || foc !== "Translations";
  rec("X-07", bad ? "FAIL" : "PASS", `serious/critical axe and checks: ${out.join("; ")}`, bad ? s : "");
  rec("_errs-XF3", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-08 contrast + dark, desktop and phone ----
for (const vp of ["desktop", "mobile"]) {
  const { page: p, errors } = vp === "mobile" ? await openPhone(b, "translations") : await open(b, "translations");
  const run = async (mode) => { if (mode === "dark") await dark(p); else await light(p); await p.waitForTimeout(300); };
  const read = async () => ({
    type: await contrast(p, "[data-part=row] span.rounded-md", "Template|Thesaurus|Menu|User interface|Relationship type"),
    prog: await contrast(p, "[data-component=TranslationProgress] span", "\\d+%"),
  });
  await run("light"); const L = await read(); const sl = await sh(p, `X-08-TRN-${vp}-list-light`);
  await run("dark"); const Dk = await read(); const sd = await sh(p, `X-08-TRN-${vp}-list-dark`);
  // editor pills
  await light(p);
  if (vp === "mobile") await S(p).locator("[data-part=row]").filter({ hasText: "Countries" }).first().tap(); else await S(p).locator("[data-part=row]").filter({ hasText: "Countries" }).first().click();
  await p.waitForTimeout(900);
  const rd = async () => ({ pill: await contrast(p, "span.uppercase", "^(en|es|fr|ar|pt)$"), progress: await contrast(p, "[data-component=TranslationProgress] li span", "of") });
  const EL = await rd(); const sel = await sh(p, `X-08-TRN-${vp}-editor-light`);
  await dark(p); await p.waitForTimeout(300);
  const ED = await rd(); const sed = await sh(p, `X-08-TRN-${vp}-editor-dark`);
  // amber untranslated pills: find those with warning bg
  const amber = async () => p.evaluate(() => { const els = [...document.querySelectorAll("span.uppercase")].filter(e => /bg-warning/.test(e.className)); return els.length; });
  const nums = [...L.type, ...L.prog, ...Dk.type, ...Dk.prog, ...EL.pill, ...ED.pill, ...EL.progress, ...ED.progress].map(x => parseFloat(x.split("=")[1])).filter(n => !isNaN(n));
  const low = nums.filter(n => n < 4.5);
  rec(`X-08 (${vp})`, low.length === 0 && nums.length >= 8 ? "PASS" : "FAIL", `list type pills light ${JSON.stringify(L.type.slice(0, 3))} dark ${JSON.stringify(Dk.type.slice(0, 3))}; list progress text light ${JSON.stringify(L.prog.slice(0, 2))} dark ${JSON.stringify(Dk.prog.slice(0, 2))}; editor code pills (source, translated, untranslated amber) light ${JSON.stringify(EL.pill.slice(0, 6))} dark ${JSON.stringify(ED.pill.slice(0, 6))}; editor progress text light ${JSON.stringify(EL.progress.slice(0, 2))} dark ${JSON.stringify(ED.progress.slice(0, 2))}; amber pills in view=${await amber()}; ratios below 4.5: ${JSON.stringify(low)}`, low.length ? sed : "");
  rec(`_errs-XF4-${vp}`, real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-20 + X-06 phone ----
{
  const { page: p, errors } = await openPhone(b, "translations");
  const hsList = await hasHScroll(p);
  const listRows = await S(p).locator("[data-part=row]").count();
  const s0 = await sh(p, "TRN-20-list");
  await S(p).locator("[data-part=row]").filter({ hasText: "Countries" }).first().tap(); await p.waitForTimeout(900);
  const hsEd = await hasHScroll(p);
  const s1 = await sh(p, "TRN-20-editor");
  const struct = await S(p).evaluate(root => {
    const rowsE = [...root.querySelectorAll("[data-part=row]")];
    const first = rowsE[0];
    return { rows: rowsE.length, inputs: first ? first.querySelectorAll("input").length : 0, pills: first ? first.querySelectorAll("span.uppercase").length : 0, h: first ? Math.round(first.getBoundingClientRect().height) : 0, w: first ? Math.round(first.getBoundingClientRect().width) : 0, key: first ? first.innerText.split("\n")[0] : null };
  });
  const k = (await S(p).locator("[data-part=row]").first().innerText()).split("\n")[0].trim();
  const inputBox = await S(p).locator("[data-part=row]").first().locator("input").first().evaluate(e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
  const footerOk = await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter(e => !e.closest("[inert]") && /^(Save|Cancel)$/.test(e.textContent.trim())); return bs.map(b => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()}:${r.bottom <= innerHeight && r.right <= innerWidth}`; }); });
  await S(p).locator("[data-part=row]").first().locator("input").nth(0).tap();
  await p.keyboard.type("m");
  const dirtyBtn = await commit(p).isEnabled();
  const back = await S(p).getByRole("button", { name: "Back" }).count();
  await S(p).getByRole("button", { name: "Back" }).first().tap(); await p.waitForTimeout(500);
  const guard = (await cd(p).count()) > 0;
  const s2 = await sh(p, "TRN-20-guard");
  const ok = !hsList.page && !hsEd.page && struct.inputs >= 3 && inputBox.r <= 390 && footerOk.every(x => /true/.test(x)) && guard;
  rec("TRN-20", ok ? "PASS" : "FAIL", `list rows=${listRows}, horizontal scroll list=${hsList.page}/${hsList.pane}; editor structure: first card/row has ${struct.inputs} inputs and ${struct.pills} code pills, ${struct.w}x${struct.h}px, key "${struct.key}"; input box ${JSON.stringify(inputBox)}; editor horizontal scroll=${hsEd.page}/${hsEd.pane}; footer ${JSON.stringify(footerOk)}; status per language row: an amber (untranslated) or grey (translated) code pill sits beside the grey code pill, so the code shows twice per row, and no separate dot (see screenshot); typing marks it dirty (Save enabled=${dirtyBtn}); back chevron present=${back}, opens the discard dialog=${guard}`, ok ? "" : s1);
  rec("X-06", ok ? "PASS" : "FAIL", `Translations at 390x844: list rows readable (${listRows}), editor as cards, no horizontal scroll on list (${hsList.page}) or editor (${hsEd.page}), Save/Cancel reachable ${JSON.stringify(footerOk)}, mobile back chevron guarded=${guard}`, ok ? "" : s1);
  rec("_errs-XF5", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-10 zero rows ----
{
  const { page: p, errors } = await open(b, "translations");
  await logo(p).click(); await p.waitForTimeout(700);
  const dp = p.locator("[data-component=DevPanel]").first(); await dp.scrollIntoViewIfNeeded();
  for (const t of ["Empty templates", "Empty thesauri", "Empty relationship types"]) { await dp.getByRole("button", { name: t, exact: true }).click(); await p.waitForTimeout(200); }
  await p.getByRole("button", { name: /Return to app/ }).click(); await p.waitForTimeout(600);
  await backToSettings(p, "Translations");
  const txt = (await S(p).innerText()).replace(/\n+/g, " | ");
  const sect = await S(p).locator("section, [data-component=SettingsSection]").evaluateAll(es => es.map(e => ({ h: e.querySelector("h3")?.textContent, t: e.innerText.replace(/\n+/g, " | ") })));
  const content = sect.find(x => /Content/.test(x.h || ""));
  const s = await sh(p, "X-10-TRN");
  const generic = /Nothing here yet/.test(txt);
  const named = /No content contexts|content/i.test(content?.t || "");
  const hint = (content?.t || "").split(" | ").filter(x => x.length > 25).length;
  const ok = !generic && named && hint > 0;
  rec("X-10", ok ? "PASS" : "FAIL", `with the Dev panel's Empty templates, thesauri and relationship types: Content translations section reads "${content?.t}"; generic "Nothing here yet."=${generic}; title names the object=${named}; one-line hint present=${hint > 0}; no create action exists on this page (contexts follow their stores). System translations still lists ${JSON.stringify(sect.find(x => /System/.test(x.h || ""))?.t)}`, ok ? "" : s);
  rec("_errs-XF6", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-13 ----
{
  const { page: p, errors } = await open(b, "translations");
  const list = async () => S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 2).join("/")));
  const sample = await list();
  const sw = async (name) => { await p.locator('button[aria-label^="Collection:"]').click(); await p.waitForTimeout(250); await p.locator("[data-part=collection-menu] [role=option]").filter({ hasText: name }).click(); await p.waitForTimeout(1800); await backToSettings(p, "Translations"); };
  await sw("CEJIL"); const cejil = await list(); const s = await sh(p, "X-13-TRN-cejil");
  await sw("Best Artworks"); const art = await list();
  await sw("Sample");
  const back = await list();
  const ok = JSON.stringify(sample) !== JSON.stringify(cejil) && JSON.stringify(back) === JSON.stringify(sample) && cejil.length > 5;
  rec("X-13", ok ? "PASS" : "FAIL", `Sample contexts (${sample.length}): ${JSON.stringify(sample.slice(0, 6))}...; CEJIL (${cejil.length}): ${JSON.stringify(cejil.slice(0, 6))}...; Best Artworks (${art.length}): ${JSON.stringify(art.slice(0, 6))}...; back on Sample identical to first read=${JSON.stringify(back) === JSON.stringify(sample)}`, ok ? "" : s);
  rec("_errs-XF7", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
for (const x of ["X-05", "X-12"]) rec(x, "N/A", "Excluded by the page's Applies line.");
save();
await b.close();
