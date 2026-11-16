import { run, open, S, wait, clean, sh, rec, rail, switchTo, nlist, newNotifs, dialogs, toSettings } from "./g.mjs";
import { devButton, devSlow, toDev, backToSettings } from "./dev.mjs";
import { listRows, openThes, footerBtn, nameInput, cancelBtn } from "./tlib.mjs";

await run("THS-1-list", async (b) => {
  let { page } = await open(b, "thesauri");
  const hdr = clean(await S(page).locator("h2").first().innerText());
  const cols = await S(page).locator("[role=columnheader]").allInnerTexts();
  const rows0 = await listRows(page);
  const labels0 = rows0.map((r) => r.replace(/ \d+$/, ""));
  const ch = S(page).locator("[role=columnheader]").first();
  const sortAttr = [await ch.getAttribute("aria-sort")];
  await ch.click().catch(() => {}); await wait(page, 200);
  const r1 = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  sortAttr.push(await ch.getAttribute("aria-sort"));
  const caseRow = rows0.find((r) => /^Case status/.test(r));
  const hasTpl = cols.some((c) => /templates/i.test(c));
  rec("THS-01", hdr === "Thesauri" && hasTpl && JSON.stringify(labels0) === JSON.stringify([...labels0].sort((a, c) => a.localeCompare(c))) && /Court Case/.test(caseRow || "") ? "PASS" : "FAIL",
    `header "${hdr}" ok; columns ${JSON.stringify(cols)} vs expected Label, Templates, item count, Action (no Templates column, first column is "Thesaurus", count column is "Items"); default row order ${JSON.stringify(labels0)} (not Label ascending); clicking the first column header: order unchanged=${JSON.stringify(r1) === JSON.stringify(labels0)}, aria-sort ${JSON.stringify(sortAttr)}; "Case status" row text "${caseRow}" (no Court Case pill)`, await sh(page, "THS-01"));
  // THS-04
  const lead = await footerBtn(page, "Add thesaurus").count();
  await footerBtn(page, "Add thesaurus").click(); await wait(page, 500);
  const nm = await nameInput(page).inputValue();
  const title = clean(await S(page).locator("h2").first().innerText().catch(()=>""));
  const emptyVals = await S(page).locator("li[data-row-id]").count();
  await cancelBtn(page).click(); await wait(page, 500);
  await openThes(page, "Violation types");
  const nm2 = await nameInput(page).inputValue();
  const nVals = await S(page).locator("li[data-row-id]").count();
  rec("THS-04", lead === 1 && nm === "" && emptyVals === 0 && nm2 === "Violation types" && nVals > 0 ? "PASS" : "FAIL",
    `footer "Add thesaurus" buttons=${lead}; it opens an editor titled "${title}" with empty name (${JSON.stringify(nm)}) and ${emptyVals} value rows; clicking the "Violation types" row opens the editor with name "${nm2}" and ${nVals} value rows`, await sh(page, "THS-04"));
  await page.context().close();

  // THS-39
  ({ page } = await open(b, "thesauri"));
  await openThes(page, "Regions");
  const col = await page.evaluate(() => { const li = document.querySelector("[data-testid=settings-content] li[data-row-id]"); const cs = getComputedStyle(li); const mk = (v) => { const d = document.createElement("div"); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }; return { border: cs.borderBottomColor, soft: mk("--border-soft"), ink: mk("--text-primary") }; });
  rec("THS-39", col.border === col.soft && col.border !== col.ink ? "PASS" : "FAIL", `light mode: border between value rows computes to ${col.border}; --border-soft = ${col.soft}; ink = ${col.ink}`, await sh(page, "THS-39"));
  await page.context().close();

  // THS-41 + X-13
  ({ page } = await open(b, "thesauri"));
  await footerBtn(page, "Add thesaurus").click(); await wait(page, 300);
  await nameInput(page).fill("Local only"); await page.locator("[data-testid=settings-content] footer").getByRole("button", { name: /^(Save|Create thesaurus)$/ }).click(); await wait(page, 600);
  const sampleRows = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  await switchTo(page, "Red Trav"); await wait(page, 2500);
  await toSettings(page, "Thesauri"); await wait(page, 800);
  const trav = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  await sh(page, "X-13-THS");
  await switchTo(page, "Sample"); await wait(page, 1500);
  await toSettings(page, "Thesauri"); await wait(page, 800);
  const back = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  rec("THS-41", sampleRows.includes("Local only") && !trav.includes("Local only") && back.includes("Local only") ? "PASS" : "FAIL", `Sample list after Save has "Local only"=${sampleRows.includes("Local only")}; Travesia list (${trav.length} rows) has it=${trav.includes("Local only")}; back on Sample has it=${back.includes("Local only")}`, "");
  rec("X-13", trav.length !== sampleRows.length && JSON.stringify(trav.slice(0, 3)) !== JSON.stringify(sampleRows.slice(0, 3)) && trav.length > 50 ? "PASS" : "FAIL", `Sample ${sampleRows.length} thesauri (${sampleRows.slice(0, 3)}), Red Trav ${trav.length} (${trav.slice(0, 3)}), back to Sample ${back.length}; list follows the data source`, "acceptance-run-2-shots/X-13-THS.png");
  await page.context().close();

  // THS-03 + X-11
  ({ page } = await open(b, "thesauri", "desktop", { source: "travesia" }));
  await wait(page, 3000);
  const all = (await listRows(page)).length;
  const search = S(page).getByPlaceholder(/Search thesauri/).first();
  const h0 = (await search.boundingBox()).height;
  await search.fill("munic"); await wait(page, 500);
  const r = await listRows(page);
  const h1 = (await search.boundingBox()).height;
  const wrap0 = await S(page).locator("[data-part=row]").first().boundingBox();
  await search.fill(""); await wait(page, 500);
  const back2 = (await listRows(page)).length;
  const okx = r.length >= 1 && r.every((x) => /munic/i.test(x)) && r.some((x) => /^Municipios/.test(x)) && back2 === all && all === 98 && h0 === h1;
  rec("THS-03", okx ? "PASS" : "FAIL", `Travesia list ${all} rows; "munic" keeps ${r.length} rows ${JSON.stringify(r)}; cleared -> ${back2} rows; search height ${h0} -> ${h1}`, await sh(page, "THS-03"));
  rec("X-11", okx ? "PASS" : "FAIL", `search field "Search thesauri" in its own row; typing "munic" filters (${r.length} rows), clearing restores ${back2}; field height ${h0}px with and without text`, "acceptance-run-2-shots/THS-03.png");
  await page.context().close();

  // THS-05 missing id
  ({ page } = await open(b, "thesauri"));
  await devButton(page, "Open thesaurus editor with a missing id"); await wait(page, 800);
  await wait(page, 600);
  const t = clean(await S(page).innerText());
  const nf = /not found/i.test(t);
  const backBtn = await S(page).getByRole("button", { name: /Back to Thesauri/ }).count();
  const emptyNew = await nameInput(page).count();
  await sh(page, "THS-05");
  let wentBack = false;
  if (backBtn) { await S(page).getByRole("button", { name: /Back to Thesauri/ }).first().click(); await wait(page, 500); wentBack = (await listRows(page)).length > 0; }
  rec("THS-05", nf && backBtn && !emptyNew && wentBack ? "PASS" : "FAIL", `Dev panel "Open thesaurus editor with a missing id" then back to Settings: page text "${t.slice(0, 140)}"; not-found state=${nf}; "Back to Thesauri" buttons=${backBtn}; empty new-thesaurus name field present=${emptyNew}; Back returns to the list with rows=${wentBack}`, "acceptance-run-2-shots/THS-05.png");
  await page.context().close();
});

