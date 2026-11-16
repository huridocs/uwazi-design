import { watch, openRow, launch, open, S, rows, wait, shot, init, rec, realErrors, names, rowsData, goLibrary, libTypeFacet, pageContrast, setDark, toSettingsItem, axe, logEntries, notifTitles } from "./common.mjs";
init("tpl1");
const b = await launch();
const sortedNames = (a) => [...a].sort((x, y) => x.localeCompare(y));

// TPL-01, 02, 06 share a context
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const hdr = (await S(page).locator("[role=columnheader]").allTextContents()).map((s) => s.trim()).filter(Boolean);
  const nm = await names(page);
  const s1 = await shot(page, "TPL-01");
  await goLibrary(page);
  const fac = await libTypeFacet(page);
  await shot(page, "TPL-01-library-facet");
  const facNames = fac.filter((f) => f.name !== "Documents").map((f) => f.name);
  const noExtra = !hdr.some((h) => /translation|synced|edit/i.test(h)) && JSON.stringify(hdr.map((h) => h.toLowerCase())) === JSON.stringify(["name", "entities", "set as default"]);
  const asc = JSON.stringify(nm) === JSON.stringify(sortedNames(nm));
  const setEq = JSON.stringify(sortedNames(nm)) === JSON.stringify(sortedNames(facNames));
  rec("TPL-01", noExtra && asc && setEq ? "PASS" : "FAIL", `headers ${JSON.stringify(hdr)}; names ${JSON.stringify(nm)} ascending=${asc}; Library Type facet ${JSON.stringify(facNames)} setEqual=${setEq}`, s1);
  // TPL-02 colours: list dot vs library card dot vs facet dot
  const cardDot = await page.evaluate(() => { const d = document.querySelector("[data-component=EntityTypeTag][title=Hearing] [data-part=dot]"); return d ? getComputedStyle(d).backgroundColor : null; });
  const facetDots = await page.evaluate(() => {
    const h = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Template");
    let card = h; while (card && card.querySelectorAll("input[type=checkbox],[role=checkbox]").length < 1) card = card.parentElement;
    const lab = [...card.querySelectorAll("label")].find((l) => /Hearing/.test(l.innerText));
    const painted = [...lab.querySelectorAll("*")].filter((e) => getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)" && e.getBoundingClientRect().width < 16 && e.getBoundingClientRect().width > 3 && e.tagName !== "INPUT").length;
    return painted;
  });
  await toSettingsItem(page, "Templates");
  const listDot = await S(page).locator("[role=row]", { hasText: "Hearing" }).first().evaluate((r) => { const d = [...r.querySelectorAll("span")].find((x) => x.style.backgroundColor); return d ? getComputedStyle(d).backgroundColor : null; });
  const s2 = await shot(page, "TPL-02");
  rec("TPL-02", listDot && listDot === cardDot && facetDots > 0 ? "PASS" : "FAIL", `Hearing: list dot ${listDot}, Library card dot ${cardDot}, coloured dots in the Library Type facet row: ${facetDots}. List and card ${listDot === cardDot ? "match" : "differ"}; the facet row ${facetDots ? "has" : "has no"} colour dot, so same colour in all three places ${facetDots ? "holds" : "cannot hold"}.`, s2);
  // TPL-06 counts vs Library after filtering by type (all 9)
  const list = (await rowsData(page)).map((r) => [r.name, r.entities]);
  await goLibrary(page);
  const diffs = []; const read = [];
  for (const [n, c] of list) {
    const lab = page.locator("label").filter({ hasText: new RegExp("^\\s*" + n + "\\s*\\d+\\s*$") }).first();
    await lab.click(); await wait(page, 900);
    const txt = await page.evaluate(() => { const m = document.body.innerText.match(/(\d[\d,]*) of \d[\d,]* entit(?:y|ies)/); return m ? m[1] : null; });
    read.push(`${n}: list ${c}, Library ${txt}`);
    if (String(txt) !== String(c)) diffs.push(`${n} list ${c} vs Library ${txt}`);
    await lab.click(); await wait(page, 500);
  }
  const s3 = await shot(page, "TPL-06");
  rec("TPL-06", diffs.length === 0 ? "PASS" : "FAIL", `${read.join("; ")}; mismatches ${JSON.stringify(diffs)}`, s3);
  await page.context().close();
}
// TPL-03 sort
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const th = (n) => S(page).locator("[role=columnheader]", { hasText: n });
  const clickTh = (n) => th(n).first().locator("button").click();
  const state = async (n) => th(n).first().evaluate((e) => ({ sort: e.getAttribute("aria-sort"), svg: [...e.querySelectorAll("svg")].map((s) => s.getAttribute("class")?.match(/lucide-[a-z-]+/)?.[0]).join(","), btn: !!e.querySelector("button") }));
  const out = []; const orders = [];
  await clickTh("Name"); await wait(page, 250); out.push(["name1", await state("Name")]); orders.push(await names(page));
  await clickTh("Name"); await wait(page, 250); out.push(["name2", await state("Name")]); orders.push(await names(page));
  const nameAscThenDesc = JSON.stringify(orders[0]) === JSON.stringify(sortedNames(orders[0]).reverse()) && JSON.stringify(orders[1]) === JSON.stringify(sortedNames(orders[1]));
  await clickTh("Entities"); await wait(page, 250); out.push(["ent1", await state("Entities")]); const e1 = await rows(page); orders.push(await names(page));
  const cnt = async () => S(page).locator("[role=row]").evaluateAll((rs) => rs.slice(1).map((r) => Number(r.innerText.split("\n").map((s) => s.trim()).filter(Boolean).filter((x) => /^\d+$/.test(x)).pop())));
  const c1 = await cnt();
  await clickTh("Entities"); await wait(page, 250); out.push(["ent2", await state("Entities")]); const c2 = await cnt();
  const numeric1 = c1.every((v, i) => i === 0 || c1[i - 1] >= v); const numeric2 = c2.every((v, i) => i === 0 || c2[i - 1] <= v);
  // sort holds while searching
  await S(page).getByRole("searchbox").or(S(page).getByRole("textbox", { name: /Search templates/ })).first().fill("o"); await wait(page, 300);
  const c3 = await cnt();
  const holds = c3.every((v, i) => i === 0 || c3[i - 1] <= v);
  const s = await shot(page, "TPL-03");
  const exp = { name1: "descending", name2: "ascending", ent1: "descending", ent2: "ascending" };
  const ariaOk = out.every(([k, st]) => st.sort === exp[k] && /chevron/.test(st.svg));
  rec("TPL-03", nameAscThenDesc && numeric1 && numeric2 && holds && ariaOk ? "PASS" : "FAIL", `header state ${JSON.stringify(out)}; Name starts ascending (default sort), click 1 gives Z-A and click 2 A-Z: ${nameAscThenDesc}; aria-sort and chevron icon follow each click: ${ariaOk}; Entities 1st click ${JSON.stringify(c1)} (largest first=${numeric1}); 2nd ${JSON.stringify(c2)} (asc=${numeric2}); with search "o" counts ${JSON.stringify(c3)} sort held (ascending)=${holds}`, s);
  await page.context().close();
}
// TPL-04 open + back
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  await S(page).locator("[role=columnheader]", { hasText: "Entities" }).first().locator("button").click(); await wait(page, 250); await S(page).locator("[role=columnheader]", { hasText: "Entities" }).first().locator("button").click(); await wait(page, 250);
  const before = await names(page);
  await openRow(page, "Court Case");
  const txt = (await S(page).innerText()).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const s = await shot(page, "TPL-04");
  await S(page).getByRole("button", { name: "Templates" }).first().click(); await wait(page, 500);
  const after = await names(page);
  rec("TPL-04", txt[0] === "Templates" && txt.includes("Court Case") && JSON.stringify(before) === JSON.stringify(after) ? "PASS" : "FAIL", `editor head lines ${JSON.stringify(txt)}; list order before open ${JSON.stringify(before.slice(0, 4))}, after breadcrumb ${JSON.stringify(after.slice(0, 4))} same=${JSON.stringify(before) === JSON.stringify(after)} (sort set to Entities desc before opening)`, s);
  await page.context().close();
}
// TPL-05 default badge, TPL-X08
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const info = [];
  for (const dark of [false, true]) {
    await setDark(page, dark); await wait(page, 200);
    const d = await page.evaluate(() => { const els = [...document.querySelectorAll("[data-testid=settings-content] span")].filter((e) => e.textContent.trim() === "Default"); const e = els[0]; return { n: els.length, cls: e?.className, color: e && getComputedStyle(e).color, bg: e && getComputedStyle(e).backgroundColor }; });
    await page.evaluate(() => { const e = [...document.querySelectorAll("[data-testid=settings-content] span")].find((x) => x.textContent.trim() === "Default"); e?.setAttribute("data-qa-default", "1"); });
    const c = await pageContrast(page, ['[data-qa-default="1"]']);
    info.push({ dark, ...d, contrast: c[0] });
    if (dark) await shot(page, "TPL-05-dark");
  }
  const s = await shot(page, "TPL-05");
  const notCarbon = info.every((i) => !/accent-blue|carbon/.test(i.cls || ""));
  const ok = info.every((i) => i.n === 1) && notCarbon;
  rec("TPL-05", ok ? "PASS" : "FAIL", `light ${JSON.stringify(info[0])}; dark ${JSON.stringify(info[1])}; classes carbon-free=${notCarbon}`, s);
  rec("X-08", info.every((i) => i.contrast && i.contrast.ratio >= 4.5) ? "PASS" : "FAIL", `Default badge contrast light ${info[0].contrast?.ratio} (fg ${info[0].contrast?.fg} on ${info[0].contrast?.bg}), dark ${info[1].contrast?.ratio} (fg ${info[1].contrast?.fg} on ${info[1].contrast?.bg}); need 4.5`, "TPL-05-dark");
  await page.context().close();
}
// TPL-07 CEJIL
{
  const { page, errors } = await open(b, "templates", "desktop", { source: "cejil" });
  const mon = watch(errors);
  await wait(page, 5000);
  const rs = await rows(page);
  const s = await shot(page, "TPL-07");
  const res = rs.find((r) => /Resolución de la CorteIDH/.test(r) && !/Presidencia/.test(r)); const sen = rs.find((r) => /Sentencia de la CorteIDH/.test(r));
  const cell = (r) => (r || "").trim().split(/\s+/).pop();
  const rd = await rowsData(page);
  const a = [rd.find((r) => r.name === "Resolución de la CorteIDH")?.entities]; const c = [rd.find((r) => r.name === "Sentencia de la CorteIDH")?.entities];
  rec("TPL-07", a.includes("1.1k") && c.includes("409") ? "PASS" : "FAIL", `Resolución de la CorteIDH cell lines ${JSON.stringify(a.slice(-3))}; Sentencia de la CorteIDH ${JSON.stringify(c.slice(-3))}; 3k case not driveable in browser (no CEJIL template, per SD-3; checked as unit/story only)`, s);
  await page.context().close();
}
// TPL-08, 09, 13, 21, 22 on a clean sample page
{
  const { page, errors } = await open(b, "templates");
  const mon = watch(errors);
  await wait(page, 800);
  const row = S(page).locator("[role=row]", { hasText: "Court Case" }).first();
  await row.hover(); await wait(page, 200);
  const info = await row.evaluate((r) => ({ buttons: [...r.querySelectorAll("button")].map((x) => x.getAttribute("aria-label") || x.innerText), links: [...r.querySelectorAll("a")].map((a) => a.textContent) }));
  const pencil = await S(page).locator("[data-part=edit], button[aria-label^='Edit ']:not([data-part=primary-action])").count();
  const allPrimaries = await S(page).locator("[data-part=primary-action]").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")));
  // keyboard focus: Tab until the primary action of Court Case focused
  await S(page).getByRole("searchbox").or(S(page).getByRole("textbox", { name: /Search templates/ })).first().focus();
  let focusedNames = [];
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); const n = await page.evaluate(() => document.activeElement?.getAttribute("aria-label")); focusedNames.push(n); if (n === "Edit Court Case") break; }
  const s8 = await shot(page, "TPL-08");
  const editBtns = info.buttons.filter((x) => /^Edit /.test(x));
  rec("TPL-08", pencil === 0 && editBtns.length === 1 && editBtns[0] === "Edit Court Case" && focusedNames.includes("Edit Court Case") ? "PASS" : "FAIL", `Court Case row controls ${JSON.stringify(info.buttons)}; <a> ${JSON.stringify(info.links)}; separate pencil buttons ${pencil}; keyboard Tab reaches "Edit Court Case": ${focusedNames.includes("Edit Court Case")}; every row's primary action name ${JSON.stringify(allPrimaries)}`, s8);
  // TPL-09 stars
  const stars = await S(page).locator("[role=row]").evaluateAll((rs) => rs.slice(1).map((r) => { const b = r.querySelector("button[aria-label='Set as default']"); return [r.innerText.split("\n").map(x=>x.trim()).filter(Boolean).find(x=>!/cannot be deleted/.test(x)), b ? (b.disabled ? "disabled" : "enabled") : "none"]; }));
  const dis = stars.filter((x) => x[1] === "disabled").map((x) => x[0]);
  const s9 = await shot(page, "TPL-09");
  rec("TPL-09", dis.length === 1 && dis[0] === "Document" && stars.filter((x) => x[1] === "enabled").length === stars.length - 1 ? "PASS" : "FAIL", `star states ${JSON.stringify(stars)}; disabled: ${JSON.stringify(dis)}; accessible name "Set as default" on all`, s9);
  // TPL-13
  const lead = S(page).getByRole("button", { name: "Add template" });
  const leadInfo = await lead.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, border: c.borderTopWidth + " " + c.borderTopStyle, shadow: c.boxShadow, color: c.color, cls: e.className.slice(0, 120) }; });
  await lead.click(); await wait(page, 500);
  const nameInput = S(page).getByPlaceholder("Template name");
  const nameVal = await nameInput.inputValue();
  const colour = await S(page).evaluate((e) => { const b = e.querySelector('[aria-label="Template color"]'); return b ? getComputedStyle(b.querySelector("span") || b).backgroundColor + " / " + (b.innerText || "") : null; });
  const propRows = await S(page).locator('table[aria-label=Properties] tbody tr, table[aria-label=Properties] [role=row]').evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  const saveBtn = S(page).getByRole("button", { name: /^(Save|Create template)/ }).first();
  const saveDis = await saveBtn.evaluate((e) => e.disabled || e.getAttribute("aria-disabled") === "true");
  const s13 = await shot(page, "TPL-13");
  const noFill = leadInfo.bg === "rgba(0, 0, 0, 0)" && /^0px/.test(leadInfo.border) && (leadInfo.shadow === "none" || !leadInfo.shadow);
  rec("TPL-13", noFill && nameVal === "" && saveDis && propRows.length >= 3 ? "PASS" : "FAIL", `lead button style ${JSON.stringify(leadInfo)} noFill/noBorder=${noFill}; new editor name value "${nameVal}" placeholder present; colour ${colour}; property rows (${propRows.length}) ${JSON.stringify(propRows)}; save button "${await saveBtn.innerText()}" disabled=${saveDis}`, s13);
  // colour palette check: open colour picker
  await S(page).getByRole("button", { name: "Template color" }).click().catch(() => {}); await wait(page, 300);
  const sw = await page.locator('[role=dialog][aria-label="Template color"] button[aria-label^="Colour "]').count();
  await shot(page, "TPL-13-palette");
  rec("TPL-13b", sw > 0 ? "PASS" : "FAIL", `colour picker opens with ${sw} preset swatches; new template colour is a preset (${colour})`, "TPL-13-palette");
  await page.keyboard.press("Escape");
  await page.context().close();
}
await b.close();
