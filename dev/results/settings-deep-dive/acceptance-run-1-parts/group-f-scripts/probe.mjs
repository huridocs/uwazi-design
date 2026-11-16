import { launch, open, S, rows, shot, title } from "./lib.mjs";
const b = await launch();
for (const sec of ["languages","translations","metadata-extraction","paragraph-extraction"]) {
  const {page, errors} = await open(b, sec);
  console.log("=====", sec);
  console.log((await S(page).innerText()).slice(0,1500));
  console.log("errors", errors);
  await shot(page, "probe-"+sec);
}
await b.close();
