import { launch, pickCollection, openByTitle } from "./lib.mjs";
const { b, p } = await launch();
await pickCollection(p, /Las Vegas/);
for (const t of ["Taxi dash video · 22:09:50", "Volley 1 · 22:06:06"]) {
  await openByTitle(p, t);
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
  await p.getByRole("button", { name: /^Filters/ }).first().click(); await p.waitForTimeout(600);
  const titles = await p.locator('[data-component="RelationshipsFiltersTab"] [data-component="RelationshipsFilters"] h2').allInnerTexts();
  console.log(t, JSON.stringify(titles));
  await p.getByRole("button", { name: "Library", exact: true }).first().click(); await p.waitForTimeout(600);
}
await b.close();
