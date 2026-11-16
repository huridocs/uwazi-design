import { launch, open, S, wait, shot, rows, openRow } from "./common.mjs";
const b = await launch();
const { page } = await open(b, "pages");
await wait(page, 1000);
console.log(await rows(page));
await openRow(page, "Methodology"); await wait(page, 1500);
console.log(await page.evaluate(()=>[...document.querySelectorAll("[data-testid=settings-content] button, textarea, iframe, input")].map(e=>e.tagName+"|"+(e.getAttribute("aria-label")||e.innerText||e.placeholder||"").trim().slice(0,40)).slice(0,40)));
await shot(page,"probe-pages");
await b.close();
