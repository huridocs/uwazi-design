import { launch, open, S, shot, dialogs } from "./lib.mjs";
import { squash, modalTxt } from "./u.mjs";
const b = await launch(); const {page}=await open(b,"templates");
await S(page).locator("[data-part=row]").filter({hasText:"Country"}).first().click(); await page.waitForTimeout(800);
await S(page).getByRole("button",{name:"Edit Ratified ACHR"}).click(); await page.waitForTimeout(600);
console.log(await page.evaluate(()=>[...document.querySelectorAll("[role=dialog] button")].filter(b=>!b.closest("[inert]")).map(b=>b.outerHTML.slice(0,200))));
await b.close();
