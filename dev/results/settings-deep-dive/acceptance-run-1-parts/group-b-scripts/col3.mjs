import { launch, open, S, shot, rail } from "./lib.mjs";
import { toSettings, viewLabel } from "./h.mjs";
import { recorder, run, pass } from "./rec.mjs";
const r = recorder("COL");
const b = await launch();
await run(r, "COL-11", async () => {
  const { page } = await open(b, "collection"); const out = []; let ok = true;
  for (const v of ["Table", "Map", "Cards"]) {
    await S(page).getByRole("radio", { name: v }).check({ force: true });
    await S(page).getByRole("button", { name: "Save", exact: true }).click(); await page.waitForTimeout(6000);
    await page.locator("nav").getByText("Library", { exact: true }).first().click(); await page.waitForTimeout(2000);
    const vl = await viewLabel(page); await shot(page, "COL-11-" + v);
    await page.reload(); await page.waitForTimeout(2200); const vl2 = await viewLabel(page);
    await toSettings(page, "Collection");
    const still = await S(page).getByRole("radio", { name: v }).isChecked();
    const exp = v === "Table" ? /List|Table/ : new RegExp(v);
    out.push(`${v}: Library view button "${vl}", after reload "${vl2}", radio still checked on return: ${still}`);
    if (!(exp.test(vl) && exp.test(vl2) && still)) ok = false;
  }
  await page.locator("nav").getByText("Library", { exact: true }).first().click(); await page.waitForTimeout(2000);
  await page.getByText("Cards", { exact: true }).first().click(); await page.waitForTimeout(400);
  await page.locator("[role=option]").filter({ hasText: /^Map/ }).first().click(); await page.waitForTimeout(800);
  await toSettings(page, "Collection");
  const unchanged = await S(page).getByRole("radio", { name: "Cards" }).isChecked();
  if (!unchanged) ok = false;
  r("COL-11", pass(ok), out.join("; ") + `. Library labels the table view "List". Switching view inside the Library to Map left the setting on Cards: ${unchanged}`, "COL-11-Table");
  await page.context().close();
});
await b.close();
