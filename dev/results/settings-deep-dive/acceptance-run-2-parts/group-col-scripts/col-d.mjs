import { launch, open, S, shot, rail, dialogs, notifTitles } from "./lib.mjs";
import { toSettings, save } from "./common.mjs";
import { recorder, run, pf } from "./rec.mjs";
const r = recorder("col-d");
const b = await launch();

await run(r, "COL-13", async () => {
  const { page, errors } = await open(b, "collection");
  const out = []; let ok = true;
  const cases = [["dd/MM/yyyy", /^05\/10\/2026/, "08/05/2006", "21/01/2010", "dd/mm/yyyy"], ["MM-dd-yyyy", /^10-05-2026/, "05-08-2006", "01-21-2010", "mm-dd-yyyy"]];
  for (const [name, optRe, petition, submitted, ph] of cases) {
    await S(page).locator("#date-format").click(); await page.waitForTimeout(250);
    await page.getByRole("option", { name: optRe }).click(); await save(page);
    await page.locator("button[data-part=library]").click(); await page.waitForTimeout(2000);
    const filterInputs = await page.evaluate(() => [...document.querySelectorAll("[data-component=DateInput] input")].filter((i) => i.placeholder).map((i) => i.placeholder));
    const card = page.locator("[data-component=EntityCard]").filter({ hasText: "Case 11.481" }).first();
    const cardTxt = (await card.innerText()).replace(/\n+/g, " | ");
    // type a date in the From filter and read it back
    const from = page.getByLabel("From date").first();
    await from.fill(petition); await from.blur(); await page.waitForTimeout(500);
    const fromBack = await from.inputValue();
    await from.fill("");
    await card.getByRole("button", { name: "Open", exact: true }).click(); await page.waitForTimeout(1500);
    await page.getByText("Metadata", { exact: true }).first().click(); await page.waitForTimeout(1000);
    const meta = (await page.locator("body").innerText()).replace(/\n+/g, " | ");
    const metaHas = meta.includes(petition) && meta.includes(submitted);
    await shot(page, "COL-13-meta-" + name.replace(/\W/g, ""));
    await page.getByRole("button", { name: "Edit", exact: true }).first().click(); await page.waitForTimeout(1200);
    const editInputs = await page.evaluate(() => [...document.querySelectorAll("[data-component=DateInput] input")].filter((i) => i.placeholder && i.value).map((i) => `${i.placeholder}:${i.value}`));
    await shot(page, "COL-13-edit-" + name.replace(/\W/g, ""));
    const editHas = editInputs.some((x) => x.endsWith(":" + petition)) && editInputs.some((x) => x.endsWith(":" + submitted));
    // cancel the edit
    await page.getByRole("button", { name: /^Cancel$/ }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const good = cardHas(cardTxt, petition) && metaHas && editHas && filterInputs.every((p) => p === ph) && fromBack === petition;
    ok = ok && good;
    out.push(`${name}: Library card has "${petition}": ${cardHas(cardTxt, petition)}; filter placeholders ${JSON.stringify([...new Set(filterInputs)])}, typed "${petition}" reads back "${fromBack}"; entity Metadata tab shows "${petition}" and "${submitted}": ${metaHas}; edit-form date inputs ${JSON.stringify(editInputs.filter((x) => x.includes(petition) || x.includes(submitted)))}`);
    await toSettings(page, "Collection");
  }
  // reload: setting and displays agree
  await page.reload(); await page.waitForTimeout(1500);
  const after = (await S(page).locator("#date-format").innerText()).trim();
  await page.locator("button[data-part=library]").click(); await page.waitForTimeout(2000);
  const cardTxt = (await page.locator("[data-component=EntityCard]").filter({ hasText: "Case 11.481" }).first().innerText()).replace(/\n+/g, " | ");
  const agree = /10-05-2026/.test(after) && cardTxt.includes("05-08-2006");
  r.add("COL-13", pf(ok && agree), `${out.join("; ")}; after reload the setting reads "${after}" and the card shows ${cardTxt.includes("05-08-2006") ? "05-08-2006" : cardTxt.slice(0, 120)}`, "COL-13-meta-ddMMyyyy");
  await page.context().close();
});
function cardHas(t, v) { return t.includes(v); }

r.save();
await b.close();
