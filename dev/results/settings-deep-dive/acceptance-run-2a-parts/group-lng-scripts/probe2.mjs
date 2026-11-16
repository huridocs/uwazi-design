import { launch, open, S, rows, shot } from "./lib.mjs";
const b = await launch();
const {page, errors} = await open(b, "languages");
// open row menu
await page.getByRole("button",{name:"Actions for French"}).click();
await page.waitForTimeout(300);
console.log(await page.evaluate(()=>[...document.querySelectorAll('[role=menu],[role=menuitem]')].map(e=>e.tagName+":"+e.getAttribute("role")+":"+e.innerText.replace(/\s+/g," ")+":"+(e.getAttribute("aria-disabled")||e.disabled||""))));
await shot(page,"probe-menu");
await page.keyboard.press("Escape");
console.log("focus", await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")));
// logo
const logos = await page.locator("header button, nav button, button[aria-label*=Uwazi i], [aria-label*=logo i]").evaluateAll(e=>e.slice(0,15).map(x=>x.getAttribute("aria-label")+"|"+x.innerText.slice(0,20)));
console.log(logos);
await b.close();
