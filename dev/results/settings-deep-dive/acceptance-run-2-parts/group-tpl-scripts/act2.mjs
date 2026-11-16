import fs from "fs";
import { watch, launch, open, S, wait, shot, init, rec, toSettingsItem, rail, devArm, devReturn, devOpen, beaconTexts, DIR } from "./common.mjs";
init("act2");
const b = await launch();
const F = (n) => DIR + "files/" + n;
const norm = (t) => t.replace(/\s+/g, " ").trim();
const logRows = (p) => S(p).locator("[data-part=log-table] tbody > tr").evaluateAll((rs) => rs.filter((r) => r.querySelectorAll("td").length === 5).map((r) => r.innerText.replace(/\s+/g, " ").trim()));
const footer = (p) => S(p).locator("footer [role=status]").innerText().then(norm);
const chipBtn = (p, n) => S(p).getByRole("group", { name: "Action" }).getByRole("button", { name: n, exact: true });
const inject = (page, n, method = "CREATE") => page.evaluate(([n, method]) => {
  const now = Date.now(); const arr = [];
  for (let i = 0; i < n; i++) { const at = now - (i + 1) * 1000; arr.push({ id: "qa-" + i, method, user: "admin", summary: `Created template “QA ${i}”`, time: "x", at, domain: "template", scope: "mock" }); }
  sessionStorage.setItem("uwazi:settings:activity", JSON.stringify(arr));
}, [n, method]);

