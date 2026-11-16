import { run, open, openFast, S, wait, clean, sh, dialogs, rec, realErrors, dataRows, openRow, lead, switchTo, toSettings, rail, guardInfo } from "./g.mjs";
const only = process.argv[2]; const want = (k) => !only || only === k;

if (want("a")) await run("THS-list", async (b) => {
  let { page } = await open(b, "thesauri");
  const head = clean(await S(page).locator("h2").first().innerText());
  const cols = await S(page).locator("[role=columnheader]").allInnerTexts();
  const r0 = (await dataRows(page)).map((r) => r.replace(/ \d+$/, ""));
  const sorted = [...r0].sort((a, b) => a.localeCompare(b));
  const pills = await S(page).locator("[data-column=templates]").count();
  // header click cycles?
  const hdr = S(page).locator("[role=columnheader]").first();
  await hdr.click(); await wait(page, 200);
  const sortAttr = await hdr.getAttribute("aria-sort");
  const after = (await dataRows(page)).map((r) => r.replace(/ \d+$/, ""));
  rec("THS-01", "FAIL", `header "${head}"; columns ${JSON.stringify(cols)} (expected Label, Templates, item count, Action); default row order ${JSON.stringify(r0)} (not Label ascending); Label header click changes order=${JSON.stringify(after) !== JSON.stringify(r0)}, aria-sort="${sortAttr}"; Templates column/pills present=${pills > 0}`, await sh(page, "THS-01"));

  // THS-04
  const leadBtn = await lead(page, "Add thesaurus").count();
  await lead(page, "Add thesaurus").click(); await wait(page, 400);
  const t1 = clean(await S(page).innerText());
  const nameVal = await S(page).locator("input").first().inputValue();
  const items0 = await S(page).locator('[aria-label="Item label"]').count();
  await S(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 400);
  await openRow(page, "Violation types");
  const nv = await S(page).locator("input").first().inputValue();
  const iv = await S(page).locator('[aria-label="Item label"]').count();
  rec("THS-04", leadBtn && !nameVal && items0 === 0 && nv === "Violation types" && iv > 0 ? "PASS" : "FAIL", `footer "Add thesaurus" lead button count=${leadBtn}; opens empty editor (name "${nameVal}", ${items0} item rows, title text "${t1.slice(0, 40)}"); clicking the row "Violation types" opens the editor with name "${nv}" and ${iv} item inputs`, await sh(page, "THS-04"));
  await page.context().close();

  // THS-41 and THS-40
  ({ page } = await open(b, "thesauri"));
  await lead(page, "Add thesaurus").click(); await wait(page, 400);
  await S(page).locator("input").first().fill("Local only"); await wait(page, 150);
  await S(page).getByRole("button", { name: "Add item" }).first().click(); await wait(page, 150);
  await S(page).locator('[aria-label="Item label"]').first().fill("One");
  await S(page).getByRole("button", { name: /Create thesaurus|Save/ }).last().click(); await wait(page, 600);
  const inSample = (await dataRows(page)).some((r) => /Local only/.test(r));
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 300);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Red Trav" }).click(); await wait(page, 2500);
  await toSettings(page, "Thesauri"); await wait(page, 4000);
  const trav = await dataRows(page);
  const inTrav = trav.some((r) => /Local only/.test(r));
  await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 300);
  await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Sample" }).click(); await wait(page, 1500);
  await toSettings(page, "Thesauri"); await wait(page, 1000);
  const back = (await dataRows(page)).some((r) => /Local only/.test(r));
  rec("THS-41", inSample && !inTrav && back ? "PASS" : "FAIL", `created "Local only"; in Sample list=${inSample}; in Travesia list (${trav.length} rows)=${inTrav}; back on Sample=${back}`, await sh(page, "THS-41"));
  await page.context().close();
});

if (want("b")) await run("THS-trav", async (b) => {
  // THS-03 search on Travesia; THS-06 loading
  let { page, errors } = await openFast(b, "thesauri", { source: "travesia" });
  const states = []; let last = "";
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const st = await page.evaluate(() => {
      const c = document.querySelector('[data-testid=settings-content]');
      if (!c) return "no-settings";
      const loading = !!c.querySelector('[data-state=loading]');
      const empty = /No thesauri yet/.test(c.innerText);
      const n = [...c.querySelectorAll("[role=row]")].filter((r) => !r.querySelector("[role=columnheader]")).length;
      return `loading=${loading} emptyMsg=${empty} rows=${n}`;
    }).catch(() => "nav");
    if (st !== last) { states.push(`${Date.now() - t0}ms ${st}`); last = st; }
    if (/rows=9\d|rows=\d{3}/.test(st) && !/loading=true/.test(st)) { await wait(page, 300); break; }
    await page.waitForTimeout(40);
  }
  const everEmpty = states.some((s) => /emptyMsg=true/.test(s));
  const everLoading = states.some((s) => /loading=true/.test(s));
  await wait(page, 3000);
  const all = await dataRows(page);
  const tb = await S(page).locator('[data-component=SettingsToolbar]').boundingBox();
  const search = S(page).getByRole("searchbox").or(S(page).locator('input[aria-label="Search thesauri"]')).first();
  await search.fill("munic"); await wait(page, 400);
  const hit = await dataRows(page);
  const tb2 = await S(page).locator('[data-component=SettingsToolbar]').boundingBox();
  await search.fill(""); await wait(page, 400);
  const restored = (await dataRows(page)).length;
  const ok = hit.length > 0 && hit.every((r) => /munic/i.test(r)) && hit.some((r) => /Municipios/.test(r)) && restored === all.length && tb.height === tb2.height;
  rec("THS-03", ok ? "PASS" : "FAIL", `Travesia list ${all.length} rows; "munic" keeps ${hit.length} rows ${JSON.stringify(hit.map((r) => r.slice(0, 30)))}; cleared -> ${restored} rows; search row height ${tb.height} -> ${tb2.height}`, await sh(page, "THS-03"));
  await page.context().close();
});
