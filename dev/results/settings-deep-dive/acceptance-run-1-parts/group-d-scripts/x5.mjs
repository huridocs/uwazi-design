import { launch, open, S, shot, rec, wait, propRows, propNames, dialogs, rail, rows, notifTitles } from "./ted-common.mjs";
const b = await launch();
const strip = (s) => s.replace(/\s+/g, " ").trim();
const { page } = await open(b, "templates", "desktop", { source: "cejil" });
await wait(page, 5000);
const tnames = await S(page).locator('[role=row]').evaluateAll(rs => rs.slice(1).map(r => r.innerText.split("\n")[0].trim()));
console.log(tnames.length);
const found = [];
outer: for (const tname of tnames) {
  await S(page).locator('[role=row]', { hasText: tname }).first().click(); await wait(page, 400);
  const names = await propNames(page);
  for (const n of names) {
    const btn = S(page).getByRole("button", { name: `Delete ${n}`, exact: true });
    if (!(await btn.count())) continue;
    await btn.first().evaluate(e => e.click()); await wait(page, 150);
    const dl = await dialogs(page);
    if (dl.length) { found.push({ template: tname, property: n, text: strip(await page.locator('[data-component=ConfirmDelete] [role=dialog]').last().innerText()) }); await shot(page, "X-05"); break outer; }
  }
  // leave without saving: click breadcrumb -> guard -> discard
  await S(page).getByRole("button", { name: "Templates" }).first().click(); await wait(page, 300);
  if ((await dialogs(page)).length) { await page.locator('[data-component=ConfirmDialog] [role=dialog] button', { hasText: /Discard/ }).first().click(); await wait(page, 300); }
}
console.log(JSON.stringify(found));
await b.close();
const b2 = await launch();
const c = await open(b2, "templates");
await wait(c.page, 700);
await S(c.page).locator('[role=row]', { hasText: "Court Case" }).first().click(); await wait(c.page, 400);
await S(c.page).getByRole("button", { name: "Add property" }).click(); await wait(c.page, 300);
await c.page.locator('[role=dialog][data-part=panel]').last().getByLabel("Label").fill("QA unused");
await c.page.locator('[role=dialog][data-part=panel]').last().getByRole("button", { name: "Add property" }).click(); await wait(c.page, 300);
await S(c.page).getByRole("button", { name: "Delete QA unused" }).evaluate(e => e.click()); await wait(c.page, 400);
const unused = (await notifTitles(c.page)).filter(t => /QA unused/.test(t));
console.log(JSON.stringify(unused));
rec("TED:X-05", found.length && unused.length ? "PASS" : "FAIL", `Reading: property removal in the editor never opens a confirm dialog when entities hold values (TED-25: Beacon entry with the count instead). Where a property is inherited the dialog blocks: CEJIL template "${found[0]?.template}", property "${found[0]?.property}": dialog "${found[0]?.text}". Sample: none of the 9 templates has an inherited property (every property of every Sample template removed one by one without a dialog). Entity-held property: Beacon "Date filed removed 5 entities hold a value for it. Nothing is saved until you save the template." Unused new property: Beacon ${JSON.stringify(unused)}. Template delete on the list: dialog with counts (TPL-21/22, X-05 on Templates list).`, "X-05");
await b2.close();
await b.close();
