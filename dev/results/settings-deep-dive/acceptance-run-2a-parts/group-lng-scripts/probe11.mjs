import { launch, open, S, shot, rail, dialogs } from "./lib.mjs";
import { squash, openCtx, modalTxt } from "./u.mjs";
const b = await launch(); const {page}=await open(b,"templates");
await S(page).locator("[data-part=row]").filter({hasText:"Country"}).first().click(); await page.waitForTimeout(800);
await S(page).getByRole("button",{name:"Edit Ratified ACHR"}).click(); await page.waitForTimeout(600);
console.log(await dialogs(page), (await modalTxt(page)).slice(0,600));
console.log(await page.evaluate(()=>[...document.querySelectorAll("[role=dialog] input, [role=dialog] button")].filter(b=>!b.closest("[inert]")).map(b=>b.tagName+":"+(b.getAttribute("aria-label")||b.value||b.innerText).trim())));
await shot(page,"probe-prop");
await b.close();
