import { launch, open, S, shot, rail } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, goto, openCtx, cell, saveEd, beacon, newBeacon, activity } from "./u.mjs";
const { rec, save } = mk("trn2");
const b = await launch();
const keysOf = async (p) => (await S(p).locator("[data-part=row]").evaluateAll((e) => e.map((r) => r.querySelector("td,div")?.innerText.trim()))).filter(Boolean);
const hdrTxt = async (p) => (await S(p).locator("[role=columnheader]").allInnerTexts()).map(squash);
const scrollAll = async (p) => { for (let i = 0; i < 12; i++) { await p.evaluate(() => { const m = document.querySelector("[data-part=more]"); if (m) m.scrollIntoView(); else { const el = document.querySelector("[data-testid=settings-content]"); el && el.scrollTo(0, 1e6); } }); await p.waitForTimeout(250); } };

// ---------- TRN-04 (Country: 3 properties)
{
  const { page, errors } = await open(b, "templates");
  await S(page).locator("[data-part=row]").filter({ hasText: "Country" }).first().click(); await page.waitForTimeout(800);
  const props = await S(page).locator('button[aria-label^="Edit "]').evaluateAll((e) => e.map((x) => x.getAttribute("aria-label").replace(/^Edit /, "")));
  const tplName = await S(page).locator("input").first().inputValue();
  await openCtx(page, "Country");
  const rowsTxt = await S(page).locator("[data-part=row]").evaluateAll((e) => e.map((r) => ({ key: r.querySelector("td")?.innerText.trim(), vals: [...r.querySelectorAll("input")].map((i) => i.value), src: [...r.querySelectorAll("td")].slice(1, 2).map((t) => t.innerText.trim()) })));
  await shot(page, "TRN-04");
  const keys = rowsTxt.map((r) => r.key);
  const expect = [tplName, ...props.filter((x) => x === "Title"), ...props.filter((x) => x !== "Title" && !/^Date (added|modified)$/.test(x))];
  const eqEn = rowsTxt.every((r) => r.vals.every((v) => v === r.key));
  const sameSet = JSON.stringify([...keys].sort()) === JSON.stringify([...expect].sort());
  rec("TRN-04", sameSet && keys.length === 3 + 2 && eqEn ? "PASS" : "FAIL", `Templates editor for Country: name "${tplName}", properties ${JSON.stringify(props)} (3 custom + Title, Date added, Date modified common); context keys ${JSON.stringify(keys)} = ${keys.length} (3 properties + 2 = 5); keys equal template name + title label + each property label: ${sameSet}; every non-English cell equals the English text=${eqEn}`, "TRN-04.png");
  await page.context().close();
}

// ---------- TRN-08
{
  const { page } = await open(b, "translations");
  await openCtx(page, "User Interface");
  await scrollAll(page);
  const keys = await keysOf(page);
  const more = await page.locator("[data-part=more]").count();
  const fold = (s) => s.toLowerCase();
  const sortedCI = keys.every((k, i) => i === 0 || fold(keys[i - 1]) <= fold(k));
  const term = keys.filter((k) => /\bterm \d+\b/i.test(k));
  const idx = [0, 100, 200, 300, 400].map((i) => keys[Math.min(i, keys.length - 1)]);
  const headerTotal = squash(await S(page).innerText()).match(/\d+ of (\d+)/);
  // visible UI corpus
  const corpus = []; const grab = async () => corpus.push(await page.evaluate(() => document.body.innerText));
  const seen = ["Account", "Dashboard", "Collection", "Menu", "Pages", "Templates", "Thesauri", "Relationship types", "Filters", "Languages", "Translations", "Users & Groups", "Preserve", "Activity log", "Uploads", "Metadata extraction"];
  for (const s of seen) { try { await goto(page, s); await grab(); } catch {} }
  await page.locator("button:has-text(\"Library\")").first().click(); await page.waitForTimeout(1500); await grab();
  const all = corpus.join("\n").toLowerCase();
  const found = idx.map((k) => ({ k, vis: all.includes(k.toLowerCase()) }));
  await shot(page, "TRN-08");
  rec("TRN-08", keys.length >= 100 && keys.length <= 200 && sortedCI && !term.length && found.every((f) => f.vis) ? "PASS" : "FAIL",
    `User Interface lists ${keys.length} keys (checklist says 100 to 200; SD-7 seed sets 412, checklist TRN-08 text not amended); sorted case-insensitively by key (lower-cased code-point order)=${sortedCI}; keys reading "term N"=${term.length}; spot-check of 5 keys (indexes 0, 100, 200, 300, 400) against text visible in the Library and the Settings pages: ${JSON.stringify(found)}`, "TRN-08.png");
  await page.context().close();
}

