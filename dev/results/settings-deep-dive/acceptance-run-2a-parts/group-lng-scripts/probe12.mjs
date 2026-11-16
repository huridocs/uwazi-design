import { launch, open, S, shot, rail, dialogs } from "./lib.mjs";
import { squash } from "./u.mjs";
const b = await launch(); const {page}=await open(b,"thesauri");
console.log(squash(await S(page).innerText()).slice(0,500));
await S(page).locator("[data-part=row]").filter({hasText:"Regions"}).first().click(); await page.waitForTimeout(800);
console.log(squash(await S(page).innerText()).slice(0,900));
console.log(await page.evaluate(()=>[...document.querySelectorAll("[data-testid=settings-content] button, [data-testid=settings-content] input")].map(b=>b.tagName+":"+(b.getAttribute("aria-label")||b.value||b.innerText).trim()).filter(Boolean)).then(a=>a.slice(0,40)));
await shot(page,"probe-th");
await b.close();