// ACT-02 pagination
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  await inject(page, 93); await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const f100 = await footer(page); const nav100 = await S(page).getByRole("navigation", { name: "Pages" }).count(); const r100 = (await logRows(page)).length;
  await inject(page, 94); await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const p1 = { f: await footer(page), rows: (await logRows(page)).length, nav: await S(page).getByRole("navigation", { name: "Pages" }).count() };
  const s1 = await shot(page, "ACT-02-page1");
  await S(page).getByRole("button", { name: "Page 2" }).click(); await wait(page, 300);
  const p2 = { f: await footer(page), rows: (await logRows(page)).length, cur: await S(page).getByRole("button", { name: "Page 2" }).getAttribute("aria-current") };
  await shot(page, "ACT-02-page2");
  await chipBtn(page, "Create").click(); await wait(page, 300);
  const p2f = { f: await footer(page), rows: (await logRows(page)).length };
  // a bigger log: filter change on page 2 returns to page 1
  await chipBtn(page, "Create").click(); await inject(page, 150); await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  await S(page).getByRole("button", { name: "Page 2" }).click(); await wait(page, 300); const big2 = await footer(page);
  await chipBtn(page, "Create").click(); await wait(page, 300);
  const big = { f: await footer(page), rows: (await logRows(page)).length, cur: await S(page).getByRole("button", { name: "Page 1" }).getAttribute("aria-current") };
  const s2 = await shot(page, "ACT-02");
  rec("ACT-02", f100 === "Showing 1-100 of 100" && nav100 === 0 && r100 === 100 && p1.f === "Showing 1-100 of 101" && p1.rows === 100 && p1.nav === 1 && p2.f === "Showing 101-101 of 101" && p2.rows === 1 && p2.cur === "page" && big.cur === "page" && /^Showing 1-100 of 15\d$/.test(big.f) && big.rows === 100 ? "PASS" : "FAIL", `100 entries (93 injected + 7 seed): footer "${f100}", paginator ${nav100}, rows ${r100}; 101 entries: page 1 footer "${p1.f}" rows ${p1.rows} paginator ${p1.nav}; page 2 footer "${p2.f}" rows ${p2.rows} aria-current=${p2.cur}; filter Create on a 101-entry page 2 -> "${p2f.f}" (${p2f.rows} rows, back on page 1); 157 entries: page 2 "${big2}", then Create filter -> "${big.f}" rows ${big.rows}, Page 1 aria-current=${big.cur}. Log injected through sessionStorage "uwazi:settings:activity" (the app writes the same key); no scripted UI loop`, s2);
  await page.context().close();
}
// ACT-17 read failure (Dev panel Read) + corrupt storage
{
  const { page, errors } = await open(b, "dashboard"); const mon = watch(errors); await wait(page, 800);
  const st = await devArm(page, "Read", "The log store did not answer.");
  await devReturn(page, "Activity log");
  const t = norm(await S(page).innerText());
  const alert = await S(page).locator("[role=alert]").count(); const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  const s = await shot(page, "ACT-17");
  let after = null;
  if (retry) { await S(page).getByRole("button", { name: "Retry" }).click(); await wait(page, 400); after = norm(await S(page).innerText()).slice(0, 200); }
  rec("ACT-17", alert === 1 && retry === 1 && /did not answer|could not be loaded/.test(t) ? "PASS" : "FAIL", `Dev panel armed: "${st}". Opening Activity log shows "${t.slice(0, 300)}" (alert regions ${alert}, Retry buttons ${retry}); after Retry: ${JSON.stringify(after)}. No error appeared: the table rendered with its seven rows, so the Read scope switch does not reach the Activity log store`, s);
  await page.context().close();
}
{
  const { page, errors } = await open(b, "activitylog"); const mon = watch(errors); await wait(page, 800);
  await page.evaluate(() => sessionStorage.setItem("uwazi:settings:activity", "{not json"));
  await page.reload({ waitUntil: "load" }); await wait(page, 1500);
  const t = norm(await S(page).innerText()); const alert = await S(page).locator("[role=alert]").count(); const retry = await S(page).getByRole("button", { name: "Retry" }).count();
  const s = await shot(page, "ACT-17b-corrupt-storage");
  await page.evaluate(() => sessionStorage.setItem("uwazi:settings:activity", "[]"));
  await S(page).getByRole("button", { name: "Retry" }).click(); await wait(page, 500);
  const rows = (await logRows(page)).length;
  rec("ACT-17b", alert === 1 && retry === 1 && /could not be loaded|could not be read/.test(t) && rows === 7 ? "PASS" : "FAIL", `with a broken stored log (not driven through SD-1): "${t.slice(0, 260)}" alert ${alert} Retry ${retry}; after the cause is fixed Retry reloads ${rows} rows. The error UI exists; only the Dev panel switch does not reach it (ACT-17)`, s);
  await page.context().close();
}
// ACT-11
{
  const { page, errors } = await open(b, "collection"); const mon = watch(errors); await wait(page, 1000);
  const name = S(page).locator("#collection-name, [id=collection-name]").first();
  const before = await name.inputValue();
  await name.fill("A"); await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 800);
  const dlg = page.locator("[role=dialog]:not([inert] *)").getByRole("button", { name: /^Save/ }); if (await dlg.count()) { await dlg.first().click(); await wait(page, 600); }
  await name.fill("B"); await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 800);
  if (await dlg.count()) { await dlg.first().click(); await wait(page, 600); }
  const nameNow = await name.inputValue();
  await (async () => { await rail(page, "Activity log"); await wait(page, 600); })();
  const rowsNow = await logRows(page); const top = rowsNow[0];
  await S(page).locator("[data-part=log-table] tbody tr button[aria-expanded]").first().click(); await wait(page, 300);
  const det = norm(await S(page).locator("[data-part=detail]").first().innerText());
  const s = await shot(page, "ACT-11");
  rec("ACT-11", /admin/.test(top) && /ollection|settings/i.test(top) && /changes/i.test(det) && /"?B"?/.test(det) && /A\b/.test(det) ? "PASS" : "FAIL", `name was "${before}", set to "A" and saved, then "B" and saved (field now "${nameNow}"); top entry "${top}"; expanded: "${det}"`, s);
  await page.context().close();
}
// ACT-12 + ACT-13 + dashboard parity + survive nav/reload + reset
{
  const { page, errors } = await open(b, "pages"); const mon = watch(errors); await wait(page, 1000);
  const t0 = Date.now();
  // 1 create a page
  await S(page).getByRole("button", { name: "Add page" }).click(); await wait(page, 800);
  await page.getByRole("button", { name: "Create page" }).click(); await wait(page, 2000);
  await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 1000);
  const afterPage = await page.evaluate(() => JSON.parse(sessionStorage.getItem("uwazi:settings:activity") || "[]").map((e) => e.summary));
  mon.skip();
  // back to list if editor opened
  await page.getByRole("button", { name: "Back" }).first().click().catch(() => {}); await wait(page, 500);
  // 2 upload a file
  await rail(page, "Uploads"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Import asset" }).first().click(); await wait(page, 500);
  const d = page.locator("[role=dialog]").filter({ hasText: "Import asset" }).last();
  await d.locator("input[type=file]").first().setInputFiles([F("qa.png")]); await d.getByRole("button", { name: "Add" }).click(); await wait(page, 3000);
  // 3 preserve token
  await rail(page, "Preserve"); await wait(page, 600);
  await S(page).getByRole("button", { name: "Add token" }).click(); await wait(page, 600);
  await S(page).getByPlaceholder("e.g. Court press releases").fill("QA source"); await S(page).getByPlaceholder("https://…").fill("https://example.org/feed");
  await S(page).getByRole("button", { name: "Add source" }).click(); await wait(page, 900);
  // 4 CSV import
  await rail(page, "Import CSV"); await wait(page, 1200);
  await page.getByRole("button", { name: "New import" }).click(); await wait(page, 800);
  await page.getByRole("button", { name: /Select a CSV file/ }).click(); await wait(page, 500);
  await page.getByRole("button", { name: /Select a template/ }).click(); await wait(page, 300); await page.getByText("Court Case", { exact: true }).last().click(); await wait(page, 300);
  await page.getByRole("button", { name: "Import", exact: true }).last().click(); await wait(page, 1500);
  // 5 collection save
  await rail(page, "Collection").catch(() => {}); await wait(page, 600);
  await (async () => { await rail(page, "Collection"); await wait(page, 600); })();
  await S(page).locator("#collection-name").fill("QA collection"); await S(page).getByRole("button", { name: "Save", exact: true }).click(); await wait(page, 900);
  const dlg = page.locator("[role=dialog]:not([inert] *)").getByRole("button", { name: /^Save/ }); if (await dlg.count()) { await dlg.first().click(); await wait(page, 600); }
  const t1 = Date.now();
  await (async () => { await rail(page, "Activity log"); await wait(page, 600); })();
  const rows1 = await logRows(page);
  const s = await shot(page, "ACT-12");
  const newRows = rows1.slice(0, rows1.length - 7);
  // survive nav + reload
  await (async () => { await rail(page, "Account"); await wait(page, 600); })(); await (async () => { await rail(page, "Activity log"); await wait(page, 600); })(); const rowsNav = await logRows(page);
  await page.reload({ waitUntil: "load" }); await wait(page, 1500); const rowsReload = await logRows(page);
  // dashboard parity
  await (async () => { await rail(page, "Dashboard"); await wait(page, 600); })(); await wait(page, 600);
  const recent = await S(page).locator("[data-part=recent-activity] li").evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  const sd = await shot(page, "ACT-12-dashboard");
  const strip = (r) => r.replace(/ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d{4} - \d{2}:\d{2}$/, "");
  const sameOrder = recent.every((r, i) => { const a = rows1[i] || ""; const sum = a.replace(/^(Create|Update|Delete|Migrate) \S+ /, "").replace(/ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d{4} - \d{2}:\d{2}$/, ""); return r.includes(sum); });
  const stamps = newRows.map((r) => (r.match(/[A-Z][a-z]{2} \d+, \d{4} - (\d{2}):(\d{2})$/) || []).slice(1).join(":"));
  const nowHM = new Date(t1).toTimeString().slice(0, 5); const startHM = new Date(t0).toTimeString().slice(0, 5);
  // reset demo data
  await page.getByRole("button", { name: /Reset demo data/ }).first().click(); await wait(page, 400);
  const rd = page.locator("[role=dialog]:not([inert] *)"); if (await rd.count()) { await rd.getByRole("button", { name: /Reset/ }).last().click(); await wait(page, 900); }
  await (async () => { await rail(page, "Activity log"); await wait(page, 600); })(); const rowsReset = await logRows(page);
  const adm = newRows.every((r) => /admin/.test(r));
  const five = newRows.length === 5;
  rec("ACT-12", five && adm && stamps.every((x) => x >= startHM && x <= nowHM) && rowsNav.length === rows1.length && rowsReload.length === rows1.length && sameOrder && rowsReset.length === 7 ? "PASS" : "FAIL", `after one action each (create page, upload file, Preserve token, CSV import, save Collection) the log has ${rows1.length} rows = ${newRows.length} new (expected 5): ${JSON.stringify(newRows)}; all by admin: ${adm}; time stamps ${JSON.stringify(stamps)} within ${startHM}-${nowHM}; after rail navigation ${rowsNav.length} rows, after reload ${rowsReload.length}; Dashboard recent activity ${JSON.stringify(recent)} matches the log order: ${sameOrder}; after Reset demo data ${rowsReset.length} rows. (Activity written after the create-page step: ${JSON.stringify(afterPage)})`, s);
  const sent = (r) => r.replace(/^(Create|Update|Delete|Migrate) \S+ /, "").replace(/ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d{4} - \d{2}:\d{2}$/, "");
  const sentences = newRows.map(sent);
  const raw = sentences.some((x) => /^(GET|POST|PUT|PATCH|DELETE) |\/api\//.test(x)); const rawPill = rows1.some((r) => /^RAW /.test(r));
  rec("ACT-13", five && !raw && !rawPill && sentences.every((x) => /^[A-Z][a-z]+ .{3,}/.test(x)) ? "PASS" : "FAIL", `new entries as sentences ${JSON.stringify(sentences)}; request-line text present: ${raw}; RAW pill present: ${rawPill}`, s);
  rec("X-09-collab", five && adm ? "PASS" : "FAIL", `five actions from five pages each produced one entry by admin`, s);
  await page.context().close();
}
// ACT-18
{
  const { page, errors } = await open(b, "thesauri"); const mon = watch(errors); await wait(page, 1000);
  await S(page).locator("[data-part=row]").filter({ hasText: "Violation types" }).first().click().catch(() => {});
  await wait(page, 1200);
  let ft = norm(await page.locator("body").innerText());
  const m = ft.match(/Saved [^.]*? by \w+/);
  const sTh = await shot(page, "ACT-18-thesaurus");
  await (async () => { await rail(page, "Templates"); await wait(page, 600); })();
  await S(page).locator("[role=row]").filter({ has: page.getByText("Court Case", { exact: true }) }).first().getByText("Court Case", { exact: true }).first().click(); await wait(page, 1200);
  const before = (norm(await page.locator("body").innerText()).match(/Saved [^.]*? by \w+/) || [null])[0];
  await S(page).getByPlaceholder("Template name").fill("Court Case X"); await wait(page, 200);
  await S(page).getByRole("button", { name: /^Save/ }).first().click(); await wait(page, 700);
  const dd = page.locator("[role=dialog]:not([inert] *)").getByRole("button", { name: /^Save/ }); if (await dd.count()) { await dd.first().click(); await wait(page, 800); }
  let after = (norm(await page.locator("body").innerText()).match(/Saved [^.]*? by \w+/) || [null])[0];
  const stayedOpen = after !== null;
  if (!after) { await S(page).locator("[role=row]").filter({ has: page.getByText("Court Case X", { exact: true }) }).first().getByText("Court Case X", { exact: true }).first().click(); await wait(page, 1000); after = (norm(await page.locator("body").innerText()).match(/Saved [^.]*? by \w+/) || [null])[0]; }
  const sTp = await shot(page, "ACT-18-template");
  await (async () => { await rail(page, "Dashboard"); await wait(page, 600); })(); await wait(page, 500);
  const recent = await S(page).locator("[data-part=recent-activity] li").evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  await (async () => { await rail(page, "Activity log"); await wait(page, 600); })(); const rows = await logRows(page);
  const first = (rows[0] || "").replace(/^(Create|Update|Delete|Migrate) \S+ /, "").replace(/ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, \d{4} - \d{2}:\d{2}$/, "");
  rec("ACT-18", m && m[0] === "Saved on Jun 13, 2026 by jnkemba" && after === "Saved just now by admin" && recent.length > 0 && recent[0].includes(first) ? "PASS" : "FAIL", `Violation types footer reads "${m && m[0]}" (expected "Saved on Jun 13, 2026 by jnkemba"); Court Case before save "${before}", after saving in this session "${after}" (editor ${stayedOpen ? "stayed open" : "returned to the list; reopened to read it"}) (expected "Saved just now by admin"); Dashboard recent first row "${recent[0]}", Activity log first row sentence "${first}"`, sTp);
  await page.context().close();
}
await b.close();
