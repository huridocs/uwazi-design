import { launch, open, S, rows, wait, shot, rowsData } from "./common.mjs";
const b = await launch();
for (const src of ["travesia","artworks","cejil"]) {
  const { page } = await open(b, "templates","desktop",{source:src});
  await wait(page, src==="cejil"?5000:2500);
  console.log(src, JSON.stringify(await rowsData(page)));
  await page.context().close();
}
const { page } = await open(b, "filters");
await wait(page, 800);
console.log(await S(page).innerText());
await shot(page,"probe-filters");
await b.close();
