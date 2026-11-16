import { launch, open, S, shot, rail, dialogs, notifTitles } from "./lib.mjs";
import { viewLabel } from "./h.mjs";
import { toSettings, save, bodyText, added, clean } from "./common.mjs";
import { recorder, run, pf } from "./rec.mjs";
const r = recorder("col-c");
const b = await launch();
const pad = (n) => String(n).padStart(2, "0");
const sel = (p, id) => S(p).locator("#" + id);
const optionsOf = async (p, id) => { await sel(p, id).click(); await p.waitForTimeout(300); const o = await p.getByRole("option").allInnerTexts(); await p.keyboard.press("Escape"); await p.waitForTimeout(200); return o.map((t) => t.trim()); };

await run(r, "COL-10", async () => {
  const { page } = await open(b, "collection");
  const shown = (await sel(page, "default-view").innerText()).trim();
  const opts = await optionsOf(page, "default-view");
  const ids = await page.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id).filter((i) => i === "default-view" || i === "map-provider"));
  const dup = await page.evaluate(() => { const c = {}; document.querySelectorAll("[id]").forEach((e) => (c[e.id] = (c[e.id] || 0) + 1)); return Object.entries(c).filter(([, n]) => n > 1).map(([k]) => k); });
  const lab = await S(page).locator("label[for=default-view]").count();
  const role = await sel(page, "default-view").getAttribute("role");
  await shot(page, "COL-10");
  r.add("COL-10", pf(shown === "Cards" && opts.join() === "Cards,Map,Table" && !dup.length && lab === 1), `unset shows "${shown}"; options ${JSON.stringify(opts)}; label[for=default-view] count ${lab}; trigger role ${role}; ids ${JSON.stringify(ids)}; duplicate ids in document ${JSON.stringify(dup)}`, "COL-10");
  await page.context().close();
});

await run(r, "COL-11", async () => {
  const { page, errors } = await open(b, "collection");
  const out = [];
  let ok = true;
  const pick = async (label) => { await sel(page, "default-view").click(); await page.waitForTimeout(250); await page.getByRole("option", { name: label, exact: true }).click(); await page.waitForTimeout(200); };
  for (const v of ["Table", "Map", "Cards"]) {
    await pick(v); await save(page);
    await page.locator("button[data-part=library]").click(); await page.waitForTimeout(1500);
    const lib1 = await viewLabel(page);
    await page.reload(); await page.waitForTimeout(2500);
    const lib2 = await viewLabel(page);
    await shot(page, "COL-11-" + v);
    // switching view inside Library does not change the setting
    const other = v === "Cards" ? "List" : "Cards";
    const libLabel = { Table: "List", Map: "Map", Cards: "Cards" }[v];
    const isTable = await page.evaluate(() => !!document.querySelector("table, [role=table], [role=grid]"));
    await page.evaluate(() => {});
    const sw = await page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => /^(Cards|Table|List|Map|Timeline|Results)\b/i.test(x.innerText.trim()) && x.getBoundingClientRect().top < 120); b?.click(); return b?.innerText.trim(); }, other);
    await page.waitForTimeout(500);
    const opts = await page.evaluate(() => [...document.querySelectorAll('[role=option],[role=menuitem],[role=menuitemradio]')].filter(e => e.getBoundingClientRect().height).map((e) => e.innerText.trim()));
    const pickO = page.getByRole("option", { name: new RegExp("^" + other) });
    if (await pickO.count()) await pickO.first().click(); else await page.getByRole("menuitemradio", { name: new RegExp("^" + other) }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    const lib3 = await viewLabel(page);
    await toSettings(page, "Collection");
    const still = (await sel(page, "default-view").innerText()).trim();
    const good = lib1 && lib1.startsWith(libLabel) && lib2 && lib2.startsWith(libLabel) && (v !== "Table" || isTable) && lib3 !== libLabel && still === v;
    ok = ok && !!good;
    out.push(`${v}: (Library names its table view "List"; table element present=${isTable}) Library opens in "${lib1}", after reload "${lib2}"; switched in Library to "${lib3}"; Collection still shows "${still}"`);
  }
  r.add("COL-11", pf(ok), out.join("; "), "COL-11-Table");
  await page.context().close();
});

await run(r, "COL-12", async () => {
  const { page } = await open(b, "collection");
  const d = new Date();
  const y = d.getFullYear(), m = pad(d.getMonth() + 1), dd = pad(d.getDate());
  const want = [`${y}/${m}/${dd} (Year/Month/Day)`, `${dd}/${m}/${y} (Day/Month/Year)`, `${m}/${dd}/${y} (Month/Day/Year)`, `${y}-${m}-${dd} (Year-Month-Day)`, `${dd}-${m}-${y} (Day-Month-Year)`, `${m}-${dd}-${y} (Month-Day-Year)`];
  const shown = (await sel(page, "date-format").innerText()).trim();
  const opts = await optionsOf(page, "date-format");
  await shot(page, "COL-12");
  r.add("COL-12", pf(JSON.stringify(opts) === JSON.stringify(want) && shown === want[0]), `unset shows "${shown}"; options ${JSON.stringify(opts)}; expected ${JSON.stringify(want)}`, "COL-12");
  await page.context().close();
});

r.save();
await b.close();
