import { launch, open, S, shot } from "./lib.mjs";
const b = await launch(); const {page}=await open(b,"languages");
const open_ = ()=>page.evaluate(()=>[...document.querySelectorAll("[role=dialog]")].map(e=>({n:e.getAttribute("aria-labelledby"),inert:!!e.closest("[inert]"),t:e.innerText.slice(0,30).replace(/\n/g," ")})));
await page.getByRole("button",{name:"Actions for Spanish"}).click(); await page.getByRole("menuitem",{name:"Reset",exact:true}).click(); await page.waitForTimeout(400);
console.log(await open_(), await page.evaluate(()=>document.activeElement.tagName));
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
console.log(await open_(), await page.evaluate(()=>document.activeElement.getAttribute("aria-label")));
await b.close();
