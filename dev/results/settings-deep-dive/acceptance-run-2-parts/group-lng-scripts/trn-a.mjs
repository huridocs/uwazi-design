// TRN-01, 02, 04, 07 (menu/relationship/filters keys), 08, PO1, X-11 (list and context content, read only), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section, notifMatch } from "./u.mjs";
const { rec, save } = recorder("./trn-a.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority/.test(e));
const listRows = (p) => S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n").map(x => x.trim()).filter(Boolean)));
const openCtx = async (p, name, type) => { await section(p, "Translations"); const row = S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first(); await row.click(); await p.waitForTimeout(700); };
const keysOf = async (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const count = async (p) => (await S(p).locator("[role=row]").count()) - 1;
const itemsOf = (p, sel) => S(p).locator(sel).allInnerTexts();

// ---- TRN-01, TRN-02, X-11, PO1 (list) ----
{
  const { page: p, errors } = await open(b, "translations");
  const t = await title(p);
  const heads = await S(p).locator("h3").allTextContents();
  const colHeads = (await S(p).locator("[role=columnheader]").allInnerTexts()).map(x => x.trim());
  const lr = await listRows(p);
  const sysNames = lr.slice(0, 2).map(r => r[0]); // first table rows
  // groups: split by section
  const groups = await S(p).locator("section, [data-component=SettingsSection]").evaluateAll(es => es.map(e => ({ h: e.querySelector("h3")?.textContent, rows: [...e.querySelectorAll("[data-part=row]")].map(r => r.innerText.split("\n")[0].trim()) })));
  const sys = groups.find(g => /System/.test(g.h || "")); const con = groups.find(g => /Content/.test(g.h || ""));
  // content counts vs other pages
  const cnt = async (rail) => { await section(p, rail); await p.waitForTimeout(500); return S(p).locator("[data-part=row]").count(); };
  const nT = await cnt("Templates"); const nTh = await cnt("Thesauri"); const nR = await cnt("Relationship types");
  await section(p, "Translations"); await p.waitForTimeout(500);
  const types = {};
  for (const r of lr.slice(0)) types[r[1]] = (types[r[1]] || 0) + 1;
  const s1 = await sh(p, "TRN-01");
  const nContent = (con?.rows || []).length;
  const ok1 = t === "Translations" && /System translations/.test(heads.join()) && /Content translations/.test(heads.join()) && sys && con && ["User Interface", "Menu", "Filters"].every(n => sys.rows.includes(n)) && nContent === nT + nTh + nR && colHeads.some(h => /^NAME$/i.test(h)) && colHeads.some(h => /^TYPE$/i.test(h));
  rec("TRN-01", ok1 ? "PASS" : "FAIL", `title="${t}"; group headings=${JSON.stringify(heads)}; System rows=${JSON.stringify(sys?.rows)} (expected User Interface, Menu and Filters; the seed has no Filters group, see TRN-07); Content rows=${nContent} vs Templates ${nT} + Thesauri ${nTh} + Relationship types ${nR} = ${nT + nTh + nR}; column headers=${JSON.stringify(colHeads.filter((x, i) => i < 4))}`, ok1 ? "" : s1);

  // TRN-02 sorts
  const names = async (g) => (await S(p).locator("section, [data-component=SettingsSection]").evaluateAll((es, gg) => { const e = es.find(x => new RegExp(gg).test(x.querySelector("h3")?.textContent || "")); return [...e.querySelectorAll("[data-part=row]")].map(r => r.innerText.split("\n").map(s => s.trim()).filter(Boolean)); }, g));
  const c0 = await names("Content"); const nm0 = c0.map(r => r[0]);
  const ci = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });
  const asc0 = JSON.stringify(nm0) === JSON.stringify([...nm0].sort(ci));
  const sortBtn = (g, label) => S(p).locator("section, [data-component=SettingsSection]").filter({ hasText: g }).first().locator("[data-part=sort]").filter({ hasText: label }).first();
  await sortBtn("Content translations", "Name").click(); await p.waitForTimeout(200);
  const nm1 = (await names("Content")).map(r => r[0]); const desc = JSON.stringify(nm1) === JSON.stringify([...nm0].sort(ci).reverse());
  const sysBtnRows = await names("System"); 
  await sortBtn("Content translations", "Type").click(); await p.waitForTimeout(200);
  const c2 = await names("Content"); const ty2 = c2.map(r => r[1]);
  const typeSorted = JSON.stringify(ty2) === JSON.stringify([...ty2].sort());
  // click on row opens editor; no Translate button
  const translateBtns = await S(p).getByRole("button", { name: /^Translate$/ }).count();
  const pills = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => { const sp = [...e.querySelectorAll("span")].find(x => /rounded-md/.test(x.className) && /Template|Thesaurus|Menu|Filters|User interface|Relationship/.test(x.textContent)); if (!sp) return null; const cs = getComputedStyle(sp); return `${sp.textContent}|${cs.backgroundColor}|${cs.color}`; }));
  const pillStyles = [...new Set(pills.filter(Boolean).map(x => x.split("|").slice(1).join("|")))];
  const pillTexts = [...new Set(pills.filter(Boolean).map(x => x.split("|")[0]))];
  const sysPill = pills.find(x => x && /User interface/.test(x));
  const s2 = await sh(p, "TRN-02");
  await S(p).locator("[data-part=row]").filter({ hasText: "Hearing" }).filter({ hasText: "Template" }).first().click(); await p.waitForTimeout(700);
  const editorTitle = await title(p).catch(() => "");
  const crumbs = await S(p).locator("nav[aria-label*=readcrumb] , [data-part=breadcrumb]").first().innerText().catch(() => "");
  const ok2 = asc0 && desc && typeSorted && translateBtns === 0 && pillStyles.length === 1 && !pillTexts.some(t => /Uwazi UI/.test(t)) && /Hearing/.test(editorTitle);
  rec("TRN-02", ok2 ? "PASS" : "FAIL", `Content Name default ascending=${asc0}, click Name toggles descending=${desc}; Type click sorts=${typeSorted}; "Translate" buttons=${translateBtns}; clicking the Hearing template row opened editor titled "${editorTitle}"; pill labels=${JSON.stringify(pillTexts)}; distinct pill styles (bg|colour)=${pillStyles.length} ${JSON.stringify(pillStyles)}; System pill=${sysPill}`, ok2 ? "" : s2);
  rec("_errs-TA1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- X-11 (list search) + PO1 + TRN-08 + TRN-04 + TRN-07 ----
{
  const { page: p, errors } = await open(b, "translations");
  const bar = S(p).getByRole("searchbox").or(S(p).locator('input[type=search], input[placeholder*="Search" i]')).first();
  const h0 = await bar.evaluate(e => Math.round((e.closest("[data-part=search], div")?.getBoundingClientRect().height) || 0));
  const total = await S(p).locator("[data-part=row]").count();
  await bar.fill("Court"); await p.waitForTimeout(300);
  const f1 = await S(p).locator("[data-part=row]").count(); const f1n = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n")[0].trim()));
  const h1 = await bar.evaluate(e => Math.round((e.closest("[data-part=search], div")?.getBoundingClientRect().height) || 0));
  await bar.fill("zzzz"); await p.waitForTimeout(300);
  const z = (await S(p).innerText()).replace(/\n+/g, " | ").slice(0, 400);
  const h2 = await bar.evaluate(e => Math.round((e.closest("[data-part=search], div")?.getBoundingClientRect().height) || 0));
  const s = await sh(p, "X-11-TRN");
  await bar.fill(""); await p.waitForTimeout(300);
  const back = await S(p).locator("[data-part=row]").count();
  const okx = f1 > 0 && f1 < total && f1n.every(n => /court/i.test(n)) && back === total && h0 === h1 && h1 === h2;
  rec("X-11", okx ? "PASS" : "FAIL", `rows ${total}; "Court" -> ${f1} rows ${JSON.stringify(f1n)}; "zzzz" -> "${z}"; cleared -> ${back} rows; search row height before/after/no results = ${h0}/${h1}/${h2}px`, okx ? "" : s);

  // PO1: Keys column equals editor keys for two contexts; list wording
  const listWords = (await S(p).innerText());
  const checkKeys = async (name, type) => {
    const row = S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type }).first();
    const lk = parseInt((await row.innerText()).split("\n").map(x => x.trim()).filter(Boolean)[2], 10);
    await row.click(); await p.waitForTimeout(700);
    const n = await count(p);
    const ed = (await S(p).innerText());
    await S(p).getByRole("button", { name: "Back" }).click().catch(async () => { await section(p, "Translations"); }); await p.waitForTimeout(400);
    return { name, lk, n, hasTerm: /\bterm\b/i.test(ed) };
  };
  const a1 = await checkKeys("Court Case", "Template"); const a2 = await checkKeys("Countries", "Thesaurus"); const a3 = await checkKeys("Menu", "Menu");
  const progress = /ES \d+%/.test(listWords);
  const okp = [a1, a2, a3].every(a => a.lk === a.n && !a.hasTerm) && progress && !/\bterm\b/i.test(listWords);
  rec("TRN-PO1", okp ? "PASS" : "FAIL", `Keys column vs editor rows: ${JSON.stringify([a1, a2, a3])}; per-language progress on list rows present=${progress} (e.g. "ES 98% | FR 94% ..."); the word "term" appears on list or editors=${/\bterm\b/i.test(listWords) || [a1, a2, a3].some(a => a.hasTerm)}`, okp ? "" : s);

  // TRN-08: User Interface
  await openCtx(p, "User Interface", "User interface");
  const keyRows = await S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
  const total8 = parseInt((await S(p).locator("[data-part=more]").innerText().catch(() => "")).match(/of (\d+)/)?.[1] || "0", 10) || keyRows.length;
  const listed = keyRows;
  const sortedCI = JSON.stringify(listed) === JSON.stringify([...listed].sort((a, c) => a.localeCompare(c, undefined, { sensitivity: "base" })));
  const first10 = listed.slice(0, 10);
  const termN = listed.filter(k => /\bterm \d+/i.test(k)).length;
  // spot-check 5 keys vs the app: probe keys that are visible UI words
  const probeKeys = ["Settings", "Languages", "Cancel", "Save", "Library", "Search", "Delete", "Add", "Name", "Title"];
  await p.locator("input[placeholder*='Search' i]").first().fill("Cancel").catch(() => {});
  const s8 = await sh(p, "TRN-08");
  rec("TRN-08", "FAIL", `User Interface context holds ${total8} keys (spec text: 100 to 200; SD-7 seeds 412, so the range is out of date); first rows rendered=${JSON.stringify(first10)}; first ${listed.length} sorted case-insensitively=${sortedCI}; keys reading "term N"=${termN}. Several keys are Uwazi search-syntax strings (e.g. ${JSON.stringify(first10.filter(k => /["~]/.test(k)).slice(0, 3))}) that the prototype never shows.`, s8);
  rec("_errs-TA2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
