import { launch, open, S, rows, shot, dialogs } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
const b = await launch();
{
const {page} = await open(b, "languages");
await switchTo(page,"CEJIL"); await page.waitForTimeout(1500); await toSettings(page,"Languages"); await page.waitForTimeout(800);
console.log((await S(page).innerText()).replace(/\s+/g," ").slice(0,600));
console.log(await page.evaluate(()=>document.querySelector('[data-testid=settings-content]')?.className));
await shot(page,"X-13-lng-cejil");
}
{
const {page} = await open(b, "languages","mobile");
const cards = await S(page).locator('[data-part=row],li,[data-part=card]').count();
console.log("cards",cards);
await S(page).getByRole("button",{name:"Reset Spanish"}).click(); await page.waitForTimeout(500);
console.log(await page.evaluate(()=>{const d=[...document.querySelectorAll('[data-component=ConfirmDelete] [role=dialog],[data-component=ConfirmDelete]')].map(e=>{const r=e.getBoundingClientRect();return {role:e.getAttribute("role"),w:r.width,h:r.height,top:r.top}});return d}));
await shot(page,"LNG-19c");
const bs = await page.locator('[data-component=ConfirmDelete] button').evaluateAll(e=>e.map(x=>{const r=x.getBoundingClientRect();return [x.textContent.trim(),Math.round(r.width),Math.round(r.height)]}));
console.log(bs);
}
await b.close();