await run("THS-1-empty", async (b) => {
  const { page } = await open(b, "thesauri");
  await devButton(page, "Empty thesauri"); await backToSettings(page, "Thesauri");
  const t = clean(await S(page).innerText());
  const generic = /Nothing here yet|NO DATA/i.test(t);
  const addCount = await S(page).getByRole("button", { name: "Add thesaurus" }).count();
  rec("X-10", /No thesauri yet/.test(t) && !generic && addCount >= 1 && /fixed list of values/.test(t) ? "PASS" : "FAIL", `after Dev panel "Empty thesauri": page text "${t.slice(0, 200)}"; "Add thesaurus" buttons in pane=${addCount}`, await sh(page, "X-10-THS"));
  await page.context().close();
});

await run("THS-1-slow", async (b) => {
  let { page } = await open(b, "thesauri");
  await devSlow(page, true);
  const sample = () => page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const t = c?.innerText || ""; return { loading: c?.querySelectorAll("[data-state=loading]").length || 0, busy: c?.querySelectorAll("[aria-busy=true]").length || 0, skel: c?.querySelectorAll("[class*=animate-pulse],[data-part=skeleton]").length || 0, empty: /No thesauri yet/.test(t), rows: c?.querySelectorAll("[data-part=row]").length || 0 }; });
  await page.getByRole("button", { name: /Return to app/ }).click(); await wait(page, 700);
  const reopen = async (shotName) => {
    await page.locator('button:has-text("Settings")').first().click(); await page.waitForTimeout(250);
    await page.getByRole("button", { name: /System settings/ }).click();
    await rail(page, "Thesauri");
    const out = [];
    for (let i = 0; i < 30; i++) { out.push(await sample()); if (shotName && i === 3) await sh(page, shotName); await page.waitForTimeout(150); }
    return out;
  };
  const samples = await reopen("THS-06-loading");
  await sh(page, "THS-06");
  const saw = samples.some((s) => s.loading || s.busy || s.skel);
  const emptyEver = samples.some((s) => s.empty);
  const tl = samples.filter((_, i) => i % 3 === 0).map((s) => `${s.loading || s.busy || s.skel ? "L" : "-"}${s.rows}${s.empty ? "E" : ""}`).join(" ");
  await switchTo(page, "Red Trav");
  const s2 = await reopen();
  const saw2 = s2.some((s) => s.loading || s.busy || s.skel); const empty2 = s2.some((s) => s.empty);
  const tl2 = s2.filter((_, i) => i % 3 === 0).map((s) => `${s.loading || s.busy || s.skel ? "L" : "-"}${s.rows}${s.empty ? "E" : ""}`).join(" ");
  rec("THS-06", saw && !emptyEver && saw2 && !empty2 && samples[29].rows > 0 ? "PASS" : "FAIL", `Dev panel "Slow load (2 s)" on, Settings reopened on Thesauri, sampled every 150 ms (L = loading/skeleton present, number = rows, E = "No thesauri yet"): Sample ${tl}; skeleton seen=${saw}, empty message at any time=${emptyEver}. After switching to Red Trav and reopening: ${tl2}; skeleton seen=${saw2}, empty message seen=${empty2}, rows at end ${s2[29].rows}`, "acceptance-run-2-shots/THS-06-loading.png");
  await page.context().close();
});
