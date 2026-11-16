import { run, open, S, wait, clean, sh, openRow, dataRows } from "./g.mjs";
await run("probe", async (b) => {
  const { page } = await open(b, "templates");
  await wait(page, 800);
  console.log(await dataRows(page));
  await openRow(page, "Court Case"); await wait(page, 800);
  console.log(clean(await S(page).innerText()).slice(0, 1500));
});
