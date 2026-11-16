import { launch, open, S, shot } from "./lib.mjs";
import { openCtx } from "./u.mjs";
const b = await launch(); const {page}=await open(b,"translations");
await openCtx(page,"User Interface");
for (let i=0;i<12;i++){ await page.evaluate(()=>{const m=document.querySelector("[data-part=more]"); if(m) m.scrollIntoView();}); await page.waitForTimeout(250);}
const keys=(await S(page).locator("[data-part=row]").evaluateAll(e=>e.map(r=>r.querySelector("td")?.innerText.trim())));
console.log(keys.length);
const bad=[]; for(let i=1;i<keys.length;i++){ if(keys[i-1].toLowerCase().localeCompare(keys[i].toLowerCase(),undefined,{sensitivity:"base"})>0) bad.push([keys[i-1],keys[i]]); }
console.log(bad.length, bad.slice(0,8));
console.log(keys.slice(0,12), keys.slice(100,104), keys.slice(200,203), keys.slice(300,303), keys.slice(400,403));
await b.close();
