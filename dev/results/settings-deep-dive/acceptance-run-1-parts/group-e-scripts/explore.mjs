import { launch, open, S, rows, shot, title } from "./lib.mjs";
const b = await launch();
const sec = process.argv[2];
const {page, errors} = await open(b, sec);
await page.waitForTimeout(1500);
console.log(await S(page).innerText());
await shot(page, "explore-"+sec);
console.log(errors);
await b.close();
