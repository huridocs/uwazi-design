import { launch, open, S, rows, shot } from "./lib.mjs";
const b = await launch();
const {page} = await open(b,"metadata-extraction");
await S(page).locator('[role=row]').nth(1).click(); await page.waitForTimeout(600);
console.log((await S(page).innerText()).replace(/\s+/g," ").slice(0,1200));
console.log(await S(page).getByRole("button").evaluateAll(e=>e.map(x=>x.getAttribute("aria-label")||x.textContent.trim())));
await shot(page,"probe-ixe-editor");
await b.close();