// ---------- TRN-09, TRN-10, TRN-11, TRN-12, TRN-13 on Person
{
  const { page, errors } = await open(b, "translations");
  await openCtx(page, "Person");
  const crumbLink = await S(page).getByRole("button", { name: "Translations" }).count() + await S(page).getByRole("link", { name: "Translations" }).count();
  const crumbTxt = squash(await page.locator("[data-component=TranslationEditor]").first().innerText().catch(() => ""));
  const title = await S(page).locator("h2").first().innerText().catch(() => "");
  const hdr = await S(page).locator("[role=columnheader]").evaluateAll((e) => e.map((x) => ({ t: x.innerText.replace(/\s+/g, " ").trim(), pill: [...x.querySelectorAll("span")].pop()?.className || "" })));
  const firstRow = await S(page).locator("[data-part=row]").first().evaluate((r) => ({ inputs: r.querySelectorAll("input").length, x: r.querySelectorAll('button[aria-label="Clear"]').length }));
  const fullTxt = squash(await S(page).innerText());
  const hasTerm = /\bterms?\b/i.test(fullTxt.replace(/Untranslated Terms/i, ""));
  const footer = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !b.closest("[inert]") && /^(Cancel|Save)$/.test(b.innerText.trim())).map((b) => b.innerText.trim()));
  // sticky header: scroll the pane and compare header top
  const top0 = await S(page).locator("[role=columnheader]").first().evaluate((e) => Math.round(e.getBoundingClientRect().top));
  await page.evaluate(() => { document.querySelectorAll("*").forEach((e) => { if (e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 200; }); });
  await page.waitForTimeout(250);
  const top1 = await S(page).locator("[role=columnheader]").first().evaluate((e) => Math.round(e.getBoundingClientRect().top));
  const scrolled = await page.evaluate(() => [...document.querySelectorAll("*")].some((e) => e.scrollTop > 0 && e.scrollHeight > e.clientHeight));
  await shot(page, "TRN-09");
  const srcPill = hdr.filter((h) => /bg-ink/.test(h.pill)).length;
  const okAutonym = hdr.some((h) => /Español\s+ES/.test(h.t)) && hdr.some((h) => /Français\s+FR/.test(h.t)) && hdr.some((h) => /العربية\s+AR/.test(h.t));
  rec("TRN-09", crumbLink >= 1 && title === "Person" && okAutonym && srcPill === 1 && firstRow.inputs === 3 && firstRow.x >= 1 && !hasTerm && footer.includes("Cancel") && footer.includes("Save") && top0 === top1 ? "PASS" : "FAIL",
    `breadcrumb "Translations" buttons/links=${crumbLink}; title "${title}"; headers ${JSON.stringify(hdr.map((h) => h.t))}; source pill (bg-ink) columns=${srcPill}; first row inputs=${firstRow.inputs} (3 target languages) clear X=${firstRow.x}; text says "term"=${hasTerm}; footer buttons ${JSON.stringify(footer)}; header top before/after scroll ${top0}/${top1} (a scroller scrolled=${scrolled})`, "TRN-09.png");

  // TRN-10
  const emptiesBefore = await page.getByText(/empty cell/).count();
  const c = cell(page, "Person", "Spanish");
  await c.fill("Persona"); await saveEd(page);
  await openCtx(page, "Person");
  const act0 = (await activity(page)).length; const nb0 = await beacon(page);
  await cell(page, "Person", "Spanish").fill("Persona X"); // make dirty
  await S(page).locator('[data-part=row]').first().locator('button[aria-label="Clear"]').first().click(); await page.waitForTimeout(200);
  const tinted = await cell(page, "Person", "Spanish").inputValue();
  await page.getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(400);
  const req = await S(page).getByText("This field is required").count();
  const count = squash(await page.locator("[role=alert]").allInnerTexts().then((a) => a.join(" ")));
  const act1 = (await activity(page)).length; const nb1 = await newBeacon(page, nb0);
  await shot(page, "TRN-10");
  await cell(page, "Person", "Spanish").fill("Persona"); await page.waitForTimeout(250);
  const reqAfter = await S(page).getByText("This field is required").count();
  const countAfter = squash(await page.locator("[role=alert]").allInnerTexts().then((a) => a.join(" ")));
  rec("TRN-10", tinted === "" && req >= 1 && /1 empty cell/.test(count) && act1 === act0 && !nb1.some((x) => /Translations saved/.test(x)) && reqAfter === 0 && !/empty cell/.test(countAfter) ? "PASS" : "FAIL",
    `cleared the Spanish "Person" cell with its X then Save: cell now "${tinted}"; "This field is required" shown ${req}x; alert text "${count}"; activity entries ${act0}->${act1}; new Beacon entries ${JSON.stringify(nb1)} (no write); after refilling: required messages ${reqAfter}, alert "${countAfter}"`, "TRN-10.png");

  // TRN-11: status pill while typing
  const pillOf = async (lang) => cell(page, "Person", lang).evaluate((i) => i.closest("span.flex")?.querySelector("span")?.className || "");
  await cell(page, "Person", "Spanish").fill("Persona nueva"); await page.waitForTimeout(150);
  const p1 = await pillOf("Spanish");
  await cell(page, "Person", "Spanish").fill("Person"); await page.waitForTimeout(150);
  const p2 = await pillOf("Spanish");
  await cell(page, "Person", "Spanish").fill("Persona nueva"); await page.waitForTimeout(150);
  const p3 = await pillOf("Spanish");
  const lblUntr = await cell(page, "Person", "Spanish").getAttribute("aria-label");
  const srcCls = hdr.find((h) => /bg-ink/.test(h.pill))?.pill || "";
  await shot(page, "TRN-11");
  rec("TRN-11", /bg-ink/.test(srcCls) && /bg-vellum/.test(p1) && /bg-warning-light/.test(p2) && /bg-vellum/.test(p3) ? "PASS" : "FAIL",
    `default-language header pill class has bg-ink (primary)=${/bg-ink/.test(srcCls)}; typing "Persona nueva" in es: pill grey (bg-vellum)=${/bg-vellum/.test(p1)}; typing the source text "Person" back: amber (bg-warning-light)=${/bg-warning-light/.test(p2)}; typing again: grey=${/bg-vellum/.test(p3)}; all before Save. (The "same as source counts as translated" mark is optional in the check and the app has none)`, "TRN-11.png");

  // TRN-12: progress counters. Reset es to untranslated first via a fresh context state: use Hearing instead
  await page.context().close();
}
{
  const { page } = await open(b, "translations");
  await openCtx(page, "Person");
  const strip = async () => squash(await S(page).locator("[data-component=TranslationProgress]").first().innerText());
  const s0 = await strip();
  await cell(page, "Person", "Spanish").fill("Persona A"); await cell(page, "Organization", "Spanish").count();
  const keys = await S(page).locator("[data-part=row] td:first-child").allInnerTexts();
  const k2 = keys[1].trim();
  await cell(page, k2, "Spanish").fill("Traducción B"); await page.waitForTimeout(200);
  const s1 = await strip();
  await shot(page, "TRN-12");
  await saveEd(page);
  await goto(page, "Translations"); // editor stays on the same section; use back
  await page.locator("[data-component=TranslationEditor]").getByRole("button", { name: /Translations/ }).first().click(); await page.waitForTimeout(500);
  const row = squash(await S(page).locator("[data-part=row]").filter({ hasText: "Person" }).first().innerText());
  rec("TRN-12", /Spanish\s*0 of 9/.test(s0) && /Spanish\s*2 of 9/.test(s1) && /es 22%/i.test(row) ? "PASS" : "FAIL", `editor head before edits "${s0}"; after translating 2 es cells "${s1}"; after Save the list row reads "${row}" (as built: percent per language accepted, A4)`, "TRN-12.png");
  await page.context().close();
}

