import { guardBtn, guardInfo, run, open, S, wait, clean, sh, dialogs, rec, realErrors, nlist, newNotifs, rail, switchTo, toSettings, logEntries, openFast } from "./g.mjs";
import { arm, devButton, devSlow, toDev, backToSettings } from "./dev.mjs";
import { footerBtn, nameInput, commitBtn, cancelBtn, listRows, openThes, newThes, vrows, addVals, saveThes, guard, makeThes } from "./tlib.mjs";

await run("THS-a", async (b) => {
  // THS-01, THS-04, THS-39 (list), THS-02 observation
  let { page } = await open(b, "thesauri");
  const hdr = clean(await S(page).locator("h2").first().innerText());
  const cols = await S(page).locator("[role=columnheader]").allInnerTexts();
  const rows0 = await listRows(page);
  const labels0 = rows0.map((r) => r.replace(/ \d+$/, ""));
  const asc = JSON.stringify(labels0) === JSON.stringify([...labels0].sort((a, c) => a.localeCompare(c)));
  const ch = S(page).locator("[role=columnheader]").first();
  const sortAttr = [await ch.getAttribute("aria-sort")];
  await ch.click().catch(() => {}); await wait(page, 200);
  const r1 = (await listRows(page)).map((r) => r.replace(/ \d+$/, ""));
  sortAttr.push(await ch.getAttribute("aria-sort"));
  const pillsCase = /Court Case/.test(rows0.find((r) => /^Case status/.test(r)) || "");
  rec("THS-01", hdr === "Thesauri" && cols.some((c) => /label/i.test(c)) && cols.some((c) => /templates/i.test(c)) && asc && pillsCase && JSON.stringify(r1) !== JSON.stringify(labels0) ? "PASS" : "FAIL",
    `header "${hdr}"; columns ${JSON.stringify(cols)} (expected Label, Templates, item count, Action); default row order ${JSON.stringify(labels0)} (Label ascending=${asc}); Label header click changes order=${JSON.stringify(r1) !== JSON.stringify(labels0)}, aria-sort ${JSON.stringify(sortAttr)}; "Case status" row shows a Court Case template pill=${pillsCase} (row text "${rows0.find((r) => /^Case status/.test(r))}")`, await sh(page, "THS-01"));
  // THS-02: bound state observable?
  const tp = await open(b, "templates"); await wait(tp.page, 800);
  await tp.page.locator("[data-part=row]").filter({ hasText: "Court Case" }).first().click(); await wait(tp.page, 700);
  const statusRow = clean(await tp.page.locator('[data-testid=settings-content] [data-part=row]').filter({ hasText: "Case status" }).first().innerText().catch(() => ""));
  await tp.ctx.close();
  rec("THS-02", "FAIL", `Court Case's "Status" property is bound to "Case status" (template editor row: "${statusRow.slice(0, 60)}"), and the Thesauri list row for Case status reads "${rows0.find((r) => /^Case status/.test(r))}": no Templates pill exists in the list, so binding or unbinding a property cannot change any pill (the Templates column is absent, see THS-01)`, "");
  // THS-04
  const lead = await footerBtn(page, "Add thesaurus").count();
  await footerBtn(page, "Add thesaurus").click(); await wait(page, 500);
  const nm = await nameInput(page).inputValue(); const nVals = (await vrows(page)).length;
  const title = clean(await S(page).locator("h2").first().innerText());
  await cancelBtn(page).click(); await wait(page, 500);
  await openThes(page, "Violation types");
  const nm2 = await nameInput(page).inputValue(); const vr = await vrows(page);
  rec("THS-04", lead === 1 && nm === "" && nVals === 0 && nm2 === "Violation types" && vr.length > 0 ? "PASS" : "FAIL",
    `footer "Add thesaurus" count=${lead}; opens editor titled "${title}" with name "${nm}" and ${nVals} value rows; clicking the "Violation types" row opens the editor with name "${nm2}" and ${vr.length} value rows (first ${JSON.stringify(vr.slice(0, 3))}). (The row's own Edit action is the whole row.)`, await sh(page, "THS-04"));
  await page.context().close();

  // THS-39
  ({ page } = await open(b, "thesauri"));
  await openThes(page, "Regions");
  const col = await page.evaluate(() => { const li = document.querySelector("[data-testid=settings-content] li[data-row-id]"); const cs = getComputedStyle(li); const root = getComputedStyle(document.documentElement); return { border: cs.borderBottomColor, soft: root.getPropertyValue("--border-soft").trim(), cls: li.className.match(/border-border-soft/)?.[0] }; });
  const probe = await page.evaluate(() => { const d = document.createElement("div"); d.style.color = "var(--border-soft)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); const e = document.createElement("div"); e.style.color = "var(--text-primary)"; document.body.append(e); const ink = getComputedStyle(e).color; e.remove(); return { soft: c, ink }; });
  rec("THS-39", col.border === probe.soft && col.border !== probe.ink ? "PASS" : "FAIL", `border between value rows computes to ${col.border}; --border-soft computes to ${probe.soft}; ink ${probe.ink}; row class has border-border-soft=${!!col.cls}`, await sh(page, "THS-39"));
  await page.context().close();
});

await run("THS-b", async (b) => {
  // THS-03 Travesia search
  let { page } = await open(b, "thesauri", "desktop", { source: "travesia" });
  await wait(page, 3000);
  const all = (await listRows(page)).length;
  const search = S(page).getByRole("searchbox").or(S(page).getByPlaceholder(/Search thesauri/)).first();
  const h0 = (await search.boundingBox()).height;
  await search.fill("munic"); await wait(page, 500);
  const r = (await listRows(page));
  const h1 = (await search.boundingBox()).height;
  await search.fill(""); await wait(page, 500);
  const back = (await listRows(page)).length;
  rec("THS-03", r.length >= 1 && r.every((x) => /munic/i.test(x)) && r.some((x) => /^Municipios/.test(x)) && back === all && all === 98 && h0 === h1 ? "PASS" : "FAIL", `Travesia list ${all} rows; "munic" keeps ${r.length} rows ${JSON.stringify(r)}; cleared -> ${back} rows; search row height ${h0} -> ${h1}`, await sh(page, "THS-03"));
  await page.context().close();

  // THS-05 missing id via Dev panel
  ({ page } = await open(b, "thesauri"));
  await devButton(page, "Open thesaurus editor with a missing id"); await wait(page, 800);
  const t = clean(await S(page).innerText());
  const nf = /not found/i.test(t);
  const backBtn = await S(page).getByRole("button", { name: /Back to Thesauri/ }).count();
  const emptyNew = await nameInput(page).count();
  await sh(page, "THS-05");
  let wentBack = false;
  if (backBtn) { await S(page).getByRole("button", { name: /Back to Thesauri/ }).first().click(); await wait(page, 500); wentBack = /Add thesaurus/.test(clean(await S(page).innerText())) && (await listRows(page)).length > 0; }
  rec("THS-05", nf && backBtn && !emptyNew && wentBack ? "PASS" : "FAIL", `Dev panel "Open thesaurus editor with a missing id": page text "${t.slice(0, 120)}"; not-found state=${nf}; "Back to Thesauri" buttons=${backBtn}; empty new-thesaurus name field present=${emptyNew}; Back returns to the list=${wentBack}`, "acceptance-run-2a-shots/THS-05.png");
  await page.context().close();
});

await run("THS-c", async (b) => {
  // THS-06 slow load
  let { page, errors } = await open(b, "thesauri");
  await devSlow(page, true);
  const sample = () => page.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); const t = c?.innerText || ""; return { loading: c?.querySelectorAll("[data-state=loading]").length || 0, busy: c?.querySelectorAll("[aria-busy=true]").length || 0, empty: /No thesauri yet/.test(t), rows: c?.querySelectorAll("[data-part=row]").length || 0, h: t.slice(0, 12) }; });
  const reopen = async (src) => {
    await page.locator('button:has-text("Settings")').first().click(); await page.waitForTimeout(250);
    await page.getByRole("button", { name: /System settings/ }).click();
    await rail(page, "Thesauri");
    const out = [];
    for (let i = 0; i < 30; i++) { out.push(await sample()); await page.waitForTimeout(150); }
    return out;
  };
  await page.getByRole("button", { name: /Return to app/ }).click(); await wait(page, 700);
  const samples = await reopen();
  await sh(page, "THS-06");
  const sawSkeleton = samples.some((s) => s.loading || s.busy);
  const emptyEver = samples.some((s) => s.empty);
  const last = samples[samples.length - 1];
  const tl = samples.filter((_, i) => i % 3 === 0).map((s) => `${s.loading || s.busy ? "L" : "-"}${s.rows}${s.empty ? "E" : ""}`).join(" ");
  const firstDone = samples.findIndex((s) => !(s.loading || s.busy) && s.rows > 0);
  // then Travesia from Thesauri
  await switchTo(page, "Red Trav");
  const s2 = await reopen();
  const trav = s2.some((s) => s.loading || s.busy); const travEmptyAny = s2.some((s) => s.empty); const travEnd = s2[s2.length - 1].rows;
  const tl2 = s2.filter((_, i) => i % 3 === 0).map((s) => `${s.loading || s.busy ? "L" : "-"}${s.rows}${s.empty ? "E" : ""}`).join(" ");
  rec("THS-06", sawSkeleton && !emptyEver && last.rows > 0 && trav && !travEmptyAny ? "PASS" : "FAIL", `Dev panel "Slow load (2 s)" on, Settings reopened on Thesauri (samples every 150ms, shown every 3rd; L=loading rows, number=rows, E=empty message): Sample ${tl}; skeleton seen=${sawSkeleton}; loading ends at sample ${firstDone} (~${firstDone * 150}ms after the click on Thesauri); "No thesauri yet" shown at any time=${emptyEver}; rows at the end=${last.rows}. After switching the data source to Red Trav (Travesia) and reopening Settings: ${tl2}; skeleton seen=${trav}, empty message at any time=${travEmptyAny}, rows at end=${travEnd}`, "acceptance-run-2a-shots/THS-06.png");
  await page.context().close();
});
