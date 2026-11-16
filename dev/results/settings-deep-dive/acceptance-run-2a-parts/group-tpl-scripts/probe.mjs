import { launch, open, S, rows, wait, DIR } from "./common.mjs";
const b = await launch();
const { page, errors } = await open(b, "templates");
await wait(page, 800);
console.log(await rows(page));
console.log(await S(page).evaluate(e => e.innerText.slice(0, 1500)));
console.log(errors);
// find logo
console.log(await page.evaluate(() => [...document.querySelectorAll("header *, nav *")].filter(e=>/logo|uwazi/i.test((e.getAttribute("aria-label")||"")+e.className+e.tagName+(e.alt||""))).slice(0,10).map(e=>e.tagName+"|"+e.getAttribute("aria-label")+"|"+String(e.className).slice(0,60))));
await b.close();
