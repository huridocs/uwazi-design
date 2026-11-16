import { launch, open, S, wait, addTemplate, openRow, toSettingsItem, addRelProp, realErrors, tickRow, goLibrary } from "./common.mjs";
const b = await launch();
const { page, errors } = await open(b, "templates");
const mark = (l) => console.log(l, realErrors(errors).length, realErrors(errors).slice(-1)[0]?.slice(0, 300));
await wait(page, 800); mark("open");
for (const n of ["QA Unused A", "QA Unused B", "QA Target", "QA Via"]) { await addTemplate(page, n); mark("add " + n); }
await openRow(page, "QA Via"); await addRelProp(page, "Via to Target", "QA Target"); mark("rel1");
await openRow(page, "Court Case"); await addRelProp(page, "Related QA", "QA Target"); mark("rel2");
await openRow(page, "Court Case"); await addRelProp(page, "Through Via", "QA Via", "Via to Target"); mark("rel3");
await goLibrary(page); mark("library");
await toSettingsItem(page, "Templates"); mark("back");
await tickRow(page, "QA Target");  await S(page).getByRole("button", { name: "Delete" }).click(); await wait(page, 400); mark("dlg");
await page.locator("[data-component=ConfirmDelete]").getByRole("button", { name: "Delete", exact: true }).click(); await wait(page, 600); mark("deleted");
await toSettingsItem(page, "Filters"); mark("filters");
await goLibrary(page); mark("library2");
await b.close();
