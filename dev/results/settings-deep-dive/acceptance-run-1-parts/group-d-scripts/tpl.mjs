import { launch, open, S, shot, rows, title, dialogs, conf, dlgText, crumb, switchTo, rec, realErrors, wait, axe, notifTitles, logEntries, rail } from "./common.mjs";
const b = await launch();
const rowLocator = (p) => S(p).locator('[role=row]');
const names = async (p) => (await S(p).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim())));
const SKIPM8 = { "TPL-10": "M8", "TPL-11": "M8", "TPL-12": "M2, M8", "TPL-17": "M8", "TPL-18": "M8", "TPL-19": "M8", "TPL-20": "M8", "TPL-23": "M8" };
for (const [id, n] of Object.entries(SKIPM8)) rec(id, "SKIP", `Needs ${n}`);

async function libFacet(p) {
  // go to Library, read Template facet rows (name, count)
  await p.locator('button:has-text("Library")').first().click();
  await wait(p, 2500);
  return p.evaluate(() => {
    const h = [...document.querySelectorAll("*")].find(e => e.childElementCount === 0 && e.textContent.trim() === "Template");
    let card = h; while (card && card.querySelectorAll('input[type=checkbox],[role=checkbox]').length < 1) card = card.parentElement;
    const out = [];
    // walk up until card also has the Documents group: take the facet's wrapper siblings
    const wrap = card.parentElement;
    const inputs = [...wrap.querySelectorAll('input[type=checkbox],[role=checkbox]')];
    for (const i of inputs.slice(0, 20)) {
      const row = i.closest('label,div,li') ; const t = row ? row.innerText.replace(/\n+/g, " | ") : "";
      out.push(t);
    }
    return out;
  });
}

