import { launch, open, S, shot, notifTitles, dialogs, rail, logEntries } from "./lib.mjs";
import { watch, mk, signInAs, newN, hscroll } from "./rec.mjs";
const { rec, save } = mk("usr1");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const rowOf = (p, n) => S(p).locator("[data-part=row]").filter({ hasText: n }).first();
const names = (p) => S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.querySelector("p span.truncate")?.textContent.trim()));
const tick = async (p, n) => { await rowOf(p, n).getByRole("checkbox").click({ force: true }); await p.waitForTimeout(150); };
const footer = (p) => p.locator("footer").last().innerText().then(norm).catch(() => "");

// USR-01, 02, 03, 04, 05, 21
{
  const { page: p } = await open(b, "users");
  const head = norm(await S(p).locator("h2").first().innerText());
  const tabs = await S(p).getByRole("tab").allInnerTexts().then(a => a.map(norm));
  const nUsers = await S(p).locator("[data-part=row]").count();
  const selActive = await S(p).getByRole("tab", { selected: true }).innerText().then(norm);
  await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(300);
  const nGroups = await S(p).locator("[data-part=row]").count();
  await shot(p, "USR-01");
  rec("USR-01-part", "INFO", `header="${head}" tabs=${JSON.stringify(tabs)} active="${selActive}" user rows=${nUsers} group rows=${nGroups}`);
  const u1ok = head === "Users & Groups" && tabs[0].startsWith("Users") && /5/.test(tabs[0]) && /3/.test(tabs[1]) && nUsers === 5 && nGroups === 3 && /^Users/.test(selActive);
  globalThis.u1 = { ok: u1ok, ev: `header="${head}" tabs=${JSON.stringify(tabs)} active="${selActive}" rows users=${nUsers} groups=${nGroups}` };
  // USR-02
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(300);
  await tick(p, "mlopez"); await tick(p, "afarah");
  const f1 = await footer(p);
  await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(250);
  const fg = await footer(p);
  await p.getByRole("tab", { name: /Users/ }).click(); await p.waitForTimeout(250);
  const f2 = await footer(p);
  const checked = await S(p).locator('[data-part=row] [role=checkbox][aria-checked=true], [data-part=row] input:checked').count();
  rec("USR-02", /Selected 2/.test(f1) && !/Selected/.test(f2) && !/Selected/.test(fg) && /Add user/.test(f2) && checked === 0 ? "PASS" : "FAIL", `with 2 ticked footer="${f1}"; after Groups tab footer="${fg}"; back on Users footer="${f2}"; ticked rows=${checked}`, "");
  // USR-03
  const cols = await S(p).locator('[role=columnheader]').allInnerTexts().then(a => a.map(norm));
  const rowsTxt = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
  const pillBg = await rowOf(p, "admin").locator("span.rounded-md.font-semibold").first().evaluate(e => getComputedStyle(e).backgroundColor);
  await shot(p, "USR-03");
  const protection = cols.some(c => /Protection/i.test(c)) && rowsTxt.some(r => /Password \+ 2fa/.test(r));
  const hdrOk = cols.map(c=>c.trim().toLowerCase()).join("|") === "|username|protection|role|group"; rec("USR-03", protection && hdrOk ? "PASS" : "FAIL", `column headers=${JSON.stringify(cols)} (spec, verbatim and in this order: Username, Protection, Role, Group; header text/order matches=${hdrOk}); rows=${JSON.stringify(rowsTxt)}; Protection pills "Password + 2fa"/"Password" present=${protection} ; Role pills read Admin/Editor/Collaborator, groups one pill each, tbuergenthal group cell "—"; admin pill bg ${pillBg}`, "USR-03.png");
  // USR-04
  const o0 = await names(p);
  const hdr = S(p).locator('[role=columnheader]').filter({ hasText: "User" }).first();
  const sortable = await S(p).locator('[role=columnheader] button, [role=columnheader][aria-sort], [role=columnheader][tabindex]').count();
  await hdr.click(); await p.waitForTimeout(250); const o1 = await names(p);
  await hdr.click(); await p.waitForTimeout(250); const o2 = await names(p);
  const ariaSort = await S(p).locator('[aria-sort]').count();
  const rh = S(p).locator('[role=columnheader]').filter({ hasText: "Role" }).first(); await rh.click(); await p.waitForTimeout(250); const o3 = await names(p);
  const gh = S(p).locator('[role=columnheader]').filter({ hasText: "Groups" }).first(); await gh.click(); await p.waitForTimeout(250); const o4 = await names(p);
  rec("USR-04", JSON.stringify(o0) === JSON.stringify(["admin", "afarah", "jnkemba", "mlopez", "tbuergenthal"]) && JSON.stringify(o1) !== JSON.stringify(o0) && ariaSort > 0 ? "PASS" : "FAIL", `default order=${JSON.stringify(o0)} (spec: admin, afarah, jnkemba, mlopez, tbuergenthal); after clicking User header: ${JSON.stringify(o1)}; again: ${JSON.stringify(o2)}; Role header: ${JSON.stringify(o3)}; Groups header: ${JSON.stringify(o4)}; sortable headers (buttons/aria-sort)=${sortable}/${ariaSort}; no Protection column`, "");
  await p.context().close();
}
// USR-05
{
  const { page: p } = await open(b, "users");
  const row = rowOf(p, "tbuergenthal");
  const color = await row.locator("p").first().evaluate(e => getComputedStyle(e).color);
  const normal = await rowOf(p, "afarah").locator("p").first().evaluate(e => getComputedStyle(e).color);
  const icon = await row.locator("svg").count();
  await row.locator('[aria-label="Account locked"]').hover(); await p.waitForTimeout(500);
  const tip = await p.evaluate(() => [...document.querySelectorAll('[role=tooltip]')].map(e => e.textContent.trim()));
  await shot(p, "USR-05");
  const sealEq = await p.evaluate(() => { const el = document.createElement("span"); el.className = "text-seal-label"; document.body.appendChild(el); const c = getComputedStyle(el).color; el.remove(); return c; });
  rec("USR-05", color === sealEq && icon >= 1 && tip.includes("Account locked") ? "PASS" : "FAIL", `tbuergenthal username colour ${color} (error/seal-label colour ${sealEq}; other rows ${normal}); lock icon svgs in row=${icon}; hover tooltip=${JSON.stringify(tip)}`, "USR-05.png");
  await p.context().close();
}
// USR-06 search + filters
{
  const { page: p } = await open(b, "users");
  const search = p.getByRole("searchbox").or(S(p).getByPlaceholder(/Search users/)).first();
  const h0 = await search.evaluate(e => e.closest("div").getBoundingClientRect().height);
  await search.fill("lop"); await p.waitForTimeout(300);
  const a = await names(p); const h1 = await search.evaluate(e => e.closest("div").getBoundingClientRect().height);
  const emailShown = (await S(p).innerText()).includes("m.lopez@cejil.org");
  await search.fill(""); await p.waitForTimeout(250); const c = (await names(p)).length;
  const roleSel = S(p).getByRole("button", { name: /All roles/ }).first();
  await roleSel.click(); await p.waitForTimeout(200);
  const opts = await p.getByRole("option").allInnerTexts();
  await p.getByRole("option", { name: "Editor", exact: true }).click(); await p.waitForTimeout(300);
  const e1 = await names(p);
  const groupFilter = await S(p).locator('[aria-label*="roup" i]').count();
  await search.fill("zzz"); await p.waitForTimeout(300);
  const zt = norm(await S(p).innerText());
  const clearBtn = await S(p).getByRole("button", { name: /^Clear/ }).count();
  await shot(p, "USR-06");
  rec("USR-06", JSON.stringify(a) === '["mlopez"]' && h0 === h1 && emailShown && c === 5 && JSON.stringify(e1) === '["mlopez","jnkemba"]' && groupFilter > 0 && clearBtn > 0 ? "PASS" : "FAIL", `"lop" rows=${JSON.stringify(a)}, search row height ${h0}->${h1}, email shown under username=${emailShown}; cleared rows=${c}; role options=${JSON.stringify(opts.map(norm))}, Editor -> ${JSON.stringify(e1)}; Group filter controls=${groupFilter} (spec: a Group filter, Research -> jnkemba, afarah); "zzz" -> text "${zt.slice(zt.indexOf("Nothing"), zt.indexOf("Nothing") + 60)}" buttons named Clear*=${clearBtn} (the empty state has "Clear search")`, "USR-06.png");
  await p.context().close();
}
// USR-21 groups tab
{
  const { page: p } = await open(b, "users");
  await p.getByRole("tab", { name: /Groups/ }).click(); await p.waitForTimeout(300);
  const cols = await S(p).locator('[role=columnheader]').allInnerTexts().then(a => a.map(norm));
  const rowsTxt = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, " ").trim()));
  await shot(p, "USR-21");
  const pills = rowsTxt.some(r => /Litigation.*mlopez.*jnkemba/.test(r));
  rec("USR-21", cols.join() === "Name,Members,".replace(/,$/, "") || (/Name/.test(cols[0]) && pills) ? (pills ? "PASS" : "FAIL") : "FAIL", `columns=${JSON.stringify(cols)} (spec: Name, Members); rows=${JSON.stringify(rowsTxt)}; member username pills (Litigation: mlopez, jnkemba)=${pills}; built shows a bare count in Members`, "USR-21.png");
  await p.context().close();
}
rec("USR1-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
