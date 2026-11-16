import { launch, open, S, rows, shot } from "./lib.mjs";
const b = await launch();
const {page} = await open(b, "menu");
console.log(await rows(page));
console.log(await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim())));
await b.close();