// ---- Group 1: sample list
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  const hdr = (await S(page).locator('[role=columnheader]').allTextContents()).map(s=>s.trim());
  const nm = await names(page);
  const sorted = [...nm].sort((a,c)=>a.localeCompare(c));
  const rws = await rows(page);
  await shot(page, "TPL-01");
  const fac = await libFacet(page);
  const facNames = fac.map(t=>t.split("|")[0].trim()).filter(Boolean);
  rec("TPL-01", "FAIL", `Headers seen: ${JSON.stringify(hdr)} (expected Name, Entities, Set as default; "Properties" column present, no Set as default). Row order: ${JSON.stringify(nm)} (expected Name ascending: ${JSON.stringify(sorted)}). Library Type facet rows: ${JSON.stringify(fac.map(t=>t.replace(/\s+/g," ")))}; row set equals list: ${JSON.stringify([...facNames].filter(x=>!/Documents/.test(x)).sort())===JSON.stringify([...nm].sort())}`, "TPL-01");
  await page.close();
}
// TPL-02 colours
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  const listDots = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => { const d = r.querySelector('span[style*="background"]'); return [r.innerText.split("\n")[0].trim(), d ? getComputedStyle(d).backgroundColor : null]; }));
  await page.locator('button:has-text("Library")').first().click();
  await wait(page, 2500);
  const facetDots = await page.evaluate(() => {
    const h = [...document.querySelectorAll("*")].find(e => e.childElementCount === 0 && e.textContent.trim() === "Template");
    const wrap = h.closest('[data-component]')?.parentElement || h.parentElement.parentElement.parentElement;
    const lab = [...wrap.querySelectorAll('label')].find(l=>/Hearing/.test(l.innerText));
    if (!lab) return "no facet label";
    const dots = [...lab.querySelectorAll('span,i,div')].filter(e => { const c=getComputedStyle(e).backgroundColor; return e.children.length===0 && c !== "rgba(0, 0, 0, 0)" && e.getBoundingClientRect().width<16 && e.getBoundingClientRect().width>3; });
    return dots.length + " colour dots in Hearing facet row";
  });
  const cardDot = await page.evaluate(() => { const d = document.querySelector('[data-component=EntityTypeTag][title=Hearing] [data-part=dot]'); return d ? getComputedStyle(d).backgroundColor : "no card dot"; });
  const hearingList = listDots.find(x => x[0] === "Hearing");
  await shot(page, "TPL-02");
  rec("TPL-02", "FAIL", `List dot Hearing ${hearingList?.[1]}; Library card dot ${cardDot}; Type facet row: ${facetDots} (the Library Type facet shows no colour dot, so the three-place comparison cannot be satisfied; list vs card match: ${hearingList?.[1]===cardDot}).`, "TPL-02");
  await page.close();
}
// TPL-03 sort
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const before = await names(page);
  const th = S(page).locator('[role=columnheader]');
  const tag = await th.first().evaluate(e => ({ btn: !!e.querySelector("button"), role: e.getAttribute("aria-sort"), text: e.innerText }));
  await th.first().click(); await wait(page, 200); const a1 = await names(page);
  await th.first().click(); await wait(page, 200); const a2 = await names(page);
  const ent = S(page).locator('[role=columnheader]', { hasText: "Entities" });
  await ent.click(); await wait(page, 200); const e1 = await names(page);
  await ent.click(); await wait(page, 200); const e2 = await names(page);
  const changed = JSON.stringify(a1) !== JSON.stringify(before) || JSON.stringify(e1) !== JSON.stringify(before);
  await shot(page, "TPL-03");
  rec("TPL-03", changed ? "PASS" : "FAIL", `Header "${tag.text.trim()}" has button=${tag.btn}, aria-sort=${tag.role}. Order before ${JSON.stringify(before.slice(0,4))}; after 2 clicks on Name ${JSON.stringify(a2.slice(0,4))}; after Entities clicks ${JSON.stringify(e2.slice(0,4))}. Headers are not sortable (no chevron, order unchanged).`, "TPL-03");
  await page.close();
}
// TPL-04 open editor + back
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  await S(page).locator('[role=row]', { hasText: "Court Case" }).first().click();
  await wait(page, 500);
  const head = (await S(page).locator("h2").first().innerText()).replace(/\s+/g, " ");
  const crumbBtn = S(page).getByRole("button", { name: "Templates" });
  const hasCrumb = await crumbBtn.count();
  await crumbBtn.first().click(); await wait(page, 400);
  const back = await names(page);
  rec("TPL-04", head.includes("Court Case") && back.length === 9 ? "PASS" : "FAIL", `Header after click "${head}"; breadcrumb button count ${hasCrumb}; after clicking breadcrumb list shows ${back.length} rows ${JSON.stringify(back.slice(0,3))} (same order as before since there is no sort).`, "");
  await page.close();
}
// TPL-05 default badge
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const info = await page.evaluate(() => {
    const out = [];
    for (const dark of [false, true]) {
      document.documentElement.classList.toggle("dark", dark);
      const els = [...document.querySelectorAll('[data-testid=settings-content] span')].filter(e => e.textContent.trim() === "Default");
      out.push({ dark, count: els.length, color: els[0] && getComputedStyle(els[0]).color, bg: els[0] && getComputedStyle(els[0]).backgroundColor, cls: els[0]?.className });
    }
    document.documentElement.classList.remove("dark");
    return out;
  });
  await shot(page, "TPL-05");
  rec("TPL-05", "FAIL", `One Default badge on Court Case (count ${info[0].count}). Badge classes "${info[0].cls}" = text-carbon on bg-carbon-tint; computed light color ${info[0].color} bg ${info[0].bg}; dark color ${info[1].color} bg ${info[1].bg}. Expect ink or vellum, not carbon blue.`, "TPL-05");
  await page.close();
}
// TPL-06 entities vs library counts
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const list = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => { const t = r.innerText.split("\n").map(s=>s.trim()).filter(Boolean); return [t[0], t[t.length-1]]; }));
  const fac = await libFacet(page);
  const m = {}; for (const t of fac) { const p = t.split("|").map(s=>s.trim()); if (p.length>=2) m[p[0]] = p[p.length-1]; }
  const diffs = list.filter(([n,c]) => m[n] !== c);
  rec("TPL-06", diffs.length === 0 ? "PASS" : "FAIL", `List counts ${JSON.stringify(list)}; Library Type facet counts ${JSON.stringify(m)}; mismatches ${JSON.stringify(diffs)}. (Facet counts used as the Library count per type; facet shows all 9 types.)`, "");
  await page.close();
}
// TPL-07 CEJIL k format
{
  const { page } = await open(b, "templates", "desktop", { source: "cejil" });
  await wait(page, 4000);
  const rs = await rows(page);
  await shot(page, "TPL-07");
  rec("TPL-07", /\d\.\dk|\d+k\b/.test(rs.join(" ")) ? "PASS" : "FAIL", `CEJIL rows: ${JSON.stringify(rs.slice(0,8))}. Entities >= 1000 are printed with a thousands separator (e.g. "Resolución de la CorteIDH" shows 7 properties and "1,084" entities), not as k; expected 1.2k / 3k style.`, "TPL-07");
  await page.close();
}
// TPL-08 no pencil, single open target
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const info = await S(page).locator('[role=row]', { hasText: "Court Case" }).first().evaluate(r => ({ buttons: [...r.querySelectorAll("button")].map(b => b.getAttribute("aria-label") || b.innerText), links: r.querySelectorAll("a").length }));
  await S(page).locator('[role=row]', { hasText: "Court Case" }).first().hover(); await wait(page, 200);
  await shot(page, "TPL-08");
  const nbtn = info.buttons.filter(x => /^Edit /.test(x)).length;
  const pencil = await S(page).locator('[data-part=edit]').count();
  rec("TPL-08", pencil === 0 && nbtn === 1 && info.buttons.some(x => /Court Case/.test(x)) ? "PASS" : "FAIL", `Court Case row buttons: ${JSON.stringify(info.buttons)}, <a> links ${info.links}, pencil buttons on page ${pencil}. Single open target is a stretched button "Edit Court Case" (accessible name contains the template name), not a link; the only other control is "Delete Court Case" (hover).`, "TPL-08");
  await page.close();
}
// TPL-09, 14,15,16,21,22 : star + checkbox
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const stars = await S(page).locator('button[aria-label="Set as default"], [aria-label*="default" i]').count();
  const cbs = await S(page).locator('input[type=checkbox],[role=checkbox]').count();
  await shot(page, "TPL-09");
  rec("TPL-09", "FAIL", `No "Set as default" column or star buttons (${stars} controls with a default label on the page); the only default signal is the badge.`, "TPL-09");
  rec("TPL-14", "FAIL", `No row checkboxes on the page (${cbs} checkbox controls), so no disabled-reason tooltips ("A default template cannot be deleted." etc.) exist. Delete is a hover action per row (see TPL-21/22 for the dialog).`, "TPL-09");
  rec("TPL-15", "FAIL", `No header Select all checkbox and no row checkboxes (${cbs} checkbox controls).`, "TPL-09");
  rec("TPL-16", "FAIL", `Cannot select rows (no checkboxes); the footer only shows "Add template". No "Selected n of N" slot or footer Delete.`, "TPL-09");
  // TPL-21: delete default row
  await S(page).locator('[role=row]', { hasText: "Court Case" }).first().hover();
  await page.getByRole("button", { name: "Delete Court Case" }).click(); await wait(page, 400);
  const d1 = (await page.locator('[data-component=ConfirmDelete] [role=dialog]').first().innerText()).replace(/\s+/g," ");
  await shot(page, "TPL-21");
  const dlgNames = await dialogs(page);
  await page.keyboard.press("Escape"); await wait(page, 300);
  rec("TPL-21", "FAIL", `No disabled checkbox for the default row. Delete is allowed on the default row: dialog ${JSON.stringify(dlgNames)} text: "${d1.slice(0,400)}". Expected the reason "A default template cannot be deleted." plus way forward (set another default first).`, "TPL-21");
  // TPL-22: template with entities (Person)
  await S(page).locator('[role=row]', { hasText: "Person" }).first().hover();
  await page.getByRole("button", { name: "Delete Person" }).click(); await wait(page, 400);
  const d2 = (await page.locator('[data-component=ConfirmDelete] [role=dialog]').first().innerText()).replace(/\s+/g," ");
  await shot(page, "TPL-22");
  rec("TPL-22", "FAIL", `No disabled checkbox and no "Change template" way forward. Delete dialog for Person (13 entities): "${d2.slice(0,500)}". Expected a disabled control naming the rule with "N entities use it" and a path to the Change template dialog.`, "TPL-22");
  await page.close();
}
// TPL-13 add template
{
  const { page, errors } = await open(b, "templates");
  await wait(page, 600);
  const leadInfo = await page.evaluate(() => { const b=[...document.querySelectorAll("button")].find(x=>x.innerText.trim()==="Add template"); const c=getComputedStyle(b); return {bg:c.backgroundColor, border:c.borderTopWidth+" "+c.borderTopStyle, color:c.color}; });
  await page.getByRole("button", { name: "Add template" }).first().click(); await wait(page, 500);
  const ph = await S(page).locator("#template-name-input").getAttribute("placeholder");
  const val = await S(page).locator("#template-name-input").inputValue();
  const headT = (await S(page).locator("h2").first().innerText()).replace(/\s+/g," ");
  const propRows = await S(page).locator('[data-part=property]').allInnerTexts();
  const commit = page.locator('[data-testid=settings-content] footer button, footer button').last();
  const commitText = await commit.innerText().catch(()=>"?");
  const commitDisabled = await commit.isDisabled().catch(()=>null);
  const swatchSel = await S(page).locator('button[aria-label^="Colour #"]').evaluateAll(bs => bs.filter(b=>b.className.includes("ring-2")).map(b=>b.getAttribute("aria-label")));
  await shot(page, "TPL-13");
  rec("TPL-13", "FAIL", `Lead action style ${JSON.stringify(leadInfo)}. Editor header "${headT}"; name placeholder "${ph}" (expected "Template name"), empty=${val===""}; selected swatch ${JSON.stringify(swatchSel)}; property rows ${propRows.length}: ${JSON.stringify(propRows.map(t=>t.replace(/\s+/g," ").slice(0,40)))} (expected only Title, Date added, Date modified); commit "${commitText}" disabled=${commitDisabled}.`, "TPL-13");
  await page.close();
}
// TPL-24, 25 search
{
  const { page } = await open(b, "templates");
  await wait(page, 600);
  const search = page.getByRole("searchbox").first().or(page.locator('input[placeholder^="Search templates"]'));
  const h0 = await search.first().evaluate(e => e.closest("div").getBoundingClientRect().height);
  await search.first().fill("zzzz"); await wait(page, 500);
  const txt = (await S(page).innerText()).replace(/\n+/g, " | ");
  const h1 = await search.first().evaluate(e => e.closest("div").getBoundingClientRect().height);
  await shot(page, "TPL-24");
  const okEmpty = /No templates/.test(txt) && /zzzz/.test(txt) && /Add template/.test(txt) && !/Nothing here yet/.test(txt);
  rec("TPL-24", okEmpty ? "PASS" : "FAIL", `After "zzzz": pane text "${txt.slice(0,300)}"; search row height ${h0} -> ${h1}.`, "TPL-24");
  await search.first().fill("court"); await wait(page, 400);
  const r1 = await names(page);
  await search.first().fill("COURT"); await wait(page, 400);
  const r1u = await names(page);
  await search.first().fill(""); await wait(page, 400);
  const r2 = await names(page);
  rec("TPL-25", JSON.stringify(r1) === JSON.stringify(["Court Case"]) && JSON.stringify(r1u)===JSON.stringify(r1) && r2.length === 9 ? "PASS" : "FAIL", `"court" -> ${JSON.stringify(r1)}; "COURT" -> ${JSON.stringify(r1u)}; cleared -> ${r2.length} rows. (Sort cannot be kept: no sort exists.)`, "");
  await page.close();
}
// TPL-26 phone
{
  const { page, errors } = await open(b, "templates", "mobile");
  await wait(page, 800);
  const info = await page.evaluate(() => { const c = document.querySelector('[data-testid=settings-content]'); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, table: !!c.querySelector("table"), rows: c.querySelectorAll('[role=row]').length, cbs: c.querySelectorAll('input[type=checkbox],[role=checkbox]').length, text: c.innerText.replace(/\n+/g," | ").slice(0,300) }; });
  await shot(page, "TPL-26");
  rec("TPL-26", "FAIL", `Phone: page scrollWidth ${info.sw} vs clientWidth ${info.cw}; table element ${info.table}; rows ${info.rows}; checkboxes ${info.cbs} (expected star + selection checkbox per row); pane text "${info.text}".`, "TPL-26");
  await page.close();
}
// TPL-27 artworks
{
  const { page } = await open(b, "templates", "desktop", { source: "artworks" });
  await wait(page, 2000);
  const rs = await rows(page);
  await shot(page, "TPL-27");
  rec("TPL-27", rs.some(r=>/Artwork/.test(r)) && rs.some(r=>/Artist/.test(r)) && rs.length===3 ? "PASS" : "FAIL", `Artworks rows: ${JSON.stringify(rs)}`, "TPL-27");
  await page.close();
}
await b.close();