// ---------- TRN-13 untranslated toggle
{
  const { page } = await open(b, "translations");
  await openCtx(page, "Person");
  const nRows = async () => S(page).locator("[data-part=row]").count();
  const total = await nRows();
  const tog = S(page).getByRole("checkbox", { name: /Untranslated/ }).first();
  const label = squash(await S(page).locator("label").filter({ hasText: /Untranslated/ }).first().innerText());
  const off0 = !(await tog.isChecked());
  // translate 2 keys fully in all languages, save, then filter
  const keys = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  for (const k of keys.slice(0, 2)) for (const l of ["Spanish", "French", "Arabic"]) await cell(page, k, l).fill(`${l}-${k}`);
  await cell(page, keys[2], "Spanish").fill("Solo es");
  await saveEd(page);
  await tog.check(); await page.waitForTimeout(300);
  const on = await nRows(); const onKeys = (await S(page).locator("[data-part=row] td:first-child").allInnerTexts()).map((x) => x.trim());
  const countTxt = squash(await S(page).innerText()).match(/(\d+) (untranslated|key)/i);
  await shot(page, "TRN-13-on");
  // language filter
  await S(page).locator('button[aria-label^="Language"]').click(); await page.waitForTimeout(150);
  const opts = await page.getByRole("option").allInnerTexts();
  await page.getByRole("option", { name: "Español", exact: true }).click(); await page.waitForTimeout(300);
  const esOnly = await nRows();
  const strip = squash(await S(page).locator("[data-component=TranslationProgress]").first().innerText());
  await S(page).locator('button[aria-label^="Language"]').click(); await page.getByRole("option", { name: "All languages" }).click(); await tog.uncheck(); await page.waitForTimeout(300);
  const off = await nRows();
  const kept = await cell(page, keys[0], "French").inputValue();
  await shot(page, "TRN-13");
  rec("TRN-13", off0 && on === total - 2 && !onKeys.includes(keys[0]) && esOnly === total - 3 && off === total && kept === `French-${keys[0]}` ? "PASS" : "FAIL",
    `toggle label "${label}" (as built, A4), off by default=${off0}; ${total} keys; after translating 2 keys fully and Save, toggle on shows ${on} keys (expected ${total - 2}), the 2 translated keys hidden=${!onKeys.includes(keys[0]) && !onKeys.includes(keys[1])}; visible count text in the pane: ${JSON.stringify(countTxt && countTxt[0])}; language select options ${JSON.stringify(opts)}; picking Español narrows to ${esOnly} keys (key "${keys[2]}" has es translated, fr and ar not); progress strip "${strip}"; toggle off restores ${off}; hidden cell kept value "${kept}"`, "TRN-13.png");
  await page.context().close();
}
save(); await b.close();
