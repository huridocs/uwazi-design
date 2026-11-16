import { launch, open, S, shot, rail, dialogs } from "./lib.mjs";
import { switchTo, crumb, toSettings, viewLabel } from "./h.mjs";
import { recorder, run, pass } from "./rec.mjs";
const r = recorder("COL");
const b = await launch();
const save = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
const calm = (p) => p.waitForTimeout(6000); // the Beacon expands after a save and covers the navbar
const dlgTxt = (p) => p.locator("[data-component=ConfirmDialog]").innerText().then((t) => t.replace(/\s+/g, " ")).catch(() => "");

await run(r, "COL-04", async () => {
  const { page } = await open(b, "collection");
  await S(page).getByLabel("Collection name").fill("Test Archive"); await save(page);
  await calm(page);
  const crumbTxt = await crumb(page).innerText(); const aria = await crumb(page).getAttribute("aria-label"); const title = await page.title();
  await switchTo(page, "CEJIL"); await toSettings(page, "Collection");
  const cejil = await S(page).getByLabel("Collection name").inputValue();
  await switchTo(page, "Sample"); await toSettings(page, "Collection");
  const back = await S(page).getByLabel("Collection name").inputValue();
  await page.evaluate(() => sessionStorage.setItem("uwazi:appView", JSON.stringify("login"))); await page.reload(); await page.waitForTimeout(1200);
  const login = (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 300);
  await shot(page, "COL-04-login");
  const ok = /Test Archive/.test(crumbTxt + aria) && /Test Archive/.test(login) && back === "Test Archive" && cejil !== "Test Archive";
  r("COL-04", pass(ok), `after Save (no reload): navbar crumb text "${crumbTxt}" (aria "${aria}"; the crumb shows the data source, not the collection name), window title "${title}". CEJIL name "${cejil}"; back on Sample "${back}". Login screen shows Test Archive: ${/Test Archive/.test(login)} (text: "${login.slice(0, 120)}")`, "COL-04-login");
  await page.context().close();
});

await run(r, "COL-11", async () => {
  const out = []; let ok = true;
  for (const v of ["Table", "Map", "Cards"]) {
    const { page } = await open(b, "collection");
    await S(page).getByRole("radio", { name: v }).check({ force: true });
    await save(page); await calm(page);
    await page.locator("nav").getByText("Library", { exact: true }).first().click(); await page.waitForTimeout(1800);
    const vl = await viewLabel(page); await shot(page, "COL-11-" + v);
    await page.reload(); await page.waitForTimeout(2000);
    const vl2 = await viewLabel(page);
    out.push(`${v} (Library calls the table view "List"): Library view button "${vl}", after reload "${vl2}"`);
    if (!((v==="Table"?/List|Table/:new RegExp(v,"i")).test(vl || "") && (v==="Table"?/List|Table/:new RegExp(v,"i")).test(vl2 || ""))) ok = false;
    await page.context().close();
  }
  r("COL-11", pass(ok), out.join("; "), "COL-11-Table");
});

await run(r, "X-02", async () => {
  const { page } = await open(b, "collection");
  await S(page).getByLabel("Collection name").fill("Dirty");
  await rail(page, "Menu"); await page.waitForTimeout(400);
  const d1 = await dialogs(page); const t = await dlgTxt(page); await shot(page, "X-02-COL");
  const btns = await page.locator("[data-component=ConfirmDialog] button").allInnerTexts();
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /Keep editing|Cancel/ }).click(); await page.waitForTimeout(300);
  const keep = (await S(page).getByLabel("Collection name").inputValue()) === "Dirty";
  await rail(page, "Menu"); await page.waitForTimeout(300);
  await page.locator("[data-component=ConfirmDialog]").getByRole("button", { name: /^Discard/ }).click(); await page.waitForTimeout(400);
  const onMenu = /Links shown in the top navigation/.test(await S(page).innerText());
  await rail(page, "Collection"); await page.waitForTimeout(300);
  const gone = (await S(page).getByLabel("Collection name").inputValue()) !== "Dirty";
  await rail(page, "Menu"); await page.waitForTimeout(300);
  const clean = (await dialogs(page)).length === 0;
  // other routes: back arrow, navbar link, data source switch
  await rail(page, "Collection"); await page.waitForTimeout(200);
  await S(page).getByLabel("Collection name").fill("Dirty2");
  await switchTo(page, "CEJIL");
  const back = (await dialogs(page)).length > 0;
  r("X-02", "FAIL", `Guard works (rail click while dirty opens a dialog; keep-editing keeps the edit: ${keep}; discard navigates (Menu shown: ${onMenu}) and edit gone: ${gone}; no dialog when clean: ${clean}; switching data source opens dialog: ${back}) but copy differs from the checklist: saw "${t}" with buttons ${JSON.stringify(btns)}; expected title "Discard changes?", body "You have unsaved changes. Do you want to continue?", buttons "Cancel" and "Discard changes"`, "X-02-COL");
  await page.context().close();
});

await run(r, "X-13", async () => {
  const { page } = await open(b, "collection");
  const names = { Sample: await S(page).getByLabel("Collection name").inputValue() };
  for (const [src, label] of [["CEJIL", "CEJIL"], ["Best Artworks", "Best Artworks"]]) {
    await switchTo(page, src); await toSettings(page, "Collection");
    names[src] = await S(page).getByLabel("Collection name").inputValue();
  }
  await switchTo(page, "Sample"); await toSettings(page, "Collection");
  const back = await S(page).getByLabel("Collection name").inputValue();
  r("X-13", pass(new Set(Object.values(names)).size === 3 && back === names.Sample), `Collection name per data source: ${JSON.stringify(names)}; back on Sample "${back}"`);
  await page.context().close();
});
await b.close();
