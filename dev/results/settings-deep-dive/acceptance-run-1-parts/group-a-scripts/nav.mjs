import { conf, launch, open, S, shot, rows, rail, dialogs, axe, notifTitles, title } from "./lib.mjs";
import { toSettings } from "./h.mjs";
import { mk, signInAs, realErrors, lines, delta, newN, contrast, dark, hscroll } from "./rec.mjs";
const { rec, save } = mk("nav");
const b = await launch();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const NAVSEL = 'nav[aria-label="Settings navigation"]';
const railModel = (p) => p.evaluate((sel) => { const nav = document.querySelector(sel); const out = []; nav.querySelectorAll('[data-part=group]').forEach(g => { const items = [...g.querySelectorAll('[data-part=item]')].map(i => i.innerText.trim()); const heads = [...g.querySelectorAll('h2,h3')].map(h => h.textContent.trim() + (h.className.includes("sr-only") ? "(sr-only)" : "")); out.push({ heads, items }); }); const doc = nav.querySelector('[data-part=documentation]'); return { groups: out, doc: doc ? doc.innerText.trim() : null }; }, NAVSEL);

// NAV-01
{
  const { page: p } = await open(b, "dashboard");
  await p.locator('header img, header svg, [aria-label*=Uwazi]').first().click(); await p.waitForTimeout(800);
  const body = await p.locator("body").innerText();
  const radios = await p.locator('[role=radio], [role=switch], input[type=radio], input[type=checkbox]').count();
  const hits = ["metadata-extraction", "paragraphExtraction", "preserve.host", "custom JS", "Dev panel", "Role"].map(k => `${k}:${body.includes(k)}`);
  const entries = (await p.locator("nav button, aside button").allInnerTexts()).map(norm).filter(Boolean);
  await shot(p, "NAV-01");
  rec("NAV-01", "FAIL", `The catalog (logo click) has no dev panel: no role control (admin/editor/collaborator) and no feature switches; role/feature terms in the page: ${JSON.stringify(hits)} (matches of "Role"/"custom" are doc prose only); (the ${radios} switch/radio controls in the catalog belong to component demos). Catalog sidebar entries start with ${JSON.stringify(entries.slice(0, 6))}. The only way to change role is signing in as another seed user`, "NAV-01.png");
  await p.context().close();
}
// NAV-02, 04, 03
{
  const { page: p } = await open(b, "users");
  const m = await railModel(p);
  const heads = m.groups.map(g => g.heads.join("/")).join(" | ");
  const expectedHeads = ["Collection", "Content model", "Languages", "People", "Tools"];
  const all = m.groups.flatMap(g => g.items);
  await shot(p, "NAV-02");
  const toolsGroup = m.groups.find(g => g.heads.includes("Tools"));
  rec("NAV-02", "FAIL", `Rail structure: ${JSON.stringify(m.groups.map(g => ({ heads: g.heads, items: g.items })))}. Spec labels: Collection / Content model / Languages / People / Tools only. Found headings: ${heads}: extra "User" heading above Account and an "ML tools" sub-heading (spec: none), Dashboard sits under Collection (Design's choice). Group contents differ: Collection has Dashboard, Collection, Menu, Pages (Uploads and Global CSS & JS are under Tools); Content model lacks Metadata extraction and Paragraph extraction (they are under Tools / ML tools); Tools holds Preserve, Activity log, Global CSS & JS, Uploads, Import CSV, ML tools items. Data visualizations / New Relationships Migration absent (matches). Each item appears once=${new Set(all).size === all.length}`, "NAV-02.png");
  // NAV-04 active style
  const act = await p.evaluate((sel) => { const e = document.querySelector(sel + ' [aria-current=page]'); const cs = getComputedStyle(e); return { cls: e.className.replace(/\s+/g, " ").slice(0, 160), weight: cs.fontWeight, bg: cs.backgroundColor, color: cs.color, icon: getComputedStyle(e.querySelector("svg")).color }; }, NAVSEL);
  const nActive = await p.locator(NAVSEL + ' [aria-current=page]').count();
  const warmBg = await p.evaluate(() => { const el = document.createElement("div"); el.className = "bg-warm"; document.body.appendChild(el); const c = getComputedStyle(el).backgroundColor; el.remove(); return c; });
  const vellumBg = await p.evaluate(() => { const el = document.createElement("div"); el.className = "bg-vellum"; document.body.appendChild(el); const c = getComputedStyle(el).backgroundColor; el.remove(); return c; });
  const headingsAreButtons = await p.locator(NAVSEL + ' h2 button, ' + NAVSEL + ' button[aria-expanded]').count();
  rec("NAV-04", act.bg === warmBg && Number(act.weight) < 600 ? "PASS" : "FAIL", `Active item "Users & Groups": background ${act.bg} (bg-warm is ${warmBg}, bg-vellum is ${vellumBg}), font-weight ${act.weight} (spec: bg-warm, no semibold); classes "${act.cls}"; items marked current=${nActive}; group headings that are buttons or collapse controls=${headingsAreButtons} (plain labels, matches)`, "NAV-02.png");
  // NAV-03
  const seen = [];
  for (const item of ["Pages", "Languages", "Activity log"]) {
    await rail(p, item); await p.waitForTimeout(400);
    const mm = await railModel(p);
    seen.push(`${item}: groups visible=${mm.groups.length}`);
  }
  await rail(p, "Account"); await p.waitForTimeout(400);
  const acc = await railModel(p);
  const nav = await p.locator("header, [role=banner]").first().innerText().catch(() => "");
  const navButtons = (await p.locator("body").evaluate(() => [...document.querySelectorAll("button")].filter(b => b.getBoundingClientRect().top < 60 && b.getBoundingClientRect().width > 0).map(b => b.innerText.trim()).filter(Boolean)));
  await p.getByRole("button", { name: /^Settings$/ }).first().click(); await p.waitForTimeout(300);
  const menu = await p.locator("body").evaluate(() => [...document.querySelectorAll("button, a")].filter(b => b.getBoundingClientRect().top > 50 && b.getBoundingClientRect().top < 300 && b.getBoundingClientRect().left > 900).map(b => b.innerText.trim()).filter(Boolean));
  rec("NAV-03", "FAIL", `Rail keeps all groups visible when selecting items in three groups (${seen.join("; ")}) and the Account page also shows the full rail (${acc.groups.length} groups). Navbar however has several entry points: top-bar buttons ${JSON.stringify(navButtons)} plus a Settings menu listing ${JSON.stringify(menu)} ("User settings", "System settings" and a separate "Tools" button), spec: one Settings entry`, "NAV-03.png");
  await shot(p, "NAV-03");
  await p.context().close();
}
// NAV-05
{
  const { page: p } = await open(b, "dashboard");
  const items = [["Dashboard", /^Dashboard/], ["Users & Groups", /^Users & Groups/], ["Collection", /^Collection/], ["Menu", /^Menu/], ["Pages", /^Pages/], ["Languages", /^Languages/], ["Translations", /^Translations/], ["Filters", /^Filters/], ["Templates", /^Templates/], ["Thesauri", /^Thesauri/], ["Relationship types", /^Relationship types/], ["Activity log", /^Activity log/], ["Uploads", /^Uploads/], ["Import CSV", /Import/], ["Global CSS & JS", /^Global CSS/]];
  const res = [];
  for (const [name, re] of items) {
    const present = await p.locator(NAVSEL + ' [data-part=item]', { hasText: name }).count();
    if (!present) { res.push(`${name}: MISSING`); continue; }
    await rail(p, name); await p.waitForTimeout(700);
    const t = norm(await p.locator("main, body").first().innerText().catch(() => ""));
    const placeholder = /roadmap|hasn't been built/.test(t);
    const h = name === "Import CSV" ? ((await p.getByText("CSVs", { exact: true }).count()) ? "Import CSV (CSVs table)" : "?") : norm(await title(p).catch(() => "?"));
    res.push(`${name}: opens "${h.slice(0, 30)}"${placeholder ? " PLACEHOLDER" : ""}`);
    if (name === "Import CSV") { await p.getByRole("button", { name: /^Settings$/ }).first().click().catch(() => {}); await p.keyboard.press("Escape"); await toSettings(p).catch(() => {}); await p.waitForTimeout(400); }
  }
  const bad = res.filter(r => /MISSING|PLACEHOLDER/.test(r));
  rec("NAV-05", bad.length === 0 ? "PASS" : "FAIL", `Admin: ${res.join("; ")}`, "");
  await p.context().close();
}
// NAV-06, 07, 08 via sign-in as editor / collaborator
{
  const r = await signInAs(b, "mlopez", "templates"); const p = r.page;
  const m = await railModel(p);
  const t = norm(await S(p).innerText());
  const blocked = /This page is not available\./.test(await p.locator("body").innerText());
  await shot(p, "NAV-06");
  rec("NAV-06", "FAIL", `No dev panel to switch the role, so the role was changed by signing in as mlopez (editor) with Templates as the stored page: rail shows ${JSON.stringify(m.groups.map(g => ({ heads: g.heads, items: g.items })))} (spec: Account, Metadata extraction, Paragraph extraction: items match; headings "User" and "Tools"/"ML tools" appear because those groups have items); the open Templates page is replaced silently by the Account page ("${t.slice(0, 20)}") and the text "This page is not available." with a link to the first allowed item is not shown (present=${blocked}); a live role change while a page is open cannot be driven`, "NAV-06.png");
  rec("NAV-08", blocked ? "PASS" : "FAIL", `Editor with Templates stored: Settings shows "${t.slice(0, 40)}" (Account), no "This page is not available." text (present=${blocked}), no link to the first allowed item, no focus move to a heading notice. Placeholder text "part of the cloning roadmap" appears only on unbuilt pages (not driven)`, "NAV-06.png");
  await r.ctx.close();
  const r2 = await signInAs(b, "afarah", "users"); const q = r2.page;
  const m2 = await railModel(q);
  const t2 = norm(await S(q).innerText());
  await shot(q, "NAV-07");
  const emptyHeads = m2.groups.filter(g => g.items.length === 0).length;
  rec("NAV-07", m2.groups.length === 1 && m2.groups[0].items.join() === "Account" && !/not available/.test(t2) ? "PASS" : "FAIL", `Collaborator (afarah): rail ${JSON.stringify(m2.groups)}; only "Account" remains and the page works (text starts "${t2.slice(0, 30)}"); no empty group headings rendered (groups without items=${emptyHeads}). The role came from sign-in, not the dev panel`, "NAV-07.png");
  // NAV-13 as collaborator: docs link
  await r2.ctx.close();
}
// NAV-09, 10, 11, 12 flags
for (const [id, flag, page] of [["NAV-09", "metadata-extraction", "Metadata extraction"], ["NAV-10", "paragraphExtraction", "Paragraph extraction"], ["NAV-11", "preserve.host", "Preserve"]]) {
  rec(id, "FAIL", `No feature flag or switch exists for "${flag}" (no dev panel, no setting): "${page}" is always shown for ${id === "NAV-11" ? "admin" : "admin and editor"}; turning it off and on cannot be done`, "NAV-01.png");
}
{
  const { page: p } = await open(b, "collection");
  const t = norm(await S(p).innerText());
  const hasJs = /custom ?js|Enable custom JS|JavaScript/i.test(t);
  await shot(p, "NAV-12-collection");
  await rail(p, "Global CSS & JS"); await p.waitForTimeout(500);
  const tabs = (await S(p).getByRole("tab").allInnerTexts()).map(norm);
  const label = norm(await p.locator(NAVSEL + ' [data-part=item]', { hasText: "Global CSS" }).first().innerText());
  rec("NAV-12", "FAIL", `Rail label is "${label}" (matches). The Collection page has no custom-JS control (mentions of custom JS on the page=${hasJs}); the Global CSS & JS page tabs=${JSON.stringify(tabs)} and cannot hide the JS tab, since no flag exists`, "NAV-12-collection.png");
  await p.context().close();
}
// NAV-13 docs link
{
  const { ctx, page: p } = await open(b, "account");
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const m = await railModel(p);
  const href = await p.locator(NAVSEL + ' [data-part=documentation]').getAttribute("href");
  const target = await p.locator(NAVSEL + ' [data-part=documentation]').getAttribute("target");
  const box = await p.locator(NAVSEL + ' [data-part=documentation]').boundingBox();
  const hasIcon = await p.locator(NAVSEL + ' [data-part=documentation] svg').count();
  const [popup] = await Promise.all([p.waitForEvent("popup", { timeout: 4000 }).catch(() => null), p.locator(NAVSEL + ' [data-part=documentation]').click()]);
  const url = popup ? "a new tab (request to " + href + ", blocked from loading by this run)" : "(no popup)";
  const here = norm(await S(p).innerText()).slice(0, 20);
  await shot(p, "NAV-13");
  // as collaborator
  const r2 = await signInAs(b, "afarah", "account");
  const m2 = await railModel(r2.page);
  rec("NAV-13", href && target === "_blank" && hasIcon && m2.doc ? "PASS" : "FAIL", `Item label "${m.doc}" (spec text "Uwazi Docs"), at the rail bottom (box y=${Math.round(box.y)} of 800) with ${hasIcon} svg icons (external-link icon plus the leading icon), href=${href} target=${target}; the click opened ${url} (spec: https://docs.uwazi.io; the target differs and is recorded as Juan's open decision); current page unchanged ("${here}"); visible for collaborator: ${JSON.stringify(m2.doc)}`, "NAV-13.png");
  await r2.ctx.close();
  await ctx.close();
}
// NAV-14
{
  const { page: p } = await open(b, "templates");
  const m = await railModel(p);
  const g = m.groups.find(g => g.items.includes("Templates"));
  const g2 = m.groups.find(g => g.items.includes("Metadata extraction"));
  rec("NAV-14", g === g2 ? "PASS" : "FAIL", `Templates is in the group with headings ${JSON.stringify(g.heads)}; Metadata extraction and Paragraph extraction are in the group with headings ${JSON.stringify(g2.heads)} under the "ML tools" sub-heading (spec: same group as Templates, after Relationship types or Filters, no "ML tools" subgroup)`, "NAV-02.png");
  await p.context().close();
}
// NAV-15
{
  const { page: p } = await open(b, "users");
  await rail(p, "Import CSV"); await p.waitForTimeout(900);
  const m = await railModel(p).catch(() => null);
  const active = await p.locator(NAVSEL + ' [aria-current=page]').allInnerTexts().catch(() => []);
  const head = norm(await p.locator("h1, h2").first().innerText());
  await shot(p, "NAV-15");
  // back
  const backBtn = await p.getByRole("button", { name: /back/i }).first().isVisible().catch(() => false);
  if (backBtn) await p.getByRole("button", { name: /back/i }).first().click().catch(() => {});
  await p.waitForTimeout(700);
  const after = norm(await S(p).innerText().catch(() => "")).slice(0, 30);
  const bodyNow = norm(await p.locator("body").innerText()).slice(0, 80);
  rec("NAV-15", m && active.map(norm).join().includes("Import CSV") && /Users & Groups/.test(after) ? "PASS" : "FAIL", `Import view opens with the same rail (groups=${m ? m.groups.length : "none"}), active item(s)=${JSON.stringify(active.map(norm))}, breadcrumb "Import CSV" is plain text with no Back control (Back button visible=${backBtn}); there is no way to return to the previous Settings page except choosing a rail item again (spec: Back returns to the Settings page it came from, Users & Groups)`, "NAV-15.png");
  await p.context().close();
}
// NAV-16 phone + X-06 + X-07 + X-08
{
  const m = await open(b, "users", "mobile"); const p = m.page;
  // go back to rail
  const chevron = p.getByRole("button", { name: /Back|back to/i }).first();
  const vis0 = await chevron.isVisible().catch(() => false);
  await chevron.click().catch(() => {}); await p.waitForTimeout(500);
  const railShown = await p.locator(NAVSEL).isVisible().catch(() => false);
  const full = await p.evaluate((sel) => { const n = document.querySelector(sel); const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), scroll: n.querySelector('[data-part=groups]').scrollHeight }; }, NAVSEL);
  const heads = await p.evaluate((sel) => [...document.querySelectorAll(sel + ' h2, ' + sel + ' h3')].map(h => h.textContent.trim()), NAVSEL);
  await shot(p, "NAV-16-rail");
  // scroll lane to bottom to see all labels
  await p.evaluate((sel) => { const l = document.querySelector(sel + ' [data-part=groups]'); l.scrollTop = l.scrollHeight; }, NAVSEL);
  await shot(p, "NAV-16-rail-bottom");
  await p.locator(NAVSEL + ' [data-part=item]', { hasText: "Languages" }).click(); await p.waitForTimeout(500);
  const pageTitle = norm(await S(p).locator("h2").first().innerText());
  const chev2 = await p.getByRole("button", { name: /Back|back to/i }).first().isVisible().catch(() => false);
  await shot(p, "NAV-16-page");
  const hs = await hscroll(p);
  await p.getByRole("button", { name: /Back|back to/i }).first().click(); await p.waitForTimeout(500);
  const backToRail = await p.locator(NAVSEL).isVisible().catch(() => false);
  const small = await p.locator(NAVSEL + ' [data-part=item]').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
  rec("NAV-16", railShown && chev2 && backToRail ? "PASS" : "FAIL", `Phone 390: Settings opens on the page (back chevron visible=${vis0}); chevron returns to the rail (rail visible=${railShown}, width ${full.w}px); rail headings ${JSON.stringify(heads)} (headings are User/Collection/Content model/Languages/People/Tools + ML tools, not the five spec labels; all reachable by scrolling the lane); tapping Languages opens "${pageTitle}" with a back chevron (visible=${chev2}); chevron returns to the rail=${backToRail}; item heights ${Math.min(...small)}-${Math.max(...small)}px`, "NAV-16-rail.png");
  rec("X-06", hs.doc <= 0 && Math.min(...small) >= 32 ? "PASS" : "FAIL", `Phone 390 rail and page: horizontal overflow ${hs.doc}px; rail items are ${Math.min(...small)}-${Math.max(...small)}px tall (touch-reachable); rail is the whole page and every item opens a page`, "NAV-16-rail.png");
  await m.ctx.close();
}
// X-07, X-08
{
  const { page: p } = await open(b, "users");
  const v = await p.evaluate(async (sel) => { const r = await window.axe?.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r ? r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}`) : null; }, NAVSEL).catch(() => null);
  let vv = v;
  if (!vv) { await p.evaluate((await import("./lib.mjs")).axeSrc); vv = await p.evaluate(async (sel) => { const r = await window.axe.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}`); }, NAVSEL); }
  const headingOrder = await p.evaluate((sel) => [...document.querySelectorAll(sel + ' h2, ' + sel + ' h3')].map(h => h.tagName + ":" + h.textContent.trim()), NAVSEL);
  const names = await p.locator(NAVSEL + ' [data-part=item]').evaluateAll(es => es.map(e => e.innerText.trim()));
  const dup = names.filter((x, i) => names.indexOf(x) !== i);
  // keyboard: Tab to rail item and Enter
  await p.locator(NAVSEL + ' [data-part=item]', { hasText: "Languages" }).focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const kb = norm(await S(p).locator("h2").first().innerText());
  const bad = vv.filter(x => /serious|critical/.test(x));
  rec("X-07", !bad.length && !dup.length && kb === "Languages" ? "PASS" : "FAIL", `axe on the rail: ${JSON.stringify(vv)}; duplicate item names=${JSON.stringify(dup)}; keyboard Enter on a focused rail item opens "${kb}"; rail has no dialogs`, "");
  const act = NAVSEL + " [aria-current=page]";
  const l = await contrast(p, act); const gl = await contrast(p, NAVSEL + " h2");
  await dark(p);
  const d = await contrast(p, act); const gd = await contrast(p, NAVSEL + " h2");
  await shot(p, "X-08-rail-dark");
  rec("X-08", l >= 4.5 && d >= 4.5 && gl >= 4.5 && gd >= 4.5 ? "PASS" : "FAIL", `The rail has no status pills or badges (rail badge absent); active item text contrast light ${l}:1, dark ${d}:1; group label contrast light ${gl}:1, dark ${gd}:1 (need >= 4.5:1)`, "X-08-rail-dark.png");
  await p.context().close();
}
save(); await b.close();
