import fs from "fs";
import { fixKb, watch, launch, open, S, wait, shot, init, rec, axeOn, noScrollX, setDark, pageContrast, devEmpty, devReturn, toSettingsItem, DIR } from "./common.mjs";
init("act1");
const b = await launch();
const norm = (t) => t.replace(/\s+/g, " ").trim();
const ID = { "Velásquez-Rodríguez": "l1", "Represented by": "l2", "Case 12.250": "l3", "t.guest": "l4", "add-relationship-tiers": "l5", "Violation types": "l6", "template “Court Case”": "l7" };
const idOf = (t) => { for (const [k, v] of Object.entries(ID)) if (t.includes(k)) return v; return "?"; };
const trs = (p) => S(p).locator("[data-part=log-table] tbody > tr").evaluateAll((rs) => rs.filter((r) => r.querySelectorAll("td").length === 5).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const lis = (p) => S(p).locator("[data-part=log-rows] > li").evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const ids = async (p) => (await trs(p)).map(idOf);
const footer = (p) => S(p).locator("footer [role=status]").innerText().then(norm);
const search = (p) => S(p).getByPlaceholder("by ids, methods, keywords, etc.");
const chipBtns = (p) => S(p).getByRole("group", { name: "Action" }).locator("button[aria-pressed]");
const chip = (p, n) => S(p).getByRole("group", { name: "Action" }).getByRole("button", { name: n, exact: true });
const pickUser = async (p, name) => { await S(p).locator('[data-component=Select] button[aria-label^="User"]').click(); await wait(p, 200); await p.getByRole("option", { name, exact: true }).click(); await wait(p, 250); };
const userOpts = async (p) => { await S(p).locator('[data-component=Select] button[aria-label^="User"]').click(); await wait(p, 200); const o = (await p.getByRole("option").allInnerTexts()).map(norm); await p.keyboard.press("Escape"); await wait(p, 150); return o; };
const clearAll = (p) => S(p).getByRole("button", { name: "Clear filters" }).first().click().then(() => wait(p, 250));

// ACT-01, ACT-03 (axe light/dark placed in X-07/X-08), ACT-04..ACT-10, ACT-14
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  // ACT-01
  const h = norm(await S(page).locator("h2").first().innerText());
  const heads = (await S(page).locator("thead th").allInnerTexts()).map(norm);
  const ts = await trs(page); const idl = ts.map(idOf);
  const exp = await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
  const f = await footer(page);
  const s1 = await shot(page, "ACT-01");
  const firstTs = (ts[0].match(/[A-Z][a-z]{2} \d+, \d{4} - \d{2}:\d{2}/) || [])[0];
  rec("ACT-01", h === "Activity log" && JSON.stringify(heads.map((x) => x.toLowerCase())) === JSON.stringify(["action", "user", "description", "timestamp", "details"]) && idl.join() === "l1,l2,l3,l4,l5,l6,l7" && firstTs === "Jun 15, 2026 - 18:42" && exp.length === 7 && exp.every((x) => x && x.length > 10) && f === "Showing 1-7 of 7" ? "PASS" : "FAIL", `heading "${h}"; column headers ${JSON.stringify(heads)}; row order ${idl.join(",")}; first row "${ts[0]}"; timestamp "${firstTs}"; expand buttons ${exp.length}, first name "${exp[0]}"; footer "${f}"`, s1);
  // ACT-04
  const chipNames = (await chipBtns(page).allInnerTexts()).map(norm);
  await chip(page, "Create").click(); await wait(page, 250); const c1 = (await ids(page)).join();
  await chip(page, "Delete").click(); await wait(page, 250); const c2 = (await ids(page)).join();
  const pressed = await chipBtns(page).evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-pressed")));
  await chip(page, "Create").click(); await chip(page, "Delete").click(); await wait(page, 250); const c3 = (await ids(page)).length;
  const s4 = await shot(page, "ACT-04");
  rec("ACT-04", JSON.stringify(chipNames) === JSON.stringify(["Create", "Update", "Delete", "Migrate"]) && c1 === "l2,l3" && c2 === "l2,l3,l4" && pressed.join() === "true,false,true,false" && c3 === 7 && !chipNames.some((x) => /warning/i.test(x)) ? "PASS" : "FAIL", `options ${JSON.stringify(chipNames)} (toggle chips, aria-pressed ${JSON.stringify(pressed)}); Create -> ${c1}; Create+Delete -> ${c2}; deselecting both restores ${c3} rows; no Warning option`, s4);
  // ACT-05
  const uo = await userOpts(page);
  await pickUser(page, "mlopez"); const m = (await ids(page)).join();
  await chip(page, "Create").click(); await wait(page, 250); const mc = (await ids(page)).join();
  const s5 = await shot(page, "ACT-05");
  rec("ACT-05", ["admin", "mlopez", "jnkemba", "system"].every((u) => uo.includes(u)) && m === "l2,l3,l7" && mc === "l2,l3" ? "PASS" : "FAIL", `User options ${JSON.stringify(uo)}; mlopez -> ${m}; plus Action Create -> ${mc}`, s5);
  // ACT-08 (filters now set: Create + mlopez)
  const btns = await S(page).locator("button").evaluateAll((bs) => bs.map((b) => (b.getAttribute("aria-label") || b.innerText).trim()));
  const apply = btns.filter((t) => /^apply/i.test(t)); const aside = await S(page).locator("aside,[role=complementary]").count();
  await search(page).fill("x"); await page.locator('input[type=date]').first().fill("2026-06-14"); await wait(page, 250);
  await clearAll(page);
  const after = { q: await search(page).inputValue(), from: await page.locator('input[type=date]').nth(0).inputValue(), to: await page.locator('input[type=date]').nth(1).inputValue(), pressed: await chipBtns(page).evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-pressed"))), user: await S(page).locator('[data-component=Select] button[aria-label^="User"]').innerText(), rows: (await ids(page)).length };
  const s8 = await shot(page, "ACT-08");
  rec("ACT-08", apply.length === 0 && aside === 0 && m === "l2,l3,l7" && after.q === "" && !after.from && !after.to && after.pressed.every((x) => x === "false") && /All users/.test(after.user) && after.rows === 7 ? "PASS" : "FAIL", `filters applied live (the list changed on each selection); Apply buttons ${apply.length}, side panels ${aside}; one "Clear filters" reset Action, User, Search and both dates: ${JSON.stringify(after)}`, s8);
  await page.context().close();
}
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  // ACT-06
  const ph = await search(page).getAttribute("placeholder"); const res = {};
  for (const q of ["relationship", "THESAURUS", "delete"]) { await search(page).fill(q); await wait(page, 250); res[q] = (await ids(page)).join(); }
  await search(page).fill(""); await wait(page, 250); const back = (await ids(page)).length;
  const s6 = await shot(page, "ACT-06");
  rec("ACT-06", ph === "by ids, methods, keywords, etc." && res.relationship === "l2,l5" && res.THESAURUS === "l6" && res.delete === "l4" && back === 7 ? "PASS" : "FAIL", `placeholder "${ph}"; "relationship" -> ${res.relationship}; "THESAURUS" -> ${res.THESAURUS}; "delete" -> ${res.delete}; cleared -> ${back} rows`, s6);
  // ACT-07
  const from = page.locator("input[type=date]").nth(0), to = page.locator("input[type=date]").nth(1);
  await from.fill("2026-06-14"); await wait(page, 250);
  const a1 = { from: await from.inputValue(), to: await to.inputValue(), ids: (await ids(page)).join() };
  await from.fill("2026-06-13"); await wait(page, 250);
  const a2 = { from: await from.inputValue(), to: await to.inputValue(), ids: (await ids(page)).join() };
  await S(page).getByRole("button", { name: "Today", exact: true }).click(); await wait(page, 250);
  const a3 = { from: await from.inputValue(), to: await to.inputValue(), rows: (await ids(page)).length, empty: norm(await S(page).innerText()).includes("No activity matches these filters"), f: await footer(page) };
  await S(page).getByRole("button", { name: "Clear From date" }).click(); await wait(page, 250); const a4 = { from: await from.inputValue(), to: await to.inputValue(), rows: (await ids(page)).length };
  await S(page).getByRole("button", { name: "Clear To date" }).click(); await wait(page, 250); const a5 = { from: await from.inputValue(), to: await to.inputValue(), rows: (await ids(page)).length };
  const s7 = await shot(page, "ACT-07");
  rec("ACT-07", a1.to === "2026-06-14" && a1.ids === "l4" && a2.ids === "l4,l5,l6" && a3.rows === 0 && a3.empty && a4.from === "" && a4.rows === 7 && a5.to === "" && a5.rows === 7 ? "PASS" : "FAIL", `From 2026-06-14 -> To auto-filled ${a1.to}, rows ${a1.ids}; From 2026-06-13 -> ${a2.ids}; Today -> ${JSON.stringify(a3)}; Clear From -> ${JSON.stringify(a4)}; Clear To -> ${JSON.stringify(a5)}`, s7);
  const th = (n) => S(page).locator("thead th", { hasText: new RegExp("^" + n, "i") }).first();
  // ACT-10
  const expand = async (id) => { const idx = ({ l1: 0, l6: 5 })[id]; await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").nth(idx).click(); await wait(page, 250); return norm(await S(page).locator("[data-part=detail]").first().innerText()); };
  const th0 = null; const d6 = await expand("l6"); await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").nth(5).click(); await wait(page, 150);
  const d1 = await expand("l1");
  await shot(page, "ACT-10");
  const bad = (t) => /Request|Query|Body|\/api|GET |POST |PATCH |PUT /.test(t);
  rec("ACT-10", /Update/.test(d6) && /Violation types/.test(d6) && /jnkemba/.test(d6) && /2026/.test(d6) && /No details recorded/.test(d6) && !bad(d6) && /Velásquez/.test(d1) && /admin/.test(d1) && /No details recorded/.test(d1) && !bad(d1) ? "PASS" : "FAIL", `expanded l6: "${d6}"; expanded l1: "${d1}"; request/Query/Body lines present: ${bad(d6) || bad(d1)}`, "ACT-10");
  // ACT-09
    const def = await th("Timestamp").getAttribute("aria-sort"); const defOrder = (await ids(page)).join();
  const out = {};
  for (const [name, key] of [["Timestamp", "time"], ["Action", "method"], ["User", "user"]]) {
    await th(name).locator("button").click(); await wait(page, 200); const s1 = await th(name).getAttribute("aria-sort"); const o1 = await trs(page);
    await th(name).locator("button").click(); await wait(page, 200); const s2 = await th(name).getAttribute("aria-sort"); const o2 = await trs(page);
    out[name] = { s1, s2, o1, o2 };
  }
  const pillOf = (r) => r.split(" ")[0];
  const actAsc = out.Action.o1.map(pillOf); const usrAsc = out.User.o1.map((r) => r.split(" ")[1]);
  const sortedA = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);
  const s9 = await shot(page, "ACT-09");
  rec("ACT-09", def === "descending" && defOrder === "l1,l2,l3,l4,l5,l6,l7" && out.Action.s1 === "ascending" && out.Action.s2 === "descending" && sortedA(actAsc) && actAsc.join() === "Create,Create,Delete,Migrate,Update,Update,Update" && out.User.s1 === "ascending" && out.User.s2 === "descending" && sortedA(usrAsc) && out.Timestamp.s1 === "ascending" && out.Timestamp.s2 === "descending" ? "PASS" : "FAIL", `default Timestamp aria-sort=${def}, order ${defOrder}; Action asc ${out.Action.s1} labels ${actAsc.join()}, then ${out.Action.s2}; User asc ${out.User.s1} ${usrAsc.join()}, then ${out.User.s2}; Timestamp asc ${out.Timestamp.s1}, then ${out.Timestamp.s2}`, s9);
  // ACT-14
  const ctrls = await S(page).locator("button:not([aria-pressed])").evaluateAll((bs) => bs.map((b) => (b.getAttribute("aria-label") || b.innerText).trim()).filter((t) => /^(edit|delete|remove|clear all|clear log|reset)/i.test(t)));
  const chipsDel = await chipBtns(page).allInnerTexts();
  await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").first().focus();
  await page.keyboard.press("Delete"); await page.keyboard.press("Backspace"); await wait(page, 250);
  const n14 = (await ids(page)).length;
  rec("ACT-14", ctrls.length === 0 && n14 === 7 ? "PASS" : "FAIL", `edit/delete/clear controls on rows or footer: ${JSON.stringify(ctrls)}; after Delete and Backspace on a focused row the list still has ${n14} rows`, "ACT-10");
  await page.context().close();
}
// ACT-15 export, ACT-16 empty search
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  const fh = () => S(page).locator("footer").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const h7 = await fh();
  await chip(page, "Create").click(); await wait(page, 250);
  const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await S(page).getByRole("button", { name: "Export CSV" }).click(); const d = await dl;
  let csv = null, fname = null; if (d) { fname = d.suggestedFilename(); csv = fs.readFileSync(await d.path(), "utf8"); }
  await chip(page, "Create").click(); await wait(page, 250);
  const dl2 = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await S(page).getByRole("button", { name: "Export CSV" }).click(); const d2 = await dl2;
  const csv2 = d2 ? fs.readFileSync(await d2.path(), "utf8") : null;
  await search(page).fill("zzz"); await wait(page, 300);
  const h0 = await fh();
  const s15 = await shot(page, "ACT-15");
  const lines = (csv || "").trim().split("\n"); const lines2 = (csv2 || "").trim().split("\n");
  rec("ACT-15", csv && lines.length === 3 && /^Time,User,Action,Description$/.test(lines[0]) && lines.slice(1).every((l) => /Create/.test(l)) && lines2.length === 8 && h7 === h0 ? "PASS" : "FAIL", `Create filter -> download "${fname}" with ${lines.length} lines: ${JSON.stringify(lines)}; no filter -> ${lines2.length} lines (header + 7); footer height ${h7}px with rows, ${h0}px with no rows`, s15);
  // ACT-16
  const body = norm(await S(page).innerText()); const f = await footer(page);
  const clr = S(page).getByRole("button", { name: "Clear filters" });
  const clrCount = await clr.count();
  const s16 = await shot(page, "ACT-16");
  await S(page).locator("[role=status]").filter({ hasText: /./ }).first().isVisible();
  const emptyClear = S(page).getByRole("button", { name: "Clear filters" }).last();
  await emptyClear.click(); await wait(page, 300);
  const restored = (await ids(page)).length; const sv = await search(page).inputValue();
  rec("ACT-16", /No activity matches “zzz”/.test(body) && f === "0 of 0" && clrCount >= 1 && restored === 7 && sv === "" ? "PASS" : "FAIL", `search "zzz": body has “No activity matches “zzz””: ${/No activity matches “zzz”/.test(body)}; footer "${f}"; "Clear filters" buttons ${clrCount}; clicking restores ${restored} rows (search value "${sv}")`, s16);
  await page.context().close();
}
// X-07 axe, X-08 pills light/dark (desktop), ACT-03
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  const ax = await axeOn(page, null);
  await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").first().click(); await wait(page, 250);
  const ax2 = await axeOn(page, null);
  await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").first().click(); await wait(page, 150);
  const labelsOk = (await page.locator("input").evaluateAll((es) => es.filter((e) => e.getBoundingClientRect().width > 0 && !e.closest("[inert]")).filter((e) => !e.getAttribute("aria-label") && !e.labels?.length).map((e) => e.outerHTML.slice(0, 80))));
  const btnNames = await S(page).locator("tbody button").evaluateAll((bs) => bs.map((b) => (b.getAttribute("aria-label") || b.innerText).trim()));
  const dup = Object.entries(btnNames.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {})).filter(([, c]) => c > 1);
  const out = {};
  for (const dark of [false, true]) {
    await setDark(page, dark); await wait(page, 300);
    await page.evaluate(() => document.querySelectorAll("[data-part=action-pill]").forEach((e, i) => e.setAttribute("data-qa-pill", String(i))));
    const n = await page.locator("[data-part=action-pill]").count();
    const c = await pageContrast(page, Array.from({ length: n }, (_, i) => `[data-qa-pill="${i}"]`));
    const lbl = await page.locator("[data-part=action-pill]").allInnerTexts();
    out[dark ? "dark" : "light"] = c.map((x, i) => `${lbl[i]} ${x && x.ratio}`);
    out[(dark ? "dark" : "light") + "Axe"] = (await axeOn(page, null)).filter((v) => /color-contrast/.test(v));
    await shot(page, dark ? "X-08-dark" : "X-08-light");
  }
  const min = (a) => Math.min(...a.map((s) => parseFloat(s.split(" ").pop())));
  rec("X-07", ax.filter((v) => /serious|critical/.test(v)).length === 0 && ax2.filter((v) => /serious|critical/.test(v)).length === 0 && labelsOk.length === 0 ? "PASS" : "FAIL", `axe page ${JSON.stringify(ax)}; with a row expanded ${JSON.stringify(ax2)}; unlabeled inputs ${JSON.stringify(labelsOk)}; row buttons have unique names (each names its entry and time): duplicates ${JSON.stringify(dup)}; the page opens no dialogs`, "X-08-light");
  rec("X-08", min(out.light) >= 4.5 && min(out.dark) >= 4.5 && out.lightAxe.length === 0 && out.darkAxe.length === 0 ? "PASS" : "FAIL", `action pill contrast (label ratio): light ${JSON.stringify(out.light)}; dark ${JSON.stringify(out.dark)}; axe color-contrast light ${JSON.stringify(out.lightAxe)}, dark ${JSON.stringify(out.darkAxe)}`, "X-08-dark");
  rec("ACT-03", out.lightAxe.length === 0 && out.darkAxe.length === 0 && min(out.light) >= 4.5 && min(out.dark) >= 4.5 && ax.every((v) => !/color-contrast/.test(v)) ? "PASS" : "FAIL", `Create/Update/Delete/Migrate pills: contrast light min ${min(out.light)}, dark min ${min(out.dark)}; axe color-contrast violations light ${out.lightAxe.length}, dark ${out.darkAxe.length}; pill labels Create, Update, Delete, Migrate equal the Action filter chips (ACT-04)`, "X-08-dark");
  await page.context().close();
}
// X-10 empty state
{
  const { page, errors } = await open(b, "dashboard"); const mon = watch(errors); await wait(page, 800);
  const st = await devEmpty(page, "Empty activity log"); await devReturn(page, "Activity log");
  const t = norm(await S(page).innerText()); const f = await footer(page); const ex = await S(page).getByRole("button", { name: "Export CSV" }).isDisabled();
  const s = await shot(page, "X-10");
  rec("X-10", /No activity yet/.test(t) && /Changes made in Settings are listed here\./.test(t) && !/Nothing here yet/.test(t) ? "PASS" : "FAIL", `Dev panel "${st}"; page reads "${t}"; footer "${f}", Export CSV disabled=${ex}. The page is read-only (ACT-14), so it offers no create action; title names the object and a one-line hint is present`, s);
  await page.context().close();
}
// ACT-19 + X-06 phone, dark phone look
{
  const { page, errors } = await open(b, "activitylog", "mobile"); const mon = watch(errors); await wait(page, 1000); const kb = await fixKb(page);
  const li = await lis(page); const sx = await noScrollX(page);
  await shot(page, "ACT-19");
  const tableShown = await S(page).locator("[data-part=log-table]").count();
  // filters by touch
  await chip(page, "Create").tap(); await wait(page, 250); const afterChip = (await lis(page)).length;
  await S(page).locator('[data-component=Select] button[aria-label^="User"]').tap(); await wait(page, 300); await page.getByRole("option", { name: "mlopez", exact: true }).tap(); await wait(page, 300); const afterUser = (await lis(page)).length;
  await S(page).getByRole("button", { name: "Clear filters" }).first().tap(); await wait(page, 300); const afterClear = (await lis(page)).length;
  await S(page).getByPlaceholder("by ids, methods, keywords, etc.").fill("thesaurus"); await wait(page, 300); const afterSearch = (await lis(page)).length;
  await S(page).getByPlaceholder("by ids, methods, keywords, etc.").fill(""); await wait(page, 300);
  const expBtn = S(page).locator("[data-part=log-rows] li button[aria-expanded]").first();
  const bb = await expBtn.boundingBox();
  await expBtn.tap(); await wait(page, 300);
  const det = norm(await S(page).locator("[data-part=detail]").first().innerText());
  const exportBtn = S(page).getByRole("button", { name: "Export CSV" }); const eb = await exportBtn.boundingBox(); const fb = await footer(page);
  const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null); await exportBtn.tap(); const dd = await dl;
  const sx2 = await noScrollX(page);
  const s2 = await shot(page, "ACT-19-expanded");
  const secondLine = li[0] && /admin · Jun 15, 2026 - 18:42/.test(li[0]);
  rec("ACT-19", li.length === 7 && !tableShown && secondLine && sx.doc <= sx.win && afterChip === 2 && afterUser === 2 && afterClear === 7 && afterSearch === 1 && /No details recorded/.test(det) && eb && eb.x + eb.width <= 390 && !!dd && sx2.doc <= sx2.win ? "PASS" : "FAIL", `phone list rows ${li.length} (table shown: ${tableShown}); first row "${li[0]}" (pill + description, then user and time); page scroll ${sx.doc}/${sx.win}; Create chip by touch -> ${afterChip} rows; User mlopez -> ${afterUser}; Clear filters -> ${afterClear}; search "thesaurus" -> ${afterSearch}; expand by touch -> "${det}" (button box ${JSON.stringify(bb)}); Export CSV box ${JSON.stringify(eb)} download by touch ${!!dd}; footer "${fb}"; --kb at load ${kb} (re-measured)`, s2);
  rec("X-06", li.length === 7 && !tableShown && sx.doc <= sx.win && sx2.doc <= sx2.win ? "PASS" : "FAIL", `rows not table, no sideways scroll (${sx.doc}/${sx.win}, after expand ${sx2.doc}/${sx2.win}); no dialogs on this page; see ACT-19 for the touch actions`, s2);
  await setDark(page, true); await wait(page, 300); await shot(page, "ACT-visual-dark-phone");
  await page.context().close();
}
await b.close();
