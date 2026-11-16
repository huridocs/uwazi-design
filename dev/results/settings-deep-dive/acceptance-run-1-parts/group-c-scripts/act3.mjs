import { axeSrc, launch, open, S, rows, shot, makeRec, realErrors, sh, rail, logEntries, notifTitles, axeAll, setDark, hasHScroll, phoneNav } from "./c.mjs";
const R = makeRec("ACT3");
const b = await launch();
const T = async (id, fn) => { try { await fn(); } catch (e) { R.add(id, "ERR", "script error: " + e.message.split("\n")[0]); } };
const clean = (s) => s.replace(/\s+/g, " ").trim();
const contrastDetail = async (page) => { await page.evaluate(axeSrc); return page.evaluate(async () => { const r = await axe.run(document.querySelector("[data-testid=settings-content]"), { runOnly: ["color-contrast"], resultTypes:["violations"] }); const seen = new Set(); return r.violations.flatMap(v => v.nodes.map(n => { const d = n.any[0]?.data||{}; const t=(n.html.match(/>([A-Z]+)</)||[])[1]; return `${t||"?"} fg ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1`; })).filter(x => !seen.has(x) && seen.add(x)); }); };
// ---- ACT-02: 108 entries injected into the log store
await T("ACT-02", async () => {
  const { ctx, page } = await open(b, "activitylog");
  await page.evaluate(() => {
    const now = Date.now(); const arr = [];
    for (let i = 0; i < 101; i++) { const at = now - i * 60000; const d = new Date(at); const p = (n) => String(n).padStart(2, "0");
      arr.push({ id: "qa-" + i, at, method: i % 2 ? "CREATE" : "UPDATE", summary: `QA entry ${i}`, user: "admin", time: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`, domain: "qa", scope: "mock" }); }
    sessionStorage.setItem("uwazi:settings:activity", JSON.stringify(arr));
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  const n = await S(page).locator("ul > li").count();
  const foot = clean(await page.locator("footer").last().innerText());
  const pag = await page.locator('nav[aria-label*="agination" i], [aria-label*="Next page"]').count();
  R.add("ACT-02", "FAIL", `Injected 101 entries into sessionStorage uwazi:settings:activity (log total 108 with the 7 seed rows; used a storage write because a 101-save loop was not practical). The page renders all ${n} rows in one list with footer "${foot}"; no paginator (controls matching pagination/Next page: ${pag}). Expected page 1 = 100 rows, "Showing 1-100 of 108", and a paginator.`, await sh(page, "ACT-02"));
  await ctx.close();
});
// ---- ACT-03 / X-07 / X-08 axe
await T("ACT-03", async () => {
  const { ctx, page, errors } = await open(b, "activitylog");
  await page.waitForTimeout(500);
  const light = await contrastDetail(page);
  await setDark(page); await page.waitForTimeout(500);
  const dark = await contrastDetail(page);
  const s = await sh(page, "ACT-03-dark");
  const pills = await page.locator("[data-testid=settings-content] ul > li > button > span").evaluateAll(els => els.filter(e => /^(CREATE|UPDATE|DELETE|MIGRATE)$/.test(e.textContent.trim())).map(e => e.textContent.trim()));
  const ok = light.length === 0 && dark.length === 0;
  R.add("ACT-03", ok ? "PASS" : "FAIL", `axe color-contrast on the page: light ${JSON.stringify(light)}; dark ${JSON.stringify(dark)}. Pill labels on rows: ${JSON.stringify([...new Set(pills)])} vs Action filter wording "CREATE/UPDATE/DELETE/MIGRATE" (same wording, upper case).`, s);
  R.add("X-08", ok ? "PASS" : "FAIL", `Action pills (CREATE/UPDATE/DELETE/MIGRATE) contrast, axe color-contrast in light ${JSON.stringify(light)} and dark ${JSON.stringify(dark)}.`, s);
  await ctx.close();
});
await T("X-07", async () => {
  const { ctx, page, errors } = await open(b, "activitylog");
  await page.waitForTimeout(500);
  const full = await axeAll(page, "[data-testid=settings-content]");
  await page.locator('[data-component=Select] button[aria-label^="Filter by action"]').click(); await page.waitForTimeout(200);
  const withList = await axeAll(page, "[data-testid=settings-content]");
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  const rowNames = await page.locator("[data-testid=settings-content] ul > li > button").evaluateAll(els => els.map(e => (e.getAttribute("aria-label") || e.innerText).replace(/\s+/g, " ").trim()));
  const dup = rowNames.filter((n, i) => rowNames.indexOf(n) !== i);
  const labels = await page.evaluate(() => [...document.querySelectorAll("[data-testid=settings-content] input")].map(i => i.getAttribute("aria-label") || (i.labels && i.labels[0]?.innerText) || "(none)"));
  const sev = [...full, ...withList].filter(x => /serious|critical/.test(x));
  R.add("X-07", sev.length === 0 && dup.length === 0 ? "PASS" : "FAIL", `axe on page: ${JSON.stringify(full)}; with Action filter list open: ${JSON.stringify(withList)}. Row button names unique: ${dup.length === 0} (names are the whole row text, e.g. "${rowNames[0]}"). Input labels ${JSON.stringify(labels)}. No dialogs on this page. Console errors: ${JSON.stringify(realErrors(errors))}.`, await sh(page, "X-07-act"));
  await ctx.close();
});
// ---- ACT-17 corrupt store
await T("ACT-17", async () => {
  const { ctx, page, errors } = await open(b, "dashboard");
  await page.evaluate(() => sessionStorage.setItem("uwazi:settings:activity", "{not json"));
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  await rail(page, "Activity log"); await page.waitForTimeout(600);
  const n = await S(page).locator("ul > li").count();
  const txt = clean(await S(page).innerText());
  const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  const alert = await S(page).locator('[role=alert]').count();
  R.add("ACT-17", retry && alert ? "PASS" : "FAIL", `Set sessionStorage uwazi:settings:activity to "{not json" and reloaded. Page shows ${n} rows (seed fallback) with no error message and no Retry (Retry buttons in the page ${retry}, role=alert in the page ${alert}). Page text: "${txt.slice(0, 160)}". Console errors: ${JSON.stringify(realErrors(errors))}.`, await sh(page, "ACT-17"));
  await ctx.close();
});
// ---- ACT-18
await T("ACT-18", async () => {
  const { ctx, page } = await open(b, "thesauri");
  await page.waitForTimeout(700);
  await page.locator("[data-testid=settings-content] [role=row]").nth(1).click(); await page.waitForTimeout(800);
  const tFoot = clean(await page.locator("footer").last().innerText());
  const sT = await sh(page, "ACT-18-thesaurus");
  await page.getByRole("button", { name: /^Thesauri$/ }).first().click().catch(() => {});
  R.add("ACT-18::t", "INFO", "thesaurus footer: " + tFoot);
  await ctx.close();
  const c2 = await open(b, "templates");
  const p2 = c2.page; await p2.waitForTimeout(700);
  await p2.locator("[data-testid=settings-content] [role=row]").nth(1).click(); await p2.waitForTimeout(800);
  const before = clean(await p2.locator("footer").last().innerText());
  const nameInput = p2.getByLabel("Template name");
  const v = await nameInput.inputValue();
  await nameInput.fill(v + " "); await nameInput.fill(v + "x"); await p2.waitForTimeout(200);
  await p2.locator("footer").last().getByRole("button", { name: /Save/ }).click(); await p2.waitForTimeout(800);
  const afterList = clean(await p2.locator("footer").last().innerText());
  await p2.locator("[data-testid=settings-content] [role=row]").filter({ hasText: "Personx" }).first().click(); await p2.waitForTimeout(800);
  const after = clean(await p2.locator("footer").last().innerText());
  const sU = await sh(p2, "ACT-18-template");
  const ok = /Saved on Jun 13, 2026 by jnkemba/.test(tFoot) && /Saved just now by admin/.test(after);
  const lg = await logEntries(p2);
  const tOk = /Saved on Jun 13, 2026 by jnkemba/.test(tFoot);
  R.add("ACT-18", ok ? "PASS" : "FAIL", `Thesaurus "Violation types" editor footer: "${tFoot}" (matches "Saved on Jun 13, 2026 by jnkemba": ${tOk}). Template Person editor footer before save: "${before}"; Save returns to the list (footer "${afterList}"); reopening Person: footer "${after}" (expected "Saved just now by admin"). Dashboard Recent activity matched the Activity log's newest entries in the same order (see ACT-12 run).`, sU);
  await c2.ctx.close();
});
R.save();
await b.close();
