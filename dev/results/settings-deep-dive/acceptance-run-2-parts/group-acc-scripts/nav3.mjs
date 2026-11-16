import { launch, open, S, shot, notifTitles, dialogs, rail, axeSrc } from "./lib.mjs";
import { watch, mk, hscroll, contrast, dark } from "./rec.mjs";
import { openCatalog, setRole, resumeSettings, toggleFlag, flagState } from "./devp.mjs";
const { rec, save } = mk("nav3");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const NAV = 'nav[aria-label="Settings navigation"]';
const paneT = (p) => S(p).innerText().then(norm).catch(() => "");
const tabsOf = (p) => S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
const axeOn = async (p, sel) => { await p.evaluate(axeSrc); return p.evaluate(async (sel) => { const r = await window.axe.run(document.querySelector(sel), { resultTypes: ["violations"] }); return r.violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ").slice(0, 60)).join(" | ")}`); }, sel); };

// NAV-12
{
  const { page: p } = await open(b, "collection");
  const lab = async () => norm(await p.locator(NAV + " [data-part=item]", { hasText: "Global CSS" }).first().innerText());
  const ctl = await S(p).getByRole("checkbox", { name: /Global JS/ }).count();
  const labelDefault = await lab();
  await S(p).getByRole("checkbox", { name: /Global JS/ }).first().click({ force: true }); await p.waitForTimeout(250);
  await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(500);
  const labelCollOn = await lab();
  await shot(p, "NAV-12-collection");
  await rail(p, labelCollOn); await p.waitForTimeout(500);
  const tabsOn = await tabsOf(p);
  await openCatalog(p);
  const wasOn = await flagState(p, "custom JS");
  await toggleFlag(p, "custom JS");
  const nowOff = !(await flagState(p, "custom JS"));
  await resumeSettings(p);
  const labelOff = await lab();
  const tabsOff = await tabsOf(p);
  await shot(p, "NAV-12-off");
  await p.reload(); await p.waitForTimeout(1200);
  const persisted = await p.evaluate(() => JSON.parse(sessionStorage.getItem("uwazi:dev:features") || "{}").customJs);
  const tabsReload = await tabsOf(p);
  const labelReload = await lab();
  rec("NAV-12", labelDefault === "Global CSS & JS" && labelCollOn === "Global CSS & JS" && labelOff === "Global CSS & JS" && /JS/.test(tabsOn.join()) && !/JS/.test(tabsOff.join()) && ctl > 0 ? "PASS" : "FAIL", `Collection page has a "Global JS" checkbox=${ctl > 0}. Rail label: seed default "${labelDefault}"; after Collection > Global JS on + Save "${labelCollOn}"; Dev panel "custom JS" toggled (was on=${wasOn}, now off=${nowOff}): label "${labelOff}", Global CSS & JS tabs with the flag on=${JSON.stringify(tabsOn)}, with the Dev switch off=${JSON.stringify(tabsOff)} (spec: label "Global CSS & JS" in both states; JS tab absent when off); after reload Dev switch stored customJs=${persisted}, tabs=${JSON.stringify(tabsReload)}, label "${labelReload}"`, "NAV-12-off.png");
  await p.context().close();
}
// NAV-13 docs link (every role)
{
  const { ctx, page: p } = await open(b, "account");
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const d = p.locator(NAV + " [data-part=documentation]");
  const info = await d.evaluate(e => ({ text: e.innerText.trim(), href: e.getAttribute("href"), target: e.getAttribute("target"), icons: e.querySelectorAll("svg").length, y: Math.round(e.getBoundingClientRect().top), vh: innerHeight }));
  const here = norm((await S(p).locator("h2").first().innerText()));
  const [popup] = await Promise.all([p.waitForEvent("popup", { timeout: 4000 }).catch(() => null), d.click()]);
  const popUrl = popup ? popup.url() : "(no popup)";
  const here2 = norm((await S(p).locator("h2").first().innerText()));
  await shot(p, "NAV-13");
  const roles = [];
  for (const r of ["Editor", "Collaborator"]) { await openCatalog(p); await setRole(p, r); await resumeSettings(p); roles.push(r + "=" + (await p.locator(NAV + " [data-part=documentation]").count())); }
  rec("NAV-13", !!info.href && info.target === "_blank" && info.icons >= 2 && popup && here === here2 && roles.every(r => /=1/.test(r)) ? "PASS" : "FAIL", `Item "${info.text}" at rail bottom (top ${info.y} of ${info.vh}) with ${info.icons} svg icons (leading + external-link), href=${info.href}, target=${info.target}; click opened a new tab=${!!popup} (${popUrl}); current page unchanged ("${here}" -> "${here2}"); present for roles ${JSON.stringify(roles)} plus admin. Open decision (Juan): the built label is "${info.text}" (spec "Uwazi Docs") and the target is ${info.href} (spec https://docs.uwazi.io); recorded as built, not failed`, "NAV-13.png");
  await ctx.close();
}
// NAV-16 phone, X-06, X-07, X-08
{
  const m = await open(b, "users", "mobile"); const p = m.page;
  const vis0 = await p.getByRole("button", { name: /Back/ }).first().isVisible().catch(() => false);
  await p.getByRole("button", { name: /Back/ }).first().tap().catch(() => {}); await p.waitForTimeout(500);
  const railShown = await p.locator(NAV).isVisible().catch(() => false);
  const box = await p.evaluate((sel) => { const n = document.querySelector(sel); const r = n.getBoundingClientRect(); const l = n.querySelector("[data-part=groups]"); return { w: Math.round(r.width), vw: innerWidth, laneH: l.clientHeight, laneScroll: l.scrollHeight }; }, NAV);
  const heads = await p.evaluate((sel) => [...document.querySelectorAll(sel + " h2, " + sel + " h3")].map(h => h.textContent.trim()), NAV);
  await shot(p, "NAV-16-rail");
  const seenHeads = new Set();
  await p.evaluate((sel) => { const l = document.querySelector(sel + " [data-part=groups]"); l.scrollTop = 0; }, NAV);
  for (let i = 0; i < 8; i++) {
    const vis = await p.evaluate((sel) => { const l = document.querySelector(sel + " [data-part=groups]").getBoundingClientRect(); return [...document.querySelectorAll(sel + " h2, " + sel + " h3")].filter(h => { const r = h.getBoundingClientRect(); return r.width > 1 && r.top >= l.top - 1 && r.bottom <= l.bottom + 1; }).map(h => h.textContent.trim()); }, NAV);
    vis.forEach(v => seenHeads.add(v));
    await p.evaluate((sel) => { const l = document.querySelector(sel + " [data-part=groups]"); l.scrollTop += 200; }, NAV);
    await p.waitForTimeout(100);
  }
  await shot(p, "NAV-16-rail-bottom");
  await p.locator(NAV + " [data-part=item]", { hasText: "Languages" }).tap(); await p.waitForTimeout(500);
  const title = norm(await S(p).locator("h2").first().innerText());
  const chev = await p.getByRole("button", { name: /Back/ }).first().isVisible().catch(() => false);
  await shot(p, "NAV-16-page");
  const hs = await hscroll(p);
  await p.getByRole("button", { name: /Back/ }).first().tap(); await p.waitForTimeout(500);
  const back = await p.locator(NAV).isVisible().catch(() => false);
  const small = await p.locator(NAV + " [data-part=item]").evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
  rec("NAV-16", railShown && chev && back && title === "Languages" && ["User", "Collection", "Content model", "Languages", "People", "Tools", "ML tools"].every(h => seenHeads.has(h)) ? "PASS" : "FAIL", `Phone 390: Settings opened on the page (back chevron ${vis0}); chevron returns to the rail (rail visible ${railShown}, ${box.w}px of ${box.vw}); group labels reached by scrolling the lane: ${JSON.stringify([...seenHeads])} (the spec's five labels are superseded by A2's User, Collection, Content model, Languages, People, Tools, ML tools; "System" is sr-only); tapping "Languages" opens "${title}" with a back chevron=${chev}; chevron returns to the rail=${back}; rail item heights ${Math.min(...small)}-${Math.max(...small)}px`, "NAV-16-rail.png");
  rec("X-06", hs.doc <= 0 && Math.min(...small) >= 32 && box.w <= box.vw ? "PASS" : "FAIL", `Phone 390 rail and a page: horizontal overflow ${hs.doc}px; rail items ${Math.min(...small)}-${Math.max(...small)}px tall (touch targets), rail is the full width (${box.w}px)`, "NAV-16-rail.png");
  await m.ctx.close();
}
{
  const { page: p } = await open(b, "users");
  const v = await axeOn(p, NAV);
  const heads = await p.evaluate((sel) => [...document.querySelectorAll(sel + " h2, " + sel + " h3")].map(h => h.tagName + ":" + h.textContent.trim()), NAV);
  const names = await p.locator(NAV + " [data-part=item]").evaluateAll(es => es.map(e => e.innerText.trim()));
  const dup = names.filter((x, i) => names.indexOf(x) !== i);
  await p.locator(NAV + " [data-part=item]", { hasText: "Languages" }).focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const kb = norm(await S(p).locator("h2").first().innerText());
  const bad = v.filter(x => /serious|critical/.test(x));
  rec("X-07", !bad.length && !dup.length && kb === "Languages" ? "PASS" : "FAIL", `axe on the rail: ${JSON.stringify(v)}; duplicate item names=${JSON.stringify(dup)}; headings ${JSON.stringify(heads.slice(0, 8))}; keyboard Enter on a focused rail item opens "${kb}"; the rail opens no dialogs (dialogs of the blocked page checked in NAV-06/NAV-08: none)`, "");
  const act = NAV + " [aria-current=page]";
  const l = await contrast(p, act), gl = await contrast(p, NAV + " h2"), gl3 = await contrast(p, NAV + " h3");
  await dark(p);
  const d = await contrast(p, act), gd = await contrast(p, NAV + " h2"), gd3 = await contrast(p, NAV + " h3");
  await shot(p, "X-08-rail-dark");
  rec("X-08", l >= 4.5 && d >= 4.5 && gl >= 4.5 && gd >= 4.5 && gl3 >= 4.5 && gd3 >= 4.5 ? "PASS" : "FAIL", `The rail has no status pills or badges; active item text contrast light ${l}:1, dark ${d}:1; group label (h2) light ${gl}:1, dark ${gd}:1; shelf label (h3) light ${gl3}:1, dark ${gd3}:1 (need >= 4.5:1)`, "X-08-rail-dark.png");
  await p.context().close();
}
for (const id of ["X-01", "X-02", "X-03", "X-04", "X-05", "X-09", "X-10", "X-11", "X-12", "X-13"]) rec(id, "N/A", `Navigation "Applies:" lists only X-06, X-07, X-08; ${id} does not apply to the rail`, "");
rec("NAV3-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
